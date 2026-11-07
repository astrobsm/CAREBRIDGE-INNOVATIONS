/**
 * Unit tests: anthropometry, labs, fluid, micronutrients, config integrity.
 * Expected values are hand-calculated in the comments.
 */
import { describe, it, expect } from 'vitest';
import {
  bmiEstimate, bmiClass, idealBodyWeight, adjustedBodyWeight, heightFromKneeHeight, heightFromUlna, weightFromAnthropometry,
  bmiBandFromMuac, amputationAdjustedWeight, amputationAdjustedIbw, midArmMuscleCircumference, weightChanges, gripStrength,
  nitrogenBalance, prealbuminCrpRatio, normaliseAlbumin, estimateFluid, micronutrientPriorities,
  NUTRITION_CONFIG_V1, ACTIVE_NUTRITION_CONFIG, auditConfig,
} from '../engine';

describe('config v1', () => {
  it('is pending clinical validation and structurally consistent', () => {
    expect(ACTIVE_NUTRITION_CONFIG.validationStatus).toBe('pending_clinical_validation');
    expect(auditConfig(NUTRITION_CONFIG_V1)).toEqual([]);
  });

  it('every output carries the config version and resolved citations', () => {
    const e = bmiEstimate(70, 175);
    expect(e.configVersion).toBe('1.0.0');
    expect(e.sources[0]).toMatch(/calculationEngine/);
  });

  it('marks every source unverified until sign-off', () => {
    expect(Object.values(NUTRITION_CONFIG_V1.sources).every(s => s.verifiedAgainstPrimary === false)).toBe(true);
  });
});

describe('BMI, IBW, AdjBW (canonical calculationEngine)', () => {
  it('BMI 70 kg / 1.75 m = 22.857 → 22.9', () => {
    const e = bmiEstimate(70, 175);
    expect(e.value).toBe(22.9);
    expect(e.status).toBe('computed');
  });

  it('BMI reports what is missing, never a default', () => {
    const e = bmiEstimate(null, 175);
    expect(e.value).toBeNull();
    expect(e.missing).toEqual(['weightKg']);
    expect(e.warnings[0]).toMatch(/missing weightKg/);
  });

  it('BMI class keeps the WHO underweight grades', () => {
    expect(bmiClass(16.5)).toBe('Moderate underweight');
    expect(bmiClass(17.5)).toBe('Mild underweight');
    expect(bmiClass(22)).toBe('Normal');
  });

  it('Devine IBW: male 170 cm → 50 + 2.3 × (66.93 − 60) = 65.9', () => {
    expect(idealBodyWeight(170, 'male').value).toBe(65.9);
    // female 160 cm → 45.5 + 2.3 × (62.99 − 60) = 52.4
    expect(idealBodyWeight(160, 'female').value).toBe(52.4);
    expect(idealBodyWeight(170, null).missing).toEqual(['sex']);
  });

  it('AdjBW = IBW + 0.4 × (ABW − IBW): 120 kg, 170 cm male → 65.9 + 21.64 = 87.5, indicated', () => {
    const e = adjustedBodyWeight(120, 170, 'male');
    expect(e.value).toBe(87.5);
    expect(e.indicated).toBe(true);
  });

  it('AdjBW is not indicated at or below 120% IBW', () => {
    // IBW 65.9; 75 kg is 114% IBW. Canonical returns AdjBW 65.9 + 0.4 × 9.1 = 69.5
    const e = adjustedBodyWeight(75, 170, 'male');
    expect(e.indicated).toBe(false);
    expect(e.value).toBe(69.5);
  });
});

