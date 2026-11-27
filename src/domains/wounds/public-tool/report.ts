/**
 * One wound as a PDF report, built with the app's shared jsPDF tooling
 * (createSafePDF + the branded header, section and table helpers in pdfUtils).
 * Generated on the phone; nothing is uploaded.
 */

import type jsPDF from 'jspdf';
import { createSafePDF } from '../../../utils/pdfTextSafe';
import {
  addBrandedFooter, addBrandedHeader, addSectionTitle, addSimpleTable, checkNewPage,
} from '../../../utils/pdfUtils';
import { healingAlerts } from '../services/woundAnalytics';
import { HEALING_STATUS_META } from '../monitorTypes';
import { analyticsFor } from './store';
import type { ToolAssessment, ToolWound } from './types';

export const PRACTICE_NAME = 'AstroHEALTH Services, Enugu';
export const TOOL_NAME = 'AstroHEALTH Wound Measure';

const LEFT = 12.7;

export interface ReportPhoto {
  /** JPEG data URL. */
  dataUrl: string;
  widthPx?: number;
  heightPx?: number;
}

const fmt = (v: number | null | undefined, dp = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(dp) : '-';

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const METHOD_LABEL: Record<ToolAssessment['method'], string> = {
  trace: 'Traced', auto: 'Auto', guided: 'Guided', manual: 'Manual',
};

/** Area over time, drawn with jsPDF lines. */
function drawTrend(doc: jsPDF, y: number, rows: ToolAssessment[]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const x0 = LEFT + 14;
  const w = pageWidth - LEFT * 2 - 18;
  const h = 45;
  const t = rows.map(r => new Date(r.assessedAt).getTime());
  const areas = rows.map(r => r.areaCm2);
  const tMin = Math.min(...t);
  const tMax = Math.max(...t);
  const aMax = Math.max(...areas) * 1.1 || 1;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x0, y, x0, y + h);
  doc.line(x0, y + h, x0 + w, y + h);

  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  for (let i = 0; i <= 4; i++) {
    const v = (aMax * i) / 4;
    const yy = y + h - (h * i) / 4;
    doc.text(v.toFixed(1), x0 - 2, yy + 1, { align: 'right' });
    if (i > 0) {
      doc.setDrawColor(220, 220, 220);
      doc.line(x0, yy, x0 + w, yy);
    }
  }
  doc.text('cm²', x0 - 12, y - 2);

  const px = (i: number) => (tMax === tMin ? x0 + w / 2 : x0 + ((t[i] - tMin) / (tMax - tMin)) * w);
  const py = (i: number) => y + h - (areas[i] / aMax) * h;

  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.8);
  for (let i = 1; i < rows.length; i++) doc.line(px(i - 1), py(i - 1), px(i), py(i));
  doc.setFillColor(13, 148, 136);
  rows.forEach((r, i) => {
    doc.circle(px(i), py(i), 1.1, 'F');
    doc.setTextColor(60, 60, 60);
    if (i === 0 || i === rows.length - 1 || rows.length <= 6) {
      doc.text(day(r.assessedAt), px(i), y + h + 5, { align: 'center' });
    }
  });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  return y + h + 10;
}

