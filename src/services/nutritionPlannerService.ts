/**
 * Nutrition Planner Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive nutrition assessment and meal planning
 * Based on African Food Composition Tables and WHO guidelines
 */

import { v4 as uuidv4 } from 'uuid';
import {
  calculateBMI as canonicalBMI, calculateIdealBodyWeight, adjustedBodyWeightFromIbw, calculateHarrisBenedictBMR,
} from '../domains/calculators/engine/calculationEngine';
import { scoreMust } from '../domains/clinician-assistant/services/riskCalculators';
import { bmiClass } from '../domains/nutrition/engine/anthropometry';
import { mustBmiScore, mustWeightLossScore } from '../domains/nutrition/engine/screening';
import { ACTIVE_NUTRITION_CONFIG } from '../domains/nutrition/engine/config';
import { plannerFoodItems } from '../domains/nutrition/services/legacyFoodAdapters';
import type {
  NutritionStatus, FeedingRoute, DietType, PlannerFoodCategory as FoodCategory, PlannerMealType as MealType,
  PlannerDailyMeal as DailyMeal, PlannerSupplement as NutritionSupplement,
  PlannerAssessment as NutritionAssessment, PlannerFoodItem as FoodItem, PlannerMealPlan as MealPlan,
} from '../domains/nutrition/types';

// ============================================
// TYPE DEFINITIONS — aliases of the nutrition domain types
// (src/domains/nutrition/types.ts), kept so callers compile.
// ============================================

export type {
  NutritionStatus, FeedingRoute, DietType,
  PlannerMealType as MealType, PlannerFoodCategory as FoodCategory,
  PlannerAssessment as NutritionAssessment, PlannerFoodItem as FoodItem,
  PlannerMealPlan as MealPlan, PlannerDailyMeal as DailyMeal, PlannerMealItem as MealItem,
  PlannerSupplement as NutritionSupplement,
} from '../domains/nutrition/types';

// ============================================
// AFRICAN FOOD DATABASE — derived from WAFCT 2019 and the seed recipes
// ============================================

// Per-serving values are calculated from the FAO/INFOODS West African Food
// Composition Table 2019 (src/domains/nutrition/data/legacyFoodSpecs.ts maps
// each item). The diet-suitability flags and cost categories are carried over
// from the retired hand-typed list; they are labels, not composition.
export const africanFoodDatabase: FoodItem[] = plannerFoodItems();

// ============================================
// MUST SCREENING TOOL
// ============================================

export const mustScreeningCriteria = {
  bmiScoring: [
    { range: '>20', score: 0, description: 'Normal' },
    { range: '18.5-20', score: 1, description: 'At risk' },
    { range: '<18.5', score: 2, description: 'Underweight' },
  ],
  weightLossScoring: [
    { range: '<5%', score: 0, description: 'Minimal' },
    { range: '5-10%', score: 1, description: 'Moderate' },
    { range: '>10%', score: 2, description: 'Significant' },
  ],
  acuteIllnessScoring: {
    description: 'Patient is acutely ill AND has been or is likely to have no nutritional intake for >5 days',
    score: 2,
  },
  riskCategories: [
    { score: 0, risk: 'low' as const, action: 'Routine clinical care. Repeat screening weekly in hospital.' },
    { score: 1, risk: 'medium' as const, action: 'Observe dietary intake for 3 days. If adequate, little concern. If not, clinical concern - follow local policy.' },
    { score: '>=2', risk: 'high' as const, action: 'Treat - refer to dietitian, improve and increase nutritional intake, monitor and review.' },
  ],
};

// ============================================
// NUTRITION SERVICE CLASS
// ============================================

// The arithmetic below delegates to the canonical calculation engine and the
// nutrition engine (src/domains/nutrition/engine); ranges come from the
// nutrition config. Nothing here re-implements a formula.
class NutritionPlannerService {
  // Calculate BMI (canonical calculateBMI; WHO class incl. underweight grades)
  calculateBMI(weightKg: number, heightCm: number): { bmi: number; category: string } {
    const bmi = canonicalBMI(weightKg, heightCm);
    if (bmi === null) return { bmi: NaN, category: 'Not calculable' };
    return { bmi, category: bmiClass(bmi) };
  }

  // Calculate Ideal Body Weight (Devine, canonical)
  calculateIdealBodyWeight(heightCm: number, isMale: boolean): number {
    return calculateIdealBodyWeight(heightCm, isMale ? 'male' : 'female') ?? NaN;
  }

