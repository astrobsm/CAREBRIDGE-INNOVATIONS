/**
 * The optimiser's catalogue: data/plannerCatalogue.ts specs joined to their
 * nutrients. Every number comes from services/foodRepository (WAFCT 2019 and
 * the standard recipes); nothing is typed in here.
 *
 * Each component is expressed per "variable unit", the amount one solver
 * variable stands for: 1 g of a gram-weighed food, one whole piece, or one
 * portion step (½ or 1 recipe portion).
 */

import { NUTRIENT_KEYS, type CostTier, type FoodAvailability, type NutrientKey } from '../types';
import { CORE_FOOD_TABLE } from '../data/foods';
import {
  ADDED_SUGAR_FROM_G, INGREDIENT_TAGS, PLANNER_COMPONENTS, TEXTURE_ORDER,
  type DietTag, type PlanComponentSpec, type PlanRole, type PlanSlotKind, type ProteinSource,
} from '../data/plannerCatalogue';
import { MEASURES_BY_ID } from '../data/householdMeasures';
import { foodNutrients, getRecipe, isCookedForm, recipeNutrients, round } from '../services/foodRepository';

export interface PlanComponent {
  spec: PlanComponentSpec;
  id: string;
  name: string;
  igboName: string;
  role: PlanRole;
  slots: PlanSlotKind[];
  unitKind: 'g' | 'piece' | 'portion';
  /** Amount of the component's own unit that one solver variable unit is (1 g, 1 piece, ½ or 1 portion). */
  varStep: number;
  /** Rounding grid for gram-weighed foods (g). */
  gramStep: number;
  /** Limits in variable units. */
  minVar: number;
  maxVar: number;
  /** Nutrients per variable unit; an unknown value counts as 0 and is listed in `unknown`. */
  perVar: Record<NutrientKey, number>;
  unknown: NutrientKey[];
  rawGramsPerVar: number | null;
  cookedGramsPerVar: number | null;
  weightNote: string;
  tags: ReadonlySet<DietTag>;
  textureRank: number;
  costTier: CostTier;
  availability: FoodAvailability[];
  proteinSource: ProteinSource | null;
  lean: boolean;
  energyDense: boolean;
  needsStaple: boolean;
  preparationNote?: string;
  measureId?: string;
  pendingVerification: boolean;
  source: { kind: 'food' | 'recipe'; ref: string };
}

const DEFAULT_AVAILABILITY: FoodAvailability[] = ['hospital_kitchen', 'home', 'market'];

function profileOf(values: Record<NutrientKey, number | null>, factor: number): { per: Record<NutrientKey, number>; unknown: NutrientKey[] } {
  const per = {} as Record<NutrientKey, number>;
  const unknown: NutrientKey[] = [];
  for (const k of NUTRIENT_KEYS) {
    const v = values[k];
    if (v === null || !Number.isFinite(v)) { per[k] = 0; unknown.push(k); } else per[k] = v * factor;
  }
  return { per, unknown };
}

