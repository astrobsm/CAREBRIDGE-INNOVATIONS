import { describe, it, expect } from 'vitest';
import {
  computeNutritionHub, nutritionHubDays, nutritionHubInputFromPatient, nutritionHubReport, type NutritionHubInput,
} from '../../engine/hub/nutrition';
import { calculateHarrisBenedictBMR, calculateNutrition } from '../../engine/calculationEngine';
import { reportProblems } from '../../report/format';
import { pdfText } from './nutritionPdfText';
import type { PatientCalculatorInfo } from '../../types';

const base: NutritionHubInput = {
  weightKg: '70', heightCm: '170', ageYears: '45', sex: 'male', activityLevel: 'bedridden', stressFactor: 'moderate',
  woundHealing: true, burns: false, burnsTBSA: '', sepsis: false, postSurgery: true, renalDisease: false,
  liverDisease: false, malnourished: false, diabetes: false,
};
const elderly: PatientCalculatorInfo = { name: 'Test Patient', age: '72', gender: 'elderly-male', comorbidities: ['Diabetes Mellitus'] };

describe('hub Nutrition', () => {
  it('uses the canonical calculateNutrition (same numbers as the engine)', () => {
    const out = computeNutritionHub(base);
    if (!('result' in out)) throw new Error(out.errors.join());
    const e = calculateNutrition({ weightKg: 70, heightCm: 170, ageYears: 45, sex: 'male', activityFactor: 1.2, stressFactor: 1.25, proteinFactor: 1.5 });
    expect(out.result.tdee).toBe(e.tdee);
    expect(out.result.proteinNeeds).toBe(105);
    expect(out.result.carbNeeds).toBe(e.carbGrams);
  });

  it('an elderly man is scored with the male equation, and "Diabetes Mellitus" is detected', () => {
    const fromPatient = nutritionHubInputFromPatient(elderly);
    expect(fromPatient.sex).toBe('male');
    expect(fromPatient.diabetes).toBe(true);
    const out = computeNutritionHub({ ...base, ageYears: '72', sex: fromPatient.sex, diabetes: fromPatient.diabetes });
    if (!('result' in out)) throw new Error('expected result');
    expect(out.result.bmr).toBe(Math.round(calculateHarrisBenedictBMR('male', 70, 170, 72)));
    expect(out.result.specialConsiderations.join(' ')).toMatch(/Carbohydrate counting/);
  });

  it('builds a seven-day optimiser plan and a clean, exportable report', () => {
    const input = { ...base, diabetes: true };
    const out = computeNutritionHub(input);
    if (!('result' in out)) throw new Error('expected result');
    const days = nutritionHubDays(out.result);
    expect(days.length).toBe(7);
    const r = nutritionHubReport(out.result, input, elderly, days);
    expect(reportProblems(r)).toEqual([]);
    expect(r.plan!.sections.filter(s => /kcal/.test(s.title)).length).toBe(7);
    expect(pdfText(r)).toContain('Clinical nutrition requirements');
  });

  it('labels the burns fluid as a resuscitation-phase volume', () => {
    const input = { ...base, burns: true, burnsTBSA: '20' };
    const out = computeNutritionHub(input);
    if (!('result' in out)) throw new Error('expected result');
    expect(out.result.fluidNeeds).toBe(4 * 70 * 20 + 30 * 70);
    expect(out.result.fluidCaution).toMatch(/Burns calculator/);
    const r = nutritionHubReport(out.result, input, undefined, []);
    expect(reportProblems(r)).toEqual([]);
    expect(r.plan!.sections.some(s => /could not build/.test(s.items.join(' ')))).toBe(true);
  });

  it.each([
    ['blank weight', { weightKg: '' }],
    ['height 0', { heightCm: '0' }],
    ['child', { ageYears: '10' }],
    ['burns without TBSA', { burns: true, burnsTBSA: '' }],
    ['burns TBSA > 100', { burns: true, burnsTBSA: '150' }],
  ])('validates: %s', (_n, over) => {
    expect('errors' in computeNutritionHub({ ...base, ...over })).toBe(true);
  });
});
