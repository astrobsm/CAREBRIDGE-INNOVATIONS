/**
 * Meal-plan optimiser settings (stage 3), versioned like the engine config.
 * Every number here is pending clinical validation; each carries its source
 * id from the engine's source list or 'localPolicy'.
 *
 * Changing a value: copy to a new version, bump `version`, add a changelog
 * line, and point ACTIVE_PLANNER_CONFIG at it (as for the engine config).
 */

import type { NutritionValidationStatus } from '../engine/config/types';

export interface Sourced<T> { value: T; sourceId: string; note?: string }

export interface EnergySplit { breakfast: number; lunch: number; dinner: number; snacks: number }

export interface PlannerConfig {
  version: string;
  effectiveDate: string;
  validationStatus: NutritionValidationStatus;
  changelog: string[];
  /** Daily energy must land within ± this fraction of the target (spec: 5%). */
  energyTolerance: Sourced<number>;
  /** The first solve aims inside this narrower band, leaving room for rounding. */
  solveTolerance: Sourced<number>;
  defaultEnergySplit: Sourced<EnergySplit>;
  /** Macronutrient distribution, % of energy. Upper limits are hard, lower limits soft. */
  macroPercent: Sourced<{ carbohydrate: { low: number; high: number }; fat: { low: number; high: number } }>;
  /** Diabetes: carbohydrate cap (% of energy), largest share of the day's carbohydrate in one meal, and excluded tags. */
  diabetic: Sourced<{ carbPercentMax: number; mealCarbShareMax: number }>;
  /** CKD (not on dialysis) defaults when the clinician gives no limit. */
  ckdDefaults: Sourced<{ potassiumMgMax: number; phosphorusMgMax: number }>;
  /** Weight loss: swallow cap per meal (portions) and whether oil may be added. */
  weightLoss: Sourced<{ swallowMaxPortionsPerMeal: number; oilAdditions: boolean }>;
  /** Weight gain and refeeding: snacks per day (frequent small meals). */
  frequentMeals: Sourced<{ snacksPerDay: 3 }>;
  /** During a refeeding advance, the day's protein target follows the day's energy fraction. */
  refeedingProteinFollowsEnergy: Sourced<boolean>;
  rounding: Sourced<{ gramStep: number; enteralStepMl: number }>;
  /** Alternative menus tried for a day before it is declared infeasible. */
  menuAttempts: number;
  /** No further menu attempts for a day after this many ms (keeps a phone responsive). */
  dayTimeBudgetMs: number;
  /** Meal times printed on the plan. */
  mealTimes: Record<'breakfast' | 'mid_morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'supplement', string>;
}

export const PLANNER_CONFIG_V1: PlannerConfig = {
  version: 'planner-1.0.0',
  effectiveDate: '2026-11-13',
  validationStatus: 'pending_clinical_validation',
  changelog: ['1.0.0: first version (stage 3 weekly meal-plan optimiser).'],
  energyTolerance: { value: 0.05, sourceId: 'localPolicy', note: 'Stage 3 specification: ±5% of the daily energy target.' },
  solveTolerance: { value: 0.03, sourceId: 'localPolicy', note: 'Internal; the ±5% check is applied after rounding.' },
  defaultEnergySplit: { value: { breakfast: 0.25, lunch: 0.30, dinner: 0.30, snacks: 0.15 }, sourceId: 'localPolicy',
    note: 'Stage 3 specification default; configurable per plan. Snacks share their 15% equally.' },
  macroPercent: { value: { carbohydrate: { low: 45, high: 65 }, fat: { low: 20, high: 35 } }, sourceId: 'iomAmdr2005',
    note: 'Acceptable macronutrient distribution ranges for adults. Lower limits are soft (penalised, not enforced) so a high-protein plan stays feasible.' },
  diabetic: { value: { carbPercentMax: 45, mealCarbShareMax: 0.35 }, sourceId: 'localPolicy',
    note: 'Carbohydrate control: no more than 45% of energy from carbohydrate, spread so that no meal carries more than 35% of the day\'s carbohydrate; sugar-sweetened foods and drinks excluded. Individualise.' },
  ckdDefaults: { value: { potassiumMgMax: 2346, phosphorusMgMax: 1000 }, sourceId: 'localPolicy',
    note: 'Used only when the clinician sets no limit: potassium 60 mmol/day (2346 mg), phosphate 1000 mg/day. Set per patient from the labs.' },
  weightLoss: { value: { swallowMaxPortionsPerMeal: 1, oilAdditions: false }, sourceId: 'localPolicy' },
  frequentMeals: { value: { snacksPerDay: 3 }, sourceId: 'localPolicy' },
  refeedingProteinFollowsEnergy: { value: true, sourceId: 'localPolicy',
    note: 'Protein is advanced with energy during the stepped refeeding schedule, reaching the full target with the full energy target. Physician/dietitian to confirm.' },
  rounding: { value: { gramStep: 5, enteralStepMl: 10 }, sourceId: 'localPolicy' },
  menuAttempts: 10,
  dayTimeBudgetMs: 1500,
  mealTimes: { breakfast: '07:30', mid_morning: '10:30', lunch: '13:00', afternoon: '16:00', dinner: '19:00', evening: '21:00', supplement: 'as prescribed' },
};

export const ACTIVE_PLANNER_CONFIG = PLANNER_CONFIG_V1;

/** Citations for the planner's own source ids (the rest come from the engine config). */
export const PLANNER_SOURCES: Record<string, string> = {
  iomAmdr2005: 'Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. Washington DC: National Academies Press; 2005 (acceptable macronutrient distribution ranges).',
  localPolicy: 'Local policy (AstroHEALTH nutrition module), pending clinical validation.',
};

/** The standard notice on every generated plan. */
export const DRAFT_NOTICE = 'Generated by decision-support software. Review before clinical use.';
