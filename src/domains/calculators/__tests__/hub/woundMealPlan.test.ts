import { describe, it, expect } from 'vitest';
import { computeWoundMeal, woundMealDays, woundMealHubReport, type WoundMealInput } from '../../engine/hub/woundMealPlan';
import { calculateMifflinStJeorBMR, toSex } from '../../engine/calculationEngine';
import { reportProblems } from '../../report/format';
import { pdfText } from './nutritionPdfText';
import type { PatientCalculatorInfo } from '../../types';

const base: WoundMealInput = {
  weightKg: '70', heightCm: '170', ageYears: '50', sex: 'male', woundType: 'Diabetic foot ulcer',
  woundSize: 'large', woundDepth: 'full', healingStage: 'proliferative', activityLevel: 'sedentary',
  diabetic: true, pvd: false, malnourished: false, infected: true, steroids: false, ckd: false,
};
const patient: PatientCalculatorInfo = { name: 'Test Patient', age: '70', gender: 'elderly-male', comorbidities: ['Diabetes Mellitus'] };

describe('hub Wound meal plan', () => {
  it('builds the plan from the optimiser and a clean report', () => {
    const out = computeWoundMeal(base);
    if (!('result' in out)) throw new Error(out.errors.join());
    const r = out.result;
    expect(r.proteinNeeds).toBe(126); // 1.8 g/kg infected
    // The kidney warning now appears on the FIRST calculation (it read stale state).
    expect(r.warnings.join(' ')).toMatch(/kidney function/);
    expect(r.hydrationTips[0]).toMatch(/3\.0 litres/); // 70*35 + 500 = 2950 mL
    const small = computeWoundMeal({ ...base, weightKg: '70', woundSize: 'small' }); // 2450 mL: was "2 liters"
    if ('result' in small) expect(small.result.hydrationTips[0]).toMatch(/2\.5 litres/);
    expect(r.vitaminCTarget).toBe('500-1000 mg/day');
    expect(r.supplements[0]).toMatch(/1000 mg\/day/);
    const days = woundMealDays(r);
    expect(days.length).toBe(7);
    const rep = woundMealHubReport(r, base, patient, days);
    expect(reportProblems(rep)).toEqual([]);
    expect(pdfText(rep)).toContain('Wound healing meal plan');
  });

  it('an elderly man uses the male equation', () => {
    const out = computeWoundMeal({ ...base, sex: toSex(patient.gender), ageYears: '70' });
    if (!('result' in out)) throw new Error('expected result');
    const bmr = calculateMifflinStJeorBMR('male', 70, 170, 70);
    expect(out.result.calorieNeeds).toBe(Math.round(bmr * 1.3 * (1.5 + 0.1 + 0.2)));
  });

  it('CKD warns and adds the dietary limits', () => {
    const out = computeWoundMeal({ ...base, ckd: true });
    if (!('result' in out)) throw new Error('expected result');
    expect(out.result.warnings.join(' ')).toMatch(/Chronic kidney disease/);
    expect(out.result.foodsToAvoid.join(' ')).toMatch(/CKD/);
    expect(reportProblems(woundMealHubReport(out.result, base, undefined, []))).toEqual([]);
  });

  it.each([
    ['no wound type', { woundType: '' }],
    ['weight out of range', { weightKg: '5' }],
    ['height blank', { heightCm: '' }],
  ])('validates: %s', (_n, over) => {
    expect('errors' in computeWoundMeal({ ...base, ...over })).toBe(true);
  });
});
