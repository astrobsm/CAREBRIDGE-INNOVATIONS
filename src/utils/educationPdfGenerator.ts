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
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
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
      // Format instruction clearly with proper action verb
      let action = '';
      if (med.instruction.toLowerCase().includes('stop')) {
        action = 'STOP';
      } else if (med.instruction.toLowerCase().includes('continue')) {
        action = 'CONTINUE';
      } else {
        action = med.instruction.toUpperCase();
      }
      const text = `${med.medication}: ${action} ${med.instruction.toLowerCase().includes('before') ? med.instruction : ''} - ${med.reason}`;
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
    `Generated by AstroHEALTH Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
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
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
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
    `Generated by AstroHEALTH Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  const fileName = `Patient_Education_Category_${category.code}_${category.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
};

/**
 * Generate a complete Patient Education PDF for a Procedure
 * (Used for surgical procedure education from patientEducation.ts)
 */
export const downloadProcedureEducationPDF = (
  education: {
    procedureId: string;
    procedureName: string;
    category: string;
    overview: string;
    aims: string[];
    indications: string[];
    anesthesiaTypes?: string[];
    preferredAnesthesia: string;
    anesthesiaDescription?: string;
    expectedOutcomes: string[];
    generalComplications: Array<{ name: string; likelihood?: string; percentage?: string; description: string }>;
    specificComplications: Array<{ name: string; likelihood?: string; percentage?: string; description: string }>;
    lifestyleChanges: Array<{ 
      category: string; 
      recommendation: string; 
      importance: string;
      duration?: string;
    }>;
    patientResponsibilities: Array<{
      phase: string;
      importance: string;
      responsibility: string;
    }>;
    followUpSchedule: string[];
    warningSignsToReport?: string[];
    alternativeTreatments?: string[];
    riskOfNotTreating?: string;
    hospitalStay: string;
    healingTime: string;
    successRate: string;
  },
  patientName?: string,
  hospitalName?: string
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 10;

  // === PAGE 1: COVER AND OVERVIEW ===
  
  const headerInfo: PDFDocumentInfo = {
    title: 'Patient Education - Surgical Procedure',
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
  };
  y = addBrandedHeader(doc, headerInfo);
  y += 5;

  // Title box
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'S');
  
  y += 8;
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(16);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(education.procedureName, pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(59, 130, 246);
  doc.text(education.category, pageWidth / 2, y, { align: 'center' });
  
  if (patientName) {
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared for: ${patientName}`, pageWidth / 2, y, { align: 'center' });
  }
  
  y += 20;

  // Quick Stats Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  
  const statsY = y + 8;
  const colWidth = contentWidth / 4;
  
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Healing Time', margin + colWidth * 0.5, statsY, { align: 'center' });
  doc.text('Hospital Stay', margin + colWidth * 1.5, statsY, { align: 'center' });
  doc.text('Success Rate', margin + colWidth * 2.5, statsY, { align: 'center' });
  doc.text('Anesthesia', margin + colWidth * 3.5, statsY, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(education.healingTime || 'Varies', margin + colWidth * 0.5, statsY + 8, { align: 'center' });
  doc.text(education.hospitalStay || 'Varies', margin + colWidth * 1.5, statsY + 8, { align: 'center' });
  doc.text(education.successRate || 'High', margin + colWidth * 2.5, statsY + 8, { align: 'center' });
  doc.text(education.preferredAnesthesia || 'TBD', margin + colWidth * 3.5, statsY + 8, { align: 'center' });
  
  y += 30;

  // Overview
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  y = addWrappedText(doc, education.overview, margin, y, contentWidth, 5);
  y += 8;

  // Aims of Surgery
  y = checkPageBreak(doc, y, 40);
  y = addSectionHeader(doc, 'Aims of Surgery', y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  education.aims.forEach(aim => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, aim, margin, y, contentWidth);
    y += 2;
  });
  y += 5;

  // Indications
  y = checkPageBreak(doc, y, 40);
  y = addSectionHeader(doc, 'When This Surgery is Recommended', y);
  education.indications.forEach(indication => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, indication, margin, y, contentWidth);
    y += 2;
  });
  y += 5;

  // Anesthesia Information
  y = checkPageBreak(doc, y, 40);
  y = addSectionHeader(doc, 'Anesthesia Information', y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  if (education.anesthesiaDescription) {
    y = addWrappedText(doc, education.anesthesiaDescription, margin, y, contentWidth, 4);
    y += 3;
  }
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Preferred: ', margin, y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(education.preferredAnesthesia || 'To be determined', margin + 22, y);
  if (education.anesthesiaTypes && education.anesthesiaTypes.length > 0) {
    y += 5;
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Options: ', margin, y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(education.anesthesiaTypes.join(', '), margin + 20, y);
  }
  y += 8;

  // Expected Outcomes
  y = checkPageBreak(doc, y, 40);
  y = addSectionHeader(doc, 'Expected Outcomes', y);
  education.expectedOutcomes.forEach(outcome => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, outcome, margin, y, contentWidth);
    y += 2;
  });
  y += 5;

  // === PAGE 2: COMPLICATIONS ===
  doc.addPage();
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  y = 20;

  y = addSectionHeader(doc, 'Possible Complications', y);
  
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('All surgeries carry some risk. Your surgeon takes every precaution to minimize these risks.', margin + 3, y + 7);
  y += 18;

  // General Complications
  y = addSubsectionHeader(doc, 'General Surgical Risks', y);
  education.generalComplications.forEach(comp => {
    y = checkPageBreak(doc, y, 15);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, y - 3, contentWidth, 14, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(comp.name, margin + 3, y + 2);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68);
    doc.text(comp.percentage || comp.likelihood || '', margin + contentWidth - 25, y + 2);
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    const descLines = doc.splitTextToSize(comp.description, contentWidth - 10);
    doc.text(descLines[0] || '', margin + 3, y + 8);
    
    y += 18;
  });
  y += 3;

  // Specific Complications
  y = checkPageBreak(doc, y, 30);
  y = addSubsectionHeader(doc, 'Procedure-Specific Risks', y);
  education.specificComplications.forEach(comp => {
    y = checkPageBreak(doc, y, 15);
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y - 3, contentWidth, 14, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(comp.name, margin + 3, y + 2);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68);
    doc.text(comp.percentage || comp.likelihood || '', margin + contentWidth - 40, y + 2);
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    const descLines = doc.splitTextToSize(comp.description, contentWidth - 10);
    doc.text(descLines[0] || '', margin + 3, y + 8);
    
    y += 18;
  });

  // === PAGE 3: LIFESTYLE AND RESPONSIBILITIES ===
  doc.addPage();
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  y = 20;

  y = addSectionHeader(doc, 'Recovery & Lifestyle Changes', y);
  education.lifestyleChanges.forEach(change => {
    y = checkPageBreak(doc, y, 20);
    
    const importance = change.importance?.toLowerCase() || 'recommended';
    if (importance === 'essential' || importance === 'critical') {
      doc.setFillColor(254, 226, 226);
    } else {
      doc.setFillColor(240, 253, 244);
    }
    doc.roundedRect(margin, y - 3, contentWidth, 18, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(change.category, margin + 3, y + 2);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    if (importance === 'essential' || importance === 'critical') {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(22, 101, 52);
    }
    doc.text(change.importance?.toUpperCase() || 'RECOMMENDED', margin + contentWidth - 30, y + 2);
    
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(7);
    const descLines = doc.splitTextToSize(change.recommendation, contentWidth - 10);
    doc.text(descLines[0] || '', margin + 3, y + 8);
    if (change.duration) {
      doc.text(`Duration: ${change.duration}`, margin + 3, y + 13);
    }
    
    y += 22;
  });
  y += 5;

  // Patient Responsibilities - Group by phase
  y = checkPageBreak(doc, y, 60);
  y = addSectionHeader(doc, 'Your Responsibilities', y);
  
  // Group responsibilities by phase
  const phaseColors: Record<string, number[]> = {
    'before surgery': [219, 234, 254],
    'before_surgery': [219, 234, 254],
    'pre_operative': [219, 234, 254],
    'immediately after surgery': [254, 243, 199],
    'immediate_post_op': [254, 243, 199],
    'during recovery': [220, 252, 231],
    'during_recovery': [220, 252, 231],
    'recovery': [220, 252, 231],
    'long-term care': [243, 232, 255],
    'long_term': [243, 232, 255],
  };
  
  // Group by phase
  const groupedResp: Record<string, Array<{importance: string; responsibility: string}>> = {};
  education.patientResponsibilities.forEach(resp => {
    const phase = resp.phase?.toLowerCase() || 'general';
    if (!groupedResp[phase]) groupedResp[phase] = [];
    groupedResp[phase].push({ importance: resp.importance, responsibility: resp.responsibility });
  });
  
  Object.entries(groupedResp).forEach(([phase, items]) => {
    if (items && items.length > 0) {
      y = checkPageBreak(doc, y, 25);
      const color = phaseColors[phase] || [229, 231, 235];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(margin, y - 2, contentWidth, 8, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(0, 0, 0);
      // Capitalize phase name
      const phaseName = phase.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      doc.text(phaseName, margin + 3, y + 3);
      y += 10;
      
      items.forEach(item => {
        y = checkPageBreak(doc, y, 6);
        const taskText = item.importance ? `[${item.importance.toUpperCase()}] ${item.responsibility}` : item.responsibility;
        y = addBulletPoint(doc, taskText, margin + 5, y, contentWidth - 10);
        y += 1;
      });
      y += 5;
    }
  });

  // === PAGE 4: FOLLOW-UP AND WARNINGS ===
  doc.addPage();
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  y = 20;

  // Follow-up Schedule
  y = addSectionHeader(doc, 'Follow-up Schedule', y);
  education.followUpSchedule.forEach((visit, index) => {
    y = checkPageBreak(doc, y, 10);
    doc.setFillColor(239, 246, 255);
    doc.circle(margin + 5, y, 3, 'F');
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(String(index + 1), margin + 4, y + 1);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(visit, margin + 12, y + 1);
    y += 8;
  });
  y += 8;

  // Warning Signs
  const warningSigns = education.warningSignsToReport || [];
  if (warningSigns.length > 0) {
    y = checkPageBreak(doc, y, 50);
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('WARNING SIGNS - Seek Medical Help Immediately', margin + 3, y + 5);
    y += 12;
    
    warningSigns.forEach(sign => {
      y = checkPageBreak(doc, y, 8);
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      doc.text('•', margin + 3, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(sign, margin + 8, y);
      y += 6;
    });
    y += 8;
  }

  // Alternative Treatments
  const altTreatments = education.alternativeTreatments || [];
  if (altTreatments.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionHeader(doc, 'Alternative Treatment Options', y);
    altTreatments.forEach(alt => {
      y = checkPageBreak(doc, y, 6);
      y = addBulletPoint(doc, alt, margin, y, contentWidth);
      y += 2;
    });
    y += 5;
  }

  // Risk of Not Treating
  if (education.riskOfNotTreating) {
    y = checkPageBreak(doc, y, 30);
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
    doc.setDrawColor(217, 119, 6);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'S');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Risk of Not Having Surgery:', margin + 3, y + 6);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const riskLines = doc.splitTextToSize(education.riskOfNotTreating, contentWidth - 8);
    doc.text(riskLines.slice(0, 2), margin + 3, y + 12);
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `This document is for patient education purposes. Discuss all treatment options with your surgeon.`,
    pageWidth / 2,
    280,
    { align: 'center' }
  );
  doc.text(
    `Generated by AstroHEALTH Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  const fileName = `Patient_Education_${education.procedureName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

/**
 * Get Patient Education PDF document (returns jsPDF instead of saving)
 * Use this for export modal integration
 */
export const getPatientEducationPDFDoc = (
  condition: EducationCondition,
  category: EducationCategory,
  patientName?: string,
  hospitalName?: string
): jsPDF => {
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
  const headerInfo: PDFDocumentInfo = {
    title: 'Patient Education Information',
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
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

  // Overview Section
  y = addSectionHeader(doc, 'What Is This Condition?', y);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  y = addWrappedText(doc, condition.overview.definition, margin, y, contentWidth, 4.5);
  y += 5;

  // Causes
  y = checkPageBreak(doc, y, 40);
  y = addSubsectionHeader(doc, 'Common Causes', y);
  condition.overview.causes.slice(0, 4).forEach(cause => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, cause, margin, y, contentWidth);
  });
  y += 5;

  // Symptoms
  y = checkPageBreak(doc, y, 40);
  y = addSubsectionHeader(doc, 'Signs and Symptoms', y);
  condition.overview.symptoms.slice(0, 4).forEach(symptom => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, symptom, margin, y, contentWidth);
  });
  y += 5;

  // Warning signs
  y = checkPageBreak(doc, y, 40);
  y = addSectionHeader(doc, 'Warning Signs', y);
  condition.warningSigns.slice(0, 4).forEach(sign => {
    y = checkPageBreak(doc, y, 8);
    y = addBulletPoint(doc, sign, margin, y, contentWidth);
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This information is for educational purposes. Follow your healthcare provider\'s instructions.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );
  doc.text(
    `Generated by AstroHEALTH Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  return doc;
};

/**
 * Get Category Summary PDF document (returns jsPDF instead of saving)
 */
export const getCategorySummaryPDFDoc = (
  category: EducationCategory,
  hospitalName?: string
): jsPDF => {
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
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
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
    `Generated by AstroHEALTH Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  return doc;
};

/**
 * Get Procedure Education PDF document (returns jsPDF instead of saving)
 */
export const getProcedureEducationPDFDoc = (
  education: {
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
  },
  hospitalName?: string
): jsPDF => {
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
  const headerInfo: PDFDocumentInfo = {
    title: 'Procedure Education',
    hospitalName: hospitalName || 'AstroHEALTH Healthcare'
  };
  y = addBrandedHeader(doc, headerInfo);
  y += 5;

  // Procedure name box
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
  doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
  doc.setFontSize(14);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(education.procedureName, pageWidth / 2, y + 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Category: ${education.category}`, pageWidth / 2, y + 17, { align: 'center' });
  y += 30;

  // Overview
  y = addSectionHeader(doc, 'Overview', y);
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  y = addWrappedText(doc, education.overview, margin, y, contentWidth, 4.5);
  y += 8;

  // Aims
  if (education.aims.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSubsectionHeader(doc, 'Aims of Surgery', y);
    education.aims.slice(0, 4).forEach(aim => {
      y = checkPageBreak(doc, y, 8);
      y = addBulletPoint(doc, aim, margin, y, contentWidth);
    });
    y += 5;
  }

  // Pre-operative Instructions
  if (education.preOperativeInstructions.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionHeader(doc, 'Before Surgery', y);
    education.preOperativeInstructions.slice(0, 5).forEach(inst => {
      y = checkPageBreak(doc, y, 8);
      y = addBulletPoint(doc, inst, margin, y, contentWidth);
    });
    y += 5;
  }

  // Post-operative Instructions
  if (education.postOperativeInstructions.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionHeader(doc, 'After Surgery', y);
    education.postOperativeInstructions.slice(0, 5).forEach(inst => {
      y = checkPageBreak(doc, y, 8);
      y = addBulletPoint(doc, inst, margin, y, contentWidth);
    });
    y += 5;
  }

  // Recovery time
  y = checkPageBreak(doc, y, 20);
  doc.setFillColor(230, 255, 230);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Expected Recovery Time: ${education.expectedRecoveryTime}`, margin + 5, y + 8);
  y += 18;

  // Possible Complications
  if (education.possibleComplications.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionHeader(doc, 'Possible Complications', y);
    education.possibleComplications.slice(0, 4).forEach(comp => {
      y = checkPageBreak(doc, y, 8);
      y = addBulletPoint(doc, comp, margin, y, contentWidth);
    });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `This document is for patient education purposes. Discuss all treatment options with your surgeon.`,
    pageWidth / 2,
    280,
    { align: 'center' }
  );
  doc.text(
    `Generated by AstroHEALTH Healthcare System - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
};

export default {
  downloadPatientEducationPDF,
  downloadCategorySummaryPDF,
  downloadProcedureEducationPDF,
  getPatientEducationPDFDoc,
  getCategorySummaryPDFDoc,
  getProcedureEducationPDFDoc
};
