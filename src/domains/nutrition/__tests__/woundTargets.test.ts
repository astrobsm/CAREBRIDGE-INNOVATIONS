import { describe, it, expect } from 'vitest';
import { woundNutritionTargets, hollidaySegarMl, screenStrongKids, auditConfig, NUTRITION_CONFIG_V1 } from '../engine';

describe('wound clinic protocol nutrition targets (engine)', () => {
  it('adult chronic wound: 30–35 kcal/kg, 1.25–1.5 g/kg protein, ~1 mL/kcal fluid', () => {
    const t = woundNutritionTargets({ ageYears: 60, weightKg: 70 });
    expect(t.group).toBe('adult_chronic');
    expect(t.energy.value).toEqual({ low: 2100, high: 2450 });
    expect(t.protein.value).toEqual({ low: 88, high: 105 });
    expect(t.fluid.value).toEqual({ low: 2100, high: 2450 });
    expect(t.energy.sources.join(' ')).toMatch(/Wound Clinic Protocol/);
  });

  it('adult with a large or deep wound: protein up to 2 g/kg', () => {
    expect(woundNutritionTargets({ ageYears: 40, weightKg: 50, largeOrDeepWound: true }).protein.value).toEqual({ low: 63, high: 100 });
  });

  it('renal impairment: protein reduction warning and the kidney note', () => {
    const t = woundNutritionTargets({ ageYears: 55, weightKg: 80, ckdNonDialysis: true });
    expect(t.protein.warnings.join(' ')).toMatch(/reduce protein/i);
    expect(t.notes.join(' ')).toMatch(/Kidney disease/);
  });

  it('adult major burn: 1.5–2 g/kg protein, energy and fluid left to specialist / burn protocol', () => {
    const t = woundNutritionTargets({ ageYears: 30, weightKg: 60, majorBurn: true });
    expect(t.protein.value).toEqual({ low: 90, high: 120 });
    expect(t.energy.value).toBeNull();
    expect(t.fluid.warnings.join(' ')).toMatch(/burn protocol/i);
  });

  it('child: 1.5–2.5 g/kg protein, Holliday–Segar fluid, energy needs the age-based figure', () => {
    const t = woundNutritionTargets({ ageYears: 0.67, weightKg: 8 });
    expect(t.group).toBe('child');
    expect(t.protein.value).toEqual({ low: 12, high: 20 });
    expect(t.fluid.value).toEqual({ low: 800, high: 800 });
    expect(t.energy.value).toBeNull();
    expect(t.energy.missing).toEqual(['childAgeBasedKcal']);
    expect(woundNutritionTargets({ ageYears: 6, weightKg: 20, childAgeBasedKcal: 1500 }).energy.value).toEqual({ low: 1650, high: 1800 });
  });

  it('Holliday–Segar bands', () => {
    expect(hollidaySegarMl(8)).toBe(800);
    expect(hollidaySegarMl(15)).toBe(1250);
    expect(hollidaySegarMl(30)).toBe(1700);
  });

  it('missing weight is reported, not guessed', () => {
    const t = woundNutritionTargets({ ageYears: 50 });
    expect(t.protein.value).toBeNull();
    expect(t.protein.missing).toContain('weightKg');
  });

  it('config stays internally consistent', () => {
    expect(auditConfig(NUTRITION_CONFIG_V1)).toEqual([]);
  });
});

describe('STRONGkids', () => {
  it('scores and bands', () => {
    const all = { highRiskDisease: true, poorNutritionalStatus: true, intakeOrLosses: true, weightLossOrNoGain: true };
    expect(screenStrongKids({ ageYears: 5, ...all }).value).toMatchObject({ score: 5, risk: 'high' });
    expect(screenStrongKids({ ageYears: 5, ...all, highRiskDisease: false, poorNutritionalStatus: false }).value).toMatchObject({ score: 2, risk: 'medium' });
    expect(screenStrongKids({ ageYears: 5, highRiskDisease: false, poorNutritionalStatus: false, intakeOrLosses: false, weightLossOrNoGain: false }).value).toMatchObject({ score: 0, risk: 'low' });
  });
  it('needs every item; not for adults', () => {
    expect(screenStrongKids({ ageYears: 5, highRiskDisease: true }).status).toBe('not_computable');
    expect(screenStrongKids({ ageYears: 30, highRiskDisease: false, poorNutritionalStatus: false, intakeOrLosses: false, weightLossOrNoGain: false }).status).toBe('not_applicable');
  });
});
