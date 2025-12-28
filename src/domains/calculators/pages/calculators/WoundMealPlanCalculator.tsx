// Wound Healing Meal Plan Calculator
// African Food-Based Nutritional Support for Wound Healing

import { useState } from 'react';
import { Utensils, Calculator, AlertCircle, Apple, Droplet, Pill, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PatientCalculatorInfo } from '../../types';
import { downloadMealPlanPDF, shareMealPlanOnWhatsApp, type MealPlanPDFOptions } from '../../../../utils/mealPlanPdfGenerator';

interface WoundHealingResult {
  calorieNeeds: number;
  proteinNeeds: number;
  proteinPerKg: number;
  fluidNeeds: number;
  vitaminCNeeds: number;
  zincNeeds: number;
  woundGrade: string;
  healingStage: string;
  estimatedHealingTime: string;
  mealPlan: {
    breakfast: string[];
    midMorning: string[];
    lunch: string[];
    afternoon: string[];
    dinner: string[];
    bedtime: string[];
  };
  proteinRichFoods: string[];
  vitaminCFoods: string[];
  zincFoods: string[];
  foodsToAvoid: string[];
  supplements: string[];
  hydrationTips: string[];
  warnings: string[];
}

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function WoundMealPlanCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  const [gender, setGender] = useState<'male' | 'female'>((patientInfo.gender || 'male') as 'male' | 'female');
  const [woundType, setWoundType] = useState('');
  const [woundSize, setWoundSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [woundDepth, setWoundDepth] = useState<'superficial' | 'partial' | 'full'>('partial');
  const [healingStage, setHealingStage] = useState<'inflammatory' | 'proliferative' | 'remodeling'>('proliferative');
  const [activityLevel, setActivityLevel] = useState<string>('sedentary');
  
  // Clinical context
  const [isDiabetic, setIsDiabetic] = useState(patientInfo.comorbidities?.includes('Diabetes') || false);
  const [hasPVD, setHasPVD] = useState(false);
  const [isMalnourished, setIsMalnourished] = useState(false);
  const [isInfected, setIsInfected] = useState(false);
  const [isOnSteroids, setIsOnSteroids] = useState(false);
  
  const [result, setResult] = useState<WoundHealingResult | null>(null);

  const woundTypes = [
    'Surgical wound',
    'Pressure ulcer',
    'Diabetic foot ulcer',
    'Venous leg ulcer',
    'Burn wound',
    'Trauma/Laceration',
    'Chronic wound (>4 weeks)',
    'Skin graft donor site',
  ];

  const calculate = () => {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    const ageYears = parseInt(age);
    
    // Calculate BMR (Mifflin-St Jeor)
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) + 5;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 161;
    }

    // Activity factors
    const activityFactors: Record<string, number> = {
      bedridden: 1.2,
      sedentary: 1.3,
      ambulatory: 1.4,
      active: 1.55,
    };

    // Wound stress factor based on size and depth
    let woundFactor = 1.0;
    if (woundSize === 'small') woundFactor = 1.1;
    if (woundSize === 'medium') woundFactor = 1.2;
    if (woundSize === 'large') woundFactor = 1.5;
    
    if (woundDepth === 'full') woundFactor += 0.1;
    if (isInfected) woundFactor += 0.2;
    if (isMalnourished) woundFactor += 0.2;

    // Total calorie needs
    const activityFactor = activityFactors[activityLevel] || 1.3;
    const calorieNeeds = Math.round(bmr * activityFactor * woundFactor);

    // Protein needs for wound healing (higher than normal)
    let proteinPerKg = 1.2; // Normal wound
    if (woundSize === 'large') proteinPerKg = 1.5;
    if (woundDepth === 'full') proteinPerKg = 1.5;
    if (isMalnourished) proteinPerKg = 1.8;
    if (isInfected) proteinPerKg = 1.8;
    const proteinNeeds = Math.round(weightKg * proteinPerKg);

    // Fluid needs (30-35 ml/kg + additional for wounds)
    const baseFluid = weightKg * 35;
    const woundFluidAdd = woundSize === 'large' ? 500 : woundSize === 'medium' ? 250 : 0;
    const fluidNeeds = Math.round(baseFluid + woundFluidAdd);

    // Vitamin C and Zinc
    const vitaminCNeeds = 500; // mg/day for wound healing
    const zincNeeds = 25; // mg/day

    // Wound grading
    let woundGrade = 'Moderate';
    if (woundSize === 'small' && woundDepth === 'superficial') woundGrade = 'Mild';
    if (woundSize === 'large' || woundDepth === 'full' || isInfected) woundGrade = 'Severe';

    // Estimated healing time
    let healingTime = '2-4 weeks';
    if (woundGrade === 'Mild') healingTime = '1-2 weeks';
    if (woundGrade === 'Severe') healingTime = '4-8+ weeks';
    if (isDiabetic || hasPVD) healingTime += ' (may be prolonged)';

    // Nigerian/African wound healing meal plan
    const mealPlan = {
      breakfast: [
        'Akara (bean cakes) - high protein - 3-4 pieces',
        'Boiled eggs - 2 eggs with bread or yam',
        'Moi-moi with pap enriched with milk',
        'Oatmeal with groundnuts and banana',
        'Beans porridge with plantain',
      ],
      midMorning: [
        'Groundnuts (peanuts) - 1 handful',
        'Banana or pawpaw (papaya)',
        'Orange or tangerine (Vitamin C)',
        'Milk and biscuits',
      ],
      lunch: [
        'Rice with egusi soup and stockfish/meat - generous portion',
        'Amala with ewedu and gbegiri with assorted meat',
        'Jollof rice with chicken and vegetables',
        'Yam porridge with vegetables and fish',
        'Beans and plantain with palm oil',
      ],
      afternoon: [
        'Roasted groundnuts with coconut',
        'Fresh fruits - orange, guava, pawpaw',
        'Yogurt with fruits',
        'Suya (grilled meat) - protein boost',
      ],
      dinner: [
        'Eba with ogbono/oha soup with plenty meat',
        'Vegetable soup with pomo, stockfish, and chicken',
        'Stew with rice and fried fish',
        'Pepper soup with goat meat',
        'Wheat fufu with vegetable soup',
      ],
      bedtime: [
        'Warm milk with honey',
        'Light pap (ogi) with milk',
      ],
    };

    // Protein-rich Nigerian foods
    const proteinRichFoods = [
      '🥚 Eggs - Scrambled, boiled, or in dishes (7g protein each)',
      '🐟 Fish - Fresh, smoked, or dried (stockfish, ponmo) - 20g/100g',
      '🍗 Chicken - Grilled or in stews - 25g/100g',
      '🐄 Beef - Suya, stew, or pepper soup - 26g/100g',
      '🐐 Goat meat - Pepper soup, stew - 27g/100g',
      '🫘 Beans - Akara, moi-moi, porridge - 21g/100g',
      '🥜 Groundnuts - Snack or in soups - 26g/100g',
      '🥛 Milk - Fresh or powdered in pap - 3g/100ml',
      '🐌 Snails - High protein delicacy - 16g/100g',
      '🦐 Crayfish - Add to all soups - 65g/100g',
    ];

    // Vitamin C foods
    const vitaminCFoods = [
      '🍊 Oranges - Very abundant in Nigeria',
      '🥭 Mango (seasonal) - High Vitamin C',
      '🍋 Lime/Lemon - Add to foods/drinks',
      '🍈 Guava - One of the highest Vitamin C sources',
      '🥒 Pawpaw (Papaya) - Readily available',
      '🍅 Tomatoes - Fresh or in stews',
      '🫑 Bell peppers (tatashe/rodo)',
      '🥬 Ugu (fluted pumpkin leaves)',
      '🥗 Bitter leaf and other vegetables',
      '🍍 Pineapple - Fresh or juice',
    ];

    // Zinc foods
    const zincFoods = [
      '🥩 Red meat (beef, goat) - Best source',
      '🦪 Oysters/seafood (if available)',
      '🥜 Pumpkin seeds (egusi)',
      '🫘 Beans and lentils',
      '🐔 Chicken and turkey',
      '🥜 Groundnuts (peanuts)',
      '🥚 Eggs',
      '🌾 Whole grains (guinea corn, millet)',
    ];

    // Foods to avoid
    const foodsToAvoid = [
      '❌ Excess sugar - impairs immune function',
      '❌ Alcohol - delays healing',
      '❌ Excess salt - causes fluid retention',
      '❌ Processed foods - low nutritional value',
      '❌ Fried foods in excess - inflammatory',
    ];
    if (isDiabetic) {
      foodsToAvoid.push('❌ High glycemic foods - white bread, ripe plantain, white rice in excess');
    }

    // Supplements
    const supplements: string[] = [
      'Vitamin C 500mg twice daily',
      'Zinc 25mg daily',
      'Multivitamin with minerals',
    ];
    if (isMalnourished) {
      supplements.push('High-protein oral nutrition supplements if available');
      supplements.push('Iron supplementation if anemic');
    }
    if (isDiabetic) {
      supplements.push('Consider Omega-3 fatty acids');
    }
    if (isOnSteroids) {
      supplements.push('Vitamin A supplementation (under medical supervision)');
    }

    // Hydration tips
    const hydrationTips = [
      `Drink at least ${Math.round(fluidNeeds / 1000)} liters of fluids daily`,
      'Water is best - drink regularly throughout the day',
      'Include soups (pepper soup, egusi soup) - contribute to fluid intake',
      'Fresh fruit juices without added sugar',
      'Avoid excess caffeine (coffee, strong tea)',
      'Monitor urine color - should be light yellow',
    ];

    // Warnings
    const warnings: string[] = [];
    if (isDiabetic) {
      warnings.push('Diabetic patient: Monitor blood glucose closely - wound healing requires good glycemic control');
      warnings.push('Target HbA1c <7% for optimal healing');
    }
    if (hasPVD) {
      warnings.push('Peripheral vascular disease: Nutrition alone may not be sufficient - ensure adequate blood supply');
    }
    if (isMalnourished) {
      warnings.push('Malnourished patient: Consider enteral nutrition support if oral intake insufficient');
    }
    if (isInfected) {
      warnings.push('Infected wound: Nutrition supports healing but antibiotics needed - consult physician');
    }
    if (result && proteinNeeds > 100) {
      warnings.push('High protein needs - ensure adequate kidney function before high protein diet');
    }

    const calculationResult: WoundHealingResult = {
      calorieNeeds,
      proteinNeeds,
      proteinPerKg,
      fluidNeeds,
      vitaminCNeeds,
      zincNeeds,
      woundGrade,
      healingStage: healingStage.charAt(0).toUpperCase() + healingStage.slice(1),
      estimatedHealingTime: healingTime,
      mealPlan,
      proteinRichFoods,
      vitaminCFoods,
      zincFoods,
      foodsToAvoid,
      supplements,
      hydrationTips,
      warnings,
    };
    
    setResult(calculationResult);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Utensils className="w-7 h-7 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Wound Healing Meal Plan</h2>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Nutritional Support for Wound Healing</p>
            <p>African food-based meal planning with protein, Vitamin C, and Zinc optimization for wound healing. Includes Nigerian/African foods readily available in local markets.</p>
          </div>
        </div>
      </div>

      {/* Input Fields */}
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
            placeholder="e.g., 45"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Wound Type *</label>
          <select
            value={woundType}
            onChange={(e) => setWoundType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="">Select wound type</option>
            {woundTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Wound Size</label>
          <select
            value={woundSize}
            onChange={(e) => setWoundSize(e.target.value as 'small' | 'medium' | 'large')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="small">Small (&lt;10 cm²)</option>
            <option value="medium">Medium (10-50 cm²)</option>
            <option value="large">Large (&gt;50 cm²)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Wound Depth</label>
          <select
            value={woundDepth}
            onChange={(e) => setWoundDepth(e.target.value as 'superficial' | 'partial' | 'full')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="superficial">Superficial (epidermis only)</option>
            <option value="partial">Partial thickness (dermis)</option>
            <option value="full">Full thickness (subcutaneous)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Healing Stage</label>
          <select
            value={healingStage}
            onChange={(e) => setHealingStage(e.target.value as 'inflammatory' | 'proliferative' | 'remodeling')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="inflammatory">Inflammatory (Day 1-4)</option>
            <option value="proliferative">Proliferative (Day 4-21)</option>
            <option value="remodeling">Remodeling (3 weeks-2 years)</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Level</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="bedridden">Bedridden</option>
            <option value="sedentary">Sedentary (sitting, minimal walking)</option>
            <option value="ambulatory">Ambulatory (walking around)</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {/* Clinical Context */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Factors Affecting Wound Healing</h4>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-2">
          <label className="flex items-center gap-2 p-2 hover:bg-green-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isDiabetic}
              onChange={(e) => setIsDiabetic(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Diabetes</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-green-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasPVD}
              onChange={(e) => setHasPVD(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">PVD/Poor circulation</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-green-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isMalnourished}
              onChange={(e) => setIsMalnourished(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Malnourished</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-green-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isInfected}
              onChange={(e) => setIsInfected(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">Wound Infected</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-green-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isOnSteroids}
              onChange={(e) => setIsOnSteroids(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">On Steroids</span>
          </label>
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!weight || !height || !age || !woundType}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Generate Wound Healing Meal Plan
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
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
                    weight: parseFloat(weight) || undefined,
                    height: parseFloat(height) || undefined,
                    diagnosis: woundType,
                    planType: 'wound_healing',
                    calorieTarget: result.calorieNeeds,
                    proteinTarget: result.proteinNeeds,
                    fluidTarget: result.fluidNeeds,
                    vitaminCTarget: result.vitaminCNeeds,
                    zincTarget: result.zincNeeds,
                    mealPlan: result.mealPlan,
                    proteinFoods: result.proteinRichFoods,
                    vitaminCFoods: result.vitaminCFoods,
                    zincFoods: result.zincFoods,
                    foodsToAvoid: result.foodsToAvoid,
                    supplements: result.supplements,
                    hydrationTips: result.hydrationTips,
                    warnings: result.warnings,
                    woundType: woundType,
                    woundGrade: result.woundGrade,
                    healingStage: result.healingStage,
                    estimatedHealingTime: result.estimatedHealingTime,
                  };
                  downloadMealPlanPDF(pdfOptions);
                  toast.success('Meal plan PDF downloaded!');
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
                    weight: parseFloat(weight) || undefined,
                    height: parseFloat(height) || undefined,
                    diagnosis: woundType,
                    planType: 'wound_healing',
                    calorieTarget: result.calorieNeeds,
                    proteinTarget: result.proteinNeeds,
                    fluidTarget: result.fluidNeeds,
                    vitaminCTarget: result.vitaminCNeeds,
                    zincTarget: result.zincNeeds,
                    mealPlan: result.mealPlan,
                    proteinFoods: result.proteinRichFoods,
                    vitaminCFoods: result.vitaminCFoods,
                    zincFoods: result.zincFoods,
                    foodsToAvoid: result.foodsToAvoid,
                    supplements: result.supplements,
                    hydrationTips: result.hydrationTips,
                    warnings: result.warnings,
                    woundType: woundType,
                    woundGrade: result.woundGrade,
                    healingStage: result.healingStage,
                    estimatedHealingTime: result.estimatedHealingTime,
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

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{result.calorieNeeds}</p>
                <p className="font-semibold text-xs">kcal/day</p>
              </div>
              <div className="bg-red-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{result.proteinNeeds}g</p>
                <p className="font-semibold text-xs">Protein/day</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.fluidNeeds}ml</p>
                <p className="font-semibold text-xs">Fluids/day</p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{result.vitaminCNeeds}mg</p>
                <p className="font-semibold text-xs">Vitamin C</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{result.zincNeeds}mg</p>
                <p className="font-semibold text-xs">Zinc</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.woundGrade}</p>
                <p className="font-semibold text-xs">Wound Severity</p>
              </div>
            </div>

            {/* Wound Assessment */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Wound Assessment Summary</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-semibold">{woundType}</span>
                </div>
                <div>
                  <span className="text-gray-600">Healing Stage:</span>
                  <span className="ml-2 font-semibold">{result.healingStage}</span>
                </div>
                <div>
                  <span className="text-gray-600">Estimated Healing:</span>
                  <span className="ml-2 font-semibold">{result.estimatedHealingTime}</span>
                </div>
              </div>
            </div>

            {/* Daily Meal Plan */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <Apple className="w-5 h-5" />
                Daily Nigerian Meal Plan for Wound Healing
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <h5 className="font-semibold text-green-700 mb-2">🌅 Breakfast</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.mealPlan.breakfast.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h5 className="font-semibold text-green-700 mb-2">🍎 Mid-Morning</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.mealPlan.midMorning.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h5 className="font-semibold text-green-700 mb-2">☀️ Lunch</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.mealPlan.lunch.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h5 className="font-semibold text-green-700 mb-2">🍇 Afternoon</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.mealPlan.afternoon.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h5 className="font-semibold text-green-700 mb-2">🌙 Dinner</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.mealPlan.dinner.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <h5 className="font-semibold text-green-700 mb-2">😴 Bedtime</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.mealPlan.bedtime.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Key Nutrients */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h5 className="font-bold text-red-800 mb-2">🥩 Protein-Rich Foods</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {result.proteinRichFoods.slice(0, 6).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                <h5 className="font-bold text-orange-800 mb-2">🍊 Vitamin C Sources</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {result.vitaminCFoods.slice(0, 6).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                <h5 className="font-bold text-purple-800 mb-2">💪 Zinc-Rich Foods</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {result.zincFoods.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>

            {/* Hydration */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Droplet className="w-5 h-5" />
                Hydration Guidelines
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-blue-700">
                {result.hydrationTips.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Supplements */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Recommended Supplements
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-indigo-700">
                {result.supplements.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Foods to Avoid */}
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-gray-800 mb-2">Foods to Limit/Avoid</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {result.foodsToAvoid.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Clinical Considerations</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-red-700">
                  {result.warnings.map((item, index) => (
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
