// Shared PDF utilities with CareBridge branding
// Used across all PDF generators for consistent branding

import jsPDF from 'jspdf';

// CareBridge brand colors (from logo) - DEEP BLACK for excellent visibility
export const PDF_COLORS = {
  primary: [81, 112, 255] as [number, number, number],      // #5170FF - Logo blue
  primaryDark: [24, 0, 172] as [number, number, number],    // #1800AC - Logo purple
  success: [34, 197, 94] as [number, number, number],       // Green
  danger: [220, 38, 38] as [number, number, number],        // Red
  warning: [234, 179, 8] as [number, number, number],       // Yellow
  info: [59, 130, 246] as [number, number, number],         // Blue
  dark: [0, 0, 0] as [number, number, number],              // Pure Black - maximum visibility
  text: [0, 0, 0] as [number, number, number],              // Pure Black for body text
  gray: [31, 41, 55] as [number, number, number],           // Dark Gray-800 for secondary text
  lightGray: [75, 85, 99] as [number, number, number],      // Gray-600 - still readable
  white: [255, 255, 255] as [number, number, number],
};

// Logo path for PDF header
const LOGO_PATH = '/icons/logo.png';

// Cache for loaded logo base64
let cachedLogoBase64: string | null = null;

// Function to load and cache logo as base64 for PDF use
async function loadLogoAsBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  
  try {
    const response = await fetch(LOGO_PATH);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Pre-load logo on module initialization for faster PDF generation
loadLogoAsBase64().catch(() => {});

// Export preload function for components to ensure logo is loaded before PDF generation
export async function preloadPDFLogo(): Promise<boolean> {
  const result = await loadLogoAsBase64();
  return result !== null;
}

// Synchronously get cached logo (call after async load)
function getCachedLogo(): string | null {
  return cachedLogoBase64;
}

// Add a text placeholder when logo can't be loaded
function addLogoPlaceholder(doc: jsPDF, y: number): void {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, y, 20, 20, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('CB', 25, y + 12, { align: 'center' });
}

export interface PDFDocumentInfo {
  title: string;
  subtitle?: string;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
}

export interface PDFPatientInfo {
  name: string;
  hospitalNumber: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  diagnosis?: string;
}

// Add branded header with logo to any PDF document
export function addBrandedHeader(
  doc: jsPDF, 
  info: PDFDocumentInfo,
  options?: { includeDate?: boolean; yOffset?: number }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { includeDate = true, yOffset = 0 } = options || {};
  let y = 10 + yOffset;

  // Header background with gradient effect
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 38, 'F');
  
  // Add darker accent bar
  doc.setFillColor(...PDF_COLORS.primaryDark);
  doc.rect(0, 35, pageWidth, 3, 'F');

  // Try to add logo image from cache
  const logoBase64 = getCachedLogo();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 15, y, 20, 20);
    } catch {
      addLogoPlaceholder(doc, y);
    }
  } else {
    addLogoPlaceholder(doc, y);
  }

  // App name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CareBridge', 40, y + 10);
  
  // Tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Innovations in Healthcare', 40, y + 16);

  // Hospital name on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(info.hospitalName, pageWidth - 15, y + 8, { align: 'right' });
  
  if (info.hospitalPhone) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(info.hospitalPhone, pageWidth - 15, y + 14, { align: 'right' });
  }
  
  if (info.hospitalEmail) {
    doc.text(info.hospitalEmail, pageWidth - 15, y + 19, { align: 'right' });
  }

  y = 48;

  // Document title
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(info.title, 15, y);
  
  if (info.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(info.subtitle, 15, y + 6);
    y += 8;
  }

  // Date generated
  if (includeDate) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, y, { align: 'right' });
  }

  return y + 10;
}

