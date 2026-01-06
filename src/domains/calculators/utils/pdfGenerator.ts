// PDF Generator Utilities for Clinical Calculators
// Adapted from Critical Care Calculator

import jsPDF from 'jspdf';
import { PatientCalculatorInfo, SodiumResult, DVTRiskResult, GFRResult } from '../types';
import { addBrandedHeader, addBrandedFooter, PDF_COLORS, PDFDocumentInfo } from '../../../utils/pdfUtils';
import { PDF_FONTS } from '../../../utils/pdfConfig';

const PRIMARY_COLOR: [number, number, number] = PDF_COLORS.primary;
const DANGER_COLOR: [number, number, number] = [220, 38, 38]; // Red
const WARNING_COLOR: [number, number, number] = [234, 179, 8]; // Yellow
const SUCCESS_COLOR: [number, number, number] = [34, 197, 94]; // Green

// Helper to add header to PDF (with logo branding)
function addHeader(doc: jsPDF, title: string, patientInfo: PatientCalculatorInfo): number {
  // Add branded header with logo
  const documentInfo: PDFDocumentInfo = {
    title: 'Clinical Calculator Report',
    subtitle: title,
    hospitalName: patientInfo.hospital || 'CareBridge Innovations in Healthcare',
  };
  let yPos = addBrandedHeader(doc, documentInfo);
  
  // Patient info box
  yPos += 5;
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, 180, 40, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Patient Information', 20, yPos + 10);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  yPos += 18;
  
  const patientDetails = [
    `Name: ${patientInfo.name || 'Not specified'}`,
    `Age: ${patientInfo.age || 'N/A'} years`,
    `Gender: ${patientInfo.gender === 'male' ? 'Male' : patientInfo.gender === 'female' ? 'Female' : patientInfo.gender}`,
    `Hospital: ${patientInfo.hospital || 'N/A'}`,
    `Hospital #: ${patientInfo.hospitalNumber || 'N/A'}`,
  ];
  
  let xPos = 20;
  patientDetails.forEach((detail, index) => {
    if (index === 3) {
      xPos = 20;
      yPos += 12;
    }
    doc.text(detail, xPos, yPos);
    xPos += 60;
  });
  
  if (patientInfo.diagnosis) {
    yPos += 12;
    doc.text(`Diagnosis: ${patientInfo.diagnosis}`, 20, yPos);
  }
  
  return yPos + 20;
}

// Helper to add footer (with branding)
function addFooter(doc: jsPDF, pageNumber: number): void {
  addBrandedFooter(doc, pageNumber, undefined, 'For healthcare professionals only. Always verify calculations and use clinical judgment.');
}

