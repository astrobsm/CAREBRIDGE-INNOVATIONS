// Weight Loss Calculator
// Clinically-Guided Weight Management for Obesity

import { useMemo, useState } from 'react';
import { TrendingDown, Calculator, AlertCircle, Target, Activity, UtensilsCrossed } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { toSex } from '../../engine/calculationEngine';
import {
  LOSS_ACTIVITY, LOSS_RATES, computeWeightLoss, weightLossDays, weightLossReport,
  type WeightLossInput, type WeightHubResult,
} from '../../engine/hub/weightLoss';
import { NO_PLAN_MESSAGE } from '../../engine/hub/nutritionCommon';
import { hasComorbidity } from '../../report/hubPatient';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';
import { MealPlanDays } from '../../../clinician-assistant/components/CalculatorPanels';
import type { DayPlan } from '../../../../data/nigerianFoods';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function WeightLossCalculator({ patientInfo }: Props) {
  const [currentWeight, setCurrentWeight] = useState(patientInfo.weight || '');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  // Elderly categories fold into sex: an elderly man uses the male equation.
  const [gender, setGender] = useState<'male' | 'female'>(toSex(patientInfo.gender));
  const [activityLevel, setActivityLevel] = useState<string>('sedentary');
  const [timeframe, setTimeframe] = useState<string>('moderate'); // rate of loss

  const [result, setResult] = useState<WeightHubResult | null>(null);
  const [calcInput, setCalcInput] = useState<WeightLossInput | null>(null);
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const activityMultipliers = LOSS_ACTIVITY;
  const lossRates = LOSS_RATES;

  const calculate = () => {
    const input: WeightLossInput = {
      currentWeightKg: currentWeight, targetWeightKg: targetWeight, heightCm: height, ageYears: age,
      sex: gender, activityLevel, rate: timeframe,
      hypertension: hasComorbidity(patientInfo, /hypertension/i),
      diabetes: hasComorbidity(patientInfo, /diabet/i),
    };
    const out = computeWeightLoss(input);
    if ('errors' in out) {
      setErrors(out.errors);
      setResult(null);
      setDays(null);
      return;
    }
    setErrors([]);
    setCalcInput(input);
    setResult(out.result);
    setDays(weightLossDays(out.result));
  };

  const report = useMemo(
    () => (result && calcInput ? weightLossReport(result, calcInput, patientInfo, days) : null),
    [result, calcInput, patientInfo, days]
  );

  const getBMICategory = (bmi: number): { category: string; color: string } => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    if (bmi < 35) return { category: 'Obese I', color: 'text-orange-600' };
    if (bmi < 40) return { category: 'Obese II', color: 'text-red-600' };
    return { category: 'Obese III', color: 'text-red-700' };
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <TrendingDown className="w-7 h-7 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Weight Loss Calculator</h2>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Evidence-Based Weight Management</p>
            <p>Calculates sustainable calorie targets, timeline estimates, and provides African food-based dietary guidance for healthy weight loss.</p>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 95"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Target Weight (kg) *</label>
          <input
            type="number"
            step="0.1"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 75"
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
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
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
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Level</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            {Object.entries(activityMultipliers).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight Loss Rate</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            {Object.entries(lossRates).map(([key, { label, description }]) => (
              <option key={key} value={key}>{label} - {description}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!currentWeight || !targetWeight || !height || !age}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate Weight Loss Plan
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
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{result.weightChange.toFixed(1)} kg</p>
                <p className="font-semibold text-sm">To Lose</p>
              </div>
              <div className="bg-green-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{result.targetCalories}</p>
                <p className="font-semibold text-sm">Daily Calories</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{result.proteinTarget}g</p>
                <p className="font-semibold text-sm">Protein/Day</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{result.timelineAchievable ? result.monthsNeeded : '—'}</p>
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
                    className="absolute h-2 bg-gradient-to-r from-orange-500 to-green-500 rounded-full"
                    style={{ width: `${Math.min((result.weightChange / result.currentWeight) * 100 * 3, 100)}%` }}
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

            {/* Calorie Breakdown */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2">Calorie Strategy</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold">TDEE (maintenance):</p>
                  <p className="text-lg">{result.tdee} kcal/day</p>
                </div>
                <div>
                  <p className="font-semibold">Daily Deficit:</p>
                  <p className="text-lg text-orange-600">-{result.dailyDeficit} kcal</p>
                </div>
                <div>
                  <p className="font-semibold">Target Intake:</p>
                  <p className="text-lg text-green-600 font-bold">{result.targetCalories} kcal/day</p>
                </div>
              </div>
            </div>

            {/* Exercise */}
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Exercise Recommendations
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-purple-700">
                {result.exerciseRecommendations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Diet */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Dietary Guidance (Nigerian Foods)
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-green-700 mb-1">✅ Foods to Eat:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.dietarySuggestions.toEat.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-red-700 mb-1">Foods to Limit:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.dietarySuggestions.toLimit.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Weight Loss Milestones
              </h4>
              <div className="space-y-2">
                {result.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 h-8 bg-amber-200 rounded flex items-center justify-center font-bold text-amber-800">
                      {milestone.weight} kg
                    </div>
                    <span className="text-sm text-gray-700">{milestone.achievement}</span>
                  </div>
                ))}
              </div>
            </div>

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
