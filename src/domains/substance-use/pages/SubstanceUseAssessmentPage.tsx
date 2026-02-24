/**
 * Substance Use Assessment Page
 * Comprehensive Substance Use Disorder Assessment & Detoxification Support Module (CSUD-DSM)
 * 
 * ⚠️ IMPORTANT: This module provides DECISION SUPPORT only.
 * Final clinical responsibility rests with the licensed clinician.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  AlertTriangle,
  Activity,
  FileText,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Pill,
  Heart,
  Brain,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  ClipboardList,
  TrendingUp,
  MapPin,
  Phone,
  ArrowRight,
  RefreshCw,
  Download,
  Printer,
  Eye,
  Edit,
  Trash2,
  Filter,
  X,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import jsPDF from 'jspdf';
import { addBrandedHeader, addPatientInfoBox, PDF_COLORS, addWatermarkToAllPages } from '../../../utils/pdfUtils';
import {
  substanceUseService,
  SubstanceUseOps,
  ClinicalSummaryOps,
  substanceDefinitions,
} from '../../../services/substanceUseService';
import type {
  SubstanceUseAssessment,
  SubstanceIntake,
  SubstanceCategory,
  RouteOfAdministration,
  AddictionSeverity,
  CareSettingRecommendation,
  WithdrawalSeverity,
  Patient,
} from '../../../types';

// Tabs for the main page
type MainTab = 'assessments' | 'new' | 'monitoring' | 'analytics';

// Assessment wizard steps
type AssessmentStep = 'patient' | 'context' | 'substances' | 'scoring' | 'withdrawal' | 'pain' | 'care' | 'documents' | 'review';

const ASSESSMENT_STEPS: { id: AssessmentStep; title: string; icon: React.ReactNode }[] = [
  { id: 'patient', title: 'Patient Selection', icon: <User size={18} /> },
  { id: 'context', title: 'Patient Context', icon: <Users size={18} /> },
  { id: 'substances', title: 'Substance Intake', icon: <Pill size={18} /> },
  { id: 'scoring', title: 'Severity Scoring', icon: <Activity size={18} /> },
  { id: 'withdrawal', title: 'Withdrawal Risk', icon: <AlertTriangle size={18} /> },
  { id: 'pain', title: 'Pain Management', icon: <Heart size={18} /> },
  { id: 'care', title: 'Care Setting', icon: <MapPin size={18} /> },
  { id: 'documents', title: 'Documentation', icon: <FileText size={18} /> },
  { id: 'review', title: 'Review & Save', icon: <CheckCircle2 size={18} /> },
];

// Substance categories
const SUBSTANCE_CATEGORIES: { value: SubstanceCategory; label: string }[] = [
  { value: 'opioids', label: 'Opioids' },
  { value: 'cannabinoids', label: 'Cannabinoids' },
  { value: 'sedatives', label: 'Sedatives/Benzodiazepines' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'stimulants', label: 'Stimulants' },
  { value: 'hallucinogens', label: 'Hallucinogens' },
  { value: 'inhalants', label: 'Inhalants' },
  { value: 'tobacco', label: 'Tobacco/Nicotine' },
  { value: 'other', label: 'Other' },
];

// Common substances by category
const COMMON_SUBSTANCES: Record<SubstanceCategory, string[]> = {
  opioids: ['Pentazocine', 'Tramadol', 'Codeine', 'Morphine', 'Heroin', 'Fentanyl'],
  cannabinoids: ['Cannabis (Indian Hemp)', 'Marijuana', 'Synthetic Cannabinoids'],
  sedatives: ['Diazepam', 'Clonazepam', 'Alprazolam', 'Lorazepam', 'Rohypnol'],
  alcohol: ['Beer', 'Wine', 'Spirits', 'Local Brew', 'Ogogoro'],
  stimulants: ['Cocaine', 'Methamphetamine', 'Amphetamine', 'MDMA', 'Caffeine (excessive)'],
  hallucinogens: ['LSD', 'Psilocybin', 'PCP', 'Ketamine'],
  inhalants: ['Glue', 'Petrol', 'Paint thinner', 'Aerosols'],
  tobacco: ['Cigarettes', 'Snuff', 'Shisha'],
  other: ['Other substance'],
};

const ROUTES_OF_ADMINISTRATION: { value: RouteOfAdministration; label: string }[] = [
  { value: 'oral', label: 'Oral' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous' },
  { value: 'inhalation', label: 'Inhalation/Smoking' },
  { value: 'intranasal', label: 'Intranasal (Snorting)' },
  { value: 'transdermal', label: 'Transdermal' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'other', label: 'Other' },
];

export default function SubstanceUseAssessmentPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>('assessments');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('patient');
  const [selectedAssessment, setSelectedAssessment] = useState<SubstanceUseAssessment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // New Assessment Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [formData, setFormData] = useState({
    // Patient Context
    demographics: {
      age: 0,
      sex: 'male' as 'male' | 'female',
      weight: 0,
      occupation: '',
    },
    socialFactors: {
      housingStability: 'stable' as 'stable' | 'unstable' | 'homeless',
      employmentStatus: 'employed' as 'employed' | 'unemployed' | 'retired' | 'student' | 'disabled',
      familySupportLevel: 'moderate' as 'strong' | 'moderate' | 'minimal' | 'none',
      legalIssues: false,
      legalIssuesDetails: '',
    },
    previousDetoxAttempts: 0,
    previousDetoxDetails: '',
    psychiatricHistory: [] as string[],
    psychiatricHistoryNotes: '',
    relevantComorbidities: [] as string[],
    
    // Substance Intake
    substances: [] as SubstanceIntake[],
    
    // Scoring
    physicalDependence: { tolerance: 0, withdrawalSymptoms: 0, compulsiveUse: 0, physicalCravings: 0 },
    psychologicalDependence: { emotionalReliance: 0, copingMechanism: 0, preoccupation: 0, anxietyWithoutSubstance: 0 },
    behavioralDysfunction: { prioritizingSubstance: 0, failedAttemptsToCut: 0, timeSpentObtaining: 0, givingUpActivities: 0 },
    socialImpairment: { occupationalImpact: 0, relationshipImpact: 0, financialImpact: 0, legalIssues: 0 },
    medicalComplications: {
      liverDysfunction: 0,
      renalDysfunction: 0,
      cardiacComplications: 0,
      neurologicalComplications: 0,
      infectiousComplications: 0,
      psychiatricComorbidity: 0,
    },
    
    // Pain context
    hasPainCondition: false,
    painContext: {
      painType: 'nociceptive' as 'nociceptive' | 'neuropathic' | 'mixed' | 'psychogenic' | 'unknown',
      painCause: '',
      currentPainScore: 0,
      averagePainScore: 0,
      worstPainScore: 0,
      currentAnalgesics: [] as string[],
      analgesicMisuseRisk: 'low' as 'low' | 'moderate' | 'high',
      analgesicMisuseIndicators: [] as string[],
    },
    
    // Exclusion criteria
    exclusionCriteria: {
      isPregnant: false,
      isPediatric: false,
      hasSeverePsychiatricIllness: false,
      requiresSpecialistReferral: false,
      exclusionReason: '',
    },
  });

  // Current substance being added/edited
  const [currentSubstance, setCurrentSubstance] = useState<Partial<SubstanceIntake>>({
    substanceCategory: 'opioids',
    substanceName: '',
    durationOfUseMonths: 0,
    averageDailyDose: '',
    doseUnit: 'mg',
    routeOfAdministration: 'oral',
    escalationPattern: 'stable',
    lastUseDateTime: new Date(),
    frequencyPerDay: 1,
    isPrimaryConcern: false,
  });

  // Database queries
  const assessments = useLiveQuery(
    () => user?.hospitalId 
      ? SubstanceUseOps.getByHospitalId(user.hospitalId)
      : db.substanceUseAssessments.reverse().toArray(),
    [user?.hospitalId]
  );

  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const selectedPatient = useLiveQuery(
    () => selectedPatientId ? db.patients.get(selectedPatientId) : undefined,
    [selectedPatientId]
  );

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    
    return assessments.filter(a => {
      const matchesSearch = searchQuery === '' || 
        a.primarySubstance.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assessments, searchQuery, statusFilter]);

  // Calculate computed values
  const addictionScore = useMemo(() => {
    const physical = substanceUseService.calculatePhysicalDependenceScore(
      formData.physicalDependence.tolerance,
      formData.physicalDependence.withdrawalSymptoms,
      formData.physicalDependence.compulsiveUse,
      formData.physicalDependence.physicalCravings
    );
    const psychological = substanceUseService.calculatePsychologicalDependenceScore(
      formData.psychologicalDependence.emotionalReliance,
      formData.psychologicalDependence.copingMechanism,
      formData.psychologicalDependence.preoccupation,
      formData.psychologicalDependence.anxietyWithoutSubstance
    );
    const behavioral = substanceUseService.calculateBehavioralDysfunctionScore(
      formData.behavioralDysfunction.prioritizingSubstance,
      formData.behavioralDysfunction.failedAttemptsToCut,
      formData.behavioralDysfunction.timeSpentObtaining,
      formData.behavioralDysfunction.givingUpActivities
    );
    const social = substanceUseService.calculateSocialImpairmentScore(
      formData.socialImpairment.occupationalImpact,
      formData.socialImpairment.relationshipImpact,
      formData.socialImpairment.financialImpact,
      formData.socialImpairment.legalIssues
    );
    const medical = substanceUseService.calculateMedicalComplicationsScore(
      formData.medicalComplications.liverDysfunction,
      formData.medicalComplications.renalDysfunction,
      formData.medicalComplications.cardiacComplications,
      formData.medicalComplications.neurologicalComplications,
      formData.medicalComplications.infectiousComplications,
      formData.medicalComplications.psychiatricComorbidity
    );
    
    return substanceUseService.calculateAddictionSeverityScore(
      physical, psychological, behavioral, social, medical
    );
  }, [formData]);

  const withdrawalRisk = useMemo(() => {
    if (formData.substances.length === 0) return null;
    
    return substanceUseService.predictWithdrawalRisk(
      formData.substances as SubstanceIntake[],
      formData.demographics.age,
      'normal',
      'normal',
      formData.relevantComorbidities
    );
  }, [formData.substances, formData.demographics.age, formData.relevantComorbidities]);

  const careSettingDecision = useMemo(() => {
    if (!withdrawalRisk) return null;
    
    return substanceUseService.determineCareSettingRecommendation(
      addictionScore,
      withdrawalRisk,
      formData.substances as SubstanceIntake[],
      formData.socialFactors.familySupportLevel,
      'stable',
      formData.psychiatricHistory.length > 0
    );
  }, [addictionScore, withdrawalRisk, formData.substances, formData.socialFactors.familySupportLevel, formData.psychiatricHistory]);

  const painManagementSupport = useMemo(() => {
    if (!formData.hasPainCondition) return null;
    
    return substanceUseService.generatePainManagementSupport(
      {
        hasPainCondition: true,
        painType: formData.painContext.painType,
        painCause: formData.painContext.painCause,
        currentPainScore: formData.painContext.currentPainScore,
        averagePainScore: formData.painContext.averagePainScore,
        worstPainScore: formData.painContext.worstPainScore,
        currentAnalgesics: formData.painContext.currentAnalgesics,
        analgesicMisuseRisk: formData.painContext.analgesicMisuseRisk,
        analgesicMisuseIndicators: formData.painContext.analgesicMisuseIndicators,
      },
      formData.substances as SubstanceIntake[],
      formData.relevantComorbidities
    );
  }, [formData.hasPainCondition, formData.painContext, formData.substances, formData.relevantComorbidities]);

  // ==================== PDF GENERATION HANDLERS ====================

  // Build a temporary assessment object from current form state
  const buildTemporaryAssessment = useCallback((): SubstanceUseAssessment | null => {
    if (!selectedPatientId || formData.substances.length === 0 || !withdrawalRisk || !careSettingDecision) {
      return null;
    }
    const primarySubstance = formData.substances.find(s => s.isPrimaryConcern) || formData.substances[0];
    return {
      id: 'temp-' + Date.now(),
      patientId: selectedPatientId,
      hospitalId: user?.hospitalId || '',
      status: 'in_assessment',
      assessmentDate: new Date(),
      assessedBy: user?.id || '',
      assessedByName: `${user?.firstName} ${user?.lastName}`,
      demographics: formData.demographics,
      socialFactors: formData.socialFactors,
      previousDetoxAttempts: formData.previousDetoxAttempts,
      previousDetoxDetails: formData.previousDetoxDetails,
      psychiatricHistory: formData.psychiatricHistory,
      psychiatricHistoryNotes: formData.psychiatricHistoryNotes,
      substances: formData.substances as SubstanceIntake[],
      primarySubstance: primarySubstance.substanceName,
      polySubstanceUse: formData.substances.length > 1,
      addictionSeverityScore: addictionScore,
      withdrawalRiskPrediction: withdrawalRisk,
      painManagementSupport: painManagementSupport || undefined,
      relevantComorbidities: formData.relevantComorbidities,
      comorbidityModifications: substanceUseService.getComorbidityModifications(formData.relevantComorbidities),
      careSettingDecision: careSettingDecision,
      exclusionCriteriaFlags: formData.exclusionCriteria,
      auditLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SubstanceUseAssessment;
  }, [selectedPatientId, formData, addictionScore, withdrawalRisk, careSettingDecision, painManagementSupport, user]);

  const handleGenerateConsent = useCallback(() => {
    const assessment = buildTemporaryAssessment();
    if (!assessment) {
      toast.error('Please complete the assessment before generating documents');
      return;
    }
    const patientName = selectedPatient
      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
      : 'Unknown Patient';
    try {
      const consent = substanceUseService.generateConsentDocument(assessment, patientName);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = addBrandedHeader(doc, {
        title: 'INFORMED CONSENT FOR DETOXIFICATION',
        subtitle: 'Substance Use Disorder Treatment',
        hospitalName: user?.hospitalId || 'Hospital',
      });
      y = addPatientInfoBox(doc, y, {
        name: patientName,
        hospitalNumber: assessment.patientId,
        age: assessment.demographics.age,
        gender: assessment.demographics.sex === 'male' ? 'Male' : 'Female',
      });
      y += 5;
      // Diagnosis Explanation
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Diagnosis Explanation', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const diagLines = doc.splitTextToSize(consent.diagnosisExplanation, pageWidth - 30);
      doc.text(diagLines, 15, y);
      y += diagLines.length * 4 + 4;
      // Detoxification Risks
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Detoxification Risks', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      consent.detoxificationRisks.forEach(risk => {
        if (y > 270) { doc.addPage(); y = 20; }
        const riskLines = doc.splitTextToSize(`\u2022 ${risk}`, pageWidth - 35);
        doc.text(riskLines, 20, y);
        y += riskLines.length * 4 + 2;
      });
      y += 4;
      // Possible Withdrawal Effects
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Possible Withdrawal Effects', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      consent.possibleWithdrawalEffects.forEach(effect => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2022 ${effect}`, 20, y);
        y += 5;
      });
      y += 4;
      // Pain Management Plan
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Pain Management Plan', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const painLines = doc.splitTextToSize(consent.painManagementPlan, pageWidth - 30);
      doc.text(painLines, 15, y);
      y += painLines.length * 4 + 4;
      // Monitoring Requirements
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Monitoring Requirements', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      consent.monitoringRequirements.forEach(req => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2022 ${req}`, 20, y);
        y += 5;
      });
      y += 10;
      // Signature area
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(15, y, 90, y);
      doc.line(110, y, 195, y);
      y += 5;
      doc.setFontSize(8);
      doc.text('Patient Signature & Date', 15, y);
      doc.text('Witness Signature & Date', 110, y);
      y += 15;
      doc.line(15, y, 90, y);
      y += 5;
      doc.text('Clinician Signature & Date', 15, y);
      addWatermarkToAllPages(doc);
      doc.save(`Consent_${patientName.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Consent document generated');
    } catch (error) {
      console.error('Error generating consent:', error);
      toast.error('Failed to generate consent document');
    }
  }, [buildTemporaryAssessment, selectedPatient, user]);

  const handleGenerateLeaflet = useCallback(() => {
    const assessment = buildTemporaryAssessment();
    if (!assessment) {
      toast.error('Please complete the assessment before generating documents');
      return;
    }
    const patientName = selectedPatient
      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
      : 'Unknown Patient';
    try {
      const leaflet = substanceUseService.generatePatientInfoLeaflet(assessment, patientName);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = addBrandedHeader(doc, {
        title: 'PATIENT INFORMATION LEAFLET',
        subtitle: 'Your Detoxification Journey',
        hospitalName: user?.hospitalId || 'Hospital',
      });
      y = addPatientInfoBox(doc, y, {
        name: patientName,
        hospitalNumber: assessment.patientId,
        age: assessment.demographics.age,
        gender: assessment.demographics.sex === 'male' ? 'Male' : 'Female',
      });
      y += 5;
      // Day-by-Day Expectations
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('What to Expect Day-by-Day', 15, y);
      y += 7;
      leaflet.dayByDayExpectations.forEach(day => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.setTextColor(...PDF_COLORS.primary as [number, number, number]);
        doc.text(`Day ${day.day}: ${day.description}`, 15, y);
        y += 5;
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        if (day.symptoms.length > 0) {
          doc.text('Possible symptoms:', 20, y);
          y += 4;
          day.symptoms.forEach(s => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`  - ${s}`, 25, y);
            y += 4;
          });
        }
        if (day.selfCareAdvice.length > 0) {
          doc.text('Self-care advice:', 20, y);
          y += 4;
          day.selfCareAdvice.forEach(a => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`  \u2713 ${a}`, 25, y);
            y += 4;
          });
        }
        y += 3;
      });
      y += 3;
      // Warning Symptoms
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('WARNING: Seek Immediate Help If You Experience', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      leaflet.warningSymptoms.forEach(symptom => {
        if (y > 270) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(symptom, pageWidth - 35);
        doc.text(lines, 20, y);
        y += lines.length * 4 + 2;
      });
      y += 3;
      // Compliance Expectations
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('What We Need From You', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      leaflet.complianceExpectations.forEach(exp => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2022 ${exp}`, 20, y);
        y += 5;
      });
      y += 3;
      // Family Involvement
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('For Family Members', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      leaflet.familyInvolvement.forEach(info => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2022 ${info}`, 20, y);
        y += 5;
      });
      y += 3;
      // Follow-up Schedule
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Follow-Up Schedule', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      leaflet.followUpSchedule.forEach(f => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2022 ${format(new Date(f.date), 'dd MMM yyyy')} - ${f.purpose} (${f.location})`, 20, y);
        y += 5;
      });
      y += 3;
      // Emergency Contacts
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('Emergency Contacts', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      leaflet.emergencyContacts.forEach(c => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${c.role}: ${c.name} - ${c.phone}`, 20, y);
        y += 5;
      });
      addWatermarkToAllPages(doc);
      doc.save(`Patient_Leaflet_${patientName.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Patient information leaflet generated');
    } catch (error) {
      console.error('Error generating leaflet:', error);
      toast.error('Failed to generate patient information leaflet');
    }
  }, [buildTemporaryAssessment, selectedPatient, user]);

  const handleGenerateSummary = useCallback(async () => {
    const assessment = buildTemporaryAssessment();
    if (!assessment) {
      toast.error('Please complete the assessment before generating documents');
      return;
    }
    const patientName = selectedPatient
      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
      : 'Unknown Patient';
    try {
      const hospitalName = user?.hospitalId || 'Hospital';
      const generatedBy = `${user?.firstName} ${user?.lastName}`;
      // Build summary data inline (without saving to DB for temp assessments)
      const summary = {
        addictionScore: assessment.addictionSeverityScore,
        riskClassification: assessment.withdrawalRiskPrediction.overallRisk,
        recommendedPathway: assessment.careSettingDecision.recommendation,
        keyFindings: [
          `Primary substance: ${assessment.primarySubstance}`,
          `Duration of use: ${assessment.substances[0]?.durationOfUseMonths || 'Unknown'} months`,
          `Poly-substance use: ${assessment.polySubstanceUse ? 'Yes' : 'No'}`,
          `Social support: ${assessment.socialFactors.familySupportLevel}`,
          `Previous detox attempts: ${assessment.previousDetoxAttempts}`,
        ],
        recommendedInterventions: [
          ...assessment.withdrawalRiskPrediction.pharmacologicalSupport.slice(0, 5),
          ...assessment.withdrawalRiskPrediction.monitoringRecommendations.slice(0, 3),
        ],
        monitoringChecklist: assessment.withdrawalRiskPrediction.monitoringRecommendations,
      };
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = addBrandedHeader(doc, {
        title: 'CLINICAL SUMMARY REPORT',
        subtitle: 'Substance Use Disorder Assessment',
        hospitalName,
      });
      y = addPatientInfoBox(doc, y, {
        name: patientName,
        hospitalNumber: assessment.patientId,
        age: assessment.demographics.age,
        gender: assessment.demographics.sex === 'male' ? 'Male' : 'Female',
      });
      y += 5;
      // Addiction Severity Score
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Addiction Severity Assessment', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const score = summary.addictionScore;
      doc.text(`Composite Score: ${score.totalCompositeScore}/100 (${score.severityLevel})`, 20, y);
      y += 5;
      doc.text(`Physical Dependence: ${score.physicalDependenceScore}/100`, 20, y);
      y += 5;
      doc.text(`Psychological Dependence: ${score.psychologicalDependenceScore}/100`, 20, y);
      y += 5;
      doc.text(`Behavioral Dysfunction: ${score.behavioralDysfunctionScore}/100`, 20, y);
      y += 5;
      doc.text(`Social Impairment: ${score.socialImpairmentScore}/100`, 20, y);
      y += 5;
      doc.text(`Medical Complications: ${score.medicalComplicationsScore}/100`, 20, y);
      y += 8;
      // Risk Classification
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Risk Classification', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`Overall Risk: ${summary.riskClassification}`, 20, y);
      y += 5;
      doc.text(`Recommended Pathway: ${summary.recommendedPathway}`, 20, y);
      y += 8;
      // Key Findings
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Key Findings', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      summary.keyFindings.forEach(finding => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2022 ${finding}`, 20, y);
        y += 5;
      });
      y += 4;
      // Recommended Interventions
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Recommended Interventions', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      summary.recommendedInterventions.forEach(intervention => {
        if (y > 270) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`\u2022 ${intervention}`, pageWidth - 35);
        doc.text(lines, 20, y);
        y += lines.length * 4 + 2;
      });
      y += 4;
      // Monitoring Checklist
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Monitoring Checklist', 15, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      summary.monitoringChecklist.forEach(item => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`\u2610 ${item}`, 20, y);
        y += 5;
      });
      y += 8;
      // Disclaimer
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setFont('times', 'italic');
      doc.setTextColor(150, 0, 0);
      doc.text('DISCLAIMER: This document is for CLINICAL DECISION SUPPORT only.', 15, y);
      y += 4;
      doc.text('Final clinical responsibility rests with the treating physician.', 15, y);
      y += 4;
      doc.text(`Generated by: ${generatedBy} on ${format(new Date(), 'PPP p')}`, 15, y);
      addWatermarkToAllPages(doc);
      doc.save(`Clinical_Summary_${patientName.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Clinical summary generated');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate clinical summary');
    }
  }, [buildTemporaryAssessment, selectedPatient, user]);

  // Add substance to list
  const handleAddSubstance = () => {
    if (!currentSubstance.substanceName) {
      toast.error('Please enter a substance name');
      return;
    }
    
    const newSubstance: SubstanceIntake = {
      id: crypto.randomUUID(),
      substanceCategory: currentSubstance.substanceCategory || 'other',
      substanceName: currentSubstance.substanceName || '',
      durationOfUseMonths: currentSubstance.durationOfUseMonths || 0,
      averageDailyDose: currentSubstance.averageDailyDose || '',
      doseUnit: currentSubstance.doseUnit || 'mg',
      routeOfAdministration: currentSubstance.routeOfAdministration || 'oral',
      escalationPattern: currentSubstance.escalationPattern || 'stable',
      lastUseDateTime: currentSubstance.lastUseDateTime || new Date(),
      frequencyPerDay: currentSubstance.frequencyPerDay || 1,
      isPrimaryConcern: formData.substances.length === 0, // First substance is primary by default
    };
    
    setFormData(prev => ({
      ...prev,
      substances: [...prev.substances, newSubstance],
    }));
    
    // Reset current substance form
    setCurrentSubstance({
      substanceCategory: 'opioids',
      substanceName: '',
      durationOfUseMonths: 0,
      averageDailyDose: '',
      doseUnit: 'mg',
      routeOfAdministration: 'oral',
      escalationPattern: 'stable',
      lastUseDateTime: new Date(),
      frequencyPerDay: 1,
      isPrimaryConcern: false,
    });
    
    toast.success('Substance added');
  };

  // Remove substance
  const handleRemoveSubstance = (id: string) => {
    setFormData(prev => ({
      ...prev,
      substances: prev.substances.filter(s => s.id !== id),
    }));
  };

  // Auto-fill patient demographics
  const handlePatientSelect = (patientId: string | undefined) => {
    if (!patientId) {
      setSelectedPatientId('');
      return;
    }
    
    setSelectedPatientId(patientId);
    
    // Auto-fill demographics when patient data loads
    const patient = patients?.find(p => p.id === patientId);
    if (patient) {
      const age = patient.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : 0;
      setFormData(prev => ({
        ...prev,
        demographics: {
          ...prev.demographics,
          age,
          sex: patient.gender,
        },
        relevantComorbidities: patient.chronicConditions || [],
        exclusionCriteria: {
          ...prev.exclusionCriteria,
          isPediatric: age < 18,
        },
      }));
    }
  };

  // Navigate steps
  const goToNextStep = () => {
    const currentIndex = ASSESSMENT_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < ASSESSMENT_STEPS.length - 1) {
      setCurrentStep(ASSESSMENT_STEPS[currentIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = ASSESSMENT_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(ASSESSMENT_STEPS[currentIndex - 1].id);
    }
  };

  // Save assessment
  const handleSaveAssessment = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    
    if (formData.substances.length === 0) {
      toast.error('Please add at least one substance');
      return;
    }
    
    try {
      const primarySubstance = formData.substances.find(s => s.isPrimaryConcern) || formData.substances[0];
      
      const assessmentData: Omit<SubstanceUseAssessment, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: selectedPatientId,
        hospitalId: user?.hospitalId || '',
        status: 'in_assessment',
        assessmentDate: new Date(),
        assessedBy: user?.id || '',
        assessedByName: `${user?.firstName} ${user?.lastName}`,
        demographics: formData.demographics,
        socialFactors: formData.socialFactors,
        previousDetoxAttempts: formData.previousDetoxAttempts,
        previousDetoxDetails: formData.previousDetoxDetails,
        psychiatricHistory: formData.psychiatricHistory,
        psychiatricHistoryNotes: formData.psychiatricHistoryNotes,
        substances: formData.substances as SubstanceIntake[],
        primarySubstance: primarySubstance.substanceName,
        polySubstanceUse: formData.substances.length > 1,
        addictionSeverityScore: addictionScore,
        withdrawalRiskPrediction: withdrawalRisk!,
        painManagementSupport: painManagementSupport || undefined,
        relevantComorbidities: formData.relevantComorbidities,
        comorbidityModifications: substanceUseService.getComorbidityModifications(formData.relevantComorbidities),
        careSettingDecision: careSettingDecision!,
        exclusionCriteriaFlags: formData.exclusionCriteria,
        auditLog: [{
          action: 'ASSESSMENT_CREATED',
          performedBy: user?.id || '',
          performedAt: new Date(),
          details: 'Initial assessment completed',
        }],
      };
      
      const id = await SubstanceUseOps.create(assessmentData);
      
      toast.success('Assessment saved successfully');
      setActiveTab('assessments');
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    }
  };

  const resetForm = () => {
    setSelectedPatientId('');
    setCurrentStep('patient');
    setFormData({
      demographics: { age: 0, sex: 'male', weight: 0, occupation: '' },
      socialFactors: {
        housingStability: 'stable',
        employmentStatus: 'employed',
        familySupportLevel: 'moderate',
        legalIssues: false,
        legalIssuesDetails: '',
      },
      previousDetoxAttempts: 0,
      previousDetoxDetails: '',
      psychiatricHistory: [],
      psychiatricHistoryNotes: '',
      relevantComorbidities: [],
      substances: [],
      physicalDependence: { tolerance: 0, withdrawalSymptoms: 0, compulsiveUse: 0, physicalCravings: 0 },
      psychologicalDependence: { emotionalReliance: 0, copingMechanism: 0, preoccupation: 0, anxietyWithoutSubstance: 0 },
      behavioralDysfunction: { prioritizingSubstance: 0, failedAttemptsToCut: 0, timeSpentObtaining: 0, givingUpActivities: 0 },
      socialImpairment: { occupationalImpact: 0, relationshipImpact: 0, financialImpact: 0, legalIssues: 0 },
      medicalComplications: {
        liverDysfunction: 0,
        renalDysfunction: 0,
        cardiacComplications: 0,
        neurologicalComplications: 0,
        infectiousComplications: 0,
        psychiatricComorbidity: 0,
      },
      hasPainCondition: false,
      painContext: {
        painType: 'nociceptive',
        painCause: '',
        currentPainScore: 0,
        averagePainScore: 0,
        worstPainScore: 0,
        currentAnalgesics: [],
        analgesicMisuseRisk: 'low',
        analgesicMisuseIndicators: [],
      },
      exclusionCriteria: {
        isPregnant: false,
        isPediatric: false,
        hasSeverePsychiatricIllness: false,
        requiresSpecialistReferral: false,
        exclusionReason: '',
      },
    });
  };

  // Render score badge
  const renderSeverityBadge = (severity: AddictionSeverity) => {
    const colors = {
      mild: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      severe: 'bg-orange-100 text-orange-700',
      complicated: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const renderWithdrawalRiskBadge = (risk: WithdrawalSeverity) => {
    const colors = {
      minimal: 'bg-gray-100 text-gray-700',
      mild: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      severe: 'bg-orange-100 text-orange-700',
      life_threatening: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[risk]}`}>
        {risk.replace('_', ' ').charAt(0).toUpperCase() + risk.replace('_', ' ').slice(1)}
      </span>
    );
  };

  const renderCareSettingBadge = (setting: CareSettingRecommendation) => {
    const config = {
      outpatient_detox: { color: 'bg-green-100 text-green-700', label: 'Outpatient Detox' },
      supervised_outpatient: { color: 'bg-blue-100 text-blue-700', label: 'Supervised Outpatient' },
      inpatient_admission: { color: 'bg-orange-100 text-orange-700', label: 'Inpatient Admission' },
      icu_hdu_alert: { color: 'bg-red-100 text-red-700', label: 'ICU/HDU Alert' },
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[setting].color}`}>
        {config[setting].label}
      </span>
    );
  };

  // Render slider component for scoring
  const ScoreSlider = ({ label, value, onChange, description }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    description?: string;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className={`px-2 py-0.5 rounded text-sm font-medium ${
          value === 0 ? 'bg-gray-100 text-gray-600' :
          value === 1 ? 'bg-green-100 text-green-700' :
          value === 2 ? 'bg-yellow-100 text-yellow-700' :
          value === 3 ? 'bg-orange-100 text-orange-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}/4
        </span>
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <input
        type="range"
        min={0}
        max={4}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>None</span>
        <span>Mild</span>
        <span>Moderate</span>
        <span>Severe</span>
        <span>Extreme</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Disclaimer */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pill className="text-purple-600" />
              Substance Use Assessment
              <span className="text-sm font-normal text-gray-500 hidden sm:inline">CSUD-DSM</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive assessment, risk stratification, and detoxification support
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('new');
                resetForm();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus size={18} />
              New Assessment
            </button>
          </div>
        </div>
        
        {/* Clinical Disclaimer Banner */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800">
            <strong>Clinical Decision Support Only:</strong> This module provides decision support recommendations aligned with WHO guidelines. 
            Final clinical responsibility rests with the licensed clinician. No autonomous prescribing is performed. 
            All recommendations must be reviewed and approved by qualified medical personnel.
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="border-b">
          <nav className="flex overflow-x-auto">
            {[
              { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={18} /> },
              { id: 'new', label: 'New Assessment', icon: <Plus size={18} /> },
              { id: 'monitoring', label: 'Monitoring', icon: <Activity size={18} /> },
              { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MainTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Assessments List Tab */}
          {activeTab === 'assessments' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assessments..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  title="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="in_assessment">In Assessment</option>
                  <option value="detox_planned">Detox Planned</option>
                  <option value="detox_in_progress">Detox In Progress</option>
                  <option value="detox_completed">Completed</option>
                  <option value="discharged">Discharged</option>
                </select>
              </div>

              {/* Assessments Table */}
              {filteredAssessments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Pill className="mx-auto mb-4 text-gray-300" size={48} />
                  <p>No assessments found</p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 text-purple-600 hover:underline"
                  >
                    Create new assessment
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Substance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Withdrawal Risk</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Care Setting</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAssessments.map(assessment => {
                        const patient = patients?.find(p => p.id === assessment.patientId);
                        return (
                          <tr key={assessment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">{patient?.hospitalNumber}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Pill size={16} className="text-purple-500" />
                                {assessment.primarySubstance}
                              </div>
                              {assessment.polySubstanceUse && (
                                <span className="text-xs text-gray-500">+{assessment.substances.length - 1} more</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderSeverityBadge(assessment.addictionSeverityScore.severityLevel)}
                              <div className="text-xs text-gray-500 mt-1">
                                Score: {assessment.addictionSeverityScore.totalCompositeScore}/88
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {renderWithdrawalRiskBadge(assessment.withdrawalRiskPrediction.overallRisk)}
                            </td>
                            <td className="px-4 py-3">
                              {renderCareSettingBadge(
                                assessment.clinicianOverride?.overriddenTo || assessment.careSettingDecision.recommendation
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                assessment.status === 'detox_completed' ? 'bg-green-100 text-green-700' :
                                assessment.status === 'detox_in_progress' ? 'bg-blue-100 text-blue-700' :
                                assessment.status === 'in_assessment' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {assessment.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {format(new Date(assessment.assessmentDate), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedAssessment(assessment);
                                    setShowDetailsModal(true);
                                  }}
                                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                  title="View details"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* New Assessment Tab */}
          {activeTab === 'new' && (
            <div className="space-y-6">
              {/* Step Progress */}
              <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2">
                {ASSESSMENT_STEPS.map((step, index) => {
                  const isActive = step.id === currentStep;
                  const isPast = ASSESSMENT_STEPS.findIndex(s => s.id === currentStep) > index;
                  
                  return (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          isActive 
                            ? 'bg-purple-600 text-white' 
                            : isPast 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isPast ? <CheckCircle2 size={16} /> : step.icon}
                        <span className="hidden sm:inline">{step.title}</span>
                      </button>
                      {index < ASSESSMENT_STEPS.length - 1 && (
                        <ChevronRight className="text-gray-300 flex-shrink-0" size={18} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-[400px]"
                >
                  {/* Step 1: Patient Selection */}
                  {currentStep === 'patient' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <User size={20} />
                          Select Patient
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Search and select the patient for substance use assessment
                        </p>
                      </div>

                      <div className="max-w-xl">
                        <PatientSelector
                          value={selectedPatientId}
                          onChange={handlePatientSelect}
                          placeholder="Search patient by name or hospital number..."
                        />
                      </div>

                      {selectedPatient && (
                        <div className="bg-white border rounded-lg p-4 max-w-xl">
                          <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Name:</span>
                              <span className="ml-2 font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Hospital No:</span>
                              <span className="ml-2 font-medium">{selectedPatient.hospitalNumber}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Age:</span>
                              <span className="ml-2 font-medium">
                                {differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth))} years
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Gender:</span>
                              <span className="ml-2 font-medium capitalize">{selectedPatient.gender}</span>
                            </div>
                          </div>

                          {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <span className="text-sm text-gray-500">Chronic Conditions:</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selectedPatient.chronicConditions.map((condition, i) => (
                                  <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                                    {condition}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Exclusion Criteria Check */}
                      {selectedPatientId && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-xl">
                          <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} />
                            Exclusion Criteria Check
                          </h4>
                          <div className="space-y-3">
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={formData.exclusionCriteria.isPregnant}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  exclusionCriteria: { ...prev.exclusionCriteria, isPregnant: e.target.checked }
                                }))}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                              />
                              <span className="text-sm text-amber-700">Patient is pregnant</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={formData.exclusionCriteria.isPediatric}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  exclusionCriteria: { ...prev.exclusionCriteria, isPediatric: e.target.checked }
                                }))}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                              />
                              <span className="text-sm text-amber-700">Patient is under 18 years</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={formData.exclusionCriteria.hasSeverePsychiatricIllness}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  exclusionCriteria: { ...prev.exclusionCriteria, hasSeverePsychiatricIllness: e.target.checked }
                                }))}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                              />
                              <span className="text-sm text-amber-700">Severe psychiatric illness requiring specialist care</span>
                            </label>
                          </div>
                          
                          {(formData.exclusionCriteria.isPregnant || formData.exclusionCriteria.isPediatric || formData.exclusionCriteria.hasSeverePsychiatricIllness) && (
                            <div className="mt-3 p-3 bg-amber-100 rounded text-sm text-amber-800">
                              <strong>⚠️ Specialist referral may be required.</strong> This assessment module has limited applicability for patients meeting exclusion criteria.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Patient Context */}
                  {currentStep === 'context' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <Users size={20} />
                          Patient Context & Social Factors
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Capture demographic information and social determinants that affect treatment
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Demographics */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Demographics</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                            <input
                              type="number"
                              value={formData.demographics.weight || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                demographics: { ...prev.demographics, weight: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g., 70"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                            <input
                              type="text"
                              value={formData.demographics.occupation}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                demographics: { ...prev.demographics, occupation: e.target.value }
                              }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g., Teacher, Trader, Student"
                            />
                          </div>
                        </div>

                        {/* Social Factors */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Social Factors</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Housing Stability</label>
                            <select
                              value={formData.socialFactors.housingStability}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                socialFactors: { ...prev.socialFactors, housingStability: e.target.value as 'stable' | 'unstable' | 'homeless' }
                              }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Housing stability"
                            >
                              <option value="stable">Stable housing</option>
                              <option value="unstable">Unstable housing</option>
                              <option value="homeless">Homeless</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                            <select
                              value={formData.socialFactors.employmentStatus}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                socialFactors: { ...prev.socialFactors, employmentStatus: e.target.value as 'employed' | 'unemployed' | 'retired' | 'student' | 'disabled' }
                              }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Employment status"
                            >
                              <option value="employed">Employed</option>
                              <option value="unemployed">Unemployed</option>
                              <option value="retired">Retired</option>
                              <option value="student">Student</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Family Support Level</label>
                            <select
                              value={formData.socialFactors.familySupportLevel}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                socialFactors: { ...prev.socialFactors, familySupportLevel: e.target.value as 'strong' | 'moderate' | 'minimal' | 'none' }
                              }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Family support level"
                            >
                              <option value="strong">Strong support</option>
                              <option value="moderate">Moderate support</option>
                              <option value="minimal">Minimal support</option>
                              <option value="none">No support</option>
                            </select>
                          </div>
                          
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={formData.socialFactors.legalIssues}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                socialFactors: { ...prev.socialFactors, legalIssues: e.target.checked }
                              }))}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Has legal issues related to substance use</span>
                          </label>
                        </div>
                      </div>

                      {/* Previous Detox and Psychiatric History */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Previous Detoxification Attempts</h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Previous Attempts</label>
                            <input
                              type="number"
                              min={0}
                              value={formData.previousDetoxAttempts}
                              onChange={(e) => setFormData(prev => ({ ...prev, previousDetoxAttempts: parseInt(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Details (optional)</label>
                            <textarea
                              value={formData.previousDetoxDetails}
                              onChange={(e) => setFormData(prev => ({ ...prev, previousDetoxDetails: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              rows={3}
                              placeholder="Previous treatment settings, outcomes, etc."
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Psychiatric History</h4>
                          <div className="space-y-2">
                            {['Depression', 'Anxiety disorder', 'Bipolar disorder', 'Schizophrenia', 'PTSD', 'Personality disorder'].map(condition => (
                              <label key={condition} className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={formData.psychiatricHistory.includes(condition)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({ ...prev, psychiatricHistory: [...prev.psychiatricHistory, condition] }));
                                    } else {
                                      setFormData(prev => ({ ...prev, psychiatricHistory: prev.psychiatricHistory.filter(c => c !== condition) }));
                                    }
                                  }}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">{condition}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Substance Intake */}
                  {currentStep === 'substances' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <Pill size={20} />
                          Substance Intake Assessment
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Document all substances used by the patient. The first substance added will be marked as primary.
                        </p>
                      </div>

                      {/* Add Substance Form */}
                      <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
                        <h4 className="font-medium text-gray-900">Add Substance</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                              value={currentSubstance.substanceCategory}
                              onChange={(e) => setCurrentSubstance(prev => ({ 
                                ...prev, 
                                substanceCategory: e.target.value as SubstanceCategory,
                                substanceName: '' 
                              }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Substance category"
                            >
                              {SUBSTANCE_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Substance Name</label>
                            <select
                              value={currentSubstance.substanceName}
                              onChange={(e) => setCurrentSubstance(prev => ({ ...prev, substanceName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Substance name"
                            >
                              <option value="">Select substance...</option>
                              {COMMON_SUBSTANCES[currentSubstance.substanceCategory || 'opioids'].map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                              <option value="other">Other (specify)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration of Use (months)</label>
                            <input
                              type="number"
                              min={0}
                              value={currentSubstance.durationOfUseMonths || ''}
                              onChange={(e) => setCurrentSubstance(prev => ({ ...prev, durationOfUseMonths: parseInt(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g., 12"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Average Daily Dose</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={currentSubstance.averageDailyDose || ''}
                                onChange={(e) => setCurrentSubstance(prev => ({ ...prev, averageDailyDose: e.target.value }))}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., 60"
                              />
                              <input
                                type="text"
                                value={currentSubstance.doseUnit || 'mg'}
                                onChange={(e) => setCurrentSubstance(prev => ({ ...prev, doseUnit: e.target.value }))}
                                className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="unit"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Route of Administration</label>
                            <select
                              value={currentSubstance.routeOfAdministration}
                              onChange={(e) => setCurrentSubstance(prev => ({ ...prev, routeOfAdministration: e.target.value as RouteOfAdministration }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Route of administration"
                            >
                              {ROUTES_OF_ADMINISTRATION.map(route => (
                                <option key={route.value} value={route.value}>{route.label}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Pattern</label>
                            <select
                              value={currentSubstance.escalationPattern}
                              onChange={(e) => setCurrentSubstance(prev => ({ ...prev, escalationPattern: e.target.value as 'stable' | 'increasing' | 'decreasing' | 'erratic' }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                              title="Escalation pattern"
                            >
                              <option value="stable">Stable</option>
                              <option value="increasing">Increasing</option>
                              <option value="decreasing">Decreasing</option>
                              <option value="erratic">Erratic</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency per Day</label>
                            <input
                              type="number"
                              min={1}
                              value={currentSubstance.frequencyPerDay || 1}
                              onChange={(e) => setCurrentSubstance(prev => ({ ...prev, frequencyPerDay: parseInt(e.target.value) || 1 }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Use Date/Time</label>
                            <input
                              type="datetime-local"
                              value={currentSubstance.lastUseDateTime ? format(new Date(currentSubstance.lastUseDateTime), "yyyy-MM-dd'T'HH:mm") : ''}
                              onChange={(e) => setCurrentSubstance(prev => ({ ...prev, lastUseDateTime: new Date(e.target.value) }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={handleAddSubstance}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Add Substance
                        </button>
                      </div>

                      {/* Added Substances List */}
                      {formData.substances.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Added Substances ({formData.substances.length})</h4>
                          {formData.substances.map((substance, index) => (
                            <div
                              key={substance.id}
                              className={`flex items-start gap-4 p-4 rounded-lg border ${
                                substance.isPrimaryConcern ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Pill size={18} className="text-purple-600" />
                                  <span className="font-medium">{substance.substanceName}</span>
                                  {substance.isPrimaryConcern && (
                                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">Primary</span>
                                  )}
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                                    {substance.substanceCategory}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-500">
                                  <div>Duration: {substance.durationOfUseMonths} months</div>
                                  <div>Dose: {substance.averageDailyDose} {substance.doseUnit}/day</div>
                                  <div>Route: {substance.routeOfAdministration}</div>
                                  <div>Pattern: {substance.escalationPattern}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!substance.isPrimaryConcern && (
                                  <button
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        substances: prev.substances.map(s => ({
                                          ...s,
                                          isPrimaryConcern: s.id === substance.id
                                        }))
                                      }));
                                    }}
                                    className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded"
                                  >
                                    Set Primary
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveSubstance(substance.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                                  title="Remove substance"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Severity Scoring */}
                  {currentStep === 'scoring' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <Activity size={20} />
                          Addiction Severity Scoring
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Rate each dimension from 0 (none) to 4 (extreme) based on clinical assessment
                        </p>
                      </div>

                      {/* Live Score Summary */}
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm opacity-80">Composite Severity Score</div>
                            <div className="text-3xl font-bold">{addictionScore.totalCompositeScore}/88</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm opacity-80">Severity Level</div>
                            <div className="text-xl font-semibold capitalize">{addictionScore.severityLevel}</div>
                          </div>
                        </div>
                        <p className="mt-2 text-sm opacity-90">{addictionScore.interpretationNotes}</p>
                      </div>

                      {/* Scoring Sections */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Physical Dependence */}
                        <div className="bg-white border rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <Heart className="text-red-500" size={18} />
                            Physical Dependence
                            <span className="ml-auto text-sm text-gray-500">
                              {formData.physicalDependence.tolerance + formData.physicalDependence.withdrawalSymptoms + 
                               formData.physicalDependence.compulsiveUse + formData.physicalDependence.physicalCravings}/16
                            </span>
                          </h4>
                          <ScoreSlider
                            label="Tolerance"
                            value={formData.physicalDependence.tolerance}
                            onChange={(val) => setFormData(prev => ({ ...prev, physicalDependence: { ...prev.physicalDependence, tolerance: val } }))}
                            description="Need for increased amounts to achieve effect"
                          />
                          <ScoreSlider
                            label="Withdrawal Symptoms"
                            value={formData.physicalDependence.withdrawalSymptoms}
                            onChange={(val) => setFormData(prev => ({ ...prev, physicalDependence: { ...prev.physicalDependence, withdrawalSymptoms: val } }))}
                            description="Physical symptoms when not using"
                          />
                          <ScoreSlider
                            label="Compulsive Use"
                            value={formData.physicalDependence.compulsiveUse}
                            onChange={(val) => setFormData(prev => ({ ...prev, physicalDependence: { ...prev.physicalDependence, compulsiveUse: val } }))}
                            description="Using more than intended"
                          />
                          <ScoreSlider
                            label="Physical Cravings"
                            value={formData.physicalDependence.physicalCravings}
                            onChange={(val) => setFormData(prev => ({ ...prev, physicalDependence: { ...prev.physicalDependence, physicalCravings: val } }))}
                            description="Intense physical urges to use"
                          />
                        </div>

                        {/* Psychological Dependence */}
                        <div className="bg-white border rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <Brain className="text-purple-500" size={18} />
                            Psychological Dependence
                            <span className="ml-auto text-sm text-gray-500">
                              {formData.psychologicalDependence.emotionalReliance + formData.psychologicalDependence.copingMechanism + 
                               formData.psychologicalDependence.preoccupation + formData.psychologicalDependence.anxietyWithoutSubstance}/16
                            </span>
                          </h4>
                          <ScoreSlider
                            label="Emotional Reliance"
                            value={formData.psychologicalDependence.emotionalReliance}
                            onChange={(val) => setFormData(prev => ({ ...prev, psychologicalDependence: { ...prev.psychologicalDependence, emotionalReliance: val } }))}
                            description="Using to cope with emotions"
                          />
                          <ScoreSlider
                            label="Coping Mechanism"
                            value={formData.psychologicalDependence.copingMechanism}
                            onChange={(val) => setFormData(prev => ({ ...prev, psychologicalDependence: { ...prev.psychologicalDependence, copingMechanism: val } }))}
                            description="Substance as primary coping strategy"
                          />
                          <ScoreSlider
                            label="Preoccupation"
                            value={formData.psychologicalDependence.preoccupation}
                            onChange={(val) => setFormData(prev => ({ ...prev, psychologicalDependence: { ...prev.psychologicalDependence, preoccupation: val } }))}
                            description="Constant thoughts about the substance"
                          />
                          <ScoreSlider
                            label="Anxiety Without Substance"
                            value={formData.psychologicalDependence.anxietyWithoutSubstance}
                            onChange={(val) => setFormData(prev => ({ ...prev, psychologicalDependence: { ...prev.psychologicalDependence, anxietyWithoutSubstance: val } }))}
                            description="Distress when unable to use"
                          />
                        </div>

                        {/* Behavioral Dysfunction */}
                        <div className="bg-white border rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <AlertCircle className="text-orange-500" size={18} />
                            Behavioral Dysfunction
                            <span className="ml-auto text-sm text-gray-500">
                              {formData.behavioralDysfunction.prioritizingSubstance + formData.behavioralDysfunction.failedAttemptsToCut + 
                               formData.behavioralDysfunction.timeSpentObtaining + formData.behavioralDysfunction.givingUpActivities}/16
                            </span>
                          </h4>
                          <ScoreSlider
                            label="Prioritizing Substance"
                            value={formData.behavioralDysfunction.prioritizingSubstance}
                            onChange={(val) => setFormData(prev => ({ ...prev, behavioralDysfunction: { ...prev.behavioralDysfunction, prioritizingSubstance: val } }))}
                            description="Choosing substance over other responsibilities"
                          />
                          <ScoreSlider
                            label="Failed Attempts to Cut Down"
                            value={formData.behavioralDysfunction.failedAttemptsToCut}
                            onChange={(val) => setFormData(prev => ({ ...prev, behavioralDysfunction: { ...prev.behavioralDysfunction, failedAttemptsToCut: val } }))}
                            description="Unsuccessful efforts to control use"
                          />
                          <ScoreSlider
                            label="Time Spent Obtaining"
                            value={formData.behavioralDysfunction.timeSpentObtaining}
                            onChange={(val) => setFormData(prev => ({ ...prev, behavioralDysfunction: { ...prev.behavioralDysfunction, timeSpentObtaining: val } }))}
                            description="Significant time getting/using/recovering"
                          />
                          <ScoreSlider
                            label="Giving Up Activities"
                            value={formData.behavioralDysfunction.givingUpActivities}
                            onChange={(val) => setFormData(prev => ({ ...prev, behavioralDysfunction: { ...prev.behavioralDysfunction, givingUpActivities: val } }))}
                            description="Abandoning hobbies, social activities"
                          />
                        </div>

                        {/* Social Impairment */}
                        <div className="bg-white border rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <Users className="text-blue-500" size={18} />
                            Social Impairment
                            <span className="ml-auto text-sm text-gray-500">
                              {formData.socialImpairment.occupationalImpact + formData.socialImpairment.relationshipImpact + 
                               formData.socialImpairment.financialImpact + formData.socialImpairment.legalIssues}/16
                            </span>
                          </h4>
                          <ScoreSlider
                            label="Occupational Impact"
                            value={formData.socialImpairment.occupationalImpact}
                            onChange={(val) => setFormData(prev => ({ ...prev, socialImpairment: { ...prev.socialImpairment, occupationalImpact: val } }))}
                            description="Effect on work/school performance"
                          />
                          <ScoreSlider
                            label="Relationship Impact"
                            value={formData.socialImpairment.relationshipImpact}
                            onChange={(val) => setFormData(prev => ({ ...prev, socialImpairment: { ...prev.socialImpairment, relationshipImpact: val } }))}
                            description="Damage to personal relationships"
                          />
                          <ScoreSlider
                            label="Financial Impact"
                            value={formData.socialImpairment.financialImpact}
                            onChange={(val) => setFormData(prev => ({ ...prev, socialImpairment: { ...prev.socialImpairment, financialImpact: val } }))}
                            description="Financial problems from substance use"
                          />
                          <ScoreSlider
                            label="Legal Issues"
                            value={formData.socialImpairment.legalIssues}
                            onChange={(val) => setFormData(prev => ({ ...prev, socialImpairment: { ...prev.socialImpairment, legalIssues: val } }))}
                            description="Legal problems from substance use"
                          />
                        </div>
                      </div>

                      {/* Medical Complications */}
                      <div className="bg-white border rounded-lg p-4 space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Shield className="text-red-600" size={18} />
                          Medical Complications
                          <span className="ml-auto text-sm text-gray-500">
                            {Object.values(formData.medicalComplications).reduce((a, b) => a + b, 0)}/24
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <ScoreSlider
                            label="Liver Dysfunction"
                            value={formData.medicalComplications.liverDysfunction}
                            onChange={(val) => setFormData(prev => ({ ...prev, medicalComplications: { ...prev.medicalComplications, liverDysfunction: val } }))}
                          />
                          <ScoreSlider
                            label="Renal Dysfunction"
                            value={formData.medicalComplications.renalDysfunction}
                            onChange={(val) => setFormData(prev => ({ ...prev, medicalComplications: { ...prev.medicalComplications, renalDysfunction: val } }))}
                          />
                          <ScoreSlider
                            label="Cardiac Complications"
                            value={formData.medicalComplications.cardiacComplications}
                            onChange={(val) => setFormData(prev => ({ ...prev, medicalComplications: { ...prev.medicalComplications, cardiacComplications: val } }))}
                          />
                          <ScoreSlider
                            label="Neurological Complications"
                            value={formData.medicalComplications.neurologicalComplications}
                            onChange={(val) => setFormData(prev => ({ ...prev, medicalComplications: { ...prev.medicalComplications, neurologicalComplications: val } }))}
                          />
                          <ScoreSlider
                            label="Infectious Complications"
                            value={formData.medicalComplications.infectiousComplications}
                            onChange={(val) => setFormData(prev => ({ ...prev, medicalComplications: { ...prev.medicalComplications, infectiousComplications: val } }))}
                          />
                          <ScoreSlider
                            label="Psychiatric Comorbidity"
                            value={formData.medicalComplications.psychiatricComorbidity}
                            onChange={(val) => setFormData(prev => ({ ...prev, medicalComplications: { ...prev.medicalComplications, psychiatricComorbidity: val } }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Withdrawal Risk */}
                  {currentStep === 'withdrawal' && withdrawalRisk && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <AlertTriangle size={20} />
                          Withdrawal Risk Prediction
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Predicted withdrawal symptoms, timeline, and required monitoring based on substance profile
                        </p>
                      </div>

                      {/* Risk Summary */}
                      <div className={`rounded-lg p-4 border-2 ${
                        withdrawalRisk.overallRisk === 'life_threatening' ? 'border-red-500 bg-red-50' :
                        withdrawalRisk.overallRisk === 'severe' ? 'border-orange-500 bg-orange-50' :
                        withdrawalRisk.overallRisk === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-600">Overall Withdrawal Risk</div>
                            <div className="text-2xl font-bold capitalize mt-1">
                              {withdrawalRisk.overallRisk.replace('_', ' ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-600">Risk Score</div>
                            <div className="text-2xl font-bold">{withdrawalRisk.riskScore}/100</div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm">{withdrawalRisk.timelineDescription}</p>
                      </div>

                      {/* Withdrawal Phases */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="text-blue-500" size={18} />
                            Early Phase Symptoms
                          </h4>
                          <ul className="space-y-2">
                            {withdrawalRisk.earlyPhaseSymptoms.map((symptom, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <ChevronRight className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                                {symptom}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="text-orange-500" size={18} />
                            Peak Phase Symptoms
                          </h4>
                          <ul className="space-y-2">
                            {withdrawalRisk.peakPhaseSymptoms.map((symptom, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <ChevronRight className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
                                {symptom}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <RefreshCw className="text-green-500" size={18} />
                            Late Phase Symptoms
                          </h4>
                          <ul className="space-y-2">
                            {withdrawalRisk.latePhaseSymptoms.map((symptom, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <ChevronRight className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                {symptom}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Red Flag Complications */}
                      {withdrawalRisk.redFlagComplications.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-medium text-red-800 flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} />
                            Red Flag Complications
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {withdrawalRisk.redFlagComplications.map((comp, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-red-700">
                                <XCircle size={16} />
                                {comp}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Monitoring Recommendations</h4>
                          <ul className="space-y-2">
                            {withdrawalRisk.monitoringRecommendations.map((rec, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Pharmacological Support Options</h4>
                          <ul className="space-y-2">
                            {withdrawalRisk.pharmacologicalSupport.map((med, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <Pill className="text-purple-500 flex-shrink-0 mt-0.5" size={16} />
                                {med}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Pain Management */}
                  {currentStep === 'pain' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <Heart size={20} />
                          Pain Management Decision Support
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Alternative analgesic strategies for patients with substance use history
                        </p>
                      </div>

                      {/* Pain Condition Toggle */}
                      <div className="bg-white border rounded-lg p-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.hasPainCondition}
                            onChange={(e) => setFormData(prev => ({ ...prev, hasPainCondition: e.target.checked }))}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="font-medium text-gray-900">Patient has a pain condition requiring management</span>
                        </label>
                      </div>

                      {formData.hasPainCondition && (
                        <>
                          {/* Pain Context Form */}
                          <div className="bg-white border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium text-gray-900">Pain Assessment</h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pain Type</label>
                                <select
                                  value={formData.painContext.painType}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    painContext: { ...prev.painContext, painType: e.target.value as 'nociceptive' | 'neuropathic' | 'mixed' | 'psychogenic' | 'unknown' }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  title="Pain type"
                                >
                                  <option value="nociceptive">Nociceptive</option>
                                  <option value="neuropathic">Neuropathic</option>
                                  <option value="mixed">Mixed</option>
                                  <option value="psychogenic">Psychogenic</option>
                                  <option value="unknown">Unknown</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pain Cause</label>
                                <input
                                  type="text"
                                  value={formData.painContext.painCause}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    painContext: { ...prev.painContext, painCause: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  placeholder="e.g., Sickle Cell Disease, Cancer"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Pain Score (0-10)</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={formData.painContext.currentPainScore}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    painContext: { ...prev.painContext, currentPainScore: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Pain Management Recommendations */}
                          {painManagementSupport && (
                            <div className="space-y-4">
                              {/* High Risk Warnings */}
                              {painManagementSupport.highRiskCombinationsWarning.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <h4 className="font-medium text-red-800 flex items-center gap-2 mb-3">
                                    <AlertTriangle size={18} />
                                    High-Risk Combination Warnings
                                  </h4>
                                  <ul className="space-y-2">
                                    {painManagementSupport.highRiskCombinationsWarning.map((warning, i) => (
                                      <li key={i} className="text-sm text-red-700">{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Primary Options */}
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                  <Pill className="text-green-500" size={18} />
                                  Non-Opioid Primary Options
                                </h4>
                                <div className="space-y-3">
                                  {painManagementSupport.nonOpioidPrimaryOptions.map((option, i) => (
                                    <div key={i} className="p-3 bg-green-50 rounded-lg">
                                      <div className="font-medium text-green-800">{option.recommendation}</div>
                                      <p className="text-sm text-green-700 mt-1">{option.rationale}</p>
                                      {option.cautions.length > 0 && (
                                        <div className="mt-2 text-xs text-amber-700">
                                          <strong>Cautions:</strong> {option.cautions.join(', ')}
                                        </div>
                                      )}
                                      {option.requiresClinicianConfirmation && (
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                                          Requires clinician confirmation
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Adjuvant Therapies */}
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                  <Plus className="text-blue-500" size={18} />
                                  Adjuvant Therapies
                                </h4>
                                <div className="space-y-3">
                                  {painManagementSupport.adjuvantTherapies.map((option, i) => (
                                    <div key={i} className="p-3 bg-blue-50 rounded-lg">
                                      <div className="font-medium text-blue-800">{option.recommendation}</div>
                                      <p className="text-sm text-blue-700 mt-1">{option.rationale}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Non-Pharmacological */}
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                  <Activity className="text-purple-500" size={18} />
                                  Non-Pharmacological Strategies
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {painManagementSupport.nonPharmacologicalStrategies.map((option, i) => (
                                    <div key={i} className="p-3 bg-purple-50 rounded-lg">
                                      <div className="font-medium text-purple-800">{option.recommendation}</div>
                                      <p className="text-sm text-purple-700 mt-1">{option.rationale}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 7: Care Setting */}
                  {currentStep === 'care' && careSettingDecision && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <MapPin size={20} />
                          Care Setting Recommendation
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Recommended care pathway based on clinical assessment
                        </p>
                      </div>

                      {/* Recommendation Card */}
                      <div className={`rounded-xl p-6 border-2 ${
                        careSettingDecision.recommendation === 'icu_hdu_alert' ? 'border-red-500 bg-red-50' :
                        careSettingDecision.recommendation === 'inpatient_admission' ? 'border-orange-500 bg-orange-50' :
                        careSettingDecision.recommendation === 'supervised_outpatient' ? 'border-blue-500 bg-blue-50' :
                        'border-green-500 bg-green-50'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            careSettingDecision.recommendation === 'icu_hdu_alert' ? 'bg-red-200' :
                            careSettingDecision.recommendation === 'inpatient_admission' ? 'bg-orange-200' :
                            careSettingDecision.recommendation === 'supervised_outpatient' ? 'bg-blue-200' :
                            'bg-green-200'
                          }`}>
                            <MapPin size={32} className={
                              careSettingDecision.recommendation === 'icu_hdu_alert' ? 'text-red-700' :
                              careSettingDecision.recommendation === 'inpatient_admission' ? 'text-orange-700' :
                              careSettingDecision.recommendation === 'supervised_outpatient' ? 'text-blue-700' :
                              'text-green-700'
                            } />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600">Recommended Care Setting</div>
                            <div className="text-2xl font-bold">
                              {careSettingDecision.recommendation === 'icu_hdu_alert' && 'ICU/HDU Alert'}
                              {careSettingDecision.recommendation === 'inpatient_admission' && 'Inpatient Admission'}
                              {careSettingDecision.recommendation === 'supervised_outpatient' && 'Supervised Outpatient'}
                              {careSettingDecision.recommendation === 'outpatient_detox' && 'Outpatient Detox'}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Confidence: <span className="font-medium capitalize">{careSettingDecision.confidenceLevel}</span>
                            </div>
                          </div>
                        </div>

                        {/* Trigger Factors */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Trigger Factors</h4>
                          <div className="flex flex-wrap gap-2">
                            {careSettingDecision.triggerFactors.map((factor, i) => (
                              <span key={i} className="px-3 py-1 bg-white rounded-full text-sm shadow-sm">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Supporting Evidence & Escalation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Supporting Evidence</h4>
                          <ul className="space-y-2">
                            {careSettingDecision.supportingEvidence.map((evidence, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                                {evidence}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Escalation Criteria</h4>
                          <ul className="space-y-2">
                            {careSettingDecision.escalationCriteria.map((criteria, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                                {criteria}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Alternative Options */}
                      {careSettingDecision.alternativeOptions.length > 0 && (
                        <div className="bg-gray-50 border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Alternative Care Options</h4>
                          <div className="flex flex-wrap gap-2">
                            {careSettingDecision.alternativeOptions.map((option, i) => (
                              <span key={i} className="px-3 py-1 bg-white border rounded-full text-sm">
                                {option === 'icu_hdu_alert' && 'ICU/HDU'}
                                {option === 'inpatient_admission' && 'Inpatient'}
                                {option === 'supervised_outpatient' && 'Supervised Outpatient'}
                                {option === 'outpatient_detox' && 'Outpatient Detox'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clinician Override Notice */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                          <Edit size={18} />
                          Clinician Override Available
                        </h4>
                        <p className="text-sm text-amber-700">
                          This recommendation can be overridden by the treating clinician based on individual patient factors. 
                          All overrides are logged in the audit trail with documented justification.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 8: Documents */}
                  {currentStep === 'documents' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <FileText size={20} />
                          Documentation Generation
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Generate informed consent, patient education materials, and clinical summary
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Informed Consent */}
                        <div className="bg-white border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <ClipboardList className="text-blue-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Informed Consent</h4>
                              <p className="text-xs text-gray-500">Patient acknowledgment document</p>
                            </div>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>• Diagnosis explanation</li>
                            <li>• Detoxification risks</li>
                            <li>• Withdrawal effects</li>
                            <li>• Monitoring requirements</li>
                          </ul>
                          <button
                            onClick={handleGenerateConsent}
                            className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors"
                          >
                            <Download size={16} />
                            Generate Consent
                          </button>
                        </div>

                        {/* Patient Info Leaflet */}
                        <div className="bg-white border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <FileText className="text-green-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Patient Information</h4>
                              <p className="text-xs text-gray-500">Education leaflet</p>
                            </div>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>• Day-by-day expectations</li>
                            <li>• Warning symptoms</li>
                            <li>• Family involvement</li>
                            <li>• Follow-up schedule</li>
                          </ul>
                          <button
                            onClick={handleGenerateLeaflet}
                            className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2 transition-colors"
                          >
                            <Download size={16} />
                            Generate Leaflet
                          </button>
                        </div>

                        {/* Clinical Summary */}
                        <div className="bg-white border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Activity className="text-purple-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Clinical Summary</h4>
                              <p className="text-xs text-gray-500">Complete assessment report</p>
                            </div>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>• Addiction score</li>
                            <li>• Risk classification</li>
                            <li>• Recommended pathway</li>
                            <li>• Monitoring checklist</li>
                          </ul>
                          <button
                            onClick={handleGenerateSummary}
                            className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center justify-center gap-2 transition-colors"
                          >
                            <Printer size={16} />
                            Generate Summary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 9: Review & Save */}
                  {currentStep === 'review' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                          <CheckCircle2 size={20} />
                          Review & Save Assessment
                        </h3>
                        <p className="text-sm text-purple-600 mt-1">
                          Review all assessment data before saving
                        </p>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-purple-600">{addictionScore.totalCompositeScore}/88</div>
                          <div className="text-sm text-gray-500">Addiction Score</div>
                          <div className="mt-2">{renderSeverityBadge(addictionScore.severityLevel)}</div>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-orange-600">{withdrawalRisk?.riskScore || 0}/100</div>
                          <div className="text-sm text-gray-500">Withdrawal Risk</div>
                          <div className="mt-2">{withdrawalRisk && renderWithdrawalRiskBadge(withdrawalRisk.overallRisk)}</div>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600">{formData.substances.length}</div>
                          <div className="text-sm text-gray-500">Substances</div>
                          <div className="mt-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {formData.substances[0]?.substanceName || 'None'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white border rounded-lg p-4 text-center">
                          <div className="text-lg font-bold text-gray-800 mt-2">
                            {careSettingDecision?.recommendation === 'icu_hdu_alert' && 'ICU/HDU'}
                            {careSettingDecision?.recommendation === 'inpatient_admission' && 'Inpatient'}
                            {careSettingDecision?.recommendation === 'supervised_outpatient' && 'Supervised OP'}
                            {careSettingDecision?.recommendation === 'outpatient_detox' && 'Outpatient'}
                          </div>
                          <div className="text-sm text-gray-500">Care Setting</div>
                          <div className="mt-2">{careSettingDecision && renderCareSettingBadge(careSettingDecision.recommendation)}</div>
                        </div>
                      </div>

                      {/* Patient Summary */}
                      {selectedPatient && (
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Patient</h4>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="text-purple-600" size={24} />
                            </div>
                            <div>
                              <div className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                              <div className="text-sm text-gray-500">
                                {selectedPatient.hospitalNumber} • {formData.demographics.age} years • {formData.demographics.sex}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Validation Checks */}
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Pre-Save Validation</h4>
                        <div className="space-y-2">
                          <div className={`flex items-center gap-2 ${selectedPatientId ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedPatientId ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            Patient selected
                          </div>
                          <div className={`flex items-center gap-2 ${formData.substances.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formData.substances.length > 0 ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            At least one substance documented
                          </div>
                          <div className={`flex items-center gap-2 ${addictionScore.totalCompositeScore > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                            {addictionScore.totalCompositeScore > 0 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            Severity scoring completed
                          </div>
                        </div>
                      </div>

                      {/* Clinical Disclaimer */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                          <AlertTriangle size={18} />
                          Clinical Governance Reminder
                        </h4>
                        <ul className="text-sm text-amber-700 space-y-1">
                          <li>• This assessment provides DECISION SUPPORT only</li>
                          <li>• Final clinical responsibility rests with the licensed clinician</li>
                          <li>• No autonomous prescribing is performed</li>
                          <li>• All data is logged in the audit trail</li>
                          <li>• Clinician override is available for all recommendations</li>
                        </ul>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveAssessment}
                          disabled={!selectedPatientId || formData.substances.length === 0}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                        >
                          <CheckCircle2 size={20} />
                          Save Assessment
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <button
                  onClick={goToPreviousStep}
                  disabled={currentStep === 'patient'}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronUp className="rotate-[-90deg]" size={18} />
                  Previous
                </button>
                
                {currentStep !== 'review' ? (
                  <button
                    onClick={goToNextStep}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    Next
                    <ChevronDown className="rotate-[-90deg]" size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSaveAssessment}
                    disabled={!selectedPatientId || formData.substances.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Complete Assessment
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="text-center py-12 text-gray-500">
              <Activity className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="font-medium">Detox Monitoring Dashboard</p>
              <p className="text-sm mt-1">Track vital signs, withdrawal symptoms, and patient progress</p>
              <p className="text-xs text-gray-400 mt-4">Coming in next release</p>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="font-medium">Substance Use Analytics</p>
              <p className="text-sm mt-1">Population statistics, outcomes, and trends</p>
              <p className="text-xs text-gray-400 mt-4">Coming in next release</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
