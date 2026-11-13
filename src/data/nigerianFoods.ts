// Nigerian / West African 7-day meal plan for a given energy and protein target.
//
// Since nutrition stage 3 this is an adapter over the weekly meal-plan
// optimiser (src/domains/nutrition/planner): the dishes, the exact portions
// (energy within ±5% of the target every day, protein at least the target,
// per-food portion limits, rounded to household units and re-checked) and the
// variety rules all come from it. Nutrients are calculated from the FAO/INFOODS
// West African Food Composition Table 2019 and the standard recipes. The
// exported API (DayPlan, Meal, FoodPortion, generateMealPlan) is unchanged for
// its callers (clinician-assistant and bedside calculators).
//
// The calculators carry no patient record, so the optimiser's population
// guard cannot run here; the plan is decision support for the clinician, as
// the calculators say.

import { planWeeklyMeals } from '../domains/nutrition/planner/plan';
import type { MealPlanRequest, PlanItem, PlanMeal, PlanRestrictions, WeeklyMealPlan } from '../domains/nutrition/planner/types';

export interface FoodPortion {
  name: string;
  qty: string;   // household measure
  kcal: number;
  protein: number; // grams
}

export interface Meal {
  label: string;
  items: FoodPortion[];
}

export interface DayPlan {
  day: string;
  breakfast: Meal;
  midMorningSnack: Meal;
  lunch: Meal;
  afternoonSnack: Meal;
  dinner: Meal;
  totalKcal: number;
  totalProtein: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface MealPlanOptions {
  goal?: 'maintain' | 'loss' | 'gain';
  restrictions?: PlanRestrictions;
}

const portion = (i: PlanItem): FoodPortion => ({
  name: i.igboName && i.igboName !== i.name ? `${i.name} (${i.igboName})` : i.name,
  qty: i.amount.unit === 'g' ? `${i.amount.label} — ${i.householdMeasure}` : i.amount.label,
  kcal: Math.round(i.kcal),
  protein: Math.round(i.proteinG),
});

const mealOf = (label: string, m: PlanMeal | undefined, extra: PlanItem[] = []): Meal =>
  ({ label, items: [...(m?.items ?? []), ...extra].map(portion) });

/** The optimiser plan behind generateMealPlan (for callers that want the full plan and its checks). */
export function optimisedMealPlan(targetKcal: number, targetProtein: number, opts: MealPlanOptions = {}): WeeklyMealPlan | null {
  const request: MealPlanRequest = {
    patient: {},
    targets: {
      energyKcal: targetKcal, protein: { min: targetProtein },
      derivation: [`Energy ${targetKcal} kcal/day and protein ${targetProtein} g/day from the calculator.`],
    },
    goal: { direction: opts.goal ?? 'maintain' },
    restrictions: opts.restrictions,
    structure: { days: 7, snacksPerDay: 2, dayLabels: DAYS },
    bestEffort: true,
  };
  const r = planWeeklyMeals(request);
  if (r.status === 'draft') return r.plan;
  if (r.status === 'infeasible') return r.bestEffort ?? null;
  return null;
}

/**
 * A 7-day Nigerian meal plan meeting the daily energy and protein targets,
 * with practical household quantities. Targets the optimiser cannot meet
 * within its limits get its best-effort plan (the closest energy and protein
 * it can reach). Returns [] for unusable targets (energy ≤ 0).
 */
export function generateMealPlan(targetKcal: number, targetProtein: number, opts: MealPlanOptions = {}): DayPlan[] {
  if (!(targetKcal > 0) || !(targetProtein >= 0)) return [];
  const plan = optimisedMealPlan(targetKcal, targetProtein, opts);
  if (!plan) return [];
  return plan.days.map(d => {
    const by = (slot: PlanMeal['slot']) => d.meals.find(m => m.slot === slot);
    // Supplements, if any, are listed with the afternoon snack.
    const meals = {
      breakfast: mealOf('Breakfast', by('breakfast')),
      midMorningSnack: mealOf('Snack', by('mid_morning')),
      lunch: mealOf('Lunch', by('lunch')),
      afternoonSnack: mealOf('Snack', by('afternoon'), by('supplement')?.items ?? []),
      dinner: mealOf('Dinner', by('dinner')),
    };
    const items = Object.values(meals).flatMap(m => m.items);
    return {
      day: d.label,
      ...meals,
      totalKcal: items.reduce((a, i) => a + i.kcal, 0),
      totalProtein: items.reduce((a, i) => a + i.protein, 0),
    };
  });
}
