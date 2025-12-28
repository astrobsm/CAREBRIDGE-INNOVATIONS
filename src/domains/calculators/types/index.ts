// Clinical Calculator Types for CareBridge
// Adapted from Critical Care Calculator - Bonnesante Medicals

export interface PatientCalculatorInfo {
  name: string;
  age: string;
  gender: 'male' | 'female' | 'elderly-male' | 'elderly-female';
  weight?: string;
  height?: string;
  hospital?: string;
  hospitalNumber?: string;
  diagnosis?: string;
  comorbidities: string[];
}

// Sodium Calculator Types
export type VolumeStatus = 'hypovolemic' | 'euvolemic' | 'hypervolemic';
export type Gender = 'male' | 'female' | 'elderly-male' | 'elderly-female';

export interface SodiumResult {
  current: number;
  target: number;
  weight: number;
  tbw: string;
  sodiumDeficit: string;
  severity: string;
  severityClass: string;
  maxCorrection: number;
  correctionTime: number;
  fluidType: string;
  fluidStrategy: string;
  waterDeficit: string | null;
  changePerLiterNS: string;
  volumeNSNeeded: string;
  infusionRateMlPerHr: string;
  isHypo: boolean;
  isHyper: boolean;
  volumeStatus: VolumeStatus;
  isAcute: boolean;
  hasSymptoms: boolean;
  gender: Gender;
}

// Potassium Calculator Types
export interface PotassiumResult {
  current: number;
  severity: string;
  severityClass: string;
  deficit: string;
  replacementPlan: string[];
  infusionRate: string;
  ecgFindings: string[];
  monitoring: string[];
  contraindications: string[];
  warnings: string[];
}

// Acid-Base Calculator Types
export type AcidBaseDisorder = 
  | 'Normal'
  | 'Respiratory Acidosis'
  | 'Respiratory Alkalosis'
  | 'Metabolic Acidosis'
  | 'Metabolic Alkalosis'
  | 'Mixed Disorder';

export interface AcidBaseResult {
  ph: number;
  pco2: number;
  hco3: number;
  primaryDisorder: AcidBaseDisorder;
  compensation: string;
  isCompensated: boolean;
  anionGap: number;
  correctedAnionGap: number;
  interpretation: string[];
  differentialDiagnosis: string[];
  treatment: string[];
  monitoring: string[];
}

// GFR Calculator Types
export type CKDStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export interface GFRResult {
  gfrCKDEPI: number;
  gfrCockcroftGault: number;
  ckdStage: CKDStage;
  stageDescription: string;
  recommendations: string[];
  drugDosingAdjustments: string[];
  referralCriteria: string[];
}

// DVT Risk Calculator Types (Caprini Score)
export interface DVTRiskResult {
  score: number;
  riskLevel: string;
  riskPercentage: string;
  scoreBreakdown: {
    '5-point': string[];
    '3-point': string[];
    '2-point': string[];
    '1-point': string[];
  };
  recommendations: string[];
  prophylaxis: string[];
  specificProtocols?: string[];
  additionalRecommendations: string[];
  availableMedications: string[];
  warningSigns: string[];
  educationPoints?: string[];
}

// Burns Calculator Types
export interface ParklandFluid {
  totalFluid24h: number;
  first8Hours: number;
  next16Hours: number;
  hourlyFirst8: number;
  hourlyNext16: number;
}

export interface NutritionNeeds {
  calories: number;
  protein: number;
}

export interface BurnsResult {
  tbsa: number;
  parklandTotal: number;
  parklandFirst8Hours: number;
  parklandNext16Hours: number;
  hourlyRateFirst8: number;
  hourlyRateNext16: number;
  parklandFluid?: ParklandFluid;
  absiScore: number;
  absiMortality: string;
  absiPrognosis?: string;
  absiSurvival?: string;
  laMerIndexScore?: number;
  laMerMortality?: string;
  severity: string;
  recommendations: string[];
  resuscitationEndpoints: string[];
  fluidAdjustment?: string;
  referralCriteria?: string[];
  woundCare?: string[];
  painManagement?: string[];
  nutritionNeeds?: NutritionNeeds;
  tetanusRecommendation?: string;
  antibioticGuidance?: string;
  monitoring?: string[];
}

// MUST Assessment Types
export type MUSTRiskLevel = 'low' | 'medium' | 'high';

export interface MUSTResult {
  bmiScore: number;
  weightLossScore: number;
  acuteIllnessScore: number;
  totalScore: number;
  riskLevel: MUSTRiskLevel;
  recommendations: string[];
  referralNeeded: boolean;
  nutritionalPlan: string[];
}

// Pressure Sore Calculator Types (Braden Scale)
export interface BradenSubscore {
  score: number;
  label: string;
  name?: string;
  max?: number;
}

