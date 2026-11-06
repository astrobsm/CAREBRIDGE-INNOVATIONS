/**
 * Shape of the versioned nutrition coefficient configuration.
 *
 * Every regression coefficient, cut-off and range the engine uses lives in a
 * config object of this shape, never in engine code. The engine reads the
 * numbers; the config says where each one came from. See
 * docs/NUTRITION_ENGINE.md for how to update a coefficient.
 */

import type { ValidationStatus } from '../../../scar/services/scarPrediction';

/**
 * The scar module's validation ladder, plus the rung this config sits on before
 * a clinician has signed it off. Same pattern: moving up is a deliberate act
 * requiring evidence, not a version bump.
 */
export type NutritionValidationStatus = ValidationStatus | 'pending_clinical_validation';

export type ConfigSex = 'male' | 'female';

/**
 * Population an anthropometric equation was derived in. 'general' means the
 * source did not publish separate equations by ancestry.
 */
export type EquationPopulation =
  | 'nigerian'
  | 'black_african'
  | 'non_hispanic_black'
  | 'non_hispanic_white'
  | 'mexican_american'
  | 'general';

export interface Source {
  citation: string;
  /**
   * False until someone has checked every number attributed to this source
   * against the primary publication. Part of the sign-off checklist.
   */
  verifiedAgainstPrimary: boolean;
  note?: string;
}

/** value = intercept + Σ terms[k] × input[k] */
export interface LinearCoefficients {
  intercept: number;
  terms: Record<string, number>;
}

export interface RegressionEquation {
  id: string;
  label: string;
  /** What the equation predicts. */
  predicts: 'heightCm' | 'weightKg';
  /** Inputs the equation needs, by engine name (e.g. kneeHeightCm, ageYears). */
  inputs: string[];
  sex: ConfigSex;
  population: EquationPopulation;
  ageMinYears: number;
  /** Exclusive upper bound (age < this); null = no upper bound published. */
  ageBelowYears: number | null;
  /**
   * null = the slot exists but the coefficients have NOT been entered, because
   * they could not be confirmed. The engine then reports "equation not
   * configured" rather than guessing.
   */
  coefficients: LinearCoefficients | null;
  sourceId: string;
  todo?: string;
}

/** Ordered candidate equation ids; the first whose age range fits is used. */
export type EquationDefaults = Record<EquationPopulation, Record<ConfigSex, string[]>>;

export interface NumericRange {
  low: number;
  high: number;
}

export interface Sourced<T> {
  value: T;
  sourceId: string;
  note?: string;
}

export interface FactorTable {
  [key: string]: { label: string; factor: number; sourceId: string };
}

export interface NutritionConfig {
  version: string;
  effectiveDate: string;
  validationStatus: NutritionValidationStatus;
  changelog: string[];
  sources: Record<string, Source>;

  population: {
    adultMinAgeYears: number;
    /** Default when the caller does not choose one. Selectable per call. */
    defaultEquationPopulation: EquationPopulation;
  };

  anthropometry: {
    heightEquations: RegressionEquation[];
    weightEquations: RegressionEquation[];
    kneeHeightDefaults: EquationDefaults;
    ulnaDefaults: EquationDefaults;
    weightDefaults: EquationDefaults;
    /** BAPEN: MUAC below low suggests BMI < 20; above high suggests BMI > 30. */
    muacBmi: Sourced<{ lowCm: number; lowImpliesBmiBelow: number; highCm: number; highImpliesBmiAbove: number }>;
    /** Percent of total body weight per segment (Osterkamp 1995). */
    amputationSegmentsPercent: Sourced<Record<string, number>>;
    devine: Sourced<{ maleBaseKg: number; femaleBaseKg: number; kgPerInchOver60: number }>;
    adjustedBodyWeight: Sourced<{ fraction: number; indicatedAbovePercentIbw: number }>;
    weightChangeWindows: Sourced<Record<'oneWeek' | 'oneMonth' | 'threeToSixMonths', { minDays: number; maxDays: number }>>;
    /** Below this baseline (kg) percentage change is withheld (longitudinalMath floor). */
    weightPercentFloorKg: number;
    gripStrength: {
      /** EWGSOP2 low-strength cut-offs. */
      lowCutoffKg: Sourced<Record<ConfigSex, number>>;
      /** Age/sex normative centiles. null = not configured (not certain). */
      ageSexNorms: Sourced<null | Array<{ sex: ConfigSex; ageMin: number; ageMax: number; p10Kg: number; p50Kg: number }>>;
    };
    /** MAMC reference centiles; null = not configured. */
    mamcNorms: Sourced<null | Array<{ sex: ConfigSex; p5Cm: number; p50Cm: number }>>;
  };

