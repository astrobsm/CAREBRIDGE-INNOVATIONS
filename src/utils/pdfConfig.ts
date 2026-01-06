/**
 * ============================================================
 * CareBridge PDF Configuration - Global Standards
 * ============================================================
 * 
 * This file defines mandatory standards for ALL PDF generation
 * across the CareBridge application. These rules ensure:
 * 
 * 1. Maximum cross-platform compatibility
 * 2. Professional, medical-grade document quality
 * 3. Legal compliance for healthcare documentation
 * 4. Consistent branding and appearance
 * 
 * MANDATORY: All PDF generators MUST import and use these settings
 * ============================================================
 */

import jsPDF from 'jspdf';

// ============================================================
// SECTION 1: PAGE CONFIGURATION
// ============================================================

/**
 * Supported page sizes - ONLY use these standard sizes
 * All sizes are in millimeters
 */
export const PDF_PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 216, height: 279 },
} as const;

/**
 * Default page configuration
 * - A4 is preferred for international/Nigerian medical documents
 * - Portrait orientation is default for readability
 */
export const PDF_PAGE_CONFIG = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
};

/**
 * Margin configuration - minimum 20mm on all sides
 * This ensures proper printing on all devices and prevents text cutoff
 */
export const PDF_MARGINS = {
  top: 20,
  right: 20,
  bottom: 25, // Extra space for footer
  left: 20,
} as const;

/**
 * Calculate content width based on page and margins
 */
export function getContentWidth(pageWidth: number = PDF_PAGE_SIZES.A4.width): number {
  return pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;
}

/**
 * Calculate content height based on page and margins
 */
export function getContentHeight(pageHeight: number = PDF_PAGE_SIZES.A4.height): number {
  return pageHeight - PDF_MARGINS.top - PDF_MARGINS.bottom;
}

// ============================================================
// SECTION 2: TYPOGRAPHY - SAFE FONTS ONLY
// ============================================================

/**
 * CRITICAL: Font configuration
 * 
 * ALLOWED FONTS ONLY:
 * - Helvetica (primary - embedded in jsPDF)
 * - Times (fallback - embedded in jsPDF)
 * - Courier (monospace - embedded in jsPDF)
 * 
 * FORBIDDEN:
 * - Thin, Light, Condensed, Variable fonts
 * - Decorative or handwritten fonts
 * - System-dependent fonts not embedded in PDF
 */
export const PDF_FONTS = {
  primary: 'helvetica',
  fallback: 'times',
  monospace: 'courier',
} as const;

/**
 * Font styles - ONLY these are permitted
 * jsPDF embeds these in the PDF for guaranteed rendering
 */
export const PDF_FONT_STYLES = {
  normal: 'normal',
  bold: 'bold',
  italic: 'italic',
  bolditalic: 'bolditalic',
} as const;

/**
 * Font sizes in POINTS (pt)
 * All sizes are chosen for optimal readability and accessibility
 */
export const PDF_FONT_SIZES = {
  // Headers
  title: 18,           // Document title
  sectionHeader: 14,   // Section titles
  subsectionHeader: 12,// Subsection titles
  
  // Body text - minimum 11pt for accessibility
  body: 11,
  bodyLarge: 12,
  
  // Tables - minimum 10pt
  tableHeader: 10,
  tableBody: 10,
  
  // Supporting text
  label: 10,
  caption: 9,
  footnote: 9,         // Minimum allowed
  
  // Special
  badge: 8,
  watermark: 8,
} as const;

/**
 * Line height multipliers for proper spacing
 * Range: 1.4 - 1.6 for optimal readability
 */
export const PDF_LINE_HEIGHT = {
  tight: 1.4,
  normal: 1.5,
  relaxed: 1.6,
} as const;

// ============================================================
// SECTION 3: COLORS - RGB ONLY, WHITE BACKGROUND
// ============================================================

/**
 * CRITICAL: Color configuration
 * 
 * MANDATORY RULES:
 * - Background MUST be white (#FFFFFF) - ALWAYS
 * - Body text MUST be black (#000000) - ALWAYS
 * - All colors in RGB format only
 * - NO transparency, NO overlays, NO dark modes
 */
export const PDF_COLORS = {
  // MANDATORY: Background and text
  background: [255, 255, 255] as const,  // #FFFFFF - White background
  text: [0, 0, 0] as const,              // #000000 - Black body text
  
  // Brand colors (for headers, accents)
  primary: [81, 112, 255] as const,      // #5170FF - CareBridge blue
  primaryDark: [24, 0, 172] as const,    // #1800AC - CareBridge purple
  
  // Semantic colors
  success: [34, 197, 94] as const,       // #22C55E - Green
  danger: [220, 38, 38] as const,        // #DC2626 - Red
  warning: [234, 179, 8] as const,       // #EAB308 - Yellow/Amber
  info: [59, 130, 246] as const,         // #3B82F6 - Blue
  
  // Grayscale for structure (all visible on white)
  gray: {
    50: [249, 250, 251] as const,        // Very light bg
    100: [243, 244, 246] as const,       // Light bg
    200: [229, 231, 235] as const,       // Border light
    300: [209, 213, 219] as const,       // Border
    400: [156, 163, 175] as const,       // Muted text
    500: [107, 114, 128] as const,       // Secondary text
    600: [75, 85, 99] as const,          // Labels
    700: [55, 65, 81] as const,          // Headers
    800: [31, 41, 55] as const,          // Dark text
    900: [17, 24, 39] as const,          // Near black
  },
} as const;

// Type aliases for convenience
export type PDFColor = readonly [number, number, number];

// ============================================================
// SECTION 4: TABLE CONFIGURATION
// ============================================================

