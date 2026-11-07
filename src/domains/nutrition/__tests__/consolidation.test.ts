/**
 * Duplicates re-pointed to the canonical functions / nutrition engine.
 * Each test pins the re-pointed function to the engine, and the behaviour
 * changes are asserted explicitly so they are visible, not incidental.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateAdjustedBodyWeight, adjustedBodyWeightFromIbw, calculateHarrisBenedictBMR, calculateIdealBodyWeight,
} from '../../calculators/engine/calculationEngine';
import { nutritionPlannerService } from '../../../services/nutritionPlannerService';
import { calculateIBW, calculateAdjustedWeight, getDosingWeight } from '../../../services/patientCategoryService';
import { basalMetabolicRate, weightReductionPlan } from '../../clinician-assistant/services/calculators';
import { burnCareService as assistantBurns } from '../../clinician-assistant/services/burnCalculators';
import { burnCareService } from '../../../services/burnCareService';
import { calculateBurnNutrition } from '../../burns/services/burnScoringService';
import { curreriKcal, curreri, NUTRITION_CONFIG_V1, screenMust } from '../engine';

describe('canonical extension: adjustedBodyWeightFromIbw', () => {
  it('matches calculateAdjustedBodyWeight and the config fraction', () => {
    const ibw = calculateIdealBodyWeight(170, 'male')!;
    expect(adjustedBodyWeightFromIbw(120, ibw)).toBe(calculateAdjustedBodyWeight(120, 170, 'male'));
    const f = NUTRITION_CONFIG_V1.anthropometry.adjustedBodyWeight.value.fraction;
    expect(adjustedBodyWeightFromIbw(120, ibw)).toBeCloseTo(ibw + f * (120 - ibw), 1);
    expect(adjustedBodyWeightFromIbw(60, ibw)).toBe(60);
  });
});

describe('nutritionPlannerService → canonical + engine', () => {
  it('BMI, IBW, AdjBW, Harris-Benedict come from calculationEngine', () => {
    expect(nutritionPlannerService.calculateBMI(70, 175)).toEqual({ bmi: 22.9, category: 'Normal' });
    expect(nutritionPlannerService.calculateIdealBodyWeight(170, true)).toBe(calculateIdealBodyWeight(170, 'male'));
    expect(nutritionPlannerService.calculateAdjustedBodyWeight(120, 65.9)).toBe(87.5);
    expect(nutritionPlannerService.calculateCaloricRequirements(70, 175, 40, true, 1.2, 1.0))
      .toBe(Math.round(calculateHarrisBenedictBMR('male', 70, 175, 40) * 1.2));
  });

  it('keeps the WHO underweight grades; obesity labels now follow the canonical bmiCategory', () => {
    expect(nutritionPlannerService.calculateBMI(48, 170).category).toBe('Moderate underweight'); // 16.6
    expect(nutritionPlannerService.calculateBMI(95, 170).category).toBe('Obese (Class I)'); // was 'Obese Class I'
  });

  it('MUST agrees with the engine screen', () => {
    const m = nutritionPlannerService.calculateMUSTScore(17.5, 12, true, true);
    expect(m.totalScore).toBe(screenMust({ bmi: 17.5, weightLossPercent3to6m: 12, acuteDiseaseEffect: true }).value!.total);
    expect(m.risk).toBe('high');
  });

  it('protein factors from config — BEHAVIOUR CHANGES: normal 0.8 → 1.0, critical 1.5 → 1.3 g/kg', () => {
    expect(nutritionPlannerService.calculateProteinRequirements(70, 'normal')).toEqual({ grams: 70, gramsPerKg: 1.0 });
    expect(nutritionPlannerService.calculateProteinRequirements(70, 'critical')).toEqual({ grams: 91, gramsPerKg: 1.3 });
    // unchanged
    expect(nutritionPlannerService.calculateProteinRequirements(70, 'wound_healing').gramsPerKg).toBe(1.5);
    expect(nutritionPlannerService.calculateProteinRequirements(70, 'burns').gramsPerKg).toBe(2.0);
    expect(nutritionPlannerService.calculateProteinRequirements(70, 'renal').gramsPerKg).toBe(0.6);
  });

  it('fluid 30 mL/kg from config; AdjBW still reported only above 120% IBW', () => {
    expect(nutritionPlannerService.calculateFluidRequirements(70)).toBe(2100);
    const base = { patientId: 'p', assessedBy: 'u', height: 170, age: 50, isMale: true, appetiteLevel: 'good' as const,
      currentFeedingRoute: 'oral' as const, estimatedIntake: 100 };
    expect(nutritionPlannerService.createAssessment({ ...base, weight: 75 }).adjustedBodyWeight).toBeUndefined();
    expect(nutritionPlannerService.createAssessment({ ...base, weight: 120 }).adjustedBodyWeight).toBe(87.5);
  });
});

describe('clinician-assistant calculators → canonical revised Harris-Benedict', () => {
  it('BEHAVIOUR CHANGE: original-1919 (rounded) → revised equation', () => {
    expect(basalMetabolicRate(70, 175, 40, 'male')).toBe(calculateHarrisBenedictBMR('male', 70, 175, 40));
    expect(basalMetabolicRate(70, 175, 40, 'unspecified')).toBe(calculateHarrisBenedictBMR('male', 70, 175, 40));
  });

  it('weight-loss floors come from config (1200 / 1500)', () => {
    expect(weightReductionPlan({ weightKg: 45, heightCm: 150, ageYears: 65, sex: 'female', activity: 'sedentary' }).targetCalories)
      .toBe(NUTRITION_CONFIG_V1.weightGoals.floorsKcal.value.female);
  });
});

describe('Curreri copies → engine', () => {
  it('all three services agree with the engine at 30% TBSA (25×70 + 40×30 = 2950)', () => {
    expect(curreriKcal(70, 30)).toBe(2950);
    expect(curreri({ weightKg: 70 }, { burns: { tbsaPercent: 30 } }).value).toBe(2950);
    expect(assistantBurns.calculateNutritionTargets(70, 30).caloriesPerDay).toBe(2950);
    expect(burnCareService.calculateNutrition(70, 30, 35).caloriesPerDay).toBe(2950);
    expect(calculateBurnNutrition(70, 30).caloricTarget).toBe(2950);
  });

  it('BEHAVIOUR CHANGE: TBSA capped at 50% — 70% TBSA gives 1750 + 2000 = 3750 (was 4550)', () => {
    expect(assistantBurns.calculateNutritionTargets(70, 70).caloriesPerDay).toBe(3750);
    expect(assistantBurns.calculateNutritionTargets(70, 70).formula).toMatch(/capped at 50%/);
    expect(burnCareService.calculateNutrition(70, 70, 35).caloriesPerDay).toBe(3750);
    expect(burnCareService.calculateNutrition(70, 70, 35).formula).toMatch(/capped at 50%/);
    expect(calculateBurnNutrition(70, 70).caloricTarget).toBe(3750);
  });

  it('protein from the config burns range (1.5 / 2.0 g/kg), unchanged values', () => {
    expect(burnCareService.calculateNutrition(70, 30, 35).proteinPerDay).toBe(140);
    expect(burnCareService.calculateNutrition(70, 15, 35).proteinPerDay).toBe(105);
    expect(calculateBurnNutrition(70, 30).proteinTarget).toBe(140);
    expect(assistantBurns.calculateNutritionTargets(70, 30).proteinPerDay).toBe(105);
  });

  it('paediatric branches of burnCareService are untouched (adult engine only)', () => {
    expect(burnCareService.calculateNutrition(20, 10, 8).formula).toBe('Curreri Formula (Pediatric)');
  });
});

describe('patientCategoryService → canonical IBW/AdjBW', () => {
  it('IBW is the canonical Devine (now rounded to 0.1 kg)', () => {
    expect(calculateIBW(170, true)).toBe(65.9);
  });

  it('BEHAVIOUR CHANGE: AdjBW computed whenever ABW > IBW (was only > 130% IBW); dosing choice unchanged', () => {
    // 75 kg, IBW 65.9 (114%): AdjBW now 65.9 + 0.4 × 9.1 = 69.5 (was 75)
    expect(calculateAdjustedWeight(75, 65.9)).toBe(69.5);
    // ...but getDosingWeight still doses on actual weight below 130% IBW
    const d = getDosingWeight({ category: { isPediatric: false } as never, weight: 75, ibw: 65.9, adjustedWeight: 69.5 });
    expect(d).toMatchObject({ weight: 75, type: 'actual' });
    const obese = getDosingWeight({ category: { isPediatric: false } as never, weight: 120, ibw: 65.9, adjustedWeight: calculateAdjustedWeight(120, 65.9) });
    expect(obese).toMatchObject({ weight: 87.5, type: 'adjusted' });
  });
});
