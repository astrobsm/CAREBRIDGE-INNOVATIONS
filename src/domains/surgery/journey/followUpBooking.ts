/**
 * Booking the template follow-up visits: appointments through the existing
 * appointment service (createAppointment schedules the WhatsApp reminders),
 * each linked to the surgery (relatedSurgeryId), at 09:00 (the clinic has no
 * default time setting), the notes carrying the purpose and the template
 * window. The surgery's followUpPlan records every visit by key, so booking
 * twice never double-books. Triggered when the operation is done (post-op
 * note saved), after the clinician confirms the list (FollowUpPlanner).
 */
import { parseISO } from 'date-fns';
import { db } from '../../../database';
import { createAppointment, updateAppointment, cancelAppointment } from '../../../services/appointmentService';
import type { Patient, Surgery, User } from '../../../types';
import {
  DEFAULT_FOLLOW_UP_TIME, appointmentText, dischargeProposals, groupByDate, mergePlan, planItem, proposeFollowUps,
  updateItem, ymd, type FollowUpProposal,
} from './followUpPlan';
import { moduleForSurgery, operationDate } from './procedureLink';
import { updateSurgery } from './surgeryWrite';

/** Is the patient in an active admission (not a day case)? */
async function admitted(patientId: string): Promise<boolean> {
  return (await db.admissions.where('patientId').equals(patientId).toArray()).some(a => a.status === 'active');
}

/** The dates the plan is counted from: the operation, and the discharge (day case: the same day). */
export async function planDates(s: Surgery): Promise<{ op: Date; discharge: Date | null; dayCase: boolean }> {
  const op = operationDate(s);
  if (s.dischargedAt) return { op, discharge: new Date(s.dischargedAt), dayCase: s.dischargeType === 'day_case' };
  const inpatient = await admitted(s.patientId);
  return { op, discharge: inpatient ? null : op, dayCase: !inpatient };
}

/** What would be booked for this surgery now (nothing already in its plan). */
export async function followUpProposals(surgeryId: string): Promise<{ surgery: Surgery; moduleName?: string; proposals: FollowUpProposal[]; dayCase: boolean } | null> {
  const s = await db.surgeries.get(surgeryId);
  if (!s) return null;
  const encounters = await db.clinicalEncounters.where('patientId').equals(s.patientId).toArray();
  const module = moduleForSurgery(s, encounters);
  const { op, discharge, dayCase } = await planDates(s);
  if (!module) return { surgery: s, proposals: [], dayCase };
  return { surgery: s, moduleName: module.name, proposals: proposeFollowUps({ module, operationDate: op, dischargeDate: discharge, existing: s.followUpPlan }), dayCase };
}

let inFlight: Promise<unknown> | null = null;

async function book(s: Surgery, patient: Patient, user: User, dated: FollowUpProposal[]): Promise<Map<string, string>> {
  const hospital = s.hospitalId ? await db.hospitals.get(s.hospitalId) : undefined;
  const ids = new Map<string, string>();
  for (const g of groupByDate(dated)) {
    const text = appointmentText(s.procedureName, g.proposals);
    const a = await createAppointment({
      patientId: s.patientId,
      hospitalId: s.hospitalId || user.hospitalId || '',
      appointmentDate: parseISO(g.date),
      appointmentTime: DEFAULT_FOLLOW_UP_TIME,
      type: g.proposals.every(p => p.phase === 'post_op') ? 'post_operative' : 'follow_up',
      location: { type: 'hospital', hospitalId: s.hospitalId, hospitalName: hospital?.name },
      reasonForVisit: text.reasonForVisit,
      notes: text.notes,
      clinicianId: s.surgeonId || user.id,
      clinicianName: s.surgeon,
      patientWhatsApp: patient.phone || '',
      patientPhone: patient.phone,
      bookedBy: user.id,
      relatedSurgeryId: s.id,
    });
    for (const p of g.proposals) ids.set(p.key, a.id);
  }
  return ids;
}

/**
 * Book the confirmed proposals (dates possibly moved by the clinician),
 * keep the excluded ones as cancelled, put recall items on recall and
 * "after discharge" items on hold. Idempotent per visit key.
 */
