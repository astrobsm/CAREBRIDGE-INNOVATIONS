/**
 * 7-Day Meal Plan Generator Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates personalized meal plans using African Food Composition Database
 * For Nigerian patients based on nutritional requirements
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Utensils,
  Sun,
  Coffee,
  Moon,
  Apple,
  Flame,
  Beef,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import { createSafePDF } from '../../../utils/pdfTextSafe';
import { mealGeneratorFoods } from '../../nutrition/services/legacyFoodAdapters';
import { FOOD_COMPOSITION_ACKNOWLEDGEMENT } from '../../nutrition/data/foodSourceAcknowledgement';

// ============================================
// AFRICAN FOOD DATABASE (Subset for meal planning)
// ============================================

export interface FoodItem {
  id: string;
  name: string;
  localName?: string;
  category: 'cereals' | 'legumes' | 'meat' | 'fish' | 'vegetables' | 'fruits' | 'traditional' | 'beverages';
  mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  servingSize: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  isHighProtein: boolean;
  isDiabeticFriendly: boolean;
  costCategory: 'low' | 'medium' | 'high';
}

// Nigerian foods: calculated from WAFCT 2019 and the seed recipes
// (src/domains/nutrition/data/legacyFoodSpecs.ts, MEAL_GENERATOR_SPEC).
const africanFoods: FoodItem[] = mealGeneratorFoods();

// ============================================
// TYPES
// ============================================

export interface MealItem {
  food: FoodItem;
  servings: number;
}

export interface DayMeal {
  breakfast: MealItem[];
  midMorningSnack: MealItem[];
  lunch: MealItem[];
  afternoonSnack: MealItem[];
  dinner: MealItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WeeklyMealPlan {
  id: string;
  startDate: Date;
  targetCalories: number;
  targetProtein: number;
  days: DayMeal[];
  restrictions: string[];
  preferences: {
    isDiabetic: boolean;
    isHighProtein: boolean;
    budgetFriendly: boolean;
  };
}

interface Props {
  targetCalories?: number;
  targetProtein?: number;
  onMealPlanGenerated?: (plan: WeeklyMealPlan) => void;
  patientInfo?: {
    name: string;
    hospitalNumber: string;
  };
  mustScore?: number;
  readOnly?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function MealPlanGenerator({
  targetCalories = 2000,
  targetProtein = 60,
  onMealPlanGenerated,
  patientInfo,
  mustScore = 0,
  readOnly = false,
}: Props) {
  const [calories, setCalories] = useState(targetCalories);
  const [protein, setProtein] = useState(targetProtein);
  const [isDiabetic, setIsDiabetic] = useState(false);
  const [isHighProtein, setIsHighProtein] = useState(mustScore >= 2);
  const [budgetFriendly, setBudgetFriendly] = useState(true);
  const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([0]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get random item from array
  const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Filter foods based on preferences
  const getEligibleFoods = useCallback((mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    return africanFoods.filter(food => {
      if (!food.mealTypes.includes(mealType)) return false;
      if (isDiabetic && !food.isDiabeticFriendly) return false;
      if (budgetFriendly && food.costCategory === 'high') return false;
      return true;
    });
  }, [isDiabetic, budgetFriendly]);

  // Generate a single day's meals
  const generateDayMeals = useCallback((): DayMeal => {
    const breakfastFoods = getEligibleFoods('breakfast');
    const lunchFoods = getEligibleFoods('lunch');
    const dinnerFoods = getEligibleFoods('dinner');
    const snackFoods = getEligibleFoods('snack');

    // Target distribution: Breakfast 25%, Lunch 35%, Dinner 30%, Snacks 10%
    const breakfastCals = calories * 0.25;
    const lunchCals = calories * 0.35;
    const dinnerCals = calories * 0.30;
    // Snacks get remaining 10% (handled implicitly)

    // Helper to create meal with target calories
    const createMeal = (foods: FoodItem[], targetCals: number, isMainMeal: boolean): MealItem[] => {
      const meal: MealItem[] = [];
      let currentCals = 0;

      // For main meals, try to get a swallow/rice + soup/protein combo
      if (isMainMeal) {
        const swallows = foods.filter(f => ['cereals'].includes(f.category) && f.mealTypes.includes('lunch'));
        const soups = foods.filter(f => ['traditional', 'vegetables'].includes(f.category));
        const proteins = foods.filter(f => ['meat', 'fish'].includes(f.category));

        if (swallows.length > 0 && soups.length > 0) {
          const swallow = getRandomItem(swallows);
          const soup = getRandomItem(soups);
          meal.push({ food: swallow, servings: 1 });
          meal.push({ food: soup, servings: 1 });
          currentCals = swallow.calories + soup.calories;

          // Add protein if high protein diet
          if (isHighProtein && proteins.length > 0 && currentCals < targetCals - 100) {
            const protein = getRandomItem(proteins);
            meal.push({ food: protein, servings: 1 });
            currentCals += protein.calories;
          }
        } else {
          // Fallback: just pick random foods
          const food = getRandomItem(foods);
          const servings = Math.max(1, Math.round(targetCals / food.calories));
          meal.push({ food, servings });
        }
      } else {
        // For breakfast and snacks
        const food = getRandomItem(foods);
        const servings = Math.max(1, Math.min(2, Math.round(targetCals / food.calories)));
        meal.push({ food, servings });
        currentCals = food.calories * servings;

        // Add protein source for breakfast if high protein
        if (isHighProtein) {
          const proteinFoods = foods.filter(f => f.isHighProtein);
          if (proteinFoods.length > 0 && currentCals < targetCals - 100) {
            const protein = getRandomItem(proteinFoods);
            if (!meal.find(m => m.food.id === protein.id)) {
              meal.push({ food: protein, servings: 1 });
            }
          }
        }
      }

      return meal;
    };

    const breakfast = createMeal(breakfastFoods, breakfastCals, false);
    const midMorningSnack = snackFoods.length > 0 ? [{ food: getRandomItem(snackFoods), servings: 1 }] : [];
    const lunch = createMeal(lunchFoods, lunchCals, true);
    const afternoonSnack = snackFoods.length > 0 ? [{ food: getRandomItem(snackFoods.filter(f => f.id !== midMorningSnack[0]?.food.id)), servings: 1 }] : [];
    const dinner = createMeal(dinnerFoods, dinnerCals, true);

    // Calculate totals
    const allMeals = [...breakfast, ...midMorningSnack, ...lunch, ...afternoonSnack, ...dinner];
    const totals = allMeals.reduce((acc, item) => ({
      calories: acc.calories + (item.food.calories * item.servings),
      protein: acc.protein + (item.food.protein * item.servings),
      carbs: acc.carbs + (item.food.carbohydrates * item.servings),
      fat: acc.fat + (item.food.fat * item.servings),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      breakfast,
      midMorningSnack,
      lunch,
      afternoonSnack,
      dinner,
      totals,
    };
  }, [calories, getEligibleFoods, isHighProtein]);

  // Generate 7-day meal plan
  const generateMealPlan = useCallback(() => {
    setIsGenerating(true);
    
    // Simulate async generation for UX
    setTimeout(() => {
      const days: DayMeal[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(generateDayMeals());
      }

      const plan: WeeklyMealPlan = {
        id: `plan-${Date.now()}`,
        startDate: new Date(),
        targetCalories: calories,
        targetProtein: protein,
        days,
        restrictions: [],
        preferences: {
          isDiabetic,
          isHighProtein,
          budgetFriendly,
        },
      };

      setMealPlan(plan);
      setExpandedDays([0]);
      setIsGenerating(false);

      if (onMealPlanGenerated) {
        onMealPlanGenerated(plan);
      }
    }, 500);
  }, [calories, protein, isDiabetic, isHighProtein, budgetFriendly, generateDayMeals, onMealPlanGenerated]);

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const dayNames = ['Day 1 (Mon)', 'Day 2 (Tue)', 'Day 3 (Wed)', 'Day 4 (Thu)', 'Day 5 (Fri)', 'Day 6 (Sat)', 'Day 7 (Sun)'];

  // PDF Generation
  const generatePDF = () => {
    if (!mealPlan) return;

    const doc = createSafePDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(249, 115, 22); // Orange
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('7-Day Nigerian Meal Plan', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('AstroHEALTH Innovations in Healthcare', pageWidth / 2, 30, { align: 'center' });

    yPos = 50;

    // Patient Info
    if (patientInfo) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 247, 237);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text(`Patient: ${patientInfo.name}`, 20, yPos + 10);
      doc.text(`Hospital No: ${patientInfo.hospitalNumber}`, 20, yPos + 18);
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth - 60, yPos + 10);
      yPos += 35;
    }

    // Nutritional Targets
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Daily Targets: ${calories} kcal | ${protein}g Protein`, 20, yPos + 8);
    doc.setFont('helvetica', 'normal');
    const prefs = [];
    if (isDiabetic) prefs.push('Diabetic-Friendly');
    if (isHighProtein) prefs.push('High-Protein');
    if (budgetFriendly) prefs.push('Budget-Friendly');
    doc.text(`Preferences: ${prefs.join(', ') || 'Standard'}`, 20, yPos + 15);
    yPos += 30;

    // Each day
    mealPlan.days.forEach((day, dayIndex) => {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Day header
      doc.setFillColor(249, 115, 22);
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${dayNames[dayIndex]} - ${format(addDays(mealPlan.startDate, dayIndex), 'EEE, MMM d')}`, 20, yPos + 7);
      doc.text(`${day.totals.calories} kcal`, pageWidth - 35, yPos + 7);
      yPos += 15;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Meals
      const meals = [
        { label: 'Breakfast', items: day.breakfast },
        { label: 'Mid-morning', items: day.midMorningSnack },
        { label: 'Lunch', items: day.lunch },
        { label: 'Afternoon', items: day.afternoonSnack },
        { label: 'Dinner', items: day.dinner },
      ];

      meals.forEach(meal => {
        if (meal.items.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${meal.label}:`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          const itemsText = meal.items.map(m => 
            `${m.food.name}${m.servings > 1 ? ` (x${m.servings})` : ''}`
          ).join(', ');
          doc.text(itemsText, 50, yPos);
          yPos += 5;
        }
      });

      yPos += 8;
    });

    // Food composition source (FAO requires acknowledgement of WAFCT 2019)
    if (yPos > 275) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(doc.splitTextToSize(FOOD_COMPOSITION_ACKNOWLEDGEMENT, pageWidth - 30), 15, yPos);

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('Adjust portions based on individual tolerance and appetite', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Meal-Plan-${patientInfo?.hospitalNumber || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">7-Day Meal Plan</h3>
            <p className="text-xs text-gray-500">Nigerian/African Food Composition Database</p>
          </div>
        </div>
        {mealPlan && (
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download size={14} />
            PDF
          </button>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-orange-50 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Calories (kcal)
            </label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(parseInt(e.target.value) || 2000)}
              disabled={readOnly}
              placeholder="Enter daily calories"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Protein (g)
            </label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(parseInt(e.target.value) || 60)}
              disabled={readOnly}
              placeholder="Enter daily protein"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDiabetic}
              onChange={(e) => setIsDiabetic(e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm">Diabetic-Friendly</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isHighProtein}
              onChange={(e) => setIsHighProtein(e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm">High-Protein</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={budgetFriendly}
              onChange={(e) => setBudgetFriendly(e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm">Budget-Friendly</span>
          </label>
        </div>

        <button
          onClick={generateMealPlan}
          disabled={isGenerating || readOnly}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Utensils className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : mealPlan ? 'Regenerate Plan' : 'Generate Meal Plan'}
        </button>
      </div>

      {/* Generated Meal Plan */}
      {mealPlan && (
        <div className="space-y-2">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Meal Plan Generated</span>
              </div>
              <span className="text-sm text-green-700">
                {format(mealPlan.startDate, 'MMM d')} - {format(addDays(mealPlan.startDate, 6), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Daily Breakdown */}
          {mealPlan.days.map((day, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleDay(index)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{dayNames[index]}</span>
                  <span className="text-xs text-gray-500">
                    {format(addDays(mealPlan.startDate, index), 'EEE, MMM d')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-orange-600">
                      <Flame size={12} />
                      {day.totals.calories} kcal
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <Beef size={12} />
                      {Math.round(day.totals.protein)}g
                    </span>
                  </div>
                  {expandedDays.includes(index) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              <AnimatePresence>
                {expandedDays.includes(index) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3 bg-white">
                      {/* Breakfast */}
                      <div className="flex gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg flex-shrink-0">
                          <Sun className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Breakfast</p>
                          <div className="text-sm text-gray-600">
                            {day.breakfast.map((item, i) => (
                              <span key={i}>
                                {item.food.name}{item.food.localName ? ` (${item.food.localName})` : ''}
                                {item.servings > 1 && ` ×${item.servings}`}
                                {i < day.breakfast.length - 1 && ' + '}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mid-morning Snack */}
                      {day.midMorningSnack.length > 0 && (
                        <div className="flex gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg flex-shrink-0">
                            <Apple className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Mid-morning Snack</p>
                            <p className="text-sm text-gray-600">
                              {day.midMorningSnack[0]?.food.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Lunch */}
                      <div className="flex gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg flex-shrink-0">
                          <Utensils className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Lunch</p>
                          <div className="text-sm text-gray-600">
                            {day.lunch.map((item, i) => (
                              <span key={i}>
                                {item.food.name}{item.food.localName ? ` (${item.food.localName})` : ''}
                                {i < day.lunch.length - 1 && ' with '}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Afternoon Snack */}
                      {day.afternoonSnack.length > 0 && (
                        <div className="flex gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg flex-shrink-0">
                            <Coffee className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Afternoon Snack</p>
                            <p className="text-sm text-gray-600">
                              {day.afternoonSnack[0]?.food.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Dinner */}
                      <div className="flex gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg flex-shrink-0">
                          <Moon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Dinner</p>
                          <div className="text-sm text-gray-600">
                            {day.dinner.map((item, i) => (
                              <span key={i}>
                                {item.food.name}{item.food.localName ? ` (${item.food.localName})` : ''}
                                {i < day.dinner.length - 1 && ' with '}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Day Totals */}
                      <div className="flex gap-4 pt-2 border-t text-xs text-gray-500">
                        <span>Calories: {day.totals.calories} kcal</span>
                        <span>Protein: {Math.round(day.totals.protein)}g</span>
                        <span>Carbs: {Math.round(day.totals.carbs)}g</span>
                        <span>Fat: {Math.round(day.totals.fat)}g</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <p className="text-xs text-gray-500 italic">{FOOD_COMPOSITION_ACKNOWLEDGEMENT}</p>
        </div>
      )}

      {/* Info */}
      {!mealPlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">About this Meal Plan</p>
              <p className="text-xs mt-1">
                Meals are generated using the African Food Composition Database with Nigerian staples 
                including Eba, Pounded Yam, Egusi, Jollof Rice, and more. Adjust based on patient 
                preferences and availability.
              </p>
              <p className="text-xs mt-1 italic">{FOOD_COMPOSITION_ACKNOWLEDGEMENT}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
