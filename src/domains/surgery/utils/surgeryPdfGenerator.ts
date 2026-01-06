// PDF Generator Utilities for Surgery Planning
// Includes Pre-operative Instructions, Post-operative Instructions, and Fee Estimates

import jsPDF from 'jspdf';
import { SurgicalFeeEstimate, SurgicalProcedure } from '../../../data/surgicalFees';
import { 
  addBrandedHeader, 
  addBrandedFooter, 
  PDF_COLORS,
  type PDFDocumentInfo,
} from '../../../utils/pdfUtils';
import { PDF_FONTS } from '../../../utils/pdfConfig';

const DANGER_COLOR: [number, number, number] = PDF_COLORS.danger;

interface PatientInfo {
  name: string;
  hospitalNumber: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
}

interface SurgeryInfo {
  procedureName: string;
  procedureCode?: string;
  scheduledDate: string;
  scheduledTime?: string;
  surgeon: string;
  anaesthetist?: string;
  anaesthesiaType?: string;
  asaScore: number;
  capriniScore?: number;
  hospitalName?: string;
  ward?: string;
}

// Helper to add header to PDF (now uses branded header with logo)
function addHeader(doc: jsPDF, title: string, subtitle?: string, hospitalName?: string): number {
  const info: PDFDocumentInfo = {
    title,
    subtitle,
    hospitalName: hospitalName || 'CareBridge Innovations in Healthcare',
  };
  return addBrandedHeader(doc, info);
}

// Helper to add footer (now uses branded footer)
function addFooter(doc: jsPDF, pageNumber: number, totalPages?: number): void {
  addBrandedFooter(doc, pageNumber, totalPages, 'Please bring this document to the hospital on the day of surgery.');
}

// Helper to add patient info box
function addPatientBox(doc: jsPDF, yPos: number, patient: PatientInfo, surgery: SurgeryInfo): number {
  // Box with subtle border for definition
  doc.setFillColor(245, 250, 255);
  doc.roundedRect(15, yPos, 180, 48, 3, 3, 'F');
  doc.setDrawColor(81, 112, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, 180, 48, 3, 3, 'S');
  
  // Title
  doc.setFontSize(12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(24, 0, 172); // Dark purple for title
  doc.text('Patient Information', 20, yPos + 10);
  
  // Draw a line under title
  doc.setDrawColor(200, 210, 255);
  doc.setLineWidth(0.3);
  doc.line(20, yPos + 13, 185, yPos + 13);
  
  // Content with pure black text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  const leftCol = 20;
  const rightCol = 110;
  let lineY = yPos + 22;
  
  // Labels in bold, values in normal
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Name:', leftCol, lineY);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(patient.name, 42, lineY);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Hospital No:', rightCol, lineY);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(patient.hospitalNumber, 147, lineY);
  lineY += 9;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Age:', leftCol, lineY);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`${patient.age || 'N/A'} years`, 37, lineY);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Gender:', rightCol, lineY);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(patient.gender || 'N/A', 137, lineY);
  lineY += 9;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Procedure:', leftCol, lineY);
  doc.setFont(PDF_FONTS.primary, 'normal');
  // Truncate long procedure names
  const maxProcLength = 45;
  const procName = surgery.procedureName.length > maxProcLength 
    ? surgery.procedureName.substring(0, maxProcLength) + '...' 
    : surgery.procedureName;
  doc.text(procName, 52, lineY);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Date:', 155, lineY);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(new Date(surgery.scheduledDate).toLocaleDateString('en-GB'), 170, lineY);
  
  return yPos + 58;
}

