// CareBridge Service Worker v2.3.0 - Enhanced Offline-First PWA with IndexedDB Corruption Recovery
const CACHE_VERSION = '2.3.0';
const STATIC_CACHE = `carebridge-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `carebridge-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `carebridge-api-v${CACHE_VERSION}`;
const OFFLINE_QUEUE_DB = 'carebridge-offline-queue';
const OFFLINE_QUEUE_STORE = 'pending-requests';

// Workbox manifest injection point
const manifest = self.__WB_MANIFEST || [];

// Core assets to cache immediately on install (app shell)
// Remove duplicates by combining manifest URLs with static assets using Set
const STATIC_ASSETS = Array.from(new Set([
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.png',
  '/offline.html',
  ...manifest.map(entry => entry.url)
]));

// Additional assets to cache after install (lazy cache)
const LAZY_CACHE_ASSETS = [
  '/assets/fonts/',
  '/assets/images/'
];

// API endpoints patterns for offline handling
const OFFLINE_API_PATTERNS = [
  /\/api\/patients/,
  /\/api\/hospitals/,
  /\/api\/users/,
  /\/api\/clinical/,
  /\/api\/surgery/,
  /\/api\/billing/,
  /\/api\/admissions/,
  /\/api\/prescriptions/,
  /\/api\/investigations/,
  /\/api\/sync/
];

// IndexedDB for offline request queue
class OfflineRequestQueue {
  constructor() {
    this.dbPromise = this.initDB();
    this.fallbackMode = false; // Use in-memory fallback if IndexedDB is corrupted
    this.fallbackQueue = [];
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);
        
        request.onerror = (event) => {
          const error = request.error || event.target?.error;
          console.error('[SW] OfflineRequestQueue DB error:', error);
          
          // Check for corruption errors
          if (error && (error.name === 'UnknownError' || 
              (error.message && error.message.includes('Internal error opening backing store')))) {
            console.warn('[SW] IndexedDB corrupted, using in-memory fallback');
            this.fallbackMode = true;
            resolve(null);
            return;
          }
          
          // For other errors, try to delete and recreate
          this.tryRecoverDB().then(db => resolve(db)).catch(() => {
            this.fallbackMode = true;
            resolve(null);
          });
        };
        
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
            const store = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('url', 'url', { unique: false });
          }
        };
      } catch (error) {
        console.error('[SW] Exception in initDB:', error);
        this.fallbackMode = true;
        resolve(null);
      }
    });
  }
  
  async tryRecoverDB() {
    console.log('[SW] Attempting to recover OfflineRequestQueue DB...');
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(OFFLINE_QUEUE_DB);
      deleteReq.onsuccess = () => {
        console.log('[SW] DB deleted, recreating...');
        const openReq = indexedDB.open(OFFLINE_QUEUE_DB, 1);
        openReq.onsuccess = () => resolve(openReq.result);
        openReq.onerror = () => reject(openReq.error);
        openReq.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
            const store = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('url', 'url', { unique: false });
          }
        };
      };
      deleteReq.onerror = () => reject(deleteReq.error);
      deleteReq.onblocked = () => reject(new Error('Delete blocked'));
    });
  }

  async add(request, body) {
    // Use fallback mode if IndexedDB is corrupted
    if (this.fallbackMode) {
      const record = {
        id: Date.now() + Math.random(),
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: Date.now()
      };
      this.fallbackQueue.push(record);
      return record.id;
    }
    
    const db = await this.dbPromise;
    if (!db) {
      console.warn('[SW] No DB available for add, using fallback');
      this.fallbackMode = true;
      return this.add(request, body);
    }
    
    const record = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[SW] Add failed, falling back to memory');
          this.fallbackMode = true;
          this.fallbackQueue.push({ ...record, id: Date.now() });
          resolve(Date.now());
        };
      } catch (error) {
        console.warn('[SW] Transaction error, falling back to memory:', error);
        this.fallbackMode = true;
        this.fallbackQueue.push({ ...record, id: Date.now() });
        resolve(Date.now());
      }
    });
  }

  async getAll() {
    if (this.fallbackMode) {
      return this.fallbackQueue;
    }
    
    const db = await this.dbPromise;
    if (!db) {
      return this.fallbackQueue;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[SW] getAll failed, returning fallback');
          resolve(this.fallbackQueue);
        };
      } catch (error) {
        console.warn('[SW] getAll transaction error:', error);
        resolve(this.fallbackQueue);
      }
    });
  }

  async remove(id) {
    if (this.fallbackMode) {
      this.fallbackQueue = this.fallbackQueue.filter(r => r.id !== id);
      return;
    }
    
    const db = await this.dbPromise;
    if (!db) {
      this.fallbackQueue = this.fallbackQueue.filter(r => r.id !== id);
      return;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve(); // Ignore errors on remove
      } catch (error) {
        console.warn('[SW] remove error:', error);
        resolve();
      }
    });
  }

  async clear() {
    if (this.fallbackMode) {
      this.fallbackQueue = [];
      return;
    }
    
    const db = await this.dbPromise;
    if (!db) {
      this.fallbackQueue = [];
      return;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve(); // Ignore errors on clear
      } catch (error) {
        resolve();
      }
    });
  }

  async count() {
    if (this.fallbackMode) {
      return this.fallbackQueue.length;
    }
    
    const db = await this.dbPromise;
    if (!db) {
      return this.fallbackQueue.length;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(this.fallbackQueue.length);
      } catch (error) {
        resolve(this.fallbackQueue.length);
      }
    });
  }
}

