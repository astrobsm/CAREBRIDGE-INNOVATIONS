// Web Push Notification Service
// Full implementation for push notifications that work even when app is closed
// Uses VAPID keys for secure push and service worker for background handling

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { db } from '../database';

// ============================================
// TYPES
// ============================================

export interface PushSubscriptionData {
  id?: string;
  userId: string;
  hospitalId?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  // Notification preferences
  preferences: PushNotificationPreferences;
}

export interface PushNotificationPreferences {
  // Clinical notifications
  patientAssignments: boolean;
  surgeryReminders: boolean;
  appointmentReminders: boolean;
  labResults: boolean;
  investigationResults: boolean;
  prescriptionReady: boolean;
  treatmentPlanUpdates: boolean;
  vitalAlerts: boolean;
  // Administrative
  staffMessages: boolean;
  systemAlerts: boolean;
  // Settings
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;   // HH:mm format
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  renotify?: boolean;
}

// ============================================
// VAPID KEY CONFIGURATION
// ============================================

// VAPID public key - this should be set in environment variables
// Generate keys using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Check if VAPID is configured
export function isVapidConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

// Convert VAPID public key to Uint8Array for subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

// Check if push is supported
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Get current push subscription
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('[WebPush] Error getting subscription:', error);
    return null;
  }
}

// Subscribe to push notifications
export async function subscribeToPush(
  userId: string,
  hospitalId?: string,
  preferences?: Partial<PushNotificationPreferences>
): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('[WebPush] Push notifications not supported');
    return null;
  }

  if (!isVapidConfigured()) {
    console.warn('[WebPush] VAPID public key not configured');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[WebPush] Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Extract subscription keys
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!p256dh || !auth) {
      throw new Error('Failed to get subscription keys');
    }

    // Create subscription data
    const subscriptionData: PushSubscriptionData = {
      userId,
      hospitalId,
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(p256dh),
      auth: arrayBufferToBase64(auth),
      userAgent: navigator.userAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      preferences: {
        patientAssignments: true,
        surgeryReminders: true,
        appointmentReminders: true,
        labResults: true,
        investigationResults: true,
        prescriptionReady: true,
        treatmentPlanUpdates: true,
        vitalAlerts: true,
        staffMessages: true,
        systemAlerts: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        ...preferences,
      },
    };

    // Save to local IndexedDB
    await saveSubscriptionLocally(subscriptionData);

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      await saveSubscriptionToCloud(subscriptionData);
    }

    console.log('[WebPush] Successfully subscribed to push notifications');
    return subscriptionData;
  } catch (error) {
    console.error('[WebPush] Error subscribing to push:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    // Get current subscription
    const subscription = await getCurrentSubscription();
    
    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe();
    }

    // Remove from local storage
    await removeSubscriptionLocally(userId);

    // Remove from cloud
    if (isSupabaseConfigured()) {
      await removeSubscriptionFromCloud(userId);
    }

    console.log('[WebPush] Successfully unsubscribed from push notifications');
    return true;
  } catch (error) {
    console.error('[WebPush] Error unsubscribing:', error);
    return false;
  }
}

// Update subscription preferences
export async function updateSubscriptionPreferences(
  userId: string,
  preferences: Partial<PushNotificationPreferences>
): Promise<boolean> {
  try {
    // Update locally
    const subscription = await getLocalSubscription(userId);
    if (subscription) {
      subscription.preferences = { ...subscription.preferences, ...preferences };
      subscription.updatedAt = new Date();
      await saveSubscriptionLocally(subscription);
    }

    // Update in cloud
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('push_subscriptions')
        .update({
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    return true;
  } catch (error) {
    console.error('[WebPush] Error updating preferences:', error);
    return false;
  }
}

// ============================================
// LOCAL STORAGE (IndexedDB)
// ============================================

const PUSH_SUBSCRIPTION_DB = 'carebridge-push-subscriptions';
const PUSH_SUBSCRIPTION_STORE = 'subscriptions';

async function openPushDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PUSH_SUBSCRIPTION_DB, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(PUSH_SUBSCRIPTION_STORE)) {
        const store = database.createObjectStore(PUSH_SUBSCRIPTION_STORE, { keyPath: 'userId' });
        store.createIndex('endpoint', 'endpoint', { unique: true });
        store.createIndex('isActive', 'isActive', { unique: false });
      }
    };
  });
}