describe('height and weight from surrogate measures', () => {
  it('knee height, black man 45 y (Chumlea 1994): 73.42 + 1.79 × 52 = 166.5', () => {
    const e = heightFromKneeHeight({ kneeHeightCm: 52, ageYears: 45, sex: 'male' });
    expect(e.value).toBe(166.5);
    expect(e.equationId).toBe('kh_chumlea1994_black_m');
    expect(e.warnings.join(' ')).toMatch(/not yet verified/);
  });

  it('knee height, black woman 30 y: 68.10 + 1.86 × 50 − 0.06 × 30 = 159.3', () => {
    expect(heightFromKneeHeight({ kneeHeightCm: 50, ageYears: 30, sex: 'female' }).value).toBe(159.3);
  });

  it('knee height, NH black man 70 y (Chumlea 1998): 79.69 + 96.2 − 9.8 = 166.09 → 166.1', () => {
    expect(heightFromKneeHeight({ kneeHeightCm: 52, ageYears: 70, sex: 'male' }).value).toBe(166.1);
  });

  it('population is selectable; white man 45 y: 71.85 + 1.88 × 52 = 169.6', () => {
    expect(heightFromKneeHeight({ kneeHeightCm: 52, ageYears: 45, sex: 'male', population: 'non_hispanic_white' }).value).toBe(169.6);
  });

  it('a specific equation can be chosen: Chumlea 1985 men, 70 y: 64.19 − 2.8 + 105.04 = 166.43 → 166.4', () => {
    expect(heightFromKneeHeight({ kneeHeightCm: 52, ageYears: 70, sex: 'male', equationId: 'kh_chumlea1985_m' }).value).toBe(166.4);
  });

  it('Nigerian slot reports "equation not configured", not a number', () => {
    const e = heightFromKneeHeight({ kneeHeightCm: 52, ageYears: 45, sex: 'male', population: 'nigerian' });
    expect(e.value).toBeNull();
    expect(e.status).toBe('equation_not_configured');
    expect(e.warnings[0]).toBe('Equation not configured');
  });

  it('ulna (BAPEN table fit): man < 65, 26 cm → 79.2 + 93.6 = 172.8; woman ≥ 65, 24 cm → 80.4 + 78 = 158.4', () => {
    expect(heightFromUlna({ ulnaLengthCm: 26, ageYears: 45, sex: 'male' }).value).toBe(172.8);
    const f = heightFromUlna({ ulnaLengthCm: 24, ageYears: 70, sex: 'female' });
    expect(f.value).toBe(158.4);
    // Population requested was NH black; the equation is population-nonspecific — said so.
    expect(f.assumptions.join(' ')).toMatch(/derived in "general"/);
  });

  it('weight: Chumlea 1988 man 70 y: 0.98×31 + 1.16×52 + 1.73×24 + 0.37×12 − 81.69 = 54.97 → 55.0', () => {
    const e = weightFromAnthropometry({ ageYears: 70, sex: 'male', kneeHeightCm: 52, muacCm: 24, calfCm: 31, subscapularSkinfoldMm: 12 });
    expect(e.value).toBe(55);
    expect(e.equationId).toBe('wt_chumlea1988_m');
    expect(e.assumptions.join(' ')).toMatch(/not configured; next configured candidate used/);
  });

  it('weight for a 45-year-old: population equation not configured, no fallback outside its age range', () => {
    const e = weightFromAnthropometry({ ageYears: 45, sex: 'male', kneeHeightCm: 52, muacCm: 22 });
    expect(e.status).toBe('equation_not_configured');
    expect(e.value).toBeNull();
  });

  it('missing equation input is named', () => {
    const e = weightFromAnthropometry({ ageYears: 70, sex: 'male', kneeHeightCm: 52, muacCm: 24 });
    expect(e.missing).toEqual(['calfCm', 'subscapularSkinfoldMm']);
  });

  it('MUAC bands: < 23.5 → BMI likely < 20; > 32 → likely > 30', () => {
    expect(bmiBandFromMuac(22).value).toBe('bmi_likely_below_20');
    expect(bmiBandFromMuac(33).value).toBe('bmi_likely_above_30');
    expect(bmiBandFromMuac(27).value).toBe('indeterminate');
    expect(bmiBandFromMuac(null).missing).toEqual(['muacCm']);
  });
});

describe('amputation, MAMC, weight change, grip', () => {
  it('below-knee amputation (5.9%): 60 ÷ 0.941 = 63.76 → 63.8; IBW 65.9 × 0.941 = 62.0', () => {
    expect(amputationAdjustedWeight(60, ['lower_leg_with_foot']).value).toBe(63.8);
    expect(amputationAdjustedIbw(65.9, ['lower_leg_with_foot']).value).toBe(62);
  });

  it('bilateral: two entire legs (32%): 40 ÷ 0.68 = 58.8', () => {
    expect(amputationAdjustedWeight(40, ['entire_leg', 'entire_leg']).value).toBe(58.8);
  });

  it('unknown segment is reported, not ignored', () => {
    const e = amputationAdjustedWeight(60, ['toe']);
    expect(e.value).toBeNull();
    expect(e.status).toBe('equation_not_configured');
  });

  it('MAMC converts TSF mm → cm: 25 − π × 1.0 = 21.86 → 21.9', () => {
    expect(midArmMuscleCircumference(25, 10).value).toBe(21.9);
    expect(midArmMuscleCircumference(25, null).missing).toEqual(['tsfMm']);
    // 25 − π × 10 cm is negative: an implausible MUAC/TSF pair is refused, not reported
    expect(midArmMuscleCircumference(25, 100).value).toBeNull();
  });

  it('weight change over 1 week, 1 month and 3–6 months (negative = loss)', () => {
    const series = [
      { at: '2026-05-01', weightKg: 80 },
      { at: '2026-09-15', weightKg: 74 },
      { at: '2026-10-25', weightKg: 72 },
      { at: '2026-11-01', weightKg: 71 },
    ];
    const c = weightChanges(series);
    // 1 week: 72 → 71 = −1.39%
    expect(c.oneWeek.value).toBe(-1.39);
    // 1 month (21–40 d): 10-25 is 7 d, 09-15 is 47 d → none in window → not computable
    expect(c.oneMonth.status).toBe('not_computable');
    // 3–6 months (90–183 d): 05-01 is 184 d, just outside → not computable (no silent stretch)
    expect(c.threeToSixMonths.status).toBe('not_computable');
  });

  it('3–6 month window uses the earliest reading inside it: 80 → 70 = −12.5%', () => {
    const c = weightChanges([{ at: '2026-06-01', weightKg: 80 }, { at: '2026-07-01', weightKg: 78 }, { at: '2026-11-01', weightKg: 70 }]);
    expect(c.threeToSixMonths.value).toBe(-12.5);
    expect(c.threeToSixMonths.inputsUsed.fromAt).toBe('2026-06-01');
  });

  it('grip vs EWGSOP2 cut-offs (27 kg men, 16 kg women); norms not configured', () => {
    const m = gripStrength(25, 'male', 60);
    expect(m.value?.low).toBe(true);
    expect(m.value?.ageSexCentile).toBeNull();
    expect(m.warnings.join(' ')).toMatch(/norms not configured/);
    expect(gripStrength(18, 'female', 60).value?.low).toBe(false);
  });
});

