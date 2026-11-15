/**
 * Patient restrictions → which catalogue components may be served, and the
 * numeric limits the solver enforces.
 *
 * Exclusions are by tag: a recipe carries the tags of its ingredients
 * (data/plannerCatalogue.ts INGREDIENT_TAGS), so a fish allergy removes every
 * soup made with stockfish or crayfish, and "no pork" removes anything with
 * pork in it. Every exclusion names its reason, grouped by category so an
 * infeasible menu can be traced to the restriction(s) that emptied it.
 */

import type { CostTier, FoodAvailability, NutrientKey } from '../types';
import { TEXTURE_ORDER, type DietTag } from '../data/plannerCatalogue';
import type { PlannerConfig } from './config';
import type { PlanComponent } from './catalogue';
import type { PlanRestrictions, ReligiousRestriction } from './types';

export type RestrictionCategory = 'allergy' | 'religious' | 'preference' | 'budget' | 'preparer' | 'texture' | 'diabetes' | 'unknown_value';

export const CATEGORY_LABEL: Record<RestrictionCategory, string> = {
  allergy: 'food allergies', religious: 'religious restrictions', preference: 'food preferences (avoid list)',
  budget: 'budget tier', preparer: 'meal preparer (availability)', texture: 'texture modification', diabetes: 'diabetic carbohydrate control (no sugar-sweetened items)',
  unknown_value: 'a limited nutrient that is not known for the food (cannot be shown to stay within the limit)',
};

export interface Exclusion { category: RestrictionCategory; text: string }

export interface ResolvedRestrictions {
  raw: PlanRestrictions;
  excludedTags: Map<DietTag, Exclusion>;
  avoidIds: Set<string>;
  preferIds: Set<string>;
  budgetRank: number;
  preparer: 'hospital_kitchen' | 'family';
  textureRank: number;
  diabetes: boolean;
  carbPercentMax: number | null;
  mealCarbShareMax: number | null;
  sodiumMgMax: number | null;
  potassiumMgMax: number | null;
  phosphorusMgMax: number | null;
  fatGMax: number | null;
  fluidMlMax: number | null;
  notes: string[];
}

const COST_RANK: Record<CostTier, number> = { low: 0, medium: 1, high: 2 };

const RELIGIOUS_TAGS: Record<ReligiousRestriction, DietTag[]> = {
  no_pork: ['pork'],
  no_alcohol: ['alcohol'],
  halal: ['pork', 'alcohol'],
  no_beef: ['beef'],
  vegetarian: ['beef', 'goat', 'pork', 'poultry', 'fish', 'shellfish', 'offal'],
};

const TAGS = new Set<DietTag>(['pork', 'alcohol', 'beef', 'goat', 'poultry', 'fish', 'shellfish', 'offal', 'egg', 'milk', 'groundnut', 'tree_nut',
  'gluten', 'fried', 'added_sugar', 'sugary_drink', 'raw_vegetable']);

const positiveOrNull = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