const offlineQueue = new OfflineRequestQueue();

// Install event - cache static assets (app shell)
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2.2.0...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        console.log('[SW] Caching static assets');
        // Cache files individually to avoid failures from missing files
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (error) {
            console.warn('[SW] Failed to cache:', url, error.message);
            // Continue caching other assets even if one fails
          }
        });
        await Promise.allSettled(cachePromises);
        console.log('[SW] Static assets cached successfully');
      })
      .then(() => {
        console.log('[SW] Skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache initialization error:', error);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2.2.0...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete caches that don't match current version
              return name.startsWith('carebridge-') && 
                     !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      // Notify all clients that SW is ready
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip WebSocket requests (for Vite HMR in development)
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip Vite HMR and development requests
  if (url.pathname.includes('/@vite') || 
      url.pathname.includes('/@fs') || 
      url.pathname.includes('/@id') ||
      url.pathname.includes('/__vite') ||
      url.searchParams.has('t') || // Vite timestamp
      url.searchParams.has('import')) {
    return;
  }

  // Skip cross-origin requests (except CDN assets)
  if (url.origin !== location.origin && !isTrustedCDN(url)) {
    return;
  }

  // Skip Supabase auth and realtime requests (handle them normally)
  if (url.pathname.includes('/auth/') || 
      url.pathname.includes('/realtime/') ||
      url.hostname.includes('supabase')) {
    return;
  }

  // Handle different request types with appropriate strategies
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else if (isAssetRequest(url)) {
    event.respondWith(handleAssetRequest(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Check if URL is from a trusted CDN
function isTrustedCDN(url) {
  const trustedCDNs = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'unpkg.com'
  ];
  return trustedCDNs.some(cdn => url.hostname.includes(cdn));
}

// Check if request is an API request
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         OFFLINE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Check if request is a navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && 
          request.headers.get('accept')?.includes('text/html'));
}

// Check if request is for static assets
function isAssetRequest(url) {
  const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.ico', '.webp'];
  return assetExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname.includes('/assets/');
}

// Handle navigation requests - Network first, fallback to cached index.html
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Navigation failed, serving cached index.html');
    // Fall back to cached index.html (SPA routing)
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    // Last resort: return offline page
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    // Generate a basic offline response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Offline - CareBridge</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>You're Offline</h1>
          <p>CareBridge is working in offline mode. Your data is safe and will sync when you're back online.</p>
          <button onclick="location.reload()">Try Again</button>
        </body>
      </html>`,
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle API requests - Network first with offline queue for mutations
async function handleAPIRequest(request) {
  const isReadRequest = request.method === 'GET';
  
  if (isReadRequest) {
    // GET requests: Network first, cache fallback
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
      throw new Error('Network response not ok');
    } catch (error) {
      console.log('[SW] API GET failed, trying cache');
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Add header to indicate this is cached data
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-From-Cache', 'true');
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers
        });
      }
      // Return offline indicator for API
      return new Response(
        JSON.stringify({ 
          offline: true, 
          cached: false,
          message: 'You are offline and no cached data is available.' 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } else {
    // POST/PUT/DELETE requests: Try network, queue if offline
    // Clone request body BEFORE fetch (body can only be read once)
    let bodyText = null;
    try {
      bodyText = await request.clone().text();
    } catch (e) {
      // Body might be empty or already consumed
      bodyText = '';
    }
    
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      console.log('[SW] API mutation failed, queuing for later');
      
      // Use the pre-cloned body
      await offlineQueue.add(request, bodyText);
      
      // Notify clients about pending sync
      const count = await offlineQueue.count();
      notifyClients({ 
        type: 'OFFLINE_QUEUE_UPDATED', 
        pendingCount: count,
        action: 'queued'
      });
      
      // Return a success response indicating data is queued
      return new Response(
        JSON.stringify({ 
          offline: true, 
          queued: true,
          message: 'Request queued for sync when online.' 
        }),
        { 
          status: 202, // Accepted
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

// Handle asset requests - Cache first with network fallback
async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Refresh cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Asset fetch failed:', request.url);
    // Return empty response for non-critical assets
    return new Response('', { status: 404 });
  }
}

// Handle generic requests
async function handleGenericRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Notify all clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-pending-data' || event.tag === 'carebridge-sync') {
    event.waitUntil(processPendingQueue());
  }
});

// Process pending offline queue
async function processPendingQueue() {
  console.log('[SW] Processing pending offline queue...');
  
  try {
    const pendingRequests = await offlineQueue.getAll();
    console.log(`[SW] Found ${pendingRequests.length} pending requests`);
    
    if (pendingRequests.length === 0) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const item of pendingRequests) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });

        if (response.ok || response.status < 500) {
          // Remove from queue on success or client error (don't retry 4xx)
          await offlineQueue.remove(item.id);
          successCount++;
          console.log(`[SW] Successfully synced: ${item.url}`);
        } else {
          // Server error - keep in queue for retry
          failCount++;
          console.log(`[SW] Server error for ${item.url}, keeping in queue`);
        }
      } catch (error) {
        // Network error - keep in queue
        failCount++;
        console.log(`[SW] Failed to sync ${item.url}:`, error);
      }
    }

    // Notify clients about sync completion
    const remainingCount = await offlineQueue.count();
    notifyClients({ 
      type: 'SYNC_COMPLETED', 
      synced: successCount,
      failed: failCount,
      remaining: remainingCount
    });

    // Also notify clients to refresh their data
    notifyClients({ type: 'SYNC_REQUIRED', timestamp: Date.now() });

  } catch (error) {
    console.error('[SW] Error processing pending queue:', error);
  }
}

// Sync pending data when back online (legacy support)
async function syncPendingData() {
  await processPendingQueue();
  
  // Notify clients to sync their data
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_REQUIRED',
      timestamp: Date.now()
    });
  });
}

// Handle push notifications (works even when app is closed)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let data = {};
  
  try {
    if (event.data) {
      // Try to parse as JSON first
      try {
        data = event.data.json();
      } catch (e) {
        // If not JSON, use text
        data = { body: event.data.text() };
      }
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    data = { body: 'New notification' };
  }

  // Determine notification type and customize appearance
  const notificationType = data.type || data.data?.type || 'general';
  const urgency = data.urgency || data.data?.urgency || 'medium';
  
  // Get appropriate vibration pattern
  const getVibrationPattern = (type, urgency) => {
    if (type === 'vital_alert' || type === 'critical' || urgency === 'critical') {
      return [1000, 200, 1000, 200, 1000]; // Urgent pattern
    }
    if (type === 'patient_assignment' || type === 'surgery_reminder' || urgency === 'high') {
      return [500, 200, 500, 200, 500]; // Important pattern
    }
    if (urgency === 'low') {
      return [100]; // Subtle pattern
    }
    return [200, 100, 200]; // Default pattern
  };

  // Get appropriate icon based on type
  const getIcon = (type) => {
    // Could use different icons for different notification types
    return '/icons/icon-192x192.png';
  };

  // Determine default actions based on notification type
  const getDefaultActions = (type) => {
    switch (type) {
      case 'patient_assignment':
        return [
          { action: 'view', title: 'View Patient' },
          { action: 'acknowledge', title: '✓ Acknowledge' }
        ];
      case 'surgery_reminder':
        return [
          { action: 'view', title: 'View Surgery' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
      case 'lab_results':
      case 'investigation_results':
        return [
          { action: 'view', title: 'View Results' },
          { action: 'dismiss', title: 'Later' }
        ];
      case 'vital_alert':
        return [
          { action: 'view', title: 'View Patient' },
          { action: 'acknowledge', title: 'Acknowledge' }
        ];
      case 'appointment_reminder':
        return [
          { action: 'view', title: 'View Appointment' },
          { action: 'checkin', title: 'Check In' }
        ];
      default:
        return [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
    }
  };

  const options = {
    body: data.body || 'New notification from CareBridge',
    icon: data.icon || getIcon(notificationType),
    badge: data.badge || '/icons/icon-72x72.png',
    image: data.image,
    vibrate: data.vibrate || getVibrationPattern(notificationType, urgency),
    tag: data.tag || `carebridge-${notificationType}-${Date.now()}`,
    requireInteraction: data.requireInteraction !== undefined 
      ? data.requireInteraction 
      : (urgency === 'high' || urgency === 'critical' || notificationType === 'vital_alert'),
    renotify: data.renotify !== undefined ? data.renotify : true,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.url || data.data?.url || '/',
      type: notificationType,
      ...data.data,
      ...data
    },
    actions: data.actions || getDefaultActions(notificationType)
  };

  // Log the notification for debugging
  console.log('[SW] Showing push notification:', {
    title: data.title || 'CareBridge',
    type: notificationType,
    tag: options.tag
  });

  event.waitUntil(
    self.registration.showNotification(data.title || 'CareBridge', options)
      .then(() => {
        console.log('[SW] Push notification displayed successfully');
        // Track notification receipt
        trackNotificationEvent('received', options.tag, notificationType);
      })
      .catch((error) => {
        console.error('[SW] Error showing push notification:', error);
      })
  );
});

// Track notification events for analytics
async function trackNotificationEvent(eventType, tag, notificationType) {
  try {
    // Store event in IndexedDB for analytics
    const ANALYTICS_DB = 'carebridge-notification-analytics';
    const ANALYTICS_STORE = 'events';
    
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(ANALYTICS_DB, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(ANALYTICS_STORE)) {
          const store = database.createObjectStore(ANALYTICS_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
    
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([ANALYTICS_STORE], 'readwrite');
      const store = transaction.objectStore(ANALYTICS_STORE);
      store.add({
        eventType,
        tag,
        notificationType,
        timestamp: Date.now()
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    
    db.close();
  } catch (error) {
    console.warn('[SW] Error tracking notification event:', error);
  }
}

// Handle notification clicks (works when notification is clicked)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.tag);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const notificationType = notificationData.type || 'general';
  
  // Track click event
  trackNotificationEvent('clicked', event.notification.tag, notificationType);
  
  // Handle dismiss action
  if (event.action === 'dismiss' || event.action === 'later') {
    console.log('[SW] Notification dismissed');
    return;
  }

  // Handle MDT notification actions
  if (notificationType === 'mdt-invitation') {
    if (event.action === 'snooze') {
      // Just close, the timer will send another notification after the interval
      console.log('[SW] MDT invitation snoozed - will remind again');
      return;
    }
    
    // Open MDT page with invitation context
    const url = notificationData.url || `/clinical/mdt?invitation=${notificationData.invitationId}&meeting=${notificationData.mdtMeetingId}&patient=${notificationData.patientId}`;
    event.waitUntil(openAppWindow(url));
    return;
  }

  // Handle patient assignment acknowledgment
  if (event.action === 'acknowledge') {
    if (notificationData.type === 'patient_assignment' && notificationData.notificationId) {
      event.waitUntil(handleAssignmentAcknowledge(notificationData.notificationId));
    } else if (notificationData.type === 'vital_alert') {
      // Handle vital alert acknowledgment
      event.waitUntil(
        sendMessageToClients({
          type: 'VITAL_ALERT_ACKNOWLEDGED',
          data: notificationData
        })
      );
    }
    return;
  }

  // Handle check-in for appointments
  if (event.action === 'checkin' && notificationData.appointmentId) {
    event.waitUntil(
      Promise.all([
        sendMessageToClients({
          type: 'APPOINTMENT_CHECKIN',
          appointmentId: notificationData.appointmentId
        }),
        openAppWindow(notificationData.url || '/appointments')
      ])
    );
    return;
  }

  // Handle view actions for different types
  if (event.action === 'view' || event.action === 'open' || !event.action) {
    let url = notificationData.url || '/';
    
    // Determine URL based on notification type if not provided
    if (!notificationData.url) {
      switch (notificationType) {
        case 'patient_assignment':
          url = notificationData.patientId 
            ? `/patients/${notificationData.patientId}` 
            : '/dashboard';
          break;
        case 'surgery_reminder':
          url = notificationData.surgeryId 
            ? `/surgery/${notificationData.surgeryId}` 
            : '/surgery';
          break;
        case 'lab_results':
        case 'investigation_results':
          url = notificationData.labId 
            ? `/laboratory/${notificationData.labId}` 
            : '/laboratory';
          break;
        case 'vital_alert':
          url = notificationData.patientId 
            ? `/patients/${notificationData.patientId}/vitals` 
            : '/vitals';
          break;
        case 'appointment_reminder':
          url = notificationData.appointmentId 
            ? `/appointments?view=${notificationData.appointmentId}` 
            : '/appointments';
          break;
        case 'prescription_ready':
          url = '/pharmacy';
          break;
        case 'mdt-invitation':
          url = notificationData.invitationId 
            ? `/clinical/mdt?invitation=${notificationData.invitationId}&meeting=${notificationData.mdtMeetingId}&patient=${notificationData.patientId}`
            : '/clinical/mdt';
          break;
        default:
          url = '/dashboard';
      }
    }

    event.waitUntil(openAppWindow(url));
    
    // Also acknowledge patient assignments when viewing
    if (notificationType === 'patient_assignment' && notificationData.notificationId) {
      handleAssignmentAcknowledge(notificationData.notificationId);
    }
    return;
  }

  // Default: open the app
  const url = notificationData.url || '/';
  event.waitUntil(openAppWindow(url));
});

// Handle notification close (user swiped away)
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};
  console.log('[SW] Notification closed:', event.notification.tag);
  
  // Track close event
  trackNotificationEvent('closed', event.notification.tag, notificationData.type || 'general');
});

// Send message to all open clients
async function sendMessageToClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Open app window helper
async function openAppWindow(url) {
  const clientList = await self.clients.matchAll({ type: 'window' });
  
  // Focus existing window if available
  for (const client of clientList) {
    if (client.url.includes(url) && 'focus' in client) {
      return client.focus();
    }
  }
  
  // Open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

// Handle assignment notification acknowledgment
async function handleAssignmentAcknowledge(notificationId) {
  if (!notificationId) return;
  
  try {
    // Update the notification in IndexedDB
    const NOTIFICATION_DB_NAME = 'carebridge-voice-notifications';
    const NOTIFICATION_STORE_NAME = 'pending-voice-notifications';
    
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(NOTIFICATION_DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
      const getReq = store.get(notificationId);
      
      getReq.onsuccess = () => {
        const notification = getReq.result;
        if (notification) {
          notification.acknowledged = true;
          notification.acknowledgedAt = new Date().toISOString();
          store.put(notification);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
    
    db.close();
    
    // Notify clients that notification was acknowledged
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ 
        type: 'ASSIGNMENT_ACKNOWLEDGED', 
        notificationId: notificationId 
      });
    });
    
    console.log('[SW] Assignment notification acknowledged:', notificationId);
  } catch (error) {
    console.error('[SW] Error acknowledging assignment:', error);
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, ...data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE).then((cache) => {
          return cache.addAll(data.urls || []);
        })
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter(name => name.startsWith('carebridge-'))
              .map(name => caches.delete(name))
          );
        })
      );
      break;
      
    case 'TRIGGER_SYNC':
      event.waitUntil(processPendingQueue());
      break;
      
    case 'GET_QUEUE_STATUS':
      event.waitUntil(
        offlineQueue.count().then((count) => {
          event.source.postMessage({ 
            type: 'QUEUE_STATUS', 
            pendingCount: count 
          });
        })
      );
      break;
      
    case 'CLEAR_OFFLINE_QUEUE':
      event.waitUntil(
        offlineQueue.clear().then(() => {
          event.source.postMessage({ 
            type: 'OFFLINE_QUEUE_CLEARED' 
          });
        })
      );
      break;
      
    case 'ENABLE_NOTIFICATION_CHECKS':
      // Enable periodic notification checks
      notificationChecksEnabled = true;
      console.log('[SW] Notification checks enabled');
      break;
      
    case 'CHECK_SCHEDULED_EVENTS':
      // Trigger notification check in all clients
      event.waitUntil(
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CHECK_NOTIFICATIONS' });
          });
        })
      );
      break;
    
    case 'CHECK_VOICE_NOTIFICATIONS':
      // Check voice notifications specifically
      event.waitUntil(checkVoiceNotificationsFromSW());
      break;
    
    case 'ACKNOWLEDGE_ASSIGNMENT':
      // Acknowledge a specific assignment notification
      if (data.notificationId) {
        event.waitUntil(handleAssignmentAcknowledge(data.notificationId));
      }
      break;
      
    case 'TRIGGER_VOICE_NOTIFICATION':
      // Trigger a voice notification from the app
      if (data.notification) {
        event.waitUntil(
          self.registration.showNotification(
            `🏥 Patient Assignment`,
            {
              body: data.notification.message,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              vibrate: [500, 200, 500, 200, 500],
              tag: `assignment-${data.notification.id}`,
              requireInteraction: true,
              renotify: true,
              data: {
                type: 'patient_assignment',
                notificationId: data.notification.id,
                patientId: data.notification.patientId,
                userId: data.notification.userId,
                url: '/dashboard',
              },
              actions: [
                { action: 'acknowledge', title: '✓ Acknowledge' },
                { action: 'view', title: 'View Patient' }
              ]
            }
          )
        );
      }
      break;
  }
});

// Flag for notification checks
let notificationChecksEnabled = false;

// Periodic background sync for data freshness and notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data' || event.tag === 'carebridge-periodic-sync') {
    event.waitUntil(processPendingQueue());
  }
  
  if (event.tag === 'carebridge-notification-sync') {
    event.waitUntil(checkAndSendNotifications());
  }
});

// Check and send scheduled notifications
async function checkAndSendNotifications() {
  try {
    // Check for pending voice notifications (patient assignments)
    await checkVoiceNotificationsFromSW();
    
    // Notify clients to check for pending notifications
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      // If app is open, let the app handle it
      clients.forEach((client) => {
        client.postMessage({ type: 'CHECK_NOTIFICATIONS' });
      });
    } else {
      // App is closed - check from service worker directly
      await checkNotificationsFromSW();
    }
  } catch (error) {
    console.error('[SW] Error checking notifications:', error);
  }
}

// Check voice notifications from service worker (for patient assignments)
async function checkVoiceNotificationsFromSW() {
  const NOTIFICATION_DB_NAME = 'carebridge-voice-notifications';
  const NOTIFICATION_STORE_NAME = 'pending-voice-notifications';
  
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(NOTIFICATION_DB_NAME, 1);
      
      request.onerror = (event) => {
        const error = request.error || event.target?.error;
        // Check for corruption errors
        if (error && (error.name === 'UnknownError' || 
            (error.message && error.message.includes('Internal error opening backing store')))) {
          console.warn('[SW] Voice notification DB corrupted, skipping check');
          resolve(null);
          return;
        }
        reject(error);
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(NOTIFICATION_STORE_NAME)) {
          const store = database.createObjectStore(NOTIFICATION_STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('acknowledged', 'acknowledged', { unique: false });
        }
      };
    });
    
    // If DB is null (corrupted), skip this check
    if (!db) {
      return;
    }
    
    // Check if the object store exists before trying to access it
    if (!db.objectStoreNames.contains(NOTIFICATION_STORE_NAME)) {
      console.warn('[SW] Voice notification store does not exist, skipping check');
      db.close();
      return;
    }
    
    // Get all unacknowledged notifications
    // Note: IndexedDB doesn't support boolean keys well, so we get all and filter
    const pending = await new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readonly');
        const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          // Filter for unacknowledged notifications (acknowledged !== true)
          resolve(all.filter(n => n.acknowledged !== true && n.acknowledged !== 'true'));
        };
        req.onerror = () => resolve([]); // Return empty on error
      } catch (error) {
        console.warn('[SW] Error accessing voice notification store:', error);
        resolve([]);
      }
    });
    
    if (pending.length === 0) {
      db.close();
      return;
    }
    
    console.log(`[SW] Found ${pending.length} pending voice notifications`);
    
    // Check if app has any clients open
    const clients = await self.clients.matchAll();
    const appIsOpen = clients.length > 0;
    
    // Only show push notifications if app is closed (let the app handle voice when open)
    if (!appIsOpen) {
      const now = new Date();
      
      for (const notification of pending) {
        // Check if we should re-notify (every 30 seconds)
        const lastAnnounced = notification.lastAnnouncedAt ? new Date(notification.lastAnnouncedAt) : null;
        const shouldRenotify = !lastAnnounced || (now - lastAnnounced) > 30000;
        
        if (shouldRenotify) {
          const roleLabel = notification.assignmentType === 'primary_doctor' 
            ? 'Doctor' 
            : notification.assignmentType === 'primary_nurse' 
              ? 'Nurse' 
              : 'Staff';
          
          // Show notification with vibration pattern for urgency
          await self.registration.showNotification(
            `🚨 URGENT: Patient Assignment - ${roleLabel}`,
            {
              body: `${notification.patientName} admitted to ${notification.wardName}, Bed ${notification.bedNumber} at ${notification.hospitalName}. TAP TO ACKNOWLEDGE!`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              vibrate: [500, 200, 500, 200, 500, 200, 500], // Long urgent vibration
              tag: `assignment-${notification.id}`,
              requireInteraction: true,
              renotify: true, // Re-show notification even if same tag
              data: {
                type: 'patient_assignment',
                notificationId: notification.id,
                patientId: notification.patientId,
                userId: notification.userId,
                url: '/dashboard',
              },
              actions: [
                { action: 'acknowledge', title: '✓ Acknowledge' },
                { action: 'view', title: 'View Patient' }
              ]
            }
          );
          
          // Update last announced time
          await new Promise((resolve, reject) => {
            const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
            const getReq = store.get(notification.id);
            getReq.onsuccess = () => {
              const data = getReq.result;
              if (data && !data.acknowledged) {
                data.repeatCount = (data.repeatCount || 0) + 1;
                data.lastAnnouncedAt = now.toISOString();
                store.put(data);
              }
              resolve();
            };
            getReq.onerror = () => reject(getReq.error);
          });
        }
      }
    }
    
    db.close();
  } catch (error) {
    console.error('[SW] Error checking voice notifications:', error);
  }
}

// Check notifications directly from service worker when app is closed
async function checkNotificationsFromSW() {
  const NOTIFICATION_DB = 'carebridge-notifications';
  const NOTIFICATION_STORE = 'scheduled-notifications';
  
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(NOTIFICATION_DB, 2);
      
      request.onerror = (event) => {
        const error = request.error || event.target?.error;
        // Check for corruption errors
        if (error && (error.name === 'UnknownError' || 
            (error.message && error.message.includes('Internal error opening backing store')))) {
          console.warn('[SW] Notification DB corrupted, skipping check');
          resolve(null);
          return;
        }
        reject(error);
      };
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(NOTIFICATION_STORE)) {
          const store = database.createObjectStore(NOTIFICATION_STORE, { keyPath: 'id' });
          store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
          store.createIndex('notified', 'notified', { unique: false });
        }
      };
    });
    
    // If DB is null (corrupted), skip this check
    if (!db) {
      return;
    }
    
    // Check if the object store exists before trying to access it
    if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
      console.warn('[SW] Notification store does not exist, skipping check');
      db.close();
      return;
    }
    
    const pending = await new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([NOTIFICATION_STORE], 'readonly');
        const store = transaction.objectStore(NOTIFICATION_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const now = new Date();
          const pendingNotifications = req.result.filter(s => 
            !s.notified && new Date(s.scheduledTime) <= now
          );
          resolve(pendingNotifications);
        };
        req.onerror = () => resolve([]); // Return empty array on error
      } catch (error) {
        console.warn('[SW] Error accessing notification store:', error);
        resolve([]);
      }
    });
    
    for (const schedule of pending) {
      // Show a generic notification since we can't access Dexie from SW
      const eventType = schedule.eventType || 'event';
      const emoji = eventType === 'surgery' ? '🏥' : eventType === 'appointment' ? '📅' : '💊';
      const label = eventType === 'surgery' ? 'Surgery' : eventType === 'appointment' ? 'Appointment' : 'Treatment';
      
      await self.registration.showNotification(`${emoji} ${label} Reminder`, {
        body: `You have a scheduled ${label.toLowerCase()} coming up soon. Open AstroHEALTH for details.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: `carebridge-${eventType}-${schedule.eventId}`,
        requireInteraction: schedule.minutesBefore <= 15,
        data: {
          type: eventType,
          eventId: schedule.eventId,
          url: '/',
        },
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
      
      // Mark as notified
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
        const store = transaction.objectStore(NOTIFICATION_STORE);
        const getReq = store.get(schedule.id);
        getReq.onsuccess = () => {
          const data = getReq.result;
          if (data) {
            data.notified = true;
            store.put(data);
          }
          resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      });
    }
    
    db.close();
  } catch (error) {
    console.error('[SW] Error checking notifications from SW:', error);
  }
}

