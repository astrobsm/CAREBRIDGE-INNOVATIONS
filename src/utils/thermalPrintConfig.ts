/**
 * ============================================================
 * AstroHEALTH Thermal Print Configuration
 * ============================================================
 * 
 * Configuration for thermal receipt printer: XP-T80Q
 * Print width: 80mm
 * 
 * This file defines standards for all thermal print output
 * ensuring consistent formatting across the application.
 * ============================================================
 */

// ============================================================
// SECTION 1: PRINTER CONFIGURATION
// ============================================================

/**
 * Thermal Printer Model: XP-T80Q
 * Paper Width: 80mm (3.15 inches)
 */
export const THERMAL_PRINTER_CONFIG = {
  model: 'XP-T80Q',
  paperWidth: 80, // mm
  paperWidthPixels: 576, // 80mm at 203 DPI (standard thermal printer resolution)
  dpi: 203,
  printableWidth: 72, // mm (with 4mm margins on each side)
  printableWidthChars: 48, // Approximate character count per line at font size 12
} as const;

// ============================================================
// SECTION 2: TYPOGRAPHY
// ============================================================

/**
 * Typography configuration
 * Font: Georgia
 * Size: 12pt
 * Line Spacing: 0.8 (tight for receipt paper)
 */
export const THERMAL_TYPOGRAPHY = {
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: 12, // pt
  fontSizePx: 16, // 12pt ≈ 16px
  lineHeight: 0.8, // Line spacing multiplier
  lineHeightCss: '0.8',
  
  // Header sizes (proportional)
  fontSizeTitle: 16, // pt
  fontSizeTitlePx: 21, // px
  fontSizeHeader: 14, // pt
  fontSizeHeaderPx: 19, // px
  fontSizeSmall: 10, // pt
  fontSizeSmallPx: 13, // px
  
  // Weight
  fontWeightNormal: 400,
  fontWeightBold: 700,
} as const;

// ============================================================
// SECTION 3: LAYOUT CONFIGURATION
// ============================================================

export const THERMAL_LAYOUT = {
  // Margins in mm
  marginTop: 5,
  marginBottom: 10,
  marginLeft: 4,
  marginRight: 4,
  
  // Section spacing in mm
  sectionGap: 3,
  lineGap: 1,
  
  // Divider
  dividerChar: '-',
  doubleDividerChar: '=',
} as const;

// ============================================================
// SECTION 4: PRINT STYLES (CSS)
// ============================================================

/**
 * Generate CSS styles for thermal printing
 * These styles are injected into the print window
 */
