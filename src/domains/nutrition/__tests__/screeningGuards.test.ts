/**
 * Unit tests: MUST, NRS-2002, SGA, GLIM, NUTRIC, population guards.
 */
import { describe, it, expect } from 'vitest';
import {
  mustBmiScore, mustWeightLossScore, weightLossPercent, screenMust, screenNrs2002, evaluateSga, diagnoseGlim, scoreNutric,
  checkPopulation, assessNutrition, REFER_MESSAGE,
} from '../engine';

describe('MUST step scores', () => {
  it('BMI: > 20 → 0; 18.5–20 → 1; < 18.5 → 2', () => {
    expect(mustBmiScore(20.1)).toBe(0);
    expect(mustBmiScore(20)).toBe(1);
    expect(mustBmiScore(18.5)).toBe(1);
    expect(mustBmiScore(18.4)).toBe(2);
  });

  it('weight loss: < 5% → 0; 5–10% → 1; > 10% → 2', () => {
    expect(mustWeightLossScore(4.9)).toBe(0);
    expect(mustWeightLossScore(5)).toBe(1);
    expect(mustWeightLossScore(10)).toBe(1);
    expect(mustWeightLossScore(10.1)).toBe(2);
  });

  it('a weight GAIN scores 0 (the MUSTCalculator Math.abs bug)', () => {
    // 60 → 67 kg: loss = (60 − 67) ÷ 60 = −11.7% (a gain)
    const pct = weightLossPercent(60, 67)!;
    expect(pct).toBeCloseTo(-11.67, 1);
    expect(mustWeightLossScore(pct)).toBe(0);
    expect(mustWeightLossScore(Math.abs(pct))).toBe(2); // what the bug produced
  });
});

describe('screenMust', () => {
  it('complete: BMI 17.5 (2) + loss 12% (2) + acute (2) = 6, high; uses canonical interpretMust', () => {
    const e = screenMust({ bmi: 17.5, weightLossPercent3to6m: 12, acuteDiseaseEffect: true });
    expect(e.value?.total).toBe(6);
    expect(e.value?.complete).toBe(true);
    expect(e.value?.risk.riskLevel).toBe('high');
  });

  it('derives BMI from weight and height: 50 kg, 165 cm → 18.4 → 2', () => {
    expect(screenMust({ weightKg: 50, heightCm: 165, weightLossPercent3to6m: 0, acuteDiseaseEffect: false }).value?.components.bmi_score).toBe(2);
  });

  it('MUAC route when weight unknown: MUAC 22 → BMI score 1 (minimum), flagged', () => {
    const e = screenMust({ muacCm: 22, weightLossPercent3to6m: 0, acuteDiseaseEffect: false });
    expect(e.value?.components.bmi_score).toBe(1);
    expect(e.warnings.join(' ')).toMatch(/may be 2/);
  });

  it('an unassessed component is missing, not zero: total is a minimum', () => {
    const e = screenMust({ bmi: 22 });
    expect(e.value?.total).toBe(0);
    expect(e.value?.complete).toBe(false);
    expect(e.missing).toEqual(['weightLossPercent3to6m', 'acuteDiseaseEffect']);
    expect(e.value?.risk.interpretation).toMatch(/^At least/);
  });

  it('nothing assessable → not computable', () => {
    expect(screenMust({}).status).toBe('not_computable');
  });
});

describe('NRS-2002', () => {
  it('age 72, BMI 19 + impaired condition (2), disease 2, +1 for age = 5, at risk', () => {
    const e = screenNrs2002({ ageYears: 72, bmi: 19, generalConditionImpaired: true, diseaseSeverityScore: 2,
      weightLossPercent: 0, weightLossOverMonths: 3, intakePercentOfRequirementLastWeek: 80 });
    expect(e.value).toMatchObject({ nutritionalStatusScore: 2, diseaseSeverityScore: 2, ageAdjustment: 1, total: 5, atRisk: true, initialScreenPositive: true });
  });

  it('weight loss > 5% in 1 month → 3; intake 50% → 2; takes the highest', () => {
    const e = screenNrs2002({ ageYears: 40, bmi: 23, weightLossPercent: 6, weightLossOverMonths: 1, intakePercentOfRequirementLastWeek: 50, diseaseSeverityScore: 0 });
    expect(e.value?.nutritionalStatusScore).toBe(3);
    expect(e.value?.total).toBe(3);
  });

  it('missing disease severity → no total, but partial ≥ 3 is already at risk', () => {
    const e = screenNrs2002({ ageYears: 75, bmi: 23, intakePercentOfRequirementLastWeek: 20 });
    expect(e.value?.total).toBeNull();
    expect(e.value?.atRisk).toBe(true); // 3 + 1 (age) ≥ 3
    expect(e.missing).toContain('diseaseSeverityScore');
  });

  it('low BMI without a general-condition assessment is not silently scored', () => {
    const e = screenNrs2002({ ageYears: 40, bmi: 19, diseaseSeverityScore: 1 });
    expect(e.warnings.join(' ')).toMatch(/general condition not recorded/);
  });
});

describe('SGA', () => {
  it('is never derived: no clinician rating → not assessed', () => {
    const e = evaluateSga({ weightLoss6MonthsPercent: 12, muscleWasting: 3 });
    expect(e.value).toBeNull();
    expect(e.missing).toEqual(['clinicianRating', 'assessedBy']);
    expect(e.warnings.join(' ')).toMatch(/never derived from another score/);
  });

  it('returns the clinician rating and checks it for consistency', () => {
    const e = evaluateSga({ clinicianRating: 'A', assessedBy: 'Dr O', weightLoss6MonthsPercent: 12 });
    expect(e.value).toBe('A');
    expect(e.warnings.join(' ')).toMatch(/please confirm/);
  });
});

