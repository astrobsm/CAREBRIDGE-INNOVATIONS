/**
 * Daily intake → kcal and protein.
 *
 * Each item converts on its own; an item that cannot be converted (unknown
 * food, a recipe served by weight with no yield factor, an ONS with no label
 * values) is named in `missing`, and the day is then `complete: false`: the
 * totals are what the convertible items add up to, i.e. a lower bound. A day
 * with nothing convertible has null totals, never 0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  FRACTIONS_EATEN, type FractionEaten, type IntakeItem, type IntakeTotals, type NutritionIntake,
} from '../types';
import { CORE_FOOD_TABLE, loadFullFoodTable, type FoodTable } from '../data/foods';
import { UNRESOLVED } from '../data/recipes';
import {
  foodNutrients, getHouseholdMeasure, getRecipe, recipeNutrients, round,
} from './foodRepository';

interface ItemResult { id: string; kcal: number | null; proteinG: number | null; problem?: string }

const fractionOk = (f: unknown): f is FractionEaten => FRACTIONS_EATEN.includes(f as FractionEaten);

function convertItem(item: IntakeItem, table: FoodTable): ItemResult {
  const none = (problem: string): ItemResult => ({ id: item.id, kcal: null, proteinG: null, problem });

  if (item.kind === 'enteral') {
    if (!(item.mlDelivered >= 0)) return none(`${item.product}: volume delivered not recorded`);
    return {
      id: item.id,
      kcal: item.kcalPerMl === null ? null : item.mlDelivered * item.kcalPerMl,
      proteinG: item.proteinGPerMl === null ? null : item.mlDelivered * item.proteinGPerMl,
      problem: item.kcalPerMl === null || item.proteinGPerMl === null ? `${item.product}: kcal/protein per mL not recorded` : undefined,
    };
  }
  if (!fractionOk(item.fractionEaten)) return none(`${item.id}: fraction eaten must be 0, ¼, ½, ¾ or 1`);

  if (item.kind === 'ons') {
    const eaten = item.units * item.fractionEaten;
    return {
      id: item.id,
      kcal: item.kcalPerUnit === null ? null : eaten * item.kcalPerUnit,
      proteinG: item.proteinGPerUnit === null ? null : eaten * item.proteinGPerUnit,
      problem: item.kcalPerUnit === null || item.proteinGPerUnit === null ? `${item.product}: label kcal/protein not recorded` : undefined,
    };
  }

  // Served amount: grams, or portions / household measures.
  const measure = item.householdMeasureId ? getHouseholdMeasure(item.householdMeasureId) : undefined;
  if (item.householdMeasureId && !measure) return none(`${item.name}: household measure ${item.householdMeasureId} not found`);

  if (item.kind === 'food') {
    const food = table.byCode.get(item.ref);
    if (!food) return none(`${item.name}: food ${item.ref} not found`);
    const grams = item.servedGrams ?? (measure && item.servedPortions != null ? measure.grams * item.servedPortions : null);
    if (grams === null) return none(`${item.name}: amount served not recorded`);
    // Served food is weighed as eaten, i.e. as the WAFCT entry describes it.
    const r = foodNutrients(food, grams * item.fractionEaten, 'as_described', { table });
    return { id: item.id, kcal: r.values.energyKcal, proteinG: r.values.protein,
      problem: r.missing.length ? `${item.name}: ${r.missing.join(', ')}` : undefined };
  }

  const recipe = getRecipe(item.ref);
  if (!recipe) return none(`${item.name}: recipe ${item.ref} not found`);
  if (recipe.ingredients.some(i => i.foodCode !== UNRESOLVED && !table.byCode.has(i.foodCode))) return none(`${item.name}: ingredient not in food table`);
  const per = recipeNutrients(recipe, table);
  let portions: number | null = null;
  if (item.servedPortions != null && !measure) portions = item.servedPortions;
  else {
    const grams = item.servedGrams ?? (measure && item.servedPortions != null ? measure.grams * item.servedPortions : null);
    if (grams === null) return none(`${item.name}: amount served not recorded`);
    if (!per.cookedPortionGrams) return none(`${item.name}: served by weight, but the recipe has no measured yield factor (record portions instead)`);
    portions = grams / per.cookedPortionGrams;
  }
  const f = portions * item.fractionEaten;
  const kcal = per.values.energyKcal === null ? null : per.values.energyKcal * f;
  const protein = per.values.protein === null ? null : per.values.protein * f;
  const lowerBound = per.unresolvedIngredients.length ? `${item.name}: ${per.unresolvedIngredients.join('; ')} not counted` : undefined;
  return { id: item.id, kcal, proteinG: protein, problem: lowerBound };
}

/** Convert a day's items, using the given food table (core subset by default). */
export function computeIntakeTotals(items: IntakeItem[], table: FoodTable = CORE_FOOD_TABLE, now = new Date()): IntakeTotals {
  const byItem = items.map(i => convertItem(i, table));
  const missing = byItem.filter(r => r.problem).map(r => r.problem!);
  const sum = (k: 'kcal' | 'proteinG') => {
    const known = byItem.map(r => r[k]).filter((v): v is number => v !== null);
    return known.length ? round(known.reduce((a, b) => a + b, 0), 1) : null;
  };
  return {
    kcal: sum('kcal'),
    proteinG: sum('proteinG'),
    complete: missing.length === 0 && byItem.every(r => r.kcal !== null && r.proteinG !== null),
    missing,
    byItem: byItem.map(({ id, kcal, proteinG }) => ({ id, kcal: kcal === null ? null : round(kcal, 1), proteinG: proteinG === null ? null : round(proteinG, 1) })),
    datasetVersion: table.meta.datasetVersion,
    computedAt: now.toISOString(),
  };
}

/** As computeIntakeTotals, loading the full table when an item names a food outside the core subset. */
export async function computeIntakeTotalsAsync(items: IntakeItem[]): Promise<IntakeTotals> {
  const needsFull = items.some(i => i.kind === 'food' && !CORE_FOOD_TABLE.byCode.has(i.ref));
  return computeIntakeTotals(items, needsFull ? await loadFullFoodTable() : CORE_FOOD_TABLE);
}

/** Build the stored record: totals computed, never typed in. */
export async function buildIntakeRecord(input: Omit<NutritionIntake, 'id' | 'totals' | 'kcal' | 'proteinG' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): Promise<NutritionIntake> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('date must be YYYY-MM-DD');
  const totals = await computeIntakeTotalsAsync(input.items);
  const ts = new Date().toISOString();
  return { ...input, id: input.id ?? uuidv4(), totals, kcal: totals.kcal, proteinG: totals.proteinG, createdAt: input.createdAt ?? ts, updatedAt: ts };
}

export async function saveIntake(input: Parameters<typeof buildIntakeRecord>[0]): Promise<NutritionIntake> {
  const record = await buildIntakeRecord(input);
  const { db } = await import('../../../database/db');
  await db.nutritionIntake.put(record);
  const { syncRecord } = await import('../../../services/cloudSyncService');
  await syncRecord('nutritionIntake', record as unknown as Record<string, unknown>);
  return record;
}
