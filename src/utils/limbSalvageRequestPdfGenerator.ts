/**
 * Limb Salvage Assessment Request Form PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates a comprehensive request form for limb salvage assessment
 * with all parameters needed for effective completion
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_COLORS, addBrandedHeader, addBrandedFooter, type PDFDocumentInfo } from './pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES } from './pdfConfig';
import type { Patient } from '../types';

export interface LimbSalvageRequestData {
  // Patient Information
  patient: Patient;
  requestDate: Date;
  requestedBy: string;
  department: string;
  
  // Clinical Presentation
  presentingComplaint: string;
  durationOfSymptoms: string;
  affectedLimb: 'upper_right' | 'upper_left' | 'lower_right' | 'lower_left';
  
  // Vascular Assessment Parameters
  vascularParameters: {
    palpablePulses: string;
    ankleBrachialIndex?: number;
    transcutaneousOxygen?: number;
    doppler: string;
    capillaryRefill: string;
  };
  
  // Wound Assessment Parameters
  woundParameters?: {
    location: string;
    size: string;
    depth: string;
    grade: string;
    infection: boolean;
    exudateAmount: string;
  };
  
  // Infection Parameters
  infectionParameters: {
    localSigns: string[];
    systemicSigns: string[];
    cultureResults?: string;
    antibioticSensitivity?: string;
  };
  
  // Metabolic Parameters
  metabolicParameters: {
    diabetesStatus: string;
    hba1c?: number;
    fastingGlucose?: number;
    renalFunction?: string;
    nutritionalStatus: string;
  };
  
  // Imaging Requirements
  imagingRequired: {
    xray: boolean;
    ctAngiography: boolean;
    mriAngiography: boolean;
    dopplerUltrasound: boolean;
    other?: string;
  };
  
  // Laboratory Requirements
  labsRequired: {
    fbc: boolean;
    uec: boolean;
    lft: boolean;
    coagulationProfile: boolean;
    inflamMatoryMarkers: boolean;
    bloodCulture: boolean;
    woundCulture: boolean;
    other?: string;
  };
  
  // Previous Management
  previousManagement: string[];
  
  // Specific Questions
  specificQuestions: string[];
  
  // Urgency
  urgency: 'routine' | 'urgent' | 'emergency';
  
  // Hospital Details
  hospitalName: string;
  hospitalContact?: string;
}

/**
 * Generate Limb Salvage Request Form PDF
 */
