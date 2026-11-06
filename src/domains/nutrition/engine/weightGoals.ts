/**
 * Weight-change goals: energy target, safety floors, preserved protein and a
 * projected trajectory.
 *
 * Rules (all thresholds in config):
 *  - Loss: 500–1000 kcal/day deficit; gain: 300–500 kcal/day surplus.
 *  - Floors 1200 kcal (women) / 1500 kcal (men) for weight loss, unless a
 *    clinicianOverride { by, reason } is recorded.
 *  - Protein is preserved: the protein target is not reduced with energy.
 *  - No weight-loss plan while catabolic (burns, sepsis, major wound) without
 *    an override.
 *  - Projection uses 7700 kcal/kg, a static model that over-predicts long-term loss.
 */

import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, positive, finite, r0, r2, r1, type Estimate } from './estimate';
import { catabolicStates, isValidOverride, type ClinicalContext, type ClinicianOverride, type Sex } from './types';

const C = ACTIVE_NUTRITION_CONFIG;

export interface WeightGoalInput {
  direction: 'loss' | 'gain';
  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  /** Maintenance energy chosen by the clinician from estimateEnergy(), kcal/day. */
  maintenanceKcal?: number | null;
  sex?: Sex | null;
  /** Deficit (loss) or surplus (gain) magnitude, kcal/day. Defaults to the low end of the config band, stated. */
  dailyChangeKcal?: number | null;
  /** Protein target from estimateProtein(), g/day. Preserved, not scaled with energy. */
  proteinGPerDay?: number | null;
  context?: ClinicalContext;
  clinicianOverride?: ClinicianOverride | null;
}

export interface WeightGoalPlan {
  targetKcal: number;
  /** Actual daily change after any floor: negative = deficit. */
  dailyDeltaKcal: number;
  floorApplied: boolean;
  floorKcal: number | null;
  overrideUsed: ClinicianOverride | null;
  proteinGPerDay: number | null;
  projectedKgPerWeek: number;
  weeksToTarget: number | null;
  trajectory: Array<{ week: number; projectedWeightKg: number }>;
}

