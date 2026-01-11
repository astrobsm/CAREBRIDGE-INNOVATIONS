// GFR Calculator
// CKD-EPI and Cockcroft-Gault with CKD Staging

import { useState } from 'react';
import { Calculator, Activity, Download } from 'lucide-react';
import { PatientCalculatorInfo, GFRResult, CKDStage } from '../../types';
import { generateGFRPDF } from '../../utils/pdfGenerator';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function GFRCalculator({ patientInfo }: Props) {
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState(patientInfo.age || '');
  const [gender, setGender] = useState<'male' | 'female'>(
    patientInfo.gender === 'female' || patientInfo.gender === 'elderly-female' ? 'female' : 'male'
  );
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [_race, _setRace] = useState<'african' | 'other'>('african');
  const [result, setResult] = useState<GFRResult | null>(null);

  const calculateGFR = () => {
    const cr = parseFloat(creatinine);
    const ageValue = parseFloat(age);
    const wt = parseFloat(weight);

    if (isNaN(cr) || isNaN(ageValue)) {
      alert('Please enter valid creatinine and age values');
      return;
    }

    // CKD-EPI equation (2021 - race-free version)
    let gfrCKDEPI: number;
    const kappa = gender === 'female' ? 0.7 : 0.9;
    const crKappa = cr / kappa;
    
    if (gender === 'female') {
      if (cr <= 0.7) {
        gfrCKDEPI = 142 * Math.pow(crKappa, -0.241) * Math.pow(0.9938, ageValue);
      } else {
        gfrCKDEPI = 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, ageValue);
      }
    } else {
      if (cr <= 0.9) {
        gfrCKDEPI = 142 * Math.pow(crKappa, -0.302) * Math.pow(0.9938, ageValue);
      } else {
        gfrCKDEPI = 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, ageValue);
      }
    }
    
    // Apply sex coefficient
    if (gender === 'female') {
      gfrCKDEPI *= 1.012;
    }

    // Cockcroft-Gault equation (requires weight)
    let gfrCockcroftGault = 0;
    if (!isNaN(wt)) {
      gfrCockcroftGault = ((140 - ageValue) * wt) / (72 * cr);
      if (gender === 'female') {
        gfrCockcroftGault *= 0.85;
      }
    }

    // Determine CKD Stage
    let ckdStage: CKDStage;
    let stageDescription: string;
    let recommendations: string[] = [];
    let drugDosingAdjustments: string[] = [];
    let referralCriteria: string[] = [];

    if (gfrCKDEPI >= 90) {
      ckdStage = 'G1';
      stageDescription = 'Normal or high kidney function';
      recommendations = [
        'No specific kidney-related restrictions',
        'Manage cardiovascular risk factors',
        'Annual monitoring if diabetes or hypertension present',
        'Maintain healthy lifestyle',
      ];
    } else if (gfrCKDEPI >= 60) {
      ckdStage = 'G2';
      stageDescription = 'Mildly decreased kidney function';
      recommendations = [
        'Control blood pressure (target <130/80 mmHg)',
        'Optimize diabetes control if applicable',
        'Annual GFR and urine albumin monitoring',
        'ACE inhibitor or ARB if proteinuria present',
        'Avoid nephrotoxins (NSAIDs, contrast, aminoglycosides)',
      ];
      drugDosingAdjustments = [
        'Most medications: No adjustment needed',
        'Metformin: Monitor renal function',
      ];
    } else if (gfrCKDEPI >= 45) {
      ckdStage = 'G3a';
      stageDescription = 'Mild-moderate decrease';
      recommendations = [
        'Refer to nephrologist for co-management',
        'Blood pressure control (target <130/80)',
        'Monitor electrolytes every 6 months',
        'Check PTH, calcium, phosphorus, vitamin D',
        'Dietary protein: 0.8 g/kg/day',
        'Avoid nephrotoxic medications',
      ];
      drugDosingAdjustments = [
        'Metformin: Reduce dose by 50%',
        'Gabapentin: Reduce dose',
        'Allopurinol: Start at lower dose',
        'Avoid NSAIDs',
      ];
    } else if (gfrCKDEPI >= 30) {
      ckdStage = 'G3b';
      stageDescription = 'Moderate-severe decrease';
      recommendations = [
        'Nephrology referral essential',
        'Strict blood pressure control',
        'Monitor for anemia (check Hb, iron studies)',
        'Consider erythropoietin if Hb <10 g/dL',
        'Dietary phosphorus restriction',
        'Vitamin D supplementation if deficient',
        'Prepare for possible RRT in future',
      ];
      drugDosingAdjustments = [
        'Metformin: Generally avoid or use with caution',
        'Many antibiotics: Reduce dose or frequency',
        'Digoxin: Reduce dose by 25-50%',
        'Opioids: Use with caution, prefer fentanyl over morphine',
        'Avoid gadolinium contrast (NSF risk)',
      ];
      referralCriteria = [
        'GFR <45 - Nephrology referral recommended',
      ];
    } else if (gfrCKDEPI >= 15) {
      ckdStage = 'G4';
      stageDescription = 'Severe decrease - prepare for RRT';
      recommendations = [
        'Urgent nephrology referral if not already followed',
        'Discuss renal replacement therapy options',
        'Consider AV fistula creation if dialysis likely',
        'Transplant workup if appropriate candidate',
        'Strict fluid and electrolyte management',
        'Phosphate binders may be needed',
        'Erythropoietin therapy for anemia',
        'Avoid potassium-sparing diuretics',
      ];
      drugDosingAdjustments = [
        'Metformin: CONTRAINDICATED',
        'Most renally-cleared drugs: Significant dose reduction',
        'Avoid NSAIDs, aminoglycosides',
        'Morphine: Avoid (active metabolites accumulate)',
        'Enoxaparin: Avoid or reduce dose significantly',
      ];
      referralCriteria = [
        'GFR <30 - Nephrology care essential',
        'Prepare for dialysis or transplant',
      ];
    } else {
      ckdStage = 'G5';
      stageDescription = 'Kidney failure - RRT needed';
      recommendations = [
        '⚠️ KIDNEY FAILURE - Renal replacement therapy needed',
        'Immediate nephrology consultation if new diagnosis',
        'Dialysis initiation based on symptoms (uremia, fluid overload, hyperkalemia)',
        'Continue transplant workup if appropriate',
        'Strict dietary restrictions (K+, phosphorus, fluid)',
        'Palliative care discussion if RRT not appropriate',
      ];
      drugDosingAdjustments = [
        'All renally-cleared medications: Major adjustments or avoid',
        'Many drugs removed by dialysis - time doses appropriately',
        'Consult pharmacy/nephrology for all new medications',
      ];
      referralCriteria = [
        'GFR <15 - Dialysis evaluation required',
        'Consider transplant referral',
      ];
    }

    const calculationResult: GFRResult = {
      gfrCKDEPI,
      gfrCockcroftGault,
      ckdStage,
      stageDescription,
      recommendations,
      drugDosingAdjustments,
      referralCriteria,
    };

    setResult(calculationResult);
  };

  const handleExportPDF = () => {
    if (result) {
      generateGFRPDF(result, patientInfo);
    }
  };

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
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Creatinine (mg/dL) *
          </label>
          <input
            type="number"
            value={creatinine}
            onChange={(e) => setCreatinine(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="e.g., 1.2"
            step="0.01"
          />
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">μmol/L × 0.0113 = mg/dL</p>
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
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Weight (kg)
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
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-sky-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-1">CKD-EPI GFR</p>
                <p className="text-4xl font-bold text-sky-600">{result.gfrCKDEPI.toFixed(1)}</p>
                <p className="text-sm text-gray-500">mL/min/1.73m²</p>
              </div>

              {result.gfrCockcroftGault > 0 && (
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

            {/* Recommendations */}
            <div className="bg-blue-50 border-l-4 border-sky-600 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2">Recommendations:</p>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className={rec.includes('⚠️') ? 'font-semibold text-red-600' : ''}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Drug Dosing */}
            {result.drugDosingAdjustments.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Drug Dosing Adjustments:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.drugDosingAdjustments.map((adj, index) => (
                    <li key={index}>{adj}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Referral Criteria */}
            {result.referralCriteria.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="font-semibold text-red-800 mb-2">Referral Needed:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-red-700">
                  {result.referralCriteria.map((criteria, index) => (
                    <li key={index}>{criteria}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export GFR Report (PDF)
          </button>
        </div>
      )}
    </div>
  );
}
