// Weight Gain Calculator
// Clinical Weight Gain for Underweight/Malnourished Patients

import { useMemo, useState } from 'react';
import { TrendingUp, Calculator, AlertCircle, Target, Apple } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { toSex } from '../../engine/calculationEngine';
import {
  GAIN_ACTIVITY, GAIN_RATES, computeWeightGain, weightGainDays, weightGainReport,
  type WeightGainInput, type WeightGainResult,
} from '../../engine/hub/weightGain';
import { NO_PLAN_MESSAGE } from '../../engine/hub/nutritionCommon';
import { hasComorbidity } from '../../report/hubPatient';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';
import { MealPlanDays } from '../../../clinician-assistant/components/CalculatorPanels';
import type { DayPlan } from '../../../../data/nigerianFoods';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function WeightGainCalculator({ patientInfo }: Props) {
  const [currentWeight, setCurrentWeight] = useState(patientInfo.weight || '');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  // Elderly categories fold into sex: an elderly man uses the male equation.
  const [gender, setGender] = useState<'male' | 'female'>(toSex(patientInfo.gender));
  const [activityLevel, setActivityLevel] = useState<string>('light');
  const [gainRate, setGainRate] = useState<string>('moderate');

  // Clinical context
  const [isMalnourished, setIsMalnourished] = useState(hasComorbidity(patientInfo, /malnutrition/i));
  const [isPostSurgery, setIsPostSurgery] = useState(false);
  const [hasChronicDisease, setHasChronicDisease] = useState(false);

  const [result, setResult] = useState<WeightGainResult | null>(null);
  const [calcInput, setCalcInput] = useState<WeightGainInput | null>(null);
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const activityMultipliers = GAIN_ACTIVITY;
  const gainRates = GAIN_RATES;

  const calculate = () => {
    const input: WeightGainInput = {
      currentWeightKg: currentWeight, targetWeightKg: targetWeight, heightCm: height, ageYears: age,
      sex: gender, activityLevel, rate: gainRate,
      malnourished: isMalnourished, postSurgery: isPostSurgery, chronicDisease: hasChronicDisease,
      diabetes: hasComorbidity(patientInfo, /diabet/i),
    };
    const out = computeWeightGain(input);
    if ('errors' in out) {
      setErrors(out.errors);
      setResult(null);
      setDays(null);
      return;
    }
    setErrors([]);
    setCalcInput(input);
    setResult(out.result);
    setDays(weightGainDays(out.result));
  };

  const report = useMemo(
    () => (result && calcInput ? weightGainReport(result, calcInput, patientInfo, days) : null),
    [result, calcInput, patientInfo, days]
  );

  const getBMICategory = (bmi: number): { category: string; color: string } => {
    if (bmi < 16) return { category: 'Severe Underweight', color: 'text-red-600' };
    if (bmi < 17) return { category: 'Moderate Underweight', color: 'text-orange-600' };
    if (bmi < 18.5) return { category: 'Mild Underweight', color: 'text-yellow-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-amber-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-7 h-7 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Weight Gain Calculator</h2>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Clinical Weight Gain Support</p>
            <p>For underweight patients, post-surgical recovery, or those needing nutritional rehabilitation. Includes African food-based high-calorie meal planning.</p>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Current Weight (kg) *</label>
          <input
            type="number"
            step="0.1"
            value={currentWeight}
            onChange={(e) => setCurrentWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 50"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Target Weight (kg) *</label>
          <input
            type="number"
            step="0.1"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 65"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm) *</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 170"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Age (years) *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 25"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Level</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
          >
            {Object.entries(activityMultipliers).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight Gain Rate</label>
          <select
            value={gainRate}
            onChange={(e) => setGainRate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
          >
            {Object.entries(gainRates).map(([key, { label, kgPerWeek }]) => (
              <option key={key} value={key}>{label} - {kgPerWeek} kg/week</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clinical Context */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Clinical Context (increases calorie needs)</h4>
        <div className="grid md:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 p-2 hover:bg-amber-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isMalnourished}
              onChange={(e) => setIsMalnourished(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded"
            />
            <span className="text-sm">Malnourished/Wasting</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-amber-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isPostSurgery}
              onChange={(e) => setIsPostSurgery(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded"
            />
            <span className="text-sm">Post-Surgery/Recovery</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-amber-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasChronicDisease}
              onChange={(e) => setHasChronicDisease(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded"
            />
            <span className="text-sm">Chronic Disease</span>
          </label>
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!currentWeight || !targetWeight || !height || !age}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate Weight Gain Plan
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
            {/* Warnings the calculation raised */}
            {result.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4 text-sm text-amber-900" role="status">
                <ul className="list-disc ml-5 space-y-1">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-amber-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">+{result.weightChange.toFixed(1)} kg</p>
                <p className="font-semibold text-sm">To Gain</p>
              </div>
              <div className="bg-green-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{result.targetCalories}</p>
                <p className="font-semibold text-sm">Daily Calories</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{result.proteinTarget}g</p>
                <p className="font-semibold text-sm">Protein/Day</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{result.timelineAchievable ? result.monthsNeeded : '—'}</p>
                <p className="font-semibold text-sm">Months</p>
                <p className="text-xs text-gray-500">{result.timelineAchievable ? `(${result.weeksNeeded} weeks at ${result.weeklyRate} kg/week)` : 'Not achievable by diet alone'}</p>
              </div>
            </div>

            {/* BMI Progress */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 mb-3">BMI Journey</h4>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getBMICategory(result.currentBMI).color}`}>
                    {result.currentBMI}
                  </p>
                  <p className="text-sm text-gray-600">Current</p>
                  <p className={`text-xs ${getBMICategory(result.currentBMI).color}`}>
                    {getBMICategory(result.currentBMI).category}
                  </p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full relative">
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-amber-500 to-green-500 rounded-full"
                    style={{ width: `${Math.min((result.weightChange / result.targetWeight) * 100 * 2, 100)}%` }}
                  ></div>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getBMICategory(result.targetBMI).color}`}>
                    {result.targetBMI}
                  </p>
                  <p className="text-sm text-gray-600">Target</p>
                  <p className={`text-xs ${getBMICategory(result.targetBMI).color}`}>
                    {getBMICategory(result.targetBMI).category}
                  </p>
                </div>
              </div>
            </div>

            {/* Calorie Strategy */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2">Calorie Strategy</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold">TDEE (maintenance):</p>
                  <p className="text-lg">{result.tdee} kcal/day</p>
                </div>
                <div>
                  <p className="font-semibold">Daily Surplus:</p>
                  <p className="text-lg text-green-600">+{Math.abs(result.dailyDeficit)} kcal</p>
                </div>
                <div>
                  <p className="font-semibold">Target Intake:</p>
                  <p className="text-lg text-amber-600 font-bold">{result.targetCalories} kcal/day</p>
                </div>
              </div>
            </div>

            {/* High Calorie Meals */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <Apple className="w-5 h-5" />
                High-Calorie Nigerian Foods
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-green-700 mb-1">Foods to Prioritize:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.dietarySuggestions.toEat.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-green-700 mb-1">High-Calorie Meal Ideas:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.dietarySuggestions.highCalorieMeals?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Meal Timing */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2">Eating Strategies</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-blue-700">
                {result.dietarySuggestions.mealTiming.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Supplements */}
            {result.supplements && result.supplements.length > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">Supplement Recommendations</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-purple-700">
                  {result.supplements.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}

            {/* Milestones */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Weight Gain Milestones
              </h4>
              <div className="space-y-2">
                {result.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 h-8 bg-indigo-200 rounded flex items-center justify-center font-bold text-indigo-800">
                      {milestone.weight} kg
                    </div>
                    <span className="text-sm text-gray-700">{milestone.achievement}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.refeedingDays.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">Refeeding schedule — build up to the target</h4>
                <ul className="text-sm text-red-900 space-y-0.5">
                  {result.refeedingDays.map(d => <li key={d.day}>Day {d.day}: {d.kcal} kcal ({d.kcalPerKg} kcal/kg)</li>)}
                </ul>
                <ul className="list-disc ml-5 mt-2 text-xs text-red-900 space-y-0.5">
                  {result.refeedingAlerts.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {/* Seven-day plan from the meal-plan optimiser */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-1">Seven-Day Nigerian Meal Plan</h4>
              <p className="text-xs text-gray-600 mb-3">
                Built to {result.targetCalories.toLocaleString()} kcal and {result.proteinTarget} g protein per day{result.diabetes ? ', carbohydrate-controlled' : ''}.
              </p>
              {days && days.length > 0 ? <MealPlanDays days={days} /> : <p className="text-sm text-amber-800">{NO_PLAN_MESSAGE}</p>}
            </div>

            {/* Medical Considerations */}
            {result.medicalConsiderations.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Medical Considerations</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-red-700">
                  {result.medicalConsiderations.map((item, index) => (
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
