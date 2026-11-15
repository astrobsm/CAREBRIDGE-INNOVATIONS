/**
 * Types of the stage 3 weekly meal-plan optimiser. See docs/NUTRITION_ENGINE.md,
 * "Stage 3: weekly meal-plan optimiser".
 */

import type { CostTier, NutrientKey } from '../types';
import type { ClinicalContext, ClinicianOverride, NutritionPatient } from '../engine/types';
import type { PopulationCheck } from '../engine/guards';
import type { WeightGoalPlan } from '../engine/weightGoals';
import type { RefeedingDay } from '../engine/refeeding';
import type { DietTag, PlanRole, ProteinSource, TextureLevel } from '../data/plannerCatalogue';
import type { EnergySplit } from './config';

export type { DietTag, PlanRole, ProteinSource, TextureLevel, EnergySplit };

export type MealSlot = 'breakfast' | 'mid_morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'supplement';
export type AllergyTag = 'fish' | 'shellfish' | 'egg' | 'milk' | 'groundnut' | 'tree_nut' | 'gluten';
export type ReligiousRestriction = 'no_pork' | 'no_alcohol' | 'halal' | 'no_beef' | 'vegetarian';

// ── Request ─────────────────────────────────────────────────────────────────

export interface Bounds { min: number; max?: number | null }

/** Daily targets. Build them from the stage 1 engine with buildPlanTargets(). */
export interface PlanTargets {
  /** Full daily energy target, kcal. */
  energyKcal: number;
  /** Per-day energy (refeeding schedule day N = plan day N); days past the end use energyKcal. */
  energyByDay?: number[];
  /** Protein, g/day: at least `min`; at most `max` when set (CKD not on dialysis). */
  protein: Bounds;
  /** Per-day protein (refeeding advance); days past the end use `protein`. */
  proteinByDay?: Bounds[];
  /** % of energy. Defaults to the planner config. */
  macroPercent?: { carbohydrate: { low: number; high: number }; fat: { low: number; high: number } };
  /** Total fluid, mL/day (all sources). */
  fluidMl?: { low: number; high: number } | null;
  /** How the targets were reached (engine methods, choices, assumptions). */
  derivation: string[];
}

export interface PlanRestrictions {
  /** Carbohydrate control (cap, spread across meals, no sugar-sweetened items). */
  diabetes?: boolean;
  /** Sodium, mg/day. */
  sodiumMgMax?: number | null;
  /** CKD not on dialysis. Limits in mg/day; missing limits use the config defaults (stated). */
  ckd?: { potassiumMgMax?: number | null; phosphorusMgMax?: number | null } | null;
  /** Finest texture needed. 'regular' = no modification. */
  texture?: TextureLevel;
  /** Fat, g/day. */
  fatGMax?: number | null;
  allergies?: AllergyTag[];
  religious?: ReligiousRestriction[];
  /** Food preferences: component ids or diet tags to leave out, and component ids to favour. */
  avoid?: string[];
  prefer?: string[];
  /** Highest cost tier the patient can afford. Default 'high' (no limit). */
  budget?: CostTier;
  /** Who prepares the food: the hospital kitchen or the family. Default 'family'. */
  preparer?: 'hospital_kitchen' | 'family';
  /** Fluid restriction, mL/day (food water + drinks + feeds). */
  fluidMlMax?: number | null;
  /** Heart failure: sodium is reported per item (set sodiumMgMax for the limit). */
  heartFailure?: boolean;
}

export interface PlanStructure {
  /** Days to plan, 1–7. Default 7. */
  days?: number;
  /** 2 or 3. Default 2 (3 for weight gain and refeeding). */
  snacksPerDay?: 2 | 3;
  /** Fractions of the day's energy; must sum to 1. Default 25/30/30/15. */
  energySplit?: EnergySplit;
  /** Day labels, e.g. ['Monday', ...]. Default 'Day 1'... */
  dayLabels?: string[];
}

