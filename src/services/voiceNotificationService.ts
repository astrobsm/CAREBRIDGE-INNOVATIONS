/**
 * Voice Notification Service
 * Handles voice announcements with Text-to-Speech for patient assignments
 * Supports repeated announcements until acknowledged
 */

// Database operations are handled through IndexedDB directly for persistence

// Types for voice notifications
export interface VoiceNotification {
  id: string;
  userId: string;
  patientId: string;
  patientName: string;
  hospitalName: string;
  wardName: string;
  bedNumber: string;
  assignmentType: 'primary_doctor' | 'primary_nurse' | 'staff_assignment';
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
  repeatCount: number;
  lastAnnouncedAt?: Date;
}

// Store for active notifications
const activeNotifications: Map<string, VoiceNotification> = new Map();
let announcementInterval: NodeJS.Timeout | null = null;
let speechSynthesis: SpeechSynthesis | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// IndexedDB store for persistent notifications
const NOTIFICATION_DB_NAME = 'carebridge-voice-notifications';
const NOTIFICATION_STORE_NAME = 'pending-voice-notifications';

/**
 * Initialize the voice notification service
 */
export async function initVoiceNotificationService(): Promise<void> {
  // Check for Web Speech API support
  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
    console.log('[VoiceNotification] Speech synthesis available');
  } else {
    console.warn('[VoiceNotification] Speech synthesis not supported');
  }

  // Load any persisted unacknowledged notifications
  await loadPersistedNotifications();

  // Start the announcement loop
  startAnnouncementLoop();

  // Listen for visibility changes to resume announcements
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Resume announcements when app becomes visible
      announceNextPending();
    }
  });

  console.log('[VoiceNotification] Service initialized');
}

/**
 * Open the IndexedDB for voice notifications
 */
async function openNotificationDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(NOTIFICATION_STORE_NAME)) {
        const store = db.createObjectStore(NOTIFICATION_STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('acknowledged', 'acknowledged', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Persist a notification to IndexedDB
 */
async function persistNotification(notification: VoiceNotification): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(notification);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error('[VoiceNotification] Error persisting notification:', error);
  }
}

/**
 * Load persisted notifications on startup
 */
async function loadPersistedNotifications(): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readonly');
    const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
    const index = store.index('acknowledged');
    
    const notifications = await new Promise<VoiceNotification[]>((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(false));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    notifications.forEach(notification => {
      activeNotifications.set(notification.id, notification);
    });

    db.close();
    console.log(`[VoiceNotification] Loaded ${notifications.length} pending notifications`);
  } catch (error) {
    console.error('[VoiceNotification] Error loading persisted notifications:', error);
  }
}

/**
 * Remove a notification from IndexedDB
 * @internal Can be used for cleanup after sync
 */
export async function removePersistedNotification(id: string): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error('[VoiceNotification] Error removing notification:', error);
  }
}

/**
 * Create a patient assignment notification
 */
export async function createAssignmentNotification(
  userId: string,
  patientId: string,
  patientName: string,
  hospitalName: string,
  wardName: string,
  bedNumber: string,
  assignmentType: 'primary_doctor' | 'primary_nurse' | 'staff_assignment'
): Promise<string> {
  const id = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Format the announcement message
  const roleLabel = assignmentType === 'primary_doctor' 
    ? 'Doctor' 
    : assignmentType === 'primary_nurse' 
      ? 'Nurse' 
      : 'Staff';
  
  const message = `Attention ${roleLabel}! New patient assignment. ${patientName} has been admitted to ${wardName}, Bed ${bedNumber}, at ${hospitalName}. Please acknowledge this assignment.`;

  const notification: VoiceNotification = {
    id,
    userId,
    patientId,
    patientName,
    hospitalName,
    wardName,
    bedNumber,
    assignmentType,
    message,
    acknowledged: false,
    createdAt: new Date(),
    repeatCount: 0,
    lastAnnouncedAt: undefined,
  };

  // Add to active notifications
  activeNotifications.set(id, notification);

  // Persist to IndexedDB
  await persistNotification(notification);

  // Send push notification (for when app is closed)
  await sendPushNotification(notification);

  // Start immediate announcement
  announceNotification(notification);

  console.log(`[VoiceNotification] Created notification: ${id} for user: ${userId}`);
  
  return id;
}

/**
 * Speak a notification using Text-to-Speech
 */
function announceNotification(notification: VoiceNotification): void {
  if (!speechSynthesis) {
    console.warn('[VoiceNotification] Speech synthesis not available');
    return;
  }

  // Cancel any current speech
  speechSynthesis.cancel();

  // Create the utterance
  currentUtterance = new SpeechSynthesisUtterance(notification.message);
  
  // Configure voice settings
  currentUtterance.rate = 0.9; // Slightly slower for clarity
  currentUtterance.pitch = 1.1; // Slightly higher pitch for urgency
  currentUtterance.volume = 1.0; // Full volume

  // Try to use a good voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
  ) || voices.find(v => v.lang.startsWith('en'));
  
  if (preferredVoice) {
    currentUtterance.voice = preferredVoice;
  }

  // Update the notification
  notification.repeatCount += 1;
  notification.lastAnnouncedAt = new Date();
  activeNotifications.set(notification.id, notification);
  persistNotification(notification);

  // Speak the message
  speechSynthesis.speak(currentUtterance);

  console.log(`[VoiceNotification] Announced: ${notification.id} (repeat #${notification.repeatCount})`);
}

/**
 * Start the announcement loop for repeated notifications
 */
