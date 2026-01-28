/**
 * Thermal Print Service
 * Optimized for XP-T80Q printer with 80mm print width
 * Font: Georgia, Size: 12pt, Line Spacing: 0.8
 */

export interface ThermalPrintConfig {
  printerModel: string;
  printWidth: number; // in mm
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  paperWidth: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PrintableDocument {
  title: string;
  subtitle?: string;
  content: PrintSection[];
  footer?: string;
  hospitalLogo?: string;
  hospitalName?: string;
  printDate?: boolean;
}

export interface PrintSection {
  type: 'header' | 'text' | 'table' | 'divider' | 'signature' | 'qrcode' | 'barcode';
  data: any;
  style?: PrintStyle;
}

export interface PrintStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
}

export interface TableData {
  headers?: string[];
  rows: (string | number)[][];
  columnWidths?: number[];
}

// Default configuration for XP-T80Q printer
export const DEFAULT_THERMAL_CONFIG: ThermalPrintConfig = {
  printerModel: 'XP-T80Q',
  printWidth: 80, // mm
  fontFamily: 'Georgia, serif',
  fontSize: 12,
  lineSpacing: 0.8,
  paperWidth: 80, // mm
  margins: {
    top: 5,
    right: 3,
    bottom: 5,
    left: 3,
  },
};

// Characters per line for 80mm paper at 12pt Georgia
const CHARS_PER_LINE = 42;

/**
 * Format text to fit within thermal paper width
 */
function wrapText(text: string, maxWidth: number = CHARS_PER_LINE): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Center text within a given width
 */
function centerText(text: string, width: number = CHARS_PER_LINE): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Right-align text within a given width
 */
