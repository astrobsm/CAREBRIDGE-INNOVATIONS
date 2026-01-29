/**
 * ============================================================
 * Prescription Thermal Print Generator
 * ============================================================
 * 
 * Generates prescription documents for 80mm thermal printer
 * Printer: XP-T80Q
 * Font: Georgia, 12pt, 0.8 line spacing
 * ============================================================
 */

import { THERMAL_PRINTER_CONFIG, THERMAL_TYPOGRAPHY, THERMAL_LAYOUT } from './thermalPrintConfig';
import { format } from 'date-fns';
import type { Medication, MedicationRoute } from '../types';

// ============================================================
// TYPES
// ============================================================

export interface PrescriptionThermalData {
  prescriptionId: string;
  patientName: string;
  hospitalNumber: string;
  age?: number;
  gender?: string;
  wardBed?: string;
  diagnosis?: string;
  medications: Medication[];
  prescribedBy: string;
  prescriberTitle?: string;
  prescribedAt: Date;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  dispensedBy?: string;
  dispensedAt?: Date;
  notes?: string;
  hospitalName?: string;
  hospitalPhone?: string;
}

// ============================================================
// ROUTE FORMATTING
// ============================================================

const routeAbbreviations: Record<MedicationRoute, string> = {
  oral: 'PO',
  intravenous: 'IV',
  intramuscular: 'IM',
  subcutaneous: 'SC',
  topical: 'TOP',
  rectal: 'PR',
  inhalation: 'INH',
  sublingual: 'SL',
  ophthalmic: 'OPH',
  otic: 'OT',
  nasal: 'NAS',
};

// ============================================================
// HTML GENERATOR
// ============================================================

/**
 * Generate prescription HTML for 80mm thermal printer
 */
