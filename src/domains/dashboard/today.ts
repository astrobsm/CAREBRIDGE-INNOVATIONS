/**
 * Selectors for the clinic "Today" home screen. Pure: every function takes
 * the records and `now`, so the date boundaries (local time) are tested with
 * explicit dates.
 */

import type { Appointment, Investigation, LabRequest, Patient, Surgery } from '../../types';
import { toValidDate } from '../../utils/safeDate';
import { isArchivedPatient } from '../patients/services/patientArchiveRules';

type DateLike = Date | string | number | null | undefined;
const DAY = 24 * 60 * 60 * 1000;

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addLocalDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/**
 * The local calendar day of a stored date. A bare "YYYY-MM-DD" string is that
 * day (not UTC midnight, which would be the day before west of Greenwich).
 */
export function localDay(value: DateLike): Date | null {
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = toValidDate(value);
  return d ? startOfLocalDay(d) : null;
}

/** Appointment start: its local day plus its HH:mm time (00:00 if none). */
export function appointmentStart(a: Pick<Appointment, 'appointmentDate' | 'appointmentTime'>): Date | null {
  const day = localDay(a.appointmentDate as DateLike);
  if (!day) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(a.appointmentTime || '');
  if (m) day.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return day;
}

const DEAD_APPOINTMENT = new Set(['cancelled', 'rescheduled']);
const AWAITING = new Set(['scheduled', 'confirmed']);

/** Today's appointments (not cancelled / rescheduled), earliest first. */
export function todaysAppointments<T extends Appointment>(appointments: T[], now: Date): T[] {
  const from = startOfLocalDay(now).getTime();
  const to = addLocalDays(now, 1).getTime();
  return appointments
    .filter(a => !DEAD_APPOINTMENT.has(a.status))
    .map(a => ({ a, t: appointmentStart(a)?.getTime() ?? NaN }))
    .filter(x => x.t >= from && x.t < to)
    .sort((x, y) => x.t - y.t)
    .map(x => x.a);
}

export interface OverdueFollowUp<T> {
  appointment: T;
  reason: 'not_seen' | 'no_show';
  daysAgo: number;
}

/**
 * Follow-ups that slipped, in the last `days` days before today: booked
 * (scheduled / confirmed) but never checked in, seen, completed or cancelled,
 * and those marked no-show. Today's own appointments are on the Today list,
 * so they are not "overdue" yet. A patient who already has a later live
 * appointment (rebooked) is not listed. Newest first.
 */
export function overdueFollowUps<T extends Appointment>(appointments: T[], now: Date, days = 30): OverdueFollowUp<T>[] {
  const today = startOfLocalDay(now);
  const from = addLocalDays(now, -days).getTime();
  const rebooked = new Set(
    appointments
      .filter(a => !DEAD_APPOINTMENT.has(a.status) && a.status !== 'no_show')
      .filter(a => (appointmentStart(a)?.getTime() ?? -Infinity) >= today.getTime())
      .map(a => a.patientId),
  );
  const out: (OverdueFollowUp<T> & { t: number })[] = [];
  for (const a of appointments) {
    const start = appointmentStart(a);
    if (!start) continue;
    const t = start.getTime();
    if (t < from || t >= today.getTime()) continue;
    let reason: OverdueFollowUp<T>['reason'] | null = null;
    if (a.status === 'no_show') reason = 'no_show';
    else if (AWAITING.has(a.status) && !a.checkedInAt && !a.completedAt) reason = 'not_seen';
    if (!reason || rebooked.has(a.patientId)) continue;
    const daysAgo = Math.round((today.getTime() - startOfLocalDay(start).getTime()) / DAY);
    out.push({ appointment: a, reason, daysAgo, t });
  }
  return out.sort((x, y) => y.t - x.t).map(({ t: _t, ...rest }) => rest);
}

export interface PendingResult {
  id: string;
  source: 'investigation' | 'lab_request';
  patientId: string;
  name: string;
  requestedAt: Date | null;
  priority?: string;
  href: string;
}

/** The patient hub's Results tab. */
export const resultsHref = (patientId: string) => `/patients/${encodeURIComponent(patientId)}?tab=results`;

const INVESTIGATION_DONE = new Set(['completed', 'cancelled']);
const LAB_PENDING = new Set(['pending', 'collected', 'processing']);

/** Requested investigations / lab requests still without a result. Oldest first. */
export function pendingResults(investigations: Investigation[], labRequests: LabRequest[]): PendingResult[] {
  const out: PendingResult[] = [];
  for (const i of investigations) {
    if (INVESTIGATION_DONE.has(i.status)) continue;
    if (i.approvalStatus === 'rejected') continue;
    if (Array.isArray(i.results) && i.results.length > 0) continue;
    out.push({
      id: i.id, source: 'investigation', patientId: i.patientId,
      name: i.typeName || i.name || String(i.type || 'Investigation'),
      requestedAt: toValidDate(i.requestedAt as DateLike), priority: i.priority,
      href: resultsHref(i.patientId),
    });
  }
  for (const l of labRequests) {
    if (!LAB_PENDING.has(l.status)) continue;
    const tests = (l.tests || []).map(t => t.name).filter(Boolean);
    out.push({
      id: l.id, source: 'lab_request', patientId: l.patientId,
      name: tests.length ? tests.slice(0, 3).join(', ') + (tests.length > 3 ? ` +${tests.length - 3}` : '') : 'Lab request',
      requestedAt: toValidDate(l.requestedAt as DateLike), priority: l.priority,
      href: resultsHref(l.patientId),
    });
  }
  return out.sort((a, b) => (a.requestedAt?.getTime() ?? 0) - (b.requestedAt?.getTime() ?? 0));
}

const THEATRE_LIVE = new Set(['incomplete_preparation', 'ready_for_preanaesthetic_review', 'scheduled', 'in-progress']);

/** Operations from today through the next `days` days, earliest first. */
export function theatreList<T extends Surgery>(surgeries: T[], now: Date, days = 7): T[] {
  const from = startOfLocalDay(now).getTime();
  const to = addLocalDays(now, days + 1).getTime();
  return surgeries
    .filter(s => THEATRE_LIVE.has(s.status))
    .map(s => ({ s, t: toValidDate(s.scheduledDate as DateLike)?.getTime() ?? NaN }))
    .filter(x => x.t >= from && x.t < to)
    .sort((x, y) => x.t - y.t)
    .map(x => x.s);
}

/** A registration that counts: active and not merged into another. */
export function isActivePatient(p: Pick<Patient, 'isActive' | 'mergedInto'>): boolean {
  return !isArchivedPatient(p) && !p.mergedInto;
}

export function activePatientCount(patients: Pick<Patient, 'isActive' | 'mergedInto'>[]): number {
  return patients.filter(isActivePatient).length;
}

/** Patients registered in the last `days` calendar days including today, newest first. */
export function recentRegistrations<T extends Patient>(patients: T[], now: Date, days = 7): T[] {
  const from = addLocalDays(now, -(days - 1)).getTime();
  return patients
    .filter(isActivePatient)
    .map(p => ({ p, t: toValidDate(p.createdAt as DateLike)?.getTime() ?? NaN }))
    .filter(x => x.t >= from && x.t <= now.getTime() + DAY)
    .sort((x, y) => y.t - x.t)
    .map(x => x.p);
}