async function saveSubscriptionLocally(subscription: PushSubscriptionData): Promise<void> {
  const database = await openPushDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PUSH_SUBSCRIPTION_STORE], 'readwrite');
    const store = transaction.objectStore(PUSH_SUBSCRIPTION_STORE);
    const request = store.put(subscription);
    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

async function getLocalSubscription(userId: string): Promise<PushSubscriptionData | null> {
  const database = await openPushDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PUSH_SUBSCRIPTION_STORE], 'readonly');
    const store = transaction.objectStore(PUSH_SUBSCRIPTION_STORE);
    const request = store.get(userId);
    request.onsuccess = () => {
      database.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

async function removeSubscriptionLocally(userId: string): Promise<void> {
  const database = await openPushDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PUSH_SUBSCRIPTION_STORE], 'readwrite');
    const store = transaction.objectStore(PUSH_SUBSCRIPTION_STORE);
    const request = store.delete(userId);
    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

// ============================================
// CLOUD STORAGE (Supabase)
// ============================================

async function saveSubscriptionToCloud(subscription: PushSubscriptionData): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from('push_subscriptions').upsert({
      user_id: subscription.userId,
      hospital_id: subscription.hospitalId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: subscription.userAgent,
      preferences: subscription.preferences,
      is_active: subscription.isActive,
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString(),
    }, {
      onConflict: 'endpoint',
    });
  } catch (error) {
    console.error('[WebPush] Error saving to cloud:', error);
  }
}

async function removeSubscriptionFromCloud(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId);
  } catch (error) {
    console.error('[WebPush] Error removing from cloud:', error);
  }
}

// ============================================
// SEND PUSH NOTIFICATIONS
// ============================================

// Send push notification to a specific user
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    // Fallback to local notification
    return showLocalPushNotification(payload);
  }

  try {
    // Call Supabase Edge Function to send push
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        payload,
      },
    });

    if (error) {
      console.error('[WebPush] Error sending push:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[WebPush] Error sending push:', error);
    return false;
  }
}

// Send push notification to multiple users
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );

  const success = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length;

  return { success, failed: userIds.length - success };
}

// Send push notification to all users in a hospital
export async function sendPushToHospital(
  hospitalId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: 0, failed: 0 };
  }

  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        hospitalId,
        payload,
      },
    });

    if (error) {
      console.error('[WebPush] Error sending hospital push:', error);
      return { success: 0, failed: 1 };
    }

    return { success: 1, failed: 0 };
  } catch (error) {
    console.error('[WebPush] Error sending hospital push:', error);
    return { success: 0, failed: 1 };
  }
}

// Send push notification by role
export async function sendPushByRole(
  role: string,
  hospitalId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: 0, failed: 0 };
  }

  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        role,
        hospitalId,
        payload,
      },
    });

    if (error) {
      console.error('[WebPush] Error sending role push:', error);
      return { success: 0, failed: 1 };
    }

    return { success: 1, failed: 0 };
  } catch (error) {
    console.error('[WebPush] Error sending role push:', error);
    return { success: 0, failed: 1 };
  }
}

// ============================================
// LOCAL FALLBACK NOTIFICATIONS
// ============================================

async function showLocalPushNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      image: payload.image,
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      timestamp: payload.timestamp,
      renotify: payload.renotify,
    });
    return true;
  } catch (error) {
    console.error('[WebPush] Error showing local notification:', error);
    return false;
  }
}

// ============================================
// NOTIFICATION TYPE HELPERS
// ============================================

