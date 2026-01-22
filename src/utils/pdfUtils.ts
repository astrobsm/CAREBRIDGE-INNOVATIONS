/**
 * ============================================================
 * AstroHEALTH PDF Utilities - Branded Document Generation
 * ============================================================
 * 
 * This file provides shared utilities for PDF generation with
 * AstroHEALTH branding. All PDFs use standardized settings from
 * pdfConfig.ts to ensure consistency, cross-platform compatibility,
 * and professional medical-grade document quality.
 * 
 * CRITICAL STANDARDS ENFORCED:
 * - White background (#FFFFFF) on ALL pages
 * - Black text (#000000) for body content
 * - Helvetica font (embedded in PDF)
 * - Minimum 11pt body text, 9pt footnotes
 * - A4 page size with 20mm margins
 * ============================================================
 */

import jsPDF from 'jspdf';
import {
  PDF_COLORS as CONFIG_COLORS,
  PDF_FONTS,
  PDF_FONT_SIZES,
} from './pdfConfig';

// Re-export colors for backward compatibility
// CRITICAL: All colors are RGB format for maximum compatibility
export const PDF_COLORS: {
  primary: [number, number, number];
  primaryDark: [number, number, number];
  success: [number, number, number];
  danger: [number, number, number];
  warning: [number, number, number];
  info: [number, number, number];
  dark: [number, number, number];
  text: [number, number, number];
  gray: [number, number, number];
  lightGray: [number, number, number];
  white: [number, number, number];
} = {
  primary: CONFIG_COLORS.primary as [number, number, number],
  primaryDark: CONFIG_COLORS.primaryDark as [number, number, number],
  success: CONFIG_COLORS.success as [number, number, number],
  danger: CONFIG_COLORS.danger as [number, number, number],
  warning: CONFIG_COLORS.warning as [number, number, number],
  info: CONFIG_COLORS.info as [number, number, number],
  dark: CONFIG_COLORS.text as [number, number, number],           // Pure Black
  text: CONFIG_COLORS.text as [number, number, number],           // Pure Black for body
  gray: CONFIG_COLORS.gray[800] as [number, number, number],      // Dark gray for secondary
  lightGray: CONFIG_COLORS.gray[600] as [number, number, number], // Gray for labels
  white: CONFIG_COLORS.background as [number, number, number],    // White background
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

/**
 * Add watermark logo to PDF pages
 * This function adds a semi-transparent logo watermark to the center of the page
 * CRITICAL: Should be called before adding content to ensure watermark is behind text
 */
export function addLogoWatermark(doc: jsPDF, opacity: number = 0.08): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoBase64 = getCachedLogo();
  
  if (logoBase64) {
    try {
      // Save current graphics state
      doc.saveGraphicsState();
      
      // Set opacity for watermark (semi-transparent)
      const gState = doc.GState({ opacity: opacity });
      doc.setGState(gState);
      
      // Calculate center position for watermark
      const watermarkSize = 100; // Size of watermark in mm
      const x = (pageWidth - watermarkSize) / 2;
      const y = (pageHeight - watermarkSize) / 2;
      
      // Add watermark image
      doc.addImage(logoBase64, 'PNG', x, y, watermarkSize, watermarkSize);
      
      // Restore graphics state
      doc.restoreGraphicsState();
    } catch (err) {
      // Silently fail if watermark can't be added
      console.warn('Failed to add watermark:', err);
    }
  }
}

/**
 * Add watermark to all pages of a PDF document
 * Call this after the document is complete but before saving
 */
export function addWatermarkToAllPages(doc: jsPDF, opacity: number = 0.08): void {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addLogoWatermark(doc, opacity);
  }
}

// Add a text placeholder when logo can't be loaded
// Uses white background and safe fonts
function addLogoPlaceholder(doc: jsPDF, y: number): void {
  doc.setFillColor(...PDF_COLORS.white);
  doc.roundedRect(15, y, 20, 20, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont(PDF_FONTS.primary, 'bold');
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
// CRITICAL: This function ensures white background below header
export function addBrandedHeader(
  doc: jsPDF, 
  info: PDFDocumentInfo,
  options?: { includeDate?: boolean; yOffset?: number }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { includeDate = true, yOffset = 0 } = options || {};
  let y = 10 + yOffset;

  // CRITICAL: Ensure entire page has white background first
  // This prevents any dark mode or transparency issues
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header background with brand color
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

  // App name - white text on colored header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_FONT_SIZES.title);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('AstroHEALTH', 40, y + 10);
  
  // Tagline
  doc.setFontSize(8);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Innovations in Healthcare', 40, y + 16);

  // Hospital name on the right
  doc.setFontSize(10);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(info.hospitalName, pageWidth - 15, y + 8, { align: 'right' });
  
  if (info.hospitalPhone) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(info.hospitalPhone, pageWidth - 15, y + 14, { align: 'right' });
  }
  
  if (info.hospitalEmail) {
    doc.text(info.hospitalEmail, pageWidth - 15, y + 19, { align: 'right' });
  }

  y = 48;

  // CRITICAL: Reset to black text on white background for document body
  // Document title - use black text color per PDF standards
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(info.title, 15, y);
  
  if (info.subtitle) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(info.subtitle, 15, y + 6);
    y += 8;
  }

  // Date generated - use gray for secondary text
  if (includeDate) {
    doc.setFontSize(PDF_FONT_SIZES.footnote);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, y, { align: 'right' });
  }

  // Reset text color to black for content that follows
  doc.setTextColor(...PDF_COLORS.text);

  return y + 10;
}

