/**
 * Stage 3 optimiser: property tests over a seeded generator of random targets
 * and restriction sets (fast-check is not a dependency of this repo).
 *
 * For every feasible case, re-derived here from the plan items themselves
 * (not from the planner's own checks):
 *   - daily energy within ±5% of that day's target;
 *   - protein ≥ 100% of the day's target (and ≤ the ceiling when set);
 *   - no restricted food appears (allergy, religious, avoid, budget,
 *     preparer, texture, diabetic sugar);
 *   - every portion within its per-food min/max, on its rounding grid;
 *   - the variety rules hold;
 *   - the numeric limits (sodium, K, P, fat, diabetic carbohydrate) hold
 *     on the rounded amounts.
 * For every infeasible case, a non-empty conflict explanation.
 */
import { describe, it, expect } from 'vitest';
import { planWeeklyMeals } from '../planner/plan';
import { plannerCatalogue, type PlanComponent } from '../planner/catalogue';
import { checkVariety } from '../planner/variety';
import { DRAFT_NOTICE } from '../planner/config';
import type { AllergyTag, MealPlanRequest, PlanRestrictions, ReligiousRestriction, WeeklyMealPlan } from '../planner/types';
import type { DietTag } from '../data/plannerCatalogue';
import { TEXTURE_ORDER } from '../data/plannerCatalogue';

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALLERGIES: AllergyTag[] = ['fish', 'shellfish', 'egg', 'milk', 'groundnut', 'tree_nut', 'gluten'];
const RELIGIOUS: ReligiousRestriction[] = ['no_pork', 'halal', 'no_beef', 'vegetarian'];
const RELIGIOUS_TAGS: Record<ReligiousRestriction, DietTag[]> = {
  no_pork: ['pork'], no_alcohol: ['alcohol'], halal: ['pork', 'alcohol'], no_beef: ['beef'],
  vegetarian: ['beef', 'goat', 'pork', 'poultry', 'fish', 'shellfish', 'offal'],
};
const COST = { low: 0, medium: 1, high: 2 } as const;

interface Case { req: MealPlanRequest; desc: string }

function makeCase(rand: () => number, i: number): Case {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const weight = 50 + rand() * 40;
  const energy = Math.round(1300 + rand() * 1900);
  const r: PlanRestrictions = {};
  const desc: string[] = [`E${energy}`];
  let protein: MealPlanRequest['targets']['protein'] = { min: Math.round(Math.min(weight * (0.8 + rand() * 0.8), (energy * 0.25) / 4)) };
  if (rand() < 0.25) { r.diabetes = true; desc.push('diabetes'); }
  if (rand() < 0.2) { r.sodiumMgMax = Math.round(1800 + rand() * 1200); desc.push(`Na${r.sodiumMgMax}`); }
  if (rand() < 0.15) {
    r.ckd = { potassiumMgMax: Math.round(2000 + rand() * 1500), phosphorusMgMax: Math.round(800 + rand() * 400) };
    protein = { min: Math.round(weight * 0.6), max: Math.round(weight * 0.8) };
    desc.push('ckd');
  }
  if (rand() < 0.15) { r.texture = 'soft'; desc.push('soft'); }
  if (rand() < 0.15) { r.fatGMax = Math.round((energy * (0.28 + rand() * 0.07)) / 9); desc.push(`fat${r.fatGMax}`); }
  if (rand() < 0.3) { r.allergies = [pick(ALLERGIES)]; desc.push(`allergy:${r.allergies[0]}`); }
  if (rand() < 0.3) { r.religious = [pick(RELIGIOUS)]; desc.push(r.religious[0]); }
  if (rand() < 0.4) { r.budget = pick(['low', 'medium', 'high'] as const); desc.push(`budget:${r.budget}`); }
  if (rand() < 0.4) { r.preparer = pick(['hospital_kitchen', 'family'] as const); desc.push(r.preparer); }
  if (rand() < 0.2) { r.avoid = [pick(plannerCatalogue().list).id]; desc.push(`avoid:${r.avoid[0]}`); }
  const direction = pick(['maintain', 'maintain', 'loss', 'gain'] as const);
  desc.push(direction);
  return {
    desc: `#${i} ${desc.join(' ')}`,
    req: {
      patient: { ageYears: 30 + Math.floor(rand() * 50), sex: rand() < 0.5 ? 'male' : 'female', weightKg: weight, pregnant: false, lactating: false, dialysis: false, parenteralNutrition: false },
      targets: { energyKcal: energy, protein, derivation: ['property test'] },
      goal: { direction },
      restrictions: r,
      structure: { days: 7, snacksPerDay: rand() < 0.3 ? 3 : 2 },
      seed: i,
    },
  };
}

