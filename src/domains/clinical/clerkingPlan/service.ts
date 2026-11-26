/**
 * The clerking plan from the database: save (offline-first, synced), approve
 * (versioned), save results to db.investigations, the two PDFs, WhatsApp to
 * the patient's own phone, and follow-up appointments from the plan.
 *
 * Owner decision: nothing reaches the patient and no appointment is created
 * until the plan is approved. shareWithPatient and bookPlanAppointments refuse
 * an unapproved plan.
 */
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { createAppointment } from '../../../services/appointmentService';
import { sharePDFOnWhatsApp } from '../../../utils/whatsappShareUtils';
import type { Investigation, InvestigationResult, Patient, User } from '../../../types';
import type { ClerkingData } from '../clerking/types';
import type { PatientContext } from '../clerking/engine';
import { actorOf } from '../services/clerkingService';
import { DEFAULT_FOLLOW_UP_TIME } from '../../surgery/journey/followUpPlan';
import { ANALYTE_BY_KEY } from '../../clinician-assistant/services/engine/referenceRanges';
import { buildRulesPlan } from './rulesPlan';
import { buildFinalPlan } from './finalPlan';
import { plannedRows, resultMaps, type ResultValue } from './results';
import { buildClinicianPlanDocument, buildPatientPlanDocument, renderPlanDocument } from './pdf';
import { RULES_ENGINE_VERSION } from './rulesPlan';
import type { ClerkingPlanRecord, ClerkingPlanSource, PlanAppointment, PlanApproval } from './records';
import type { PlanLine } from './types';

const asRecord = (r: unknown) => r as Record<string, unknown>;
const now = () => new Date().toISOString();

async function put(r: ClerkingPlanRecord): Promise<ClerkingPlanRecord> {
  const next = { ...r, updatedAt: now() };
  await db.clerkingPlans.put(next);
  await syncRecord('clerkingPlans', asRecord(next));
  return next;
}

