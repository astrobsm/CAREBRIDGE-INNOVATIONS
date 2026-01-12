/**
 * Drug Information PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates patient-friendly drug information sheets with:
 * - Drug details and dosing
 * - Expected side effects
 * - Warnings and precautions
 * - Actions to take when effects are noticed
 * - Refill guidelines
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_COLORS, addBrandedHeader, addBrandedFooter, type PDFDocumentInfo } from './pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES } from './pdfConfig';

export interface DrugInformation {
  genericName: string;
  brandName?: string;
  dosage: string;
  route: string;
  frequency: string;
  duration?: string;
  indication: string;
  
  // Side effects
  commonSideEffects: string[];
  seriousSideEffects: string[];
  
  // Warnings
  warnings: string[];
  precautions: string[];
  contraindications: string[];
  
  // Drug interactions
  drugInteractions?: string[];
  foodInteractions?: string[];
  
  // Instructions
  howToTake: string[];
  whatToAvoid: string[];
  whenToSeekHelp: string[];
  
  // Storage
  storage: string;
  
  // Refill information
  refillGuidelines: string[];
}

export interface PatientDrugInfo {
  patientName: string;
  hospitalNumber: string;
  prescribedBy: string;
  prescriptionDate: Date;
  medications: DrugInformation[];
  hospitalName: string;
}

/**
 * Generate Drug Information PDF
 */
