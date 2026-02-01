/**
 * Thermal PDF Generator Utility
 * Converts documents to 80mm thermal printer format
 * 
 * XP-T80Q Thermal Printer Specifications:
 * - Paper Width: 80mm
 * - Printable Width: ~72mm (with margins)
 * - Font: Georgia (Times in jsPDF as closest match)
 * - Font Size: 12pt bold for headers, 10-12pt for body
 * - Resolution: 203 DPI
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';

// 80mm = ~226 points (80mm * 2.83)
export const THERMAL_PAGE_WIDTH = 226;
export const THERMAL_MARGIN = 8;
export const THERMAL_CONTENT_WIDTH = THERMAL_PAGE_WIDTH - (THERMAL_MARGIN * 2);
export const THERMAL_PAGE_HEIGHT = 800; // Long receipt format

export interface ThermalDocumentSection {
  type: 'title' | 'subtitle' | 'header' | 'text' | 'keyValue' | 'table' | 'divider' | 'checkbox' | 'footer' | 'spacer';
  content?: string;
  key?: string;
  value?: string;
  items?: { label: string; value: string; checked?: boolean }[];
  rows?: string[][];
  headers?: string[];
}

export interface ThermalDocumentData {
  title: string;
  subtitle?: string;
  timestamp?: Date;
  sections: ThermalDocumentSection[];
  footer?: string;
  preparedBy?: string;
}

/**
 * Create a thermal PDF document (80mm width)
 * Uses Times font as closest match to Georgia in jsPDF
 */
