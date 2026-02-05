/**
 * MDT Notification Service
 * Handles push notifications and voice announcements for MDT specialist invitations
 * Supports repeated announcements until the specialist submits their specialty plan
 */

// Types for MDT notifications
export interface MDTInvitation {
  id: string;
  mdtMeetingId: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  hospitalName: string;
  specialistId: string;
  specialistName: string;
  specialty: string;
  invitedBy: string;
  invitedByName: string;
  message: string;
  status: 'pending' | 'acknowledged' | 'plan_submitted';
  acknowledged: boolean;
  acknowledgedAt?: Date;
  planSubmittedAt?: Date;
  createdAt: Date;
  repeatCount: number;
  lastAnnouncedAt?: Date;
  // Patient details for display
  patientDetails?: {
    age?: number;
    gender?: string;
    admissionDiagnosis?: string;
    wardName?: string;
    bedNumber?: string;
  };
}

// Store for active invitations
const activeInvitations: Map<string, MDTInvitation> = new Map();
let announcementInterval: NodeJS.Timeout | null = null;
let speechSynthesis: SpeechSynthesis | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// IndexedDB store for persistent notifications
const MDT_NOTIFICATION_DB = 'carebridge-mdt-invitations';
const MDT_NOTIFICATION_STORE = 'pending-mdt-invitations';

/**
 * Initialize the MDT notification service
 */
export async function initMDTNotificationService(): Promise<void> {
  // Check for Web Speech API support
  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
    console.log('[MDTNotification] Speech synthesis available');
  } else {
    console.warn('[MDTNotification] Speech synthesis not supported');
  }

  // Load any persisted pending invitations
  await loadPersistedInvitations();

  // Start the announcement loop
  startAnnouncementLoop();

  // Listen for visibility changes to resume announcements
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Resume announcements when app becomes visible
      announceNextPending();
    }
  });

  console.log('[MDTNotification] Service initialized');
}

/**
 * Open the IndexedDB for MDT notifications
 */
async function openNotificationDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MDT_NOTIFICATION_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MDT_NOTIFICATION_STORE)) {
        const store = db.createObjectStore(MDT_NOTIFICATION_STORE, { keyPath: 'id' });
        store.createIndex('specialistId', 'specialistId', { unique: false });
        store.createIndex('mdtMeetingId', 'mdtMeetingId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Persist an invitation to IndexedDB
 */
async function persistInvitation(invitation: MDTInvitation): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([MDT_NOTIFICATION_STORE], 'readwrite');
    const store = transaction.objectStore(MDT_NOTIFICATION_STORE);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(invitation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error('[MDTNotification] Error persisting invitation:', error);
  }
}

/**
 * Load persisted invitations on startup
 */
async function loadPersistedInvitations(): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([MDT_NOTIFICATION_STORE], 'readonly');
    const store = transaction.objectStore(MDT_NOTIFICATION_STORE);
    
    const invitations = await new Promise<MDTInvitation[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        // Filter for pending invitations (not yet plan_submitted)
        resolve(all.filter((inv: MDTInvitation) => inv.status === 'pending' || inv.status === 'acknowledged'));
      };
      request.onerror = () => reject(request.error);
    });

    invitations.forEach(invitation => {
      activeInvitations.set(invitation.id, invitation);
    });

    db.close();
    console.log(`[MDTNotification] Loaded ${invitations.length} pending invitations`);
  } catch (error) {
    console.error('[MDTNotification] Error loading persisted invitations:', error);
  }
}

/**
 * Create an MDT specialist invitation
 */
