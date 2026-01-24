// Scheduled Notification Service
// Comprehensive push notifications with voice alarms for surgeries, appointments, and treatment plans
// Works even when app is not open via Service Worker

import { format, differenceInMinutes, addMinutes, isToday, isTomorrow, parseISO } from 'date-fns';
import { db } from '../database';
import type { Surgery, Appointment, TreatmentPlan, Patient, Hospital, Investigation, LabRequest, Prescription } from '../types';

// ============================================
// TYPES
// ============================================

export interface ScheduledEvent {
  id: string;
  type: 'surgery' | 'appointment' | 'treatment_plan';
  title: string;
  patientName: string;
  patientId: string;
  hospitalName: string;
  scheduledDateTime: Date;
  location?: string;
  details: string;
  priority: 'routine' | 'urgent' | 'emergency';
  notificationTimes: number[]; // Minutes before event to notify
}

export interface NotificationSchedule {
  eventId: string;
  eventType: string;
  scheduledTime: Date;
  minutesBefore: number;
  notified: boolean;
  voiceAlarmPlayed: boolean;
}

// Store for scheduled notifications
const NOTIFICATION_DB = 'carebridge-notifications';
const NOTIFICATION_STORE = 'scheduled-notifications';

// Default notification times (minutes before event)
const DEFAULT_SURGERY_NOTIFICATION_TIMES = [1440, 120, 60, 30, 15, 5]; // 24h, 2h, 1h, 30m, 15m, 5m
const DEFAULT_APPOINTMENT_NOTIFICATION_TIMES = [1440, 120, 30, 15]; // 24h, 2h, 30m, 15m
const DEFAULT_TREATMENT_NOTIFICATION_TIMES = [60, 30, 15]; // 1h, 30m, 15m

// ============================================
// NOTIFICATION DATABASE MANAGEMENT
// ============================================