// Sodium Calculator PDF
export function generateSodiumPDF(result: SodiumResult, patientInfo: PatientCalculatorInfo): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'Sodium Disorder Management', patientInfo);
  
  // Severity badge
  doc.setFillColor(
    result.isHypo ? (result.current < 125 ? 220 : 234) : (result.isHyper ? 220 : 34),
    result.isHypo ? (result.current < 125 ? 38 : 179) : (result.isHyper ? 38 : 197),
    result.isHypo ? (result.current < 125 ? 38 : 8) : (result.isHyper ? 38 : 94)
  );
  doc.roundedRect(15, yPos, 180, 20, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(result.severity, 105, yPos + 13, { align: 'center' });
  yPos += 30;
  
  // Lab Values
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Laboratory Values', 20, yPos);
  yPos += 8;
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.text(`Current Na+: ${result.current} mmol/L`, 20, yPos);
  doc.text(`Target Na+: ${result.target} mmol/L`, 100, yPos);
  yPos += 7;
  doc.text(`Weight: ${result.weight} kg`, 20, yPos);
  doc.text(`Total Body Water: ${result.tbw} L`, 100, yPos);
  yPos += 15;
  
  // Calculations
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(12);
  doc.text('Calculated Parameters', 20, yPos);
  yPos += 8;
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  
  if (result.isHypo) {
    doc.text(`Sodium Deficit: ${result.sodiumDeficit} mmol`, 20, yPos);
    yPos += 7;
  }
  if (result.waterDeficit) {
    doc.text(`Water Deficit: ${result.waterDeficit} L`, 20, yPos);
    yPos += 7;
  }
  doc.text(`Max Correction Rate: ${result.maxCorrection} mmol/L per ${result.correctionTime}h`, 20, yPos);
  yPos += 7;
  doc.text(`Na+ Change per L 0.9% NS: ${result.changePerLiterNS} mEq/L`, 20, yPos);
  yPos += 7;
  doc.text(`Volume 0.9% NS Needed: ${result.volumeNSNeeded} L`, 20, yPos);
  yPos += 7;
  doc.text(`Safe Initial Infusion Rate: ${result.infusionRateMlPerHr} mL/hr`, 20, yPos);
  yPos += 15;
  
  // Fluid Recommendation
  doc.setFillColor(219, 234, 254);
  doc.roundedRect(15, yPos, 180, 25, 3, 3, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text('Recommended Fluid', 20, yPos + 8);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.text(result.fluidType, 20, yPos + 18);
  yPos += 35;
  
  // Strategy
  if (result.fluidStrategy) {
    doc.setTextColor(0, 0, 0);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Management Strategy:', 20, yPos);
    yPos += 7;
    doc.setFont(PDF_FONTS.primary, 'normal');
    const strategyLines = doc.splitTextToSize(result.fluidStrategy, 170);
    doc.text(strategyLines, 20, yPos);
    yPos += strategyLines.length * 5 + 10;
  }
  
  // WHO Safety Guidelines
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, 180, 40, 3, 3, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14);
  doc.text('WHO Safety Guidelines', 20, yPos + 8);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  const guidelines = [
    '• Max correction: 6-8 mEq/L per 24 hours (NEVER exceed 10-12 mEq/L)',
    '• High-risk patients: ≤6 mEq/L per 24h',
    '• Monitor serum sodium every 2-4 hours during active correction',
    '• Hypernatremia: Correct at ≤0.5 mEq/L/hr',
  ];
  guidelines.forEach((g, i) => {
    doc.text(g, 20, yPos + 16 + (i * 5));
  });
  
  addFooter(doc, 1);
  doc.save(`sodium-management-${patientInfo.name || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// DVT Risk Calculator PDF
export function generateDVTRiskPDF(result: DVTRiskResult, patientInfo: PatientCalculatorInfo): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'DVT Risk Assessment (Caprini Score)', patientInfo);
  
  // Score badge
  const scoreColor = result.score <= 2 ? SUCCESS_COLOR : 
                     result.score <= 4 ? WARNING_COLOR : DANGER_COLOR;
  doc.setFillColor(...scoreColor);
  doc.roundedRect(15, yPos, 180, 30, 3, 3, 'F');
  doc.setFontSize(18);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Caprini Score: ${result.score}`, 105, yPos + 12, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`${result.riskLevel} - VTE Risk: ${result.riskPercentage}`, 105, yPos + 23, { align: 'center' });
  yPos += 40;
  
  // Score breakdown
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Risk Factor Breakdown', 20, yPos);
  yPos += 8;
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  
  const breakdownSections = [
    { label: '5-Point Factors', items: result.scoreBreakdown['5-point'], color: DANGER_COLOR },
    { label: '3-Point Factors', items: result.scoreBreakdown['3-point'], color: [234, 88, 12] as [number, number, number] },
    { label: '2-Point Factors', items: result.scoreBreakdown['2-point'], color: WARNING_COLOR },
    { label: '1-Point Factors', items: result.scoreBreakdown['1-point'], color: PRIMARY_COLOR },
  ];
  
  breakdownSections.forEach(section => {
    if (section.items.length > 0) {
      doc.setTextColor(...section.color);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text(`${section.label}:`, 20, yPos);
      yPos += 5;
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(0, 0, 0);
      section.items.forEach(item => {
        doc.text(`• ${item}`, 25, yPos);
        yPos += 5;
      });
      yPos += 3;
    }
  });
  
  // Recommendations
  yPos += 5;
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.text('Clinical Recommendations', 20, yPos);
  yPos += 7;
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  result.recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(`• ${rec}`, 170);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 4 + 2;
  });
  
  // Prophylaxis
  yPos += 5;
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(15, yPos, 180, 8 + result.prophylaxis.length * 5, 3, 3, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('Prophylaxis Protocol', 20, yPos + 6);
  yPos += 10;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  result.prophylaxis.forEach(item => {
    doc.text(item, 20, yPos);
    yPos += 5;
  });
  
  addFooter(doc, 1);
  doc.save(`dvt-risk-${patientInfo.name || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// GFR Calculator PDF
export function generateGFRPDF(result: GFRResult, patientInfo: PatientCalculatorInfo): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'GFR & Kidney Function Assessment', patientInfo);
  
  // GFR Values
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, 85, 40, 3, 3, 'F');
  doc.roundedRect(105, yPos, 85, 40, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('CKD-EPI GFR', 57, yPos + 10, { align: 'center' });
  doc.text('Cockcroft-Gault', 147, yPos + 10, { align: 'center' });
  
  doc.setFontSize(20);
  doc.text(`${result.gfrCKDEPI.toFixed(1)}`, 57, yPos + 25, { align: 'center' });
  doc.text(`${result.gfrCockcroftGault.toFixed(1)}`, 147, yPos + 25, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('mL/min/1.73m²', 57, yPos + 33, { align: 'center' });
  doc.text('mL/min', 147, yPos + 33, { align: 'center' });
  yPos += 50;
  
  // CKD Stage
  const stageColor = result.ckdStage === 'G1' || result.ckdStage === 'G2' ? SUCCESS_COLOR :
                     result.ckdStage === 'G3a' || result.ckdStage === 'G3b' ? WARNING_COLOR : DANGER_COLOR;
  doc.setFillColor(...stageColor);
  doc.roundedRect(15, yPos, 180, 20, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`CKD Stage ${result.ckdStage}: ${result.stageDescription}`, 105, yPos + 13, { align: 'center' });
  yPos += 30;
  
  // Recommendations
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.text('Recommendations', 20, yPos);
  yPos += 7;
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  result.recommendations.forEach(rec => {
    doc.text(`• ${rec}`, 20, yPos);
    yPos += 5;
  });
  
  // Drug Dosing
  if (result.drugDosingAdjustments.length > 0) {
    yPos += 5;
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(11);
    doc.text('Drug Dosing Adjustments', 20, yPos);
    yPos += 7;
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(9);
    result.drugDosingAdjustments.forEach(adj => {
      doc.text(`• ${adj}`, 20, yPos);
      yPos += 5;
    });
  }
  
  addFooter(doc, 1);
  doc.save(`gfr-assessment-${patientInfo.name || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

export default {
  generateSodiumPDF,
  generateDVTRiskPDF,
  generateGFRPDF,
};