export interface OnsProduct {
  product: string;
  /** From the product label. */
  kcalPerUnit: number;
  proteinGPerUnit: number;
  unitLabel: string;
  mlPerUnit?: number | null;
  maxUnitsPerDay: number;
}

export interface EnteralProduct {
  product: string;
  /** From the product label. */
  kcalPerMl: number;
  proteinGPerMl: number;
  maxMlPerDay: number;
}

export interface SupplementOptions {
  /** 'never' (default), 'if_needed' (only when food alone cannot meet the targets or oral intake is limited), 'always'. */
  mode?: 'never' | 'if_needed' | 'always';
  ons?: OnsProduct | null;
  enteral?: EnteralProduct | null;
  /** Fraction of the energy target the patient can manage as food (0–1]. Below 1 the rest must come from ONS/enteral feed. */
  oralIntakeFraction?: number;
}

export interface PlanGoalInput {
  direction: 'maintain' | 'loss' | 'gain';
  /** planWeightGoal() result (deficit/surplus and trajectory). */
  weightGoal?: WeightGoalPlan | null;
  /** Refeeding risk level, when the stepped schedule applies. */
  refeeding?: { level: 'high' | 'extreme'; schedule: RefeedingDay[] } | null;
  /** Needed for a weight-loss plan in a catabolic state (burns, sepsis, major wound). */
  clinicianOverride?: ClinicianOverride | null;
}

export interface MealPlanRequest {
  /** For the population guard (age, pregnancy, lactation, dialysis, PN). */
  patient: NutritionPatient;
  context?: ClinicalContext;
  targets: PlanTargets;
  goal?: PlanGoalInput;
  restrictions?: PlanRestrictions;
  structure?: PlanStructure;
  supplements?: SupplementOptions;
  /** Rotation offset, so a re-run can offer a different (still valid) menu. */
  seed?: number;
  /**
   * When a day is infeasible, also return a best-effort plan (energy and
   * protein made elastic, clearly flagged). For legacy calculators only.
   */
  bestEffort?: boolean;
}

// ── Result ──────────────────────────────────────────────────────────────────

export type PortionUnit = 'g' | 'piece' | 'portion' | 'unit' | 'mL';

export interface PlanItem {
  componentId: string;
  name: string;
  /** '' when not known for certain. */
  igboName: string;
  role: PlanRole | 'ons' | 'enteral';
  amount: { value: number; unit: PortionUnit; label: string };
  /** Raw (as purchased / before cooking) edible grams; null when it cannot be calculated. */
  rawGrams: number | null;
  /** Cooked / as-served grams; null when the yield is unknown. */
  cookedGrams: number | null;
  /** Which weight is given and why (e.g. "cooked weight; raw = cooked ÷ yield 2.98 (WAFCT)"). */
  weightNote: string;
  householdMeasure: string;
  preparationNote?: string;
  kcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  /** The micronutrients relevant to this patient (plan.relevantNutrients). null = not known. */
  micronutrients: Partial<Record<NutrientKey, number | null>>;
  /** Nutrients that are lower bounds for this item (an ingredient has no value). */
  lowerBound: NutrientKey[];
  pendingVerification: boolean;
  source: { kind: 'food' | 'recipe' | 'product'; ref: string };
}

export interface NutrientTotals {
  kcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fibreG: number;
  waterMl: number;
  sodiumMg: number;
  potassiumMg: number;
  phosphorusMg: number;
  /** Relevant micronutrients (plan.relevantNutrients), summed. */
  micronutrients: Partial<Record<NutrientKey, number>>;
  /** Nutrients for which at least one item is a lower bound. */
  lowerBound: NutrientKey[];
}

export interface PlanMeal {
  slot: MealSlot;
  label: string;
  time: string;
  /** Share of the day's energy this meal was planned for. */
  energyShare: number;
  /** Key of the meal's main dish (variety rule), null for snacks. */
  mainDish: string | null;
  /** Protein source the meal is built on (rotation rule). */
  proteinSource: ProteinSource | null;
  items: PlanItem[];
  totals: NutrientTotals;
}

