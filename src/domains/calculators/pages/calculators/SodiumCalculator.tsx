// Sodium Disorder Calculator
// WHO-Adapted Hyponatremia/Hypernatremia Management
//
// The figures (TBW, deficits, Adrogué–Madias) come from calculationEngine;
// the management plan — steps, hard limits, monitoring — comes from the same
// electrolyte engine the Bedside calculator uses (engine/hub/sodium.ts).

import { useMemo, useState } from 'react';
import { Calculator, AlertCircle, FileText } from 'lucide-react';
import { PatientCalculatorInfo, VolumeStatus, Gender } from '../../types';
import { computeSodium, sodiumPlan, sodiumReport, type SodiumHubResult } from '../../engine/hub/sodium';
import DeterministicPlanView from '../../report/components/DeterministicPlanView';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

const SEVERITY_TONE = (s: string) =>
  s === 'Normal' ? 'text-green-700 bg-green-100'
    : s.startsWith('Mild') ? 'text-yellow-700 bg-yellow-100'
    : s.startsWith('Moderate') ? 'text-orange-700 bg-orange-100'
    : 'text-red-700 bg-red-100';

export default function SodiumCalculator({ patientInfo }: Props) {
  const [currentNa, setCurrentNa] = useState('');
  const [targetNa, setTargetNa] = useState('140');
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [gender, setGender] = useState<Gender>(patientInfo.gender || 'male');
  const [volumeStatus, setVolumeStatus] = useState<VolumeStatus>('euvolemic');
  const [isAcute, setIsAcute] = useState(false);
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [result, setResult] = useState<SodiumHubResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const calculateSodium = () => {
    const age = Number(patientInfo.age);
    const r = computeSodium({
      currentNa, targetNa, weight, gender, volumeStatus, isAcute, hasSymptoms,
      ageYears: Number.isFinite(age) && age > 0 ? age : null,
    });
    if (r.errors) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
  };

  const plan = useMemo(() => (result ? sodiumPlan(result) : undefined), [result]);
  const report = useMemo(() => (result ? sodiumReport(result, patientInfo) : null), [result, patientInfo]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Calculator className="w-5 h-5 sm:w-7 sm:h-7 text-sky-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Sodium Disorder Calculator</h2>
      </div>

      {/* Alert Box — consistent with the engine's hard limits shown in the plan */}
      <div className="bg-blue-50 border-l-4 border-sky-600 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">Safety principles for sodium correction</p>
            <ul className="list-disc ml-4 space-y-0.5 sm:space-y-1">
              <li><strong>Hyponatraemia ceiling:</strong> ≤10 mmol/L in the first 24 h and ≤8 mmol/L in any later 24 h (≤18 mmol/L in 48 h)</li>
              <li><strong>High ODS risk</strong> (chronic, alcohol, malnutrition, hypokalaemia, liver disease): ≤8 mmol/L in 24 h</li>
              <li><strong>Severe symptoms</strong> (seizure/coma): hypertonic 3% saline as in the plan; stop after a 5 mmol/L rise or symptom resolution</li>
              <li><strong>Hypernatraemia:</strong> ≤10 mmol/L in 24 h where chronic or of unknown duration</li>
              <li>0.9% saline is NOT a substitute for 3% saline in symptomatic hyponatraemia — refer urgently if hypertonic saline is unavailable</li>
            </ul>
            <p className="mt-1 text-gray-600">The exact steps, hard limits and monitoring for this patient are in the plan after calculation.</p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Sodium (mmol/L) *
          </label>
          <input
            type="number"
            value={currentNa}
            onChange={(e) => setCurrentNa(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 118"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Sodium (mmol/L)
          </label>
          <input
            type="number"
            value={targetNa}
            onChange={(e) => setTargetNa(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 124"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Body Weight (kg) *
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 70"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Patient Category
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            title="Select patient category"
          >
            <option value="male">Adult Male (TBW: 60%)</option>
            <option value="female">Adult Female (TBW: 50%)</option>
            <option value="elderly-male">Elderly Male (TBW: 50%)</option>
            <option value="elderly-female">Elderly Female (TBW: 45%)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Volume Status
          </label>
          <select
            value={volumeStatus}
            onChange={(e) => setVolumeStatus(e.target.value as VolumeStatus)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            title="Select volume status"
          >
            <option value="hypovolemic">Hypovolemic</option>
            <option value="euvolemic">Euvolemic</option>
            <option value="hypervolemic">Hypervolemic</option>
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="acute"
              checked={isAcute}
              onChange={(e) => setIsAcute(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="acute" className="ml-2 text-sm font-medium text-gray-700">
              Acute onset (&lt;48 hours)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="symptoms"
              checked={hasSymptoms}
              onChange={(e) => setHasSymptoms(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="symptoms" className="ml-2 text-sm font-medium text-gray-700">
              Severe symptoms (seizures/coma)
            </label>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc pl-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <button
        onClick={calculateSodium}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        Calculate Treatment Plan
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-600" />
              Treatment Plan
            </h3>

            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${SEVERITY_TONE(result.severity)}`}>
                <AlertCircle className="w-5 h-5" />
                {result.severity}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Body Water</p>
                <p className="text-2xl font-bold text-gray-800">{result.tbwL.toFixed(1)} L</p>
              </div>

              {result.sodiumDeficitMmol !== null && (
                <div className="bg-sky-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Sodium deficit to {result.target} mmol/L</p>
                  <p className="text-2xl font-bold text-sky-600">{result.sodiumDeficitMmol} mmol</p>
                  <p className="text-xs text-gray-500 mt-1">A planning figure; the hard limits govern the rate.</p>
                </div>
              )}

              {result.waterDeficitL !== null && (
                <div className="bg-sky-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Free Water Deficit</p>
                  <p className="text-2xl font-bold text-sky-600">{result.waterDeficitL.toFixed(1)} L</p>
                </div>
              )}

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Na⁺ change per L of 0.9% saline</p>
                <p className="text-xl font-bold text-purple-600">{result.changePerLiterNS.toFixed(2)} mmol/L</p>
                <p className="text-xs text-gray-500 mt-1">Adrogué–Madias formula</p>
              </div>

              {result.nsRateMlPerHr !== null && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">0.9% saline rate (hypovolaemic)</p>
                  <p className="text-xl font-bold text-blue-600">{result.nsRateMlPerHr} mL/hr</p>
                  <p className="text-xs text-gray-500 mt-1">For a 0.5 mmol/L/h rise; recheck sodium 2–4 hourly</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border-l-4 border-sky-600 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2">Recommended fluid for {result.volumeStatus} status:</p>
              <p className="text-gray-700 font-medium">{result.fluidType}</p>
              <p className="text-sm text-gray-600 mt-2">{result.fluidStrategy}</p>
            </div>

            {plan ? (
              <DeterministicPlanView plan={{ ...plan, sections: plan.sections.slice(1) }} heading="Correction plan" />
            ) : (
              <p className="text-sm text-gray-700">Sodium {result.current} mmol/L is within the reference interval — no correction plan.</p>
            )}
          </div>

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
