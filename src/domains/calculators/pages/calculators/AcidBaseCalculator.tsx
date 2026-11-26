// Acid-Base Calculator
// ABG Interpretation with Compensation Analysis

import { useMemo, useState } from 'react';
import { Calculator, FileText, Activity } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { acidBasePlan, acidBaseReport, computeAcidBase, type AcidBaseHubResult } from '../../engine/hub/acidBase';
import DeterministicPlanView from '../../report/components/DeterministicPlanView';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function AcidBaseCalculator({ patientInfo }: Props) {
  const [ph, setPh] = useState('');
  const [pco2, setPco2] = useState('');
  const [pco2Unit, setPco2Unit] = useState<'mmHg' | 'kPa'>('mmHg');
  const [hco3, setHco3] = useState('');
  // Blank, not pre-filled: a default of 140/100 computed an anion gap from
  // values nobody measured.
  const [sodium, setSodium] = useState('');
  const [chloride, setChloride] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [result, setResult] = useState<AcidBaseHubResult | null>(null);

  const [errors, setErrors] = useState<string[]>([]);

  const calculateAcidBase = () => {
    const r = computeAcidBase({ ph, pco2, pco2Unit, hco3, sodium, chloride, albumin });
    if (r.errors) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
  };

  const plan = useMemo(() => (result ? acidBasePlan(result) : undefined), [result]);
  const report = useMemo(() => (result ? acidBaseReport(result, patientInfo) : null), [result, patientInfo]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-7 h-7 text-sky-600" />
        <h2 className="text-2xl font-bold text-gray-800">Acid-Base Calculator</h2>
      </div>

      {/* Normal Values Reference */}
      <div className="bg-gray-50 border border-gray-200 p-4 mb-6 rounded-lg">
        <p className="font-semibold text-gray-800 mb-2">Normal ABG Values:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="font-medium">pH:</span> 7.35-7.45</div>
          <div><span className="font-medium">PCO2:</span> 35-45 mmHg (4.7-6.0 kPa)</div>
          <div><span className="font-medium">HCO3:</span> 22-26 mEq/L</div>
          <div><span className="font-medium">Anion Gap:</span> 8-12 mEq/L</div>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            pH *
          </label>
          <input
            type="number"
            value={ph}
            onChange={(e) => setPh(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 7.32"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            PCO<sub>2</sub> *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={pco2}
              onChange={(e) => setPco2(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
              placeholder={pco2Unit === 'mmHg' ? 'e.g., 55' : 'e.g., 7.3'}
              step={pco2Unit === 'mmHg' ? '1' : '0.1'}
            />
            <select
              title="PCO2 unit"
              aria-label="PCO2 unit"
              value={pco2Unit}
              onChange={(e) => setPco2Unit(e.target.value as 'mmHg' | 'kPa')}
              className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
            >
              <option value="mmHg">mmHg</option>
              <option value="kPa">kPa</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">1 kPa = 7.50 mmHg (SI)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            HCO<sub>3</sub><sup>−</sup> (mmol/L) *
          </label>
          <input
            type="number"
            value={hco3}
            onChange={(e) => setHco3(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 18"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sodium (mEq/L)
          </label>
          <input
            type="number"
            value={sodium}
            onChange={(e) => setSodium(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 140"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Chloride (mEq/L)
          </label>
          <input
            type="number"
            value={chloride}
            onChange={(e) => setChloride(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Albumin (g/dL or g/L)
          </label>
          <input
            type="number"
            value={albumin}
            onChange={(e) => setAlbumin(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 3.5 or 35"
            step="0.1"
          />
          <p className="text-xs text-gray-500 mt-1">Optional — corrects the anion gap. Values above 10 are read as g/L.</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <ul className="list-disc pl-5 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <button
        onClick={calculateAcidBase}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" />
        Interpret ABG
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-600" />
              ABG Interpretation
            </h3>

            {/* Primary Disorder Badge */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                result.primary === 'normal' ? 'text-green-600 bg-green-100' :
                result.primary.endsWith('acidosis') ? 'text-red-600 bg-red-100' :
                result.primary.endsWith('alkalosis') ? 'text-purple-600 bg-purple-100' :
                'text-orange-600 bg-orange-100'
              }`}>
                <Activity className="w-5 h-5" />
                {result.primaryLabel}
              </span>
              <span className="text-sm text-gray-600">{result.compensation}</span>
            </div>

            {/* Values Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className={`rounded-lg p-3 sm:p-4 ${result.ph < 7.35 ? 'bg-red-50' : result.ph > 7.45 ? 'bg-purple-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">pH</p>
                <p className={`text-2xl font-bold ${result.ph < 7.35 ? 'text-red-600' : result.ph > 7.45 ? 'text-purple-600' : 'text-green-600'}`}>
                  {result.ph.toFixed(2)}
                </p>
              </div>

              <div className={`rounded-lg p-3 sm:p-4 ${result.pco2MmHg > 45 ? 'bg-orange-50' : result.pco2MmHg < 35 ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">PCO2</p>
                <p className={`text-xl sm:text-2xl font-bold ${result.pco2MmHg > 45 ? 'text-orange-600' : result.pco2MmHg < 35 ? 'text-blue-600' : 'text-green-600'}`}>
                  {result.pco2MmHg.toFixed(0)} mmHg
                </p>
                <p className="text-xs text-gray-500">{result.pco2Kpa.toFixed(1)} kPa</p>
              </div>

              <div className={`rounded-lg p-3 sm:p-4 ${result.hco3 < 22 ? 'bg-red-50' : result.hco3 > 26 ? 'bg-purple-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">HCO3</p>
                <p className={`text-xl sm:text-2xl font-bold ${result.hco3 < 22 ? 'text-red-600' : result.hco3 > 26 ? 'text-purple-600' : 'text-green-600'}`}>
                  {result.hco3} mmol/L
                </p>
              </div>

              <div className={`rounded-lg p-3 sm:p-4 ${(result.correctedAnionGap ?? result.anionGap ?? 0) > 12 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className="text-sm text-gray-600 mb-1">Anion Gap</p>
                {result.anionGap !== null ? (
                  <>
                    <p className={`text-xl sm:text-2xl font-bold ${(result.correctedAnionGap ?? result.anionGap) > 12 ? 'text-red-600' : 'text-green-600'}`}>
                      {result.anionGap.toFixed(1)} mmol/L
                    </p>
                    {result.correctedAnionGap !== null && (
                      <p className="text-xs text-gray-500">Albumin-corrected: {result.correctedAnionGap.toFixed(1)}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Enter sodium and chloride</p>
                )}
              </div>
            </div>

            {/* Interpretation */}
            <div className="bg-blue-50 border-l-4 border-sky-600 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2">Interpretation:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {result.interpretation.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {plan && <DeterministicPlanView plan={plan} />}
          </div>

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
