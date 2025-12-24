// Prescription PDF Generator
// Generates professional prescription documents with CareBridge branding

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  addPatientInfoBox,
  addSectionTitle,
  checkNewPage,
  PDF_COLORS,
  type PDFDocumentInfo,
  type PDFPatientInfo,
} from './pdfUtils';

export interface MedicationPDF {
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  instructions?: string;
  isDispensed?: boolean;
}

export interface PrescriptionPDFOptions {
  prescriptionId: string;
  prescribedDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  prescribedBy: string;
  prescriberTitle?: string;
  prescriberLicense?: string;
  medications: MedicationPDF[];
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  notes?: string;
  diagnosis?: string;
}

export function generatePrescriptionPDF(options: PrescriptionPDFOptions): void {
  const {
    prescriptionId,
    prescribedDate,
    patient,
    hospitalName,
    hospitalAddress,
    hospitalPhone,
    hospitalEmail,
    prescribedBy,
    prescriberTitle = 'Doctor',
    prescriberLicense,
    medications,
    status,
    notes,
    diagnosis,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add branded header
  const info: PDFDocumentInfo = {
    title: 'PRESCRIPTION',
    subtitle: `Rx #${prescriptionId.slice(0, 8).toUpperCase()}`,
    hospitalName,
    hospitalAddress,
    hospitalPhone,
    hospitalEmail,
  };

  let yPos = addBrandedHeader(doc, info);

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    pending: [234, 179, 8],
    dispensed: [34, 197, 94],
    partially_dispensed: [59, 130, 246],
    cancelled: [107, 114, 128],
  };

  const statusLabels: Record<string, string> = {
    pending: 'PENDING',
    dispensed: 'DISPENSED',
    partially_dispensed: 'PARTIAL',
    cancelled: 'CANCELLED',
  };

  const statusColor = statusColors[status] || PDF_COLORS.gray;
  const statusLabel = statusLabels[status] || 'UNKNOWN';

  // Status badge
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 45, yPos - 5, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, pageWidth - 30, yPos, { align: 'center' });

  yPos += 5;

  // Patient information box
  yPos = addPatientInfoBox(doc, yPos, patient);

  // Diagnosis if provided
  if (diagnosis) {
    yPos += 5;
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Diagnosis:', 20, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(diagnosis, 45, yPos + 5);
    yPos += 18;
  } else {
    yPos += 8;
  }

  // Medications section
  yPos = addSectionTitle(doc, yPos, 'Prescribed Medications');
  yPos += 5;

  // Medication table header
  const colWidths = [8, 55, 25, 30, 25, 22, 15];
  const cols = ['#', 'Medication', 'Dose', 'Frequency', 'Route', 'Duration', 'Qty'];
  const startX = 15;

  doc.setFillColor(243, 244, 246); // Gray-100
  doc.rect(startX, yPos, pageWidth - 30, 8, 'F');
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  let xPos = startX + 2;
  cols.forEach((col, index) => {
    doc.text(col, xPos, yPos + 5);
    xPos += colWidths[index];
  });

  yPos += 10;

  // Medication rows
  doc.setFont('helvetica', 'normal');
  medications.forEach((med, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    const rowHeight = med.instructions ? 14 : 8;

    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251); // Gray-50
      doc.rect(startX, yPos - 2, pageWidth - 30, rowHeight, 'F');
    }

    // Dispensed indicator
    if (med.isDispensed) {
      doc.setFillColor(...PDF_COLORS.success);
      doc.circle(startX + 3, yPos + 2, 1.5, 'F');
    }

    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);

    xPos = startX + 2;
    
    // Row number
    doc.text(`${index + 1}`, xPos, yPos + 3);
    xPos += colWidths[0];

    // Medication name
    doc.setFont('helvetica', 'bold');
    const medName = med.name.length > 22 ? med.name.substring(0, 22) + '...' : med.name;
    doc.text(medName, xPos, yPos + 3);
    if (med.genericName && med.genericName !== med.name) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(...PDF_COLORS.gray);
      const genericName = med.genericName.length > 25 ? med.genericName.substring(0, 25) + '...' : med.genericName;
      doc.text(`(${genericName})`, xPos, yPos + 7);
    }
    xPos += colWidths[1];

    // Reset styles for remaining columns
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.dark);

    // Dosage
    doc.text(med.dosage, xPos, yPos + 3);
    xPos += colWidths[2];

    // Frequency
    doc.text(med.frequency, xPos, yPos + 3);
    xPos += colWidths[3];

    // Route
    doc.text(med.route.toUpperCase(), xPos, yPos + 3);
    xPos += colWidths[4];

    // Duration
    doc.text(med.duration, xPos, yPos + 3);
    xPos += colWidths[5];

    // Quantity
    doc.text(`${med.quantity}`, xPos, yPos + 3);

    // Instructions if any
    if (med.instructions) {
      doc.setFontSize(7);
      doc.setTextColor(...PDF_COLORS.info);
      doc.text(`Instructions: ${med.instructions}`, startX + 10, yPos + 10);
    }

    yPos += rowHeight + 2;
  });

  yPos += 10;

  // Notes section
  if (notes) {
    yPos = checkNewPage(doc, yPos);
    yPos = addSectionTitle(doc, yPos, 'Additional Notes');
    yPos += 3;

    doc.setFillColor(239, 246, 255); // Blue-50
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const noteLines = doc.splitTextToSize(notes, pageWidth - 40);
    doc.text(noteLines, 20, yPos + 6);
    yPos += 20;
  }

  // Rx Symbol decoration
  yPos = checkNewPage(doc, yPos);
  doc.setFontSize(48);
  doc.setTextColor(240, 240, 240);
  doc.text('℞', 20, yPos + 15);

  // Prescriber signature box
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 80, yPos + 15, pageWidth - 15, yPos + 15);

  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(prescribedBy, pageWidth - 48, yPos + 22, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(prescriberTitle, pageWidth - 48, yPos + 27, { align: 'center' });

  if (prescriberLicense) {
    doc.text(`License: ${prescriberLicense}`, pageWidth - 48, yPos + 32, { align: 'center' });
  }

  // Date prescribed
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.text(`Date: ${format(prescribedDate, 'MMMM d, yyyy')}`, 20, yPos + 22);
  doc.text(`Time: ${format(prescribedDate, 'h:mm a')}`, 20, yPos + 28);

  // Legal disclaimer
  yPos += 45;
  yPos = checkNewPage(doc, yPos);
  doc.setFillColor(254, 242, 242); // Red-50
  doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
  doc.setTextColor(...PDF_COLORS.danger);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT:', 20, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('This prescription is valid for 30 days from the date of issue. Do not dispense if prescription', 45, yPos + 5);
  doc.text('appears altered. Controlled substances require proper documentation. Keep out of reach of children.', 20, yPos + 10);

  // Add branded footer
  addBrandedFooter(doc, 1, 1);

  // Save the PDF
  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Prescription_${patientName}_${format(prescribedDate, 'yyyyMMdd')}.pdf`);
}

// Generate a pharmacy dispensing slip
export function generateDispensingSlipPDF(
  options: PrescriptionPDFOptions & {
    dispensedBy?: string;
    dispensedAt?: Date;
  }
): void {
  const {
    prescriptionId,
    prescribedDate,
    patient,
    hospitalName,
    medications,
    dispensedBy,
    dispensedAt,
  } = options;

  const doc = new jsPDF('p', 'mm', [148, 210]); // A5 size for receipts
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPENSING SLIP', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(hospitalName, pageWidth / 2, 20, { align: 'center' });

  let yPos = 35;

  // Prescription details
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Rx #:', 10, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(prescriptionId.slice(0, 8).toUpperCase(), 25, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Patient:', 80, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.name, 100, yPos);

  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 10, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(format(prescribedDate, 'dd/MM/yyyy'), 25, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Hospital #:', 80, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.hospitalNumber, 105, yPos);

  yPos += 12;

  // Divider
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.setLineWidth(0.3);
  doc.line(10, yPos, pageWidth - 10, yPos);

  yPos += 8;

  // Medications
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Medications Dispensed:', 10, yPos);

  yPos += 8;

  medications.forEach((med, index) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const medText = `${index + 1}. ${med.name} ${med.dosage}`;
    doc.text(medText, 15, yPos);
    
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(`${med.frequency} x ${med.duration} | Qty: ${med.quantity}`, 20, yPos + 4);
    
    // Dispensed checkbox
    doc.setDrawColor(...PDF_COLORS.dark);
    doc.rect(pageWidth - 20, yPos - 3, 5, 5);
    if (med.isDispensed) {
      doc.setTextColor(...PDF_COLORS.success);
      doc.text('✓', pageWidth - 19, yPos);
    }

    doc.setTextColor(...PDF_COLORS.dark);
    yPos += 12;
  });

  yPos += 5;

  // Divider
  doc.setDrawColor(...PDF_COLORS.gray);
  doc.line(10, yPos, pageWidth - 10, yPos);

  yPos += 10;

  // Dispensed by
  if (dispensedBy) {
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(`Dispensed by: ${dispensedBy}`, 10, yPos);
    if (dispensedAt) {
      doc.text(`Date: ${format(dispensedAt, 'dd/MM/yyyy h:mm a')}`, 80, yPos);
    }
    yPos += 8;
  }

  // Signature line
  yPos += 10;
  doc.setDrawColor(...PDF_COLORS.dark);
  doc.line(10, yPos, 60, yPos);
  doc.line(80, yPos, 130, yPos);

  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Patient/Guardian Signature', 15, yPos + 5);
  doc.text('Pharmacist Signature', 90, yPos + 5);

  // Footer
  doc.setFontSize(6);
  doc.text('Keep this slip for your records. Report any adverse reactions to your doctor.', pageWidth / 2, 200, { align: 'center' });

  // Save
  const patientName = patient.name.replace(/\s+/g, '_');
  doc.save(`Dispensing_Slip_${patientName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