function rightAlignText(text: string, width: number = CHARS_PER_LINE): string {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

/**
 * Create a divider line
 */
function createDivider(char: string = '-', width: number = CHARS_PER_LINE): string {
  return char.repeat(width);
}

/**
 * Format a table for thermal printing
 */
function formatTable(table: TableData): string[] {
  const lines: string[] = [];
  const columnCount = table.rows[0]?.length || 0;
  
  // Calculate column widths
  let columnWidths = table.columnWidths;
  if (!columnWidths) {
    const availableWidth = CHARS_PER_LINE - (columnCount - 1); // Account for separators
    const defaultWidth = Math.floor(availableWidth / columnCount);
    columnWidths = new Array(columnCount).fill(defaultWidth);
  }

  // Add headers
  if (table.headers) {
    const headerLine = table.headers
      .map((h, i) => h.substring(0, columnWidths![i]).padEnd(columnWidths![i]))
      .join(' ');
    lines.push(headerLine);
    lines.push(createDivider('-'));
  }

  // Add rows
  for (const row of table.rows) {
    const rowLine = row
      .map((cell, i) => String(cell).substring(0, columnWidths![i]).padEnd(columnWidths![i]))
      .join(' ');
    lines.push(rowLine);
  }

  return lines;
}

/**
 * Generate thermal-optimized HTML for printing
 */
export function generateThermalPrintHTML(
  document: PrintableDocument,
  config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG
): string {
  const { fontFamily, fontSize, lineSpacing, margins, printWidth } = config;
  
  // Convert mm to pixels (assuming 96 DPI: 1mm ≈ 3.78px)
  const widthPx = Math.round(printWidth * 3.78);
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${document.title}</title>
  <style>
    @page {
      size: ${printWidth}mm auto;
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: ${fontFamily};
      font-size: ${fontSize}pt;
      line-height: ${lineSpacing};
      width: ${widthPx}px;
      max-width: ${widthPx}px;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .print-container {
      width: 100%;
      padding: 2mm;
    }
    
    .header {
      text-align: center;
      margin-bottom: 3mm;
      border-bottom: 1px dashed #000;
      padding-bottom: 2mm;
    }
    
    .header-logo {
      max-width: 30mm;
      max-height: 15mm;
      margin-bottom: 1mm;
    }
    
    .header-title {
      font-size: ${fontSize + 2}pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    
    .header-subtitle {
      font-size: ${fontSize - 1}pt;
    }
    
    .section {
      margin: 2mm 0;
    }
    
    .section-header {
      font-weight: bold;
      border-bottom: 1px solid #000;
      margin-bottom: 1mm;
      padding-bottom: 0.5mm;
    }
    
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-bold { font-weight: bold; }
    .text-italic { font-style: italic; }
    .text-underline { text-decoration: underline; }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 2mm 0;
    }
    
    .divider-solid {
      border-top: 1px solid #000;
      margin: 2mm 0;
    }
    
    .divider-double {
      border-top: 3px double #000;
      margin: 2mm 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${fontSize - 1}pt;
    }
    
    th, td {
      padding: 0.5mm 1mm;
      text-align: left;
      border-bottom: 1px dotted #ccc;
    }
    
    th {
      font-weight: bold;
      border-bottom: 1px solid #000;
    }
    
    .key-value {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
    }
    
    .key-value .key {
      font-weight: bold;
    }
    
    .signature-section {
      margin-top: 5mm;
      padding-top: 2mm;
      border-top: 1px dashed #000;
    }
    
    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 10mm;
    }
    
    .signature-box {
      width: 45%;
      text-align: center;
    }
    
    .signature-box .line {
      border-top: 1px solid #000;
      margin-bottom: 1mm;
    }
    
    .signature-box .label {
      font-size: ${fontSize - 2}pt;
    }
    
    .footer {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 1px dashed #000;
      text-align: center;
      font-size: ${fontSize - 2}pt;
    }
    
    .print-date {
      font-size: ${fontSize - 2}pt;
      color: #666;
      margin-top: 1mm;
    }
    
    .barcode, .qrcode {
      text-align: center;
      margin: 2mm 0;
    }
    
    .total-line {
      font-weight: bold;
      font-size: ${fontSize + 1}pt;
      border-top: 2px solid #000;
      padding-top: 1mm;
      margin-top: 1mm;
    }
    
    @media print {
      body {
        width: ${widthPx}px !important;
        max-width: ${widthPx}px !important;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    @media screen {
      body {
        background: #f0f0f0;
        padding: 10mm;
      }
      
      .print-container {
        background: #fff;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
`;

  // Header
  html += `<div class="header">`;
  if (document.hospitalLogo) {
    html += `<img src="${document.hospitalLogo}" alt="Logo" class="header-logo" />`;
  }
  if (document.hospitalName) {
    html += `<div class="header-subtitle">${document.hospitalName}</div>`;
  }
  html += `<div class="header-title">${document.title}</div>`;
  if (document.subtitle) {
    html += `<div class="header-subtitle">${document.subtitle}</div>`;
  }
  html += `</div>`;

  // Content sections
  for (const section of document.content) {
    html += renderSection(section, config);
  }

  // Footer
  if (document.footer || document.printDate) {
    html += `<div class="footer">`;
    if (document.footer) {
      html += `<div>${document.footer}</div>`;
    }
    if (document.printDate !== false) {
      html += `<div class="print-date">Printed: ${new Date().toLocaleString()}</div>`;
    }
    html += `</div>`;
  }

  html += `
  </div>
</body>
</html>`;

  return html;
}

/**
 * Render a single section
 */
function renderSection(section: PrintSection, config: ThermalPrintConfig): string {
  const style = section.style || {};
  const classes = [
    'section',
    style.align ? `text-${style.align}` : '',
    style.bold ? 'text-bold' : '',
    style.italic ? 'text-italic' : '',
    style.underline ? 'text-underline' : '',
  ].filter(Boolean).join(' ');

  switch (section.type) {
    case 'header':
      return `<div class="section-header ${style.align ? `text-${style.align}` : ''}">${section.data}</div>`;

    case 'text':
      if (typeof section.data === 'object' && section.data.key && section.data.value !== undefined) {
        return `<div class="key-value"><span class="key">${section.data.key}:</span><span>${section.data.value}</span></div>`;
      }
      return `<div class="${classes}">${section.data}</div>`;

    case 'table':
      return renderTable(section.data as TableData);

    case 'divider':
      const dividerType = section.data === 'solid' ? 'divider-solid' : 
                          section.data === 'double' ? 'divider-double' : 'divider';
      return `<div class="${dividerType}"></div>`;

    case 'signature':
      return renderSignatureSection(section.data);

    case 'qrcode':
      // QR code would require a library - placeholder for now
      return `<div class="qrcode">[QR: ${section.data}]</div>`;

    case 'barcode':
      // Barcode would require a library - placeholder for now  
      return `<div class="barcode">[Barcode: ${section.data}]</div>`;

    default:
      return `<div class="${classes}">${section.data}</div>`;
  }
}

/**
 * Render a table
 */
function renderTable(table: TableData): string {
  let html = '<table>';
  
  if (table.headers) {
    html += '<thead><tr>';
    for (const header of table.headers) {
      html += `<th>${header}</th>`;
    }
    html += '</tr></thead>';
  }
  
  html += '<tbody>';
  for (const row of table.rows) {
    html += '<tr>';
    for (const cell of row) {
      html += `<td>${cell}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  
  return html;
}

/**
 * Render signature section
 */
function renderSignatureSection(data: { signatures: { label: string; name?: string }[] }): string {
  let html = '<div class="signature-section"><div class="signature-line">';
  
  for (const sig of data.signatures) {
    html += `
      <div class="signature-box">
        <div class="line"></div>
        <div class="label">${sig.label}</div>
        ${sig.name ? `<div class="name">${sig.name}</div>` : ''}
      </div>
    `;
  }
  
  html += '</div></div>';
  return html;
}

/**
 * Open print dialog with thermal-optimized content
 */
export function printThermalDocument(
  document: PrintableDocument,
  config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG
): void {
  const html = generateThermalPrintHTML(document, config);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    console.error('Failed to open print window. Check popup blocker.');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
}

/**
 * Download as HTML file (for thermal printer software)
 */
export function downloadThermalHTML(
  document: PrintableDocument,
  filename: string = 'thermal-receipt.html',
  config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG
): void {
  const html = generateThermalPrintHTML(document, config);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Print content directly using browser print API
 */
export function printDirectly(
  document: PrintableDocument,
  config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const html = generateThermalPrintHTML(document, config);
      
      // Create iframe for printing
      const iframe = window.document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      
      window.document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        reject(new Error('Failed to access iframe document'));
        return;
      }
      
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Cleanup after print dialog closes
          setTimeout(() => {
            window.document.body.removeChild(iframe);
            resolve();
          }, 1000);
        }, 250);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a simple receipt-style document
 */
export function createReceiptDocument(
  title: string,
  items: { label: string; value: string | number }[],
  total?: { label: string; value: string | number },
  options?: {
    hospitalName?: string;
    hospitalLogo?: string;
    footer?: string;
    subtitle?: string;
  }
): PrintableDocument {
  const content: PrintSection[] = [];
  
  // Add items
  for (const item of items) {
    content.push({
      type: 'text',
      data: { key: item.label, value: item.value },
    });
  }
  
  // Add total if provided
  if (total) {
    content.push({ type: 'divider', data: 'solid' });
    content.push({
      type: 'text',
      data: { key: total.label, value: total.value },
      style: { bold: true },
    });
  }
  
  return {
    title,
    subtitle: options?.subtitle,
    hospitalName: options?.hospitalName,
    hospitalLogo: options?.hospitalLogo,
    content,
    footer: options?.footer,
    printDate: true,
  };
}

/**
 * Create a clinical document for thermal printing
 */
export function createClinicalDocument(
  title: string,
  patientInfo: {
    name: string;
    hospitalNumber?: string;
    age?: number | string;
    gender?: string;
    ward?: string;
    bed?: string;
  },
  sections: { header: string; content: string | { label: string; value: string }[] }[],
  options?: {
    hospitalName?: string;
    hospitalLogo?: string;
    clinicianName?: string;
    clinicianRole?: string;
    footer?: string;
  }
): PrintableDocument {
  const content: PrintSection[] = [];
  
  // Patient info section
  content.push({ type: 'header', data: 'Patient Information' });
  content.push({ type: 'text', data: { key: 'Name', value: patientInfo.name } });
  if (patientInfo.hospitalNumber) {
    content.push({ type: 'text', data: { key: 'Hospital No', value: patientInfo.hospitalNumber } });
  }
  if (patientInfo.age || patientInfo.gender) {
    const ageGender = [patientInfo.age, patientInfo.gender].filter(Boolean).join(' / ');
    content.push({ type: 'text', data: { key: 'Age/Gender', value: ageGender } });
  }
  if (patientInfo.ward || patientInfo.bed) {
    const location = [patientInfo.ward, patientInfo.bed ? `Bed ${patientInfo.bed}` : null].filter(Boolean).join(', ');
    content.push({ type: 'text', data: { key: 'Location', value: location } });
  }
  
  content.push({ type: 'divider', data: 'dashed' });
  
  // Content sections
  for (const section of sections) {
    content.push({ type: 'header', data: section.header });
    
    if (typeof section.content === 'string') {
      content.push({ type: 'text', data: section.content });
    } else {
      for (const item of section.content) {
        content.push({ type: 'text', data: { key: item.label, value: item.value } });
      }
    }
  }
  
  // Signature section
  if (options?.clinicianName) {
    content.push({
      type: 'signature',
      data: {
        signatures: [
          { label: options.clinicianRole || 'Clinician', name: options.clinicianName },
          { label: 'Date/Time' },
        ],
      },
    });
  }
  
  return {
    title,
    hospitalName: options?.hospitalName,
    hospitalLogo: options?.hospitalLogo,
    content,
    footer: options?.footer,
    printDate: true,
  };
}

// Export default configuration for use in components
export { CHARS_PER_LINE, wrapText, centerText, rightAlignText, createDivider, formatTable };
