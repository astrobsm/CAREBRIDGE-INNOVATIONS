/**
 * Food repository and recipe nutrient calculation. Expected values are hand
 * calculations from the WAFCT 2019 per-100 g values quoted in each comment.
 */
import { describe, it, expect } from 'vitest';
import {
  foodNutrients, getCoreFood, lookupFood, nutrientsFor, nutrientsForSync, recipeNutrients, searchFoods, isCookedForm,
  listRecipes, listHouseholdMeasures,
} from '../services/foodRepository';
import { CORE_FOOD_TABLE, loadFullFoodTable } from '../data/foods';
import { UNRESOLVED } from '../data/recipes';
import type { Recipe } from '../types';

const food = (code: string) => {
  const f = getCoreFood(code);
  if (!f) throw new Error(code);
  return f;
};

describe('single foods', () => {
  it('scales per-100 g values; a missing value stays null', () => {
    // Gari 02_039: 351 kcal, 1.2 g protein per 100 g.
    const r = foodNutrients(food('02_039'), 85);
    expect(r.values.energyKcal).toBeCloseTo(298.35, 2);
    expect(r.values.protein).toBeCloseTo(1.02, 2);
    expect(r.flagged).toContain('folateDfe'); // [49] in WAFCT
    const withNull = { ...food('02_039'), per100g: { ...food('02_039').per100g, zinc: null } };
    const r2 = foodNutrients(withNull, 100);
    expect(r2.values.zinc).toBeNull();
    expect(r2.incomplete).toContain('zinc');
  });

  it('converts raw grams to a cooked entry only through its published yield factor', () => {
    // Rice, white, boiled 01_135: 115 kcal/100 g, yield 2.98 (WAFCT sheet 07).
    const rice = food('01_135');
    expect(rice.yieldFactor).toBe(2.98);
    expect(isCookedForm(rice)).toBe(true);
    const r = foodNutrients(rice, 90, 'raw'); // 90 g raw → 268.2 g cooked
    expect(r.values.energyKcal).toBeCloseTo(268.2 * 1.15, 1);
    expect(foodNutrients(rice, 250, 'cooked').values.energyKcal).toBeCloseTo(287.5, 1);
  });

  it('refuses raw→cooked without a yield factor rather than assuming one', () => {
    const raw = food('01_036'); // rice, white, polished, raw
    const r = foodNutrients(raw, 200, 'cooked');
    expect(r.missing).toEqual(['yieldFactor']);
    expect(r.values.energyKcal).toBeNull();
    expect(foodNutrients(raw, 200, 'cooked', { yieldFactor: 2.98 }).values.energyKcal).toBeCloseTo((200 / 2.98) * 3.51, 1);
  });

  it('looks up and searches the full table lazily', async () => {
    const full = await loadFullFoodTable();
    expect(full.foods.length).toBeGreaterThan(1000);
    expect((await lookupFood('12_008'))?.name).toMatch(/Tea/);
    const hits = await searchFoods('vernonia bitter');
    expect(hits.map(f => f.code)).toContain('04_022');
    // The core subset is a faithful copy of the full table's entries.
    for (const f of CORE_FOOD_TABLE.foods) expect(full.byCode.get(f.code)?.per100g).toEqual(f.per100g);
    expect((await nutrientsFor({ kind: 'food', code: '12_008' }, 100)).values.energyKcal).toBe(0);
  });
});

