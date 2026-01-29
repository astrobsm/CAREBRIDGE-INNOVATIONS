/**
 * ============================================================
 * Dressing Protocol Print Generator
 * ============================================================
 * 
 * Generates dressing protocol documents for 80mm thermal printer
 * Printer: XP-T80Q
 * Font: Georgia, 12pt, 0.8 line spacing
 * ============================================================
 */

import { THERMAL_PRINTER_CONFIG, THERMAL_TYPOGRAPHY, THERMAL_LAYOUT } from './thermalPrintConfig';
import { format } from 'date-fns';

// Wound phase protocols (matching WoundsPage.tsx)
export interface WoundPhaseProtocol {
  name: string;
  description: string;
  granulationPercent: string;
  dressingFrequency: string;
  protocol: string[];
  color?: string;
}

export const WOUND_PHASES: Record<string, WoundPhaseProtocol> = {
  extension: {
    name: 'Extension Phase',
    description: 'Necrotic and edematous with no evidence of granulation or healthy tissue',
    granulationPercent: '0%',
    dressingFrequency: 'Daily',
    protocol: [
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
    ],
  },
  transition: {
    name: 'Transition Phase',
    description: 'Granulation up to 40% of wound surface, edema reduced, discharges minimal',
    granulationPercent: '1-40%',
    dressingFrequency: 'Alternate Day',
    protocol: [
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
    ],
  },
  repair: {
    name: 'Repair/Indolent Phase',
    description: 'Active granulation and epithelialization, minimal to no exudate',
    granulationPercent: '>40%',
    dressingFrequency: 'Alternate Day',
    protocol: [
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
    ],
  },
};

export interface DressingProtocolData {
  patientName: string;
  hospitalNumber: string;
  wardBed?: string;
  woundLocation: string;
  woundType: string;
  woundDimensions: {
    length: number;
    width: number;
    depth?: number;
    area?: number;
  };
  tissueTypes: string[];
  exudateAmount: string;
  exudateType?: string;
  phase: keyof typeof WOUND_PHASES;
  painLevel?: number;
  specialInstructions?: string;
  assessedBy: string;
  assessedAt: Date;
  nextDressingDate?: Date;
  hospitalName?: string;
}

/**
 * Generate dressing protocol HTML for 80mm thermal printer
 */
