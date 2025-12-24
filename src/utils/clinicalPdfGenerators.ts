// Clinical PDF Generators
// Generates professional clinical documents with CareBridge branding

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  addPatientInfoBox,
  addSectionTitle,
  checkNewPage,
  PDF_COLORS,
  type PDFDocumentInfo,
  type PDFPatientInfo,
} from './pdfUtils';

// ==================== LAB RESULTS PDF ====================

export interface LabTestPDF {
  name: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
  specimen?: string;
}

export interface LabResultPDFOptions {
  requestId: string;
  requestedDate: Date;
  completedDate?: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  requestedBy: string;
  priority: 'routine' | 'urgent' | 'stat';
  category: string;
  tests: LabTestPDF[];
  clinicalInfo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  interpretation?: string;
  performedBy?: string;
  verifiedBy?: string;
}

export function generateLabResultPDF(options: LabResultPDFOptions): void {
  const {
    requestId,
    requestedDate,
    completedDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    requestedBy,
    priority,
    category,
    tests,
    clinicalInfo,
    status,
    interpretation,
    performedBy,
    verifiedBy,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const info: PDFDocumentInfo = {
    title: 'LABORATORY REPORT',
    subtitle: `Lab #${requestId.slice(0, 8).toUpperCase()}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Priority badge
  const priorityColors: Record<string, [number, number, number]> = {
    routine: [34, 197, 94],
    urgent: [234, 179, 8],
    stat: [220, 38, 38],
  };

  doc.setFillColor(...(priorityColors[priority] || PDF_COLORS.gray));
  doc.roundedRect(pageWidth - 40, yPos - 5, 25, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(priority.toUpperCase(), pageWidth - 27.5, yPos, { align: 'center' });

  yPos += 5;

  // Patient information
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 5;

  // Request details
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Category: ${category}`, 20, yPos + 6);
  doc.text(`Requested: ${format(requestedDate, 'MMM d, yyyy h:mm a')}`, 20, yPos + 12);
  doc.text(`Requested By: ${requestedBy}`, pageWidth / 2, yPos + 6);
  if (completedDate) {
    doc.text(`Completed: ${format(completedDate, 'MMM d, yyyy h:mm a')}`, pageWidth / 2, yPos + 12);
  }
  yPos += 25;

  // Clinical information
  if (clinicalInfo) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Info:', 20, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(clinicalInfo.substring(0, 80), 48, yPos + 5);
    yPos += 18;
  }

  // Test results section
  yPos = addSectionTitle(doc, yPos, 'Test Results');
  yPos += 3;

  // Results table header
  const colWidths = [70, 35, 25, 35];
  const cols = ['Test Name', 'Result', 'Unit', 'Reference Range'];
  const startX = 15;

  doc.setFillColor(59, 130, 246);
  doc.rect(startX, yPos, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  let xPos = startX + 3;
  cols.forEach((col, index) => {
    doc.text(col, xPos, yPos + 5);
    xPos += colWidths[index];
  });

  yPos += 10;

  // Results rows
  tests.forEach((test, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(startX, yPos - 2, pageWidth - 30, 8, 'F');
    }

    // Status indicator
    if (test.status && test.status !== 'normal') {
      const statusColors = {
        high: PDF_COLORS.danger,
        low: PDF_COLORS.info,
        critical: PDF_COLORS.danger,
      };
      doc.setFillColor(...(statusColors[test.status] || PDF_COLORS.gray));
      doc.circle(startX + 2, yPos + 2, 1.5, 'F');
    }

    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    xPos = startX + 5;
    doc.text(test.name.substring(0, 35), xPos, yPos + 3);
    xPos += colWidths[0];

    // Result with color coding
    if (test.result) {
      if (test.status === 'high' || test.status === 'critical') {
        doc.setTextColor(...PDF_COLORS.danger);
        doc.setFont('helvetica', 'bold');
      } else if (test.status === 'low') {
        doc.setTextColor(...PDF_COLORS.info);
        doc.setFont('helvetica', 'bold');
      }
      doc.text(test.result, xPos, yPos + 3);
      doc.setTextColor(...PDF_COLORS.dark);
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text('Pending', xPos, yPos + 3);
      doc.setTextColor(...PDF_COLORS.dark);
    }
    xPos += colWidths[1];

    doc.text(test.unit || '', xPos, yPos + 3);
    xPos += colWidths[2];

    doc.setFontSize(7);
    doc.text(test.referenceRange || '', xPos, yPos + 3);

    yPos += 8;
  });

  yPos += 10;

  // Interpretation
  if (interpretation) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Interpretation', 'info');
    yPos += 3;

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(interpretation, pageWidth - 40);
    doc.text(lines, 20, yPos + 6);
    yPos += 25;
  }

  // Signatures
  yPos = checkNewPage(doc, yPos);
  yPos += 10;

  if (performedBy) {
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(`Performed by: ${performedBy}`, 20, yPos);
  }
  if (verifiedBy) {
    doc.text(`Verified by: ${verifiedBy}`, pageWidth / 2, yPos);
  }

  // Footer note
  yPos += 15;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
  doc.setTextColor(...PDF_COLORS.danger);
  doc.setFontSize(6);
  doc.text('This report is for the exclusive use of the referring physician. Clinical correlation is advised.', pageWidth / 2, yPos + 6, { align: 'center' });

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Lab_Report_${patientName}_${format(requestedDate, 'yyyyMMdd')}.pdf`);
}

// ==================== CLINICAL ENCOUNTER PDF ====================

export interface DiagnosisPDF {
  description: string;
  type: 'primary' | 'secondary' | 'differential';
  status: 'suspected' | 'confirmed' | 'ruled_out';
}

export interface ClinicalEncounterPDFOptions {
  encounterId: string;
  encounterDate: Date;
  encounterType: string;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  clinician: string;
  clinicianTitle?: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  physicalExamination?: Record<string, string>;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
    respiratoryRate?: number;
    spo2?: number;
    weight?: number;
  };
  diagnoses: DiagnosisPDF[];
  treatmentPlan?: string;
  notes?: string;
}

export function generateClinicalEncounterPDF(options: ClinicalEncounterPDFOptions): void {
  const {
    encounterId,
    encounterDate,
    encounterType,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    clinician,
    clinicianTitle,
    chiefComplaint,
    historyOfPresentIllness,
    pastMedicalHistory,
    pastSurgicalHistory,
    familyHistory,
    socialHistory,
    physicalExamination,
    vitals,
    diagnoses,
    treatmentPlan,
    notes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const info: PDFDocumentInfo = {
    title: 'CLINICAL ENCOUNTER',
    subtitle: `${encounterType} - ${format(encounterDate, 'MMM d, yyyy')}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);
  yPos += 5;

  // Patient information
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 8;

  // Chief Complaint
  yPos = addSectionTitle(doc, yPos, 'Chief Complaint', 'warning');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(chiefComplaint, 20, yPos + 3);
  yPos += 10;

  // Vitals if available
  if (vitals && Object.keys(vitals).length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Vital Signs');
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.dark);
    
    let vitalX = 20;
    if (vitals.bloodPressure) {
      doc.text(`BP: ${vitals.bloodPressure}`, vitalX, yPos + 7);
      vitalX += 35;
    }
    if (vitals.pulse) {
      doc.text(`HR: ${vitals.pulse}/min`, vitalX, yPos + 7);
      vitalX += 30;
    }
    if (vitals.temperature) {
      doc.text(`Temp: ${vitals.temperature}°C`, vitalX, yPos + 7);
      vitalX += 30;
    }
    if (vitals.respiratoryRate) {
      doc.text(`RR: ${vitals.respiratoryRate}/min`, vitalX, yPos + 7);
      vitalX += 30;
    }
    if (vitals.spo2) {
      doc.text(`SpO2: ${vitals.spo2}%`, vitalX, yPos + 7);
    }
    yPos += 18;
  }

  // History of Present Illness
  if (historyOfPresentIllness) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'History of Present Illness');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const hpiLines = doc.splitTextToSize(historyOfPresentIllness, pageWidth - 40);
    doc.text(hpiLines, 20, yPos + 3);
    yPos += hpiLines.length * 4 + 8;
  }

  // Past histories in columns
  if (pastMedicalHistory || pastSurgicalHistory) {
    yPos = checkNewPage(doc, yPos);
    const halfWidth = (pageWidth - 40) / 2;
    
    if (pastMedicalHistory) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text('Past Medical History', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      const pmhLines = doc.splitTextToSize(pastMedicalHistory, halfWidth - 5);
      doc.text(pmhLines, 20, yPos + 5);
    }
    
    if (pastSurgicalHistory) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text('Past Surgical History', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      const pshLines = doc.splitTextToSize(pastSurgicalHistory, halfWidth - 5);
      doc.text(pshLines, pageWidth / 2 + 5, yPos + 5);
    }
    yPos += 20;
  }

  // Physical Examination
  if (physicalExamination && Object.keys(physicalExamination).length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Physical Examination');
    
    Object.entries(physicalExamination).forEach(([system, findings]) => {
      if (findings) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text(`${system}:`, 20, yPos + 3);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.dark);
        doc.text(findings.substring(0, 80), 55, yPos + 3);
        yPos += 6;
      }
    });
    yPos += 5;
  }

  // Diagnoses
  if (diagnoses.length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Diagnoses', 'danger');
    
    diagnoses.forEach((dx, index) => {
      const typeColors = {
        primary: PDF_COLORS.danger,
        secondary: PDF_COLORS.warning,
        differential: PDF_COLORS.info,
      };
      
      doc.setFillColor(...(typeColors[dx.type] || PDF_COLORS.gray));
      doc.circle(20, yPos + 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      doc.text(`${dx.description} (${dx.type})`, 25, yPos + 3);
      
      doc.setFontSize(7);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(`[${dx.status}]`, pageWidth - 30, yPos + 3);
      
      yPos += 7;
    });
    yPos += 5;
  }

  // Treatment Plan
  if (treatmentPlan) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Treatment Plan', 'success');
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.dark);
    const planLines = doc.splitTextToSize(treatmentPlan, pageWidth - 40);
    doc.text(planLines, 20, yPos + 5);
    yPos += 25;
  }

  // Clinician signature
  yPos = checkNewPage(doc, yPos);
  yPos += 15;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(clinician, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(clinicianTitle || 'Attending Physician', pageWidth - 47.5, yPos + 12, { align: 'center' });

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Clinical_Encounter_${patientName}_${format(encounterDate, 'yyyyMMdd')}.pdf`);
}

// ==================== WOUND ASSESSMENT PDF ====================

export interface WoundAssessmentPDFOptions {
  woundId: string;
  assessmentDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  assessedBy: string;
  woundType: string;
  location: string;
  etiology: string;
  dimensions: {
    length: number;
    width: number;
    depth?: number;
    area?: number;
  };
  phase: string;
  tissueTypes: string[];
  exudateAmount: string;
  exudateType?: string;
  odor: boolean;
  periWoundCondition?: string;
  painLevel: number;
  dressingType?: string;
  dressingFrequency?: string;
  protocol?: string[];
  healingProgress?: 'improving' | 'static' | 'deteriorating';
  notes?: string;
}

export function generateWoundAssessmentPDF(options: WoundAssessmentPDFOptions): void {
  const {
    woundId,
    assessmentDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    assessedBy,
    woundType,
    location,
    etiology,
    dimensions,
    phase,
    tissueTypes,
    exudateAmount,
    exudateType,
    odor,
    periWoundCondition,
    painLevel,
    dressingType,
    dressingFrequency,
    protocol,
    healingProgress,
    notes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const info: PDFDocumentInfo = {
    title: 'WOUND ASSESSMENT',
    subtitle: `Assessment #${woundId.slice(0, 8).toUpperCase()}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Progress indicator
  const progressColors = {
    improving: PDF_COLORS.success,
    static: PDF_COLORS.warning,
    deteriorating: PDF_COLORS.danger,
  };

  if (healingProgress) {
    doc.setFillColor(...(progressColors[healingProgress] || PDF_COLORS.gray));
    doc.roundedRect(pageWidth - 45, yPos - 5, 30, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(healingProgress.toUpperCase(), pageWidth - 30, yPos, { align: 'center' });
  }

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 8;

  // Wound details box
  yPos = addSectionTitle(doc, yPos, 'Wound Details');
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Type:', 20, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(woundType, 35, yPos + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Location:', 80, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(location, 100, yPos + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Etiology:', 20, yPos + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(etiology, 42, yPos + 13);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Phase:', 80, yPos + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(phase, 96, yPos + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Assessment Date:', 20, yPos + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(format(assessmentDate, 'MMM d, yyyy h:mm a'), 55, yPos + 20);

  yPos += 32;

  // Dimensions box
  yPos = addSectionTitle(doc, yPos, 'Wound Dimensions');
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(`${dimensions.length} cm`, 35, yPos + 8);
  doc.text('×', 52, yPos + 8);
  doc.text(`${dimensions.width} cm`, 60, yPos + 8);
  if (dimensions.depth) {
    doc.text('×', 77, yPos + 8);
    doc.text(`${dimensions.depth} cm`, 85, yPos + 8);
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('(L × W × D)', 35, yPos + 13);
  
  const area = dimensions.area || dimensions.length * dimensions.width;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.text(`Area: ${area.toFixed(2)} cm²`, pageWidth - 50, yPos + 10);

  yPos += 25;

  // Wound characteristics
  yPos = addSectionTitle(doc, yPos, 'Wound Characteristics');
  
  const charData = [
    ['Tissue Types', tissueTypes.join(', ')],
    ['Exudate Amount', exudateAmount],
    ['Exudate Type', exudateType || 'N/A'],
    ['Odor', odor ? 'Present' : 'None'],
    ['Peri-wound', periWoundCondition || 'Normal'],
    ['Pain Level', `${painLevel}/10`],
  ];

  charData.forEach(([label, value], index) => {
    const xOffset = (index % 2) * (pageWidth / 2 - 10);
    const yOffset = Math.floor(index / 2) * 8;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(`${label}:`, 20 + xOffset, yPos + yOffset);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(value.substring(0, 30), 55 + xOffset, yPos + yOffset);
  });

  yPos += 30;

  // Treatment Protocol
  if (protocol && protocol.length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Dressing Protocol', 'success');
    
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, yPos, pageWidth - 30, protocol.length * 6 + 10, 2, 2, 'F');
    
    protocol.forEach((step, index) => {
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.success);
      doc.text(`${index + 1}.`, 20, yPos + 6 + index * 6);
      doc.setTextColor(...PDF_COLORS.dark);
      doc.text(step, 28, yPos + 6 + index * 6);
    });
    
    yPos += protocol.length * 6 + 15;
  }

  // Dressing info
  if (dressingType || dressingFrequency) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Current Dressing:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${dressingType || 'Standard'} - ${dressingFrequency || 'As needed'}`, 55, yPos);
    yPos += 10;
  }

  // Signature
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(assessedBy, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Wound Care Specialist', pageWidth - 47.5, yPos + 12, { align: 'center' });

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Wound_Assessment_${patientName}_${format(assessmentDate, 'yyyyMMdd')}.pdf`);
}

// ==================== BURNS ASSESSMENT PDF ====================

export interface BurnsAssessmentPDFOptions {
  assessmentId: string;
  assessmentDate: Date;
  injuryDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  assessedBy: string;
  burnType: string;
  mechanism: string;
  tbsa: number;
  affectedAreas: { name: string; percent: number; depth: string }[];
  patientWeight: number;
  fluidRequirement?: {
    total24hr: number;
    first8hr: number;
    next16hr: number;
    hourlyRate: number;
  };
  inhalationInjury: boolean;
  absiScore?: number;
  survivalProbability?: string;
  tetanusStatus: boolean;
  associatedInjuries?: string;
  notes?: string;
}

export function generateBurnsAssessmentPDF(options: BurnsAssessmentPDFOptions): void {
  const {
    assessmentId,
    assessmentDate,
    injuryDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    assessedBy,
    burnType,
    mechanism,
    tbsa,
    affectedAreas,
    patientWeight,
    fluidRequirement,
    inhalationInjury,
    absiScore,
    survivalProbability,
    tetanusStatus,
    associatedInjuries,
    notes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const info: PDFDocumentInfo = {
    title: 'BURNS ASSESSMENT',
    subtitle: `Assessment #${assessmentId.slice(0, 8).toUpperCase()}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // TBSA highlight
  const tbsaColor = tbsa >= 20 ? PDF_COLORS.danger : tbsa >= 10 ? PDF_COLORS.warning : PDF_COLORS.success;
  doc.setFillColor(...tbsaColor);
  doc.roundedRect(pageWidth - 50, yPos - 8, 35, 15, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tbsa}% TBSA`, pageWidth - 32.5, yPos + 2, { align: 'center' });

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 8;

  // Burn details
  yPos = addSectionTitle(doc, yPos, 'Burn Details', 'danger');
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Type:', 20, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(burnType, 35, yPos + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Mechanism:', 80, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(mechanism.substring(0, 30), 105, yPos + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Time of Injury:', 20, yPos + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(format(injuryDate, 'MMM d, yyyy h:mm a'), 52, yPos + 13);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Weight:', 130, yPos + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patientWeight} kg`, 148, yPos + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Inhalation Injury:', 20, yPos + 20);
  const inhalationColor = inhalationInjury ? PDF_COLORS.danger : PDF_COLORS.success;
  doc.setTextColor(inhalationColor[0], inhalationColor[1], inhalationColor[2]);
  doc.text(inhalationInjury ? 'YES - Suspected' : 'No', 55, yPos + 20);
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Tetanus:', 100, yPos + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(tetanusStatus ? 'Up to date' : 'Needs vaccination', 118, yPos + 20);

  yPos += 32;

  // Affected areas table
  yPos = addSectionTitle(doc, yPos, 'Affected Body Areas');
  
  // Table header
  doc.setFillColor(220, 38, 38);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Body Area', 20, yPos + 5);
  doc.text('TBSA %', 100, yPos + 5);
  doc.text('Burn Depth', 140, yPos + 5);
  yPos += 10;

  affectedAreas.forEach((area, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(254, 242, 242);
      doc.rect(15, yPos - 2, pageWidth - 30, 7, 'F');
    }
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(area.name, 20, yPos + 3);
    doc.text(`${area.percent}%`, 100, yPos + 3);
    doc.text(area.depth, 140, yPos + 3);
    yPos += 7;
  });

  yPos += 10;

  // Fluid resuscitation (Parkland Formula)
  if (fluidRequirement) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Fluid Resuscitation (Parkland Formula)', 'info');
    
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('4 × Weight × TBSA = Total 24hr Requirement', 20, yPos + 8);
    
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(`4 × ${patientWeight}kg × ${tbsa}% = ${fluidRequirement.total24hr.toLocaleString()} mL`, 20, yPos + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`First 8 hours: ${fluidRequirement.first8hr.toLocaleString()} mL (${fluidRequirement.hourlyRate.toFixed(0)} mL/hr)`, 20, yPos + 22);
    doc.text(`Next 16 hours: ${fluidRequirement.next16hr.toLocaleString()} mL (${(fluidRequirement.next16hr / 16).toFixed(0)} mL/hr)`, 100, yPos + 22);
    
    yPos += 38;
  }

  // ABSI Score
  if (absiScore !== undefined) {
    yPos = checkNewPage(doc, yPos);
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(`ABSI Score: ${absiScore}`, 20, yPos + 9);
    doc.text(`Survival Probability: ${survivalProbability || 'N/A'}`, pageWidth / 2, yPos + 9);
    yPos += 22;
  }

  // Associated injuries
  if (associatedInjuries) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Associated Injuries:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(associatedInjuries, 60, yPos);
    yPos += 10;
  }

  // Signature
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(assessedBy, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Burns Specialist', pageWidth - 47.5, yPos + 12, { align: 'center' });

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Burns_Assessment_${patientName}_${format(assessmentDate, 'yyyyMMdd')}.pdf`);
}

// ==================== NUTRITION ASSESSMENT PDF ====================

export interface NutritionAssessmentPDFOptions {
  assessmentId: string;
  assessmentDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  assessedBy: string;
  height: number;
  weight: number;
  bmi: number;
  mustScore: number;
  mustRisk: 'low' | 'medium' | 'high';
  caloricNeeds: number;
  proteinNeeds: number;
  fluidNeeds: number;
  dietaryRestrictions?: string[];
  mealPlan?: { meal: string; items: string[]; calories: number }[];
  supplements?: string[];
  notes?: string;
}

export function generateNutritionAssessmentPDF(options: NutritionAssessmentPDFOptions): void {
  const {
    assessmentId,
    assessmentDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    assessedBy,
    height,
    weight,
    bmi,
    mustScore,
    mustRisk,
    caloricNeeds,
    proteinNeeds,
    fluidNeeds,
    dietaryRestrictions,
    mealPlan,
    supplements,
    notes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const info: PDFDocumentInfo = {
    title: 'NUTRITION ASSESSMENT',
    subtitle: `Assessment #${assessmentId.slice(0, 8).toUpperCase()}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // MUST Risk badge
  const riskColors = {
    low: PDF_COLORS.success,
    medium: PDF_COLORS.warning,
    high: PDF_COLORS.danger,
  };

  doc.setFillColor(...(riskColors[mustRisk] || PDF_COLORS.gray));
  doc.roundedRect(pageWidth - 50, yPos - 5, 35, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${mustRisk.toUpperCase()} RISK`, pageWidth - 32.5, yPos + 2, { align: 'center' });

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 8;

  // Anthropometric data
  yPos = addSectionTitle(doc, yPos, 'Anthropometric Data');
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.dark);
  
  const anthropX = [30, 70, 110, 155];
  doc.text('Height', anthropX[0], yPos + 7, { align: 'center' });
  doc.text('Weight', anthropX[1], yPos + 7, { align: 'center' });
  doc.text('BMI', anthropX[2], yPos + 7, { align: 'center' });
  doc.text('MUST Score', anthropX[3], yPos + 7, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(`${height} cm`, anthropX[0], yPos + 14, { align: 'center' });
  doc.text(`${weight} kg`, anthropX[1], yPos + 14, { align: 'center' });
  doc.text(`${bmi.toFixed(1)}`, anthropX[2], yPos + 14, { align: 'center' });
  doc.text(`${mustScore}`, anthropX[3], yPos + 14, { align: 'center' });

  yPos += 28;

  // Daily Requirements
  yPos = addSectionTitle(doc, yPos, 'Daily Nutritional Requirements');
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.text(`Calories: ${caloricNeeds} kcal`, 25, yPos + 9);
  doc.text(`Protein: ${proteinNeeds}g`, pageWidth / 2 - 20, yPos + 9);
  doc.text(`Fluids: ${fluidNeeds} mL`, pageWidth - 50, yPos + 9);

  yPos += 22;

  // Dietary restrictions
  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    yPos = addSectionTitle(doc, yPos, 'Dietary Restrictions', 'warning');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(dietaryRestrictions.join(', '), 20, yPos + 3);
    yPos += 12;
  }

  // Meal plan
  if (mealPlan && mealPlan.length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Recommended Meal Plan');
    
    mealPlan.forEach((meal) => {
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text(meal.meal, 20, yPos + 6);
      
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(`${meal.calories} kcal`, pageWidth - 35, yPos + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      doc.text(meal.items.join(' • '), 20, yPos + 12);
      
      yPos += 20;
    });
  }

  // Supplements
  if (supplements && supplements.length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos += 5;
    yPos = addSectionTitle(doc, yPos, 'Recommended Supplements', 'info');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    supplements.forEach((supp, index) => {
      doc.text(`• ${supp}`, 20, yPos + index * 5);
    });
    yPos += supplements.length * 5 + 5;
  }

  // Signature
  yPos = checkNewPage(doc, yPos);
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(assessedBy, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Clinical Dietician', pageWidth - 47.5, yPos + 12, { align: 'center' });

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Nutrition_Assessment_${patientName}_${format(assessmentDate, 'yyyyMMdd')}.pdf`);
}

// ==================== ADMISSION SUMMARY PDF ====================

export interface AdmissionSummaryPDFOptions {
  admissionId: string;
  admissionNumber: string;
  admissionDate: Date;
  dischargeDate?: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  wardType: string;
  wardName: string;
  bedNumber: string;
  admissionDiagnosis: string;
  chiefComplaint: string;
  severity: string;
  primaryDoctor?: string;
  primaryNurse?: string;
  status: string;
  durationDays?: number;
  comorbidities?: string;
  allergies?: string;
  notes?: string;
}

export function generateAdmissionSummaryPDF(options: AdmissionSummaryPDFOptions): void {
  const {
    admissionId,
    admissionNumber,
    admissionDate,
    dischargeDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    wardType,
    wardName,
    bedNumber,
    admissionDiagnosis,
    chiefComplaint,
    severity,
    primaryDoctor,
    primaryNurse,
    status,
    durationDays,
    comorbidities,
    allergies,
    notes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const info: PDFDocumentInfo = {
    title: 'ADMISSION SUMMARY',
    subtitle: `Admission #${admissionNumber}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    active: PDF_COLORS.success,
    discharged: PDF_COLORS.info,
    transferred: [147, 51, 234],
    deceased: PDF_COLORS.gray,
  };

  doc.setFillColor(...(statusColors[status] || PDF_COLORS.gray));
  doc.roundedRect(pageWidth - 45, yPos - 5, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(status.toUpperCase(), pageWidth - 30, yPos, { align: 'center' });

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 8;

  // Admission details
  yPos = addSectionTitle(doc, yPos, 'Admission Details');
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 2, 2, 'F');
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  
  const col1 = 20;
  const col2 = pageWidth / 2;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Ward:', col1, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${wardName} (${wardType})`, col1 + 20, yPos + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Bed:', col2, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(bedNumber, col2 + 15, yPos + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Admitted:', col1, yPos + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(format(admissionDate, 'MMM d, yyyy h:mm a'), col1 + 25, yPos + 13);
  
  if (dischargeDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Discharged:', col2, yPos + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(format(dischargeDate, 'MMM d, yyyy h:mm a'), col2 + 28, yPos + 13);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Severity:', col1, yPos + 20);
  const severityColors: Record<string, [number, number, number]> = {
    mild: PDF_COLORS.success,
    moderate: PDF_COLORS.warning,
    severe: [249, 115, 22],
    critical: PDF_COLORS.danger,
  };
  doc.setTextColor(...(severityColors[severity] || PDF_COLORS.dark));
  doc.text(severity.toUpperCase(), col1 + 22, yPos + 20);
  
  doc.setTextColor(...PDF_COLORS.dark);
  if (durationDays !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('Duration:', col2, yPos + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(`${durationDays} day(s)`, col2 + 22, yPos + 20);
  }

  if (primaryDoctor) {
    doc.setFont('helvetica', 'bold');
    doc.text('Primary Doctor:', col1, yPos + 27);
    doc.setFont('helvetica', 'normal');
    doc.text(primaryDoctor, col1 + 35, yPos + 27);
  }
  
  if (primaryNurse) {
    doc.setFont('helvetica', 'bold');
    doc.text('Primary Nurse:', col2, yPos + 27);
    doc.setFont('helvetica', 'normal');
    doc.text(primaryNurse, col2 + 32, yPos + 27);
  }

  yPos += 43;

  // Chief complaint
  yPos = addSectionTitle(doc, yPos, 'Chief Complaint', 'warning');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.text(chiefComplaint, 20, yPos + 3);
  yPos += 12;

  // Admission diagnosis
  yPos = addSectionTitle(doc, yPos, 'Admission Diagnosis', 'danger');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.danger);
  doc.text(admissionDiagnosis, 20, yPos + 3);
  yPos += 12;

  // Comorbidities & Allergies
  if (comorbidities || allergies) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.dark);
    
    if (comorbidities) {
      doc.setFont('helvetica', 'bold');
      doc.text('Comorbidities:', 20, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(comorbidities.substring(0, 60), 50, yPos + 6);
    }
    
    if (allergies) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.danger);
      doc.text('⚠ Allergies:', 20, yPos + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(allergies, 48, yPos + 12);
    }
    
    yPos += 25;
  }

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Admission_Summary_${patientName}_${format(admissionDate, 'yyyyMMdd')}.pdf`);
}

// ==================== SIMPLE HELPER FUNCTIONS ====================
// These helpers convert database entities directly to PDF without needing complex options

import type { Wound, BurnAssessment, NutritionAssessment, Admission, ClinicalEncounter, Patient, Diagnosis } from '../types';

const DEFAULT_HOSPITAL = 'CareBridge Medical Center';

/**
 * Generate wound assessment PDF from database wound entity
 */
export function generateWoundPDFFromEntity(wound: Wound, patient?: Patient): void {
  const patientInfo = patient 
    ? {
        name: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      }
    : {
        name: 'Unknown Patient',
        hospitalNumber: 'N/A',
      };

  generateWoundAssessmentPDF({
    woundId: wound.id,
    assessmentDate: new Date(wound.createdAt),
    patient: patientInfo,
    hospitalName: DEFAULT_HOSPITAL,
    assessedBy: 'Clinical Staff',
    woundType: wound.type.replace('_', ' '),
    location: wound.location,
    etiology: wound.etiology,
    dimensions: {
      length: wound.length,
      width: wound.width,
      depth: wound.depth,
      area: wound.area,
    },
    phase: determineWoundPhase(wound.tissueType),
    tissueTypes: wound.tissueType,
    exudateAmount: wound.exudateAmount,
    exudateType: wound.exudateType,
    odor: wound.odor,
    periWoundCondition: wound.periWoundCondition,
    painLevel: wound.painLevel,
    dressingType: wound.dressingType,
    dressingFrequency: wound.dressingFrequency,
    healingProgress: wound.healingProgress === 'stable' ? 'static' : wound.healingProgress as 'improving' | 'deteriorating',
  });
}

/**
 * Generate burns assessment PDF from database burn entity
 */
export function generateBurnsPDFFromEntity(burn: BurnAssessment, patient?: Patient): void {
  const patientInfo = patient 
    ? {
        name: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      }
    : {
        name: 'Unknown Patient',
        hospitalNumber: 'N/A',
      };

  // Map affected areas to expected format
  const mappedAreas: { name: string; percent: number; depth: string }[] = burn.affectedAreas.map(area => ({
    name: area.bodyPart,
    percent: area.percentage,
    depth: area.depth as string,
  }));

  generateBurnsAssessmentPDF({
    assessmentId: burn.id,
    assessmentDate: new Date(burn.createdAt),
    injuryDate: new Date(burn.timeOfInjury),
    patient: patientInfo,
    hospitalName: DEFAULT_HOSPITAL,
    assessedBy: 'Clinical Staff',
    burnType: burn.burnType,
    mechanism: burn.mechanism,
    tbsa: burn.tbsaPercentage,
    patientWeight: 70, // Default weight since not in type
    affectedAreas: mappedAreas,
    fluidRequirement: {
      total24hr: burn.parklandFormula.fluidRequirement24h,
      first8hr: burn.parklandFormula.firstHalfRate * 8,
      next16hr: burn.parklandFormula.secondHalfRate * 16,
      hourlyRate: burn.parklandFormula.firstHalfRate,
    },
    inhalationInjury: burn.inhalationInjury,
    absiScore: burn.absiScore?.score,
    survivalProbability: burn.absiScore?.survivalProbability,
    tetanusStatus: burn.tetanusStatus,
    associatedInjuries: burn.associatedInjuries,
  });
}

/**
 * Generate nutrition assessment PDF from database entity
 */
export function generateNutritionPDFFromEntity(assessment: NutritionAssessment, patient?: Patient): void {
  const patientInfo = patient 
    ? {
        name: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      }
    : {
        name: 'Unknown Patient',
        hospitalNumber: 'N/A',
      };

  // Determine MUST risk level
  const getMustRisk = (): 'low' | 'medium' | 'high' => {
    const mustScore = assessment.mustScore;
    if (typeof mustScore === 'object' && mustScore !== null && 'riskLevel' in mustScore) {
      return mustScore.riskLevel;
    }
    const score = typeof mustScore === 'number' ? mustScore : 0;
    if (score === 0) return 'low';
    if (score === 1) return 'medium';
    return 'high';
  };

  const getMustScoreNumber = (): number => {
    const mustScore = assessment.mustScore;
    if (typeof mustScore === 'object' && mustScore !== null && 'totalScore' in mustScore) {
      return mustScore.totalScore;
    }
    return typeof mustScore === 'number' ? mustScore : 0;
  };

  // Calculate caloric needs (Harris-Benedict approximate)
  const weight = assessment.weight || 70;
  const height = assessment.height || 170;
  const bmi = assessment.bmi || (weight / ((height / 100) ** 2));
  const caloricNeeds = weight * 30; // Simple estimate: 30 kcal/kg
  const proteinNeeds = weight * 1.2; // 1.2 g/kg for hospitalized patients
  const fluidNeeds = weight * 35; // 35 mL/kg

  generateNutritionAssessmentPDF({
    assessmentId: assessment.id,
    assessmentDate: new Date(assessment.assessedAt),
    patient: patientInfo,
    hospitalName: DEFAULT_HOSPITAL,
    assessedBy: assessment.assessedBy || 'Clinical Staff',
    height,
    weight,
    bmi,
    mustScore: getMustScoreNumber(),
    mustRisk: getMustRisk(),
    caloricNeeds,
    proteinNeeds,
    fluidNeeds,
    dietaryRestrictions: assessment.dietaryRestrictions,
    supplements: assessment.supplementation,
    notes: assessment.notes,
  });
}

/**
 * Generate admission summary PDF from database entity
 */
export function generateAdmissionPDFFromEntity(admission: Admission, patient?: Patient): void {
  const patientInfo = patient 
    ? {
        name: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      }
    : {
        name: 'Unknown Patient',
        hospitalNumber: 'N/A',
      };

  // Calculate duration
  const admissionDate = new Date(admission.admissionDate);
  const endDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
  const durationDays = Math.ceil((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));

  generateAdmissionSummaryPDF({
    admissionId: admission.id,
    admissionNumber: admission.admissionNumber,
    admissionDate,
    dischargeDate: admission.dischargeDate ? new Date(admission.dischargeDate) : undefined,
    patient: patientInfo,
    hospitalName: DEFAULT_HOSPITAL,
    wardType: admission.wardType,
    wardName: admission.wardName,
    bedNumber: admission.bedNumber,
    admissionDiagnosis: admission.admissionDiagnosis,
    chiefComplaint: admission.chiefComplaint,
    severity: admission.severity,
    primaryDoctor: admission.primaryDoctor,
    primaryNurse: admission.primaryNurse,
    status: admission.status,
    durationDays,
    comorbidities: admission.comorbidities?.join(', '),
    allergies: admission.allergies?.join(', '),
  });
}

/**
 * Generate clinical encounter PDF from database entity
 */
export function generateEncounterPDFFromEntity(encounter: ClinicalEncounter, patient?: Patient): void {
  const patientInfo = patient 
    ? {
        name: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      }
    : {
        name: 'Unknown Patient',
        hospitalNumber: 'N/A',
      };

  // Map diagnoses to expected format
  const mappedDiagnoses = encounter.diagnosis?.map((d: Diagnosis) => ({
    description: d.description,
    type: d.type,
    status: d.status,
    icdCode: d.code,
  }));

  generateClinicalEncounterPDF({
    encounterId: encounter.id,
    encounterDate: new Date(encounter.createdAt),
    patient: patientInfo,
    hospitalName: DEFAULT_HOSPITAL,
    encounterType: encounter.type,
    chiefComplaint: encounter.chiefComplaint,
    historyOfPresentIllness: encounter.historyOfPresentIllness,
    pastMedicalHistory: encounter.pastMedicalHistory,
    pastSurgicalHistory: encounter.pastSurgicalHistory,
    diagnoses: mappedDiagnoses,
    treatmentPlan: encounter.treatmentPlan,
    clinician: encounter.attendingClinician || 'Clinical Staff',
  });
}

// Helper function for wound phase determination
function determineWoundPhase(tissueTypes: string[]): string {
  if (tissueTypes.includes('necrotic') || tissueTypes.includes('slough')) {
    return 'inflammatory';
  }
  if (tissueTypes.includes('granulation')) {
    return 'proliferative';
  }
  if (tissueTypes.includes('epithelial')) {
    return 'remodeling';
  }
  return 'assessment';
}