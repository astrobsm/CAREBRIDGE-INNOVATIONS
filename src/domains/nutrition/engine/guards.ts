/**
 * Population guards. The engine is for adults (18+) on oral or enteral
 * nutrition. Children, pregnancy and lactation, dialysis-dependent renal
 * failure and parenteral nutrition need specialist input; the engine refers
 * rather than producing numbers it was not designed for.
 */

import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import type { NutritionPatient } from './types';

export const REFER_MESSAGE = 'Specialist dietitian/physician input required';

export type ReferReason = 'child' | 'pregnancy' | 'lactation' | 'dialysis' | 'parenteral_nutrition';

const REASON_TEXT: Record<ReferReason, string> = {
  child: 'Patient is under 18',
  pregnancy: 'Pregnancy',
  lactation: 'Lactation',
  dialysis: 'Dialysis-dependent renal failure',
  parenteral_nutrition: 'Parenteral nutrition',
};

export type PopulationCheck =
  | { status: 'eligible'; warnings: string[] }
  | { status: 'refer'; reason: string; reasons: ReferReason[]; message: string }
  | { status: 'insufficient'; missing: string[]; warnings: string[] };

export function checkPopulation(
  p: NutritionPatient,
  config: NutritionConfig = ACTIVE_NUTRITION_CONFIG,
): PopulationCheck {
  const reasons: ReferReason[] = [];
  const age = typeof p.ageYears === 'number' && Number.isFinite(p.ageYears) ? p.ageYears : null;

  if (age !== null && age < config.population.adultMinAgeYears) reasons.push('child');
  if (p.pregnant) reasons.push('pregnancy');
  if (p.lactating) reasons.push('lactation');
  if (p.dialysis) reasons.push('dialysis');
  if (p.parenteralNutrition) reasons.push('parenteral_nutrition');

  if (reasons.length) {
    return {
      status: 'refer',
      reasons,
      reason: `${reasons.map(r => REASON_TEXT[r]).join('; ')}. ${REFER_MESSAGE}`,
      message: REFER_MESSAGE,
    };
  }

  // Unrecorded status is not "no": say so rather than assume.
  const warnings: string[] = [];
  if (p.sex === 'female' && age !== null && age < 55) {
    if (p.pregnant == null) warnings.push('Pregnancy status not recorded — confirm before using these estimates.');
    if (p.lactating == null) warnings.push('Lactation status not recorded — confirm before using these estimates.');
  }
  if (p.dialysis == null) warnings.push('Dialysis status not recorded — estimates assume the patient is not on dialysis.');
  if (p.parenteralNutrition == null) warnings.push('Parenteral nutrition status not recorded — estimates assume oral/enteral feeding.');

  const missing: string[] = [];
  if (age === null) missing.push('ageYears');
  if (p.sex !== 'male' && p.sex !== 'female') missing.push('sex');
  if (missing.length) return { status: 'insufficient', missing, warnings };

  return { status: 'eligible', warnings };
}
