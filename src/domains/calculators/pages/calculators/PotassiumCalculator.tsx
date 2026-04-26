// Potassium Disorder Calculator
// WHO-Adapted Hypokalemia/Hyperkalemia Management

import { useState } from 'react';
import { Calculator, AlertCircle, FileText, Activity, Download, Heart } from 'lucide-react';
import { PatientCalculatorInfo, PotassiumResult } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function PotassiumCalculator({ patientInfo }: Props) {
  const [currentK, setCurrentK] = useState('');
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [hasRenalImpairment, setHasRenalImpairment] = useState(
    patientInfo.comorbidities.includes('Chronic Kidney Disease')
  );
  const [onDigoxin, setOnDigoxin] = useState(false);
  const [hasEcgChanges, setHasEcgChanges] = useState(false);
  const [hasMuscleWeakness, setHasMuscleWeakness] = useState(false);
  const [oralIntakeOk, setOralIntakeOk] = useState(true);
  const [result, setResult] = useState<PotassiumResult | null>(null);

  const calculatePotassium = () => {
    const current = parseFloat(currentK);
    const wt = parseFloat(weight);

    if (isNaN(current) || isNaN(wt)) {
      alert('Please enter valid numbers for all required fields');
      return;
    }

    // Determine severity
    let severity = 'Normal';
    let severityClass = 'text-green-600';
    let deficit = '0';
    let replacementPlan: string[] = [];
    let infusionRate = '';
    let ecgFindings: string[] = [];
    let monitoring: string[] = [];
    let contraindications: string[] = [];
    let warnings: string[] = [];

    if (current < 3.5) {
      // Hypokalemia
      if (current >= 3.0) {
        severity = 'Mild Hypokalemia';
        severityClass = 'text-yellow-600';
        deficit = '100-200';
        
        if (oralIntakeOk) {
          replacementPlan = [
            'Oral potassium supplementation preferred',
            'KCl 20-40 mmol (1.5-3 g) PO 2-4 times daily with food',
            'Potassium-rich foods: bananas, oranges, plantain, spinach, beans',
            'Re-check K+ in 24-48 hours',
          ];
        } else {
          replacementPlan = [
            'IV KCl 10 mmol/h via peripheral line (max conc 40 mmol/L — phlebitis above this)',
            'Total daily dose: 40-80 mmol IV over 4-8 hours',
            'Continuous cardiac monitoring not mandatory at ≤10 mmol/h',
          ];
          infusionRate = '10 mmol/h peripheral (max conc 40 mmol/L)';
        }
      } else if (current >= 2.5) {
        severity = 'Moderate Hypokalemia';
        severityClass = 'text-orange-600';
        deficit = '200-400';
        
        replacementPlan = [
          'IV potassium replacement required',
          'KCl 20 mmol/h via central line in monitored area. Up to 40 mmol/h ONLY in HDU/ICU with continuous ECG',
          'OR KCl 10 mmol/h via peripheral line (max conc 40 mmol/L)',
          'Total replacement: 100-200 mmol over 24 h',
          'Continuous cardiac monitoring at any rate ≥20 mmol/h',
          'ALWAYS check & replace magnesium (MgSO4 2 g IV over 20 min) — hypoMg causes refractory hypoK',
          'Re-check K+ every 2-4 h during replacement',
        ];
        infusionRate = '20 mmol/h central line (40 mmol/h ICU only)';
        
        ecgFindings = [
          'Flattened T waves',
          'ST segment depression',
          'Prominent U waves',
          'Prolonged QT interval',
        ];
      } else {
        severity = 'Severe Hypokalemia';
        severityClass = 'text-red-600';
        deficit = '400-800';
        
        replacementPlan = [
          '⚠️ EMERGENCY: ICU/HDU admission with continuous ECG',
          'IV KCl 20-40 mmol/h via central line — NEVER exceed 40 mmol/h except in cardiac arrest',
          'ALWAYS replace magnesium concurrently: MgSO4 2 g IV over 20 min (4 g if K+ <2.0)',
          'AVOID dextrose-containing diluents (↑ endogenous insulin worsens hypoK)',
          'Treat arrhythmias as per ALS algorithm; calcium gluconate is NOT cardioprotective in hypoK',
          'Hourly K+ until >3.0 mmol/L, then 2-4 hourly',
          'In Torsades: MgSO4 2 g IV bolus, defibrillate if pulseless',
        ];
        infusionRate = '20-40 mmol/h central line (ICU only)';
        
        ecgFindings = [
          'Severe T wave flattening/inversion',
          'Prominent U waves (may exceed T wave height)',
          'Marked QT prolongation',
          'ST depression',
          'Risk of Torsades de Pointes',
          'Ventricular arrhythmias',
        ];
        
        warnings = [
          'HIGH ARRHYTHMIA RISK - Continuous telemetry required',
          'May precipitate digoxin toxicity if on digoxin',
          'Paralytic ileus and respiratory muscle weakness possible',
        ];
      }
      
      monitoring = [
        'Continuous cardiac monitoring during IV replacement',
        'Serial K+ levels every 2-4 hours',
        'Assess magnesium levels (replace if low)',
        'Monitor urine output',
        'Watch for signs of respiratory muscle weakness',
      ];
      
      contraindications = [
        'NEVER give IV K+ as bolus or push — risk of fatal cardiac arrest',
        'Max peripheral concentration: 40 mmol/L (higher → phlebitis & pain)',
        'Max peripheral rate: 10 mmol/h; max central rate: 40 mmol/h (ICU only)',
        'Do NOT give IV K+ if anuric without dialysis back-up',
        'Avoid dextrose-containing diluents (worsens hypokalaemia)',
      ];
      
    } else if (current > 5.0) {
      // Hyperkalemia
      if (current <= 5.5) {
        severity = 'Mild Hyperkalemia';
        severityClass = 'text-yellow-600';
        
        replacementPlan = [
          'Stop all potassium supplements and K+-sparing medications',
          'Review medications (ACE-I, ARBs, spironolactone, NSAIDs)',
          'Low potassium diet',
          'Ensure adequate hydration',
          'Re-check K+ in 24 hours',
        ];
      } else if (current <= 6.5) {
        severity = 'Moderate Hyperkalemia';
        severityClass = 'text-orange-600';
        
        replacementPlan = [
          'Stop K+ supplements & offending drugs (ACE-I/ARB, spironolactone, K-sparing diuretics, NSAIDs, trimethoprim)',
          'Cardioprotection (only if ECG changes): Calcium gluconate 10% 10 mL (1 g) IV over 2-5 min; REPEAT q5min until ECG normalises (max 30 mL). On digoxin: dilute in 100 mL D5W over 20-30 min',
          'Shift K+ intracellularly: Soluble (regular) insulin 10 units IV + 50 mL of 50% dextrose IV over 5-15 min. If glucose >13.9 mmol/L (>250 mg/dL) give insulin alone',
          'Salbutamol 10-20 mg nebulised over 15 min (synergistic with insulin; avoid as monotherapy in IHD)',
          'Sodium bicarbonate 50-100 mmol IV ONLY if pH <7.2 or HCO3 <15 — not routine',
          'Sub-acute excretion: Patiromer 8.4 g PO daily OR sodium zirconium cyclosilicate 10 g PO TDS × 48 h (preferred). If unavailable, SPS/Kayexalate 15 g PO with caution — risk of bowel necrosis especially with sorbitol',
          'Furosemide 40-80 mg IV if euvolaemic with adequate renal function',
          'Recheck K+ at 1 h and 4 h; redose calcium if ECG changes recur',
        ];
        
        ecgFindings = [
          'Peaked T waves (earliest sign)',
          'Prolonged PR interval',
          'Flattened P waves',
          'Widened QRS complex',
        ];
        
        monitoring = [
          'Continuous cardiac monitoring',
          'Repeat K+ in 1-2 hours after treatment',
          'Monitor glucose (insulin-dextrose therapy)',
          'Watch for clinical deterioration',
        ];
      } else {
        severity = 'Severe Hyperkalemia';
        severityClass = 'text-red-600';
        
        replacementPlan = [
          '⚠️ EMERGENCY — treat NOW; do not wait for repeat lab',
          '1. Calcium gluconate 10% 10 mL (1 g) IV over 2-5 min via large vein — REPEAT q5min until ECG normalises (typical total 20-30 mL). On digoxin: 1 g in 100 mL D5W over 20-30 min',
          '2. Soluble insulin 10 units IV + 50 mL of 50% dextrose IV over 5-15 min (omit dextrose if glucose >13.9 mmol/L). FOLLOW with 10% dextrose infusion 50-75 mL/h × 5-6 h to prevent rebound hypoglycaemia',
          '3. Salbutamol 10-20 mg nebulised over 15 min',
          '4. Sodium bicarbonate 50-100 mmol IV ONLY if pH <7.2 or HCO3 <15 — not first-line',
          '5. Activate emergency haemodialysis (definitive therapy) — nephrology NOW',
          '6. Continuous ECG monitoring; sine-wave/wide-QRS arrest: high-quality CPR + repeated calcium IV',
          'SPS/Kayexalate, Patiromer, SZC are too slow for emergency — reserve for sub-acute control',
          'AVOID lactated Ringer’s solution (contains K+ 4 mmol/L)',
        ];
        
        ecgFindings = [
          'Tall, peaked T waves',
          'Loss of P waves',
          'Widened QRS (>0.12 sec)',
          'Sine wave pattern (pre-arrest)',
          'Ventricular fibrillation risk',
          'Asystole risk',
        ];
        
        monitoring = [
          'CONTINUOUS cardiac monitoring - ICU level care',
          'Repeat K+ every 30-60 minutes until <6.0',
          'Monitor glucose hourly during insulin therapy',
          'Immediate nephrology/dialysis consult',
          'Prepare for emergency dialysis',
        ];
        
        warnings = [
          '⚠️ CARDIAC ARREST IMMINENT at K+ >7.0 with ECG changes',
          'Do NOT delay treatment for confirmatory labs if ECG changes present',
          'Calcium provides cardioprotection within 1-3 minutes',
          'Effect of insulin-glucose takes 15-30 minutes, lasts 4-6 hours',
        ];
      }
    } else {
      severity = 'Normal Potassium';
      severityClass = 'text-green-600';
      replacementPlan = ['Potassium is within normal range (3.5-5.0 mEq/L)', 'No intervention required'];
    }

    // Digoxin special consideration
    if (onDigoxin && current < 3.5) {
      warnings.push('⚠️ DIGOXIN TOXICITY RISK: Hypokalemia potentiates digoxin. Maintain K+ >4.0 mEq/L');
    }

    const calculationResult: PotassiumResult = {
      current,
      severity,
      severityClass,
      deficit,
      replacementPlan,
      infusionRate,
      ecgFindings,
      monitoring,
      contraindications,
      warnings,
    };

    setResult(calculationResult);
  };

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
            Body Weight (kg)
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
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${result.severityClass} ${
                result.severityClass.includes('green') ? 'bg-green-100' :
                result.severityClass.includes('yellow') ? 'bg-yellow-100' :
                result.severityClass.includes('orange') ? 'bg-orange-100' :
                'bg-red-100'
              }`}>
                <Activity className="w-5 h-5" />
                {result.severity}
              </span>
            </div>

            {/* Key Values */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Current K+</p>
                <p className="text-2xl font-bold text-gray-800">{result.current} mEq/L</p>
              </div>

              {result.deficit !== '0' && (
                <div className="bg-sky-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Estimated Deficit</p>
                  <p className="text-2xl font-bold text-sky-600">{result.deficit} mEq</p>
                </div>
              )}

              {result.infusionRate && (
                <div className="bg-purple-50 rounded-lg p-4 md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Recommended Infusion Rate</p>
                  <p className="text-xl font-bold text-purple-600">{result.infusionRate}</p>
                </div>
              )}
            </div>

            {/* ECG Findings */}
            {result.ecgFindings.length > 0 && (
              <div className="bg-pink-50 border-l-4 border-pink-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  Expected ECG Findings:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.ecgFindings.map((finding, index) => (
                    <li key={index}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Replacement Plan */}
            <div className="bg-blue-50 border-l-4 border-sky-600 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2">Treatment Protocol:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                {result.replacementPlan.map((step, index) => (
                  <li key={index} className={step.includes('⚠️') ? 'font-semibold text-red-600' : ''}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-red-800 mb-2">⚠️ Critical Warnings:</p>
                <ul className="space-y-1 text-sm text-red-700">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Monitoring */}
            {result.monitoring.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Monitoring Required:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.monitoring.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contraindications */}
            {result.contraindications.length > 0 && (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-2">⛔ Contraindications/Cautions:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.contraindications.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
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
