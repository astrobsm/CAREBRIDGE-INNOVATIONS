// Invoice and Billing PDF Generator
// Generates professional invoices and bill estimates with AstroHEALTH branding
// CRITICAL: All PDFs use white background (#FFFFFF), black text (#000000),
// and Helvetica font (PDF_FONTS.primary) for maximum cross-platform compatibility

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  addPatientInfoBox,
  addSectionTitle,
  formatNairaPDF,
  checkNewPage,
  addLogoWatermark,
  PDF_COLORS,
  numberToWords,
  type PDFDocumentInfo,
  type PDFPatientInfo,
} from './pdfUtils';
import { PDF_FONTS } from './pdfConfig';

export interface InvoiceItemPDF {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
  discountPercent?: number;
}

export interface InvoicePDFOptions {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  items: InvoiceItemPDF[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes?: string;
  paymentInstructions?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
}

export function generateInvoicePDF(options: InvoicePDFOptions): void {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    patient,
    hospitalName,
    hospitalAddress,
    hospitalPhone,
    hospitalEmail,
    items,
    subtotal,
    discountAmount = 0,
    taxAmount = 0,
    totalAmount,
    paidAmount = 0,
    status,
    notes,
    paymentInstructions,
    bankDetails,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background for the entire page
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add logo watermark
  addLogoWatermark(doc, 0.06);

  // CRITICAL: Ensure white background for the entire page
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add branded header
  const info: PDFDocumentInfo = {
    title: 'INVOICE',
    subtitle: `Invoice #${invoiceNumber}`,
    hospitalName,
    hospitalAddress,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Invoice status badge
  const statusColors: Record<string, [number, number, number]> = {
    pending: [234, 179, 8],    // Yellow
    paid: [34, 197, 94],       // Green
    partial: [59, 130, 246],   // Blue
    overdue: [220, 38, 38],    // Red
    cancelled: [107, 114, 128], // Gray
  };

  const statusLabels: Record<string, string> = {
    pending: 'PENDING',
    paid: 'PAID',
    partial: 'PARTIALLY PAID',
    overdue: 'OVERDUE',
    cancelled: 'CANCELLED',
  };

  doc.setFillColor(...statusColors[status]);
  doc.roundedRect(pageWidth - 55, yPos - 10, 40, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabels[status], pageWidth - 35, yPos - 3, { align: 'center' });

  yPos += 5;

  // Invoice details box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  
  doc.text(`Invoice Date: ${format(invoiceDate, 'dd MMMM yyyy')}`, 20, yPos + 8);
  if (dueDate) {
    doc.text(`Due Date: ${format(dueDate, 'dd MMMM yyyy')}`, 20, yPos + 15);
  }
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 70, yPos + 8);
  
  yPos += 28;

  // Patient information
  yPos = addPatientInfoBox(doc, yPos, patient);

  // Items table
  yPos = addSectionTitle(doc, yPos, 'Invoice Items');

  // Table header
  const colWidths = [70, 25, 35, 35]; // Description, Qty, Unit Price, Total
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  
  let xPos = 17;
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Table rows
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  
  const tableStartY = yPos;
  
  items.forEach((item, index) => {
    yPos = checkNewPage(doc, yPos, 15);
    
    let xPos = 17;
    doc.setFontSize(8);
    
    // Description - use proper text wrapping for long descriptions
    let description = item.description;
    const maxDescWidth = colWidths[0] - 4;
    const descLines = doc.splitTextToSize(description, maxDescWidth);
    
    // Calculate row height based on number of lines (max 3 lines)
    const linesToShow = descLines.slice(0, 3);
    const rowHeight = Math.max(8, linesToShow.length * 4 + 2);
    
    // Draw background for this row
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, pageWidth - 30, rowHeight, 'F');
    }
    
    // Draw description with multiple lines if needed
    doc.text(linesToShow, xPos, yPos + 4);
    xPos += colWidths[0];
    
    // Quantity (vertically centered)
    doc.text(item.quantity.toString(), xPos, yPos + rowHeight / 2 + 1);
    xPos += colWidths[1];
    
    // Unit Price (vertically centered)
    doc.text(formatNairaPDF(item.unitPrice), xPos, yPos + rowHeight / 2 + 1);
    xPos += colWidths[2];
    
    // Total (vertically centered)
    doc.text(formatNairaPDF(item.total), xPos, yPos + rowHeight / 2 + 1);
    
    yPos += rowHeight;
  });

  // Table border
  const tableHeight = yPos - tableStartY;
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.rect(15, tableStartY, pageWidth - 30, tableHeight, 'S');

  yPos += 10;

  // Summary section
  yPos = checkNewPage(doc, yPos, 50);
  
  const summaryX = pageWidth - 90;
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);

  // Subtotal
  doc.text('Subtotal:', summaryX, yPos);
  doc.text(formatNairaPDF(subtotal), pageWidth - 20, yPos, { align: 'right' });
  yPos += 7;

  // Discount
  if (discountAmount > 0) {
    doc.setTextColor(...PDF_COLORS.success);
    doc.text('Discount:', summaryX, yPos);
    doc.text(`-${formatNairaPDF(discountAmount)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  }

  // Tax
  if (taxAmount > 0) {
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text('Tax:', summaryX, yPos);
    doc.text(formatNairaPDF(taxAmount), pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  }

  // Divider line
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.setLineWidth(0.5);
  doc.line(summaryX, yPos, pageWidth - 15, yPos);
  yPos += 5;

  // Total
  doc.setFillColor(...PDF_COLORS.primaryDark);
  doc.roundedRect(summaryX - 5, yPos - 2, pageWidth - summaryX - 5, 12, 2, 2, 'F');
  
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', summaryX, yPos + 6);
  doc.text(formatNairaPDF(totalAmount), pageWidth - 20, yPos + 6, { align: 'right' });
  yPos += 18;

  // Amount in words
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, yPos, pageWidth - 30, 14, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text('Amount in Words:', 20, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'italic');
  doc.setTextColor(...PDF_COLORS.dark);
  const amountWords = numberToWords(totalAmount);
  const wordsLines = doc.splitTextToSize(amountWords, pageWidth - 60);
  doc.text(wordsLines[0], 60, yPos + 5);
  if (wordsLines.length > 1) {
    doc.text(wordsLines[1], 20, yPos + 10);
  }
  yPos += 18;

  // Paid amount & balance (if applicable)
  if (paidAmount > 0 || status === 'partial') {
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.success);
    doc.text('Amount Paid:', summaryX, yPos);
    doc.text(formatNairaPDF(paidAmount), pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;

    const balance = totalAmount - paidAmount;
    if (balance > 0) {
      doc.setTextColor(...PDF_COLORS.danger);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Balance Due:', summaryX, yPos);
      doc.text(formatNairaPDF(balance), pageWidth - 20, yPos, { align: 'right' });
      yPos += 7;
    }
  }

  yPos += 10;

  // Bank details (if provided)
  if (bankDetails) {
    yPos = checkNewPage(doc, yPos, 40);
    yPos = addSectionTitle(doc, yPos, 'Payment Details', 'info');
    
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    
    doc.text(`Bank: ${bankDetails.bankName}`, 20, yPos + 8);
    doc.text(`Account Name: ${bankDetails.accountName}`, 20, yPos + 15);
    doc.text(`Account Number: ${bankDetails.accountNumber}`, 20, yPos + 22);
    
    yPos += 32;
  }

  // Payment instructions - ALWAYS SHOW BANK DETAILS
  yPos = checkNewPage(doc, yPos, 80);
  
  // Big prominent payment section
  doc.setFillColor(240, 253, 244); // Light green background
  doc.roundedRect(15, yPos, pageWidth - 30, 70, 3, 3, 'F');
  doc.setDrawColor(34, 197, 94); // Green border
  doc.setLineWidth(1);
  doc.roundedRect(15, yPos, pageWidth - 30, 70, 3, 3, 'S');
  
  yPos += 8;
  
  // Payment Instructions Title
  doc.setFontSize(12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(22, 101, 52); // Dark green
  doc.text('💳 PAYMENT INSTRUCTIONS', 20, yPos);
  yPos += 10;
  
  // Bank Details Box
  doc.setFillColor(255, 255, 255); // White box
  doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'S');
  
  yPos += 8;
  
  // Bank details
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bank:', 25, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('ZENITH BANK', 60, yPos);
  yPos += 7;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Account Name:', 25, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('NNADI EMMANUEL C', 60, yPos);
  yPos += 7;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Account Number:', 25, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(13);
  doc.setTextColor(22, 101, 52);
  doc.text('2084929453', 60, yPos);
  yPos += 12;
  
  // Evidence submission instruction
  doc.setFillColor(254, 249, 195); // Light yellow
  doc.roundedRect(20, yPos, pageWidth - 40, 15, 2, 2, 'F');
  
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(161, 98, 7); // Dark yellow/brown
  doc.text('📱 Send Payment Evidence To:', 25, yPos);
  yPos += 6;
  
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text('+234 902 872 4839 (WhatsApp)', 25, yPos);
  
  yPos += 15;
  
  // Custom payment instructions if provided
  if (paymentInstructions) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    const lines = doc.splitTextToSize(paymentInstructions, pageWidth - 40);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 4 + 5;
  }

  // Notes
  if (notes) {
    yPos = checkNewPage(doc, yPos, 30);
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text('Notes:', 15, yPos);
    yPos += 6;
    
    doc.setFont(PDF_FONTS.primary, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.gray);
    const noteLines = doc.splitTextToSize(notes, pageWidth - 30);
    doc.text(noteLines, 15, yPos);
  }

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages, 'Thank you for your business. Please retain this invoice for your records.');
  }

  // Save the PDF
  doc.save(`Invoice_${invoiceNumber}_${format(invoiceDate, 'yyyyMMdd')}.pdf`);
}

// Generate a fee estimate/quote PDF
export interface FeeEstimatePDFOptions {
  estimateNumber: string;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  procedureName: string;
  procedureDate?: Date;
  items: InvoiceItemPDF[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  totalAmount: number;
  validUntil?: Date;
  notes?: string;
  surgeon?: string;
  anaesthetist?: string;
}

export function generateFeeEstimatePDF(options: FeeEstimatePDFOptions): void {
  const {
    estimateNumber,
    patient,
    hospitalName,
    hospitalPhone,
    procedureName,
    procedureDate,
    items,
    subtotal,
    discountPercent = 0,
    discountAmount = 0,
    totalAmount,
    validUntil,
    notes,
    surgeon,
    anaesthetist,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add branded header
  const info: PDFDocumentInfo = {
    title: 'FEE ESTIMATE',
    subtitle: `Estimate #${estimateNumber} - ${procedureName}`,
    hospitalName,
    hospitalPhone,
  };

  let yPos = addBrandedHeader(doc, info);
  yPos += 5;

  // Patient information
  yPos = addPatientInfoBox(doc, yPos, patient, {
    Procedure: procedureName,
    ...(procedureDate ? { 'Scheduled Date': format(procedureDate, 'dd MMMM yyyy') } : {}),
  });

  // Surgical team (if provided)
  if (surgeon || anaesthetist) {
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text('Surgical Team', 20, yPos + 6);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    if (surgeon) {
      doc.text(`Surgeon: ${surgeon}`, 20, yPos + 13);
    }
    if (anaesthetist) {
      doc.text(`Anaesthetist: ${anaesthetist}`, pageWidth / 2, yPos + 13);
    }
    
    yPos += 25;
  }

  // Cost breakdown
  yPos = addSectionTitle(doc, yPos, 'Cost Breakdown');

  // Table
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Description', 17, yPos + 5.5);
  doc.text('Amount', pageWidth - 50, yPos + 5.5);
  yPos += 8;

  // Items
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  
  items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    }
    
    doc.setFontSize(8);
    doc.text(item.description, 17, yPos + 5.5);
    doc.text(formatNairaPDF(item.total), pageWidth - 50, yPos + 5.5);
    yPos += 8;
  });

  // Table border
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.rect(15, yPos - (items.length + 1) * 8, pageWidth - 30, (items.length + 1) * 8, 'S');

  yPos += 10;

  // Summary
  const summaryX = pageWidth - 90;
  doc.setFontSize(9);
  
  doc.text('Subtotal:', summaryX, yPos);
  doc.text(formatNairaPDF(subtotal), pageWidth - 20, yPos, { align: 'right' });
  yPos += 7;

  if (discountAmount > 0) {
    doc.setTextColor(...PDF_COLORS.success);
    doc.text(`Discount (${discountPercent}%):`, summaryX, yPos);
    doc.text(`-${formatNairaPDF(discountAmount)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  }

  // Total
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(summaryX, yPos, pageWidth - 15, yPos);
  yPos += 5;

  doc.setFillColor(...PDF_COLORS.primaryDark);
  doc.roundedRect(summaryX - 5, yPos - 2, pageWidth - summaryX - 5, 12, 2, 2, 'F');
  
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ESTIMATED TOTAL:', summaryX, yPos + 6);
  doc.text(formatNairaPDF(totalAmount), pageWidth - 20, yPos + 6, { align: 'right' });
  
  yPos += 18;

  // Amount in words
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, yPos, pageWidth - 30, 14, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text('Amount in Words:', 20, yPos + 5);
  doc.setFont(PDF_FONTS.primary, 'italic');
  doc.setTextColor(...PDF_COLORS.dark);
  const estimateAmountWords = numberToWords(totalAmount);
  const estimateWordsLines = doc.splitTextToSize(estimateAmountWords, pageWidth - 60);
  doc.text(estimateWordsLines[0], 60, yPos + 5);
  if (estimateWordsLines.length > 1) {
    doc.text(estimateWordsLines[1], 20, yPos + 10);
  }
  yPos += 18;

  // Validity notice
  if (validUntil) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.warning);
    doc.text(`⚠ This estimate is valid until ${format(validUntil, 'dd MMMM yyyy')}`, 20, yPos + 8);
    yPos += 18;
  }

  // Notes
  if (notes) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'italic');
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text('Note: ' + notes, 15, yPos);
    yPos += 10;
  }

  // Payment Details Section for Estimates
  yPos += 10;
  doc.setFillColor(240, 253, 244); // Light green background
  doc.roundedRect(15, yPos, pageWidth - 30, 55, 3, 3, 'F');
  doc.setDrawColor(34, 197, 94); // Green border
  doc.setLineWidth(1);
  doc.roundedRect(15, yPos, pageWidth - 30, 55, 3, 3, 'S');
  
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('💳 PAYMENT DETAILS', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bank:', 20, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('ZENITH BANK', 55, yPos);
  yPos += 6;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Account Name:', 20, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('NNADI EMMANUEL C', 55, yPos);
  yPos += 6;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Account Number:', 20, yPos);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text('2084929453', 55, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(161, 98, 7);
  doc.text('📱 Send Payment Evidence To: +234 902 872 4839 (WhatsApp)', 20, yPos);
  
  yPos += 15;

  // Disclaimer
  yPos = doc.internal.pageSize.getHeight() - 40;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, yPos, pageWidth - 30, 15, 'F');
  
  doc.setFontSize(7);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('DISCLAIMER: This is an estimate only. Actual costs may vary based on intraoperative findings,', 20, yPos + 5);
  doc.text('complications, additional procedures, or length of hospital stay. A final invoice will be provided upon discharge.', 20, yPos + 10);

  // Footer
  addBrandedFooter(doc, 1, 1, 'This estimate is not a guarantee of services. Please contact us for any questions.');

  // Save
  doc.save(`FeeEstimate_${estimateNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

// Generate a receipt PDF
export interface ReceiptPDFOptions {
  receiptNumber: string;
  paymentDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalPhone?: string;
  invoiceNumber?: string;
  amountPaid: number;
  paymentMethod: string;
  receivedBy?: string;
  notes?: string;
}

export function generateReceiptPDF(options: ReceiptPDFOptions): void {
  const {
    receiptNumber,
    paymentDate,
    patient,
    hospitalName,
    hospitalPhone,
    invoiceNumber,
    amountPaid,
    paymentMethod,
    receivedBy,
    notes,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add branded header
  const info: PDFDocumentInfo = {
    title: 'PAYMENT RECEIPT',
    subtitle: `Receipt #${receiptNumber}`,
    hospitalName,
    hospitalPhone,
  };

  let yPos = addBrandedHeader(doc, info);

  // PAID stamp
  doc.setFillColor(...PDF_COLORS.success);
  doc.roundedRect(pageWidth - 55, yPos - 10, 40, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PAID', pageWidth - 35, yPos - 3, { align: 'center' });

  yPos += 10;

  // Patient info
  yPos = addPatientInfoBox(doc, yPos, patient);

  // Payment details
  yPos = addSectionTitle(doc, yPos, 'Payment Details', 'success');

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);

  let detailY = yPos + 10;
  doc.text(`Receipt Number: ${receiptNumber}`, 20, detailY);
  doc.text(`Payment Date: ${format(paymentDate, 'dd MMMM yyyy, HH:mm')}`, pageWidth / 2, detailY);
  detailY += 10;

  if (invoiceNumber) {
    doc.text(`Invoice Reference: ${invoiceNumber}`, 20, detailY);
    detailY += 10;
  }

  doc.text(`Payment Method: ${paymentMethod}`, 20, detailY);
  if (receivedBy) {
    doc.text(`Received By: ${receivedBy}`, pageWidth / 2, detailY);
  }
  detailY += 10;

  // Amount box
  doc.setFillColor(...PDF_COLORS.success);
  doc.roundedRect(20, detailY - 2, pageWidth - 40, 14, 2, 2, 'F');
  
  doc.setFontSize(12);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Amount Paid:', 25, detailY + 7);
  doc.text(formatNairaPDF(amountPaid), pageWidth - 25, detailY + 7, { align: 'right' });

  yPos += 55;

  // Notes
  if (notes) {
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'italic');
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text('Notes: ' + notes, 15, yPos);
  }

  // Footer
  addBrandedFooter(doc, 1, 1, 'Please retain this receipt for your records. Thank you for your payment.');

  // Save
  doc.save(`Receipt_${receiptNumber}_${format(paymentDate, 'yyyyMMdd')}.pdf`);
}

// ==========================================
// PDF BLOB AND SHARING FUNCTIONS
// ==========================================

/**
 * Generate invoice PDF and return as Blob for sharing
 */
export function getInvoicePDFBlob(options: InvoicePDFOptions): Blob {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    patient,
    hospitalName,
    hospitalAddress,
    hospitalPhone,
    hospitalEmail,
    items,
    subtotal,
    discountAmount = 0,
    taxAmount = 0,
    totalAmount,
    paidAmount = 0,
    status,
    notes,
    paymentInstructions,
    bankDetails,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CRITICAL: Ensure white background for the entire page
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Add branded header
  const info: PDFDocumentInfo = {
    title: 'INVOICE',
    subtitle: `Invoice #${invoiceNumber}`,
    hospitalName,
    hospitalAddress,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Invoice status badge
  const statusColors: Record<string, [number, number, number]> = {
    pending: [234, 179, 8],
    paid: [34, 197, 94],
    partial: [59, 130, 246],
    overdue: [220, 38, 38],
    cancelled: [107, 114, 128],
  };

  const statusLabels: Record<string, string> = {
    pending: 'PENDING',
    paid: 'PAID',
    partial: 'PARTIALLY PAID',
    overdue: 'OVERDUE',
    cancelled: 'CANCELLED',
  };

  doc.setFillColor(...statusColors[status]);
  doc.roundedRect(pageWidth - 55, yPos - 10, 40, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabels[status], pageWidth - 35, yPos - 3, { align: 'center' });

  yPos += 5;

  // Invoice details box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  
  doc.text(`Invoice Date: ${format(invoiceDate, 'dd MMMM yyyy')}`, 20, yPos + 8);
  if (dueDate) {
    doc.text(`Due Date: ${format(dueDate, 'dd MMMM yyyy')}`, 20, yPos + 15);
  }
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 70, yPos + 8);
  
  yPos += 28;

  // Patient information
  yPos = addPatientInfoBox(doc, yPos, patient);

  // Items table
  yPos = addSectionTitle(doc, yPos, 'Invoice Items');

  // Table header
  const colWidths = [70, 25, 35, 35];
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  
  let xPos = 17;
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Table rows
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);
  
  items.forEach((item, index) => {
    yPos = checkNewPage(doc, yPos, 10);
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    }
    
    xPos = 17;
    doc.setFontSize(8);
    
    let description = item.description;
    if (item.category) {
      description = `[${item.category}] ${description}`;
    }
    if (doc.getTextWidth(description) > colWidths[0] - 4) {
      while (doc.getTextWidth(description + '...') > colWidths[0] - 4) {
        description = description.slice(0, -1);
      }
      description += '...';
    }
    doc.text(description, xPos, yPos + 5.5);
    xPos += colWidths[0];
    
    doc.text(item.quantity.toString(), xPos, yPos + 5.5);
    xPos += colWidths[1];
    
    doc.text(formatNairaPDF(item.unitPrice), xPos, yPos + 5.5);
    xPos += colWidths[2];
    
    doc.text(formatNairaPDF(item.total), xPos, yPos + 5.5);
    
    yPos += 8;
  });

  // Table border
  const tableHeight = 8 + items.length * 8;
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.rect(15, yPos - tableHeight, pageWidth - 30, tableHeight, 'S');

  yPos += 10;

  // Summary section
  yPos = checkNewPage(doc, yPos, 50);
  
  const summaryX = pageWidth - 90;
  doc.setFontSize(9);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.dark);

  doc.text('Subtotal:', summaryX, yPos);
  doc.text(formatNairaPDF(subtotal), pageWidth - 20, yPos, { align: 'right' });
  yPos += 7;

  if (discountAmount > 0) {
    doc.setTextColor(...PDF_COLORS.success);
    doc.text('Discount:', summaryX, yPos);
    doc.text(`-${formatNairaPDF(discountAmount)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  }

  if (taxAmount > 0) {
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text('Tax:', summaryX, yPos);
    doc.text(formatNairaPDF(taxAmount), pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  }

  doc.setDrawColor(...PDF_COLORS.gray);
  doc.setLineWidth(0.5);
  doc.line(summaryX, yPos, pageWidth - 15, yPos);
  yPos += 5;

  doc.setFillColor(...PDF_COLORS.primaryDark);
  doc.roundedRect(summaryX - 5, yPos - 2, pageWidth - summaryX - 5, 12, 2, 2, 'F');
  
  doc.setFontSize(11);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', summaryX, yPos + 6);
  doc.text(formatNairaPDF(totalAmount), pageWidth - 20, yPos + 6, { align: 'right' });
  yPos += 18;

  if (paidAmount > 0 || status === 'partial') {
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.success);
    doc.text('Amount Paid:', summaryX, yPos);
    doc.text(formatNairaPDF(paidAmount), pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;

    const balance = totalAmount - paidAmount;
    if (balance > 0) {
      doc.setTextColor(...PDF_COLORS.danger);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Balance Due:', summaryX, yPos);
      doc.text(formatNairaPDF(balance), pageWidth - 20, yPos, { align: 'right' });
      yPos += 7;
    }
  }

  yPos += 10;

  if (bankDetails) {
    yPos = checkNewPage(doc, yPos, 40);
    yPos = addSectionTitle(doc, yPos, 'Payment Details', 'info');
    
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    
    doc.text(`Bank: ${bankDetails.bankName}`, 20, yPos + 8);
    doc.text(`Account Name: ${bankDetails.accountName}`, 20, yPos + 15);
    doc.text(`Account Number: ${bankDetails.accountNumber}`, 20, yPos + 22);
    
    yPos += 32;
  }

  if (paymentInstructions) {
    yPos = checkNewPage(doc, yPos, 30);
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text('Payment Instructions:', 15, yPos);
    yPos += 6;
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(paymentInstructions, pageWidth - 30);
    doc.text(lines, 15, yPos);
    yPos += lines.length * 4 + 5;
  }

  if (notes) {
    yPos = checkNewPage(doc, yPos, 30);
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text('Notes:', 15, yPos);
    yPos += 6;
    
    doc.setFont(PDF_FONTS.primary, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.gray);
    const noteLines = doc.splitTextToSize(notes, pageWidth - 30);
    doc.text(noteLines, 15, yPos);
  }

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages, 'Thank you for your business. Please retain this invoice for your records.');
  }

  return doc.output('blob');
}

/**
 * Download invoice as PDF
 */
export function downloadInvoicePDF(options: InvoicePDFOptions): void {
  const blob = getInvoicePDFBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${options.invoiceNumber}_${format(options.invoiceDate, 'yyyyMMdd')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share invoice via WhatsApp
 * Opens WhatsApp with a pre-filled message and triggers PDF download for attachment
 */
export function shareInvoiceViaWhatsApp(
  options: InvoicePDFOptions,
  patientName: string,
  phoneNumber?: string
): void {
  const blob = getInvoicePDFBlob(options);
  const url = URL.createObjectURL(blob);
  
  // Format balance if applicable
  const balance = options.totalAmount - (options.paidAmount || 0);
  const balanceText = balance > 0 ? `\nBalance Due: N ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
  
  // Create WhatsApp message
  const message = encodeURIComponent(
    `📋 *Invoice #${options.invoiceNumber}*\n\n` +
    `Patient: ${patientName}\n` +
    `Date: ${format(options.invoiceDate, 'dd MMMM yyyy')}\n` +
    `Total Amount: N ${options.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `Amount Paid: N ${(options.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` +
    balanceText + `\n\n` +
    `Status: ${options.status.toUpperCase()}\n\n` +
    `Please find the invoice PDF attached.`
  );
  
  // Build WhatsApp URL
  const whatsappUrl = phoneNumber 
    ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`
    : `https://wa.me/?text=${message}`;
  
  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank');
  
  // Also trigger download so user can attach the PDF
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${options.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up
  URL.revokeObjectURL(url);
}
