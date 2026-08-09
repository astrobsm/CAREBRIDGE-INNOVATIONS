/**
 * Tumour Board PDF generation — standardised on utils/pdfUtils + utils/pdfConfig,
 * like the other document generators in this codebase.
 *
 * Four documents, each with a different reader in mind:
 *   1. Board summary   — the case record: staging timeline, plan, decisions
 *   2. Referral letters — one per specialty, each on its own page so it can be sent alone
 *   3. Surveillance    — the follow-up schedule, grouped by phase
 *   4. Counselling     — written FOR THE PATIENT, deliberately plainer typography
 *
 * The counselling document is set larger and with more leading than the
 * clinical ones. That is not decoration: it is read by people who are
 * frightened, often older, and frequently in poor light on a ward.
 *
 * Every export carries the ratification status, because a plan the board has
 * not yet ratified must never leave the building looking like one it has.
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { PDF_COLORS, addBrandedHeader, addBrandedFooter } from '../../../utils/pdfUtils';
import { PDF_FONTS, PDF_FONT_SIZES, PDF_MARGINS, sanitizeTextForPDF } from '../../../utils/pdfConfig';
import type { StageResult } from './oncology/stagingEngine';
import type { ManagementPlan } from './oncology/managementPlan';
import { SPECIALTY_LABELS } from './oncology/managementPlan';
import type { ReferralLetter } from './oncology/referralLetters';
import type { SurveillancePlan } from './oncology/surveillance';
import type { CounsellingDocument } from './oncology/counselling';
import type { TumourBoardAssessment, TumourBoardCase } from '../tumourBoardTypes';
import { createSafePDF } from '../../../utils/pdfTextSafe';

const clean = (t: string | undefined | null): string => sanitizeTextForPDF(t || '');

const safeDate = (v?: string | null, fallback = ''): string => {
  if (!v) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : format(d, 'dd MMM yyyy');
};

export interface DocHeader {
  title: string;
  patientName?: string;
  hospitalNumber?: string;
  diagnosis?: string;
  boardDate?: string;
  /** Shown as a prominent banner when false — see the note at the top. */
  ratified?: boolean;
}

const DRAFT_NOTICE =
  'DECISION-SUPPORT DRAFT — not yet ratified by the multidisciplinary tumour board.';

/** Branded banner + patient block. Returns the y position to continue from. */
function header(doc: jsPDF, meta: DocHeader): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;

  let y = addBrandedHeader(doc, {
    title: meta.title,
    subtitle: 'Multidisciplinary Oncology Record',
    hospitalName: 'AstroHEALTH',
  });

  const lines = [
    meta.patientName ? `Patient: ${clean(meta.patientName)}` : null,
    meta.hospitalNumber ? `Hospital Number: ${clean(meta.hospitalNumber)}` : null,
    meta.diagnosis ? `Diagnosis: ${clean(meta.diagnosis)}` : null,
    meta.boardDate ? `Tumour board: ${safeDate(meta.boardDate)}` : null,
  ].filter(Boolean) as string[];

  if (lines.length) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(PDF_MARGINS.left, y, contentWidth, lines.length * 6 + 5, 'FD');
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setTextColor(0, 0, 0);
    let ly = y + 6;
    for (const line of lines) {
      doc.text(line, PDF_MARGINS.left + 3, ly);
      ly += 6;
    }
    y = ly + 3;
  }

  if (meta.ratified === false) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(...PDF_COLORS.warning);
    doc.rect(PDF_MARGINS.left, y, contentWidth, 9, 'FD');
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(PDF_FONT_SIZES.badge);
    doc.setTextColor(120, 53, 15);
    doc.text(DRAFT_NOTICE, PDF_MARGINS.left + 3, y + 6);
    doc.setTextColor(0, 0, 0);
    doc.setFont(PDF_FONTS.primary, 'normal');
    y += 14;
  }

  return y;
}

/** Page-break-aware paragraph writer. Returns the new y. */
function writeBlock(
  doc: jsPDF,
  text: string,
  y: number,
  opts: { size?: number; bold?: boolean; lineHeight?: number } = {},
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PDF_MARGINS.left - PDF_MARGINS.right;
  const size = opts.size ?? PDF_FONT_SIZES.body;
  const lh = opts.lineHeight ?? 5.5;

  doc.setFontSize(size);
  doc.setFont(PDF_FONTS.primary, opts.bold ? 'bold' : 'normal');
  doc.setTextColor(0, 0, 0);

  for (const line of doc.splitTextToSize(clean(text), maxWidth) as string[]) {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = PDF_MARGINS.top;
    }
    doc.text(line, PDF_MARGINS.left, y);
    y += lh;
  }
  return y;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 35) {
    doc.addPage();
    y = PDF_MARGINS.top;
  }
  y += 3;
  doc.setFontSize(PDF_FONT_SIZES.sectionHeader);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(clean(title), PDF_MARGINS.left, y);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGINS.left, y + 1.5, PDF_MARGINS.left + doc.getTextWidth(clean(title)), y + 1.5);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  return y + 8;
}

