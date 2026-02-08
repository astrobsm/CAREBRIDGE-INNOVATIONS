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

  // ================== DETAILED PATIENT DEMOGRAPHICS ==================
  yPos = checkNewPage(doc, yPos, 40);
  yPos = addSectionTitle(doc, yPos, 'Patient Demographics & Clinical Identifiers');

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const colWidth = contentWidth / 2;
  const demoRows: [string, string, string, string][] = [
    ['Date of Birth:', patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A',
     'Blood Group:', patient?.bloodGroup || 'N/A'],
    ['Genotype:', patient?.genotype || 'N/A',
     'Marital Status:', patient?.maritalStatus ? patient.maritalStatus.charAt(0).toUpperCase() + patient.maritalStatus.slice(1) : 'N/A'],
    ['Phone:', patient?.phone || 'N/A',
     'Alt. Phone:', patient?.alternatePhone || 'N/A'],
    ['Occupation:', patient?.occupation ? patient.occupation.charAt(0).toUpperCase() + patient.occupation.slice(1) : 'N/A',
     'Religion:', patient?.religion || 'N/A'],
    ['Address:', [patient?.address, patient?.city, patient?.state].filter(Boolean).join(', ') || 'N/A',
     'Tribe:', patient?.tribe || 'N/A'],
  ];

  demoRows.forEach(([label1, val1, label2, val2]) => {
    yPos = checkNewPage(doc, yPos, 5);
    doc.setFont('times', 'bold');
    doc.text(label1, margin, yPos);
    doc.setFont('times', 'normal');
    doc.text(val1, margin + 28, yPos);
    doc.setFont('times', 'bold');
    doc.text(label2, margin + colWidth, yPos);
    doc.setFont('times', 'normal');
    doc.text(val2, margin + colWidth + 28, yPos);
    yPos += 5;
  });

  // Allergies
  const allergies = patient?.allergies as string[] | undefined;
  if (allergies && allergies.length > 0) {
    yPos = checkNewPage(doc, yPos, 6);
    doc.setFont('times', 'bold');
    doc.text('Allergies:', margin, yPos);
    doc.setFont('times', 'normal');
    doc.setTextColor(180, 0, 0);
    doc.text(allergies.join(', '), margin + 28, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 5;
  }

  // Chronic Conditions
  const chronic = patient?.chronicConditions as string[] | undefined;
  if (chronic && chronic.length > 0) {
    yPos = checkNewPage(doc, yPos, 6);
    doc.setFont('times', 'bold');
    doc.text('Chronic Conditions:', margin, yPos);
    doc.setFont('times', 'normal');
    doc.text(chronic.join(', '), margin + 38, yPos);
    yPos += 5;
  }

  // Next of Kin
  const nok = patient?.nextOfKin as { name?: string; relationship?: string; phone?: string; address?: string } | undefined;
  if (nok?.name) {
    yPos = checkNewPage(doc, yPos, 10);
    yPos += 2;
    doc.setFont('times', 'bold');
    doc.text('Next of Kin:', margin, yPos);
    doc.setFont('times', 'normal');
    const nokInfo = [nok.name, nok.relationship, nok.phone, nok.address].filter(Boolean).join(' | ');
    doc.text(nokInfo, margin + 28, yPos);
    yPos += 5;
  }

  yPos += 3;

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

  // ================== PATIENT EDUCATION ==================
  yPos = checkNewPage(doc, yPos, 30);
  yPos = addSectionTitle(doc, yPos, 'Patient Education — Understanding Your Keloid Treatment');

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // What is a Keloid
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('What is a Keloid?', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const keloidDesc = doc.splitTextToSize(
    'A keloid is a type of raised scar that grows beyond the boundaries of the original wound. Unlike normal scars, keloids continue to grow due to excessive collagen production. They can occur after surgery, burns, piercings, acne, or minor skin injuries. Keloids are more common in people with darker skin tones and may run in families. They are benign (non-cancerous) but can cause pain, itching, tenderness, and cosmetic concern.',
    contentWidth
  );
  doc.text(keloidDesc, margin, yPos);
  yPos += keloidDesc.length * 3.8 + 3;

  // Why Multi-Modality
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('Why Multiple Treatments Are Needed', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const multiDesc = doc.splitTextToSize(
    'Keloids have a high recurrence rate (up to 50-80%) when treated with surgery alone. Research shows that combining multiple treatment modalities significantly reduces recurrence rates to 10-20%. Your care plan uses a multi-modality approach tailored to your specific keloid characteristics for the best possible outcome.',
    contentWidth
  );
  doc.text(multiDesc, margin, yPos);
  yPos += multiDesc.length * 3.8 + 3;

  // Triamcinolone education
  if (tp?.preOpTriamcinolone?.enabled || tp?.postOpTriamcinolone?.enabled) {
    yPos = checkNewPage(doc, yPos, 30);
    doc.setFont('times', 'bold');
    doc.text('Triamcinolone (Steroid) Injections', margin, yPos);
    yPos += 4;
    doc.setFont('times', 'normal');
    const triamEdu = [
      '- What it does: Reduces collagen production, softens the scar, and decreases inflammation.',
      '- Frequency: Given every 3 weeks to allow tissue response between sessions.',
      '- What to expect: Stinging during injection. Keloid softens and flattens progressively.',
      '- Possible side effects: Temporary skin lightening, skin thinning, telangiectasia. Usually reversible.',
      '- Important: Completing ALL scheduled sessions is critical. Missing sessions may allow keloid regrowth.',
    ];
    triamEdu.forEach(line => {
      yPos = checkNewPage(doc, yPos, 5);
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(wrapped, margin + 2, yPos);
      yPos += wrapped.length * 3.8 + 1;
    });
    yPos += 2;
  }

  // Surgery education
  if (tp?.surgery?.planned) {
    yPos = checkNewPage(doc, yPos, 25);
    doc.setFont('times', 'bold');
    doc.text('Surgical Excision', margin, yPos);
    yPos += 4;
    doc.setFont('times', 'normal');
    const surgEdu = [
      '- Procedure: Keloid is excised with precise technique to minimise wound tension.',
      '- Performed under local anaesthesia. Stitches will be reviewed and removed as advised.',
      '- Post-surgery: Keep wound clean and dry. Avoid stretching the surgical site.',
      '- Surgery alone has high recurrence. Additional treatments (injections, silicone, compression) are essential.',
    ];
    surgEdu.forEach(line => {
      yPos = checkNewPage(doc, yPos, 5);
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(wrapped, margin + 2, yPos);
      yPos += wrapped.length * 3.8 + 1;
    });
    yPos += 2;
  }

  // Silicone & Compression education
  yPos = checkNewPage(doc, yPos, 25);
  doc.setFont('times', 'bold');
  doc.text('Silicone Sheet & Compression Therapy', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const siliconeWeeks = tp?.siliconeCompression?.durationWeeks || 24;
  const siliconeEdu = [
    '- How it works: Silicone creates a moist environment that regulates collagen. Compression flattens the scar.',
    `- Duration: Must be worn for at least ${siliconeWeeks} weeks (~${Math.round(siliconeWeeks / 4)} months). Longer use reduces recurrence.`,
    '- Silicone sheets: Wear 12-23 hours/day. Wash daily with mild soap. Replace when adhesion is lost.',
    '- Compression garments: Wear continuously except when bathing.',
    '- Expected: Gradual softening, flattening, and lightening. Full results after 3-6 months of consistent use.',
  ];
  siliconeEdu.forEach(line => {
    yPos = checkNewPage(doc, yPos, 5);
    const wrapped = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(wrapped, margin + 2, yPos);
    yPos += wrapped.length * 3.8 + 1;
  });
  yPos += 2;

  // Radiotherapy education
  if (tp?.radiotherapy?.indicated) {
    yPos = checkNewPage(doc, yPos, 30);
    doc.setFont('times', 'bold');
    doc.text('Low-Dose Radiotherapy', margin, yPos);
    yPos += 4;
    doc.setFont('times', 'normal');
    const radioEdu = [
      '- Purpose: Destroys rapidly dividing fibroblast cells that cause keloid growth.',
      '- Timing: Most effective within 24-72 hours after surgical excision.',
      '- Safety: Low-dose superficial radiation targets skin surface only. Risk of complications is very low.',
      '- Side effects: Skin redness (resolves in days-weeks), temporary darkening (2-4 weeks), mild dryness, itching.',
      '- Success: Combined with surgery, reduces recurrence to approximately 10-20%.',
    ];
    radioEdu.forEach(line => {
      yPos = checkNewPage(doc, yPos, 5);
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(wrapped, margin + 2, yPos);
      yPos += wrapped.length * 3.8 + 1;
    });
    yPos += 2;
  }

  // Expected Outcomes
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('Expected Treatment Outcomes', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const outcomes = [
    '- Significant reduction in keloid size and height',
    '- Relief from pain, itching, and tenderness',
    '- Improved cosmetic appearance and restored function',
    '- Reduced psychological distress and improved quality of life',
    '- Recurrence rate reduced to 10-20% with full compliance (vs 50-80% with surgery alone)',
  ];
  outcomes.forEach(line => {
    yPos = checkNewPage(doc, yPos, 4);
    doc.text(line, margin + 2, yPos);
    yPos += 3.8;
  });
  yPos += 3;

  // Compliance
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('Importance of Compliance', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const compliance = [
    '- Attend ALL scheduled appointments — each session is carefully timed for maximum effectiveness',
    '- Wear silicone/compression daily — inconsistent use significantly increases recurrence risk',
    '- Do not skip injections — the protocol depends on cumulative effect',
    '- Report concerns early — redness, swelling, pain, or infection signs',
    '- Follow-up visits are essential — monitoring allows early detection of recurrence',
    '- Long-term monitoring — check-ups recommended for at least 12-24 months after treatment',
  ];
  compliance.forEach(line => {
    yPos = checkNewPage(doc, yPos, 5);
    const wrapped = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(wrapped, margin + 2, yPos);
    yPos += wrapped.length * 3.8 + 1;
  });
  yPos += 3;

  // When to Contact Doctor
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('When to Contact Your Doctor', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const warnings = [
    '- Signs of wound infection (pus, increasing redness, fever)',
    '- Severe pain not controlled by prescribed medication',
    '- Rapid regrowth of the keloid after treatment',
    '- Allergic reaction to medications or silicone',
    '- Excessive skin thinning or colour change at injection site',
    '- Radiotherapy side effects persisting beyond 2 weeks',
  ];
  warnings.forEach(line => {
    yPos = checkNewPage(doc, yPos, 4);
    doc.text(line, margin + 2, yPos);
    yPos += 3.8;
  });
  yPos += 4;

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

  // ================== DETAILED PATIENT DEMOGRAPHICS ==================
  yPos = checkNewPage(doc, yPos, 40);
  yPos = addSectionTitle(doc, yPos, 'Patient Demographics & Clinical Identifiers');

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const colWidth = contentWidth / 2;
  const demoRows: [string, string, string, string][] = [
    ['Date of Birth:', patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A',
     'Blood Group:', patient?.bloodGroup || 'N/A'],
    ['Genotype:', patient?.genotype || 'N/A',
     'Marital Status:', patient?.maritalStatus ? patient.maritalStatus.charAt(0).toUpperCase() + patient.maritalStatus.slice(1) : 'N/A'],
    ['Phone:', patient?.phone || 'N/A',
     'Alt. Phone:', patient?.alternatePhone || 'N/A'],
    ['Occupation:', patient?.occupation ? patient.occupation.charAt(0).toUpperCase() + patient.occupation.slice(1) : 'N/A',
     'Religion:', patient?.religion || 'N/A'],
    ['Address:', [patient?.address, patient?.city, patient?.state].filter(Boolean).join(', ') || 'N/A',
     'Tribe:', patient?.tribe || 'N/A'],
  ];

  demoRows.forEach(([label1, val1, label2, val2]) => {
    yPos = checkNewPage(doc, yPos, 5);
    doc.setFont('times', 'bold');
    doc.text(label1, margin, yPos);
    doc.setFont('times', 'normal');
    doc.text(val1, margin + 28, yPos);
    doc.setFont('times', 'bold');
    doc.text(label2, margin + colWidth, yPos);
    doc.setFont('times', 'normal');
    doc.text(val2, margin + colWidth + 28, yPos);
    yPos += 5;
  });

  const blobAllergies = patient?.allergies as string[] | undefined;
  if (blobAllergies && blobAllergies.length > 0) {
    yPos = checkNewPage(doc, yPos, 6);
    doc.setFont('times', 'bold');
    doc.text('Allergies:', margin, yPos);
    doc.setFont('times', 'normal');
    doc.setTextColor(180, 0, 0);
    doc.text(blobAllergies.join(', '), margin + 28, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 5;
  }

  const blobChronic = patient?.chronicConditions as string[] | undefined;
  if (blobChronic && blobChronic.length > 0) {
    yPos = checkNewPage(doc, yPos, 6);
    doc.setFont('times', 'bold');
    doc.text('Chronic Conditions:', margin, yPos);
    doc.setFont('times', 'normal');
    doc.text(blobChronic.join(', '), margin + 38, yPos);
    yPos += 5;
  }

  const blobNok = patient?.nextOfKin as { name?: string; relationship?: string; phone?: string; address?: string } | undefined;
  if (blobNok?.name) {
    yPos = checkNewPage(doc, yPos, 10);
    yPos += 2;
    doc.setFont('times', 'bold');
    doc.text('Next of Kin:', margin, yPos);
    doc.setFont('times', 'normal');
    const nokInfo = [blobNok.name, blobNok.relationship, blobNok.phone, blobNok.address].filter(Boolean).join(' | ');
    doc.text(nokInfo, margin + 28, yPos);
    yPos += 5;
  }

  yPos += 3;

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

  // ================== PATIENT EDUCATION ==================
  yPos = checkNewPage(doc, yPos, 30);
  yPos = addSectionTitle(doc, yPos, 'Patient Education — Understanding Your Keloid Treatment');

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // What is a Keloid
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('What is a Keloid?', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const bKeloidDesc = doc.splitTextToSize(
    'A keloid is a type of raised scar that grows beyond the boundaries of the original wound. Unlike normal scars, keloids continue to grow due to excessive collagen production. They can occur after surgery, burns, piercings, acne, or minor skin injuries. Keloids are more common in people with darker skin tones and may run in families. They are benign (non-cancerous) but can cause pain, itching, tenderness, and cosmetic concern.',
    contentWidth
  );
  doc.text(bKeloidDesc, margin, yPos);
  yPos += bKeloidDesc.length * 3.8 + 3;

  // Why Multi-Modality
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('Why Multiple Treatments Are Needed', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const bMultiDesc = doc.splitTextToSize(
    'Keloids have a high recurrence rate (up to 50-80%) when treated with surgery alone. Research shows that combining multiple treatment modalities significantly reduces recurrence rates to 10-20%. Your care plan uses a multi-modality approach tailored to your specific keloid characteristics.',
    contentWidth
  );
  doc.text(bMultiDesc, margin, yPos);
  yPos += bMultiDesc.length * 3.8 + 3;

  // Triamcinolone
  if (tp?.preOpTriamcinolone?.enabled || tp?.postOpTriamcinolone?.enabled) {
    yPos = checkNewPage(doc, yPos, 25);
    doc.setFont('times', 'bold');
    doc.text('Triamcinolone (Steroid) Injections', margin, yPos);
    yPos += 4;
    doc.setFont('times', 'normal');
    const bTriam = [
      '- Reduces collagen production, softens the scar, and decreases inflammation.',
      '- Given every 3 weeks. You may feel stinging during injection.',
      '- Possible side effects: Temporary skin lightening, skin thinning. Usually reversible.',
      '- Completing ALL scheduled sessions is critical to prevent keloid regrowth.',
    ];
    bTriam.forEach(line => {
      yPos = checkNewPage(doc, yPos, 5);
      const w = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(w, margin + 2, yPos);
      yPos += w.length * 3.8 + 1;
    });
    yPos += 2;
  }

  // Surgery
  if (tp?.surgery?.planned) {
    yPos = checkNewPage(doc, yPos, 20);
    doc.setFont('times', 'bold');
    doc.text('Surgical Excision', margin, yPos);
    yPos += 4;
    doc.setFont('times', 'normal');
    const bSurg = [
      '- Keloid is excised with precise technique under local anaesthesia.',
      '- Keep wound clean and dry. Avoid stretching the surgical site.',
      '- Surgery alone has high recurrence. Additional treatments are essential.',
    ];
    bSurg.forEach(line => {
      yPos = checkNewPage(doc, yPos, 5);
      const w = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(w, margin + 2, yPos);
      yPos += w.length * 3.8 + 1;
    });
    yPos += 2;
  }

  // Silicone & Compression
  yPos = checkNewPage(doc, yPos, 20);
  doc.setFont('times', 'bold');
  doc.text('Silicone Sheet & Compression Therapy', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const bSilW = tp?.siliconeCompression?.durationWeeks || 24;
  const bSilEdu = [
    '- Silicone creates a moist environment regulating collagen. Compression flattens the scar.',
    `- Must be worn for at least ${bSilW} weeks (~${Math.round(bSilW / 4)} months).`,
    '- Silicone: 12-23 hours/day. Compression: continuously except bathing.',
    '- Gradual softening and flattening. Full results after 3-6 months of consistent use.',
  ];
  bSilEdu.forEach(line => {
    yPos = checkNewPage(doc, yPos, 5);
    const w = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(w, margin + 2, yPos);
    yPos += w.length * 3.8 + 1;
  });
  yPos += 2;

  // Radiotherapy
  if (tp?.radiotherapy?.indicated) {
    yPos = checkNewPage(doc, yPos, 20);
    doc.setFont('times', 'bold');
    doc.text('Low-Dose Radiotherapy', margin, yPos);
    yPos += 4;
    doc.setFont('times', 'normal');
    const bRadio = [
      '- Destroys fibroblast cells causing keloid growth. Most effective within 24-72 hrs after surgery.',
      '- Low-dose superficial radiation; risk of complications is very low.',
      '- Side effects: Temporary redness, darkening, dryness, itching — usually self-resolving.',
      '- Combined with surgery, reduces recurrence to approximately 10-20%.',
    ];
    bRadio.forEach(line => {
      yPos = checkNewPage(doc, yPos, 5);
      const w = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(w, margin + 2, yPos);
      yPos += w.length * 3.8 + 1;
    });
    yPos += 2;
  }

  // Expected Outcomes + Compliance
  yPos = checkNewPage(doc, yPos, 25);
  doc.setFont('times', 'bold');
  doc.text('Expected Outcomes & Compliance', margin, yPos);
  yPos += 4;
  doc.setFont('times', 'normal');
  const bOutcomes = [
    '- Significant reduction in keloid size, pain, itching, and tenderness.',
    '- Improved cosmetic appearance and quality of life.',
    '- Recurrence reduced to 10-20% with full compliance (vs 50-80% with surgery alone).',
    '- Attend ALL appointments. Wear silicone/compression daily. Do not skip injections.',
    '- Report concerns early: infection signs, severe pain, rapid regrowth, or allergic reactions.',
    '- Long-term monitoring recommended for 12-24 months after treatment completion.',
  ];
  bOutcomes.forEach(line => {
    yPos = checkNewPage(doc, yPos, 5);
    const w = doc.splitTextToSize(line, contentWidth - 4);
    doc.text(w, margin + 2, yPos);
    yPos += w.length * 3.8 + 1;
  });
  yPos += 4;

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
    <div class="patient-detail">DOB: ${patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A'} | Blood Grp: ${patient?.bloodGroup || 'N/A'} | Genotype: ${patient?.genotype || 'N/A'}</div>
    <div class="patient-detail">Phone: ${patient?.phone || 'N/A'}${patient?.alternatePhone ? ' | Alt: ' + patient.alternatePhone : ''}</div>
    <div class="patient-detail">Marital Status: ${patient?.maritalStatus ? patient.maritalStatus.charAt(0).toUpperCase() + patient.maritalStatus.slice(1) : 'N/A'} | Occupation: ${patient?.occupation || 'N/A'}</div>
    <div class="patient-detail">Address: ${[patient?.address, patient?.city, patient?.state].filter(Boolean).join(', ') || 'N/A'}</div>
    ${(patient?.allergies as string[] | undefined)?.length ? `<div class="patient-detail" style="color:#900;">Allergies: ${(patient.allergies as string[]).join(', ')}</div>` : ''}
    ${(patient?.chronicConditions as string[] | undefined)?.length ? `<div class="patient-detail">Chronic: ${(patient.chronicConditions as string[]).join(', ')}</div>` : ''}
    ${patient?.nextOfKin?.name ? `<div class="patient-detail">NOK: ${patient.nextOfKin.name} (${patient.nextOfKin.relationship || 'N/A'}) Ph: ${patient.nextOfKin.phone || 'N/A'}</div>` : ''}
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

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">PATIENT EDUCATION</div>
    <div class="item" style="font-weight:bold;margin-bottom:3px;">What is a Keloid?</div>
    <div class="item">A keloid is a raised scar that grows beyond the original wound due to excessive collagen. They are benign but can cause pain, itching, and cosmetic concern. They are more common in darker skin and may be hereditary.</div>

    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Why Multiple Treatments?</div>
    <div class="item">Surgery alone has 50-80% recurrence. Combining treatments (injections + surgery + silicone/compression${tp?.radiotherapy?.indicated ? ' + radiotherapy' : ''}) reduces recurrence to 10-20%.</div>

    ${tp?.preOpTriamcinolone?.enabled || tp?.postOpTriamcinolone?.enabled ? `
    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Steroid Injections</div>
    <div class="item">Given every 3 weeks. Softens and flattens the keloid. May cause temporary skin lightening. Complete ALL sessions.</div>` : ''}

    ${tp?.surgery?.planned ? `
    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Surgical Excision</div>
    <div class="item">Keloid removed under local anaesthesia. Keep wound clean. Additional treatments essential to prevent recurrence.</div>` : ''}

    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Silicone & Compression</div>
    <div class="item">Wear silicone 12-23 hrs/day, compression continuously. Duration: ${tp?.siliconeCompression?.durationWeeks || 24} weeks. Results in 3-6 months.</div>

    ${tp?.radiotherapy?.indicated ? `
    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Radiotherapy</div>
    <div class="item">Low-dose radiation within 24-72 hrs after surgery. Side effects mild and temporary (redness, darkening). Very effective.</div>` : ''}

    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Expected Outcomes</div>
    <div class="item">Smaller, softer keloid. Pain/itch relief. Better appearance. 10-20% recurrence with compliance.</div>

    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Compliance is Critical</div>
    <div class="item">Attend ALL appointments. Wear silicone/compression daily. Do not skip injections. Report any infection, pain, or regrowth immediately.</div>

    <div class="item" style="font-weight:bold;margin-top:4px;margin-bottom:3px;">Contact Doctor If:</div>
    <div class="item">Infection signs (pus, redness, fever) | Severe uncontrolled pain | Rapid keloid regrowth | Allergic reaction | Skin thinning | Persistent side effects</div>
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
