/**
 * Patient Education PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates downloadable PDF documents for patient education materials
 * with clear, readable content following WHO guidelines
 */

import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import type { EducationCondition, EducationCategory } from '../domains/patient-education/types';
import { PDF_COLORS, addBrandedHeader, PDFDocumentInfo } from './pdfUtils';
import { PDF_FONTS } from './pdfConfig';

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
  if (y > 270 - neededSpace) {
    doc.addPage();
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

/**
 * Generate a complete Patient Education PDF for a condition
 */
export const downloadPatientEducationPDF = (
  condition: EducationCondition,
  category: EducationCategory,
  patientName?: string,
  hospitalName?: string
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 10;

  // === PAGE 1: COVER AND OVERVIEW ===
  
  // Header
  const headerInfo: PDFDocumentInfo = {
    title: 'Patient Education Information',
    hospitalName: hospitalName || 'CareBridge Healthcare'
  };
  y = addBrandedHeader(doc, headerInfo);
  y += 5;

  // Title box
  doc.setFillColor(240, 249, 255);
  doc.rect(margin, y, contentWidth, 25, 'F');
  doc.setDrawColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.rect(margin, y, contentWidth, 25, 'S');
  
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.setFontSize(14);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(condition.name, margin + 5, y + 10);
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Category: ${category.name}`, margin + 5, y + 18);
  doc.text(`ICD Code: ${condition.icdCode}`, margin + 100, y + 18);
  
  y += 32;

  // Patient info if provided
  if (patientName) {
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Prepared for: ${patientName}`, margin, y);
    doc.text(`Date: ${format(new Date(), 'dd MMMM yyyy')}`, margin + 100, y);
    y += 10;
  }

  // === OVERVIEW SECTION ===
  y = addSectionHeader(doc, 'What Is This Condition?', y);
  
  // Definition
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  y = addWrappedText(doc, condition.overview.definition, margin, y, contentWidth, 4.5);
  y += 5;

  // Alternate names
  if (condition.alternateNames && condition.alternateNames.length > 0) {
    doc.setFont(PDF_FONTS.primary, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Also known as: ${condition.alternateNames.join(', ')}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // Causes
  y = checkPageBreak(doc, y, 40);
  y = addSubsectionHeader(doc, 'Common Causes', y);
  condition.overview.causes.slice(0, 6).forEach(cause => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, cause, margin, y, contentWidth);
  });
  y += 5;

  // Symptoms
  y = checkPageBreak(doc, y, 40);
  y = addSubsectionHeader(doc, 'Signs and Symptoms', y);
  condition.overview.symptoms.slice(0, 6).forEach(symptom => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, symptom, margin, y, contentWidth);
  });
  y += 5;

  // Risk Factors
  y = checkPageBreak(doc, y, 40);
  y = addSubsectionHeader(doc, 'Risk Factors', y);
  condition.overview.riskFactors.slice(0, 5).forEach(factor => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, factor, margin, y, contentWidth);
  });

  // === PAGE 2: TREATMENT PHASES ===
  doc.addPage();
  y = 20;
  
  y = addSectionHeader(doc, 'Treatment Phases', y);

  condition.treatmentPhases.forEach((phase) => {
    y = checkPageBreak(doc, y, 60);
    
    // Phase header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, contentWidth, 20, 'F');
    
    doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
    doc.setFontSize(10);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(`Phase ${phase.phase}: ${phase.name}`, margin + 3, y + 2);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`Duration: ${phase.duration}`, margin + 3, y + 9);
    
    doc.setTextColor(0, 0, 0);
    y += 20;
    
    // Phase description
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(9);
    y = addWrappedText(doc, phase.description, margin, y, contentWidth, 4);
    y += 3;

    // Goals
    y = checkPageBreak(doc, y, 25);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text('Goals:', margin, y);
    y += 5;
    doc.setFont(PDF_FONTS.primary, 'normal');
    phase.goals.slice(0, 4).forEach(goal => {
      y = checkPageBreak(doc, y, 8);
      y = addBulletPoint(doc, goal, margin + 3, y, contentWidth - 3);
    });
    y += 8;
  });

  // === PAGE 3: PREOPERATIVE INSTRUCTIONS ===
  const preop = condition.preoperativeInstructions;
  if (preop) {
    doc.addPage();
    y = 20;
    
    y = addSectionHeader(doc, 'Before Your Surgery/Procedure', y);

    // Consultations
    if (preop.consultations.length > 0) {
      y = addSubsectionHeader(doc, 'Required Consultations', y);
      preop.consultations.forEach(consult => {
        y = checkPageBreak(doc, y, 6);
        y = addBulletPoint(doc, consult, margin, y, contentWidth);
      });
      y += 5;
    }

  // Investigations
  if (preop.investigations.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = addSubsectionHeader(doc, 'Tests and Investigations', y);
    preop.investigations.forEach(invest => {
      y = checkPageBreak(doc, y, 6);
      y = addBulletPoint(doc, invest, margin, y, contentWidth);
    });
    y += 5;
  }

  // Medication instructions
  if (preop.medications.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSubsectionHeader(doc, 'Medication Instructions', y);
    preop.medications.forEach(med => {
      y = checkPageBreak(doc, y, 8);
      const instruction = med.instruction === 'stop' ? 'STOP' : 'CONTINUE';
      const text = `${med.medication}: ${instruction} - ${med.reason}`;
      y = addBulletPoint(doc, text, margin, y, contentWidth);
    });
    y += 5;
  }

  // Day before surgery
  y = checkPageBreak(doc, y, 30);
  y = addSubsectionHeader(doc, 'The Day Before Surgery', y);
  preop.dayBeforeSurgery.forEach(instruction => {
    y = checkPageBreak(doc, y, 6);
    y = addBulletPoint(doc, instruction, margin, y, contentWidth);
  });
  y += 5;

  // Day of surgery
  y = checkPageBreak(doc, y, 30);
  y = addSubsectionHeader(doc, 'Day of Surgery', y);
  preop.dayOfSurgery.forEach(instruction => {
    y = checkPageBreak(doc, y, 6);
    y = addBulletPoint(doc, instruction, margin, y, contentWidth);
  });
  } // End preop section

  // === PAGE 4: POSTOPERATIVE INSTRUCTIONS ===
  const postop = condition.postoperativeInstructions;
  if (postop) {
    doc.addPage();
    y = 20;
    
    y = addSectionHeader(doc, 'After Your Surgery/Procedure', y);

    // Immediate postop
    y = addSubsectionHeader(doc, 'Immediately After Surgery', y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(9);
    doc.text(`Position: ${postop.immediatePostop.positioning}`, margin, y);
    y += 6;
    
    if (postop.immediatePostop.expectedSymptoms) {
      y = checkPageBreak(doc, y, 20);
      doc.text('What to expect:', margin, y);
      y += 4;
      postop.immediatePostop.expectedSymptoms.slice(0, 4).forEach(symptom => {
        y = checkPageBreak(doc, y, 6);
        y = addBulletPoint(doc, symptom, margin + 3, y, contentWidth - 3);
      });
    }
    y += 5;

    // Wound care
    y = checkPageBreak(doc, y, 40);
    y = addSubsectionHeader(doc, 'Wound Care Instructions', y);
    postop.woundCare.forEach(care => {
      y = checkPageBreak(doc, y, 8);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setFontSize(8);
      doc.text(`${care.day}:`, margin, y);
      doc.setFont(PDF_FONTS.primary, 'normal');
      y = addWrappedText(doc, care.instruction, margin + 25, y, contentWidth - 25, 4);
      y += 2;
    });
    y += 5;

    // Pain management
    y = checkPageBreak(doc, y, 30);
    y = addSubsectionHeader(doc, 'Pain Management', y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(9);
    doc.text(`Expected pain level: ${postop.painManagement.expectedPainLevel}`, margin, y);
    y += 6;
    doc.text('Medications that may be prescribed:', margin, y);
    y += 4;
    postop.painManagement.medications.forEach(med => {
      y = checkPageBreak(doc, y, 6);
      y = addBulletPoint(doc, med, margin + 3, y, contentWidth - 3);
    });
    y += 5;

    // Activity restrictions
    y = checkPageBreak(doc, y, 40);
    y = addSubsectionHeader(doc, 'Activity Restrictions', y);
    postop.activityRestrictions.forEach(restriction => {
      y = checkPageBreak(doc, y, 8);
      const text = `${restriction.activity}: ${restriction.restriction} for ${restriction.duration} - ${restriction.reason}`;
      y = addBulletPoint(doc, text, margin, y, contentWidth);
    });
    y += 5;

    // Diet
    y = checkPageBreak(doc, y, 30);
    y = addSubsectionHeader(doc, 'Diet and Nutrition', y);
    postop.dietaryGuidelines.slice(0, 5).forEach(guideline => {
      y = checkPageBreak(doc, y, 6);
      y = addBulletPoint(doc, guideline, margin, y, contentWidth);
    });
  } // End postop section

  // === PAGE 5: EXPECTED OUTCOMES AND FOLLOW-UP ===
  doc.addPage();
  y = 20;

  y = addSectionHeader(doc, 'What to Expect', y);

  // Short term outcomes
  y = addSubsectionHeader(doc, 'Short-Term Outcomes', y);
  condition.expectedOutcomes.shortTerm.forEach(outcome => {
    y = checkPageBreak(doc, y, 12);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text(`${outcome.timeframe}:`, margin, y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    y = addWrappedText(doc, outcome.expectation, margin + 35, y, contentWidth - 35, 4);
    y += 2;
  });
  y += 5;

  // Long term outcomes
  y = checkPageBreak(doc, y, 30);
  y = addSubsectionHeader(doc, 'Long-Term Outcomes', y);
  condition.expectedOutcomes.longTerm.forEach(outcome => {
    y = checkPageBreak(doc, y, 12);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text(`${outcome.timeframe}:`, margin, y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    y = addWrappedText(doc, outcome.expectation, margin + 35, y, contentWidth - 35, 4);
    y += 2;
  });
  y += 5;

  // Functional and cosmetic
  y = checkPageBreak(doc, y, 25);
  y = addSubsectionHeader(doc, 'Recovery Expectations', y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  doc.text('Functional Recovery:', margin, y);
  y = addWrappedText(doc, condition.expectedOutcomes.functionalRecovery, margin + 35, y, contentWidth - 35, 4);
  y += 5;
  doc.text('Cosmetic Outcome:', margin, y);
  const cosmeticOutcome = condition.expectedOutcomes.cosmeticOutcome || 'Results vary by individual case';
  y = addWrappedText(doc, cosmeticOutcome, margin + 35, y, contentWidth - 35, 4);
  y += 8;

  // Success rate
  if (condition.expectedOutcomes.successRate) {
    y = checkPageBreak(doc, y, 15);
    doc.setFillColor(230, 255, 230);
    doc.rect(margin, y - 4, contentWidth, 12, 'F');
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text('Success Rate:', margin + 3, y + 2);
    doc.setFont(PDF_FONTS.primary, 'normal');
    y = addWrappedText(doc, condition.expectedOutcomes.successRate, margin + 30, y + 2, contentWidth - 33, 4);
    y += 10;
  }

  // === FOLLOW-UP CARE ===
  y = checkPageBreak(doc, y, 50);
  y = addSectionHeader(doc, 'Follow-Up Care', y);

  y = addSubsectionHeader(doc, 'Appointment Schedule', y);
  condition.followUpCare.schedule.forEach((appt) => {
    y = checkPageBreak(doc, y, 12);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text(`${appt.timing}:`, margin, y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    y = addWrappedText(doc, appt.purpose, margin + 40, y, contentWidth - 40, 4);
    y += 2;
  });

  // === PAGE 6: WARNING SIGNS AND EMERGENCY ===
  doc.addPage();
  y = 20;

  // Warning signs
  y = addSectionHeader(doc, 'Warning Signs - When to Contact Your Doctor', y);
  doc.setFillColor(255, 250, 230);
  doc.rect(margin, y - 2, contentWidth, (condition.warningSigns.length * 5) + 8, 'F');
  y += 3;
  condition.warningSigns.forEach(sign => {
    y = checkPageBreak(doc, y, 6);
    y = addBulletPoint(doc, sign, margin + 3, y, contentWidth - 6);
  });
  y += 8;

  // Emergency signs
  y = checkPageBreak(doc, y, 50);
  doc.setFillColor(255, 230, 230);
  doc.rect(margin, y - 5, contentWidth, 10, 'F');
  doc.setTextColor(180, 0, 0);
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('EMERGENCY - Seek Immediate Medical Attention', margin + 5, y + 2);
  doc.setTextColor(0, 0, 0);
  y += 12;
  
  doc.setFillColor(255, 245, 245);
  doc.rect(margin, y - 2, contentWidth, (condition.emergencySigns.length * 5) + 8, 'F');
  y += 3;
  condition.emergencySigns.forEach(sign => {
    y = checkPageBreak(doc, y, 6);
    doc.setTextColor(180, 0, 0);
    y = addBulletPoint(doc, sign, margin + 3, y, contentWidth - 6);
  });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Compliance requirements
  y = checkPageBreak(doc, y, 50);
  y = addSectionHeader(doc, 'Important Instructions for Your Recovery', y);
  condition.complianceRequirements.forEach((req) => {
    y = checkPageBreak(doc, y, 20);
    
    const importanceColor = req.importance === 'critical' 
      ? [220, 53, 69] 
      : [255, 193, 7];
    
    doc.setFillColor(importanceColor[0], importanceColor[1], importanceColor[2]);
    doc.circle(margin + 3, y - 1, 2, 'F');
    
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text(req.requirement, margin + 8, y);
    y += 5;
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`If not followed: ${req.consequence}`, margin + 8, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  });

  // WHO Guidelines
  if (condition.whoGuidelines && condition.whoGuidelines.length > 0) {
    doc.addPage();
    y = 20;
    
    y = addSectionHeader(doc, 'WHO Guidelines Reference', y);
    
    condition.whoGuidelines.forEach(guideline => {
      y = checkPageBreak(doc, y, 30);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setFontSize(9);
      doc.text(`${guideline.title} (${guideline.reference})`, margin, y);
      y += 6;
      
      doc.setFont(PDF_FONTS.primary, 'normal');
      guideline.keyPoints.forEach(point => {
        y = checkPageBreak(doc, y, 6);
        y = addBulletPoint(doc, point, margin + 3, y, contentWidth - 3);
      });
      y += 8;
    });
  }

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This information is for educational purposes. Always follow your healthcare provider\'s specific instructions.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );
  doc.text(
    `Generated by CareBridge Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  // Save the PDF
  const fileName = `Patient_Education_${condition.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

/**
 * Generate a summary PDF for a category
 */
export const downloadCategorySummaryPDF = (
  category: EducationCategory,
  hospitalName?: string
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 10;

  // Header
  const summaryHeaderInfo: PDFDocumentInfo = {
    title: 'Patient Education Materials',
    hospitalName: hospitalName || 'CareBridge Healthcare'
  };
  y = addBrandedHeader(doc, summaryHeaderInfo);
  y += 10;

  // Category title
  doc.setFillColor(240, 249, 255);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.setFontSize(14);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(`Category ${category.code}: ${category.name}`, margin + 5, y + 12);
  y += 28;

  // List of conditions
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Available Educational Materials:', margin, y);
  y += 8;

  category.conditions.forEach((condition, index) => {
    y = checkPageBreak(doc, y, 15);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(10);
    doc.text(`${index + 1}. ${condition.name}`, margin + 5, y);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    if (condition.alternateNames && condition.alternateNames.length > 0) {
      doc.text(`(${condition.alternateNames.slice(0, 2).join(', ')})`, margin + 10, y + 4);
      y += 4;
    }
    doc.setTextColor(0, 0, 0);
    y += 8;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'For detailed information on any condition, request the full patient education document.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );
  doc.text(
    `Generated by CareBridge Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  const fileName = `Patient_Education_Category_${category.code}_${category.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
};

export default {
  downloadPatientEducationPDF,
  downloadCategorySummaryPDF
};