export function getThermalPrintStyles(): string {
  return `
    @page {
      size: 80mm auto;
      margin: ${THERMAL_LAYOUT.marginTop}mm ${THERMAL_LAYOUT.marginRight}mm ${THERMAL_LAYOUT.marginBottom}mm ${THERMAL_LAYOUT.marginLeft}mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: ${THERMAL_TYPOGRAPHY.fontFamily};
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
      line-height: ${THERMAL_TYPOGRAPHY.lineHeight};
      color: #000;
      background: #fff;
      width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      max-width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .thermal-print-container {
      width: 100%;
      max-width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      padding: 0;
      margin: 0 auto;
    }
    
    .thermal-header {
      text-align: center;
      padding-bottom: ${THERMAL_LAYOUT.sectionGap}mm;
      border-bottom: 1px dashed #000;
      margin-bottom: ${THERMAL_LAYOUT.sectionGap}mm;
    }
    
    .thermal-header h1 {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeTitle}pt;
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold};
      margin-bottom: 2mm;
      line-height: 1;
    }
    
    .thermal-header h2 {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold};
      margin-bottom: 1mm;
      line-height: 1;
    }
    
    .thermal-header .subtitle {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      color: #333;
    }
    
    .thermal-section {
      margin-bottom: ${THERMAL_LAYOUT.sectionGap}mm;
      padding-bottom: ${THERMAL_LAYOUT.sectionGap}mm;
      border-bottom: 1px dashed #ccc;
    }
    
    .thermal-section:last-child {
      border-bottom: none;
    }
    
    .thermal-section-title {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold};
      margin-bottom: 2mm;
      text-transform: uppercase;
      line-height: 1;
    }
    
    .thermal-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: ${THERMAL_LAYOUT.lineGap}mm;
      line-height: ${THERMAL_TYPOGRAPHY.lineHeight};
    }
    
    .thermal-row-label {
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightNormal};
      flex-shrink: 0;
    }
    
    .thermal-row-value {
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold};
      text-align: right;
      word-break: break-word;
    }
    
    .thermal-row-full {
      margin-bottom: ${THERMAL_LAYOUT.lineGap}mm;
      line-height: ${THERMAL_TYPOGRAPHY.lineHeight};
    }
    
    .thermal-divider {
      text-align: center;
      margin: ${THERMAL_LAYOUT.sectionGap}mm 0;
      color: #000;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      letter-spacing: 0;
    }
    
    .thermal-divider-double {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 1mm 0;
      margin: ${THERMAL_LAYOUT.sectionGap}mm 0;
    }
    
    .thermal-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${THERMAL_LAYOUT.sectionGap}mm;
    }
    
    .thermal-table th,
    .thermal-table td {
      padding: 1mm 0;
      text-align: left;
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
      line-height: ${THERMAL_TYPOGRAPHY.lineHeight};
      border-bottom: 1px dotted #ccc;
    }
    
    .thermal-table th {
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold};
      border-bottom: 1px solid #000;
    }
    
    .thermal-table td:last-child,
    .thermal-table th:last-child {
      text-align: right;
    }
    
    .thermal-total {
      font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold};
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      border-top: 2px solid #000;
      padding-top: 2mm;
      margin-top: 2mm;
    }
    
    .thermal-footer {
      text-align: center;
      padding-top: ${THERMAL_LAYOUT.sectionGap}mm;
      border-top: 1px dashed #000;
      margin-top: ${THERMAL_LAYOUT.sectionGap}mm;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .thermal-footer p {
      margin-bottom: 1mm;
      line-height: ${THERMAL_TYPOGRAPHY.lineHeight};
    }
    
    .thermal-qr {
      text-align: center;
      margin: ${THERMAL_LAYOUT.sectionGap}mm 0;
    }
    
    .thermal-qr img {
      max-width: 40mm;
      height: auto;
    }
    
    .thermal-barcode {
      text-align: center;
      margin: ${THERMAL_LAYOUT.sectionGap}mm 0;
      font-family: 'Libre Barcode 39', monospace;
      font-size: 24pt;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-bold { font-weight: ${THERMAL_TYPOGRAPHY.fontWeightBold}; }
    .text-small { font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt; }
    .text-large { font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt; }
    .text-title { font-size: ${THERMAL_TYPOGRAPHY.fontSizeTitle}pt; }
    
    .mt-1 { margin-top: 1mm; }
    .mt-2 { margin-top: 2mm; }
    .mt-3 { margin-top: 3mm; }
    .mb-1 { margin-bottom: 1mm; }
    .mb-2 { margin-bottom: 2mm; }
    .mb-3 { margin-bottom: 3mm; }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .no-print {
        display: none !important;
      }
    }
  `;
}

// ============================================================
// SECTION 5: UTILITY FUNCTIONS
// ============================================================

/**
 * Generate a horizontal divider string for thermal printing
 */
export function getThermalDivider(char: string = '-', length: number = THERMAL_PRINTER_CONFIG.printableWidthChars): string {
  return char.repeat(length);
}

/**
 * Center text for thermal printing
 */
export function centerText(text: string, width: number = THERMAL_PRINTER_CONFIG.printableWidthChars): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Right-align text for thermal printing
 */
export function rightAlignText(text: string, width: number = THERMAL_PRINTER_CONFIG.printableWidthChars): string {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

/**
 * Create a two-column row (label: value)
 */
export function createThermalRow(label: string, value: string, width: number = THERMAL_PRINTER_CONFIG.printableWidthChars): string {
  const dotsNeeded = width - label.length - value.length - 2;
  const dots = dotsNeeded > 0 ? '.'.repeat(dotsNeeded) : ' ';
  return `${label} ${dots} ${value}`;
}

/**
 * Truncate text to fit thermal print width
 */
export function truncateForThermal(text: string, maxLength: number = THERMAL_PRINTER_CONFIG.printableWidthChars): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Word wrap text for thermal printing
 */
export function wrapTextForThermal(text: string, width: number = THERMAL_PRINTER_CONFIG.printableWidthChars): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > width ? word.substring(0, width) : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Format currency for thermal printing (Nigerian Naira)
 */
export function formatCurrencyForThermal(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for thermal printing
 */
export function formatDateForThermal(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time for thermal printing
 */
export function formatTimeForThermal(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format datetime for thermal printing
 */
export function formatDateTimeForThermal(date: Date | string): string {
  return `${formatDateForThermal(date)} ${formatTimeForThermal(date)}`;
}

export default {
  THERMAL_PRINTER_CONFIG,
  THERMAL_TYPOGRAPHY,
  THERMAL_LAYOUT,
  getThermalPrintStyles,
  getThermalDivider,
  centerText,
  rightAlignText,
  createThermalRow,
  truncateForThermal,
  wrapTextForThermal,
  formatCurrencyForThermal,
  formatDateForThermal,
  formatTimeForThermal,
  formatDateTimeForThermal,
};
