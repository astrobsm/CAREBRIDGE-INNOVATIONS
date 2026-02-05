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
 * PDF STANDARDS (Updated):
 * - White background (#FFFFFF) on ALL pages
 * - Deep Black text (#000000) for ALL content
 * - Georgia font (Times in jsPDF as closest match)
 * - 10pt body text, bold captions
 * - A4 page size with 0.5 inch (12.7mm) margins
 * - 0.5 line spacing (compact)
 * - 2-column layout for content
 * ============================================================
 */

import jsPDF from 'jspdf';
import {
  PDF_COLORS as CONFIG_COLORS,
  PDF_FONTS,
  PDF_FONT_SIZES,
  PDF_MARGINS,
  PDF_LINE_HEIGHT,
  PDF_COLUMN_CONFIG,
  ensureWhiteBackground,
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
// CRITICAL: Uses white background with deep black text per PDF standards
export function addBrandedHeader(
  doc: jsPDF, 
  info: PDFDocumentInfo,
  options?: { includeDate?: boolean; yOffset?: number }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { includeDate = true, yOffset = 0 } = options || {};
  let y = PDF_MARGINS.top + yOffset;

  // CRITICAL: Ensure entire page has white background first
  ensureWhiteBackground(doc);

  // Header - white background with black text (no colored header)
  // Logo placeholder (if needed)
  const logoBase64 = getCachedLogo();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', PDF_MARGINS.left, y - 5, 15, 15);
    } catch {
      addLogoPlaceholder(doc, y - 5);
    }
  } else {
    addLogoPlaceholder(doc, y - 5);
  }

  // App name - deep black text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(PDF_FONT_SIZES.title);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('AstroHEALTH', PDF_MARGINS.left + 18, y + 2);
  
  // Tagline
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Innovations in Healthcare', PDF_MARGINS.left + 18, y + 7);

  // Hospital name on the right
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(info.hospitalName, pageWidth - PDF_MARGINS.right, y, { align: 'right' });
  
  if (info.hospitalPhone) {
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(info.hospitalPhone, pageWidth - PDF_MARGINS.right, y + 5, { align: 'right' });
  }
  
  if (info.hospitalEmail) {
    doc.text(info.hospitalEmail, pageWidth - PDF_MARGINS.right, y + 10, { align: 'right' });
  }

  // Horizontal line separator
  y = y + 15;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGINS.left, y, pageWidth - PDF_MARGINS.right, y);
  
  y = y + 8;

  // Document title - deep black, bold
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(info.title, PDF_MARGINS.left, y);
  
  if (info.subtitle) {
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(info.subtitle, PDF_MARGINS.left, y + 5);
    y += 6;
  }

  // Date generated
  if (includeDate) {
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - PDF_MARGINS.right, y, { align: 'right' });
  }

  // Reset text style
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);

  return y + 8;
}

// Add patient information box
// Uses white background with black border per PDF standards
export function addPatientInfoBox(
  doc: jsPDF,
  yPos: number,
  patient: PDFPatientInfo,
  additionalInfo?: Record<string, string>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - (PDF_MARGINS.left * 2);
  
  // Box background - white with black border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.roundedRect(PDF_MARGINS.left, yPos, boxWidth, 35, 2, 2, 'FD');

  // Title - bold black
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Patient Information', PDF_MARGINS.left + 3, yPos + 6);

  // Patient details - two columns, black text
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setTextColor(0, 0, 0);

  const leftCol = PDF_MARGINS.left + 3;
  const rightCol = pageWidth / 2;
  const lineHeight = PDF_FONT_SIZES.body * PDF_LINE_HEIGHT.tight * 0.3528;
  let lineY = yPos + 12;

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
// CRITICAL: Uses white background for entire page, 0.5" margins
export function createBrandedPDF(
  info: PDFDocumentInfo,
  patientInfo?: PDFPatientInfo,
  options?: { includeWatermark?: boolean }
): { doc: jsPDF; yPos: number } {
  const doc = new jsPDF('p', 'mm', 'a4');
  const { includeWatermark = false } = options || {}; // Default to no watermark for cleaner documents
  
  // CRITICAL: Ensure white background for the entire page
  ensureWhiteBackground(doc);
  
  // Add watermark first if requested (behind content)
  if (includeWatermark) {
    addLogoWatermark(doc, 0.05);
  }
  
  let yPos = addBrandedHeader(doc, info);
  
  if (patientInfo) {
    yPos = addPatientInfoBox(doc, yPos, patientInfo);
  }
  
  // Ensure text is reset to black, 10pt, normal
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  
  return { doc, yPos };
}

// Helper to add a section title
// Uses bold black text on white background
export function addSectionTitle(
  doc: jsPDF,
  yPos: number,
  title: string,
  icon?: 'warning' | 'info' | 'success' | 'danger'
): number {
  // Section header - bold black text
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, PDF_MARGINS.left, yPos + 5);

  // Underline
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  const textWidth = doc.getTextWidth(title);
  doc.line(PDF_MARGINS.left, yPos + 7, PDF_MARGINS.left + textWidth, yPos + 7);

  // Reset to body text style
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);

  return yPos + 12;
}

