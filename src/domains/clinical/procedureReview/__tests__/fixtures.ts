/** Shared test fixtures for procedure reviews. */
import type { EncounterAnswers, EncounterField } from '../../data/encounterModel';
import { isVisible } from '../../services/templateEngine';
import type { PriorReview, ProcedureModule, ReviewPatient, ReviewPhase } from '../types';
import { composeTemplate, readReview } from '../engine';
import { buildReviewPlan } from '../planBuilder';
import type { PlanContext } from '../types';

export const adult = (over: Partial<ReviewPatient> = {}): ReviewPatient => ({
  ageYears: 58, sex: 'male', comorbidities: [], medications: [], allergies: [], bmi: null, ...over,
});

/** The plan context for a module, phase and answers, read through the real engine. */
export function contextFor(module: ProcedureModule, phase: ReviewPhase, answers: EncounterAnswers, patient = adult(), prior: PriorReview[] = []): PlanContext {
  const r = readReview({ module, phase, answers, patient, prior });
  return { module, phase, answers, scores: r.scoreMap, flags: r.flags, patient: { ...patient, bmi: r.scoreMap.bmi?.total ?? patient.bmi }, prior };
}

export const planFor = (module: ProcedureModule, phase: ReviewPhase, answers: EncounterAnswers, patient = adult(), prior: PriorReview[] = []) =>
  buildReviewPlan(contextFor(module, phase, answers, patient, prior));

/** A value for a field that exercises its flags. */
function provocative(f: EncounterField): EncounterAnswers[string] {
  switch (f.kind) {
    case 'select': return (f.options?.find(o => o.flag) ?? f.options?.[f.options.length - 1])?.value ?? null;
    case 'multiselect': return (f.options ?? []).filter(o => o.value !== 'none').map(o => o.value);
    case 'boolean': return true;
    case 'number': {
      const t = f.numericFlags?.[0];
      if (t) return t.op === '<' || t.op === '<=' ? t.value - (t.value > 1 ? 1 : 0.1) : t.value + 1;
      return f.min != null && f.min > 0 ? f.min : 1;
    }
    case 'scale': return 7;
    case 'date': return '2026-11-01';
    default: return 'test entry';
  }
}

/**
 * Answers that exercise as many rules as possible: every visible field given
 * its most concerning answer, repeated until conditional fields settle.
 */
export function provocativeAnswers(module: ProcedureModule, phase: ReviewPhase): EncounterAnswers {
  const t = composeTemplate(module, phase);
  let answers: EncounterAnswers = {};
  for (let pass = 0; pass < 4; pass++) {
    const next: EncounterAnswers = { ...answers };
    for (const f of t.sections.flatMap(s => s.fields)) {
      if (next[f.id] !== undefined || !isVisible(f, next)) continue;
      next[f.id] = provocative(f);
    }
    answers = next;
  }
  return answers;
}
