/**
 * Intake record → kcal and protein. Hand calculations in the comments use
 * WAFCT 2019 per-100 g values.
 */
import { describe, it, expect } from 'vitest';
import { computeIntakeTotals, computeIntakeTotalsAsync, buildIntakeRecord } from '../services/intakeService';
import { getCoreFood, recipeNutrients, getRecipe } from '../services/foodRepository';
import type { IntakeItem } from '../types';

const eba = recipeNutrients(getRecipe('eba')!);
const egusi = recipeNutrients(getRecipe('egusi-soup')!);
const pap = getCoreFood('01_100')!; // ogi, cooked

describe('intake conversion', () => {
  it('foods by grams, recipes by portions, scaled by fraction eaten', () => {
    const items: IntakeItem[] = [
      { kind: 'food', id: 'a', ref: '01_100', name: 'Pap', servedGrams: 300, fractionEaten: 0.5 },
      { kind: 'recipe', id: 'b', ref: 'eba', name: 'Eba', servedPortions: 1, fractionEaten: 0.75 },
      { kind: 'recipe', id: 'c', ref: 'egusi-soup', name: 'Egusi', servedPortions: 1, fractionEaten: 1 },
    ];
    const t = computeIntakeTotals(items);
    const kcal = 150 * pap.per100g.energyKcal! / 100 + 0.75 * eba.values.energyKcal! + egusi.values.energyKcal!;
    const protein = 150 * pap.per100g.protein! / 100 + 0.75 * eba.values.protein! + egusi.values.protein!;
    expect(t.kcal).toBeCloseTo(kcal, 0);
    expect(t.proteinG).toBeCloseTo(protein, 0);
    expect(t.complete).toBe(true);
    expect(t.missing).toEqual([]);
    expect(t.byItem.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('nothing eaten is 0; nothing recorded is null', () => {
    expect(computeIntakeTotals([{ kind: 'recipe', id: 'x', ref: 'eba', name: 'Eba', servedPortions: 1, fractionEaten: 0 }]).kcal).toBe(0);
    const empty = computeIntakeTotals([]);
    expect(empty.kcal).toBeNull();
    expect(empty.proteinG).toBeNull();
  });

  it('ONS and enteral feeds from their label values', () => {
    const t = computeIntakeTotals([
      { kind: 'ons', id: 'o', product: 'ONS 200 mL', units: 2, kcalPerUnit: 300, proteinGPerUnit: 12, fractionEaten: 0.5 },
      { kind: 'enteral', id: 'e', product: '1.0 kcal/mL feed', mlDelivered: 1200, kcalPerMl: 1, proteinGPerMl: 0.04 },
    ]);
    expect(t.kcal).toBe(300 + 1200);
    expect(t.proteinG).toBe(12 + 48);
    expect(t.complete).toBe(true);
  });

  it('household measures convert through their grams', () => {
    const t = computeIntakeTotals([{ kind: 'food', id: 'g', ref: '02_078', name: 'Yam', householdMeasureId: 'piece-yam', servedPortions: 2, fractionEaten: 1 }]);
    expect(t.kcal).toBeCloseTo(140 * getCoreFood('02_078')!.per100g.energyKcal! / 100, 1);
  });

  it('an item that cannot be converted is named, and the day is a lower bound', () => {
    const t = computeIntakeTotals([
      { kind: 'recipe', id: 'b', ref: 'eba', name: 'Eba', servedPortions: 1, fractionEaten: 1 },
      { kind: 'recipe', id: 'w', ref: 'jollof-rice', name: 'Jollof', servedGrams: 300, fractionEaten: 1 }, // no yield factor
      { kind: 'ons', id: 'o', product: 'Unlabelled ONS', units: 1, kcalPerUnit: null, proteinGPerUnit: null, fractionEaten: 1 },
      { kind: 'food', id: 'z', ref: '99_999', name: 'Unknown', servedGrams: 100, fractionEaten: 1 },
      { kind: 'food', id: 'f', ref: '01_100', name: 'Pap', servedGrams: 100, fractionEaten: 0.3 as never },
    ]);
    expect(t.complete).toBe(false);
    expect(t.kcal).toBeCloseTo(eba.values.energyKcal!, 0);
    expect(t.missing.join(' | ')).toMatch(/no measured yield factor/);
    expect(t.missing.join(' | ')).toMatch(/label kcal\/protein not recorded/);
    expect(t.missing.join(' | ')).toMatch(/99_999 not found/);
    expect(t.missing.join(' | ')).toMatch(/fraction eaten must be/);
  });

  it('an unresolved recipe ingredient is reported, not silently counted as zero', () => {
    const t = computeIntakeTotals([{ kind: 'recipe', id: 'h', ref: 'ofe-oha', name: 'Oha soup', servedPortions: 1, fractionEaten: 1 }]);
    expect(t.complete).toBe(false);
    expect(t.missing[0]).toMatch(/Oha leaves/);
  });

  it('loads the full table for a food outside the core subset, and the record carries computed totals', async () => {
    const t = await computeIntakeTotalsAsync([{ kind: 'food', id: 't', ref: '12_008', name: 'Tea', servedGrams: 250, fractionEaten: 1 }]);
    expect(t.kcal).toBe(0);
    expect(t.complete).toBe(true);
    const rec = await buildIntakeRecord({ patientId: 'p1', date: '2026-11-07', items: [{ kind: 'recipe', id: 'b', ref: 'eba', name: 'Eba', servedPortions: 1, fractionEaten: 1 }] });
    expect(rec.kcal).toBe(rec.totals!.kcal);
    expect(rec.proteinG).toBe(rec.totals!.proteinG);
    expect(rec.totals!.datasetVersion).toMatch(/^wafct2019-/);
    await expect(buildIntakeRecord({ patientId: 'p1', date: '7/11/2026', items: [] })).rejects.toThrow(/YYYY-MM-DD/);
  });
});
