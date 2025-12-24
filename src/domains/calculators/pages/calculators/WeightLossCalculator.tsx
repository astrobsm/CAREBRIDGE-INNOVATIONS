// Weight Loss Calculator
// Clinically-Guided Weight Management for Obesity

import { useState } from 'react';
import { TrendingDown, Calculator, AlertCircle, Target, Activity, UtensilsCrossed } from 'lucide-react';
import { PatientCalculatorInfo, WeightManagementResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function WeightLossCalculator({ patientInfo }: Props) {
  const [currentWeight, setCurrentWeight] = useState(patientInfo.weight || '');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [age, setAge] = useState(patientInfo.age || '');
  const [gender, setGender] = useState<'male' | 'female'>((patientInfo.gender || 'male') as 'male' | 'female');
  const [activityLevel, setActivityLevel] = useState<string>('sedentary');
  const [timeframe, setTimeframe] = useState<string>('moderate'); // rate of loss
  
  const [result, setResult] = useState<WeightManagementResult | null>(null);

  const activityMultipliers: Record<string, { label: string; factor: number }> = {
    sedentary: { label: 'Sedentary (little/no exercise)', factor: 1.2 },
    light: { label: 'Light (1-3 days/week)', factor: 1.375 },
    moderate: { label: 'Moderate (3-5 days/week)', factor: 1.55 },
    active: { label: 'Active (6-7 days/week)', factor: 1.725 },
    veryActive: { label: 'Very Active (twice/day)', factor: 1.9 },
  };

  const lossRates: Record<string, { label: string; kgPerWeek: number; description: string }> = {
    slow: { label: 'Slow & Steady', kgPerWeek: 0.25, description: '0.25 kg/week - Most sustainable' },
    moderate: { label: 'Moderate', kgPerWeek: 0.5, description: '0.5 kg/week - Recommended' },
    fast: { label: 'Faster', kgPerWeek: 0.75, description: '0.75 kg/week - Requires dedication' },
    aggressive: { label: 'Aggressive', kgPerWeek: 1.0, description: '1 kg/week - Medical supervision advised' },
  };

  const calculate = () => {
    const current = parseFloat(currentWeight);
    const target = parseFloat(targetWeight);
    const heightCm = parseFloat(height);
    const ageYears = parseInt(age);
    
    if (target >= current) {
      alert('Target weight should be less than current weight for weight loss.');
      return;
    }

    // BMI calculations
    const heightM = heightCm / 100;
    const currentBMI = current / (heightM * heightM);
    const targetBMI = target / (heightM * heightM);
    const idealWeight = 22 * heightM * heightM; // BMI 22 as ideal
    
    // BMR using Mifflin-St Jeor
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * current) + (6.25 * heightCm) - (5 * ageYears) + 5;
    } else {
      bmr = (10 * current) + (6.25 * heightCm) - (5 * ageYears) - 161;
    }
    
    // TDEE
    const tdee = bmr * activityMultipliers[activityLevel].factor;
    
    // Weight to lose
    const weightToLose = current - target;
    const lossRate = lossRates[timeframe].kgPerWeek;
    const weeksNeeded = Math.ceil(weightToLose / lossRate);
    const monthsNeeded = Math.round(weeksNeeded / 4.3);
    
    // Caloric deficit needed (1 kg fat ≈ 7700 kcal)
    const weeklyDeficit = lossRate * 7700;
    const dailyDeficit = Math.round(weeklyDeficit / 7);
    const targetCalories = Math.max(Math.round(tdee - dailyDeficit), gender === 'male' ? 1500 : 1200);
    
    // Protein (higher for weight loss - 1.6-2.2 g/kg of TARGET weight)
    const proteinTarget = Math.round(1.8 * target);
    
    // Exercise recommendations
    const exerciseRecommendations: string[] = [];
    if (currentBMI >= 40) {
      exerciseRecommendations.push('Start with low-impact activities (swimming, water aerobics)');
      exerciseRecommendations.push('Walking: Start with 10 minutes, build to 30 minutes daily');
      exerciseRecommendations.push('Chair exercises if mobility limited');
    } else if (currentBMI >= 30) {
      exerciseRecommendations.push('Walking: 30-45 minutes, 5 days/week');
      exerciseRecommendations.push('Low-impact cardio: cycling, swimming');
      exerciseRecommendations.push('Resistance training 2-3 times/week');
    } else {
      exerciseRecommendations.push('Moderate cardio: 150-300 minutes/week');
      exerciseRecommendations.push('HIIT: 2-3 sessions/week');
      exerciseRecommendations.push('Strength training: 3-4 times/week');
    }
    exerciseRecommendations.push('Daily target: 8,000-10,000 steps');
    exerciseRecommendations.push('Include flexibility work (stretching, yoga)');

    // Nigerian/African dietary suggestions
    const dietarySuggestions = {
      toEat: [
        'Vegetables: Efo riro, edikaikong, vegetable soup (portion-controlled)',
        'Lean proteins: Grilled fish, chicken (skinless), turkey',
        'Complex carbs: Ofada rice, beans, unripe plantain (in moderation)',
        'Fruits: Oranges, pawpaw, watermelon, garden eggs',
        'Healthy fats: Groundnuts (small portions), avocado',
        'Protein-rich: Eggs, moi-moi (steamed, not fried)',
      ],
      toLimit: [
        '❌ Fried foods: Puff-puff, akara, fried plantain',
        '❌ White carbs: White rice, eba, pounded yam (reduce portions)',
        '❌ Sugary drinks: Soft drinks, malt, sweetened zobo',
        '❌ Palm oil: Use sparingly',
        '❌ Fried meat/fish',
        '❌ Snacks: Chin-chin, biscuits, cakes',
      ],
      mealTiming: [
        'Eat breakfast within 1-2 hours of waking',
        'Have largest meal at lunch if possible',
        'Light dinner, at least 3 hours before bed',
        'Avoid late-night eating',
        'Stay hydrated - 8-10 glasses of water daily',
      ],
    };

    // Medical considerations
    const medicalConsiderations: string[] = [];
    if (currentBMI >= 40) {
      medicalConsiderations.push('Class III Obesity - Consider bariatric surgery evaluation');
      medicalConsiderations.push('Screen for: Diabetes, hypertension, sleep apnea');
    } else if (currentBMI >= 35) {
      medicalConsiderations.push('Class II Obesity - Medical supervision recommended');
      medicalConsiderations.push('Screen for metabolic syndrome');
    }
    if (patientInfo.comorbidities.includes('Diabetes')) {
      medicalConsiderations.push('Diabetes: Adjust medications as weight decreases. Monitor glucose closely.');
    }
    if (patientInfo.comorbidities.includes('Hypertension')) {
      medicalConsiderations.push('Hypertension: May need medication adjustments as weight decreases.');
    }
    if (dailyDeficit > 750) {
      medicalConsiderations.push('⚠️ Aggressive deficit - Regular medical monitoring advised');
    }

    // Milestones
    const milestones = [
      { weight: Math.round(current * 0.95), achievement: '5% loss - Metabolic improvements begin' },
      { weight: Math.round(current * 0.90), achievement: '10% loss - Significant health benefits' },
      { weight: Math.round(current * 0.85), achievement: '15% loss - Major risk reduction' },
      { weight: target, achievement: 'Target reached! 🎉' },
    ].filter(m => m.weight >= target);

    const calculationResult: WeightManagementResult = {
      direction: 'loss',
      currentWeight: current,
      targetWeight: target,
      currentBMI: Math.round(currentBMI * 10) / 10,
      targetBMI: Math.round(targetBMI * 10) / 10,
      idealWeight: Math.round(idealWeight * 10) / 10,
      weightChange: weightToLose,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      dailyDeficit,
      proteinTarget,
      weeksNeeded,
      monthsNeeded,
      weeklyRate: lossRate,
      exerciseRecommendations,
      dietarySuggestions,
      medicalConsiderations,
      milestones,
      warnings: currentBMI < 25 ? ['BMI already in healthy range - weight loss may not be necessary'] : [],
    };
    
    setResult(calculationResult);
  };

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

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
          <div className="border-t-2 border-gray-200 pt-6">
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
                <p className="text-3xl font-bold text-amber-600">{result.monthsNeeded}</p>
                <p className="font-semibold text-sm">Months</p>
                <p className="text-xs text-gray-500">({result.weeksNeeded} weeks)</p>
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
        </div>
      )}
    </div>
  );
}
