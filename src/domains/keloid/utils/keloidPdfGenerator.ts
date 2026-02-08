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
    yPos = addSectionTitle(doc, yPos, `Keloid Assessment(s) — ${assessments.length} site(s)`);

    assessments.forEach((assess, idx) => {
      yPos = checkNewPage(doc, yPos, 25);
      
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text(`Keloid #${idx + 1}: ${assess.location}`, margin, yPos);
      yPos += 5;

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const details = [
        `Size: ${assess.size.length} × ${assess.size.width} × ${assess.size.height} ${assess.size.unit}`,
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
      const statusSymbol = test.status === 'completed' ? '✓' :
                          test.status === 'not_required' ? '—' :
                          test.status === 'ordered' ? '◷' : '○';
      doc.text(`${statusSymbol}  ${test.testName}  (${test.status.replace('_', ' ')})`, margin + 2, yPos);
      yPos += 4.5;
    });

    yPos += 2;
    const allCleared = tests.every(t => t.status === 'completed' || t.status === 'not_required');
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(allCleared ? PDF_COLORS.success : PDF_COLORS.warning));
    doc.text(
      allCleared ? '✓ All required tests cleared — safe to proceed' : '⚠ Some tests still pending',
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
    const symbol = item.value ? '☑' : '☐';
    doc.text(`${symbol}  ${item.label}`, margin + 2, yPos);
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
