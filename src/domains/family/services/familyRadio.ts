// Family Radio Service
// =====================
// Periodically scans Supabase for tasks and routines that are either
//   (a) APPROACHING — due within the user-configured "lookahead window", or
//   (b) MISSED      — past their deadline today and still not done,
// then speaks an announcement out loud using the browser's
// SpeechSynthesis API. The announcement always calls out the child's
// first name (e.g. "Ezinne, you have 10 minutes to take out the trash").
//
// Pure data-fetching + text-building lives here. Polling + speaking is
// orchestrated by the React hook `useFamilyRadio`.

import { getFamilyClient } from '../../../services/familyClient';
import type {
  Child,
  Routine,
  RoutineLog,
  Task,
  TaskAssignment,
} from '../types';

export type AnnouncementKind =
  | 'upcoming_task'
  | 'missed_task'
  | 'upcoming_routine'
  | 'missed_routine';

export interface Announcement {
  /** Stable key — used for dedupe / cooldown. */
  id: string;
  kind: AnnouncementKind;
  text: string;
  childIds: string[];
  childNames: string[];
  title: string;
  dueAt: number; // epoch ms (for upcoming) or deadline ms (for missed)
  minutesAway: number; // negative if past
}

export interface RadioOptions {
  /** Announce tasks/routines coming up within this many minutes. */
  lookaheadMinutes: number;
  /** Don't repeat the exact same announcement within this many minutes. */
  cooldownMinutes: number;
  /** Look back this many hours for "missed" items. */
  missedLookbackHours: number;
  /** SpeechSynthesisVoice voiceURI. */
  voiceURI?: string;
  rate: number; // 0.1 – 10
  pitch: number; // 0 – 2
  volume: number; // 0 – 1
  enabled: {
    upcoming_task: boolean;
    missed_task: boolean;
    upcoming_routine: boolean;
    missed_routine: boolean;
  };
}

