/**
 * Maintenance fluid estimate and condition-based micronutrient priorities.
 *
 * Fluid: 30–35 mL/kg/day. Burns, fever and abnormal losses change needs in
 * ways a weight-based figure cannot capture, so they are flagged for clinician
 * review rather than added to the number.
 *
 * Micronutrients: priorities with a rationale. Never doses — prescribing
 * follows local protocol.
 */

import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, positive, r0, type Estimate, type Range } from './estimate';
import type { ClinicalContext, NutritionPatient } from './types';

const C = ACTIVE_NUTRITION_CONFIG;

export function estimateFluid(patient: NutritionPatient, ctx: ClinicalContext = {}, config: NutritionConfig = C): Estimate<Range> {
  const cfg = config.fluid.value;
  const w = positive(patient.weightKg);
  const base = { unit: 'mL/day', method: 'Maintenance fluid (weight-based)', formula: `${cfg.mlPerKg.low}–${cfg.mlPerKg.high} mL/kg/day`,
    sourceIds: [config.fluid.sourceId], inputsUsed: { weightKg: w } };
  const warnings: string[] = [];
  if (ctx.burns && (ctx.burns.tbsaPercent ?? 0) > 0) warnings.push('Burns: resuscitation and evaporative losses are not included — clinician review (see burns fluid calculator).');
  const t = positive(ctx.temperatureC ?? ctx.tmaxC);
  if (t !== null && t > cfg.feverFlagAboveC) warnings.push(`Fever (${t} °C): insensible losses increased — clinician review.`);
  if (ctx.abnormalFluidLosses) warnings.push('Abnormal losses (drains, fistula, diarrhoea, vomiting): replace measured losses separately — clinician review.');
  if (ctx.ckdNonDialysis) warnings.push('CKD: fluid allowance may need restriction — clinician review.');
  if (w === null) return notComputable(config, ['weightKg'], { ...base, warnings });
  return computed(config, { low: r0(cfg.mlPerKg.low * w), high: r0(cfg.mlPerKg.high * w) }, { ...base, warnings,
    assumptions: ['Total fluid from all sources (feed, drinks, IV, flushes).'] });
}

export type MicronutrientCondition = 'wound_healing' | 'burns' | 'refeeding_risk' | 'alcohol_excess' | string;

export interface MicronutrientPriority {
  condition: string;
  nutrient: string;
  rationale: string;
}

export function micronutrientPriorities(conditions: MicronutrientCondition[], config: NutritionConfig = C): Estimate<MicronutrientPriority[]> {
  const table = config.micronutrients.value;
  const out: MicronutrientPriority[] = [];
  const unknown: string[] = [];
  for (const c of [...new Set(conditions)]) {
    const rows = table[c];
    if (!rows) { unknown.push(c); continue; }
    for (const r of rows) out.push({ condition: c, ...r });
  }
  return computed(config, out, {
    unit: 'recommendation', method: 'Condition-based micronutrient priorities', formula: 'lookup by condition',
    sourceIds: [config.micronutrients.sourceId], inputsUsed: { conditions: conditions.join(', ') },
    assumptions: ['Recommendations for review, NOT prescriptions. Doses per local protocol.'],
    warnings: unknown.length ? [`No micronutrient priorities configured for: ${unknown.join(', ')}.`] : [],
  });
}
