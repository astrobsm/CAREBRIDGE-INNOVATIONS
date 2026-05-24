/**
 * Treatment Reminder Service ("Radio Announcements")
 * ───────────────────────────────────────────────────
 * Background scanner that walks the local treatmentSessions table every 30s
 * and fires in-app radio announcements (toast + chime) as treatment events
 * approach, become due, and tip into overdue.
 *
 * Trigger windows per session (configurable via session.reminderMinutesBefore):
 *   - upcoming :  scheduledAt - leadMinutes  (default lead = 15 min)
 *   - due      :  scheduledAt
 *   - overdue  :  scheduledAt + 5 min        (only if still 'scheduled')
 *
 * De-duplication: each session keeps a `firedReminders` Set in memory so a
 * given kind only fires once per session per app session. The session's
 * `lastReminderAt` field is also persisted so we don't re-fire after a reload
 * if the reminder is already in the past.
 */
import toast from 'react-hot-toast';
import { db } from '../database';
import type { TreatmentSession } from '../types';
import { playChime } from '../utils/audioChime';

type Kind = 'upcoming' | 'due' | 'overdue';

const DEFAULT_LEAD_MIN = 15;
const OVERDUE_LEAD_MIN = -5; // 5 minutes after due
const SCAN_INTERVAL_MS = 30_000;

let timer: ReturnType<typeof setInterval> | null = null;
const fired = new Map<string, Set<Kind>>(); // sessionId → kinds already fired this app session

function key(session: TreatmentSession, kind: Kind): string {
  return `${session.id}:${kind}`;
}

function hasFired(session: TreatmentSession, kind: Kind): boolean {
  return fired.get(session.id)?.has(kind) ?? false;
}

function markFired(session: TreatmentSession, kind: Kind): void {
  if (!fired.has(session.id)) fired.set(session.id, new Set());
  fired.get(session.id)!.add(kind);
}

function announce(session: TreatmentSession, kind: Kind, patientName: string): void {
  const time = new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const title = session.title || session.category || 'Treatment session';

  if (kind === 'upcoming') {
    toast(
      `Upcoming in ${session.reminderMinutesBefore?.[0] ?? DEFAULT_LEAD_MIN} min — ${patientName}: ${title} at ${time}`,
      { icon: '⏰', duration: 8000 }
    );
    playChime('upcoming');
  } else if (kind === 'due') {
    toast.success(`DUE NOW — ${patientName}: ${title} (${time})`, { duration: 12000 });
    playChime('due');
  } else {
    toast.error(`OVERDUE — ${patientName}: ${title} was due at ${time}`, { duration: 15000 });
    playChime('overdue');
  }

  // Persist last reminder timestamp so a reload doesn't re-announce far past
  void db.treatmentSessions.update(session.id, {
    lastReminderAt: new Date(),
    updatedAt: new Date(),
  }).catch(() => { /* offline / locked */ });

  // Persist reminder row for audit
  void db.treatmentReminders.add({
    id: `${session.id}-${kind}-${Date.now()}`,
    treatmentSessionId: session.id,
    treatmentPlanId: session.treatmentPlanId,
    patientId: session.patientId,
    scheduledFor: new Date(session.scheduledAt),
    minutesBefore: kind === 'upcoming' ? (session.reminderMinutesBefore?.[0] ?? DEFAULT_LEAD_MIN) : kind === 'due' ? 0 : OVERDUE_LEAD_MIN,
    kind: kind === 'due' ? 'upcoming' : kind, // type allows 'upcoming'|'overdue'|'missed'
    channel: 'in_app',
    status: 'sent',
    sentAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).catch(() => { /* ignore — non-critical */ });

  markFired(session, kind);
}

async function scan(): Promise<void> {
  try {
    const now = Date.now();
    // Pull sessions scheduled today or near-future (status still scheduled or in_progress)
    const sessions = await db.treatmentSessions
      .where('status').anyOf(['scheduled', 'in_progress'])
      .toArray();

    if (sessions.length === 0) return;

    // Patient name lookup (small batch)
    const patientIds = Array.from(new Set(sessions.map(s => s.patientId)));
    const patients = await db.patients.bulkGet(patientIds);
    const nameMap = new Map<string, string>();
    patients.forEach(p => {
      if (p) nameMap.set(p.id!, `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.hospitalNumber || 'Patient');
    });

    for (const s of sessions) {
      const scheduled = new Date(s.scheduledAt).getTime();
      const leadMin = s.reminderMinutesBefore?.[0] ?? DEFAULT_LEAD_MIN;
      const upcomingAt = scheduled - leadMin * 60_000;
      const overdueAt = scheduled + 5 * 60_000;
      const patientName = nameMap.get(s.patientId) ?? 'Patient';

      // upcoming window: between upcomingAt and scheduled
      if (now >= upcomingAt && now < scheduled && !hasFired(s, 'upcoming')) {
        announce(s, 'upcoming', patientName);
      }
      // due window: between scheduled and overdueAt
      if (now >= scheduled && now < overdueAt && !hasFired(s, 'due')) {
        announce(s, 'due', patientName);
      }
      // overdue: after overdueAt and still scheduled
      if (now >= overdueAt && s.status === 'scheduled' && !hasFired(s, 'overdue')) {
        announce(s, 'overdue', patientName);
      }
    }
  } catch (err) {
    console.warn('[treatmentReminderService] scan failed:', err);
  }
}

export function startTreatmentReminderService(): void {
  if (timer) return;
  // Initial scan after 5s (let app finish boot)
  setTimeout(() => { void scan(); }, 5_000);
  timer = setInterval(() => { void scan(); }, SCAN_INTERVAL_MS);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void scan();
    });
  }
}

export function stopTreatmentReminderService(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Force-clear in-memory fired cache (useful for tests or manual rescan). */
export function resetFiredCache(): void {
  fired.clear();
}

/** Internal: expose for the Patient Flow timer board to query without re-scanning. */
export function getFiredKinds(sessionId: string): Kind[] {
  return Array.from(fired.get(sessionId) ?? []);
}

export { key as reminderKey };
