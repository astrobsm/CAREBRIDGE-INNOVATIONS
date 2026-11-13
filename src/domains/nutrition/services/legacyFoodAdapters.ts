/**
 * Selectors that rebuild the four retired hard-coded food lists from the
 * WAFCT 2019 dataset and the seed recipes, in the shapes their callers
 * already use. The mappings are in data/legacyFoodSpecs.ts.
 *
 * Numbers are rounded the way the old lists were (kcal to 1, grams to 0.1).
 * An item whose energy or protein cannot be calculated is left out rather
 * than shown with an invented value.
 */

import type { NutrientKey, PlannerFoodItem } from '../types';
import {
  NIGERIAN_FOODS_SPEC, PLANNER_FOODS_SPEC, NUTRITION_PAGE_SPEC, MEAL_GENERATOR_SPEC, type Part,
} from '../data/legacyFoodSpecs';
import { CORE_FOOD_TABLE } from '../data/foods';
import { foodNutrients, getRecipe, recipeNutrients, round, scaleResult } from './foodRepository';

export interface PartsTotal {
  values: Partial<Record<NutrientKey, number | null>>;
  grams: number;
  /** Nutrients that are lower bounds (an ingredient had no value). */
  incomplete: NutrientKey[];
  pendingVerification: boolean;
}

/** Sum the nutrients of a list of food grams and recipe portions. */
export function partsNutrients(parts: Part[]): PartsTotal {
  const values: Partial<Record<NutrientKey, number | null>> = {};
  const incomplete = new Set<NutrientKey>();
  let grams = 0;
  let pending = false;
  for (const p of parts) {
    let r;
    if ('food' in p) {
      const food = CORE_FOOD_TABLE.byCode.get(p.food);
      if (!food) throw new Error(`Legacy food mapping names ${p.food}, which is not in the core food subset`);
      // Foods are weighed as described in WAFCT (cooked entries as cooked).
      r = foodNutrients(food, p.g, 'as_described');
      grams += p.g;
    } else {
      const recipe = getRecipe(p.recipe);
      if (!recipe) throw new Error(`Legacy food mapping names recipe ${p.recipe}, which does not exist`);
      const per = recipeNutrients(recipe);
      r = scaleResult(per, p.portions);
      grams += (per.cookedPortionGrams ?? per.rawPortionGrams) * p.portions;
      if (recipe.verificationStatus !== 'verified') pending = true;
    }
    for (const [k, v] of Object.entries(r.values) as [NutrientKey, number | null][]) {
      if (v === null) { incomplete.add(k); if (!(k in values)) values[k] = null; continue; }
      values[k] = (values[k] ?? 0) + v;
    }
    r.incomplete.forEach(k => incomplete.add(k));
  }
  return { values, grams, incomplete: [...incomplete], pendingVerification: pending };
}

const kcalOf = (t: PartsTotal) => t.values.energyKcal;
const g1 = (v: number | null | undefined) => (v === null || v === undefined ? null : round(v, 1));
const opt = (v: number | null | undefined, dp = 0) => (v === null || v === undefined ? undefined : round(v, dp));

// ── 1. nigerianFoods.ts ───────────────────────────────────────────────────
export interface LegacyFoodPortion { name: string; qty: string; kcal: number; protein: number }

export function nigerianFoodPortions(): Record<keyof typeof NIGERIAN_FOODS_SPEC, LegacyFoodPortion> {
  const out = {} as Record<keyof typeof NIGERIAN_FOODS_SPEC, LegacyFoodPortion>;
  for (const [key, spec] of Object.entries(NIGERIAN_FOODS_SPEC) as [keyof typeof NIGERIAN_FOODS_SPEC, (typeof NIGERIAN_FOODS_SPEC)[keyof typeof NIGERIAN_FOODS_SPEC]][]) {
    const t = partsNutrients(spec.parts);
    out[key] = { name: spec.name, qty: spec.qty, kcal: round(kcalOf(t) ?? 0), protein: round(t.values.protein ?? 0) };
  }
  return out;
}