export async function createMDTInvitation(params: {
  mdtMeetingId: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  hospitalName: string;
  specialistId: string;
  specialistName: string;
  specialty: string;
  invitedBy: string;
  invitedByName: string;
  patientDetails?: {
    age?: number;
    gender?: string;
    admissionDiagnosis?: string;
    wardName?: string;
    bedNumber?: string;
  };
}): Promise<string> {
  const id = `mdt-inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Format the announcement message
  const message = `Attention ${params.specialty} specialist! You have been invited to an MDT meeting for patient ${params.patientName} at ${params.hospitalName}. Please review the case and submit your specialty care plan. Tap the notification to proceed.`;

  const invitation: MDTInvitation = {
    id,
    mdtMeetingId: params.mdtMeetingId,
    patientId: params.patientId,
    patientName: params.patientName,
    hospitalId: params.hospitalId,
    hospitalName: params.hospitalName,
    specialistId: params.specialistId,
    specialistName: params.specialistName,
    specialty: params.specialty,
    invitedBy: params.invitedBy,
    invitedByName: params.invitedByName,
    message,
    status: 'pending',
    acknowledged: false,
    createdAt: new Date(),
    repeatCount: 0,
    patientDetails: params.patientDetails,
  };

  // Add to active invitations
  activeInvitations.set(id, invitation);

  // Persist to IndexedDB
  await persistInvitation(invitation);

  // Send push notification (for when app is closed)
  await sendMDTPushNotification(invitation);

  // Start immediate announcement
  announceMDTInvitation(invitation);

  console.log(`[MDTNotification] Created MDT invitation: ${id} for specialist: ${params.specialistId}`);
  
  return id;
}

/**
 * Speak an MDT invitation using Text-to-Speech
 */
function announceMDTInvitation(invitation: MDTInvitation): void {
  if (!speechSynthesis) {
    console.warn('[MDTNotification] Speech synthesis not available');
    return;
  }

  // Cancel any current speech
  speechSynthesis.cancel();

  // Create the utterance
  currentUtterance = new SpeechSynthesisUtterance(invitation.message);
  
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

  // Update the invitation
  invitation.repeatCount += 1;
  invitation.lastAnnouncedAt = new Date();
  activeInvitations.set(invitation.id, invitation);
  persistInvitation(invitation);

  // Speak the message
  speechSynthesis.speak(currentUtterance);

  console.log(`[MDTNotification] Announced MDT invitation: ${invitation.id} (repeat #${invitation.repeatCount})`);
}

/**
 * Start the announcement loop for repeated MDT notifications
 */
function startAnnouncementLoop(): void {
  if (announcementInterval) {
    clearInterval(announcementInterval);
  }

  // Check for pending announcements every 45 seconds
  announcementInterval = setInterval(() => {
    announceNextPending();
  }, 45000); // 45 seconds between announcements

  console.log('[MDTNotification] Announcement loop started');
}

/**
 * Announce the next pending MDT invitation
 */
function announceNextPending(): void {
  if (activeInvitations.size === 0) return;

  // Find pending invitations (not yet plan_submitted)
  const pending = Array.from(activeInvitations.values()).filter(
    inv => inv.status !== 'plan_submitted'
  );
  
  if (pending.length === 0) return;

  // Get the current user ID
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;

  // Find invitations for this specialist
  const userInvitations = pending.filter(inv => inv.specialistId === currentUserId);
  
  if (userInvitations.length === 0) return;

  // Announce each invitation
  userInvitations.forEach(invitation => {
    // Only re-announce if last announcement was more than 30 seconds ago
    const lastAnnounced = invitation.lastAnnouncedAt ? new Date(invitation.lastAnnouncedAt) : null;
    const timeSinceLastAnnouncement = lastAnnounced 
      ? Date.now() - lastAnnounced.getTime() 
      : Infinity;
    
    if (timeSinceLastAnnouncement > 30000) {
      announceMDTInvitation(invitation);
    }
  });
}

/**
 * Get the current user ID from localStorage
 */
function getCurrentUserId(): string | null {
  try {
    const userId = localStorage.getItem('AstroHEALTH_user_id');
    return userId;
  } catch {
    return null;
  }
}

/**
 * Acknowledge an MDT invitation (user opened it)
 */
export async function acknowledgeMDTInvitation(invitationId: string): Promise<boolean> {
  const invitation = activeInvitations.get(invitationId);
  
  if (!invitation) {
    console.warn(`[MDTNotification] Invitation not found: ${invitationId}`);
    return false;
  }

  invitation.acknowledged = true;
  invitation.acknowledgedAt = new Date();
  invitation.status = 'acknowledged';
  
  // Update in memory and storage
  activeInvitations.set(invitationId, invitation);
  await persistInvitation(invitation);

  console.log(`[MDTNotification] Acknowledged: ${invitationId}`);
  
  // NOTE: We don't stop announcements here - they continue until plan is submitted
  return true;
}

/**
 * Mark an MDT invitation as plan submitted (stops all announcements)
 */
export async function markMDTPlanSubmitted(invitationId: string): Promise<boolean> {
  const invitation = activeInvitations.get(invitationId);
  
  if (!invitation) {
    // Try to find by meeting ID and specialist
    for (const inv of activeInvitations.values()) {
      if (inv.id === invitationId || inv.mdtMeetingId === invitationId) {
        inv.status = 'plan_submitted';
        inv.planSubmittedAt = new Date();
        activeInvitations.set(inv.id, inv);
        await persistInvitation(inv);
        activeInvitations.delete(inv.id);
        
        console.log(`[MDTNotification] Plan submitted for: ${inv.id}`);
        return true;
      }
    }
    console.warn(`[MDTNotification] Invitation not found: ${invitationId}`);
    return false;
  }

  invitation.status = 'plan_submitted';
  invitation.planSubmittedAt = new Date();
  
  // Update in storage
  await persistInvitation(invitation);
  
  // Remove from active tracking
  activeInvitations.delete(invitationId);

  // Stop current speech
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }

  console.log(`[MDTNotification] Plan submitted, notifications stopped: ${invitationId}`);
  
  return true;
}

/**
 * Mark plan submitted by meeting ID and specialist ID
 */
export async function markPlanSubmittedByMeetingAndSpecialist(
  meetingId: string, 
  specialistId: string
): Promise<boolean> {
  for (const [id, inv] of activeInvitations.entries()) {
    if (inv.mdtMeetingId === meetingId && inv.specialistId === specialistId) {
      inv.status = 'plan_submitted';
      inv.planSubmittedAt = new Date();
      await persistInvitation(inv);
      activeInvitations.delete(id);
      
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      
      console.log(`[MDTNotification] Plan submitted for meeting ${meetingId} by specialist ${specialistId}`);
      return true;
    }
  }
  return false;
}

