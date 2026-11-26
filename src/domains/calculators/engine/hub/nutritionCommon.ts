/**
 * Shared by the hub's nutrition calculators (Nutrition, Weight loss, Weight
 * gain, Wound meal plan): input parsing and validation, and the seven-day
 * plan from the meal-plan optimiser. No formula lives here.
 */
import { generateMealPlan, type DayPlan, type MealPlanOptions } from '../../../../data/nigerianFoods';

/** A finite number from a form string, or null when blank/invalid. */
export function parseNum(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Validation for the weight/height/age every energy equation needs. */
export function validateBody(
  v: { weightKg: string | number; heightCm: string | number; ageYears: string | number },
  errors: string[],
): { weightKg: number; heightCm: number; ageYears: number } | null {
  const w = parseNum(v.weightKg), h = parseNum(v.heightCm), a = parseNum(v.ageYears);
  if (w === null) errors.push('Enter the weight.');
  else if (w < 20 || w > 400) errors.push('Weight should be between 20 and 400 kg.');
  if (h === null) errors.push('Enter the height.');
  else if (h < 100 || h > 250) errors.push('Height should be between 100 and 250 cm.');
  if (a === null) errors.push('Enter the age.');
  else if (a < 18 || a > 120) errors.push('Age should be 18–120 years: these are adult equations. Children need a paediatric dietitian.');
  return errors.length ? null : { weightKg: w!, heightCm: h!, ageYears: a! };
}

/**
 * Seven days from the optimiser against the calculator's targets. [] when
 * the targets are unusable or the optimiser cannot build a plan — the UI says
 * so rather than showing a blank section.
 */
export function sevenDayPlan(
  targetKcal: number, proteinG: number,
  opts: { goal: NonNullable<MealPlanOptions['goal']>; diabetes?: boolean; ckd?: boolean },
): DayPlan[] {
  if (!(targetKcal > 0) || !(proteinG > 0)) return [];
  return generateMealPlan(Math.round(targetKcal), Math.round(proteinG), {
    goal: opts.goal,
    restrictions: { diabetes: !!opts.diabetes, ckd: opts.ckd ? {} : null },
  });
}

export const NO_PLAN_MESSAGE = 'The meal-plan optimiser could not build a plan for these targets. Review the targets, or plan with a dietitian.';
