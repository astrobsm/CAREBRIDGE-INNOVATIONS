import { describe, it, expect } from 'vitest';
import { computeWeightLoss, weightLossDays, weightLossReport, monthsFromWeeks, type WeightLossInput } from '../../engine/hub/weightLoss';
import { computeWeightGain, weightGainReport, weightGainDays, type WeightGainInput } from '../../engine/hub/weightGain';
import { calculateMifflinStJeorBMR, toSex } from '../../engine/calculationEngine';
import { reportProblems } from '../../report/format';
import { pdfText } from './nutritionPdfText';
import type { PatientCalculatorInfo } from '../../types';

const loss: WeightLossInput = {
  currentWeightKg: '100', targetWeightKg: '79.7', heightCm: '170', ageYears: '45', sex: 'female',
  activityLevel: 'light', rate: 'moderate', diabetes: false, hypertension: false,
};
const gain: WeightGainInput = {
  currentWeightKg: '45', targetWeightKg: '55', heightCm: '172', ageYears: '30', sex: 'male', activityLevel: 'light',
  rate: 'moderate', malnourished: false, postSurgery: false, chronicDisease: false, diabetes: false,
};
const patient: PatientCalculatorInfo = { name: 'Test Patient', age: '70', gender: 'elderly-male', comorbidities: ['Diabetes Mellitus'] };

describe('hub Weight loss', () => {
  it('builds a clean report with a seven-day optimiser plan; weight change is rounded', () => {
    const out = computeWeightLoss(loss);
    if (!('result' in out)) throw new Error(out.errors.join());
    expect(out.result.weightChange).toBe(20.3);
    expect(out.result.bmr).toBe(Math.round(calculateMifflinStJeorBMR('female', 100, 170, 45)));
    const days = weightLossDays(out.result);
    expect(days.length).toBe(7);
    const r = weightLossReport(out.result, loss, patient, days);
    expect(reportProblems(r)).toEqual([]);
    expect(pdfText(r)).toContain('Weight loss plan');
  });

  it('the timeline follows the deficit the calorie floor allows', () => {
    // Small sedentary woman: TDEE is near the 1200 kcal floor, so the 1 kg/week deficit cannot be prescribed.
    const input = { ...loss, currentWeightKg: '62', targetWeightKg: '57', heightCm: '150', ageYears: '60', activityLevel: 'sedentary', rate: 'aggressive' };
    const out = computeWeightLoss(input);
    if (!('result' in out)) throw new Error(out.errors.join());
    const r = out.result;
    expect(r.targetCalories).toBe(1200);
    expect(r.dailyDeficit).toBe(r.tdee - 1200);
    expect(r.dailyDeficit).toBeLessThan(r.requestedDailyDeficit);
    expect(r.weeklyRate).toBeLessThan(1);
    expect(r.weeksNeeded).toBe(Math.ceil(5 / ((r.dailyDeficit * 7) / 7700)));
    expect(r.warnings.join(' ')).toMatch(/minimum intake limits the deficit/);
    expect(reportProblems(weightLossReport(r, input, undefined, null))).toEqual([]);
  });

  it('says so when diet alone gives no deficit', () => {
    const input = { ...loss, currentWeightKg: '50', targetWeightKg: '45', heightCm: '145', ageYears: '80', activityLevel: 'sedentary' };
    const out = computeWeightLoss(input);
    if (!('result' in out)) throw new Error(out.errors.join());
    expect(out.result.timelineAchievable).toBe(false);
    expect(out.result.monthsNeeded).toBe(0);
    const r = weightLossReport(out.result, input, undefined, null);
    expect(reportProblems(r)).toEqual([]);
    expect(r.results.find(f => f.label === 'Timeline')!.value).toMatch(/Not achievable/);
  });

  it('months are never 0 for a non-zero goal', () => {
    expect(monthsFromWeeks(1)).toBe(0.5);
    expect(monthsFromWeeks(9)).toBe(2);
  });

  it.each([
    ['target above current', { targetWeightKg: '110' }],
    ['blank target', { targetWeightKg: '' }],
    ['height 0', { heightCm: '0' }],
  ])('validates: %s', (_n, over) => {
    expect('errors' in computeWeightLoss({ ...loss, ...over })).toBe(true);
  });

  it('an elderly man uses the male equation', () => {
    const out = computeWeightLoss({ ...loss, sex: toSex(patient.gender), ageYears: '70' });
    if (!('result' in out)) throw new Error('expected result');
    expect(out.result.bmr).toBe(Math.round(calculateMifflinStJeorBMR('male', 100, 170, 70)));
  });
});

describe('hub Weight gain', () => {
  it('BMI < 16: high refeeding risk, stepped schedule, no full surplus on day 1', () => {
    const input = { ...gain, currentWeightKg: '42', targetWeightKg: '55' }; // BMI 14.2
    const out = computeWeightGain(input);
    if (!('result' in out)) throw new Error(out.errors.join());
    const r = out.result;
    expect(['high', 'extreme']).toContain(r.refeedingLevel);
    expect(r.refeedingDays.length).toBeGreaterThan(1);
    expect(r.refeedingDays[0].kcal).toBeLessThan(r.targetCalories);
    expect(r.warnings.join(' ')).toMatch(/do not start at/);
    const days = weightGainDays(r);
    expect(days.length).toBe(7);
    const rep = weightGainReport(r, input, patient, days);
    expect(reportProblems(rep)).toEqual([]);
    expect(rep.plan!.monitoring.length).toBeGreaterThan(0);
    expect(pdfText(rep)).toContain('Weight gain plan');
  });

  it('a normal-BMI gain has no refeeding schedule and months > 0', () => {
    const input = { ...gain, currentWeightKg: '60', targetWeightKg: '61' };
    const out = computeWeightGain(input);
    if (!('result' in out)) throw new Error(out.errors.join());
    expect(out.result.refeedingDays).toEqual([]);
    expect(out.result.monthsNeeded).toBeGreaterThan(0);
    expect(reportProblems(weightGainReport(out.result, input, undefined, null))).toEqual([]);
  });

  it.each([
    ['target below current', { targetWeightKg: '40' }],
    ['age blank', { ageYears: '' }],
  ])('validates: %s', (_n, over) => {
    expect('errors' in computeWeightGain({ ...gain, ...over })).toBe(true);
  });
});
