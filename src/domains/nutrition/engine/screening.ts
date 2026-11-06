/**
 * Screening and diagnosis: MUST, NRS-2002, SGA, GLIM and (m)NUTRIC.
 *
 * MUST builds on the canonical scoreMust/interpretMust; this module adds the
 * step scores (BMI, weight loss) and the MUAC route when weight is unknown.
 * An unassessed component is reported as missing, never scored as zero.
 */

import { scoreMust, interpretMust, type RiskResult } from '../../clinician-assistant/services/riskCalculators';
import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, finite, positive, r1, type Estimate } from './estimate';
import { bmiEstimate, bmiBandFromMuac } from './anthropometry';

const C = ACTIVE_NUTRITION_CONFIG;

// ───────────────────────────── MUST ─────────────────────────────

export type Score012 = 0 | 1 | 2;

/** MUST step 1. */
export function mustBmiScore(bmi: number, config: NutritionConfig = C): Score012 {
  const t = config.screening.must.value.bmi;
  if (bmi > t.score0Above) return 0;
  if (bmi >= t.score2Below) return 1;
  return 2;
}

/**
 * Percent of weight LOST from previous to current. Positive = loss,
 * negative = gain. Null if either weight is not a measurement.
 */
export function weightLossPercent(previousKg: number | null | undefined, currentKg: number | null | undefined): number | null {
  const p = positive(previousKg); const c = positive(currentKg);
  if (p === null || c === null) return null;
  return ((p - c) / p) * 100;
}

/**
 * MUST step 2. Takes percent LOST (positive). A weight GAIN (negative) scores
 * 0: it is not unplanned weight loss. (MUSTCalculator used Math.abs(), which
 * scored a 12% gain as a 12% loss.)
 */
export function mustWeightLossScore(lossPercent: number, config: NutritionConfig = C): Score012 {
  const t = config.screening.must.value.weightLossPercent;
  if (!(lossPercent >= t.score1From)) return 0;
  if (lossPercent > t.score2Above) return 2;
  return 1;
}

export interface MustInput {
  bmi?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  /** Used only when BMI cannot be calculated. */
  muacCm?: number | null;
  /** Unplanned loss over the past 3–6 months, % (positive = loss). */
  weightLossPercent3to6m?: number | null;
  /** Acutely ill AND no (or likely no) nutritional intake for > 5 days. null = not assessed. */
  acuteDiseaseEffect?: boolean | null;
}

export interface MustResult {
  total: number;
  components: { bmi_score: Score012 | null; weight_loss_score: Score012 | null; acute_disease_score: 0 | 2 | null };
  /** False when any component was not assessed: total is then a minimum. */
  complete: boolean;
  risk: RiskResult;
}

export function screenMust(input: MustInput, config: NutritionConfig = C): Estimate<MustResult> {
  const cfg = config.screening.must;
  const assumptions: string[] = []; const warnings: string[] = []; const missing: string[] = [];
  const sourceIds = [cfg.sourceId];

  // Step 1: BMI, or MUAC band when BMI cannot be calculated.
  let bmi = positive(input.bmi);
  if (bmi === null) {
    const e = bmiEstimate(input.weightKg, input.heightCm, config);
    if (e.value !== null) bmi = e.value;
  }
  let bmiScore: Score012 | null = null;
  if (bmi !== null) bmiScore = mustBmiScore(bmi, config);
  else {
    const band = bmiBandFromMuac(input.muacCm, config);
    if (band.value === 'bmi_likely_below_20') {
      bmiScore = 1;
      assumptions.push('BMI score estimated from MUAC (< 23.5 cm suggests BMI < 20): scored 1, the lowest score consistent with the estimate.');
      warnings.push('BMI step estimated from MUAC: the true BMI score may be 2.');
    } else if (band.value === 'bmi_likely_above_30') {
      bmiScore = 0;
      assumptions.push('BMI score estimated from MUAC (> 32 cm suggests BMI > 30): scored 0.');
    } else if (band.value === 'indeterminate') {
      missing.push('bmi (MUAC in indeterminate band — use subjective criteria)');
    } else {
      missing.push('bmi (or weight + height, or MUAC)');
    }
  }

  // Step 2
  let wlScore: Score012 | null = null;
  const wl = finite(input.weightLossPercent3to6m);
  if (wl !== null) {
    wlScore = mustWeightLossScore(wl, config);
    if (wl < 0) assumptions.push(`Weight GAIN of ${r1(-wl)}% scores 0 (not unplanned loss).`);
  } else missing.push('weightLossPercent3to6m');

  // Step 3
  let adScore: 0 | 2 | null = null;
  if (input.acuteDiseaseEffect === true) adScore = 2;
  else if (input.acuteDiseaseEffect === false) adScore = 0;
  else missing.push('acuteDiseaseEffect');

  const base = { unit: 'score', method: 'MUST (Malnutrition Universal Screening Tool)',
    formula: 'BMI score + weight-loss score + acute disease effect score',
    sourceIds, inputsUsed: { bmi, muacCm: positive(input.muacCm), weightLossPercent3to6m: wl, acuteDiseaseEffect: input.acuteDiseaseEffect ?? null } };
  if (bmiScore === null && wlScore === null && adScore === null) return notComputable(config, missing, base);

  const total = scoreMust({ bmi_score: bmiScore ?? 0, weight_loss_score: wlScore ?? 0, acute_disease_score: adScore ?? 0 });
  const risk = interpretMust(total);
  const complete = missing.length === 0;
  if (!complete) {
    warnings.push(`Incomplete: ${missing.join(', ')} not assessed. Total ${total} is a MINIMUM, not a final score.`);
    risk.interpretation = `At least: ${risk.interpretation}`;
  }
  const result = computed<MustResult>(config, { total, components: { bmi_score: bmiScore, weight_loss_score: wlScore, acute_disease_score: adScore }, complete, risk },
    { ...base, assumptions, warnings });
  result.missing = missing;
  return result;
}