export const PDF_TABLE_CONFIG = {
  headerHeight: 10,
  rowHeight: 8,
  cellPadding: 3,
  minColumnWidth: 15,
  borderWidth: 0.3,
  alternateRowColor: PDF_COLORS.gray[50],
  headerColor: PDF_COLORS.primary,
  headerTextColor: [255, 255, 255] as const,
} as const;

// ============================================================
// SECTION 5: DOCUMENT METADATA
// ============================================================

export const PDF_METADATA = {
  creator: 'CareBridge Innovations in Healthcare',
  producer: 'CareBridge PDF Generator v2.0',
  keywords: 'healthcare, medical, clinical, carebridge',
} as const;

// ============================================================
// SECTION 6: HELPER FUNCTIONS
// ============================================================

/**
 * Create a new PDF document with standardized settings
 * All PDFs MUST be created using this function
 */
export function createStandardPDF(options?: {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
}): jsPDF {
  const orientation = options?.orientation || 'portrait';
  const format = options?.format || 'a4';
  
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  // Set document properties
  doc.setProperties({
    title: 'CareBridge Document',
    subject: 'Healthcare Document',
    author: PDF_METADATA.creator,
    creator: PDF_METADATA.producer,
    keywords: PDF_METADATA.keywords,
  });
  
  // Initialize with safe defaults
  doc.setFont(PDF_FONTS.primary, PDF_FONT_STYLES.normal);
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setTextColor(...PDF_COLORS.text);
  
  // Ensure white background (critical for all pages)
  ensureWhiteBackground(doc);
  
  return doc;
}

/**
 * CRITICAL: Ensure white background on current page
 * Call this at start of each page and after addPage()
 */
export function ensureWhiteBackground(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Fill entire page with white
  doc.setFillColor(...PDF_COLORS.background);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
}

/**
 * Reset text to standard black body text
 * Call this after using colored text
 */
export function resetTextStyle(doc: jsPDF): void {
  doc.setFont(PDF_FONTS.primary, PDF_FONT_STYLES.normal);
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setTextColor(...PDF_COLORS.text);
}

/**
 * Set heading text style
 */
export function setHeadingStyle(
  doc: jsPDF, 
  level: 'title' | 'section' | 'subsection'
): void {
  doc.setFont(PDF_FONTS.primary, PDF_FONT_STYLES.bold);
  doc.setTextColor(...PDF_COLORS.text);
  
  switch (level) {
    case 'title':
      doc.setFontSize(PDF_FONT_SIZES.title);
      break;
    case 'section':
      doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
      break;
    case 'subsection':
      doc.setFontSize(PDF_FONT_SIZES.subsectionHeader);
      break;
  }
}

/**
 * Calculate if content fits on current page, add new page if needed
 * Returns the Y position to use (either current or top of new page)
 */
export function checkPageBreak(
  doc: jsPDF,
  currentY: number,
  requiredSpace: number,
  onNewPage?: () => number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const safeBottomMargin = PDF_MARGINS.bottom + 5;
  
  if (currentY + requiredSpace > pageHeight - safeBottomMargin) {
    doc.addPage();
    ensureWhiteBackground(doc);
    
    if (onNewPage) {
      return onNewPage();
    }
    
    return PDF_MARGINS.top;
  }
  
  return currentY;
}

/**
 * Add wrapped text with proper line height
 * Returns the new Y position after text
 */
export function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeightMultiplier: number = PDF_LINE_HEIGHT.normal
): number {
  const fontSize = doc.getFontSize();
  const lineHeight = fontSize * lineHeightMultiplier * 0.3528; // Convert pt to mm
  
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  
  return y + (lines.length * lineHeight);
}

/**
 * Format currency in Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Safely truncate text to fit within a width
 */
export function truncateText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  suffix: string = '...'
): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }
  
  let truncated = text;
  while (doc.getTextWidth(truncated + suffix) > maxWidth && truncated.length > 1) {
    truncated = truncated.slice(0, -1);
  }
  
  return truncated + suffix;
}

// ============================================================
// SECTION 7: VALIDATION
// ============================================================

/**
 * Validate that a PDF document follows standards
 * Use during development/testing
 */
export function validatePDFStandards(doc: jsPDF): string[] {
  const warnings: string[] = [];
  
  // Check font
  const currentFont = doc.getFont();
  if (!['helvetica', 'times', 'courier'].includes(currentFont.fontName.toLowerCase())) {
    warnings.push(`Non-standard font detected: ${currentFont.fontName}`);
  }
  
  // Check font size
  const fontSize = doc.getFontSize();
  if (fontSize < 9) {
    warnings.push(`Font size ${fontSize}pt is below minimum (9pt)`);
  }
  
  return warnings;
}

// ============================================================
// SECTION 8: EXPORTS
// ============================================================

export default {
  PAGE_SIZES: PDF_PAGE_SIZES,
  PAGE_CONFIG: PDF_PAGE_CONFIG,
  MARGINS: PDF_MARGINS,
  FONTS: PDF_FONTS,
  FONT_STYLES: PDF_FONT_STYLES,
  FONT_SIZES: PDF_FONT_SIZES,
  LINE_HEIGHT: PDF_LINE_HEIGHT,
  COLORS: PDF_COLORS,
  TABLE: PDF_TABLE_CONFIG,
  METADATA: PDF_METADATA,
  
  // Functions
  createStandardPDF,
  ensureWhiteBackground,
  resetTextStyle,
  setHeadingStyle,
  checkPageBreak,
  addWrappedText,
  formatNaira,
  truncateText,
  validatePDFStandards,
  getContentWidth,
  getContentHeight,
};
