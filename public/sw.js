// CareBridge Service Worker v2.0.0 - Enhanced Offline-First PWA
const CACHE_VERSION = '2.0.0';
const STATIC_CACHE = `carebridge-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `carebridge-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `carebridge-api-v${CACHE_VERSION}`;
const OFFLINE_QUEUE_DB = 'carebridge-offline-queue';
const OFFLINE_QUEUE_STORE = 'pending-requests';

// Workbox manifest injection point
const manifest = self.__WB_MANIFEST || [];

// Core assets to cache immediately on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.png',
  '/offline.html',
  ...manifest.map(entry => entry.url)
];

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
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
          const store = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }
      };
    });
  }

  async add(request, body) {
    const db = await this.dbPromise;
    const record = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(id) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async count() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

const offlineQueue = new OfflineRequestQueue();

// Install event - cache static assets (app shell)
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2.0.0...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached, skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
        // Still skip waiting even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2.0.0...');
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
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      console.log('[SW] API mutation failed, queuing for later');
      
      // Clone and store the request body
      const body = await request.clone().text();
      await offlineQueue.add(request, body);
      
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

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'New notification from CareBridge',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'carebridge-notification',
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      ...data
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CareBridge', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
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
    })
  );
});

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
  }
});

// Periodic background sync for data freshness
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data' || event.tag === 'carebridge-periodic-sync') {
    event.waitUntil(processPendingQueue());
  }
});

// Handle app lifecycle events
self.addEventListener('online', () => {
  console.log('[SW] Device came online');
  processPendingQueue();
});

console.log('[SW] Service Worker v2.0.0 loaded - Offline-First PWA ready');