class NotificationScheduleDB {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(NOTIFICATION_DB, 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
          const store = db.createObjectStore(NOTIFICATION_STORE, { keyPath: 'id' });
          store.createIndex('eventId', 'eventId', { unique: false });
          store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
          store.createIndex('notified', 'notified', { unique: false });
        }
      };
    });
  }

  async add(schedule: NotificationSchedule & { id: string }): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
      const store = transaction.objectStore(NOTIFICATION_STORE);
      const req = store.put(schedule);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(): Promise<NotificationSchedule[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTIFICATION_STORE], 'readonly');
      const store = transaction.objectStore(NOTIFICATION_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getPending(): Promise<NotificationSchedule[]> {
    const all = await this.getAll();
    const now = new Date();
    return all.filter(s => !s.notified && new Date(s.scheduledTime) <= now);
  }

  async getUpcoming(withinMinutes: number = 60): Promise<NotificationSchedule[]> {
    const all = await this.getAll();
    const now = new Date();
    const threshold = addMinutes(now, withinMinutes);
    return all.filter(s => !s.notified && new Date(s.scheduledTime) <= threshold);
  }

  async markNotified(id: string, voicePlayed: boolean = false): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
      const store = transaction.objectStore(NOTIFICATION_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const data = getReq.result;
        if (data) {
          data.notified = true;
          data.voiceAlarmPlayed = voicePlayed;
          store.put(data);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async deleteByEventId(eventId: string): Promise<void> {
    const all = await this.getAll();
    const toDelete = all.filter(s => s.eventId === eventId);
    const db = await this.dbPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
      const store = transaction.objectStore(NOTIFICATION_STORE);
      
      for (const item of toDelete) {
        store.delete((item as any).id);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async cleanup(): Promise<void> {
    const all = await this.getAll();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const toDelete = all.filter(s => s.notified && new Date(s.scheduledTime) < oneDayAgo);
    
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
      const store = transaction.objectStore(NOTIFICATION_STORE);
      
      for (const item of toDelete) {
        store.delete((item as any).id);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

const notificationDB = new NotificationScheduleDB();

// ============================================
// VOICE ALARM FUNCTIONALITY
// ============================================

let speechSynthesis: SpeechSynthesis | null = null;
let voiceEnabled = true;

export function initVoiceAlarm(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
    // Load voices
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => {
      speechSynthesis?.getVoices();
    };
  }
}

export function setVoiceEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
  localStorage.setItem('carebridge_voice_alarms', enabled ? 'true' : 'false');
}

export function isVoiceEnabled(): boolean {
  const stored = localStorage.getItem('carebridge_voice_alarms');
  return stored !== 'false';
}

export function playVoiceAlarm(message: string, urgency: 'low' | 'medium' | 'high' = 'medium'): boolean {
  if (!speechSynthesis || !isVoiceEnabled()) {
    return false;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  
  // Set voice properties based on urgency
  switch (urgency) {
    case 'high':
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;
      break;
    case 'medium':
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      break;
    case 'low':
      utterance.rate = 0.9;
      utterance.pitch = 0.9;
      utterance.volume = 0.8;
      break;
  }

  // Select a suitable voice
  const voices = speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.startsWith('en-'));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  // Play alarm sound before voice
  playAlarmSound(urgency);

  // Speak the message
  speechSynthesis.speak(utterance);
  
  return true;
}

function playAlarmSound(urgency: 'low' | 'medium' | 'high'): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different tones for different urgencies
    switch (urgency) {
      case 'high':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.5;
        oscillator.type = 'square';
        break;
      case 'medium':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.3;
        oscillator.type = 'sine';
        break;
      case 'low':
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.2;
        oscillator.type = 'sine';
        break;
    }

    oscillator.start();
    
    // Quick beeps
    setTimeout(() => oscillator.stop(), 200);
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      osc2.connect(gainNode);
      osc2.frequency.value = oscillator.frequency.value;
      osc2.type = oscillator.type;
      osc2.start();
      setTimeout(() => osc2.stop(), 200);
    }, 300);
  } catch (e) {
    console.warn('Could not play alarm sound:', e);
  }
}

// ============================================
// PUSH NOTIFICATION HELPERS
// ============================================

export async function showPushNotification(
  title: string,
  body: string,
  options: NotificationOptions & { url?: string; voiceMessage?: string; urgency?: 'low' | 'medium' | 'high' } = {}
): Promise<void> {
  const { voiceMessage, urgency = 'medium', ...notificationOptions } = options;

  // Request permission if needed
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }
  }

  // Show notification via service worker if available
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: urgency === 'high' ? [200, 100, 200, 100, 200] : [100, 50, 100],
      tag: `carebridge-${Date.now()}`,
      requireInteraction: urgency === 'high',
      ...notificationOptions,
    });
  } else {
    new Notification(title, { body, ...notificationOptions });
  }

  // Play voice alarm if enabled and message provided
  if (voiceMessage && isVoiceEnabled()) {
    playVoiceAlarm(voiceMessage, urgency);
  }
}

// ============================================
// EVENT FETCHING AND SCHEDULING
// ============================================

async function getPatientName(patientId: string): Promise<string> {
  const patient = await db.patients.get(patientId);
  return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
}

async function getHospitalName(hospitalId: string): Promise<string> {
  const hospital = await db.hospitals.get(hospitalId);
  return hospital?.name || 'Hospital';
}

export async function fetchUpcomingSurgeries(): Promise<ScheduledEvent[]> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);
  
  const surgeries = await db.surgeries
    .where('status')
    .anyOf(['scheduled', 'confirmed'])
    .filter(s => {
      const scheduledDate = new Date(s.scheduledDate);
      return scheduledDate >= now && scheduledDate <= tomorrow;
    })
    .toArray();

  const events: ScheduledEvent[] = [];
  
  for (const surgery of surgeries) {
    const patientName = await getPatientName(surgery.patientId);
    const hospitalName = await getHospitalName(surgery.hospitalId);
    
    // Parse scheduled date and time
    const scheduledDate = new Date(surgery.scheduledDate);
    // If surgery has a specific time, use it
    if (surgery.scheduledTime) {
      const [hours, minutes] = surgery.scheduledTime.split(':').map(Number);
      scheduledDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 8 AM if no time specified
      scheduledDate.setHours(8, 0, 0, 0);
    }

    events.push({
      id: surgery.id,
      type: 'surgery',
      title: surgery.procedureName || 'Scheduled Surgery',
      patientName,
      patientId: surgery.patientId,
      hospitalName,
      scheduledDateTime: scheduledDate,
      location: surgery.operatingRoom || 'Theatre',
      details: `Surgeon: ${surgery.surgeon || 'Not assigned'}`,
      priority: surgery.priority as any || 'routine',
      notificationTimes: DEFAULT_SURGERY_NOTIFICATION_TIMES,
    });
  }

  return events;
}