describe('recipe nutrient calculation', () => {
  it('eba: one ingredient, no retention', () => {
    const r = recipeNutrients(listRecipes().find(x => x.id === 'eba')!);
    expect(r.values.energyKcal).toBeCloseTo(298.35, 2);
    expect(r.rawPortionGrams).toBe(85);
    expect(r.cookedPortionGrams).toBeNull(); // yield not measured
    expect(r.per100gCooked).toBeNull();
    expect(r.verificationStatus).toBe('pending_dietitian_verification');
  });

  it('sums ingredients and applies WAFCT retention to vitamins and minerals only', () => {
    const okra = food('04_017'); const oil = food('11_004');
    const ret = CORE_FOOD_TABLE.retentionById.get('stem_flower_fruit_corn_seed|stewed')!;
    const recipe: Recipe = {
      id: 't', name: 'test', localNames: [], category: 'soup', portionLabel: '1', yieldFactor: 1.2, yieldFactorNote: 'test',
      verificationStatus: 'verified', estimateNote: 'test',
      ingredients: [{ foodCode: '04_017', rawGrams: 100, retentionId: 'stem_flower_fruit_corn_seed|stewed' }, { foodCode: '11_004', rawGrams: 10 }],
    };
    const r = recipeNutrients(recipe);
    expect(r.values.energyKcal).toBeCloseTo(okra.per100g.energyKcal! + oil.per100g.energyKcal! / 10, 6);
    expect(r.values.vitaminC).toBeCloseTo(okra.per100g.vitaminC! * ret.factors.vitaminC! + (oil.per100g.vitaminC ?? 0) / 10, 6);
    expect(r.values.protein).toBeCloseTo(okra.per100g.protein! + oil.per100g.protein! / 10, 6); // no retention for protein
    expect(r.cookedPortionGrams).toBeCloseTo(132, 6);
    expect(r.per100gCooked!.energyKcal).toBeCloseTo((r.values.energyKcal! * 100) / 132, 6);
    expect(r.assumptions.join(' ')).toMatch(/not adjusted for cooking/);
  });

  it('an unresolved ingredient makes every total a stated lower bound', () => {
    const r = recipeNutrients(listRecipes().find(x => x.id === 'ofe-oha')!);
    expect(r.unresolvedIngredients[0]).toMatch(/Oha leaves/);
    expect(r.incomplete).toContain('energyKcal');
    expect(r.values.energyKcal).toBeGreaterThan(0);
  });

  it('recipe by grams: raw grams scale the raw portion; cooked grams need a yield factor', () => {
    const jollof = listRecipes().find(x => x.id === 'jollof-rice')!;
    const per = recipeNutrients(jollof);
    const half = nutrientsForSync(jollof, per.rawPortionGrams / 2, 'raw');
    expect(half.values.energyKcal).toBeCloseTo(per.values.energyKcal! / 2, 6);
    expect(nutrientsForSync({ kind: 'recipe', id: 'jollof-rice' }, 250, 'cooked').missing).toEqual(['yieldFactor']);
  });

  it('every seed recipe: core-subset codes only, pending verification, estimate note, nutrients calculated', () => {
    const required = ['ofe-onugbu', 'ofe-oha', 'egusi-soup', 'ogbono-soup', 'okra-soup', 'nsala-soup', 'ofe-akwu', 'afang-soup', 'eba', 'akpu',
      'pounded-yam', 'moi-moi', 'akara', 'okpa', 'akamu-fortified', 'abacha', 'jollof-rice', 'white-rice-stew', 'beans-porridge',
      'boiled-plantain', 'yam-pottage'];
    const ids = listRecipes().map(r => r.id);
    for (const id of required) expect(ids, id).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of listRecipes()) {
      expect(r.verificationStatus, r.id).toBe('pending_dietitian_verification');
      expect(r.estimateNote, r.id).toMatch(/estimate/i);
      for (const i of r.ingredients) {
        if (i.foodCode !== UNRESOLVED) expect(getCoreFood(i.foodCode), `${r.id}: ${i.foodCode}`).toBeDefined();
        if (i.retentionId) expect(CORE_FOOD_TABLE.retentionById.has(i.retentionId), `${r.id}: ${i.retentionId}`).toBe(true);
        expect(i.rawGrams).toBeGreaterThan(0);
      }
      const n = recipeNutrients(r);
      expect(n.values.energyKcal, r.id).toBeGreaterThan(0);
      // No nutrient values typed into recipes.
      expect(JSON.stringify(r)).not.toMatch(/"(energyKcal|kcal|protein|calories)"/);
    }
  });

  it('household measures are all marked for local weighing', () => {
    const ms = listHouseholdMeasures();
    for (const name of ['cup', 'tablespoon', 'serving spoon', 'wrap', 'piece of meat', 'piece of fish', 'derica', 'mudu']) {
      expect(ms.some(m => m.name.toLowerCase().includes(name)), name).toBe(true);
    }
    for (const m of ms) {
      expect(m.verificationStatus).toBe('to_be_verified_by_local_weighing');
      expect(m.note).toMatch(/verified by local weighing/);
      expect(m.gramsRange!.low).toBeLessThanOrEqual(m.grams);
      expect(m.gramsRange!.high).toBeGreaterThanOrEqual(m.grams);
    }
  });
});
