/**
 * Commonly eaten foods dropped from the retired lists as unsourced, rebuilt
 * as standard recipes (data/recipes.ts, RESTORED_RECIPES) and offered again
 * by the legacy adapters. Plus the WAFCT 2019 acknowledgement.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESTORED_RECIPES, SEED_RECIPES, UNRESOLVED } from '../data/recipes';
import { SEED_HOUSEHOLD_MEASURES } from '../data/householdMeasures';
import {
  MEAL_GENERATOR_SPEC, NUTRITION_PAGE_SPEC, PLANNER_FOODS_SPEC, RESTORED_FROM_RETIRED, RETIRED_WITHOUT_SOURCE,
} from '../data/legacyFoodSpecs';
import { CORE_FOOD_TABLE } from '../data/foods';
import { getRecipe, recipeNutrients } from '../services/foodRepository';
import { mealGeneratorFoods, nutritionPageFoods, plannerFoodItems } from '../services/legacyFoodAdapters';
import { FOOD_COMPOSITION_ACKNOWLEDGEMENT } from '../data/foodSourceAcknowledgement';
import { generateMealPlanPDF } from '../../../utils/mealPlanPdfGenerator';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const keysOf = (o: object) => Object.keys(o).sort();

const RESTORED_IDS = [
  'fried-rice', 'groundnut-soup', 'fried-fish', 'fried-chicken', 'suya', 'coleslaw', 'puff-puff', 'chin-chin', 'meat-pie',
  'sausage-roll', 'buns', 'zobo', 'kunu', 'tiger-nut-milk', 'miyan-kuka', 'ofada-ayamase', 'gbegiri', 'efo-riro',
];
const FRIED = ['fried-rice', 'fried-fish', 'fried-chicken', 'puff-puff', 'chin-chin', 'buns'];

describe('restored recipes', () => {
  it('cover every dropped food, once each, alongside the stage 2 recipes', () => {
    expect(RESTORED_RECIPES.map(r => r.id).sort()).toEqual([...RESTORED_IDS].sort());
    expect(new Set(SEED_RECIPES.map(r => r.id)).size).toBe(SEED_RECIPES.length);
    for (const id of RESTORED_IDS) expect(getRecipe(id), id).toBeDefined();
  });

  it('every ingredient code resolves in the bundled core table (or is declared unresolved), and every retention set exists', () => {
    for (const r of RESTORED_RECIPES) {
      for (const ing of r.ingredients) {
        if (ing.foodCode === UNRESOLVED) { expect(ing.note, `${r.id}: unresolved needs a note`).toMatch(/not in WAFCT 2019/); continue; }
        expect(CORE_FOOD_TABLE.byCode.get(ing.foodCode), `${r.id}: ${ing.foodCode}`).toBeDefined();
        if (ing.retentionId) expect(CORE_FOOD_TABLE.retentionById.get(ing.retentionId), `${r.id}: ${ing.retentionId}`).toBeDefined();
        expect(ing.rawGrams).toBeGreaterThan(0);
      }
      const n = recipeNutrients(r);
      expect(n.assumptions.filter(a => /not found/.test(a)), r.id).toEqual([]);
    }
  });

  it('energy and protein are calculated from the ingredients and never null', () => {
    for (const r of RESTORED_RECIPES) {
      const n = recipeNutrients(r);
      expect(n.values.energyKcal, r.id).not.toBeNull();
      expect(n.values.protein, r.id).not.toBeNull();
      expect(n.values.energyKcal!, r.id).toBeGreaterThan(0);
      // Energy is not retention-adjusted, so it is exactly Σ grams × kcal/100 g.
      const expected = r.ingredients.filter(x => x.foodCode !== UNRESOLVED)
        .reduce((a, x) => a + (x.rawGrams * CORE_FOOD_TABLE.byCode.get(x.foodCode)!.per100g.energyKcal!) / 100, 0);
      expect(n.values.energyKcal!, r.id).toBeCloseTo(expected, 6);
    }
  });

  it('are pending dietitian verification with the typical-recipe estimate note', () => {
    for (const r of RESTORED_RECIPES) {
      expect(r.verificationStatus).toBe('pending_dietitian_verification');
      expect(r.estimateNote).toMatch(/typical-recipe estimate/i);
      expect(r.yieldFactor).toBeNull();
    }
  });

  it('fried foods carry their oil as an ingredient with the absorption assumption stated', () => {
    for (const id of FRIED) {
      const oil = getRecipe(id)!.ingredients.filter(x => x.foodCode.startsWith('11_'));
      expect(oil.length, id).toBeGreaterThan(0);
      expect(oil.some(x => /oil absorbed in deep frying: about \d+%|stir-frying oil/.test(x.note ?? '')), id).toBe(true);
    }
  });

  it('totals that miss an ingredient are reported as lower bounds; substitutes say what they stand in for', () => {
    const unresolved = Object.fromEntries(RESTORED_RECIPES.map(r => [r.id, recipeNutrients(r).unresolvedIngredients.length]));
    expect(Object.entries(unresolved).filter(([, n]) => n > 0).map(([id]) => id).sort()).toEqual(['fried-rice', 'ofada-ayamase', 'zobo']);
    for (const id of ['fried-rice', 'ofada-ayamase', 'zobo']) expect(recipeNutrients(getRecipe(id)!).incomplete).toContain('energyKcal');
    expect(recipeNutrients(getRecipe('suya')!).substitutions.join(' ')).toMatch(/Kuli-kuli/);
    expect(recipeNutrients(getRecipe('coleslaw')!).substitutions.join(' ')).toMatch(/Mayonnaise/);
  });

  it('efo riro is its own dish, not the vegetable soup', () => {
    const codes = (id: string) => getRecipe(id)!.ingredients.map(x => x.foodCode).sort();
    expect(codes('efo-riro')).not.toEqual(codes('vegetable-soup'));
    expect(codes('efo-riro')).toContain('04_023'); // amaranth
  });

  it('household measures for the restored dishes exist and are marked for local weighing', () => {
    const forRecipe = (id: string) => SEED_HOUSEHOLD_MEASURES.filter(m => m.appliesTo === id);
    for (const id of ['meat-pie', 'sausage-roll', 'suya', 'zobo', 'kunu', 'tiger-nut-milk', 'puff-puff', 'buns', 'chin-chin']) {
      expect(forRecipe(id).length, id).toBeGreaterThan(0);
      for (const m of forRecipe(id)) {
        expect(m.verificationStatus).toBe('to_be_verified_by_local_weighing');
        expect(m.note).toMatch(/verified by local weighing/);
      }
    }
  });
});

describe('legacy adapters offer the restored items again, in the old shapes', () => {
  it('nothing is left retired; every restored mapping points at a real recipe', () => {
    for (const list of Object.values(RETIRED_WITHOUT_SOURCE)) expect(list).toEqual([]);
    for (const m of Object.values(RESTORED_FROM_RETIRED)) for (const id of Object.values(m)) expect(getRecipe(id), id).toBeDefined();
  });

  it('nutrition planner: zobo and kunu, FoodItem shape, sweetened so not diabetic-friendly', () => {
    const items = plannerFoodItems();
    for (const id of Object.keys(RESTORED_FROM_RETIRED.nutritionPlannerService)) {
      const f = items.find(x => x.id === id)!;
      expect(f, id).toBeDefined();
      expect(f.category).toBe('beverages');
      expect(f.calories).toBeGreaterThan(0);
      expect(f.isDiabeticFriendly).toBe(false);
      expect(f.source?.kind).toBe('recipe');
    }
    expect(items.find(x => x.id === 'zobo')!.isRenalFriendly).toBe(false); // potassium of the calyx unknown
    expect(PLANNER_FOODS_SPEC.find(s => s.id === 'efo-riro')!.parts).toEqual([{ recipe: 'efo-riro', portions: 1 }]);
  });

  it('nutrition page: every restored name in its old category, same item shape', () => {
    const page = nutritionPageFoods();
    const where: Record<string, keyof typeof NUTRITION_PAGE_SPEC> = {
      'Fried Rice': 'grains', 'Groundnut Soup': 'soups', 'Efo Riro': 'soups', 'Fried Fish': 'proteins', 'Chicken (Fried)': 'proteins',
      Suya: 'proteins', Coleslaw: 'vegetables', 'Puff Puff': 'snacks', 'Chin Chin': 'snacks', 'Meat Pie': 'snacks', 'Sausage Roll': 'snacks',
      Buns: 'snacks', 'Zobo (Hibiscus)': 'beverages', Kunu: 'beverages', 'Tiger Nut Milk (Kunun Aya)': 'beverages',
    };
    expect(Object.keys(where).sort()).toEqual(Object.keys(RESTORED_FROM_RETIRED.nutritionPage).sort());
    for (const [name, cat] of Object.entries(where)) {
      const item = page[cat].find(x => x.name === name);
      expect(item, name).toBeDefined();
      expect(keysOf(item!)).toEqual(['calories', 'carbs', 'fat', 'fiber', 'name', 'portion', 'protein']);
      expect(item!.calories).toBeGreaterThan(0);
    }
  });

  it('meal plan generator: every restored id, with meal types, cost tier, and fried or sugary items not diabetic-friendly', () => {
    const foods = mealGeneratorFoods();
    for (const id of Object.keys(RESTORED_FROM_RETIRED.mealPlanGenerator)) {
      const f = foods.find(x => x.id === id)!;
      expect(f, id).toBeDefined();
      expect(f.calories).toBeGreaterThan(0);
      expect(f.mealTypes.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(f.costCategory);
    }
    for (const id of ['fried-rice', 'chin-chin', 'puff-puff', 'zobo', 'kunu']) expect(foods.find(x => x.id === id)!.isDiabeticFriendly, id).toBe(false);
    expect(MEAL_GENERATOR_SPEC.find(s => s.id === 'efo-riro')!.parts).toEqual([{ recipe: 'efo-riro', portions: 1 }]);
  });
});

describe('FAO / WAFCT 2019 acknowledgement', () => {
  it('is one shared constant with the agreed wording', () => {
    expect(FOOD_COMPOSITION_ACKNOWLEDGEMENT).toBe(
      'Food composition: FAO/INFOODS West African Food Composition Table (2019). Values pending local dietitian verification.');
  });

  it('the meal-plan PDF generator prints it', () => {
    const src = read('src/utils/mealPlanPdfGenerator.ts');
    expect(src).toContain("import { FOOD_COMPOSITION_ACKNOWLEDGEMENT } from '../domains/nutrition/data/foodSourceAcknowledgement';");
    expect(src).toMatch(/addFoodSourceLine\(doc, y\)/);
    const doc = generateMealPlanPDF({
      planType: 'wound_healing', calorieTarget: 2200, proteinTarget: 90,
      mealPlan: { breakfast: ['Akamu'], lunch: ['Eba and egusi'], dinner: ['Jollof rice'] }, warnings: ['Check potassium'],
    });
    const pdf = doc.output();
    expect(pdf).toContain('FAO/INFOODS West African Food Composition Table');
  });

  it('every screen and PDF that shows WAFCT-derived food values uses the constant, not its own copy', () => {
    for (const p of [
      'src/utils/mealPlanPdfGenerator.ts',
      'src/domains/admissions/components/MealPlanGenerator.tsx',
      'src/domains/nutrition/pages/NutritionPage.tsx',
      'src/domains/nutrition/pages/NutritionPlannerPage.tsx',
      'src/domains/clinician-assistant/components/CalculatorPanels.tsx',
    ]) {
      const src = read(p);
      expect(src, p).toContain('FOOD_COMPOSITION_ACKNOWLEDGEMENT');
      expect(src, p).not.toContain('West African Food Composition Table');
    }
  });
});
