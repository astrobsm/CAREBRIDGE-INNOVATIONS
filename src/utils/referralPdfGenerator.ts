/**
 * Subspecialty Referral PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates referral letters to subspecialists with:
 * - Patient summary
 * - Medical history
 * - Current presentation
 * - Reason for referral
 * - Relevant investigations
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_COLORS, addBrandedHeader, addBrandedFooter, type PDFDocumentInfo } from './pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES } from './pdfConfig';
import type { Patient } from '../types';

export interface ReferralData {
  // Referring Information
  referringDoctor: string;
  referringDoctorLicense?: string;
  referringHospital: string;
  referringDepartment: string;
  referralDate: Date;
  
  // Referral To
  subspecialty: string;
  specialistName?: string;
  specialistHospital?: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  
  // Patient Information
  patient: Patient;
  
  // Clinical Information
  presentingComplaint: string;
  historyOfPresentingComplaint: string;
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medications: string[];
  allergies: string[];
  socialHistory?: string;
  familyHistory?: string;
  
  // Examination Findings
  generalExamination?: string;
  systemicExamination?: string;
  vitalSigns?: {
    temperature?: number;
    pulse?: number;
    bloodPressure?: string;
    respiratoryRate?: number;
    spo2?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  
  // Investigations
  investigations: {
    name: string;
    date: Date;
    result: string;
  }[];
  
  // Current Diagnosis
  workingDiagnosis: string;
  differentialDiagnoses?: string[];
  
  // Reason for Referral
  reasonForReferral: string;
  specificQuestions?: string[];
  
  // Management So Far
  treatmentGiven: string[];
  
  // Additional Notes
  additionalNotes?: string;
  
  // Contact
  referringDoctorPhone?: string;
  referringDoctorEmail?: string;
}

/**
 * Generate Referral PDF
 */