const varUnits = (c: PlanComponent, value: number) => (c.unitKind === 'portion' ? value / c.varStep : value);

function forbidden(c: PlanComponent, r: PlanRestrictions): string[] {
  const out: string[] = [];
  const tags = new Set<DietTag>([...(r.allergies ?? []), ...(r.religious ?? []).flatMap(x => RELIGIOUS_TAGS[x])]);
  if (r.diabetes) { tags.add('added_sugar'); tags.add('sugary_drink'); }
  for (const t of c.tags) if (tags.has(t)) out.push(`tag ${t}`);
  if (r.avoid?.includes(c.id)) out.push('avoided');
  if (r.budget && COST[c.costTier] > COST[r.budget]) out.push('over budget');
  const prep = r.preparer ?? 'family';
  if (prep === 'hospital_kitchen' ? !c.availability.includes('hospital_kitchen') : !c.availability.some(a => a === 'home' || a === 'market')) out.push('not available');
  if (TEXTURE_ORDER.indexOf(c.spec.texture) < TEXTURE_ORDER.indexOf(r.texture ?? 'regular')) out.push('texture');
  return out;
}

function checkPlan(plan: WeeklyMealPlan, req: MealPlanRequest): string[] {
  const { byId } = plannerCatalogue();
  const problems: string[] = [];
  const r = req.restrictions ?? {};
  expect(plan.status).toBe('draft');
  expect(plan.notice).toBe(DRAFT_NOTICE);
  for (const d of plan.days) {
    let kcal = 0; let protein = 0; let na = 0; let k = 0; let p = 0; let fat = 0; let carb = 0;
    const mealCarb: number[] = [];
    for (const m of d.meals) {
      let mc = 0;
      for (const it of m.items) {
        const c = byId.get(it.componentId);
        if (!c) { problems.push(`${d.label}: unknown item ${it.componentId}`); continue; }
        const u = varUnits(c, it.amount.value);
        const add = (key: keyof PlanComponent['perVar']) => c.perVar[key] * u;
        kcal += add('energyKcal'); protein += add('protein'); na += add('sodium'); k += add('potassium'); p += add('phosphorus');
        fat += add('fat'); carb += add('carbohydrate'); mc += add('carbohydrate');
        const bad = forbidden(c, r);
        if (bad.length) problems.push(`${d.label}: ${c.id} not allowed (${bad.join(', ')})`);
        const { min, max } = c.spec;
        const cap = req.goal?.direction === 'loss' && c.role === 'swallow' ? Math.min(max, 1) : max;
        if (it.amount.value < min - 1e-9 || it.amount.value > cap + 1e-9) problems.push(`${d.label}: ${c.id} ${it.amount.value} outside ${min}–${cap}`);
        const step = c.unitKind === 'g' ? c.gramStep : c.unitKind === 'portion' ? c.varStep : 1;
        if (Math.abs(it.amount.value / step - Math.round(it.amount.value / step)) > 1e-9) problems.push(`${d.label}: ${c.id} ${it.amount.value} not on its ${step} grid`);
      }
      mealCarb.push(mc);
    }
    const T = d.energyTargetKcal;
    if (kcal < T * 0.95 - 1e-6 || kcal > T * 1.05 + 1e-6) problems.push(`${d.label}: energy ${kcal.toFixed(0)} vs ${T}`);
    if (protein < d.protein.min - 1e-6) problems.push(`${d.label}: protein ${protein.toFixed(1)} < ${d.protein.min}`);
    if (d.protein.max && protein > d.protein.max + 1e-6) problems.push(`${d.label}: protein ${protein.toFixed(1)} > ${d.protein.max}`);
    if (r.sodiumMgMax && na > r.sodiumMgMax + 1e-6) problems.push(`${d.label}: sodium ${na}`);
    if (r.ckd?.potassiumMgMax && k > r.ckd.potassiumMgMax + 1e-6) problems.push(`${d.label}: potassium ${k}`);
    if (r.ckd?.phosphorusMgMax && p > r.ckd.phosphorusMgMax + 1e-6) problems.push(`${d.label}: phosphorus ${p}`);
    if (r.fatGMax && fat > r.fatGMax + 1e-6) problems.push(`${d.label}: fat ${fat}`);
    if (r.diabetes) {
      if ((carb * 400) / kcal > 45 + 1e-6) problems.push(`${d.label}: carbohydrate ${((carb * 400) / kcal).toFixed(1)}%`);
      if (mealCarb.some(mc => mc > 0.35 * carb + 1e-6)) problems.push(`${d.label}: one meal above 35% of the day's carbohydrate`);
    }
    if ((fat * 900) / kcal > 35 + 1e-6) problems.push(`${d.label}: fat ${((fat * 900) / kcal).toFixed(1)}% of energy`);
    // The planner's own re-check must agree.
    if (d.checks.failures.length) problems.push(`${d.label}: planner checks failed: ${d.checks.failures.join('; ')}`);
  }
  const fruitAllowed = plannerCatalogue().list.some(c => c.role === 'fruit' && !forbidden(c, r).length);
  const v = checkVariety(plan, { fruitAllowed });
  problems.push(...v.problems);
  for (const [dish, n] of Object.entries(v.mainDishCounts)) if (n > 2) problems.push(`main dish ${dish} × ${n}`);
  return problems;
}