export function createThermalPDF(data: ThermalDocumentData): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT],
  });

  let y = THERMAL_MARGIN + 5;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(data.title.toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Timestamp
  if (data.timestamp) {
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text(format(data.timestamp, 'dd/MM/yyyy HH:mm'), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
    y += 14;
  }

  // Subtitle
  if (data.subtitle) {
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(data.subtitle.toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
    y += 16;
  }

  // Divider after header
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Process sections
  for (const section of data.sections) {
    // Check for page break
    if (y > THERMAL_PAGE_HEIGHT - 60) {
      doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
      y = THERMAL_MARGIN;
    }

    switch (section.type) {
      case 'title':
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(section.content || '', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
        y += 16;
        break;

      case 'subtitle':
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text(section.content || '', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
        y += 14;
        break;

      case 'header':
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text(`-- ${section.content} --`, THERMAL_MARGIN, y);
        y += 14;
        break;

      case 'text':
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        const textLines = doc.splitTextToSize(section.content || '', THERMAL_CONTENT_WIDTH);
        textLines.forEach((line: string) => {
          if (y > THERMAL_PAGE_HEIGHT - 30) {
            doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
            y = THERMAL_MARGIN;
          }
          doc.text(line, THERMAL_MARGIN, y);
          y += 12;
        });
        break;

      case 'keyValue':
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text(`${section.key}:`, THERMAL_MARGIN, y);
        doc.setFont('times', 'normal');
        const valueLines = doc.splitTextToSize(section.value || '', THERMAL_CONTENT_WIDTH - 60);
        valueLines.forEach((line: string, idx: number) => {
          doc.text(line, THERMAL_MARGIN + (idx === 0 ? 55 : 0), y);
          y += 12;
        });
        break;

      case 'table':
        if (section.headers) {
          doc.setFont('times', 'bold');
          doc.setFontSize(9);
          let xPos = THERMAL_MARGIN;
          const colWidth = THERMAL_CONTENT_WIDTH / section.headers.length;
          section.headers.forEach(header => {
            doc.text(header, xPos, y);
            xPos += colWidth;
          });
          y += 12;
          doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
          y += 8;
        }
        if (section.rows) {
          doc.setFont('times', 'normal');
          doc.setFontSize(9);
          const colWidth = THERMAL_CONTENT_WIDTH / (section.rows[0]?.length || 1);
          section.rows.forEach(row => {
            if (y > THERMAL_PAGE_HEIGHT - 30) {
              doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
              y = THERMAL_MARGIN;
            }
            let xPos = THERMAL_MARGIN;
            row.forEach(cell => {
              doc.text(String(cell).substring(0, 20), xPos, y);
              xPos += colWidth;
            });
            y += 12;
          });
        }
        y += 4;
        break;

      case 'checkbox':
        if (section.items) {
          doc.setFont('times', 'normal');
          doc.setFontSize(10);
          section.items.forEach(item => {
            if (y > THERMAL_PAGE_HEIGHT - 30) {
              doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
              y = THERMAL_MARGIN;
            }
            // Draw checkbox
            const checkboxSize = 8;
            doc.setLineWidth(0.8);
            doc.rect(THERMAL_MARGIN, y - 7, checkboxSize, checkboxSize);
            if (item.checked) {
              doc.text('✓', THERMAL_MARGIN + 1, y - 1);
            }
            // Item text
            const itemText = item.value ? `${item.label}: ${item.value}` : item.label;
            doc.text(itemText, THERMAL_MARGIN + checkboxSize + 4, y);
            y += 14;
          });
        }
        break;

      case 'divider':
        doc.setLineWidth(0.5);
        doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
        y += 10;
        break;

      case 'spacer':
        y += 8;
        break;

      case 'footer':
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text(section.content || '', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
        y += 12;
        break;
    }
  }

  // Add prepared by and footer
  y += 8;
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  if (data.preparedBy) {
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(`Prepared by: ${data.preparedBy}`, THERMAL_MARGIN, y);
    y += 12;
  }

  if (data.footer) {
    doc.setFontSize(8);
    doc.text(data.footer, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  } else {
    doc.setFontSize(8);
    doc.text('AstroHEALTH EMR System', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  }

  return doc;
}

/**
 * Convert an A4 jsPDF document info to thermal format
 * This is a simplified converter for basic documents
 */
export interface SimpleThermalData {
  title: string;
  subtitle?: string;
  patientName?: string;
  patientId?: string;
  date?: Date;
  items: { label: string; value: string }[];
  checklistItems?: string[];
  notes?: string;
  preparedBy?: string;
  totalLabel?: string;
  totalValue?: string;
}

export function createSimpleThermalPDF(data: SimpleThermalData): jsPDF {
  const sections: ThermalDocumentSection[] = [];

  // Patient info
  if (data.patientName) {
    sections.push({ type: 'keyValue', key: 'Patient', value: data.patientName });
  }
  if (data.patientId) {
    sections.push({ type: 'keyValue', key: 'ID', value: data.patientId });
  }
  if (data.patientName || data.patientId) {
    sections.push({ type: 'divider' });
  }

  // Main items
  data.items.forEach(item => {
    sections.push({ type: 'keyValue', key: item.label, value: item.value });
  });

  // Total if provided
  if (data.totalLabel && data.totalValue) {
    sections.push({ type: 'divider' });
    sections.push({ type: 'keyValue', key: data.totalLabel, value: data.totalValue });
  }

  // Checklist items
  if (data.checklistItems && data.checklistItems.length > 0) {
    sections.push({ type: 'divider' });
    sections.push({ type: 'header', content: 'Checklist' });
    sections.push({
      type: 'checkbox',
      items: data.checklistItems.map(item => ({ label: item, value: '' }))
    });
  }

  // Notes
  if (data.notes) {
    sections.push({ type: 'divider' });
    sections.push({ type: 'header', content: 'Notes' });
    sections.push({ type: 'text', content: data.notes });
  }

  return createThermalPDF({
    title: data.title,
    subtitle: data.subtitle,
    timestamp: data.date || new Date(),
    sections,
    preparedBy: data.preparedBy
  });
}

/**
 * Create a thermal invoice/receipt PDF
 */
export interface ThermalInvoiceData {
  invoiceNumber: string;
  date: Date;
  patientName: string;
  patientId?: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  amountPaid?: number;
  balance?: number;
  hospitalName?: string;
  preparedBy?: string;
}

export function createThermalInvoicePDF(data: ThermalInvoiceData): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT],
  });

  let y = THERMAL_MARGIN + 5;

  // Hospital name
  if (data.hospitalName) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(data.hospitalName.toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
    y += 14;
  }

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('INVOICE', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Invoice number and date
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`No: ${data.invoiceNumber}`, THERMAL_MARGIN, y);
  doc.text(format(data.date, 'dd/MM/yyyy'), THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
  y += 14;

  // Divider
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Patient info
  doc.setFont('times', 'bold');
  doc.text('Patient:', THERMAL_MARGIN, y);
  doc.setFont('times', 'normal');
  doc.text(data.patientName, THERMAL_MARGIN + 50, y);
  y += 12;
  if (data.patientId) {
    doc.setFont('times', 'bold');
    doc.text('ID:', THERMAL_MARGIN, y);
    doc.setFont('times', 'normal');
    doc.text(data.patientId, THERMAL_MARGIN + 50, y);
    y += 12;
  }

  // Divider
  y += 4;
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Items header
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('ITEM', THERMAL_MARGIN, y);
  doc.text('QTY', THERMAL_MARGIN + 100, y);
  doc.text('AMOUNT', THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
  y += 12;
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 8;

  // Items
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  data.items.forEach(item => {
    if (y > THERMAL_PAGE_HEIGHT - 80) {
      doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
      y = THERMAL_MARGIN;
    }
    const descLines = doc.splitTextToSize(item.description, 95);
    descLines.forEach((line: string, idx: number) => {
      doc.text(line, THERMAL_MARGIN, y);
      if (idx === 0) {
        doc.text(String(item.quantity), THERMAL_MARGIN + 100, y);
        doc.text(`₦${item.total.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
      }
      y += 11;
    });
  });

  // Totals
  y += 6;
  doc.setLineWidth(1);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text('Subtotal:', THERMAL_MARGIN, y);
  doc.text(`₦${data.subtotal.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
  y += 12;

  if (data.discount) {
    doc.text('Discount:', THERMAL_MARGIN, y);
    doc.text(`-₦${data.discount.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
    y += 12;
  }

  if (data.tax) {
    doc.text('Tax:', THERMAL_MARGIN, y);
    doc.text(`₦${data.tax.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
    y += 12;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', THERMAL_MARGIN, y);
  doc.text(`₦${data.total.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
  y += 16;

  // Payment status
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  doc.setFontSize(10);
  const statusText = data.paymentStatus === 'paid' ? 'PAID' : data.paymentStatus === 'partial' ? 'PARTIAL' : 'UNPAID';
  doc.text(`Status: ${statusText}`, THERMAL_MARGIN, y);
  y += 12;

  if (data.amountPaid !== undefined) {
    doc.setFont('times', 'normal');
    doc.text('Amount Paid:', THERMAL_MARGIN, y);
    doc.text(`₦${data.amountPaid.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
    y += 12;
  }

  if (data.balance !== undefined && data.balance > 0) {
    doc.setFont('times', 'bold');
    doc.text('Balance Due:', THERMAL_MARGIN, y);
    doc.text(`₦${data.balance.toLocaleString()}`, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
    y += 12;
  }

  // Footer
  y += 12;
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  if (data.preparedBy) {
    doc.text(`Prepared by: ${data.preparedBy}`, THERMAL_MARGIN, y);
    y += 10;
  }
  doc.text('AstroHEALTH EMR System', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;
  doc.text('Thank you for your patronage', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });

  return doc;
}

export default {
  createThermalPDF,
  createSimpleThermalPDF,
  createThermalInvoicePDF,
  THERMAL_PAGE_WIDTH,
  THERMAL_MARGIN,
  THERMAL_CONTENT_WIDTH
};
