/**
 * Saving an optimiser plan through the stage 2 nutritionPlans model: a draft
 * NutritionPlan row (approvalStatus 'draft', status 'draft') with a version,
 * the plan in the existing weeklyMenu/mealPlans shapes, and the full
 * optimiser run (request, plan, trace, versions) in `optimiser`.
 */

import { v4 as uuidv4 } from 'uuid';
import type { NutritionMeal, NutritionMealPlan, NutritionPlan, StoredPlanOptimisation } from '../types';
import { DRAFT_NOTICE } from './config';
import type { MealPlanRequest, MealSlot, WeeklyMealPlan } from './types';

const MEAL_TYPE: Record<MealSlot, NutritionMeal['type'] | null> = {
  breakfast: 'breakfast', mid_morning: 'morning_snack', lunch: 'lunch', afternoon: 'afternoon_snack', dinner: 'dinner', evening: 'evening_snack', supplement: null,
};
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface SaveMeta {
  patientId: string;
  createdBy: string;
  hospitalId?: string;
  encounterId?: string;
  admissionId?: string;
  weightKg?: number;
  heightCm?: number;
  /** The plan this one revises (version = its version + 1). */
  revisionOf?: Pick<NutritionPlan, 'id' | 'version'> | null;
  now?: Date;
}

function mealPlans(plan: WeeklyMealPlan): NutritionMealPlan[] {
  return plan.days.map((d, i) => ({
    dayOfWeek: i,
    meals: d.meals.filter(m => MEAL_TYPE[m.slot]).map(m => ({
      type: MEAL_TYPE[m.slot]!, time: m.time,
      foods: m.items.map(it => ({ name: it.name, portion: it.amount.label, calories: it.kcal, protein: it.proteinG, carbs: it.carbohydrateG, fat: it.fatG })),
      totalCalories: m.totals.kcal,
    })),
    totalCalories: d.totals.kcal, totalProtein: d.totals.proteinG, totalCarbs: d.totals.carbohydrateG, totalFat: d.totals.fatG,
  }));
}

/** Pure: the NutritionPlan row for a draft optimiser plan. */
export function toNutritionPlanRecord(plan: WeeklyMealPlan, request: MealPlanRequest, meta: SaveMeta): NutritionPlan {
  if (plan.status !== 'draft' || plan.notice !== DRAFT_NOTICE) throw new Error('Only a draft optimiser plan carrying the notice can be saved.');
  const ts = meta.now ?? new Date();
  const mp = mealPlans(plan);
  const w = meta.weightKg ?? request.patient.weightKg ?? 0;
  const h = meta.heightCm ?? request.patient.heightCm ?? 0;
  const stored: StoredPlanOptimisation = {
    method: 'planWeeklyMeals', notice: plan.notice,
    plannerVersion: plan.trace.plannerVersion, engineConfigVersion: plan.trace.engineConfigVersion,
    datasetVersion: plan.trace.datasetVersion, validationStatus: plan.trace.validationStatus,
    request, plan, ranAt: plan.generatedAt, revisionOf: meta.revisionOf?.id ?? null,
  };
  const end = new Date(ts); end.setDate(end.getDate() + plan.days.length);
  const r = plan.restrictions;
  return {
    id: uuidv4(), patientId: meta.patientId, hospitalId: meta.hospitalId, encounterId: meta.encounterId, admissionId: meta.admissionId,
    weight: w, height: h, bmi: w && h ? Math.round((w / (h / 100) ** 2) * 10) / 10 : 0,
    activityLevel: 'sedentary', bmr: 0, tdee: plan.targets.energyKcal,
    calorieTarget: plan.targets.energyKcal, proteinTarget: plan.targets.protein.min,
    carbsTarget: plan.weekly.averages.carbohydrateG, fatTarget: plan.weekly.averages.fatG, fiberTarget: plan.weekly.averages.fibreG,
    fluidTarget: plan.targets.fluidMl?.low ?? 0,
    mealFrequency: 3, snacksPerDay: plan.structure.snacksPerDay,
    dietaryRestrictions: [
      ...(r.diabetes ? ['diabetic'] : []), ...(r.ckd ? ['renal (CKD, not on dialysis)'] : []), ...(r.sodiumMgMax ? [`sodium ≤ ${r.sodiumMgMax} mg`] : []),
      ...(r.fatGMax ? [`fat ≤ ${r.fatGMax} g`] : []), ...(r.texture && r.texture !== 'regular' ? [`texture: ${r.texture}`] : []), ...(r.religious ?? []),
    ],
    foodAllergies: r.allergies ?? [], foodPreferences: r.prefer ?? [],
    mealPlans: mp,
    weeklyMenu: Object.fromEntries(mp.map((d, i) => [WEEKDAYS[i], d])),
    enteralFeeding: plan.days.some(d => d.meals.some(m => m.items.some(it => it.role === 'enteral'))),
    supplements: request.supplements?.ons && plan.supplementsUsed
      ? [{ name: request.supplements.ons.product, dosage: request.supplements.ons.unitLabel, frequency: 'as in the plan', purpose: 'oral intake insufficient' }] : [],
    planType: plan.goal.direction === 'loss' ? 'weight_loss' : plan.goal.direction === 'gain' ? 'weight_gain' : r.ckd ? 'renal' : r.diabetes ? 'diabetic' : 'standard',
    status: 'draft', approvalStatus: 'draft', version: (meta.revisionOf?.version ?? 0) + 1,
    optimiser: stored,
    startDate: ts, endDate: end, createdBy: meta.createdBy,
    notes: plan.notice,
    createdAt: ts, updatedAt: ts,
  };
}

/** Save a draft plan on this device and queue it for sync. */
export async function saveDraftMealPlan(plan: WeeklyMealPlan, request: MealPlanRequest, meta: SaveMeta): Promise<NutritionPlan> {
  const record = toNutritionPlanRecord(plan, request, meta);
  const { db } = await import('../../../database/db');
  await db.nutritionPlans.add(record);
  const { syncRecord } = await import('../../../services/cloudSyncService');
  await syncRecord('nutritionPlans', record as unknown as Record<string, unknown>);
  return record;
}
