// GFR Calculator
// CKD-EPI and Cockcroft-Gault with CKD Staging

import { useMemo, useState } from 'react';
import { Calculator, Activity } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { computeGfr, gfrPlan, gfrReport, type GfrHubResult } from '../../engine/hub/gfr';
import DeterministicPlanView from '../../report/components/DeterministicPlanView';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function GFRCalculator({ patientInfo }: Props) {
  const [creatinine, setCreatinine] = useState('');
  const [creatinineUnit, setCreatinineUnit] = useState<'mg/dL' | 'umol/L'>('mg/dL');
  const [age, setAge] = useState(patientInfo.age || '');
  const [gender, setGender] = useState<'male' | 'female'>(
    patientInfo.gender === 'female' || patientInfo.gender === 'elderly-female' ? 'female' : 'male'
  );
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [result, setResult] = useState<GfrHubResult | null>(null);

  const [errors, setErrors] = useState<string[]>([]);

  const calculateGFR = () => {
    const r = computeGfr({ creatinine, creatinineUnit, age, gender, weight });
    if (r.errors) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
  };

  const plan = useMemo(() => (result ? gfrPlan(result) : undefined), [result]);
  const report = useMemo(() => (result ? gfrReport(result, patientInfo) : null), [result, patientInfo]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Calculator className="w-5 h-5 sm:w-7 sm:h-7 text-sky-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">GFR Calculator</h2>
      </div>

      {/* CKD Staging Reference */}
      <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
        <p className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">CKD Staging:</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 text-xs">
          <div className="bg-green-100 p-1.5 sm:p-2 rounded text-center">G1: ≥90</div>
          <div className="bg-green-50 p-1.5 sm:p-2 rounded text-center">G2: 60-89</div>
          <div className="bg-yellow-100 p-1.5 sm:p-2 rounded text-center">G3a: 45-59</div>
          <div className="bg-yellow-200 p-1.5 sm:p-2 rounded text-center">G3b: 30-44</div>
          <div className="bg-orange-200 p-1.5 sm:p-2 rounded text-center">G4: 15-29</div>
          <div className="bg-red-200 p-1.5 sm:p-2 rounded text-center">G5: &lt;15</div>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
        {/* Full width on a phone: the value and its unit side by side do not fit half a 390 px screen. */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Creatinine *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={creatinine}
              onChange={(e) => setCreatinine(e.target.value)}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
              placeholder={creatinineUnit === 'mg/dL' ? 'e.g., 1.2' : 'e.g., 106'}
              step="0.01"
            />
            <select
              title="Creatinine unit"
              aria-label="Creatinine unit"
              value={creatinineUnit}
              onChange={(e) => setCreatinineUnit(e.target.value as 'mg/dL' | 'umol/L')}
              className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
            >
              <option value="mg/dL">mg/dL</option>
              <option value="umol/L">µmol/L</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">Conversion: 1 mg/dL = 88.4 µmol/L (IFCC SI)</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Age (years) *
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="e.g., 55"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Gender *
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
            title="Select gender"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Weight (kg) <span className="font-normal text-gray-500">(for Cockcroft-Gault)</span>
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="e.g., 70"
            step="0.1"
          />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc pl-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <button
        onClick={calculateGFR}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        Calculate GFR
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* GFR Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-sky-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-1">CKD-EPI GFR</p>
                <p className="text-4xl font-bold text-sky-600">{result.gfrCKDEPI.toFixed(1)}</p>
                <p className="text-sm text-gray-500">mL/min/1.73m²</p>
              </div>

              {result.gfrCockcroftGault !== null && (
                <div className="bg-indigo-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">Cockcroft-Gault</p>
                  <p className="text-4xl font-bold text-indigo-600">{result.gfrCockcroftGault.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">mL/min (for drug dosing)</p>
                </div>
              )}
            </div>

            {/* CKD Stage */}
            <div className={`rounded-lg p-4 mb-6 ${
              result.ckdStage === 'G1' || result.ckdStage === 'G2' ? 'bg-green-100' :
              result.ckdStage === 'G3a' || result.ckdStage === 'G3b' ? 'bg-yellow-100' :
              result.ckdStage === 'G4' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <div className="flex items-center gap-3">
                <Activity className={`w-8 h-8 ${
                  result.ckdStage === 'G1' || result.ckdStage === 'G2' ? 'text-green-600' :
                  result.ckdStage === 'G3a' || result.ckdStage === 'G3b' ? 'text-yellow-600' :
                  result.ckdStage === 'G4' ? 'text-orange-600' : 'text-red-600'
                }`} />
                <div>
                  <p className="text-xl font-bold">CKD Stage {result.ckdStage}</p>
                  <p className="text-gray-700">{result.stageDescription}</p>
                </div>
              </div>
            </div>

            {plan && <DeterministicPlanView plan={plan} heading="Plan" />}
          </div>

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