// Add patient information box
export function addPatientInfoBox(
  doc: jsPDF,
  yPos: number,
  patient: PDFPatientInfo,
  additionalInfo?: Record<string, string>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - 30;
  
  // Box background
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15, yPos, boxWidth, 40, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, boxWidth, 40, 3, 3, 'S');

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text('Patient Information', 20, yPos + 8);

  // Patient details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.dark);

  const leftCol = 20;
  const rightCol = pageWidth / 2;
  let lineY = yPos + 16;

  doc.text(`Name: ${patient.name}`, leftCol, lineY);
  doc.text(`Hospital No: ${patient.hospitalNumber}`, rightCol, lineY);
  lineY += 7;

  if (patient.age !== undefined) {
    doc.text(`Age: ${patient.age} years`, leftCol, lineY);
  }
  if (patient.gender) {
    doc.text(`Gender: ${patient.gender}`, rightCol, lineY);
  }
  lineY += 7;

  if (patient.phone) {
    doc.text(`Phone: ${patient.phone}`, leftCol, lineY);
  }
  
  // Additional info from additionalInfo object
  if (additionalInfo) {
    const entries = Object.entries(additionalInfo);
    if (entries.length > 0) {
      doc.text(`${entries[0][0]}: ${entries[0][1]}`, rightCol, lineY);
    }
  }

  return yPos + 48;
}

// Add branded footer to any page
export function addBrandedFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages?: number,
  customText?: string
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Footer line
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.gray);
  
  // Left side - CareBridge branding
  doc.text('CareBridge - Innovations in Healthcare | WHO-Aligned Clinical Protocols', 15, pageHeight - 14);
  
  // Custom text or default
  const footerText = customText || 'This document is computer-generated and valid without signature.';
  doc.text(footerText, 15, pageHeight - 9);
  
  // Right side - page number
  const pageText = totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`;
  doc.text(pageText, pageWidth - 15, pageHeight - 12, { align: 'right' });
}

// Create a new branded PDF document
export function createBrandedPDF(
  info: PDFDocumentInfo,
  patientInfo?: PDFPatientInfo
): { doc: jsPDF; yPos: number } {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  let yPos = addBrandedHeader(doc, info);
  
  if (patientInfo) {
    yPos = addPatientInfoBox(doc, yPos, patientInfo);
  }
  
  return { doc, yPos };
}

// Helper to add a section title
export function addSectionTitle(
  doc: jsPDF,
  yPos: number,
  title: string,
  icon?: 'warning' | 'info' | 'success' | 'danger'
): number {
  const colors: Record<string, [number, number, number]> = {
    warning: PDF_COLORS.warning,
    info: PDF_COLORS.info,
    success: PDF_COLORS.success,
    danger: PDF_COLORS.danger,
  };

  const color = icon ? colors[icon] : PDF_COLORS.primaryDark;

  doc.setFillColor(...color);
  doc.roundedRect(15, yPos, 4, 10, 1, 1, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.text(title, 23, yPos + 7);

  return yPos + 15;
}

// Helper to add a simple table
export function addSimpleTable(
  doc: jsPDF,
  yPos: number,
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - 30;
  const defaultColWidth = tableWidth / headers.length;
  const colWidths = columnWidths || headers.map(() => defaultColWidth);
  const rowHeight = 8;

  // Header row
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, yPos, tableWidth, rowHeight, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  let xPos = 17;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });

  yPos += rowHeight;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.dark);

  rows.forEach((row, rowIndex) => {
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, tableWidth, rowHeight, 'F');
    }

    xPos = 17;
    row.forEach((cell, i) => {
      // Truncate text if too long
      const maxWidth = colWidths[i] - 4;
      let displayText = cell;
      while (doc.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
        displayText = displayText.slice(0, -4) + '...';
      }
      doc.text(displayText, xPos, yPos + 5.5);
      xPos += colWidths[i];
    });

    yPos += rowHeight;
  });

  // Table border
  doc.setDrawColor(...PDF_COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.rect(15, yPos - (rows.length + 1) * rowHeight, tableWidth, (rows.length + 1) * rowHeight, 'S');

  return yPos + 5;
}

// Format currency for Nigerian Naira
export function formatNairaPDF(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Check if we need a new page
export function checkNewPage(doc: jsPDF, yPos: number, requiredSpace: number = 30): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (yPos + requiredSpace > pageHeight - 25) {
    doc.addPage();
    return 20;
  }
  
  return yPos;
}
