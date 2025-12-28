/**
 * DVT Risk Assessment Component (Caprini Score)
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive Caprini DVT risk scoring with recommendations
 * For use in patient admission workflow
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Activity,
  Droplets,
  Shield,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// Caprini Risk Factors with comprehensive categorization
export interface CapriniRiskFactor {
  id: string;
  factor: string;
  points: number;
  category: '1-point' | '2-point' | '3-point' | '5-point';
  description?: string;
}

export const capriniRiskFactors: CapriniRiskFactor[] = [
  // 1 point factors
  { id: 'age-41-60', factor: 'Age 41-60 years', points: 1, category: '1-point' },
  { id: 'minor-surgery', factor: 'Minor surgery planned', points: 1, category: '1-point' },
  { id: 'bmi-25', factor: 'BMI > 25 kg/m²', points: 1, category: '1-point' },
  { id: 'swollen-legs', factor: 'Swollen legs (current)', points: 1, category: '1-point' },
  { id: 'varicose-veins', factor: 'Varicose veins', points: 1, category: '1-point' },
  { id: 'pregnancy', factor: 'Pregnancy or postpartum', points: 1, category: '1-point' },
  { id: 'stillborn', factor: 'History of unexplained stillborn', points: 1, category: '1-point' },
  { id: 'oral-contraceptives', factor: 'Oral contraceptives or HRT', points: 1, category: '1-point' },
  { id: 'sepsis', factor: 'Sepsis (<1 month)', points: 1, category: '1-point' },
  { id: 'lung-disease', factor: 'Serious lung disease incl pneumonia (<1 month)', points: 1, category: '1-point' },
  { id: 'abnormal-pft', factor: 'Abnormal pulmonary function', points: 1, category: '1-point' },
  { id: 'acute-mi', factor: 'Acute MI', points: 1, category: '1-point' },
  { id: 'chf', factor: 'CHF (<1 month)', points: 1, category: '1-point' },
  { id: 'ibd', factor: 'History of IBD', points: 1, category: '1-point' },
  { id: 'bed-rest', factor: 'Medical patient currently at bed rest', points: 1, category: '1-point' },
  
  // 2 point factors
  { id: 'age-61-74', factor: 'Age 61-74 years', points: 2, category: '2-point' },
  { id: 'arthroscopic', factor: 'Arthroscopic surgery', points: 2, category: '2-point' },
  { id: 'major-surgery', factor: 'Major surgery (>45 minutes)', points: 2, category: '2-point' },
  { id: 'laparoscopic', factor: 'Laparoscopic surgery (>45 minutes)', points: 2, category: '2-point' },
  { id: 'malignancy', factor: 'Malignancy (present or previous)', points: 2, category: '2-point' },
  { id: 'central-line', factor: 'Central venous access', points: 2, category: '2-point' },
  { id: 'cast', factor: 'Immobilizing plaster cast (<1 month)', points: 2, category: '2-point' },
  { id: 'confined-bed', factor: 'Confined to bed (>72 hours)', points: 2, category: '2-point' },
  
  // 3 point factors
  { id: 'age-75', factor: 'Age ≥75 years', points: 3, category: '3-point' },
  { id: 'dvt-history', factor: 'History of DVT/PE', points: 3, category: '3-point' },
  { id: 'family-dvt', factor: 'Family history of DVT/PE', points: 3, category: '3-point' },
  { id: 'factor-v', factor: 'Factor V Leiden', points: 3, category: '3-point' },
  { id: 'prothrombin', factor: 'Prothrombin 20210A', points: 3, category: '3-point' },
  { id: 'lupus-anticoag', factor: 'Lupus anticoagulant', points: 3, category: '3-point' },
  { id: 'anticardiolipin', factor: 'Anticardiolipin antibodies', points: 3, category: '3-point' },
  { id: 'homocysteine', factor: 'Elevated serum homocysteine', points: 3, category: '3-point' },
  { id: 'hit', factor: 'Heparin-induced thrombocytopenia', points: 3, category: '3-point' },
  { id: 'thrombophilia', factor: 'Other congenital or acquired thrombophilia', points: 3, category: '3-point' },
  
  // 5 point factors
  { id: 'stroke', factor: 'Stroke (<1 month)', points: 5, category: '5-point' },
  { id: 'arthroplasty', factor: 'Elective major lower extremity arthroplasty', points: 5, category: '5-point' },
  { id: 'leg-fracture', factor: 'Hip, pelvis or leg fracture (<1 month)', points: 5, category: '5-point' },
  { id: 'spinal-injury', factor: 'Acute spinal cord injury (<1 month)', points: 5, category: '5-point' },
];

export interface DVTAssessmentResult {
  score: number;
  riskLevel: 'Very Low' | 'Low' | 'Moderate' | 'High';
  riskPercentage: string;
  selectedFactors: string[];
  recommendations: string[];
  prophylaxis: {
    mechanical: boolean;
    chemical: boolean;
    drugs: string[];
    duration: string;
  };
  warningSigns: string[];
  monitoringPlan: string[];
}

interface Props {
  patientAge?: number;
  patientBMI?: number;
  onAssessmentComplete?: (result: DVTAssessmentResult) => void;
  initialSelectedFactors?: string[];
  readOnly?: boolean;
  patientInfo?: {
    name: string;
    hospitalNumber: string;
    gender: string;
  };
}

export default function DVTCapriniAssessment({
  patientAge,
  patientBMI,
  onAssessmentComplete,
  initialSelectedFactors = [],
  readOnly = false,
  patientInfo,
}: Props) {
  const [selectedFactors, setSelectedFactors] = useState<string[]>(initialSelectedFactors);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['1-point', '2-point']);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Auto-select age-related factors
  useMemo(() => {
    if (patientAge && !readOnly) {
      const newFactors = [...selectedFactors];
      
      // Remove existing age factors first
      const filtered = newFactors.filter(f => 
        !['age-41-60', 'age-61-74', 'age-75'].includes(f)
      );
      
      // Add appropriate age factor
      if (patientAge >= 75) {
        if (!filtered.includes('age-75')) filtered.push('age-75');
      } else if (patientAge >= 61) {
        if (!filtered.includes('age-61-74')) filtered.push('age-61-74');
      } else if (patientAge >= 41) {
        if (!filtered.includes('age-41-60')) filtered.push('age-41-60');
      }
      
      // Check BMI
      if (patientBMI && patientBMI > 25 && !filtered.includes('bmi-25')) {
        filtered.push('bmi-25');
      }
      
      if (JSON.stringify(filtered) !== JSON.stringify(selectedFactors)) {
        setSelectedFactors(filtered);
      }
    }
  }, [patientAge, patientBMI]);

  // Calculate score and generate recommendations
  const assessment = useMemo((): DVTAssessmentResult => {
    let score = 0;
    
    selectedFactors.forEach(factorId => {
      const factor = capriniRiskFactors.find(f => f.id === factorId);
      if (factor) {
        score += factor.points;
      }
    });

    let riskLevel: DVTAssessmentResult['riskLevel'];
    let riskPercentage: string;
    let recommendations: string[] = [];
    let mechanicalProphylaxis = false;
    let chemicalProphylaxis = false;
    let drugs: string[] = [];
    let duration = '';
    let warningSigns: string[] = [];
    let monitoringPlan: string[] = [];

    // Risk stratification based on Caprini score
    if (score === 0) {
      riskLevel = 'Very Low';
      riskPercentage = '<0.5%';
      recommendations = [
        'Early and frequent ambulation is the primary intervention',
        'No pharmacological prophylaxis required',
        'Encourage leg exercises while in bed',
        'Adequate hydration',
      ];
      duration = 'Until fully ambulatory';
    } else if (score <= 2) {
      riskLevel = 'Low';
      riskPercentage = '0.7-1.8%';
      mechanicalProphylaxis = true;
      recommendations = [
        'Intermittent pneumatic compression (IPC) devices recommended',
        'Graduated compression stockings (GCS) if IPC unavailable',
        'Early ambulation within 24 hours post-procedure',
        'Leg elevation when sitting',
        'Adequate hydration (2-3L/day unless contraindicated)',
      ];
      duration = 'Until fully ambulatory';
    } else if (score <= 4) {
      riskLevel = 'Moderate';
      riskPercentage = '1.8-3.2%';
      mechanicalProphylaxis = true;
      chemicalProphylaxis = true;
      drugs = [
        'Enoxaparin 40mg SC once daily',
        'OR Fondaparinux 2.5mg SC once daily',
        'OR Unfractionated Heparin 5000 units SC BD/TDS',
      ];
      recommendations = [
        'COMBINE mechanical + pharmacological prophylaxis',
        'Start pharmacological prophylaxis 6-12 hours post-surgery (if no bleeding)',
        'Use IPC devices during immobility periods',
        'Daily assessment for signs of DVT',
        'Check platelet count on day 5 if using heparin',
        'Consider anti-embolism stockings',
      ];
      duration = '7-10 days or until fully ambulatory';
      monitoringPlan = [
        'Daily calf circumference measurement',
        'Monitor for heparin-induced thrombocytopenia (HIT)',
        'Review anticoagulation if bleeding occurs',
      ];
    } else {
      riskLevel = 'High';
      riskPercentage = '3.2-12.0%';
      mechanicalProphylaxis = true;
      chemicalProphylaxis = true;
      drugs = [
        'Enoxaparin 40mg SC once daily (or 30mg BD for very high risk)',
        'OR Rivaroxaban 10mg PO once daily (if eligible)',
        'OR Fondaparinux 2.5mg SC once daily',
      ];
      recommendations = [
        'INTENSIVE combined prophylaxis is MANDATORY',
        'Start pharmacological prophylaxis as soon as hemostasis permits',
        'IPC devices MUST be used continuously when in bed',
        'Consider IVC filter if anticoagulation contraindicated',
        'Extended prophylaxis (4 weeks) for major orthopedic/cancer surgery',
        'Specialist consultation for very high-risk patients',
        'Duplex ultrasound screening if clinically indicated',
        'Early mobilization protocol with physiotherapy',
      ];
      duration = '28-35 days (extended prophylaxis) for major surgery';
      monitoringPlan = [
        'Daily clinical assessment for DVT/PE signs',
        'Platelet count monitoring for HIT',
        'Bilateral calf circumference measurement twice daily',
        'Low threshold for diagnostic imaging',
        'Document anticoagulation compliance daily',
      ];
    }

    // Warning signs for all risk levels
    warningSigns = [
      'Unilateral leg swelling, pain, or warmth',
      'Pitting edema in affected leg',
      'Dilated superficial veins',
      'Homan\'s sign (calf pain on dorsiflexion)',
      'Sudden onset dyspnea or chest pain (PE warning)',
      'Tachycardia or hypoxia without other cause',
      'Hemoptysis',
    ];

    return {
      score,
      riskLevel,
      riskPercentage,
      selectedFactors,
      recommendations,
      prophylaxis: {
        mechanical: mechanicalProphylaxis,
        chemical: chemicalProphylaxis,
        drugs,
        duration,
      },
      warningSigns,
      monitoringPlan,
    };
  }, [selectedFactors]);

  // Notify parent component when assessment changes
  useMemo(() => {
    if (onAssessmentComplete) {
      onAssessmentComplete(assessment);
    }
  }, [assessment, onAssessmentComplete]);

  const toggleFactor = (factorId: string) => {
    if (readOnly) return;
    setSelectedFactors(prev =>
      prev.includes(factorId)
        ? prev.filter(f => f !== factorId)
        : [...prev, factorId]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very Low': return 'bg-green-100 text-green-800 border-green-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'High': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DVT Risk Assessment (Caprini Score)', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('CareBridge Innovations in Healthcare', pageWidth / 2, 30, { align: 'center' });
    
    yPos = 50;

    // Patient Info
    if (patientInfo) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text(`Patient: ${patientInfo.name}`, 20, yPos + 10);
      doc.text(`Hospital No: ${patientInfo.hospitalNumber}`, 20, yPos + 18);
      doc.text(`Date: ${format(new Date(), 'PPpp')}`, pageWidth - 60, yPos + 10);
      yPos += 35;
    }

    // Score Badge
    const riskColor = assessment.riskLevel === 'High' ? [220, 38, 38] :
                      assessment.riskLevel === 'Moderate' ? [234, 179, 8] :
                      assessment.riskLevel === 'Low' ? [59, 130, 246] :
                      [34, 197, 94];
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Caprini Score: ${assessment.score}`, pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${assessment.riskLevel} Risk - VTE Risk: ${assessment.riskPercentage}`, pageWidth / 2, yPos + 22, { align: 'center' });
    yPos += 40;

    // Selected Risk Factors
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Identified Risk Factors:', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    selectedFactors.forEach(factorId => {
      const factor = capriniRiskFactors.find(f => f.id === factorId);
      if (factor) {
        doc.text(`• ${factor.factor} (+${factor.points} points)`, 20, yPos);
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      }
    });
    yPos += 5;

    // Prophylaxis Recommendations
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prophylaxis Recommendations:', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (assessment.prophylaxis.mechanical) {
      doc.text('✓ Mechanical Prophylaxis: IPC devices + Compression stockings', 20, yPos);
      yPos += 6;
    }
    if (assessment.prophylaxis.chemical) {
      doc.text('✓ Chemical Prophylaxis Required:', 20, yPos);
      yPos += 6;
      assessment.prophylaxis.drugs.forEach(drug => {
        doc.text(`   - ${drug}`, 25, yPos);
        yPos += 5;
      });
    }
    doc.text(`Duration: ${assessment.prophylaxis.duration}`, 20, yPos);
    yPos += 10;

    // Detailed Recommendations
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Recommendations:', 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    assessment.recommendations.forEach(rec => {
      const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 40);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    });
    yPos += 5;

    // Warning Signs
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, yPos, pageWidth - 30, 50, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('⚠️ Warning Signs - Seek Immediate Medical Attention:', 20, yPos + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let warnY = yPos + 15;
    assessment.warningSigns.slice(0, 5).forEach(sign => {
      doc.text(`• ${sign}`, 20, warnY);
      warnY += 5;
    });

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('For healthcare professionals only. Always use clinical judgment.', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`DVT-Risk-Assessment-${patientInfo?.hospitalNumber || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const categories = ['1-point', '2-point', '3-point', '5-point'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <Droplets className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">DVT Risk Assessment</h3>
            <p className="text-xs text-gray-500">Caprini Score for VTE Prophylaxis</p>
          </div>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Download size={14} />
          PDF
        </button>
      </div>

      {/* Score Display */}
      <div className={`p-4 rounded-lg border-2 ${getRiskColor(assessment.riskLevel)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {assessment.riskLevel === 'High' && <AlertTriangle className="w-5 h-5" />}
              {assessment.riskLevel === 'Very Low' && <CheckCircle2 className="w-5 h-5" />}
              <span className="text-2xl font-bold">{assessment.score}</span>
              <span className="text-sm font-medium">points</span>
            </div>
            <p className="text-sm font-medium">{assessment.riskLevel} Risk</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">VTE Risk</p>
            <p className="text-xl font-bold">{assessment.riskPercentage}</p>
          </div>
        </div>
      </div>

      {/* Risk Factors Selection */}
      <div className="space-y-2">
        {categories.map(category => {
          const categoryFactors = capriniRiskFactors.filter(f => f.category === category);
          const selectedInCategory = categoryFactors.filter(f => selectedFactors.includes(f.id)).length;
          const points = category.split('-')[0];
          
          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                    points === '5' ? 'bg-red-100 text-red-700' :
                    points === '3' ? 'bg-orange-100 text-orange-700' :
                    points === '2' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {points} pt{points !== '1' ? 's' : ''} each
                  </span>
                  <span className="font-medium text-sm">
                    {category.charAt(0).toUpperCase() + category.slice(1)} Factors
                  </span>
                  {selectedInCategory > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                      {selectedInCategory} selected
                    </span>
                  )}
                </div>
                {expandedCategories.includes(category) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              <AnimatePresence>
                {expandedCategories.includes(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryFactors.map(factor => (
                        <label
                          key={factor.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedFactors.includes(factor.id)
                              ? 'bg-primary-50 border border-primary-300'
                              : 'bg-white border border-gray-200 hover:border-gray-300'
                          } ${readOnly ? 'cursor-default' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFactors.includes(factor.id)}
                            onChange={() => toggleFactor(factor.id)}
                            disabled={readOnly}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm">{factor.factor}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Recommendations Section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-emerald-800">Prophylaxis Recommendations</span>
          </div>
          {showRecommendations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        <AnimatePresence>
          {showRecommendations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Prophylaxis Type */}
                <div className="flex flex-wrap gap-2">
                  {assessment.prophylaxis.mechanical && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                      <Activity size={14} />
                      Mechanical Prophylaxis
                    </span>
                  )}
                  {assessment.prophylaxis.chemical && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                      <Droplets size={14} />
                      Chemical Prophylaxis
                    </span>
                  )}
                </div>

                {/* Drug Recommendations */}
                {assessment.prophylaxis.drugs.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-purple-800 mb-2">Recommended Medications:</p>
                    <ul className="space-y-1">
                      {assessment.prophylaxis.drugs.map((drug, idx) => (
                        <li key={idx} className="text-sm text-purple-700 flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          {drug}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-purple-600 mt-2">
                      Duration: {assessment.prophylaxis.duration}
                    </p>
                  </div>
                )}

                {/* General Recommendations */}
                <div className="space-y-2">
                  {assessment.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>

                {/* Warning Signs */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">Warning Signs to Watch For:</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {assessment.warningSigns.slice(0, 6).map((sign, idx) => (
                      <p key={idx} className="text-xs text-amber-700">• {sign}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
