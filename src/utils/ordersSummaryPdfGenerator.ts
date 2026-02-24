/**
 * Orders Summary PDF Generator
 * 
 * Generates A4 and 80mm thermal PDFs for patient clinical orders summary.
 * Used by PatientOrdersReview component for the "Print Summary" export.
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  PDF_COLORS,
  addBrandedHeader,
  addPatientInfoBox,
  addSectionTitle,
  checkNewPage,
  addBrandedFooter,
  addWatermarkToAllPages,
  type PDFDocumentInfo,
  type PDFPatientInfo,
} from './pdfUtils';
import { PDF_MARGINS, PDF_FONTS, PDF_FONT_SIZES, ensureWhiteBackground } from './pdfConfig';
import {
  createThermalPDF,
  type ThermalDocumentSection,
  type ThermalDocumentData,
} from './thermalPdfGenerator';
import type { UnifiedOrderItem, OrderType, OrderStatus } from '../hooks/usePatientOrdersHistory';

// ── Input types ──────────────────────────────────────────────────

export interface OrdersSummaryPDFInput {
  patientName: string;
  hospitalNumber: string;
  hospitalName?: string;
  orders: UnifiedOrderItem[];
  generatedAt: Date;
}

// ── Helpers ──────────────────────────────────────────────────────

function orderTypeLabel(t: OrderType): string {
  switch (t) {
    case 'prescription': return 'Prescription';
    case 'investigation': return 'Investigation';
    case 'lab_request': return 'Lab Request';
    case 'treatment_plan': return 'Treatment Plan';
    default: return 'Order';
  }
}

function statusLabel(s: OrderStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function priorityLabel(p?: string): string {
  if (!p) return '';
  return p.toUpperCase();
}

// Group orders by type in a stable order
function groupByType(orders: UnifiedOrderItem[]): Record<OrderType, UnifiedOrderItem[]> {
  const groups: Record<OrderType, UnifiedOrderItem[]> = {
    prescription: [],
    investigation: [],
    lab_request: [],
    treatment_plan: [],
  };
  for (const o of orders) {
    groups[o.orderType].push(o);
  }
  return groups;
}

// ── A4 PDF Generator ────────────────────────────────────────────

export async function generateOrdersSummaryA4PDF(input: OrdersSummaryPDFInput): Promise<jsPDF> {
  const { patientName, hospitalNumber, hospitalName, orders, generatedAt } = input;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;

  ensureWhiteBackground(doc);

  // ── Header ──
  const docInfo: PDFDocumentInfo = {
    title: 'Clinical Orders Summary',
    subtitle: 'Harmonized Patient Orders Report',
    hospitalName: hospitalName || 'AstroHEALTH Hospital',
  };
  let y = addBrandedHeader(doc, docInfo);

  // ── Patient info ──
  const patientInfo: PDFPatientInfo = {
    name: patientName,
    hospitalNumber: hospitalNumber,
  };
  y = addPatientInfoBox(doc, patientInfo, y);
  y += 2;

  // ── Report meta line ──
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Generated: ${format(generatedAt, 'dd MMM yyyy h:mm a')}   |   Total Orders: ${orders.length}`,
    PDF_MARGINS.left,
    y,
  );
  y += 7;

  // ── Group orders by type ──
  const groups = groupByType(orders);
  const typeOrder: OrderType[] = ['prescription', 'investigation', 'lab_request', 'treatment_plan'];

  for (const type of typeOrder) {
    const group = groups[type];
    if (group.length === 0) continue;

    // Section heading
    y = checkNewPage(doc, y, 30);
    y = addSectionTitle(doc, `${orderTypeLabel(type)}s (${group.length})`, y);

    // Table header
    y = checkNewPage(doc, y, 10);
    doc.setFillColor(240, 240, 240);
    doc.rect(PDF_MARGINS.left, y - 4, contentWidth, 7, 'F');
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    const col1 = PDF_MARGINS.left + 1;
    const col2 = PDF_MARGINS.left + 20;
    const col3 = PDF_MARGINS.left + contentWidth * 0.38;
    const col4 = PDF_MARGINS.left + contentWidth * 0.68;
    const col5 = PDF_MARGINS.left + contentWidth * 0.82;

    doc.text('#', col1, y);
    doc.text('Date', col2, y);
    doc.text('Summary', col3, y);
    doc.text('Status', col4, y);
    doc.text('Priority', col5, y);
    y += 5;

    // Table rows
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);

    group.forEach((order, idx) => {
      y = checkNewPage(doc, y, 20);

      // Zebra stripe
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 252);
        doc.rect(PDF_MARGINS.left, y - 3.5, contentWidth, 5, 'F');
      }

      doc.setTextColor(0, 0, 0);
      doc.text(`${idx + 1}`, col1, y);
      doc.text(format(order.date, 'dd/MM/yy HH:mm'), col2, y);

      // Summary (truncated)
      const summaryText = order.summary.length > 40
        ? order.summary.substring(0, 37) + '...'
        : order.summary;
      doc.text(summaryText, col3, y);

      // Status with color indicator
      const statusStr = statusLabel(order.status);
      if (order.status === 'active') doc.setTextColor(37, 99, 235);
      else if (order.status === 'completed') doc.setTextColor(22, 163, 74);
      else if (order.status === 'cancelled') doc.setTextColor(220, 38, 38);
      else if (order.status === 'pending') doc.setTextColor(217, 119, 6);
      else doc.setTextColor(107, 114, 128);
      doc.text(statusStr, col4, y);

      // Priority
      doc.setTextColor(0, 0, 0);
      if (order.priority === 'urgent' || order.priority === 'stat') {
        doc.setTextColor(220, 38, 38);
        doc.setFont(PDF_FONTS.primary, 'bold');
      }
      doc.text(priorityLabel(order.priority) || '—', col5, y);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.setTextColor(0, 0, 0);

      y += 5;

      // Detail lines
      if (order.details.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const detailsToShow = order.details.slice(0, 4);
        for (const detail of detailsToShow) {
          y = checkNewPage(doc, y, 8);
          const detLine = detail.length > 80 ? detail.substring(0, 77) + '...' : detail;
          doc.text(`   • ${detLine}`, col2, y);
          y += 3.5;
        }
        if (order.details.length > 4) {
          doc.text(`   ... and ${order.details.length - 4} more`, col2, y);
          y += 3.5;
        }
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        y += 1;
      }
    });

    y += 4;
  }

  // ── Active Medication Summary ──
  const activeMeds = orders.filter(o => o.orderType === 'prescription' && (o.status === 'active' || o.status === 'pending'));
  if (activeMeds.length > 0) {
    y = checkNewPage(doc, y, 25);
    y = addSectionTitle(doc, 'Active Medications Summary', y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    activeMeds.forEach((med, idx) => {
      y = checkNewPage(doc, y, 12);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text(`${idx + 1}. ${med.summary}`, PDF_MARGINS.left + 2, y);
      doc.setFont(PDF_FONTS.primary, 'normal');
      y += 4;
      for (const detail of med.details.slice(0, 6)) {
        y = checkNewPage(doc, y, 6);
        doc.text(`    ${detail}`, PDF_MARGINS.left + 2, y);
        y += 3.5;
      }
      y += 2;
    });
  }

  // ── Pending Investigations Summary ──
  const pendingInv = orders.filter(
    o => (o.orderType === 'investigation' || o.orderType === 'lab_request') &&
      (o.status === 'active' || o.status === 'pending'),
  );
  if (pendingInv.length > 0) {
    y = checkNewPage(doc, y, 25);
    y = addSectionTitle(doc, 'Pending Investigations Summary', y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    pendingInv.forEach((inv, idx) => {
      y = checkNewPage(doc, y, 8);
      doc.text(`${idx + 1}. ${inv.summary}  —  ${statusLabel(inv.status)}${inv.priority ? '  [' + priorityLabel(inv.priority) + ']' : ''}`, PDF_MARGINS.left + 2, y);
      y += 4;
    });
  }

  // ── Footer on all pages ──
  addBrandedFooter(doc);
  addWatermarkToAllPages(doc);

  return doc;
}

// ── Thermal PDF Generator (80mm) ────────────────────────────────

export function generateOrdersSummaryThermalPDF(input: OrdersSummaryPDFInput): jsPDF {
  const { patientName, hospitalNumber, orders, generatedAt } = input;

  const sections: ThermalDocumentSection[] = [];

  // Patient info
  sections.push({ type: 'keyValue', key: 'Patient', value: patientName });
  sections.push({ type: 'keyValue', key: 'Hosp. No', value: hospitalNumber || 'N/A' });
  sections.push({ type: 'divider' });

  // Group orders by type
  const groups = groupByType(orders);
  const typeOrder: OrderType[] = ['prescription', 'investigation', 'lab_request', 'treatment_plan'];

  for (const type of typeOrder) {
    const group = groups[type];
    if (group.length === 0) continue;

    sections.push({ type: 'header', content: `${orderTypeLabel(type)}s (${group.length})` });

    group.forEach((order, idx) => {
      sections.push({
        type: 'text',
        content: `${idx + 1}. ${order.summary}  [${statusLabel(order.status)}]${order.priority && order.priority !== 'routine' ? ' *' + priorityLabel(order.priority) + '*' : ''}`,
      });

      // Show first 3 details
      const detailsToShow = order.details.slice(0, 3);
      for (const detail of detailsToShow) {
        sections.push({ type: 'text', content: `   ${detail}` });
      }
      if (order.details.length > 3) {
        sections.push({ type: 'text', content: `   ... +${order.details.length - 3} more` });
      }
    });

    sections.push({ type: 'divider' });
  }

  // Active counts summary
  const activeMeds = orders.filter(o => o.orderType === 'prescription' && (o.status === 'active' || o.status === 'pending'));
  const pendingInv = orders.filter(o => (o.orderType === 'investigation' || o.orderType === 'lab_request') && (o.status === 'active' || o.status === 'pending'));

  if (activeMeds.length > 0 || pendingInv.length > 0) {
    sections.push({ type: 'header', content: 'ACTIVE SUMMARY' });
    if (activeMeds.length > 0) {
      sections.push({ type: 'keyValue', key: 'Active Meds', value: `${activeMeds.length}` });
    }
    if (pendingInv.length > 0) {
      sections.push({ type: 'keyValue', key: 'Pending Tests', value: `${pendingInv.length}` });
    }
    sections.push({ type: 'divider' });
  }

  const data: ThermalDocumentData = {
    title: 'ORDERS SUMMARY',
    subtitle: 'AstroHEALTH',
    timestamp: generatedAt,
    sections,
    footer: `Total: ${orders.length} order(s)`,
  };

  return createThermalPDF(data);
}
