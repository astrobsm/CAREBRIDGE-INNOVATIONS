/**
 * Keloid Care Plan PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates comprehensive, branded PDF for keloid care plans
 * following AstroHEALTH PDF standards (A4, white background, Georgia font).
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  addPatientInfoBox,
  addSectionTitle,
  checkNewPage,
  addLogoWatermark,
  PDF_COLORS,
  type PDFDocumentInfo,
  type PDFPatientInfo,
} from '../../../utils/pdfUtils';
import { PDF_MARGINS } from '../../../utils/pdfConfig';
import {
  RADIOTHERAPY_SIDE_EFFECTS,
} from '../types';
import type {
  KeloidAssessment,
  TriamcinoloneSchedule,
  PreTriamcinoloneTestStatus,
} from '../types';

/**
 * Generate a comprehensive Keloid Care Plan PDF document
 */
export function generateKeloidCarePlanPDF(
  plan: any,
  patient: any,
  hospital: any
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  addLogoWatermark(doc, 0.06);

  const margin = PDF_MARGINS?.left || 12.7;
  const contentWidth = pageWidth - margin * 2;

  // Document Info
  const docInfo: PDFDocumentInfo = {
    title: 'KELOID CARE PLAN',
    hospitalName: hospital?.name || hospital?.hospitalName || 'AstroHEALTH Facility',
    hospitalPhone: hospital?.phone || '',
    hospitalEmail: hospital?.email || '',
  };

  // Patient Info
  const patientInfo: PDFPatientInfo = {
    name: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
    hospitalNumber: patient?.hospitalNumber || 'N/A',
    age: plan.patientAge || 0,
    gender: plan.patientGender || patient?.gender || 'N/A',
  };

  // Add header
  let yPos = addBrandedHeader(doc, docInfo);

  // Add patient info box
  yPos = addPatientInfoBox(doc, yPos, patientInfo);
  yPos += 4;

  // ================== CLINICAL SUMMARY ==================
  yPos = checkNewPage(doc, yPos, 30);
  yPos = addSectionTitle(doc, yPos, 'Clinical Summary');

  if (plan.diagnosisDate) {
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date of Diagnosis: ${format(new Date(plan.diagnosisDate), 'dd MMM yyyy')}`, margin, yPos);
    yPos += 5;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const summaryLines = doc.splitTextToSize(plan.clinicalSummary || 'No summary provided', contentWidth);
  doc.text(summaryLines, margin, yPos);
  yPos += summaryLines.length * 4.5 + 4;

  // ================== KELOID ASSESSMENTS ==================
  const assessments = (plan.keloidAssessments || []) as KeloidAssessment[];
  if (assessments.length > 0) {
    yPos = checkNewPage(doc, yPos, 40);
    yPos = addSectionTitle(doc, yPos, `Keloid Assessment(s) - ${assessments.length} site(s)`);

    assessments.forEach((assess, idx) => {
      yPos = checkNewPage(doc, yPos, 25);
      
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text(`Keloid #${idx + 1}: ${assess.location}`, margin, yPos);
      yPos += 5;

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const details = [
        `Size: ${assess.size.length} x ${assess.size.width} x ${assess.size.height} ${assess.size.unit}`,
        `Duration: ${assess.duration || 'N/A'}`,
        `Vascularity: ${assess.vascularity} | Firmness: ${assess.firmness}`,
        assess.color ? `Color: ${assess.color}` : '',
        assess.symptoms?.length > 0 ? `Symptoms: ${assess.symptoms.join(', ')}` : '',
      ].filter(Boolean);

      details.forEach(line => {
        doc.text(line, margin + 4, yPos);
        yPos += 4;
      });
      yPos += 2;
    });
  }

  // ================== IDENTIFIED PROBLEMS ==================
  if (plan.identifiedProblems?.length > 0) {
    yPos = checkNewPage(doc, yPos, 20);
    yPos = addSectionTitle(doc, yPos, 'Identified Problems & Concerns');
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    plan.identifiedProblems.forEach((problem: string) => {
      yPos = checkNewPage(doc, yPos, 6);
      doc.text(`• ${problem}`, margin + 2, yPos);
      yPos += 4;
    });
    
    if (plan.otherConcerns) {
      yPos += 2;
      doc.setFont('times', 'italic');
      const otherLines = doc.splitTextToSize(`Other: ${plan.otherConcerns}`, contentWidth - 4);
      doc.text(otherLines, margin + 2, yPos);
      yPos += otherLines.length * 4;
    }
    yPos += 3;
  }

  // ================== RISK FACTORS ==================
  if (plan.riskFactors?.length > 0) {
    yPos = checkNewPage(doc, yPos, 20);
    yPos = addSectionTitle(doc, yPos, 'Risk Factors');
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    plan.riskFactors.forEach((factor: string) => {
      yPos = checkNewPage(doc, yPos, 6);
      doc.text(`• ${factor}`, margin + 2, yPos);
      yPos += 4;
    });
    yPos += 3;
  }

  // ================== COMORBIDITIES ==================
  yPos = checkNewPage(doc, yPos, 15);
  yPos = addSectionTitle(doc, yPos, 'Comorbidities');
  
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  if (plan.hasNoComorbidities) {
    doc.text('No known comorbidities', margin + 2, yPos);
    yPos += 5;
  } else if (plan.comorbidities?.length > 0) {
    plan.comorbidities.forEach((c: string) => {
      yPos = checkNewPage(doc, yPos, 6);
      doc.text(`• ${c}`, margin + 2, yPos);
      yPos += 4;
    });
  } else {
    doc.text('None documented', margin + 2, yPos);
    yPos += 5;
  }
  yPos += 3;

  // ================== PRE-TRIAMCINOLONE TESTS ==================
  const tests = (plan.preTriamcinoloneTests || []) as PreTriamcinoloneTestStatus[];
  if (tests.length > 0) {
    yPos = checkNewPage(doc, yPos, 25);
    yPos = addSectionTitle(doc, yPos, 'Pre-Triamcinolone Injection Tests');
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    tests.forEach(test => {
      yPos = checkNewPage(doc, yPos, 6);
      const statusLabel = test.status === 'completed' ? '[DONE]' :
                          test.status === 'not_required' ? '[N/A]' :
                          test.status === 'ordered' ? '[ORDERED]' : '[PENDING]';
      doc.text(`${statusLabel}  ${test.testName}  (${test.status.replace('_', ' ')})`, margin + 2, yPos);
      yPos += 4.5;
    });

    yPos += 2;
    const allCleared = tests.every(t => t.status === 'completed' || t.status === 'not_required');
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(allCleared ? PDF_COLORS.success : PDF_COLORS.warning));
    doc.text(
      allCleared ? '[CLEARED] All required tests cleared - safe to proceed' : '[!] Some tests still pending',
      margin + 2,
      yPos
    );
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  }

  // ================== TREATMENT PLAN ==================
  const tp = plan.treatmentPlan as any;
  if (tp) {
    yPos = checkNewPage(doc, yPos, 30);
    yPos = addSectionTitle(doc, yPos, 'Multi-Modality Treatment Plan');

    // A. Pre-Op Triamcinolone
    if (tp.preOpTriamcinolone?.enabled) {
      yPos = checkNewPage(doc, yPos, 25);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text('A. Pre-Operative Intralesional Triamcinolone', margin, yPos);
      yPos += 5;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`Sessions: ${tp.preOpTriamcinolone.numberOfSessions} (every 3 weeks)`, margin + 4, yPos);
      yPos += 4;
      doc.text(`Dose: Triamcinolone Acetonide 10-40mg/mL diluted with Lidocaine 1%`, margin + 4, yPos);
      yPos += 4;
      
      if (tp.preOpTriamcinolone.startDate) {
        doc.text(`Start Date: ${format(new Date(tp.preOpTriamcinolone.startDate), 'dd MMM yyyy')}`, margin + 4, yPos);
        yPos += 4;
      }

      // Schedule
      const schedule = (tp.preOpTriamcinolone.schedule || []) as TriamcinoloneSchedule[];
      if (schedule.length > 0) {
        yPos += 1;
        doc.setFont('times', 'italic');
        doc.text('Schedule:', margin + 4, yPos);
        yPos += 4;
        doc.setFont('times', 'normal');
        schedule.forEach(s => {
          yPos = checkNewPage(doc, yPos, 5);
          doc.text(`  Session ${s.sessionNumber}: ${format(new Date(s.scheduledDate), 'dd MMM yyyy')} [${s.status}]`, margin + 6, yPos);
          yPos += 3.5;
        });
      }
      yPos += 4;
    }

    // B. Surgery
    if (tp.surgery?.planned) {
      yPos = checkNewPage(doc, yPos, 15);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text('B. Surgical Excision', margin, yPos);
      yPos += 5;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const surgeryType = tp.surgery.schedule?.surgeryType || 'Keloid Excision';
      doc.text(`Type: ${surgeryType}`, margin + 4, yPos);
      yPos += 4;
      
      if (tp.surgery.schedule?.plannedDate) {
        doc.text(`Planned Date: ${format(new Date(tp.surgery.schedule.plannedDate), 'dd MMM yyyy')}`, margin + 4, yPos);
        yPos += 4;
      }
      yPos += 4;
    }

    // C. Post-Op Triamcinolone
    if (tp.postOpTriamcinolone?.enabled) {
      yPos = checkNewPage(doc, yPos, 25);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text('C. Post-Operative Intralesional Triamcinolone', margin, yPos);
      yPos += 5;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`Sessions: ${tp.postOpTriamcinolone.numberOfSessions} (every 3 weeks)`, margin + 4, yPos);
      yPos += 4;
      
      if (tp.postOpTriamcinolone.startDate) {
        doc.text(`Start Date: ${format(new Date(tp.postOpTriamcinolone.startDate), 'dd MMM yyyy')}`, margin + 4, yPos);
        yPos += 4;
      }

      const schedule = (tp.postOpTriamcinolone.schedule || []) as TriamcinoloneSchedule[];
      if (schedule.length > 0) {
        yPos += 1;
        doc.setFont('times', 'italic');
        doc.text('Schedule:', margin + 4, yPos);
        yPos += 4;
        doc.setFont('times', 'normal');
        schedule.forEach(s => {
          yPos = checkNewPage(doc, yPos, 5);
          doc.text(`  Session ${s.sessionNumber}: ${format(new Date(s.scheduledDate), 'dd MMM yyyy')} [${s.status}]`, margin + 6, yPos);
          yPos += 3.5;
        });
      }
      yPos += 4;
    }

    // D. Silicone Sheet & Compression
    if (tp.siliconeCompression) {
      yPos = checkNewPage(doc, yPos, 25);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text('D. Silicone Sheet & Compression Therapy', margin, yPos);
      yPos += 5;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      
      if (tp.siliconeCompression.siliconeSheetStartDate) {
        doc.text(`Silicone Sheet Start: ${format(new Date(tp.siliconeCompression.siliconeSheetStartDate), 'dd MMM yyyy')}`, margin + 4, yPos);
        yPos += 4;
      }
      if (tp.siliconeCompression.compressionGarmentStartDate) {
        doc.text(`Compression Garment Start: ${format(new Date(tp.siliconeCompression.compressionGarmentStartDate), 'dd MMM yyyy')}`, margin + 4, yPos);
        yPos += 4;
      }
      doc.text(`Duration: ${tp.siliconeCompression.durationWeeks || 24} weeks`, margin + 4, yPos);
      yPos += 5;

      // Instructions
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      const siliconeInstr = doc.splitTextToSize(
        'Silicone: Apply for minimum 12 hours/day. Clean sheet daily. Replace every 2-4 weeks.',
        contentWidth - 8
      );
      doc.text(siliconeInstr, margin + 4, yPos);
      yPos += siliconeInstr.length * 3.5;

      const comprInstr = doc.splitTextToSize(
        'Compression: Wear garment 23 hours/day. Remove only for washing. Replace when elasticity reduces.',
        contentWidth - 8
      );
      doc.text(comprInstr, margin + 4, yPos);
      yPos += comprInstr.length * 3.5 + 4;
    }

    // E. Radiotherapy
    if (tp.radiotherapy?.indicated) {
      yPos = checkNewPage(doc, yPos, 40);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text('E. Post-Operative Low-Dose Radiotherapy', margin, yPos);
      yPos += 5;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      
      if (tp.radiotherapy.timing) {
        doc.text(`Timing: ${tp.radiotherapy.timing}`, margin + 4, yPos);
        yPos += 4;
      }
      if (tp.radiotherapy.totalDose) {
        doc.text(`Total Dose: ${tp.radiotherapy.totalDose}`, margin + 4, yPos);
        yPos += 4;
      }
      if (tp.radiotherapy.fractions) {
        doc.text(`Fractions: ${tp.radiotherapy.fractions}`, margin + 4, yPos);
        yPos += 4;
      }
      if (tp.radiotherapy.referralFacility) {
        doc.text(`Referral Facility: ${tp.radiotherapy.referralFacility}`, margin + 4, yPos);
        yPos += 4;
      }

      // Indications
      if (tp.radiotherapy.indications?.length > 0) {
        yPos += 1;
        doc.setFont('times', 'italic');
        doc.text('Indications:', margin + 4, yPos);
        yPos += 4;
        doc.setFont('times', 'normal');
        tp.radiotherapy.indications.forEach((ind: string) => {
          yPos = checkNewPage(doc, yPos, 5);
          doc.text(`  • ${ind}`, margin + 6, yPos);
          yPos += 3.5;
        });
      }

      // Side Effects
      yPos = checkNewPage(doc, yPos, 30);
      yPos += 3;
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text('Anticipated Side Effects & Management:', margin + 4, yPos);
      yPos += 5;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      RADIOTHERAPY_SIDE_EFFECTS.forEach(se => {
        yPos = checkNewPage(doc, yPos, 12);
        doc.setFont('times', 'bold');
        doc.text(`${se.effect}`, margin + 6, yPos);
        yPos += 3.5;
        doc.setFont('times', 'normal');
        doc.text(`  Timing: ${se.timing}`, margin + 6, yPos);
        yPos += 3;
        doc.text(`  Management: ${se.management}`, margin + 6, yPos);
        yPos += 4;
      });

      // Consent
      yPos += 2;
      doc.setFontSize(9);
      doc.text(
        `Side effects discussed: ${tp.radiotherapy.sideEffectsDiscussed ? 'Yes' : 'No'} | Consent obtained: ${tp.radiotherapy.consentObtained ? 'Yes' : 'No'}`,
        margin + 4,
        yPos
      );
      yPos += 6;
    }
  }

  // ================== CONSENT & COMPLIANCE ==================
  yPos = checkNewPage(doc, yPos, 25);
  yPos = addSectionTitle(doc, yPos, 'Patient Education & Consent');
  
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  
  const consentItems = [
    { label: 'Multi-modality approach explained', value: plan.multiModalityExplained },
    { label: 'Importance of compliance discussed', value: plan.complianceImportanceExplained },
    { label: 'Patient informed consent obtained', value: plan.patientConsentObtained },
  ];

  consentItems.forEach(item => {
    yPos = checkNewPage(doc, yPos, 6);
    // Draw checkbox rectangle
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, yPos - 3, 3.5, 3.5);
    if (item.value) {
      // Draw X inside checkbox
      doc.setLineWidth(0.5);
      doc.line(margin + 2.3, yPos - 2.7, margin + 5.2, yPos + 0.2);
      doc.line(margin + 5.2, yPos - 2.7, margin + 2.3, yPos + 0.2);
    }
    doc.setLineWidth(0.1);
    doc.text(`  ${item.label}`, margin + 7, yPos);
    yPos += 5;
  });

  // ================== CREATED BY ==================
  yPos += 6;
  yPos = checkNewPage(doc, yPos, 15);
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Created by: ${plan.createdByName || 'Unknown'}`, margin, yPos);
  yPos += 3.5;
  doc.text(`Date: ${plan.createdAt ? format(new Date(plan.createdAt), 'dd MMM yyyy, HH:mm') : 'N/A'}`, margin, yPos);
  yPos += 3.5;
  doc.text(`Plan Status: ${plan.status || 'N/A'}`, margin, yPos);
  doc.setTextColor(0, 0, 0);

  // ================== FOOTER ON ALL PAGES ==================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages);
  }

  // ================== SAVE ==================
  const patientName = patient ? `${patient.firstName}_${patient.lastName}` : 'patient';
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  doc.save(`Keloid_Care_Plan_${patientName}_${dateStr}.pdf`);
}

/**
 * Generate a Keloid Care Plan PDF and return it as a Blob (for WhatsApp sharing)
 */
export function generateKeloidCarePlanPDFBlob(
  plan: any,
  patient: any,
  hospital: any
): { blob: Blob; fileName: string } {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  addLogoWatermark(doc, 0.06);

  const margin = PDF_MARGINS?.left || 12.7;
  const contentWidth = pageWidth - margin * 2;

  const docInfo: PDFDocumentInfo = {
    title: 'KELOID CARE PLAN',
    hospitalName: hospital?.name || hospital?.hospitalName || 'AstroHEALTH Facility',
    hospitalPhone: hospital?.phone || '',
    hospitalEmail: hospital?.email || '',
  };

  const patientInfo: PDFPatientInfo = {
    name: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
    hospitalNumber: patient?.hospitalNumber || 'N/A',
    age: plan.patientAge || 0,
    gender: plan.patientGender || patient?.gender || 'N/A',
  };

  let yPos = addBrandedHeader(doc, docInfo);
  yPos = addPatientInfoBox(doc, yPos, patientInfo);
  yPos += 4;

  // Clinical Summary
  yPos = checkNewPage(doc, yPos, 30);
  yPos = addSectionTitle(doc, yPos, 'Clinical Summary');
  if (plan.diagnosisDate) {
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date of Diagnosis: ${format(new Date(plan.diagnosisDate), 'dd MMM yyyy')}`, margin, yPos);
    yPos += 5;
  }
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const summaryLines = doc.splitTextToSize(plan.clinicalSummary || 'No summary provided', contentWidth);
  doc.text(summaryLines, margin, yPos);
  yPos += summaryLines.length * 4.5 + 4;

  // Keloid Assessments
  const assessments = (plan.keloidAssessments || []) as KeloidAssessment[];
  if (assessments.length > 0) {
    yPos = checkNewPage(doc, yPos, 40);
    yPos = addSectionTitle(doc, yPos, `Keloid Assessment(s) - ${assessments.length} site(s)`);
    assessments.forEach((assess, idx) => {
      yPos = checkNewPage(doc, yPos, 25);
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text(`Keloid #${idx + 1}: ${assess.location}`, margin, yPos);
      yPos += 5;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const details = [
        `Size: ${assess.size.length} x ${assess.size.width} x ${assess.size.height} ${assess.size.unit}`,
        `Duration: ${assess.duration || 'N/A'}`,
        `Vascularity: ${assess.vascularity} | Firmness: ${assess.firmness}`,
        assess.color ? `Color: ${assess.color}` : '',
        assess.symptoms?.length > 0 ? `Symptoms: ${assess.symptoms.join(', ')}` : '',
      ].filter(Boolean);
      details.forEach(line => {
        doc.text(line, margin + 4, yPos);
        yPos += 4;
      });
      yPos += 2;
    });
  }

  // Problems
  if (plan.identifiedProblems?.length > 0) {
    yPos = checkNewPage(doc, yPos, 20);
    yPos = addSectionTitle(doc, yPos, 'Identified Problems & Concerns');
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    plan.identifiedProblems.forEach((problem: string) => {
      yPos = checkNewPage(doc, yPos, 6);
      doc.text(`• ${problem}`, margin + 2, yPos);
      yPos += 4;
    });
    yPos += 3;
  }

  // Risk Factors
  if (plan.riskFactors?.length > 0) {
    yPos = checkNewPage(doc, yPos, 20);
    yPos = addSectionTitle(doc, yPos, 'Risk Factors');
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    plan.riskFactors.forEach((factor: string) => {
      yPos = checkNewPage(doc, yPos, 6);
      doc.text(`• ${factor}`, margin + 2, yPos);
      yPos += 4;
    });
    yPos += 3;
  }

  // Comorbidities
  yPos = checkNewPage(doc, yPos, 15);
  yPos = addSectionTitle(doc, yPos, 'Comorbidities');
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  if (plan.hasNoComorbidities) {
    doc.text('No known comorbidities', margin + 2, yPos);
    yPos += 5;
  } else if (plan.comorbidities?.length > 0) {
    plan.comorbidities.forEach((c: string) => {
      yPos = checkNewPage(doc, yPos, 6);
      doc.text(`• ${c}`, margin + 2, yPos);
      yPos += 4;
    });
  }
  yPos += 3;

  // Treatment Plan
  const tp = plan.treatmentPlan as any;
  if (tp) {
    yPos = checkNewPage(doc, yPos, 30);
    yPos = addSectionTitle(doc, yPos, 'Multi-Modality Treatment Plan');

    if (tp.preOpTriamcinolone?.enabled) {
      yPos = checkNewPage(doc, yPos, 15);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`A. Pre-Op Triamcinolone: ${tp.preOpTriamcinolone.numberOfSessions} sessions (q3 weekly)`, margin, yPos);
      yPos += 6;
    }
    if (tp.surgery?.planned) {
      yPos = checkNewPage(doc, yPos, 10);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      const surgDate = tp.surgery.schedule?.plannedDate ? format(new Date(tp.surgery.schedule.plannedDate), 'dd MMM yyyy') : 'Date TBD';
      doc.text(`B. Surgical Excision: ${surgDate}`, margin, yPos);
      yPos += 6;
    }
    if (tp.postOpTriamcinolone?.enabled) {
      yPos = checkNewPage(doc, yPos, 10);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`C. Post-Op Triamcinolone: ${tp.postOpTriamcinolone.numberOfSessions} sessions (q3 weekly)`, margin, yPos);
      yPos += 6;
    }
    if (tp.siliconeCompression) {
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`D. Silicone & Compression: ${tp.siliconeCompression.durationWeeks || 24} weeks`, margin, yPos);
      yPos += 6;
    }
    if (tp.radiotherapy?.indicated) {
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`E. Radiotherapy: ${tp.radiotherapy.timing}`, margin, yPos);
      yPos += 6;
    }
  }

  // Consent
  yPos = checkNewPage(doc, yPos, 20);
  yPos = addSectionTitle(doc, yPos, 'Patient Education & Consent');
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  [
    { label: 'Multi-modality approach explained', value: plan.multiModalityExplained },
    { label: 'Compliance importance discussed', value: plan.complianceImportanceExplained },
    { label: 'Patient consent obtained', value: plan.patientConsentObtained },
  ].forEach(item => {
    yPos = checkNewPage(doc, yPos, 6);
    // Draw checkbox rectangle
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, yPos - 3, 3.5, 3.5);
    if (item.value) {
      // Draw X inside checkbox
      doc.setLineWidth(0.5);
      doc.line(margin + 2.3, yPos - 2.7, margin + 5.2, yPos + 0.2);
      doc.line(margin + 5.2, yPos - 2.7, margin + 2.3, yPos + 0.2);
    }
    doc.setLineWidth(0.1);
    doc.text(`  ${item.label}`, margin + 7, yPos);
    yPos += 5;
  });

  // Footer
  yPos += 4;
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Created by: ${plan.createdByName || 'Unknown'} | ${plan.createdAt ? format(new Date(plan.createdAt), 'dd MMM yyyy, HH:mm') : 'N/A'}`, margin, yPos);
  doc.setTextColor(0, 0, 0);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages);
  }

  const patientName = patient ? `${patient.firstName}_${patient.lastName}` : 'patient';
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `Keloid_Care_Plan_${patientName}_${dateStr}.pdf`;

  return {
    blob: doc.output('blob'),
    fileName,
  };
}

/**
 * Generate Keloid Care Plan HTML for 80mm thermal printer
 * Font: Georgia, Size: 12, Width: 80mm
 */
export function generateKeloidThermalPrintHTML(
  plan: any,
  patient: any,
  hospital: any
): string {
  const tp = plan.treatmentPlan as any;
  const assessments = (plan.keloidAssessments || []) as KeloidAssessment[];
  const tests = (plan.preTriamcinoloneTests || []) as PreTriamcinoloneTestStatus[];
  const hospitalName = hospital?.name || hospital?.hospitalName || 'AstroHEALTH Facility';
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  const hospitalNum = patient?.hospitalNumber || 'N/A';

  const preOpSchedule = (tp?.preOpTriamcinolone?.schedule || []) as TriamcinoloneSchedule[];
  const postOpSchedule = (tp?.postOpTriamcinolone?.schedule || []) as TriamcinoloneSchedule[];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Keloid Care Plan - ${patientName}</title>
  <style>
    @media print {
      @page { margin: 2mm; size: 80mm auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12px;
      font-weight: 700;
      margin: 0;
      padding: 4mm;
      width: 80mm;
      max-width: 80mm;
      color: #000;
      line-height: 1.3;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .hospital-name {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1px;
    }
    .subtitle {
      font-size: 11px;
      margin-top: 2px;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .patient-section {
      border: 1px solid #000;
      padding: 6px;
      margin-bottom: 8px;
    }
    .patient-name {
      font-size: 13px;
      font-weight: 700;
    }
    .patient-detail {
      font-size: 11px;
      margin-top: 2px;
    }
    .section {
      margin-bottom: 8px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-bottom: 4px;
    }
    .item {
      font-size: 11px;
      margin-bottom: 2px;
      padding-left: 4px;
    }
    .keloid-box {
      border: 1px solid #000;
      padding: 4px 6px;
      margin-bottom: 4px;
    }
    .keloid-location {
      font-size: 12px;
      font-weight: 700;
    }
    .keloid-detail {
      font-size: 10px;
      margin-top: 1px;
    }
    .treatment-box {
      border: 1px dashed #000;
      padding: 4px 6px;
      margin-bottom: 4px;
    }
    .treatment-label {
      font-size: 11px;
      font-weight: 700;
    }
    .treatment-value {
      font-size: 10px;
      margin-top: 1px;
    }
    .schedule-item {
      font-size: 10px;
      padding-left: 8px;
    }
    .test-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
      border-bottom: 1px dotted #ccc;
      padding-bottom: 1px;
    }
    .consent-box {
      border: 1px solid #000;
      padding: 6px;
      margin-top: 8px;
    }
    .consent-item {
      font-size: 10px;
      margin-bottom: 2px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 2px solid #000;
      text-align: center;
      font-size: 9px;
    }
    .meta-row {
      font-size: 9px;
      margin-bottom: 1px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-name">${hospitalName.toUpperCase()}</div>
    <div class="subtitle">Surgical EMR & Patient Management</div>
    <div class="doc-title">KELOID CARE PLAN</div>
  </div>

  <div class="patient-section">
    <div class="patient-name">${patientName}</div>
    <div class="patient-detail">Hosp No: ${hospitalNum} | Age: ${plan.patientAge || 'N/A'} | Gender: ${(plan.patientGender || 'N/A').charAt(0).toUpperCase() + (plan.patientGender || '').slice(1)}</div>
    <div class="patient-detail">Status: ${(plan.status || 'active').toUpperCase()}</div>
  </div>

  <div class="section">
    <div class="section-title">Clinical Summary</div>
    <div class="item">${plan.clinicalSummary || 'No summary'}</div>
    ${plan.diagnosisDate ? `<div class="item" style="font-size:10px;">Diagnosis: ${format(new Date(plan.diagnosisDate), 'dd MMM yyyy')}</div>` : ''}
  </div>

  ${assessments.length > 0 ? `
  <div class="section">
    <div class="section-title">Keloid Assessment (${assessments.length})</div>
    ${assessments.map((a, i) => `
    <div class="keloid-box">
      <div class="keloid-location">#${i + 1} ${a.location}</div>
      <div class="keloid-detail">Size: ${a.size.length}×${a.size.width}×${a.size.height} ${a.size.unit}</div>
      <div class="keloid-detail">Vascularity: ${a.vascularity} | Firmness: ${a.firmness}</div>
      ${a.symptoms?.length > 0 ? `<div class="keloid-detail">Symptoms: ${a.symptoms.join(', ')}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}

  ${plan.identifiedProblems?.length > 0 ? `
  <div class="section">
    <div class="section-title">Problems</div>
    ${plan.identifiedProblems.map((p: string) => `<div class="item">• ${p}</div>`).join('')}
  </div>` : ''}

  ${plan.comorbidities?.length > 0 || plan.hasNoComorbidities ? `
  <div class="section">
    <div class="section-title">Comorbidities</div>
    ${plan.hasNoComorbidities ? '<div class="item">None</div>' : plan.comorbidities.map((c: string) => `<div class="item">• ${c}</div>`).join('')}
  </div>` : ''}

  ${tests.length > 0 ? `
  <div class="section">
    <div class="section-title">Pre-Treatment Tests</div>
    ${tests.map(t => `
    <div class="test-row">
      <span>${t.testName}</span>
      <span>${t.status === 'completed' ? '✓' : t.status === 'not_required' ? '—' : '○'} ${t.status.replace('_', ' ')}</span>
    </div>`).join('')}
  </div>` : ''}

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">Treatment Plan</div>

    ${tp?.preOpTriamcinolone?.enabled ? `
    <div class="treatment-box">
      <div class="treatment-label">A. Pre-Op Triamcinolone</div>
      <div class="treatment-value">${tp.preOpTriamcinolone.numberOfSessions} sessions, every 3 weeks</div>
      ${preOpSchedule.length > 0 ? preOpSchedule.map(s => `<div class="schedule-item">#${s.sessionNumber}: ${format(new Date(s.scheduledDate), 'dd MMM yyyy')}</div>`).join('') : ''}
    </div>` : ''}

    ${tp?.surgery?.planned ? `
    <div class="treatment-box">
      <div class="treatment-label">B. Surgical Excision</div>
      <div class="treatment-value">${tp.surgery.schedule?.plannedDate ? format(new Date(tp.surgery.schedule.plannedDate), 'dd MMM yyyy') : 'Date TBD'}</div>
    </div>` : ''}

    ${tp?.postOpTriamcinolone?.enabled ? `
    <div class="treatment-box">
      <div class="treatment-label">C. Post-Op Triamcinolone</div>
      <div class="treatment-value">${tp.postOpTriamcinolone.numberOfSessions} sessions, every 3 weeks</div>
      ${postOpSchedule.length > 0 ? postOpSchedule.map(s => `<div class="schedule-item">#${s.sessionNumber}: ${format(new Date(s.scheduledDate), 'dd MMM yyyy')}</div>`).join('') : ''}
    </div>` : ''}

    ${tp?.siliconeCompression ? `
    <div class="treatment-box">
      <div class="treatment-label">D. Silicone & Compression</div>
      <div class="treatment-value">Duration: ${tp.siliconeCompression.durationWeeks || 24} weeks</div>
      ${tp.siliconeCompression.siliconeSheetStartDate ? `<div class="treatment-value">Silicone from: ${format(new Date(tp.siliconeCompression.siliconeSheetStartDate), 'dd MMM yyyy')}</div>` : ''}
    </div>` : ''}

    ${tp?.radiotherapy?.indicated ? `
    <div class="treatment-box">
      <div class="treatment-label">E. Radiotherapy</div>
      <div class="treatment-value">Timing: ${tp.radiotherapy.timing}</div>
      ${tp.radiotherapy.indications?.length > 0 ? tp.radiotherapy.indications.map((ind: string) => `<div class="schedule-item">• ${ind}</div>`).join('') : ''}
    </div>` : ''}
  </div>

  <div class="consent-box">
    <div class="section-title" style="margin-bottom:4px">Consent</div>
    <div class="consent-item">${plan.multiModalityExplained ? '☑' : '☐'} Multi-modality explained</div>
    <div class="consent-item">${plan.complianceImportanceExplained ? '☑' : '☐'} Compliance discussed</div>
    <div class="consent-item">${plan.patientConsentObtained ? '☑' : '☐'} Patient consent obtained</div>
  </div>

  <div class="footer">
    <div class="meta-row">Created by: ${plan.createdByName || 'Unknown'}</div>
    <div class="meta-row">${plan.createdAt ? format(new Date(plan.createdAt), 'dd MMM yyyy, HH:mm') : 'N/A'}</div>
    <div class="meta-row" style="margin-top:4px;">AstroHEALTH — Innovations in Healthcare</div>
  </div>
</body>
</html>`;
}
