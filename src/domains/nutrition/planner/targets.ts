/**
 * Plan targets from the stage 1 engine: energy, protein, fluid, the weight
 * goal and the refeeding schedule. Nothing is recalculated here; every number
 * is an engine output, and each choice made between engine options is written
 * into `derivation`.
 *
 * Choices (all overridable):
 *   - energy: the clinician's kcal, else the engine estimate the clinician
 *     names, else the engine's preferred estimate (calorimetry, Toronto, Penn
 *     State), else Curreri in burns, else Harris–Benedict × activity × stress.
 *     A range is planned at its midpoint.
 *   - protein: the low end of a range is the minimum; the HIGH end is used for
 *     weight loss and catabolic states ("protein first"); CKD not on dialysis
 *     keeps the high end as a ceiling.
 *   - fluid: the engine range.
 *   - weight goal: planWeightGoal() from the chosen maintenance energy.
 *   - refeeding: assessRefeedingRisk(); at high or extreme risk the stepped
 *     schedule sets each day's energy and (config) protein follows energy.
 */

import { checkPopulation } from '../engine/guards';
import { estimateEnergy, harrisBenedict, type EnergyEstimate } from '../engine/energy';
import { estimateProtein, type ProteinEstimate } from '../engine/protein';
import { estimateFluid } from '../engine/fluidMicronutrients';
import { planWeightGoal } from '../engine/weightGoals';
import { assessRefeedingRisk, refeedingSchedule, type RefeedingRiskInput } from '../engine/refeeding';
import { catabolicStates, isValidOverride, type ClinicalContext, type ClinicianOverride, type NutritionPatient } from '../engine/types';
import type { Range } from '../engine/estimate';
import { ACTIVE_PLANNER_CONFIG, type PlannerConfig } from './config';
import type { Bounds, PlanGoalInput, PlanTargets } from './types';

export interface TargetsInput {
  patient: NutritionPatient;
  context?: ClinicalContext;
  goal?: { direction: 'maintain' | 'loss' | 'gain'; targetWeightKg?: number | null; dailyChangeKcal?: number | null; clinicianOverride?: ClinicianOverride | null };
  energy?: { kcal?: number | null; method?: EnergyEstimate['id']; harrisBenedictFactors?: { activity?: string; stress?: string } };
  /** Protein, g/day, chosen by the clinician (overrides the engine's range). */
  proteinG?: number | null;
  refeeding?: (RefeedingRiskInput & { advanceDays?: number }) | null;
}

export type TargetsResult =
  | { status: 'ok'; targets: PlanTargets; goal: PlanGoalInput; warnings: string[]; energy: EnergyEstimate | null; protein: ProteinEstimate | null }
  | { status: 'refer'; reason: string }
  | { status: 'not_computable'; missing: string[]; warnings: string[] }
  | { status: 'blocked'; reason: string };

const mid = (v: number | Range) => (typeof v === 'number' ? v : Math.round((v.low + v.high) / 2));