function build(spec: PlanComponentSpec): PlanComponent {
  const unit = spec.unit;
  const unitKind = unit.kind;
  const varStep = unit.kind === 'portion' ? (unit.step ?? 1) : 1;
  const gramStep = unit.kind === 'g' ? (unit.step ?? 5) : 1;
  const tags = new Set<DietTag>(spec.tags ?? []);
  const common = {
    spec, id: spec.id, role: spec.role, slots: spec.slots, unitKind, varStep, gramStep,
    minVar: spec.min / varStep, maxVar: spec.max / varStep,
    textureRank: TEXTURE_ORDER.indexOf(spec.texture),
    proteinSource: spec.proteinSource ?? null, lean: !!spec.lean, energyDense: !!spec.energyDense, needsStaple: !!spec.needsStaple,
    preparationNote: spec.preparationNote, measureId: spec.measureId,
  };

  if ('food' in spec.source) {
    const code = spec.source.food;
    const food = CORE_FOOD_TABLE.byCode.get(code);
    if (!food) throw new Error(`Planner catalogue names food ${code}, which is not in the core food subset`);
    (INGREDIENT_TAGS[code] ?? []).forEach(t => tags.add(t));
    const gramsPerVar = unit.kind === 'piece' ? unit.grams : 1;
    const r = foodNutrients(food, gramsPerVar, 'as_described');
    const { per, unknown } = profileOf(r.values, 1);
    const cooked = isCookedForm(food);
    let raw: number | null; let note: string;
    if (cooked && food.yieldFactor) {
      raw = gramsPerVar / food.yieldFactor;
      note = `Cooked weight (WAFCT cooked entry); raw = cooked ÷ yield ${food.yieldFactor} (WAFCT).`;
    } else if (cooked) {
      raw = null;
      note = 'Cooked weight (WAFCT cooked entry); raw weight not known (no yield factor).';
    } else {
      raw = gramsPerVar;
      note = 'Weight as eaten (WAFCT describes the food as eaten; no cooking).';
    }
    return {
      ...common, name: spec.name ?? food.name, igboName: spec.igboName ?? food.igboName ?? '',
      perVar: per, unknown, rawGramsPerVar: raw, cookedGramsPerVar: gramsPerVar, weightNote: note,
      tags, costTier: spec.costTier ?? food.costTier ?? 'medium', availability: spec.availability ?? food.availability ?? DEFAULT_AVAILABILITY,
      pendingVerification: false, source: { kind: 'food', ref: code },
    };
  }

  const recipe = getRecipe(spec.source.recipe);
  if (!recipe) throw new Error(`Planner catalogue names recipe ${spec.source.recipe}, which does not exist`);
  for (const ing of recipe.ingredients) (INGREDIENT_TAGS[ing.foodCode] ?? []).forEach(t => tags.add(t));
  const sugar = recipe.ingredients.filter(i => i.foodCode === '13_002').reduce((a, i) => a + i.rawGrams, 0);
  if (sugar >= ADDED_SUGAR_FROM_G) tags.add('added_sugar');
  const rn = recipeNutrients(recipe);
  const { per, unknown } = profileOf(rn.values, varStep);
  const cookedPer = rn.cookedPortionGrams === null ? null : rn.cookedPortionGrams * varStep;
  const isDrink = recipe.category === 'beverage';
  return {
    ...common, name: spec.name ?? recipe.name, igboName: spec.igboName ?? recipe.igboName ?? '',
    perVar: per, unknown: [...new Set([...unknown, ...rn.incomplete])],
    rawGramsPerVar: rn.rawPortionGrams * varStep, cookedGramsPerVar: cookedPer,
    weightNote: cookedPer !== null
      ? `Raw ingredient weight; cooked = raw × measured yield ${recipe.yieldFactor}.`
      : isDrink
        ? 'Raw ingredient weight including the water, about the weight of the drink served; cooked weight not measured.'
        : 'Raw ingredient weight (all ingredients of the portion); cooked weight not known: the recipe yield has not been measured yet.',
    tags, costTier: spec.costTier ?? recipe.costTier ?? 'medium', availability: spec.availability ?? recipe.availability ?? DEFAULT_AVAILABILITY,
    pendingVerification: recipe.verificationStatus !== 'verified', source: { kind: 'recipe', ref: recipe.id },
  };
}

let cache: { list: PlanComponent[]; byId: ReadonlyMap<string, PlanComponent> } | null = null;

export function plannerCatalogue(): { list: PlanComponent[]; byId: ReadonlyMap<string, PlanComponent> } {
  if (!cache) {
    const list = PLANNER_COMPONENTS.map(build);
    cache = { list, byId: new Map(list.map(c => [c.id, c])) };
  }
  return cache;
}

// ── Describing an amount ──────────────────────────────────────────────────

const FRACTIONS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/** 1.5 → "1½", 0.5 → "½", 2 → "2". */
export function fmtCount(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = round(n - whole, 2);
  const f = FRACTIONS[frac];
  if (!f) return String(round(n, 1));
  return whole ? `${whole}${f}` : f;
}

/** The amount in the component's own unit, and a household measure in words. */
export function describeAmount(c: PlanComponent, varUnits: number): { value: number; unit: 'g' | 'piece' | 'portion'; label: string; household: string } {
  if (c.unitKind === 'g') {
    const g = round(varUnits);
    const m = c.measureId ? MEASURES_BY_ID.get(c.measureId) : undefined;
    let household = `${g} g`;
    if (m) {
      const n = Math.round((g / m.grams) * 4) / 4; // nearest quarter
      const name = m.name.replace(/^(\w)/, s => s.toLowerCase());
      household = n > 0 ? `about ${fmtCount(n)} × ${name} (${m.grams} g each)` : `${g} g (less than ¼ ${name})`;
    }
    return { value: g, unit: 'g', label: `${g} g`, household };
  }
  if (c.unitKind === 'piece' && c.spec.unit.kind === 'piece') {
    const n = round(varUnits);
    const u = c.spec.unit;
    const label = `${n} ${n === 1 ? u.singular : u.plural}`;
    return { value: n, unit: 'piece', label, household: `${label} (about ${round(n * u.grams)} g)` };
  }
  const portions = round(varUnits * c.varStep, 2);
  const recipe = c.source.kind === 'recipe' ? getRecipe(c.source.ref) : undefined;
  const portionLabel = recipe?.portionLabel ?? 'portion';
  const label = portions === 1 ? portionLabel : `${fmtCount(portions)} × ${portionLabel}`;
  const m = c.measureId ? MEASURES_BY_ID.get(c.measureId) : undefined;
  return { value: portions, unit: 'portion', label, household: m ? `${label} (${m.name.toLowerCase()} is about ${m.grams} g)` : label };
}
