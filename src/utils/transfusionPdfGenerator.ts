/**
 * Blood Transfusion PDF Generator
 * CareBridge Innovations in Healthcare
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
      `Generated by CareBridge EMR | Page ${i} of ${pageCount}`,
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
  
  // Header
  doc.setFillColor(...PDF_COLORS.primaryDark);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('BLOOD TRANSFUSION MONITORING CHART', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(data.hospitalName, pageWidth / 2, 20, { align: 'center' });
  
  y = 35;
  doc.setTextColor(...PDF_COLORS.text);
  
  // Patient Info Section
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y, pageWidth - 20, 25, 'F');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  
  const infoX1 = 15;
  const infoX2 = 100;
  const infoX3 = 200;
  
  doc.text('Patient Name:', infoX1, y + 7);
  doc.text('Hospital No:', infoX2, y + 7);
  doc.text('Ward/Bed:', infoX3, y + 7);
  
  doc.text('Date:', infoX1, y + 15);
  doc.text('Product Type:', infoX2, y + 15);
  doc.text('Unit Number:', infoX3, y + 15);
  
  doc.text('Start Time:', infoX1, y + 23);
  doc.text('End Time:', infoX2, y + 23);
  doc.text('Chart ID:', infoX3, y + 23);
  
  // Fill values if not template
  if (!isTemplate || data.patientName) {
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(data.patientName || '', infoX1 + 28, y + 7);
    doc.text(data.hospitalNumber || '', infoX2 + 28, y + 7);
    doc.text(data.wardBed || '', infoX3 + 22, y + 7);
    
    doc.text(format(new Date(data.date), 'dd/MM/yyyy'), infoX1 + 15, y + 15);
    doc.text(data.productType || '', infoX2 + 30, y + 15);
    doc.text(data.unitNumber || '', infoX3 + 28, y + 15);
    
    doc.text(data.startTime || '', infoX1 + 24, y + 23);
    doc.text(data.endTime || '', infoX2 + 24, y + 23);
    doc.text(data.chartId || '', infoX3 + 20, y + 23);
  }
  
  y += 32;
  
  // Monitoring Table
  const colWidths = [25, 25, 25, 35, 25, 25, 30, 60, 25];
  const headers = ['Time', 'Temp (°C)', 'Pulse (/min)', 'BP (mmHg)', 'RR (/min)', 'SpO2 (%)', 'Vol. (mL)', 'Symptoms/Notes', 'Initials'];
  const rowHeight = 12;
  
  // Header row
  doc.setFillColor(...PDF_COLORS.primary);
  let x = 10;
  headers.forEach((header, i) => {
    doc.rect(x, y, colWidths[i], rowHeight, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'bold');
    const textX = x + colWidths[i] / 2;
    doc.text(header, textX, y + 8, { align: 'center' });
    x += colWidths[i];
  });
  
  doc.setTextColor(...PDF_COLORS.text);
  y += rowHeight;
  
  // Pre-transfusion row
  doc.setFillColor(255, 255, 230);
  x = 10;
  colWidths.forEach((width) => {
    doc.rect(x, y, width, rowHeight, 'FD');
    x += width;
  });
  doc.setFont(PDF_FONTS.primary, 'italic');
  doc.setFontSize(7);
  doc.text('Pre-transfusion (Baseline)', 12, y + 7);
  y += rowHeight;
  
  // 15-minute row
  doc.setFillColor(255, 240, 230);
  x = 10;
  colWidths.forEach((width) => {
    doc.rect(x, y, width, rowHeight, 'FD');
    x += width;
  });
  doc.setFont(PDF_FONTS.primary, 'italic');
  doc.text('15 min after start', 12, y + 7);
  y += rowHeight;
  
  // Regular monitoring rows
  const regularRowTimes = isTemplate 
    ? ['30 min', '1 hr', '1.5 hr', '2 hr', '2.5 hr', '3 hr', '3.5 hr', 'End']
    : data.entries.map(e => e.time);
  
  regularRowTimes.forEach((time, rowIdx) => {
    doc.setFillColor(rowIdx % 2 === 0 ? 255 : 245, rowIdx % 2 === 0 ? 255 : 245, rowIdx % 2 === 0 ? 255 : 245);
    x = 10;
    colWidths.forEach((width, colIdx) => {
      doc.rect(x, y, width, rowHeight, 'FD');
      
      if (!isTemplate && data.entries[rowIdx]) {
        const entry = data.entries[rowIdx];
        doc.setFont(PDF_FONTS.primary, 'normal');
        doc.setFontSize(7);
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
        doc.text(value, x + width / 2, y + 7, { align: 'center' });
      } else if (isTemplate && colIdx === 0) {
        doc.setFont(PDF_FONTS.primary, 'normal');
        doc.setFontSize(7);
        doc.text(time, x + 2, y + 7);
      }
      
      x += width;
    });
    y += rowHeight;
    
    if (y > pageHeight - 60) {
      doc.addPage('landscape');
      y = 20;
    }
  });
  
  y += 5;
  
  // Post-transfusion row
  doc.setFillColor(230, 255, 230);
  x = 10;
  colWidths.forEach((width) => {
    doc.rect(x, y, width, rowHeight, 'FD');
    x += width;
  });
  doc.setFont(PDF_FONTS.primary, 'italic');
  doc.setFontSize(7);
  doc.text('1 hr post-transfusion', 12, y + 7);
  y += rowHeight + 8;
  
  // Summary section
  doc.setFillColor(245, 245, 245);
  doc.rect(10, y, pageWidth - 20, 35, 'FD');
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(9);
  doc.text('SUMMARY:', 15, y + 8);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(8);
  doc.text('Total Volume Transfused: _____________ mL', 15, y + 16);
  doc.text('Duration: _____________ hours', 100, y + 16);
  doc.text('Complications: ____________________________________________', 180, y + 16);
  
  doc.text('Outcome:  ☐ Completed Uneventful    ☐ Completed with Reaction    ☐ Stopped due to Reaction', 15, y + 24);
  
  doc.text('Nurse Signature: _______________________', 15, y + 32);
  doc.text('Doctor Review: _______________________', 150, y + 32);
  
  // Reaction reminder box
  y += 42;
  doc.setDrawColor(...PDF_COLORS.danger);
  doc.setFillColor(255, 240, 240);
  doc.rect(10, y, pageWidth - 20, 25, 'FD');
  
  doc.setTextColor(...PDF_COLORS.danger);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(9);
  doc.text('⚠️ IN CASE OF TRANSFUSION REACTION:', 15, y + 7);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text('1. STOP transfusion immediately  2. Maintain IV access with saline  3. Record vitals  4. Notify doctor & blood bank  5. Keep blood bag for investigation', 15, y + 15);
  doc.text('Emergency Contact: ____________________    Blood Bank Contact: ____________________', 15, y + 22);
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.lightGray);
  doc.text(`CareBridge EMR | ${data.hospitalName} | Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
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
