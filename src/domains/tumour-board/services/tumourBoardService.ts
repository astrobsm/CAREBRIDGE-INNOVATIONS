/**
 * Tumour Board — service layer (offline-first, AstroHEALTH data layer).
 *
 * Persists oncology cases and their append-only staging timeline, and composes
 * the pure generators in ./oncology into the artefacts the board needs:
 * a staged assessment, a multimodality plan, referral letters, a surveillance
 * schedule and a counselling document.
 *
 * Deliberate reuse — NOT reimplemented here:
 *  - Staging, plan, letter, surveillance and counselling logic all live in
 *    ./oncology/* as pure functions, so they are unit-tested without a database
 *    and run unchanged offline. This service only PERSISTS and AGGREGATES.
 *  - Persistence rides the app's shared offline-first stack, exactly as
 *    woundMonitorService does:
 *      · IndexedDB (Dexie) tables `tumourBoardCases`, `tumourBoardAssessments`,
 *        `tumourBoardPlans`, `tumourBoardReferrals`, `tumourBoardSurveillance`
 *      · Supabase mirror via `syncRecord` / fullSync
 *  - PDF rendering goes through utils/pdfUtils via tumourBoardPdfService.
 *
 * Everything reads from the local mirror first, so the whole module works on a
 * ward with no network — which is the point.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord, deleteRecordFromCloud } from '../../../services/cloudSyncService';
import {
  computeStage,
  type StageResult,
  type StagingInput,
} from './oncology/stagingEngine';
import {
  buildManagementPlan,
  type ManagementPlan,
  type PlanContext,
} from './oncology/managementPlan';
import {
  generateAllReferralLetters,
  type LetterContext,
  type ReferralLetter,
} from './oncology/referralLetters';
import { buildSurveillancePlan, type SurveillancePlan } from './oncology/surveillance';
import { buildCounsellingDocument, type CounsellingDocument } from './oncology/counselling';
import type {
  BoardSummary,
  CaseDetail,
  TumourBoardAssessment,
  TumourBoardCase,
  TumourBoardCaseRow,
  TumourBoardPlan,
  TumourBoardReferral,
  TumourBoardSurveillanceItem,
} from '../tumourBoardTypes';

export type {
  BoardSummary,
  CaseDetail,
  TumourBoardAssessment,
  TumourBoardCase,
  TumourBoardCaseRow,
  TumourBoardPlan,
  TumourBoardReferral,
  TumourBoardSurveillanceItem,
} from '../tumourBoardTypes';
export type { StageResult, StagingInput } from './oncology/stagingEngine';
export type { ManagementPlan } from './oncology/managementPlan';
export type { ReferralLetter } from './oncology/referralLetters';
export type { SurveillancePlan } from './oncology/surveillance';
export type { CounsellingDocument } from './oncology/counselling';

const nowIso = (): string => new Date().toISOString();

const ts = (v?: string | null): number => (v ? new Date(v).getTime() : 0);

// ── Case CRUD ──────────────────────────────────────────────────────────────

/** All cases for one patient, newest first. Closed cases included. */
export async function listCasesForPatient(patientId: string): Promise<TumourBoardCase[]> {
  try {
    const rows = await db.tumourBoardCases.where('patientId').equals(patientId).toArray();
    return rows.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  } catch (e) {
    console.error('[TumourBoard] listCasesForPatient failed:', e);
    return [];
  }
}

export interface CreateCaseInput {
  patientId: string;
  hospitalId?: string;
  hospitalNumber?: string;
  tumorFamily: TumourBoardCase['tumorFamily'];
  diagnosis?: string;
  primarySite?: string;
  laterality?: string;
  sarcomaSite?: TumourBoardCase['sarcomaSite'];
  dateOfDiagnosis?: string;
  dateFirstPresented?: string;
  performanceStatus?: string;
  comorbidities?: string;
  immunosuppressed?: boolean;
  highRiskSite?: boolean;
  recurrentDisease?: boolean;
  fitForRadicalTherapy?: boolean | null;
  brafMutated?: boolean | null;
  histologyAvailable?: boolean;
  histologicType?: string | null;
  createdBy?: string;
}