export interface BradenResult {
  sensoryPerception?: number;
  moisture?: number;
  activity?: number;
  mobility?: number;
  nutrition?: number;
  frictionShear?: number;
  totalScore: number;
  riskLevel: string;
  preventionStrategies?: string[];
  repositioningSchedule?: string;
  surfaceRecommendation?: string;
  subscores?: Record<string, BradenSubscore>;
  interventions?: string[];
  turningSchedule?: string;
  supportSurface?: string;
  skinCare?: string[];
  monitoring?: string[];
  highRiskAreas?: string[];
  equipmentList?: string[];
  resourceLimitedOptions?: string[];
  lowestScores?: string[];
}

// Sickle Cell Management Types
export interface SickleCellResult {
  crisisType: string;
  severity: string;
  hydrationRequirement: number;
  painManagement: string[];
  transfusionNeeded: boolean;
  transfusionType?: string;
  antibioticProphylaxis: string[];
  hydroxyureaIndicated: boolean;
  hydroxyureaDose?: string;
  monitoring: string[];
  emergencyReferral: boolean;
  referralReasons?: string[];
}

// BNF Drug Calculator Types
export interface DrugDose {
  drug: string;
  drugName?: string;
  drugClass?: string;
  indication: string;
  standardDose: string;
  weightBasedDose?: string;
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  isRenalAdjusted?: boolean;
  isHepaticAdjusted?: boolean;
  gfrUsed?: number;
  maxDose: string;
  frequency: string;
  route: string;
  contraindications: string[];
  interactions: string[];
  monitoring: string[];
  sideEffects?: string[];
  specialNotes?: string[];
  specialPopulations?: {
    elderly?: string;
    pregnancy?: string;
    breastfeeding?: string;
  };
}

// Nutrition Calculator Types
export interface NutritionResult {
  bmr: number;
  mifflinBmr: number;
  tdee: number;
  activityFactor: number;
  stressMultiplier: number;
  proteinNeeds: number;
  proteinFactor: number;
  proteinRationale: string;
  carbNeeds: number;
  fatNeeds: number;
  fluidNeeds: number;
  fluidRationale: string;
  micronutrients: string[];
  mealPlan: {
    breakfast: string[];
    midMorning: string[];
    lunch: string[];
    afternoon: string[];
    dinner: string[];
    evening: string[];
    highProteinOptions: string[];
    caloricBoosters: string[];
  };
  specialConsiderations: string[];
  macroBreakdown: {
    protein: { grams: number; calories: number; percentage: number };
    carbs: { grams: number; calories: number; percentage: number };
    fat: { grams: number; calories: number; percentage: number };
  };
}

export interface MealPlanItem {
  meal: string;
  time: string;
  foods: string[];
  calories: number;
  protein: number;
}

// Wound Healing Meal Plan Types
export interface WoundHealingMealPlan {
  phase: 'inflammatory' | 'proliferative' | 'remodeling';
  dailyCalories: number;
  dailyProtein: number;
  keyNutrients: string[];
  africanFoods: MealPlanItem[];
  supplements: string[];
  hydration: string;
  contraindicated: string[];
}

// Weight Management Types
export interface WeightManagementResult {
  direction: 'loss' | 'gain';
  currentWeight: number;
  targetWeight: number;
  currentBMI: number;
  targetBMI: number;
  idealWeight: number;
  weightChange: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  dailyDeficit: number;
  proteinTarget: number;
  weeksNeeded: number;
  monthsNeeded: number;
  weeklyRate: number;
  exerciseRecommendations: string[];
  dietarySuggestions: {
    toEat: string[];
    toLimit: string[];
    mealTiming: string[];
    highCalorieMeals?: string[];
  };
  medicalConsiderations: string[];
  milestones: { weight: number; achievement: string }[];
  warnings: string[];
  supplements?: string[];
  bmiCategory?: string;
  dailyCalorieTarget?: number;
  weeklyGoal?: number;
  estimatedTimeToGoal?: string;
  mealPlan?: MealPlanItem[];
  monitoring?: string[];
}

// Common Comorbidities
export const COMMON_COMORBIDITIES = [
  'Diabetes Mellitus',
  'Hypertension',
  'Chronic Kidney Disease',
  'Heart Failure',
  'COPD',
  'Asthma',
  'Liver Cirrhosis',
  'Coronary Artery Disease',
  'Atrial Fibrillation',
  'Stroke/CVA',
  'Obesity',
  'Malnutrition',
  'HIV/AIDS',
  'Cancer',
  'Immunosuppression',
  'Sickle Cell Disease',
] as const;

// Nigerian Hospitals
export const NIGERIAN_HOSPITALS = [
  'St Marys Hospital',
  'Niger Foundation Hospital',
  'Raymond Anikwe Hospital',
  'St Patrics Hospital',
  'Penoks Hospital',
  'UNTH Ituku Ozalla',
  'Mercy Hospital',
  'National Hospital Abuja',
  'Lagos University Teaching Hospital',
  'University College Hospital Ibadan',
  'Ahmadu Bello University Teaching Hospital',
  'University of Nigeria Teaching Hospital',
] as const;