// ───────────────────────────── NRS-2002 ─────────────────────────────

export interface Nrs2002Input {
  ageYears?: number | null;
  bmi?: number | null;
  /** % of weight lost (positive) and over how many months. */
  weightLossPercent?: number | null;
  weightLossOverMonths?: number | null;
  /** Food intake in the preceding week as % of normal requirement. */
  intakePercentOfRequirementLastWeek?: number | null;
  generalConditionImpaired?: boolean | null;
  /** Clinician-assigned severity of disease, 0–3 (Kondrup 2003 examples). */
  diseaseSeverityScore?: 0 | 1 | 2 | 3 | null;
  severelyIll?: boolean | null;
}

export interface Nrs2002Result {
  initialScreenPositive: boolean | null;
  nutritionalStatusScore: number | null;
  diseaseSeverityScore: number | null;
  ageAdjustment: number | null;
  total: number | null;
  atRisk: boolean | null;
}

export function screenNrs2002(input: Nrs2002Input, config: NutritionConfig = C): Estimate<Nrs2002Result> {
  const t = config.screening.nrs2002.value;
  const missing: string[] = []; const warnings: string[] = []; const assumptions: string[] = [];
  const bmi = positive(input.bmi); const wl = finite(input.weightLossPercent);
  const months = positive(input.weightLossOverMonths); const intake = finite(input.intakePercentOfRequirementLastWeek);
  const age = finite(input.ageYears);

  // Initial screen: any "yes" → final screening.
  const initialAnswers = [
    bmi === null ? null : bmi < t.initialScreenBmiBelow,
    wl === null || months === null ? null : wl > 0 && months <= 3,
    intake === null ? null : intake < 100,
    input.severelyIll ?? null,
  ];
  const initialScreenPositive = initialAnswers.some(a => a === true) ? true
    : initialAnswers.every(a => a === false) ? false : null;

  // Impaired nutritional status: the highest criterion met.
  // Held in an object: TS does not track assignments made inside the closure.
  const st: { v: number | null } = { v: null };
  const bump = (s: number) => { st.v = Math.max(st.v ?? 0, s); };
  if (wl !== null && months !== null) {
    if (wl > t.weightLossPercentAbove) {
      if (months <= t.weightLossMonthsForScore.score3) bump(3);
      else if (months <= t.weightLossMonthsForScore.score2) bump(2);
      else if (months <= t.weightLossMonthsForScore.score1) bump(1);
      else bump(0);
    } else bump(0);
    if (months <= 3 && wl > t.threeMonthLossForScore3Above) bump(3);
  }
  if (bmi !== null) {
    if (bmi < t.initialScreenBmiBelow) {
      if (input.generalConditionImpaired === true) bump(bmi < t.bmiScore3Below ? 3 : 2);
      else if (input.generalConditionImpaired == null) warnings.push('BMI < 20.5 but general condition not recorded: BMI criterion not scored.');
      else bump(0);
    } else bump(0);
  }
  if (intake !== null) {
    const b = t.intakePercentOfRequirement;
    bump(intake <= b.score3AtOrBelow ? 3 : intake <= b.score2AtOrBelow ? 2 : intake < b.score1Below ? 1 : 0);
  }
  if (wl === null || months === null) missing.push('weightLossPercent + weightLossOverMonths');
  if (bmi === null) missing.push('bmi');
  if (intake === null) missing.push('intakePercentOfRequirementLastWeek');

  const disease = input.diseaseSeverityScore ?? null;
  if (disease === null) missing.push('diseaseSeverityScore');
  const ageAdj = age === null ? null : age >= t.ageAdjustFromYears ? 1 : 0;
  if (age === null) missing.push('ageYears');

  const status = st.v;
  const statusKnown = status !== null;
  const total = status !== null && disease !== null && ageAdj !== null ? status + disease + ageAdj : null;
  const partial = (status ?? 0) + (disease ?? 0) + (ageAdj ?? 0);
  let atRisk: boolean | null = total === null ? null : total >= t.atRiskFromScore;
  if (total === null && partial >= t.atRiskFromScore) {
    atRisk = true;
    assumptions.push(`Partial score ${partial} already reaches ${t.atRiskFromScore}: at risk regardless of unassessed items.`);
  }
  if (missing.length && statusKnown) warnings.push(`Nutritional status scored from available criteria only; not assessed: ${missing.join(', ')}.`);

  const base = { unit: 'score', method: 'NRS-2002', formula: 'impaired nutritional status (0–3) + disease severity (0–3) + 1 if age ≥ 70',
    sourceIds: [config.screening.nrs2002.sourceId],
    inputsUsed: { bmi, weightLossPercent: wl, weightLossOverMonths: months, intakePercent: intake, diseaseSeverityScore: disease, ageYears: age } };
  if (!statusKnown && disease === null) return notComputable(config, missing, base);
  const r = computed<Nrs2002Result>(config, { initialScreenPositive, nutritionalStatusScore: status, diseaseSeverityScore: disease,
    ageAdjustment: ageAdj, total, atRisk }, { ...base, assumptions, warnings });
  r.missing = missing;
  return r;
}