/** Stamp the branded footer onto every page once the body is complete. */
function stampFooters(doc: jsPDF, customText?: string): void {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    addBrandedFooter(doc, p, total, customText);
  }
}

const fileTag = (meta: { hospitalNumber?: string }): string =>
  (meta.hospitalNumber || 'patient').replace(/[^A-Za-z0-9_-]+/g, '-');

// ── 1. Board summary ─────────────────────────────────────────────────────

export function generateBoardSummaryPdf(args: {
  case: TumourBoardCase;
  assessments: TumourBoardAssessment[];
  stage: StageResult;
  plan: ManagementPlan;
  patientName?: string;
  hospitalNumber?: string;
  boardDate?: string;
  ratified?: boolean;
}): void {
  const doc = createSafePDF('p', 'mm', 'a4');
  let y = header(doc, {
    title: 'Tumour Board Case Summary',
    patientName: args.patientName,
    hospitalNumber: args.hospitalNumber || args.case.hospitalNumber,
    diagnosis: args.case.diagnosis,
    boardDate: args.boardDate,
    ratified: args.ratified ?? false,
  });

  y = sectionTitle(doc, 'Current Stage', y);
  y = writeBlock(doc, args.stage.formatted, y, { bold: true });
  y = writeBlock(doc, `Staging system: ${args.stage.stagingSystem} (${args.stage.basis} staging)`, y);
  if (args.stage.stageDescription) y = writeBlock(doc, args.stage.stageDescription, y);
  y += 3;

  // The staging timeline is the reason this module exists — show every version,
  // oldest first, so the reader can see what was known when.
  y = sectionTitle(doc, 'Staging Timeline', y);
  const ordered = [...args.assessments].sort((a, b) => (a.version || 0) - (b.version || 0));
  if (!ordered.length) {
    y = writeBlock(doc, 'No assessments recorded.', y);
  }
  for (const a of ordered) {
    y = writeBlock(doc, `v${a.version} — ${a.basis} staging — ${safeDate(a.assessedAt)}`, y, { bold: true });
    y = writeBlock(doc, `  ${a.stageFormatted || `${a.tCategory} ${a.nCategory} ${a.mCategory}`}`, y);
    if (a.histologicType) y = writeBlock(doc, `  Histology: ${a.histologicType}`, y);
    if (a.histologicGrade) y = writeBlock(doc, `  Grade: ${a.histologicGrade}`, y);
    if (a.localSpread) y = writeBlock(doc, `  Local spread: ${a.localSpread}`, y);
    if (a.regionalSpread) y = writeBlock(doc, `  Regional spread: ${a.regionalSpread}`, y);
    if (a.metastaticSpread) y = writeBlock(doc, `  Metastatic spread: ${a.metastaticSpread}`, y);
    if (a.margins) y = writeBlock(doc, `  Margins: ${a.margins}`, y);
    if (a.molecularFindings) y = writeBlock(doc, `  Molecular: ${a.molecularFindings}`, y);
    if (a.notes) y = writeBlock(doc, `  Notes: ${a.notes}`, y);
    y += 2;
  }

  y = sectionTitle(doc, 'Multimodality Management Plan', y);
  y = writeBlock(doc, `Treatment intent: ${args.plan.intent}`, y, { bold: true });
  y += 2;
  for (const item of args.plan.items) {
    y = writeBlock(doc, `[${item.strength.toUpperCase()}] ${item.title}`, y, { bold: true });
    y = writeBlock(doc, `  ${item.detail}`, y);
    y = writeBlock(doc, `  Owner: ${SPECIALTY_LABELS[item.owner]}  |  Basis: ${item.basis}`, y, { size: 8 });
    y += 2;
  }

  if (args.plan.caveats.length) {
    y = sectionTitle(doc, 'Caveats', y);
    for (const c of args.plan.caveats) y = writeBlock(doc, `- ${c}`, y);
  }

  stampFooters(doc, args.ratified ? undefined : DRAFT_NOTICE);
  doc.save(`tumour-board-summary-${fileTag({ hospitalNumber: args.hospitalNumber || args.case.hospitalNumber })}.pdf`);
}

// ── 2. Referral letters ──────────────────────────────────────────────────

function urgencyBanner(doc: jsPDF, letter: ReferralLetter, y: number): number {
  if (letter.urgency === 'routine') return y;
  // Urgency has to be impossible to miss on a printed letter.
  const label = letter.urgency === 'two_week' ? 'URGENT — CANCER PATHWAY' : 'URGENT';
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.4);
  doc.rect(PDF_MARGINS.left, y, pageWidth - PDF_MARGINS.left - PDF_MARGINS.right, 9, 'FD');
  doc.setTextColor(153, 27, 27);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.text(label, PDF_MARGINS.left + 3, y + 6);
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setLineWidth(0.3);
  return y + 14;
}

