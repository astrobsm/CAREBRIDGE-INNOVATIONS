// MUST Calculator - Malnutrition Universal Screening Tool
// WHO-Adapted Nutritional Screening

import { useMemo, useState } from 'react';
import { Scale, Calculator, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { calculateBMI, bmiCategory } from '../../engine/calculationEngine';
import { weightLossPercent } from '../../../nutrition/engine/screening';
import { computeMust, mustReport, type MustComputed, type MustInput } from '../../engine/hub/must';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

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

  const [result, setResult] = useState<MustComputed | null>(null);
  const [calcInput, setCalcInput] = useState<MustInput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Live preview: only when both values make a real BMI (no Infinity/NaN).
  const previewBmi = calculateBMI(parseFloat(currentWeight), parseFloat(height));
  const previewLoss = weightLossPercent(parseFloat(previousWeight), parseFloat(currentWeight));

  const calculate = () => {
    const input: MustInput = {
      weightKg: currentWeight, heightCm: height, previousWeightKg: previousWeight,
      weightLossDuration, acutelyIll, npoOrReduced, comorbidities: patientInfo.comorbidities,
    };
    const out = computeMust(input);
    if ('errors' in out) {
      setErrors(out.errors);
      setResult(null);
      return;
    }
    setErrors([]);
    setCalcInput(input);
    setResult(out.result);
  };

  const report = useMemo(
    () => (result && calcInput ? mustReport(result, calcInput, patientInfo) : null),
    [result, calcInput, patientInfo]
  );

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
          {previewBmi !== null && previewBmi > 5 && previewBmi < 100 && (
            <div className="mt-2 sm:mt-3 p-2 bg-amber-100 rounded">
              <p className="text-xs sm:text-sm">
                <strong>BMI:</strong> {previewBmi.toFixed(1)} kg/m² ({bmiCategory(previewBmi)})
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
          {previewLoss !== null && (
            <div className="mt-3 p-2 bg-amber-100 rounded">
              <p className="text-sm">
                <strong>Weight Change:</strong> {(parseFloat(previousWeight) - parseFloat(currentWeight)).toFixed(1)} kg lost
                ({previewLoss.toFixed(1)}%{previewLoss < 0 ? ' — a gain' : ''})
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

      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc ml-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

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
                <li><strong>Step 1 (BMI):</strong> {result.scoreBreakdown?.bmi ?? '—'}</li>
                <li><strong>Step 2 (Weight Loss):</strong> {result.scoreBreakdown?.weightLoss ?? '—'}</li>
                <li><strong>Step 3 (Acute Disease):</strong> {result.scoreBreakdown?.acuteDisease ?? '—'}</li>
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
                  <p className="text-2xl font-bold text-blue-600">{result.estimatedCalories?.toLocaleString() ?? '—'}</p>
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

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
