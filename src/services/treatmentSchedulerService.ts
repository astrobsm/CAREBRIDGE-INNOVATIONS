// Treatment Planning Scheduler Service
// Generates TreatmentSession instances from a TreatmentPlan's scheduleRule,
// schedules push reminders (upcoming + overdue/missed), and persists
// reminders to a SW-readable IndexedDB store so they fire even when the
// app is closed.

import { v4 as uuidv4 } from 'uuid';
import { addDays, addMinutes, set } from 'date-fns';
import {
  TreatmentPlanOps,
  TreatmentSessionOps,
  TreatmentReminderOps,
  TreatmentVoiceNoteOps,
} from '../database/operations';
import { db } from '../database';
import type {
  TreatmentPlan,
  TreatmentSession,
  TreatmentReminder,
  TreatmentVoiceNote,
} from '../types';
import { sendPushToUser } from './webPushService';
import { syncRecord } from './cloudSyncService';

// ============================================
// SW-READABLE STORE (carebridge-notifications)
// Mirrors a subset of reminders so the SW can show
// notifications without depending on Dexie.
// ============================================
const SW_DB = 'carebridge-notifications';
const SW_STORE = 'scheduled-notifications';

async function openSwDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(SW_DB, 2);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(SW_STORE)) {
          const store = database.createObjectStore(SW_STORE, { keyPath: 'id' });
          store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
          store.createIndex('notified', 'notified', { unique: false });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

async function writeSwReminder(payload: {
  id: string;
  eventId: string;
  eventType: string;
  scheduledTime: string;
  minutesBefore: number;
  body?: string;
  patientName?: string;
  voiceNoteId?: string;
}): Promise<void> {
  const database = await openSwDB();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = database.transaction([SW_STORE], 'readwrite');
      const store = tx.objectStore(SW_STORE);
      store.put({
        ...payload,
        notified: false,
        voiceAlarmPlayed: false,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  database.close();
}

async function clearSwRemindersForSession(sessionId: string): Promise<void> {
  const database = await openSwDB();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = database.transaction([SW_STORE], 'readwrite');
      const store = tx.objectStore(SW_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        for (const item of all) {
          if (item.eventId === sessionId) store.delete(item.id);
        }
        resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  database.close();
}

// ============================================
// SESSION GENERATION
// ============================================

const DEFAULT_REMINDERS = [1440, 60, 15]; // 24h, 1h, 15m

interface GenerateOptions {
  createdBy: string;
}

export async function generateSessionsForPlan(
  plan: TreatmentPlan,
  opts: GenerateOptions
): Promise<TreatmentSession[]> {
  const rule = plan.scheduleRule || {};
  const occurrences = Math.max(1, Math.min(rule.occurrences ?? 14, 90)); // safety cap
  const intervalDays = Math.max(1, rule.intervalDays ?? 1);
  const timesPerDay = Math.max(1, rule.timesPerDay ?? 1);
  const [hStr, mStr] = (rule.timeOfDay ?? '09:00').split(':');
  const baseHour = Number(hStr) || 9;
  const baseMinute = Number(mStr) || 0;

  const sessions: TreatmentSession[] = [];
  const start = new Date(plan.startDate);
  let scheduled = 0;
  for (let i = 0; scheduled < occurrences && i < occurrences * intervalDays; i++) {
    const day = addDays(start, i * intervalDays);
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(day.getDay())) {
      continue;
    }
    for (let t = 0; t < timesPerDay && scheduled < occurrences; t++) {
      const slotMinutes = Math.floor((24 * 60) / Math.max(timesPerDay, 1));
      const minutesFromBase = t * slotMinutes;
      const scheduledAt = set(day, {
        hours: baseHour + Math.floor(minutesFromBase / 60),
        minutes: (baseMinute + (minutesFromBase % 60)) % 60,
        seconds: 0,
        milliseconds: 0,
      });
      sessions.push({
        id: uuidv4(),
        treatmentPlanId: plan.id,
        patientId: plan.patientId,
        hospitalId: (plan as any).hospitalId,
        scheduledAt,
        durationMinutes: 30,
        sequenceNumber: scheduled + 1,
        title: plan.title,
        description: plan.description,
        category: 'procedure',
        orderIds: (plan.orders || []).map(o => o.id),
        status: 'scheduled',
        remindersScheduled: false,
        reminderMinutesBefore: plan.reminderMinutesBefore ?? DEFAULT_REMINDERS,
        createdBy: opts.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      scheduled++;
    }
  }

  if (sessions.length === 0) return sessions;

  await db.treatmentSessions.bulkAdd(sessions);

  // Schedule reminders for each session
  for (const session of sessions) {
    await scheduleRemindersForSession(session, plan);
  }

  // Best-effort cloud sync
  for (const s of sessions) {
    try { await syncRecord('treatmentSessions', s as any); } catch { /* ignore */ }
  }

  return sessions;
}

// ============================================
// REMINDER SCHEDULING
// ============================================

export async function scheduleRemindersForSession(
  session: TreatmentSession,
  plan?: TreatmentPlan
): Promise<TreatmentReminder[]> {
  // Cancel & clear any prior reminders
  await TreatmentReminderOps.cancelForSession(session.id);
  await clearSwRemindersForSession(session.id);

  const minutesList = session.reminderMinutesBefore ?? plan?.reminderMinutesBefore ?? DEFAULT_REMINDERS;
  const reminders: TreatmentReminder[] = [];
  const now = new Date();
  const sessionTime = new Date(session.scheduledAt);

  // Upcoming reminders
  for (const minutesBefore of minutesList) {
    const fireAt = addMinutes(sessionTime, -minutesBefore);
    if (fireAt <= now) continue;
    const r: TreatmentReminder = {
      id: uuidv4(),
      treatmentSessionId: session.id,
      treatmentPlanId: session.treatmentPlanId,
      patientId: session.patientId,
      scheduledFor: fireAt,
      minutesBefore,
      kind: 'upcoming',
      channel: (plan?.notificationPreferences?.voiceEnabled ? 'voice' : 'push'),
      status: 'pending',
      voiceNoteId: plan?.defaultVoiceNoteId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    reminders.push(r);

    await writeSwReminder({
      id: `${session.id}-up-${minutesBefore}`,
      eventId: session.id,
      eventType: 'treatment',
      scheduledTime: fireAt.toISOString(),
      minutesBefore,
      body: `${session.title} in ${minutesBefore >= 60 ? `${Math.round(minutesBefore / 60)}h` : `${minutesBefore}m`}`,
      voiceNoteId: plan?.defaultVoiceNoteId,
    });
  }

  // Overdue / missed reminder (15 min after scheduled time if still not attended)
  const overdueAt = addMinutes(sessionTime, 15);
  if (overdueAt > now) {
    const r: TreatmentReminder = {
      id: uuidv4(),
      treatmentSessionId: session.id,
      treatmentPlanId: session.treatmentPlanId,
      patientId: session.patientId,
      scheduledFor: overdueAt,
      minutesBefore: -15,
      kind: 'overdue',
      channel: 'push',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    reminders.push(r);

    await writeSwReminder({
      id: `${session.id}-overdue`,
      eventId: session.id,
      eventType: 'treatment_overdue',
      scheduledTime: overdueAt.toISOString(),
      minutesBefore: -15,
      body: `OVERDUE: ${session.title} was scheduled at ${sessionTime.toLocaleTimeString()}.`,
    });
  }

  if (reminders.length > 0) {
    await TreatmentReminderOps.bulkCreate(reminders);
  }

  await TreatmentSessionOps.update(session.id, { remindersScheduled: true });

  // Trigger SW periodic check
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CHECK_NOTIFICATIONS' });
  }

  return reminders;
}

// ============================================
// PUSH DISPATCH (called by app while open / on reminder fire)
// ============================================

export async function dispatchSessionReminder(reminder: TreatmentReminder): Promise<void> {
  const session = await TreatmentSessionOps.getById(reminder.treatmentSessionId);
  if (!session) return;

  const recipients: string[] = [];
  if (session.attendedBy) recipients.push(session.attendedBy);

  // Notify primary nurse on duty (if any)
  try {
    const assignment = await db.nursePatientAssignments
      .where('patientId').equals(session.patientId)
      .filter(a => a.status === 'active')
      .first();
    if (assignment?.nurseId) recipients.push(assignment.nurseId);
  } catch { /* ignore */ }

  const isOverdue = reminder.kind === 'overdue';
  const title = isOverdue ? `⚠️ Overdue: ${session.title}` : `🕒 Upcoming: ${session.title}`;
  const minutesAbs = Math.abs(reminder.minutesBefore);
  const body = isOverdue
    ? `Patient session was due ${minutesAbs} min ago and has not been attended.`
    : `Scheduled in ${minutesAbs >= 60 ? `${Math.round(minutesAbs / 60)} h` : `${minutesAbs} min`}.`;

  for (const userId of Array.from(new Set(recipients))) {
    try {
      await sendPushToUser(userId, {
        title,
        body,
        tag: `treatment-${session.id}-${reminder.id}`,
        requireInteraction: isOverdue,
        vibrate: isOverdue ? [400, 100, 400, 100, 800] : [200, 100, 200],
        data: {
          type: isOverdue ? 'treatment_overdue' : 'treatment_upcoming',
          sessionId: session.id,
          planId: session.treatmentPlanId,
          patientId: session.patientId,
          voiceNoteId: reminder.voiceNoteId,
          url: `/treatment-planning/${session.treatmentPlanId}?session=${session.id}`,
        },
        actions: [
          { action: 'view', title: 'View Plan' },
          { action: 'acknowledge', title: '✓ Mark Done' },
        ],
      });
    } catch { /* ignore individual recipient errors */ }
  }

  await TreatmentReminderOps.markSent(reminder.id);

  if (isOverdue && session.status === 'scheduled') {
    await TreatmentSessionOps.markMissed(session.id);
  }
}

// ============================================
// PERIODIC PROCESSOR (in-app while open)
// ============================================

let processorTimer: number | null = null;

export function startReminderProcessor(intervalSeconds = 30): void {
  if (typeof window === 'undefined') return;
  stopReminderProcessor();
  processorTimer = window.setInterval(async () => {
    try {
      const due = await TreatmentReminderOps.getPending();
      for (const r of due) {
        await dispatchSessionReminder(r);
      }
    } catch (err) {
      console.warn('[TreatmentScheduler] processor error', err);
    }
  }, intervalSeconds * 1000);
}

export function stopReminderProcessor(): void {
  if (processorTimer) {
    clearInterval(processorTimer);
    processorTimer = null;
  }
}

// ============================================
// PLAN LIFECYCLE
// ============================================

export async function createPlanWithSchedule(
  plan: TreatmentPlan,
  opts: GenerateOptions
): Promise<{ plan: TreatmentPlan; sessions: TreatmentSession[] }> {
  await TreatmentPlanOps.create(plan);
  try { await syncRecord('treatmentPlans', plan as any); } catch { /* offline ok */ }
  const sessions = await generateSessionsForPlan(plan, opts);
  return { plan, sessions };
}

export async function rescheduleSession(
  sessionId: string,
  newDate: Date
): Promise<void> {
  await TreatmentSessionOps.reschedule(sessionId, newDate);
  const session = await TreatmentSessionOps.getById(sessionId);
  if (!session) return;
  const plan = await TreatmentPlanOps.getById(session.treatmentPlanId);
  await scheduleRemindersForSession(session, plan);
}

export async function attachVoiceNote(input: {
  patientId: string;
  treatmentPlanId?: string;
  treatmentSessionId?: string;
  audioBlob: Blob;
  durationSeconds: number;
  recordedBy: string;
  purpose: TreatmentVoiceNote['purpose'];
  transcript?: string;
}): Promise<TreatmentVoiceNote> {
  const audioDataUrl = await blobToDataUrl(input.audioBlob);
  const note: TreatmentVoiceNote = {
    id: uuidv4(),
    treatmentPlanId: input.treatmentPlanId,
    treatmentSessionId: input.treatmentSessionId,
    patientId: input.patientId,
    audioBlob: input.audioBlob,
    audioDataUrl,
    mimeType: input.audioBlob.type || 'audio/webm',
    durationSeconds: input.durationSeconds,
    transcript: input.transcript,
    purpose: input.purpose,
    recordedBy: input.recordedBy,
    recordedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await TreatmentVoiceNoteOps.create(note);
  try { await syncRecord('treatmentVoiceNotes', { ...note, audioBlob: undefined } as any); } catch { /* ok */ }
  return note;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Called when the user taps "Acknowledge" on a service-worker push.
// Marks the session as attended and the reminder as acknowledged so
// no further overdue notifications fire.
export async function acknowledgeSessionFromNotification(
  sessionId: string,
  reminderId?: string
): Promise<void> {
  const session = await TreatmentSessionOps.getById(sessionId);
  if (!session) return;
  if (session.status === 'scheduled' || session.status === 'in_progress') {
    await TreatmentSessionOps.markAttended(sessionId, session.attendedBy || 'system', 'Acknowledged via notification');
  }
  if (reminderId) {
    try { await TreatmentReminderOps.acknowledge(reminderId, session.attendedBy || 'system'); } catch { /* ok */ }
  }
  // Cancel any remaining reminders for this session
  try { await TreatmentReminderOps.cancelForSession(sessionId); } catch { /* ok */ }
  try { await clearSwRemindersForSession(sessionId); } catch { /* ok */ }
}