export async function fetchUpcomingAppointments(): Promise<ScheduledEvent[]> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);
  
  const appointments = await db.appointments
    .where('status')
    .anyOf(['scheduled', 'confirmed'])
    .filter(a => {
      const aptDate = new Date(a.appointmentDate);
      return aptDate >= now && aptDate <= tomorrow;
    })
    .toArray();

  const events: ScheduledEvent[] = [];
  
  for (const apt of appointments) {
    const patientName = await getPatientName(apt.patientId);
    const hospitalName = await getHospitalName(apt.hospitalId);
    
    // Parse appointment date and time
    const aptDate = new Date(apt.appointmentDate);
    const [hours, minutes] = apt.appointmentTime.split(':').map(Number);
    aptDate.setHours(hours, minutes, 0, 0);

    events.push({
      id: apt.id,
      type: 'appointment',
      title: apt.reasonForVisit || 'Appointment',
      patientName,
      patientId: apt.patientId,
      hospitalName,
      scheduledDateTime: aptDate,
      location: apt.location?.department || 'Clinic',
      details: `Doctor: ${apt.clinicianName || 'Not assigned'}`,
      priority: apt.priority as any || 'routine',
      notificationTimes: DEFAULT_APPOINTMENT_NOTIFICATION_TIMES,
    });
  }

  return events;
}

export async function fetchUpcomingTreatmentPlans(): Promise<ScheduledEvent[]> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);
  
  const plans = await db.treatmentPlans
    .where('status')
    .anyOf(['active', 'scheduled'])
    .toArray();

  const events: ScheduledEvent[] = [];
  
  for (const plan of plans) {
    // Check if plan has scheduled activities for today/tomorrow
    if (!plan.scheduledActivities) continue;
    
    for (const activity of plan.scheduledActivities) {
      if (!activity.scheduledTime) continue;
      
      const scheduledTime = new Date(activity.scheduledTime);
      if (scheduledTime < now || scheduledTime > tomorrow) continue;
      if (activity.status === 'completed') continue;

      const patientName = await getPatientName(plan.patientId);
      const hospitalName = plan.hospitalId ? await getHospitalName(plan.hospitalId) : 'Hospital';

      events.push({
        id: `${plan.id}-${activity.id}`,
        type: 'treatment_plan',
        title: activity.name || 'Treatment Activity',
        patientName,
        patientId: plan.patientId,
        hospitalName,
        scheduledDateTime: scheduledTime,
        details: activity.description || plan.treatmentType || 'Scheduled treatment',
        priority: plan.priority as any || 'routine',
        notificationTimes: DEFAULT_TREATMENT_NOTIFICATION_TIMES,
      });
    }
  }

  return events;
}

// ============================================
// NOTIFICATION SCHEDULING
// ============================================

export async function scheduleNotificationsForEvent(event: ScheduledEvent): Promise<void> {
  // Remove existing notifications for this event
  await notificationDB.deleteByEventId(event.id);
  
  const now = new Date();
  
  for (const minutesBefore of event.notificationTimes) {
    const notificationTime = new Date(event.scheduledDateTime.getTime() - minutesBefore * 60000);
    
    // Skip if notification time has already passed
    if (notificationTime <= now) continue;
    
    const schedule: NotificationSchedule & { id: string } = {
      id: `${event.id}-${minutesBefore}`,
      eventId: event.id,
      eventType: event.type,
      scheduledTime: notificationTime,
      minutesBefore,
      notified: false,
      voiceAlarmPlayed: false,
    };
    
    await notificationDB.add(schedule);
  }
}

