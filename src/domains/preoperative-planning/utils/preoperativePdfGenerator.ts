/**
 * Preoperative Planning PDF Generator
 * AstroHEALTH Innovations in Healthcare
 *
 * Generates comprehensive preoperative assessment PDF documents
 * with WHO-aligned protocols and patient education
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Patient } from '../../../types';
import type { 
  PreoperativeAssessment, 
  InvestigationRequirement, 
  OptimizationRecommendation,
} from '../types';
import { PDF_COLORS, addBrandedHeader, PDFDocumentInfo } from '../../../utils/pdfUtils';
import { PDF_FONTS } from '../../../utils/pdfConfig';
import { INVESTIGATION_INFO, getProtocolForComorbidity } from '../data/protocols';
import type { ProcedureEducation } from '../../../data/patientEducation';

// Helper function to add wrapped text
const addWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 5
): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

// Helper function to add section header
const addSectionHeader = (doc: jsPDF, title: string, y: number): number => {
  doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.rect(15, y - 5, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(title.toUpperCase(), 17, y);
  doc.setTextColor(0, 0, 0);
  return y + 10;
};

// Helper function to add subsection header
const addSubsectionHeader = (doc: jsPDF, title: string, y: number): number => {
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(title, 15, y);
  doc.setTextColor(0, 0, 0);
  return y + 6;
};

// Helper function to check page break
const checkPageBreak = (doc: jsPDF, y: number, neededSpace: number = 30): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - neededSpace) {
    doc.addPage();
    // Add white background to new page
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), pageHeight, 'F');
    return 20;
  }
  return y;
};

// Add bullet point
const addBulletPoint = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number => {
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  doc.text('•', x, y);
  return addWrappedText(doc, text, x + 5, y, maxWidth - 5, 4);
};

// Add table row
const addTableRow = (
  doc: jsPDF, 
  y: number, 
  col1: string, 
  col2: string, 
  col3: string, 
  isHeader: boolean = false
): number => {
  const margin = 15;
  const col1Width = 70;
  const col2Width = 50;
  const col3Width = 60;
  
  if (isHeader) {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, col1Width + col2Width + col3Width, 7, 'F');
    doc.setFont(PDF_FONTS.primary, 'bold');
  } else {
    doc.setFont(PDF_FONTS.primary, 'normal');
  }
  
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(col1, margin + 2, y);
  doc.text(col2, margin + col1Width + 2, y);
  doc.text(col3, margin + col1Width + col2Width + 2, y);
  
  return y + 6;
};

interface PreoperativePDFData {
  patient: Patient;
  assessment: PreoperativeAssessment;
  investigations: InvestigationRequirement[];
  recommendations: OptimizationRecommendation[];
  procedureEducation?: ProcedureEducation | null;
  hospitalName?: string;
  generatedBy?: string;
}

/**
 * Generate Preoperative Assessment PDF
 */
