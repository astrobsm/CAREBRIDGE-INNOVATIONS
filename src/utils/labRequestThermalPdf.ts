/**
 * Lab Request Thermal PDF Generator
 * Generates lab request forms for 80mm thermal printer
 * 
 * XP-T80Q Thermal Printer Specifications:
 * - Paper Width: 80mm
 * - Font: Georgia (Times in jsPDF as closest match)
 * - Font Size: 12pt bold for headers, 10-12pt for body
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { PDFPatientInfo } from './pdfUtils';

// 80mm = ~226 points (80mm * 2.83)
const THERMAL_PAGE_WIDTH = 226;
const THERMAL_MARGIN = 8;
const THERMAL_CONTENT_WIDTH = THERMAL_PAGE_WIDTH - (THERMAL_MARGIN * 2);
const THERMAL_PAGE_HEIGHT = 800; // Long receipt format

export interface LabRequestThermalData {
  requestId: string;
  requestedDate: Date;
  patient: PDFPatientInfo;
  hospitalName: string;
  requestedBy: string;
  priority: 'routine' | 'urgent' | 'stat';
  tests: { name: string; specimen: string; category: string }[];
  clinicalInfo?: string;
}

/**
 * Create thermal PDF for lab request form
 */
export function createLabRequestThermalPDF(data: LabRequestThermalData): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: [THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT],
  });

  let y = THERMAL_MARGIN + 5;

  // Hospital name
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(data.hospitalName.toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 16;

  // Title
  doc.setFontSize(14);
  doc.text('LABORATORY REQUEST', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;

  // Request ID
  doc.setFontSize(10);
  doc.text(`#${data.requestId.slice(0, 8).toUpperCase()}`, THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 14;

  // Priority badge
  const prioritySymbols: Record<string, string> = {
    routine: '⬤ ROUTINE',
    urgent: '⚠ URGENT',
    stat: '🚨 STAT',
  };
  doc.setFontSize(12);
  doc.text(prioritySymbols[data.priority] || data.priority.toUpperCase(), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 16;

  // Divider
  doc.setLineWidth(0.5);
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Patient Info Section
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('PATIENT INFORMATION', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  // Patient name
  const nameLines = doc.splitTextToSize(`Name: ${data.patient.name}`, THERMAL_CONTENT_WIDTH);
  doc.text(nameLines, THERMAL_MARGIN, y);
  y += nameLines.length * 12;

  // Hospital Number
  if (data.patient.hospitalNumber) {
    doc.text(`Hospital #: ${data.patient.hospitalNumber}`, THERMAL_MARGIN, y);
    y += 12;
  }

  // Age & Gender
  const ageGender = [
    data.patient.age ? `Age: ${data.patient.age}` : '',
    data.patient.gender ? `Gender: ${data.patient.gender}` : '',
  ].filter(Boolean).join(' | ');
  if (ageGender) {
    doc.text(ageGender, THERMAL_MARGIN, y);
    y += 12;
  }

  // Ward/Bed
  if (data.patient.wardBed) {
    doc.text(`Ward/Bed: ${data.patient.wardBed}`, THERMAL_MARGIN, y);
    y += 12;
  }

  y += 4;
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Request Details
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('REQUEST DETAILS', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Requested By: ${data.requestedBy}`, THERMAL_MARGIN, y);
  y += 12;
  doc.text(`Date: ${format(data.requestedDate, 'dd/MM/yyyy')}`, THERMAL_MARGIN, y);
  y += 12;
  doc.text(`Time: ${format(data.requestedDate, 'HH:mm')}`, THERMAL_MARGIN, y);
  y += 14;

  // Clinical Info
  if (data.clinicalInfo) {
    doc.setFont('times', 'bold');
    doc.text('Clinical Info:', THERMAL_MARGIN, y);
    y += 12;
    doc.setFont('times', 'normal');
    const clinicalLines = doc.splitTextToSize(data.clinicalInfo, THERMAL_CONTENT_WIDTH);
    doc.text(clinicalLines.slice(0, 3), THERMAL_MARGIN, y);
    y += Math.min(clinicalLines.length, 3) * 12 + 4;
  }

  y += 4;
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Tests Section
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('INVESTIGATIONS REQUESTED', THERMAL_MARGIN, y);
  y += 16;

  // Group tests by category
  const testsByCategory = new Map<string, { name: string; specimen: string }[]>();
  data.tests.forEach(test => {
    const category = test.category || 'Other';
    if (!testsByCategory.has(category)) {
      testsByCategory.set(category, []);
    }
    testsByCategory.get(category)!.push({ name: test.name, specimen: test.specimen });
  });

  doc.setFontSize(10);
  let testIndex = 0;

  testsByCategory.forEach((categoryTests, category) => {
    // Check page break
    if (y > THERMAL_PAGE_HEIGHT - 80) {
      doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
      y = THERMAL_MARGIN;
    }

    // Category header
    doc.setFont('times', 'bold');
    doc.text(`[${category.toUpperCase()}]`, THERMAL_MARGIN, y);
    y += 12;

    doc.setFont('times', 'normal');
    categoryTests.forEach(test => {
      testIndex++;
      
      // Check page break
      if (y > THERMAL_PAGE_HEIGHT - 60) {
        doc.addPage([THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT]);
        y = THERMAL_MARGIN;
      }

      const testLine = `${testIndex}. ${test.name}`;
      const testLines = doc.splitTextToSize(testLine, THERMAL_CONTENT_WIDTH);
      doc.text(testLines, THERMAL_MARGIN, y);
      y += testLines.length * 12;

      // Specimen
      doc.setFontSize(9);
      doc.text(`   Specimen: ${test.specimen}`, THERMAL_MARGIN, y);
      y += 12;
      doc.setFontSize(10);
    });

    y += 4;
  });

  y += 8;
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  // Specimen Collection Checkbox area
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('SPECIMEN COLLECTION', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('[ ] Collected by: _____________', THERMAL_MARGIN, y);
  y += 12;
  doc.text('[ ] Date: ______ Time: ______', THERMAL_MARGIN, y);
  y += 16;

  // Lab Use Section
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('FOR LAB USE ONLY', THERMAL_MARGIN, y);
  y += 14;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Received by: _____________', THERMAL_MARGIN, y);
  y += 12;
  doc.text('Date: ______ Time: ______', THERMAL_MARGIN, y);
  y += 16;

  // Footer
  doc.line(THERMAL_MARGIN, y, THERMAL_PAGE_WIDTH - THERMAL_MARGIN, y);
  y += 12;

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text('Handle specimens per lab protocol', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  doc.text('AstroHEALTH Healthcare', THERMAL_PAGE_WIDTH / 2, y, { align: 'center' });

  return doc;
}

/**
 * Export lab request as thermal PDF and save
 */
export function exportLabRequestThermalPDF(data: LabRequestThermalData): void {
  const doc = createLabRequestThermalPDF(data);
  const fileName = `Lab_Request_${data.patient.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}_thermal.pdf`;
  doc.save(fileName);
}

export default {
  createLabRequestThermalPDF,
  exportLabRequestThermalPDF,
};