  screening: {
    must: Sourced<{
      bmi: { score0Above: number; score2Below: number };
      weightLossPercent: { score1From: number; score2Above: number };
      acuteDiseaseNoIntakeDays: number;
      acuteDiseaseScore: number;
    }>;
    nrs2002: Sourced<{
      initialScreenBmiBelow: number;
      ageAdjustFromYears: number;
      atRiskFromScore: number;
      intakePercentOfRequirement: { score3AtOrBelow: number; score2AtOrBelow: number; score1Below: number };
      weightLossPercentAbove: number;
      weightLossMonthsForScore: { score1: number; score2: number; score3: number };
      threeMonthLossForScore3Above: number;
      bmiScore2From: number;
      bmiScore3Below: number;
    }>;
    glim: Sourced<{
      weightLoss: { phenoWithin6mAbove: number; phenoBeyond6mAbove: number; stage2Within6mAbove: number; stage2Beyond6mAbove: number };
      bmi: { ageSplitYears: number; phenoBelowYoung: number; phenoBelowOld: number; stage2BelowYoung: number; stage2BelowOld: number };
      reducedIntake: { percentOfRequirementAtOrBelow: number; forMoreThanDays: number; anyReductionForMoreThanDays: number };
    }>;
    nutric: Sourced<{
      age: number[];          // band lower bounds → points 0,1,2
      apache: number[];
      sofa: number[];
      comorbiditiesFor1Point: number;
      daysHospitalToIcuFor1Point: number;
      il6For1Point: number;
      highRiskWithIl6From: number;
      highRiskModifiedFrom: number;
    }>;
  };

  energy: {
    harrisBenedictOriginal: Sourced<Record<ConfigSex, LinearCoefficients>>;
    activityFactors: FactorTable;
    stressFactors: FactorTable;
    pennState2003b: Sourced<LinearCoefficients>;
    pennState2010: Sourced<LinearCoefficients & { appliesFromAgeYears: number; appliesFromBmi: number }>;
    toronto: Sourced<LinearCoefficients & { harrisBenedictVariant: 'original_1919' | 'revised_1984' }>;
    curreri: Sourced<{ kcalPerKg: number; kcalPerTbsaPercent: number; tbsaCapPercent: number }>;
    icuEspen: Sourced<{ earlyKcalPerKg: NumericRange; laterKcalPerKg: NumericRange; earlyPhaseDays: number; measuredEarlyFraction: number; measuredLaterFraction: NumericRange }>;
    obesityAspen: Sourced<{ class1to3: { bmiFrom: number; bmiTo: number; kcalPerKgActual: NumericRange }; superObese: { bmiAbove: number; kcalPerKgIbw: NumericRange } }>;
  };

  protein: {
    ward: Sourced<NumericRange>;
    icu: Sourced<{ minGPerKg: number }>;
    burnsAndLargeWounds: Sourced<NumericRange>;
    obeseIcu: Sourced<{ bmi30to40GPerKgIbw: number; bmiFrom40GPerKgIbw: number }>;
    ckdNonDialysis: Sourced<{ nonDiabetic: NumericRange; diabetic: NumericRange }>;
    /** Ward patients with BMI ≥ this are dosed on adjusted body weight. */
    wardObeseAdjustedFromBmi: Sourced<number>;
  };

  weightGoals: {
    kcalPerKg: Sourced<number>;
    lossDeficitKcal: Sourced<NumericRange & { kgPerWeek: NumericRange }>;
    gainSurplusKcal: Sourced<NumericRange & { kgPerWeek: NumericRange }>;
    floorsKcal: Sourced<Record<ConfigSex, number>>;
    maxProjectionWeeks: number;
  };

  refeeding: Sourced<{
    highRiskAnyOne: { bmiBelow: number; weightLossPercentAbove: number; littleIntakeDaysAbove: number };
    highRiskAnyTwo: { bmiBelow: number; weightLossPercentAbove: number; littleIntakeDaysAbove: number };
    extremeRisk: { bmiBelow: number; negligibleIntakeDaysAbove: number };
    startKcalPerKg: { high: number; extreme: number };
    advanceDays: { min: number; max: number; default: number };
    limitedIntake: { littleIntakeDaysAbove: number; firstDaysAtMostFraction: number; days: number };
    checkLabsDailyForDays: number;
  }>;

  fluid: Sourced<{ mlPerKg: NumericRange; feverFlagAboveC: number }>;

  micronutrients: Sourced<Record<string, Array<{ nutrient: string; rationale: string }>>>;

  monitoring: {
    intakeBelowFraction: Sourced<number>;
    intakeConsecutiveDays: Sourced<number>;
    circumferenceDeclinePercent: Sourced<number>;
    negativeNitrogenConsecutive: Sourced<number>;
    /** Method-repeatability noise floors for trend classification, NOT MCIDs. */
    prealbuminNoiseRelative: Sourced<number>;
    crpNoiseRelative: Sourced<number>;
    weightFasterThanPlannedTolerance: Sourced<number>;
    schedules: Sourced<Record<'low' | 'medium' | 'high' | 'refeeding_high', Array<{ item: string; frequency: string }>>>;
  };

  labs: {
    nitrogen: Sourced<{ proteinToNitrogen: number; insensibleLossG: number; ureaMmolToNitrogenG: number }>;
    /** Prealbumin/CRP ratio threshold. null = no validated threshold configured. */
    prealbuminCrpRatioThreshold: Sourced<number | null>;
  };
}