// ── 2. nutritionPlannerService.africanFoodDatabase ────────────────────────
export function plannerFoodItems(): PlannerFoodItem[] {
  const out: PlannerFoodItem[] = [];
  for (const s of PLANNER_FOODS_SPEC) {
    const t = partsNutrients(s.parts);
    const v = t.values;
    if (v.energyKcal == null || v.protein == null) continue;
    out.push({
      id: s.id, name: s.name, localName: s.localName, category: s.category, servingSize: s.servingSize,
      servingGrams: round(t.grams),
      calories: round(v.energyKcal), protein: g1(v.protein)!, carbohydrates: g1(v.carbohydrate) ?? 0, fat: g1(v.fat) ?? 0, fiber: g1(v.fibre) ?? 0,
      sodium: opt(v.sodium), potassium: opt(v.potassium), phosphorus: opt(v.phosphorus), calcium: opt(v.calcium),
      iron: opt(v.iron, 1), vitaminA: opt(v.vitaminARae), vitaminC: opt(v.vitaminC),
      isHighProtein: s.isHighProtein, isLowSodium: s.isLowSodium, isLowPotassium: s.isLowPotassium,
      isDiabeticFriendly: s.isDiabeticFriendly, isRenalFriendly: s.isRenalFriendly,
      seasonality: s.seasonality, costCategory: s.costCategory,
      source: { kind: s.parts.length === 1 && 'recipe' in s.parts[0] ? 'recipe' : 'food',
        ref: s.parts.map(p => ('food' in p ? p.food : p.recipe)).join('+'), grams: round(t.grams),
        datasetVersion: CORE_FOOD_TABLE.meta.datasetVersion },
    });
  }
  return out;
}

// ── 3. NutritionPage.tsx ──────────────────────────────────────────────────
export interface PageFoodItem { name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; portion: string }

export function nutritionPageFoods(): Record<keyof typeof NUTRITION_PAGE_SPEC, PageFoodItem[]> {
  const out = {} as Record<keyof typeof NUTRITION_PAGE_SPEC, PageFoodItem[]>;
  for (const [cat, items] of Object.entries(NUTRITION_PAGE_SPEC) as [keyof typeof NUTRITION_PAGE_SPEC, (typeof NUTRITION_PAGE_SPEC)['grains']][]) {
    out[cat] = [];
    for (const s of items) {
      const v = partsNutrients(s.parts).values;
      if (v.energyKcal == null || v.protein == null) continue;
      out[cat].push({ name: s.name, portion: s.portion, calories: round(v.energyKcal), protein: g1(v.protein)!,
        carbs: g1(v.carbohydrate) ?? 0, fat: g1(v.fat) ?? 0, fiber: g1(v.fibre) ?? 0 });
    }
  }
  return out;
}

// ── 4. MealPlanGenerator.tsx ──────────────────────────────────────────────
export interface GeneratorFoodItem {
  id: string; name: string; localName?: string;
  category: 'cereals' | 'legumes' | 'meat' | 'fish' | 'vegetables' | 'fruits' | 'traditional' | 'beverages';
  mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  servingSize: string; calories: number; protein: number; carbohydrates: number; fat: number;
  isHighProtein: boolean; isDiabeticFriendly: boolean; costCategory: 'low' | 'medium' | 'high';
}

export function mealGeneratorFoods(): GeneratorFoodItem[] {
  const out: GeneratorFoodItem[] = [];
  for (const s of MEAL_GENERATOR_SPEC) {
    const v = partsNutrients(s.parts).values;
    if (!v.energyKcal || v.protein == null) continue;
    out.push({ id: s.id, name: s.name, localName: s.localName, category: s.category, mealTypes: s.mealTypes, servingSize: s.servingSize,
      calories: round(v.energyKcal), protein: g1(v.protein)!, carbohydrates: g1(v.carbohydrate) ?? 0, fat: g1(v.fat) ?? 0,
      isHighProtein: s.isHighProtein, isDiabeticFriendly: s.isDiabeticFriendly, costCategory: s.costCategory });
  }
  return out;
}
