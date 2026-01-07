/**
 * ============================================================
 * CareBridge Post-Operative Note PDF Generator
 * ============================================================
 * 
 * Generates comprehensive post-operative note PDFs following
 * WHO Surgical Safety Checklist standards. Includes:
 * - Surgical team and timing
 * - Operative details and findings
 * - Specimen tracking and lab requests
 * - Patient education materials
 * - Recovery instructions
 * 
 * PDF Standards: A4, white background, black text, Helvetica font
 * ============================================================
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addPatientInfoBox,
  addBrandedFooter,
  PDF_COLORS,
  preloadPDFLogo,
} from './pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES } from './pdfConfig';
import type { PostOperativeNote, Patient, Hospital } from '../types';

// Format currency in Naira
function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Add a section header
function addSectionHeader(doc: jsPDF, y: number, title: string, icon?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_FONT_SIZES.tableHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(`${icon ? icon + ' ' : ''}${title}`, 20, y + 5.5);
  
  doc.setTextColor(...PDF_COLORS.text);
  return y + 12;
}

// Add a subsection header
function addSubsectionHeader(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(title, 20, y);
  
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(20, y + 1, doc.internal.pageSize.getWidth() - 20, y + 1);
  
  doc.setTextColor(...PDF_COLORS.text);
  return y + 7;
}

// Add a two-column row
function addTwoColumnRow(doc: jsPDF, y: number, label1: string, value1: string, label2: string, value2: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const midPoint = pageWidth / 2;
  
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  
  // Left column
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(label1 + ':', 20, y);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(value1, 50, y);
  
  // Right column
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(label2 + ':', midPoint + 10, y);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(value2, midPoint + 45, y);
  
  return y + 6;
}

// Add WHO checklist status
function addWHOChecklistStatus(doc: jsPDF, y: number, note: PostOperativeNote): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'WHO Surgical Safety Checklist Compliance', '✓');
  
  const boxWidth = (pageWidth - 40) / 3;
  
  const checks = [
    { label: 'Sign In', completed: note.signInCompleted },
    { label: 'Time Out', completed: note.timeOutCompleted },
    { label: 'Sign Out', completed: note.signOutCompleted },
  ];
  
  let x = 20;
  for (const check of checks) {
    // Box background
    if (check.completed) {
      doc.setFillColor(220, 252, 231);
    } else {
      doc.setFillColor(254, 226, 226);
    }
    doc.roundedRect(x, y, boxWidth - 5, 15, 2, 2, 'F');
    
    // Icon and label
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'bold');
    if (check.completed) {
      doc.setTextColor(...PDF_COLORS.success);
    } else {
      doc.setTextColor(...PDF_COLORS.danger);
    }
    doc.text(check.completed ? '✓' : '✗', x + 5, y + 9);
    doc.text(check.label, x + 12, y + 9);
    
    // Status text
    doc.setFontSize(PDF_FONT_SIZES.footnote);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(check.completed ? 'Completed' : 'Incomplete', x + boxWidth - 25, y + 9);
    
    x += boxWidth;
  }
  
  doc.setTextColor(...PDF_COLORS.text);
  return y + 22;
}

// Add surgical team section
function addSurgicalTeamSection(doc: jsPDF, y: number, note: PostOperativeNote): number {
  y = addSectionHeader(doc, y, 'Surgical Team');
  
  y = addTwoColumnRow(doc, y, 'Surgeon', note.surgeon, 'Fee', formatNaira(note.surgeonFee));
  
  if (note.assistant) {
    y = addTwoColumnRow(doc, y, 'Assistant', note.assistant, 'Fee (20%)', formatNaira(note.assistantFee || 0));
  }
  
  if (note.anaesthetist) {
    y = addTwoColumnRow(doc, y, 'Anaesthetist', note.anaesthetist, 'Anaesthesia', note.anaesthesiaType || 'N/A');
  }
  
  if (note.scrubNurse) {
    y = addTwoColumnRow(doc, y, 'Scrub Nurse', note.scrubNurse, 'Circulating', note.circulatingNurse || 'N/A');
  }
  
  return y + 5;
}

// Add operative details section
function addOperativeDetailsSection(doc: jsPDF, y: number, note: PostOperativeNote): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Operative Details');
  
  // Diagnosis box
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15, y, pageWidth - 30, 18, 2, 2, 'F');
  
  y += 5;
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Pre-op Diagnosis:', 20, y);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(note.preOperativeDiagnosis, 55, y);
  
  y += 5;
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text('Post-op Diagnosis:', 20, y);
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(note.postOperativeDiagnosis, 55, y);
  
  y += 10;
  
  // Procedure performed
  y = addSubsectionHeader(doc, y, 'Procedure Performed');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  
  const procLines = doc.splitTextToSize(note.procedurePerformed, pageWidth - 40);
  doc.text(procLines, 20, y);
  y += procLines.length * 5 + 3;
  
  // Findings
  y = addSubsectionHeader(doc, y, 'Intraoperative Findings');
  const findingLines = doc.splitTextToSize(note.findings, pageWidth - 40);
  doc.text(findingLines, 20, y);
  y += findingLines.length * 5 + 3;
  
  // Blood loss and duration
  y = addTwoColumnRow(doc, y, 'Blood Loss', `${note.bloodLoss} mL`, 'Duration', `${note.duration} minutes`);
  
  if (note.bloodTransfused) {
    y = addTwoColumnRow(doc, y, 'Blood Transfused', `${note.bloodTransfused} units`, 'Complications', note.complications.length > 0 ? 'Yes' : 'None');
  }
  
  // Complications
  if (note.complications.length > 0) {
    y += 3;
    doc.setTextColor(...PDF_COLORS.danger);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Complications:', 20, y);
    y += 5;
    doc.setFont(PDF_FONTS.primary, 'normal');
    for (const comp of note.complications) {
      doc.text(`• ${comp}`, 25, y);
      y += 5;
    }
    doc.setTextColor(...PDF_COLORS.text);
  }
  
  return y + 5;
}

// Add specimens section
function addSpecimensSection(doc: jsPDF, y: number, note: PostOperativeNote): number {
  if (!note.specimensCollected || note.specimens.length === 0) {
    return y;
  }
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Specimens & Laboratory Requests');
  
  // Specimens table header
  doc.setFillColor(243, 244, 246);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  
  doc.setTextColor(...PDF_COLORS.gray);
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Type', 20, y + 4.5);
  doc.text('Description', 50, y + 4.5);
  doc.text('Site', 120, y + 4.5);
  doc.text('Lab Request', pageWidth - 20, y + 4.5, { align: 'right' });
  
  y += 10;
  
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont(PDF_FONTS.primary, 'normal');
  
  for (const specimen of note.specimens) {
    const typeLabels: Record<string, string> = {
      histology: 'Histology',
      mcs: 'M/C/S',
      biochemistry: 'Biochem',
      cytology: 'Cytology',
      frozen_section: 'Frozen',
      other: 'Other',
    };
    
    doc.text(typeLabels[specimen.type] || specimen.type, 20, y);
    doc.text(specimen.description.substring(0, 30), 50, y);
    doc.text(specimen.site.substring(0, 20), 120, y);
    
    if (specimen.labRequestGenerated) {
      doc.setTextColor(...PDF_COLORS.success);
      doc.text('Generated ✓', pageWidth - 20, y, { align: 'right' });
      doc.setTextColor(...PDF_COLORS.text);
    } else {
      doc.setTextColor(...PDF_COLORS.warning);
      doc.text('Pending', pageWidth - 20, y, { align: 'right' });
      doc.setTextColor(...PDF_COLORS.text);
    }
    
    y += 6;
  }
  
  return y + 5;
}

// Add post-op orders section
function addPostOpOrdersSection(doc: jsPDF, y: number, note: PostOperativeNote): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Post-Operative Orders');
  
  // Monitoring
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Vital Signs:', 20, y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(note.vitalSignsFrequency, 50, y);
  y += 6;
  
  // Position
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Position:', 20, y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(note.position, 50, y);
  y += 6;
  
  // Diet
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Diet:', 20, y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(note.dietInstructions, 50, y);
  y += 6;
  
  // IV Fluids
  if (note.ivFluids) {
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('IV Fluids:', 20, y);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(note.ivFluids, 50, y);
    y += 6;
  }
  
  // Medications
  if (note.medications.length > 0) {
    y += 3;
    y = addSubsectionHeader(doc, y, 'Medications');
    
    for (const med of note.medications) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text(`• ${med.name}`, 20, y);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(`${med.dose} ${med.route} ${med.frequency} x ${med.duration}`, 60, y);
      y += 5;
    }
  }
  
  return y + 5;
}

// Add recovery plan section
function addRecoveryPlanSection(doc: jsPDF, y: number, note: PostOperativeNote): number {
  y = addSectionHeader(doc, y, 'Recovery Plan (WHO Standards)');
  
  // Expected recovery
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('Expected Recovery:', 20, y);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`${note.expectedRecoveryDays} days`, 60, y);
  y += 8;
  
  // Ambulation
  y = addSubsectionHeader(doc, y, 'Ambulation');
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(`Day 0: ${note.ambulation.day0}`, 25, y);
  y += 5;
  doc.text(`Day 1: ${note.ambulation.day1}`, 25, y);
  y += 5;
  doc.text(`Ongoing: ${note.ambulation.ongoing}`, 25, y);
  y += 8;
  
  // Oral Intake
  y = addSubsectionHeader(doc, y, 'Oral Intake');
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`Start: ${note.oralIntake.timing}`, 25, y);
  y += 5;
  doc.text(`Type: ${note.oralIntake.type}`, 25, y);
  y += 5;
  doc.text(`Progression: ${note.oralIntake.progression}`, 25, y);
  y += 8;
  
  return y + 3;
}

// Add patient education section (on new page)
function addPatientEducationSection(doc: jsPDF, note: PostOperativeNote): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add new page for patient education
  doc.addPage();
  
  // Ensure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Title
  let y = 20;
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_FONT_SIZES.title);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('PATIENT EDUCATION', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.text(`Post-Operative Instructions: ${note.procedureName}`, pageWidth / 2, 25, { align: 'center' });
  
  y = 45;
  doc.setTextColor(...PDF_COLORS.text);
  
  const edu = note.patientEducation;
  
  // Recovery Timeline
  y = addSectionHeader(doc, y, 'Recovery Timeline');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setFont(PDF_FONTS.primary, 'normal');
  const timelineLines = doc.splitTextToSize(edu.recoveryTimeline, pageWidth - 40);
  doc.text(timelineLines, 20, y);
  y += timelineLines.length * 5 + 5;
  
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text(`Expected Recovery: ${edu.expectedRecoveryDays} days`, 20, y);
  y += 10;
  
  // Ambulation Instructions
  y = addSectionHeader(doc, y, 'Getting Moving (Ambulation)');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(`• Day of Surgery: ${edu.ambulation.day0}`, 20, y); y += 5;
  doc.text(`• Day 1: ${edu.ambulation.day1}`, 20, y); y += 5;
  doc.text(`• Week 1: ${edu.ambulation.week1}`, 20, y); y += 5;
  doc.text(`• Week 2: ${edu.ambulation.week2}`, 20, y); y += 5;
  doc.text(`• Ongoing: ${edu.ambulation.ongoingCare}`, 20, y); y += 10;
  
  // Eating & Drinking
  y = addSectionHeader(doc, y, 'Eating & Drinking');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(`• Immediately After Surgery: ${edu.oralIntake.immediatePostOp}`, 20, y); y += 5;
  doc.text(`• Day 1: ${edu.oralIntake.day1}`, 20, y); y += 5;
  doc.text(`• Normal Diet: ${edu.oralIntake.normalDiet}`, 20, y); y += 5;
  if (edu.oralIntake.restrictions && edu.oralIntake.restrictions.length > 0) {
    doc.setTextColor(...PDF_COLORS.warning);
    doc.text(`• Restrictions: ${edu.oralIntake.restrictions.join(', ')}`, 20, y);
    doc.setTextColor(...PDF_COLORS.text);
    y += 5;
  }
  y += 5;
  
  // Wound Care
  y = addSectionHeader(doc, y, 'Wound Care');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(`• Initial Dressing: ${edu.woundCare.initialDressing}`, 20, y); y += 5;
  doc.text(`• Dressing Changes: ${edu.woundCare.dressingChanges}`, 20, y); y += 5;
  
  // Signs of infection - red box
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(15, y, pageWidth - 30, 20, 2, 2, 'F');
  y += 5;
  doc.setTextColor(...PDF_COLORS.danger);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('⚠️ Watch for Signs of Infection:', 20, y); y += 5;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text(edu.woundCare.signsOfInfection.join(' | '), 25, y);
  doc.setTextColor(...PDF_COLORS.text);
  y += 18;
  
  // Check if need new page
  if (y > pageHeight - 80) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 20;
  }
  
  // Medications
  y = addSectionHeader(doc, y, 'Medications');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(`• Pain Management: ${edu.medications.painManagement}`, 20, y); y += 5;
  if (edu.medications.antibiotics) {
    doc.text(`• Antibiotics: ${edu.medications.antibiotics}`, 20, y); y += 5;
  }
  doc.text(`• Duration: ${edu.medications.duration}`, 20, y); y += 10;
  
  // Activity Restrictions
  y = addSectionHeader(doc, y, 'Activity Restrictions');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(`• Lifting: ${edu.activityRestrictions.lifting}`, 20, y); y += 5;
  doc.text(`• Driving: ${edu.activityRestrictions.driving}`, 20, y); y += 5;
  doc.text(`• Work: ${edu.activityRestrictions.work}`, 20, y); y += 5;
  doc.text(`• Exercise: ${edu.activityRestrictions.exercise}`, 20, y); y += 5;
  doc.text(`• Bathing: ${edu.activityRestrictions.bathing}`, 20, y); y += 10;
  
  // Follow-up
  y = addSectionHeader(doc, y, 'Follow-Up Care');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(`• First Appointment: ${edu.followUp.firstAppointment}`, 20, y); y += 5;
  doc.text(`• Subsequent Care: ${edu.followUp.subsequentCare}`, 20, y); y += 5;
  if (edu.followUp.suturRemoval) {
    doc.text(`• Suture Removal: ${edu.followUp.suturRemoval}`, 20, y); y += 5;
  }
  y += 5;
  
  // Emergency Contact - highlighted box
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.warning);
  doc.setLineWidth(1);
  doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'S');
  
  y += 7;
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.text('📞 EMERGENCY CONTACT', 20, y); y += 6;
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  doc.text(edu.emergencyContact, 20, y); y += 5;
  doc.setTextColor(...PDF_COLORS.danger);
  doc.text('Seek help if: ' + edu.emergencySigns.join(' | '), 20, y);
  doc.setTextColor(...PDF_COLORS.text);
  
  return y + 20;
}

// Add warning signs section
function addWarningSigns(doc: jsPDF, y: number, note: PostOperativeNote): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSectionHeader(doc, y, 'Warning Signs - Seek Medical Attention');
  
  // Red warning box
  doc.setFillColor(254, 226, 226);
  const boxHeight = (note.warningSigns.length + note.whenToSeekHelp.length) * 5 + 10;
  doc.roundedRect(15, y, pageWidth - 30, boxHeight, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.danger);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, pageWidth - 30, boxHeight, 3, 3, 'S');
  
  y += 7;
  
  doc.setTextColor(...PDF_COLORS.danger);
  doc.setFontSize(PDF_FONT_SIZES.footnote);
  
  for (const sign of note.warningSigns) {
    doc.text(`⚠️ ${sign}`, 20, y);
    y += 5;
  }
  
  doc.setTextColor(...PDF_COLORS.text);
  return y + 8;
}

// Main function to generate post-op note PDF
export async function generatePostOpNotePDF(
  note: PostOperativeNote,
  patient: Patient,
  hospital: Hospital
): Promise<jsPDF> {
  // Ensure logo is loaded
  await preloadPDFLogo();
  
  // Create PDF document (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Ensure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Calculate patient age
  const birthDate = new Date(patient.dateOfBirth);
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  // Add branded header
  let y = addBrandedHeader(doc, {
    title: 'POST-OPERATIVE NOTE',
    subtitle: `${note.procedureName} - ${format(new Date(note.procedureDate), 'dd MMMM yyyy')}`,
    hospitalName: hospital.name,
    hospitalPhone: hospital.phone,
    hospitalEmail: hospital.email,
  });
  
  // Patient info box
  y = addPatientInfoBox(doc, y, {
    name: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    age,
    gender: patient.gender === 'male' ? 'Male' : 'Female',
    phone: patient.phone,
    diagnosis: note.preOperativeDiagnosis,
  });
  
  y += 5;
  
  // WHO Checklist Status
  y = addWHOChecklistStatus(doc, y, note);
  
  // Surgical Team
  y = addSurgicalTeamSection(doc, y, note);
  
  // Operative Details
  y = addOperativeDetailsSection(doc, y, note);
  
  // Check if we need a new page before specimens
  if (y > pageHeight - 60) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 20;
  }
  
  // Specimens & Lab Requests
  y = addSpecimensSection(doc, y, note);
  
  // Check if we need a new page before orders
  if (y > pageHeight - 80) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 20;
  }
  
  // Post-Op Orders
  y = addPostOpOrdersSection(doc, y, note);
  
  // Recovery Plan
  y = addRecoveryPlanSection(doc, y, note);
  
  // Warning Signs
  y = addWarningSigns(doc, y, note);
  
  // Add footer to first pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages + 1, `Post-Operative Note | ${hospital.name} | CONFIDENTIAL`);
  }
  
  // Patient Education Section (on new page)
  addPatientEducationSection(doc, note);
  
  // Add footer to education page
  const educationPageNum = doc.getNumberOfPages();
  doc.setPage(educationPageNum);
  addBrandedFooter(doc, educationPageNum, educationPageNum, `Patient Education | ${hospital.name}`);
  
  return doc;
}

// Download post-op note as PDF
export async function downloadPostOpNotePDF(
  note: PostOperativeNote,
  patient: Patient,
  hospital: Hospital
): Promise<void> {
  const doc = await generatePostOpNotePDF(note, patient, hospital);
  const filename = `PostOpNote_${patient.lastName}_${format(new Date(note.procedureDate), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

// Get post-op note PDF as blob for sharing (WhatsApp, etc.)
export async function getPostOpNotePDFBlob(
  note: PostOperativeNote,
  patient: Patient,
  hospital: Hospital
): Promise<Blob> {
  const doc = await generatePostOpNotePDF(note, patient, hospital);
  return doc.output('blob');
}

// Share post-op note via WhatsApp
export async function sharePostOpNoteViaWhatsApp(
  note: PostOperativeNote,
  patient: Patient,
  hospital: Hospital,
  phoneNumber?: string
): Promise<void> {
  const blob = await getPostOpNotePDFBlob(note, patient, hospital);
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // For mobile devices, try to use WhatsApp sharing
  const whatsappUrl = phoneNumber 
    ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Post-Operative Note for ${patient.firstName} ${patient.lastName}\n` +
        `Procedure: ${note.procedureName}\n` +
        `Date: ${format(new Date(note.procedureDate), 'dd MMMM yyyy')}\n\n` +
        `Please find the attached post-operative instructions.`
      )}`
    : `https://wa.me/?text=${encodeURIComponent(
        `Post-Operative Note for ${patient.firstName} ${patient.lastName}\n` +
        `Procedure: ${note.procedureName}\n` +
        `Date: ${format(new Date(note.procedureDate), 'dd MMMM yyyy')}`
      )}`;
  
  // Open WhatsApp
  window.open(whatsappUrl, '_blank');
  
  // Also trigger download so user can attach the PDF
  const a = document.createElement('a');
  a.href = url;
  a.download = `PostOpNote_${patient.lastName}.pdf`;
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
}
