/**
 * Nutrition Planner Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive nutrition assessment and meal planning
 * Based on African Food Composition Tables and WHO guidelines
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type NutritionStatus = 'normal' | 'mild_malnutrition' | 'moderate_malnutrition' | 'severe_malnutrition' | 'overweight' | 'obese';
export type FeedingRoute = 'oral' | 'enteral_ng' | 'enteral_peg' | 'parenteral' | 'mixed';
export type DietType = 'regular' | 'soft' | 'liquid' | 'pureed' | 'diabetic' | 'renal' | 'cardiac' | 'high_protein' | 'low_residue' | 'clear_liquid';
export type MealType = 'breakfast' | 'mid_morning' | 'lunch' | 'afternoon' | 'dinner' | 'supper';
export type FoodCategory = 'cereals' | 'legumes' | 'vegetables' | 'fruits' | 'meat' | 'fish' | 'dairy' | 'oils' | 'beverages' | 'traditional';

export interface NutritionAssessment {
  id: string;
  patientId: string;
  assessedBy: string;
  assessedAt: Date;
  
  // Anthropometric data
  weight: number; // kg
  height: number; // cm
  bmi: number;
  bmiCategory: string;
  idealBodyWeight: number;
  adjustedBodyWeight?: number;
  
  // MUST Score
  mustScore: {
    bmiScore: number;
    weightLossScore: number;
    acuteIllnessScore: number;
    totalScore: number;
    risk: 'low' | 'medium' | 'high';
  };
  
  // Nutritional status
  status: NutritionStatus;
  albumin?: number;
  prealbumin?: number;
  transferrin?: number;
  
  // Functional assessment
  handGripStrength?: number;
  midArmCircumference?: number;
  tricepsSkinfold?: number;
  
  // Dietary history
  appetiteLevel: 'good' | 'fair' | 'poor' | 'none';
  dietaryRestrictions: string[];
  allergies: string[];
  religiousDietaryNeeds?: string;
  
  // Current intake
  currentFeedingRoute: FeedingRoute;
  estimatedIntake: number; // percentage of meals
  
  // Requirements
  caloricRequirement: number;
  proteinRequirement: number;
  fluidRequirement: number;
  
  notes?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  localName?: string; // Nigerian/African name
  category: FoodCategory;
  servingSize: string;
  servingGrams: number;
  
  // Macronutrients per serving
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  
  // Micronutrients
  sodium?: number;
  potassium?: number;
  phosphorus?: number;
  calcium?: number;
  iron?: number;
  vitaminA?: number;
  vitaminC?: number;
  
  // Flags
  isHighProtein: boolean;
  isLowSodium: boolean;
  isLowPotassium: boolean;
  isDiabeticFriendly: boolean;
  isRenalFriendly: boolean;
  
  // Availability
  seasonality?: string;
  costCategory: 'low' | 'medium' | 'high';
}

export interface MealPlan {
  id: string;
  patientId: string;
  createdBy: string;
  createdAt: Date;
  validFrom: Date;
  validUntil: Date;
  
  dietType: DietType;
  feedingRoute: FeedingRoute;
  
  // Daily targets
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFluid: number;
  
  // Restrictions
  restrictions: string[];
  allergies: string[];
  
  // Meals
  meals: DailyMeal[];
  
  // Supplements
  supplements: NutritionSupplement[];
  
  // Monitoring
  monitoringFrequency: string;
  weightCheckFrequency: string;
  
  notes?: string;
  status: 'active' | 'completed' | 'discontinued';
}

export interface DailyMeal {
  id: string;
  mealType: MealType;
  time: string;
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  notes?: string;
}

export interface MealItem {
  foodId: string;
  foodName: string;
  servings: number;
  calories: number;
  protein: number;
  preparation?: string;
}

export interface NutritionSupplement {
  name: string;
  type: 'oral' | 'enteral' | 'parenteral';
  dose: string;
  frequency: string;
  calories?: number;
  protein?: number;
  indication: string;
}

// ============================================
// AFRICAN FOOD DATABASE
// ============================================

export const africanFoodDatabase: FoodItem[] = [
  // CEREALS & GRAINS
  {
    id: 'rice-white',
    name: 'White Rice (cooked)',
    localName: 'Shinkafa',
    category: 'cereals',
    servingSize: '1 cup',
    servingGrams: 158,
    calories: 206,
    protein: 4.3,
    carbohydrates: 45,
    fat: 0.4,
    fiber: 0.6,
    sodium: 2,
    potassium: 55,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'garri',
    name: 'Garri (soaked)',
    localName: 'Garri',
    category: 'cereals',
    servingSize: '1 cup',
    servingGrams: 150,
    calories: 360,
    protein: 1.5,
    carbohydrates: 84,
    fat: 0.5,
    fiber: 2,
    sodium: 5,
    potassium: 120,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'pounded-yam',
    name: 'Pounded Yam',
    localName: 'Iyan',
    category: 'cereals',
    servingSize: '1 serving',
    servingGrams: 200,
    calories: 236,
    protein: 3,
    carbohydrates: 56,
    fat: 0.2,
    fiber: 3,
    sodium: 10,
    potassium: 670,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: false,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'amala',
    name: 'Amala (Yam flour)',
    localName: 'Amala',
    category: 'cereals',
    servingSize: '1 serving',
    servingGrams: 200,
    calories: 220,
    protein: 2.5,
    carbohydrates: 52,
    fat: 0.3,
    fiber: 2,
    sodium: 8,
    potassium: 450,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: false,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'tuwo-shinkafa',
    name: 'Tuwo Shinkafa',
    localName: 'Tuwo',
    category: 'cereals',
    servingSize: '1 serving',
    servingGrams: 200,
    calories: 260,
    protein: 5,
    carbohydrates: 58,
    fat: 0.5,
    fiber: 1,
    sodium: 5,
    potassium: 80,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'eba',
    name: 'Eba (Garri swallow)',
    localName: 'Eba',
    category: 'cereals',
    servingSize: '1 serving',
    servingGrams: 200,
    calories: 330,
    protein: 1.2,
    carbohydrates: 80,
    fat: 0.4,
    fiber: 2,
    sodium: 6,
    potassium: 100,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'semovita',
    name: 'Semovita',
    localName: 'Semovita',
    category: 'cereals',
    servingSize: '1 serving',
    servingGrams: 200,
    calories: 280,
    protein: 8,
    carbohydrates: 60,
    fat: 1,
    fiber: 2,
    sodium: 3,
    potassium: 90,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'wheat-fufu',
    name: 'Wheat Fufu',
    localName: 'Wheat',
    category: 'cereals',
    servingSize: '1 serving',
    servingGrams: 200,
    calories: 290,
    protein: 10,
    carbohydrates: 58,
    fat: 2,
    fiber: 8,
    sodium: 4,
    potassium: 180,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'low',
  },

  // LEGUMES & PROTEINS
  {
    id: 'beans-cooked',
    name: 'Beans (cooked)',
    localName: 'Ewa',
    category: 'legumes',
    servingSize: '1 cup',
    servingGrams: 177,
    calories: 225,
    protein: 15,
    carbohydrates: 40,
    fat: 1,
    fiber: 11,
    sodium: 4,
    potassium: 600,
    phosphorus: 240,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'moi-moi',
    name: 'Moi Moi',
    localName: 'Moi Moi',
    category: 'legumes',
    servingSize: '1 wrap',
    servingGrams: 150,
    calories: 180,
    protein: 12,
    carbohydrates: 18,
    fat: 8,
    fiber: 5,
    sodium: 250,
    potassium: 350,
    isHighProtein: true,
    isLowSodium: false,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'akara',
    name: 'Akara (Bean cakes)',
    localName: 'Akara/Kosai',
    category: 'legumes',
    servingSize: '4 pieces',
    servingGrams: 100,
    calories: 220,
    protein: 10,
    carbohydrates: 15,
    fat: 14,
    fiber: 4,
    sodium: 200,
    potassium: 280,
    isHighProtein: true,
    isLowSodium: false,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'groundnut',
    name: 'Groundnuts (roasted)',
    localName: 'Gyada',
    category: 'legumes',
    servingSize: '1/4 cup',
    servingGrams: 37,
    calories: 207,
    protein: 9,
    carbohydrates: 7,
    fat: 18,
    fiber: 3,
    sodium: 5,
    potassium: 240,
    phosphorus: 140,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'low',
  },

  // MEAT & POULTRY
  {
    id: 'chicken-breast',
    name: 'Chicken Breast (grilled)',
    category: 'meat',
    servingSize: '100g',
    servingGrams: 100,
    calories: 165,
    protein: 31,
    carbohydrates: 0,
    fat: 3.6,
    fiber: 0,
    sodium: 74,
    potassium: 256,
    phosphorus: 200,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'beef-stew',
    name: 'Beef (stewed)',
    category: 'meat',
    servingSize: '100g',
    servingGrams: 100,
    calories: 250,
    protein: 26,
    carbohydrates: 0,
    fat: 16,
    fiber: 0,
    sodium: 60,
    potassium: 310,
    phosphorus: 180,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'high',
  },
  {
    id: 'goat-meat',
    name: 'Goat Meat (stewed)',
    localName: 'Eran Ewure',
    category: 'meat',
    servingSize: '100g',
    servingGrams: 100,
    calories: 143,
    protein: 27,
    carbohydrates: 0,
    fat: 3,
    fiber: 0,
    sodium: 82,
    potassium: 385,
    phosphorus: 190,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'high',
  },
  {
    id: 'dried-fish',
    name: 'Dried Fish (Stockfish)',
    localName: 'Okporoko',
    category: 'fish',
    servingSize: '50g',
    servingGrams: 50,
    calories: 145,
    protein: 32,
    carbohydrates: 0,
    fat: 1.5,
    fiber: 0,
    sodium: 180,
    potassium: 400,
    isHighProtein: true,
    isLowSodium: false,
    isLowPotassium: false,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'catfish',
    name: 'Catfish (grilled)',
    localName: 'Eja Aro',
    category: 'fish',
    servingSize: '100g',
    servingGrams: 100,
    calories: 119,
    protein: 21,
    carbohydrates: 0,
    fat: 3.5,
    fiber: 0,
    sodium: 50,
    potassium: 350,
    phosphorus: 220,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'tilapia',
    name: 'Tilapia Fish',
    localName: 'Eja Cichlid',
    category: 'fish',
    servingSize: '100g',
    servingGrams: 100,
    calories: 96,
    protein: 20,
    carbohydrates: 0,
    fat: 1.7,
    fiber: 0,
    sodium: 52,
    potassium: 302,
    phosphorus: 170,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'eggs-boiled',
    name: 'Eggs (boiled)',
    category: 'meat',
    servingSize: '2 eggs',
    servingGrams: 100,
    calories: 155,
    protein: 13,
    carbohydrates: 1,
    fat: 11,
    fiber: 0,
    sodium: 124,
    potassium: 126,
    phosphorus: 172,
    isHighProtein: true,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'low',
  },

  // VEGETABLES
  {
    id: 'efo-riro',
    name: 'Efo Riro (Spinach stew)',
    localName: 'Efo Riro',
    category: 'vegetables',
    servingSize: '1 cup',
    servingGrams: 150,
    calories: 120,
    protein: 5,
    carbohydrates: 8,
    fat: 8,
    fiber: 4,
    sodium: 350,
    potassium: 450,
    iron: 3,
    vitaminA: 800,
    vitaminC: 25,
    isHighProtein: false,
    isLowSodium: false,
    isLowPotassium: false,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'egusi-soup',
    name: 'Egusi Soup',
    localName: 'Egusi',
    category: 'traditional',
    servingSize: '1 cup',
    servingGrams: 200,
    calories: 280,
    protein: 12,
    carbohydrates: 10,
    fat: 22,
    fiber: 3,
    sodium: 450,
    potassium: 380,
    iron: 4,
    isHighProtein: true,
    isLowSodium: false,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'okra-soup',
    name: 'Okra Soup',
    localName: 'Ila',
    category: 'traditional',
    servingSize: '1 cup',
    servingGrams: 200,
    calories: 150,
    protein: 8,
    carbohydrates: 12,
    fat: 8,
    fiber: 5,
    sodium: 400,
    potassium: 320,
    isHighProtein: false,
    isLowSodium: false,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'ogbono-soup',
    name: 'Ogbono Soup',
    localName: 'Ogbono',
    category: 'traditional',
    servingSize: '1 cup',
    servingGrams: 200,
    calories: 240,
    protein: 6,
    carbohydrates: 15,
    fat: 18,
    fiber: 4,
    sodium: 380,
    potassium: 290,
    isHighProtein: false,
    isLowSodium: false,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'medium',
  },
  {
    id: 'vegetable-soup',
    name: 'Vegetable Soup (Edikang Ikong)',
    localName: 'Edikang Ikong',
    category: 'traditional',
    servingSize: '1 cup',
    servingGrams: 200,
    calories: 180,
    protein: 10,
    carbohydrates: 8,
    fat: 12,
    fiber: 5,
    sodium: 420,
    potassium: 550,
    iron: 5,
    vitaminA: 1000,
    vitaminC: 35,
    isHighProtein: true,
    isLowSodium: false,
    isLowPotassium: false,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'medium',
  },
  {
    id: 'bitter-leaf-soup',
    name: 'Bitter Leaf Soup',
    localName: 'Ofe Onugbu',
    category: 'traditional',
    servingSize: '1 cup',
    servingGrams: 200,
    calories: 160,
    protein: 8,
    carbohydrates: 10,
    fat: 10,
    fiber: 4,
    sodium: 350,
    potassium: 400,
    isHighProtein: false,
    isLowSodium: false,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'medium',
  },

  // FRUITS
  {
    id: 'plantain-ripe',
    name: 'Plantain (ripe, fried)',
    localName: 'Dodo',
    category: 'fruits',
    servingSize: '1 medium',
    servingGrams: 150,
    calories: 250,
    protein: 1.5,
    carbohydrates: 48,
    fat: 8,
    fiber: 3,
    sodium: 5,
    potassium: 500,
    vitaminA: 180,
    vitaminC: 18,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: false,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'plantain-unripe',
    name: 'Plantain (unripe, boiled)',
    localName: 'Plantain',
    category: 'fruits',
    servingSize: '1 medium',
    servingGrams: 150,
    calories: 180,
    protein: 2,
    carbohydrates: 45,
    fat: 0.5,
    fiber: 4,
    sodium: 4,
    potassium: 480,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: true,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'orange',
    name: 'Orange',
    category: 'fruits',
    servingSize: '1 medium',
    servingGrams: 130,
    calories: 62,
    protein: 1.2,
    carbohydrates: 15,
    fat: 0.2,
    fiber: 3,
    sodium: 0,
    potassium: 237,
    vitaminC: 70,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'banana',
    name: 'Banana',
    category: 'fruits',
    servingSize: '1 medium',
    servingGrams: 118,
    calories: 105,
    protein: 1.3,
    carbohydrates: 27,
    fat: 0.4,
    fiber: 3,
    sodium: 1,
    potassium: 422,
    vitaminC: 10,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: false,
    isDiabeticFriendly: false,
    isRenalFriendly: false,
    costCategory: 'low',
  },
  {
    id: 'pawpaw',
    name: 'Pawpaw (Papaya)',
    category: 'fruits',
    servingSize: '1 cup',
    servingGrams: 145,
    calories: 55,
    protein: 0.9,
    carbohydrates: 14,
    fat: 0.2,
    fiber: 2.5,
    sodium: 4,
    potassium: 264,
    vitaminA: 950,
    vitaminC: 88,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'watermelon',
    name: 'Watermelon',
    category: 'fruits',
    servingSize: '2 cups',
    servingGrams: 280,
    calories: 84,
    protein: 1.7,
    carbohydrates: 21,
    fat: 0.4,
    fiber: 1,
    sodium: 3,
    potassium: 314,
    vitaminA: 800,
    vitaminC: 23,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: true,
    isRenalFriendly: true,
    costCategory: 'low',
  },

  // BEVERAGES
  {
    id: 'zobo',
    name: 'Zobo (Hibiscus drink)',
    localName: 'Zobo',
    category: 'beverages',
    servingSize: '1 cup',
    servingGrams: 240,
    calories: 40,
    protein: 0,
    carbohydrates: 10,
    fat: 0,
    fiber: 0,
    sodium: 5,
    potassium: 80,
    vitaminC: 15,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'kunu',
    name: 'Kunu (Millet drink)',
    localName: 'Kunu',
    category: 'beverages',
    servingSize: '1 cup',
    servingGrams: 240,
    calories: 120,
    protein: 2,
    carbohydrates: 26,
    fat: 1,
    fiber: 1,
    sodium: 10,
    potassium: 100,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
  {
    id: 'palm-wine',
    name: 'Palm Wine',
    localName: 'Emu',
    category: 'beverages',
    servingSize: '1 cup',
    servingGrams: 240,
    calories: 80,
    protein: 0.5,
    carbohydrates: 8,
    fat: 0,
    fiber: 0,
    sodium: 20,
    potassium: 150,
    isHighProtein: false,
    isLowSodium: true,
    isLowPotassium: true,
    isDiabeticFriendly: false,
    isRenalFriendly: true,
    costCategory: 'low',
  },
];

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

class NutritionPlannerService {
  // Calculate BMI
  calculateBMI(weightKg: number, heightCm: number): { bmi: number; category: string } {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    
    let category: string;
    if (bmi < 16) category = 'Severe underweight';
    else if (bmi < 17) category = 'Moderate underweight';
    else if (bmi < 18.5) category = 'Mild underweight';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Overweight';
    else if (bmi < 35) category = 'Obese Class I';
    else if (bmi < 40) category = 'Obese Class II';
    else category = 'Obese Class III';
    
    return { bmi: Math.round(bmi * 10) / 10, category };
  }

  // Calculate Ideal Body Weight (Devine formula)
  calculateIdealBodyWeight(heightCm: number, isMale: boolean): number {
    const heightInches = heightCm / 2.54;
    const baseHeight = 60; // 5 feet in inches
    
    if (isMale) {
      return 50 + 2.3 * (heightInches - baseHeight);
    } else {
      return 45.5 + 2.3 * (heightInches - baseHeight);
    }
  }

  // Calculate Adjusted Body Weight (for obese patients)
  calculateAdjustedBodyWeight(actualWeight: number, idealWeight: number): number {
    return idealWeight + 0.4 * (actualWeight - idealWeight);
  }

  // Calculate MUST Score
  calculateMUSTScore(
    bmi: number,
    weightLossPercent: number,
    hasAcuteIllness: boolean,
    noIntakeExpected: boolean
  ): NutritionAssessment['mustScore'] {
    // BMI Score
    let bmiScore = 0;
    if (bmi < 18.5) bmiScore = 2;
    else if (bmi <= 20) bmiScore = 1;

    // Weight Loss Score
    let weightLossScore = 0;
    if (weightLossPercent > 10) weightLossScore = 2;
    else if (weightLossPercent >= 5) weightLossScore = 1;

    // Acute Illness Score
    const acuteIllnessScore = hasAcuteIllness && noIntakeExpected ? 2 : 0;

    const totalScore = bmiScore + weightLossScore + acuteIllnessScore;
    
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
    // Harris-Benedict BMR
    let bmr: number;
    if (isMale) {
      bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * ageYears);
    } else {
      bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * ageYears);
    }
    
    return Math.round(bmr * activityFactor * stressFactor);
  }

  // Calculate protein requirements
  calculateProteinRequirements(
    weightKg: number,
    condition: 'normal' | 'wound_healing' | 'burns' | 'critical' | 'renal' = 'normal'
  ): { grams: number; gramsPerKg: number } {
    const proteinFactors = {
      normal: 0.8,
      wound_healing: 1.5,
      burns: 2.0,
      critical: 1.5,
      renal: 0.6,
    };
    
    const gramsPerKg = proteinFactors[condition];
    return {
      grams: Math.round(weightKg * gramsPerKg),
      gramsPerKg,
    };
  }

  // Calculate fluid requirements
  calculateFluidRequirements(weightKg: number): number {
    // Standard formula: 30-35 mL/kg/day
    return Math.round(weightKg * 30);
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
      adjustedBodyWeight: data.weight > idealBodyWeight * 1.2 
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
    const suitableFoods = this.getFoodsForDiet(dietType);
    
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