describe('GLIM', () => {
  it('12% loss in 4 months + acute inflammation → malnutrition, stage 2 (severe)', () => {
    const e = diagnoseGlim({ ageYears: 50, weightLossPercent: 12, weightLossOverMonths: 4, bmi: 22, muscleMass: 'normal',
      intakePercentOfRequirement: 100, reducedIntakeDays: 0, chronicGiMalabsorption: false, inflammation: 'acute', screeningPositive: true });
    expect(e.value).toMatchObject({ diagnosed: true, severity: 'stage2_severe' });
  });

  it('6% loss in 5 months + BMI 19 (< 20, ≥ 18.5) + intake 40% for 10 days → stage 1 (moderate)', () => {
    const e = diagnoseGlim({ ageYears: 50, weightLossPercent: 6, weightLossOverMonths: 5, bmi: 19, muscleMass: 'normal',
      intakePercentOfRequirement: 40, reducedIntakeDays: 10, chronicGiMalabsorption: false, inflammation: 'none', screeningPositive: true });
    expect(e.value).toMatchObject({ diagnosed: true, severity: 'stage1_moderate' });
    expect(e.value?.phenotypic.length).toBe(2);
  });

  it('BMI cut-off moves at 70: BMI 21 is phenotypic at 75 but not at 50', () => {
    const common = { weightLossPercent: 0, weightLossOverMonths: 6, bmi: 21, muscleMass: 'normal' as const, inflammation: 'chronic' as const,
      intakePercentOfRequirement: 100, reducedIntakeDays: 0, chronicGiMalabsorption: false };
    expect(diagnoseGlim({ ...common, ageYears: 75 }).value?.diagnosed).toBe(true);
    expect(diagnoseGlim({ ...common, ageYears: 50 }).value?.diagnosed).toBe(false);
  });

  it('cannot exclude malnutrition with unassessed criteria', () => {
    const e = diagnoseGlim({ ageYears: 50, bmi: 24 });
    expect(e.value?.diagnosed).toBeNull();
  });
});

describe('NUTRIC', () => {
  // age 60 → 1; APACHE 22 → 2; SOFA 7 → 1; comorbidities 2 → 1; days 0 → 0
  const base = { ageYears: 60, apacheII: 22, sofa: 7, comorbidityCount: 2, daysHospitalToIcu: 0 };

  it('modified NUTRIC without IL-6: 5 → high risk (≥ 5)', () => {
    const e = scoreNutric(base);
    expect(e.value).toMatchObject({ score: 5, modified: true, highRisk: true });
    expect(e.method).toMatch(/Modified/);
  });

  it('full NUTRIC with IL-6 500 (1 point): 6 → high risk (≥ 6)', () => {
    expect(scoreNutric({ ...base, il6: 500 }).value).toMatchObject({ score: 6, modified: false, highRisk: true });
  });

  it('APACHE 28 → 3 points; SOFA 10 → 2; age 75 → 2', () => {
    const e = scoreNutric({ ageYears: 75, apacheII: 28, sofa: 10, comorbidityCount: 0, daysHospitalToIcu: 2 });
    expect(e.value?.components).toMatchObject({ age: 2, apacheII: 3, sofa: 2, comorbidities: 0, daysHospitalToIcu: 1 });
  });

  it('names missing components', () => {
    expect(scoreNutric({ ageYears: 60 }).missing).toEqual(['apacheII', 'sofa', 'comorbidityCount', 'daysHospitalToIcu']);
  });
});

describe('population guards', () => {
  const adult = { ageYears: 40, sex: 'female' as const, pregnant: false, lactating: false, dialysis: false, parenteralNutrition: false };

  it.each([
    ['child', { ...adult, ageYears: 16 }],
    ['pregnancy', { ...adult, pregnant: true }],
    ['lactation', { ...adult, lactating: true }],
    ['dialysis', { ...adult, dialysis: true }],
    ['parenteral_nutrition', { ...adult, parenteralNutrition: true }],
  ])('refers for %s', (reason, p) => {
    const g = checkPopulation(p);
    expect(g.status).toBe('refer');
    if (g.status === 'refer') {
      expect(g.reasons).toContain(reason);
      expect(g.reason).toContain(REFER_MESSAGE);
      expect(g.message).toBe('Specialist dietitian/physician input required');
    }
  });

  it('18 is an adult', () => {
    expect(checkPopulation({ ...adult, ageYears: 18 }).status).toBe('eligible');
  });

  it('missing age or sex is insufficient, not assumed', () => {
    const g = checkPopulation({ sex: 'male' });
    expect(g.status).toBe('insufficient');
    if (g.status === 'insufficient') expect(g.missing).toEqual(['ageYears']);
  });

  it('unrecorded pregnancy status in a woman of child-bearing age is warned about', () => {
    const g = checkPopulation({ ageYears: 30, sex: 'female' });
    expect(g.status).toBe('eligible');
    if (g.status === 'eligible') expect(g.warnings.join(' ')).toMatch(/Pregnancy status not recorded/);
  });

  it('assessNutrition returns only the referral for an excluded patient', () => {
    const r = assessNutrition({ patient: { ...adult, dialysis: true, weightKg: 60, heightCm: 160 } });
    expect(r.status).toBe('refer');
    expect('energy' in r).toBe(false);
  });
});
