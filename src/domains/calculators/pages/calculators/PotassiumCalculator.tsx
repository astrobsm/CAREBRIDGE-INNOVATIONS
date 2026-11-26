// Potassium Disorder Calculator
// WHO-Adapted Hypokalemia/Hyperkalemia Management

import { useMemo, useState } from 'react';
import { Calculator, AlertCircle, FileText, Activity } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { computePotassium, potassiumPlan, potassiumReport, type PotassiumHubResult } from '../../engine/hub/potassium';
import { hasComorbidity } from '../../report/hubPatient';
import DeterministicPlanView from '../../report/components/DeterministicPlanView';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function PotassiumCalculator({ patientInfo }: Props) {
  const [currentK, setCurrentK] = useState('');
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [hasRenalImpairment, setHasRenalImpairment] = useState(
    hasComorbidity(patientInfo, /kidney|renal|ckd/i)
  );
  const [onDigoxin, setOnDigoxin] = useState(false);
  const [hasEcgChanges, setHasEcgChanges] = useState(false);
  const [hasMuscleWeakness, setHasMuscleWeakness] = useState(false);
  const [oralIntakeOk, setOralIntakeOk] = useState(true);
  const [result, setResult] = useState<PotassiumHubResult | null>(null);

  const [errors, setErrors] = useState<string[]>([]);

  const calculatePotassium = () => {
    const r = computePotassium({
      currentK, weight, hasRenalImpairment, onDigoxin, hasEcgChanges, hasMuscleWeakness, oralIntakeOk,
    }, patientInfo);
    if (r.errors) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
  };

  const plan = useMemo(() => (result ? potassiumPlan(result) : undefined), [result]);
  const report = useMemo(() => (result ? potassiumReport(result, patientInfo) : null), [result, patientInfo]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-7 h-7 text-sky-600" />
        <h2 className="text-2xl font-bold text-gray-800">Potassium Disorder Calculator</h2>
      </div>

      {/* Alert Box */}
      <div className="bg-blue-50 border-l-4 border-sky-600 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Potassium Management (UK Renal Assoc 2023 / KDIGO 2024)</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Normal K+: 3.5-5.0 mmol/L (SI). 1 mEq/L = 1 mmol/L</li>
              <li>Hypokalaemia: Torsades risk if K+ &lt;2.5 mmol/L (worse with QT prolongation)</li>
              <li>Hyperkalaemia: ECG changes typically &gt;6.5 mmol/L; cardiac arrest risk &gt;7.0 mmol/L</li>
              <li>Always obtain ECG for K+ &lt;3.0 or &gt;5.5 mmol/L (or any symptoms)</li>
              <li>Always check Mg<sup>2+</sup> with hypoK — hypomagnesaemia causes refractory hypokalaemia</li>
              <li>Exclude pseudohyperkalaemia (haemolysed/old sample, leucocytosis &gt;100, thrombocytosis &gt;1000) before treating</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Potassium (mmol/L) *
          </label>
          <input
            type="number"
            value={currentK}
            onChange={(e) => setCurrentK(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 2.8"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Body Weight (kg) <span className="font-normal text-gray-500">(optional)</span>
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

        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="renalImpairment"
              checked={hasRenalImpairment}
              onChange={(e) => setHasRenalImpairment(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="renalImpairment" className="ml-2 text-sm font-medium text-gray-700">
              Renal impairment (CKD/AKI)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="digoxin"
              checked={onDigoxin}
              onChange={(e) => setOnDigoxin(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="digoxin" className="ml-2 text-sm font-medium text-gray-700">
              On Digoxin therapy
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ecgChanges"
              checked={hasEcgChanges}
              onChange={(e) => setHasEcgChanges(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="ecgChanges" className="ml-2 text-sm font-medium text-gray-700">
              ECG changes present
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="muscleWeakness"
              checked={hasMuscleWeakness}
              onChange={(e) => setHasMuscleWeakness(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="muscleWeakness" className="ml-2 text-sm font-medium text-gray-700">
              Muscle weakness present
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="oralIntake"
              checked={oralIntakeOk}
              onChange={(e) => setOralIntakeOk(e.target.checked)}
              className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label htmlFor="oralIntake" className="ml-2 text-sm font-medium text-gray-700">
              Oral intake possible
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
        onClick={calculatePotassium}
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

            {/* Severity Badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                result.tone === 'normal' ? 'text-green-700 bg-green-100' :
                result.tone === 'mild' ? 'text-yellow-700 bg-yellow-100' :
                result.tone === 'moderate' ? 'text-orange-700 bg-orange-100' :
                'text-red-700 bg-red-100'
              }`}>
                <Activity className="w-5 h-5" />
                {result.severity}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Current K+</p>
                <p className="text-2xl font-bold text-gray-800">{result.current} mmol/L</p>
              </div>
              {result.plan?.deficit && (
                <div className="bg-sky-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">{result.plan.deficit.label}</p>
                  <p className="text-xl font-bold text-sky-600">{result.plan.deficit.value}</p>
                </div>
              )}
            </div>

            {plan ? (
              <DeterministicPlanView plan={plan} heading="Correction plan" />
            ) : (
              <p className="text-sm text-gray-700">Potassium is within 3.5–5.0 mmol/L — no intervention required.</p>
            )}
          </div>

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
