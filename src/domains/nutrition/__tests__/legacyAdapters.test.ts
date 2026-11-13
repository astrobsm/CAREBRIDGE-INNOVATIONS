/**
 * The four retired food lists now come from WAFCT 2019 + seed recipes. Their
 * exported shapes must not change for callers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateMealPlan } from '../../../data/nigerianFoods';
import { africanFoodDatabase, nutritionPlannerService } from '../../../services/nutritionPlannerService';
import { nigerianFoodPortions, nutritionPageFoods, mealGeneratorFoods, partsNutrients } from '../services/legacyFoodAdapters';
import { NIGERIAN_FOODS_SPEC, PLANNER_FOODS_SPEC, MEAL_GENERATOR_SPEC, NUTRITION_PAGE_SPEC, RETIRED_WITHOUT_SOURCE } from '../data/legacyFoodSpecs';
import { getCoreFood } from '../services/foodRepository';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const keysOf = (o: object) => Object.keys(o).sort();
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

describe('nigerianFoods.ts', () => {
  it('generateMealPlan keeps its API: 7 days, the same meal slots, positive totals that add up', () => {
    const plan = generateMealPlan(2200, 90);
    expect(plan).toHaveLength(7);
    for (const d of plan) {
      expect(keysOf(d)).toEqual(['afternoonSnack', 'breakfast', 'day', 'dinner', 'lunch', 'midMorningSnack', 'totalKcal', 'totalProtein']);
      for (const m of [d.breakfast, d.midMorningSnack, d.lunch, d.afternoonSnack, d.dinner]) {
        expect(typeof m.label).toBe('string');
        for (const i of m.items) { expect(keysOf(i)).toEqual(['kcal', 'name', 'protein', 'qty']); expect(i.kcal).toBeGreaterThan(0); }
      }
      const sum = [d.breakfast, d.midMorningSnack, d.lunch, d.afternoonSnack, d.dinner].flatMap(m => m.items).reduce((a, i) => a + i.kcal, 0);
      expect(d.totalKcal).toBe(sum);
    }
  });

  it('has a portion for every item the meal pools use, calculated (not typed in)', () => {
    const portions = nigerianFoodPortions();
    expect(keysOf(portions)).toEqual(keysOf(NIGERIAN_FOODS_SPEC));
    const src = read('src/data/nigerianFoods.ts');
    expect(src).not.toMatch(/qty: '[^']*', kcal: \d/);
    expect(src).toContain('const F = nigerianFoodPortions();');
    // e.g. pap = 300 g ogi (01_100)
    expect(portions.pap.kcal).toBe(Math.round(3 * getCoreFood('01_100')!.per100g.energyKcal!));
  });
});

describe('nutritionPlannerService.africanFoodDatabase', () => {
  it('keeps the FoodItem shape and every id the planner used', () => {
    expect(africanFoodDatabase.map(f => f.id)).toEqual(PLANNER_FOODS_SPEC.map(s => s.id));
    for (const f of africanFoodDatabase) {
      for (const k of ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'servingGrams'] as const) expect(isNum(f[k]), `${f.id}.${k}`).toBe(true);
      for (const k of ['isHighProtein', 'isLowSodium', 'isLowPotassium', 'isDiabeticFriendly', 'isRenalFriendly'] as const) expect(typeof f[k]).toBe('boolean');
      expect(['low', 'medium', 'high']).toContain(f.costCategory);
      expect(f.source?.datasetVersion).toMatch(/^wafct2019-/);
    }
    expect(nutritionPlannerService.searchFoods('egusi').map(f => f.id)).toContain('egusi-soup');
    // zobo and kunu were dropped as unsourced and are back as recipes.
    expect(africanFoodDatabase.map(f => f.id)).toEqual(expect.arrayContaining(['zobo', 'kunu']));
    expect(RETIRED_WITHOUT_SOURCE.nutritionPlannerService).toEqual([]);
  });
});

describe('NutritionPage and MealPlanGenerator lists', () => {
  it('NutritionPage: same categories and item shape', () => {
    const page = nutritionPageFoods();
    expect(keysOf(page)).toEqual(['beverages', 'grains', 'proteins', 'snacks', 'soups', 'vegetables']);
    for (const items of Object.values(page)) {
      expect(items.length).toBeGreaterThan(0);
      for (const i of items) {
        expect(keysOf(i)).toEqual(['calories', 'carbs', 'fat', 'fiber', 'name', 'portion', 'protein']);
        for (const k of ['calories', 'carbs', 'fat', 'fiber', 'protein'] as const) expect(isNum(i[k])).toBe(true);
      }
    }
    const total = Object.values(NUTRITION_PAGE_SPEC).flat().length;
    expect(Object.values(page).flat().length).toBe(total);
    const src = read('src/domains/nutrition/pages/NutritionPage.tsx');
    expect(src).toContain('const africanFoodDatabase = nutritionPageFoods();');
    expect(src).not.toMatch(/\{ name: '[^']+', calories: \d+/);
  });

  it('MealPlanGenerator: same FoodItem shape; swallows, soups and proteins for every main meal', () => {
    const foods = mealGeneratorFoods();
    expect(foods.map(f => f.id)).toEqual(MEAL_GENERATOR_SPEC.map(s => s.id));
    for (const f of foods) {
      expect(keysOf(f).filter(k => k !== 'localName')).toEqual(['calories', 'carbohydrates', 'category', 'costCategory', 'fat', 'id',
        'isDiabeticFriendly', 'isHighProtein', 'mealTypes', 'name', 'protein', 'servingSize']);
      expect(f.calories).toBeGreaterThan(0); // the generator divides by it
    }
    for (const meal of ['lunch', 'dinner'] as const) {
      const eligible = foods.filter(f => f.mealTypes.includes(meal));
      expect(eligible.some(f => f.category === 'cereals')).toBe(true);
      expect(eligible.some(f => ['traditional', 'vegetables'].includes(f.category))).toBe(true);
      expect(eligible.some(f => ['meat', 'fish'].includes(f.category))).toBe(true);
    }
    for (const m of ['breakfast', 'snack'] as const) expect(foods.some(f => f.mealTypes.includes(m))).toBe(true);
    expect(read('src/domains/admissions/components/MealPlanGenerator.tsx')).toContain('const africanFoods: FoodItem[] = mealGeneratorFoods();');
  });

  it('a composite item is the sum of its parts', () => {
    const egg = partsNutrients([{ food: '08_003', g: 100 }]).values.energyKcal!;
    const bread = partsNutrients([{ food: '01_046', g: 60 }]).values.energyKcal!;
    expect(partsNutrients([{ food: '01_046', g: 60 }, { food: '08_003', g: 100 }]).values.energyKcal).toBeCloseTo(egg + bread, 6);
    expect(() => partsNutrients([{ food: '99_999', g: 1 }])).toThrow(/not in the core food subset/);
    expect(() => partsNutrients([{ recipe: 'nope', portions: 1 }])).toThrow(/does not exist/);
  });
});