export async function scheduleAllUpcomingNotifications(): Promise<{ scheduled: number }> {
  let scheduled = 0;
  
  try {
    // Fetch all upcoming events
    const [surgeries, appointments, treatments] = await Promise.all([
      fetchUpcomingSurgeries(),
      fetchUpcomingAppointments(),
      fetchUpcomingTreatmentPlans(),
    ]);
    
    const allEvents = [...surgeries, ...appointments, ...treatments];
    
    for (const event of allEvents) {
      await scheduleNotificationsForEvent(event);
      scheduled++;
    }
    
    // Cleanup old notifications
    await notificationDB.cleanup();
    
    console.log(`[NotificationService] Scheduled notifications for ${scheduled} events`);
  } catch (error) {
    console.error('[NotificationService] Error scheduling notifications:', error);
  }
  
  return { scheduled };
}

// ============================================
// NOTIFICATION PROCESSING
// ============================================

function formatTimeUntil(minutesBefore: number): string {
  if (minutesBefore >= 1440) {
    const hours = Math.round(minutesBefore / 60);
    return `in ${Math.round(hours / 24)} day${hours >= 48 ? 's' : ''}`;
  } else if (minutesBefore >= 60) {
    const hours = Math.round(minutesBefore / 60);
    return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `in ${minutesBefore} minute${minutesBefore > 1 ? 's' : ''}`;
  }
}

function getEventEmoji(type: string): string {
  switch (type) {
    case 'surgery': return '🏥';
    case 'appointment': return '📅';
    case 'treatment_plan': return '💊';
    default: return '⏰';
  }
}

function getEventLabel(type: string): string {
  switch (type) {
    case 'surgery': return 'Surgery';
    case 'appointment': return 'Appointment';
    case 'treatment_plan': return 'Treatment';
    default: return 'Event';
  }
}

async function getEventDetails(schedule: NotificationSchedule): Promise<ScheduledEvent | null> {
  try {
    switch (schedule.eventType) {
      case 'surgery': {
        const surgery = await db.surgeries.get(schedule.eventId);
        if (!surgery) return null;
        return {
          id: surgery.id,
          type: 'surgery',
          title: surgery.procedureName || 'Scheduled Surgery',
          patientName: await getPatientName(surgery.patientId),
          patientId: surgery.patientId,
          hospitalName: await getHospitalName(surgery.hospitalId),
          scheduledDateTime: new Date(surgery.scheduledDate),
          location: surgery.operatingRoom || 'Theatre',
          details: `Surgeon: ${surgery.surgeon || 'Not assigned'}`,
          priority: surgery.priority as any || 'routine',
          notificationTimes: [],
        };
      }
      case 'appointment': {
        const apt = await db.appointments.get(schedule.eventId);
        if (!apt) return null;
        const aptDate = new Date(apt.appointmentDate);
        const [hours, minutes] = apt.appointmentTime.split(':').map(Number);
        aptDate.setHours(hours, minutes, 0, 0);
        return {
          id: apt.id,
          type: 'appointment',
          title: apt.reasonForVisit || 'Appointment',
          patientName: await getPatientName(apt.patientId),
          patientId: apt.patientId,
          hospitalName: await getHospitalName(apt.hospitalId),
          scheduledDateTime: aptDate,
          location: apt.location?.department || 'Clinic',
          details: `Doctor: ${apt.clinicianName || 'Not assigned'}`,
          priority: apt.priority as any || 'routine',
          notificationTimes: [],
        };
      }
      case 'treatment_plan': {
        const parts = schedule.eventId.split('-');
        const planId = parts.slice(0, -1).join('-');
        const plan = await db.treatmentPlans.get(planId);
        if (!plan) return null;
        return {
          id: schedule.eventId,
          type: 'treatment_plan',
          title: plan.treatmentType || 'Treatment',
          patientName: await getPatientName(plan.patientId),
          patientId: plan.patientId,
          hospitalName: 'Hospital',
          scheduledDateTime: new Date(schedule.scheduledTime),
          details: 'Scheduled treatment activity',
          priority: plan.priority as any || 'routine',
          notificationTimes: [],
        };
      }
      default:
        return null;
    }
  } catch (error) {
    console.error('[NotificationService] Error getting event details:', error);
    return null;
  }
}