export function planWeightGoal(input: WeightGoalInput, config: NutritionConfig = C): Estimate<WeightGoalPlan> {
  const g = config.weightGoals;
  const loss = input.direction === 'loss';
  const band = loss ? g.lossDeficitKcal.value : g.gainSurplusKcal.value;
  const w = positive(input.currentWeightKg); const target = positive(input.targetWeightKg);
  const maint = positive(input.maintenanceKcal); const protein = positive(input.proteinGPerDay);
  const sex = input.sex === 'male' || input.sex === 'female' ? input.sex : null;
  const override = isValidOverride(input.clinicianOverride) ? input.clinicianOverride : null;
  const assumptions: string[] = []; const warnings: string[] = [];

  let change = finite(input.dailyChangeKcal);
  if (change === null) {
    change = band.low;
    assumptions.push(`No ${loss ? 'deficit' : 'surplus'} specified: ${band.low} kcal/day (low end of ${band.low}–${band.high}) used.`);
  }
  change = Math.abs(change);
  if (change < band.low || change > band.high) {
    warnings.push(`${loss ? 'Deficit' : 'Surplus'} of ${change} kcal/day is outside the ${band.low}–${band.high} kcal/day range.`);
  }

  const base = { unit: 'kcal/day', method: `Weight ${input.direction} plan`,
    formula: `maintenance ${loss ? '−' : '+'} ${loss ? 'deficit' : 'surplus'}; projection: kg/week = daily Δ × 7 ÷ ${g.kcalPerKg.value}`,
    sourceIds: [g.kcalPerKg.sourceId, loss ? g.lossDeficitKcal.sourceId : g.gainSurplusKcal.sourceId, ...(loss ? [g.floorsKcal.sourceId] : [])],
    inputsUsed: { currentWeightKg: w, targetWeightKg: target, maintenanceKcal: maint, dailyChangeKcal: change, sex,
      proteinGPerDay: protein, override: override ? `${override.by}: ${override.reason}` : null } };

  // Catabolic block
  const catabolic = catabolicStates(input.context);
  if (loss && catabolic.length) {
    if (!override) {
      return notComputable(config, ['clinicianOverride { by, reason }'], { ...base, status: 'not_applicable',
        warnings: [`No weight-loss plan while catabolic (${catabolic.join(', ')}) without a clinician override.`] });
    }
    warnings.push(`Weight-loss plan during a catabolic state (${catabolic.join(', ')}) — overridden by ${override.by}: ${override.reason}.`);
  }

  const missing = [...(w === null ? ['currentWeightKg'] : []), ...(maint === null ? ['maintenanceKcal'] : []), ...(loss && sex === null ? ['sex (for the safety floor)'] : [])];
  if (missing.length) return notComputable(config, missing, { ...base, warnings });

  let targetKcal = loss ? maint! - change : maint! + change;
  let floorApplied = false; let floorKcal: number | null = null;
  if (loss) {
    floorKcal = g.floorsKcal.value[sex!];
    if (targetKcal < floorKcal) {
      if (override) warnings.push(`Target ${r0(targetKcal)} kcal is below the ${floorKcal} kcal floor — overridden by ${override.by}: ${override.reason}.`);
      else {
        warnings.push(`Target ${r0(targetKcal)} kcal raised to the ${floorKcal} kcal floor (${sex}).`);
        targetKcal = floorKcal; floorApplied = true;
      }
    }
  }
  targetKcal = r0(targetKcal);
  const delta = targetKcal - maint!;
  const kgPerWeek = r2((delta * 7) / g.kcalPerKg.value);

  if (loss && delta >= 0) warnings.push('After the floor there is no deficit: no weight loss is projected at this maintenance estimate.');
  const rateBand = band.kgPerWeek;
  if (Math.abs(kgPerWeek) > rateBand.high) warnings.push(`Projected ${Math.abs(kgPerWeek)} kg/week exceeds ${rateBand.high} kg/week.`);

  // Protein preserved
  if (protein === null) {
    warnings.push('Protein target not supplied: set it from estimateProtein() and do NOT reduce it with energy.');
  } else {
    assumptions.push(`Protein held at ${protein} g/day (not reduced with energy).`);
    if (protein * 4 > targetKcal * 0.35) warnings.push(`Protein (${protein} g = ${protein * 4} kcal) exceeds 35% of the energy target — review.`);
  }
  if (input.context?.diabetes && loss) {
    warnings.push('Diabetes: reducing intake raises hypoglycaemia risk on insulin or sulfonylureas — review glucose-lowering medication.');
  }

  // Trajectory
  let weeksToTarget: number | null = null;
  const trajectory: WeightGoalPlan['trajectory'] = [];
  if (target !== null) {
    const towards = loss ? target < w! : target > w!;
    if (!towards) warnings.push(`Target weight ${target} kg is not ${loss ? 'below' : 'above'} current weight ${w} kg.`);
    else if ((loss && kgPerWeek < 0) || (!loss && kgPerWeek > 0)) {
      weeksToTarget = Math.ceil(Math.abs(target - w!) / Math.abs(kgPerWeek));
      const n = Math.min(weeksToTarget, g.maxProjectionWeeks);
      for (let wk = 0; wk <= n; wk++) {
        const projected = w! + kgPerWeek * wk;
        trajectory.push({ week: wk, projectedWeightKg: r1(loss ? Math.max(projected, target) : Math.min(projected, target)) });
      }
      if (weeksToTarget > g.maxProjectionWeeks) warnings.push(`Projection truncated at ${g.maxProjectionWeeks} weeks.`);
    }
  } else assumptions.push('No target weight: weekly rate only, no trajectory.');
  assumptions.push(`Projection uses ${g.kcalPerKg.value} kcal/kg (static model; over-predicts long-term change). Re-plan from measured weights.`);

  return computed<WeightGoalPlan>(config, {
    targetKcal, dailyDeltaKcal: delta, floorApplied, floorKcal, overrideUsed: override, proteinGPerDay: protein,
    projectedKgPerWeek: kgPerWeek, weeksToTarget, trajectory,
  }, { ...base, assumptions, warnings });
}