export function generateReferralLetterPdf(letter: ReferralLetter, meta: DocHeader): void {
  const doc = createSafePDF('p', 'mm', 'a4');
  let y = header(doc, { ...meta, title: `Referral — ${letter.specialtyLabel}` });
  y = urgencyBanner(doc, letter, y);
  y = writeBlock(doc, letter.subject, y, { bold: true });
  y += 4;
  writeBlock(doc, letter.body, y);
  stampFooters(doc, meta.ratified === false ? DRAFT_NOTICE : undefined);
  doc.save(`referral-${letter.specialty}-${fileTag(meta)}.pdf`);
}

/** Every letter in one file, each starting on a fresh page for separation. */
export function generateAllReferralLettersPdf(letters: ReferralLetter[], meta: DocHeader): void {
  if (!letters.length) return;
  const doc = createSafePDF('p', 'mm', 'a4');
  letters.forEach((letter, index) => {
    if (index > 0) doc.addPage();
    let y = header(doc, { ...meta, title: `Referral — ${letter.specialtyLabel}` });
    y = urgencyBanner(doc, letter, y);
    y = writeBlock(doc, letter.subject, y, { bold: true });
    y += 4;
    writeBlock(doc, letter.body, y);
  });
  stampFooters(doc, meta.ratified === false ? DRAFT_NOTICE : undefined);
  doc.save(`referrals-${fileTag(meta)}.pdf`);
}

// ── 3. Surveillance schedule ─────────────────────────────────────────────

export function generateSurveillancePdf(plan: SurveillancePlan, meta: DocHeader): void {
  const doc = createSafePDF('p', 'mm', 'a4');
  let y = header(doc, { ...meta, title: 'Treatment Monitoring & Surveillance Schedule' });

  y = writeBlock(doc, plan.narrative, y);
  y += 4;
  y = writeBlock(doc, `Planned surveillance duration: ${plan.durationYears} years. Basis: ${plan.basis}`, y, { size: 8 });
  y += 4;

  let currentPhase = '';
  for (const item of plan.items) {
    if (item.phase !== currentPhase) {
      currentPhase = item.phase;
      y = sectionTitle(doc, currentPhase, y);
    }
    y = writeBlock(doc, `${item.dueDate}  —  ${item.title}`, y, { bold: true });
    y = writeBlock(doc, `   ${item.detail}`, y, { size: 9 });
    y += 1;
  }

  stampFooters(doc);
  doc.save(`surveillance-schedule-${fileTag(meta)}.pdf`);
}

// ── 4. Patient & family counselling ──────────────────────────────────────

export function generateCounsellingPdf(document_: CounsellingDocument, meta: DocHeader): void {
  const doc = createSafePDF('p', 'mm', 'a4');
  // No draft banner on this one: it goes home with a family, and the
  // disclaimer at the foot already says the plan may change.
  let y = header(doc, { ...meta, title: 'Information For You And Your Family', ratified: undefined });

  // Larger type and more leading throughout: see the note at the top of this file.
  const bodySize = PDF_FONT_SIZES.body + 1;
  const lineHeight = 6.5;

  for (const section of document_.sections) {
    y = sectionTitle(doc, section.heading, y);
    y = writeBlock(doc, section.body, y, { size: bodySize, lineHeight });
    y += 3;
  }

  y = sectionTitle(doc, 'Questions you may want to ask us', y);
  for (const q of document_.questionsToAsk) {
    y = writeBlock(doc, `-  ${q}`, y, { size: bodySize, lineHeight });
  }
  y += 3;

  // Red flags get a visual box — this is the section that has to be findable in
  // a hurry, by someone who is worried at 2am.
  y = sectionTitle(doc, 'When to contact us urgently', y);
  const pageWidth = doc.internal.pageSize.getWidth();
  const startPage = doc.getNumberOfPages();
  const boxTop = y - 4;
  let boxY = y;
  for (const flag of document_.redFlags) {
    boxY = writeBlock(doc, `-  ${flag}`, boxY, { size: bodySize, lineHeight });
  }
  // Only draw the outline when the whole block stayed on one page — a rectangle
  // spanning a page break renders as a stray line across the paper.
  if (doc.getNumberOfPages() === startPage) {
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.rect(PDF_MARGINS.left - 2, boxTop, pageWidth - PDF_MARGINS.left - PDF_MARGINS.right + 4, boxY - boxTop);
    doc.setLineWidth(0.3);
  }
  y = boxY + 8;

  y = sectionTitle(doc, 'Please note', y);
  writeBlock(doc, document_.disclaimer, y, { size: bodySize - 1, lineHeight: 6 });

  stampFooters(doc, 'Please bring this document with you to your next appointment.');
  doc.save(`patient-information-${fileTag(meta)}.pdf`);
}