export function buildPlanTargets(input: TargetsInput, config: PlannerConfig = ACTIVE_PLANNER_CONFIG): TargetsResult {
  const pop = checkPopulation(input.patient);
  if (pop.status === 'refer') return { status: 'refer', reason: pop.reason };
  const ctx = input.context ?? {};
  const derivation: string[] = [];
  const warnings: string[] = pop.status === 'eligible' ? [...pop.warnings] : [...pop.warnings];

  // Energy
  let maintenance: number | null = null;
  let energyEst: EnergyEstimate | null = null;
  if (input.energy?.kcal && input.energy.kcal > 0) {
    maintenance = Math.round(input.energy.kcal);
    derivation.push(`Energy ${maintenance} kcal/day: set by the clinician.`);
  } else {
    const all = estimateEnergy({ patient: input.patient, context: ctx, harrisBenedictFactors: input.energy?.harrisBenedictFactors });
    const ok = all.filter(e => e.status === 'computed' && e.value !== null);
    const named = input.energy?.method ? ok.find(e => e.id === input.energy!.method) : undefined;
    const burns = ctx.burns && (ctx.burns.tbsaPercent ?? 0) > 0;
    let chosen = named ?? ok.find(e => e.preferred) ?? (burns ? ok.find(e => e.id === 'curreri') : undefined);
    if (!chosen) {
      const hb = harrisBenedict(input.patient, input.energy?.harrisBenedictFactors ?? { activity: 'out_of_bed', stress: 'none' });
      if (hb.status === 'computed' && hb.value !== null) chosen = hb;
    }
    if (!chosen) return { status: 'not_computable', missing: [...new Set(all.flatMap(e => e.missing))], warnings };
    energyEst = chosen;
    maintenance = mid(chosen.value!);
    derivation.push(`Energy ${maintenance} kcal/day: ${chosen.method} (${chosen.formula})${typeof chosen.value === 'number' ? '' : `, midpoint of ${(chosen.value as Range).low}–${(chosen.value as Range).high}`}; engine config ${chosen.configVersion}.`);
    warnings.push(...chosen.warnings);
  }

  // Protein
  const catabolic = catabolicStates(ctx);
  const direction = input.goal?.direction ?? 'maintain';
  let protein: Bounds;
  let proteinEst: ProteinEstimate | null = null;
  if (input.proteinG && input.proteinG > 0) {
    protein = { min: Math.round(input.proteinG) };
    derivation.push(`Protein ≥ ${protein.min} g/day: set by the clinician.`);
  } else {
    const ests = estimateProtein({ patient: input.patient, context: ctx });
    const p = ests.find(e => e.status === 'computed' && e.value !== null);
    if (!p) return { status: 'not_computable', missing: [...new Set(ests.flatMap(e => e.missing))], warnings };
    proteinEst = p;
    const v = p.value!;
    if (typeof v === 'number') {
      protein = { min: v };
      derivation.push(`Protein ≥ ${v} g/day: ${p.method} (${p.formula}).`);
    } else if (p.id === 'ckd_non_dialysis') {
      protein = { min: v.low, max: v.high };
      derivation.push(`Protein ${v.low}–${v.high} g/day: ${p.method}; the upper end is kept as a ceiling.`);
    } else if (direction === 'loss' || catabolic.length) {
      protein = { min: v.high };
      derivation.push(`Protein ≥ ${v.high} g/day: high end of ${v.low}–${v.high} (${p.method}) — ${direction === 'loss' ? 'high protein for weight loss' : 'catabolic: protein first'}.`);
    } else {
      protein = { min: v.low };
      derivation.push(`Protein ≥ ${v.low} g/day: low end of ${v.low}–${v.high} (${p.method}).`);
    }
    warnings.push(...p.warnings);
  }

  // Fluid
  const fluid = estimateFluid(input.patient, ctx);
  if (fluid.value) derivation.push(`Fluid ${fluid.value.low}–${fluid.value.high} mL/day (${fluid.formula}).`);
  warnings.push(...fluid.warnings);

  // Weight goal
  let energyKcal = maintenance!;
  const goal: PlanGoalInput = { direction, clinicianOverride: input.goal?.clinicianOverride ?? null };
  if (direction !== 'maintain') {
    const wg = planWeightGoal({
      direction, currentWeightKg: input.patient.weightKg, targetWeightKg: input.goal?.targetWeightKg, maintenanceKcal: maintenance,
      sex: input.patient.sex, dailyChangeKcal: input.goal?.dailyChangeKcal, proteinGPerDay: protein.min, context: ctx,
      clinicianOverride: input.goal?.clinicianOverride,
    });
    if (wg.status === 'not_applicable') return { status: 'blocked', reason: wg.warnings.join(' ') || 'Weight-change plan not applicable.' };
    if (!wg.value) return { status: 'not_computable', missing: wg.missing, warnings: [...warnings, ...wg.warnings] };
    energyKcal = wg.value.targetKcal;
    goal.weightGoal = wg.value;
    derivation.push(`Weight ${direction}: ${energyKcal} kcal/day (${wg.formula}).`, ...wg.assumptions);
    warnings.push(...wg.warnings);
  } else if (catabolic.length) {
    derivation.push(`Catabolic (${catabolic.join(', ')}): maintenance energy, no deficit.`);
  }
  if (direction === 'loss' && catabolic.length && !isValidOverride(input.goal?.clinicianOverride)) {
    return { status: 'blocked', reason: `No weight-loss plan while catabolic (${catabolic.join(', ')}) without a clinician override.` };
  }

  const targets: PlanTargets = { energyKcal, protein, fluidMl: fluid.value ?? null, derivation };

  // Refeeding
  if (input.refeeding) {
    const risk = assessRefeedingRisk(input.refeeding);
    warnings.push(...risk.warnings);
    const level = risk.value?.level;
    if (level === 'indeterminate') warnings.push('Refeeding risk indeterminate (labs missing): treated as not stepped here — assess before feeding.');
    if (level === 'high' || level === 'extreme') {
      const sch = refeedingSchedule({ weightKg: input.patient.weightKg, targetKcal: energyKcal, level, advanceDays: input.refeeding.advanceDays });
      if (!sch.value) return { status: 'not_computable', missing: sch.missing, warnings };
      goal.refeeding = { level, schedule: sch.value };
      targets.energyByDay = sch.value.map(d => d.kcal);
      derivation.push(`Refeeding ${level} risk: ${sch.formula}; day N energy = schedule day N (${sch.value.map(d => d.kcal).join(', ')} kcal).`);
      if (config.refeedingProteinFollowsEnergy.value) {
        targets.proteinByDay = sch.value.map(d => ({
          min: Math.round(protein.min * Math.min(1, d.kcal / energyKcal)),
          ...(protein.max ? { max: protein.max } : {}),
        }));
        derivation.push(`Refeeding: protein advanced with energy (${targets.proteinByDay.map(b => b.min).join(', ')} g) — ${config.refeedingProteinFollowsEnergy.note}`);
      }
      warnings.push(...sch.warnings, ...sch.alerts);
    }
  }
  return { status: 'ok', targets, goal, warnings: [...new Set(warnings)], energy: energyEst, protein: proteinEst };
}