export async function generateDrugInformationPDF(data: PatientDrugInfo): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // CRITICAL: Ensure white background on every page
  const ensureWhiteBackground = () => {
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  ensureWhiteBackground();

  // Add branded header
  const documentInfo: PDFDocumentInfo = {
    title: 'MEDICATION INFORMATION SHEET',
    subtitle: 'Important Information About Your Medicines',
    hospitalName: data.hospitalName,
  };
  yPos = addBrandedHeader(doc, documentInfo);
  yPos += 10;

  // Patient Information Box
  doc.setFillColor(240, 248, 255); // Light blue
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.rect(margin, yPos, contentWidth, 25, 'S');
  
  yPos += 8;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text('Patient Information', margin + 3, yPos);
  
  yPos += 6;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Name: ${data.patientName}`, margin + 3, yPos);
  doc.text(`Hospital No: ${data.hospitalNumber}`, margin + 90, yPos);
  
  yPos += 5;
  doc.text(`Prescribed by: ${data.prescribedBy}`, margin + 3, yPos);
  doc.text(`Date: ${format(data.prescriptionDate, 'dd/MM/yyyy')}`, margin + 90, yPos);
  
  yPos += 15;

  // Important Notice
  doc.setFillColor(255, 250, 230); // Light yellow
  doc.rect(margin, yPos, contentWidth, 20, 'F');
  doc.setDrawColor(234, 179, 8); // Warning color
  doc.rect(margin, yPos, contentWidth, 20, 'S');
  
  yPos += 7;
  doc.setFontSize(PDF_FONT_SIZES.caption);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(120, 70, 0);
  doc.text('IMPORTANT NOTICE', margin + 3, yPos);
  
  yPos += 5;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  const notice = 'Read this information carefully. Keep it for future reference. Do NOT share your medicines with others.';
  const noticeLines = doc.splitTextToSize(notice, contentWidth - 6);
  doc.text(noticeLines, margin + 3, yPos);
  
  yPos += 15;

  // Helper function to add new page if needed
  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin - 20) {
      addBrandedFooter(doc, 1, 1);
      doc.addPage();
      ensureWhiteBackground();
      yPos = margin + 10;
    }
  };

  // Loop through each medication
  data.medications.forEach((med, index) => {
    addNewPageIfNeeded(60);

    // Medication Header
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(margin, yPos, contentWidth, 10, 'F');
    doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(255, 255, 255); // White text on colored background
    doc.text(`MEDICATION ${index + 1}: ${med.genericName.toUpperCase()}`, margin + 3, yPos + 7);
    
    yPos += 15;
    doc.setTextColor(...PDF_COLORS.text); // Reset to black

    // Brand Name
    if (med.brandName) {
      doc.setFontSize(PDF_FONT_SIZES.body);
      doc.setFont(PDF_FONTS.primary, 'italic');
      doc.text(`Brand Name: ${med.brandName}`, margin + 3, yPos);
      yPos += 6;
    }

    // Dosing Information
    addNewPageIfNeeded(30);
    doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('HOW TO TAKE THIS MEDICINE:', margin, yPos);
    yPos += 7;

    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`- Dosage: ${med.dosage}`, margin + 3, yPos);
    yPos += 5;
    doc.text(`- Route: ${med.route}`, margin + 3, yPos);
    yPos += 5;
    doc.text(`- Frequency: ${med.frequency}`, margin + 3, yPos);
    yPos += 5;
    if (med.duration) {
      doc.text(`- Duration: ${med.duration}`, margin + 3, yPos);
      yPos += 5;
    }
    doc.text(`- Indication: ${med.indication}`, margin + 3, yPos);
    yPos += 10;

    // Instructions
    if (med.howToTake.length > 0) {
      addNewPageIfNeeded(30);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.primary);
      doc.text('Instructions:', margin, yPos);
      yPos += 6;

      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      med.howToTake.forEach((instruction) => {
        addNewPageIfNeeded(10);
        const lines = doc.splitTextToSize(`- ${instruction}`, contentWidth - 6);
        doc.text(lines, margin + 3, yPos);
        yPos += lines.length * 5;
      });
      yPos += 5;
    }

    // Common Side Effects
    if (med.commonSideEffects.length > 0) {
      addNewPageIfNeeded(30);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.info);
      doc.text('COMMON SIDE EFFECTS (Usually Mild):', margin, yPos);
      yPos += 6;

      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      med.commonSideEffects.forEach((effect) => {
        addNewPageIfNeeded(8);
        doc.text(`- ${effect}`, margin + 3, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Serious Side Effects
    if (med.seriousSideEffects.length > 0) {
      addNewPageIfNeeded(35);
      doc.setFillColor(255, 240, 240); // Light red
      const sectionHeight = (med.seriousSideEffects.length * 5) + 15;
      doc.rect(margin, yPos - 2, contentWidth, sectionHeight, 'F');
      doc.setDrawColor(...PDF_COLORS.danger);
      doc.rect(margin, yPos - 2, contentWidth, sectionHeight, 'S');

      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.danger);
      doc.text('SERIOUS SIDE EFFECTS - SEEK MEDICAL HELP IMMEDIATELY:', margin + 3, yPos + 5);
      yPos += 10;

      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      med.seriousSideEffects.forEach((effect) => {
        doc.text(`- ${effect}`, margin + 3, yPos);
        yPos += 5;
      });
      yPos += 10;
    }

    // Warnings and Precautions
    if (med.warnings.length > 0) {
      addNewPageIfNeeded(25);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(234, 179, 8);
      doc.text('WARNINGS:', margin, yPos);
      yPos += 6;

      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      med.warnings.forEach((warning) => {
        addNewPageIfNeeded(10);
        const lines = doc.splitTextToSize(`WARNING: ${warning}`, contentWidth - 6);
        doc.text(lines, margin + 3, yPos);
        yPos += lines.length * 5;
      });
      yPos += 5;
    }

    // What to Avoid
    if (med.whatToAvoid.length > 0) {
      addNewPageIfNeeded(25);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.danger);
      doc.text('WHAT TO AVOID:', margin, yPos);
      yPos += 6;

      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      med.whatToAvoid.forEach((avoid) => {
        addNewPageIfNeeded(10);
        const lines = doc.splitTextToSize(`✗ ${avoid}`, contentWidth - 6);
        doc.text(lines, margin + 3, yPos);
        yPos += lines.length * 5;
      });
      yPos += 5;
    }

    // When to Seek Help
    if (med.whenToSeekHelp.length > 0) {
      addNewPageIfNeeded(30);
      doc.setFillColor(255, 240, 240);
      const helpHeight = (med.whenToSeekHelp.length * 5) + 15;
      doc.rect(margin, yPos - 2, contentWidth, helpHeight, 'F');
      doc.setDrawColor(...PDF_COLORS.danger);
      doc.rect(margin, yPos - 2, contentWidth, helpHeight, 'S');

      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setTextColor(...PDF_COLORS.danger);
      doc.text('SEEK IMMEDIATE MEDICAL ATTENTION IF:', margin + 3, yPos + 5);
      yPos += 10;

      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(...PDF_COLORS.text);
      med.whenToSeekHelp.forEach((help) => {
        doc.text(`- ${help}`, margin + 6, yPos);
        yPos += 5;
      });
      yPos += 10;
    }

    // Storage
    addNewPageIfNeeded(15);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.text);
    doc.text('Storage:', margin, yPos);
    yPos += 6;
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(med.storage, margin + 3, yPos);
    yPos += 10;

    // Add spacing between medications
    if (index < data.medications.length - 1) {
      yPos += 10;
    }
  });

  // Refill Guidelines Section
  addNewPageIfNeeded(60);
  doc.setFillColor(255, 250, 230);
  doc.rect(margin, yPos, contentWidth, 50, 'F');
  doc.setDrawColor(234, 179, 8);
  doc.rect(margin, yPos, contentWidth, 50, 'S');

  yPos += 8;
  doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(120, 70, 0);
  doc.text('IMPORTANT: MEDICATION REFILL GUIDELINES', margin + 3, yPos);

  yPos += 8;
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);

  const refillGuidelines = [
    'DO NOT refill your medications without review by your doctor',
    'Schedule a follow-up appointment before your medication runs out',
    'Inform your doctor of any side effects or concerns',
    'Bring this sheet and your empty medication containers to your appointment',
    'Your doctor will reassess your condition and adjust treatment if needed',
    'WARNING: Unauthorized refills may be harmful or counterproductive',
  ];

  refillGuidelines.forEach((guideline) => {
    const lines = doc.splitTextToSize(`• ${guideline}`, contentWidth - 6);
    doc.text(lines, margin + 3, yPos);
    yPos += lines.length * 5.5;
  });

  // Add footer
  addBrandedFooter(doc, 1, 1);

  return doc;
}

/**
 * Download Drug Information PDF
 */
export async function downloadDrugInformationPDF(data: PatientDrugInfo): Promise<void> {
  const doc = await generateDrugInformationPDF(data);
  const fileName = `Drug_Information_${data.patientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
