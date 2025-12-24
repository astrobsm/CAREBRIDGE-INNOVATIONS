// Acid-Base Calculator
// ABG Interpretation with Compensation Analysis

import { useState } from 'react';
import { Calculator, FileText, Activity, Download } from 'lucide-react';
import { PatientCalculatorInfo, AcidBaseResult, AcidBaseDisorder } from '../../types';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function AcidBaseCalculator({ patientInfo: _patientInfo }: Props) {
  const [ph, setPh] = useState('');
  const [pco2, setPco2] = useState('');
  const [hco3, setHco3] = useState('');
  const [sodium, setSodium] = useState('140');
  const [chloride, setChloride] = useState('100');
  const [albumin, setAlbumin] = useState('4.0');
  const [result, setResult] = useState<AcidBaseResult | null>(null);

  const calculateAcidBase = () => {
    const phValue = parseFloat(ph);
    const pco2Value = parseFloat(pco2);
    const hco3Value = parseFloat(hco3);
    const naValue = parseFloat(sodium);
    const clValue = parseFloat(chloride);
    const albValue = parseFloat(albumin);

    if (isNaN(phValue) || isNaN(pco2Value) || isNaN(hco3Value)) {
      alert('Please enter valid numbers for pH, PCO2, and HCO3');
      return;
    }

    // Calculate anion gap
    const anionGap = naValue - clValue - hco3Value;
    // Corrected anion gap for albumin (each 1 g/dL decrease from 4 adds ~2.5 to AG)
    const correctedAnionGap = anionGap + (2.5 * (4 - albValue));

    // Determine primary disorder
    let primaryDisorder: AcidBaseDisorder = 'Normal';
    let compensation = 'None';
    let isCompensated = false;
    let interpretation: string[] = [];
    let differentialDiagnosis: string[] = [];
    let treatment: string[] = [];
    let monitoring: string[] = [];

    // Step 1: Assess pH
    const isAcidemic = phValue < 7.35;
    const isAlkalemic = phValue > 7.45;

    // Step 2: Determine primary disorder
    if (isAcidemic) {
      if (pco2Value > 45) {
        // Respiratory Acidosis
        primaryDisorder = 'Respiratory Acidosis';
        const expectedHCO3 = 24 + 0.1 * (pco2Value - 40); // Acute compensation
        const expectedHCO3Chronic = 24 + 0.35 * (pco2Value - 40); // Chronic compensation
        
        if (hco3Value > expectedHCO3Chronic + 2) {
          compensation = 'Metabolic compensation (chronic, >3-5 days)';
          isCompensated = true;
        } else if (hco3Value > expectedHCO3 + 2) {
          compensation = 'Partial metabolic compensation';
        } else {
          compensation = 'Acute (uncompensated)';
        }
        
        interpretation = [
          `pH ${phValue} indicates acidemia`,
          `Elevated PCO2 (${pco2Value} mmHg) suggests respiratory origin`,
          `HCO3 is ${hco3Value > 26 ? 'elevated (compensation)' : 'normal/low'}`,
        ];
        
        differentialDiagnosis = [
          'COPD exacerbation',
          'Severe asthma',
          'Pneumonia / ARDS',
          'Drug overdose (opioids, sedatives)',
          'Neuromuscular disease (Guillain-Barré, myasthenia)',
          'Obesity hypoventilation syndrome',
          'Airway obstruction',
        ];
        
        treatment = [
          'Treat underlying cause',
          'Ensure adequate ventilation',
          'Consider non-invasive ventilation (NIV/BiPAP)',
          'Bronchodilators if obstructive disease',
          'Naloxone if opioid overdose suspected',
          'Avoid rapid correction of chronic hypercapnia (risk of post-hypercapnic alkalosis)',
        ];
      } else if (hco3Value < 22) {
        // Metabolic Acidosis
        primaryDisorder = 'Metabolic Acidosis';
        const expectedPCO2 = 1.5 * hco3Value + 8; // Winter's formula
        
        if (Math.abs(pco2Value - expectedPCO2) <= 2) {
          compensation = 'Appropriate respiratory compensation';
          isCompensated = true;
        } else if (pco2Value < expectedPCO2 - 2) {
          compensation = 'Additional respiratory alkalosis (mixed disorder)';
        } else {
          compensation = 'Inadequate compensation or additional respiratory acidosis';
        }
        
        interpretation = [
          `pH ${phValue} indicates acidemia`,
          `Low HCO3 (${hco3Value} mEq/L) indicates metabolic origin`,
          `Expected PCO2 by Winter's formula: ${expectedPCO2.toFixed(1)} mmHg`,
          `Actual PCO2: ${pco2Value} mmHg`,
          `Anion Gap: ${anionGap.toFixed(1)} mEq/L ${anionGap > 12 ? '(ELEVATED)' : '(normal)'}`,
        ];
        
        if (anionGap > 12 || correctedAnionGap > 12) {
          differentialDiagnosis = [
            '🔴 MUDPILES mnemonic for elevated AG:',
            '• Methanol poisoning',
            '• Uremia (renal failure)',
            '• Diabetic ketoacidosis (DKA)',
            '• Propylene glycol / Paraldehyde',
            '• Isoniazid / Iron toxicity',
            '• Lactic acidosis (sepsis, shock, metformin)',
            '• Ethylene glycol poisoning',
            '• Salicylate toxicity',
          ];
        } else {
          differentialDiagnosis = [
            '🔵 Normal AG (Hyperchloremic) causes:',
            '• Diarrhea (GI bicarbonate loss)',
            '• Renal tubular acidosis (Types 1, 2, 4)',
            '• Early renal failure',
            '• Carbonic anhydrase inhibitors (acetazolamide)',
            '• Ureteral diversions',
            '• Saline infusion (dilutional)',
            '• Addison\'s disease',
          ];
        }
        
        treatment = [
          'Treat underlying cause (most important)',
          'Volume resuscitation if dehydrated',
          'Consider sodium bicarbonate if pH < 7.1 and hemodynamically unstable',
          'Dialysis for toxic ingestions or severe uremia',
          'Insulin + fluids for DKA',
          'Antibiotics + source control for sepsis-related lactic acidosis',
        ];
      }
    } else if (isAlkalemic) {
      if (pco2Value < 35) {
        // Respiratory Alkalosis
        primaryDisorder = 'Respiratory Alkalosis';
        const expectedHCO3 = 24 - 0.2 * (40 - pco2Value); // Acute
        const expectedHCO3Chronic = 24 - 0.5 * (40 - pco2Value); // Chronic
        
        if (hco3Value < expectedHCO3Chronic - 2) {
          compensation = 'Metabolic compensation (chronic)';
          isCompensated = true;
        } else if (hco3Value < expectedHCO3 - 2) {
          compensation = 'Partial compensation';
        } else {
          compensation = 'Acute (uncompensated)';
        }
        
        interpretation = [
          `pH ${phValue} indicates alkalemia`,
          `Low PCO2 (${pco2Value} mmHg) indicates respiratory origin`,
          `HCO3 is ${hco3Value < 22 ? 'low (compensation)' : 'normal/high'}`,
        ];
        
        differentialDiagnosis = [
          'Anxiety / panic attack (most common)',
          'Pain',
          'Fever / sepsis',
          'Hypoxemia (any cause)',
          'CNS disease (stroke, tumor, meningitis)',
          'Pulmonary embolism',
          'Pregnancy',
          'Salicylate toxicity (early)',
          'Hepatic encephalopathy',
          'High altitude',
        ];
        
        treatment = [
          'Treat underlying cause',
          'Reassurance for anxiety-related hyperventilation',
          'Analgesia for pain',
          'Supplemental O2 if hypoxemic',
          'Do NOT use paper bag rebreathing (hypoxia risk)',
        ];
      } else if (hco3Value > 26) {
        // Metabolic Alkalosis
        primaryDisorder = 'Metabolic Alkalosis';
        const expectedPCO2 = 0.7 * hco3Value + 21;
        
        if (Math.abs(pco2Value - expectedPCO2) <= 2) {
          compensation = 'Appropriate respiratory compensation';
          isCompensated = true;
        } else {
          compensation = 'Mixed disorder likely';
        }
        
        interpretation = [
          `pH ${phValue} indicates alkalemia`,
          `Elevated HCO3 (${hco3Value} mEq/L) indicates metabolic origin`,
          `Expected PCO2: ${expectedPCO2.toFixed(1)} mmHg`,
          `Actual PCO2: ${pco2Value} mmHg`,
        ];
        
        differentialDiagnosis = [
          '🔵 Chloride-responsive (urine Cl < 20):',
          '• Vomiting / NG suction',
          '• Diuretic use (after discontinuation)',
          '• Post-hypercapnic alkalosis',
          '',
          '🔴 Chloride-resistant (urine Cl > 20):',
          '• Hyperaldosteronism',
          '• Cushing syndrome',
          '• Severe hypokalemia',
          '• Current diuretic use',
          '• Licorice ingestion',
          '• Bartter / Gitelman syndrome',
        ];
        
        treatment = [
          'Treat underlying cause',
          'Replace chloride and potassium deficits',
          'Normal saline for chloride-responsive alkalosis',
          'Potassium chloride (KCl) supplementation',
          'Discontinue diuretics if possible',
          'Spironolactone or amiloride for hyperaldosteronism',
          'Acetazolamide may help if unresponsive',
        ];
      }
    } else {
      // Normal pH but may still have mixed disorder
      primaryDisorder = 'Normal';
      interpretation = [
        'pH is within normal range (7.35-7.45)',
        'Consider mixed acid-base disorder if PCO2 and HCO3 both abnormal',
      ];
      
      if ((pco2Value > 45 && hco3Value > 26) || (pco2Value < 35 && hco3Value < 22)) {
        primaryDisorder = 'Mixed Disorder';
        interpretation.push('Both PCO2 and HCO3 are abnormal in compensating directions - likely mixed disorder');
      }
    }

    // Standard monitoring
    monitoring = [
      'Repeat ABG in 2-4 hours to assess response',
      'Monitor serum electrolytes (K+, Cl-, Na+)',
      'Continuous pulse oximetry',
      'Cardiac monitoring if severe',
      'Watch for clinical deterioration',
    ];

    const calculationResult: AcidBaseResult = {
      ph: phValue,
      pco2: pco2Value,
      hco3: hco3Value,
      primaryDisorder,
      compensation,
      isCompensated,
      anionGap,
      correctedAnionGap,
      interpretation,
      differentialDiagnosis,
      treatment,
      monitoring,
    };

    setResult(calculationResult);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-7 h-7 text-sky-600" />
        <h2 className="text-2xl font-bold text-gray-800">Acid-Base Calculator</h2>
      </div>

      {/* Normal Values Reference */}
      <div className="bg-gray-50 border border-gray-200 p-4 mb-6 rounded-lg">
        <p className="font-semibold text-gray-800 mb-2">Normal ABG Values:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="font-medium">pH:</span> 7.35-7.45</div>
          <div><span className="font-medium">PCO2:</span> 35-45 mmHg</div>
          <div><span className="font-medium">HCO3:</span> 22-26 mEq/L</div>
          <div><span className="font-medium">Anion Gap:</span> 8-12 mEq/L</div>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
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
            PCO2 (mmHg) *
          </label>
          <input
            type="number"
            value={pco2}
            onChange={(e) => setPco2(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 55"
            step="1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            HCO3 (mEq/L) *
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
            Albumin (g/dL)
          </label>
          <input
            type="number"
            value={albumin}
            onChange={(e) => setAlbumin(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 4.0"
            step="0.1"
          />
        </div>
      </div>

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
            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                result.primaryDisorder === 'Normal' ? 'text-green-600 bg-green-100' :
                result.primaryDisorder.includes('Acidosis') ? 'text-red-600 bg-red-100' :
                result.primaryDisorder.includes('Alkalosis') ? 'text-purple-600 bg-purple-100' :
                'text-orange-600 bg-orange-100'
              }`}>
                <Activity className="w-5 h-5" />
                {result.primaryDisorder}
              </span>
              <span className="ml-3 text-sm text-gray-600">{result.compensation}</span>
            </div>

            {/* Values Summary */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className={`rounded-lg p-4 ${result.ph < 7.35 ? 'bg-red-50' : result.ph > 7.45 ? 'bg-purple-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">pH</p>
                <p className={`text-2xl font-bold ${result.ph < 7.35 ? 'text-red-600' : result.ph > 7.45 ? 'text-purple-600' : 'text-green-600'}`}>
                  {result.ph}
                </p>
              </div>

              <div className={`rounded-lg p-4 ${result.pco2 > 45 ? 'bg-orange-50' : result.pco2 < 35 ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">PCO2</p>
                <p className={`text-2xl font-bold ${result.pco2 > 45 ? 'text-orange-600' : result.pco2 < 35 ? 'text-blue-600' : 'text-green-600'}`}>
                  {result.pco2} mmHg
                </p>
              </div>

              <div className={`rounded-lg p-4 ${result.hco3 < 22 ? 'bg-red-50' : result.hco3 > 26 ? 'bg-purple-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">HCO3</p>
                <p className={`text-2xl font-bold ${result.hco3 < 22 ? 'text-red-600' : result.hco3 > 26 ? 'text-purple-600' : 'text-green-600'}`}>
                  {result.hco3} mEq/L
                </p>
              </div>

              <div className={`rounded-lg p-4 ${result.anionGap > 12 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-sm text-gray-600 mb-1">Anion Gap</p>
                <p className={`text-2xl font-bold ${result.anionGap > 12 ? 'text-red-600' : 'text-green-600'}`}>
                  {result.anionGap.toFixed(1)} mEq/L
                </p>
                {result.correctedAnionGap !== result.anionGap && (
                  <p className="text-xs text-gray-500">Corrected: {result.correctedAnionGap.toFixed(1)}</p>
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

            {/* Differential Diagnosis */}
            {result.differentialDiagnosis.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Differential Diagnosis:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  {result.differentialDiagnosis.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Treatment */}
            {result.treatment.length > 0 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Treatment Approach:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.treatment.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Monitoring */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-2">Monitoring:</p>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.monitoring.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Export Button */}
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export ABG Report (PDF)
          </button>
        </div>
      )}
    </div>
  );
}