export async function processScheduledNotifications(): Promise<{ sent: number; errors: string[] }> {
  const results = { sent: 0, errors: [] as string[] };
  
  try {
    const pending = await notificationDB.getPending();
    
    for (const schedule of pending) {
      try {
        const event = await getEventDetails(schedule);
        
        if (!event) {
          // Event no longer exists, mark as notified
          await notificationDB.markNotified((schedule as any).id, false);
          continue;
        }
        
        const emoji = getEventEmoji(event.type);
        const label = getEventLabel(event.type);
        const timeUntil = formatTimeUntil(schedule.minutesBefore);
        
        // Determine urgency
        let urgency: 'low' | 'medium' | 'high' = 'low';
        if (schedule.minutesBefore <= 15) {
          urgency = 'high';
        } else if (schedule.minutesBefore <= 60) {
          urgency = 'medium';
        }
        
        if (event.priority === 'emergency') {
          urgency = 'high';
        } else if (event.priority === 'urgent') {
          urgency = urgency === 'low' ? 'medium' : urgency;
        }
        
        const title = `${emoji} ${label} Reminder`;
        const body = `${event.title} - ${event.patientName}\n${timeUntil} at ${format(event.scheduledDateTime, 'h:mm a')}\n${event.location ? `📍 ${event.location}` : ''}`;
        
        // Voice message for critical notifications
        let voiceMessage: string | undefined;
        if (schedule.minutesBefore <= 30 && isVoiceEnabled()) {
          voiceMessage = `Attention! ${label} reminder. ${event.patientName} has a ${event.title.toLowerCase()} scheduled ${timeUntil}.`;
        }
        
        await showPushNotification(title, body, {
          tag: `carebridge-${event.type}-${event.id}`,
          requireInteraction: urgency === 'high',
          data: {
            type: event.type,
            eventId: event.id,
            patientId: event.patientId,
            url: `/${event.type === 'surgery' ? 'surgery' : event.type === 'appointment' ? 'appointments' : 'treatment-plans'}/${event.id}`,
          },
          voiceMessage,
          urgency,
        });
        
        await notificationDB.markNotified((schedule as any).id, !!voiceMessage);
        results.sent++;
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(errorMsg);
        console.error('[NotificationService] Error processing notification:', error);
      }
    }
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Failed to process notifications');
  }
  
  return results;
}

// ============================================
// BACKGROUND SYNC INTEGRATION
// ============================================

export function registerServiceWorkerNotifications(): void {
  if (!('serviceWorker' in navigator)) return;
  
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', async (event) => {
    const { type } = event.data || {};
    
    if (type === 'CHECK_NOTIFICATIONS') {
      await processScheduledNotifications();
    } else if (type === 'SCHEDULE_NOTIFICATIONS') {
      await scheduleAllUpcomingNotifications();
    }
  });
  
  // Send message to service worker to enable periodic checks
  navigator.serviceWorker.ready.then((registration) => {
    if (registration.active) {
      registration.active.postMessage({ type: 'ENABLE_NOTIFICATION_CHECKS' });
    }
  });
}

// ============================================
// SCHEDULER
// ============================================

let notificationInterval: ReturnType<typeof setInterval> | null = null;
let scheduleInterval: ReturnType<typeof setInterval> | null = null;

export function startNotificationScheduler(): void {
  if (notificationInterval) return;
  
  // Initialize voice alarm
  initVoiceAlarm();
  
  // Register service worker handlers
  registerServiceWorkerNotifications();
  
  // Schedule notifications immediately
  scheduleAllUpcomingNotifications();
  
  // Process any pending notifications immediately
  processScheduledNotifications();
  
  // Check for pending notifications every 30 seconds
  notificationInterval = setInterval(() => {
    processScheduledNotifications();
  }, 30000);
  
  // Re-schedule notifications every 5 minutes to catch new events
  scheduleInterval = setInterval(() => {
    scheduleAllUpcomingNotifications();
  }, 5 * 60000);
  
  console.log('[NotificationService] Scheduler started');
}

