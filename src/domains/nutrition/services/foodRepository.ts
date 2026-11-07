/**
 * Food repository: look foods and recipes up, and turn an amount of either
 * into nutrients.
 *
 * Rules (docs/NUTRITION_ENGINE.md, "Stage 2: food data"):
 *   - Missing stays missing. A nutrient the source does not give is null, and
 *     a total that includes it is reported in `incomplete` (the number shown
 *     is then a lower bound, from the contributors that are known).
 *   - Recipe nutrients are CALCULATED: Σ ingredient raw grams × composition ×
 *     retention factor. Energy and macronutrients are not adjusted for
 *     cooking (WAFCT publishes retention for vitamins and minerals only).
 *   - raw / cooked / as_described: grams weighed raw convert to cooked
 *     only through a published or measured yield factor. Without one, the
 *     result is not computable (`missing: ['yieldFactor']`); nothing is
 *     assumed. 'as_described' takes the food as its WAFCT entry describes
 *     it (gari, cooked ogi, a boiled-rice entry); for a recipe it means the
 *     served (cooked) dish.
 */

import {
  NUTRIENT_KEYS, type Food, type NutrientKey, type NutrientProfile, type Recipe, type RecipeIngredient,
} from '../types';
import { CORE_FOOD_TABLE, loadFullFoodTable, type FoodTable } from '../data/foods';
import { RECIPES_BY_ID, SEED_RECIPES, UNRESOLVED } from '../data/recipes';
import { MEASURES_BY_ID, SEED_HOUSEHOLD_MEASURES } from '../data/householdMeasures';

/** How grams were weighed: raw, cooked, or as the WAFCT entry describes the food (e.g. gari, cooked ogi). */
export type WeightBasis = 'raw' | 'cooked' | 'as_described';
export type FoodRef = { kind: 'food'; code: string } | { kind: 'recipe'; id: string };

export interface NutrientResult {
  values: NutrientProfile;
  grams: number | null;
  basis: WeightBasis;
  /** Nutrients for which at least one contributor had no value: the total is a lower bound. */
  incomplete: NutrientKey[];
  /** Nutrients for which at least one contributor was [bracketed] or trace in the source. */
  flagged: NutrientKey[];
  /** Why the result could not be computed (values are then all null). */
  missing: string[];
  assumptions: string[];
  /** WAFCT codes that contributed. */
  sources: string[];
  datasetVersion: string;
}

const emptyProfile = (): NutrientProfile => Object.fromEntries(NUTRIENT_KEYS.map(k => [k, null])) as NutrientProfile;
const zeroProfile = (): NutrientProfile => Object.fromEntries(NUTRIENT_KEYS.map(k => [k, 0])) as NutrientProfile;

function notComputable(basis: WeightBasis, missing: string[], table: FoodTable, assumptions: string[] = []): NutrientResult {
  return { values: emptyProfile(), grams: null, basis, incomplete: [], flagged: [], missing, assumptions, sources: [], datasetVersion: table.meta.datasetVersion };
}

const COOKED_WORDS = /\b(cooked|boiled|fried|grilled|stewed|steamed|porridge|roasted|toasted|baked|dough)\b/i;

/** Whether a WAFCT entry describes the food after cooking. */
export function isCookedForm(food: Food): boolean {
  return food.yieldFactor !== null || COOKED_WORDS.test(food.name);
}

// ── Lookup ───────────────────────────────────────────────────────────────

export function getCoreFood(code: string): Food | undefined {
  return CORE_FOOD_TABLE.byCode.get(code);
}

export async function lookupFood(code: string): Promise<Food | undefined> {
  return getCoreFood(code) ?? (await loadFullFoodTable()).byCode.get(code);
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Search the full table by name, local name, scientific name or code. Every word must match. */
export async function searchFoods(query: string, opts: { limit?: number; groupCode?: string } = {}): Promise<Food[]> {
  const table = await loadFullFoodTable();
  const words = norm(query).split(/\s+/).filter(Boolean);
  const out: Food[] = [];
  for (const f of table.foods) {
    if (opts.groupCode && f.groupCode !== opts.groupCode) continue;
    const hay = norm([f.code, f.name, f.scientificName ?? '', ...(f.localNames ?? [])].join(' '));
    if (words.every(w => hay.includes(w))) out.push(f);
    if (out.length >= (opts.limit ?? 50)) break;
  }
  return out;
}

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES_BY_ID.get(id);
}

export function listRecipes(): Recipe[] {
  return SEED_RECIPES;
}

export function listHouseholdMeasures() {
  return SEED_HOUSEHOLD_MEASURES;
}

