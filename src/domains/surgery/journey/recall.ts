/**
 * The recall list: patients whose follow-up has slipped or is waiting for
 * the clinician. Pure selector, exported for the Today screen
 * (selectRecallList(...).length, or recallCount).
 *
 *   missed            a booked appointment in the past that was never checked in,
 *                     completed, cancelled or rescheduled
 *   no_show           marked no-show
 *   template_recall   a conditional template visit not yet booked (with the template text)
 *   next_due          a recurring series whose last visit is done: book the next
 *   awaiting_booking  an "after discharge" visit whose discharge has happened
 */
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { Appointment, Patient, Surgery } from '../../../types';
import { nextSeriesOffers, ymd } from './followUpPlan';

export type RecallKind = 'missed' | 'no_show' | 'template_recall' | 'next_due' | 'awaiting_booking';

export interface RecallEntry {
  id: string;
  kind: RecallKind;
  patientId: string;
  patientName: string;
  phone?: string;
  surgeryId?: string;
  procedureName?: string;
  appointmentId?: string;
  /** Plan item key, for template / series / discharge entries. */
  itemKey?: string;
  title: string;
  /** The template window text, for template entries. */
  templateText?: string;
  /** yyyy-MM-dd, or undefined for a recall the template gives no time for. */
  dueDate?: string;
  /** Days past due (negative: not due yet). */
  overdueDays?: number;
}

export interface RecallInput {
  appointments: Appointment[];
  surgeries: Surgery[];
  patients: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'phone'>[];
  now: Date;
  /** Ignore missed appointments older than this (default 365 days). */
  lookbackDays?: number;
}

const NOT_ATTENDED: Appointment['status'][] = ['scheduled', 'confirmed'];

function appointmentMoment(a: Pick<Appointment, 'appointmentDate' | 'appointmentTime'>): Date {
  const d = new Date(a.appointmentDate);
  const [h, m] = (a.appointmentTime || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function selectRecallList({ appointments, surgeries, patients, now, lookbackDays = 365 }: RecallInput): RecallEntry[] {
  const pt = new Map(patients.map(p => [p.id, p]));
  const name = (id: string) => { const p = pt.get(id); return p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : 'Unknown patient'; };
  const sById = new Map(surgeries.map(s => [s.id, s]));
  const today = startOfDay(now);
  const overdue = (d?: string) => (d ? differenceInCalendarDays(today, new Date(`${d}T00:00:00`)) : undefined);
  const out: RecallEntry[] = [];
  const earliest = addDays(today, -lookbackDays);

  // (a) missed and no-show appointments
  for (const a of appointments) {
    const when = appointmentMoment(a);
    const missed = NOT_ATTENDED.includes(a.status) && when < now && when >= earliest;
    const noShow = a.status === 'no_show' && when >= earliest;
    if (!missed && !noShow) continue;
    // A later visit already booked for the same surgery / patient covers it.
    const rebooked = appointments.some(b => b.id !== a.id && b.patientId === a.patientId
      && b.relatedSurgeryId === a.relatedSurgeryId
      && ['scheduled', 'confirmed'].includes(b.status) && appointmentMoment(b) > now && b.createdAt && new Date(b.createdAt) > when);
    if (rebooked) continue;
    const s = a.relatedSurgeryId ? sById.get(a.relatedSurgeryId) : undefined;
    const d = ymd(when);
    out.push({
      id: `appt:${a.id}`, kind: noShow ? 'no_show' : 'missed', patientId: a.patientId, patientName: name(a.patientId),
      phone: a.patientWhatsApp || pt.get(a.patientId)?.phone, surgeryId: s?.id, procedureName: s?.procedureName,
      appointmentId: a.id, title: a.reasonForVisit || 'Appointment', dueDate: d, overdueDays: overdue(d),
    });
  }

  // (b) template recall items and (d) discharge-dated items not yet booked
  for (const s of surgeries) {
    if (s.status === 'cancelled') continue;
    for (const i of s.followUpPlan?.items ?? []) {
      if (i.status === 'recall') {
        out.push({
          id: `recall:${s.id}:${i.key}`, kind: 'template_recall', patientId: s.patientId, patientName: name(s.patientId),
          phone: pt.get(s.patientId)?.phone, surgeryId: s.id, procedureName: s.procedureName, itemKey: i.key,
          title: i.purpose, templateText: i.when, dueDate: i.dueDate, overdueDays: overdue(i.dueDate),
        });
      } else if (i.status === 'pending_discharge' && s.dischargedAt && i.day != null) {
        const d = ymd(addDays(startOfDay(new Date(s.dischargedAt)), i.day));
        out.push({
          id: `discharge:${s.id}:${i.key}`, kind: 'awaiting_booking', patientId: s.patientId, patientName: name(s.patientId),
          phone: pt.get(s.patientId)?.phone, surgeryId: s.id, procedureName: s.procedureName, itemKey: i.key,
          title: i.purpose, templateText: i.when, dueDate: d, overdueDays: overdue(d),
        });
      }
    }
  }

  // (c) recurring series due for the next visit
  for (const o of nextSeriesOffers(surgeries, appointments)) {
    const s = sById.get(o.surgeryId);
    out.push({
      id: `next:${o.surgeryId}:${o.item.key}`, kind: 'next_due', patientId: o.patientId, patientName: name(o.patientId),
      phone: pt.get(o.patientId)?.phone, surgeryId: o.surgeryId, procedureName: s?.procedureName, itemKey: o.item.key,
      title: o.item.purpose, templateText: o.item.when, dueDate: o.dueDate, overdueDays: overdue(o.dueDate),
    });
  }

  return out.sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.patientName.localeCompare(b.patientName));
}

/** How many need action now: everything overdue or due today, plus untimed recalls. */
export function recallCount(input: RecallInput): number {
  return selectRecallList(input).filter(e => e.overdueDays === undefined || e.overdueDays >= 0).length;
}