// ───────────────────────────── SGA ─────────────────────────────

export type SgaRating = 'A' | 'B' | 'C';
/** 0 normal, 1 mild, 2 moderate, 3 severe. */
export type SgaSeverity = 0 | 1 | 2 | 3;

/** Structured Detsky SGA form. The rating is the clinician's, not computed. */
export interface SgaForm {
  weightLoss6MonthsPercent?: number | null;
  weightChange2Weeks?: 'increase' | 'no_change' | 'decrease' | null;
  dietaryIntakeChange?: 'none' | 'suboptimal_solid' | 'full_liquid' | 'hypocaloric_liquid' | 'starvation' | null;
  dietaryChangeWeeks?: number | null;
  giSymptomsOver2Weeks?: { nausea?: boolean; vomiting?: boolean; diarrhoea?: boolean; anorexia?: boolean } | null;
  functionalCapacity?: 'no_dysfunction' | 'working_suboptimally' | 'ambulatory' | 'bedridden' | null;
  metabolicStress?: 'none' | 'low' | 'moderate' | 'high' | null;
  subcutaneousFatLoss?: SgaSeverity | null;
  muscleWasting?: SgaSeverity | null;
  ankleOedema?: SgaSeverity | null;
  sacralOedema?: SgaSeverity | null;
  ascites?: SgaSeverity | null;
  clinicianRating?: SgaRating | null;
  assessedBy?: string | null;
}

const SGA_ITEMS: (keyof SgaForm)[] = [
  'weightLoss6MonthsPercent', 'weightChange2Weeks', 'dietaryIntakeChange', 'giSymptomsOver2Weeks',
  'functionalCapacity', 'metabolicStress', 'subcutaneousFatLoss', 'muscleWasting', 'ankleOedema', 'sacralOedema', 'ascites',
];