describe('weekly meal-plan optimiser — properties (seeded, 220 cases)', () => {
  it('every feasible plan meets the targets, limits, portions and variety rules; every infeasible one is explained', () => {
    const rand = mulberry32(20261113);
    const N = 220;
    let feasible = 0;
    const failures: string[] = [];
    const t0 = Date.now();
    let maxDayMs = 0;
    for (let i = 0; i < N; i++) {
      const { req, desc } = makeCase(rand, i);
      const r = planWeeklyMeals(req);
      if (r.status === 'draft') {
        feasible++;
        maxDayMs = Math.max(maxDayMs, r.plan.trace.timings.maxDayMs);
        const problems = checkPlan(r.plan, req);
        if (problems.length) failures.push(`${desc}: ${problems.slice(0, 3).join(' | ')}`);
      } else if (r.status === 'infeasible') {
        expect(r.conflicts.length, desc).toBeGreaterThan(0);
        for (const c of r.conflicts) {
          expect(c.conflictingConstraints.length + (c.emptyRoles?.length ?? 0), `${desc} day ${c.day}`).toBeGreaterThan(0);
          expect(c.suggestions.length, `${desc} day ${c.day}`).toBeGreaterThan(0);
        }
        expect(r.summary.length).toBeGreaterThan(0);
      } else {
        failures.push(`${desc}: unexpected status ${r.status}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`property cases: ${N}, feasible ${feasible}, ${Date.now() - t0} ms, slowest day ${maxDayMs} ms`);
    expect(failures).toEqual([]);
    expect(feasible).toBeGreaterThan(N * 0.6);
  }, 600_000);
});
