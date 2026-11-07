/**
 * Safety bugs found by the nutrition survey, fixed in stage 1.
 *
 * The UI components cannot be rendered in the node test environment, so the
 * component fixes are covered two ways: the pure function they now call is
 * tested for behaviour, and the component source is checked so the buggy
 * expression cannot quietly come back.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mustWeightLossScore, weightLossPercent, storedSgaGrade } from '../engine';
import { calculateLimbSalvageScore, assessNutritionalComponent, generateRecommendations } from '../../../services/limbSalvageService';

const src = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf-8');

describe('MUSTCalculator: weight GAIN was scored as loss (Math.abs)', () => {
  it('a 12% gain scores 0 and a 12% loss scores 2', () => {
    // previous 60 → current 67.2: loss% = (60 − 67.2) ÷ 60 = −12%
    expect(mustWeightLossScore(weightLossPercent(60, 67.2)!)).toBe(0);
    // previous 60 → current 52.8: loss% = +12%
    expect(mustWeightLossScore(weightLossPercent(60, 52.8)!)).toBe(2);
  });

  it('the calculator scores through the engine, without Math.abs', () => {
    const s = src('../../calculators/pages/calculators/MUSTCalculator.tsx');
    expect(s).toMatch(/mustWeightLossScore\(weightLossPercent\)/);
    expect(s).not.toMatch(/WeightLossScore\(Math\.abs/);
  });
});

describe('limbSalvageService: albumin read as g/dL and defaulted to 4 when missing', () => {
  it('a g/L value is no longer read as normal: 28 g/L → 2 points (was 0)', () => {
    expect(assessNutritionalComponent({ albumin: 28, mustScore: 0 }).score).toBe(2);
    expect(assessNutritionalComponent({ albumin: 28, mustScore: 0 }).albuminGPerL).toBe(28);
  });

  it('g/dL entries still score the same: 2.8 g/dL = 28 g/L → 2; 2.4 → 3; 3.2 → 1; 3.6 → 0', () => {
    expect(assessNutritionalComponent({ albumin: 2.8, mustScore: 0 }).score).toBe(2);
    expect(assessNutritionalComponent({ albumin: 2.4, mustScore: 0 }).score).toBe(3);
    expect(assessNutritionalComponent({ albumin: 3.2, mustScore: 0 }).score).toBe(1);
    expect(assessNutritionalComponent({ albumin: 3.6, mustScore: 0 }).score).toBe(0);
  });

  it('a missing albumin is reported as missing, not as normal', () => {
    const r = assessNutritionalComponent({ mustScore: 1 });
    expect(r.albuminGPerL).toBeNull();
    expect(r.missing).toEqual(['albumin']);
    const total = calculateLimbSalvageScore({ mustScore: 1 });
    expect(total.missingInputs).toContain('albumin');
  });

  it('a missing MUST score is reported as missing too', () => {
    expect(assessNutritionalComponent({ albumin: 40 }).missing).toEqual(['mustScore']);
  });

  it('the low-albumin recommendation fires for 28 g/L and quotes g/L', () => {
    const recs = generateRecommendations({ albumin: 28 });
    const r = recs.find(x => /Nutritional supplementation/.test(x.recommendation));
    expect(r?.rationale).toBe('Low albumin (28 g/L) impairs wound healing');
    expect(generateRecommendations({}).some(x => /Nutritional supplementation/.test(x.recommendation))).toBe(false);
  });

  it('the form no longer defaults albumin to 4.0', () => {
    const s = src('../../limb-salvage/components/LimbSalvageForm.tsx');
    expect(s).not.toMatch(/albumin:\s*4\.0/);
    expect(s).not.toMatch(/formData\.albumin \|\| 4/);
  });
});

describe('NutritionPage: SGA grade was derived from the MUST score', () => {
  it('legacy MUST-derived grades read as not assessed; form grades are shown', () => {
    expect(storedSgaGrade({ sgaGrade: 'A' })).toBeNull();
    expect(storedSgaGrade({ sgaGrade: 'C', sgaSource: null })).toBeNull();
    expect(storedSgaGrade({ sgaGrade: 'B', sgaSource: 'sga_form' })).toBe('B');
    expect(storedSgaGrade({ sgaSource: 'sga_form' })).toBeNull();
  });

  it('the page no longer maps MUST to an SGA grade', () => {
    const s = src('../pages/NutritionPage.tsx');
    expect(s).not.toMatch(/sgaGrade:\s*mustScore/);
    expect(s).toMatch(/storedSgaGrade\(assessment\)/);
  });
});
