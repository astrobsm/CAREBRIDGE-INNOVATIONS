/**
 * STI Protocol PDF Generator
 * Generates A4 PDF documents for Patient Education, Lab Panels, and Treatment Protocols
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  PATIENT_EDUCATION_MODULES,
  LAB_PANELS,
  TREATMENT_PROTOCOLS,
} from '../data/stiProtocolData';

// ===== HELPERS =====
function addPageHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

  // Hospital header
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.text('ASTROHEALTH HEALTHCARE', pageWidth / 2, y + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.text('Plastic & Reconstructive Surgery Department', pageWidth / 2, y + 10, { align: 'center' });

  // Title
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text(title.toUpperCase(), pageWidth / 2, y + 20, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.text(subtitle, pageWidth / 2, y + 26, { align: 'center' });
  }

  // Line separator
  y += 30;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // Date
  doc.setFontSize(7);
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageWidth - margin, y + 4, { align: 'right' });

  return y + 8;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 20): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 15) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), pageHeight, 'F');
    return 15;
  }
  return y;
}

function addTextBlock(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number = 9): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const lineHeight = fontSize * 0.45;
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight + 2);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

// ===== PATIENT EDUCATION PDF =====
export function generatePatientEducationPDF(moduleId?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  const modules = moduleId
    ? PATIENT_EDUCATION_MODULES.filter(m => m.id === moduleId)
    : PATIENT_EDUCATION_MODULES;

  modules.forEach((mod, idx) => {
    if (idx > 0) doc.addPage();

    let y = addPageHeader(doc, mod.title, `For: ${mod.targetAudience}`);

    // Content sections
    mod.content.forEach((section) => {
      y = checkPageBreak(doc, y, 15);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text(section.heading, margin, y);
      y += 5;

      doc.setFont('times', 'normal');
      y = addTextBlock(doc, section.body, margin, y, contentWidth, 9);
      y += 3;
    });

    // Warning Signs
    y = checkPageBreak(doc, y, 20);
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 240, 240);
    const warningH = 6 + mod.warningSignsToReport.length * 4.5;
    doc.rect(margin, y - 2, contentWidth, Math.min(warningH, 60), 'FD');

    doc.setTextColor(180, 0, 0);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('⚠ WARNING SIGNS TO REPORT IMMEDIATELY', margin + 3, y + 3);
    y += 7;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 0, 0);
    mod.warningSignsToReport.forEach((w) => {
      y = checkPageBreak(doc, y, 5);
      doc.text(`• ${w}`, margin + 4, y);
      y += 4.5;
    });
    y += 3;

    // Self-Care Instructions
    y = checkPageBreak(doc, y, 15);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('SELF-CARE INSTRUCTIONS', margin, y);
    y += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    mod.selfCareInstructions.forEach((s) => {
      y = checkPageBreak(doc, y, 5);
      doc.text(`✓ ${s}`, margin + 3, y);
      y += 4.5;
    });
    y += 3;

    // Follow-Up Guidance
    y = checkPageBreak(doc, y, 15);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('FOLLOW-UP GUIDANCE', margin, y);
    y += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    mod.followUpGuidance.forEach((f) => {
      y = checkPageBreak(doc, y, 5);
      doc.text(`→ ${f}`, margin + 3, y);
      y += 4.5;
    });

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('This information is for educational purposes. Always follow your doctor\'s advice.', pageWidth / 2, pageH - 8, { align: 'center' });
    doc.text('AstroHEALTH - Soft Tissue Infection Protocol', pageWidth / 2, pageH - 4, { align: 'center' });
  });

  return doc;
}

// ===== LAB PANELS PDF =====
export function generateLabPanelsPDF(panelId?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  const panels = panelId
    ? LAB_PANELS.filter(p => p.id === panelId)
    : LAB_PANELS;

  let y = addPageHeader(doc, 'Soft Tissue Infection - Lab Panels', 'Investigation & Monitoring Protocol');

  panels.forEach((panel, idx) => {
    y = checkPageBreak(doc, y, 30);

    // Panel title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text(panel.name, margin, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.text(`Frequency: ${panel.frequency}  |  Applicable to: ${panel.applicableStages.join(', ')}`, margin, y);
    y += 5;

    // Table header
    const colWidths = [contentWidth * 0.25, contentWidth * 0.30, contentWidth * 0.30, contentWidth * 0.15];
    const headers = ['Test', 'Rationale', 'Expected Abnormality', 'Urgency'];

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 3, contentWidth, 6, 'F');
    doc.setFontSize(7);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0);

    let xPos = margin + 1;
    headers.forEach((h, i) => {
      doc.text(h, xPos, y);
      xPos += colWidths[i];
    });
    y += 5;

    // Table rows
    doc.setFont('times', 'normal');
    doc.setFontSize(7);
    panel.tests.forEach((test) => {
      y = checkPageBreak(doc, y, 8);

      // Row background (alternate)
      xPos = margin + 1;
      doc.setTextColor(0, 0, 0);

      // Test name (bold)
      doc.setFont('times', 'bold');
      const nameLines = doc.splitTextToSize(test.testName, colWidths[0] - 2);
      nameLines.forEach((line: string, li: number) => {
        doc.text(line, xPos, y + (li * 3));
      });
      doc.setFont('times', 'normal');

      // Rationale
      const ratLines = doc.splitTextToSize(test.rationale, colWidths[1] - 2);
      ratLines.forEach((line: string, li: number) => {
        doc.text(line, xPos + colWidths[0], y + (li * 3));
      });

      // Expected abnormality
      const abnLines = doc.splitTextToSize(test.expectedAbnormality || '—', colWidths[2] - 2);
      abnLines.forEach((line: string, li: number) => {
        doc.text(line, xPos + colWidths[0] + colWidths[1], y + (li * 3));
      });

      // Urgency
      const urgencyText = test.urgency.toUpperCase();
      if (test.urgency === 'stat') doc.setTextColor(200, 0, 0);
      else if (test.urgency === 'urgent') doc.setTextColor(180, 120, 0);
      else doc.setTextColor(0, 120, 0);
      doc.setFont('times', 'bold');
      doc.text(urgencyText, xPos + colWidths[0] + colWidths[1] + colWidths[2], y);
      doc.setFont('times', 'normal');
      doc.setTextColor(0, 0, 0);

      const maxLines = Math.max(nameLines.length, ratLines.length, abnLines.length);
      y += Math.max(5, maxLines * 3 + 2);

      // Row separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 1.5, margin + contentWidth, y - 1.5);
    });

    y += 5;
    if (idx < panels.length - 1) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, y - 2, margin + contentWidth, y - 2);
      y += 3;
    }
  });

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('AstroHEALTH - STI/NEC Lab Investigation Protocol', pageWidth / 2, pageH - 4, { align: 'center' });

  return doc;
}

// ===== TREATMENT PROTOCOL PDF =====
export function generateTreatmentProtocolPDF(protocolId?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  const protocols = protocolId
    ? TREATMENT_PROTOCOLS.filter(p => p.id === protocolId)
    : TREATMENT_PROTOCOLS;

  protocols.forEach((proto, idx) => {
    if (idx > 0) doc.addPage();

    let y = addPageHeader(doc, proto.stage, `Severity: ${proto.severity.toUpperCase()}`);

    // Antibiotics
    y = checkPageBreak(doc, y, 10);
    doc.setTextColor(0, 0, 140);
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text('ANTIBIOTIC REGIMENS', margin, y);
    y += 5;

    proto.antibiotics.forEach((abx) => {
      y = checkPageBreak(doc, y, 25);

      doc.setFillColor(240, 245, 255);
      doc.rect(margin, y - 3, contentWidth, 18, 'F');

      doc.setTextColor(0, 0, 120);
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.text(abx.drug, margin + 2, y);

      const routeColor = abx.route === 'IV' ? [200, 0, 0] : abx.route === 'IM' ? [180, 120, 0] : [0, 120, 0];
      doc.setTextColor(routeColor[0], routeColor[1], routeColor[2]);
      doc.setFontSize(8);
      doc.text(abx.route, pageWidth - margin - 8, y);

      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      y += 4;
      doc.text(`Dose: ${abx.dose}  |  Frequency: ${abx.frequency}  |  Duration: ${abx.duration}`, margin + 2, y);
      y += 3.5;
      doc.text(`Indication: ${abx.indication}`, margin + 2, y);

      if (abx.alternatives.length > 0) {
        y += 3.5;
        doc.text(`Alternatives: ${abx.alternatives.join('; ')}`, margin + 2, y);
      }

      if (abx.contraindications.length > 0) {
        y += 3.5;
        doc.setTextColor(180, 0, 0);
        doc.text(`Contraindications: ${abx.contraindications.join(', ')}`, margin + 2, y);
        doc.setTextColor(0, 0, 0);
      }

      y += 6;
    });

    // Surgical Interventions
    if (proto.surgicalInterventions.length > 0) {
      y = checkPageBreak(doc, y, 15);
      doc.setTextColor(180, 0, 0);
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('SURGICAL INTERVENTIONS', margin, y);
      y += 5;

      proto.surgicalInterventions.forEach((sx) => {
        y = checkPageBreak(doc, y, 15);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('times', 'bold');
        doc.text(sx.procedure, margin + 2, y);
        y += 4;
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text(`Indication: ${sx.indication}`, margin + 2, y);
        y += 3.5;
        doc.setTextColor(180, 0, 0);
        doc.text(`Timing: ${sx.timing}`, margin + 2, y);
        doc.setTextColor(0, 0, 0);
        y += 4;

        doc.setFontSize(8);
        doc.setFont('times', 'bold');
        doc.text('Technique:', margin + 2, y);
        y += 3;
        doc.setFont('times', 'normal');
        sx.technique.forEach((t, j) => {
          y = checkPageBreak(doc, y, 4);
          doc.text(`${j + 1}. ${t}`, margin + 5, y);
          y += 3.5;
        });
        y += 2;

        doc.setFont('times', 'bold');
        doc.text('Post-Op Care:', margin + 2, y);
        y += 3;
        doc.setFont('times', 'normal');
        sx.postoperativeCare.forEach((c) => {
          y = checkPageBreak(doc, y, 4);
          doc.text(`• ${c}`, margin + 5, y);
          y += 3.5;
        });

        y += 2;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        y = addTextBlock(doc, `Expected: ${sx.expectedOutcome}`, margin + 2, y, contentWidth - 4, 7);
        doc.setTextColor(0, 0, 0);
        y += 3;
      });
    }

    // Supportive Care
    y = checkPageBreak(doc, y, 10);
    doc.setTextColor(0, 100, 0);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('SUPPORTIVE CARE', margin, y);
    y += 4;
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    proto.supportiveCare.forEach((s) => {
      y = checkPageBreak(doc, y, 4);
      doc.text(`• ${s}`, margin + 3, y);
      y += 3.5;
    });
    y += 3;

    // Monitoring
    y = checkPageBreak(doc, y, 10);
    doc.setTextColor(0, 0, 140);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('MONITORING', margin, y);
    y += 4;
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    proto.monitoring.forEach((m) => {
      y = checkPageBreak(doc, y, 4);
      doc.text(`• ${m}`, margin + 3, y);
      y += 3.5;
    });
    y += 3;

    // Escalation Criteria
    y = checkPageBreak(doc, y, 15);
    doc.setFillColor(255, 245, 230);
    doc.setDrawColor(200, 150, 0);
    doc.setLineWidth(0.3);
    const escH = 6 + proto.escalationCriteria.length * 4;
    doc.rect(margin, y - 2, contentWidth, Math.min(escH, 50), 'FD');

    doc.setTextColor(180, 100, 0);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('ESCALATION CRITERIA', margin + 3, y + 2);
    y += 6;

    doc.setTextColor(150, 80, 0);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    proto.escalationCriteria.forEach((e) => {
      y = checkPageBreak(doc, y, 4);
      doc.text(`⚠ ${e}`, margin + 5, y);
      y += 3.5;
    });
    y += 3;

    // Comorbidity Modifications
    if (proto.comorbidityModifications.length > 0) {
      y = checkPageBreak(doc, y, 10);
      doc.setTextColor(100, 0, 130);
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.text('COMORBIDITY MODIFICATIONS', margin, y);
      y += 5;

      proto.comorbidityModifications.forEach((cm) => {
        y = checkPageBreak(doc, y, 15);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('times', 'bold');
        doc.text(cm.comorbidity, margin + 2, y);
        y += 4;

        doc.setFont('times', 'normal');
        doc.setFontSize(8);

        doc.setFont('times', 'bold');
        doc.text('Modifications:', margin + 3, y);
        y += 3;
        doc.setFont('times', 'normal');
        cm.modifications.forEach((m) => {
          y = checkPageBreak(doc, y, 4);
          doc.text(`• ${m}`, margin + 6, y);
          y += 3.5;
        });

        doc.setFont('times', 'bold');
        doc.text('Additional Monitoring:', margin + 3, y);
        y += 3;
        doc.setFont('times', 'normal');
        cm.additionalMonitoring.forEach((m) => {
          y = checkPageBreak(doc, y, 4);
          doc.text(`• ${m}`, margin + 6, y);
          y += 3.5;
        });

        doc.setFont('times', 'bold');
        doc.text('Special Considerations:', margin + 3, y);
        y += 3;
        doc.setFont('times', 'normal');
        doc.setTextColor(180, 80, 0);
        cm.specialConsiderations.forEach((s) => {
          y = checkPageBreak(doc, y, 4);
          doc.text(`⚠ ${s}`, margin + 6, y);
          y += 3.5;
        });
        doc.setTextColor(0, 0, 0);
        y += 3;
      });
    }

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('AstroHEALTH - STI/NEC Treatment Protocol', pageWidth / 2, pageH - 4, { align: 'center' });
  });

  return doc;
}
