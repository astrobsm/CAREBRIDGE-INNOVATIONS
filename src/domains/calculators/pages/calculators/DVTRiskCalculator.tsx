// DVT Risk Calculator - Caprini Score
// WHO-Adapted VTE Risk Assessment and Prophylaxis

import { useState, useCallback, useMemo } from 'react';
import { Calculator, AlertCircle, Heart, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import { PatientCalculatorInfo, DVTRiskResult } from '../../types';
import { getDVTRiskPDFDoc } from '../../utils/pdfGenerator';
import { computeDvt, dvtReport } from '../../engine/hub/dvt';
import CalculatorReportActions from '../../report/components/CalculatorReportActions';
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
  const [errors, setErrors] = useState<string[]>([]);
  const ageNum = age === '' ? null : Number(age);
  const report = useMemo(
    () => (result ? dvtReport(result, ageNum !== null && Number.isFinite(ageNum) ? ageNum : null, patientInfo) : null),
    [result, ageNum, patientInfo]
  );

  const calculateRisk = () => {
    const r = computeDvt({ age, flags: { minorSurgery, bmi30Plus, swollenLegs, varicoseVeins, pregnancy, postpartum, ocp, bedrest, plasterCast, sepsis, lungDisease, mi, chf, inflammatory, arthroscopic, majorSurgery, laparoscopic, centralLine, bedridden, paralysis, previousDVT, familyHistory, thrombophilia, elevatedHomocysteine, heparinThrombocytopenia, stroke, elective, hipPelvisFracture, acuteSpinal, cancer, chemotherapy }, comorbidities: patientInfo.comorbidities });
    if ('errors' in r) { setErrors(r.errors); setResult(null); return; }
    setErrors([]);
    setResult(r.result);
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
              { state: pregnancy, setter: (v: boolean) => { setPregnancy(v); if (v) setPostpartum(false); }, label: 'Pregnancy' },
              { state: postpartum, setter: (v: boolean) => { setPostpartum(v); if (v) setPregnancy(false); }, label: 'Postpartum (<1 month)' },
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

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

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

            {/* Additional considerations (comorbidities, very high risk) — computed before, never shown */}
            {(result.additionalRecommendations?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Additional considerations:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.additionalRecommendations?.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}

            {/* Warning Signs */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
              <p className="font-semibold text-red-800 mb-2">Warning Signs - Seek Emergency Care:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {result.warningSigns.filter(Boolean).map((sign, index) => (
                  <li key={index} className={sign.includes('⚠️') ? 'font-semibold text-red-600' : ''}>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>

            {/* Patient education — computed before, never shown */}
            {(result.educationPoints?.length ?? 0) > 0 && (
              <div className="bg-teal-50 border-l-4 border-teal-600 p-4 mb-4 rounded-r-lg">
                <p className="font-semibold text-gray-800 mb-2">Patient education:</p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                  {result.educationPoints?.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}

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

          <CalculatorReportActions report={report} />
        </div>
      )}
    </div>
  );
}