export async function createCase(input: CreateCaseInput): Promise<TumourBoardCase> {
  const now = nowIso();
  const record: TumourBoardCase = {
    ...input,
    id: uuidv4(),
    status: 'active',
    assessmentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.tumourBoardCases.add(record);
  syncRecord('tumourBoardCases', record as unknown as Record<string, unknown>);
  return record;
}

export async function updateCase(
  caseId: string,
  patch: Partial<TumourBoardCase>,
): Promise<TumourBoardCase | undefined> {
  await db.tumourBoardCases.update(caseId, { ...patch, updatedAt: nowIso() });
  const updated = await db.tumourBoardCases.get(caseId);
  if (updated) syncRecord('tumourBoardCases', updated as unknown as Record<string, unknown>);
  return updated;
}

/** Close a case. Never deletes — the oncology record is permanent. */
export async function closeCase(caseId: string): Promise<void> {
  await updateCase(caseId, { status: 'closed' });
}

// ── Worklist aggregate ─────────────────────────────────────────────────────

/**
 * Rebuild the board worklist from the local mirror. Computed client-side so it
 * renders identically online and offline.
 */
export async function getBoard(): Promise<{ cases: TumourBoardCaseRow[]; summary: BoardSummary }> {
  let all: TumourBoardCase[] = [];
  try {
    all = await db.tumourBoardCases.toArray();
  } catch (e) {
    console.error('[TumourBoard] getBoard failed:', e);
    return { cases: [], summary: { total: 0, awaitingHistology: 0, overdueSurveillance: 0 } };
  }

  const open = all.filter(c => c.status !== 'closed');

  // Overdue surveillance: scheduled items whose due date has passed.
  const today = new Date().toISOString().slice(0, 10);
  let overdueByCase = new Map<string, number>();
  try {
    const items = await db.tumourBoardSurveillance.toArray();
    for (const item of items) {
      if (item.status === 'scheduled' && item.dueDate && item.dueDate < today) {
        overdueByCase.set(item.caseId, (overdueByCase.get(item.caseId) || 0) + 1);
      }
    }
  } catch {
    overdueByCase = new Map();
  }

  // Denormalise patient identifiers for the row labels.
  const patientIds = [...new Set(open.map(c => c.patientId))];
  const patients = new Map<string, { firstName?: string; lastName?: string; hospitalNumber?: string }>();
  await Promise.all(
    patientIds.map(async pid => {
      try {
        const p = await db.patients.get(pid);
        if (p) patients.set(pid, { firstName: p.firstName, lastName: p.lastName, hospitalNumber: p.hospitalNumber });
      } catch { /* patient not mirrored locally yet */ }
    }),
  );

  const rows: TumourBoardCaseRow[] = open
    .map(c => {
      const p = patients.get(c.patientId);
      return {
        ...c,
        firstName: p?.firstName,
        lastName: p?.lastName,
        patientHospitalNumber: c.hospitalNumber || p?.hospitalNumber,
        overdueSurveillanceCount: overdueByCase.get(c.id) || 0,
      };
    })
    // Cases needing attention first: overdue surveillance, then awaiting
    // histology, then most recently updated.
    .sort((a, b) => {
      const aUrgent = (a.overdueSurveillanceCount || 0) > 0 ? 0 : 1;
      const bUrgent = (b.overdueSurveillanceCount || 0) > 0 ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      const aPending = a.histologyAvailable ? 1 : 0;
      const bPending = b.histologyAvailable ? 1 : 0;
      if (aPending !== bPending) return aPending - bPending;
      return ts(b.updatedAt) - ts(a.updatedAt);
    });

  const overdueSurveillance = rows.reduce((n, r) => n + (r.overdueSurveillanceCount || 0), 0);

  return {
    cases: rows,
    summary: {
      total: rows.length,
      awaitingHistology: rows.filter(c => !c.histologyAvailable).length,
      overdueSurveillance,
    },
  };
}

/**
 * Assign the DISPLAYED version ordinal from chronological order.
 *
 * The stored `version` is a best-effort stamp taken from the local maximum at
 * write time, so two clinicians assessing the same case offline can both mint
 * the same number. Deriving the ordinal from the timeline instead means the
 * displayed history is always consistent once the devices sync.
 */
export function withDerivedVersions(assessments: TumourBoardAssessment[]): TumourBoardAssessment[] {
  const oldestFirst = [...assessments].sort(
    (a, b) => ts(a.assessedAt || a.createdAt) - ts(b.assessedAt || b.createdAt),
  );
  const ordinals = new Map<string, number>();
  oldestFirst.forEach((a, i) => ordinals.set(a.id, i + 1));
  return assessments.map(a => ({ ...a, version: ordinals.get(a.id) ?? a.version }));
}

export async function getCaseDetail(caseId: string): Promise<CaseDetail | null> {
  try {
    const record = await db.tumourBoardCases.get(caseId);
    if (!record) return null;

    const [rawAssessments, plans, referrals, surveillance] = await Promise.all([
      db.tumourBoardAssessments.where('caseId').equals(caseId).toArray(),
      db.tumourBoardPlans.where('caseId').equals(caseId).toArray(),
      db.tumourBoardReferrals.where('caseId').equals(caseId).toArray(),
      db.tumourBoardSurveillance.where('caseId').equals(caseId).toArray(),
    ]);

    let firstName: string | undefined;
    let lastName: string | undefined;
    let patientHospitalNumber: string | undefined = record.hospitalNumber;
    try {
      const p = await db.patients.get(record.patientId);
      if (p) {
        firstName = p.firstName;
        lastName = p.lastName;
        patientHospitalNumber = patientHospitalNumber || p.hospitalNumber;
      }
    } catch { /* patient not mirrored locally yet */ }

    // Newest first — the case view leads with the current stage.
    const assessments = withDerivedVersions(rawAssessments).sort(
      (a, b) => ts(b.assessedAt || b.createdAt) - ts(a.assessedAt || a.createdAt),
    );

    return {
      case: { ...record, firstName, lastName, patientHospitalNumber },
      assessments,
      plans: plans.sort((a, b) => ts(b.createdAt) - ts(a.createdAt)),
      referrals: referrals.sort((a, b) => ts(b.createdAt) - ts(a.createdAt)),
      surveillance: surveillance.sort((a, b) => a.dueMonth - b.dueMonth),
    };
  } catch (e) {
    console.error('[TumourBoard] getCaseDetail failed:', e);
    return null;
  }
}

// ── Staging ────────────────────────────────────────────────────────────────

/**
 * Stage a case and APPEND the result to its timeline.
 *
 * Never overwrites: a case staged clinically before histology and re-staged
 * afterwards keeps both versions, so the record shows what was known when each
 * decision was taken. That is the point of the module.
 */
export async function recordAssessment(
  caseRecord: TumourBoardCase,
  input: StagingInput,
  extra: Partial<TumourBoardAssessment> = {},
): Promise<{ assessment: TumourBoardAssessment; stage: StageResult }> {
  const stage = computeStage(input);
  const now = nowIso();

  let nextVersion = 1;
  try {
    const existing = await db.tumourBoardAssessments.where('caseId').equals(caseRecord.id).toArray();
    nextVersion = existing.reduce((max, a) => Math.max(max, a.version || 0), 0) + 1;
  } catch { /* fall back to 1 */ }

  const assessment: TumourBoardAssessment = {
    id: uuidv4(),
    caseId: caseRecord.id,
    patientId: caseRecord.patientId,
    version: nextVersion,
    basis: input.basis,
    stagingSystem: stage.stagingSystem,
    assessedAt: now,
    inputs: input,
    tCategory: stage.T,
    nCategory: stage.N,
    mCategory: stage.M,
    stageGroup: stage.stageGroup,
    stageFormatted: stage.formatted,
    stageDescription: stage.stageDescription,
    caveats: stage.caveats,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };

  await db.tumourBoardAssessments.add(assessment);
  syncRecord('tumourBoardAssessments', assessment as unknown as Record<string, unknown>);

  // Roll the newest stage up onto the case so the worklist can show it without
  // reading the whole timeline.
  await updateCase(caseRecord.id, {
    currentStageGroup: stage.stageGroup,
    currentStageFormatted: stage.formatted,
    assessmentCount: nextVersion,
    histologyAvailable: input.histologyAvailable ?? caseRecord.histologyAvailable,
    histologicType: (extra.histologicType ?? caseRecord.histologicType) || null,
  });

  return { assessment, stage };
}

/** Re-derive the StageResult from a stored assessment without re-entering data. */
export function stageFromAssessment(a: TumourBoardAssessment): StageResult {
  if (a.inputs && typeof a.inputs === 'object' && 'family' in a.inputs) {
    return computeStage(a.inputs);
  }
  // Fall back to the persisted derived values for rows written before the full
  // input was retained.
  return {
    T: a.tCategory || 'TX',
    N: a.nCategory || 'NX',
    M: a.mCategory || 'M0',
    stageGroup: a.stageGroup || 'Not assignable',
    stageDescription: a.stageDescription || '',
    stagingSystem: a.stagingSystem || 'AJCC 8th edition (2018)',
    basis: a.basis,
    prefix: a.basis === 'pathological' ? 'p' : a.basis === 'post_neoadjuvant' ? 'yp' : 'c',
    formatted: a.stageFormatted || '',
    caveats: a.caveats || [],
  };
}

// ── Plan ───────────────────────────────────────────────────────────────────

export function buildPlanForCase(
  caseRecord: TumourBoardCase,
  stage: StageResult,
  input?: StagingInput,
): ManagementPlan {
  const ctx: PlanContext = {
    family: caseRecord.tumorFamily,
    stage,
    breslowMm: input?.breslowMm ?? null,
    sizeCm: input?.sizeCm ?? null,
    sarcomaSite: caseRecord.sarcomaSite,
    grade: input?.grade,
    histologyAvailable: caseRecord.histologyAvailable,
    histologicType: caseRecord.histologicType,
    highRiskSite: caseRecord.highRiskSite,
    immunosuppressed: caseRecord.immunosuppressed,
    brafMutated: caseRecord.brafMutated,
    recurrentDisease: caseRecord.recurrentDisease,
    perineuralInvasion: input?.perineuralInvasion,
    fitForRadicalTherapy: caseRecord.fitForRadicalTherapy ?? undefined,
  };
  return buildManagementPlan(ctx);
}

export async function savePlan(
  caseRecord: TumourBoardCase,
  plan: ManagementPlan,
  opts: { assessmentId?: string; boardDate?: string; boardMembers?: string; createdBy?: string } = {},
): Promise<TumourBoardPlan> {
  const now = nowIso();
  const record: TumourBoardPlan = {
    id: uuidv4(),
    caseId: caseRecord.id,
    patientId: caseRecord.patientId,
    assessmentId: opts.assessmentId || null,
    intent: plan.intent,
    summary: plan.summary,
    items: plan.items,
    specialties: plan.specialtiesInvolved,
    caveats: plan.caveats,
    boardDate: opts.boardDate || null,
    boardMembers: opts.boardMembers || null,
    ratified: false,
    ratifiedBy: null,
    ratifiedAt: null,
    createdBy: opts.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await db.tumourBoardPlans.add(record);
  syncRecord('tumourBoardPlans', record as unknown as Record<string, unknown>);

  await updateCase(caseRecord.id, {
    treatmentIntent: plan.intent,
    lastBoardDate: opts.boardDate || caseRecord.lastBoardDate,
  });

  return record;
}

/**
 * Mark a plan as ratified by the board.
 *
 * Governance: the generator produces a DRAFT. Ratification is the human step
 * that makes it actionable, so it records who did it and when.
 */
export async function ratifyPlan(planId: string, ratifiedBy?: string): Promise<TumourBoardPlan | undefined> {
  const now = nowIso();
  await db.tumourBoardPlans.update(planId, {
    ratified: true,
    ratifiedBy: ratifiedBy || null,
    ratifiedAt: now,
    updatedAt: now,
  });
  const updated = await db.tumourBoardPlans.get(planId);
  if (updated) syncRecord('tumourBoardPlans', updated as unknown as Record<string, unknown>);
  return updated;
}

// ── Referral letters ───────────────────────────────────────────────────────

export function buildLetters(ctx: LetterContext): ReferralLetter[] {
  return generateAllReferralLetters(ctx);
}

export async function saveReferrals(
  caseRecord: TumourBoardCase,
  letters: ReferralLetter[],
  planId?: string,
): Promise<TumourBoardReferral[]> {
  const now = nowIso();
  const records: TumourBoardReferral[] = letters.map(l => ({
    id: uuidv4(),
    caseId: caseRecord.id,
    patientId: caseRecord.patientId,
    planId: planId || null,
    specialty: l.specialty,
    specialtyLabel: l.specialtyLabel,
    subject: l.subject,
    body: l.body,
    requestedItems: l.requestedItems,
    urgency: l.urgency,
    status: 'draft',
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  if (!records.length) return [];
  await db.tumourBoardReferrals.bulkAdd(records);
  for (const r of records) {
    syncRecord('tumourBoardReferrals', r as unknown as Record<string, unknown>);
  }
  return records;
}

export async function markReferralSent(referralId: string): Promise<TumourBoardReferral | undefined> {
  const now = nowIso();
  await db.tumourBoardReferrals.update(referralId, { status: 'sent', sentAt: now, updatedAt: now });
  const updated = await db.tumourBoardReferrals.get(referralId);
  if (updated) syncRecord('tumourBoardReferrals', updated as unknown as Record<string, unknown>);
  return updated;
}

// ── Surveillance ───────────────────────────────────────────────────────────

export function buildSurveillance(
  caseRecord: TumourBoardCase,
  stage: StageResult,
  opts: { indexDate?: string; grade?: string; sentinelNodeDone?: boolean } = {},
): SurveillancePlan {
  return buildSurveillancePlan({
    family: caseRecord.tumorFamily,
    stage,
    indexDate: opts.indexDate,
    grade: opts.grade,
    sentinelNodeDone: opts.sentinelNodeDone,
  });
}

/**
 * Persist a surveillance schedule, replacing any still-scheduled items for the
 * case.
 *
 * COMPLETED items are never touched — a follow-up that actually happened is a
 * clinical event, not a plan, and re-generating the schedule after re-staging
 * must not erase it.
 */
export async function saveSurveillance(
  caseRecord: TumourBoardCase,
  plan: SurveillancePlan,
): Promise<TumourBoardSurveillanceItem[]> {
  const now = nowIso();

  try {
    const existing = await db.tumourBoardSurveillance.where('caseId').equals(caseRecord.id).toArray();
    const superseded = existing.filter(i => i.status === 'scheduled');
    if (superseded.length) {
      await db.tumourBoardSurveillance.bulkDelete(superseded.map(i => i.id));
      for (const i of superseded) {
        deleteRecordFromCloud('tumourBoardSurveillance', i.id).catch(() => { /* retried by fullSync */ });
      }
    }
  } catch (e) {
    console.warn('[TumourBoard] Could not clear superseded surveillance items:', e);
  }

  const records: TumourBoardSurveillanceItem[] = plan.items.map(item => ({
    id: uuidv4(),
    caseId: caseRecord.id,
    patientId: caseRecord.patientId,
    category: item.category,
    title: item.title,
    detail: item.detail,
    dueMonth: item.dueMonth,
    dueDate: item.dueDate,
    phase: item.phase,
    basis: item.basis,
    status: 'scheduled',
    completedAt: null,
    findings: null,
    createdAt: now,
    updatedAt: now,
  }));

  if (!records.length) return [];
  await db.tumourBoardSurveillance.bulkAdd(records);
  for (const r of records) {
    syncRecord('tumourBoardSurveillance', r as unknown as Record<string, unknown>);
  }
  return records;
}

export async function completeSurveillanceItem(
  itemId: string,
  findings?: string,
): Promise<TumourBoardSurveillanceItem | undefined> {
  const now = nowIso();
  await db.tumourBoardSurveillance.update(itemId, {
    status: 'completed',
    completedAt: now,
    findings: findings || null,
    updatedAt: now,
  });
  const updated = await db.tumourBoardSurveillance.get(itemId);
  if (updated) syncRecord('tumourBoardSurveillance', updated as unknown as Record<string, unknown>);
  return updated;
}

/**
 * Surveillance falling due within `withinDays` — plus anything already overdue,
 * which is the half that actually matters.
 */
export async function getDueSurveillance(withinDays = 30): Promise<TumourBoardSurveillanceItem[]> {
  try {
    const horizon = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const items = await db.tumourBoardSurveillance.toArray();
    return items
      .filter(i => i.status === 'scheduled' && i.dueDate && i.dueDate <= horizon)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  } catch (e) {
    console.error('[TumourBoard] getDueSurveillance failed:', e);
    return [];
  }
}

// ── Counselling ────────────────────────────────────────────────────────────

export function buildCounselling(
  caseRecord: TumourBoardCase,
  stage: StageResult,
  plan: ManagementPlan,
  patientName?: string,
): CounsellingDocument {
  return buildCounsellingDocument({
    family: caseRecord.tumorFamily,
    stage,
    plan,
    patientName,
    histologyPending: !caseRecord.histologyAvailable,
    histologicType: caseRecord.histologicType,
    primarySite: caseRecord.primarySite,
  });
}
