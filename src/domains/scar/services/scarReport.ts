/**
 * The printable scar/keloid report.
 *
 * Built on the same pdfUtils/pdfConfig helpers as the other document generators
 * in this codebase, so it looks like the rest of the record rather than like
 * something bolted on.
 *
 * TWO RULES SHAPE THIS DOCUMENT
 *
 * Every figure carries where it came from. A report is read away from the
 * screen, often by someone who was not in the room, and a column of numbers
 * with no provenance invites all of them to be trusted equally. Measured,
 * examined, reported and predicted are labelled in the table itself, not in a
 * key at the end.
 *
 * Nothing is printed that was not recorded. Where a domain has no data the
 * report says so and moves on. A generated document that quietly omits its
 * gaps reads as a complete assessment, which is the failure that matters most
 * once the page leaves the building.
 *
 * The prediction section prints its EXPERIMENTAL status beside the figure
 * rather than in a footnote, for the same reason.
 */

import type jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_COLORS, addBrandedHeader, addBrandedFooter } from '../../../utils/pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES, PDF_MARGINS, sanitizeTextForPDF } from '../../../utils/pdfConfig';
import { createSafePDF } from '../../../utils/pdfTextSafe';
import { formatDateSafe } from '../../../utils/safeDate';
import type { Patient } from '../../../types';
import type { ScarOverview } from './scarService';
import type { DataOrigin, ScarAssessment } from '../types';
import { SCAR_CLASSIFICATIONS } from '../types';
import { getScale } from '../data/scales';
import { riskBand, PREDICTION_VALIDATION_STATUS } from './scarPrediction';
import { describeColour } from './colourAnalysis';

const clean = (t: string | undefined | null): string => sanitizeTextForPDF(t || '');

/** How a value's provenance is printed beside it. */
const ORIGIN_LABEL: Record<DataOrigin, string> = {
  measured: 'Measured',
  examined: 'Examination',
  reported: 'Patient',
  derived: 'Derived',
  predicted: 'Predicted',
};

interface Cursor {
  y: number;
  page: number;
}

export interface ScarReportOptions {
  overview: ScarOverview;
  patient?: Patient;
  /** Printed on the footer so a shared copy is attributable. */
  preparedBy?: string;
  /** Include the stored photographs. Off for a text-only copy. */
  includeImages?: boolean;
}

const LINE = 5;

