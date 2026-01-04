// Sodium Disorder Calculator
// WHO-Adapted Hyponatremia/Hypernatremia Management

import { useState } from 'react';
import { Calculator, AlertCircle, FileText, CheckCircle, Download } from 'lucide-react';
import { PatientCalculatorInfo, SodiumResult, VolumeStatus, Gender } from '../../types';
import { generateSodiumPDF } from '../../utils/pdfGenerator';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function SodiumCalculator({ patientInfo }: Props) {
  const [currentNa, setCurrentNa] = useState('');
  const [targetNa, setTargetNa] = useState('140');
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [gender, setGender] = useState<Gender>(patientInfo.gender || 'male');
  const [volumeStatus, setVolumeStatus] = useState<VolumeStatus>('euvolemic');
  const [isAcute, setIsAcute] = useState(false);
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [result, setResult] = useState<SodiumResult | null>(null);

  const calculateSodium = () => {
    const current = parseFloat(currentNa);
    const target = parseFloat(targetNa);
    const wt = parseFloat(weight);

    if (isNaN(current) || isNaN(target) || isNaN(wt)) {
      alert('Please enter valid numbers for all required fields');
      return;
    }

    // Calculate TBW based on gender/age
    let tbwFactor = 0.6;
    if (gender === 'female') tbwFactor = 0.5;
    if (gender === 'elderly-male') tbwFactor = 0.5;
    if (gender === 'elderly-female') tbwFactor = 0.45;
    
    const tbw = tbwFactor * wt;
    const sodiumDeficit = (target - current) * tbw;

    // Determine severity
    let severity = 'Normal';
    let severityClass = 'text-green-600';
    
    if (current < 135) {
      if (current >= 130) {
        severity = 'Mild Hyponatremia';
        severityClass = 'text-yellow-600';
      } else if (current >= 125) {
        severity = 'Moderate Hyponatremia';
        severityClass = 'text-orange-600';
      } else {
        severity = 'Severe Hyponatremia';
        severityClass = 'text-red-600';
      }
    } else if (current > 145) {
      if (current <= 150) {
        severity = 'Mild Hypernatremia';
        severityClass = 'text-yellow-600';
      } else if (current <= 160) {
        severity = 'Moderate Hypernatremia';
        severityClass = 'text-orange-600';
      } else {
        severity = 'Severe Hypernatremia';
        severityClass = 'text-red-600';
      }
    }

    // Determine correction rate
    let maxCorrection = 8;
    let correctionTime = 24;
    if (!isAcute || volumeStatus === 'hypervolemic') {
      maxCorrection = 6;
    }
    if (hasSymptoms && isAcute && current < 125) {
      maxCorrection = 6;
      correctionTime = 6;
    }

    // Recommend fluid based on WHO best practices
    let fluidType = '0.9% Normal Saline (154 mEq/L Na+)';
    let fluidStrategy = '';

    if (current < 135) {
      // Hyponatremia
      if (volumeStatus === 'hypovolemic') {
        fluidType = '0.9% Normal Saline IV';
        fluidStrategy = 'Volume resuscitation with isotonic saline. Monitor Na+ every 2-4 hours.';
      } else if (volumeStatus === 'euvolemic' || volumeStatus === 'hypervolemic') {
        fluidType = 'Fluid Restriction (800-1000 mL/day)';
        fluidStrategy = 'SIADH/volume overload protocol. Treat underlying cause. Consider loop diuretic if hypervolemic.';
      }

      if (current < 120 && hasSymptoms) {
        fluidType = '3% Hypertonic Saline (or 0.9% NS if unavailable) + Urgent specialist review';
        fluidStrategy = 'EMERGENCY: Severe symptomatic hyponatremia. Target 1-2 mEq/L increase in first hour, then slow correction. ICU admission required.';
      }
    } else if (current > 145) {
      // Hypernatremia
      if (current > 154 && volumeStatus === 'hypovolemic') {
        fluidType = '0.9% Normal Saline initially (hypotonic relative to serum)';
        fluidStrategy = 'Initial resuscitation, then switch to 0.45% NS or D5W. Can make 0.45% NS by mixing 500mL of 0.9% NS + 500mL D5W.';
      } else {
        fluidType = '0.45% NS or 5% Dextrose (preferred)';
        fluidStrategy = 'Mix 0.9% NS with D5W (1:1) if 0.45% NS unavailable. Correct slowly to prevent cerebral edema.';
      }
    }

    // Calculate water deficit for hypernatremia
    let waterDeficit = 0;
    if (current > 145) {
      waterDeficit = tbw * ((current / 140) - 1);
    }

    // Calculate predicted Na+ change per liter of 0.9% NS (Adie-Conan Formula)
    const infusateNa = 154; // 0.9% Normal Saline
    const changePerLiterNS = (infusateNa - current) / (tbw + 1);

    // Calculate volume of 0.9% NS needed
    const volumeNSNeeded = Math.abs(sodiumDeficit) / infusateNa;

    // Calculate infusion rate for safe correction (0.5 mEq/L/hr initial)
    const safeHourlyRate = 0.5;
    const infusionRateMlPerHr = Math.abs(changePerLiterNS) > 0
      ? (safeHourlyRate / Math.abs(changePerLiterNS)) * 1000
      : 0;

    const calculationResult: SodiumResult = {
      current,
      target,
      weight: wt,
      tbw: tbw.toFixed(1),
      sodiumDeficit: Math.abs(sodiumDeficit).toFixed(0),
      severity,
      severityClass,
      maxCorrection,
      correctionTime,
      fluidType,
      fluidStrategy,
      waterDeficit: waterDeficit > 0 ? waterDeficit.toFixed(1) : null,
      changePerLiterNS: changePerLiterNS.toFixed(2),
      volumeNSNeeded: volumeNSNeeded.toFixed(2),
      infusionRateMlPerHr: infusionRateMlPerHr.toFixed(0),
      isHypo: current < 135,
      isHyper: current > 145,
      volumeStatus,
      isAcute,
      hasSymptoms,
      gender,
    };

    setResult(calculationResult);
  };

  const handleExportPDF = () => {
    if (result) {
      generateSodiumPDF(result, patientInfo);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Calculator className="w-5 h-5 sm:w-7 sm:h-7 text-sky-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Sodium Disorder Calculator</h2>
      </div>

      {/* Alert Box */}
      <div className="bg-blue-50 border-l-4 border-sky-600 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">WHO Safety Guidelines for Sodium Correction</p>
            <ul className="list-disc ml-4 space-y-0.5 sm:space-y-1">
              <li>Max correction: 6-8 mEq/L per 24 hours (NEVER exceed 10-12 mEq/L)</li>
              <li>High-risk patients (chronic, alcoholism, malnourished): ≤6 mEq/L per 24h</li>
              <li>Monitor serum sodium every 2-4 hours during active correction</li>
              <li>Hypernatremia: Correct at ≤0.5 mEq/L/hr to prevent cerebral edema</li>
              <li>Use 0.9% NS when hypertonic saline unavailable (WHO resource-adapted protocol)</li>
            </ul>
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

            {/* Severity Badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${result.severityClass} ${
                result.severityClass.includes('green') ? 'bg-green-100' :
                result.severityClass.includes('yellow') ? 'bg-yellow-100' :
                result.severityClass.includes('orange') ? 'bg-orange-100' :
                'bg-red-100'
              }`}>
                <AlertCircle className="w-5 h-5" />
                {result.severity}
              </span>
            </div>

            {/* Calculations */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Body Water</p>
                <p className="text-2xl font-bold text-gray-800">{result.tbw} L</p>
              </div>

              {result.isHypo && (
                <div className="bg-sky-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Sodium Deficit</p>
                  <p className="text-2xl font-bold text-sky-600">{result.sodiumDeficit} mmol</p>
                </div>
              )}

              {result.waterDeficit && (
                <div className="bg-sky-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Free Water Deficit</p>
                  <p className="text-2xl font-bold text-sky-600">{result.waterDeficit} L</p>
                </div>
              )}

              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Max Correction Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.maxCorrection} mmol/L per {result.correctionTime}h
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Na+ Change per L (0.9% NS)</p>
                <p className="text-xl font-bold text-purple-600">{result.changePerLiterNS} mEq/L</p>
                <p className="text-xs text-gray-500 mt-1">Adie-Conan Formula</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Initial Infusion Rate</p>
                <p className="text-xl font-bold text-blue-600">{result.infusionRateMlPerHr} mL/hr</p>
                <p className="text-xs text-gray-500 mt-1">Target: 0.5 mEq/L/hr</p>
              </div>
            </div>

            {/* Fluid Recommendation */}
            <div className="bg-blue-50 border-l-4 border-sky-600 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2">Recommended Fluid:</p>
              <p className="text-gray-700 font-medium">{result.fluidType}</p>
              {result.fluidStrategy && (
                <p className="text-sm text-gray-600 mt-2">{result.fluidStrategy}</p>
              )}
            </div>

            {/* Clinical Recommendations */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-yellow-600" />
                Clinical Actions (WHO Protocol):
              </p>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                <li>Monitor serum sodium every 2-4 hours during active correction</li>
                <li>Continuous vital signs monitoring (BP, HR, neurological status)</li>
                <li>Strict fluid balance charting (input/output)</li>
                <li>Assess and treat underlying cause (dehydration, SIADH, diuretics, etc.)</li>
                {result.isHypo && <li>Monitor urine osmolality and electrolytes if SIADH suspected</li>}
                {result.hasSymptoms && (
                  <li className="font-semibold text-red-600">
                    ⚠️ EMERGENCY: ICU admission for severe symptoms (seizures/altered consciousness)
                  </li>
                )}
                {result.current < 120 && (
                  <li className="font-semibold text-red-600">
                    ⚠️ OSMOTIC DEMYELINATION RISK: Limit correction to 4-6 mEq/L in chronic cases
                  </li>
                )}
                {result.current > 155 && (
                  <li className="font-semibold text-red-600">
                    ⚠️ CEREBRAL EDEMA RISK: Slow correction essential (max 0.5 mEq/L/hr)
                  </li>
                )}
              </ul>
            </div>

            {/* Resource-Limited Settings */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mt-4">
              <p className="font-semibold text-gray-800 mb-2">💡 Resource-Limited Settings (WHO Adapted):</p>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                <li><strong>Making 0.45% NS:</strong> Mix 500mL of 0.9% NS + 500mL of D5W = 1L of 0.45% NS (77 mEq/L Na+)</li>
                <li><strong>Making 0.225% NS:</strong> Mix 250mL of 0.9% NS + 750mL of D5W = 1L of 0.225% NS (38 mEq/L Na+)</li>
                <li><strong>Minimum monitoring:</strong> Serum Na+ at 6h, 12h, and 24h if frequent testing unavailable</li>
                <li><strong>Conservative approach:</strong> Target 0.25 mEq/L/hr if limited monitoring capabilities</li>
              </ul>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export Treatment Plan (PDF)
          </button>
        </div>
      )}
    </div>
  );
}
