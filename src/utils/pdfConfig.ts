/**
 * ============================================================
 * AstroHEALTH PDF Configuration - Global Standards
 * ============================================================
 * 
 * This file defines mandatory standards for ALL PDF generation
 * across the AstroHEALTH application. These rules ensure:
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
 * Margin configuration - 0.5 inches (12.7mm) on all sides
 * Standard A4 professional document margins
 */
export const PDF_MARGINS = {
  top: 12.7,      // 0.5 inches
  right: 12.7,    // 0.5 inches
  bottom: 15,     // Slightly more for footer
  left: 12.7,     // 0.5 inches
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
 * 
 * NOTE: Times Roman (times) is used as primary font for better readability
 * and closer appearance to Georgia font which is not available in jsPDF.
 */
export const PDF_FONTS = {
  primary: 'times',     // Times Roman - closest to Georgia in jsPDF
  fallback: 'helvetica',
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
 * Standard: 10pt body text for compact professional documents
 */
export const PDF_FONT_SIZES = {
  // Headers
  title: 14,           // Document title
  sectionHeader: 12,   // Section titles (BOLD)
  subsectionHeader: 11,// Subsection titles (BOLD)
  
  // Body text - 10pt standard
  body: 10,
  bodyLarge: 11,
  
  // Tables - 10pt
  tableHeader: 10,
  tableBody: 10,
  
  // Supporting text
  label: 10,
  caption: 10,         // Captions same size, BOLD
  footnote: 9,
  
  // Special
  badge: 8,
  watermark: 8,
} as const;

/**
 * Line height multipliers for compact spacing
 * Using 0.5 line spacing (1.0 = single, 0.5 = half)
 * In practice, multiplier of 1.0-1.2 gives compact readable text
 */
export const PDF_LINE_HEIGHT = {
  tight: 1.0,      // 0.5 line spacing equivalent
  normal: 1.15,    // Compact but readable
  relaxed: 1.3,    // For special cases
} as const;

// ============================================================
// SECTION 2.5: TWO-COLUMN LAYOUT CONFIGURATION
// ============================================================

/**
 * Two-column layout configuration for A4 documents
 * Standard professional medical document format
 */
export const PDF_COLUMN_CONFIG = {
  enabled: true,
  count: 2,
  gutter: 6,       // 6mm gap between columns
  getColumnWidth: (pageWidth: number = PDF_PAGE_SIZES.A4.width): number => {
    const contentWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;
    return (contentWidth - 6) / 2; // (content - gutter) / 2 columns
  },
  getColumnX: (column: 0 | 1, pageWidth: number = PDF_PAGE_SIZES.A4.width): number => {
    const colWidth = PDF_COLUMN_CONFIG.getColumnWidth(pageWidth);
    if (column === 0) return PDF_MARGINS.left;
    return PDF_MARGINS.left + colWidth + 6; // First column + gutter
  },
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
  primary: [81, 112, 255] as const,      // #5170FF - AstroHEALTH blue
  primaryDark: [24, 0, 172] as const,    // #1800AC - AstroHEALTH purple
  
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
  creator: 'AstroHEALTH Innovations in Healthcare',
  producer: 'AstroHEALTH PDF Generator v2.0',
  keywords: 'healthcare, medical, clinical, astrohealth',
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
    title: 'AstroHEALTH Document',
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
 * Using "N" instead of ₦ symbol for PDF compatibility with Helvetica font
 */
export function formatNaira(amount: number): string {
  return `N ${amount.toLocaleString('en-US', { 
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
// SECTION 6.5: TWO-COLUMN LAYOUT HELPERS
// ============================================================

/**
 * Two-column document state tracker
 */
export interface TwoColumnState {
  currentColumn: 0 | 1;
  columnYPositions: [number, number];
  columnWidth: number;
}

/**
 * Initialize two-column layout state
 */
export function initTwoColumnLayout(doc: jsPDF): TwoColumnState {
  const pageWidth = doc.internal.pageSize.getWidth();
  const columnWidth = PDF_COLUMN_CONFIG.getColumnWidth(pageWidth);
  
  return {
    currentColumn: 0,
    columnYPositions: [PDF_MARGINS.top, PDF_MARGINS.top],
    columnWidth,
  };
}

/**
 * Get the X position for current column
 */
export function getColumnX(state: TwoColumnState, doc: jsPDF): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  return PDF_COLUMN_CONFIG.getColumnX(state.currentColumn, pageWidth);
}

/**
 * Add text to current column with automatic column switching
 * Returns updated state
 */
export function addTextToColumn(
  doc: jsPDF,
  state: TwoColumnState,
  text: string,
  options?: {
    isBold?: boolean;
    isCaption?: boolean;
    fontSize?: number;
  }
): TwoColumnState {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxY = pageHeight - PDF_MARGINS.bottom;
  
  // Set font style
  if (options?.isCaption || options?.isBold) {
    doc.setFont(PDF_FONTS.primary, PDF_FONT_STYLES.bold);
  } else {
    doc.setFont(PDF_FONTS.primary, PDF_FONT_STYLES.normal);
  }
  
  const fontSize = options?.fontSize || PDF_FONT_SIZES.body;
  doc.setFontSize(fontSize);
  doc.setTextColor(...PDF_COLORS.text);
  
  const lineHeight = fontSize * PDF_LINE_HEIGHT.normal * 0.3528;
  const x = PDF_COLUMN_CONFIG.getColumnX(state.currentColumn, pageWidth);
  const lines = doc.splitTextToSize(text, state.columnWidth);
  const requiredHeight = lines.length * lineHeight;
  
  let currentY = state.columnYPositions[state.currentColumn];
  
  // Check if we need to switch columns or add new page
  if (currentY + requiredHeight > maxY) {
    if (state.currentColumn === 0) {
      // Switch to second column
      state.currentColumn = 1;
      currentY = state.columnYPositions[1];
    } else {
      // Add new page and reset to first column
      doc.addPage();
      ensureWhiteBackground(doc);
      state.currentColumn = 0;
      state.columnYPositions = [PDF_MARGINS.top, PDF_MARGINS.top];
      currentY = PDF_MARGINS.top;
    }
  }
  
  // Draw the text
  const newX = PDF_COLUMN_CONFIG.getColumnX(state.currentColumn, pageWidth);
  doc.text(lines, newX, currentY);
  
  // Update Y position
  state.columnYPositions[state.currentColumn] = currentY + requiredHeight + 2;
  
  // Reset to normal style
  resetTextStyle(doc);
  
  return state;
}

/**
 * Add a section header spanning both columns (full width)
 */
export function addFullWidthHeader(
  doc: jsPDF,
  state: TwoColumnState,
  text: string
): TwoColumnState {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - PDF_MARGINS.bottom;
  
  // Get the maximum Y from both columns
  const currentY = Math.max(state.columnYPositions[0], state.columnYPositions[1]);
  
  // Check if we need a new page
  if (currentY + 15 > maxY) {
    doc.addPage();
    ensureWhiteBackground(doc);
    state.columnYPositions = [PDF_MARGINS.top, PDF_MARGINS.top];
  }
  
  const y = Math.max(state.columnYPositions[0], state.columnYPositions[1]) + 3;
  
  // Draw section header
  doc.setFont(PDF_FONTS.primary, PDF_FONT_STYLES.bold);
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setTextColor(...PDF_COLORS.text);
  
  const contentWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;
  doc.text(text, PDF_MARGINS.left, y);
  
  // Draw underline
  doc.setDrawColor(...PDF_COLORS.gray[400]);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGINS.left, y + 2, PDF_MARGINS.left + contentWidth, y + 2);
  
  // Reset both column positions below the header
  const newY = y + 6;
  state.columnYPositions = [newY, newY];
  state.currentColumn = 0;
  
  resetTextStyle(doc);
  
  return state;
}

/**
 * Add caption (bold text) to column
 */
export function addCaptionToColumn(
  doc: jsPDF,
  state: TwoColumnState,
  caption: string
): TwoColumnState {
  return addTextToColumn(doc, state, caption, { isCaption: true, isBold: true });
}

/**
 * Add a key-value pair in current column
 */
export function addKeyValueToColumn(
  doc: jsPDF,
  state: TwoColumnState,
  label: string,
  value: string
): TwoColumnState {
  const text = `${label}: ${value}`;
  return addTextToColumn(doc, state, text);
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
// SECTION 8: TEXT SANITIZATION FOR PDF COMPATIBILITY
// ============================================================

/**
 * Sanitize text for PDF rendering
 * 
 * Replaces Unicode characters that don't render properly with jsPDF's
 * built-in fonts (Helvetica, Times, Courier). These fonts don't support
 * extended Unicode characters like superscripts, subscripts, and special
 * math symbols.
 * 
 * @param text - The text to sanitize
 * @returns Text with Unicode characters replaced with ASCII equivalents
 */
export function sanitizeTextForPDF(text: string): string {
  if (!text) return '';
  
  return text
    // Superscript/subscript numbers
    .replace(/⁰/g, '0')
    .replace(/¹/g, '1')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/⁴/g, '4')
    .replace(/⁵/g, '5')
    .replace(/⁶/g, '6')
    .replace(/⁷/g, '7')
    .replace(/⁸/g, '8')
    .replace(/⁹/g, '9')
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/₆/g, '6')
    .replace(/₇/g, '7')
    .replace(/₈/g, '8')
    .replace(/₉/g, '9')
    // Superscript/subscript signs
    .replace(/⁺/g, '+')
    .replace(/⁻/g, '-')
    .replace(/₊/g, '+')
    .replace(/₋/g, '-')
    // Math symbols
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/±/g, '+/-')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    // Greek letters commonly used in medicine
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/γ/g, 'gamma')
    .replace(/δ/g, 'delta')
    .replace(/μ/g, 'u')
    // Special quotes and punctuation
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/•/g, '*')
    // Degree symbol (common in temperature)
    .replace(/°/g, ' deg ')
    // Other special characters
    .replace(/™/g, '(TM)')
    .replace(/®/g, '(R)')
    .replace(/©/g, '(C)')
    // Remove any remaining non-printable characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

// ============================================================
// SECTION 9: EXPORTS
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
  COLUMN_CONFIG: PDF_COLUMN_CONFIG,
  
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
  sanitizeTextForPDF,
  
  // Two-column layout functions
  initTwoColumnLayout,
  getColumnX,
  addTextToColumn,
  addFullWidthHeader,
  addCaptionToColumn,
  addKeyValueToColumn,
};