export function generatePrescriptionThermalHTML(data: PrescriptionThermalData): string {
  const printDate = format(new Date(), 'dd/MM/yyyy HH:mm');
  const prescribedDate = format(data.prescribedAt, 'dd/MM/yyyy HH:mm');
  const dispensedDate = data.dispensedAt ? format(data.dispensedAt, 'dd/MM/yyyy HH:mm') : null;
  
  const statusLabels: Record<string, string> = {
    pending: '⏳ PENDING',
    dispensed: '✓ DISPENSED',
    partially_dispensed: '◐ PARTIAL',
    cancelled: '✗ CANCELLED',
  };

  const statusLabel = statusLabels[data.status] || 'UNKNOWN';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription - ${data.patientName}</title>
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
      letter-spacing: 2px;
    }
    
    .header .rx-symbol {
      font-size: 24pt;
      font-weight: bold;
      margin: 1mm 0;
    }
    
    .header .hospital {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      margin-top: 1mm;
    }
    
    .header .rx-id {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      margin-top: 1mm;
      font-family: monospace;
    }
    
    .status-badge {
      display: inline-block;
      border: 2px solid #000;
      padding: 1mm 3mm;
      font-weight: bold;
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
      margin: 2mm 0;
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
    
    .patient-info {
      margin: 2mm 0;
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
    
    .medication-item {
      border: 1px solid #000;
      padding: 2mm;
      margin: 2mm 0;
    }
    
    .med-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px dotted #000;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    
    .med-num {
      font-weight: bold;
      background: #000;
      color: #fff;
      width: 5mm;
      height: 5mm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .med-name {
      font-weight: bold;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader - 1}pt;
      flex: 1;
      margin-left: 2mm;
    }
    
    .med-dispensed {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      border: 1px solid #000;
      padding: 0.5mm 1mm;
    }
    
    .med-generic {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      font-style: italic;
      margin: 1mm 0;
    }
    
    .med-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1mm;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      margin-top: 1mm;
    }
    
    .med-detail {
      display: flex;
      flex-direction: column;
    }
    
    .med-detail .detail-label {
      font-weight: bold;
      font-size: 8pt;
    }
    
    .med-detail .detail-value {
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
    }
    
    .med-instructions {
      margin-top: 1mm;
      padding-top: 1mm;
      border-top: 1px dotted #ccc;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      font-style: italic;
    }
    
    .sig-box {
      border: 2px solid #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
    }
    
    .sig-title {
      font-weight: bold;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      text-transform: uppercase;
    }
    
    .sig-content {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
      margin: 1mm 0;
    }
    
    .sig-route {
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
    }
    
    .notes-box {
      border: 1px dashed #000;
      padding: 2mm;
      margin: 2mm 0;
    }
    
    .notes-title {
      font-weight: bold;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .divider {
      border-bottom: 1px dashed #000;
      margin: 2mm 0;
    }
    
    .double-divider {
      border-bottom: 2px solid #000;
      margin: 2mm 0;
    }
    
    .summary-box {
      border: 2px solid #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
    }
    
    .summary-count {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 2px solid #000;
      text-align: center;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .signature-area {
      margin: 3mm 0;
      padding: 2mm 0;
      border-bottom: 1px solid #000;
      min-height: 10mm;
    }
    
    .signature-label {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      margin-top: 1mm;
    }
    
    .dispensing-info {
      background: #f0f0f0;
      padding: 2mm;
      margin: 2mm 0;
      border: 1px solid #000;
    }
    
    .warning {
      font-weight: bold;
      text-align: center;
      padding: 2mm;
      border: 2px solid #000;
      margin: 2mm 0;
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
      <div class="rx-symbol">℞</div>
      <h1>Prescription</h1>
      ${data.hospitalName ? `<div class="hospital">${data.hospitalName}</div>` : ''}
      ${data.hospitalPhone ? `<div class="hospital">Tel: ${data.hospitalPhone}</div>` : ''}
      <div class="rx-id">Rx# ${data.prescriptionId.slice(0, 8).toUpperCase()}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
    
    <!-- Patient Information -->
    <div class="section">
      <div class="section-title">Patient Details</div>
      <div class="patient-info">
        <div class="row">
          <span class="label">Name:</span>
          <span class="value">${data.patientName}</span>
        </div>
        <div class="row">
          <span class="label">Hosp. No:</span>
          <span class="value">${data.hospitalNumber}</span>
        </div>
        ${data.age !== undefined || data.gender ? `
        <div class="row">
          ${data.age !== undefined ? `<span><strong>Age:</strong> ${data.age} yrs</span>` : ''}
          ${data.gender ? `<span><strong>Sex:</strong> ${data.gender}</span>` : ''}
        </div>
        ` : ''}
        ${data.wardBed ? `
        <div class="row">
          <span class="label">Ward/Bed:</span>
          <span class="value">${data.wardBed}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${data.diagnosis ? `
    <!-- Diagnosis -->
    <div class="section">
      <div class="section-title">Diagnosis</div>
      <div style="padding: 1mm 0;">${data.diagnosis}</div>
    </div>
    ` : ''}
    
    <!-- Medications -->
    <div class="section">
      <div class="section-title">Medications (${data.medications.length})</div>
      
      ${data.medications.map((med, index) => `
      <div class="medication-item">
        <div class="med-header">
          <div class="med-num">${index + 1}</div>
          <div class="med-name">${med.name}</div>
          ${med.isDispensed ? '<div class="med-dispensed">✓</div>' : ''}
        </div>
        
        ${med.genericName ? `<div class="med-generic">(${med.genericName})</div>` : ''}
        
        <div class="sig-box">
          <div class="sig-title">Sig:</div>
          <div class="sig-content">${med.dosage} ${routeAbbreviations[med.route] || med.route}</div>
          <div class="sig-route">${med.frequency} × ${med.duration}</div>
        </div>
        
        <div class="med-details">
          <div class="med-detail">
            <span class="detail-label">Route:</span>
            <span class="detail-value">${med.route.toUpperCase()}</span>
          </div>
          <div class="med-detail">
            <span class="detail-label">Qty:</span>
            <span class="detail-value">${med.quantity}</span>
          </div>
        </div>
        
        ${med.instructions ? `
        <div class="med-instructions">
          📝 ${med.instructions}
        </div>
        ` : ''}
      </div>
      `).join('')}
      
      <!-- Summary -->
      <div class="summary-box">
        <div class="summary-count">${data.medications.length} Item${data.medications.length !== 1 ? 's' : ''}</div>
        <div style="font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;">
          Dispensed: ${data.medications.filter(m => m.isDispensed).length} / ${data.medications.length}
        </div>
      </div>
    </div>
    
    ${data.notes ? `
    <!-- Notes -->
    <div class="section">
      <div class="notes-box">
        <div class="notes-title">Notes:</div>
        <div>${data.notes}</div>
      </div>
    </div>
    ` : ''}
    
    <!-- Prescriber Information -->
    <div class="section">
      <div class="row">
        <span class="label">Prescribed by:</span>
        <span class="value">${data.prescribedBy}</span>
      </div>
      ${data.prescriberTitle ? `
      <div class="row">
        <span class="label">Title:</span>
        <span class="value">${data.prescriberTitle}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${prescribedDate}</span>
      </div>
      
      <div class="signature-area"></div>
      <div class="signature-label">Prescriber's Signature / Stamp</div>
    </div>
    
    ${data.status !== 'pending' && dispensedDate ? `
    <!-- Dispensing Information -->
    <div class="section">
      <div class="dispensing-info">
        <div class="row">
          <span class="label">Dispensed by:</span>
          <span class="value">${data.dispensedBy || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Dispensed on:</span>
          <span class="value">${dispensedDate}</span>
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- Patient Acknowledgment -->
    <div class="section">
      <div class="warning">
        ⚠ Read all medication instructions carefully
      </div>
      
      <div style="font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt; margin: 2mm 0;">
        I acknowledge receipt of the above medications and have been counseled on their proper use.
      </div>
      
      <div class="signature-area"></div>
      <div class="signature-label">Patient / Guardian Signature</div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="divider"></div>
      <div style="margin: 1mm 0;">
        Printed: ${printDate}
      </div>
      <div style="margin: 1mm 0;">
        ${data.hospitalName || 'AstroHEALTH'}
      </div>
      <div style="margin-top: 2mm;">
        ${THERMAL_LAYOUT.dividerChar.repeat(30)}
      </div>
      <div style="margin: 1mm 0;">
        *** END OF PRESCRIPTION ***
      </div>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================================
// PRINT FUNCTIONS
// ============================================================

/**
 * Print prescription to thermal printer
 */
export function printPrescriptionThermal(data: PrescriptionThermalData): void {
  const html = generatePrescriptionThermalHTML(data);
  
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
 * Download prescription as HTML file
 */
export function downloadPrescriptionThermal(data: PrescriptionThermalData, filename?: string): void {
  const html = generatePrescriptionThermalHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `prescription-${data.hospitalNumber}-${format(new Date(), 'yyyyMMdd-HHmm')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export prescription as PDF (using browser print to PDF)
 */
export function exportPrescriptionThermalPDF(data: PrescriptionThermalData): void {
  const html = generatePrescriptionThermalHTML(data);
  
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

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format medication route for display
 */
export function formatRoute(route: MedicationRoute): string {
  return routeAbbreviations[route] || route.toUpperCase();
}