export async function generateReferralPDF(data: ReferralData): Promise<jsPDF> {
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

  // Add new page helper
  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin - 20) {
      addBrandedFooter(doc, 1, 1);
      doc.addPage();
      ensureWhiteBackground();
      yPos = margin + 10;
    }
  };

  // Add section helper
  const addSection = (title: string, content: string | string[], isList: boolean = false) => {
    addNewPageIfNeeded(25);
    
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(title, margin, yPos);
    yPos += 7;

    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);

    if (Array.isArray(content)) {
      if (content.length === 0) {
        doc.text('None reported', margin + 3, yPos);
        yPos += 6;
      } else {
        content.forEach((item) => {
          addNewPageIfNeeded(10);
          const prefix = isList ? '• ' : '';
          const lines = doc.splitTextToSize(`${prefix}${item}`, contentWidth - 6);
          doc.text(lines, margin + 3, yPos);
          yPos += lines.length * 5.5;
        });
      }
    } else {
      const lines = doc.splitTextToSize(content, contentWidth - 3);
      doc.text(lines, margin + 3, yPos);
      yPos += lines.length * 5.5;
    }
    
    yPos += 5;
  };

  // Header
  const documentInfo: PDFDocumentInfo = {
    title: 'SUBSPECIALTY REFERRAL LETTER',
    subtitle: `Referral to ${data.subspecialty}`,
    hospitalName: data.referringHospital,
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

  // Referral Information Box
  doc.setFillColor(240, 248, 255);
  doc.rect(margin, yPos, contentWidth, 35, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.rect(margin, yPos, contentWidth, 35, 'S');
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text('REFERRAL DETAILS', margin + 3, yPos);
  
  yPos += 6;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`From: Dr. ${data.referringDoctor}`, margin + 3, yPos);
  doc.text(`Date: ${format(data.referralDate, 'dd/MM/yyyy')}`, margin + 105, yPos);
  
  yPos += 5;
  doc.text(`Department: ${data.referringDepartment}`, margin + 3, yPos);
  
  yPos += 5;
  doc.text(`Referring to: ${data.subspecialty}`, margin + 3, yPos);
  if (data.specialistName) {
    doc.text(`Attn: Dr. ${data.specialistName}`, margin + 105, yPos);
  }
  
  yPos += 5;
  if (data.referringDoctorPhone) {
    doc.text(`Phone: ${data.referringDoctorPhone}`, margin + 3, yPos);
  }
  if (data.referringDoctorEmail) {
    doc.text(`Email: ${data.referringDoctorEmail}`, margin + 105, yPos);
  }
  
  yPos += 15;

  // Patient Demographics
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPos, contentWidth, 30, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos, contentWidth, 30, 'S');
  
  yPos += 7;
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('PATIENT INFORMATION', margin + 3, yPos);
  
  yPos += 6;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Name: ${data.patient.firstName} ${data.patient.lastName}`, margin + 3, yPos);
  doc.text(`Hospital No: ${data.patient.hospitalNumber}`, margin + 105, yPos);
  
  yPos += 5;
  doc.text(`DOB: ${format(new Date(data.patient.dateOfBirth), 'dd/MM/yyyy')}`, margin + 3, yPos);
  doc.text(`Gender: ${data.patient.gender === 'male' ? 'Male' : 'Female'}`, margin + 105, yPos);
  
  yPos += 5;
  doc.text(`Phone: ${data.patient.phone}`, margin + 3, yPos);
  if (data.patient.email) {
    doc.text(`Email: ${data.patient.email}`, margin + 105, yPos);
  }
  
  yPos += 15;

  // Presenting Complaint
  addSection('PRESENTING COMPLAINT', data.presentingComplaint);

  // History of Presenting Complaint
  addSection('HISTORY OF PRESENTING COMPLAINT', data.historyOfPresentingComplaint);

  // Past Medical History
  addSection('PAST MEDICAL HISTORY', data.pastMedicalHistory, true);

  // Past Surgical History
  addSection('PAST SURGICAL HISTORY', data.pastSurgicalHistory, true);

  // Current Medications
  addSection('CURRENT MEDICATIONS', data.medications, true);

  // Allergies
  addNewPageIfNeeded(20);
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.danger);
  doc.text('ALLERGIES', margin, yPos);
  yPos += 7;

  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);

  if (data.allergies.length === 0) {
    doc.text('No known drug allergies', margin + 3, yPos);
    yPos += 6;
  } else {
    doc.setFillColor(254, 226, 226);
    const allergyHeight = data.allergies.length * 5.5 + 8;
    doc.rect(margin, yPos - 2, contentWidth, allergyHeight, 'F');
    doc.setDrawColor(...PDF_COLORS.danger);
    doc.rect(margin, yPos - 2, contentWidth, allergyHeight, 'S');
    
    data.allergies.forEach((allergy) => {
      doc.text(`⚠ ${allergy}`, margin + 3, yPos);
      yPos += 5.5;
    });
    yPos += 8;
  }
  yPos += 5;

  // Vital Signs
  if (data.vitalSigns) {
    addNewPageIfNeeded(30);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('VITAL SIGNS', margin, yPos);
    yPos += 7;

    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);

    const vitals: string[] = [];
    if (data.vitalSigns.temperature) vitals.push(`Temperature: ${data.vitalSigns.temperature}°C`);
    if (data.vitalSigns.pulse) vitals.push(`Pulse: ${data.vitalSigns.pulse} bpm`);
    if (data.vitalSigns.bloodPressure) vitals.push(`BP: ${data.vitalSigns.bloodPressure}`);
    if (data.vitalSigns.respiratoryRate) vitals.push(`RR: ${data.vitalSigns.respiratoryRate}/min`);
    if (data.vitalSigns.spo2) vitals.push(`SpO2: ${data.vitalSigns.spo2}%`);
    if (data.vitalSigns.weight) vitals.push(`Weight: ${data.vitalSigns.weight} kg`);
    if (data.vitalSigns.height) vitals.push(`Height: ${data.vitalSigns.height} cm`);
    if (data.vitalSigns.bmi) vitals.push(`BMI: ${data.vitalSigns.bmi}`);

    const vitalText = vitals.join(' | ');
    const vitalLines = doc.splitTextToSize(vitalText, contentWidth - 3);
    doc.text(vitalLines, margin + 3, yPos);
    yPos += vitalLines.length * 5.5 + 5;
  }

  // Examination Findings
  if (data.generalExamination) {
    addSection('GENERAL EXAMINATION', data.generalExamination);
  }

  if (data.systemicExamination) {
    addSection('SYSTEMIC EXAMINATION', data.systemicExamination);
  }

  // Investigations
  if (data.investigations.length > 0) {
    addNewPageIfNeeded(25);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('INVESTIGATIONS', margin, yPos);
    yPos += 7;

    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);

    data.investigations.forEach((inv) => {
      addNewPageIfNeeded(10);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text(`${inv.name} (${format(inv.date, 'dd/MM/yyyy')}):`, margin + 3, yPos);
      yPos += 5;
      doc.setFont(PDF_FONTS.primary, 'normal');
      const resultLines = doc.splitTextToSize(inv.result, contentWidth - 9);
      doc.text(resultLines, margin + 6, yPos);
      yPos += resultLines.length * 5.5 + 3;
    });
    yPos += 5;
  }

  // Working Diagnosis
  addSection('WORKING DIAGNOSIS', data.workingDiagnosis);

  // Differential Diagnoses
  if (data.differentialDiagnoses && data.differentialDiagnoses.length > 0) {
    addSection('DIFFERENTIAL DIAGNOSES', data.differentialDiagnoses, true);
  }

  // Treatment Given
  addSection('MANAGEMENT SO FAR', data.treatmentGiven, true);

  // Reason for Referral
  addNewPageIfNeeded(30);
  doc.setFillColor(255, 250, 230);
  const reasonHeight = doc.splitTextToSize(data.reasonForReferral, contentWidth - 6).length * 5.5 + 15;
  doc.rect(margin, yPos, contentWidth, reasonHeight, 'F');
  doc.setDrawColor(234, 179, 8);
  doc.rect(margin, yPos, contentWidth, reasonHeight, 'S');

  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(120, 70, 0);
  doc.text('REASON FOR REFERRAL', margin + 3, yPos);
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  const reasonLines = doc.splitTextToSize(data.reasonForReferral, contentWidth - 6);
  doc.text(reasonLines, margin + 3, yPos);
  yPos += reasonLines.length * 5.5 + 10;

  // Specific Questions
  if (data.specificQuestions && data.specificQuestions.length > 0) {
    addNewPageIfNeeded(25);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('SPECIFIC QUESTIONS', margin, yPos);
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
    yPos += 5;
  }

  // Additional Notes
  if (data.additionalNotes) {
    addSection('ADDITIONAL NOTES', data.additionalNotes);
  }

  // Signature Section
  addNewPageIfNeeded(30);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, yPos, margin + 70, yPos);
  yPos += 5;
  doc.setFontSize(PDF_FONT_SIZES.caption);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Dr. ${data.referringDoctor}`, margin, yPos);
  yPos += 4;
  if (data.referringDoctorLicense) {
    doc.text(`License: ${data.referringDoctorLicense}`, margin, yPos);
    yPos += 4;
  }
  doc.text(data.referringDepartment, margin, yPos);

  // Add footer
  addBrandedFooter(doc, 1, 1);

  return doc;
}

/**
 * Download Referral PDF
 */
export async function downloadReferralPDF(data: ReferralData): Promise<void> {
  const doc = await generateReferralPDF(data);
  const fileName = `Referral_${data.patient.lastName}_${data.subspecialty.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