// Check MDT invitations and send repeated push notifications until specialist responds
async function checkMDTInvitationsFromSW() {
  const MDT_NOTIFICATION_DB = 'carebridge-mdt-invitations';
  const MDT_NOTIFICATION_STORE = 'pending-mdt-invitations';
  
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(MDT_NOTIFICATION_DB, 1);
      
      request.onerror = (event) => {
        const error = request.error || event.target?.error;
        if (error && (error.name === 'UnknownError' || 
            (error.message && error.message.includes('Internal error opening backing store')))) {
          console.warn('[SW] MDT Notification DB corrupted, skipping check');
          resolve(null);
          return;
        }
        reject(error);
      };
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(MDT_NOTIFICATION_STORE)) {
          const store = database.createObjectStore(MDT_NOTIFICATION_STORE, { keyPath: 'id' });
          store.createIndex('specialistUserId', 'specialistUserId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
    
    if (!db) return;
    
    if (!db.objectStoreNames.contains(MDT_NOTIFICATION_STORE)) {
      console.warn('[SW] MDT notification store does not exist, skipping check');
      db.close();
      return;
    }
    
    const pendingInvitations = await new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([MDT_NOTIFICATION_STORE], 'readonly');
        const store = transaction.objectStore(MDT_NOTIFICATION_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          // Filter for pending invitations that haven't been plan_submitted
          const pending = req.result.filter(inv => 
            inv.status === 'pending' || inv.status === 'acknowledged'
          );
          resolve(pending);
        };
        req.onerror = () => resolve([]);
      } catch (error) {
        console.warn('[SW] Error accessing MDT notification store:', error);
        resolve([]);
      }
    });
    
    const now = Date.now();
    
    for (const invitation of pendingInvitations) {
      // Check if it's time to send another notification (based on repeatIntervalMs)
      const lastNotified = invitation.lastNotifiedAt || invitation.createdAt;
      const repeatInterval = invitation.repeatIntervalMs || 45000; // Default 45 seconds
      
      if (now - new Date(lastNotified).getTime() >= repeatInterval) {
        // Show MDT invitation notification
        await self.registration.showNotification('🏥 MDT Meeting - Action Required', {
          body: `Patient: ${invitation.patientName}\nHospital: ${invitation.hospitalName}\nInvited by: ${invitation.invitedByName}\n\nPlease submit your specialty treatment plan.`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [300, 100, 300, 100, 300],
          tag: `mdt-invitation-${invitation.id}`,
          requireInteraction: true,
          data: {
            type: 'mdt-invitation',
            invitationId: invitation.id,
            mdtMeetingId: invitation.mdtMeetingId,
            patientId: invitation.patientId,
            patientName: invitation.patientName,
            hospitalName: invitation.hospitalName,
            url: `/clinical/mdt?invitation=${invitation.id}&meeting=${invitation.mdtMeetingId}&patient=${invitation.patientId}`,
          },
          actions: [
            { action: 'open-mdt', title: 'Submit Plan' },
            { action: 'snooze', title: 'Remind Later' }
          ]
        });
        
        // Update lastNotifiedAt
        await new Promise((resolve, reject) => {
          try {
            const transaction = db.transaction([MDT_NOTIFICATION_STORE], 'readwrite');
            const store = transaction.objectStore(MDT_NOTIFICATION_STORE);
            const getReq = store.get(invitation.id);
            getReq.onsuccess = () => {
              const data = getReq.result;
              if (data) {
                data.lastNotifiedAt = new Date().toISOString();
                store.put(data);
              }
              resolve();
            };
            getReq.onerror = () => resolve();
          } catch (error) {
            resolve();
          }
        });
        
        console.log(`[SW] Sent MDT invitation notification for patient: ${invitation.patientName}`);
      }
    }
    
    db.close();
  } catch (error) {
    console.error('[SW] Error checking MDT invitations from SW:', error);
  }
}

