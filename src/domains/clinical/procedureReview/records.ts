/**
 * A review as an encounter: its prose, its predecessors and what it carries
 * forward. Pure — the service (procedureReviewService) does the writing.
 *
 * Like the structured clerking, the review writes its narrative into the
 * encounter's ordinary free-text fields, so the clinical summary, the
 * encounter PDF, the discharge summary and the assistant read it as they read
 * any typed encounter; the structured block rides beside it.
 */
import type { ClinicalEncounter } from '../../../types';
import type { EncounterAnswers } from '../data/encounterModel';
import type { ScribePlan } from '../scribe/scribePlan';
import type { PlanEdits, PriorReview, ProcedureModule, ReviewPhase, StoredProcedureReview } from './types';
import type { ReviewReading } from './engine';
import { phaseDefinition } from './phases';
import { filterPlan } from '../scribe/approval';

/**
 * The plan after the clinician's edits: unticked routine lines removed,
 * additions appended. An unticked URGENT line is kept, marked declined with
 * its reason — or kept unchanged when no reason was given (filterPlan).
 */
export function applyPlanEdits(plan: ScribePlan, edits: PlanEdits | undefined, addedBy = 'clinician'): ScribePlan {
  if (!edits) return plan;
  const filtered = filterPlan(plan, new Set(edits.excluded), '', edits.reasons ?? {}, addedBy);
  const added = edits.additions.map(s => s.trim()).filter(Boolean);
  return added.length
    ? { ...filtered, general: [...filtered.general, { heading: 'Added at review', items: added.map(text => ({ text, why: `Added by ${addedBy} at the review` })) }] }
    : filtered;
}

/** One plan line as text; a declined urgent line keeps its text, struck through, with the reason. */
const lineAsText = (l: ScribePlan['general'][number]['items'][number]) => l.declined
  ? `• [DECLINED — ${l.declined.reason}${l.declined.by ? `, ${l.declined.by}` : ''}] ${l.text.split('').map(ch => `${ch}̶`).join('')}`
  : `• ${l.priority === 'urgent' ? '[URGENT] ' : ''}${l.text}`;

/** The plan as plain lines, for the encounter's treatment-plan field. */
export function planAsText(plan: ScribePlan): string {
  const out: string[] = [];
  for (const p of plan.problems) {
    out.push(`${p.problem}:`);
    for (const k of ['goals', 'investigations', 'treatment', 'monitoring', 'referrals'] as const) {
      for (const l of p[k]) out.push(lineAsText(l));
    }
  }
  for (const c of plan.comorbidities) { out.push(`${c.condition}:`); for (const l of c.actions) out.push(lineAsText(l)); }
  for (const g of plan.general) { out.push(`${g.heading}:`); for (const l of g.items) out.push(lineAsText(l)); }
  if (plan.cautions.length) out.push(`Cautions: ${plan.cautions.join(' ')}`);
  if (plan.followUp.length) out.push(`Follow-up: ${plan.followUp.join('; ')}`);
  if (plan.dischargeCriteria.length) out.push(`Discharge criteria: ${plan.dischargeCriteria.join('; ')}`);
  return out.join('\n');
}

/**
 * The encounter's ordinary fields, written from the review. Sections go where
 * a reader expects them: the reason for the review into the history, the
 * comorbidity section into past medical history, the social section into
 * social history, examination-type sections into the examination.
 */
export function proseFromReview(module: ProcedureModule, phase: ReviewPhase, reading: ReviewReading, plan: ScribePlan): Partial<ClinicalEncounter> {
  const n = reading.narrative;
  const by = (pred: (s: ReviewReading['narrative']['sections'][number]) => boolean) =>
    n.sections.filter(pred).map(s => `${s.title}: ${s.text}`).join('\n\n') || undefined;
  const examIds = new Set(['wound_assessment', 'wound_infection', 'post_op_status', 'anaesthetic', 'pressure']);
  return {
    chiefComplaint: `${module.name} — ${phaseDefinition(phase).label}`,
    historyOfPresentIllness: [
      by(s => s.coreId === 'follow_up_interval' || s.coreId === 'pain'),
      by(s => s.origin === 'module'),
      n.comparison && `Since the last review: ${n.comparison}.`,
    ].filter(Boolean).join('\n\n') || undefined,
    pastMedicalHistory: by(s => s.coreId === 'patient_factors'),
    socialHistory: by(s => s.coreId === 'social' || s.coreId === 'psychology'),
    physicalExamination: { additionalFindings: by(s => !!s.coreId && examIds.has(s.coreId)) },
    treatmentPlan: planAsText(plan) || undefined,
    notes: [
      n.scores && `Scores: ${n.scores}.`,
      n.barriers && `Barriers to healing: ${n.barriers}.`,
      by(s => s.coreId === 'nutrition' || s.coreId === 'healing_barriers' || s.coreId === 'vte' || s.coreId === 'wound_dressing'),
      n.flags && `Flags:\n${n.flags}`,
    ].filter(Boolean).join('\n\n') || undefined,
  };
}

/** Earlier reviews of the patient (newest first), as rules and the engine read them. */
export function priorReviewsFrom(encounters: Pick<ClinicalEncounter, 'id' | 'createdAt' | 'procedureReview'>[], excludeId?: string): PriorReview[] {
  return encounters
    .filter(e => e.procedureReview && e.id !== excludeId && e.procedureReview.status !== 'entered_in_error')
    .map(e => ({
      encounterId: e.id,
      at: new Date(e.createdAt).toISOString(),
      moduleId: e.procedureReview!.moduleId,
      phase: e.procedureReview!.phase,
      answers: e.procedureReview!.answers,
      scores: e.procedureReview!.scores,
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Answers to start a new review with: the module's carry-forward fields from its newest earlier review. */
export function carriedForward(module: ProcedureModule, prior: PriorReview[]): EncounterAnswers {
  const last = prior.find(p => p.moduleId === module.id);
  if (!last || !module.carryForward?.length) return {};
  const out: EncounterAnswers = {};
  for (const id of module.carryForward) if (last.answers[id] != null) out[id] = last.answers[id];
  return out;
}

/** A cap on what is stored, as the clerking enforces (lifecycle.cleanPayload). */
export const MAX_REVIEW_BYTES = 512 * 1024;
export const reviewTooLarge = (r: StoredProcedureReview) => JSON.stringify(r).length > MAX_REVIEW_BYTES;
