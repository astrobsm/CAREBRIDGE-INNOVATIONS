/**
 * Blood Transfusion PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates:
 * 1. Transfusion Order Form PDF
 * 2. Transfusion Monitoring Chart Template PDF
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_COLORS, addBrandedHeader, type PDFDocumentInfo } from './pdfUtils';
import { PDF_FONTS } from './pdfConfig';

// Transfusion Order Interface
export interface TransfusionOrderData {
  // Order Details
  orderId: string;
  orderDate: Date;
  orderedBy: string;
  ordererDesignation?: string;
  
  // Patient Details
  patientName: string;
  hospitalNumber: string;
  dateOfBirth?: Date;
  age?: number;
  gender: string;
  wardBed: string;
  diagnosis: string;
  
  // Blood Details
  patientBloodGroup: string;
  patientRhFactor: string;
  patientGenotype?: string;
  antibodyScreenResult?: string;
  crossmatchResult?: string;
  crossmatchDate?: Date;
  
  // Indication
  indication: string;
  hemoglobinLevel?: number;
  plateletCount?: number;
  inr?: number;
  fibrinogen?: number;
  urgency: 'routine' | 'urgent' | 'emergency' | 'massive_transfusion';
  
  // Product Details
  productType: string;
  productCode?: string;
  numberOfUnits: number;
  volumePerUnit?: number;
  bloodGroupOfProduct?: string;
  donorId?: string;
  collectionDate?: Date;
  expiryDate?: Date;
  
  // Product Source
  bloodBankName?: string;
  bloodBankAddress?: string;
  bloodBankPhone?: string;
  
  // Screening Tests
  screeningTests: {
    hiv: 'negative' | 'positive' | 'not_done';
    hbsAg: 'negative' | 'positive' | 'not_done';
    hcv: 'negative' | 'positive' | 'not_done';
    vdrl: 'negative' | 'positive' | 'not_done';
    malaria?: 'negative' | 'positive' | 'not_done';
  };
  
  // Transfusion Details
  rateOfTransfusion: number; // mL/hr
  estimatedDuration: string;
  preTransfusionVitals?: {
    temperature: number;
    pulse: number;
    bp: string;
    respiratoryRate: number;
    spo2: number;
  };
  
  // Consent
  consentObtained: boolean;
  consentDate?: Date;
  consentWitness?: string;
  
  // Verification
  verifyingNurse1?: string;
  verifyingNurse2?: string;
  
  // Hospital Info
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
}

// Monitoring Chart Entry
export interface MonitoringChartEntry {
  time: string;
  temperature?: number;
  pulse?: number;
  bp?: string;
  respiratoryRate?: number;
  spo2?: number;
  volumeInfused?: number;
  symptoms?: string;
  nurseInitials?: string;
}

// Monitoring Chart Interface
export interface TransfusionMonitoringChartData {
  chartId: string;
  patientName: string;
  hospitalNumber: string;
  wardBed: string;
  date: Date;
  productType: string;
  unitNumber: string;
  startTime?: string;
  endTime?: string;
  entries: MonitoringChartEntry[];
  totalVolumeTransfused?: number;
  complications?: string;
  outcome?: 'completed_uneventful' | 'completed_with_reaction' | 'stopped_due_to_reaction';
  nurseSignature?: string;
  doctorReview?: string;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
}

/**
 * Generate Transfusion Order PDF
 */