export function getHouseholdMeasure(id: string) {
  return MEASURES_BY_ID.get(id);
}

// ── Single food ──────────────────────────────────────────────────────────

/**
 * Nutrients in `grams` of a food. `basis` says how the grams were weighed;
 * converting between raw and cooked uses the food's published yield factor
 * (or opts.yieldFactor, a measured one), never a guess.
 */
export function foodNutrients(food: Food, grams: number, basis: WeightBasis = 'as_described',
  opts: { yieldFactor?: number | null; table?: FoodTable } = {}): NutrientResult {
  const table = opts.table ?? CORE_FOOD_TABLE;
  if (!(grams >= 0) || !Number.isFinite(grams)) return notComputable(basis, ['grams'], table);
  const cookedEntry = isCookedForm(food);
  const assumptions: string[] = [];
  let asDescribedGrams = grams;
  if (cookedEntry && basis === 'raw') {
    const y = food.yieldFactor ?? opts.yieldFactor ?? null;
    if (!y) return notComputable(basis, ['yieldFactor'], table, [`${food.code} is a cooked entry; raw grams need its yield factor`]);
    asDescribedGrams = grams * y;
    assumptions.push(`${grams} g raw × yield ${y} = ${round(asDescribedGrams, 1)} g as ${food.name}`);
  } else if (!cookedEntry && basis === 'cooked') {
    const y = opts.yieldFactor ?? null;
    if (!y) return notComputable(basis, ['yieldFactor'], table, [`${food.code} is described raw; cooked grams need a yield factor`]);
    asDescribedGrams = grams / y;
    assumptions.push(`${grams} g cooked ÷ yield ${y} = ${round(asDescribedGrams, 1)} g raw`);
  }
  const values = emptyProfile();
  const incomplete: NutrientKey[] = [];
  const flagged: NutrientKey[] = [];
  for (const k of NUTRIENT_KEYS) {
    const v = food.per100g[k];
    if (v === null) { incomplete.push(k); continue; }
    values[k] = (v * asDescribedGrams) / 100;
    if (food.flags?.[k]) flagged.push(k);
  }
  return { values, grams, basis, incomplete, flagged, missing: [], assumptions, sources: [food.code], datasetVersion: table.meta.datasetVersion };
}

// ── Recipes ──────────────────────────────────────────────────────────────

export interface RecipeNutrients extends NutrientResult {
  recipeId: string;
  rawPortionGrams: number;
  /** null until the recipe's yield factor is measured. */
  cookedPortionGrams: number | null;
  /** Per 100 g of cooked recipe; null without a yield factor. */
  per100gCooked: NutrientProfile | null;
  unresolvedIngredients: string[];
  substitutions: string[];
  verificationStatus: Recipe['verificationStatus'];
}

function ingredientNutrients(ing: RecipeIngredient, table: FoodTable): { r: NutrientResult | null; problem?: string; retention?: string } {
  if (ing.foodCode === UNRESOLVED) return { r: null, problem: ing.note ?? 'unresolved ingredient' };
  const food = table.byCode.get(ing.foodCode);
  if (!food) return { r: null, problem: `food ${ing.foodCode} not in ${table.meta.subset === 'core' ? 'the core subset' : 'the table'}` };
  // Ingredients are weighed as described in WAFCT (raw, or ready-to-use such as gari).
  const r = foodNutrients(food, ing.rawGrams, 'as_described', { table });
  if (!ing.retentionId) return { r };
  const set = table.retentionById.get(ing.retentionId);
  if (!set) return { r, problem: `retention factor set "${ing.retentionId}" not found; none applied` };
  for (const [k, f] of Object.entries(set.factors) as [NutrientKey, number][]) {
    const v = r.values[k];
    if (v !== null) r.values[k] = v * f;
  }
  return { r, retention: `${ing.foodCode}: retention "${set.foodType}, ${set.process}"` };
}

