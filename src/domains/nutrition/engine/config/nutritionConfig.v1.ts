/**
 * Nutrition engine coefficient configuration, version 1.0.0.
 *
 * STATUS: pending_clinical_validation. Every value below needs sign-off; the
 * checklist is in docs/NUTRITION_ENGINE.md. To change a value, copy this file
 * to the next version, change it there, record why in the changelog, and
 * point ACTIVE_NUTRITION_CONFIG at the new version (config/index.ts).
 */

import type { NutritionConfig } from './types';
import { SOURCES_V1 } from './sources.v1';
import {
  HEIGHT_EQUATIONS_V1, WEIGHT_EQUATIONS_V1,
  KNEE_HEIGHT_DEFAULTS_V1, ULNA_DEFAULTS_V1, WEIGHT_DEFAULTS_V1,
} from './equations.v1';

export const NUTRITION_CONFIG_V1: NutritionConfig = {
  version: '1.0.0',
  effectiveDate: '2026-11-07',
  validationStatus: 'pending_clinical_validation',
  changelog: ['1.0.0 — initial engine configuration (stage 1). Not clinically signed off.'],
  sources: SOURCES_V1,

  population: {
    adultMinAgeYears: 18,
    // No Nigerian equation is configured, so the default is the closest
    // configured population. Selectable per call; the choice is reported.
    defaultEquationPopulation: 'non_hispanic_black',
  },

  anthropometry: {
    heightEquations: HEIGHT_EQUATIONS_V1,
    weightEquations: WEIGHT_EQUATIONS_V1,
    kneeHeightDefaults: KNEE_HEIGHT_DEFAULTS_V1,
    ulnaDefaults: ULNA_DEFAULTS_V1,
    weightDefaults: WEIGHT_DEFAULTS_V1,
    muacBmi: { value: { lowCm: 23.5, lowImpliesBmiBelow: 20, highCm: 32, highImpliesBmiAbove: 30 }, sourceId: 'bapenMust2003' },
    amputationSegmentsPercent: {
      value: {
        hand: 0.7, forearm_with_hand: 2.3, forearm_without_hand: 1.6, upper_arm: 2.7, entire_arm: 5.0,
        foot: 1.5, lower_leg_with_foot: 5.9, lower_leg_without_foot: 4.4, thigh: 10.1, entire_leg: 16.0,
      },
      sourceId: 'osterkamp1995',
    },
    devine: { value: { maleBaseKg: 50, femaleBaseKg: 45.5, kgPerInchOver60: 2.3 }, sourceId: 'devine1974',
      note: 'Computed by the canonical calculateIdealBodyWeight; recorded here for the audit trail.' },
    adjustedBodyWeight: { value: { fraction: 0.4, indicatedAbovePercentIbw: 120 }, sourceId: 'canonicalEngine',
      note: '120% IBW threshold for when AdjBW is indicated is a local convention.' },
    weightChangeWindows: {
      value: {
        oneWeek: { minDays: 5, maxDays: 10 },
        oneMonth: { minDays: 21, maxDays: 40 },
        threeToSixMonths: { minDays: 90, maxDays: 183 },
      },
      sourceId: 'localPolicy',
    },
    weightPercentFloorKg: 1,
    gripStrength: {
      lowCutoffKg: { value: { male: 27, female: 16 }, sourceId: 'ewgsop2' },
      ageSexNorms: { value: null, sourceId: 'localPolicy', note: 'TODO: age/sex grip norms not configured (not certain of published centiles).' },
    },
    mamcNorms: { value: null, sourceId: 'localPolicy', note: 'TODO: MAMC reference centiles not configured.' },
  },

  screening: {
    must: {
      value: {
        bmi: { score0Above: 20, score2Below: 18.5 },
        weightLossPercent: { score1From: 5, score2Above: 10 },
        acuteDiseaseNoIntakeDays: 5,
        acuteDiseaseScore: 2,
      },
      sourceId: 'bapenMust2003',
    },
    nrs2002: {
      value: {
        initialScreenBmiBelow: 20.5,
        ageAdjustFromYears: 70,
        atRiskFromScore: 3,
        intakePercentOfRequirement: { score3AtOrBelow: 25, score2AtOrBelow: 60, score1Below: 75 },
        weightLossPercentAbove: 5,
        weightLossMonthsForScore: { score1: 3, score2: 2, score3: 1 },
        threeMonthLossForScore3Above: 15,
        bmiScore2From: 18.5,
        bmiScore3Below: 18.5,
      },
      sourceId: 'kondrup2003',
      note: 'Published intake bands overlap (50-75% / 25-60% / 0-25%); the higher score is taken.',
    },
    glim: {
      value: {
        weightLoss: { phenoWithin6mAbove: 5, phenoBeyond6mAbove: 10, stage2Within6mAbove: 10, stage2Beyond6mAbove: 20 },
        bmi: { ageSplitYears: 70, phenoBelowYoung: 20, phenoBelowOld: 22, stage2BelowYoung: 18.5, stage2BelowOld: 20 },
        reducedIntake: { percentOfRequirementAtOrBelow: 50, forMoreThanDays: 7, anyReductionForMoreThanDays: 14 },
      },
      sourceId: 'glim2019',
      note: 'Non-Asian BMI cut-offs.',
    },
    nutric: {
      value: {
        age: [0, 50, 75],
        apache: [0, 15, 20, 28],
        sofa: [0, 6, 10],
        comorbiditiesFor1Point: 2,
        daysHospitalToIcuFor1Point: 1,
        il6For1Point: 400,
        highRiskWithIl6From: 6,
        highRiskModifiedFrom: 5,
      },
      sourceId: 'heyland2011',
      note: 'Modified NUTRIC (no IL-6) high-risk threshold from Rahman 2016.',
    },
  },

  energy: {
    harrisBenedictOriginal: {
      value: {
        male: { intercept: 66.473, terms: { weightKg: 13.7516, heightCm: 5.0033, ageYears: -6.755 } },
        female: { intercept: 655.0955, terms: { weightKg: 9.5634, heightCm: 1.8496, ageYears: -4.6756 } },
      },
      sourceId: 'harrisBenedict1919',
      note: 'Used only inside the Toronto formula, which was derived with it. Stand-alone Harris-Benedict uses the revised (canonical) equation.',
    },
    activityFactors: {
      bed_bound: { label: 'Confined to bed', factor: 1.2, sourceId: 'long1979' },
      out_of_bed: { label: 'Out of bed / ambulatory', factor: 1.3, sourceId: 'long1979' },
    },
    stressFactors: {
      none: { label: 'No metabolic stress', factor: 1.0, sourceId: 'long1979' },
      minor_surgery: { label: 'Minor operation', factor: 1.2, sourceId: 'long1979' },
      skeletal_trauma: { label: 'Skeletal trauma', factor: 1.35, sourceId: 'long1979' },
      major_sepsis: { label: 'Major sepsis', factor: 1.6, sourceId: 'long1979' },
      severe_burn: { label: 'Severe thermal burn', factor: 2.1, sourceId: 'long1979' },
    },
    pennState2003b: {
      value: { intercept: -6212, terms: { mifflinKcal: 0.96, minuteVentilationLMin: 31, tmaxC: 167 } },
      sourceId: 'frankenfield2004',
    },
    pennState2010: {
      value: { intercept: -3085, terms: { mifflinKcal: 0.71, minuteVentilationLMin: 64, tmaxC: 85 }, appliesFromAgeYears: 60, appliesFromBmi: 30 },
      sourceId: 'frankenfield2009',
    },
    toronto: {
      value: {
        intercept: -4343,
        terms: { tbsaPercent: 10.5, previousDayIntakeKcal: 0.23, harrisBenedictKcal: 0.84, temperatureC: 114, postBurnDay: -4.5 },
        harrisBenedictVariant: 'original_1919',
      },
      sourceId: 'allard1990',
    },
    curreri: { value: { kcalPerKg: 25, kcalPerTbsaPercent: 40, tbsaCapPercent: 50 }, sourceId: 'curreri1974',
      note: 'Known to overestimate requirements; TBSA cap of 50% is applied as specified.' },
    icuEspen: {
      value: {
        earlyKcalPerKg: { low: 20, high: 25 },
        laterKcalPerKg: { low: 25, high: 30 },
        earlyPhaseDays: 3,
        measuredEarlyFraction: 0.7,
        measuredLaterFraction: { low: 0.8, high: 1.0 },
      },
      sourceId: 'espenIcu2006',
      note: 'Measured-EE fractions (70% early, 80-100% after day 3) from ESPEN 2019.',
    },
    obesityAspen: {
      value: {
        class1to3: { bmiFrom: 30, bmiTo: 50, kcalPerKgActual: { low: 11, high: 14 } },
        superObese: { bmiAbove: 50, kcalPerKgIbw: { low: 22, high: 25 } },
      },
      sourceId: 'aspen2016',
    },
  },

  protein: {
    ward: { value: { low: 1.0, high: 1.5 }, sourceId: 'localPolicy', note: 'Range from module specification; supporting guideline citation TODO.' },
    icu: { value: { minGPerKg: 1.3 }, sourceId: 'espenIcu2019' },
    burnsAndLargeWounds: { value: { low: 1.5, high: 2.0 }, sourceId: 'espenBurns2013', note: 'Applied to large/heavily exuding wounds by local extension.' },
    obeseIcu: { value: { bmi30to40GPerKgIbw: 2.0, bmiFrom40GPerKgIbw: 2.5 }, sourceId: 'aspen2016' },
    ckdNonDialysis: { value: { nonDiabetic: { low: 0.55, high: 0.6 }, diabetic: { low: 0.6, high: 0.8 } }, sourceId: 'kdoqi2020' },
    wardObeseAdjustedFromBmi: { value: 30, sourceId: 'localPolicy' },
  },

  weightGoals: {
    kcalPerKg: { value: 7700, sourceId: 'wishnofsky1958' },
    lossDeficitKcal: { value: { low: 500, high: 1000, kgPerWeek: { low: 0.5, high: 1.0 } }, sourceId: 'nhlbi1998' },
    gainSurplusKcal: { value: { low: 300, high: 500, kgPerWeek: { low: 0.25, high: 0.5 } }, sourceId: 'localPolicy' },
    floorsKcal: { value: { female: 1200, male: 1500 }, sourceId: 'jensen2013' },
    maxProjectionWeeks: 104,
  },

  refeeding: {
    value: {
      highRiskAnyOne: { bmiBelow: 16, weightLossPercentAbove: 15, littleIntakeDaysAbove: 10 },
      highRiskAnyTwo: { bmiBelow: 18.5, weightLossPercentAbove: 10, littleIntakeDaysAbove: 5 },
      extremeRisk: { bmiBelow: 14, negligibleIntakeDaysAbove: 15 },
      startKcalPerKg: { high: 10, extreme: 5 },
      advanceDays: { min: 4, max: 7, default: 7 },
      limitedIntake: { littleIntakeDaysAbove: 5, firstDaysAtMostFraction: 0.5, days: 2 },
      checkLabsDailyForDays: 3,
    },
    sourceId: 'niceCg32',
    note: 'Default advance of 7 days (the slow end of 4-7) is a local choice.',
  },

  fluid: { value: { mlPerKg: { low: 30, high: 35 }, feverFlagAboveC: 38 }, sourceId: 'niceCg32' },

  micronutrients: {
    value: {
      wound_healing: [
        { nutrient: 'Zinc', rationale: 'Cofactor for collagen synthesis and cell proliferation; deficiency impairs healing.' },
        { nutrient: 'Vitamin C', rationale: 'Required for collagen hydroxylation.' },
        { nutrient: 'Vitamin A', rationale: 'Supports epithelialisation; relevant where steroids impair healing.' },
      ],
      burns: [
        { nutrient: 'Zinc, copper and selenium', rationale: 'Large exudative trace-element losses after major burns.' },
        { nutrient: 'Vitamin C', rationale: 'Collagen synthesis and antioxidant demand.' },
      ],
      refeeding_risk: [
        { nutrient: 'Thiamine and vitamin B complex', rationale: 'Give before and during the first days of feeding, per local protocol.' },
        { nutrient: 'Balanced multivitamin/trace element', rationale: 'Per local protocol during refeeding.' },
      ],
      alcohol_excess: [
        { nutrient: 'Thiamine', rationale: 'High risk of deficiency; per local protocol.' },
      ],
    },
    sourceId: 'espenMicronutrients2022',
    note: 'Priorities only — no doses. Prescribing follows local protocol.',
  },

  monitoring: {
    intakeBelowFraction: { value: 0.6, sourceId: 'localPolicy' },
    intakeConsecutiveDays: { value: 3, sourceId: 'localPolicy' },
    circumferenceDeclinePercent: { value: 5, sourceId: 'localPolicy' },
    negativeNitrogenConsecutive: { value: 2, sourceId: 'localPolicy' },
    prealbuminNoiseRelative: { value: 0.1, sourceId: 'localPolicy', note: 'Assay repeatability floor, not an MCID.' },
    crpNoiseRelative: { value: 0.1, sourceId: 'localPolicy', note: 'Assay repeatability floor, not an MCID.' },
    weightFasterThanPlannedTolerance: { value: 0.25, sourceId: 'localPolicy', note: 'Alert when the observed rate exceeds the plan by more than 25%.' },
    schedules: {
      value: {
        low: [
          { item: 'Nutrition screening (MUST)', frequency: 'Weekly while an inpatient' },
          { item: 'Weight', frequency: 'Weekly' },
        ],
        medium: [
          { item: 'Food/fluid intake chart', frequency: 'Daily for 3 days, then review' },
          { item: 'Weight', frequency: 'Twice weekly' },
          { item: 'Nutrition screening (MUST)', frequency: 'Weekly' },
        ],
        high: [
          { item: 'Food/fluid intake chart', frequency: 'Daily' },
          { item: 'Weight', frequency: 'Twice weekly (daily if fluid shifts expected)' },
          { item: 'MUAC and calf circumference', frequency: 'Weekly' },
          { item: 'Dietitian review', frequency: 'Within 24-48 hours, then per dietitian' },
        ],
        refeeding_high: [
          { item: 'Potassium, phosphate, magnesium', frequency: 'Before feeding, then daily for days 1-3, then per results' },
          { item: 'Fluid balance', frequency: 'Daily' },
          { item: 'Weight', frequency: 'Daily during the first week' },
          { item: 'Clinical review (oedema, cardiac, neurological)', frequency: 'Daily during the advance' },
        ],
      },
      sourceId: 'localPolicy',
      note: 'refeeding_high lab timing follows NICE CG32; the rest is local policy.',
    },
  },

  labs: {
    nitrogen: { value: { proteinToNitrogen: 6.25, insensibleLossG: 4, ureaMmolToNitrogenG: 0.028 }, sourceId: 'blackburn1977',
      note: '0.028 g N per mmol urea follows from 2 N atoms (28 g) per mole of urea.' },
    prealbuminCrpRatioThreshold: { value: null, sourceId: 'localPolicy', note: 'No validated cut-off configured; ratio is reported for trend only.' },
  },
};
