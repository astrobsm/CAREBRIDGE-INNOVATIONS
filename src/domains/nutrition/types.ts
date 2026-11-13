/**
 * Adult clinical nutrition — the ONE set of domain types (stage 2).
 *
 * Everything the nutrition module stores or exchanges is typed here. The old
 * names are kept as re-exports so existing callers compile:
 *   - src/types/index.ts re-exports NutritionAssessment, MUSTScore, MealPlan,
 *     Meal, NutritionPlan, NutritionMealPlan, NutritionMeal,
 *     NutritionFoodItem, WeeklyMenu, NutritionSupplement from here;
 *   - services/nutritionPlannerService.ts re-exports its NutritionAssessment,
 *     FoodItem, MealPlan, DailyMeal, MealItem, NutritionSupplement,
 *     NutritionStatus, FeedingRoute, DietType, MealType, FoodCategory as
 *     aliases of the Planner* types below.
 *
 * Stored rows are the *Record types. Cloud columns are their snake_case
 * names (services/cloudSyncService converts), so a field added here needs a
 * column in supabase/migrations (see 20261107120000_nutrition_module.sql).
 */

import type { NutritionAssessment as EngineAssessment, NutritionAssessmentInput } from './engine/assess';

// ── Nutrients and food composition ──────────────────────────────────────────

/** Nutrients carried per 100 g edible portion. Units in NUTRIENT_UNITS. */
export type NutrientKey =
  | 'energyKcal' | 'energyKj' | 'water' | 'protein' | 'fat' | 'carbohydrate' | 'fibre'
  | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'zinc' | 'phosphorus' | 'magnesium'
  | 'vitaminARae' | 'vitaminC' | 'folateDfe';

export const NUTRIENT_KEYS: readonly NutrientKey[] = [
  'energyKcal', 'energyKj', 'water', 'protein', 'fat', 'carbohydrate', 'fibre',
  'sodium', 'potassium', 'calcium', 'iron', 'zinc', 'phosphorus', 'magnesium',
  'vitaminARae', 'vitaminC', 'folateDfe',
];

export const NUTRIENT_UNITS: Record<NutrientKey, 'kcal' | 'kJ' | 'g' | 'mg' | 'mcg'> = {
  energyKcal: 'kcal', energyKj: 'kJ', water: 'g', protein: 'g', fat: 'g', carbohydrate: 'g', fibre: 'g',
  sodium: 'mg', potassium: 'mg', calcium: 'mg', iron: 'mg', zinc: 'mg', phosphorus: 'mg', magnesium: 'mg',
  vitaminARae: 'mcg', vitaminC: 'mg', folateDfe: 'mcg',
};

/** null = not known (never 0). */
export type NutrientProfile = Record<NutrientKey, number | null>;

/**
 * How a source value was given: [bracketed] = estimated/imputed/lower quality
 * or the alternative definition in the column header; trace = "tr" (stored 0).
 */
export type NutrientValueFlag = 'bracketed' | 'trace' | 'bracketed_trace';

export interface FoodSourceRef {
  table: string;           // 'WAFCT 2019'
  code: string;            // table's own food code, e.g. '02_039'
  version: string;
  url: string;
  retrievedAt?: string | null;
}

export type CostTier = 'low' | 'medium' | 'high';
export type FoodAvailability = 'hospital_kitchen' | 'home' | 'market';

/** Optional planning attributes the stage 3 optimiser needs. */
export interface PlanningAttributes {
  costTier?: CostTier;
  /** Free text or months, e.g. 'all year', 'rainy season (Apr–Oct)'. */
  seasonality?: string;
  availability?: FoodAvailability[];
  minPortionG?: number;
  maxPortionG?: number;
}

