/**
 * Refeeding syndrome risk (NICE CG32) and a stepped energy schedule.
 *
 * A pre-feeding electrolyte that has not been measured is not normal: low K,
 * PO4 or Mg is itself a high-risk criterion, so without them high risk cannot
 * be excluded and the result is 'indeterminate'.
 */

import { ANALYTE_BY_KEY } from '../../clinician-assistant/services/engine/referenceRanges';
import { toCanonical, UNIT_RULES, normaliseUnitToken } from '../../clinician-assistant/services/engine/units';
import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, positive, finite, r0, r1, type Estimate } from './estimate';

const C = ACTIVE_NUTRITION_CONFIG;

export type RefeedingElectrolyte = 'potassium' | 'phosphate' | 'magnesium';

/** Values in mmol/L (mEq/L accepted for potassium; mg/dL converted for PO4 and Mg). */
export interface RefeedingLabs {
  potassium?: number | null;
  phosphate?: number | null;
  magnesium?: number | null;
  units?: Partial<Record<RefeedingElectrolyte, string>>;
}

const ANALYTE_KEY: Record<RefeedingElectrolyte, string> = { potassium: 'k', phosphate: 'phosphate', magnesium: 'magnesium' };

/**
 * Canonical mmol/L value, or null when missing or the unit is not recognised
 * (an unreadable unit is treated as not measured, never passed through).
 * Potassium mEq/L = mmol/L (monovalent). No unit = mmol/L assumed.
 */
export function electrolyteMmolL(which: RefeedingElectrolyte, value: number | null | undefined, unit?: string): number | null {
  const v = positive(value);
  if (v === null) return null;
  if (!unit) return v;
  const token = normaliseUnitToken(unit);
  // The shared 'k' rule borrows calcium's divalent mEq factor (0.5), which is
  // wrong for potassium; handle the monovalent case here.
  if (which === 'potassium') return token === 'mmol/l' || token === 'meq/l' ? v : null;
  const rule = UNIT_RULES[ANALYTE_BY_KEY[ANALYTE_KEY[which]]?.unitRule ?? ''];
  if (!rule || rule.convert[token] === undefined) return null;
  return toCanonical(ANALYTE_BY_KEY[ANALYTE_KEY[which]].unitRule, v, unit).value;
}

export function electrolyteLowerLimit(which: RefeedingElectrolyte): number | null {
  return ANALYTE_BY_KEY[ANALYTE_KEY[which]]?.ref?.low ?? null;
}

export interface RefeedingRiskInput {
  bmi?: number | null;
  /** Unintentional loss over 3–6 months, % (positive = loss). */
  weightLossPercent3to6m?: number | null;
  /** Days of little or no nutritional intake. */
  littleOrNoIntakeDays?: number | null;
  /** Days of NEGLIGIBLE intake (extreme-risk criterion), if different. */
  negligibleIntakeDays?: number | null;
  labs?: RefeedingLabs;
  /** History of alcohol misuse or drugs incl. insulin, chemotherapy, antacids or diuretics. */
  alcoholOrDrugHistory?: boolean | null;
}

export type RefeedingRiskLevel = 'extreme' | 'high' | 'not_high' | 'indeterminate';

export interface RefeedingRisk {
  level: RefeedingRiskLevel;
  majorCriteria: string[];
  minorCriteria: string[];
  /** Low electrolytes found before feeding. */
  lowElectrolytes: RefeedingElectrolyte[];
  /** Start rate if high/extreme; null otherwise. */
  startKcalPerKg: number | null;
  /** Little/no intake > 5 days without high risk: ≤ 50% of requirements for 2 days. */
  limitedIntakeRule: boolean;
}

