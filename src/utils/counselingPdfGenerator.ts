// Patient Counseling PDF Generator
// Auto-generates medico-legal patient education documents

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Patient } from '../types';
import type { ProcedureEducation, Complication } from '../data/patientEducation';
import { complicationLikelihood } from '../data/patientEducation';
import { addBrandedHeader, addBrandedFooter, PDFDocumentInfo } from './pdfUtils';

// Re-export types for use by consumers
export type { ProcedureEducation, Complication };

interface CounselingPDFOptions {
  patient: Patient;
  procedure: ProcedureEducation;
  surgeonName: string;
  surgeonLicense?: string;
  hospitalName: string;
  scheduledDate?: Date;
  includeConsentSection?: boolean;
}

// Helper to format complications - exported for use in other components
export function formatComplicationText(comp: Complication): string {
  const likelihood = complicationLikelihood[comp.likelihood];
  return `${comp.name}: ${comp.description} (${likelihood.label} - ${comp.percentage})`;
}

export function generatePatientCounselingPDF(options: CounselingPDFOptions): void {
  const {
    patient,
    procedure,
    surgeonName,
    surgeonLicense,
    hospitalName,
    scheduledDate,
    includeConsentSection = true,
  } = options;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const addNewPageIfNeeded = (requiredSpace: number = 40) => {
    if (yPos > pageHeight - requiredSpace) {
      pdf.addPage();
      yPos = margin;
      // Add page header
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`${procedure.procedureName} - Patient Information`, margin, yPos);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 20, yPos);
      yPos += 10;
    }
  };

  // ============ HEADER WITH LOGO ============
  const documentInfo: PDFDocumentInfo = {
    title: 'PATIENT INFORMATION & COUNSELING',
    subtitle: procedure.procedureName,
    hospitalName: hospitalName,
  };
  yPos = addBrandedHeader(pdf, documentInfo);
  yPos += 5;

  // ============ PATIENT & PROCEDURE INFO ============
  pdf.setTextColor(0, 0, 0);
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos, contentWidth, 35, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Patient Information', margin + 3, yPos + 6);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Name: ${patient.firstName} ${patient.lastName}`, margin + 3, yPos + 14);
  pdf.text(`Hospital No: ${patient.hospitalNumber}`, margin + 80, yPos + 14);
  pdf.text(`Date of Birth: ${format(new Date(patient.dateOfBirth), 'dd/MM/yyyy')}`, margin + 3, yPos + 22);
  pdf.text(`Gender: ${patient.gender === 'male' ? 'Male' : 'Female'}`, margin + 80, yPos + 22);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Procedure:', margin + 3, yPos + 30);
  pdf.setFont('helvetica', 'normal');
  pdf.text(procedure.procedureName, margin + 30, yPos + 30);
  
  if (scheduledDate) {
    pdf.text(`Scheduled Date: ${format(scheduledDate, 'dd MMMM yyyy')}`, margin + 110, yPos + 30);
  }
  
  yPos += 42;
  
  // Surgeon information
  pdf.setFont('helvetica', 'bold');
  pdf.text('Attending Surgeon:', margin + 3, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(surgeonName + (surgeonLicense ? ` (${surgeonLicense})` : ''), margin + 45, yPos);
  
  yPos += 10;

  // ============ SECTION 1: OVERVIEW ============
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('1. ABOUT THE PROCEDURE', margin, yPos);
  yPos += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const overviewLines = pdf.splitTextToSize(procedure.overview, contentWidth);
  pdf.text(overviewLines, margin, yPos);
  yPos += overviewLines.length * 5 + 5;

  // ============ SECTION 2: AIMS ============
  addNewPageIfNeeded(50);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('2. AIMS OF THE PROCEDURE', margin, yPos);
  yPos += 7;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  procedure.aims.forEach((aim) => {
    addNewPageIfNeeded(15);
    pdf.text(`• ${aim}`, margin + 3, yPos);
    yPos += 5;
  });
  yPos += 5;

  // ============ SECTION 3: ANESTHESIA ============
  addNewPageIfNeeded(40);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('3. ANESTHESIA (PAIN CONTROL)', margin, yPos);
  yPos += 7;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const anesthesiaMap: Record<string, string> = {
    local: 'Local Anesthesia (numbing injection)',
    regional: 'Regional Anesthesia (blocks sensation in a body region)',
    spinal: 'Spinal Anesthesia (numbs lower body)',
    general: 'General Anesthesia (completely asleep)',
    sedation: 'Sedation (relaxed and drowsy)',
    combined: 'Combined techniques',
  };
  
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Type: ${anesthesiaMap[procedure.preferredAnesthesia] || procedure.preferredAnesthesia}`, margin + 3, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  const anesthesiaLines = pdf.splitTextToSize(procedure.anesthesiaDescription, contentWidth - 5);
  pdf.text(anesthesiaLines, margin + 3, yPos);
  yPos += anesthesiaLines.length * 5 + 8;

  // ============ SECTION 4: EXPECTED OUTCOMES ============
  addNewPageIfNeeded(50);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('4. EXPECTED OUTCOMES', margin, yPos);
  yPos += 7;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  procedure.expectedOutcomes.forEach((outcome) => {
    addNewPageIfNeeded(15);
    const outcomeLines = pdf.splitTextToSize(`• ${outcome}`, contentWidth - 5);
    pdf.text(outcomeLines, margin + 3, yPos);
    yPos += outcomeLines.length * 5;
  });
  yPos += 3;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Success Rate: ${procedure.successRate}`, margin + 3, yPos);
  yPos += 5;
  pdf.text(`Healing Time: ${procedure.healingTime}`, margin + 3, yPos);
  yPos += 5;
  pdf.text(`Expected Hospital Stay: ${procedure.hospitalStay}`, margin + 3, yPos);
  yPos += 10;

  // ============ SECTION 5: RISKS & COMPLICATIONS ============
  addNewPageIfNeeded(80);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('5. RISKS AND POSSIBLE COMPLICATIONS', margin, yPos);
  yPos += 7;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('All medical procedures carry some risk. The following complications may occur:', margin, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  // General complications
  pdf.setFont('helvetica', 'bold');
  pdf.text('General Surgical Risks:', margin + 3, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  procedure.generalComplications.slice(0, 6).forEach((comp) => {
    addNewPageIfNeeded(15);
    const likelihood = complicationLikelihood[comp.likelihood];
    const compText = `• ${comp.name} (${likelihood.label} - ${comp.percentage}): ${comp.description}`;
    const compLines = pdf.splitTextToSize(compText, contentWidth - 8);
    pdf.text(compLines, margin + 5, yPos);
    yPos += compLines.length * 4.5;
  });
  yPos += 5;
  
  // Specific complications
  addNewPageIfNeeded(50);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Procedure-Specific Risks:', margin + 3, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  procedure.specificComplications.forEach((comp) => {
    addNewPageIfNeeded(15);
    const likelihood = complicationLikelihood[comp.likelihood];
    const compText = `• ${comp.name} (${likelihood.label} - ${comp.percentage}): ${comp.description}`;
    const compLines = pdf.splitTextToSize(compText, contentWidth - 8);
    pdf.text(compLines, margin + 5, yPos);
    yPos += compLines.length * 4.5;
  });
  yPos += 8;

  // ============ SECTION 6: LIFESTYLE CHANGES ============
  addNewPageIfNeeded(60);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('6. LIFESTYLE CHANGES & RECOVERY INSTRUCTIONS', margin, yPos);
  yPos += 8;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  procedure.lifestyleChanges.forEach((change) => {
    addNewPageIfNeeded(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${change.category}:`, margin + 3, yPos);
    
    const importanceColor = change.importance === 'essential' ? [180, 0, 0] : 
                           change.importance === 'recommended' ? [0, 100, 0] : [100, 100, 100];
    pdf.setTextColor(importanceColor[0], importanceColor[1], importanceColor[2]);
    pdf.text(`[${change.importance.toUpperCase()}]`, margin + 50, yPos);
    yPos += 5;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const changeText = `${change.recommendation}${change.duration ? ` (Duration: ${change.duration})` : ''}`;
    const changeLines = pdf.splitTextToSize(changeText, contentWidth - 10);
    pdf.text(changeLines, margin + 5, yPos);
    yPos += changeLines.length * 4.5 + 3;
  });
  yPos += 5;

  // ============ SECTION 7: PATIENT RESPONSIBILITIES ============
  addNewPageIfNeeded(60);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('7. YOUR RESPONSIBILITIES', margin, yPos);
  yPos += 3;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Compliance with these instructions is essential for the best outcome', margin, yPos);
  yPos += 7;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  const phases = ['pre_operative', 'immediate_post_op', 'recovery', 'long_term'] as const;
  const phaseLabels: Record<string, string> = {
    pre_operative: 'Before Surgery',
    immediate_post_op: 'Immediately After Surgery',
    recovery: 'During Recovery',
    long_term: 'Long-Term',
  };
  
  phases.forEach((phase) => {
    const phaseResponsibilities = procedure.patientResponsibilities.filter(r => r.phase === phase);
    if (phaseResponsibilities.length > 0) {
      addNewPageIfNeeded(25);
      pdf.setFont('helvetica', 'bold');
      pdf.text(phaseLabels[phase] + ':', margin + 3, yPos);
      yPos += 5;
      
      pdf.setFont('helvetica', 'normal');
      phaseResponsibilities.forEach((resp) => {
        addNewPageIfNeeded(12);
        const importanceMarker = resp.importance === 'critical' ? '⚠️' : resp.importance === 'important' ? '•' : '○';
        pdf.text(`${importanceMarker} ${resp.responsibility}`, margin + 5, yPos);
        yPos += 4.5;
      });
      yPos += 3;
    }
  });
  yPos += 5;

  // ============ SECTION 8: FOLLOW-UP ============
  addNewPageIfNeeded(50);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 102, 153);
  pdf.text('8. FOLLOW-UP SCHEDULE', margin, yPos);
  yPos += 7;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  procedure.followUpSchedule.forEach((visit, idx) => {
    addNewPageIfNeeded(10);
    pdf.text(`${idx + 1}. ${visit}`, margin + 3, yPos);
    yPos += 5;
  });
  yPos += 8;

  // ============ SECTION 9: WARNING SIGNS ============
  addNewPageIfNeeded(60);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(180, 0, 0);
  pdf.text('9. WARNING SIGNS - SEEK IMMEDIATE MEDICAL ATTENTION', margin, yPos);
  yPos += 7;
  
  pdf.setFillColor(255, 240, 240);
  const warningBoxHeight = procedure.warningSignsToReport.length * 5 + 8;
  pdf.rect(margin, yPos - 2, contentWidth, warningBoxHeight, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  procedure.warningSignsToReport.forEach((sign) => {
    addNewPageIfNeeded(10);
    pdf.text(`⚠ ${sign}`, margin + 3, yPos);
    yPos += 5;
  });
  yPos += 10;

  // ============ SECTION 10: ALTERNATIVES ============
  if (procedure.alternativeTreatments && procedure.alternativeTreatments.length > 0) {
    addNewPageIfNeeded(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('10. ALTERNATIVE TREATMENTS', margin, yPos);
    yPos += 7;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    procedure.alternativeTreatments.forEach((alt) => {
      addNewPageIfNeeded(10);
      pdf.text(`• ${alt}`, margin + 3, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // ============ SECTION 11: RISK OF NOT TREATING ============
  if (procedure.riskOfNotTreating) {
    addNewPageIfNeeded(30);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('11. RISKS OF NOT HAVING THIS PROCEDURE', margin, yPos);
    yPos += 7;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const riskLines = pdf.splitTextToSize(procedure.riskOfNotTreating, contentWidth - 5);
    pdf.text(riskLines, margin + 3, yPos);
    yPos += riskLines.length * 5 + 8;
  }

  // ============ CONSENT SECTION ============
  if (includeConsentSection) {
    addNewPageIfNeeded(100);
    
    pdf.setFillColor(240, 248, 255);
    pdf.rect(margin, yPos, contentWidth, 85, 'F');
    pdf.setDrawColor(0, 102, 153);
    pdf.rect(margin, yPos, contentWidth, 85, 'S');
    
    yPos += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('PATIENT ACKNOWLEDGMENT AND CONSENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const consentText = [
      'I confirm that:',
      '• I have read and understood this information document',
      '• I have had the opportunity to ask questions and have them answered',
      '• I understand the nature of the procedure, its aims, and expected outcomes',
      '• I understand the risks and possible complications',
      '• I understand the alternative treatment options',
      '• I understand my responsibilities before and after the procedure',
      '• I consent to the proposed procedure and its associated interventions',
    ];
    
    consentText.forEach((line) => {
      pdf.text(line, margin + 5, yPos);
      yPos += 5;
    });
    yPos += 5;
    
    // Signature lines
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin + 5, yPos + 8, margin + 70, yPos + 8);
    pdf.line(margin + 90, yPos + 8, margin + 130, yPos + 8);
    pdf.line(margin + 145, yPos + 8, contentWidth + margin - 5, yPos + 8);
    
    pdf.setFontSize(8);
    pdf.text('Patient Signature', margin + 5, yPos + 13);
    pdf.text('Date', margin + 90, yPos + 13);
    pdf.text('Time', margin + 145, yPos + 13);
    
    yPos += 25;
    
    // Witness/Doctor signature
    pdf.line(margin + 5, yPos + 8, margin + 70, yPos + 8);
    pdf.line(margin + 90, yPos + 8, margin + 130, yPos + 8);
    pdf.text('Witness/Counselor Signature', margin + 5, yPos + 13);
    pdf.text('Name & Registration', margin + 90, yPos + 13);
  }

  // ============ FOOTER WITH BRANDING ============
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addBrandedFooter(pdf, i, totalPages, `Document generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} | ${hospitalName}`);
  }

  // Generate filename and save
  const filename = `Patient_Counseling_${patient.lastName}_${patient.firstName}_${procedure.procedureId}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(filename);
}

// Generate a simplified information sheet
export function generateProcedureInfoSheet(procedure: ProcedureEducation, hospitalName: string): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Header with branding
  const documentInfo: PDFDocumentInfo = {
    title: procedure.procedureName,
    subtitle: 'Patient Information Sheet',
    hospitalName: hospitalName,
  };
  yPos = addBrandedHeader(pdf, documentInfo);
  yPos += 5;

  // Overview
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('What is this procedure?', margin, yPos);
  yPos += 6;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const overviewLines = pdf.splitTextToSize(procedure.overview, contentWidth);
  pdf.text(overviewLines, margin, yPos);
  yPos += overviewLines.length * 5 + 8;

  // Key Points
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Points:', margin, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`• Success Rate: ${procedure.successRate}`, margin + 3, yPos);
  yPos += 5;
  pdf.text(`• Healing Time: ${procedure.healingTime}`, margin + 3, yPos);
  yPos += 5;
  pdf.text(`• Hospital Stay: ${procedure.hospitalStay}`, margin + 3, yPos);
  yPos += 10;

  // Most Important Things to Know
  pdf.setFont('helvetica', 'bold');
  pdf.text('Most Important Things To Know:', margin, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  const essentialChanges = procedure.lifestyleChanges.filter(c => c.importance === 'essential');
  essentialChanges.forEach(change => {
    const text = pdf.splitTextToSize(`• ${change.category}: ${change.recommendation}`, contentWidth - 5);
    pdf.text(text, margin + 3, yPos);
    yPos += text.length * 5;
  });
  yPos += 8;

  // Footer with branding
  addBrandedFooter(pdf, 1, 1, `${hospitalName} | For detailed information, ask for the full counseling document`);

  pdf.save(`Info_Sheet_${procedure.procedureId}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