// Helper to add numbered list with clear black text
function addNumberedList(doc: jsPDF, yPos: number, items: string[], maxWidth: number = 165): number {
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Pure black
  
  items.forEach((item, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${item}`, maxWidth);
    lines.forEach((line: string, lineIndex: number) => {
      doc.text(lineIndex === 0 ? line : `    ${line}`, 25, yPos);
      yPos += 6;
    });
    yPos += 2;
  });
  
  return yPos;
}

// Helper to add bullet list with clear black text
function addBulletList(doc: jsPDF, yPos: number, items: string[], maxWidth: number = 165): number {
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Pure black
  
  items.forEach((item) => {
    // Use a simple dash instead of bullet for better PDF compatibility
    const lines = doc.splitTextToSize(`- ${item}`, maxWidth);
    lines.forEach((line: string, lineIndex: number) => {
      doc.text(lineIndex === 0 ? line : `   ${line}`, 25, yPos);
      yPos += 6;
    });
    yPos += 1;
  });
  
  return yPos;
}

// Helper to add section title with high contrast
function addSectionTitle(doc: jsPDF, yPos: number, title: string): number {
  doc.setFillColor(24, 0, 172); // Dark purple for better contrast
  doc.roundedRect(15, yPos, 180, 10, 2, 2, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255); // White text on dark background
  doc.text(title, 20, yPos + 7);
  return yPos + 16;
}

// PRE-OPERATIVE INSTRUCTIONS PDF
export function generatePreOpInstructionsPDF(patient: PatientInfo, surgery: SurgeryInfo): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'Pre-Operative Instructions', 'Patient Preparation Guidelines Before Surgery');
  
  yPos = addPatientBox(doc, yPos, patient, surgery);
  
  // Fasting Instructions
  yPos = addSectionTitle(doc, yPos, 'FASTING INSTRUCTIONS (NPO - Nothing by Mouth)');
  
  const fastingInstructions = [
    'NO SOLID FOOD for at least 6 hours before surgery.',
    'NO MILK or milk-containing drinks for at least 6 hours before surgery.',
    'CLEAR FLUIDS ONLY (water, clear apple juice, black tea without milk) may be taken up to 2 hours before surgery.',
    'NO FLUIDS AT ALL for the final 2 hours before your scheduled surgery time.',
    'This includes water, chewing gum, and sweets.',
  ];
  yPos = addNumberedList(doc, yPos, fastingInstructions);
  yPos += 5;
  
  // Medications
  yPos = addSectionTitle(doc, yPos, 'MEDICATIONS');
  
  const medicationInstructions = [
    'Take your regular morning medications with a small sip of water unless otherwise instructed.',
    'STOP blood thinners (Warfarin, Aspirin, Clopidogrel) as advised by your surgeon - usually 5-7 days before surgery.',
    'STOP herbal supplements and vitamins at least 7 days before surgery.',
    'If you are DIABETIC: Skip your morning insulin/diabetes medication. Bring it with you to the hospital.',
    'Inform the surgical team about ALL medications you are taking.',
  ];
  yPos = addNumberedList(doc, yPos, medicationInstructions);
  yPos += 5;
  
  // What to Bring
  yPos = addSectionTitle(doc, yPos, 'WHAT TO BRING TO THE HOSPITAL');
  
  const bringItems = [
    'This instruction sheet and your surgical consent form',
    'Hospital identification card and health insurance documents (if applicable)',
    'All current medications in their original containers',
    'Recent laboratory results and X-rays/scans',
    'Comfortable loose-fitting clothes for going home',
    'Personal toiletries and sanitary items',
    'Glasses/contact lens case (do not wear contact lenses during surgery)',
    'Phone charger and a small amount of money',
  ];
  yPos = addBulletList(doc, yPos, bringItems);
  
  // Add new page for more instructions
  doc.addPage();
  yPos = 20;
  
  // Leave at Home
  yPos = addSectionTitle(doc, yPos, 'LEAVE AT HOME / REMOVE BEFORE SURGERY');
  
  const leaveItems = [
    'All jewelry including rings, earrings, necklaces, watches, and piercings',
    'Dentures, dental plates, and removable bridges',
    'Wigs, hair extensions, and hairpieces',
    'Makeup, nail polish (fingers and toes), and artificial nails',
    'Contact lenses',
    'Valuables including large amounts of cash',
  ];
  yPos = addBulletList(doc, yPos, leaveItems);
  yPos += 5;
  
  // Day Before Surgery
  yPos = addSectionTitle(doc, yPos, 'THE DAY BEFORE SURGERY');
  
  const dayBeforeInstructions = [
    'Take a bath or shower using antibacterial soap.',
    'Shave the surgical area ONLY if instructed by your surgeon.',
    'Prepare your bag with items listed above.',
    'Arrange for a responsible adult to drive you home after surgery.',
    'Get a good night\'s sleep - try to relax.',
    'Confirm your surgery time by calling the hospital.',
  ];
  yPos = addNumberedList(doc, yPos, dayBeforeInstructions);
  yPos += 5;
  
  // On the Day
  yPos = addSectionTitle(doc, yPos, 'ON THE DAY OF SURGERY');
  
  const dayOfInstructions = [
    'Follow all fasting instructions strictly.',
    'Take a shower/bath and wear clean, loose-fitting clothes.',
    'Do NOT apply lotions, creams, deodorants, or perfumes.',
    'Arrive at the hospital at least 2 hours before your scheduled surgery time.',
    'Report to the surgical admissions/reception desk.',
    'You will change into a hospital gown and have final checks done.',
  ];
  yPos = addNumberedList(doc, yPos, dayOfInstructions);
  yPos += 5;
  
  // Warning Signs
  doc.setFillColor(...DANGER_COLOR);
  doc.roundedRect(15, yPos, 180, 8, 2, 2, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('IMPORTANT - CONTACT US IF:', 20, yPos + 6);
  yPos += 15;
  
  doc.setTextColor(...DANGER_COLOR);
  const warningItems = [
    'You develop a cold, cough, fever, or feel unwell before surgery',
    'You experience vomiting or diarrhea',
    'You have any skin rashes, infections, or open sores',
    'You have accidentally eaten or drunk something when you should be fasting',
    'You are or might be pregnant',
  ];
  yPos = addBulletList(doc, yPos, warningItems);
  
  // Contact Information
  yPos += 10;
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, 180, 30, 3, 3, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Hospital Contact Information', 20, yPos + 10);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.text(`Hospital: ${surgery.hospitalName || 'Please contact your referring hospital'}`, 20, yPos + 20);
  doc.text(`Surgeon: ${surgery.surgeon}`, 120, yPos + 20);
  
  addFooter(doc, 1);
  doc.setPage(1);
  addFooter(doc, 2);
  
  doc.save(`PreOp_Instructions_${patient.hospitalNumber}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// POST-OPERATIVE INSTRUCTIONS PDF
export function generatePostOpInstructionsPDF(
  patient: PatientInfo, 
  surgery: SurgeryInfo,
  customInstructions?: {
    woundCare?: string[];
    medications?: string[];
    activities?: string[];
    diet?: string[];
    followUp?: string;
  }
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'Post-Operative Instructions', 'Recovery Guidelines After Surgery');
  
  yPos = addPatientBox(doc, yPos, patient, surgery);
  
  // General Recovery
  yPos = addSectionTitle(doc, yPos, 'GENERAL RECOVERY GUIDELINES');
  
  const generalInstructions = [
    'Rest is essential - do not rush your recovery.',
    'You may feel tired and drowsy for 24-48 hours after anaesthesia - this is normal.',
    'Do NOT drive, operate machinery, or make important decisions for 24 hours after anaesthesia.',
    'Have a responsible adult stay with you for the first 24 hours.',
    'Take prescribed medications as directed.',
  ];
  yPos = addNumberedList(doc, yPos, generalInstructions);
  yPos += 5;
  
  // Wound Care
  yPos = addSectionTitle(doc, yPos, 'WOUND CARE');
  
  const defaultWoundCare = customInstructions?.woundCare || [
    'Keep the wound clean and dry for the first 48 hours.',
    'Do not remove the dressing unless instructed by your surgeon.',
    'After 48 hours, you may shower with the dressing on, then pat dry and replace with a clean dressing.',
    'Do not soak in a bath, swim, or use a hot tub until wound is fully healed.',
    'Watch for signs of infection: increasing redness, swelling, warmth, pus, or fever.',
    'Sutures/staples will be removed at your follow-up appointment (usually 7-14 days).',
  ];
  yPos = addNumberedList(doc, yPos, defaultWoundCare);
  yPos += 5;
  
  // Pain Management
  yPos = addSectionTitle(doc, yPos, 'PAIN MANAGEMENT');
  
  const painInstructions = [
    'Some pain and discomfort is normal after surgery.',
    'Take pain medications as prescribed - do not wait until pain becomes severe.',
    'Use ice packs wrapped in cloth for 15-20 minutes at a time to reduce swelling.',
    'Avoid alcohol while taking pain medications.',
    'If pain is not controlled with prescribed medications, contact your surgeon.',
  ];
  yPos = addNumberedList(doc, yPos, painInstructions);
  
  // Add new page
  doc.addPage();
  yPos = 20;
  
  // Activity Restrictions
  yPos = addSectionTitle(doc, yPos, 'ACTIVITY RESTRICTIONS');
  
  const defaultActivities = customInstructions?.activities || [
    'Avoid heavy lifting (more than 5kg) for 4-6 weeks.',
    'No strenuous exercise or sports until cleared by your surgeon.',
    'Short walks are encouraged to prevent blood clots.',
    'Gradually increase activity as tolerated.',
    'Return to work depends on type of work - discuss with your surgeon.',
  ];
  yPos = addNumberedList(doc, yPos, defaultActivities);
  yPos += 5;
  
  // Diet
  yPos = addSectionTitle(doc, yPos, 'DIET AND NUTRITION');
  
  const defaultDiet = customInstructions?.diet || [
    'Start with clear fluids and progress to light diet as tolerated.',
    'Eat small, frequent meals rather than large meals.',
    'Stay well hydrated - drink plenty of water.',
    'Avoid fatty, spicy, or heavy foods initially.',
    'High protein foods help with wound healing (eggs, fish, beans, meat).',
    'Include fruits and vegetables for vitamins and fiber to prevent constipation.',
  ];
  yPos = addNumberedList(doc, yPos, defaultDiet);
  yPos += 5;
  
  // VTE Prevention (if applicable based on Caprini score)
  if (surgery.capriniScore && surgery.capriniScore >= 3) {
    yPos = addSectionTitle(doc, yPos, 'BLOOD CLOT PREVENTION');
    
    const vteInstructions = [
      'You are at increased risk for blood clots (DVT/PE) based on your risk assessment.',
      'Take blood-thinning medications exactly as prescribed.',
      'Wear compression stockings as advised.',
      'Walk regularly - aim for short walks every 1-2 hours when awake.',
      'Stay hydrated.',
      'Avoid sitting or lying in one position for extended periods.',
    ];
    yPos = addNumberedList(doc, yPos, vteInstructions);
    yPos += 5;
  }
  
  // Warning Signs
  doc.setFillColor(...DANGER_COLOR);
  doc.roundedRect(15, yPos, 180, 8, 2, 2, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('SEEK IMMEDIATE MEDICAL ATTENTION IF:', 20, yPos + 6);
  yPos += 15;
  
  doc.setTextColor(...DANGER_COLOR);
  const emergencyWarnings = [
    'High fever (temperature above 38.5°C)',
    'Severe or worsening pain not relieved by medication',
    'Heavy bleeding or oozing from the wound',
    'Pus or foul-smelling discharge from the wound',
    'Severe swelling, redness, or warmth around the wound',
    'Difficulty breathing or chest pain',
    'Calf pain, swelling, or leg that is warm to touch',
    'Inability to pass urine or stool',
    'Persistent nausea, vomiting, or inability to keep fluids down',
  ];
  yPos = addBulletList(doc, yPos, emergencyWarnings);
  
  // Follow-up Appointment
  yPos += 10;
  doc.setFillColor(219, 234, 254);
  doc.roundedRect(15, yPos, 180, 25, 3, 3, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('FOLLOW-UP APPOINTMENT', 20, yPos + 10);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  const followUpText = customInstructions?.followUp || 'Please schedule a follow-up appointment 7-14 days after surgery with your surgeon.';
  doc.text(followUpText, 20, yPos + 18);
  
  addFooter(doc, 1);
  doc.setPage(1);
  addFooter(doc, 2);
  
  doc.save(`PostOp_Instructions_${patient.hospitalNumber}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// Helper to format currency without special characters for PDF (better font support)
function formatPDFAmount(amount: number): string {
  return `N ${amount.toLocaleString('en-NG')}`;
}

// SURGICAL FEE ESTIMATE PDF
export function generateFeeEstimatePDF(
  patient: PatientInfo,
  surgery: SurgeryInfo,
  procedure: SurgicalProcedure,
  feeEstimate: SurgicalFeeEstimate
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'Surgical Fee Estimate', 'Professional Fee Breakdown');
  
  yPos = addPatientBox(doc, yPos, patient, surgery);
  
  // Procedure Details
  yPos = addSectionTitle(doc, yPos, 'PROCEDURE DETAILS');
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  const leftCol = 20;
  const rightCol = 110;
  
  // Procedure name in bold
  doc.text('Procedure:', leftCol, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(procedure.name, 50, yPos);
  yPos += 8;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('ICD-10 Code:', leftCol, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(procedure.icdCode || 'N/A', 55, yPos);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Category:', rightCol, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(procedure.category, 140, yPos);
  yPos += 8;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Complexity:', leftCol, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(procedure.complexityLabel, 55, yPos);
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('ASA Score:', rightCol, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(String(surgery.asaScore), 145, yPos);
  yPos += 15;
  
  // Fee Breakdown Table
  yPos = addSectionTitle(doc, yPos, 'FEE BREAKDOWN');
  
  // Table header with dark background for contrast
  doc.setFillColor(31, 41, 55); // Dark gray background
  doc.rect(15, yPos, 180, 12, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255); // White text on dark background
  doc.text('Description', 20, yPos + 8);
  doc.text('Amount (NGN)', 155, yPos + 8);
  yPos += 14;
  
  // Table rows with alternating backgrounds and clear text
  const rows = [
    ["Surgeon's Professional Fee", formatPDFAmount(feeEstimate.surgeonFee)],
    ['Anaesthesia Fee', formatPDFAmount(feeEstimate.anaesthesiaFee)],
    ['Theatre Consumables', formatPDFAmount(feeEstimate.theatreConsumables)],
    ['Post-Operative Medications (Est.)', formatPDFAmount(feeEstimate.postOpMedications)],
  ];
  
  if (feeEstimate.histologyFee > 0) {
    rows.push(['Histopathology Fee', formatPDFAmount(feeEstimate.histologyFee)]);
  }
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(11);
  rows.forEach((row, index) => {
    // Alternating row colors - light blue and white
    if (index % 2 === 0) {
      doc.setFillColor(240, 249, 255); // Light blue
    } else {
      doc.setFillColor(255, 255, 255); // White
    }
    doc.rect(15, yPos - 2, 180, 12, 'F');
    
    // Draw borders for table structure
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(15, yPos - 2, 180, 12, 'S');
    
    // Text in pure black for maximum readability
    doc.setTextColor(0, 0, 0);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(row[0], 20, yPos + 6);
    
    // Amount right-aligned and bold
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(row[1], 190, yPos + 6, { align: 'right' });
    yPos += 12;
  });
  
  // Total row with strong contrast
  doc.setFillColor(24, 0, 172); // Primary dark purple
  doc.rect(15, yPos - 2, 180, 14, 'F');
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL ESTIMATE', 20, yPos + 7);
  doc.text(formatPDFAmount(feeEstimate.totalEstimate), 190, yPos + 7, { align: 'right' });
  yPos += 20;
  
  // Fee Range Note with clear formatting
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Professional Fee Range:', 20, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`${formatPDFAmount(procedure.minFee)} - ${formatPDFAmount(procedure.maxFee)}`, 75, yPos);
  yPos += 15;
  
  // Payment Terms
  yPos = addSectionTitle(doc, yPos, 'PAYMENT INFORMATION');
  
  const paymentInfo = [
    'A deposit of at least 70% is required before surgery.',
    'Payment can be made by cash, bank transfer, or approved health insurance.',
    'Additional charges may apply for extended hospital stay or complications.',
    'Implants, prostheses, and special equipment will be charged separately if required.',
    'The estimate is valid for 30 days from the date of issue.',
  ];
  yPos = addNumberedList(doc, yPos, paymentInfo);
  yPos += 5;
  
  // Disclaimer with better contrast
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, yPos, 180, 35, 3, 3, 'F');
  doc.setDrawColor(180, 140, 20);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, 180, 35, 3, 3, 'S');
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(120, 53, 15); // Darker brown for better contrast
  doc.text('Important Notice', 20, yPos + 10);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 40, 10); // Even darker for body text
  const disclaimerLines = doc.splitTextToSize(feeEstimate.disclaimer, 170);
  doc.text(disclaimerLines, 20, yPos + 18);
  
  addFooter(doc, 1);
  
  doc.save(`Fee_Estimate_${patient.hospitalNumber}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// SURGICAL CONSENT FORM PDF
export function generateConsentFormPDF(patient: PatientInfo, surgery: SurgeryInfo): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = addHeader(doc, 'Informed Consent for Surgery', 'Patient Authorization Form');
  
  // Patient Details
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, 180, 35, 3, 3, 'F');
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  const leftCol = 20;
  const rightCol = 110;
  
  doc.text(`Patient Name: ${patient.name}`, leftCol, yPos + 10);
  doc.text(`Hospital No: ${patient.hospitalNumber}`, rightCol, yPos + 10);
  doc.text(`Date of Birth: ___________________`, leftCol, yPos + 20);
  doc.text(`Gender: ${patient.gender || '___________'}`, rightCol, yPos + 20);
  doc.text(`Address: ${patient.address || '______________________________________'}`, leftCol, yPos + 30);
  yPos += 45;
  
  // Procedure Details
  yPos = addSectionTitle(doc, yPos, 'PROCEDURE DETAILS');
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  doc.text(`Proposed Procedure: ${surgery.procedureName}`, 20, yPos);
  yPos += 8;
  doc.text(`Procedure Code: ${surgery.procedureCode || 'N/A'}`, 20, yPos);
  doc.text(`Scheduled Date: ${new Date(surgery.scheduledDate).toLocaleDateString('en-GB')}`, 110, yPos);
  yPos += 8;
  doc.text(`Surgeon: ${surgery.surgeon}`, 20, yPos);
  doc.text(`Anaesthetist: ${surgery.anaesthetist || 'To be assigned'}`, 110, yPos);
  yPos += 8;
  doc.text(`Anaesthesia Type: ${surgery.anaesthesiaType || 'To be determined'}`, 20, yPos);
  yPos += 15;
  
  // Consent Statements
  yPos = addSectionTitle(doc, yPos, 'PATIENT CONSENT');
  
  doc.setFontSize(9);
  const consentStatements = [
    'I confirm that I have been explained the nature and purpose of the proposed operation/procedure.',
    'I understand the potential risks, benefits, and alternatives to this procedure.',
    'I have been informed of the risks of anaesthesia and the proposed type of anaesthesia.',
    'I understand that no guarantee has been made regarding the results of the operation.',
    'I have had the opportunity to ask questions and all my questions have been answered satisfactorily.',
    'I authorize the surgeon and the medical team to perform the proposed procedure.',
    'I consent to the administration of anaesthesia as deemed necessary.',
    'I authorize the disposal of any tissue or specimens removed during the procedure.',
    'I consent to the taking of photographs/videos for medical documentation if needed.',
    'I have disclosed all relevant medical history including allergies and current medications.',
  ];
  
  consentStatements.forEach((statement, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${statement}`, 170);
    lines.forEach((line: string) => {
      doc.text(line, 25, yPos);
      yPos += 5;
    });
    yPos += 2;
  });
  
  // Add new page for signatures
  doc.addPage();
  yPos = 25;
  
  // Risks Section
  yPos = addSectionTitle(doc, yPos, 'GENERAL SURGICAL RISKS');
  
  doc.setFontSize(9);
  const risks = [
    'Bleeding requiring blood transfusion',
    'Infection at the surgical site or elsewhere',
    'Blood clots in legs (DVT) or lungs (PE)',
    'Damage to surrounding structures (nerves, blood vessels, organs)',
    'Adverse reaction to anaesthesia or medications',
    'Delayed wound healing or wound breakdown',
    'Need for further surgery',
    'Rarely, serious complications including death',
  ];
  yPos = addBulletList(doc, yPos, risks);
  yPos += 10;
  
  // Signature Section
  yPos = addSectionTitle(doc, yPos, 'SIGNATURES');
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(10);
  
  // Patient Signature
  doc.text('Patient/Guardian Signature: _________________________________', 20, yPos);
  doc.text('Date: ________________', 140, yPos);
  yPos += 15;
  
  doc.text('Print Name: ________________________________________________', 20, yPos);
  yPos += 15;
  
  doc.text('Relationship (if guardian): ___________________________________', 20, yPos);
  yPos += 20;
  
  // Witness Signature
  doc.text('Witness Signature: __________________________________________', 20, yPos);
  doc.text('Date: ________________', 140, yPos);
  yPos += 15;
  
  doc.text('Print Name: ________________________________________________', 20, yPos);
  yPos += 20;
  
  // Surgeon Statement
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(15, yPos, 180, 45, 3, 3, 'F');
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('SURGEON\'S DECLARATION', 20, yPos + 10);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  const surgeonStatement = 'I confirm that I have explained the procedure, its risks, benefits, and alternatives to the patient/guardian. I have answered all questions to their satisfaction.';
  const surgeonLines = doc.splitTextToSize(surgeonStatement, 170);
  doc.text(surgeonLines, 20, yPos + 18);
  
  doc.setFontSize(10);
  doc.text('Surgeon Signature: _____________________', 20, yPos + 35);
  doc.text('Date: ____________', 140, yPos + 35);
  
  addFooter(doc, 1);
  doc.setPage(1);
  addFooter(doc, 2);
  
  doc.save(`Consent_Form_${patient.hospitalNumber}_${new Date().toISOString().slice(0,10)}.pdf`);
}