describe('labs', () => {
  it('nitrogen balance = 90 ÷ 6.25 − (12 + 4) = 14.4 − 16 = −1.6', () => {
    expect(nitrogenBalance({ proteinIntakeG: 90, uunGPerDay: 12 }).value).toBe(-1.6);
  });

  it('nitrogen from urinary urea: 400 mmol × 0.028 = 11.2 g → 14.4 − 15.2 = −0.8', () => {
    expect(nitrogenBalance({ proteinIntakeG: 90, urinaryUreaMmolPerDay: 400 }).value).toBe(-0.8);
  });

  it('wound-loss term and burns warning: 14.4 − 16 − 2 = −3.6', () => {
    const e = nitrogenBalance({ proteinIntakeG: 90, uunGPerDay: 12, woundNitrogenLossG: 2, burnsOrHeavilyExudingWound: true });
    expect(e.value).toBe(-3.6);
    expect(e.warnings.join(' ')).toMatch(/wound-loss term included/);
    const noTerm = nitrogenBalance({ proteinIntakeG: 90, uunGPerDay: 12, burnsOrHeavilyExudingWound: true });
    expect(noTerm.warnings.join(' ')).toMatch(/NOT included/);
  });

  it('nitrogen balance names missing UUN', () => {
    expect(nitrogenBalance({ proteinIntakeG: 90 }).missing).toEqual(['uunGPerDay (or urinaryUreaMmolPerDay)']);
  });

  it('prealbumin/CRP with unit conversion: 15 mg/dL = 150 mg/L; CRP 5 mg/dL = 50 mg/L → 3', () => {
    expect(prealbuminCrpRatio({ value: 15, unit: 'mg/dL' }, { value: 5, unit: 'mg/dL' }).value).toBe(3);
    expect(prealbuminCrpRatio({ value: 150, unit: 'mg/L' }, { value: 50, unit: 'mg/L' }).value).toBe(3);
  });

  it('prealbumin/CRP refuses a missing or unknown unit', () => {
    expect(prealbuminCrpRatio({ value: 15 }, { value: 5, unit: 'mg/L' }).status).toBe('not_computable');
    expect(prealbuminCrpRatio({ value: 15, unit: 'furlongs' }, { value: 5, unit: 'mg/L' }).status).toBe('not_computable');
    expect(prealbuminCrpRatio({ value: 150, unit: 'mg/L' }, { value: 0, unit: 'mg/L' }).value).toBeNull();
  });

  it('albumin: g/L and g/dL both normalise to g/L; missing stays missing', () => {
    expect(normaliseAlbumin(35, 'g/L').gPerL).toBe(35);
    expect(normaliseAlbumin(3.5, 'g/dL').gPerL).toBe(35);
    expect(normaliseAlbumin(35).gPerL).toBe(35);
    expect(normaliseAlbumin(2.8).gPerL).toBe(28);
    expect(normaliseAlbumin(2.8).unitBasis).toBe('inferred_from_magnitude');
    expect(normaliseAlbumin(undefined).gPerL).toBeNull();
    expect(normaliseAlbumin(0).gPerL).toBeNull();
    expect(normaliseAlbumin(250, 'g/L').unitBasis).toBe('implausible');
  });
});

describe('fluid and micronutrients', () => {
  it('fluid 30–35 mL/kg: 70 kg → 2100–2450 mL', () => {
    expect(estimateFluid({ weightKg: 70 }).value).toEqual({ low: 2100, high: 2450 });
  });

  it('flags burns, fever and losses for review without changing the number', () => {
    const e = estimateFluid({ weightKg: 70 }, { burns: { tbsaPercent: 20 }, temperatureC: 38.6, abnormalFluidLosses: true });
    expect(e.value).toEqual({ low: 2100, high: 2450 });
    expect(e.warnings.length).toBe(3);
  });

  it('wound healing → zinc, vitamin C, vitamin A; recommendations not prescriptions', () => {
    const e = micronutrientPriorities(['wound_healing']);
    expect(e.value!.map(x => x.nutrient)).toEqual(['Zinc', 'Vitamin C', 'Vitamin A']);
    expect(e.assumptions.join(' ')).toMatch(/NOT prescriptions/);
    expect(JSON.stringify(e.value)).not.toMatch(/\d+\s*mg/);
  });
});