  // Calculate Adjusted Body Weight (canonical: IBW + 0.4 × (ABW − IBW); ABW if ABW ≤ IBW)
  calculateAdjustedBodyWeight(actualWeight: number, idealWeight: number): number {
    return adjustedBodyWeightFromIbw(actualWeight, idealWeight) ?? NaN;
  }

  // Calculate MUST Score
  calculateMUSTScore(
    bmi: number,
    weightLossPercent: number,
    hasAcuteIllness: boolean,
    noIntakeExpected: boolean
  ): NutritionAssessment['mustScore'] {
    // Step scores from the nutrition engine; total from canonical scoreMust.
    const bmiScore = mustBmiScore(bmi);
    const weightLossScore = mustWeightLossScore(weightLossPercent);
    const acuteIllnessScore = hasAcuteIllness && noIntakeExpected ? 2 : 0;

    const totalScore = scoreMust({ bmi_score: bmiScore, weight_loss_score: weightLossScore, acute_disease_score: acuteIllnessScore });
    
    let risk: 'low' | 'medium' | 'high';
    if (totalScore === 0) risk = 'low';
    else if (totalScore === 1) risk = 'medium';
    else risk = 'high';

    return {
      bmiScore,
      weightLossScore,
      acuteIllnessScore,
      totalScore,
      risk,
    };
  }

  // Calculate caloric requirements (Harris-Benedict with stress factors)
  calculateCaloricRequirements(
    weightKg: number,
    heightCm: number,
    ageYears: number,
    isMale: boolean,
    activityFactor: number = 1.2,
    stressFactor: number = 1.0
  ): number {
    // Harris-Benedict (revised), canonical
    const bmr = calculateHarrisBenedictBMR(isMale ? 'male' : 'female', weightKg, heightCm, ageYears);
    return Math.round(bmr * activityFactor * stressFactor);
  }

  // Calculate protein requirements
  calculateProteinRequirements(
    weightKg: number,
    condition: 'normal' | 'wound_healing' | 'burns' | 'critical' | 'renal' = 'normal'
  ): { grams: number; gramsPerKg: number } {
    // g/kg from the nutrition config ranges (see docs/NUTRITION_ENGINE.md).
    const P = ACTIVE_NUTRITION_CONFIG.protein;
    const proteinFactors = {
      normal: P.ward.value.low,
      wound_healing: P.burnsAndLargeWounds.value.low,
      burns: P.burnsAndLargeWounds.value.high,
      critical: P.icu.value.minGPerKg,
      renal: P.ckdNonDialysis.value.nonDiabetic.high,
    };

    const gramsPerKg = proteinFactors[condition];
    return {
      grams: Math.round(weightKg * gramsPerKg),
      gramsPerKg,
    };
  }

  // Calculate fluid requirements
  calculateFluidRequirements(weightKg: number): number {
    // 30-35 mL/kg/day (config); the planner uses the lower bound
    return Math.round(weightKg * ACTIVE_NUTRITION_CONFIG.fluid.value.mlPerKg.low);
  }

  // Create nutrition assessment
  createAssessment(data: {
    patientId: string;
    assessedBy: string;
    weight: number;
    height: number;
    age: number;
    isMale: boolean;
    weightLossPercent?: number;
    hasAcuteIllness?: boolean;
    noIntakeExpected?: boolean;
    appetiteLevel: NutritionAssessment['appetiteLevel'];
    currentFeedingRoute: FeedingRoute;
    estimatedIntake: number;
    dietaryRestrictions?: string[];
    allergies?: string[];
    activityFactor?: number;
    stressFactor?: number;
    proteinCondition?: 'normal' | 'wound_healing' | 'burns' | 'critical' | 'renal';
  }): NutritionAssessment {
    const { bmi, category } = this.calculateBMI(data.weight, data.height);
    const idealBodyWeight = this.calculateIdealBodyWeight(data.height, data.isMale);
    
    const mustScore = this.calculateMUSTScore(
      bmi,
      data.weightLossPercent || 0,
      data.hasAcuteIllness || false,
      data.noIntakeExpected || false
    );

    // Determine nutrition status
    let status: NutritionStatus;
    if (bmi < 16) status = 'severe_malnutrition';
    else if (bmi < 17) status = 'moderate_malnutrition';
    else if (bmi < 18.5) status = 'mild_malnutrition';
    else if (bmi < 25) status = 'normal';
    else if (bmi < 30) status = 'overweight';
    else status = 'obese';

    const caloricRequirement = this.calculateCaloricRequirements(
      data.weight,
      data.height,
      data.age,
      data.isMale,
      data.activityFactor,
      data.stressFactor
    );

    const proteinReq = this.calculateProteinRequirements(data.weight, data.proteinCondition);
    const fluidRequirement = this.calculateFluidRequirements(data.weight);

    return {
      id: uuidv4(),
      patientId: data.patientId,
      assessedBy: data.assessedBy,
      assessedAt: new Date(),
      weight: data.weight,
      height: data.height,
      bmi,
      bmiCategory: category,
      idealBodyWeight,
      adjustedBodyWeight: data.weight > idealBodyWeight * (ACTIVE_NUTRITION_CONFIG.anthropometry.adjustedBodyWeight.value.indicatedAbovePercentIbw / 100)
        ? this.calculateAdjustedBodyWeight(data.weight, idealBodyWeight)
        : undefined,
      mustScore,
      status,
      appetiteLevel: data.appetiteLevel,
      dietaryRestrictions: data.dietaryRestrictions || [],
      allergies: data.allergies || [],
      currentFeedingRoute: data.currentFeedingRoute,
      estimatedIntake: data.estimatedIntake,
      caloricRequirement,
      proteinRequirement: proteinReq.grams,
      fluidRequirement,
    };
  }

