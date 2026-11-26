// Wound Healing Meal Plan Calculator
// African Food-Based Nutritional Support for Wound Healing

import { useMemo, useState } from 'react';
import { Utensils, Calculator, AlertCircle, Apple, Droplet, Pill } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { toSex } from '../../engine/calculationEngine';
import {
  WOUND_TYPES, computeWoundMeal, woundMealDays, woundMealHubReport,
  type WoundMealInput, type WoundMealResult,
} from '../../engine/hub/woundMealPlan';
import { NO_PLAN_MESSAGE } from '../../engine/hub/nutritionCommon';
import { hasComorbidity } from '../../report/hubPatient';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';
import { MealPlanDays } from '../../../clinician-assistant/components/CalculatorPanels';
import type { DayPlan } from '../../../../data/nigerianFoods';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function WoundMealPlanCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  // Elderly categories fold into sex: an elderly man uses the male equation.
  const [gender, setGender] = useState<'male' | 'female'>(toSex(patientInfo.gender));
  const [woundType, setWoundType] = useState('');
  const [woundSize, setWoundSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [woundDepth, setWoundDepth] = useState<'superficial' | 'partial' | 'full'>('partial');
  const [healingStage, setHealingStage] = useState<'inflammatory' | 'proliferative' | 'remodeling'>('proliferative');
  const [activityLevel, setActivityLevel] = useState<string>('sedentary');

  // Clinical context. "Diabetes Mellitus" on the comorbidity list now ticks this.
  const [isDiabetic, setIsDiabetic] = useState(hasComorbidity(patientInfo, /diabet/i));
  const [hasPVD, setHasPVD] = useState(hasComorbidity(patientInfo, /vascular|pvd|pad\b/i));
  const [isMalnourished, setIsMalnourished] = useState(hasComorbidity(patientInfo, /malnutrition/i));
  const [isInfected, setIsInfected] = useState(false);
  const [isOnSteroids, setIsOnSteroids] = useState(false);

  const [result, setResult] = useState<WoundMealResult | null>(null);
  const [calcInput, setCalcInput] = useState<WoundMealInput | null>(null);
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const woundTypes = WOUND_TYPES;

  const calculate = () => {
    const input: WoundMealInput = {
      weightKg: weight, heightCm: height, ageYears: age, sex: gender, woundType, woundSize, woundDepth,
      healingStage, activityLevel, diabetic: isDiabetic, pvd: hasPVD, malnourished: isMalnourished,
      infected: isInfected, steroids: isOnSteroids, ckd: hasComorbidity(patientInfo, /kidney|renal|ckd/i),
    };
    const out = computeWoundMeal(input);
    if ('errors' in out) {
      setErrors(out.errors);
      setResult(null);
      setDays(null);
      return;
    }
    setErrors([]);
    setCalcInput(input);
    setResult(out.result);
    setDays(woundMealDays(out.result));
  };

  const report = useMemo(
    () => (result && calcInput ? woundMealHubReport(result, calcInput, patientInfo, days) : null),
    [result, calcInput, patientInfo, days]
  );

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

      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc ml-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
          <div className="border-t-2 border-gray-200 pt-6">
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
                <p className="text-2xl font-bold text-blue-600">{result.fluidNeeds.toLocaleString()} mL</p>
                <p className="font-semibold text-xs">Fluids/day</p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-yellow-600">{result.vitaminCTarget}</p>
                <p className="font-semibold text-xs">Vitamin C</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{result.zincNeeds} mg</p>
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

            {/* 7-Day Meal Plan from the meal-plan optimiser */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-1 flex items-center gap-2">
                <Apple className="w-5 h-5" />
                7-Day Nigerian Wound Healing Meal Plan
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Built to {result.calorieNeeds.toLocaleString()} kcal and {result.proteinNeeds} g protein per day
                {result.diabetic ? ', carbohydrate-controlled with no sugar-sweetened items' : ''}
                {result.ckd ? ', within potassium and phosphate limits' : ''}.
              </p>
              {days && days.length > 0 ? <MealPlanDays days={days} /> : <p className="text-sm text-amber-800">{NO_PLAN_MESSAGE}</p>}
            </div>

            {/* Key Nutrients */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h5 className="font-bold text-red-800 mb-2">Protein-Rich Foods</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {result.proteinRichFoods.slice(0, 6).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                <h5 className="font-bold text-orange-800 mb-2">Vitamin C Sources</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {result.vitaminCFoods.slice(0, 6).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                <h5 className="font-bold text-purple-800 mb-2">Zinc-Rich Foods</h5>
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

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