export function assessRefeedingRisk(input: RefeedingRiskInput, config: NutritionConfig = C): Estimate<RefeedingRisk> {
  const t = config.refeeding.value;
  const bmi = positive(input.bmi); const wl = finite(input.weightLossPercent3to6m);
  const days = finite(input.littleOrNoIntakeDays); const negligible = finite(input.negligibleIntakeDays) ?? days;
  const major: string[] = []; const minor: string[] = []; const missing: string[] = []; const low: RefeedingElectrolyte[] = [];

  if (bmi === null) missing.push('bmi');
  else {
    if (bmi < t.highRiskAnyOne.bmiBelow) major.push(`BMI ${bmi} < ${t.highRiskAnyOne.bmiBelow}`);
    else if (bmi < t.highRiskAnyTwo.bmiBelow) minor.push(`BMI ${bmi} < ${t.highRiskAnyTwo.bmiBelow}`);
  }
  if (wl === null) missing.push('weightLossPercent3to6m');
  else {
    if (wl > t.highRiskAnyOne.weightLossPercentAbove) major.push(`Weight loss ${r1(wl)}% > ${t.highRiskAnyOne.weightLossPercentAbove}% in 3–6 months`);
    else if (wl > t.highRiskAnyTwo.weightLossPercentAbove) minor.push(`Weight loss ${r1(wl)}% > ${t.highRiskAnyTwo.weightLossPercentAbove}% in 3–6 months`);
  }
  if (days === null) missing.push('littleOrNoIntakeDays');
  else {
    if (days > t.highRiskAnyOne.littleIntakeDaysAbove) major.push(`Little or no intake for ${days} days (> ${t.highRiskAnyOne.littleIntakeDaysAbove})`);
    else if (days > t.highRiskAnyTwo.littleIntakeDaysAbove) minor.push(`Little or no intake for ${days} days (> ${t.highRiskAnyTwo.littleIntakeDaysAbove})`);
  }
  for (const e of ['potassium', 'phosphate', 'magnesium'] as RefeedingElectrolyte[]) {
    const v = electrolyteMmolL(e, input.labs?.[e], input.labs?.units?.[e]);
    const lim = electrolyteLowerLimit(e);
    if (v === null) { missing.push(`${e} (pre-feeding)`); continue; }
    if (lim !== null && v < lim) { low.push(e); major.push(`Low ${e} before feeding (${v} < ${lim} mmol/L)`); }
  }
  if (input.alcoholOrDrugHistory === true) minor.push('Alcohol misuse or relevant drugs (insulin, chemotherapy, antacids, diuretics)');
  else if (input.alcoholOrDrugHistory == null) missing.push('alcoholOrDrugHistory');

  const high = major.length >= 1 || minor.length >= 2;
  const extreme = high && ((bmi !== null && bmi < t.extremeRisk.bmiBelow) || (negligible !== null && negligible > t.extremeRisk.negligibleIntakeDaysAbove));
  const level: RefeedingRiskLevel = extreme ? 'extreme' : high ? 'high' : missing.length ? 'indeterminate' : 'not_high';
  const limitedIntakeRule = !high && days !== null && days > t.limitedIntake.littleIntakeDaysAbove;

  const warnings: string[] = [];
  if (level === 'indeterminate') warnings.push(`High risk cannot be excluded: not assessed — ${missing.join(', ')}. Treat as high risk until assessed.`);
  else if (missing.some(m => m.includes('pre-feeding'))) warnings.push('Pre-feeding K, PO4 and Mg not all measured: check before feeding starts.');
  if (limitedIntakeRule) warnings.push(`Little or no intake for > ${t.limitedIntake.littleIntakeDaysAbove} days: give no more than ${t.limitedIntake.firstDaysAtMostFraction * 100}% of requirements for the first ${t.limitedIntake.days} days.`);

  const r = computed<RefeedingRisk>(config, {
    level, majorCriteria: major, minorCriteria: minor, lowElectrolytes: low,
    startKcalPerKg: extreme ? t.startKcalPerKg.extreme : high ? t.startKcalPerKg.high : null, limitedIntakeRule,
  }, {
    unit: 'risk level', method: 'Refeeding syndrome risk (NICE CG32)',
    formula: 'High: ≥ 1 major criterion or ≥ 2 minor criteria. Extreme: BMI < 14 or negligible intake > 15 days.',
    sourceIds: [config.refeeding.sourceId],
    inputsUsed: { bmi, weightLossPercent3to6m: wl, littleOrNoIntakeDays: days, negligibleIntakeDays: negligible, alcoholOrDrugHistory: input.alcoholOrDrugHistory ?? null },
    warnings,
  });
  r.missing = missing;
  return r;
}