export function generateDressingProtocolHTML(data: DressingProtocolData): string {
  const phase = WOUND_PHASES[data.phase];
  const printDate = format(new Date(), 'dd/MM/yyyy HH:mm');
  const assessmentDate = format(data.assessedAt, 'dd/MM/yyyy');
  
  const nextDressing = data.nextDressingDate 
    ? format(data.nextDressingDate, 'dd/MM/yyyy')
    : phase.dressingFrequency === 'Daily' 
      ? format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'dd/MM/yyyy')
      : format(new Date(Date.now() + 48 * 60 * 60 * 1000), 'dd/MM/yyyy');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dressing Protocol - ${data.patientName}</title>
  <style>
    @page {
      size: ${THERMAL_PRINTER_CONFIG.paperWidth}mm auto;
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
    
    .container {
      width: 100%;
      padding: 0;
    }
    
    .header {
      text-align: center;
      padding-bottom: 2mm;
      border-bottom: 2px solid #000;
      margin-bottom: 2mm;
    }
    
    .header h1 {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeTitle}pt;
      font-weight: bold;
      margin-bottom: 1mm;
      text-transform: uppercase;
    }
    
    .header h2 {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
    }
    
    .header .hospital {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      margin-top: 1mm;
    }
    
    .section {
      margin: 2mm 0;
      padding-bottom: 2mm;
      border-bottom: 1px dashed #000;
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-weight: bold;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader - 2}pt;
      text-transform: uppercase;
      margin-bottom: 1mm;
      background: #000;
      color: #fff;
      padding: 1mm 2mm;
      text-align: center;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
    }
    
    .row .label {
      font-weight: bold;
    }
    
    .row .value {
      text-align: right;
    }
    
    .phase-box {
      border: 2px solid #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
    }
    
    .phase-name {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .phase-freq {
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
      margin-top: 1mm;
    }
    
    .protocol-list {
      list-style: none;
      padding: 0;
      margin: 1mm 0;
    }
    
    .protocol-list li {
      padding: 1mm 0;
      border-bottom: 1px dotted #ccc;
      display: flex;
    }
    
    .protocol-list li:last-child {
      border-bottom: none;
    }
    
    .step-num {
      font-weight: bold;
      min-width: 5mm;
      margin-right: 2mm;
    }
    
    .dimensions-box {
      border: 1px solid #000;
      padding: 2mm;
      margin: 1mm 0;
      text-align: center;
    }
    
    .dim-title {
      font-weight: bold;
      margin-bottom: 1mm;
    }
    
    .dim-values {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
    }
    
    .tissue-types {
      display: flex;
      flex-wrap: wrap;
      gap: 1mm;
      margin: 1mm 0;
    }
    
    .tissue-tag {
      border: 1px solid #000;
      padding: 0.5mm 2mm;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .warning-box {
      border: 2px solid #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
      background: #f0f0f0;
    }
    
    .warning-title {
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .next-dressing {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
      text-align: center;
      padding: 2mm;
      border: 2px dashed #000;
      margin: 2mm 0;
    }
    
    .footer {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 2px solid #000;
      text-align: center;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .signature-line {
      margin-top: 8mm;
      border-top: 1px solid #000;
      padding-top: 1mm;
      text-align: center;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .qr-placeholder {
      text-align: center;
      margin: 2mm 0;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Dressing Protocol</h1>
      <h2>Wound Care Instructions</h2>
      ${data.hospitalName ? `<div class="hospital">${data.hospitalName}</div>` : ''}
    </div>
    
    <!-- Patient Information -->
    <div class="section">
      <div class="section-title">Patient Details</div>
      <div class="row">
        <span class="label">Name:</span>
        <span class="value">${data.patientName}</span>
      </div>
      <div class="row">
        <span class="label">Hosp No:</span>
        <span class="value">${data.hospitalNumber}</span>
      </div>
      ${data.wardBed ? `
      <div class="row">
        <span class="label">Ward/Bed:</span>
        <span class="value">${data.wardBed}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${assessmentDate}</span>
      </div>
    </div>
    
    <!-- Wound Information -->
    <div class="section">
      <div class="section-title">Wound Details</div>
      <div class="row">
        <span class="label">Location:</span>
        <span class="value">${data.woundLocation}</span>
      </div>
      <div class="row">
        <span class="label">Type:</span>
        <span class="value">${data.woundType}</span>
      </div>
      
      <div class="dimensions-box">
        <div class="dim-title">Dimensions</div>
        <div class="dim-values">
          ${data.woundDimensions.length} × ${data.woundDimensions.width}${data.woundDimensions.depth ? ` × ${data.woundDimensions.depth}` : ''} cm
        </div>
        ${data.woundDimensions.area ? `<div>Area: ${data.woundDimensions.area} cm²</div>` : ''}
      </div>
      
      <div class="row">
        <span class="label">Exudate:</span>
        <span class="value">${data.exudateAmount}${data.exudateType ? ` (${data.exudateType})` : ''}</span>
      </div>
      ${data.painLevel !== undefined ? `
      <div class="row">
        <span class="label">Pain Level:</span>
        <span class="value">${data.painLevel}/10</span>
      </div>
      ` : ''}
      
      <div style="margin-top: 1mm;">
        <span class="label">Tissue Types:</span>
        <div class="tissue-types">
          ${data.tissueTypes.map(t => `<span class="tissue-tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
    
    <!-- Wound Phase -->
    <div class="section">
      <div class="phase-box">
        <div class="phase-name">${phase.name}</div>
        <div class="phase-freq">Dressing: ${phase.dressingFrequency}</div>
      </div>
      <div style="font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt; text-align: center; margin-top: 1mm;">
        ${phase.description}
      </div>
    </div>
    
    <!-- Dressing Protocol -->
    <div class="section">
      <div class="section-title">Dressing Protocol</div>
      <ol class="protocol-list">
        ${phase.protocol.map((step, index) => `
          <li>
            <span class="step-num">${index + 1}.</span>
            <span>${step}</span>
          </li>
        `).join('')}
      </ol>
    </div>
    
    ${data.specialInstructions ? `
    <!-- Special Instructions -->
    <div class="section">
      <div class="warning-box">
        <div class="warning-title">⚠ Special Instructions</div>
        <div>${data.specialInstructions}</div>
      </div>
    </div>
    ` : ''}
    
    <!-- Next Dressing -->
    <div class="next-dressing">
      NEXT DRESSING: ${nextDressing}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="row">
        <span class="label">Assessed by:</span>
        <span class="value">${data.assessedBy}</span>
      </div>
      <div class="signature-line">
        Signature / Stamp
      </div>
      <div style="margin-top: 2mm;">
        Printed: ${printDate}
      </div>
      <div style="margin-top: 1mm;">
        *** END OF PROTOCOL ***
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Print dressing protocol to thermal printer
 */
export function printDressingProtocol(data: DressingProtocolData): void {
  const html = generateDressingProtocolHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
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
 * Download dressing protocol as HTML file
 */
export function downloadDressingProtocol(data: DressingProtocolData, filename?: string): void {
  const html = generateDressingProtocolHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dressing-protocol-${data.hospitalNumber}-${format(new Date(), 'yyyyMMdd')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export dressing protocol as PDF (using browser print to PDF)
 */
export function exportDressingProtocolPDF(data: DressingProtocolData): void {
  const html = generateDressingProtocolHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Prompt user to save as PDF
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      // User can choose "Save as PDF" in print dialog
      printWindow.print();
    }, 250);
  };
}

/**
 * Determine wound phase based on tissue types
 */
export function determineWoundPhase(tissueTypes: string[], granulationPercent?: number): keyof typeof WOUND_PHASES {
  const hasNecrotic = tissueTypes.includes('necrotic') || tissueTypes.includes('eschar');
  const hasSlough = tissueTypes.includes('slough');
  const hasGranulation = tissueTypes.includes('granulation');

  if (hasNecrotic || (hasSlough && !hasGranulation)) {
    return 'extension';
  } else if (hasGranulation && (granulationPercent === undefined || granulationPercent <= 40)) {
    return 'transition';
  } else {
    return 'repair';
  }
}