/**
 * Get all pending MDT invitations for a specialist
 */
export function getPendingMDTInvitations(specialistId: string): MDTInvitation[] {
  return Array.from(activeInvitations.values()).filter(
    inv => inv.specialistId === specialistId && inv.status !== 'plan_submitted'
  );
}

/**
 * Get an invitation by ID
 */
export function getMDTInvitation(invitationId: string): MDTInvitation | undefined {
  return activeInvitations.get(invitationId);
}

/**
 * Get invitation by meeting ID and specialist ID
 */
export function getMDTInvitationByMeetingAndSpecialist(
  meetingId: string, 
  specialistId: string
): MDTInvitation | undefined {
  for (const inv of activeInvitations.values()) {
    if (inv.mdtMeetingId === meetingId && inv.specialistId === specialistId) {
      return inv;
    }
  }
  return undefined;
}

/**
 * Send a push notification for MDT invitation (for background/closed app)
 */
async function sendMDTPushNotification(invitation: MDTInvitation): Promise<void> {
  // Check if we have notification permission
  if (!('Notification' in window)) {
    console.warn('[MDTNotification] Push notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[MDTNotification] Notification permission denied');
      return;
    }
  }

  // Get service worker registration
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;

      const notificationOptions: NotificationOptions & { 
        vibrate?: number[]; 
        renotify?: boolean;
        actions?: Array<{ action: string; title: string }>;
      } = {
        body: `Patient: ${invitation.patientName} at ${invitation.hospitalName}. You need to submit your ${invitation.specialty} care plan for the MDT meeting.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [500, 200, 500, 200, 500], // Urgent vibration pattern
        tag: `mdt-invitation-${invitation.id}`,
        requireInteraction: true, // Keep notification until interacted with
        renotify: true,
        data: {
          type: 'mdt_invitation',
          invitationId: invitation.id,
          mdtMeetingId: invitation.mdtMeetingId,
          patientId: invitation.patientId,
          specialistId: invitation.specialistId,
          url: `/clinical/mdt?invitation=${invitation.id}&meeting=${invitation.mdtMeetingId}&patient=${invitation.patientId}`,
        },
        actions: [
          { action: 'open', title: '📋 Open MDT' },
          { action: 'acknowledge', title: '✓ Acknowledge' }
        ]
      };

      await registration.showNotification(`🏥 MDT Invitation - ${invitation.specialty}`, notificationOptions);

      console.log('[MDTNotification] Push notification sent');
    } catch (error) {
      console.error('[MDTNotification] Error sending push notification:', error);
    }
  }
}

/**
 * Re-send push notification for a pending invitation
 * Called periodically by the service worker when app is closed
 */
export async function resendMDTPushNotifications(): Promise<void> {
  const pending = Array.from(activeInvitations.values()).filter(
    inv => inv.status !== 'plan_submitted'
  );
  
  for (const invitation of pending) {
    await sendMDTPushNotification(invitation);
  }
}

/**
 * Check if a user has pending MDT invitations
 */
export function hasPendingMDTInvitations(specialistId: string): boolean {
  return Array.from(activeInvitations.values()).some(
    inv => inv.specialistId === specialistId && inv.status !== 'plan_submitted'
  );
}

/**
 * Stop all MDT voice announcements
 */
export function stopAllMDTAnnouncements(): void {
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
}

/**
 * Get all active invitations (for debugging/admin)
 */
export function getAllActiveInvitations(): MDTInvitation[] {
  return Array.from(activeInvitations.values());
}

/**
 * Clean up old completed invitations
 */
export async function cleanupOldMDTInvitations(): Promise<void> {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction([MDT_NOTIFICATION_STORE], 'readwrite');
    const store = transaction.objectStore(MDT_NOTIFICATION_STORE);
    
    const allInvitations = await new Promise<MDTInvitation[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Delete plan_submitted invitations older than 7 days
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const invitation of allInvitations) {
      if (invitation.status === 'plan_submitted' && 
          invitation.planSubmittedAt && 
          new Date(invitation.planSubmittedAt) < cutoff) {
        store.delete(invitation.id);
      }
    }

    db.close();
    console.log('[MDTNotification] Cleanup completed');
  } catch (error) {
    console.error('[MDTNotification] Error during cleanup:', error);
  }
}

// Export the service instance
export const mdtNotificationService = {
  init: initMDTNotificationService,
  createInvitation: createMDTInvitation,
  acknowledge: acknowledgeMDTInvitation,
  markPlanSubmitted: markMDTPlanSubmitted,
  markPlanSubmittedByMeetingAndSpecialist,
  getPending: getPendingMDTInvitations,
  getInvitation: getMDTInvitation,
  getByMeetingAndSpecialist: getMDTInvitationByMeetingAndSpecialist,
  hasPending: hasPendingMDTInvitations,
  stopAll: stopAllMDTAnnouncements,
  getAllActive: getAllActiveInvitations,
  cleanup: cleanupOldMDTInvitations,
  resendNotifications: resendMDTPushNotifications,
};

export default mdtNotificationService;