// Set up periodic notification check timer (fallback for when periodic sync is not available)
let notificationCheckTimer = null;
let voiceNotificationTimer = null;
let mdtNotificationTimer = null;

function startNotificationTimer() {
  if (notificationCheckTimer) return;
  
  // Check general notifications every minute
  notificationCheckTimer = setInterval(() => {
    if (notificationChecksEnabled) {
      checkAndSendNotifications();
    }
  }, 60000);
  
  console.log('[SW] Notification timer started');
}

// Start aggressive timer for voice notifications (every 30 seconds)
function startVoiceNotificationTimer() {
  if (voiceNotificationTimer) return;
  
  voiceNotificationTimer = setInterval(() => {
    checkVoiceNotificationsFromSW();
  }, 30000); // 30 seconds
  
  console.log('[SW] Voice notification timer started');
}

// Start MDT invitation notification timer (every 45 seconds)
function startMDTNotificationTimer() {
  if (mdtNotificationTimer) return;
  
  mdtNotificationTimer = setInterval(() => {
    checkMDTInvitationsFromSW();
  }, 45000); // 45 seconds - matches the repeat interval
  
  // Also check immediately on start
  checkMDTInvitationsFromSW();
  
  console.log('[SW] MDT notification timer started');
}

// Start timer when SW activates
startNotificationTimer();
startVoiceNotificationTimer();
startMDTNotificationTimer();

// Handle app lifecycle events
self.addEventListener('online', () => {
  console.log('[SW] Device came online');
  processPendingQueue();
  checkAndSendNotifications();
});

console.log('[SW] Service Worker v2.2.0 loaded - Offline-First PWA with IndexedDB Corruption Recovery ready');