// Patient assignment notification
export async function sendPatientAssignmentNotification(
  userId: string,
  patientName: string,
  wardName: string,
  bedNumber: string,
  assignmentType: 'doctor' | 'nurse' | 'staff'
): Promise<boolean> {
  const roleLabel = assignmentType === 'doctor' ? 'Primary Doctor' : 
                    assignmentType === 'nurse' ? 'Primary Nurse' : 'Staff';
  
  return sendPushToUser(userId, {
    title: `🏥 New Patient Assignment - ${roleLabel}`,
    body: `${patientName} has been assigned to you at ${wardName}, Bed ${bedNumber}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `assignment-${Date.now()}`,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
    data: {
      type: 'patient_assignment',
      patientName,
      wardName,
      bedNumber,
      url: '/dashboard',
    },
    actions: [
      { action: 'view', title: 'View Patient' },
      { action: 'acknowledge', title: 'Acknowledge' },
    ],
  });
}

// Surgery reminder notification
export async function sendSurgeryReminderNotification(
  userId: string,
  patientName: string,
  procedureName: string,
  scheduledTime: string,
  minutesBefore: number
): Promise<boolean> {
  const timeLabel = minutesBefore >= 60 
    ? `${Math.floor(minutesBefore / 60)} hour(s)`
    : `${minutesBefore} minutes`;

  return sendPushToUser(userId, {
    title: `🔪 Surgery Reminder - ${timeLabel}`,
    body: `${procedureName} for ${patientName} scheduled at ${scheduledTime}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `surgery-${Date.now()}`,
    requireInteraction: minutesBefore <= 30,
    vibrate: minutesBefore <= 15 ? [500, 200, 500, 200, 500] : [200, 100, 200],
    data: {
      type: 'surgery_reminder',
      patientName,
      procedureName,
      scheduledTime,
      url: '/surgery',
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

// Lab results notification
export async function sendLabResultsNotification(
  userId: string,
  patientName: string,
  testName: string,
  isAbnormal: boolean
): Promise<boolean> {
  return sendPushToUser(userId, {
    title: isAbnormal ? '⚠️ Abnormal Lab Results' : '🧪 Lab Results Ready',
    body: `${testName} results for ${patientName} are now available`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `lab-${Date.now()}`,
    requireInteraction: isAbnormal,
    vibrate: isAbnormal ? [300, 100, 300, 100, 300] : [200],
    data: {
      type: 'lab_results',
      patientName,
      testName,
      isAbnormal,
      url: '/laboratory',
    },
    actions: [
      { action: 'view', title: 'View Results' },
    ],
  });
}

// Vital alert notification
export async function sendVitalAlertNotification(
  userId: string,
  patientName: string,
  vitalType: string,
  value: string,
  severity: 'warning' | 'critical'
): Promise<boolean> {
  return sendPushToUser(userId, {
    title: severity === 'critical' ? '🚨 CRITICAL Vital Alert' : '⚠️ Vital Alert',
    body: `${patientName}: ${vitalType} is ${value}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `vital-${Date.now()}`,
    requireInteraction: true,
    vibrate: severity === 'critical' 
      ? [1000, 200, 1000, 200, 1000] 
      : [500, 200, 500],
    data: {
      type: 'vital_alert',
      patientName,
      vitalType,
      value,
      severity,
      url: '/vitals',
    },
    actions: [
      { action: 'view', title: 'View Patient' },
      { action: 'acknowledge', title: 'Acknowledge' },
    ],
  });
}

// ============================================
// UTILITIES
// ============================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize push notifications for a user
export async function initializePushNotifications(
  userId: string,
  hospitalId?: string
): Promise<boolean> {
  if (!isPushSupported()) {
    console.log('[WebPush] Push notifications not supported');
    return false;
  }

  // Check if already subscribed
  const existingSubscription = await getCurrentSubscription();
  const localSubscription = await getLocalSubscription(userId);

  if (existingSubscription && localSubscription?.isActive) {
    console.log('[WebPush] Already subscribed to push notifications');
    return true;
  }

  // Subscribe
  const subscription = await subscribeToPush(userId, hospitalId);
  return subscription !== null;
}

// Check subscription status
export async function getSubscriptionStatus(userId: string): Promise<{
  isSubscribed: boolean;
  preferences: PushNotificationPreferences | null;
}> {
  const subscription = await getCurrentSubscription();
  const localData = await getLocalSubscription(userId);

  return {
    isSubscribed: subscription !== null && localData?.isActive === true,
    preferences: localData?.preferences || null,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Configuration
  isPushSupported,
  isVapidConfigured,
  // Subscription management
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  getSubscriptionStatus,
  updateSubscriptionPreferences,
  initializePushNotifications,
  // Send notifications
  sendPushToUser,
  sendPushToUsers,
  sendPushToHospital,
  sendPushByRole,
  // Notification types
  sendPatientAssignmentNotification,
  sendSurgeryReminderNotification,
  sendLabResultsNotification,
  sendVitalAlertNotification,
};
