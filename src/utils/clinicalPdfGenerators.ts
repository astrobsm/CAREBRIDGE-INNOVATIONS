// Clinical PDF Generators
// Generates professional clinical documents with AstroHEALTH branding

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_FONTS } from './pdfConfig';
import {
  addBrandedHeader,
  addBrandedFooter,
  addPatientInfoBox,
  addSectionTitle,
  checkNewPage,
  addLogoWatermark,
  addWatermarkToAllPages,
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
    interpretation,
    performedBy,
    verifiedBy,
  } = options;
  void options.status;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add logo watermark
  addLogoWatermark(doc, 0.06);

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
  doc.setFont(PDF_FONTS.primary, 'bold');
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
  doc.setFont(PDF_FONTS.primary, 'normal');
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
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Clinical Info:', 20, yPos + 5);
    doc.setFont(PDF_FONTS.primary, 'normal');
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
  doc.setFont(PDF_FONTS.primary, 'bold');

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
    doc.setFont(PDF_FONTS.primary, 'normal');

    xPos = startX + 5;
    doc.text(test.name.substring(0, 35), xPos, yPos + 3);
    xPos += colWidths[0];

    // Result with color coding
    if (test.result) {
      if (test.status === 'high' || test.status === 'critical') {
        doc.setTextColor(...PDF_COLORS.danger);
        doc.setFont(PDF_FONTS.primary, 'bold');
      } else if (test.status === 'low') {
        doc.setTextColor(...PDF_COLORS.info);
        doc.setFont(PDF_FONTS.primary, 'bold');
      }
      doc.text(test.result, xPos, yPos + 3);
      doc.setTextColor(...PDF_COLORS.dark);
      doc.setFont(PDF_FONTS.primary, 'normal');
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
    doc.setFont(PDF_FONTS.primary, 'normal');
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

// ==================== LAB REQUEST FORM PDF ====================

export interface LabRequestFormPDFOptions {
  requestId: string;
  requestedDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  requestedBy: string;
  priority: 'routine' | 'urgent' | 'stat';
  tests: { name: string; specimen: string; category: string }[];
  clinicalInfo?: string;
}

export function generateLabRequestFormPDF(options: LabRequestFormPDFOptions): void {
  const {
    requestId,
    requestedDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    requestedBy,
    priority,
    tests,
    clinicalInfo,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const info: PDFDocumentInfo = {
    title: 'LABORATORY REQUEST FORM',
    subtitle: `Request #${requestId.slice(0, 8).toUpperCase()}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Priority badge - prominently displayed
  const priorityColors: Record<string, [number, number, number]> = {
    routine: [34, 197, 94],
    urgent: [234, 179, 8],
    stat: [220, 38, 38],
  };

  // Large priority indicator
  doc.setFillColor(...(priorityColors[priority] || PDF_COLORS.gray));
  doc.roundedRect(pageWidth - 50, yPos - 8, 35, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(priority.toUpperCase(), pageWidth - 32.5, yPos, { align: 'center' });

  yPos += 8;

  // Patient information box
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 5;

  // Request details section
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'S');

  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Request Details', 20, yPos + 6);

  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Requested By: ${requestedBy}`, 20, yPos + 13);
  doc.text(`Date/Time: ${format(requestedDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}`, pageWidth / 2 - 10, yPos + 13);

  yPos += 28;

  // Clinical information
  if (clinicalInfo) {
    // Check for page break
    if (yPos > pageHeight - 80) {
      addBrandedFooter(doc, doc.internal.pages.length - 1, doc.internal.pages.length);
      doc.addPage();
      doc.setFillColor(...PDF_COLORS.white);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = 20;
    }

    doc.setFillColor(254, 249, 195);
    doc.roundedRect(15, yPos, pageWidth - 30, 16, 2, 2, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Clinical Information:', 20, yPos + 6);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    const clinicalLines = doc.splitTextToSize(clinicalInfo, pageWidth - 45);
    doc.text(clinicalLines.slice(0, 2), 20, yPos + 11);
    yPos += 22;
  }

  // Check page space before tests section
  if (yPos > pageHeight - 80) {
    addBrandedFooter(doc, doc.internal.pages.length - 1, doc.internal.pages.length);
    doc.addPage();
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    yPos = 20;
  }

  // Requested Tests Section
  yPos = addSectionTitle(doc, yPos, 'Requested Investigations');
  yPos += 5;

  // Group tests by category
  const testsByCategory = new Map<string, { name: string; specimen: string }[]>();
  tests.forEach(test => {
    const category = test.category || 'Other';
    if (!testsByCategory.has(category)) {
      testsByCategory.set(category, []);
    }
    testsByCategory.get(category)!.push({ name: test.name, specimen: test.specimen });
  });

  // Render tests table with categories
  const colWidths = [90, 60];
  const startX = 15;

  // Table header
  doc.setFillColor(59, 130, 246);
  doc.rect(startX, yPos, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Investigation', startX + 5, yPos + 5.5);
  doc.text('Specimen Required', startX + colWidths[0] + 5, yPos + 5.5);
  yPos += 8;

  let rowIndex = 0;
  testsByCategory.forEach((categoryTests, category) => {
    // Check for page break before category header
    if (yPos > pageHeight - 70) {
      addBrandedFooter(doc, doc.internal.pages.length - 1, doc.internal.pages.length);
      doc.addPage();
      doc.setFillColor(...PDF_COLORS.white);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = 20;
      
      // Re-add table header on new page
      doc.setFillColor(59, 130, 246);
      doc.rect(startX, yPos, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Investigation', startX + 5, yPos + 5.5);
      doc.text('Specimen Required', startX + colWidths[0] + 5, yPos + 5.5);
      yPos += 8;
    }

    // Category header
    doc.setFillColor(243, 244, 246);
    doc.rect(startX, yPos, pageWidth - 30, 7, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(category.charAt(0).toUpperCase() + category.slice(1), startX + 3, yPos + 5);
    yPos += 7;

    // Tests in this category
    categoryTests.forEach(test => {
      // Check for page break before adding test row
      if (yPos > pageHeight - 60) {
        addBrandedFooter(doc, doc.internal.pages.length - 1, doc.internal.pages.length);
        doc.addPage();
        doc.setFillColor(...PDF_COLORS.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = 20;
        
        // Re-add table header
        doc.setFillColor(59, 130, 246);
        doc.rect(startX, yPos, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(PDF_FONTS.primary, 'bold');
        doc.text('Investigation', startX + 5, yPos + 5.5);
        doc.text('Specimen Required', startX + colWidths[0] + 5, yPos + 5.5);
        yPos += 8;
      }

      // Alternating row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(startX, yPos, pageWidth - 30, 7, 'F');
      }

      // Checkbox
      doc.setDrawColor(...PDF_COLORS.primary);
      doc.setLineWidth(0.3);
      doc.rect(startX + 3, yPos + 1.5, 4, 4, 'S');
      // Check mark
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.8);
      doc.line(startX + 3.8, yPos + 3.5, startX + 4.8, yPos + 4.8);
      doc.line(startX + 4.8, yPos + 4.8, startX + 6.5, yPos + 2.2);

      doc.setTextColor(...PDF_COLORS.dark);
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(test.name, startX + 10, yPos + 5);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(test.specimen, startX + colWidths[0] + 5, yPos + 5);

      yPos += 7;
      rowIndex++;
    });
  });

  // Bottom border for table
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, yPos, pageWidth - 15, yPos);

  yPos += 10;

  // Total tests count
  if (yPos > pageHeight - 90) {
    addBrandedFooter(doc, doc.internal.pages.length - 1, doc.internal.pages.length);
    doc.addPage();
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    yPos = 20;
  }

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(`Total Investigations Requested: ${tests.length}`, 20, yPos + 6.5);
  yPos += 18;

  // Specimen collection section
  if (yPos > pageHeight - 90) {
    addBrandedFooter(doc, doc.internal.pages.length - 1, doc.internal.pages.length);
    doc.addPage();
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    yPos = 20;
  }

  yPos = addSectionTitle(doc, yPos, 'For Laboratory Use Only');
  yPos += 5;

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'S');

  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'normal');

  // Collection fields
  doc.text('Date/Time Collected: ____________________', 20, yPos + 8);
  doc.text('Collected By: ____________________', pageWidth / 2, yPos + 8);

  doc.text('Sample ID: ____________________', 20, yPos + 16);
  doc.text('Sample Condition: ☐ Adequate  ☐ Hemolyzed  ☐ Lipemic  ☐ Clotted', pageWidth / 2, yPos + 16);

  doc.text('Date/Time Received: ____________________', 20, yPos + 24);
  doc.text('Received By: ____________________', pageWidth / 2, yPos + 24);

  doc.text('Comments: ______________________________________________________________________________', 20, yPos + 32);

  yPos += 42;

  // Instructions box
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(15, yPos, pageWidth - 30, 14, 2, 2, 'F');
  doc.setTextColor(...PDF_COLORS.danger);
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('IMPORTANT INSTRUCTIONS', 20, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('• Ensure proper patient identification on all samples  • Label samples immediately after collection  • Transport at appropriate temperature', 20, yPos + 10);

  addBrandedFooter(doc, 1, 1);

  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Lab_Request_${patientName}_${format(requestedDate, 'yyyyMMdd')}.pdf`);
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
    physicalExamination,
    vitals,
    diagnoses,
    treatmentPlan,
  } = options;
  void options.encounterId;
  void options.familyHistory;
  void options.socialHistory;
  void options.notes;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

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
  doc.setFont(PDF_FONTS.primary, 'normal');
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
    doc.setFont(PDF_FONTS.primary, 'normal');
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
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text('Past Medical History', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      const pmhLines = doc.splitTextToSize(pastMedicalHistory, halfWidth - 5);
      doc.text(pmhLines, 20, yPos + 5);
    }
    
    if (pastSurgicalHistory) {
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text('Past Surgical History', pageWidth / 2 + 5, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
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
        doc.setFont(PDF_FONTS.primary, 'bold');
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text(`${system}:`, 20, yPos + 3);
        doc.setFont(PDF_FONTS.primary, 'normal');
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
    
    diagnoses.forEach((dx, _index) => {
      const typeColors = {
        primary: PDF_COLORS.danger,
        secondary: PDF_COLORS.warning,
        differential: PDF_COLORS.info,
      };
      
      doc.setFillColor(...(typeColors[dx.type] || PDF_COLORS.gray));
      doc.circle(20, yPos + 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'normal');
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
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(clinician, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'normal');
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
  } = options;
  void options.notes;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

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
    doc.setFont(PDF_FONTS.primary, 'bold');
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
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Type:', 20, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(woundType, 35, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Location:', 80, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(location, 100, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Etiology:', 20, yPos + 13);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(etiology, 42, yPos + 13);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Phase:', 80, yPos + 13);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(phase, 96, yPos + 13);

  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Assessment Date:', 20, yPos + 20);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(format(assessmentDate, 'MMM d, yyyy h:mm a'), 55, yPos + 20);

  yPos += 32;

  // Dimensions box
  yPos = addSectionTitle(doc, yPos, 'Wound Dimensions');
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(`${dimensions.length} cm`, 35, yPos + 8);
  doc.text('×', 52, yPos + 8);
  doc.text(`${dimensions.width} cm`, 60, yPos + 8);
  if (dimensions.depth) {
    doc.text('×', 77, yPos + 8);
    doc.text(`${dimensions.depth} cm`, 85, yPos + 8);
  }
  
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('(L × W × D)', 35, yPos + 13);
  
  const area = dimensions.area || dimensions.length * dimensions.width;
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
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
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(`${label}:`, 20 + xOffset, yPos + yOffset);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(value.substring(0, 30), 55 + xOffset, yPos + yOffset);
  });

  yPos += 30;

  // Treatment Protocol
  if (protocol && protocol.length > 0) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Dressing Protocol', 'success');
    
    // Calculate wrapped lines for each protocol step
    const maxStepWidth = pageWidth - 28 - 15; // From x=28 to right margin (15mm)
    let totalLines = 0;
    const wrappedProtocol: { stepNum: number; lines: string[] }[] = [];
    
    protocol.forEach((step, index) => {
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(step, maxStepWidth) as string[];
      wrappedProtocol.push({ stepNum: index + 1, lines });
      totalLines += lines.length;
    });
    
    const boxHeight = totalLines * 5 + 10;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, yPos, pageWidth - 30, boxHeight, 2, 2, 'F');
    
    let lineY = yPos + 6;
    wrappedProtocol.forEach(({ stepNum, lines }) => {
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.success);
      doc.text(`${stepNum}.`, 20, lineY);
      doc.setTextColor(...PDF_COLORS.dark);
      lines.forEach((line: string, lineIndex: number) => {
        doc.text(line, 28, lineY + lineIndex * 5);
      });
      lineY += lines.length * 5;
    });
    
    yPos += boxHeight + 5;
  }

  // Dressing info
  if (dressingType || dressingFrequency) {
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Current Dressing:', 20, yPos);
    doc.setFont(PDF_FONTS.primary, 'normal');
    
    // Wrap long dressing instructions to fit within page margins
    const dressingText = `${dressingType || 'Standard'} - ${dressingFrequency || 'As needed'}`;
    const maxDressingWidth = pageWidth - 20 - 15; // From x=20 to right margin (15mm) - full width for wrapped text
    const dressingLines = doc.splitTextToSize(dressingText, maxDressingWidth);
    
    // Start dressing text on next line below the label
    const dressingStartY = yPos + 6;
    dressingLines.forEach((line: string, index: number) => {
      doc.text(line, 20, dressingStartY + (index * 5));
    });
    
    yPos = dressingStartY + Math.max(5, dressingLines.length * 5) + 5;
  }

  // Signature
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(assessedBy, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'normal');
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
  } = options;
  void options.notes;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

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
  doc.setFont(PDF_FONTS.primary, 'bold');
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
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Type:', 20, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(burnType, 35, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Mechanism:', 80, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(mechanism.substring(0, 30), 105, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Time of Injury:', 20, yPos + 13);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(format(injuryDate, 'MMM d, yyyy h:mm a'), 52, yPos + 13);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Weight:', 130, yPos + 13);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`${patientWeight} kg`, 148, yPos + 13);

  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Inhalation Injury:', 20, yPos + 20);
  const inhalationColor = inhalationInjury ? PDF_COLORS.danger : PDF_COLORS.success;
  doc.setTextColor(inhalationColor[0], inhalationColor[1], inhalationColor[2]);
  doc.text(inhalationInjury ? 'YES - Suspected' : 'No', 55, yPos + 20);
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Tetanus:', 100, yPos + 20);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(tetanusStatus ? 'Up to date' : 'Needs vaccination', 118, yPos + 20);

  yPos += 32;

  // Affected areas table
  yPos = addSectionTitle(doc, yPos, 'Affected Body Areas');
  
  // Table header
  doc.setFillColor(220, 38, 38);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'bold');
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
    doc.setFont(PDF_FONTS.primary, 'normal');
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
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('4 × Weight × TBSA = Total 24hr Requirement', 20, yPos + 8);
    
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(`4 × ${patientWeight}kg × ${tbsa}% = ${fluidRequirement.total24hr.toLocaleString()} mL`, 20, yPos + 15);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
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
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(`ABSI Score: ${absiScore}`, 20, yPos + 9);
    doc.text(`Survival Probability: ${survivalProbability || 'N/A'}`, pageWidth / 2, yPos + 9);
    yPos += 22;
  }

  // Associated injuries
  if (associatedInjuries) {
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Associated Injuries:', 20, yPos);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(associatedInjuries, 60, yPos);
    yPos += 10;
  }

  // Signature
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(assessedBy, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'normal');
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
  } = options;
  void options.notes;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

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
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(`${mustRisk.toUpperCase()} RISK`, pageWidth - 32.5, yPos + 2, { align: 'center' });

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 8;

  // Anthropometric data
  yPos = addSectionTitle(doc, yPos, 'Anthropometric Data');
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
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
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.text(`Calories: ${caloricNeeds} kcal`, 25, yPos + 9);
  doc.text(`Protein: ${proteinNeeds}g`, pageWidth / 2 - 20, yPos + 9);
  doc.text(`Fluids: ${fluidNeeds} mL`, pageWidth - 50, yPos + 9);

  yPos += 22;

  // Dietary restrictions
  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    yPos = addSectionTitle(doc, yPos, 'Dietary Restrictions', 'warning');
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'normal');
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
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text(meal.meal, 20, yPos + 6);
      
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(`${meal.calories} kcal`, pageWidth - 35, yPos + 6);
      
      doc.setFont(PDF_FONTS.primary, 'normal');
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
    doc.setFont(PDF_FONTS.primary, 'normal');
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
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(assessedBy, pageWidth - 47.5, yPos + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'normal');
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
  } = options;
  void options.admissionId;
  void options.notes;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

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
  doc.setFont(PDF_FONTS.primary, 'bold');
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
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Ward:', col1, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`${wardName} (${wardType})`, col1 + 20, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Bed:', col2, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(bedNumber, col2 + 15, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Admitted:', col1, yPos + 13);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(format(admissionDate, 'MMM d, yyyy h:mm a'), col1 + 25, yPos + 13);
  
  if (dischargeDate) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Discharged:', col2, yPos + 13);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(format(dischargeDate, 'MMM d, yyyy h:mm a'), col2 + 28, yPos + 13);
  }
  
  doc.setFont(PDF_FONTS.primary, 'bold');
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
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Duration:', col2, yPos + 20);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(`${durationDays} day(s)`, col2 + 22, yPos + 20);
  }

  if (primaryDoctor) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Primary Doctor:', col1, yPos + 27);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(primaryDoctor, col1 + 35, yPos + 27);
  }
  
  if (primaryNurse) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Primary Nurse:', col2, yPos + 27);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(primaryNurse, col2 + 32, yPos + 27);
  }

  yPos += 43;

  // Chief complaint
  yPos = addSectionTitle(doc, yPos, 'Chief Complaint', 'warning');
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.text(chiefComplaint, 20, yPos + 3);
  yPos += 12;

  // Admission diagnosis
  yPos = addSectionTitle(doc, yPos, 'Admission Diagnosis', 'danger');
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
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
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Comorbidities:', 20, yPos + 6);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(comorbidities.substring(0, 60), 50, yPos + 6);
    }
    
    if (allergies) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.danger);
      doc.text('⚠ Allergies:', 20, yPos + 12);
      doc.setFont(PDF_FONTS.primary, 'normal');
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

const DEFAULT_HOSPITAL = 'AstroHEALTH Innovations in Healthcare';

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

// ==================== LIMB SALVAGE INVESTIGATION REQUEST PDF ====================

export interface LimbSalvageInvestigationOptions {
  requestId?: string;
  requestDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  requestedBy: string;
  clinicalIndication: string;
  affectedSide: 'left' | 'right' | 'bilateral';
  woundLocation?: string;
  wagnerGrade?: number;
  suspectedOsteomyelitis?: boolean;
  suspectedPAD?: boolean;
  diabetesDuration?: number;
  additionalNotes?: string;
}

/**
 * Generate comprehensive investigation request PDF for Limb Salvage Assessment
 * Includes all laboratory, imaging, and vascular investigations needed
 */
export function generateLimbSalvageInvestigationPDF(options: LimbSalvageInvestigationOptions): void {
  const {
    requestId = `LSI-${Date.now().toString(36).toUpperCase()}`,
    requestDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    requestedBy,
    clinicalIndication,
    affectedSide,
    woundLocation,
    wagnerGrade,
    suspectedOsteomyelitis,
    suspectedPAD,
    diabetesDuration,
    additionalNotes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add logo watermark
  addLogoWatermark(doc, 0.06);

  const info: PDFDocumentInfo = {
    title: 'LIMB SALVAGE INVESTIGATION REQUEST',
    subtitle: `Request #${requestId}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Urgent badge
  doc.setFillColor(...PDF_COLORS.danger);
  doc.roundedRect(pageWidth - 40, yPos - 5, 25, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('URGENT', pageWidth - 27.5, yPos - 0.5, { align: 'center' });

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 5;

  // Clinical Indication Box
  doc.setFillColor(254, 243, 199); // Amber light
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Clinical Indication:', 20, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  
  const indicationLines = doc.splitTextToSize(clinicalIndication, pageWidth - 50);
  indicationLines.slice(0, 2).forEach((line: string, idx: number) => {
    doc.text(line, 20, yPos + 12 + idx * 5);
  });

  // Clinical details
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Affected Side:', 110, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(affectedSide.charAt(0).toUpperCase() + affectedSide.slice(1), 140, yPos + 6);
  
  if (woundLocation) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Location:', 110, yPos + 12);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(woundLocation.substring(0, 25), 130, yPos + 12);
  }
  
  if (wagnerGrade !== undefined) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Wagner Grade:', 110, yPos + 18);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(`Grade ${wagnerGrade}`, 140, yPos + 18);
  }

  yPos += 32;

  // SECTION 1: LABORATORY INVESTIGATIONS
  yPos = addSectionTitle(doc, yPos, 'LABORATORY INVESTIGATIONS', 'info');
  
  const labInvestigations = [
    { category: 'Hematology', tests: [
      'Full Blood Count (FBC)',
      'ESR (Erythrocyte Sedimentation Rate)',
      'C-Reactive Protein (CRP)',
      'Procalcitonin (if sepsis suspected)',
      'Blood Group & Cross-match',
      'Coagulation Profile (PT, INR, APTT)',
    ]},
    { category: 'Biochemistry', tests: [
      'Fasting Blood Glucose',
      'HbA1c (Glycated Hemoglobin)',
      'Electrolytes, Urea, Creatinine (E/U/Cr)',
      'eGFR Calculation',
      'Liver Function Tests (LFTs)',
      'Serum Albumin & Total Protein',
      'Serum Prealbumin (nutritional status)',
      'Lipid Profile (TC, TG, LDL, HDL)',
    ]},
    { category: 'Infection Markers', tests: [
      'Blood Culture (Aerobic & Anaerobic)',
      'Wound Swab MCS (if wound present)',
      'Deep Tissue/Bone Biopsy Culture (if osteomyelitis suspected)',
      'Urinalysis & Urine MCS',
    ]},
    { category: 'Specialized Tests', tests: [
      'Serum Lactate',
      'D-Dimer (if DVT suspected)',
      'Pro-BNP (if cardiac involvement)',
      'Vitamin B12 & Folate (neuropathy)',
      'Thyroid Function Tests',
    ]},
  ];

  labInvestigations.forEach(({ category, tests }) => {
    yPos = checkNewPage(doc, yPos, 30);
    
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(15, yPos, pageWidth - 30, 7, 1, 1, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(category, 20, yPos + 5);
    yPos += 10;

    tests.forEach((test) => {
      yPos = checkNewPage(doc, yPos, 8);
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      
      // Checkbox
      doc.rect(20, yPos - 3, 4, 4);
      doc.text(test, 28, yPos);
      
      // Line for result
      doc.setDrawColor(200, 200, 200);
      doc.line(100, yPos, pageWidth - 20, yPos);
      
      yPos += 6;
    });
    yPos += 3;
  });

  // SECTION 2: IMAGING INVESTIGATIONS
  yPos = checkNewPage(doc, yPos, 50);
  yPos = addSectionTitle(doc, yPos, 'IMAGING INVESTIGATIONS', 'warning');
  
  const imagingInvestigations = [
    { category: 'Plain Radiography', tests: [
      `X-Ray ${affectedSide} Foot AP & Oblique`,
      `X-Ray ${affectedSide} Ankle AP & Lateral`,
      `X-Ray ${affectedSide} Tibia/Fibula (if indicated)`,
      'Chest X-Ray PA (pre-operative assessment)',
    ]},
    { category: 'Advanced Imaging (Osteomyelitis)', tests: [
      `MRI ${affectedSide} Foot with Contrast`,
      'Bone Scan (Tc-99m if MRI contraindicated)',
      'PET-CT (if available, for extent of infection)',
      'CT Foot (for surgical planning)',
    ], condition: suspectedOsteomyelitis },
    { category: 'Vascular Imaging', tests: [
      `Arterial Duplex Ultrasound ${affectedSide} Lower Limb`,
      'CT Angiography (CTA) Lower Limbs',
      'MR Angiography (MRA) - if CKD/contrast allergy',
      'Digital Subtraction Angiography (DSA) - if intervention planned',
      'Transcutaneous Oxygen Pressure (TcPO2)',
      'Toe Pressure Measurement',
    ], condition: suspectedPAD !== false },
    { category: 'Venous Imaging (if indicated)', tests: [
      `Venous Duplex Ultrasound ${affectedSide} Lower Limb`,
      'CT Venography (if DVT suspected)',
    ]},
    { category: 'Cardiac Assessment', tests: [
      'Echocardiogram (2D Echo)',
      'ECG (12-lead)',
      'Stress Test / Dobutamine Echo (if revascularization planned)',
    ]},
  ];

  imagingInvestigations.forEach(({ category, tests, condition }) => {
    if (condition === false) return; // Skip if explicitly false
    
    yPos = checkNewPage(doc, yPos, 30);
    
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(15, yPos, pageWidth - 30, 7, 1, 1, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(category, 20, yPos + 5);
    yPos += 10;

    tests.forEach((test) => {
      yPos = checkNewPage(doc, yPos, 8);
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      
      // Checkbox
      doc.rect(20, yPos - 3, 4, 4);
      doc.text(test, 28, yPos);
      
      yPos += 6;
    });
    yPos += 3;
  });

  // SECTION 3: SPECIALIZED ASSESSMENTS
  yPos = checkNewPage(doc, yPos, 50);
  yPos = addSectionTitle(doc, yPos, 'SPECIALIZED ASSESSMENTS', 'success');
  
  const specializedAssessments = [
    { category: 'Vascular Assessment', tests: [
      'Ankle-Brachial Index (ABI) Measurement',
      'Toe-Brachial Index (TBI) - if calcified vessels',
      'Segmental Limb Pressures',
      'Pulse Volume Recording (PVR)',
    ]},
    { category: 'Neuropathy Assessment', tests: [
      'Monofilament Testing (10g Semmes-Weinstein)',
      'Vibration Sense (128Hz Tuning Fork)',
      'Nerve Conduction Studies (NCS)',
      'Quantitative Sensory Testing',
    ]},
    { category: 'Wound Assessment', tests: [
      'Wound Planimetry (surface area measurement)',
      'Wound Photography (baseline documentation)',
      'Probe-to-Bone Test (if osteomyelitis suspected)',
      'Wound Tissue Biopsy (for culture & histology)',
    ]},
    { category: 'Nutritional & Metabolic', tests: [
      'MUST Score (Malnutrition Universal Screening Tool)',
      'Body Mass Index (BMI)',
      'Dietary Assessment',
      'Vitamin D Level (25-OH Vitamin D)',
    ]},
    { category: 'Pre-Operative Assessment', tests: [
      'ASA Classification',
      'Cardiovascular Risk Assessment (RCRI)',
      'Pulmonary Function Tests (if indicated)',
      'Anesthesia Consultation',
      'Vascular Surgery Consultation',
      'Infectious Disease Consultation (if complex)',
    ]},
  ];

  specializedAssessments.forEach(({ category, tests }) => {
    yPos = checkNewPage(doc, yPos, 30);
    
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, yPos, pageWidth - 30, 7, 1, 1, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(category, 20, yPos + 5);
    yPos += 10;

    tests.forEach((test) => {
      yPos = checkNewPage(doc, yPos, 8);
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.dark);
      
      // Checkbox
      doc.rect(20, yPos - 3, 4, 4);
      doc.text(test, 28, yPos);
      
      yPos += 6;
    });
    yPos += 3;
  });

  // Additional Notes Section
  if (additionalNotes) {
    yPos = checkNewPage(doc, yPos, 30);
    yPos = addSectionTitle(doc, yPos, 'ADDITIONAL NOTES');
    
    doc.setFillColor(249, 250, 251);
    const notesLines = doc.splitTextToSize(additionalNotes, pageWidth - 50);
    const notesHeight = Math.max(20, notesLines.length * 5 + 10);
    doc.roundedRect(15, yPos, pageWidth - 30, notesHeight, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    notesLines.forEach((line: string, idx: number) => {
      doc.text(line, 20, yPos + 6 + idx * 5);
    });
    
    yPos += notesHeight + 5;
  }

  // Clinical History Summary
  yPos = checkNewPage(doc, yPos, 40);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 2, 2, 'F');
  
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Clinical Summary for Requesting Physicians:', 20, yPos + 7);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(8);
  
  let summaryY = yPos + 14;
  if (diabetesDuration) {
    doc.text(`• Diabetes Duration: ${diabetesDuration} years`, 25, summaryY);
    summaryY += 5;
  }
  if (wagnerGrade !== undefined) {
    doc.text(`• Wound Severity: Wagner Grade ${wagnerGrade}`, 25, summaryY);
    summaryY += 5;
  }
  if (suspectedOsteomyelitis) {
    doc.text('• Osteomyelitis: Clinically Suspected - Priority MRI recommended', 25, summaryY);
    summaryY += 5;
  }
  if (suspectedPAD) {
    doc.text('• PAD: Clinically Suspected - Vascular imaging priority', 25, summaryY);
  }

  yPos += 42;

  // Signature Section
  yPos = checkNewPage(doc, yPos, 40);
  
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.dark);
  
  // Requesting Physician
  doc.text('Requesting Physician:', 20, yPos);
  doc.line(20, yPos + 12, 80, yPos + 12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(requestedBy, 50, yPos + 18, { align: 'center' });
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Signature & Date', 50, yPos + 23, { align: 'center' });
  
  // Received By
  doc.text('Received By (Lab):', 100, yPos);
  doc.line(100, yPos + 12, 160, yPos + 12);
  doc.text('Name & Date', 130, yPos + 18, { align: 'center' });

  // Request date
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`Request Date: ${format(requestDate, 'dd MMM yyyy HH:mm')}`, 20, yPos + 30);

  // Add watermark to all pages
  addWatermarkToAllPages(doc, 0.06);
  addBrandedFooter(doc, 1, doc.getNumberOfPages());

  // Save
  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Limb_Salvage_Investigation_Request_${patientName}_${format(requestDate, 'yyyyMMdd')}.pdf`);
}

// ==================== WHO PATHOLOGY REQUEST PDF ====================

export interface PathologyRequestPDFOptions {
  requestId?: string;
  requestDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  requestedBy: string;
  requestingDepartment: string;
  priority: 'routine' | 'urgent' | 'frozen_section';
  
  // Clinical Information
  clinicalHistory: string;
  clinicalDiagnosis: string;
  relevantInvestigations?: string;
  previousBiopsies?: string;
  familyHistory?: string;
  riskFactors?: string[];
  
  // Specimen Details
  specimenType: string;
  specimenSite: string;
  specimenLaterality?: string;
  specimenSize?: string;
  specimenWeight?: string;
  numberOfSpecimens?: number;
  specimenOrientation?: string;
  
  // Collection Details
  collectionMethod: string;
  collectionDate: string;
  collectionTime: string;
  collector: string;
  
  // Fixation
  fixative: string;
  fixationTime?: string;
  
  // Special Studies
  specialStains?: string[];
  immunohistochemistry?: string[];
  molecularStudies?: string[];
  electronMicroscopy?: boolean;
  frozenSection?: boolean;
  
  // Operative Findings
  operativeFindings?: string;
  surgicalMargins?: string;
  lymphNodesSubmitted?: number;
  
  // Treatment History
  tumorMarkers?: string[];
  stagingInfo?: string;
  treatmentHistory?: string;
  radiationHistory?: string;
  chemotherapyHistory?: string;
}

/**
 * Generate WHO Standard Pathology/Histopathology Request PDF
 */
export function generatePathologyRequestPDF(options: PathologyRequestPDFOptions): void {
  const {
    requestId = `PATH-${Date.now().toString(36).toUpperCase()}`,
    requestDate,
    patient,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
    requestedBy,
    requestingDepartment,
    priority,
    clinicalHistory,
    clinicalDiagnosis,
    relevantInvestigations,
    previousBiopsies,
    familyHistory,
    riskFactors,
    specimenType,
    specimenSite,
    specimenLaterality,
    specimenSize,
    specimenWeight,
    numberOfSpecimens,
    specimenOrientation,
    collectionMethod,
    collectionDate,
    collectionTime,
    collector,
    fixative,
    fixationTime,
    specialStains,
    immunohistochemistry,
    molecularStudies,
    electronMicroscopy,
    frozenSection,
    operativeFindings,
    surgicalMargins,
    lymphNodesSubmitted,
    tumorMarkers,
    stagingInfo,
    treatmentHistory,
    radiationHistory,
    chemotherapyHistory,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add logo watermark
  addLogoWatermark(doc, 0.06);

  const info: PDFDocumentInfo = {
    title: 'HISTOPATHOLOGY / CYTOLOGY REQUEST FORM',
    subtitle: `Request #${requestId}`,
    hospitalName,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Priority badge
  const priorityColors: Record<string, [number, number, number]> = {
    routine: [34, 197, 94],      // green
    urgent: [249, 115, 22],     // orange
    frozen_section: [239, 68, 68], // red
  };
  const priorityLabels: Record<string, string> = {
    routine: 'ROUTINE',
    urgent: 'URGENT',
    frozen_section: 'FROZEN SECTION',
  };
  
  doc.setFillColor(...(priorityColors[priority] || priorityColors.routine));
  doc.roundedRect(pageWidth - 50, yPos - 5, 35, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(priorityLabels[priority] || 'ROUTINE', pageWidth - 32.5, yPos - 0.5, { align: 'center' });

  yPos += 5;
  yPos = addPatientInfoBox(doc, yPos, patient);
  yPos += 3;

  // Requesting Clinician Box
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Requesting Clinician:', 20, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(requestedBy, 55, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Department:', 110, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(requestingDepartment, 135, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Date/Time:', 20, yPos + 11);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(format(requestDate, 'dd MMM yyyy HH:mm'), 42, yPos + 11);
  
  yPos += 20;

  // SECTION 1: Clinical Information
  yPos = addSectionTitle(doc, yPos, 'CLINICAL INFORMATION', 'info');
  
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.dark);
  
  // Clinical History
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Clinical History:', 20, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'normal');
  const historyLines = doc.splitTextToSize(clinicalHistory || 'Not provided', pageWidth - 50);
  historyLines.slice(0, 3).forEach((line: string, idx: number) => {
    doc.text(line, 25, yPos + 10 + idx * 4);
  });
  yPos += 10 + Math.min(historyLines.length, 3) * 4 + 3;
  
  // Clinical Diagnosis
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Clinical/Provisional Diagnosis:', 20, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  const diagnosisLines = doc.splitTextToSize(clinicalDiagnosis || 'Not provided', pageWidth - 50);
  diagnosisLines.slice(0, 2).forEach((line: string, idx: number) => {
    doc.text(line, 25, yPos + 5 + idx * 4);
  });
  yPos += 5 + Math.min(diagnosisLines.length, 2) * 4 + 3;
  
  // Two-column layout for other clinical info
  const leftCol = 20;
  const rightCol = 110;
  
  if (relevantInvestigations) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Relevant Investigations:', leftCol, yPos);
    doc.setFont(PDF_FONTS.primary, 'normal');
    const invLines = doc.splitTextToSize(relevantInvestigations, 80);
    invLines.slice(0, 2).forEach((line: string, idx: number) => {
      doc.text(line, leftCol + 5, yPos + 4 + idx * 4);
    });
  }
  
  if (previousBiopsies) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Previous Biopsies:', rightCol, yPos);
    doc.setFont(PDF_FONTS.primary, 'normal');
    const biopLines = doc.splitTextToSize(previousBiopsies, 70);
    biopLines.slice(0, 2).forEach((line: string, idx: number) => {
      doc.text(line, rightCol + 5, yPos + 4 + idx * 4);
    });
  }
  yPos += 15;
  
  if (familyHistory) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Family History:', leftCol, yPos);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(familyHistory.substring(0, 60), leftCol + 5, yPos + 4);
    yPos += 10;
  }
  
  if (riskFactors && riskFactors.length > 0) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Risk Factors:', leftCol, yPos);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(riskFactors.join(', ').substring(0, 100), leftCol + 5, yPos + 4);
    yPos += 10;
  }
  
  yPos += 3;
  
  // SECTION 2: Specimen Details
  yPos = checkNewPage(doc, yPos, 50);
  yPos = addSectionTitle(doc, yPos, 'SPECIMEN DETAILS', 'warning');
  
  // Specimen info in a table format
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(15, yPos, pageWidth - 30, 40, 2, 2, 'F');
  
  doc.setFontSize(8);
  const specLeftCol = 20;
  const specMidCol = 75;
  const specRightCol = 130;
  
  // Row 1
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Specimen Type:', specLeftCol, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(specimenType || '-', specLeftCol + 25, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Site/Organ:', specMidCol, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text((specimenSite || '-').substring(0, 30), specMidCol + 20, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Laterality:', specRightCol, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(specimenLaterality?.replace('_', ' ') || 'N/A', specRightCol + 18, yPos + 6);
  
  // Row 2
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('No. of Specimens:', specLeftCol, yPos + 14);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(String(numberOfSpecimens || 1), specLeftCol + 32, yPos + 14);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Size (cm):', specMidCol, yPos + 14);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(specimenSize || '-', specMidCol + 18, yPos + 14);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Weight (g):', specRightCol, yPos + 14);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(specimenWeight || '-', specRightCol + 20, yPos + 14);
  
  // Row 3
  if (specimenOrientation) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Orientation:', specLeftCol, yPos + 22);
    doc.setFont(PDF_FONTS.primary, 'normal');
    const orientLines = doc.splitTextToSize(specimenOrientation, 140);
    doc.text(orientLines[0] || '-', specLeftCol + 22, yPos + 22);
  }
  
  // Row 4 - Collection
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Collection Method:', specLeftCol, yPos + 30);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(collectionMethod?.replace('_', ' ') || '-', specLeftCol + 35, yPos + 30);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Collected By:', specMidCol, yPos + 30);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text((collector || '-').substring(0, 25), specMidCol + 22, yPos + 30);
  
  // Row 5 - Date/Time
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Collection Date/Time:', specLeftCol, yPos + 38);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`${collectionDate || '-'} ${collectionTime || ''}`, specLeftCol + 38, yPos + 38);
  
  yPos += 48;
  
  // SECTION 3: Fixation Details
  yPos = checkNewPage(doc, yPos, 30);
  yPos = addSectionTitle(doc, yPos, 'FIXATION DETAILS', 'success');
  
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  
  const fixativeLabels: Record<string, string> = {
    formalin_10: '10% Neutral Buffered Formalin',
    formalin_buffered: 'Buffered Formalin',
    alcohol: 'Alcohol',
    fresh: 'Fresh (Unfixed)',
    other: 'Other',
  };
  
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Fixative Used:', 20, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(fixativeLabels[fixative] || fixative || '-', 50, yPos + 6);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Fixation Time:', 110, yPos + 6);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(fixationTime || 'Not specified', 138, yPos + 6);
  
  if (frozenSection) {
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(20, yPos + 9, 60, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('⚠ FROZEN SECTION REQUIRED', 50, yPos + 12.5, { align: 'center' });
    doc.setTextColor(...PDF_COLORS.dark);
  }
  
  yPos += 22;
  
  // SECTION 4: Special Studies
  const hasSpecialStudies = (specialStains && specialStains.length > 0) || 
    (immunohistochemistry && immunohistochemistry.length > 0) || 
    (molecularStudies && molecularStudies.length > 0) ||
    electronMicroscopy;
    
  if (hasSpecialStudies) {
    yPos = checkNewPage(doc, yPos, 50);
    yPos = addSectionTitle(doc, yPos, 'SPECIAL STUDIES REQUESTED', 'info');
    
    if (specialStains && specialStains.length > 0) {
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Special Stains:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      const stainText = doc.splitTextToSize(specialStains.join(', '), pageWidth - 50);
      stainText.forEach((line: string, idx: number) => {
        doc.text(line, 25, yPos + 4 + idx * 4);
      });
      yPos += 4 + stainText.length * 4 + 3;
    }
    
    if (immunohistochemistry && immunohistochemistry.length > 0) {
      yPos = checkNewPage(doc, yPos, 15);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Immunohistochemistry (IHC):', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      const ihcText = doc.splitTextToSize(immunohistochemistry.join(', '), pageWidth - 50);
      ihcText.forEach((line: string, idx: number) => {
        doc.text(line, 25, yPos + 4 + idx * 4);
      });
      yPos += 4 + ihcText.length * 4 + 3;
    }
    
    if (molecularStudies && molecularStudies.length > 0) {
      yPos = checkNewPage(doc, yPos, 15);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Molecular Studies:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      const molText = doc.splitTextToSize(molecularStudies.join(', '), pageWidth - 50);
      molText.forEach((line: string, idx: number) => {
        doc.text(line, 25, yPos + 4 + idx * 4);
      });
      yPos += 4 + molText.length * 4 + 3;
    }
    
    if (electronMicroscopy) {
      yPos = checkNewPage(doc, yPos, 10);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(139, 92, 246);
      doc.text('☑ Electron Microscopy Required', 20, yPos);
      doc.setTextColor(...PDF_COLORS.dark);
      yPos += 8;
    }
  }
  
  // SECTION 5: Operative Findings (if provided)
  if (operativeFindings || surgicalMargins || lymphNodesSubmitted) {
    yPos = checkNewPage(doc, yPos, 40);
    yPos = addSectionTitle(doc, yPos, 'OPERATIVE FINDINGS', 'warning');
    
    if (operativeFindings) {
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Intraoperative Findings:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      const opLines = doc.splitTextToSize(operativeFindings, pageWidth - 50);
      opLines.slice(0, 4).forEach((line: string, idx: number) => {
        doc.text(line, 25, yPos + 4 + idx * 4);
      });
      yPos += 4 + Math.min(opLines.length, 4) * 4 + 3;
    }
    
    if (surgicalMargins) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Surgical Margins:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(surgicalMargins, 52, yPos);
      yPos += 8;
    }
    
    if (lymphNodesSubmitted && lymphNodesSubmitted > 0) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Lymph Nodes Submitted:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(String(lymphNodesSubmitted), 60, yPos);
      yPos += 8;
    }
  }
  
  // SECTION 6: Treatment History (if oncology case)
  const hasOncologyInfo = treatmentHistory || radiationHistory || chemotherapyHistory || 
    stagingInfo || (tumorMarkers && tumorMarkers.length > 0);
    
  if (hasOncologyInfo) {
    yPos = checkNewPage(doc, yPos, 40);
    yPos = addSectionTitle(doc, yPos, 'ONCOLOGY HISTORY', 'danger');
    
    doc.setFontSize(8);
    
    if (stagingInfo) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Clinical Staging:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(stagingInfo, 52, yPos);
      yPos += 6;
    }
    
    if (tumorMarkers && tumorMarkers.length > 0) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Tumor Markers:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(tumorMarkers.join(', ').substring(0, 80), 50, yPos);
      yPos += 6;
    }
    
    if (treatmentHistory) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Previous Treatment:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      const txLines = doc.splitTextToSize(treatmentHistory, pageWidth - 55);
      txLines.slice(0, 2).forEach((line: string, idx: number) => {
        doc.text(line, 52, yPos + idx * 4);
      });
      yPos += Math.min(txLines.length, 2) * 4 + 3;
    }
    
    if (radiationHistory) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Radiation:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(radiationHistory.substring(0, 70), 40, yPos);
      yPos += 6;
    }
    
    if (chemotherapyHistory) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Chemotherapy:', 20, yPos);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(chemotherapyHistory.substring(0, 70), 48, yPos);
      yPos += 6;
    }
  }
  
  // SECTION 7: Laboratory Use Only
  yPos = checkNewPage(doc, yPos, 50);
  yPos += 5;
  
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, yPos, pageWidth - 30, 40, 2, 2, 'F');
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.roundedRect(15, yPos, pageWidth - 30, 40, 2, 2, 'S');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('FOR LABORATORY USE ONLY', pageWidth / 2, yPos + 6, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'normal');
  
  // Lab fields
  doc.text('Lab Accession No:', 20, yPos + 14);
  doc.line(55, yPos + 14, 90, yPos + 14);
  
  doc.text('Received Date/Time:', 100, yPos + 14);
  doc.line(140, yPos + 14, 180, yPos + 14);
  
  doc.text('Received By:', 20, yPos + 22);
  doc.line(45, yPos + 22, 90, yPos + 22);
  
  doc.text('Specimen Condition:', 100, yPos + 22);
  doc.line(140, yPos + 22, 180, yPos + 22);
  
  doc.text('No. of Blocks:', 20, yPos + 30);
  doc.line(48, yPos + 30, 70, yPos + 30);
  
  doc.text('No. of Slides:', 75, yPos + 30);
  doc.line(102, yPos + 30, 125, yPos + 30);
  
  doc.text('Gross Exam By:', 130, yPos + 30);
  doc.line(158, yPos + 30, 180, yPos + 30);
  
  yPos += 48;
  
  // Signature Section
  yPos = checkNewPage(doc, yPos, 30);
  
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(8);
  
  // Requesting Clinician
  doc.text('Requesting Clinician:', 20, yPos);
  doc.line(20, yPos + 10, 70, yPos + 10);
  doc.text('Signature', 45, yPos + 14, { align: 'center' });
  
  // Date
  doc.text('Date:', 80, yPos);
  doc.line(80, yPos + 10, 110, yPos + 10);
  
  // Pathologist
  doc.text('Pathologist:', 125, yPos);
  doc.line(125, yPos + 10, 175, yPos + 10);
  doc.text('Signature', 150, yPos + 14, { align: 'center' });

  // Add watermark to all pages
  addWatermarkToAllPages(doc, 0.06);
  addBrandedFooter(doc, 1, doc.getNumberOfPages());

  // Save
  const patientNameClean = patient.name.replace(/\s+/g, '_');
  doc.save(`Pathology_Request_${patientNameClean}_${format(requestDate, 'yyyyMMdd')}.pdf`);
}