/**
 * Discharge Summary Generator Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Auto-generates comprehensive discharge documentation including:
 * - Discharge Summary
 * - Medical Fitness Report
 * - Harmonized Medications (for MDT patients)
 * - All with PDF export
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Pill,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clipboard,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';

// ============================================
// TYPES
// ============================================

export interface Medication {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions?: string;
  prescribedBy?: string;
  specialty?: string;
  reason?: string;
  isHarmonized?: boolean;
  conflicts?: string[];
}

export interface AdmissionDetails {
  admissionDate: Date;
  admissionDiagnosis: string;
  ward: string;
  bed?: string;
  admittingDoctor: string;
  reasonForAdmission: string;
}

export interface DischargeSummaryData {
  patientInfo: {
    name: string;
    hospitalNumber: string;
    age: number;
    gender: 'Male' | 'Female';
    address?: string;
    phone?: string;
    nextOfKin?: string;
    nextOfKinPhone?: string;
  };
  admission: AdmissionDetails;
  diagnosisOnDischarge: string;
  comorbidities: string[];
  proceduresPerformed: string[];
  investigations: { test: string; result: string; date: Date }[];
  treatmentSummary: string;
  clinicalProgress: string;
  conditionOnDischarge: 'Stable' | 'Improved' | 'Unchanged' | 'Deteriorated' | 'Critical';
  dischargeType: 'Normal' | 'On Request' | 'Against Medical Advice' | 'Deceased' | 'Transfer';
  dischargeMedications: Medication[];
  followUpPlan: { clinic: string; date: Date; instructions?: string }[];
  specialInstructions: string[];
  woundCareInstructions?: string;
  dietaryInstructions?: string;
  activityRestrictions?: string;
  warningSymptoms: string[];
  dischargeDoctor: {
    name: string;
    specialty: string;
    license?: string;
  };
  isMDTPatient?: boolean;
  mdtTeamMembers?: { name: string; specialty: string }[];
}

interface Props {
  summaryData: DischargeSummaryData;
  onUpdate?: (data: DischargeSummaryData) => void;
  readOnly?: boolean;
}

// ============================================
// MEDICATION HARMONIZATION UTILITIES
// ============================================

// Known drug interactions to flag
const drugInteractions: Record<string, string[]> = {
  'warfarin': ['aspirin', 'ibuprofen', 'naproxen', 'vitamin k'],
  'aspirin': ['warfarin', 'clopidogrel', 'ibuprofen'],
  'metformin': ['contrast dye', 'alcohol'],
  'lisinopril': ['potassium supplements', 'spironolactone'],
  'atenolol': ['verapamil', 'diltiazem'],
  'amlodipine': ['simvastatin'],
  'digoxin': ['amiodarone', 'verapamil'],
  'omeprazole': ['clopidogrel'],
};

// Drug class duplications to warn about
const drugClasses: Record<string, string[]> = {
  'NSAIDs': ['ibuprofen', 'diclofenac', 'naproxen', 'piroxicam', 'meloxicam'],
  'ACE Inhibitors': ['lisinopril', 'ramipril', 'enalapril', 'perindopril'],
  'Beta Blockers': ['atenolol', 'metoprolol', 'propranolol', 'bisoprolol', 'carvedilol'],
  'Statins': ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'],
  'PPIs': ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole'],
  'Calcium Channel Blockers': ['amlodipine', 'nifedipine', 'verapamil', 'diltiazem'],
};

function harmonizeMedications(medications: Medication[]): { 
  harmonized: Medication[], 
  warnings: string[] 
} {
  const warnings: string[] = [];
  const harmonized: Medication[] = [];
  const seenDrugs: string[] = [];
  const seenClasses: Record<string, Medication> = {};

  medications.forEach(med => {
    const drugLower = med.name.toLowerCase();
    
    // Check for duplicates
    if (seenDrugs.some(d => d === drugLower)) {
      warnings.push(`Duplicate medication detected: ${med.name} (prescribed by ${med.prescribedBy})`);
      return; // Skip duplicate
    }

    // Check for class duplications
    for (const [className, drugs] of Object.entries(drugClasses)) {
      if (drugs.some(d => drugLower.includes(d))) {
        if (seenClasses[className]) {
          warnings.push(
            `Two ${className} prescribed: ${seenClasses[className].name} and ${med.name}. Review needed.`
          );
        } else {
          seenClasses[className] = med;
        }
        break;
      }
    }

    // Check for interactions
    for (const [drug, interactsWith] of Object.entries(drugInteractions)) {
      if (drugLower.includes(drug)) {
        seenDrugs.forEach(seen => {
          if (interactsWith.some(i => seen.includes(i))) {
            warnings.push(`Potential interaction: ${med.name} with ${seen}`);
            med.conflicts = med.conflicts || [];
            med.conflicts.push(seen);
          }
        });
      }
    }

    seenDrugs.push(drugLower);
    harmonized.push({ ...med, isHarmonized: true });
  });

  return { harmonized, warnings };
}

// ============================================
// COMPONENT
// ============================================

export default function DischargeSummaryGenerator({
  summaryData,
  onUpdate: _onUpdate,
  readOnly: _readOnly = false,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'medications']);
  const [_editSection, _setEditSection] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [localData, _setLocalData] = useState(summaryData);

  // Calculate length of stay
  const lengthOfStay = useMemo(() => {
    return differenceInDays(new Date(), localData.admission.admissionDate);
  }, [localData.admission.admissionDate]);

  // Harmonize medications for MDT patients
  const { harmonized: harmonizedMeds, warnings: medWarnings } = useMemo(() => {
    if (localData.isMDTPatient) {
      return harmonizeMedications(localData.dischargeMedications);
    }
    return { harmonized: localData.dischargeMedications, warnings: [] };
  }, [localData.dischargeMedications, localData.isMDTPatient]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Generate Discharge Summary PDF
  const generateDischargeSummaryPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCHARGE SUMMARY', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Confidential Medical Document', pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AstroHEALTH Innovations in Healthcare', pageWidth / 2, 38, { align: 'center' });

    yPos = 55;

    // Patient Details Box
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
    doc.setDrawColor(37, 99, 235);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'S');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', 20, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Name: ${localData.patientInfo.name}`, 20, yPos + 16);
    doc.text(`Hospital No: ${localData.patientInfo.hospitalNumber}`, 110, yPos + 16);
    doc.text(`Age/Gender: ${localData.patientInfo.age} years / ${localData.patientInfo.gender}`, 20, yPos + 23);
    doc.text(`Address: ${localData.patientInfo.address || 'Not documented'}`, 20, yPos + 30);
    yPos += 45;

    // Admission Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ADMISSION DETAILS', 15, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date of Admission: ${format(localData.admission.admissionDate, 'PPP')}`, 20, yPos);
    doc.text(`Date of Discharge: ${format(new Date(), 'PPP')}`, 110, yPos);
    yPos += 6;
    doc.text(`Length of Stay: ${lengthOfStay} days`, 20, yPos);
    doc.text(`Ward/Bed: ${localData.admission.ward}${localData.admission.bed ? `/${localData.admission.bed}` : ''}`, 110, yPos);
    yPos += 6;
    doc.text(`Admitting Doctor: ${localData.admission.admittingDoctor}`, 20, yPos);
    yPos += 10;

    // Diagnoses
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DIAGNOSIS', 15, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Admission Diagnosis: ${localData.admission.admissionDiagnosis}`, 20, yPos);
    yPos += 6;
    doc.text(`Discharge Diagnosis: ${localData.diagnosisOnDischarge}`, 20, yPos);
    yPos += 6;
    if (localData.comorbidities.length > 0) {
      doc.text(`Comorbidities: ${localData.comorbidities.join(', ')}`, 20, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Procedures
    if (localData.proceduresPerformed.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PROCEDURES PERFORMED', 15, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      localData.proceduresPerformed.forEach(proc => {
        doc.text(`• ${proc}`, 20, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Clinical Summary
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CLINICAL SUMMARY', 15, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const treatmentLines = doc.splitTextToSize(localData.treatmentSummary, pageWidth - 40);
    doc.text(treatmentLines, 20, yPos);
    yPos += treatmentLines.length * 4 + 8;

    const progressLines = doc.splitTextToSize(localData.clinicalProgress, pageWidth - 40);
    doc.text(progressLines, 20, yPos);
    yPos += progressLines.length * 4 + 10;

    // Condition on Discharge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const conditionColor = localData.conditionOnDischarge === 'Improved' || localData.conditionOnDischarge === 'Stable' 
      ? [34, 197, 94] : [234, 179, 8];
    doc.setTextColor(conditionColor[0], conditionColor[1], conditionColor[2]);
    doc.text(`CONDITION ON DISCHARGE: ${localData.conditionOnDischarge.toUpperCase()}`, 15, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // Discharge Medications
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DISCHARGE MEDICATIONS', 15, yPos);
    if (localData.isMDTPatient) {
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text('(MDT Harmonized)', 60, yPos);
      doc.setTextColor(0, 0, 0);
    }
    yPos += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Medication', 20, yPos);
    doc.text('Dose', 70, yPos);
    doc.text('Frequency', 95, yPos);
    doc.text('Duration', 130, yPos);
    doc.text('Instructions', 160, yPos);
    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 3;

    doc.setFont('helvetica', 'normal');
    harmonizedMeds.forEach(med => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(med.name.substring(0, 25), 20, yPos);
      doc.text(med.dose, 70, yPos);
      doc.text(med.frequency.substring(0, 15), 95, yPos);
      doc.text(med.duration, 130, yPos);
      doc.text((med.instructions || '').substring(0, 20), 160, yPos);
      yPos += 5;
    });
    yPos += 8;

    // Follow-up Plan
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FOLLOW-UP PLAN', 15, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    localData.followUpPlan.forEach(f => {
      doc.text(`• ${f.clinic}: ${format(f.date, 'PPP')}${f.instructions ? ` - ${f.instructions}` : ''}`, 20, yPos);
      yPos += 5;
    });
    yPos += 5;

    // Warning Symptoms
    if (localData.warningSymptoms.length > 0) {
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(15, yPos, pageWidth - 30, 8 + localData.warningSymptoms.length * 5, 3, 3, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('⚠️ SEEK IMMEDIATE MEDICAL ATTENTION IF:', 20, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      localData.warningSymptoms.forEach((w, i) => {
        doc.text(`• ${w}`, 25, yPos + 12 + i * 5);
      });
      doc.setTextColor(0, 0, 0);
      yPos += 15 + localData.warningSymptoms.length * 5;
    }

    // Signature Section
    if (yPos > 250) {
      doc.addPage();
      yPos = 220;
    } else {
      yPos = Math.max(yPos + 20, 240);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.line(20, yPos, 80, yPos);
    doc.text(localData.dischargeDoctor.name, 25, yPos + 5);
    doc.text(localData.dischargeDoctor.specialty, 25, yPos + 10);
    if (localData.dischargeDoctor.license) {
      doc.text(`Lic: ${localData.dischargeDoctor.license}`, 25, yPos + 15);
    }

    doc.line(120, yPos, 180, yPos);
    doc.text('Date', 145, yPos + 5);
    doc.text(format(new Date(), 'PPP'), 125, yPos + 10);

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('CONFIDENTIAL - For Medical Use Only', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Discharge-Summary-${localData.patientInfo.hospitalNumber}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Generate Medical Fitness Report PDF
  const generateMedicalReportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICAL REPORT OF FITNESS', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text('For Discharge from Inpatient Care', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('AstroHEALTH Innovations in Healthcare', pageWidth / 2, 34, { align: 'center' });

    yPos = 50;

    // Certificate Text
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const intro = `This is to certify that ${localData.patientInfo.name}, ${localData.patientInfo.age} years old (${localData.patientInfo.gender}), Hospital Number ${localData.patientInfo.hospitalNumber}, was admitted to our facility on ${format(localData.admission.admissionDate, 'PPP')}.`;
    
    const introLines = doc.splitTextToSize(intro, pageWidth - 40);
    doc.text(introLines, 20, yPos);
    yPos += introLines.length * 6 + 10;

    // Diagnosis Section
    doc.setFont('helvetica', 'bold');
    doc.text('Diagnosis:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Primary: ${localData.diagnosisOnDischarge}`, 25, yPos);
    yPos += 10;

    // Treatment Summary
    doc.setFont('helvetica', 'bold');
    doc.text('Treatment Received:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const treatmentLines = doc.splitTextToSize(localData.treatmentSummary, pageWidth - 50);
    doc.text(treatmentLines, 25, yPos);
    yPos += treatmentLines.length * 5 + 10;

    // Condition Assessment
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Assessment:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    
    const conditionText = localData.conditionOnDischarge === 'Improved' || localData.conditionOnDischarge === 'Stable'
      ? `The patient has shown satisfactory clinical improvement and is now in ${localData.conditionOnDischarge.toLowerCase()} condition.`
      : `The patient's condition is currently ${localData.conditionOnDischarge.toLowerCase()} at time of discharge.`;
    
    const conditionLines = doc.splitTextToSize(conditionText, pageWidth - 50);
    doc.text(conditionLines, 25, yPos);
    yPos += conditionLines.length * 5 + 10;

    // Fitness Declaration
    const fitColor = localData.conditionOnDischarge === 'Improved' || localData.conditionOnDischarge === 'Stable'
      ? [22, 163, 74] : [234, 179, 8];
    doc.setFillColor(fitColor[0], fitColor[1], fitColor[2]);
    doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    const fitnessText = localData.conditionOnDischarge === 'Improved' || localData.conditionOnDischarge === 'Stable'
      ? 'CERTIFIED FIT FOR DISCHARGE'
      : 'DISCHARGE WITH RESERVATIONS';
    doc.text(fitnessText, pageWidth / 2, yPos + 12, { align: 'center' });
    yPos += 30;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Recommendations
    if (localData.activityRestrictions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Activity Recommendations:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const activityLines = doc.splitTextToSize(localData.activityRestrictions, pageWidth - 50);
      doc.text(activityLines, 25, yPos);
      yPos += activityLines.length * 5 + 10;
    }

    // Follow-up Required
    doc.setFont('helvetica', 'bold');
    doc.text('Follow-up Required:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    localData.followUpPlan.forEach(f => {
      doc.text(`• ${f.clinic}: ${format(f.date, 'PPP')}`, 25, yPos);
      yPos += 5;
    });
    yPos += 15;

    // Signature
    yPos = Math.max(yPos, 220);
    doc.line(20, yPos, 90, yPos);
    doc.setFontSize(9);
    doc.text(localData.dischargeDoctor.name, 25, yPos + 6);
    doc.text(localData.dischargeDoctor.specialty, 25, yPos + 12);
    if (localData.dischargeDoctor.license) {
      doc.text(`Medical License: ${localData.dischargeDoctor.license}`, 25, yPos + 18);
    }

    doc.line(120, yPos, pageWidth - 20, yPos);
    doc.text('Date & Stamp', 145, yPos + 6);
    doc.text(format(new Date(), 'PPP'), 125, yPos + 12);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('This document is valid for medical-legal purposes', pageWidth / 2, 280, { align: 'center' });
    doc.text('AstroHEALTH Innovations in Healthcare - Confidential Medical Document', pageWidth / 2, 286, { align: 'center' });

    doc.save(`Medical-Fitness-Report-${localData.patientInfo.hospitalNumber}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Generate Medications List PDF
  const generateMedicationsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(147, 51, 234);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCHARGE MEDICATIONS', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (localData.isMDTPatient) {
      doc.text('MDT Harmonized Prescriptions', pageWidth / 2, 24, { align: 'center' });
    }
    doc.text('AstroHEALTH Innovations in Healthcare', pageWidth / 2, 31, { align: 'center' });

    yPos = 45;

    // Patient Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Patient: ${localData.patientInfo.name}`, 15, yPos);
    doc.text(`Hospital No: ${localData.patientInfo.hospitalNumber}`, 120, yPos);
    yPos += 6;
    doc.text(`Diagnosis: ${localData.diagnosisOnDischarge}`, 15, yPos);
    yPos += 6;
    doc.text(`Date: ${format(new Date(), 'PPP')}`, 15, yPos);
    yPos += 15;

    // Warnings
    if (medWarnings.length > 0) {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, yPos, pageWidth - 30, 8 + medWarnings.length * 5, 3, 3, 'F');
      doc.setTextColor(146, 64, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠️ MEDICATION REVIEW NOTES:', 20, yPos + 6);
      doc.setFont('helvetica', 'normal');
      medWarnings.forEach((w, i) => {
        doc.text(`• ${w}`, 25, yPos + 12 + i * 5);
      });
      doc.setTextColor(0, 0, 0);
      yPos += 18 + medWarnings.length * 5;
    }

    // Medications Table
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    doc.text('Medication', 20, yPos + 6);
    doc.text('Dose', 70, yPos + 6);
    doc.text('Route', 95, yPos + 6);
    doc.text('Frequency', 115, yPos + 6);
    doc.text('Duration', 145, yPos + 6);
    doc.text('Instructions', 175, yPos + 6);
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    harmonizedMeds.forEach((med, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, yPos - 3, pageWidth - 30, 12, 'F');
      }

      doc.text(med.name.substring(0, 25), 20, yPos + 2);
      doc.text(med.dose, 70, yPos + 2);
      doc.text(med.route, 95, yPos + 2);
      doc.text(med.frequency.substring(0, 12), 115, yPos + 2);
      doc.text(med.duration, 145, yPos + 2);
      doc.text((med.instructions || '-').substring(0, 18), 175, yPos + 2);
      
      if (med.conflicts && med.conflicts.length > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text('⚠️', 17, yPos + 2);
        doc.setTextColor(0, 0, 0);
      }
      
      yPos += 10;
    });

    // Special Instructions
    yPos += 10;
    if (localData.specialInstructions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('IMPORTANT INSTRUCTIONS:', 15, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      localData.specialInstructions.forEach(inst => {
        const lines = doc.splitTextToSize(`• ${inst}`, pageWidth - 40);
        doc.text(lines, 20, yPos);
        yPos += lines.length * 4 + 2;
      });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('Take all medications as prescribed - Contact your doctor if any problems', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Discharge-Medications-${localData.patientInfo.hospitalNumber}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Discharge Documentation</h3>
            <p className="text-xs text-gray-500">
              {localData.isMDTPatient ? 'MDT Patient - Harmonized medications' : 'Standard discharge'}
            </p>
          </div>
        </div>
      </div>

      {/* Patient Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Patient</p>
            <p className="font-medium">{localData.patientInfo.name}</p>
            <p className="text-xs text-gray-500">{localData.patientInfo.hospitalNumber}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Admission</p>
            <p className="font-medium">{format(localData.admission.admissionDate, 'PP')}</p>
            <p className="text-xs text-gray-500">{lengthOfStay} days stay</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Diagnosis</p>
            <p className="font-medium text-sm">{localData.diagnosisOnDischarge}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Condition</p>
            <span className={`px-2 py-1 text-xs rounded-full ${
              localData.conditionOnDischarge === 'Improved' || localData.conditionOnDischarge === 'Stable'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {localData.conditionOnDischarge}
            </span>
          </div>
        </div>
      </div>

      {/* MDT Medication Warnings */}
      {medWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <AlertCircle size={16} />
            <span>Medication Review Notes</span>
          </div>
          <ul className="text-sm text-amber-700 space-y-1">
            {medWarnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Download Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={generateDischargeSummaryPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download size={16} />
          Discharge Summary
        </button>
        <button
          onClick={generateMedicalReportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Fitness Report
        </button>
        <button
          onClick={generateMedicationsPDF}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Download size={16} />
          Medications List
        </button>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-2">
        {/* Discharge Summary Section */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clipboard className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Discharge Summary</span>
            </div>
            {expandedSections.includes('summary') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {expandedSections.includes('summary') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4 bg-white">
                  {/* Admission Details */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Admission Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-gray-500">Ward:</span> {localData.admission.ward}</p>
                      <p><span className="text-gray-500">Admitting Dr:</span> {localData.admission.admittingDoctor}</p>
                      <p><span className="text-gray-500">Reason:</span> {localData.admission.reasonForAdmission}</p>
                    </div>
                  </div>

                  {/* Treatment Summary */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Treatment Summary</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {localData.treatmentSummary}
                    </p>
                  </div>

                  {/* Clinical Progress */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Clinical Progress</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {localData.clinicalProgress}
                    </p>
                  </div>

                  {/* Follow-up */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Follow-up Appointments</h4>
                    <div className="space-y-1">
                      {localData.followUpPlan.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="font-medium">{f.clinic}:</span>
                          <span>{format(f.date, 'PPP')}</span>
                          {f.instructions && <span className="text-gray-500">- {f.instructions}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Medications Section */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('medications')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Pill className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Discharge Medications</span>
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {harmonizedMeds.length} items
              </span>
              {localData.isMDTPatient && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  MDT Harmonized
                </span>
              )}
            </div>
            {expandedSections.includes('medications') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {expandedSections.includes('medications') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-2 bg-white">
                  {harmonizedMeds.map((med, _i) => (
                    <div
                      key={med.id}
                      className={`p-3 rounded-lg border ${
                        med.conflicts && med.conflicts.length > 0
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-gray-600">
                            {med.dose} - {med.route} - {med.frequency}
                          </p>
                          <p className="text-xs text-gray-500">Duration: {med.duration}</p>
                          {med.instructions && (
                            <p className="text-xs text-blue-600 mt-1">{med.instructions}</p>
                          )}
                          {med.prescribedBy && (
                            <p className="text-xs text-gray-400 mt-1">
                              Prescribed by: {med.prescribedBy} ({med.specialty})
                            </p>
                          )}
                          {med.conflicts && med.conflicts.length > 0 && (
                            <p className="text-xs text-amber-700 mt-1">
                              ⚠️ Potential interaction with: {med.conflicts.join(', ')}
                            </p>
                          )}
                        </div>
                        {med.isHarmonized && (
                          <CheckCircle2 size={16} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Warning Symptoms Section */}
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('warnings')}
            className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Warning Symptoms</span>
            </div>
            {expandedSections.includes('warnings') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {expandedSections.includes('warnings') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-red-50">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Seek immediate medical attention if you experience:
                  </p>
                  <ul className="space-y-1">
                    {localData.warningSymptoms.map((symptom, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
