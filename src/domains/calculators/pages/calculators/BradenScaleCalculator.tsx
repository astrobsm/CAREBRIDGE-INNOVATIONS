// Braden Scale Calculator - Pressure Sore/Ulcer Risk Assessment
// WHO-Adapted Pressure Injury Prevention

import { useMemo, useState } from 'react';
import { Shield, Calculator, AlertCircle, Activity } from 'lucide-react';
import { PatientCalculatorInfo, BradenResult } from '../../types';
import {
  activityOptions, bradenReport, computeBraden, frictionOptions, mobilityOptions, moistureOptions,
  nutritionOptions, sensoryOptions,
} from '../../engine/hub/braden';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function BradenScaleCalculator({ patientInfo }: Props) {
  // Braden Scale Components (1-4, lower = worse)
  const [sensoryPerception, setSensoryPerception] = useState(4);
  const [moisture, setMoisture] = useState(4);
  const [activity, setActivity] = useState(4);
  const [mobility, setMobility] = useState(4);
  const [nutrition, setNutrition] = useState(4);
  const [frictionShear, setFrictionShear] = useState(3); // 1-3 scale
  
  const [result, setResult] = useState<BradenResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const report = useMemo(() => (result ? bradenReport(result, patientInfo) : null), [result, patientInfo]);

  const calculate = () => {
    const r = computeBraden({ sensoryPerception, moisture, activity, mobility, nutrition, frictionShear });
    if ('errors' in r) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
  };

  const renderScaleSelector = (
    title: string,
    options: { value: number; label: string; description: string }[],
    value: number,
    onChange: (value: number) => void
  ) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${
              value === option.value
                ? 'border-sky-500 bg-sky-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name={title}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 w-4 h-4 text-sky-600"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                  option.value === 1 ? 'bg-red-200 text-red-800' :
                  option.value === 2 ? 'bg-orange-200 text-orange-800' :
                  option.value === 3 ? 'bg-yellow-200 text-yellow-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  {option.value}
                </span>
                <span className="font-medium">{option.label}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">Braden Scale Calculator</h2>
      </div>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Braden Scale for Predicting Pressure Sore Risk</p>
            <p>Score range: 6-23. Lower scores indicate higher risk. Assess all hospitalized patients on admission and regularly thereafter.</p>
          </div>
        </div>
      </div>

      {/* Assessment Sections */}
      <div className="space-y-4 mb-6">
        {renderScaleSelector('1. Sensory Perception', sensoryOptions, sensoryPerception, setSensoryPerception)}
        {renderScaleSelector('2. Moisture', moistureOptions, moisture, setMoisture)}
        {renderScaleSelector('3. Activity', activityOptions, activity, setActivity)}
        {renderScaleSelector('4. Mobility', mobilityOptions, mobility, setMobility)}
        {renderScaleSelector('5. Nutrition', nutritionOptions, nutrition, setNutrition)}
        {renderScaleSelector('6. Friction & Shear', frictionOptions, frictionShear, setFrictionShear)}
      </div>

      {/* Current Score Display */}
      <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
        <p className="text-lg">
          Current Score: <span className="text-2xl font-bold text-purple-600">
            {sensoryPerception + moisture + activity + mobility + nutrition + frictionShear}
          </span> / 23
        </p>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        Calculate Pressure Ulcer Risk
      </button>

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Score Summary */}
            <div className={`rounded-lg p-6 mb-6 text-center ${
              result.riskLevel === 'No Risk' ? 'bg-green-100' :
              result.riskLevel === 'Mild Risk' ? 'bg-blue-100' :
              result.riskLevel === 'Moderate Risk' ? 'bg-yellow-100' :
              result.riskLevel === 'High Risk' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <p className={`text-5xl font-bold mb-2 ${
                result.riskLevel === 'No Risk' ? 'text-green-600' :
                result.riskLevel === 'Mild Risk' ? 'text-blue-600' :
                result.riskLevel === 'Moderate Risk' ? 'text-yellow-600' :
                result.riskLevel === 'High Risk' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {result.totalScore}/23
              </p>
              <p className="text-2xl font-semibold text-gray-800">{result.riskLevel}</p>
              <p className="text-sm text-gray-600 mt-2">
                Reassess: {result.reassessmentFrequency}
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-3">Score Breakdown:</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(result.scoreBreakdown ?? {}).map(([key, { score, label }]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      score <= 1 ? 'bg-red-200 text-red-800' :
                      score === 2 ? 'bg-orange-200 text-orange-800' :
                      score === 3 ? 'bg-yellow-200 text-yellow-800' :
                      'bg-green-200 text-green-800'
                    }`}>{score}</span>
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: {label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem Areas */}
            {(result.problemAreas?.length ?? 0) > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Priority Problem Areas (Score ≤2):</h4>
                <div className="flex flex-wrap gap-2">
                  {result.problemAreas?.map((area, index) => (
                    <span key={index} className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Turning Schedule */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Repositioning Schedule:
              </h4>
              <p className="text-lg font-semibold">{result.turningSchedule}</p>
            </div>

            {/* Interventions */}
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-purple-800 mb-2">Interventions:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.interventions?.map((item, index) => (
                  <li key={index} className={item.includes('⚠️') || item.includes('🚨') ? 'font-semibold text-red-600' : ''}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Surfaces */}
            {(result.supportSurfaces?.length ?? 0) > 0 && (
              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-indigo-800 mb-2">Support Surface Recommendations:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.supportSurfaces?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prevention Measures */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Prevention Measures:</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.preventionMeasures?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Nutrition Recommendations */}
            {(result.nutritionRecommendations?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-amber-800 mb-2">Nutrition for Wound Healing:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.nutritionRecommendations?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skin Care */}
            {(result.skinCare?.length ?? 0) > 0 && (
              <div className="bg-pink-50 border-l-4 border-pink-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-pink-800 mb-2">Skin Care Protocol:</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.skinCare?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* High Risk Sites */}
            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2">High-Risk Body Sites to Monitor:</h4>
              <div className="grid md:grid-cols-3 gap-1 text-sm text-gray-700">
                {result.highRiskSites?.map((site, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    {site}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