export async function buildScarReport(options: ScarReportOptions): Promise<jsPDF> {
  const { overview, patient, includeImages = true } = options;
  const { scar, assessments, baseline, latest, treatments, changes, reading,
    intelligence, responseIndex, predictions, alerts } = overview;

  const doc = createSafePDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;

  const classification = SCAR_CLASSIFICATIONS
    .find(c => c.value === scar.classification.clinician)?.label;

  let y = addBrandedHeader(doc, {
    title: 'Scar & Keloid Longitudinal Assessment',
    subtitle: clean(scar.label),
    hospitalName: 'AstroHEALTH',
  });

  const cursor: Cursor = { y, page: 1 };

  /** Start a new page when the next block will not fit. */
  const ensure = (needed: number) => {
    if (cursor.y + needed < pageHeight - PDF_MARGINS.bottom - 8) return;
    doc.addPage();
    cursor.page += 1;
    cursor.y = PDF_MARGINS.top;
  };

  const heading = (text: string) => {
    ensure(14);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text(clean(text), PDF_MARGINS.left, cursor.y);
    cursor.y += 2;
    doc.setDrawColor(...PDF_COLORS.primary);
    doc.setLineWidth(0.4);
    doc.line(PDF_MARGINS.left, cursor.y, PDF_MARGINS.left + contentWidth, cursor.y);
    cursor.y += 6;
    doc.setTextColor(...PDF_COLORS.text);
  };

  const body = (text: string, opts: { indent?: number; italic?: boolean; size?: number } = {}) => {
    const size = opts.size ?? PDF_FONT_SIZES.body;
    doc.setFont(PDF_FONTS.primary, opts.italic ? 'italic' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...PDF_COLORS.text);
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(clean(text), contentWidth - indent) as string[];
    for (const line of lines) {
      ensure(LINE);
      doc.text(line, PDF_MARGINS.left + indent, cursor.y);
      cursor.y += LINE;
    }
  };

  /** A label/value row with its provenance in a third column. */
  const row = (label: string, value: string, origin?: string) => {
    ensure(LINE);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(clean(label), PDF_MARGINS.left, cursor.y);
    doc.text(clean(value), PDF_MARGINS.left + 62, cursor.y);
    if (origin) {
      doc.setFontSize(PDF_FONT_SIZES.body - 2);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(clean(origin), PDF_MARGINS.left + contentWidth, cursor.y, { align: 'right' });
      doc.setTextColor(...PDF_COLORS.text);
    }
    cursor.y += LINE;
  };

  const gap = (mm = 3) => { cursor.y += mm; };

  // ── Patient and scar ──────────────────────────────────────────────────────
  heading('Patient and lesion');
  if (patient) {
    row('Patient', `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim());
    row('Folder number', patient.hospitalNumber ?? 'not recorded');
  } else {
    body('Patient record not attached to this export.', { italic: true });
  }
  row('Scar', clean(scar.label));
  row('Site', `${scar.anatomicalSite}${scar.laterality !== 'not_applicable' ? ` (${scar.laterality})` : ''}`);
  row('Classification', classification ?? 'not yet classified',
    scar.classification.clinician ? 'Clinician' : undefined);
  if (scar.onsetAt) {
    row('Since', formatDateSafe(scar.onsetAt, 'MMM yyyy'));
  }
  if (scar.causeOfScar) row('Cause', scar.causeOfScar);
  if (scar.originalWoundAreaCm2 != null) {
    row('Original wound', `${scar.originalWoundAreaCm2} cm²`,
      scar.originalWoundSource === 'traced' ? 'Measured' : 'Recorded');
  }
  row('Assessments', String(assessments.length));
  if (baseline) row('Baseline', formatDateSafe(baseline.assessedAt, 'd MMM yyyy'));
  if (latest) row('Most recent', formatDateSafe(latest.assessedAt, 'd MMM yyyy'));
  gap();

  // ── The overall read ──────────────────────────────────────────────────────
  heading('Overall assessment');
  body(reading.headline);
  gap(1);
  body(`Confidence in the direction: ${reading.confidence.replace('_', ' ')}.`, { italic: true });
  gap(2);
  for (const line of intelligence.whatChanged) body(`- ${line}`, { indent: 3 });
  if (reading.conflicts.length) {
    gap(2);
    body('Points of caution:', { italic: true });
    for (const c of reading.conflicts) body(`- ${c}`, { indent: 3 });
  }
  gap();

  // ── Domain table ──────────────────────────────────────────────────────────
  heading('Measurements over time');
  if (!changes.length) {
    body('No domain has been measured yet.', { italic: true });
  } else {
    ensure(LINE);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(PDF_FONT_SIZES.body - 1);
    doc.text('Domain', PDF_MARGINS.left, cursor.y);
    doc.text('Baseline', PDF_MARGINS.left + 52, cursor.y);
    doc.text('Current', PDF_MARGINS.left + 78, cursor.y);
    doc.text('Change', PDF_MARGINS.left + 104, cursor.y);
    doc.text('Trend', PDF_MARGINS.left + 130, cursor.y);
    doc.text('Source', PDF_MARGINS.left + contentWidth, cursor.y, { align: 'right' });
    cursor.y += LINE - 1;
    doc.setDrawColor(...PDF_COLORS.primary);
    doc.setLineWidth(0.2);
    doc.line(PDF_MARGINS.left, cursor.y, PDF_MARGINS.left + contentWidth, cursor.y);
    cursor.y += 4;

    doc.setFont(PDF_FONTS.primary, 'normal');
    for (const c of changes) {
      ensure(LINE);
      const change = c.percentChangeFromBaseline != null
        ? `${c.percentChangeFromBaseline > 0 ? '+' : ''}${c.percentChangeFromBaseline}%`
        : c.absoluteChangeFromBaseline != null
          ? `${c.absoluteChangeFromBaseline > 0 ? '+' : ''}${c.absoluteChangeFromBaseline}`
          : '-';
      doc.setFontSize(PDF_FONT_SIZES.body - 1);
      doc.text(clean(c.label), PDF_MARGINS.left, cursor.y);
      doc.text(c.baselineValue != null ? `${c.baselineValue} ${c.unit}` : '-', PDF_MARGINS.left + 52, cursor.y);
      doc.text(c.currentValue != null ? `${c.currentValue} ${c.unit}` : '-', PDF_MARGINS.left + 78, cursor.y);
      doc.text(change, PDF_MARGINS.left + 104, cursor.y);
      doc.text(clean(c.trend.replace('_', ' ')), PDF_MARGINS.left + 130, cursor.y);
      doc.text(ORIGIN_LABEL[c.origin], PDF_MARGINS.left + contentWidth, cursor.y, { align: 'right' });
      cursor.y += LINE;
    }

    // Limitations belong with the numbers, not in an appendix nobody reads.
    const limits = changes.flatMap(c => c.limitations.map(l => `${c.label}: ${l}`));
    if (limits.length) {
      gap(2);
      doc.setFontSize(PDF_FONT_SIZES.body - 2);
      for (const l of limits) body(`- ${l}`, { indent: 3, italic: true, size: PDF_FONT_SIZES.body - 2 });
    }
  }
  gap();

  // ── Latest assessment detail ──────────────────────────────────────────────
  if (latest) {
    heading(`Most recent assessment — ${formatDateSafe(latest.assessedAt, 'd MMM yyyy')}`);
    row('Measurement quality', latest.quality, undefined);
    row('Assessment completeness', `${latest.completenessPercent}%`);
    for (const r of latest.qualityReasons) body(`- ${r}`, { indent: 3, italic: true });
    gap(2);

    const m = latest.morphometry;
    if (m) {
      row('Area', m.areaCm2 != null ? `${m.areaCm2} cm²` : 'not measured', 'Measured');
      row('Perimeter', m.perimeterCm != null ? `${m.perimeterCm} cm` : 'not measured', 'Measured');
      row('Max length x width',
        m.maxLengthCm != null ? `${m.maxLengthCm} x ${m.maxWidthCm ?? '-'} cm` : 'not measured', 'Measured');
      row('Border irregularity',
        m.borderIrregularity != null ? String(m.borderIrregularity) : 'not measured', 'Measured');
      if (m.extensionBeyondOriginalPercent != null) {
        row('Beyond original wound', `${m.extensionBeyondOriginalPercent}%`, 'Measured');
      }
    }

    const t = latest.threeD;
    if (t) {
      row('Max elevation', t.maxElevationMm != null ? `${t.maxElevationMm} mm` : 'not measured',
        t.maxElevationMm != null ? 'Measured' : undefined);
      row('Volume', t.volumeCm3 != null ? `${t.volumeCm3} cm³` : 'not measured',
        t.volumeCm3 != null ? 'Derived' : undefined);
      if (t.maxElevationMm == null) {
        for (const l of t.limitations.slice(0, 2)) {
          body(`- ${l}`, { indent: 3, italic: true, size: PDF_FONT_SIZES.body - 2 });
        }
      }
    }

    if (latest.colour) {
      row('Colour vs adjacent skin', `Delta-E 2000 ${latest.colour.deltaE2000}`, 'Measured');
      for (const line of describeColour(latest.colour)) {
        body(`- ${line}`, { indent: 3, size: PDF_FONT_SIZES.body - 1 });
      }
    }
    gap();

    // ── Examination ─────────────────────────────────────────────────────────
    const e = latest.exam;
    if (e && Object.keys(e).length) {
      heading('Physical examination');
      const pretty = (s?: string) => (s ? s.replace(/_/g, ' ') : 'not recorded');
      row('Pliability', pretty(e.pliability), 'Examination');
      row('Consistency', pretty(e.consistency), 'Examination');
      row('Mobility', pretty(e.mobility), 'Examination');
      row('Tenderness', pretty(e.tenderness), 'Examination');
      if (e.contracturePresent) {
        row('Contracture', `${e.contractureJoint ?? 'present'}${
          e.romRestrictionDegrees != null ? `, ${e.romRestrictionDegrees} deg restriction` : ''}`,
        'Examination');
      }
      if (e.clinicianImpression) {
        gap(1);
        body(clean(e.clinicianImpression), { indent: 3 });
      }
      gap();
    }

    // ── Patient-reported ────────────────────────────────────────────────────
    const p = latest.patientReported;
    if (p && Object.keys(p).length) {
      heading('Patient-reported outcomes');
      const ask = (label: string, v?: number) => row(label, v != null ? `${v}/10` : 'not asked', 'Patient');
      ask('Pain', p.pain);
      ask('Itch', p.itch);
      ask('Tightness', p.tightness);
      ask('Concern about appearance', p.cosmeticConcern);
      ask('Functional limitation', p.functionalLimitation);
      gap();
    }

    // ── Validated scales ────────────────────────────────────────────────────
    if (latest.validatedScores?.length) {
      heading('Validated scar scales');
      for (const entry of latest.validatedScores) {
        const scale = getScale(entry.scaleId);
        const name = scale ? `${scale.name} (${scale.abbreviation}) v${entry.scaleVersion}` : entry.scaleId;
        if (entry.total == null) {
          row(name, 'incomplete — no total');
          if (entry.incompleteItems?.length) {
            body(`- ${entry.incompleteItems.length} item(s) unanswered, so no total is reported.`,
              { indent: 3, italic: true, size: PDF_FONT_SIZES.body - 2 });
          }
        } else {
          row(name, `${entry.total}${scale?.totalRange ? ` / ${scale.totalRange[1]}` : ''}`);
        }
        if (entry.subscales) {
          for (const [id, value] of Object.entries(entry.subscales)) {
            body(`- ${id}: ${value}`, { indent: 3, size: PDF_FONT_SIZES.body - 1 });
          }
        }
        if (scale?.citation) {
          body(scale.citation, { indent: 3, italic: true, size: PDF_FONT_SIZES.body - 3 });
        }
      }
      gap();
    }
  }

  // ── Treatment ─────────────────────────────────────────────────────────────
  heading('Treatment');
  if (!treatments.length) {
    body('No treatment has been recorded for this scar.', { italic: true });
  } else {
    for (const t of treatments) {
      row(formatDateSafe(t.administeredAt, 'd MMM yyyy'),
        `${t.kind.replace(/_/g, ' ')}${t.dose ? ` — ${t.dose}` : ''}${
          t.sessionNumber != null ? ` (session ${t.sessionNumber})` : ''}`);
      if (t.adverseEvents) {
        body(`- Adverse events: ${t.adverseEvents}`, { indent: 3, size: PDF_FONT_SIZES.body - 1 });
      }
    }
  }
  gap();

  // ── Response index ────────────────────────────────────────────────────────
  if (responseIndex.score != null) {
    heading('Treatment-response index');
    body(`${responseIndex.score > 0 ? '+' : ''}${responseIndex.score} — ${responseIndex.label}`);
    gap(1);
    for (const c of responseIndex.components) {
      body(`- ${c.domain}: ${c.percentChange > 0 ? '+' : ''}${c.percentChange}% `
        + `(weight ${c.weight}, contributing ${c.contribution > 0 ? '+' : ''}${c.contribution})`,
      { indent: 3, size: PDF_FONT_SIZES.body - 1 });
    }
    for (const l of responseIndex.limitations) {
      body(`- ${l}`, { indent: 3, italic: true, size: PDF_FONT_SIZES.body - 2 });
    }
    gap();
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (alerts.length) {
    heading('Clinical alerts');
    for (const a of alerts) {
      ensure(LINE * 2);
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.setFontSize(PDF_FONT_SIZES.body);
      doc.setTextColor(...(a.priority === 'high' ? PDF_COLORS.danger : PDF_COLORS.warning));
      doc.text(clean(`[${a.priority.toUpperCase()}] ${a.message}`), PDF_MARGINS.left, cursor.y);
      cursor.y += LINE;
      doc.setTextColor(...PDF_COLORS.text);
      for (const ev of a.evidence) {
        body(`- ${ev}`, { indent: 3, size: PDF_FONT_SIZES.body - 1 });
      }
      body(a.disclaimer, { indent: 3, italic: true, size: PDF_FONT_SIZES.body - 2 });
      gap(1);
    }
    gap();
  }

  // ── Predictions ───────────────────────────────────────────────────────────
  heading('Prediction');
  body(
    `All predictions below come from ${predictions[0]?.modelName ?? 'the trajectory model'} `
    + `${predictions[0]?.modelVersion ?? ''}, which is ${PREDICTION_VALIDATION_STATUS.replace('_', ' ')} `
    + 'and has not been validated against outcomes. They are decision support, not diagnosis.',
    { italic: true },
  );
  gap(2);

  for (const p of predictions) {
    ensure(LINE * 3);
    const title = p.kind === 'progression_risk' ? 'Progression risk'
      : p.kind === 'trajectory' ? 'Projected trajectory'
        : 'Treatment response';
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.text(clean(`${title} — over ${Math.round(p.horizonDays / 7)} weeks`), PDF_MARGINS.left, cursor.y);
    cursor.y += LINE;
    doc.setFont(PDF_FONTS.primary, 'normal');

    if (!p.eligible) {
      body('Not estimable.', { indent: 3 });
      for (const r of p.ineligibleReasons) body(`- ${r}`, { indent: 5, size: PDF_FONT_SIZES.body - 1 });
    } else if (p.probability != null) {
      body(`${riskBand(p.probability)} (approximately ${Math.round(p.probability * 100)}%), `
        + `confidence ${p.confidence.replace('_', ' ')}.`, { indent: 3 });
      for (const f of p.supportingFeatures) body(`- ${f}`, { indent: 5, size: PDF_FONT_SIZES.body - 1 });
    } else {
      body(`${p.projectedValue} ${p.unit} (range ${p.projectedRangeLow}-${p.projectedRangeHigh} ${p.unit}), `
        + `confidence ${p.confidence.replace('_', ' ')}.`, { indent: 3 });
      for (const f of p.supportingFeatures) body(`- ${f}`, { indent: 5, size: PDF_FONT_SIZES.body - 1 });
    }
    for (const l of p.limitations) {
      body(`- ${l}`, { indent: 5, italic: true, size: PDF_FONT_SIZES.body - 2 });
    }
    gap(2);
  }

  // ── Photographs ───────────────────────────────────────────────────────────
  if (includeImages) {
    const shots = [
      baseline?.images?.[0] ? { label: 'Baseline', image: baseline.images[0], at: baseline.assessedAt } : null,
      latest && latest.id !== baseline?.id && latest.images?.[0]
        ? { label: 'Most recent', image: latest.images[0], at: latest.assessedAt } : null,
    ].filter(Boolean) as { label: string; image: ScarAssessment['images'][number]; at: string }[];

    if (shots.length) {
      doc.addPage();
      cursor.page += 1;
      cursor.y = PDF_MARGINS.top;
      heading('Photographs');
      body(
        'Traced boundaries are drawn on the frames below, so the measurements can be checked '
        + 'against what was actually outlined.',
        { italic: true },
      );
      gap(2);

      const half = (contentWidth - 6) / 2;
      let x = PDF_MARGINS.left;
      const topY = cursor.y;
      let maxHeight = 0;

      for (const shot of shots) {
        const src = shot.image.annotatedDataUrl || shot.image.dataUrl;
        if (!src) continue;
        try {
          const props = doc.getImageProperties(src);
          const h = (props.height / props.width) * half;
          doc.setFont(PDF_FONTS.primary, 'bold');
          doc.setFontSize(PDF_FONT_SIZES.body - 1);
          doc.text(clean(`${shot.label} — ${formatDateSafe(shot.at, 'd MMM yyyy')}`), x, topY);
          doc.addImage(src, 'JPEG', x, topY + 3, half, h);
          maxHeight = Math.max(maxHeight, h);
          x += half + 6;
        } catch {
          // A frame that will not decode is skipped rather than failing the
          // whole export — the numbers matter more than the picture.
          doc.setFont(PDF_FONTS.primary, 'italic');
          doc.text(clean(`${shot.label}: image could not be embedded`), x, topY);
          x += half + 6;
        }
      }
      cursor.y = topY + maxHeight + 10;
    }
  }

  // ── Footers ───────────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addBrandedFooter(
      doc, i, total,
      options.preparedBy
        ? `Prepared by ${clean(options.preparedBy)} — ${format(new Date(), 'd MMM yyyy HH:mm')}`
        : undefined,
    );
  }

  return doc;
}

/** Build and hand the report to the browser. */
export async function downloadScarReport(options: ScarReportOptions): Promise<void> {
  const doc = await buildScarReport(options);
  const name = options.overview.scar.label.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  doc.save(`scar-report-${name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