/** Fit a photo in a box, keeping its shape. */
function placePhoto(doc: jsPDF, photo: ReportPhoto, x: number, y: number, maxW: number, maxH: number, caption: string) {
  const ratio = photo.widthPx && photo.heightPx ? photo.widthPx / photo.heightPx : 4 / 3;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  try {
    doc.addImage(photo.dataUrl, 'JPEG', x, y, w, h);
  } catch {
    doc.rect(x, y, w, h);
    doc.text('Photo could not be added', x + 3, y + 8);
  }
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(caption, x, y + h + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  return h + 6;
}

/**
 * Build the report. `photos` maps assessment id to its stored photo; the first
 * and latest photographs are included.
 */
export function buildWoundReport(
  wound: ToolWound,
  assessments: ToolAssessment[],
  photos: Map<string, ReportPhoto> = new Map(),
): jsPDF {
  const rows = assessments.slice()
    .sort((a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime());
  const analytics = analyticsFor(rows);
  const doc = createSafePDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = addBrandedHeader(doc, {
    title: 'WOUND MEASUREMENT REPORT',
    subtitle: `${TOOL_NAME}`,
    hospitalName: PRACTICE_NAME,
  });

  y = addSectionTitle(doc, y, 'Wound');
  doc.setFontSize(10);
  const details: Array<[string, string]> = [
    ['Label', wound.patientLabel],
    ['Site', wound.site],
    ['Aetiology', wound.aetiology || 'Not recorded'],
    ['First seen', day(wound.dateFirstSeen)],
  ];
  details.forEach(([k, v], i) => {
    const x = i % 2 === 0 ? LEFT : pageWidth / 2;
    const yy = y + Math.floor(i / 2) * 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, x, yy);
    doc.setFont('helvetica', 'normal');
    doc.text(v.slice(0, 40), x + 22, yy);
  });
  y += 15;

  y = addSectionTitle(doc, y, 'Healing summary');
  const first = rows[0];
  const latest = rows[rows.length - 1];
  const summary: Array<[string, string]> = [
    ['Assessments', String(rows.length)],
    ['Status', HEALING_STATUS_META[analytics.status].label],
    ['First area', first ? `${fmt(first.areaCm2, 2)} cm² (${day(first.assessedAt)})` : '-'],
    ['Latest area', latest ? `${fmt(latest.areaCm2, 2)} cm² (${day(latest.assessedAt)})` : '-'],
    ['Area reduction', rows.length >= 2 ? `${fmt(analytics.percentAreaReduction)}%` : '-'],
    ['Rate', rows.length >= 2 ? `${fmt(analytics.velocityCm2PerWeek, 2)} cm²/week` : '-'],
  ];
  if (analytics.projectedDaysToClosure != null) {
    summary.push(['Projected closure', `about ${analytics.projectedDaysToClosure} days at this rate`]);
  }
  summary.forEach(([k, v], i) => {
    const x = i % 2 === 0 ? LEFT : pageWidth / 2;
    const yy = y + Math.floor(i / 2) * 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, x, yy);
    doc.setFont('helvetica', 'normal');
    doc.text(v, x + 36, yy);
  });
  y += Math.ceil(summary.length / 2) * 6 + 2;
  for (const alert of healingAlerts(analytics)) {
    doc.setFontSize(9);
    doc.setTextColor(150, 60, 0);
    doc.text(`! ${alert}`, LEFT, y);
    y += 5;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  if (rows.length >= 2) {
    y = checkNewPage(doc, y, 70);
    y = addSectionTitle(doc, y, 'Area over time');
    y = drawTrend(doc, y + 2, rows);
  }

  y = checkNewPage(doc, y, 30);
  y = addSectionTitle(doc, y, 'Assessments');
  const baseline = first?.areaCm2 ?? 0;
  const table = rows.map(a => [
    day(a.assessedAt),
    fmt(a.lengthCm), fmt(a.widthCm), fmt(a.areaCm2, 2), fmt(a.perimeterCm), fmt(a.depthCm),
    baseline > 0 ? `${fmt(((baseline - a.areaCm2) / baseline) * 100)}%` : '-',
    `${METHOD_LABEL[a.method]}${a.scaleReliable ? '' : ' *'}`,
  ]);
  // A page holds about 35 rows; split long histories.
  for (let i = 0; i < table.length; i += 30) {
    y = checkNewPage(doc, y, 20);
    y = addSimpleTable(
      doc, y,
      ['Date', 'L cm', 'W cm', 'Area cm²', 'Perim cm', 'Depth cm', 'Reduction', 'Method'],
      table.slice(i, i + 30),
      [28, 18, 18, 24, 22, 22, 24, 28],
    );
  }
  if (rows.some(a => !a.scaleReliable)) {
    doc.setFontSize(8);
    doc.text('* No reliable scale in the photo for this measurement: the size is approximate.', LEFT, y);
    doc.setFontSize(10);
    y += 6;
  }

  if (latest) {
    const parts: string[] = [];
    const tissue = [
      ['Granulation', latest.granulationPct], ['Slough', latest.sloughPct],
      ['Necrotic', latest.necroticPct], ['Epithelial', latest.epithelialPct],
    ].filter(([, v]) => typeof v === 'number') as Array<[string, number]>;
    if (tissue.length) parts.push(`Tissue: ${tissue.map(([k, v]) => `${k} ${Math.round(v)}%`).join(', ')}`);
    if (latest.tissueTypes?.length) parts.push(`Tissue present: ${latest.tissueTypes.join(', ')}`);
    if (latest.exudateAmount) parts.push(`Exudate: ${[latest.exudateAmount, latest.exudateType].filter(Boolean).join(', ')}`);
    if (latest.notes) parts.push(`Notes: ${latest.notes}`);
    if (parts.length) {
      y = checkNewPage(doc, y, 25);
      y = addSectionTitle(doc, y, `Latest assessment (${day(latest.assessedAt)})`);
      doc.setFontSize(10);
      for (const p of parts) {
        const lines = doc.splitTextToSize(p, pageWidth - LEFT * 2) as string[];
        y = checkNewPage(doc, y, lines.length * 5 + 2);
        doc.text(lines, LEFT, y);
        y += lines.length * 5 + 1;
      }
    }
  }

  const firstPhoto = first && photos.get(first.id);
  const latestPhoto = latest && latest !== first ? photos.get(latest.id) : undefined;
  if (firstPhoto || latestPhoto) {
    y = checkNewPage(doc, y, 80);
    y = addSectionTitle(doc, y, 'Photographs');
    const boxW = (pageWidth - LEFT * 2 - 6) / 2;
    let used = 0;
    if (firstPhoto && first) {
      used = Math.max(used, placePhoto(doc, firstPhoto, LEFT, y, boxW, 70, `First: ${day(first.assessedAt)}, ${fmt(first.areaCm2, 2)} cm²`));
    }
    if (latestPhoto && latest) {
      used = Math.max(used, placePhoto(doc, latestPhoto, LEFT + boxW + 6, y, boxW, 70, `Latest: ${day(latest.assessedAt)}, ${fmt(latest.areaCm2, 2)} cm²`));
    }
    y += used;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, pages, `Made on this phone with ${TOOL_NAME}. Not uploaded anywhere. Check the figures clinically.`);
  }
  return doc;
}

export function reportFileName(wound: ToolWound, date = new Date()): string {
  const label = wound.patientLabel.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wound';
  return `wound-report-${label}-${date.toISOString().slice(0, 10)}.pdf`;
}
