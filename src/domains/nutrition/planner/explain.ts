/**
 * Why a day has no feasible plan.
 *
 * 1. Menu level: a meal for which the restrictions leave nothing to serve. A
 *    deletion filter over the restriction categories finds a minimal set of
 *    categories that, together, empty the meal.
 * 2. Solver level: a deletion filter over the hard constraint groups
 *    (Chinneck & Dravnieks' irreducible infeasible subset method). Starting
 *    from all groups, each is removed in turn; if the model stays infeasible
 *    without it, it is not needed for the conflict and stays out. What is
 *    left is a minimal conflicting set: infeasible together, feasible if any
 *    one is dropped. Groups are tested portion limits first, so a clinical
 *    limit is named whenever one is part of the conflict.
 * 3. For each group in the set, an elastic solve (only that group given slack,
 *    total slack minimised) says how far it would have to move on its own.
 */

import { CATEGORY_LABEL, exclusionsFor, type RestrictionCategory, type ResolvedRestrictions } from './restrictions';
import type { PlanComponent } from './catalogue';
import { buildDayModel, GROUP_SEARCH_ORDER, HARD_GROUP_LABEL, runSolver, type DayProblem } from './solve';
import type { EmptyRole } from './menu';
import type { ConflictExplanation, SupplementOptions } from './types';
import type { PlanRole, PlanSlotKind } from '../data/plannerCatalogue';

const SLOT_KIND: Record<string, PlanSlotKind> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', mid_morning: 'snack', afternoon: 'snack', evening: 'snack' };
const MEAL_ROLES: Record<PlanSlotKind, PlanRole[]> = {
  breakfast: ['breakfast_main', 'staple'],
  lunch: ['swallow', 'soup', 'one_pot', 'staple', 'legume', 'protein'],
  dinner: ['swallow', 'soup', 'one_pot', 'staple', 'legume', 'protein'],
  snack: ['snack', 'drink', 'dairy', 'fruit', 'breakfast_main', 'protein', 'staple'],
};

/** Minimal set of restriction categories that leaves `roles` in `kind` with nothing to serve. */
export function emptyingRestrictions(all: PlanComponent[], rr: ResolvedRestrictions, roles: PlanRole[], kind: PlanSlotKind | null): RestrictionCategory[] {
  const pool = all.filter(c => roles.includes(c.role) && (kind === null || c.slots.includes(kind)));
  const cats = pool.map(c => new Set(exclusionsFor(c, rr).map(e => e.category)));
  const empty = (active: Set<RestrictionCategory>) => cats.every(s => [...s].some(x => active.has(x)));
  let active = new Set<RestrictionCategory>(cats.flatMap(s => [...s]));
  if (!pool.length || !empty(active)) return [];
  for (const c of [...active]) {
    const without = new Set(active); without.delete(c);
    if (empty(without)) active = without;
  }
  return [...active];
}

export function explainEmptyRoles(day: number, empty: EmptyRole[], all: PlanComponent[], rr: ResolvedRestrictions): ConflictExplanation {
  const emptyRoles = empty.map(e => {
    const roles: PlanRole[] = e.role === 'vegetable' ? ['vegetable'] : MEAL_ROLES[SLOT_KIND[e.slot] ?? 'snack'];
    const kind = e.role === 'vegetable' ? null : SLOT_KIND[e.slot] ?? null;
    const cats = e.reason === 'variety_limit' ? [] : emptyingRestrictions(all, rr, roles, kind);
    return { slot: e.slot, role: String(e.role), restrictions: cats.map(c => CATEGORY_LABEL[c]), varietyLimit: e.reason === 'variety_limit' };
  });
  const suggestions = [...new Set(emptyRoles.flatMap(r => r.varietyLimit
    ? [`The variety rule (each main dish at most twice a week) has used up every ${r.slot} dish the restrictions allow by this day: relax a restriction (e.g. the budget tier or preparer), or add dishes.`]
    : r.restrictions.length
    ? [`Nothing in the food list can be served for ${r.slot} (${r.role}) under: ${r.restrictions.join(' + ')}. Relax one of these, or add suitable foods/recipes for this patient.`]
    : [`No food in the list fits ${r.slot} (${r.role}); add suitable foods/recipes.`]))];
  return {
    day, conflictingConstraints: [], emptyRoles: emptyRoles.map(({ varietyLimit, ...r }) => ({ ...r, ...(varietyLimit ? { restrictions: ['variety rule: main dish at most twice a week'] } : {}) })),
    relaxations: [], suggestions,
  };
}