export async function bookFollowUps(
  surgeryId: string, confirmed: FollowUpProposal[], excludedKeys: string[], patient: Patient, user: User,
): Promise<Surgery | undefined> {
  while (inFlight) await inFlight.catch(() => undefined);
  const run = (async () => {
    const s = await db.surgeries.get(surgeryId);
    if (!s) return undefined;
    const have = new Set((s.followUpPlan?.items ?? []).map(i => i.key));
    const fresh = confirmed.filter(p => !have.has(p.key));
    const toBook = fresh.filter(p => p.action === 'book' && !excludedKeys.includes(p.key));
    const ids = await book(s, patient, user, toBook);
    const now = new Date();
    const items = fresh.map(p => excludedKeys.includes(p.key) ? planItem(p, 'cancelled', [], now)
      : p.action === 'recall' ? planItem(p, 'recall', [], now)
      : p.action === 'pending_discharge' ? planItem(p, 'pending_discharge', [], now)
      : planItem(p, 'booked', ids.has(p.key) ? [ids.get(p.key)!] : [], now));
    const moduleId = confirmed[0]?.moduleId ?? s.followUpPlan?.moduleId ?? '';
    return updateSurgery(s.id, { followUpPlan: mergePlan(s.followUpPlan, moduleId, items, now, user.id) });
  })();
  inFlight = run;
  try { return await run; } finally { inFlight = null; }
}

/** Book one plan item now (a recall the clinician confirms, the next visit of a series, or a discharge-dated visit). */
export async function bookPlanItem(surgeryId: string, key: string, date: string, patient: Patient, user: User): Promise<Surgery | undefined> {
  const s = await db.surgeries.get(surgeryId);
  const item = s?.followUpPlan?.items.find(i => i.key === key);
  if (!s || !item || !s.followUpPlan) return s;
  const p: FollowUpProposal = { ...item, dueDate: date, action: 'book' };
  const ids = await book(s, patient, user, [p]);
  const now = new Date();
  return updateSurgery(s.id, {
    followUpPlan: updateItem(s.followUpPlan, key, { status: 'booked', dueDate: date, appointmentIds: [...item.appointmentIds, ids.get(key)!] }, now),
  });
}

/** Stop a recurring series (e.g. the wound has healed), or drop a recall item. */
export async function closePlanItem(surgeryId: string, key: string, status: 'stopped' | 'cancelled'): Promise<void> {
  const s = await db.surgeries.get(surgeryId);
  if (!s?.followUpPlan) return;
  await updateSurgery(s.id, { followUpPlan: updateItem(s.followUpPlan, key, { status }, new Date()) });
}

/** Move a booked follow-up appointment to another day. */
export async function moveFollowUp(appointmentId: string, date: string, userId: string) {
  return updateAppointment(appointmentId, { appointmentDate: parseISO(date) }, userId);
}

/** Cancel a booked follow-up appointment, and mark its visits cancelled on the plan. */
export async function cancelFollowUp(surgeryId: string, appointmentId: string, userId: string) {
  await cancelAppointment(appointmentId, userId, 'Cancelled from the surgery follow-up plan');
  const s = await db.surgeries.get(surgeryId);
  if (!s?.followUpPlan) return;
  const now = new Date();
  let plan = s.followUpPlan;
  for (const i of plan.items) if (i.appointmentIds.includes(appointmentId) && i.kind !== 'next') plan = updateItem(plan, i.key, { status: 'cancelled' }, now);
  await updateSurgery(s.id, { followUpPlan: plan });
}

/**
 * The patient has been discharged: record it on the surgeries of the
 * admission (or the day case) and book the "after discharge" visits that
 * were waiting for the date.
 */
export async function bookOnDischarge(patientId: string, dischargeDate: Date, user: User, opts: { surgeryIds?: string[]; dayCase?: boolean } = {}): Promise<number> {
  const patient = await db.patients.get(patientId);
  if (!patient) return 0;
  const surgeries = (await db.surgeries.where('patientId').equals(patientId).toArray())
    .filter(s => (opts.surgeryIds ? opts.surgeryIds.includes(s.id) : s.status === 'completed' && !s.dischargedAt));
  let booked = 0;
  for (const s of surgeries) {
    await updateSurgery(s.id, { dischargedAt: dischargeDate, dischargeType: opts.dayCase ? 'day_case' : 'admission' });
    const ps = dischargeProposals(s.followUpPlan, dischargeDate);
    if (!ps.length) continue;
    const fresh = await db.surgeries.get(s.id);
    const ids = await book(fresh!, patient, user, ps);
    const now = new Date();
    let plan = fresh!.followUpPlan!;
    for (const p of ps) plan = updateItem(plan, p.key, { status: 'booked', dueDate: p.dueDate, appointmentIds: ids.has(p.key) ? [ids.get(p.key)!] : [] }, now);
    await updateSurgery(s.id, { followUpPlan: plan });
    booked += ps.length;
  }
  return booked;
}

export { ymd };