export interface DayChecks {
  energyWithinTolerance: boolean;
  energyPercentOfTarget: number;
  proteinMet: boolean;
  proteinPercentOfTarget: number;
  restrictionsMet: boolean;
  portionsWithinLimits: boolean;
  /** Every failed check, in words. Empty when the day passes. */
  failures: string[];
}

export interface DaySolveInfo {
  attempts: number;
  /** 'milp' first solve passed after rounding; 'repaired_fixed' re-solved with whole units fixed; 'repaired_grid' all items on the rounding grid. */
  outcome: 'milp' | 'repaired_fixed' | 'repaired_grid' | 'best_effort';
  roundingBrokeTolerance: boolean;
  ms: { menu: number; solve: number; rounding: number; repair: number; total: number };
}

export interface PlanDay {
  day: number;
  label: string;
  energyTargetKcal: number;
  protein: Bounds;
  meals: PlanMeal[];
  totals: NutrientTotals;
  /** Drinking water to reach the fluid target after food, drinks and feeds; 0 when restricted or met. */
  drinkingWaterMl: number;
  checks: DayChecks;
  solve: DaySolveInfo;
}

export interface WeeklySummary {
  days: number;
  averages: NutrientTotals;
  vsTargets: {
    energyPercent: number;
    proteinPercent: number;
    carbohydratePercentEnergy: number;
    fatPercentEnergy: number;
    proteinPercentEnergy: number;
  };
}

export interface ConstraintRecord {
  id: string;
  label: string;
  kind: 'hard' | 'soft';
  bound: string;
}

export interface RelaxationRecord {
  day: number;
  what: string;
  why: string;
}

export interface PlanTrace {
  plannerVersion: string;
  engineConfigVersion: string;
  datasetVersion: string;
  validationStatus: string;
  constraints: ConstraintRecord[];
  relaxations: RelaxationRecord[];
  /** The solver model of each day's final solve (JSON, as given to javascript-lp-solver). */
  solverInputs: { day: number; stage: string; model: unknown }[];
  timings: { totalMs: number; perDayMs: number[]; maxDayMs: number };
  excluded: { componentId: string; reasons: string[] }[];
  seed: number;
}

export interface GoalSummary {
  direction: PlanGoalInput['direction'];
  text: string[];
  projectedKgPerWeek: number | null;
  trajectory: { week: number; projectedWeightKg: number }[];
  refeeding: { level: 'high' | 'extreme'; days: number } | null;
}

export interface WeeklyMealPlan {
  status: 'draft';
  notice: string;
  generatedAt: string;
  targets: PlanTargets;
  restrictions: PlanRestrictions;
  structure: Required<Pick<PlanStructure, 'days' | 'snacksPerDay' | 'energySplit'>>;
  goal: GoalSummary;
  relevantNutrients: NutrientKey[];
  days: PlanDay[];
  weekly: WeeklySummary;
  supplementsUsed: boolean;
  warnings: string[];
  assumptions: string[];
  trace: PlanTrace;
}

export interface ConflictExplanation {
  day: number;
  /** A minimal set of constraint groups that cannot all hold together. */
  conflictingConstraints: { id: string; label: string }[];
  /** Restrictions that left a meal with nothing to serve (menu-level conflict). */
  emptyRoles?: { slot: string; role: string; restrictions: string[] }[];
  /** For each conflicting constraint: the relaxation that would make the day feasible alone, if one does. */
  relaxations: { id: string; suggestion: string }[];
  suggestions: string[];
}

export type MealPlanResult =
  | { status: 'draft'; plan: WeeklyMealPlan }
  | { status: 'refer'; reason: string; population: PopulationCheck }
  | { status: 'blocked'; reason: string }
  | { status: 'infeasible'; conflicts: ConflictExplanation[]; summary: string; bestEffort?: WeeklyMealPlan; trace: PlanTrace };
