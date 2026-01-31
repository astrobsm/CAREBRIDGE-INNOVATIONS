// Nutrition Calculator
// Harris-Benedict, Caloric Requirements, African Food-Based Recommendations

import { useState } from 'react';
import { UtensilsCrossed, Calculator, AlertCircle, Apple, Flame, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PatientCalculatorInfo, NutritionResult } from '../../types';
import { downloadMealPlanPDF, shareMealPlanOnWhatsApp, type MealPlanPDFOptions } from '../../../../utils/mealPlanPdfGenerator';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function NutritionCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  const [gender, setGender] = useState<'male' | 'female'>((patientInfo.gender || 'male') as 'male' | 'female');
  // Note: calories and protein are used in sub-component calculations
  
  // Activity factor
  const [activityLevel, setActivityLevel] = useState<string>('bedridden');
  
  // Stress/injury factor
  const [stressFactor, setStressFactor] = useState<string>('none');
  
  // Clinical conditions
  const [isWoundHealing, setIsWoundHealing] = useState(false);
  const [isBurns, setIsBurns] = useState(false);
  const [burnsTBSA, setBurnsTBSA] = useState('');
  const [isSepsis, setIsSepsis] = useState(false);
  const [isPostSurgery, setIsPostSurgery] = useState(false);
  const [isRenalDisease, setIsRenalDisease] = useState(false);
  const [isLiverDisease, setIsLiverDisease] = useState(false);
  const [isMalnourished, setIsMalnourished] = useState(false);
  
  const [result, setResult] = useState<NutritionResult | null>(null);

  const activityFactors: Record<string, { label: string; factor: number; description: string }> = {
    bedridden: { label: 'Bedridden', factor: 1.2, description: 'Completely bedridden, minimal movement' },
    ambulatory: { label: 'Ambulatory', factor: 1.3, description: 'Can walk around room/ward' },
    light: { label: 'Light Activity', factor: 1.4, description: 'Light daily activities' },
    moderate: { label: 'Moderate Activity', factor: 1.5, description: 'Regular moderate exercise' },
    active: { label: 'Very Active', factor: 1.7, description: 'Heavy physical activity' },
  };

  const stressFactors: Record<string, { label: string; factor: number; description: string }> = {
    none: { label: 'None/Minimal', factor: 1.0, description: 'No significant stress' },
    mild: { label: 'Mild Stress', factor: 1.1, description: 'Minor surgery, mild infection' },
    moderate: { label: 'Moderate Stress', factor: 1.25, description: 'Major surgery, moderate infection' },
    severe: { label: 'Severe Stress', factor: 1.5, description: 'Sepsis, major trauma' },
    burns: { label: 'Burns/Critical', factor: 1.75, description: 'Major burns, critical illness' },
  };

  const calculate = () => {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    const ageYears = parseInt(age);
    
    // Harris-Benedict Equation (Revised)
    let bmr: number;
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * ageYears);
    } else {
      bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * ageYears);
    }
    
    // Mifflin-St Jeor Equation (alternative)
    let mifflinBmr: number;
    if (gender === 'male') {
      mifflinBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) + 5;
    } else {
      mifflinBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 161;
    }
    
    // Get activity and stress factors
    const activityFactor = activityFactors[activityLevel].factor;
    let stressMultiplier = stressFactors[stressFactor].factor;
    
    // Adjust for burns if applicable
    if (isBurns && burnsTBSA) {
      const tbsa = parseFloat(burnsTBSA);
      stressMultiplier = 1 + (tbsa * 0.02); // Additional 2% per %TBSA
    }
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    let tdee = bmr * activityFactor * stressMultiplier;
    
    // Adjustments for specific conditions
    if (isMalnourished) {
      tdee *= 1.2; // Add 20% for catch-up
    }
    
    // Protein requirements (g/kg/day)
    let proteinFactor = 1.0; // Normal: 0.8-1.0 g/kg
    let proteinRationale = 'Standard adult requirement';
    
    if (isWoundHealing) {
      proteinFactor = 1.5;
      proteinRationale = 'Wound healing - increased protein synthesis';
    }
    if (isBurns) {
      proteinFactor = 2.0;
      proteinRationale = 'Major burns - high catabolic state';
    }
    if (isSepsis) {
      proteinFactor = 1.5;
      proteinRationale = 'Sepsis - protein catabolism';
    }
    if (isPostSurgery) {
      proteinFactor = Math.max(proteinFactor, 1.25);
      proteinRationale = 'Post-surgical recovery';
    }
    if (isRenalDisease) {
      proteinFactor = 0.8; // Restrict in CKD pre-dialysis
      proteinRationale = '⚠️ CKD - protein restriction (pre-dialysis). Dialysis patients may need 1.2 g/kg';
    }
    
    const proteinNeeds = Math.round(proteinFactor * weightKg);
    
    // Fluid requirements
    let fluidNeeds = Math.round(30 * weightKg); // 30mL/kg standard
    let fluidRationale = 'Standard hydration: 30mL/kg/day';
    
    if (isBurns && burnsTBSA) {
      const tbsa = parseFloat(burnsTBSA);
      fluidNeeds = Math.round((4 * weightKg * tbsa) + (weightKg * 30)); // Parkland + maintenance
      fluidRationale = 'Burns: Parkland formula + maintenance';
    }
    
    // Micronutrient recommendations
    const micronutrients: string[] = [];
    if (isWoundHealing || isBurns) {
      micronutrients.push('Vitamin C: 500-1000mg daily (wound healing)');
      micronutrients.push('Zinc: 25-40mg daily (tissue repair)');
      micronutrients.push('Vitamin A: 10,000 IU daily (epithelialization)');
    }
    if (isMalnourished) {
      micronutrients.push('Multivitamin/mineral supplement daily');
      micronutrients.push('Iron: 60mg elemental iron if anemic');
      micronutrients.push('Vitamin B complex');
    }
    micronutrients.push('Vitamin D: 800-1000 IU daily (general)');
    
    // Nigerian/African food recommendations
    const mealPlan = generateAfricanMealPlan(Math.round(tdee), proteinNeeds);
    
    // Calculate macronutrient breakdown
    const proteinCalories = proteinNeeds * 4; // 4 kcal/g
    const remainingCalories = Math.round(tdee) - proteinCalories;
    const fatCalories = Math.round(remainingCalories * 0.3); // 30% from fat
    const carbCalories = remainingCalories - fatCalories;
    
    const fatGrams = Math.round(fatCalories / 9); // 9 kcal/g
    const carbGrams = Math.round(carbCalories / 4); // 4 kcal/g
    
    // Special dietary considerations
    const specialConsiderations: string[] = [];
    if (isRenalDisease) {
      specialConsiderations.push('Limit potassium-rich foods (bananas, oranges, tomatoes)');
      specialConsiderations.push('Limit phosphorus (dairy, beans, nuts)');
      specialConsiderations.push('Consider renal dietitian referral');
    }
    if (isLiverDisease) {
      specialConsiderations.push('Small, frequent meals');
      specialConsiderations.push('Adequate protein despite cirrhosis (except encephalopathy)');
      specialConsiderations.push('Salt restriction if ascites present');
    }
    if (patientInfo.comorbidities.includes('Diabetes')) {
      specialConsiderations.push('Carbohydrate counting/control');
      specialConsiderations.push('Prefer low glycemic index foods');
      specialConsiderations.push('Distribute carbs evenly throughout day');
    }
    
    const calculationResult: NutritionResult = {
      bmr: Math.round(bmr),
      mifflinBmr: Math.round(mifflinBmr),
      tdee: Math.round(tdee),
      activityFactor,
      stressMultiplier,
      proteinNeeds,
      proteinFactor,
      proteinRationale,
      carbNeeds: carbGrams,
      fatNeeds: fatGrams,
      fluidNeeds,
      fluidRationale,
      micronutrients,
      mealPlan,
      specialConsiderations,
      macroBreakdown: {
        protein: { grams: proteinNeeds, calories: proteinCalories, percentage: Math.round((proteinCalories / tdee) * 100) },
        carbs: { grams: carbGrams, calories: carbCalories, percentage: Math.round((carbCalories / tdee) * 100) },
        fat: { grams: fatGrams, calories: fatCalories, percentage: Math.round((fatCalories / tdee) * 100) },
      },
    };
    
    setResult(calculationResult);
  };

  const generateAfricanMealPlan = (_calories: number, _protein: number) => {
    const mealPlan = {
      breakfast: [
        'Akamu/Ogi (corn pap) with milk and sugar - 250 kcal',
        'Boiled eggs (2) - 140 kcal, 12g protein',
        'OR: Moi-moi with pap - 300 kcal, 15g protein',
        'OR: Bread with peanut butter and tea - 350 kcal',
      ],
      midMorning: [
        'Groundnuts (handful) - 160 kcal, 7g protein',
        'OR: Banana with yogurt - 150 kcal',
        'OR: Chin-chin (small portion) - 120 kcal',
      ],
      lunch: [
        'Jollof rice with grilled chicken - 500 kcal, 30g protein',
        'OR: Eba with egusi soup and meat - 550 kcal, 25g protein',
        'OR: Beans and plantain - 450 kcal, 20g protein',
        'OR: Pounded yam with vegetable soup - 500 kcal, 20g protein',
      ],
      afternoon: [
        'Roasted plantain (bole) with groundnut - 200 kcal',
        'OR: Puff-puff (2-3 pieces) - 150 kcal',
        'OR: Fresh fruit (pawpaw, mango, orange) - 80 kcal',
      ],
      dinner: [
        'Rice with stew and fish - 450 kcal, 25g protein',
        'OR: Amala with ewedu and gbegiri - 400 kcal, 15g protein',
        'OR: Yam porridge with vegetables - 380 kcal, 10g protein',
        'Add extra protein: Fish, chicken, or eggs',
      ],
      evening: [
        'Warm milk or malt drink - 120 kcal',
        'Light snack if hungry',
      ],
      highProteinOptions: [
        '🥚 Eggs (2 large): 12g protein, 140 kcal',
        '🐟 Dried fish (50g): 35g protein, 170 kcal',
        '🐔 Grilled chicken (100g): 25g protein, 165 kcal',
        '🫘 Beans/cowpeas (1 cup cooked): 15g protein, 220 kcal',
        '🥜 Groundnuts (50g): 13g protein, 280 kcal',
        '🥛 Powdered milk (30g): 8g protein, 150 kcal',
        '🧀 Wara/Awara (tofu, 100g): 8g protein, 76 kcal',
      ],
      caloricBoosters: [
        'Add palm oil to soups for extra calories',
        'Use groundnut paste in cooking',
        'Add honey or sugar to beverages',
        'Include avocado (healthy fats)',
        'Fortify pap with milk and egg',
      ],
    };
    
    return mealPlan;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <UtensilsCrossed className="w-7 h-7 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Nutrition Calculator</h2>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Harris-Benedict & Clinical Nutrition Calculator</p>
            <p>Calculates BMR, TDEE, protein requirements, and provides African food-based meal recommendations for clinical nutrition support.</p>
          </div>
        </div>
      </div>

      {/* Basic Parameters */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg) *</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 70"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm) *</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 170"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Age (years) *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 35"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            title="Select gender"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Activity Level */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Activity Level</h4>
        <div className="grid md:grid-cols-5 gap-2">
          {Object.entries(activityFactors).map(([key, { label, factor, description }]) => (
            <label
              key={key}
              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all text-center ${
                activityLevel === key
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="activity"
                checked={activityLevel === key}
                onChange={() => setActivityLevel(key)}
                className="sr-only"
              />
              <span className="font-medium text-sm">{label}</span>
              <span className="text-green-600 font-bold">×{factor}</span>
              <span className="text-xs text-gray-500 mt-1">{description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Stress Factor */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Stress/Injury Factor</h4>
        <div className="grid md:grid-cols-5 gap-2">
          {Object.entries(stressFactors).map(([key, { label, factor, description }]) => (
            <label
              key={key}
              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all text-center ${
                stressFactor === key
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="stress"
                checked={stressFactor === key}
                onChange={() => setStressFactor(key)}
                className="sr-only"
              />
              <span className="font-medium text-sm">{label}</span>
              <span className="text-orange-600 font-bold">×{factor}</span>
              <span className="text-xs text-gray-500 mt-1">{description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clinical Conditions */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Clinical Conditions (affects protein/nutrient needs)</h4>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isWoundHealing}
              onChange={(e) => setIsWoundHealing(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Wound Healing</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isPostSurgery}
              onChange={(e) => setIsPostSurgery(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Post-Surgery</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isSepsis}
              onChange={(e) => setIsSepsis(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Sepsis/Infection</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isMalnourished}
              onChange={(e) => setIsMalnourished(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Malnourished</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isRenalDisease}
              onChange={(e) => setIsRenalDisease(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Renal Disease</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isLiverDisease}
              onChange={(e) => setIsLiverDisease(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Liver Disease</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={isBurns}
                onChange={(e) => setIsBurns(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm">Burns</span>
            </label>
            {isBurns && (
              <input
                type="number"
                value={burnsTBSA}
                onChange={(e) => setBurnsTBSA(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                placeholder="TBSA%"
              />
            )}
          </div>
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!weight || !height || !age}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate Nutritional Requirements
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => {
                  const pdfOptions: MealPlanPDFOptions = {
                    patientName: patientInfo.name || undefined,
                    hospitalNumber: patientInfo.hospitalNumber || undefined,
                    age: patientInfo.age ? parseInt(String(patientInfo.age)) : undefined,
                    gender: patientInfo.gender || undefined,
                    weight: parseFloat(String(weight)) || undefined,
                    height: parseFloat(String(height)) || undefined,
                    diagnosis: result.specialConsiderations?.join(', ') || 'Clinical Nutrition Assessment',
                    planType: 'clinical_nutrition',
                    calorieTarget: result.tdee,
                    proteinTarget: result.proteinNeeds,
                    fluidTarget: result.fluidNeeds,
                    mealPlan: {
                      breakfast: result.mealPlan.breakfast,
                      midMorning: result.mealPlan.midMorning,
                      lunch: result.mealPlan.lunch,
                      afternoon: result.mealPlan.afternoon,
                      dinner: result.mealPlan.dinner,
                      evening: result.mealPlan.evening,
                    },
                    foodsToEat: result.mealPlan.highProteinOptions,
                    warnings: result.specialConsiderations,
                  };
                  downloadMealPlanPDF(pdfOptions);
                  toast.success('Nutrition plan PDF downloaded!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={async () => {
                  const pdfOptions: MealPlanPDFOptions = {
                    patientName: patientInfo.name || undefined,
                    hospitalNumber: patientInfo.hospitalNumber || undefined,
                    age: patientInfo.age ? parseInt(String(patientInfo.age)) : undefined,
                    gender: patientInfo.gender || undefined,
                    weight: parseFloat(String(weight)) || undefined,
                    height: parseFloat(String(height)) || undefined,
                    diagnosis: result.specialConsiderations?.join(', ') || 'Clinical Nutrition Assessment',
                    planType: 'clinical_nutrition',
                    calorieTarget: result.tdee,
                    proteinTarget: result.proteinNeeds,
                    fluidTarget: result.fluidNeeds,
                    mealPlan: {
                      breakfast: result.mealPlan.breakfast,
                      midMorning: result.mealPlan.midMorning,
                      lunch: result.mealPlan.lunch,
                      afternoon: result.mealPlan.afternoon,
                      dinner: result.mealPlan.dinner,
                      evening: result.mealPlan.evening,
                    },
                    foodsToEat: result.mealPlan.highProteinOptions,
                    warnings: result.specialConsiderations,
                  };
                  await shareMealPlanOnWhatsApp(pdfOptions);
                  toast.success('Opening WhatsApp...');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </button>
            </div>

            {/* Main Metrics */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <Flame className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                <p className="text-3xl font-bold text-blue-600">{result.bmr}</p>
                <p className="font-semibold text-sm">BMR (kcal/day)</p>
                <p className="text-xs text-gray-600">Harris-Benedict</p>
              </div>
              <div className="bg-green-100 rounded-lg p-4 text-center">
                <Apple className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <p className="text-3xl font-bold text-green-600">{result.tdee}</p>
                <p className="font-semibold text-sm">TDEE (kcal/day)</p>
                <p className="text-xs text-gray-600">Total Daily Needs</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{result.proteinNeeds}g</p>
                <p className="font-semibold text-sm">Protein/day</p>
                <p className="text-xs text-gray-600">{result.proteinFactor} g/kg</p>
              </div>
            </div>

            {/* Macronutrient Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 mb-3">Macronutrient Breakdown</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Protein</span>
                    <span className="text-purple-600 font-bold">{result.macroBreakdown.protein.percentage}%</span>
                  </div>
                  <p className="text-2xl font-bold">{result.macroBreakdown.protein.grams}g</p>
                  <p className="text-xs text-gray-500">{result.macroBreakdown.protein.calories} kcal</p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Carbohydrates</span>
                    <span className="text-amber-600 font-bold">{result.macroBreakdown.carbs.percentage}%</span>
                  </div>
                  <p className="text-2xl font-bold">{result.macroBreakdown.carbs.grams}g</p>
                  <p className="text-xs text-gray-500">{result.macroBreakdown.carbs.calories} kcal</p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Fat</span>
                    <span className="text-red-600 font-bold">{result.macroBreakdown.fat.percentage}%</span>
                  </div>
                  <p className="text-2xl font-bold">{result.macroBreakdown.fat.grams}g</p>
                  <p className="text-xs text-gray-500">{result.macroBreakdown.fat.calories} kcal</p>
                </div>
              </div>
            </div>

            {/* Fluid Needs */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2">Fluid Requirements</h4>
              <p className="text-2xl font-bold text-blue-600">{result.fluidNeeds.toLocaleString()} mL/day</p>
              <p className="text-sm text-gray-600">{result.fluidRationale}</p>
            </div>

            {/* Protein Rationale */}
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-purple-800 mb-2">Protein Requirement Rationale</h4>
              <p className="text-sm text-gray-700">{result.proteinRationale}</p>
              <p className="text-sm mt-1">Target: <strong>{result.proteinFactor} g/kg/day</strong></p>
            </div>

            {/* Micronutrients */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2">Micronutrient Recommendations</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.micronutrients.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* African Meal Plan */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Nigerian/African Food-Based Meal Plan
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-gray-800 mb-1">🌅 Breakfast</p>
                  <ul className="text-sm text-gray-700 ml-4 list-disc">
                    {result.mealPlan.breakfast.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">🍎 Mid-Morning</p>
                  <ul className="text-sm text-gray-700 ml-4 list-disc">
                    {result.mealPlan.midMorning.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">🍽️ Lunch</p>
                  <ul className="text-sm text-gray-700 ml-4 list-disc">
                    {result.mealPlan.lunch.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">🍌 Afternoon</p>
                  <ul className="text-sm text-gray-700 ml-4 list-disc">
                    {result.mealPlan.afternoon.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">🌙 Dinner</p>
                  <ul className="text-sm text-gray-700 ml-4 list-disc">
                    {result.mealPlan.dinner.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">😴 Evening</p>
                  <ul className="text-sm text-gray-700 ml-4 list-disc">
                    {result.mealPlan.evening.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>

              {/* High Protein Options */}
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">💪 High-Protein Food Options:</p>
                <div className="grid md:grid-cols-2 gap-1 text-sm text-gray-700">
                  {result.mealPlan.highProteinOptions.map((item, i) => <span key={i}>{item}</span>)}
                </div>
              </div>
            </div>

            {/* Special Considerations */}
            {result.specialConsiderations.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Special Dietary Considerations</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.specialConsiderations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