/** A food composition entry (reference data, shared by all hospitals). */
export interface Food extends PlanningAttributes {
  /** `${sourceKey}:${code}`, e.g. 'wafct2019:02_039'. */
  id: string;
  code: string;
  name: string;
  localNames?: string[];
  foodGroup: string | null;
  groupCode: string;
  scientificName?: string | null;
  biblioId?: string | null;
  /** WAFCT EDIBLE1: edible fraction from as purchased to as described. */
  ediblePortionFactor: number | null;
  ediblePortionAsEaten?: number | null;
  per100g: NutrientProfile;
  flags?: Partial<Record<NutrientKey, NutrientValueFlag>>;
  /** Cooked weight / raw weight for this (cooked) entry; null when not published. */
  yieldFactor: number | null;
  yieldFactorSource?: string | null;
  source: FoodSourceRef;
  createdAt?: string;
  updatedAt?: string;
}

/** Fraction of a nutrient kept on cooking, by food type and process (WAFCT sheet 08). */
export interface RetentionFactorSet {
  id: string;
  foodType: string;
  process: string;
  factors: Partial<Record<NutrientKey, number>>;
}

export type VerificationStatus = 'pending_dietitian_verification' | 'verified' | 'rejected';

export interface RecipeIngredient {
  /** WAFCT food code of the ingredient, as weighed RAW (or as purchased-ready, e.g. gari). */
  foodCode: string;
  /** Raw edible grams per ONE portion. */
  rawGrams: number;
  /** Retention factor set (RetentionFactorSet.id) for the cooking this ingredient gets; null = none applied. */
  retentionId?: string | null;
  /** When the intended local ingredient is not in WAFCT and a similar food stands in for it. */
  substituteFor?: { intended: string; reason: string };
  note?: string;
}

/**
 * A standard recipe. Nutrients are CALCULATED from the ingredients (raw
 * grams × composition × retention); they are never typed in.
 */
