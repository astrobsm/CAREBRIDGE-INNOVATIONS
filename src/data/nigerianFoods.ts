// Nigerian / West African wound-healing meal-plan generator.
//
// Per-portion energy (kcal) and protein (g) are no longer typed in here: they
// are calculated from the FAO/INFOODS West African Food Composition Table 2019
// (WAFCT 2019) and the nutrition module's standard recipes
// (src/domains/nutrition). generateMealPlan is kept, with the same API, until
// the stage 3 optimiser replaces it.

import { nigerianFoodPortions } from '../domains/nutrition/services/legacyFoodAdapters';

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

// ── Core food items (per stated portion) ────────────────────────────────────
// Calculated from WAFCT 2019 and the seed recipes (see
// src/domains/nutrition/data/legacyFoodSpecs.ts, NIGERIAN_FOODS_SPEC). Recipe
// items are pending dietitian verification.
const F = nigerianFoodPortions();

const meal = (label: string, items: FoodPortion[]): Meal => ({ label, items });

// ── Rotating pools (7 distinct options each for a full week) ─────────────────
const BREAKFASTS: Meal[] = [
  meal('Breakfast', [F.pap, F.moimoi, F.orange, F.milk]),
  meal('Breakfast', [F.bread, F.eggSauce, F.pawpaw]),
  meal('Breakfast', [F.yamBoiled, F.eggSauce, F.orange]),
  meal('Breakfast', [F.oatmeal, F.groundnut, F.banana]),
  meal('Breakfast', [F.akara, F.pap, F.milk]),
  meal('Breakfast', [F.bread, F.eggs2, F.milk, F.orange]),
  meal('Breakfast', [F.dodo, F.eggSauce, F.pawpaw]),
];

const LUNCHES: Meal[] = [
  meal('Lunch', [F.poundedYam, F.egusi, F.fish, F.ugu]),
  meal('Lunch', [F.jollof, F.chicken, F.ugu]),
  meal('Lunch', [F.eba, F.ogbono, F.beef, F.ugu]),
  meal('Lunch', [F.whiteRice, F.beans, F.fish]),
  meal('Lunch', [F.fufu, F.vegSoup, F.goat]),
  meal('Lunch', [F.ofada, F.eforiro, F.chicken]),
  meal('Lunch', [F.poundedYam, F.okro, F.fish, F.ugu]),
];

const DINNERS: Meal[] = [
  meal('Dinner', [F.beans, F.dodo, F.fish]),
  meal('Dinner', [F.whiteRice, F.eforiro, F.chicken]),
  meal('Dinner', [F.pepperSoup, F.yamBoiled]),
  meal('Dinner', [F.eba, F.okro, F.fish]),
  meal('Dinner', [F.jollof, F.liver, F.ugu]),
  meal('Dinner', [F.fufu, F.egusi, F.chicken]),
  meal('Dinner', [F.whiteRice, F.vegSoup, F.fish]),
];

const SNACKS: Meal[] = [
  meal('Snack', [F.groundnut, F.orange]),
  meal('Snack', [F.yoghurt, F.banana]),
  meal('Snack', [F.moimoi, F.watermelon]),
  meal('Snack', [F.milk, F.dates]),
  meal('Snack', [F.tigernut, F.pawpaw]),
  meal('Snack', [F.eggs2, F.orange]),
  meal('Snack', [F.groundnut, F.watermelon]),
];

// High-protein "top-up" portions used when protein target is not yet met.
const PROTEIN_BOOSTS: FoodPortion[] = [F.eggs2, F.fish, F.milk, F.moimoi, F.groundnut];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const sumMeals = (meals: Meal[]) => meals.reduce(
  (acc, m) => {
    m.items.forEach(i => { acc.kcal += i.kcal; acc.protein += i.protein; });
    return acc;
  }, { kcal: 0, protein: 0 }
);

/**
 * Generate a 7-day wound-healing meal plan tuned to the patient's daily energy
 * and protein targets, using Nigerian foods with practical quantities.
 */
export function generateMealPlan(targetKcal: number, targetProtein: number): DayPlan[] {
  const plan: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const breakfast = BREAKFASTS[i % BREAKFASTS.length];
    const midMorningSnack = { ...SNACKS[i % SNACKS.length] };
    const lunch = LUNCHES[i % LUNCHES.length];
    const afternoonSnack = { ...SNACKS[(i + 3) % SNACKS.length] };
    const dinner = DINNERS[i % DINNERS.length];

    const meals: Meal[] = [breakfast, midMorningSnack, lunch, afternoonSnack, dinner];
    let { kcal, protein } = sumMeals(meals);

    // Top up protein/energy toward the target with extra Nigerian protein portions
    const extra: FoodPortion[] = [];
    let guard = 0;
    while ((protein < targetProtein - 5 || kcal < targetKcal - 150) && guard < 6) {
      const boost = PROTEIN_BOOSTS[(i + guard) % PROTEIN_BOOSTS.length];
      extra.push(boost);
      protein += boost.protein;
      kcal += boost.kcal;
      guard++;
    }
    const afternoon = extra.length
      ? meal('Snack', [...afternoonSnack.items, ...extra])
      : afternoonSnack;
    const totals = sumMeals([breakfast, midMorningSnack, lunch, afternoon, dinner]);

    plan.push({
      day: DAYS[i],
      breakfast, midMorningSnack, lunch,
      afternoonSnack: afternoon,
      dinner,
      totalKcal: totals.kcal,
      totalProtein: totals.protein,
    });
  }
  return plan;
}