export async function generateLimbSalvageRequestPDF(data: LimbSalvageRequestData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Ensure white background
  const ensureWhiteBackground = () => {
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  ensureWhiteBackground();

  // Helper to add new page if needed
  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin - 20) {
      addBrandedFooter(doc, 1, 1);
      doc.addPage();
      ensureWhiteBackground();
      yPos = margin + 10;
    }
  };

  // Add header
  const documentInfo: PDFDocumentInfo = {
    title: 'LIMB SALVAGE ASSESSMENT REQUEST FORM',
    subtitle: 'Comprehensive Evaluation Request',
    hospitalName: data.hospitalName,
  };
  yPos = addBrandedHeader(doc, documentInfo);
  yPos += 10;

  // Urgency Badge
  const urgencyColors: Record<string, { bg: [number, number, number]; text: [number, number, number] }> = {
    routine: { bg: [220, 252, 231], text: [22, 163, 74] },
    urgent: { bg: [254, 243, 199], text: [202, 138, 4] },
    emergency: { bg: [254, 226, 226], text: [220, 38, 38] },
  };
  
  const urgencyColor = urgencyColors[data.urgency];
  doc.setFillColor(...urgencyColor.bg);
  doc.rect(margin, yPos, 40, 8, 'F');
  doc.setDrawColor(...urgencyColor.text);
  doc.rect(margin, yPos, 40, 8, 'S');
  doc.setFontSize(PDF_FONT_SIZES.caption);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...urgencyColor.text);
  doc.text(data.urgency.toUpperCase(), margin + 20, yPos + 5.5, { align: 'center' });
  yPos += 15;

  // Request Information
  doc.setFillColor(240, 248, 255);
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.rect(margin, yPos, contentWidth, 25, 'S');
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text('REQUEST DETAILS', margin + 3, yPos);
  
  yPos += 6;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Requested by: Dr. ${data.requestedBy}`, margin + 3, yPos);
  doc.text(`Date: ${format(data.requestDate, 'dd/MM/yyyy')}`, margin + 105, yPos);
  
  yPos += 5;
  doc.text(`Department: ${data.department}`, margin + 3, yPos);
  
  yPos += 15;

  // Patient Information
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos, contentWidth, 25, 'S');
  
  yPos += 7;
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('PATIENT INFORMATION', margin + 3, yPos);
  
  yPos += 6;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Name: ${data.patient.firstName} ${data.patient.lastName}`, margin + 3, yPos);
  doc.text(`Hospital No: ${data.patient.hospitalNumber}`, margin + 105, yPos);
  
  yPos += 5;
  doc.text(`Age: ${new Date().getFullYear() - new Date(data.patient.dateOfBirth).getFullYear()} years`, margin + 3, yPos);
  doc.text(`Gender: ${data.patient.gender === 'male' ? 'Male' : 'Female'}`, margin + 105, yPos);
  
  yPos += 15;

  // Clinical Presentation
  addNewPageIfNeeded(40);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('CLINICAL PRESENTATION', margin, yPos);
  yPos += 7;

  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  
  const affectedLimbMap: Record<string, string> = {
    upper_right: 'Upper Right Limb',
    upper_left: 'Upper Left Limb',
    lower_right: 'Lower Right Limb',
    lower_left: 'Lower Left Limb',
  };
  
  doc.text(`Affected Limb: ${affectedLimbMap[data.affectedLimb]}`, margin + 3, yPos);
  yPos += 6;
  doc.text(`Duration: ${data.durationOfSymptoms}`, margin + 3, yPos);
  yPos += 7;
  
  doc.text('Presenting Complaint:', margin + 3, yPos);
  yPos += 5;
  const complaintLines = doc.splitTextToSize(data.presentingComplaint, contentWidth - 6);
  doc.text(complaintLines, margin + 3, yPos);
  yPos += complaintLines.length * 5.5 + 8;

  // Vascular Assessment Parameters
  addNewPageIfNeeded(50);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('VASCULAR ASSESSMENT PARAMETERS', margin, yPos);
  yPos += 7;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 35, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, yPos, contentWidth, 35, 'S');
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  
  doc.text(`Palpable Pulses: ${data.vascularParameters.palpablePulses}`, margin + 3, yPos);
  yPos += 5;
  
  if (data.vascularParameters.ankleBrachialIndex) {
    doc.text(`Ankle-Brachial Index (ABI): ${data.vascularParameters.ankleBrachialIndex}`, margin + 3, yPos);
    yPos += 5;
  }
  
  if (data.vascularParameters.transcutaneousOxygen) {
    doc.text(`Transcutaneous Oxygen (TcPO2): ${data.vascularParameters.transcutaneousOxygen} mmHg`, margin + 3, yPos);
    yPos += 5;
  }
  
  doc.text(`Doppler Assessment: ${data.vascularParameters.doppler}`, margin + 3, yPos);
  yPos += 5;
  doc.text(`Capillary Refill: ${data.vascularParameters.capillaryRefill}`, margin + 3, yPos);
  yPos += 10;

  // Wound Assessment (if applicable)
  if (data.woundParameters) {
    addNewPageIfNeeded(45);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('WOUND ASSESSMENT PARAMETERS', margin, yPos);
    yPos += 7;

    doc.setFillColor(254, 242, 242);
    doc.rect(margin, yPos, contentWidth, 35, 'F');
    doc.setDrawColor(248, 113, 113);
    doc.rect(margin, yPos, contentWidth, 35, 'S');
    
    yPos += 7;
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);
    
    doc.text(`Location: ${data.woundParameters.location}`, margin + 3, yPos);
    yPos += 5;
    doc.text(`Size: ${data.woundParameters.size}`, margin + 3, yPos);
    doc.text(`Depth: ${data.woundParameters.depth}`, margin + 100, yPos);
    yPos += 5;
    doc.text(`Grade: ${data.woundParameters.grade}`, margin + 3, yPos);
    doc.text(`Infection: ${data.woundParameters.infection ? 'Yes' : 'No'}`, margin + 100, yPos);
    yPos += 5;
    doc.text(`Exudate Amount: ${data.woundParameters.exudateAmount}`, margin + 3, yPos);
    yPos += 10;
  }

  // Infection Parameters
  addNewPageIfNeeded(50);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('INFECTION PARAMETERS', margin, yPos);
  yPos += 7;

  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  
  if (data.infectionParameters.localSigns.length > 0) {
    doc.text('Local Signs:', margin + 3, yPos);
    yPos += 5;
    data.infectionParameters.localSigns.forEach((sign) => {
      doc.text(`• ${sign}`, margin + 6, yPos);
      yPos += 5;
    });
    yPos += 3;
  }
  
  if (data.infectionParameters.systemicSigns.length > 0) {
    doc.text('Systemic Signs:', margin + 3, yPos);
    yPos += 5;
    data.infectionParameters.systemicSigns.forEach((sign) => {
      doc.text(`• ${sign}`, margin + 6, yPos);
      yPos += 5;
    });
    yPos += 3;
  }
  
  if (data.infectionParameters.cultureResults) {
    doc.text(`Culture Results: ${data.infectionParameters.cultureResults}`, margin + 3, yPos);
    yPos += 5;
  }
  
  if (data.infectionParameters.antibioticSensitivity) {
    doc.text(`Antibiotic Sensitivity: ${data.infectionParameters.antibioticSensitivity}`, margin + 3, yPos);
    yPos += 5;
  }
  yPos += 8;

  // Metabolic Parameters
  addNewPageIfNeeded(40);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('METABOLIC PARAMETERS', margin, yPos);
  yPos += 7;

  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  
  doc.text(`Diabetes Status: ${data.metabolicParameters.diabetesStatus}`, margin + 3, yPos);
  yPos += 5;
  
  if (data.metabolicParameters.hba1c) {
    doc.text(`HbA1c: ${data.metabolicParameters.hba1c}%`, margin + 3, yPos);
    yPos += 5;
  }
  
  if (data.metabolicParameters.fastingGlucose) {
    doc.text(`Fasting Glucose: ${data.metabolicParameters.fastingGlucose} mg/dL`, margin + 3, yPos);
    yPos += 5;
  }
  
  if (data.metabolicParameters.renalFunction) {
    doc.text(`Renal Function: ${data.metabolicParameters.renalFunction}`, margin + 3, yPos);
    yPos += 5;
  }
  
  doc.text(`Nutritional Status: ${data.metabolicParameters.nutritionalStatus}`, margin + 3, yPos);
  yPos += 10;

  // Imaging Required
  addNewPageIfNeeded(35);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('IMAGING REQUIREMENTS', margin, yPos);
  yPos += 7;

  doc.setFillColor(252, 247, 237);
  doc.rect(margin, yPos, contentWidth, 30, 'F');
  doc.setDrawColor(234, 179, 8);
  doc.rect(margin, yPos, contentWidth, 30, 'S');
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  
  const imagingItems = [
    { key: 'xray', label: 'X-ray' },
    { key: 'ctAngiography', label: 'CT Angiography' },
    { key: 'mriAngiography', label: 'MRI Angiography' },
    { key: 'dopplerUltrasound', label: 'Doppler Ultrasound' },
  ];
  
  imagingItems.forEach(({ key, label }) => {
    const checked = data.imagingRequired[key as keyof typeof data.imagingRequired];
    doc.text(`${checked ? '☑' : '☐'} ${label}`, margin + 3, yPos);
    yPos += 5;
  });
  
  if (data.imagingRequired.other) {
    doc.text(`Other: ${data.imagingRequired.other}`, margin + 3, yPos);
    yPos += 5;
  }
  yPos += 10;

  // Laboratory Requirements
  addNewPageIfNeeded(40);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('LABORATORY REQUIREMENTS', margin, yPos);
  yPos += 7;

  doc.setFillColor(240, 253, 244);
  doc.rect(margin, yPos, contentWidth, 40, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.rect(margin, yPos, contentWidth, 40, 'S');
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  
  const labItems = [
    { key: 'fbc', label: 'Full Blood Count (FBC)' },
    { key: 'uec', label: 'Urea, Electrolytes & Creatinine (U&E)' },
    { key: 'lft', label: 'Liver Function Tests (LFT)' },
    { key: 'coagulationProfile', label: 'Coagulation Profile' },
    { key: 'inflamMatoryMarkers', label: 'Inflammatory Markers (CRP, ESR)' },
    { key: 'bloodCulture', label: 'Blood Culture' },
    { key: 'woundCulture', label: 'Wound Culture' },
  ];
  
  labItems.forEach(({ key, label }) => {
    const checked = data.labsRequired[key as keyof typeof data.labsRequired];
    doc.text(`${checked ? '☑' : '☐'} ${label}`, margin + 3, yPos);
    yPos += 5;
  });
  
  if (data.labsRequired.other) {
    doc.text(`Other: ${data.labsRequired.other}`, margin + 3, yPos);
    yPos += 5;
  }
  yPos += 10;

  // Previous Management
  if (data.previousManagement.length > 0) {
    addNewPageIfNeeded(30);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('PREVIOUS MANAGEMENT', margin, yPos);
    yPos += 7;

    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);
    
    data.previousManagement.forEach((management) => {
      addNewPageIfNeeded(10);
      const lines = doc.splitTextToSize(`• ${management}`, contentWidth - 6);
      doc.text(lines, margin + 3, yPos);
      yPos += lines.length * 5.5;
    });
    yPos += 8;
  }

  // Specific Questions
  if (data.specificQuestions.length > 0) {
    addNewPageIfNeeded(30);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('SPECIFIC QUESTIONS FOR ASSESSMENT', margin, yPos);
    yPos += 7;

    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);
    
    data.specificQuestions.forEach((question, idx) => {
      addNewPageIfNeeded(10);
      const lines = doc.splitTextToSize(`${idx + 1}. ${question}`, contentWidth - 3);
      doc.text(lines, margin + 3, yPos);
      yPos += lines.length * 5.5;
    });
  }

  // Add footer
  addBrandedFooter(doc, 1, 1);

  return doc;
}

/**
 * Download Limb Salvage Request Form PDF
 */
export async function downloadLimbSalvageRequestPDF(data: LimbSalvageRequestData): Promise<void> {
  const doc = await generateLimbSalvageRequestPDF(data);
  const fileName = `Limb_Salvage_Request_${data.patient.lastName}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