// Helper to add a simple table
// Uses 10pt font, white background, black text per PDF standards
export function addSimpleTable(
  doc: jsPDF,
  yPos: number,
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - (PDF_MARGINS.left * 2);
  const defaultColWidth = tableWidth / headers.length;
  const colWidths = columnWidths || headers.map(() => defaultColWidth);
  const rowHeight = 6; // Compact row height for 0.5 line spacing

  // Header row - white background, bold black text
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(PDF_MARGINS.left, yPos, tableWidth, rowHeight, 'FD');
  
  // Header text: bold black, 10pt
  doc.setFontSize(PDF_FONT_SIZES.tableHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);

  let xPos = PDF_MARGINS.left + 2;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 4);
    xPos += colWidths[i];
  });

  yPos += rowHeight;

  // Data rows - normal black text on white background
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(0, 0, 0);

  rows.forEach((row, rowIndex) => {
    // Draw row with border (no alternating colors - all white)
    doc.setFillColor(255, 255, 255);
    doc.rect(PDF_MARGINS.left, yPos, tableWidth, rowHeight, 'FD');

    xPos = PDF_MARGINS.left + 2;
    row.forEach((cell, i) => {
      // Truncate text if too long
      const maxWidth = colWidths[i] - 4;
      let displayText = cell;
      while (doc.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
        displayText = displayText.slice(0, -4) + '...';
      }
      doc.text(displayText, xPos, yPos + 4);
      xPos += colWidths[i];
    });

    yPos += rowHeight;
  });

  // Reset text style
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);

  return yPos + 3;
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

/**
 * Convert a number to words (Nigerian Naira format)
 * Handles amounts up to 999 trillion with Kobo (cents)
 * Example: 15750.50 => "Fifteen Thousand, Seven Hundred and Fifty Naira, Fifty Kobo Only"
 */
export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  if (amount === 0) return 'Zero Naira Only';
  if (amount < 0) return 'Negative ' + numberToWords(Math.abs(amount));

  // Handle decimal places (Kobo)
  const parts = amount.toFixed(2).split('.');
  const nairaAmount = parseInt(parts[0], 10);
  const koboAmount = parseInt(parts[1], 10);

  // Convert number under 1000 to words
  const convertHundreds = (num: number): string => {
    if (num === 0) return '';
    
    let result = '';
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred';
      num %= 100;
      if (num > 0) result += ' and ';
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)];
      num %= 10;
      if (num > 0) result += '-' + ones[num];
    } else if (num > 0) {
      result += ones[num];
    }
    
    return result;
  };

  // Convert the main Naira amount
  const convertToWords = (num: number): string => {
    if (num === 0) return '';
    
    let result = '';
    let scaleIndex = 0;
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk > 0) {
        const chunkWords = convertHundreds(chunk);
        if (result) {
          result = chunkWords + ' ' + scales[scaleIndex] + ', ' + result;
        } else {
          result = chunkWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '');
        }
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }
    
    return result;
  };

  let result = '';
  
  // Naira part
  if (nairaAmount > 0) {
    result = convertToWords(nairaAmount) + ' Naira';
  }
  
  // Kobo part
  if (koboAmount > 0) {
    if (result) {
      result += ', ';
    }
    result += convertHundreds(koboAmount) + ' Kobo';
  } else if (nairaAmount === 0) {
    return 'Zero Naira Only';
  }
  
  return result + ' Only';
}

/**
 * Format amount in words for invoice display
 * Returns a properly formatted string for PDF display
 */
export function formatAmountInWords(amount: number): string {
  return numberToWords(amount);
}

// Check if we need a new page
// CRITICAL: Ensures white background on new pages
export function checkNewPage(doc: jsPDF, yPos: number, requiredSpace: number = 25, includeWatermark: boolean = false): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (yPos + requiredSpace > pageHeight - PDF_MARGINS.bottom) {
    doc.addPage();
    // CRITICAL: Ensure white background on new page
    ensureWhiteBackground(doc);
    
    // Add watermark to new page if requested
    if (includeWatermark) {
      addLogoWatermark(doc, 0.05);
    }
    
    return PDF_MARGINS.top;
  }
  
  return yPos;
}