export interface Recipe extends PlanningAttributes {
  id: string;
  name: string;
  localNames: string[];
  category: 'soup' | 'swallow' | 'main' | 'side' | 'snack' | 'breakfast' | 'beverage';
  region?: string;
  portionLabel: string;
  ingredients: RecipeIngredient[];
  /**
   * Cooked weight / total raw weight of the recipe. null = not measured: the
   * per-portion nutrients still compute, the cooked portion weight does not.
   */
  yieldFactor: number | null;
  yieldFactorNote: string;
  verificationStatus: VerificationStatus;
  /** Where the ingredient grams came from. */
  estimateNote: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HouseholdMeasure {
  id: string;
  name: string;
  localName?: string;
  /** What it measures: 'any', a food category ('swallow', 'rice', 'meat', ...), a food code or a recipe id. */
  appliesTo: string;
  grams: number;
  gramsRange?: { low: number; high: number };
  verificationStatus: 'to_be_verified_by_local_weighing' | 'verified';
  note: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Patient records ─────────────────────────────────────────────────────────

export type MeasurementKind =
  | 'weight' | 'height' | 'muac' | 'calf_circumference' | 'knee_height' | 'ulna_length'
  | 'triceps_skinfold' | 'subscapular_skinfold' | 'grip_strength' | 'waist_circumference';

export type MeasurementMethod = 'measured' | 'bed_scale' | 'hoist' | 'chair_scale' | 'reported' | 'estimated';

export const MEASUREMENT_UNITS: Record<MeasurementKind, string> = {
  weight: 'kg', height: 'cm', muac: 'cm', calf_circumference: 'cm', knee_height: 'cm', ulna_length: 'cm',
  triceps_skinfold: 'mm', subscapular_skinfold: 'mm', grip_strength: 'kg', waist_circumference: 'cm',
};

/** One anthropometric measurement in a patient's series. */
export interface NutritionMeasurement {
  id: string;
  patientId: string;
  hospitalId?: string;
  admissionId?: string;
  encounterId?: string;
  measuredAt: string;
  kind: MeasurementKind;
  value: number;
  unit: string;
  method: MeasurementMethod;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** How much of a served item was eaten. */
export type FractionEaten = 0 | 0.25 | 0.5 | 0.75 | 1;
export const FRACTIONS_EATEN: readonly FractionEaten[] = [0, 0.25, 0.5, 0.75, 1];

export type IntakeItem =
  | {
    kind: 'food' | 'recipe';
    id: string;
    meal?: string;
    /** food code (kind 'food') or recipe id (kind 'recipe'). */
    ref: string;
    name: string;
    /** Grams served (cooked weight for a recipe when its yield is known). Or give portions. */
    servedGrams?: number;
    /** Recipe portions served, or household measures (with householdMeasureId). */
    servedPortions?: number;
    householdMeasureId?: string;
    fractionEaten: FractionEaten;
  }
  | {
    kind: 'ons';
    id: string;
    meal?: string;
    product: string;
    units: number;
    kcalPerUnit: number | null;
    proteinGPerUnit: number | null;
    fractionEaten: FractionEaten;
  }
  | {
    kind: 'enteral';
    id: string;
    product: string;
    mlDelivered: number;
    kcalPerMl: number | null;
    proteinGPerMl: number | null;
  };

export interface IntakeTotals {
  kcal: number | null;
  proteinG: number | null;
  /** False when any item could not be converted; see `missing`. */
  complete: boolean;
  missing: string[];
  byItem: { id: string; kcal: number | null; proteinG: number | null }[];
  datasetVersion: string;
  computedAt: string;
}

/** One patient-day of recorded intake. */
export interface NutritionIntake {
  id: string;
  patientId: string;
  hospitalId?: string;
  admissionId?: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  items: IntakeItem[];
  /** Computed by intakeService; never typed in. */
  totals?: IntakeTotals;
  /** Mirrors of totals for querying and cloud columns. */
  kcal?: number | null;
  proteinG?: number | null;
  recordedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalDecision = 'approved' | 'rejected' | 'changes_requested';

/** A sign-off (or not) of a nutrition plan version. Append-only. */
export interface NutritionApproval {
  id: string;
  patientId: string;
  hospitalId?: string;
  planId: string;
  planVersion: number;
  decision: ApprovalDecision;
  reason?: string;
  decidedBy: string;
  decidedByName?: string;
  role: string;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Assessment (stored) ─────────────────────────────────────────────────────

/** MUST step scores. */
export interface MUSTScore {
  bmiScore: 0 | 1 | 2;
  weightLossScore: 0 | 1 | 2;
  acuteIllnessScore: 0 | 2;
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export type NutritionStatus = 'normal' | 'mild_malnutrition' | 'moderate_malnutrition' | 'severe_malnutrition' | 'overweight' | 'obese';
export type FeedingRoute = 'oral' | 'enteral_ng' | 'enteral_peg' | 'parenteral' | 'mixed';

export interface AssessmentMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: string[];
  calories: number;
  notes?: string;
}

export interface AssessmentMealPlan {
  id: string;
  targetCalories: number;
  proteinRequirement: number; // g/day
  meals: AssessmentMeal[];
  specialInstructions?: string;
}

/** Where each engine input came from (traceability of the assessment). */
export interface AssessmentInputSource {
  field: string;
  value: number | string | boolean | null;
  unit?: string;
  source: 'vital_signs' | 'nutrition_measurement' | 'lab' | 'patient_record' | 'clinician_entry';
  recordId?: string;
  recordedAt?: string;
  note?: string;
}

/** The engine's full traceable output, stored on the assessment. */
export interface StoredEngineAssessment {
  method: 'assessNutrition';
  configVersion: string;
  validationStatus: string;
  input: NutritionAssessmentInput;
  inputSources: AssessmentInputSource[];
  result: EngineAssessment;
  ranAt: string;
}

/**
 * A stored nutrition assessment (Dexie nutritionAssessments / cloud
 * nutrition_assessments). Older rows may carry the MUST breakdown in
 * `mustScore`; Dexie v93 moves it to `mustBreakdown` (see mustTotal()).
 */
export interface NutritionAssessmentRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  hospitalId?: string;
  weight?: number;
  height?: number;
  /** MUST total (cloud column INTEGER). */
  mustScore?: number;
  mustBreakdown?: MUSTScore;
  /** An old mustScore value that was neither an integer nor a usable breakdown (kept, not interpreted). */
  mustScoreLegacy?: unknown;
  bmi?: number;
  bmiCategory?: string;
  idealBodyWeight?: number;
  adjustedBodyWeight?: number;
  status?: NutritionStatus;
  /** SGA grade. Only meaningful when sgaSource === 'sga_form'. */
  sgaGrade?: 'A' | 'B' | 'C';
  sgaSource?: 'sga_form';
  anthropometrics?: {
    weight: number;
    height: number;
    bmi: number;
    waistCircumference?: number;
    midArmCircumference?: number;
  };
  albumin?: number;
  prealbumin?: number;
  transferrin?: number;
  handGripStrength?: number;
  midArmCircumference?: number;
  tricepsSkinfold?: number;
  appetiteLevel?: 'good' | 'fair' | 'poor' | 'none';
  religiousDietaryNeeds?: string;
  currentFeedingRoute?: FeedingRoute;
  estimatedIntake?: number;
  caloricRequirement?: number;
  proteinRequirement?: number;
  fluidRequirement?: number;
  dietaryHistory?: string;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  allergies?: string[];
  nutritionalDiagnosis?: string;
  mealPlan?: AssessmentMealPlan;
  supplementation?: string[];
  notes?: string;
  /** Stage 2: the engine's traceable output. */
  engine?: StoredEngineAssessment;
  engineMethod?: string;
  configVersion?: string;
  validationStatus?: string;
  assessedBy: string;
  assessedAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/** MUST total of a stored assessment, old or new shape. */
export function mustTotal(a: { mustScore?: unknown; mustBreakdown?: MUSTScore }): number | null {
  if (typeof a.mustScore === 'number' && Number.isFinite(a.mustScore)) return a.mustScore;
  const legacy = a.mustScore as { totalScore?: unknown; total?: unknown } | null | undefined;
  if (legacy && typeof legacy === 'object') {
    const t = typeof legacy.totalScore === 'number' ? legacy.totalScore : legacy.total;
    if (typeof t === 'number' && Number.isFinite(t)) return t;
  }
  return a.mustBreakdown ? a.mustBreakdown.totalScore : null;
}

// ── Nutrition plan (stored) ─────────────────────────────────────────────────

export interface NutritionFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface NutritionMeal {
  type: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
  time: string;
  foods: NutritionFoodItem[];
  totalCalories: number;
  notes?: string;
}

export interface NutritionMealPlan {
  dayOfWeek: number;
  meals: NutritionMeal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface WeeklyMenu {
  [key: string]: NutritionMealPlan; // 'monday', 'tuesday', etc.
}

export interface NutritionSupplement {
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  duration?: string;
}

export interface NutritionPlan {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  hospitalId?: string;
  weight: number;
  height: number;
  bmi: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  clinicalCondition?: string;
  stressFactor?: number;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  fluidTarget: number;
  mealFrequency: number;
  snacksPerDay: number;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  foodPreferences?: string[];
  mealPlans?: NutritionMealPlan[];
  weeklyMenu?: WeeklyMenu;
  enteralFeeding?: boolean;
  enteralFormula?: string;
  enteralRate?: number;
  parenteralNutrition?: boolean;
  parenteralDetails?: { type: string; volume: number; rate: number; composition: string };
  supplements?: NutritionSupplement[];
  monitoringParameters?: string[];
  weightGoals?: { targetWeight: number; weeklyChange: number; targetDate: Date };
  planType: 'standard' | 'weight_loss' | 'weight_gain' | 'renal' | 'diabetic' | 'cardiac' | 'oncology' | 'pediatric' | 'geriatric' | 'custom';
  status: 'active' | 'completed' | 'on_hold' | 'discontinued';
  /** Stage 2: version number approvals refer to (nutritionApprovals.planVersion). */
  version?: number;
  approvalStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'changes_requested';
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Nutrition planner (in-memory view models of NutritionPlannerPage) ───────

export type DietType = 'regular' | 'soft' | 'liquid' | 'pureed' | 'diabetic' | 'renal' | 'cardiac' | 'high_protein' | 'low_residue' | 'clear_liquid';
export type PlannerMealType = 'breakfast' | 'mid_morning' | 'lunch' | 'afternoon' | 'dinner' | 'supper';
export type PlannerFoodCategory = 'cereals' | 'legumes' | 'vegetables' | 'fruits' | 'meat' | 'fish' | 'dairy' | 'oils' | 'beverages' | 'traditional';

/** MUST as the planner shows it (`risk`, not `riskLevel`). */
export interface PlannerMustResult {
  bmiScore: number;
  weightLossScore: number;
  acuteIllnessScore: number;
  totalScore: number;
  risk: 'low' | 'medium' | 'high';
}

/**
 * The planner's assessment form result (not stored as is). Convert with
 * plannerAssessmentToRecord() before saving.
 */
export type PlannerAssessment = Omit<NutritionAssessmentRecord, 'mustScore' | 'assessedAt'> & {
  assessedAt: Date;
  weight: number;
  height: number;
  bmi: number;
  bmiCategory: string;
  idealBodyWeight: number;
  mustScore: PlannerMustResult;
  status: NutritionStatus;
  appetiteLevel: 'good' | 'fair' | 'poor' | 'none';
  dietaryRestrictions: string[];
  allergies: string[];
  currentFeedingRoute: FeedingRoute;
  estimatedIntake: number;
  caloricRequirement: number;
  proteinRequirement: number;
  fluidRequirement: number;
};

export function plannerAssessmentToRecord(a: PlannerAssessment): NutritionAssessmentRecord {
  const { mustScore, ...rest } = a;
  return {
    ...rest,
    mustScore: mustScore.totalScore,
    mustBreakdown: {
      bmiScore: mustScore.bmiScore as 0 | 1 | 2,
      weightLossScore: mustScore.weightLossScore as 0 | 1 | 2,
      acuteIllnessScore: mustScore.acuteIllnessScore as 0 | 2,
      totalScore: mustScore.totalScore,
      riskLevel: mustScore.risk,
    },
  };
}

/** A planner food with per-serving values (derived from the food dataset). */
export interface PlannerFoodItem {
  id: string;
  name: string;
  localName?: string;
  category: PlannerFoodCategory;
  servingSize: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sodium?: number;
  potassium?: number;
  phosphorus?: number;
  calcium?: number;
  iron?: number;
  vitaminA?: number;
  vitaminC?: number;
  isHighProtein: boolean;
  isLowSodium: boolean;
  isLowPotassium: boolean;
  isDiabeticFriendly: boolean;
  isRenalFriendly: boolean;
  seasonality?: string;
  costCategory: 'low' | 'medium' | 'high';
  /** Stage 2: where the numbers come from. */
  source?: { kind: 'food' | 'recipe'; ref: string; grams: number; datasetVersion: string };
}

export interface PlannerMealItem {
  foodId: string;
  foodName: string;
  servings: number;
  calories: number;
  protein: number;
  preparation?: string;
}

export interface PlannerDailyMeal {
  id: string;
  mealType: PlannerMealType;
  time: string;
  items: PlannerMealItem[];
  totalCalories: number;
  totalProtein: number;
  notes?: string;
}

export interface PlannerSupplement {
  name: string;
  type: 'oral' | 'enteral' | 'parenteral';
  dose: string;
  frequency: string;
  calories?: number;
  protein?: number;
  indication: string;
}

export interface PlannerMealPlan {
  id: string;
  patientId: string;
  createdBy: string;
  createdAt: Date;
  validFrom: Date;
  validUntil: Date;
  dietType: DietType;
  feedingRoute: FeedingRoute;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFluid: number;
  restrictions: string[];
  allergies: string[];
  meals: PlannerDailyMeal[];
  supplements: PlannerSupplement[];
  monitoringFrequency: string;
  weightCheckFrequency: string;
  notes?: string;
  status: 'active' | 'completed' | 'discontinued';
}
