// Nutrition Calculator
// Harris-Benedict, Caloric Requirements, African Food-Based Recommendations

import { useMemo, useState } from 'react';
import { UtensilsCrossed, Calculator, AlertCircle, Apple, Flame } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { toSex } from '../../engine/calculationEngine';
import {
  ACTIVITY_FACTORS, STRESS_FACTORS, computeNutritionHub, nutritionHubDays, nutritionHubReport,
  type NutritionHubInput, type NutritionHubResult,
} from '../../engine/hub/nutrition';
import { NO_PLAN_MESSAGE } from '../../engine/hub/nutritionCommon';
import { hasComorbidity } from '../../report/hubPatient';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';
import { MealPlanDays } from '../../../clinician-assistant/components/CalculatorPanels';
import type { DayPlan } from '../../../../data/nigerianFoods';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function NutritionCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  // Elderly categories fold into sex here: an elderly man uses the male equation.
  const [gender, setGender] = useState<'male' | 'female'>(toSex(patientInfo.gender));

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
  const [isRenalDisease, setIsRenalDisease] = useState(hasComorbidity(patientInfo, /kidney|renal|ckd/i));
  const [isLiverDisease, setIsLiverDisease] = useState(hasComorbidity(patientInfo, /liver|cirrhosis|hepat/i));
  const [isMalnourished, setIsMalnourished] = useState(hasComorbidity(patientInfo, /malnutrition/i));

  const [result, setResult] = useState<NutritionHubResult | null>(null);
  const [calcInput, setCalcInput] = useState<NutritionHubInput | null>(null);
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const activityFactors = ACTIVITY_FACTORS;
  const stressFactors = STRESS_FACTORS;

  const calculate = () => {
    const input: NutritionHubInput = {
      weightKg: weight, heightCm: height, ageYears: age, sex: gender, activityLevel, stressFactor,
      woundHealing: isWoundHealing, burns: isBurns, burnsTBSA, sepsis: isSepsis, postSurgery: isPostSurgery,
      renalDisease: isRenalDisease, liverDisease: isLiverDisease, malnourished: isMalnourished,
      diabetes: hasComorbidity(patientInfo, /diabet/i),
    };
    const out = computeNutritionHub(input);
    if ('errors' in out) {
      setErrors(out.errors);
      setResult(null);
      setDays(null);
      return;
    }
    setErrors([]);
    setCalcInput(input);
    setResult(out.result);
    setDays(nutritionHubDays(out.result));
  };

  const report = useMemo(
    () => (result && calcInput ? nutritionHubReport(result, calcInput, patientInfo, days) : null),
    [result, calcInput, patientInfo, days]
  );

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

      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc ml-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
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
              {result.fluidCaution && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded p-2 mt-2">{result.fluidCaution}</p>
              )}
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

            {/* Seven-day plan from the meal-plan optimiser */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-1 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Seven-Day Nigerian Meal Plan
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Built to {result.tdee.toLocaleString()} kcal and {result.proteinNeeds} g protein per day
                {result.diabetes ? ', carbohydrate-controlled with no sugar-sweetened items' : ''}
                {result.renal ? ', within potassium and phosphate limits' : ''}.
              </p>
              {days && days.length > 0
                ? <MealPlanDays days={days} />
                : <p className="text-sm text-amber-800">{NO_PLAN_MESSAGE}</p>}

              {/* High Protein Options */}
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">High-Protein Food Options:</p>
                <div className="grid md:grid-cols-2 gap-1 text-sm text-gray-700">
                  {result.highProteinOptions.map((item, i) => <span key={i}>{item}</span>)}
                </div>
                <p className="font-semibold text-gray-800 mt-3 mb-1">Calorie boosters:</p>
                <ul className="list-disc ml-5 text-sm text-gray-700">
                  {result.caloricBoosters.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
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

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
