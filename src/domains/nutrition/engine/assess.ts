/**
 * One-call assessment for the UI stages: guards first, then height/weight
 * resolution (measured → estimated), screening, requirements and refeeding.
 * Nothing here computes anything itself; it routes to the modules.
 */

import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import type { Estimate } from './estimate';
import { checkPopulation, type PopulationCheck } from './guards';
import {
  bmiEstimate, idealBodyWeight, adjustedBodyWeight, heightFromKneeHeight, heightFromUlna, weightFromAnthropometry,
  bmiBandFromMuac, midArmMuscleCircumference, weightChanges, gripStrength, amputationAdjustedWeight,
  type MuacBmiBand, type WeightChangeWindow,
} from './anthropometry';
import {
  screenMust, screenNrs2002, evaluateSga, diagnoseGlim, scoreNutric,
  type MustResult, type Nrs2002Input, type Nrs2002Result, type SgaForm, type SgaRating, type GlimInput, type GlimResult, type NutricInput,
} from './screening';
import { estimateEnergy, type EnergyEstimate } from './energy';
import { estimateProtein, type ProteinEstimate } from './protein';
import { estimateFluid, micronutrientPriorities, type MicronutrientPriority } from './fluidMicronutrients';
import { assessRefeedingRisk, type RefeedingLabs, type RefeedingRisk } from './refeeding';
import type { Range } from './estimate';
import type { ClinicalContext, NutritionPatient, WeightPoint } from './types';

export interface NutritionAssessmentInput {
  patient: NutritionPatient;
  context?: ClinicalContext;
  anthropometry?: {
    kneeHeightCm?: number | null;
    ulnaLengthCm?: number | null;
    muacCm?: number | null;
    calfCm?: number | null;
    tsfMm?: number | null;
    subscapularSkinfoldMm?: number | null;
    gripKg?: number | null;
    amputations?: string[];
  };
  weightHistory?: WeightPoint[];
  must?: { acuteDiseaseEffect?: boolean | null };
  nrs2002?: Omit<Nrs2002Input, 'ageYears' | 'bmi'>;
  glim?: Omit<GlimInput, 'ageYears' | 'bmi'>;
  sga?: SgaForm;
  nutric?: Omit<NutricInput, 'ageYears'>;
  refeeding?: { littleOrNoIntakeDays?: number | null; negligibleIntakeDays?: number | null; labs?: RefeedingLabs; alcoholOrDrugHistory?: boolean | null };
  harrisBenedictFactors?: { activity?: string; stress?: string };
  micronutrientConditions?: string[];
}

export type NutritionAssessment =
  | { status: 'refer'; population: Extract<PopulationCheck, { status: 'refer' }>; configVersion: string }
  | {
    status: 'assessed' | 'incomplete';
    population: PopulationCheck;
    configVersion: string;
    validationStatus: string;
    height: Estimate;
    weight: Estimate;
    bmi: Estimate;
    ibw: Estimate;
    adjustedBodyWeight: Estimate & { indicated: boolean | null };
    muacBmiBand: Estimate<MuacBmiBand>;
    mamc: Estimate;
    grip: ReturnType<typeof gripStrength>;
    weightChange: Record<WeightChangeWindow, Estimate>;
    screening: {
      must: Estimate<MustResult>;
      nrs2002: Estimate<Nrs2002Result>;
      sga: Estimate<SgaRating>;
      glim: Estimate<GlimResult>;
      nutric: ReturnType<typeof scoreNutric> | null;
    };
    energy: EnergyEstimate[];
    protein: ProteinEstimate[];
    fluid: Estimate<Range>;
    refeeding: Estimate<RefeedingRisk>;
    micronutrients: Estimate<MicronutrientPriority[]>;
  };

function measuredOr(value: number | null | undefined, label: string, unit: string, config: NutritionConfig): Estimate | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return { value, unit, method: `${label} (recorded)`, formula: 'recorded value', inputsUsed: { [label]: value }, assumptions: [],
      warnings: [], missing: [], status: 'computed', configVersion: config.version, sources: [] };
  }
  return null;
}