// Add patient information box
// Uses light background with sufficient contrast for readability
export function addPatientInfoBox(
  doc: jsPDF,
  yPos: number,
  patient: PDFPatientInfo,
  additionalInfo?: Record<string, string>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - 30;
  
  // Box background - very light blue for subtle highlight (maintains print compatibility)
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15, yPos, boxWidth, 40, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, boxWidth, 40, 3, 3, 'S');

  // Title - use brand color for accent
  doc.setFontSize(PDF_FONT_SIZES.tableHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text('Patient Information', 20, yPos + 8);

  // Patient details - black text for maximum readability
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setTextColor(...PDF_COLORS.text);

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

  // Reset text color to black for content that follows
  doc.setTextColor(...PDF_COLORS.text);

  return yPos + 48;
}

// Add branded footer to any page
// CRITICAL: Ensures consistent footer styling and page numbering
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
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  
  // Left side - AstroHEALTH branding
  doc.text('AstroHEALTH - Innovations in Healthcare | WHO-Aligned Clinical Protocols', 15, pageHeight - 14);
  
  // Custom text or default
  const footerText = customText || 'This document is computer-generated and valid without signature.';
  doc.text(footerText, 15, pageHeight - 9);
  
  // Right side - page number
  const pageText = totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`;
  doc.text(pageText, pageWidth - 15, pageHeight - 12, { align: 'right' });

  // Reset text color to black for any subsequent content
  doc.setTextColor(...PDF_COLORS.text);
}

// Create a new branded PDF document
// CRITICAL: This function ensures white background for entire page
// Now includes watermark functionality
export function createBrandedPDF(
  info: PDFDocumentInfo,
  patientInfo?: PDFPatientInfo,
  options?: { includeWatermark?: boolean }
): { doc: jsPDF; yPos: number } {
  const doc = new jsPDF('p', 'mm', 'a4');
  const { includeWatermark = true } = options || {};
  
  // CRITICAL: Ensure white background for the entire page
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Add watermark first so it appears behind content
  if (includeWatermark) {
    addLogoWatermark(doc, 0.06);
  }
  
  let yPos = addBrandedHeader(doc, info);
  
  if (patientInfo) {
    yPos = addPatientInfoBox(doc, yPos, patientInfo);
  }
  
  // Ensure text is reset to black for body content
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  
  return { doc, yPos };
}

// Helper to add a section title
// Uses accent colors for visual hierarchy while maintaining black text
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

  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);  // Use black text for readability
  doc.text(title, 23, yPos + 7);

  // Reset to body text style
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont(PDF_FONTS.primary, 'normal');

  return yPos + 15;
}

// Helper to add a simple table
// Uses proper font sizes per PDF standards (min 10pt for tables)
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

  // Header row with brand color background
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, yPos, tableWidth, rowHeight, 'F');
  
  // Header text: white on colored background, minimum 10pt
  doc.setFontSize(PDF_FONT_SIZES.tableHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(255, 255, 255);

  let xPos = 17;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });

  yPos += rowHeight;

  // Data rows - use black text on white/light backgrounds
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.text);

  rows.forEach((row, rowIndex) => {
    // Alternate row colors - very light gray for even rows
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

  // Reset text color to black for content that follows
  doc.setTextColor(...PDF_COLORS.text);

  return yPos + 5;
}

// Format currency for Nigerian Naira
// Using "N" instead of ₦ symbol for PDF compatibility with Helvetica font
export function formatNairaPDF(amount: number): string {
  const formatted = amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `N ${formatted}`;
}

// Check if we need a new page
// CRITICAL: Ensures white background and watermark on new pages
export function checkNewPage(doc: jsPDF, yPos: number, requiredSpace: number = 30, includeWatermark: boolean = true): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (yPos + requiredSpace > pageHeight - 25) {
    doc.addPage();
    // CRITICAL: Ensure white background on new page
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Add watermark to new page
    if (includeWatermark) {
      addLogoWatermark(doc, 0.06);
    }
    
    return 20;
  }
  
  return yPos;
}
