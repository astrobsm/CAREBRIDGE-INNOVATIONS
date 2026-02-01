/**
 * Patient Education Thermal PDF Generator
 * Generates education documents for 80mm thermal printer
 * 
 * XP-T80Q Thermal Printer Specifications:
 * - Paper Width: 80mm
 * - Font: Georgia (Times in jsPDF as closest match)
 * - Font Size: 12pt bold for headers, 10-12pt for body
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { EducationCondition, EducationCategory } from '../domains/patient-education/types';

// 80mm = ~226 points (80mm * 2.83)
const THERMAL_PAGE_WIDTH = 226;
const THERMAL_MARGIN = 8;
const THERMAL_CONTENT_WIDTH = THERMAL_PAGE_WIDTH - (THERMAL_MARGIN * 2);
const THERMAL_PAGE_HEIGHT = 800; // Long receipt format

/**
 * Create thermal PDF for a patient education condition
 */
export function createEducationConditionThermalPDF(
  condition: EducationCondition,
  category: EducationCategory,
  patientName?: string,
  hospitalName?: string
): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT],
  });

  let y = THERMAL_MARGIN + 5;

  // Hospital name
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text((hospitalName || 'AstroHEALTH').toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 16;

  // Title
  doc.setFontSize(14);
  doc.text('PATIENT EDUCATION', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Condition name
  doc.setFontSize(12);
  const conditionLines = doc.splitTextToSize(condition.name.toUpperCase(), THERMAL_CONTENT_WIDTH);
  doc.text(conditionLines, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += conditionLines.length * 14 + 4;

  // Category
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Category: ${category.name}`, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  // ICD Code
  doc.text(`ICD Code: ${condition.icdCode}`, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 14;

  // Patient name if provided
  if (patientName) {
    doc.setFont('times', 'bold');
    doc.text(`Prepared for: ${patientName}`, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
    y += 14;
  }

  // Divider
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // What is this condition?
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('WHAT IS THIS CONDITION?', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const defLines = doc.splitTextToSize(condition.overview.definition, THERMAL_CONTENT_WIDTH);
  doc.text(defLines, THERMAL_MARGIN, y);
  y += defLines.length * 12 + 8;

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 100) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Common Causes (top 4)
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('COMMON CAUSES', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const causes = condition.overview.causes.slice(0, 4);
  causes.forEach(cause => {
    const causeLines = doc.splitTextToSize(`• ${cause}`, THERMAL_CONTENT_WIDTH);
    doc.text(causeLines, THERMAL_MARGIN, y);
    y += causeLines.length * 12;
  });
  y += 8;

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 100) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Signs and Symptoms (top 4)
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('SIGNS & SYMPTOMS', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const symptoms = condition.overview.symptoms.slice(0, 4);
  symptoms.forEach(symptom => {
    const symptomLines = doc.splitTextToSize(`• ${symptom}`, THERMAL_CONTENT_WIDTH);
    doc.text(symptomLines, THERMAL_MARGIN, y);
    y += symptomLines.length * 12;
  });
  y += 8;

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 100) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Warning Signs
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('⚠ WARNING SIGNS', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const warnings = condition.warningSigns.slice(0, 4);
  warnings.forEach(sign => {
    const signLines = doc.splitTextToSize(`• ${sign}`, THERMAL_CONTENT_WIDTH);
    doc.text(signLines, THERMAL_MARGIN, y);
    y += signLines.length * 12;
  });
  y += 8;

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 80) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Emergency Signs
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('🚨 SEEK IMMEDIATE CARE IF:', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const emergency = condition.emergencySigns.slice(0, 3);
  emergency.forEach(sign => {
    const signLines = doc.splitTextToSize(`• ${sign}`, THERMAL_CONTENT_WIDTH);
    doc.text(signLines, THERMAL_MARGIN, y);
    y += signLines.length * 12;
  });
  y += 12;

  // Divider
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Footer
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  const footerText = 'This information is for educational purposes. Always follow your healthcare provider\'s specific instructions.';
  const footerLines = doc.splitTextToSize(footerText, THERMAL_CONTENT_WIDTH);
  doc.text(footerLines, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += footerLines.length * 10 + 8;

  // Timestamp
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.text('AstroHEALTH Healthcare', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });

  return doc;
}

/**
 * Create thermal PDF for category summary
 */
export function createCategorySummaryThermalPDF(
  category: EducationCategory,
  hospitalName?: string
): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT],
  });

  let y = THERMAL_MARGIN + 5;

  // Hospital name
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text((hospitalName || 'AstroHEALTH').toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 16;

  // Title
  doc.setFontSize(14);
  doc.text('PATIENT EDUCATION', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 16;
  doc.text('CATEGORY SUMMARY', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Category name
  doc.setFontSize(12);
  doc.text(`${category.code}: ${category.name}`.toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Divider
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 14;

  // Available Materials
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('AVAILABLE MATERIALS:', THERMAL_MARGIN, y);
  y += 16;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  category.conditions.forEach((condition, index) => {
    // Check page break
    if (y > THERMAL_PAGE_HEIGHT - 60) {
      doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
      y = THERMAL_MARGIN;
    }

    const numText = `${index + 1}. ${condition.name}`;
    const numLines = doc.splitTextToSize(numText, THERMAL_CONTENT_WIDTH);
    doc.text(numLines, THERMAL_MARGIN, y);
    y += numLines.length * 12 + 4;
  });
  y += 8;

  // Divider
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Footer
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text('Request full documents for details', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.text('AstroHEALTH Healthcare', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });

  return doc;
}

/**
 * Interface for procedure education data
 */
interface ProcedureEducationData {
  procedureId: string;
  procedureName: string;
  category: string;
  overview: string;
  aims: string[];
  indications: string[];
  contraindications: string[];
  preOperativeInstructions: string[];
  postOperativeInstructions: string[];
  expectedRecoveryTime: string;
  possibleComplications: string[];
  alternativeTreatments?: string[];
  riskOfNotTreating?: string;
}

/**
 * Create thermal PDF for procedure education
 */
export function createProcedureEducationThermalPDF(
  education: ProcedureEducationData,
  hospitalName?: string
): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT],
  });

  let y = THERMAL_MARGIN + 5;

  // Hospital name
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text((hospitalName || 'AstroHEALTH').toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 16;

  // Title
  doc.setFontSize(14);
  doc.text('PROCEDURE EDUCATION', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Procedure name
  doc.setFontSize(12);
  const procLines = doc.splitTextToSize(education.procedureName.toUpperCase(), THERMAL_CONTENT_WIDTH);
  doc.text(procLines, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += procLines.length * 14 + 8;

  // Category
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Category: ${education.category}`, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 14;

  // Divider
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Overview
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('OVERVIEW', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const overviewLines = doc.splitTextToSize(education.overview, THERMAL_CONTENT_WIDTH);
  doc.text(overviewLines.slice(0, 6), THERMAL_MARGIN, y);
  y += Math.min(overviewLines.length, 6) * 12 + 8;

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 100) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Aims (top 3)
  if (education.aims.length > 0) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('AIMS OF SURGERY', THERMAL_MARGIN, y);
    y += 14;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    education.aims.slice(0, 3).forEach(aim => {
      const aimLines = doc.splitTextToSize(`• ${aim}`, THERMAL_CONTENT_WIDTH);
      doc.text(aimLines, THERMAL_MARGIN, y);
      y += aimLines.length * 12;
    });
    y += 8;
  }

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 100) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Pre-operative instructions (top 4)
  if (education.preOperativeInstructions.length > 0) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('BEFORE SURGERY', THERMAL_MARGIN, y);
    y += 14;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    education.preOperativeInstructions.slice(0, 4).forEach(inst => {
      const instLines = doc.splitTextToSize(`• ${inst}`, THERMAL_CONTENT_WIDTH);
      doc.text(instLines, THERMAL_MARGIN, y);
      y += instLines.length * 12;
    });
    y += 8;
  }

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 100) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Post-operative instructions (top 4)
  if (education.postOperativeInstructions.length > 0) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('AFTER SURGERY', THERMAL_MARGIN, y);
    y += 14;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    education.postOperativeInstructions.slice(0, 4).forEach(inst => {
      const instLines = doc.splitTextToSize(`• ${inst}`, THERMAL_CONTENT_WIDTH);
      doc.text(instLines, THERMAL_MARGIN, y);
      y += instLines.length * 12;
    });
    y += 8;
  }

  // Recovery time
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(`Recovery Time: ${education.expectedRecoveryTime}`, THERMAL_MARGIN, y);
  y += 16;

  // Check page break
  if (y > THERMAL_PAGE_HEIGHT - 80) {
    doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
    y = THERMAL_MARGIN;
  }

  // Possible complications (top 3)
  if (education.possibleComplications.length > 0) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('⚠ POSSIBLE COMPLICATIONS', THERMAL_MARGIN, y);
    y += 14;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    education.possibleComplications.slice(0, 3).forEach(comp => {
      const compLines = doc.splitTextToSize(`• ${comp}`, THERMAL_CONTENT_WIDTH);
      doc.text(compLines, THERMAL_MARGIN, y);
      y += compLines.length * 12;
    });
    y += 8;
  }

  // Divider
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Footer
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  const footerText = 'Discuss all treatment options with your surgeon.';
  doc.text(footerText, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.text('AstroHEALTH Healthcare', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });

  return doc;
}

export default {
  createEducationConditionThermalPDF,
  createCategorySummaryThermalPDF,
  createProcedureEducationThermalPDF,
};