export async function generatePreoperativeAssessmentPDF(
  data: PreoperativePDFData
): Promise<jsPDF> {
  const { 
    patient, 
    assessment, 
    investigations, 
    recommendations, 
    procedureEducation, 
    hospitalName,
    generatedBy 
  } = data;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 10;

  // === PAGE 1: HEADER AND PATIENT INFO ===
  
  // Header
  const headerInfo: PDFDocumentInfo = {
    title: 'Preoperative Assessment',
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
  };
  y = addBrandedHeader(doc, headerInfo);
  y += 5;

  // Title box with procedure
  doc.setFillColor(240, 249, 255);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.rect(margin, y, contentWidth, 20, 'S');
  
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.setFontSize(12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(`Procedure: ${assessment.plannedProcedure}`, margin + 5, y + 8);
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Urgency: ${assessment.surgicalUrgency.replace('_', ' ').toUpperCase()}`, margin + 5, y + 15);
  doc.text(`Anaesthesia: ${assessment.plannedAnaesthesia.replace('_', ' ').toUpperCase()}`, margin + 80, y + 15);
  doc.text(`ASA Class: ${assessment.asaClass}`, margin + 150, y + 15);
  
  y += 28;

  // === PATIENT INFORMATION ===
  y = addSectionHeader(doc, 'Patient Information', y);
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Patient details in two columns
  const col1 = margin;
  const col2 = margin + 90;
  
  doc.text(`Name: ${patient.firstName} ${patient.lastName}`, col1, y);
  doc.text(`Hospital No: ${patient.hospitalNumber || 'N/A'}`, col2, y);
  y += 5;
  
  doc.text(`Gender: ${patient.gender || 'N/A'}`, col1, y);
  doc.text(`Date of Birth: ${patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A'}`, col2, y);
  y += 5;
  
  doc.text(`Phone: ${patient.phone || 'N/A'}`, col1, y);
  doc.text(`Assessment Date: ${format(new Date(), 'dd MMM yyyy')}`, col2, y);
  y += 10;

  // === COMORBIDITIES ===
  if (assessment.comorbidities.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = addSectionHeader(doc, 'Identified Comorbidities', y);
    
    const comorbiditiesText = assessment.comorbidities
      .map(c => c.replace('_', ' ').toUpperCase())
      .join(', ');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'normal');
    y = addWrappedText(doc, comorbiditiesText, margin, y, contentWidth, 5);
    y += 5;
  }

  // === REQUIRED INVESTIGATIONS ===
  y = checkPageBreak(doc, y, 50);
  y = addSectionHeader(doc, 'Required Investigations', y);
  
  // Table header
  y = addTableRow(doc, y, 'Investigation', 'Category', 'Rationale', true);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y - 3, margin + 180, y - 3);
  
  for (const inv of investigations) {
    y = checkPageBreak(doc, y, 15);
    const info = INVESTIGATION_INFO[inv.type];
    const rationale = info?.name || inv.name;
    y = addTableRow(doc, y, inv.name, inv.requirement, rationale.substring(0, 30));
  }
  y += 5;

  // === OPTIMIZATION RECOMMENDATIONS ===
  if (recommendations.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionHeader(doc, 'Optimization Recommendations', y);
    
    for (const rec of recommendations) {
      y = checkPageBreak(doc, y, 35);
      
      // Category and priority
      const priorityColor = rec.priority === 'critical' ? [220, 38, 38] : 
                           rec.priority === 'important' ? [245, 158, 11] : [34, 197, 94];
      doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.rect(margin, y - 3, 4, 4, 'F');
      
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text(`${rec.category.replace('_', ' ').toUpperCase()} (${rec.priority})`, margin + 7, y);
      y += 5;
      
      // Recommendation details
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setFontSize(8);
      y = addBulletPoint(doc, rec.recommendation, margin + 5, y, contentWidth - 10);
      y += 3;
    }
  }

  // === RED FLAGS FROM PROTOCOLS ===
  const allRedFlags: string[] = [];
  assessment.comorbidities.forEach(comorbidity => {
    const protocol = getProtocolForComorbidity(comorbidity);
    if (protocol?.redFlags) {
      allRedFlags.push(...protocol.redFlags);
    }
  });

  if (allRedFlags.length > 0) {
    y = checkPageBreak(doc, y, 40);
    doc.setFillColor(254, 226, 226);
    doc.rect(margin, y - 5, contentWidth, 8, 'F');
    y = addSectionHeader(doc, 'Red Flags - Conditions Requiring Delay', y);
    
    doc.setTextColor(153, 27, 27);
    for (const flag of [...new Set(allRedFlags)]) {
      y = checkPageBreak(doc, y, 10);
      y = addBulletPoint(doc, flag, margin + 5, y, contentWidth - 10);
    }
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  // === PATIENT EDUCATION ===
  if (procedureEducation) {
    doc.addPage();
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 20;
    
    y = addSectionHeader(doc, 'Patient Education: ' + procedureEducation.procedureName, y);
    
    // Overview
    if (procedureEducation.overview) {
      y = addSubsectionHeader(doc, 'Overview', y);
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'normal');
      y = addWrappedText(doc, procedureEducation.overview, margin, y, contentWidth, 4);
      y += 5;
    }
    
    // Aims/Indications
    if (procedureEducation.aims && procedureEducation.aims.length > 0) {
      y = checkPageBreak(doc, y, 25);
      y = addSubsectionHeader(doc, 'Aims of This Procedure', y);
      for (const aim of procedureEducation.aims) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, aim, margin, y, contentWidth);
      }
      y += 5;
    }
    
    // Indications
    if (procedureEducation.indications && procedureEducation.indications.length > 0) {
      y = checkPageBreak(doc, y, 25);
      y = addSubsectionHeader(doc, 'Indications', y);
      for (const indication of procedureEducation.indications) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, indication, margin, y, contentWidth);
      }
      y += 5;
    }
    
    // Expected Outcomes
    if (procedureEducation.expectedOutcomes && procedureEducation.expectedOutcomes.length > 0) {
      y = checkPageBreak(doc, y, 25);
      y = addSubsectionHeader(doc, 'Expected Outcomes', y);
      for (const outcome of procedureEducation.expectedOutcomes) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, outcome, margin, y, contentWidth);
      }
      y += 5;
    }
    
    // Anaesthesia information
    if (procedureEducation.anesthesiaDescription) {
      y = checkPageBreak(doc, y, 20);
      y = addSubsectionHeader(doc, 'Anaesthesia Information', y);
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'normal');
      y = addWrappedText(doc, procedureEducation.anesthesiaDescription, margin, y, contentWidth, 4);
      y += 5;
    }
    
    // Complications - General
    if (procedureEducation.generalComplications && procedureEducation.generalComplications.length > 0) {
      y = checkPageBreak(doc, y, 25);
      y = addSubsectionHeader(doc, 'General Risks & Complications', y);
      for (const complication of procedureEducation.generalComplications) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, `${complication.description} (${complication.likelihood})`, margin, y, contentWidth);
      }
      y += 5;
    }
    
    // Complications - Specific
    if (procedureEducation.specificComplications && procedureEducation.specificComplications.length > 0) {
      y = checkPageBreak(doc, y, 25);
      y = addSubsectionHeader(doc, 'Procedure-Specific Risks', y);
      for (const complication of procedureEducation.specificComplications) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, `${complication.description} (${complication.likelihood})`, margin, y, contentWidth);
      }
      y += 5;
    }
    
    // Hospital Stay
    if (procedureEducation.hospitalStay) {
      y = checkPageBreak(doc, y, 15);
      doc.setFontSize(9);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(`Expected Hospital Stay: ${procedureEducation.hospitalStay}`, margin, y);
      y += 5;
    }
    
    // Healing Time
    if (procedureEducation.healingTime) {
      doc.text(`Expected Healing Time: ${procedureEducation.healingTime}`, margin, y);
      y += 5;
    }
    
    // Follow-up Schedule
    if (procedureEducation.followUpSchedule && procedureEducation.followUpSchedule.length > 0) {
      y = checkPageBreak(doc, y, 25);
      y = addSubsectionHeader(doc, 'Follow-Up Schedule', y);
      for (const schedule of procedureEducation.followUpSchedule) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, schedule, margin, y, contentWidth);
      }
      y += 5;
    }
    
    // Warning signs to report
    if (procedureEducation.warningSignsToReport && procedureEducation.warningSignsToReport.length > 0) {
      y = checkPageBreak(doc, y, 25);
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, y - 3, contentWidth, 5, 'F');
      y = addSubsectionHeader(doc, '⚠️ Warning Signs - When to Seek Help', y);
      doc.setTextColor(180, 83, 9);
      for (const sign of procedureEducation.warningSignsToReport) {
        y = checkPageBreak(doc, y, 10);
        y = addBulletPoint(doc, sign, margin, y, contentWidth);
      }
      doc.setTextColor(0, 0, 0);
      y += 5;
    }
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.setFont(PDF_FONTS.primary, 'normal');
    
    // Footer text
    const footerY = pageHeight - 10;
    doc.text(`Page ${i} of ${totalPages}`, margin, footerY);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, pageWidth / 2, footerY, { align: 'center' });
    if (generatedBy) {
      doc.text(`By: ${generatedBy}`, pageWidth - margin, footerY, { align: 'right' });
    }
    
    // Disclaimer
    doc.setFontSize(6);
    doc.text(
      'This document is for informational purposes. Please follow your healthcare provider\'s instructions.',
      pageWidth / 2,
      footerY + 4,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Download Preoperative Assessment PDF
 */
export async function downloadPreoperativeAssessmentPDF(
  data: PreoperativePDFData
): Promise<void> {
  const doc = await generatePreoperativeAssessmentPDF(data);
  const fileName = `Preoperative_Assessment_${data.patient.firstName}_${data.patient.lastName}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