export async function getPlan(id: string) { return db.clerkingPlans.get(id); }
export async function plansForPatient(patientId: string) {
  return (await db.clerkingPlans.where('patientId').equals(patientId).toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface PlanDraftInput {
  id?: string;
  patientId: string;
  hospitalId?: string;
  encounterId?: string;
  source: ClerkingPlanSource;
  clerking: ClerkingData;
  ctx: PatientContext;
  conditionIds?: string[];
  woundProtocol?: boolean | null;
}

/** Create or update the plan from the clerking as it stands (rules plan recomputed). */
export async function savePlanDraft(i: PlanDraftInput, user: User, patch: Partial<ClerkingPlanRecord> = {}): Promise<ClerkingPlanRecord> {
  const existing = i.id ? await db.clerkingPlans.get(i.id) : undefined;
  const base: ClerkingPlanRecord = existing ?? {
    id: i.id ?? uuidv4(), patientId: i.patientId, hospitalId: i.hospitalId, source: i.source, status: 'draft', planVersion: 0,
    conditions: [], clerking: i.clerking, ctx: i.ctx, conditionIds: [], woundProtocol: null, rulesPlan: buildRulesPlan({ data: i.clerking, ctx: i.ctx }),
    decisions: [], manualLines: [], results: [], approvals: [], shares: [], appointments: [],
    createdBy: user.id, createdByName: actorOf(user).name, createdAt: now(), updatedAt: now(),
  };
  const merged = { ...base, ...patch, clerking: i.clerking, ctx: i.ctx, encounterId: i.encounterId ?? base.encounterId, hospitalId: i.hospitalId ?? base.hospitalId,
    conditionIds: i.conditionIds ?? patch.conditionIds ?? base.conditionIds, woundProtocol: i.woundProtocol !== undefined ? i.woundProtocol : patch.woundProtocol ?? base.woundProtocol };
  const { labs, qualitative } = resultMaps(merged.results);
  merged.rulesPlan = buildRulesPlan({ data: merged.clerking, ctx: merged.ctx, labs, qualitative, conditionIds: merged.conditionIds, woundProtocol: merged.woundProtocol });
  merged.conditions = merged.rulesPlan.conditions;
  merged.status = merged.planVersion > 0 ? 'approved' : 'draft';
  return put(merged);
}

export async function updatePlan(id: string, patch: Partial<ClerkingPlanRecord>): Promise<ClerkingPlanRecord> {
  const r = await db.clerkingPlans.get(id);
  if (!r) throw new Error('Plan not found');
  const next = { ...r, ...patch };
  if (patch.results) {
    const { labs, qualitative } = resultMaps(next.results);
    next.rulesPlan = buildRulesPlan({ data: next.clerking, ctx: next.ctx, labs, qualitative, conditionIds: next.conditionIds, woundProtocol: next.woundProtocol });
  }
  return put(next);
}

/** The final plan as it would be approved now. */
export function finalLinesOf(r: ClerkingPlanRecord): PlanLine[] {
  return buildFinalPlan(r.rulesPlan.lines, [...(r.aiDraft?.lines ?? []), ...(r.interpretation?.ai?.lines ?? [])], r.decisions, r.manualLines);
}

/** Approve: a new version with the approver, time, final lines and the rules it was checked against. */
export async function approvePlan(id: string, user: User): Promise<ClerkingPlanRecord> {
  const r = await db.clerkingPlans.get(id);
  if (!r) throw new Error('Plan not found');
  const lines = finalLinesOf(r);
  if (!lines.length) throw new Error('The final plan is empty');
  const actor = actorOf(user);
  const approval: PlanApproval = {
    version: r.planVersion + 1, at: now(), by: user.id, byName: actor.name, byRole: user.role,
    lines, hardRules: r.rulesPlan.hardRules, rulesInputsHash: r.rulesPlan.inputsHash, protocolVersion: r.rulesPlan.protocolVersion,
    engineVersion: RULES_ENGINE_VERSION, includesAi: lines.some(l => l.source.kind === 'ai'),
  };
  return put({ ...r, approvals: [...r.approvals, approval], planVersion: approval.version, status: 'approved' });
}

export const latestApproval = (r: Pick<ClerkingPlanRecord, 'approvals'>) => r.approvals[r.approvals.length - 1] as PlanApproval | undefined;

// ── Results → db.investigations ────────────────────────────────────────────

/**
 * Save the confirmed results onto investigation rows (one per planned test,
 * linked to the patient and encounter), so the lab views and trends see
 * them; returns the results with their investigationId.
 */
export async function saveResultsToInvestigations(r: ClerkingPlanRecord, user: User, patient?: Patient): Promise<ClerkingPlanRecord> {
  const rows = plannedRows(finalLinesOf(r));
  const values = [...r.results];
  const t = new Date();
  for (const row of rows) {
    const mine = values.filter(v => v.testId === row.testId && v.confirmed && !v.error);
    if (!mine.length) continue;
    const existingId = mine.find(v => v.investigationId)?.investigationId;
    const existing = existingId ? await db.investigations.get(existingId) : undefined;
    const results: InvestigationResult[] = mine.map(v => v.analyte ? {
      parameter: ANALYTE_BY_KEY[v.analyte]?.label ?? v.analyte, parameterName: ANALYTE_BY_KEY[v.analyte]?.label ?? v.analyte, value: v.value!, unit: v.unit,
      flag: v.flag === 'low' ? 'L' : v.flag === 'high' ? 'H' : 'normal', isAbnormal: v.flag === 'low' || v.flag === 'high', resultDate: new Date(v.at),
    } : { parameter: row.label, parameterName: row.label, value: v.text ?? '', resultDate: new Date(v.at) });
    const inv: Investigation = {
      ...(existing ?? {
        id: uuidv4(), patientId: r.patientId, hospitalId: r.hospitalId || user.hospitalId || '', encounterId: r.encounterId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined, hospitalNumber: patient?.hospitalNumber,
        type: 'other', category: 'laboratory', name: row.label, priority: 'routine', requestedBy: user.id, requestedByName: actorOf(user).name, requestedAt: t,
        clinicalInfo: `From the clerking treatment plan (${r.conditions.map(c => c.label).join(', ')})`, createdAt: t,
      }),
      status: 'completed', completedAt: t, completedBy: user.id, completedByName: actorOf(user).name, results, updatedAt: t,
    } as Investigation;
    await db.investigations.put(inv);
    await syncRecord('investigations', asRecord(inv));
    for (const v of mine) v.investigationId = inv.id;
  }
  return updatePlan(r.id, { results: values });
}

// ── PDFs and sharing ───────────────────────────────────────────────────────

async function docInputs(r: ClerkingPlanRecord) {
  const approval = latestApproval(r);
  if (!approval) throw new Error('Approve the plan first: nothing is shared before approval');
  const [patient, hospital, appts] = await Promise.all([
    db.patients.get(r.patientId), r.hospitalId ? db.hospitals.get(r.hospitalId) : Promise.resolve(undefined),
    db.appointments.where('patientId').equals(r.patientId).toArray(),
  ]);
  const ids = new Set(r.appointments.map(a => a.appointmentId));
  // Infants: no "0 years" on the documents.
  const age = r.ctx.ageYears ? r.ctx.ageYears : undefined;
  return {
    patient, approval,
    input: {
      record: r, approval, hospitalName: hospital?.name, date: new Date(),
      patient: { name: patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient', hospitalNumber: patient?.hospitalNumber || '', age, gender: patient?.gender, phone: patient?.phone },
      appointments: appts.filter(a => ids.has(a.id)),
    },
  };
}

export async function clinicianPdf(r: ClerkingPlanRecord) {
  const { input } = await docInputs(r);
  const d = buildClinicianPlanDocument(input);
  return { doc: renderPlanDocument(d), fileName: d.fileName };
}

export async function patientPdf(r: ClerkingPlanRecord) {
  const { input, patient } = await docInputs(r);
  const d = buildPatientPlanDocument(input);
  return { doc: renderPlanDocument(d), fileName: d.fileName, phone: patient?.phone, model: d };
}

/** Patient copy to the patient's own WhatsApp (or download), logged on the plan. */
export async function shareWithPatient(id: string, via: 'whatsapp' | 'download', user: User): Promise<ClerkingPlanRecord> {
  const r = await db.clerkingPlans.get(id);
  if (!r) throw new Error('Plan not found');
  const { doc, fileName, phone } = await patientPdf(r);
  if (via === 'whatsapp') {
    if (!phone) throw new Error("No phone number on the patient's record");
    await sharePDFOnWhatsApp(doc.output('blob'), fileName, phone);
  } else doc.save(fileName);
  return updatePlan(id, { shares: [...r.shares, { id: uuidv4(), at: now(), by: user.id, byName: actorOf(user).name, via, audience: 'patient', fileName, planVersion: r.planVersion, phone: via === 'whatsapp' ? phone : undefined }] });
}

export async function downloadClinicianPdf(id: string, user: User): Promise<ClerkingPlanRecord> {
  const r = await db.clerkingPlans.get(id);
  if (!r) throw new Error('Plan not found');
  const { doc, fileName } = await clinicianPdf(r);
  doc.save(fileName);
  return updatePlan(id, { shares: [...r.shares, { id: uuidv4(), at: now(), by: user.id, byName: actorOf(user).name, via: 'download', audience: 'clinician', fileName, planVersion: r.planVersion }] });
}

// ── Follow-up appointments ─────────────────────────────────────────────────

export interface AppointmentProposal { key: string; lineId: string; date: string; when: string; purpose: string }

/** The approved plan's dated follow-up visits not yet booked. Pure apart from the record. */
export function appointmentProposals(r: ClerkingPlanRecord, today = new Date()): { proposals: AppointmentProposal[]; undated: string[] } {
  const approval = latestApproval(r);
  if (!approval) return { proposals: [], undated: [] };
  const booked = new Set(r.appointments.map(a => a.lineId));
  const from = startOfDay(new Date(approval.at));
  const proposals: AppointmentProposal[] = [];
  const undated: string[] = [];
  for (const l of approval.lines.filter(x => x.section === 'follow_up' && x.followUp)) {
    if (booked.has(l.id)) continue;
    if (l.followUp!.days == null) { undated.push(l.text); continue; }
    const d = addDays(from, l.followUp!.days);
    const date = d < startOfDay(addDays(today, 1)) ? addDays(startOfDay(today), 1) : d;
    proposals.push({ key: `${l.id}|v${approval.version}`, lineId: l.id, date: format(date, 'yyyy-MM-dd'), when: l.followUp!.when, purpose: l.followUp!.purpose });
  }
  return { proposals: proposals.sort((a, b) => a.date.localeCompare(b.date)), undated };
}

let inFlight: Promise<unknown> | null = null;

/** Book the confirmed visits (one appointment per day), idempotent per follow-up line. */
export async function bookPlanAppointments(id: string, confirmed: AppointmentProposal[], patient: Patient, user: User): Promise<ClerkingPlanRecord> {
  while (inFlight) await inFlight.catch(() => undefined);
  const run = (async () => {
    const r = await db.clerkingPlans.get(id);
    if (!r) throw new Error('Plan not found');
    if (!latestApproval(r)) throw new Error('Approve the plan first: no appointment is created before approval');
    const have = new Set(r.appointments.map(a => a.lineId));
    const fresh = confirmed.filter(p => !have.has(p.lineId));
    const byDate = new Map<string, AppointmentProposal[]>();
    for (const p of fresh) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
    const hospital = r.hospitalId ? await db.hospitals.get(r.hospitalId) : undefined;
    const label = r.conditions.map(c => c.label).join(', ') || 'Treatment plan';
    const made: PlanAppointment[] = [];
    for (const [date, ps] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const a = await createAppointment({
        patientId: r.patientId, hospitalId: r.hospitalId || user.hospitalId || '', appointmentDate: parseISO(date), appointmentTime: DEFAULT_FOLLOW_UP_TIME,
        type: 'follow_up', location: { type: 'hospital', hospitalId: r.hospitalId, hospitalName: hospital?.name },
        reasonForVisit: `${label}: ${ps.map(p => p.purpose).join('; ')}`.slice(0, 500),
        notes: ps.map(p => `${p.purpose} (plan: ${p.when})`).join('\n'),
        clinicianId: user.id, clinicianName: actorOf(user).name, patientWhatsApp: patient.phone || '', patientPhone: patient.phone,
        bookedBy: user.id, relatedEncounterId: r.encounterId,
      });
      for (const p of ps) made.push({ key: p.key, lineId: p.lineId, appointmentId: a.id, date, purpose: p.purpose, planVersion: r.planVersion, at: now() });
    }
    return updatePlan(id, { appointments: [...r.appointments, ...made] });
  })();
  inFlight = run;
  try { return await run; } finally { inFlight = null; }
}

export type { ResultValue };
