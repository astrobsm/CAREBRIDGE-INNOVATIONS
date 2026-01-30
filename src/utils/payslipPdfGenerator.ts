/**
 * ============================================================
 * AstroHEALTH Payslip PDF Generator
 * ============================================================
 * 
 * Generates monthly payslip PDFs for staff showing:
 * - Earnings breakdown by category
 * - Surgery assistant earnings (20% of surgeon fee)
 * - Bank account details for payment
 * 
 * PDF Standards: A4, white background, black text, Helvetica font
 * ============================================================
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  PDF_COLORS,
  preloadPDFLogo,
} from './pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES } from './pdfConfig';
import type { Payslip, User, Hospital } from '../types';
import { categoryLabels } from '../data/billingActivities';

// Format currency in Naira
function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Add a section header
function addSectionHeader(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, y, doc.internal.pageSize.getWidth() - 30, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_FONT_SIZES.tableHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(title, 20, y + 5.5);
  
  doc.setTextColor(...PDF_COLORS.text);
  return y + 12;
}

// Add a labeled row
function addLabeledRow(
  doc: jsPDF, 
  y: number, 
  label: string, 
  value: string,
  options?: { bold?: boolean; highlight?: boolean }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  if (options?.highlight) {
    doc.setFillColor(240, 245, 255);
    doc.rect(15, y - 4, pageWidth - 30, 7, 'F');
  }
  
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(label, 20, y);
  
  doc.setFont(PDF_FONTS.primary, options?.bold ? 'bold' : 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(value, pageWidth - 20, y, { align: 'right' });
  
  return y + 7;
}

// Add earnings table
function addEarningsTable(doc: jsPDF, y: number, payslip: Payslip): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Table header
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_FONT_SIZES.tableHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Activity Category', 20, y + 5.5);
  doc.text('Count', pageWidth - 100, y + 5.5, { align: 'right' });
  doc.text('Total Billed', pageWidth - 60, y + 5.5, { align: 'right' });
  doc.text('Staff Earning', pageWidth - 20, y + 5.5, { align: 'right' });
  
  y += 12;
  
  // Table rows
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  
  let isAlternate = false;
  for (const activity of payslip.activities) {
    if (activity.count === 0) continue;
    
    if (isAlternate) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, pageWidth - 30, 7, 'F');
    }
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(activity.categoryLabel || categoryLabels[activity.category] || activity.category, 20, y);
    doc.text(activity.count.toString(), pageWidth - 100, y, { align: 'right' });
    doc.text(formatNaira(activity.totalBilled), pageWidth - 60, y, { align: 'right' });
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(formatNaira(activity.staffEarning), pageWidth - 20, y, { align: 'right' });
    
    y += 7;
    isAlternate = !isAlternate;
  }
  
  // Subtotal line
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 4;
  
  // Activity subtotal
  const activityTotal = payslip.activities.reduce((sum, a) => sum + a.staffEarning, 0);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.text('Activities Subtotal', 20, y);
  doc.text(formatNaira(activityTotal), pageWidth - 20, y, { align: 'right' });
  
  return y + 10;
}

// Add surgery assistant earnings table
function addSurgeryAssistantTable(doc: jsPDF, y: number, payslip: Payslip): number {
  if (!payslip.surgeryAssistantEarnings || payslip.surgeryAssistantEarnings.length === 0) {
    return y;
  }
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Surgery Assistant Earnings (20% of Surgeon Fee)');
  
  // Table header
  doc.setFillColor(243, 244, 246);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  
  doc.setTextColor(...PDF_COLORS.gray);
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Procedure', 20, y + 4.5);
  doc.text('Surgeon Fee', pageWidth - 90, y + 4.5, { align: 'right' });
  doc.text('Assistant (20%)', pageWidth - 50, y + 4.5, { align: 'right' });
  doc.text('Staff Earning', pageWidth - 20, y + 4.5, { align: 'right' });
  
  y += 10;
  
  // Table rows
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont(PDF_FONTS.primary, 'normal');
  
  let assistantTotal = 0;
  for (const surgery of payslip.surgeryAssistantEarnings) {
    // Truncate procedure name if too long
    const procName = surgery.procedureName.length > 35 
      ? surgery.procedureName.substring(0, 32) + '...'
      : surgery.procedureName;
    
    doc.text(procName, 20, y);
    doc.text(formatNaira(surgery.surgeonFee), pageWidth - 90, y, { align: 'right' });
    doc.text(formatNaira(surgery.assistantFee), pageWidth - 50, y, { align: 'right' });
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(formatNaira(surgery.staffShare), pageWidth - 20, y, { align: 'right' });
    doc.setFont(PDF_FONTS.primary, 'normal');
    
    assistantTotal += surgery.staffShare;
    y += 6;
  }
  
  // Subtotal
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  y += 4;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Assistant Earnings Subtotal', 20, y);
  doc.text(formatNaira(assistantTotal), pageWidth - 20, y, { align: 'right' });
  
  return y + 10;
}

// Add totals section
function addTotalsSection(doc: jsPDF, y: number, payslip: Payslip): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Payment Summary');
  
  // Gross earnings
  y = addLabeledRow(doc, y, 'Gross Earnings', formatNaira(payslip.grossEarnings));
  
  // Deductions
  if (payslip.deductions > 0 && payslip.deductionDetails) {
    y += 3;
    doc.setFontSize(PDF_FONT_SIZES.footnote);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.danger);
    doc.text('Deductions:', 20, y);
    y += 5;
    
    for (const deduction of payslip.deductionDetails) {
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(`  - ${deduction.description}`, 20, y);
      doc.text(`(${formatNaira(deduction.amount)})`, pageWidth - 20, y, { align: 'right' });
      y += 5;
    }
    
    doc.setTextColor(...PDF_COLORS.text);
  }
  
  // Net earnings - highlighted
  y += 5;
  doc.setFillColor(220, 252, 231); // Light green
  doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
  
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.success);
  doc.text('NET EARNINGS', 20, y + 3);
  doc.text(formatNaira(payslip.netEarnings), pageWidth - 20, y + 3, { align: 'right' });
  
  doc.setTextColor(...PDF_COLORS.text);
  
  return y + 15;
}

// Add bank details section
function addBankDetailsSection(doc: jsPDF, y: number, payslip: Payslip): number {
  if (!payslip.bankAccountNumber) {
    return y;
  }
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Bank Account Details for Payment');
  
  // Bank info box
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'S');
  
  y += 7;
  
  doc.setFontSize(PDF_FONT_SIZES.body);
  
  // Bank name
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Bank:', 20, y);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(payslip.bankName || 'Not specified', 50, y);
  
  // Account number
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Account No:', pageWidth / 2, y);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(payslip.bankAccountNumber, pageWidth / 2 + 32, y);
  
  y += 8;
  
  // Account name
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Account Name:', 20, y);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(payslip.bankAccountName || 'Not specified', 55, y);
  
  return y + 15;
}

// Add payment status section
function addPaymentStatus(doc: jsPDF, y: number, payslip: Payslip): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const statusColors: Record<string, [number, number, number]> = {
    pending: PDF_COLORS.warning,
    processing: PDF_COLORS.info,
    paid: PDF_COLORS.success,
  };
  
  const statusLabels: Record<string, string> = {
    pending: 'PENDING PAYMENT',
    processing: 'PROCESSING',
    paid: 'PAID',
  };
  
  const color = statusColors[payslip.paymentStatus] || PDF_COLORS.gray;
  const label = statusLabels[payslip.paymentStatus] || payslip.paymentStatus.toUpperCase();
  
  // Status badge
  const badgeWidth = doc.getTextWidth(label) + 20;
  const badgeX = (pageWidth - badgeWidth) / 2;
  
  doc.setFillColor(...color);
  doc.roundedRect(badgeX, y, badgeWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(label, pageWidth / 2, y + 6.5, { align: 'center' });
  
  y += 15;
  
  if (payslip.paymentStatus === 'paid' && payslip.paidAt) {
    doc.setTextColor(...PDF_COLORS.text);
    doc.setFontSize(PDF_FONT_SIZES.footnote);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(
      `Paid on: ${format(new Date(payslip.paidAt), 'dd MMMM yyyy')}${payslip.paymentReference ? ` | Ref: ${payslip.paymentReference}` : ''}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 8;
  }
  
  doc.setTextColor(...PDF_COLORS.text);
  return y;
}

// Main function to generate payslip PDF
export async function generatePayslipPDF(
  payslip: Payslip,
  staff: User,
  hospital: Hospital
): Promise<jsPDF> {
  // Ensure logo is loaded
  await preloadPDFLogo();
  
  // Create PDF document (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Ensure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Add branded header
  let y = addBrandedHeader(doc, {
    title: 'STAFF PAYSLIP',
    subtitle: payslip.periodName,
    hospitalName: hospital.name,
    hospitalPhone: hospital.phone,
    hospitalEmail: hospital.email,
  });
  
  // Staff Information Box
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15, y, pageWidth - 30, 28, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, pageWidth - 30, 28, 3, 3, 'S');
  
  y += 7;
  
  // Staff name and role
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`${staff.firstName} ${staff.lastName}`, 20, y);
  
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(staff.role.replace('_', ' ').toUpperCase(), 20, y + 6);
  
  // Period details on right
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Period:', pageWidth - 80, y);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(
    `${format(new Date(payslip.startDate), 'dd MMM')} - ${format(new Date(payslip.endDate), 'dd MMM yyyy')}`,
    pageWidth - 20,
    y,
    { align: 'right' }
  );
  
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Payslip ID:', pageWidth - 80, y + 6);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(payslip.id.substring(0, 8).toUpperCase(), pageWidth - 20, y + 6, { align: 'right' });
  
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Generated:', pageWidth - 80, y + 12);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(format(new Date(), 'dd MMM yyyy'), pageWidth - 20, y + 12, { align: 'right' });
  
  y += 25;
  
  // Activities Earnings Table (revenue share info removed for privacy)
  y = addSectionHeader(doc, y, 'Earnings by Activity Category');
  y = addEarningsTable(doc, y, payslip);
  
  // Surgery Assistant Earnings (if any)
  y = addSurgeryAssistantTable(doc, y, payslip);
  
  // Check if we need a new page
  if (y > pageHeight - 80) {
    doc.addPage();
    // Reset white background on new page
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 20;
  }
  
  // Totals Section
  y = addTotalsSection(doc, y, payslip);
  
  // Bank Details
  y = addBankDetailsSection(doc, y, payslip);
  
  // Payment Status
  y = addPaymentStatus(doc, y, payslip);
  
  // Add footer
  addBrandedFooter(doc, 1, 1, 'Staff Payslip | CONFIDENTIAL');
  
  return doc;
}

// Download payslip as PDF
export async function downloadPayslipPDF(
  payslip: Payslip,
  staff: User,
  hospital: Hospital
): Promise<void> {
  const doc = await generatePayslipPDF(payslip, staff, hospital);
  const filename = `Payslip_${staff.lastName}_${payslip.periodName.replace(' ', '_')}.pdf`;
  doc.save(filename);
}

// Get payslip PDF as blob for sharing
export async function getPayslipPDFBlob(
  payslip: Payslip,
  staff: User,
  hospital: Hospital
): Promise<Blob> {
  const doc = await generatePayslipPDF(payslip, staff, hospital);
  return doc.output('blob');
}