export const DEFAULT_RADIO_OPTIONS: RadioOptions = {
  lookaheadMinutes: 15,
  cooldownMinutes: 30,
  missedLookbackHours: 12,
  rate: 1,
  pitch: 1,
  volume: 1,
  enabled: {
    upcoming_task: true,
    missed_task: true,
    upcoming_routine: true,
    missed_routine: true,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Convert 'HH:MM' or 'HH:MM:SS' on the given date to a JS Date in local TZ. */
function timeOnDate(date: Date, time: string): Date {
  const [hh, mm, ss] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hh || 0, mm || 0, ss || 0, 0);
  return d;
}

function minutesDiff(future: Date, now: Date): number {
  return Math.round((future.getTime() - now.getTime()) / 60_000);
}

function firstName(child: Child): string {
  return (child.first_name || '').trim() || 'someone';
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function describeMinutes(mins: number): string {
  const abs = Math.abs(mins);
  if (abs < 1) return 'less than a minute';
  if (abs === 1) return '1 minute';
  if (abs < 60) return `${abs} minutes`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h} hour${h > 1 ? 's' : ''} and ${m} minute${m > 1 ? 's' : ''}`;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface FetchedData {
  children: Child[];
  assignments: (TaskAssignment & { task?: Task })[];
  routines: Routine[];
  routineLogsToday: RoutineLog[];
}

async function fetchRadioData(
  parentId: string,
  opts: RadioOptions
): Promise<FetchedData> {
  const fam = getFamilyClient();
  const now = new Date();
  const since = new Date(now.getTime() - opts.missedLookbackHours * 3_600_000).toISOString();
  const until = new Date(now.getTime() + opts.lookaheadMinutes * 60_000).toISOString();
  const today = isoDate(now);

  const [kidsRes, asRes, routinesRes, logsRes] = await Promise.all([
    fam
      .from('children')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('first_name'),
    fam
      .from('task_assignments')
      .select('*, task:tasks!inner(*)')
      .eq('task.parent_id', parentId)
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', since)
      .lte('due_date', until),
    fam
      .from('routines')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true),
    fam
      .from('routine_logs')
      .select('*')
      .eq('log_date', today),
  ]);

  return {
    children: (kidsRes.data as Child[]) || [],
    assignments: (asRes.data as (TaskAssignment & { task?: Task })[]) || [],
    routines: (routinesRes.data as Routine[]) || [],
    routineLogsToday: (logsRes.data as RoutineLog[]) || [],
  };
}

// ---------------------------------------------------------------------------
// Announcement building
// ---------------------------------------------------------------------------

function buildTaskAnnouncements(
  data: FetchedData,
  opts: RadioOptions,
  now: Date
): Announcement[] {
  const childById = new Map(data.children.map((c) => [c.id, c]));
  const out: Announcement[] = [];

  for (const a of data.assignments) {
    if (!a.due_date) continue;
    const child = childById.get(a.child_id);
    if (!child) continue;
    const due = new Date(a.due_date);
    const mins = minutesDiff(due, now);
    const title = a.task?.title || 'a task';
    const name = firstName(child);

    if (mins >= 0 && mins <= opts.lookaheadMinutes) {
      if (!opts.enabled.upcoming_task) continue;
      out.push({
        id: `task-upcoming-${a.id}`,
        kind: 'upcoming_task',
        text:
          `${name}. Heads up. You have about ${describeMinutes(mins)} to ` +
          `complete your task: ${title}.`,
        childIds: [child.id],
        childNames: [name],
        title,
        dueAt: due.getTime(),
        minutesAway: mins,
      });
    } else if (mins < 0 && mins >= -opts.missedLookbackHours * 60) {
      if (!opts.enabled.missed_task) continue;
      out.push({
        id: `task-missed-${a.id}`,
        kind: 'missed_task',
        text:
          `Attention ${name}. You have a missed task. ${title}. ` +
          `It was due ${describeMinutes(mins)} ago. Please complete it now.`,
        childIds: [child.id],
        childNames: [name],
        title,
        dueAt: due.getTime(),
        minutesAway: mins,
      });
    }
  }
  return out;
}

function buildRoutineAnnouncements(
  data: FetchedData,
  opts: RadioOptions,
  now: Date
): Announcement[] {
  const today = isoDate(now);
  const weekday = now.getDay(); // 0 = Sun .. 6 = Sat
  const out: Announcement[] = [];

  // Build a quick lookup of logs by (routine_id, child_id)
  const loggedKey = (routineId: string, childId: string) =>
    `${routineId}::${childId}`;
  const settled = new Set<string>();
  for (const log of data.routineLogsToday) {
    if (
      log.status === 'completed_on_time' ||
      log.status === 'completed_late' ||
      log.status === 'missed'
    ) {
      settled.add(loggedKey(log.routine_id, log.child_id));
    }
  }

  for (const r of data.routines) {
    if (!r.deadline_time) continue;
    if (!r.days_of_week || !r.days_of_week.includes(weekday)) continue;

    const deadline = timeOnDate(now, r.deadline_time);
    const mins = minutesDiff(deadline, now);

    // Which children does this routine apply to?
    const applicable: Child[] = r.child_id
      ? data.children.filter((c) => c.id === r.child_id)
      : data.children;

    // Filter to those who don't yet have a final log entry today.
    const pendingKids = applicable.filter(
      (c) => !settled.has(loggedKey(r.id, c.id))
    );
    if (pendingKids.length === 0) continue;

    const names = pendingKids.map(firstName);

    if (mins >= 0 && mins <= opts.lookaheadMinutes) {
      if (!opts.enabled.upcoming_routine) continue;
      out.push({
        id: `routine-upcoming-${r.id}-${today}`,
        kind: 'upcoming_routine',
        text:
          `${joinNames(names)}. Reminder. The ${r.name} routine starts in ` +
          `${describeMinutes(mins)}. Please get ready.`,
        childIds: pendingKids.map((c) => c.id),
        childNames: names,
        title: r.name,
        dueAt: deadline.getTime(),
        minutesAway: mins,
      });
    } else if (mins < 0 && mins >= -opts.missedLookbackHours * 60) {
      if (!opts.enabled.missed_routine) continue;
      out.push({
        id: `routine-missed-${r.id}-${today}`,
        kind: 'missed_routine',
        text:
          `Attention. ${joinNames(names)}. You missed the ${r.name} routine. ` +
          `The deadline passed ${describeMinutes(mins)} ago.`,
        childIds: pendingKids.map((c) => c.id),
        childNames: names,
        title: r.name,
        dueAt: deadline.getTime(),
        minutesAway: mins,
      });
    }
  }
  return out;
}

/**
 * Top-level: fetch + build the list of pending announcements for a parent.
 * Caller is responsible for applying cooldown / dedupe before speaking.
 */
export async function collectAnnouncements(
  parentId: string,
  opts: RadioOptions = DEFAULT_RADIO_OPTIONS,
  now: Date = new Date()
): Promise<Announcement[]> {
  const data = await fetchRadioData(parentId, opts);
  const announcements = [
    ...buildTaskAnnouncements(data, opts, now),
    ...buildRoutineAnnouncements(data, opts, now),
  ];
  // Soonest / most overdue first.
  announcements.sort((a, b) => a.dueAt - b.dueAt);
  return announcements;
}

// ---------------------------------------------------------------------------
// Speech
// ---------------------------------------------------------------------------

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Speak a single announcement. Returns a promise that resolves when the
 * utterance finishes (or rejects on error / cancel).
 */
export function speak(
  text: string,
  opts: RadioOptions,
  voices?: SpeechSynthesisVoice[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error('SpeechSynthesis is not supported in this browser.'));
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    const vs = voices ?? listVoices();
    if (opts.voiceURI) {
      const v = vs.find((x) => x.voiceURI === opts.voiceURI);
      if (v) u.voice = v;
    }
    u.rate = Math.max(0.1, Math.min(10, opts.rate));
    u.pitch = Math.max(0, Math.min(2, opts.pitch));
    u.volume = Math.max(0, Math.min(1, opts.volume));
    u.onend = () => resolve();
    u.onerror = (e) => reject(new Error(e.error || 'speech error'));
    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