  // Get foods by category
  getFoodsByCategory(category: FoodCategory): FoodItem[] {
    return africanFoodDatabase.filter(f => f.category === category);
  }

  // Get foods suitable for diet type
  getFoodsForDiet(dietType: DietType): FoodItem[] {
    switch (dietType) {
      case 'diabetic':
        return africanFoodDatabase.filter(f => f.isDiabeticFriendly);
      case 'renal':
        return africanFoodDatabase.filter(f => f.isRenalFriendly && f.isLowPotassium);
      case 'cardiac':
        return africanFoodDatabase.filter(f => f.isLowSodium);
      case 'high_protein':
        return africanFoodDatabase.filter(f => f.isHighProtein);
      default:
        return africanFoodDatabase;
    }
  }

  // Search foods
  searchFoods(query: string): FoodItem[] {
    const lowerQuery = query.toLowerCase();
    return africanFoodDatabase.filter(
      f => f.name.toLowerCase().includes(lowerQuery) ||
           f.localName?.toLowerCase().includes(lowerQuery)
    );
  }

  // Create meal plan
  createMealPlan(data: {
    patientId: string;
    createdBy: string;
    targetCalories: number;
    targetProtein: number;
    dietType: DietType;
    feedingRoute: FeedingRoute;
    restrictions?: string[];
    allergies?: string[];
    durationDays?: number;
  }): MealPlan {
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (data.durationDays || 7));

    // Default meal distribution
    const meals: DailyMeal[] = [
      {
        id: uuidv4(),
        mealType: 'breakfast',
        time: '07:00',
        items: [],
        totalCalories: Math.round(data.targetCalories * 0.25),
        totalProtein: Math.round(data.targetProtein * 0.25),
      },
      {
        id: uuidv4(),
        mealType: 'mid_morning',
        time: '10:00',
        items: [],
        totalCalories: Math.round(data.targetCalories * 0.10),
        totalProtein: Math.round(data.targetProtein * 0.10),
      },
      {
        id: uuidv4(),
        mealType: 'lunch',
        time: '13:00',
        items: [],
        totalCalories: Math.round(data.targetCalories * 0.30),
        totalProtein: Math.round(data.targetProtein * 0.30),
      },
      {
        id: uuidv4(),
        mealType: 'afternoon',
        time: '16:00',
        items: [],
        totalCalories: Math.round(data.targetCalories * 0.10),
        totalProtein: Math.round(data.targetProtein * 0.10),
      },
      {
        id: uuidv4(),
        mealType: 'dinner',
        time: '19:00',
        items: [],
        totalCalories: Math.round(data.targetCalories * 0.25),
        totalProtein: Math.round(data.targetProtein * 0.25),
      },
    ];

