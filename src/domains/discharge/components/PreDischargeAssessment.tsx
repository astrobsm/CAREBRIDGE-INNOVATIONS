/**
 * Pre-Discharge Readiness Assessment Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * WHO-adapted safe discharge scoring for inpatient care
 * Determines discharge status: Normal, On Request, Against Medical Advice
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ClipboardCheck,
  Heart,
  Activity,
  Brain,
  Users,
  Home,
  Pill,
  AlertOctagon,
  Shield,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// ============================================
// WHO-ADAPTED DISCHARGE READINESS CRITERIA
// ============================================

export interface DischargeCriterion {
  id: string;
  category: string;
  criterion: string;
  description: string;
  weight: number; // Importance weight for scoring
  critical: boolean; // If false, cannot discharge safely
}

export const dischargeReadinessCriteria: DischargeCriterion[] = [
  // CLINICAL STABILITY (Critical)
  {
    id: 'vital-signs',
    category: 'Clinical Stability',
    criterion: 'Vital signs stable for ≥24 hours',
    description: 'Temperature, BP, HR, RR, SpO2 within acceptable ranges without intervention',
    weight: 15,
    critical: true,
  },
  {
    id: 'no-fever',
    category: 'Clinical Stability',
    criterion: 'Afebrile for ≥24-48 hours',
    description: 'No fever (>38°C) without antipyretics for at least 24 hours',
    weight: 10,
    critical: true,
  },
  {
    id: 'oral-intake',
    category: 'Clinical Stability',
    criterion: 'Tolerating oral intake adequately',
    description: 'Able to eat and drink without vomiting, maintaining hydration',
    weight: 10,
    critical: true,
  },
  {
    id: 'pain-controlled',
    category: 'Clinical Stability',
    criterion: 'Pain adequately controlled with oral medications',
    description: 'Pain score ≤4/10 on oral analgesics that can continue at home',
    weight: 10,
    critical: true,
  },
  {
    id: 'wound-healing',
    category: 'Clinical Stability',
    criterion: 'Surgical wounds healing well (if applicable)',
    description: 'No signs of infection, dehiscence, or concerning drainage',
    weight: 8,
    critical: true,
  },

  // FUNCTIONAL STATUS
  {
    id: 'mobility',
    category: 'Functional Status',
    criterion: 'Adequate mobility for home environment',
    description: 'Can mobilize safely with or without aids as needed for home setting',
    weight: 8,
    critical: false,
  },
  {
    id: 'adl',
    category: 'Functional Status',
    criterion: 'Can perform basic activities of daily living',
    description: 'Able to feed self, use toilet, perform basic hygiene (or has support)',
    weight: 7,
    critical: false,
  },
  {
    id: 'cognitive',
    category: 'Functional Status',
    criterion: 'Cognitive function at baseline or acceptable',
    description: 'Alert, oriented, able to follow discharge instructions',
    weight: 8,
    critical: true,
  },

  // TREATMENT COMPLETION
  {
    id: 'iv-complete',
    category: 'Treatment Completion',
    criterion: 'IV antibiotics/medications completed or transitioned to oral',
    description: 'No ongoing IV therapy required; oral alternatives arranged',
    weight: 10,
    critical: true,
  },
  {
    id: 'investigations-done',
    category: 'Treatment Completion',
    criterion: 'Pending investigations reviewed',
    description: 'All critical lab results and imaging reviewed before discharge',
    weight: 7,
    critical: true,
  },
  {
    id: 'procedures-done',
    category: 'Treatment Completion',
    criterion: 'All planned procedures completed',
    description: 'No outstanding surgical or diagnostic procedures required',
    weight: 8,
    critical: false,
  },

  // DISCHARGE PLANNING
  {
    id: 'medications-ready',
    category: 'Discharge Planning',
    criterion: 'Discharge medications available and explained',
    description: 'All medications dispensed, patient/carer understands regimen',
    weight: 10,
    critical: true,
  },
  {
    id: 'follow-up-arranged',
    category: 'Discharge Planning',
    criterion: 'Follow-up appointments arranged',
    description: 'Outpatient follow-up booked, patient knows when and where',
    weight: 7,
    critical: false,
  },
  {
    id: 'warning-signs',
    category: 'Discharge Planning',
    criterion: 'Warning signs and emergency contact provided',
    description: 'Patient knows when to seek help and how to contact hospital',
    weight: 8,
    critical: true,
  },

  // SOCIAL & SUPPORT
  {
    id: 'caregiver',
    category: 'Social Support',
    criterion: 'Adequate caregiver support at home',
    description: 'Responsible adult available to assist if needed',
    weight: 7,
    critical: false,
  },
  {
    id: 'safe-environment',
    category: 'Social Support',
    criterion: 'Safe and suitable home environment',
    description: 'Home can accommodate patient\'s current needs',
    weight: 5,
    critical: false,
  },
  {
    id: 'transport',
    category: 'Social Support',
    criterion: 'Transportation arranged',
    description: 'Safe transport to get home or to next destination',
    weight: 3,
    critical: false,
  },
];

export type DischargeDecision = 'fit_for_discharge' | 'discharge_on_request' | 'against_medical_advice' | 'not_ready';
export type CriterionStatus = 'met' | 'not_met' | 'not_applicable' | 'pending';

export interface CriterionAssessment {
  criterionId: string;
  status: CriterionStatus;
  notes?: string;
}

export interface DischargeReadinessResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  decision: DischargeDecision;
  decisionLabel: string;
  criticalUnmet: string[];
  nonCriticalUnmet: string[];
  assessments: CriterionAssessment[];
  isReadyForDischarge: boolean;
  requiresEscalation: boolean;
  recommendations: string[];
}

interface Props {
  patientInfo?: {
    name: string;
    hospitalNumber: string;
    admissionDiagnosis?: string;
    admissionDate?: Date;
  };
  onAssessmentComplete?: (result: DischargeReadinessResult) => void;
  initialAssessments?: CriterionAssessment[];
  readOnly?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function PreDischargeAssessment({
  patientInfo,
  onAssessmentComplete,
  initialAssessments = [],
  readOnly = false,
}: Props) {
  const [assessments, setAssessments] = useState<CriterionAssessment[]>(
    initialAssessments.length > 0 
      ? initialAssessments 
      : dischargeReadinessCriteria.map(c => ({
          criterionId: c.id,
          status: 'pending' as CriterionStatus,
        }))
  );
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Clinical Stability', 'Discharge Planning']);
  const [showDecisionDetails, setShowDecisionDetails] = useState(true);
  const [patientRequestsDischarge, setPatientRequestsDischarge] = useState(false);
  const [patientRefusesTreatment, setPatientRefusesTreatment] = useState(false);

  // Group criteria by category
  const categorizedCriteria = useMemo(() => {
    const categories: { [key: string]: DischargeCriterion[] } = {};
    dischargeReadinessCriteria.forEach(c => {
      if (!categories[c.category]) categories[c.category] = [];
      categories[c.category].push(c);
    });
    return categories;
  }, []);

  // Calculate discharge readiness
  const result = useMemo((): DischargeReadinessResult => {
    let totalScore = 0;
    let maxScore = 0;
    const criticalUnmet: string[] = [];
    const nonCriticalUnmet: string[] = [];

    dischargeReadinessCriteria.forEach(criterion => {
      const assessment = assessments.find(a => a.criterionId === criterion.id);
      maxScore += criterion.weight;

      if (assessment?.status === 'met') {
        totalScore += criterion.weight;
      } else if (assessment?.status === 'not_applicable') {
        maxScore -= criterion.weight; // Remove from calculation
      } else if (assessment?.status === 'not_met') {
        if (criterion.critical) {
          criticalUnmet.push(criterion.criterion);
        } else {
          nonCriticalUnmet.push(criterion.criterion);
        }
      }
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // Determine discharge decision
    let decision: DischargeDecision;
    let decisionLabel: string;
    let recommendations: string[] = [];

    if (criticalUnmet.length === 0 && percentage >= 80) {
      decision = 'fit_for_discharge';
      decisionLabel = 'Fit for Safe Discharge';
      recommendations = [
        'Patient meets criteria for safe discharge',
        'Complete discharge documentation',
        'Ensure patient understands all discharge instructions',
        'Confirm follow-up appointments are booked',
      ];
    } else if (patientRequestsDischarge && criticalUnmet.length > 0) {
      decision = 'discharge_on_request';
      decisionLabel = 'Discharge on Request';
      recommendations = [
        'Patient requests discharge despite unmet criteria',
        'Document patient\'s understanding of risks',
        'Obtain signed discharge on request form',
        'Provide detailed warning signs documentation',
        'Arrange early follow-up within 24-48 hours',
        'Ensure patient has emergency contact numbers',
      ];
    } else if (patientRefusesTreatment) {
      decision = 'against_medical_advice';
      decisionLabel = 'Discharge Against Medical Advice';
      recommendations = [
        'PATIENT REFUSES CONTINUED TREATMENT',
        'Document counseling about risks in detail',
        'Have patient sign AMA discharge form',
        'Document capacity assessment if applicable',
        'Inform next of kin if patient consents',
        'Provide medications and instructions despite AMA',
        'Arrange 24-hour callback by nursing staff',
      ];
    } else {
      decision = 'not_ready';
      decisionLabel = 'Not Ready for Discharge';
      recommendations = [
        'Patient does not meet safe discharge criteria',
        ...criticalUnmet.map(c => `Address: ${c}`),
        'Continue inpatient care until criteria met',
        'Review again in 24 hours',
      ];
    }

    return {
      totalScore,
      maxScore,
      percentage,
      decision,
      decisionLabel,
      criticalUnmet,
      nonCriticalUnmet,
      assessments,
      isReadyForDischarge: decision === 'fit_for_discharge',
      requiresEscalation: decision === 'against_medical_advice' || criticalUnmet.length >= 3,
      recommendations,
    };
  }, [assessments, patientRequestsDischarge, patientRefusesTreatment]);

  // Notify parent
  useMemo(() => {
    if (onAssessmentComplete) {
      onAssessmentComplete(result);
    }
  }, [result, onAssessmentComplete]);

  const updateAssessment = (criterionId: string, status: CriterionStatus, notes?: string) => {
    if (readOnly) return;
    setAssessments(prev => prev.map(a => 
      a.criterionId === criterionId ? { ...a, status, notes } : a
    ));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Clinical Stability': return Heart;
      case 'Functional Status': return Activity;
      case 'Treatment Completion': return Pill;
      case 'Discharge Planning': return ClipboardCheck;
      case 'Social Support': return Users;
      default: return CheckCircle2;
    }
  };

  const getStatusColor = (status: CriterionStatus) => {
    switch (status) {
      case 'met': return 'bg-green-100 text-green-700 border-green-300';
      case 'not_met': return 'bg-red-100 text-red-700 border-red-300';
      case 'not_applicable': return 'bg-gray-100 text-gray-500 border-gray-300';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300';
    }
  };

  const getDecisionColor = (decision: DischargeDecision) => {
    switch (decision) {
      case 'fit_for_discharge': return 'bg-green-100 text-green-800 border-green-300';
      case 'discharge_on_request': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'against_medical_advice': return 'bg-red-100 text-red-800 border-red-300';
      case 'not_ready': return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const completionPercentage = useMemo(() => {
    const assessed = assessments.filter(a => a.status !== 'pending').length;
    return Math.round((assessed / assessments.length) * 100);
  }, [assessments]);

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    const headerColor = result.decision === 'fit_for_discharge' ? [34, 197, 94] :
                        result.decision === 'against_medical_advice' ? [220, 38, 38] :
                        result.decision === 'discharge_on_request' ? [234, 179, 8] :
                        [107, 114, 128];
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Pre-Discharge Readiness Assessment', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('WHO-Adapted Safe Discharge Criteria', pageWidth / 2, 28, { align: 'center' });
    doc.text('AstroHEALTH Innovations in Healthcare', pageWidth / 2, 36, { align: 'center' });

    yPos = 50;

    // Patient Info
    if (patientInfo) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text(`Patient: ${patientInfo.name}`, 20, yPos + 10);
      doc.text(`Hospital No: ${patientInfo.hospitalNumber}`, 20, yPos + 18);
      if (patientInfo.admissionDiagnosis) {
        doc.text(`Diagnosis: ${patientInfo.admissionDiagnosis}`, 20, yPos + 26);
      }
      doc.text(`Assessment Date: ${format(new Date(), 'PPpp')}`, pageWidth - 80, yPos + 10);
      yPos += 40;
    }

    // Decision Badge
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`DECISION: ${result.decisionLabel.toUpperCase()}`, pageWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Readiness Score: ${result.percentage}% (${result.totalScore}/${result.maxScore} points)`, pageWidth / 2, yPos + 19, { align: 'center' });
    yPos += 35;

    // Critical Unmet Criteria
    if (result.criticalUnmet.length > 0) {
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(15, yPos, pageWidth - 30, 10 + result.criticalUnmet.length * 6, 3, 3, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠️ CRITICAL CRITERIA NOT MET:', 20, yPos + 8);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      result.criticalUnmet.forEach((c, i) => {
        doc.text(`• ${c}`, 25, yPos + 15 + (i * 6));
      });
      yPos += 18 + result.criticalUnmet.length * 6;
    }

    // Criteria Assessment
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Assessment Details:', 15, yPos);
    yPos += 8;

    Object.entries(categorizedCriteria).forEach(([category, criteria]) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(category, 20, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      criteria.forEach(c => {
        const assessment = assessments.find(a => a.criterionId === c.id);
        const status = assessment?.status || 'pending';
        const statusText = status === 'met' ? '✓ MET' : 
                          status === 'not_met' ? '✗ NOT MET' :
                          status === 'not_applicable' ? 'N/A' : '? PENDING';
        doc.text(`${statusText} - ${c.criterion}${c.critical ? ' (CRITICAL)' : ''}`, 25, yPos);
        yPos += 5;
      });
      yPos += 3;
    });

    // Recommendations
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations:', 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    result.recommendations.forEach(rec => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`• ${rec}`, 20, yPos);
      yPos += 6;
    });

    // Signature Lines
    yPos = Math.max(yPos + 20, 250);
    if (yPos > 260) {
      doc.addPage();
      yPos = 220;
    }
    doc.setFontSize(9);
    doc.line(20, yPos, 90, yPos);
    doc.text('Assessing Clinician', 35, yPos + 5);
    doc.line(110, yPos, 180, yPos);
    doc.text('Date & Time', 135, yPos + 5);

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('WHO-Adapted Safe Discharge Assessment - For Clinical Use Only', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Discharge-Readiness-${patientInfo?.hospitalNumber || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Pre-Discharge Readiness Assessment</h3>
            <p className="text-xs text-gray-500">WHO-adapted safe discharge criteria</p>
          </div>
        </div>
        <button
          onClick={generatePDF}
          disabled={completionPercentage < 100}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            completionPercentage < 100
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <Download size={14} />
          PDF
        </button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Assessment Progress</span>
          <span className="font-medium">{completionPercentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Decision Display */}
      {completionPercentage === 100 && (
        <div className={`p-4 rounded-lg border-2 ${getDecisionColor(result.decision)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {result.decision === 'fit_for_discharge' && <ThumbsUp className="w-8 h-8" />}
              {result.decision === 'discharge_on_request' && <HelpCircle className="w-8 h-8" />}
              {result.decision === 'against_medical_advice' && <AlertOctagon className="w-8 h-8" />}
              {result.decision === 'not_ready' && <ThumbsDown className="w-8 h-8" />}
              <div>
                <p className="text-lg font-bold">{result.decisionLabel}</p>
                <p className="text-sm">Readiness Score: {result.percentage}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{result.totalScore}/{result.maxScore}</p>
              <p className="text-xs">points</p>
            </div>
          </div>

          {result.criticalUnmet.length > 0 && (
            <div className="mt-3 p-2 bg-red-200/50 rounded">
              <p className="text-sm font-medium text-red-800">Critical Criteria Unmet:</p>
              <ul className="text-xs text-red-700 mt-1">
                {result.criticalUnmet.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Patient Override Options */}
      {!readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">Patient Choices (if criteria not met):</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={patientRequestsDischarge}
                onChange={(e) => {
                  setPatientRequestsDischarge(e.target.checked);
                  if (e.target.checked) setPatientRefusesTreatment(false);
                }}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="text-sm text-amber-800">
                Patient requests discharge despite unmet criteria
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={patientRefusesTreatment}
                onChange={(e) => {
                  setPatientRefusesTreatment(e.target.checked);
                  if (e.target.checked) setPatientRequestsDischarge(false);
                }}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span className="text-sm text-red-800">
                Patient refuses continued treatment (AMA)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Criteria Categories */}
      <div className="space-y-2">
        {Object.entries(categorizedCriteria).map(([category, criteria]) => {
          const CategoryIcon = getCategoryIcon(category);
          const categoryAssessments = assessments.filter(a => 
            criteria.some(c => c.id === a.criterionId)
          );
          const metCount = categoryAssessments.filter(a => a.status === 'met').length;
          const totalCount = criteria.length;
          const hasCriticalUnmet = criteria.some(c => 
            c.critical && assessments.find(a => a.criterionId === c.id)?.status === 'not_met'
          );

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center justify-between p-3 transition-colors ${
                  hasCriticalUnmet ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon className={`w-5 h-5 ${hasCriticalUnmet ? 'text-red-600' : 'text-gray-600'}`} />
                  <span className="font-medium">{category}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    metCount === totalCount ? 'bg-green-100 text-green-700' :
                    hasCriticalUnmet ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {metCount}/{totalCount}
                  </span>
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
                    <div className="p-3 space-y-3 bg-white">
                      {criteria.map(criterion => {
                        const assessment = assessments.find(a => a.criterionId === criterion.id);
                        
                        return (
                          <div key={criterion.id} className={`p-3 rounded-lg border ${getStatusColor(assessment?.status || 'pending')}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{criterion.criterion}</p>
                                  {criterion.critical && (
                                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                      CRITICAL
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{criterion.description}</p>
                              </div>
                            </div>

                            {/* Status Buttons */}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => updateAssessment(criterion.id, 'met')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                                  assessment?.status === 'met'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                ✓ Met
                              </button>
                              <button
                                onClick={() => updateAssessment(criterion.id, 'not_met')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                                  assessment?.status === 'not_met'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                ✗ Not Met
                              </button>
                              <button
                                onClick={() => updateAssessment(criterion.id, 'not_applicable')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                                  assessment?.status === 'not_applicable'
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                N/A
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {completionPercentage === 100 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowDecisionDetails(!showDecisionDetails)}
            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Recommendations & Next Steps</span>
            </div>
            {showDecisionDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {showDecisionDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