const SUGGEST: Record<string, (amount: number | null) => string> = {
  energy_band: a => a === null ? 'The energy target cannot be reached within the tolerance with these foods.' : `Energy would need to move by about ${Math.round(a)} kcal outside the ±5% band.`,
  protein_min: a => a === null ? 'The protein target cannot be met.' : `Protein falls short by about ${Math.ceil(a)} g: a high-protein ONS, or relaxing the limit(s) it conflicts with, would close it.`,
  protein_max: a => a === null ? 'The CKD protein ceiling cannot be kept.' : `Protein would need about ${Math.ceil(a)} g above the CKD ceiling — or choose lower-protein staples / reduce the energy target.`,
  potassium_max: a => a === null ? 'The potassium limit cannot be kept.' : `Potassium would need about ${Math.ceil(a)} mg more than the limit allows: raise the limit if the potassium allows it, or use lower-potassium foods.`,
  phosphorus_max: a => a === null ? 'The phosphate limit cannot be kept.' : `Phosphate would need about ${Math.ceil(a)} mg more than the limit allows.`,
  sodium_max: a => a === null ? 'The sodium limit cannot be kept.' : `Sodium would need about ${Math.ceil(a)} mg more: prepare without stock cubes/added salt (a kitchen change), or raise the limit.`,
  fat_g_max: a => a === null ? 'The fat restriction cannot be kept.' : `Fat would need about ${Math.ceil(a)} g more than the restriction allows.`,
  fluid_max: a => a === null ? 'The fluid restriction cannot be kept.' : `Food and drinks bring about ${Math.ceil(a)} mL more fluid than the restriction: use drier foods or review the restriction.`,
  carb_pct_max: () => 'The carbohydrate upper limit (% of energy) cannot be kept with these foods.',
  diabetic_carb_pct: () => 'The diabetic carbohydrate cap cannot be kept: allow a little more carbohydrate or more fat/protein foods.',
  diabetic_meal_carb: () => 'Carbohydrate cannot be spread evenly enough across the meals.',
  fat_pct_max: () => 'Fat stays above the upper % of energy: choose leaner soups/dishes.',
  oral_fraction: () => 'Food alone may provide only part of the target: prescribe ONS or an enteral feed for the rest (give the product).',
  portion_min: () => 'The smallest practical portions already exceed what the limits allow: fewer snacks/components per meal, or ONS/enteral feed for the early days.',
  portion_max: () => 'Even the largest practical portions do not reach the target: add snacks, an ONS or an enteral feed.',
};

export function explainSolverConflict(p: DayProblem, tolerance: number, supplements: SupplementOptions): ConflictExplanation {
  const base = buildDayModel(p, { tolerance, mode: 'mixed' });
  const present = GROUP_SEARCH_ORDER.filter(g => base.groups.has(g));
  // Use the LP relaxation when it is itself infeasible (fast); otherwise the
  // conflict only appears with whole units, so test the MILP.
  const relax = !runSolver(buildDayModel(p, { tolerance, mode: 'mixed', relaxIntegers: true })).feasible;
  const feasibleKeeping = (keep: Set<string>) => {
    const drop = new Set(present.filter(g => !keep.has(g)));
    return runSolver(buildDayModel(p, { tolerance, mode: 'mixed', drop, relaxIntegers: relax, timeoutMs: 400 })).feasible;
  };
  let keep = new Set(present);
  for (const g of present) {
    const without = new Set(keep); without.delete(g);
    if (!feasibleKeeping(without)) keep = without;
  }
  const conflicting = present.filter(g => keep.has(g));
  const relaxations = conflicting.map(g => {
    const r = runSolver(buildDayModel(p, { tolerance, mode: 'mixed', elastic: new Set([g]), relaxIntegers: relax, timeoutMs: 400 }));
    const amount = r.feasible ? r.objective : null;
    return { id: g, suggestion: SUGGEST[g]?.(amount) ?? `Relax: ${HARD_GROUP_LABEL[g] ?? g}.` };
  });
  const suggestions: string[] = [];
  const energyOrProtein = conflicting.some(g => g === 'protein_min' || g === 'energy_band' || g === 'portion_max' || g === 'oral_fraction');
  if (energyOrProtein && !supplements.ons && !supplements.enteral) {
    suggestions.push('Consider an oral nutritional supplement: give the product (label kcal and protein per unit) and re-run with supplements "if needed".');
  } else if (energyOrProtein && supplements.mode === 'never') {
    suggestions.push('An ONS/enteral product is configured but not allowed: re-run with supplements "if needed".');
  }
  if (!conflicting.length) suggestions.push('No single constraint group explains it; the menu for this day could not be fitted — try another seed.');
  return {
    day: p.day,
    conflictingConstraints: conflicting.map(id => ({ id, label: HARD_GROUP_LABEL[id] ?? id })),
    relaxations,
    suggestions: [...relaxations.map(r => r.suggestion), ...suggestions],
  };
}