export function evaluateSga(form: SgaForm, config: NutritionConfig = C): Estimate<SgaRating> {
  const missingItems = SGA_ITEMS.filter(k => form[k] === undefined || form[k] === null);
  const base = { unit: 'SGA rating', method: 'Subjective Global Assessment (Detsky)',
    formula: 'Clinician global rating A/B/C informed by history and examination (not a numeric score)',
    sourceIds: ['detsky1987'], inputsUsed: { clinicianRating: form.clinicianRating ?? null, assessedBy: form.assessedBy ?? null } };
  if (!form.clinicianRating || !form.assessedBy) {
    return notComputable(config, [...(form.clinicianRating ? [] : ['clinicianRating']), ...(form.assessedBy ? [] : ['assessedBy'])], {
      ...base, warnings: ['SGA not assessed. The rating is a clinician judgement and is never derived from another score (e.g. MUST).'] });
  }
  const warnings: string[] = [];
  if (missingItems.length) warnings.push(`Form items not recorded: ${missingItems.join(', ')}.`);
  const wl = finite(form.weightLoss6MonthsPercent) ?? 0;
  const severeExam = (form.subcutaneousFatLoss ?? 0) >= 3 || (form.muscleWasting ?? 0) >= 3;
  if (form.clinicianRating === 'A' && (wl > 10 || severeExam)) {
    warnings.push('Rated A despite > 10% weight loss or severe fat/muscle loss — please confirm.');
  }
  if (form.clinicianRating === 'C' && wl <= 0 && !(form.subcutaneousFatLoss || form.muscleWasting)) {
    warnings.push('Rated C with no recorded weight loss or physical signs — please confirm.');
  }
  return computed(config, form.clinicianRating, { ...base, warnings });
}

// ───────────────────────────── GLIM ─────────────────────────────

export interface GlimInput {
  ageYears?: number | null;
  /** Non-volitional loss, % (positive). */
  weightLossPercent?: number | null;
  weightLossOverMonths?: number | null;
  bmi?: number | null;
  /** From a validated body-composition method or a clinician exam. */
  muscleMass?: 'normal' | 'moderate_deficit' | 'severe_deficit' | null;
  intakePercentOfRequirement?: number | null;
  reducedIntakeDays?: number | null;
  chronicGiMalabsorption?: boolean | null;
  inflammation?: 'acute' | 'chronic' | 'none' | null;
  /** GLIM is applied after a positive screen. */
  screeningPositive?: boolean | null;
}

export interface GlimResult {
  /** null = cannot be decided from the data given. */
  diagnosed: boolean | null;
  severity: 'stage1_moderate' | 'stage2_severe' | null;
  phenotypic: string[];
  aetiologic: string[];
}

export function diagnoseGlim(input: GlimInput, config: NutritionConfig = C): Estimate<GlimResult> {
  const t = config.screening.glim.value;
  const pheno: string[] = []; const aetio: string[] = []; const missing: string[] = []; const warnings: string[] = [];
  let stage2 = false;
  const wl = finite(input.weightLossPercent); const months = positive(input.weightLossOverMonths);
  if (wl !== null && months !== null) {
    const within6 = months <= 6;
    const pTh = within6 ? t.weightLoss.phenoWithin6mAbove : t.weightLoss.phenoBeyond6mAbove;
    const sTh = within6 ? t.weightLoss.stage2Within6mAbove : t.weightLoss.stage2Beyond6mAbove;
    if (wl > pTh) { pheno.push(`Weight loss ${r1(wl)}% over ${months} months`); if (wl > sTh) stage2 = true; }
  } else missing.push('weightLossPercent + weightLossOverMonths');

  const bmi = positive(input.bmi); const age = finite(input.ageYears);
  if (bmi !== null && age !== null) {
    const old = age >= t.bmi.ageSplitYears;
    if (bmi < (old ? t.bmi.phenoBelowOld : t.bmi.phenoBelowYoung)) {
      pheno.push(`Low BMI ${bmi}`);
      if (bmi < (old ? t.bmi.stage2BelowOld : t.bmi.stage2BelowYoung)) stage2 = true;
    }
  } else missing.push(bmi === null ? 'bmi' : 'ageYears');

  if (input.muscleMass === 'moderate_deficit' || input.muscleMass === 'severe_deficit') {
    pheno.push(`Reduced muscle mass (${input.muscleMass.replace('_', ' ')})`);
    if (input.muscleMass === 'severe_deficit') stage2 = true;
  } else if (input.muscleMass == null) missing.push('muscleMass');

  const intake = finite(input.intakePercentOfRequirement); const days = finite(input.reducedIntakeDays);
  if (intake !== null && days !== null) {
    if ((intake <= t.reducedIntake.percentOfRequirementAtOrBelow && days > t.reducedIntake.forMoreThanDays)
      || (intake < 100 && days > t.reducedIntake.anyReductionForMoreThanDays)) {
      aetio.push(`Reduced intake (${intake}% for ${days} days)`);
    }
  } else missing.push('intakePercentOfRequirement + reducedIntakeDays');
  if (input.chronicGiMalabsorption) aetio.push('Chronic GI condition impairing assimilation');
  else if (input.chronicGiMalabsorption == null) missing.push('chronicGiMalabsorption');
  if (input.inflammation === 'acute' || input.inflammation === 'chronic') aetio.push(`Inflammation (${input.inflammation})`);
  else if (input.inflammation == null) missing.push('inflammation');

  if (input.screeningPositive === false) warnings.push('GLIM is intended after a positive nutrition-risk screen.');
  else if (input.screeningPositive == null) warnings.push('Screening result not supplied: GLIM assumes a positive screen.');

  let diagnosed: boolean | null;
  if (pheno.length && aetio.length) diagnosed = true;
  else if (!missing.length) diagnosed = false;
  else {
    const phenoStillPossible = !pheno.length && missing.some(m => /weight|bmi|age|muscle/i.test(m));
    const aetioStillPossible = !aetio.length && missing.some(m => /intake|Gi|inflammation/i.test(m));
    diagnosed = phenoStillPossible || aetioStillPossible ? null : false;
  }
  const severity = diagnosed ? (stage2 ? 'stage2_severe' : 'stage1_moderate') : null;
  if (diagnosed === null) warnings.push(`Cannot confirm or exclude malnutrition: not assessed — ${missing.join(', ')}.`);

  const r = computed<GlimResult>(config, { diagnosed, severity, phenotypic: pheno, aetiologic: aetio }, {
    unit: 'diagnosis', method: 'GLIM criteria', formula: '≥ 1 phenotypic AND ≥ 1 aetiologic criterion; severity from the phenotypic criteria',
    sourceIds: [config.screening.glim.sourceId], inputsUsed: { weightLossPercent: wl, weightLossOverMonths: months, bmi, ageYears: age,
      muscleMass: input.muscleMass ?? null, intakePercent: intake, reducedIntakeDays: days, inflammation: input.inflammation ?? null },
    warnings,
  });
  r.missing = missing;
  return r;
}

