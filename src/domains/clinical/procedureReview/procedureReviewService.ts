/**
 * Persistence for procedure reviews.
 *
 * A review is an ordinary clinicalEncounters row carrying a `procedureReview`
 * block — the clerking's pattern exactly. Offline-first through Dexie, mirrored
 * to Supabase on the existing sync path (procedureReview → procedure_review
 * JSONB by the generic camelCase / snake_case conversion), audited, and
 * governed by the SAME lifecycle rules as the clerking (lifecycle.ts:
 * assertCanEditRecord / assertCanSubmitRecord / assertCanMarkErrorRecord):
 * versioned saves, draft → pending_review → signed, entered-in-error.
 *
 * The plan goes to the consultant through the scribe's own submitPlan, so the
 * approval queue, the TreatmentPlan it becomes and the implementation log are
 * the existing ones.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { logAuditEvent } from '../../../services/auditService';
import type { ClinicalEncounter, User } from '../../../types';
import {
  assertCanEditRecord, assertCanMarkErrorRecord, assertCanSubmitRecord, ClerkingError, encounterStatusFor,
} from '../clerking/lifecycle';
import { actorOf } from '../services/clerkingService';
import { submitPlan } from '../scribe/scribeService';
import type { EncounterAnswers } from '../data/encounterModel';
import type { PDFPatientInfo } from '../../../utils/pdfUtils';
import type { CounsellingRecord, PlanEdits, ReviewPhase, StoredProcedureReview } from './types';
import { getModule } from './registry';
import { computeReview, toStored, type ComputeInput } from './compute';
import { priorReviewsFrom, proseFromReview, reviewTooLarge } from './records';
import { reviewPatientFrom } from './engine';
import { phaseDefinition } from './phases';

export type ReviewedEncounter = ClinicalEncounter & { procedureReview: StoredProcedureReview };

const nowIso = () => new Date().toISOString();

async function write(enc: ClinicalEncounter) {
  await db.clinicalEncounters.put(enc);
  await syncRecord('clinicalEncounters', enc as unknown as Record<string, unknown>);
}

/** Every procedure review of a patient, newest first. */
export async function listReviews(patientId: string): Promise<ReviewedEncounter[]> {
  const all = await db.clinicalEncounters.where('patientId').equals(patientId).toArray();
  return all
    .filter((e): e is ReviewedEncounter => !!e.procedureReview)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface SaveReviewInput {
  id?: string;
  version?: number;
  patientId: string;
  hospitalId?: string;
  moduleId: string;
  phase: ReviewPhase;
  answers: EncounterAnswers;
  otherText?: Record<string, string>;
  planEdits?: PlanEdits;
  counselling: CounsellingRecord;
  pdfPatient: PDFPatientInfo;
  hospitalName?: string;
  linkedWoundId?: string;
  previousEncounterId?: string;
}

/** Everything the pure pipeline needs, gathered from the database. */
async function computeInputFor(input: SaveReviewInput, user: User, ts: string): Promise<ComputeInput> {
  const module = getModule(input.moduleId);
  if (!module) throw new ClerkingError(`Unknown procedure template: ${input.moduleId}`, 400);
  if (!module.phases.includes(input.phase)) throw new ClerkingError(`${module.name} has no ${phaseDefinition(input.phase).label.toLowerCase()}`, 400);
  const [patient, encounters] = await Promise.all([
    db.patients.get(input.patientId),
    db.clinicalEncounters.where('patientId').equals(input.patientId).toArray(),
  ]);
  const actor = actorOf(user);
  return {
    module, phase: input.phase, answers: input.answers, otherText: input.otherText,
    patient: reviewPatientFrom(patient, new Date(ts)),
    prior: priorReviewsFrom(encounters, input.id),
    planEdits: input.planEdits, counselling: input.counselling, pdfPatient: input.pdfPatient,
    clinician: { id: actor.id, name: actor.name, role: actor.role as string | undefined },
    hospitalName: input.hospitalName, now: ts,
  };
}

/** Create (no id) or update a draft / pending review. */
export async function saveReview(input: SaveReviewInput, user: User): Promise<ReviewedEncounter> {
  const actor = actorOf(user);
  const ts = nowIso();
  const ci = await computeInputFor(input, user, ts);
  const computed = computeReview(ci);
  const prose = proseFromReview(ci.module, ci.phase, computed.reading, computed.plan);
  const type = phaseDefinition(input.phase).encounterType;

  if (!input.id) {
    const review = toStored(ci, computed, {
      status: 'draft', version: 1, createdBy: actor.id, createdByName: actor.name, createdByRole: actor.role as string | undefined,
      linkedWoundId: input.linkedWoundId,
    });
    if (reviewTooLarge(review)) throw new ClerkingError('Review is too large to save', 400);
    const enc: ReviewedEncounter = {
      id: uuidv4(),
      patientId: input.patientId,
      hospitalId: input.hospitalId || user.hospitalId || 'hospital-1',
      type,
      status: encounterStatusFor('draft'),
      isFirstEncounter: false,
      previousEncounterId: input.previousEncounterId,
      chiefComplaint: '',
      diagnosis: [],
      ...prose,
      attendingClinician: user.id,
      startedAt: new Date(ts),
      createdAt: new Date(ts),
      updatedAt: new Date(ts),
      procedureReview: review,
    } as ReviewedEncounter;
    await write(enc);
    void logAuditEvent(user.id, 'create', 'clinical_encounters', enc.id, { newValue: { procedureReview: input.moduleId, phase: input.phase } });
    return enc;
  }

  const existing = await db.clinicalEncounters.get(input.id);
  const prev = existing?.procedureReview;
  assertCanEditRecord(prev, input.version, actor);
  const review = toStored(ci, computed, { ...prev!, version: prev!.version + 1, linkedWoundId: input.linkedWoundId ?? prev!.linkedWoundId });
  if (reviewTooLarge(review)) throw new ClerkingError('Review is too large to save', 400);
  const enc = {
    ...existing!, ...prose, type, status: encounterStatusFor(prev!.status), updatedAt: new Date(ts), procedureReview: review,
  } as ReviewedEncounter;
  await write(enc);
  return enc;
}

/** Submit for review, or sign (when the role may sign) — the clerking's rules. */
export async function submitReview(id: string, version: number | undefined, user: User, sign = false): Promise<ReviewedEncounter> {
  const actor = actorOf(user);
  const existing = await db.clinicalEncounters.get(id);
  const prev = existing?.procedureReview;
  const status = assertCanSubmitRecord(prev, version, actor, sign);
  const ts = nowIso();
  const signed = status === 'signed';
  const enc = {
    ...existing!,
    status: encounterStatusFor(status),
    completedAt: signed ? new Date(ts) : existing!.completedAt,
    updatedAt: new Date(ts),
    procedureReview: {
      ...prev!, status, version: prev!.version + 1, submittedAt: prev!.submittedAt || ts,
      signedBy: signed ? actor.id : undefined, signedByName: signed ? actor.name : undefined, signedAt: signed ? ts : undefined,
    },
  } as ReviewedEncounter;
  await write(enc);
  void logAuditEvent(user.id, signed ? 'sign' : 'submit', 'clinical_encounters', id, { newValue: { status, version: enc.procedureReview.version } });
  return enc;
}

/** Mark a review entered in error, with the reason. */
export async function markReviewInError(id: string, user: User, reason: string): Promise<ReviewedEncounter> {
  const existing = await db.clinicalEncounters.get(id);
  const prev = existing?.procedureReview;
  assertCanMarkErrorRecord(prev, actorOf(user), reason);
  const ts = nowIso();
  const enc = {
    ...existing!, status: encounterStatusFor('entered_in_error'), updatedAt: new Date(ts),
    procedureReview: { ...prev!, status: 'entered_in_error', errorReason: String(reason).trim().slice(0, 500), version: prev!.version + 1 },
  } as ReviewedEncounter;
  await write(enc);
  void logAuditEvent(user.id, 'entered_in_error', 'clinical_encounters', id, { newValue: { reason: String(reason).slice(0, 200) } });
  return enc;
}

/**
 * Send the review's plan to the consultant through the scribe's approval
 * queue. The submitted plan is the edited one; the scribe plan id is kept on
 * the review so the two can be followed either way.
 */
export async function submitReviewPlan(id: string, user: User): Promise<ReviewedEncounter> {
  const existing = await db.clinicalEncounters.get(id);
  const review = existing?.procedureReview;
  if (!existing || !review) throw new ClerkingError('Encounter not found', 404);
  if (review.status === 'entered_in_error') throw new ClerkingError('This encounter was marked entered in error', 409);
  const row = await submitPlan(existing.patientId, review.plan, [], user, existing.hospitalId);
  const enc = {
    ...existing, updatedAt: new Date(),
    procedureReview: { ...review, scribePlanId: row.id, scribePlanVersion: row.version, version: review.version + 1 },
  } as ReviewedEncounter;
  await write(enc);
  return enc;
}