export async function generateTransfusionOrderPDF(data: TransfusionOrderData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  const docInfo: PDFDocumentInfo = {
    title: 'BLOOD TRANSFUSION ORDER',
    subtitle: `Order ID: ${data.orderId}`,
    hospitalName: data.hospitalName,
    hospitalAddress: data.hospitalAddress,
    hospitalPhone: data.hospitalPhone,
    hospitalEmail: data.hospitalEmail,
  };
  
  let y = addBrandedHeader(doc, docInfo);
  y += 5;
  
  // Section helper
  const addSection = (title: string): number => {
    y += 5;
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(15, y, pageWidth - 30, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(title, 17, y + 5);
    doc.setTextColor(...PDF_COLORS.text);
    y += 12;
    return y;
  };
  
  // Add label-value pair
  const addField = (label: string, value: string, xOffset: number = 15, width: number = 80): void => {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text(`${label}:`, xOffset, y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(value || 'N/A', xOffset + width * 0.4, y);
  };
  
  // ==== PATIENT DETAILS ====
  addSection('PATIENT DETAILS');
  
  addField('Full Name', data.patientName, 15, 80);
  addField('Hospital No', data.hospitalNumber, 110, 80);
  y += 6;
  
  addField('Date of Birth', data.dateOfBirth ? format(new Date(data.dateOfBirth), 'dd/MM/yyyy') : 'N/A', 15, 80);
  addField('Age/Gender', `${data.age || 'N/A'} years / ${data.gender}`, 110, 80);
  y += 6;
  
  addField('Ward/Bed', data.wardBed, 15, 80);
  addField('Diagnosis', data.diagnosis, 110, 80);
  y += 6;
  
  // ==== BLOOD DETAILS ====
  addSection('PATIENT BLOOD DETAILS');
  
  addField('Blood Group', data.patientBloodGroup, 15, 80);
  addField('Rh Factor', data.patientRhFactor, 110, 80);
  y += 6;
  
  addField('Genotype', data.patientGenotype || 'N/A', 15, 80);
  addField('Antibody Screen', data.antibodyScreenResult || 'N/A', 110, 80);
  y += 6;
  
  addField('Crossmatch Result', data.crossmatchResult || 'N/A', 15, 80);
  addField('Crossmatch Date', data.crossmatchDate ? format(new Date(data.crossmatchDate), 'dd/MM/yyyy') : 'N/A', 110, 80);
  y += 6;
  
  // ==== INDICATION ====
  addSection('CLINICAL INDICATION');
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  const indicationLines = doc.splitTextToSize(data.indication, pageWidth - 35);
  doc.text(indicationLines, 15, y);
  y += indicationLines.length * 5 + 3;
  
  addField('Hemoglobin', data.hemoglobinLevel ? `${data.hemoglobinLevel} g/dL` : 'N/A', 15, 50);
  addField('Platelets', data.plateletCount ? `${data.plateletCount}/µL` : 'N/A', 70, 50);
  addField('INR', data.inr ? data.inr.toString() : 'N/A', 125, 50);
  y += 6;
  
  addField('Urgency', data.urgency.toUpperCase().replace('_', ' '), 15, 50);
  y += 6;
  
  // ==== PRODUCT DETAILS ====
  addSection('BLOOD PRODUCT DETAILS');
  
  addField('Product Type', data.productType, 15, 80);
  addField('Product Code', data.productCode || 'N/A', 110, 80);
  y += 6;
  
  addField('Number of Units', data.numberOfUnits.toString(), 15, 80);
  addField('Volume per Unit', data.volumePerUnit ? `${data.volumePerUnit} mL` : 'N/A', 110, 80);
  y += 6;
  
  addField('Product Blood Group', data.bloodGroupOfProduct || 'N/A', 15, 80);
  addField('Donor ID', data.donorId || 'N/A', 110, 80);
  y += 6;
  
  addField('Collection Date', data.collectionDate ? format(new Date(data.collectionDate), 'dd/MM/yyyy') : 'N/A', 15, 80);
  addField('Expiry Date', data.expiryDate ? format(new Date(data.expiryDate), 'dd/MM/yyyy') : 'N/A', 110, 80);
  y += 6;
  
  // ==== PRODUCT SOURCE ====
  if (data.bloodBankName) {
    addSection('BLOOD PRODUCT SOURCE');
    
    addField('Blood Bank', data.bloodBankName, 15, 100);
    y += 6;
    if (data.bloodBankAddress) {
      addField('Address', data.bloodBankAddress, 15, 100);
      y += 6;
    }
    if (data.bloodBankPhone) {
      addField('Contact', data.bloodBankPhone, 15, 100);
      y += 6;
    }
  }
  
  // ==== SCREENING TESTS ====
  addSection('SCREENING TESTS ON PRODUCT');
  
  const screeningLabels = ['HIV', 'HBsAg', 'HCV', 'VDRL', 'Malaria'];
  const screeningValues = [
    data.screeningTests.hiv,
    data.screeningTests.hbsAg,
    data.screeningTests.hcv,
    data.screeningTests.vdrl,
    data.screeningTests.malaria || 'not_done',
  ];
  
  // Draw screening test boxes
  const boxWidth = 30;
  const startX = 20;
  
  screeningLabels.forEach((label, i) => {
    const x = startX + (i * (boxWidth + 5));
    
    doc.setDrawColor(...PDF_COLORS.gray);
    doc.rect(x, y, boxWidth, 15);
    
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(8);
    doc.text(label, x + boxWidth / 2, y + 5, { align: 'center' });
    
    const value = screeningValues[i];
    doc.setFont(PDF_FONTS.primary, 'normal');
    if (value === 'negative') {
      doc.setTextColor(...PDF_COLORS.success);
    } else if (value === 'positive') {
      doc.setTextColor(...PDF_COLORS.danger);
    } else {
      doc.setTextColor(...PDF_COLORS.gray);
    }
    doc.text(value?.toUpperCase() || 'N/A', x + boxWidth / 2, y + 12, { align: 'center' });
    doc.setTextColor(...PDF_COLORS.text);
  });
  y += 22;
  
  // ==== TRANSFUSION DETAILS ====
  addSection('TRANSFUSION DETAILS');
  
  addField('Rate of Transfusion', `${data.rateOfTransfusion} mL/hr`, 15, 80);
  addField('Estimated Duration', data.estimatedDuration, 110, 80);
  y += 6;
  
  if (data.preTransfusionVitals) {
    y += 3;
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(9);
    doc.text('Pre-Transfusion Vitals:', 15, y);
    y += 5;
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(
      `Temp: ${data.preTransfusionVitals.temperature}°C  |  Pulse: ${data.preTransfusionVitals.pulse}/min  |  BP: ${data.preTransfusionVitals.bp}  |  RR: ${data.preTransfusionVitals.respiratoryRate}/min  |  SpO2: ${data.preTransfusionVitals.spo2}%`,
      15, y
    );
    y += 8;
  }
  
  // Check if we need a new page
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  
  // ==== TRANSFUSION REACTION MEASURES ====
  addSection('MEASURES IN CASE OF TRANSFUSION REACTION');
  
  const reactionMeasures = [
    '1. STOP transfusion immediately if reaction suspected',
    '2. Maintain IV access with 0.9% Normal Saline',
    '3. Check and record vital signs immediately',
    '4. Notify the doctor and blood bank STAT',
    '5. Keep blood bag and tubing for investigation',
    '6. Send blood samples (EDTA, clotted) and urine sample to lab',
    '7. Administer emergency medications as ordered:',
    '   - Antihistamines (Chlorpheniramine 10mg IV) for allergic reactions',
    '   - Hydrocortisone 100-200mg IV for moderate reactions',
    '   - Epinephrine 0.5mg IM for anaphylaxis',
    '   - Furosemide 40mg IV for fluid overload',
    '8. Monitor urine output (target >100mL/hr if hemolytic)',
    '9. Complete transfusion reaction form',
    '10. Report to hospital transfusion committee',
  ];
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(8);
  reactionMeasures.forEach((measure) => {
    doc.text(measure, 17, y);
    y += 4;
  });
  y += 5;
  
  // ==== CONSENT & VERIFICATION ====
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  
  addSection('CONSENT & VERIFICATION');
  
  addField('Consent Obtained', data.consentObtained ? 'YES' : 'NO', 15, 80);
  addField('Consent Date', data.consentDate ? format(new Date(data.consentDate), 'dd/MM/yyyy HH:mm') : 'N/A', 110, 80);
  y += 6;
  
  addField('Consent Witness', data.consentWitness || 'N/A', 15, 160);
  y += 10;
  
  // Verification signatures
  y += 5;
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(9);
  doc.text('Two-Person Bedside Verification:', 15, y);
  y += 8;
  
  // Signature boxes
  doc.setDrawColor(...PDF_COLORS.gray);
  
  // Nurse 1
  doc.rect(15, y, 85, 25);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(8);
  doc.text('Verifying Staff 1:', 17, y + 5);
  doc.text(data.verifyingNurse1 || '________________________', 17, y + 12);
  doc.text('Signature: ________________', 17, y + 20);
  
  // Nurse 2
  doc.rect(105, y, 85, 25);
  doc.text('Verifying Staff 2:', 107, y + 5);
  doc.text(data.verifyingNurse2 || '________________________', 107, y + 12);
  doc.text('Signature: ________________', 107, y + 20);
  y += 32;
  
  // Ordering physician
  doc.rect(15, y, 175, 25);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Ordering Physician:', 17, y + 5);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Name: ${data.orderedBy}`, 17, y + 12);
  doc.text(`Designation: ${data.ordererDesignation || 'N/A'}`, 80, y + 12);
  doc.text('Signature: ________________', 17, y + 20);
  doc.text(`Date: ${format(new Date(data.orderDate), 'dd/MM/yyyy HH:mm')}`, 120, y + 20);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.lightGray);
    doc.text(
      `Generated by AstroHEALTH EMR | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  return doc;
}

/**
 * Generate Transfusion Monitoring Chart Template PDF
 */
export async function generateMonitoringChartPDF(data: TransfusionMonitoringChartData, isTemplate: boolean = true): Promise<jsPDF> {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let y = 15;
  
  // Header - Clean and Professional
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, y, pageWidth - 20, 22, 'S');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('BLOOD TRANSFUSION MONITORING CHART', pageWidth / 2, y + 8, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(data.hospitalName, pageWidth / 2, y + 15, { align: 'center' });
  
  y = 42;
  doc.setTextColor(...PDF_COLORS.text);
  
  // Patient Info Section - Clean Bordered Design
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(10, y, pageWidth - 20, 30, 'S');
  
  // Vertical dividers
  doc.line(95, y, 95, y + 30);
  doc.line(190, y, 190, y + 30);
  
  // Horizontal dividers
  doc.line(10, y + 10, pageWidth - 10, y + 10);
  doc.line(10, y + 20, pageWidth - 10, y + 20);
  
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'bold');
  
  const infoX1 = 12;
  const infoX2 = 97;
  const infoX3 = 192;
  
  doc.text('Patient Name:', infoX1, y + 7);
  doc.text('Hospital No:', infoX2, y + 7);
  doc.text('Ward/Bed:', infoX3, y + 7);
  
  doc.text('Date:', infoX1, y + 17);
  doc.text('Product Type:', infoX2, y + 17);
  doc.text('Unit Number:', infoX3, y + 17);
  
  doc.text('Start Time:', infoX1, y + 27);
  doc.text('End Time:', infoX2, y + 27);
  doc.text('Chart ID:', infoX3, y + 27);
  
  // Fill values if not template
  if (!isTemplate || data.patientName) {
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.text(data.patientName || '', infoX1 + 30, y + 7);
    doc.text(data.hospitalNumber || '', infoX2 + 30, y + 7);
    doc.text(data.wardBed || '', infoX3 + 24, y + 7);
    
    doc.text(format(new Date(data.date), 'dd/MM/yyyy'), infoX1 + 15, y + 17);
    doc.text(data.productType || '', infoX2 + 32, y + 17);
    doc.text(data.unitNumber || '', infoX3 + 30, y + 17);
    
    doc.text(data.startTime || '', infoX1 + 26, y + 27);
    doc.text(data.endTime || '', infoX2 + 24, y + 27);
    doc.text(data.chartId || '', infoX3 + 22, y + 27);
  }
  
  y += 37;
  
  // Monitoring Table - Clean Professional Design
  // IMPORTANT: To prevent black blocks, we use a helper that explicitly sets fill + draw state
  // before every rect call. jsPDF can lose fill state after text/font operations.
  const colWidths = [28, 23, 25, 30, 23, 23, 28, 65, 25];
  const headers = ['Time', 'Temp\n(°C)', 'Pulse\n(/min)', 'BP\n(mmHg)', 'RR\n(/min)', 'SpO2\n(%)', 'Vol.\n(mL)', 'Symptoms/Notes', 'Initials'];
  const rowHeight = 13;
  
  // Helper: draw a filled+bordered cell with explicit state reset each time
  const drawCell = (cx: number, cy: number, cw: number, ch: number, fillR: number, fillG: number, fillB: number) => {
    doc.setFillColor(fillR, fillG, fillB);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(cx, cy, cw, ch, 'FD');
  };
  
  // Header row with bold border
  doc.setLineWidth(0.5);
  let x = 10;
  headers.forEach((header, i) => {
    drawCell(x, y, colWidths[i], rowHeight, 245, 245, 245);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.rect(x, y, colWidths[i], rowHeight, 'S');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont(PDF_FONTS.primary, 'bold');
    const textX = x + colWidths[i] / 2;
    const lines = header.split('\n');
    if (lines.length > 1) {
      doc.text(lines[0], textX, y + 5, { align: 'center' });
      doc.text(lines[1], textX, y + 9, { align: 'center' });
    } else {
      doc.text(header, textX, y + 8, { align: 'center' });
    }
    x += colWidths[i];
  });
  
  doc.setTextColor(0, 0, 0);
  y += rowHeight;
  
  // Pre-transfusion row - Light highlight
  x = 10;
  colWidths.forEach((width) => {
    drawCell(x, y, width, rowHeight, 255, 255, 230);
    x += width;
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(7);
  doc.text('Pre-transfusion', 12, y + 8);
  y += rowHeight;
  
  // 15-minute row - Critical monitoring point
  x = 10;
  colWidths.forEach((width) => {
    drawCell(x, y, width, rowHeight, 255, 250, 240);
    x += width;
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(7);
  doc.text('15 min after start', 12, y + 8);
  y += rowHeight;
  
  // Regular monitoring rows - Clean white/light gray alternating
  const regularRowTimes = isTemplate 
    ? ['30 min', '1 hr', '1.5 hr', '2 hr', '2.5 hr', '3 hr', '3.5 hr', 'End']
    : data.entries.map(e => e.time);
  
  regularRowTimes.forEach((time, rowIdx) => {
    const fillVal = rowIdx % 2 === 0 ? 255 : 248;
    x = 10;
    colWidths.forEach((width, colIdx) => {
      // Explicitly set fill color for EVERY cell to prevent black blocks
      drawCell(x, y, width, rowHeight, fillVal, fillVal, fillVal);
      
      if (!isTemplate && data.entries[rowIdx]) {
        const entry = data.entries[rowIdx];
        doc.setTextColor(0, 0, 0);
        doc.setFont(PDF_FONTS.primary, 'normal');
        doc.setFontSize(8);
        let value = '';
        switch (colIdx) {
          case 0: value = entry.time || time; break;
          case 1: value = entry.temperature?.toString() || ''; break;
          case 2: value = entry.pulse?.toString() || ''; break;
          case 3: value = entry.bp || ''; break;
          case 4: value = entry.respiratoryRate?.toString() || ''; break;
          case 5: value = entry.spo2?.toString() || ''; break;
          case 6: value = entry.volumeInfused?.toString() || ''; break;
          case 7: value = entry.symptoms || ''; break;
          case 8: value = entry.nurseInitials || ''; break;
        }
        if (value) {
          doc.text(value, x + width / 2, y + 8, { align: 'center' });
        }
      } else if (isTemplate && colIdx === 0) {
        doc.setTextColor(0, 0, 0);
        doc.setFont(PDF_FONTS.primary, 'normal');
        doc.setFontSize(8);
        doc.text(time, x + 3, y + 8);
      }
      
      x += width;
    });
    y += rowHeight;
    
    if (y > pageHeight - 65) {
      doc.addPage('landscape');
      // CRITICAL: Ensure white background on new page
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      y = 20;
    }
  });
  
  y += 3;
  
  // Post-transfusion row - Light green highlight
  x = 10;
  colWidths.forEach((width) => {
    drawCell(x, y, width, rowHeight, 240, 255, 240);
    x += width;
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(7);
  doc.text('1 hr post-transfusion', 12, y + 8);
  y += rowHeight + 10;
  
  // Summary section - Clean bordered design
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, y, pageWidth - 20, 32, 'S');
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(10);
  doc.text('SUMMARY:', 15, y + 8);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(9);
  doc.text('Total Volume Transfused: _____________ mL', 15, y + 16);
  doc.text('Duration: _____________ hours', 100, y + 16);
  doc.text('Complications: ____________________________________________', 180, y + 16);
  
  // Outcome checkboxes with proper square symbols
  doc.setFontSize(9);
  doc.text('Outcome:', 15, y + 24);
  
  // Draw checkbox squares
  doc.rect(45, y + 20, 4, 4, 'S');
  doc.rect(130, y + 20, 4, 4, 'S');
  doc.rect(225, y + 20, 4, 4, 'S');
  
  doc.text('Completed Uneventful', 51, y + 24);
  doc.text('Completed with Reaction', 136, y + 24);
  doc.text('Stopped due to Reaction', 231, y + 24);
  
  // Signature lines with proper spacing
  doc.line(15, y + 30, 80, y + 30);
  doc.line(150, y + 30, 215, y + 30);
  doc.setFontSize(8);
  doc.text('Nurse Signature', 15, y + 28);
  doc.text('Doctor Review', 150, y + 28);
  
  // Reaction reminder box - Clean warning design
  y += 38;
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(1);
  doc.rect(10, y, pageWidth - 20, 25, 'S');
  
  doc.setTextColor(180, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(10);
  doc.text('IN CASE OF TRANSFUSION REACTION:', 15, y + 7);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const reactionSteps = '1. STOP transfusion immediately  |  2. Maintain IV access with saline  |  3. Record vitals  |  4. Notify doctor & blood bank  |  5. Keep blood bag';
  doc.text(reactionSteps, 15, y + 14);
  
  doc.setTextColor(0, 0, 0); // Reset text color to black
  doc.text('Emergency Contact: ____________________    Blood Bank Contact: ____________________', 15, y + 21);
  
  // Footer - Reset colors before footer
  doc.setFillColor(255, 255, 255); // Ensure white background
  doc.setTextColor(0, 0, 0); // Reset to black first
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150); // Use explicit gray instead of PDF_COLORS.lightGray
  doc.text(`AstroHEALTH EMR | ${data.hospitalName} | Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  return doc;
}

/**
 * Download Transfusion Order PDF
 */
export async function downloadTransfusionOrderPDF(data: TransfusionOrderData): Promise<void> {
  const doc = await generateTransfusionOrderPDF(data);
  doc.save(`Transfusion_Order_${data.orderId}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}

/**
 * Download Monitoring Chart PDF
 */
export async function downloadMonitoringChartPDF(data: TransfusionMonitoringChartData, isTemplate: boolean = true): Promise<void> {
  const doc = await generateMonitoringChartPDF(data, isTemplate);
  const prefix = isTemplate ? 'Transfusion_Chart_Template' : 'Transfusion_Chart';
  doc.save(`${prefix}_${data.chartId}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}
