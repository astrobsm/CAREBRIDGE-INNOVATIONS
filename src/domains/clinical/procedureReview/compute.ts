/**
 * The whole review from its answers, in one pure pipeline:
 * read (engine) → plan (planBuilder) → edits → consent → counselling.
 *
 * The form calls it on every change to show the live result; the service calls
 * it again on save, so what is stored is always what the answers produce and
 * a stored plan can never drift from its assessment.
 */
import type { EncounterAnswers } from '../data/encounterModel';
import type { PDFPatientInfo } from '../../../utils/pdfUtils';
import type {
  ConsentDraft, CounsellingRecord, PlanContext, PlanEdits, PriorReview, ProcedureModule, ReviewPatient,
  ReviewPhase, ReviewPlanOutput, StoredProcedureReview,
} from './types';
import { readReview, TEMPLATE_VERSION, type ReviewReading } from './engine';
import { buildReviewPlan } from './planBuilder';
import { buildConsentDraft, finaliseCounselling } from './consent';
import { applyPlanEdits } from './records';
import type { ScribePlan } from '../scribe/scribePlan';

export interface ComputeInput {
  module: ProcedureModule;
  phase: ReviewPhase;
  answers: EncounterAnswers;
  otherText?: Record<string, string>;
  patient: ReviewPatient;
  prior: PriorReview[];
  planEdits?: PlanEdits;
  counselling: CounsellingRecord;
  pdfPatient: PDFPatientInfo;
  clinician: { id: string; name?: string; role?: string };
  hospitalName?: string;
  now: string;
}

export interface ComputedReview {
  reading: ReviewReading;
  context: PlanContext;
  /** The plan as generated, before edits (the keys PlanEdits refer to). */
  generated: ReviewPlanOutput;
  /** The plan after edits. */
  plan: ScribePlan;
  consent: ConsentDraft | null;
  counselling: CounsellingRecord;
}

export function computeReview(i: ComputeInput): ComputedReview {
  const reading = readReview({ module: i.module, phase: i.phase, answers: i.answers, otherText: i.otherText, patient: i.patient, prior: i.prior });
  const context: PlanContext = {
    // The plan reads this review's answers plus the comorbidity facts carried
    // from an earlier review when this phase does not ask them.
    module: i.module, phase: i.phase, answers: reading.planAnswers, scores: reading.scoreMap, flags: reading.flags,
    patient: { ...i.patient, bmi: reading.scoreMap.bmi?.total ?? i.patient.bmi }, prior: i.prior, carried: reading.carried,
  };
  const generated = buildReviewPlan(context);
  const plan = applyPlanEdits(generated.plan, i.planEdits, i.clinician.name);
  const consent = buildConsentDraft(context, generated.counselling, { patient: i.pdfPatient, surgeonName: i.clinician.name, hospitalName: i.hospitalName });
  const counselling = finaliseCounselling(i.counselling, i.answers, i.clinician, i.now);
  return { reading, context, generated, plan, consent, counselling };
}

/** The stored block for a computed review (lifecycle fields supplied by the service). */
export function toStored(
  i: ComputeInput, c: ComputedReview,
  lifecycle: Pick<StoredProcedureReview, 'status' | 'version' | 'createdBy' | 'createdByName' | 'createdByRole'> & Partial<StoredProcedureReview>,
): StoredProcedureReview {
  return {
    ...lifecycle,
    moduleId: i.module.id,
    phase: i.phase,
    templateVersion: TEMPLATE_VERSION,
    answers: i.answers,
    otherText: i.otherText,
    scores: c.reading.scores,
    flags: c.reading.flags,
    plan: c.plan,
    planEdits: i.planEdits,
    counsellingPoints: c.generated.counselling,
    counselling: c.counselling,
    consent: c.consent,
    followUp: c.generated.followUp,
    narrative: c.reading.narrative.text,
  };
}
