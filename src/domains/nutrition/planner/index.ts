/**
 * Adult clinical nutrition — stage 3: the weekly meal-plan optimiser.
 * See docs/NUTRITION_ENGINE.md, "Stage 3: weekly meal-plan optimiser".
 *
 *   buildPlanTargets()   targets from the stage 1 engine
 *   planWeeklyMeals()    the optimised 7-day plan (or why there is none)
 *   checkVariety()       the variety rules, checked on a finished plan
 *   toPatientPlan()      the plain-English plan for the patient
 *   saveDraftMealPlan()  save as a draft NutritionPlan (version, inputs, trace)
 */

export * from './types';
export { ACTIVE_PLANNER_CONFIG, PLANNER_CONFIG_V1, PLANNER_SOURCES, DRAFT_NOTICE, type PlannerConfig } from './config';
export { buildPlanTargets, type TargetsInput, type TargetsResult } from './targets';
export { planWeeklyMeals, relevantNutrients } from './plan';
export { checkVariety, type VarietyReport } from './variety';
export { toPatientPlan, type PatientPlan, type PatientPlanDay, type PatientPlanLine, type PatientPlanMeal } from './patientPlan';
export { toNutritionPlanRecord, saveDraftMealPlan, type SaveMeta } from './persist';
export { plannerCatalogue, describeAmount, fmtCount, type PlanComponent } from './catalogue';
export { MAX_MAIN_DISH_PER_WEEK } from './menu';