// ───────────────────────────── Stepped schedule ─────────────────────────────

export interface RefeedingDay {
  day: number;
  kcal: number;
  kcalPerKg: number;
}

export interface RefeedingScheduleInput {
  weightKg?: number | null;
  /** The full energy target chosen by the clinician, kcal/day. */
  targetKcal?: number | null;
  level: 'high' | 'extreme';
  /** Days to reach target (config range, default from config). */
  advanceDays?: number;
}

export const REFEEDING_ALERTS = {
  checkBefore: 'Check potassium, phosphate and magnesium BEFORE feeding starts; correct per local protocol.',
  checkDaily: (days: number) => `Check potassium, phosphate and magnesium DAILY for days 1–${days}, then as indicated.`,
  vitamins: 'Thiamine, vitamin B complex and a multivitamin/trace-element supplement before and during the first days of feeding — per local protocol.',
  fluid: 'Monitor fluid balance and cardiac status; avoid fluid overload during the advance.',
};

/**
 * Day-by-day energy: day 1 at the start rate, rising linearly to the target on
 * the last day. If the target is below the start rate, the target is held.
 */
export function refeedingSchedule(input: RefeedingScheduleInput, config: NutritionConfig = C): Estimate<RefeedingDay[]> & { alerts: string[] } {
  const t = config.refeeding.value;
  const w = positive(input.weightKg); const target = positive(input.targetKcal);
  const days = input.advanceDays ?? t.advanceDays.default;
  const start = input.level === 'extreme' ? t.startKcalPerKg.extreme : t.startKcalPerKg.high;
  const alerts = [REFEEDING_ALERTS.checkBefore, REFEEDING_ALERTS.checkDaily(t.checkLabsDailyForDays), REFEEDING_ALERTS.vitamins, REFEEDING_ALERTS.fluid];
  const base = { unit: 'kcal/day', method: `Refeeding stepped schedule (${input.level} risk)`,
    formula: `day 1 = ${start} kcal/kg; linear rise to target by day ${days}`, sourceIds: [config.refeeding.sourceId],
    inputsUsed: { weightKg: w, targetKcal: target, startKcalPerKg: start, advanceDays: days } };
  const missing = [...(w === null ? ['weightKg'] : []), ...(target === null ? ['targetKcal'] : [])];
  if (!Number.isInteger(days) || days < t.advanceDays.min || days > t.advanceDays.max) {
    return { ...notComputable<RefeedingDay[]>(config, [`advanceDays between ${t.advanceDays.min} and ${t.advanceDays.max}`], base), alerts };
  }
  if (missing.length) return { ...notComputable<RefeedingDay[]>(config, missing, base), alerts };

  const startKcal = start * w!;
  const warnings: string[] = [];
  if (target! <= startKcal) warnings.push(`Target ${target} kcal is at or below the start rate (${r0(startKcal)} kcal): target held from day 1.`);
  const schedule: RefeedingDay[] = [];
  for (let d = 1; d <= days; d++) {
    const kcal = target! <= startKcal ? target! : startKcal + ((target! - startKcal) * (d - 1)) / (days - 1);
    schedule.push({ day: d, kcal: r0(kcal), kcalPerKg: r1(kcal / w!) });
  }
  return { ...computed(config, schedule, { ...base, warnings,
    assumptions: ['Uses actual body weight.', 'Advance only if electrolytes are stable; hold or step back if they fall.'] }), alerts };
}