    return {
      id: uuidv4(),
      patientId: data.patientId,
      createdBy: data.createdBy,
      createdAt: new Date(),
      validFrom,
      validUntil,
      dietType: data.dietType,
      feedingRoute: data.feedingRoute,
      targetCalories: data.targetCalories,
      targetProtein: data.targetProtein,
      targetCarbs: Math.round(data.targetCalories * 0.5 / 4), // 50% from carbs
      targetFat: Math.round(data.targetCalories * 0.3 / 9), // 30% from fat
      targetFluid: 2000,
      restrictions: data.restrictions || [],
      allergies: data.allergies || [],
      meals,
      supplements: [],
      monitoringFrequency: 'daily',
      weightCheckFrequency: 'weekly',
      status: 'active',
    };
  }

  // Get sample meal suggestions
  getSampleMeals(dietType: DietType, mealType: MealType): { name: string; items: string[]; calories: number }[] {
    // Get suitable foods for filtering (to be used in future enhancement)
    void this.getFoodsForDiet(dietType);
    
    const suggestions = {
      breakfast: [
        { name: 'Akara & Pap', items: ['Akara (4 pieces)', 'Pap (1 cup)', 'Moi Moi (1 wrap)'], calories: 450 },
        { name: 'Bread & Eggs', items: ['Bread (2 slices)', 'Eggs (2, boiled)', 'Tea (1 cup)'], calories: 380 },
        { name: 'Yam & Egg Sauce', items: ['Yam (boiled, 2 slices)', 'Egg Sauce', 'Tea'], calories: 420 },
      ],
      lunch: [
        { name: 'Rice & Stew', items: ['Rice (1 cup)', 'Tomato stew', 'Chicken (1 piece)', 'Vegetables'], calories: 650 },
        { name: 'Amala & Ewedu', items: ['Amala (1 serving)', 'Ewedu soup', 'Gbegiri', 'Fish'], calories: 580 },
        { name: 'Eba & Egusi', items: ['Eba (1 serving)', 'Egusi soup (1 cup)', 'Beef (2 pieces)'], calories: 720 },
      ],
      dinner: [
        { name: 'Pounded Yam & Okra', items: ['Pounded yam (1 serving)', 'Okra soup', 'Goat meat'], calories: 620 },
        { name: 'Tuwo & Miyan Kuka', items: ['Tuwo (1 serving)', 'Miyan Kuka', 'Fish'], calories: 550 },
        { name: 'Jollof Rice & Fish', items: ['Jollof rice (1.5 cups)', 'Grilled fish', 'Coleslaw'], calories: 680 },
      ],
      mid_morning: [
        { name: 'Fruit Snack', items: ['Orange (1)', 'Banana (1)'], calories: 170 },
        { name: 'Groundnuts', items: ['Groundnuts (1/4 cup)', 'Water'], calories: 210 },
      ],
      afternoon: [
        { name: 'Light Snack', items: ['Pawpaw (1 cup)', 'Zobo (1 cup)'], calories: 95 },
        { name: 'Chin Chin', items: ['Chin chin (small pack)', 'Kunu (1 cup)'], calories: 280 },
      ],
      supper: [
        { name: 'Light Meal', items: ['Oats (1 cup)', 'Milk', 'Banana'], calories: 320 },
      ],
    };

    return suggestions[mealType] || [];
  }

  // Get nutritional supplements
  getSupplements(condition: string): NutritionSupplement[] {
    const supplements: Record<string, NutritionSupplement[]> = {
      malnutrition: [
        { name: 'Ensure Plus', type: 'oral', dose: '237ml', frequency: 'TDS', calories: 350, protein: 13, indication: 'High calorie oral supplement' },
        { name: 'Fortisip', type: 'oral', dose: '200ml', frequency: 'BD', calories: 300, protein: 12, indication: 'Complete nutrition supplement' },
      ],
      wound_healing: [
        { name: 'Cubitan', type: 'oral', dose: '200ml', frequency: 'TDS', calories: 250, protein: 20, indication: 'Wound healing support with arginine' },
        { name: 'Vitamin C', type: 'oral', dose: '500mg', frequency: 'BD', indication: 'Collagen synthesis support' },
        { name: 'Zinc', type: 'oral', dose: '220mg', frequency: 'OD', indication: 'Wound healing' },
      ],
      critical: [
        { name: 'Fresubin 2kcal', type: 'enteral', dose: '500ml', frequency: 'BD', calories: 1000, protein: 40, indication: 'High energy enteral feed' },
        { name: 'Nutrison Protein Plus', type: 'enteral', dose: '1000ml', frequency: 'OD', calories: 1280, protein: 64, indication: 'High protein enteral nutrition' },
      ],
      renal: [
        { name: 'Nepro', type: 'oral', dose: '237ml', frequency: 'BD', calories: 425, protein: 19, indication: 'Renal-specific nutrition' },
        { name: 'Renilon', type: 'oral', dose: '125ml', frequency: 'TDS', calories: 250, protein: 9, indication: 'Low protein, high energy' },
      ],
    };

    return supplements[condition] || [];
  }
}

export const nutritionPlannerService = new NutritionPlannerService();