export function assessNutrition(input: NutritionAssessmentInput, config: NutritionConfig = ACTIVE_NUTRITION_CONFIG): NutritionAssessment {
  const population = checkPopulation(input.patient, config);
  if (population.status === 'refer') return { status: 'refer', population, configVersion: config.version };

  const p = input.patient; const a = input.anthropometry ?? {}; const ctx = input.context ?? {};
  const stature = { ageYears: p.ageYears, sex: p.sex, population: p.equationPopulation };

  // Height: measured → knee height → ulna
  let height = measuredOr(p.heightCm, 'height', 'cm', config);
  if (height && p.heightSource && p.heightSource !== 'measured') height.assumptions.push(`Height ${p.heightSource}.`);
  if (!height) {
    const kh = heightFromKneeHeight({ ...stature, kneeHeightCm: a.kneeHeightCm }, config);
    height = kh.status === 'computed' || a.ulnaLengthCm == null ? kh : heightFromUlna({ ...stature, ulnaLengthCm: a.ulnaLengthCm }, config);
  }
  // Weight: measured → anthropometric equation
  let weight = measuredOr(p.weightKg, 'weight', 'kg', config);
  if (weight && p.weightSource && p.weightSource !== 'measured') weight.assumptions.push(`Weight ${p.weightSource}.`);
  if (!weight) {
    weight = weightFromAnthropometry({ ...stature, kneeHeightCm: a.kneeHeightCm, muacCm: a.muacCm, calfCm: a.calfCm,
      subscapularSkinfoldMm: a.subscapularSkinfoldMm }, config);
  }
  const hEst = height.status === 'computed' && !measuredOr(p.heightCm, 'h', 'cm', config);
  const wEst = weight.status === 'computed' && !measuredOr(p.weightKg, 'w', 'kg', config);
  const resolved: NutritionPatient = {
    ...p,
    heightCm: height.value, heightSource: hEst ? 'estimated' : p.heightSource,
    weightKg: weight.value, weightSource: wEst ? 'estimated' : p.weightSource,
  };

  // BMI uses the whole-body-equivalent weight after amputation.
  let bmiWeight = resolved.weightKg; let bmiLabel = wEst ? 'estimated body weight' : 'actual body weight';
  if (a.amputations?.length && resolved.weightKg) {
    const adj = amputationAdjustedWeight(resolved.weightKg, a.amputations, config);
    if (adj.value !== null) { bmiWeight = adj.value; bmiLabel = 'amputation-adjusted weight'; }
  }
  const bmi = bmiEstimate(bmiWeight, resolved.heightCm, config, bmiLabel);
  const changes = weightChanges(input.weightHistory ?? [], config);
  const loss3to6 = changes.threeToSixMonths.value === null ? null : -changes.threeToSixMonths.value;

  const must = screenMust({ bmi: bmi.value, muacCm: a.muacCm, weightLossPercent3to6m: loss3to6,
    acuteDiseaseEffect: input.must?.acuteDiseaseEffect ?? null }, config);
  const nrs2002 = screenNrs2002({ ...(input.nrs2002 ?? {}), ageYears: p.ageYears, bmi: bmi.value,
    weightLossPercent: input.nrs2002?.weightLossPercent ?? loss3to6,
    weightLossOverMonths: input.nrs2002?.weightLossOverMonths ?? (loss3to6 !== null ? 3 : null) }, config);
  const glim = diagnoseGlim({ ...(input.glim ?? {}), ageYears: p.ageYears, bmi: bmi.value,
    screeningPositive: input.glim?.screeningPositive ?? (must.value ? must.value.total >= 1 : null) }, config);
  const sga = evaluateSga(input.sga ?? {}, config);
  const nutric = ctx.setting === 'icu' ? scoreNutric({ ...(input.nutric ?? {}), ageYears: p.ageYears }, config) : null;

  const refeeding = assessRefeedingRisk({ bmi: bmi.value, weightLossPercent3to6m: loss3to6, ...(input.refeeding ?? {}) }, config);
  const conditions = new Set(input.micronutrientConditions ?? []);
  if (ctx.majorWound || ctx.largeOrHeavilyExudingWound) conditions.add('wound_healing');
  if (ctx.burns && (ctx.burns.tbsaPercent ?? 0) > 0) conditions.add('burns');
  if (refeeding.value && (refeeding.value.level === 'high' || refeeding.value.level === 'extreme' || refeeding.value.level === 'indeterminate')) conditions.add('refeeding_risk');
  if (ctx.alcoholExcess) conditions.add('alcohol_excess');

  const out = {
    status: 'assessed' as 'assessed' | 'incomplete',
    population, configVersion: config.version, validationStatus: config.validationStatus,
    height, weight, bmi,
    ibw: idealBodyWeight(resolved.heightCm, resolved.sex, config),
    adjustedBodyWeight: adjustedBodyWeight(resolved.weightKg, resolved.heightCm, resolved.sex, config),
    muacBmiBand: bmiBandFromMuac(a.muacCm, config),
    mamc: midArmMuscleCircumference(a.muacCm, a.tsfMm, config),
    grip: gripStrength(a.gripKg, resolved.sex, resolved.ageYears, config),
    weightChange: changes,
    screening: { must, nrs2002, sga, glim, nutric },
    energy: estimateEnergy({ patient: resolved, context: ctx, harrisBenedictFactors: input.harrisBenedictFactors }, config),
    protein: estimateProtein({ patient: resolved, context: ctx }, config),
    fluid: estimateFluid(resolved, ctx, config),
    refeeding,
    micronutrients: micronutrientPriorities([...conditions], config),
  };
  if (population.status === 'insufficient' || weight.status !== 'computed' || height.status !== 'computed') out.status = 'incomplete';
  return out;
}