function startAnnouncementLoop(): void {
  if (announcementInterval) {
    clearInterval(announcementInterval);
  }

  // Check for pending announcements every 30 seconds
  announcementInterval = setInterval(() => {
    announceNextPending();
  }, 30000); // 30 seconds between announcements

  console.log('[VoiceNotification] Announcement loop started');
}

/**
 * Announce the next pending notification
 */
function announceNextPending(): void {
  if (activeNotifications.size === 0) return;

  // Find unacknowledged notifications
  const pending = Array.from(activeNotifications.values()).filter(n => !n.acknowledged);
  
  if (pending.length === 0) return;

  // Get the current user ID
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;

  // Find notifications for this user
  const userNotifications = pending.filter(n => n.userId === currentUserId);
  
  if (userNotifications.length === 0) return;

  // Announce each notification
  userNotifications.forEach(notification => {
    announceNotification(notification);
  });
}

/**
 * Get the current user ID from the auth context
 */
function getCurrentUserId(): string | null {
  try {
    // Try to get from localStorage (where auth state might be stored)
    const authState = localStorage.getItem('carebridge-auth');
    if (authState) {
      const parsed = JSON.parse(authState);
      return parsed?.user?.id || null;
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Acknowledge a notification (stops repeated announcements)
 */
export async function acknowledgeNotification(notificationId: string): Promise<boolean> {
  const notification = activeNotifications.get(notificationId);
  
  if (!notification) {
    console.warn(`[VoiceNotification] Notification not found: ${notificationId}`);
    return false;
  }

  notification.acknowledged = true;
  notification.acknowledgedAt = new Date();
  
  // Update in memory
  activeNotifications.set(notificationId, notification);
  
  // Update in IndexedDB (mark as acknowledged for record keeping)
  await persistNotification(notification);
  
  // Remove from active tracking
  activeNotifications.delete(notificationId);

  // Stop current speech if it's this notification
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }

  console.log(`[VoiceNotification] Acknowledged: ${notificationId}`);
  
  return true;
}

/**
 * Acknowledge all notifications for a user
 */
export async function acknowledgeAllForUser(userId: string): Promise<number> {
  let count = 0;
  
  for (const [id, notification] of activeNotifications.entries()) {
    if (notification.userId === userId && !notification.acknowledged) {
      notification.acknowledged = true;
      notification.acknowledgedAt = new Date();
      await persistNotification(notification);
      activeNotifications.delete(id);
      count++;
    }
  }

  if (speechSynthesis) {
    speechSynthesis.cancel();
  }

  console.log(`[VoiceNotification] Acknowledged ${count} notifications for user: ${userId}`);
  
  return count;
}

/**
 * Get all pending notifications for a user
 */
export function getPendingNotifications(userId: string): VoiceNotification[] {
  return Array.from(activeNotifications.values()).filter(
    n => n.userId === userId && !n.acknowledged
  );
}

/**
 * Send a push notification (for background/closed app)
 */
async function sendPushNotification(notification: VoiceNotification): Promise<void> {
  // Check if we have notification permission
  if (!('Notification' in window)) {
    console.warn('[VoiceNotification] Push notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[VoiceNotification] Notification permission denied');
      return;
    }
  }

  // Get service worker registration
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const roleLabel = notification.assignmentType === 'primary_doctor' 
        ? 'Doctor' 
        : notification.assignmentType === 'primary_nurse' 
          ? 'Nurse' 
          : 'Staff';

      // Use service worker notification options (extended options including vibrate)
      const notificationOptions: NotificationOptions & { 
        vibrate?: number[]; 
        renotify?: boolean;
        actions?: Array<{ action: string; title: string }>;
      } = {
        body: `${notification.patientName} admitted to ${notification.wardName}, Bed ${notification.bedNumber} at ${notification.hospitalName}. Tap to acknowledge.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [500, 200, 500, 200, 500], // Urgent vibration pattern
        tag: `assignment-${notification.id}`,
        requireInteraction: true, // Keep notification until interacted with
        renotify: true,
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
      };

      await registration.showNotification(`🏥 New Patient Assignment - ${roleLabel}`, notificationOptions);

      console.log('[VoiceNotification] Push notification sent');
    } catch (error) {
      console.error('[VoiceNotification] Error sending push notification:', error);
    }
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('[VoiceNotification] Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('[VoiceNotification] Notifications have been denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Check if a user has pending notifications
 */
export function hasPendingNotifications(userId: string): boolean {
  return Array.from(activeNotifications.values()).some(
    n => n.userId === userId && !n.acknowledged
  );
}

/**
 * Stop all voice announcements
 */
export function stopAllAnnouncements(): void {
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
}

/**
 * Clean up old acknowledged notifications (call periodically)
 */
export async function cleanupOldNotifications(): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([NOTIFICATION_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(NOTIFICATION_STORE_NAME);
    
    // Get all notifications
    const allNotifications = await new Promise<VoiceNotification[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Delete acknowledged notifications older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const notification of allNotifications) {
      if (notification.acknowledged && new Date(notification.acknowledgedAt || 0) < cutoff) {
        store.delete(notification.id);
      }
    }

    db.close();
    console.log('[VoiceNotification] Cleanup completed');
  } catch (error) {
    console.error('[VoiceNotification] Error during cleanup:', error);
  }
}

// Export the service instance
export const voiceNotificationService = {
  init: initVoiceNotificationService,
  createAssignment: createAssignmentNotification,
  acknowledge: acknowledgeNotification,
  acknowledgeAllForUser,
  getPending: getPendingNotifications,
  hasPending: hasPendingNotifications,
  requestPermission: requestNotificationPermission,
  stopAll: stopAllAnnouncements,
  cleanup: cleanupOldNotifications,
};

export default voiceNotificationService;
