/**
 * Persistence for the medical scribe's treatment plans.
 *
 * Offline-first through Dexie with the Supabase mirror on the existing sync
 * path. A draft is never an order: submitting puts it in the consultant's
 * queue, and only approval — with any lines the consultant removed or added
 * — turns it into the patient's active TreatmentPlan. Every decision keeps
 * who and when, and is audited.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { logAuditEvent } from '../../../services/auditService';
import type { User } from '../../../types';
import { actorOf } from '../services/clerkingService';
import type { ScribeFinding, ScribePlan } from './scribePlan';
import type { ScribePlanAction, ScribeTreatmentPlan } from './records';
import { assertCanReview, assertCanSubmitPlan, SCRIBE_ENTITY_PREFIX, toTreatmentPlan } from './approval';

const nowIso = () => new Date().toISOString();
const asRecord = (r: unknown) => r as Record<string, unknown>;

async function writePlan(p: ScribeTreatmentPlan) {
  await db.scribeTreatmentPlans.put(p);
  await syncRecord('scribeTreatmentPlans', asRecord(p));
}

export interface PatientScribePlans {
  /** Newest version first. */
  plans: ScribeTreatmentPlan[];
  /** The implementation log of those plans, newest first. */
  actions: ScribePlanAction[];
}

export async function forPatient(patientId: string): Promise<PatientScribePlans> {
  const plans = (await db.scribeTreatmentPlans.where('patientId').equals(patientId).toArray())
    .sort((a, b) => b.version - a.version).slice(0, 20);
  const ids = new Set(plans.map(p => p.id));
  const actions = (await db.scribePlanActions.where('patientId').equals(patientId).toArray())
    .filter(a => ids.has(a.scribePlanId))
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  return { plans, actions };
}

/** Every plan waiting for a consultant, oldest first. */
export async function pendingApproval(): Promise<ScribeTreatmentPlan[]> {
  return (await db.scribeTreatmentPlans.where('status').equals('pending_approval').toArray())
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt)).slice(0, 100);
}

/** Draft → pending approval. A newer draft replaces one still waiting. */
export async function submitPlan(patientId: string, plan: ScribePlan, findings: ScribeFinding[], user: User, hospitalId?: string): Promise<ScribeTreatmentPlan> {
  const actor = actorOf(user);
  assertCanSubmitPlan(actor, patientId, plan);
  const ts = nowIso();
  const existing = await db.scribeTreatmentPlans.where('patientId').equals(patientId).toArray();
  for (const p of existing.filter(x => x.status === 'pending_approval')) await writePlan({ ...p, status: 'superseded', updatedAt: ts });
  const row: ScribeTreatmentPlan = {
    id: uuidv4(), patientId, hospitalId: hospitalId || user.hospitalId,
    version: existing.reduce((m, p) => Math.max(m, p.version), 0) + 1,
    status: 'pending_approval', plan, findings: findings || [], basis: plan.basis || [],
    generatedBy: actor.id, generatedByName: actor.name, generatedAt: ts, createdAt: ts, updatedAt: ts,
  };
  await writePlan(row);
  void logAuditEvent(user.id, 'scribe_plan_submitted', 'scribe_treatment_plans', row.id, { newValue: { patientId, version: row.version } });
  return row;
}

/**
 * Approve — with the consultant's edits if any. The approved plan becomes
 * the patient's active TreatmentPlan; the previously approved scribe plan,
 * and the TreatmentPlan it created, are superseded.
 */
export async function approvePlan(id: string, user: User, editedPlan?: ScribePlan, note?: string): Promise<ScribeTreatmentPlan> {
  const actor = actorOf(user);
  const row = await db.scribeTreatmentPlans.get(id);
  assertCanReview(actor, row, 'approve');
  const ts = nowIso();
  const finalPlan = editedPlan && Array.isArray(editedPlan.problems) ? editedPlan : row!.plan;
  const tp = toTreatmentPlan(finalPlan, {
    id: uuidv4(), patientId: row!.patientId, scribePlanId: row!.id, version: row!.version,
    approverName: actor.name, note: note?.trim() || undefined, createdBy: user.id, now: new Date(ts),
  });

  const previous = (await db.scribeTreatmentPlans.where('patientId').equals(row!.patientId).toArray())
    .filter(p => p.status === 'approved' && p.id !== id);
  const previousTps = (await db.treatmentPlans.where('patientId').equals(row!.patientId).toArray())
    .filter(t => t.status === 'active' && String(t.relatedEntityId || '').startsWith(SCRIBE_ENTITY_PREFIX));

  const approved: ScribeTreatmentPlan = {
    ...row!, status: 'approved', reviewedBy: actor.id, reviewedByName: actor.name, reviewedByRole: actor.role,
    reviewedAt: ts, reviewNote: note?.trim() || undefined, approvedPlan: finalPlan, treatmentPlanId: tp.id, updatedAt: ts,
  };
  await db.treatmentPlans.put(tp);
  await syncRecord('treatmentPlans', asRecord(tp));
  for (const t of previousTps) {
    const done = { ...t, status: 'discontinued' as const, actualEndDate: new Date(ts), updatedAt: new Date(ts) };
    await db.treatmentPlans.put(done);
    await syncRecord('treatmentPlans', asRecord(done));
  }
  for (const p of previous) await writePlan({ ...p, status: 'superseded', updatedAt: ts });
  await writePlan(approved);
  void logAuditEvent(user.id, 'scribe_plan_approved', 'patient', row!.patientId, {
    newValue: { scribePlanId: id, version: row!.version, treatmentPlanId: tp.id, edited: !!editedPlan },
  });
  return approved;
}

/** Return the plan to the team, with the reason. */
export async function rejectPlan(id: string, user: User, note: string): Promise<ScribeTreatmentPlan> {
  const actor = actorOf(user);
  const row = await db.scribeTreatmentPlans.get(id);
  assertCanReview(actor, row, 'reject', note);
  const ts = nowIso();
  const rejected: ScribeTreatmentPlan = {
    ...row!, status: 'rejected', reviewedBy: actor.id, reviewedByName: actor.name, reviewedByRole: actor.role,
    reviewedAt: ts, reviewNote: note.trim(), updatedAt: ts,
  };
  await writePlan(rejected);
  void logAuditEvent(user.id, 'scribe_plan_rejected', 'scribe_treatment_plans', id, { newValue: { note: note.trim().slice(0, 200) } });
  return rejected;
}
