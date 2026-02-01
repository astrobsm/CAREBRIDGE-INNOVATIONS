// DVT Risk Calculator - Caprini Score
// WHO-Adapted VTE Risk Assessment and Prophylaxis

import { useState, useCallback } from 'react';
import { Calculator, AlertCircle, Heart, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import { PatientCalculatorInfo, DVTRiskResult } from '../../types';
import { getDVTRiskPDFDoc } from '../../utils/pdfGenerator';
import { ExportButtonWithModal } from '../../../../components/common/ExportOptionsModal';
import { createSimpleThermalPDF } from '../../../../utils/thermalPdfGenerator';

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function DVTRiskCalculator({ patientInfo }: Props) {
  const [age, setAge] = useState(patientInfo.age || '');
  
  // 1 Point Risk Factors
  const [minorSurgery, setMinorSurgery] = useState(false);
  const [bmi30Plus, setBmi30Plus] = useState(false);
  const [swollenLegs, setSwollenLegs] = useState(false);
  const [varicoseVeins, setVaricoseVeins] = useState(false);
  const [pregnancy, setPregnancy] = useState(false);
  const [postpartum, setPostpartum] = useState(false);
  const [ocp, setOcp] = useState(false);
  const [bedrest, setBedrest] = useState(false);
  const [plasterCast, setPlasterCast] = useState(false);
  const [sepsis, setSepsis] = useState(false);
  const [lungDisease, setLungDisease] = useState(false);
  const [mi, setMi] = useState(false);
  const [chf, setChf] = useState(false);
  const [inflammatory, setInflammatory] = useState(false);
  
  // 2 Point Risk Factors
  const [arthroscopic, setArthroscopic] = useState(false);
  const [majorSurgery, setMajorSurgery] = useState(false);
  const [laparoscopic, setLaparoscopic] = useState(false);
  const [centralLine, setCentralLine] = useState(false);
  const [bedridden, setBedridden] = useState(false);
  const [paralysis, setParalysis] = useState(false);
  
  // 3 Point Risk Factors
  const [previousDVT, setPreviousDVT] = useState(false);
  const [familyHistory, setFamilyHistory] = useState(false);
  const [thrombophilia, setThrombophilia] = useState(false);
  const [elevatedHomocysteine, setElevatedHomocysteine] = useState(false);
  const [heparinThrombocytopenia, setHeparinThrombocytopenia] = useState(false);
  
  // 5 Point Risk Factors
  const [stroke, setStroke] = useState(false);
  const [elective, setElective] = useState(false);
  const [hipPelvisFracture, setHipPelvisFracture] = useState(false);
  const [acuteSpinal, setAcuteSpinal] = useState(false);
  
  // Cancer
  const [cancer, setCancer] = useState(false);
  const [chemotherapy, setChemotherapy] = useState(false);
  
  const [result, setResult] = useState<DVTRiskResult | null>(null);

  const calculateRisk = () => {
    let score = 0;
    const scoreBreakdown: DVTRiskResult['scoreBreakdown'] = {
      '5-point': [],
      '3-point': [],
      '2-point': [],
      '1-point': [],
    };

    const ageValue = parseInt(age);
    
    // Age scoring
    if (ageValue >= 41 && ageValue <= 60) {
      score += 1;
      scoreBreakdown['1-point'].push('Age 41-60 years');
    } else if (ageValue >= 61 && ageValue <= 74) {
      score += 2;
      scoreBreakdown['2-point'].push('Age 61-74 years');
    } else if (ageValue >= 75) {
      score += 3;
      scoreBreakdown['3-point'].push('Age ≥75 years');
    }

    // 1 Point factors
    if (minorSurgery) { score += 1; scoreBreakdown['1-point'].push('Minor surgery planned'); }
    if (bmi30Plus) { score += 1; scoreBreakdown['1-point'].push('BMI > 30 kg/m²'); }
    if (swollenLegs) { score += 1; scoreBreakdown['1-point'].push('Swollen legs (current)'); }
    if (varicoseVeins) { score += 1; scoreBreakdown['1-point'].push('Varicose veins'); }
    if (pregnancy) { score += 1; scoreBreakdown['1-point'].push('Pregnancy or postpartum'); }
    if (postpartum) { score += 1; scoreBreakdown['1-point'].push('Postpartum (<1 month)'); }
    if (ocp) { score += 1; scoreBreakdown['1-point'].push('Oral contraceptives/HRT'); }
    if (bedrest) { score += 1; scoreBreakdown['1-point'].push('Medical patient on bed rest'); }
    if (plasterCast) { score += 1; scoreBreakdown['1-point'].push('Plaster cast/brace'); }
    if (sepsis) { score += 1; scoreBreakdown['1-point'].push('Sepsis (<1 month)'); }
    if (lungDisease) { score += 1; scoreBreakdown['1-point'].push('Serious lung disease'); }
    if (mi) { score += 1; scoreBreakdown['1-point'].push('Acute MI'); }
    if (chf) { score += 1; scoreBreakdown['1-point'].push('CHF (<1 month)'); }
    if (inflammatory) { score += 1; scoreBreakdown['1-point'].push('Inflammatory bowel disease'); }
    
    // 2 Point factors
    if (arthroscopic) { score += 2; scoreBreakdown['2-point'].push('Arthroscopic surgery'); }
    if (majorSurgery) { score += 2; scoreBreakdown['2-point'].push('Major surgery >45 min'); }
    if (laparoscopic) { score += 2; scoreBreakdown['2-point'].push('Laparoscopic surgery >45 min'); }
    if (centralLine) { score += 2; scoreBreakdown['2-point'].push('Central venous access'); }
    if (bedridden) { score += 2; scoreBreakdown['2-point'].push('Confined to bed >72 hours'); }
    if (paralysis) { score += 2; scoreBreakdown['2-point'].push('Paralysis/paresis'); }
    
    // 3 Point factors
    if (previousDVT) { score += 3; scoreBreakdown['3-point'].push('History of DVT/PE'); }
    if (familyHistory) { score += 3; scoreBreakdown['3-point'].push('Family history of thrombosis'); }
    if (thrombophilia) { score += 3; scoreBreakdown['3-point'].push('Known thrombophilia'); }
    if (elevatedHomocysteine) { score += 3; scoreBreakdown['3-point'].push('Elevated homocysteine'); }
    if (heparinThrombocytopenia) { score += 3; scoreBreakdown['3-point'].push('Heparin-induced thrombocytopenia'); }
    
    // 5 Point factors
    if (stroke) { score += 5; scoreBreakdown['5-point'].push('Stroke (<1 month)'); }
    if (elective) { score += 5; scoreBreakdown['5-point'].push('Elective lower extremity arthroplasty'); }
    if (hipPelvisFracture) { score += 5; scoreBreakdown['5-point'].push('Hip/pelvis/leg fracture'); }
    if (acuteSpinal) { score += 5; scoreBreakdown['5-point'].push('Acute spinal cord injury'); }
    
    // Cancer
    if (cancer) {
      score += 2;
      scoreBreakdown['2-point'].push('Cancer (current or within 6 months)');
      if (chemotherapy) {
        score += 1;
        scoreBreakdown['1-point'].push('Currently on chemotherapy');
      }
    }

    // Determine risk level
    let riskLevel: string;
    let riskPercentage: string;
    let recommendations: string[] = [];
    let prophylaxis: string[] = [];
    let specificProtocols: string[] = [];
    let additionalRecommendations: string[] = [];

    if (score === 0) {
      riskLevel = 'Very Low Risk';
      riskPercentage = '<0.5% VTE risk';
      recommendations = [
        'Early ambulation encouraged',
        'No pharmacological prophylaxis needed',
        'Adequate hydration',
      ];
      prophylaxis = [
        'Early ambulation only',
        'No anticoagulation required',
      ];
    } else if (score <= 2) {
      riskLevel = 'Low Risk';
      riskPercentage = '~1.5% VTE risk';
      recommendations = [
        'Early and frequent ambulation',
        'Graduated compression stockings (GCS) optional',
        'Intermittent pneumatic compression (IPC) if immobile',
      ];
      prophylaxis = [
        'Mechanical prophylaxis recommended',
        'GCS (18-21 mmHg) or IPC',
        'Consider pharmacological if additional risk factors',
      ];
    } else if (score <= 4) {
      riskLevel = 'Moderate Risk';
      riskPercentage = '~3% VTE risk';
      recommendations = [
        'Pharmacological prophylaxis recommended',
        'Plus mechanical prophylaxis',
        'Early ambulation when possible',
        'Assess bleeding risk before anticoagulation',
      ];
      prophylaxis = [
        'Enoxaparin 40mg SC daily (preferred)',
        'OR Heparin 5000 units SC q8-12h',
        'PLUS graduated compression stockings',
        'Duration: Until fully mobile or discharge',
      ];
      specificProtocols = [
        'Renal impairment (CrCl <30): Use UFH instead of LMWH',
        'Obesity (BMI >40): Consider enoxaparin 40mg SC q12h',
      ];
    } else if (score <= 8) {
      riskLevel = 'High Risk';
      riskPercentage = '~6% VTE risk';
      recommendations = [
        'Pharmacological prophylaxis essential',
        'Combination mechanical + pharmacological',
        'Extended prophylaxis for high-risk surgery',
        'Close monitoring for signs of DVT/PE',
      ];
      prophylaxis = [
        'Enoxaparin 40mg SC daily (or 30mg SC q12h)',
        'OR Fondaparinux 2.5mg SC daily',
        'OR Rivaroxaban 10mg PO daily (post-surgery)',
        'PLUS IPC devices',
        'PLUS graduated compression stockings',
        'Duration: 7-10 days or until ambulatory',
        'Consider extended prophylaxis (28-35 days) for major orthopedic/cancer surgery',
      ];
      specificProtocols = [
        'Orthopedic surgery: Extend prophylaxis to 35 days',
        'Cancer surgery: Extend prophylaxis to 28 days',
        'Spinal anesthesia: Wait 12h after LMWH before catheter removal',
      ];
    } else {
      riskLevel = 'Very High Risk';
      riskPercentage = '>6% VTE risk';
      recommendations = [
        '⚠️ Maximum prophylaxis required',
        'Pharmacological + mechanical combination mandatory',
        'Extended prophylaxis after discharge',
        'Consider IVC filter if anticoagulation contraindicated',
        'Vigilant monitoring for VTE symptoms',
      ];
      prophylaxis = [
        'Enoxaparin 40mg SC q12h (higher dose for very high risk)',
        'OR Fondaparinux 2.5mg SC daily',
        'IPC devices continuously when in bed',
        'Graduated compression stockings',
        'Extended prophylaxis: 4-6 weeks post-discharge',
        'Daily lower limb assessment',
      ];
      specificProtocols = [
        'Cancer + surgery: LMWH preferred over warfarin',
        'Hip/knee replacement: Extended prophylaxis 35 days',
        'Major trauma: IPC until ambulatory, then add LMWH',
        'If bleeding risk: IPC alone until bleeding risk acceptable',
      ];
      additionalRecommendations = [
        'Screen for occult DVT if high clinical suspicion',
        'Serial lower limb Doppler ultrasound may be warranted',
        'Consider retrievable IVC filter if cannot anticoagulate',
      ];
    }

    // Additional considerations based on comorbidities
    if (patientInfo.comorbidities.includes('Chronic Kidney Disease')) {
      additionalRecommendations.push('CKD present: Prefer unfractionated heparin over LMWH if CrCl <30');
    }
    if (patientInfo.comorbidities.includes('Liver Cirrhosis')) {
      additionalRecommendations.push('Liver disease: Bleeding risk increased - consider mechanical only or reduced dose');
    }

    const availableMedications = [
      'Enoxaparin (Clexane) 40mg/0.4mL - Most common in Nigeria',
      'Enoxaparin (Clexane) 60mg/0.6mL',
      'Unfractionated Heparin 5000 IU/mL',
      'Fondaparinux (Arixtra) 2.5mg - May not be readily available',
      'Rivaroxaban (Xarelto) 10mg - For post-op, DOACs increasing availability',
      'Graduated Compression Stockings (18-21 mmHg)',
    ];

    const warningSigns = [
      '🦵 Unilateral leg swelling, pain, warmth, redness',
      '💨 Sudden shortness of breath',
      '💔 Chest pain (especially pleuritic)',
      '🫀 Rapid heart rate with no other cause',
      '😵 Syncope or presyncope',
      '🩸 Coughing blood (hemoptysis)',
      '',
      '⚠️ IF ANY OF THESE OCCUR: Emergency evaluation for PE/DVT needed',
    ];

    const educationPoints = [
      'Stay well hydrated (2-3L water daily unless fluid restricted)',
      'Early mobilization - walk as soon as medically safe',
      'Ankle pumping exercises when in bed',
      'Avoid crossing legs for prolonged periods',
      'Report any leg swelling or breathing difficulty immediately',
      'Continue prophylaxis medications as prescribed',
    ];

    const calculationResult: DVTRiskResult = {
      score,
      riskLevel,
      riskPercentage,
      scoreBreakdown,
      recommendations,
      prophylaxis,
      specificProtocols,
      additionalRecommendations,
      availableMedications,
      warningSigns,
      educationPoints,
    };

    setResult(calculationResult);
  };

  // Generate A4 PDF
  const generateA4PDF = useCallback((): jsPDF => {
    if (!result) throw new Error('No result to export');
    return getDVTRiskPDFDoc(result, patientInfo);
  }, [result, patientInfo]);

  // Generate Thermal PDF (80mm width)
  const generateThermalPDF = useCallback((): jsPDF => {
    if (!result) throw new Error('No result to export');
    
    // Collect all risk factors for thermal display
    const riskFactors = [
      ...result.scoreBreakdown['5-point'].map(f => `[5pt] ${f}`),
      ...result.scoreBreakdown['3-point'].map(f => `[3pt] ${f}`),
      ...result.scoreBreakdown['2-point'].map(f => `[2pt] ${f}`),
      ...result.scoreBreakdown['1-point'].map(f => `[1pt] ${f}`),
    ];

    return createSimpleThermalPDF({
      title: 'DVT RISK ASSESSMENT',
      subtitle: `Caprini Score: ${result.score}`,
      patientName: patientInfo.name,
      patientId: patientInfo.hospitalNumber,
      date: new Date(),
      items: [
        { label: 'Score', value: String(result.score) },
        { label: 'Risk Level', value: result.riskLevel },
        { label: 'VTE Risk', value: result.riskPercentage },
        ...riskFactors.slice(0, 5).map((f, i) => ({ label: `Factor ${i + 1}`, value: f })),
      ],
      notes: result.recommendations.slice(0, 3).join('. '),
    });
  }, [result, patientInfo]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Heart className="w-5 h-5 sm:w-7 sm:h-7 text-red-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">DVT Risk Calculator (Caprini)</h2>
      </div>

      <div className="bg-blue-50 border-l-4 border-sky-600 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">Caprini VTE Risk Assessment</p>
            <p>Validated scoring system for VTE risk stratification in surgical and medical patients.</p>
          </div>
        </div>
      </div>

      {/* Age Input */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Age (years) *
        </label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full sm:max-w-xs px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900"
          placeholder="e.g., 55"
        />
      </div>

      {/* Risk Factors */}
      <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
        {/* 1 Point Risk Factors */}
        <div className="border-2 border-blue-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-bold text-blue-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm">1</span>
            1 Point Risk Factors
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2">
            {[
              { state: minorSurgery, setter: setMinorSurgery, label: 'Minor surgery planned' },
              { state: bmi30Plus, setter: setBmi30Plus, label: 'BMI > 30 kg/m²' },
              { state: swollenLegs, setter: setSwollenLegs, label: 'Swollen legs (current)' },
              { state: varicoseVeins, setter: setVaricoseVeins, label: 'Varicose veins' },
              { state: pregnancy, setter: setPregnancy, label: 'Pregnancy' },
              { state: postpartum, setter: setPostpartum, label: 'Postpartum (<1 month)' },
              { state: ocp, setter: setOcp, label: 'OCP / HRT use' },
              { state: bedrest, setter: setBedrest, label: 'Medical patient on bed rest' },
              { state: plasterCast, setter: setPlasterCast, label: 'Plaster cast/brace' },
              { state: sepsis, setter: setSepsis, label: 'Sepsis (<1 month)' },
              { state: lungDisease, setter: setLungDisease, label: 'Serious lung disease' },
              { state: mi, setter: setMi, label: 'Acute MI' },
              { state: chf, setter: setChf, label: 'CHF (<1 month)' },
              { state: inflammatory, setter: setInflammatory, label: 'Inflammatory bowel disease' },
            ].map((factor, index) => (
              <label key={index} className="flex items-center space-x-2 p-1.5 sm:p-2 hover:bg-blue-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={factor.state}
                  onChange={(e) => factor.setter(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded flex-shrink-0"
                />
                <span className="text-xs sm:text-sm">{factor.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2 Point Risk Factors */}
        <div className="border-2 border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
            <span className="bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
            2 Point Risk Factors
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { state: arthroscopic, setter: setArthroscopic, label: 'Arthroscopic surgery' },
              { state: majorSurgery, setter: setMajorSurgery, label: 'Major surgery >45 min' },
              { state: laparoscopic, setter: setLaparoscopic, label: 'Laparoscopic surgery >45 min' },
              { state: centralLine, setter: setCentralLine, label: 'Central venous access' },
              { state: bedridden, setter: setBedridden, label: 'Confined to bed >72 hours' },
              { state: paralysis, setter: setParalysis, label: 'Paralysis/paresis' },
            ].map((factor, index) => (
              <label key={index} className="flex items-center space-x-2 p-2 hover:bg-yellow-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={factor.state}
                  onChange={(e) => factor.setter(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded"
                />
                <span className="text-sm">{factor.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 3 Point Risk Factors */}
        <div className="border-2 border-orange-200 rounded-lg p-4">
          <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
            <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
            3 Point Risk Factors
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              { state: previousDVT, setter: setPreviousDVT, label: 'History of DVT/PE' },
              { state: familyHistory, setter: setFamilyHistory, label: 'Family history of thrombosis' },
              { state: thrombophilia, setter: setThrombophilia, label: 'Known thrombophilia' },
              { state: elevatedHomocysteine, setter: setElevatedHomocysteine, label: 'Elevated homocysteine' },
              { state: heparinThrombocytopenia, setter: setHeparinThrombocytopenia, label: 'Heparin-induced thrombocytopenia (HIT)' },
            ].map((factor, index) => (
              <label key={index} className="flex items-center space-x-2 p-2 hover:bg-orange-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={factor.state}
                  onChange={(e) => factor.setter(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-sm">{factor.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 5 Point Risk Factors */}
        <div className="border-2 border-red-300 rounded-lg p-4">
          <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
            <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
            5 Point Risk Factors
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              { state: stroke, setter: setStroke, label: 'Stroke (<1 month)' },
              { state: elective, setter: setElective, label: 'Elective lower extremity arthroplasty' },
              { state: hipPelvisFracture, setter: setHipPelvisFracture, label: 'Hip/pelvis/leg fracture (<1 month)' },
              { state: acuteSpinal, setter: setAcuteSpinal, label: 'Acute spinal cord injury (<1 month)' },
            ].map((factor, index) => (
              <label key={index} className="flex items-center space-x-2 p-2 hover:bg-red-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={factor.state}
                  onChange={(e) => factor.setter(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm">{factor.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cancer */}
        <div className="border-2 border-purple-200 rounded-lg p-4">
          <h3 className="font-bold text-purple-700 mb-3">Cancer Status</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 p-2 hover:bg-purple-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={cancer}
                onChange={(e) => setCancer(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm">Cancer (current or within 6 months) - 2 points</span>
            </label>
            <label className="flex items-center space-x-2 p-2 hover:bg-purple-50 rounded cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={chemotherapy}
                onChange={(e) => setChemotherapy(e.target.checked)}
                disabled={!cancer}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className={`text-sm ${!cancer ? 'text-gray-400' : ''}`}>Currently on chemotherapy - +1 point</span>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={calculateRisk}
        disabled={!age}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Calculate DVT Risk Score
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Score Badge */}
            <div className={`rounded-lg p-6 mb-6 ${
              result.score === 0 ? 'bg-green-100' :
              result.score <= 2 ? 'bg-blue-100' :
              result.score <= 4 ? 'bg-yellow-100' :
              result.score <= 8 ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <div className="text-center">
                <p className={`text-5xl font-bold mb-2 ${
                  result.score === 0 ? 'text-green-600' :
                  result.score <= 2 ? 'text-blue-600' :
                  result.score <= 4 ? 'text-yellow-600' :
                  result.score <= 8 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  Score: {result.score}
                </p>
                <p className="text-2xl font-semibold text-gray-800">{result.riskLevel}</p>
                <p className="text-gray-600">{result.riskPercentage}</p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-semibold mb-2">Score Breakdown:</p>
              {Object.entries(result.scoreBreakdown).map(([points, factors]) => (
                factors.length > 0 && (
                  <div key={points} className="mb-2">
                    <p className="font-medium text-sm">{points} factors:</p>
                    <ul className="list-disc ml-6 text-sm text-gray-700">
                      {factors.map((factor, i) => <li key={i}>{factor}</li>)}
                    </ul>
                  </div>
                )
              ))}
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

            {/* Prophylaxis */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Prophylaxis Protocol:
              </p>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.prophylaxis.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Specific Protocols */}
            {result.specificProtocols && result.specificProtocols.length > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Special Dosing & Protocols:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.specificProtocols.map((protocol, index) => (
                    <li key={index}>{protocol}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning Signs */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-red-800 mb-2">Warning Signs - Seek Emergency Care:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {result.warningSigns.map((sign, index) => (
                  <li key={index} className={sign.includes('⚠️') ? 'font-semibold text-red-600' : ''}>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>

            {/* Available Medications */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-lg">
              <p className="font-semibold text-gray-800 mb-2">Available Medications (Nigeria):</p>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.availableMedications.map((med, index) => (
                  <li key={index}>{med}</li>
                ))}
              </ul>
            </div>
          </div>

          <ExportButtonWithModal
            generateA4PDF={generateA4PDF}
            generateThermalPDF={generateThermalPDF}
            fileNamePrefix={`DVT_Risk_${patientInfo.name || 'patient'}`}
            buttonText="Export / Print Report"
            buttonClassName="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            modalTitle="Export DVT Risk Assessment"
          />
        </div>
      )}
    </div>
  );
}
