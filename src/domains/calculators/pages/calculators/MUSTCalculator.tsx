// MUST Calculator - Malnutrition Universal Screening Tool
// WHO-Adapted Nutritional Screening

import { useState } from 'react';
import { Scale, Calculator, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { PatientCalculatorInfo, MUSTResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function MUSTCalculator({ patientInfo }: Props) {
  const [currentWeight, setCurrentWeight] = useState(patientInfo.weight || '');
  const [height, setHeight] = useState(patientInfo.height || '');
  const [previousWeight, setPreviousWeight] = useState('');
  const [weightLossDuration, setWeightLossDuration] = useState<string>('3-6 months');
  const [acutelyIll, setAcutelyIll] = useState(false);
  const [npoOrReduced, setNpoOrReduced] = useState(false);
  
  const [result, setResult] = useState<MUSTResult | null>(null);

  const calculateBMI = (weight: number, heightCm: number): number => {
    const heightM = heightCm / 100;
    return weight / (heightM * heightM);
  };

  const getBMIScore = (bmi: number): number => {
    if (bmi > 20) return 0;
    if (bmi >= 18.5) return 1;
    return 2;
  };

  const getWeightLossPercentage = (current: number, previous: number): number => {
    return ((previous - current) / previous) * 100;
  };

  const getWeightLossScore = (percentage: number): number => {
    if (percentage < 5) return 0;
    if (percentage < 10) return 1;
    return 2;
  };

  const calculate = () => {
    const weight = parseFloat(currentWeight);
    const heightVal = parseFloat(height);
    const prevWeight = parseFloat(previousWeight) || weight;
    
    const bmi = calculateBMI(weight, heightVal);
    const bmiScore = getBMIScore(bmi);
    
    const weightLossPercent = getWeightLossPercentage(weight, prevWeight);
    const weightLossScore = getWeightLossScore(Math.abs(weightLossPercent));
    
    // Acute disease effect score
    const acuteDiseaseScore = (acutelyIll && npoOrReduced) ? 2 : 0;
    
    const totalScore = bmiScore + weightLossScore + acuteDiseaseScore;
    
    // Risk category
    let riskCategory: 'Low' | 'Medium' | 'High';
    let managementPlan: string[] = [];
    let monitoringFrequency: string;
    let dietaryRecommendations: string[] = [];
    let supplementRecommendations: string[] = [];
    
    if (totalScore === 0) {
      riskCategory = 'Low';
      monitoringFrequency = 'Weekly in hospital, Monthly in community, Annually if outpatient';
      managementPlan = [
        'Routine clinical care',
        'Repeat screening: Weekly (hospital), Monthly (care homes), Annually (outpatients)',
        'Encourage healthy, balanced diet',
        'Document nutritional status in notes',
      ];
      dietaryRecommendations = [
        'Maintain regular meal patterns (3 meals + 2-3 snacks)',
        'Include protein with each meal',
        'Encourage fruits and vegetables',
        'Adequate fluid intake (2-3L daily)',
      ];
    } else if (totalScore === 1) {
      riskCategory = 'Medium';
      monitoringFrequency = 'Weekly in all settings';
      managementPlan = [
        'Observe and document dietary intake for 3 days',
        'If intake adequate: Repeat screening weekly (hospital), monthly (community)',
        'If intake inadequate: Follow High Risk protocol',
        'Consider food fortification strategies',
        'Set achievable goals for improvement',
      ];
      dietaryRecommendations = [
        'Fortify foods (add butter, cream, cheese to meals)',
        'High-protein, high-energy snacks between meals',
        'Nourishing drinks (milky drinks, smoothies)',
        'Smaller, more frequent meals if appetite poor',
        'Consider local high-energy foods: Groundnuts, palm oil-enriched dishes',
      ];
      supplementRecommendations = [
        'Consider oral nutritional supplements if dietary measures insufficient',
        'Multivitamin supplementation',
      ];
    } else {
      riskCategory = 'High';
      monitoringFrequency = 'Every 2-3 days initially, then weekly';
      managementPlan = [
        '⚠️ REFER TO DIETITIAN/NUTRITION TEAM',
        'Implement high-energy, high-protein diet immediately',
        'Oral nutritional supplements (ONS) - 2-3 per day',
        'Consider nasogastric feeding if oral intake <50% requirements',
        'Address underlying causes (pain, infection, swallowing difficulties)',
        'Weekly weight monitoring',
        'Document comprehensive nutritional care plan',
        'Review and update care plan every 2-3 days',
      ];
      dietaryRecommendations = [
        '⚡ High-energy, high-protein diet essential',
        'Food fortification (add oils, butter, milk powder to foods)',
        'Protein supplements: 1.2-1.5g protein/kg body weight daily',
        'Small, frequent meals (6-8 times daily)',
        'Nourishing fluids instead of tea/water',
        'Consider locally available energy-dense foods:',
        '  - Groundnut soup, palm oil dishes',
        '  - Beans and plantain combinations',
        '  - Ogi enriched with soybeans',
        '  - Eggs, fish, meat when available',
      ];
      supplementRecommendations = [
        '1st Line: Oral Nutritional Supplements (ONS) 2-3 per day',
        'Plumpy\'nut or therapeutic foods if available',
        'Multivitamin + Zinc supplementation',
        'Iron if anaemic',
        'Consider NG tube feeding if oral intake <50% for >5 days',
        'Vitamin D 800-1000 IU daily',
      ];
    }
    
    // Additional considerations
    const additionalConsiderations: string[] = [];
    
    if (patientInfo.comorbidities.includes('Diabetes')) {
      additionalConsiderations.push('Diabetes present: Monitor glucose with nutritional supplements. May need diabetes-specific ONS.');
    }
    if (patientInfo.comorbidities.includes('Chronic Kidney Disease')) {
      additionalConsiderations.push('CKD present: Protein restriction may be needed (0.6-0.8g/kg in pre-dialysis). Consult renal dietitian.');
    }
    if (patientInfo.comorbidities.includes('Heart Failure')) {
      additionalConsiderations.push('Heart failure present: Fluid restriction may apply. Monitor sodium intake.');
    }
    if (acutelyIll) {
      additionalConsiderations.push('Acute illness: Increased metabolic demands. May need 25-35 kcal/kg/day.');
    }
    
    // Calculate estimated needs
    const estimatedCalories = riskCategory === 'High' 
      ? Math.round(35 * weight)  // High risk: 35 kcal/kg
      : Math.round(30 * weight); // Normal: 30 kcal/kg
    
    const estimatedProtein = riskCategory === 'High'
      ? Math.round(1.5 * weight) // High risk: 1.5g/kg
      : Math.round(1.0 * weight); // Normal: 1g/kg
    
    const calculationResult: MUSTResult = {
      bmiScore,
      weightLossScore,
      acuteIllnessScore: acuteDiseaseScore,
      totalScore,
      riskLevel: riskCategory === 'High' ? 'high' : riskCategory === 'Medium' ? 'medium' : 'low',
      riskCategory,
      recommendations: managementPlan,
      referralNeeded: riskCategory === 'High',
      nutritionalPlan: dietaryRecommendations,
      managementPlan,
      monitoringFrequency,
      dietaryRecommendations,
      supplementRecommendations,
      additionalConsiderations,
      estimatedCalories,
      estimatedProtein,
      scoreBreakdown: {
        bmi: `BMI ${bmi.toFixed(1)} kg/m² → Score ${bmiScore}`,
        weightLoss: prevWeight ? `Weight loss ${Math.abs(weightLossPercent).toFixed(1)}% over ${weightLossDuration} → Score ${weightLossScore}` : 'No previous weight recorded',
        acuteDisease: acutelyIll && npoOrReduced ? 'Acutely ill with reduced/no intake → Score 2' : 'No acute disease effect → Score 0',
      },
    };
    
    setResult(calculationResult);
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 16) return 'Severe underweight';
    if (bmi < 17) return 'Moderate underweight';
    if (bmi < 18.5) return 'Mild underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    if (bmi < 35) return 'Obese Class I';
    if (bmi < 40) return 'Obese Class II';
    return 'Obese Class III';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Scale className="w-5 h-5 sm:w-7 sm:h-7 text-amber-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">MUST Calculator</h2>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">Malnutrition Universal Screening Tool</p>
            <p>Validated nutritional screening tool for adults at risk of malnutrition.</p>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
        {/* Step 1: BMI */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <h3 className="font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
            <span className="bg-amber-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm">1</span>
            BMI Score
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 text-sm"
                placeholder="e.g., 65"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Height (cm) *
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 text-sm"
                placeholder="e.g., 170"
              />
            </div>
          </div>
          {currentWeight && height && (
            <div className="mt-2 sm:mt-3 p-2 bg-amber-100 rounded">
              <p className="text-xs sm:text-sm">
                <strong>BMI:</strong> {calculateBMI(parseFloat(currentWeight), parseFloat(height)).toFixed(1)} kg/m² 
                ({getBMICategory(calculateBMI(parseFloat(currentWeight), parseFloat(height)))})
              </p>
            </div>
          )}
          <div className="mt-3 text-sm text-gray-600">
            <p><span className="font-medium">Score 0:</span> BMI {'>'} 20 kg/m²</p>
            <p><span className="font-medium">Score 1:</span> BMI 18.5-20 kg/m²</p>
            <p><span className="font-medium">Score 2:</span> BMI {'<'} 18.5 kg/m²</p>
          </div>
        </div>

        {/* Step 2: Weight Loss */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
            Unplanned Weight Loss Score
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Previous Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={previousWeight}
                onChange={(e) => setPreviousWeight(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                placeholder="e.g., 70"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Weight Loss Period
              </label>
              <select
                value={weightLossDuration}
                onChange={(e) => setWeightLossDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                title="Select weight loss period"
              >
                <option value="1 month">&lt;1 month</option>
                <option value="1-3 months">1-3 months</option>
                <option value="3-6 months">3-6 months</option>
                <option value=">6 months">&gt;6 months</option>
              </select>
            </div>
          </div>
          {currentWeight && previousWeight && (
            <div className="mt-3 p-2 bg-amber-100 rounded">
              <p className="text-sm">
                <strong>Weight Change:</strong> {(parseFloat(previousWeight) - parseFloat(currentWeight)).toFixed(1)} kg 
                ({getWeightLossPercentage(parseFloat(currentWeight), parseFloat(previousWeight)).toFixed(1)}%)
              </p>
            </div>
          )}
          <div className="mt-3 text-sm text-gray-600">
            <p><span className="font-medium">Score 0:</span> {'<'}5% unplanned weight loss</p>
            <p><span className="font-medium">Score 1:</span> 5-10% unplanned weight loss</p>
            <p><span className="font-medium">Score 2:</span> {'>'}10% unplanned weight loss</p>
          </div>
        </div>

        {/* Step 3: Acute Disease Effect */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
            Acute Disease Effect Score
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            If patient is acutely ill AND there has been or is likely to be no nutritional intake for {'>'}5 days, add a score of 2.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 hover:bg-amber-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={acutelyIll}
                onChange={(e) => setAcutelyIll(e.target.checked)}
                className="w-5 h-5 text-amber-600 rounded"
              />
              <span className="text-sm">Patient is acutely ill (e.g., critical care, post-operative, major surgery)</span>
            </label>
            <label className="flex items-center gap-3 p-2 hover:bg-amber-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={npoOrReduced}
                onChange={(e) => setNpoOrReduced(e.target.checked)}
                className="w-5 h-5 text-amber-600 rounded"
              />
              <span className="text-sm">No nutritional intake or likely to have none for {'>'}5 days (NPO, reduced intake)</span>
            </label>
          </div>
          {acutelyIll && npoOrReduced && (
            <div className="mt-3 p-2 bg-red-100 rounded">
              <p className="text-sm text-red-800 font-semibold">
                ⚠️ Acute Disease Effect Score: 2 points added
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!currentWeight || !height}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate MUST Score
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Score Summary */}
            <div className={`rounded-lg p-6 mb-6 text-center ${
              result.riskCategory === 'Low' ? 'bg-green-100' :
              result.riskCategory === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <p className={`text-5xl font-bold mb-2 ${
                result.riskCategory === 'Low' ? 'text-green-600' :
                result.riskCategory === 'Medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                Score: {result.totalScore}
              </p>
              <p className="text-2xl font-semibold text-gray-800">{result.riskCategory} Risk</p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Score Breakdown:</h4>
              <ul className="text-sm space-y-1">
                <li><strong>Step 1 (BMI):</strong> {result.scoreBreakdown?.bmi ?? 0}</li>
                <li><strong>Step 2 (Weight Loss):</strong> {result.scoreBreakdown?.weightLoss ?? 0}</li>
                <li><strong>Step 3 (Acute Disease):</strong> {result.scoreBreakdown?.acuteDisease ?? 0}</li>
              </ul>
            </div>

            {/* Management Plan */}
            <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${
              result.riskCategory === 'Low' ? 'bg-green-50 border-green-600' :
              result.riskCategory === 'Medium' ? 'bg-yellow-50 border-yellow-600' : 'bg-red-50 border-red-600'
            }`}>
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Management Plan (Steps 4 & 5):
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.managementPlan?.map((item, index) => (
                  <li key={index} className={item.includes('⚠️') ? 'font-semibold text-red-600' : ''}>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-medium">
                📅 Monitoring: {result.monitoringFrequency}
              </p>
            </div>

            {/* Estimated Nutritional Needs */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2">Estimated Daily Requirements:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded p-3">
                  <p className="text-2xl font-bold text-blue-600">{result.estimatedCalories?.toLocaleString() ?? 0}</p>
                  <p className="text-gray-600">kcal/day</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-2xl font-bold text-blue-600">{result.estimatedProtein}</p>
                  <p className="text-gray-600">g protein/day</p>
                </div>
              </div>
            </div>

            {/* Dietary Recommendations */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-amber-800 mb-2">Dietary Recommendations:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.dietaryRecommendations?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Supplement Recommendations */}
            {(result.supplementRecommendations?.length ?? 0) > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">Supplement Recommendations:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.supplementRecommendations?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Considerations */}
            {(result.additionalConsiderations?.length ?? 0) > 0 && (
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-lg">
                <h4 className="font-bold text-indigo-800 mb-2">Special Considerations:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.additionalConsiderations?.map((item, index) => (
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