// ───────────────────────────── NUTRIC ─────────────────────────────

export interface NutricInput {
  ageYears?: number | null;
  apacheII?: number | null;
  sofa?: number | null;
  comorbidityCount?: number | null;
  daysHospitalToIcu?: number | null;
  il6?: number | null;
}

/** Index of the last band lower-bound that value reaches. */
function bandPoints(value: number, lowerBounds: number[]): number {
  let p = 0;
  lowerBounds.forEach((b, i) => { if (value >= b) p = i; });
  return p;
}

export function scoreNutric(input: NutricInput, config: NutritionConfig = C): Estimate<{
  score: number; modified: boolean; highRisk: boolean; components: Record<string, number>;
}> {
  const t = config.screening.nutric.value;
  const required = ['ageYears', 'apacheII', 'sofa', 'comorbidityCount', 'daysHospitalToIcu'] as const;
  const missing = required.filter(k => finite(input[k]) === null);
  const il6 = finite(input.il6);
  const modified = il6 === null;
  const base = { unit: 'score', method: modified ? 'Modified NUTRIC (without IL-6)' : 'NUTRIC (with IL-6)',
    formula: 'age + APACHE II + SOFA + comorbidities + days hospital→ICU' + (modified ? '' : ' + IL-6'),
    sourceIds: modified ? ['heyland2011', 'rahman2016'] : ['heyland2011'],
    inputsUsed: { ...Object.fromEntries(required.map(k => [k, finite(input[k])])), il6 } };
  if (missing.length) return notComputable(config, [...missing], base);
  const components: Record<string, number> = {
    age: bandPoints(input.ageYears!, t.age),
    apacheII: bandPoints(input.apacheII!, t.apache),
    sofa: bandPoints(input.sofa!, t.sofa),
    comorbidities: input.comorbidityCount! >= t.comorbiditiesFor1Point ? 1 : 0,
    daysHospitalToIcu: input.daysHospitalToIcu! >= t.daysHospitalToIcuFor1Point ? 1 : 0,
  };
  if (!modified) components.il6 = il6! >= t.il6For1Point ? 1 : 0;
  const score = Object.values(components).reduce((a, b) => a + b, 0);
  const threshold = modified ? t.highRiskModifiedFrom : t.highRiskWithIl6From;
  return computed(config, { score, modified, highRisk: score >= threshold, components }, { ...base,
    assumptions: modified ? ['IL-6 not available: modified NUTRIC used (high risk ≥ 5 of 9).'] : ['High risk ≥ 6 of 10.'] });
}