/** Nutrients of one portion of a recipe, calculated from its ingredients. */
export function recipeNutrients(recipe: Recipe, table: FoodTable = CORE_FOOD_TABLE): RecipeNutrients {
  const values = zeroProfile();
  const incomplete = new Set<NutrientKey>();
  const flagged = new Set<NutrientKey>();
  const sources: string[] = [];
  const unresolved: string[] = [];
  const assumptions: string[] = [
    'Energy, protein, fat, carbohydrate, fibre and water are not adjusted for cooking (no WAFCT retention factors for them).',
    'Ingredient grams are raw edible portion; the edible-portion factor is not applied again.',
  ];
  const known = new Set<NutrientKey>();
  let rawGrams = 0;
  for (const ing of recipe.ingredients) {
    rawGrams += ing.rawGrams;
    const { r, problem, retention } = ingredientNutrients(ing, table);
    if (retention) assumptions.push(retention);
    if (!r) {
      unresolved.push(`${problem} (${ing.rawGrams} g)`);
      NUTRIENT_KEYS.forEach(k => incomplete.add(k));
      continue;
    }
    if (problem) assumptions.push(problem);
    sources.push(...r.sources);
    for (const k of NUTRIENT_KEYS) {
      const v = r.values[k];
      if (v === null) { incomplete.add(k); continue; }
      values[k] = (values[k] as number) + v;
      known.add(k);
    }
    r.flagged.forEach(k => flagged.add(k));
  }
  for (const k of NUTRIENT_KEYS) if (!known.has(k)) values[k] = null;
  const cooked = recipe.yieldFactor ? rawGrams * recipe.yieldFactor : null;
  const per100gCooked = cooked
    ? Object.fromEntries(NUTRIENT_KEYS.map(k => [k, values[k] === null ? null : ((values[k] as number) * 100) / cooked])) as NutrientProfile
    : null;
  if (!recipe.yieldFactor) assumptions.push('No yield factor: the cooked weight of a portion is not known.');
  if (recipe.verificationStatus !== 'verified') assumptions.push('Recipe pending dietitian verification; ingredient grams are typical-recipe estimates.');
  return {
    recipeId: recipe.id,
    values, grams: rawGrams, basis: 'raw',
    incomplete: NUTRIENT_KEYS.filter(k => incomplete.has(k)),
    flagged: NUTRIENT_KEYS.filter(k => flagged.has(k)),
    missing: [], assumptions, sources: [...new Set(sources)],
    datasetVersion: table.meta.datasetVersion,
    rawPortionGrams: rawGrams,
    cookedPortionGrams: cooked,
    per100gCooked,
    unresolvedIngredients: unresolved,
    substitutions: recipe.ingredients.filter(x => x.substituteFor).map(x => `${x.substituteFor!.intended} → ${x.foodCode} (${x.substituteFor!.reason})`),
    verificationStatus: recipe.verificationStatus,
  };
}

/** Scale a nutrient result by a factor (portions, fraction eaten). */
export function scaleResult<T extends NutrientResult>(r: T, factor: number): T {
  const values = Object.fromEntries(NUTRIENT_KEYS.map(k => [k, r.values[k] === null ? null : (r.values[k] as number) * factor])) as NutrientProfile;
  return { ...r, values, grams: r.grams === null ? null : r.grams * factor };
}

/**
 * Nutrients in `grams` of a food or recipe.
 * For a recipe, 'raw' grams are of the raw ingredients; 'cooked' grams need
 * the recipe's yield factor.
 */
export function nutrientsForSync(ref: FoodRef | Food | Recipe, grams: number, basis: WeightBasis = 'raw', table: FoodTable = CORE_FOOD_TABLE): NutrientResult {
  const recipe = 'ingredients' in ref ? ref : 'kind' in ref && ref.kind === 'recipe' ? getRecipe(ref.id) : undefined;
  if ('kind' in ref && ref.kind === 'recipe' && !recipe) return notComputable(basis, [`recipe ${ref.id}`], table);
  if (recipe) {
    const per = recipeNutrients(recipe, table);
    const portionGrams = basis === 'raw' ? per.rawPortionGrams : per.cookedPortionGrams;
    if (!portionGrams) return notComputable(basis, ['yieldFactor'], table, per.assumptions);
    return { ...scaleResult(per, grams / portionGrams), grams, basis };
  }
  const food = 'per100g' in ref ? ref : table.byCode.get((ref as { code: string }).code);
  if (!food) return notComputable(basis, [`food ${(ref as { code: string }).code}`], table);
  return foodNutrients(food, grams, basis, { table });
}

/** As nutrientsForSync, loading the full table when the food is not in the core subset. */
export async function nutrientsFor(ref: FoodRef | Food | Recipe, grams: number, basis: WeightBasis = 'raw'): Promise<NutrientResult> {
  const needsFull = 'kind' in ref && ref.kind === 'food' && !getCoreFood(ref.code)
    || 'ingredients' in ref && ref.ingredients.some(i => i.foodCode !== UNRESOLVED && !getCoreFood(i.foodCode));
  return nutrientsForSync(ref, grams, basis, needsFull ? await loadFullFoodTable() : CORE_FOOD_TABLE);
}

export function round(v: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