export function stopNotificationScheduler(): void {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    scheduleInterval = null;
  }
  console.log('[NotificationService] Scheduler stopped');
}

// ============================================
// IMMEDIATE NOTIFICATIONS FOR NEW SUBMISSIONS
// ============================================

/**
 * Send notification when a new investigation request is submitted
 */
export async function notifyInvestigationRequest(investigation: Investigation): Promise<void> {
  const patientName = await getPatientName(investigation.patientId);
  const hospitalName = await getHospitalName(investigation.hospitalId);
  
  const title = '🔬 New Investigation Request';
  const body = `${investigation.type || 'Investigation'} requested for ${patientName}\n${hospitalName}`;
  
  await showPushNotification(title, body, {
    tag: `investigation-${investigation.id}`,
    data: {
      type: 'investigation',
      id: investigation.id,
      patientId: investigation.patientId,
      url: `/investigations/${investigation.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `New investigation request. ${investigation.type || 'Investigation'} for patient ${patientName}.` : undefined,
    urgency: investigation.priority === 'urgent' || investigation.priority === 'stat' ? 'high' : 'medium',
  });
}

/**
 * Send notification when a new lab request is submitted
 */
export async function notifyLabRequest(labRequest: LabRequest): Promise<void> {
  const patientName = await getPatientName(labRequest.patientId);
  const hospitalName = await getHospitalName(labRequest.hospitalId);
  
  const testNames = labRequest.tests?.map(t => t.name || t.code).join(', ') || 'Lab tests';
  
  const title = '🧪 New Lab Request';
  const body = `${testNames} requested for ${patientName}\n${hospitalName}`;
  
  await showPushNotification(title, body, {
    tag: `lab-${labRequest.id}`,
    data: {
      type: 'lab_request',
      id: labRequest.id,
      patientId: labRequest.patientId,
      url: `/laboratory/${labRequest.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `New lab request. ${testNames} for patient ${patientName}.` : undefined,
    urgency: labRequest.priority === 'urgent' || labRequest.priority === 'stat' ? 'high' : 'medium',
  });
}

/**
 * Send notification when a new prescription is submitted
 */
export async function notifyPrescription(prescription: Prescription): Promise<void> {
  const patientName = await getPatientName(prescription.patientId);
  const hospitalName = await getHospitalName(prescription.hospitalId);
  
  const medicationCount = prescription.medications?.length || 0;
  const medicationNames = prescription.medications?.slice(0, 3).map(m => m.name || m.drugName).join(', ') || 'Medications';
  
  const title = '💊 New Prescription';
  const body = `${medicationCount} medication${medicationCount !== 1 ? 's' : ''} prescribed for ${patientName}\n${medicationNames}${medicationCount > 3 ? '...' : ''}`;
  
  await showPushNotification(title, body, {
    tag: `prescription-${prescription.id}`,
    data: {
      type: 'prescription',
      id: prescription.id,
      patientId: prescription.patientId,
      url: `/pharmacy/prescriptions/${prescription.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `New prescription. ${medicationCount} medication${medicationCount !== 1 ? 's' : ''} prescribed for patient ${patientName}.` : undefined,
    urgency: 'medium',
  });
}

/**
 * Send notification when a new treatment plan is created
 */
export async function notifyNewTreatmentPlan(treatmentPlan: TreatmentPlan): Promise<void> {
  const patientName = await getPatientName(treatmentPlan.patientId);
  const hospitalName = treatmentPlan.hospitalId ? await getHospitalName(treatmentPlan.hospitalId) : 'Hospital';
  
  const title = '📋 New Treatment Plan';
  const body = `${treatmentPlan.treatmentType || 'Treatment plan'} created for ${patientName}\n${treatmentPlan.diagnosis || 'View details for more information'}`;
  
  await showPushNotification(title, body, {
    tag: `treatment-plan-${treatmentPlan.id}`,
    requireInteraction: true,
    data: {
      type: 'treatment_plan',
      id: treatmentPlan.id,
      patientId: treatmentPlan.patientId,
      url: `/treatment-plans/${treatmentPlan.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `New treatment plan created. ${treatmentPlan.treatmentType || 'Treatment plan'} for patient ${patientName}.` : undefined,
    urgency: treatmentPlan.priority === 'high' || treatmentPlan.priority === 'urgent' ? 'high' : 'medium',
  });
  
  // Also schedule future notifications for this treatment plan
  if (treatmentPlan.scheduledActivities && treatmentPlan.scheduledActivities.length > 0) {
    const events = await fetchUpcomingTreatmentPlans();
    const relatedEvents = events.filter(e => e.id.startsWith(treatmentPlan.id));
    for (const event of relatedEvents) {
      await scheduleNotificationsForEvent(event);
    }
  }
}

/**
 * Send notification when investigation results are ready
 */
export async function notifyInvestigationResults(investigation: Investigation): Promise<void> {
  const patientName = await getPatientName(investigation.patientId);
  
  const title = '📊 Investigation Results Ready';
  const body = `${investigation.type || 'Investigation'} results for ${patientName} are now available`;
  
  await showPushNotification(title, body, {
    tag: `investigation-result-${investigation.id}`,
    requireInteraction: true,
    data: {
      type: 'investigation_result',
      id: investigation.id,
      patientId: investigation.patientId,
      url: `/investigations/${investigation.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `Investigation results ready. ${investigation.type || 'Investigation'} results for patient ${patientName} are now available.` : undefined,
    urgency: 'high',
  });
}

/**
 * Send notification when lab results are ready
 */
export async function notifyLabResults(labRequest: LabRequest): Promise<void> {
  const patientName = await getPatientName(labRequest.patientId);
  const testNames = labRequest.tests?.map(t => t.name || t.code).join(', ') || 'Lab tests';
  
  const title = '🧪 Lab Results Ready';
  const body = `${testNames} results for ${patientName} are now available`;
  
  await showPushNotification(title, body, {
    tag: `lab-result-${labRequest.id}`,
    requireInteraction: true,
    data: {
      type: 'lab_result',
      id: labRequest.id,
      patientId: labRequest.patientId,
      url: `/laboratory/${labRequest.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `Lab results ready. ${testNames} results for patient ${patientName} are now available.` : undefined,
    urgency: 'high',
  });
}

/**
 * Send notification when prescription is dispensed/ready
 */
export async function notifyPrescriptionReady(prescription: Prescription): Promise<void> {
  const patientName = await getPatientName(prescription.patientId);
  
  const title = '✅ Prescription Ready';
  const body = `Medications for ${patientName} are ready for collection`;
  
  await showPushNotification(title, body, {
    tag: `prescription-ready-${prescription.id}`,
    data: {
      type: 'prescription_ready',
      id: prescription.id,
      patientId: prescription.patientId,
      url: `/pharmacy/prescriptions/${prescription.id}`,
    },
    voiceMessage: isVoiceEnabled() ? `Prescription ready. Medications for patient ${patientName} are ready for collection.` : undefined,
    urgency: 'medium',
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  initVoiceAlarm,
  setVoiceEnabled,
  isVoiceEnabled,
  playVoiceAlarm,
  showPushNotification,
  fetchUpcomingSurgeries,
  fetchUpcomingAppointments,
  fetchUpcomingTreatmentPlans,
  scheduleNotificationsForEvent,
  scheduleAllUpcomingNotifications,
  processScheduledNotifications,
  startNotificationScheduler,
  stopNotificationScheduler,
  registerServiceWorkerNotifications,
  // Immediate notification triggers
  notifyInvestigationRequest,
  notifyLabRequest,
  notifyPrescription,
  notifyNewTreatmentPlan,
  notifyInvestigationResults,
  notifyLabResults,
  notifyPrescriptionReady,
};