export function resolveRestrictions(r: PlanRestrictions = {}, config: PlannerConfig): ResolvedRestrictions {
  const excludedTags = new Map<DietTag, Exclusion>();
  const add = (tag: DietTag, e: Exclusion) => { if (!excludedTags.has(tag)) excludedTags.set(tag, e); };
  const notes: string[] = [];
  for (const a of r.allergies ?? []) add(a, { category: 'allergy', text: `allergy: ${a.replace('_', ' ')}` });
  for (const rel of r.religious ?? []) for (const t of RELIGIOUS_TAGS[rel]) add(t, { category: 'religious', text: `${rel.replace('_', ' ')}: no ${t.replace('_', ' ')}` });
  if ((r.religious ?? []).includes('halal')) notes.push('Halal: pork and alcohol are excluded; whether meat is halal-slaughtered cannot be checked from food data — confirm with the patient or kitchen.');
  const avoidIds = new Set<string>();
  for (const a of r.avoid ?? []) {
    if (TAGS.has(a as DietTag)) add(a as DietTag, { category: 'preference', text: `preference: avoids ${a.replace('_', ' ')}` });
    else avoidIds.add(a);
  }
  const diabetes = !!r.diabetes;
  if (diabetes) {
    add('added_sugar', { category: 'diabetes', text: 'diabetes: contains added sugar' });
    add('sugary_drink', { category: 'diabetes', text: 'diabetes: sugar-sweetened drink' });
  }
  const ckd = r.ckd ?? null;
  let potassium = positiveOrNull(ckd?.potassiumMgMax);
  let phosphorus = positiveOrNull(ckd?.phosphorusMgMax);
  if (ckd && potassium === null) {
    potassium = config.ckdDefaults.value.potassiumMgMax;
    notes.push(`CKD: no potassium limit given; the default ${potassium} mg/day (60 mmol) is used — set it from the patient's potassium.`);
  }
  if (ckd && phosphorus === null) {
    phosphorus = config.ckdDefaults.value.phosphorusMgMax;
    notes.push(`CKD: no phosphate limit given; the default ${phosphorus} mg/day is used — set it from the patient's phosphate.`);
  }
  return {
    raw: r, excludedTags, avoidIds, preferIds: new Set(r.prefer ?? []),
    budgetRank: COST_RANK[r.budget ?? 'high'],
    preparer: r.preparer ?? 'family',
    textureRank: TEXTURE_ORDER.indexOf(r.texture ?? 'regular'),
    diabetes,
    carbPercentMax: diabetes ? config.diabetic.value.carbPercentMax : null,
    mealCarbShareMax: diabetes ? config.diabetic.value.mealCarbShareMax : null,
    sodiumMgMax: positiveOrNull(r.sodiumMgMax),
    potassiumMgMax: potassium,
    phosphorusMgMax: phosphorus,
    fatGMax: positiveOrNull(r.fatGMax),
    fluidMlMax: positiveOrNull(r.fluidMlMax),
    notes,
  };
}

const PREPARER_AVAILABILITY: Record<'hospital_kitchen' | 'family', FoodAvailability[]> = {
  hospital_kitchen: ['hospital_kitchen'],
  family: ['home', 'market'],
};

/** Why a component may not be served (empty = allowed). */
export function exclusionsFor(c: PlanComponent, rr: ResolvedRestrictions): Exclusion[] {
  const out: Exclusion[] = [];
  for (const t of c.tags) {
    const e = rr.excludedTags.get(t);
    if (e) out.push(e);
  }
  if (rr.avoidIds.has(c.id)) out.push({ category: 'preference', text: 'preference: avoids this food' });
  if (COST_RANK[c.costTier] > rr.budgetRank) out.push({ category: 'budget', text: `cost tier ${c.costTier} is above the ${['low', 'medium', 'high'][rr.budgetRank]} budget` });
  if (!c.availability.some(a => PREPARER_AVAILABILITY[rr.preparer].includes(a))) {
    out.push({ category: 'preparer', text: rr.preparer === 'hospital_kitchen' ? 'not made by the hospital kitchen' : 'not usually available to the family' });
  }
  if (c.textureRank < rr.textureRank) out.push({ category: 'texture', text: `not suitable for a ${TEXTURE_ORDER[rr.textureRank]} texture` });
  // A limit cannot be guaranteed on a value that is only a lower bound (an unresolved ingredient, a missing table value).
  const limited: [NutrientKey, number | null][] = [['sodium', rr.sodiumMgMax], ['potassium', rr.potassiumMgMax], ['phosphorus', rr.phosphorusMgMax],
    ['fat', rr.fatGMax], ['water', rr.fluidMlMax], ['carbohydrate', rr.carbPercentMax]];
  for (const [k, lim] of limited) if (lim !== null && c.unknown.includes(k)) out.push({ category: 'unknown_value', text: `${k} not known for this food (limit set)` });
  return out;
}
