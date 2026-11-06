/**
 * The review as one branded PDF: assessment, scores, flags, plan, counselling
 * record and consent form with declaration and signature blocks.
 *
 * Two layers, as the consent generator has: a SECTION MODEL built by a pure
 * function (testable without pixels), and a renderer that draws it with the
 * shared pdfUtils helpers through createSafePDF, so nothing outside the
 * WinAnsi set reaches the page. The paragraph, bullet, declaration and
 * signature helpers are the surgical consent generator's own.
 */
import type jsPDF from 'jspdf';
import {
  addBrandedFooter, addBrandedHeader, addPatientInfoBox, addSectionTitle, addSimpleTable, checkNewPage,
  type PDFPatientInfo,
} from '../../../utils/pdfUtils';
import { PDF_MARGINS } from '../../../utils/pdfConfig';
import { createSafePDF } from '../../../utils/pdfTextSafe';
import {
  PATIENT_DECLARATION, SIGNATURE_LABELS, bullets, paragraph, signatureBlock,
} from '../../surgery/utils/surgicalDocumentGenerator';
import type { ScribePlan } from '../scribe/scribePlan';
import type { ProcedureModule, ReviewPhase, StoredProcedureReview } from './types';
import type { ReviewReading } from './engine';
import { phaseDefinition } from './phases';
import { counsellingGaps } from './consent';

export type ReviewDocKind =
  | 'summary' | 'assessment' | 'scores' | 'flags' | 'barriers' | 'comparison'
  | 'plan' | 'counselling' | 'consent' | 'declaration';

export interface ReviewDocSection {
  kind: ReviewDocKind;
  title: string;
  body?: string;
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  /** Signature lines drawn after the section. */
  signatures?: readonly string[];
}

export interface ReviewDocument {
  title: string;
  subtitle: string;
  hospitalName: string;
  patient: PDFPatientInfo;
  meta: Record<string, string>;
  sections: ReviewDocSection[];
  fileName: string;
}

export interface ReviewDocumentInput {
  module: ProcedureModule;
  phase: ReviewPhase;
  reading: ReviewReading;
  review: Pick<StoredProcedureReview, 'plan' | 'counselling' | 'counsellingPoints' | 'consent' | 'status' | 'signedByName' | 'signedAt' | 'createdByName' | 'templateVersion' | 'followUp'>;
  patient: PDFPatientInfo;
  hospitalName?: string;
  date: Date;
}

const lineText = (l: { text: string; why?: string; priority?: string; declined?: { reason: string; by?: string } }) =>
  l.declined
    ? `DECLINED (urgent, not to be acted on) — reason: ${l.declined.reason}${l.declined.by ? ` (${l.declined.by})` : ''}. Was: ${l.text}${l.why ? ` (why: ${l.why})` : ''}`
    : `${l.priority === 'urgent' ? 'URGENT: ' : ''}${l.text}${l.why ? ` (why: ${l.why})` : ''}`;

function planSections(plan: ScribePlan): ReviewDocSection[] {
  const out: ReviewDocSection[] = [];
  for (const p of plan.problems) {
    const items = (['goals', 'investigations', 'treatment', 'monitoring', 'referrals'] as const)
      .flatMap(k => p[k].map(l => `${k.charAt(0).toUpperCase() + k.slice(1)} — ${lineText(l)}`));
    if (items.length) out.push({ kind: 'plan', title: `Plan: ${p.problem}${p.code ? ` (${p.code})` : ''}`, bullets: items });
  }
  for (const c of plan.comorbidities) out.push({ kind: 'plan', title: `Plan: ${c.condition}`, bullets: c.actions.map(lineText) });
  for (const g of plan.general) out.push({ kind: 'plan', title: `Plan: ${g.heading}`, bullets: g.items.map(lineText) });
  if (plan.dischargeCriteria.length) out.push({ kind: 'plan', title: 'Discharge criteria', bullets: plan.dischargeCriteria });
  if (plan.followUp.length) out.push({ kind: 'plan', title: 'Follow-up', bullets: plan.followUp });
  if (plan.cautions.length) out.push({ kind: 'plan', title: 'Cautions', bullets: plan.cautions });
  return out;
}

const yn = (v: boolean) => (v ? 'Yes' : 'No');

/** The section model of the review PDF. Pure. */
export function buildReviewDocument(input: ReviewDocumentInput): ReviewDocument {
  const { module, phase, reading, review } = input;
  const phaseLabel = phaseDefinition(phase).label;
  const sections: ReviewDocSection[] = [];

  sections.push({
    kind: 'summary', title: 'About this review',
    body: `${module.name} — ${phaseLabel}. Structured review following: ${module.basis.join('; ')}. `
      + 'Scores and the plan are decision support, drafted from the answers recorded and subject to clinician judgement and consultant approval.',
  });

  for (const s of reading.narrative.sections) sections.push({ kind: 'assessment', title: s.title, body: s.text });

  const scored = reading.scores.filter(s => s.total != null || s.band);
  if (scored.length) {
    sections.push({
      kind: 'scores', title: 'Scores and risk',
      table: {
        headers: ['Score', 'Result', 'Band'],
        rows: scored.map(s => [s.abbreviation, s.total != null ? `${s.total}${s.max != null ? ` / ${s.max}` : ''}` : '-', s.band?.label ?? '-']),
      },
      bullets: scored.map(s => `${s.abbreviation}: ${s.band?.interpretation ?? ''}${s.incomplete.length ? ` Incomplete: ${s.incomplete.join(', ')}.` : ''} Source: ${s.source}.`),
    });
  }
  if (reading.flags.length) {
    sections.push({ kind: 'flags', title: 'Red and amber flags', bullets: reading.flags.map(f => `${f.level === 'red' ? 'RED' : 'AMBER'} — ${f.fieldLabel}: ${f.answerLabel}. ${f.reason}`) });
  }
  if (reading.barriers.length) {
    sections.push({ kind: 'barriers', title: 'Barriers to healing', bullets: reading.barriers.map(b => `${b.barrier} (${b.why})`) });
  }
  if (reading.comparison.length) {
    sections.push({ kind: 'comparison', title: 'Since the last review', bullets: reading.comparison.map(c => `${c.label}: ${c.before} -> ${c.now} (${c.delta > 0 ? '+' : ''}${c.delta}, ${c.trend}) since ${c.since}`) });
  }

  sections.push(...planSections(review.plan));

  const c = review.counselling;
  const consent = review.consent;
  const counselled = c.topicsDiscussed.length || c.decision || review.counsellingPoints.length;
  if (counselled) {
    const offered = consent?.topics ?? review.counsellingPoints.map(p => `${p.topic}: ${p.text}`);
    const gaps = counsellingGaps(c, consent);
    sections.push({
      kind: 'counselling', title: 'Counselling record',
      bullets: [
        ...offered.map(t => `[${c.topicsDiscussed.includes(t) ? 'x' : ' '}] ${t}`),
        `Questions asked and answered: ${c.questionsAsked.trim() || 'none recorded'}`,
        `Understanding checked by teach-back: ${c.understanding || 'not recorded'}`,
        `Capacity: ${c.capacity ? c.capacity.replace(/_/g, ' ') : 'not recorded'}${c.capacityNote ? ` — ${c.capacityNote}` : ''}`,
        `Language: ${c.language || 'not recorded'}; interpreter used: ${yn(c.interpreterUsed)}${c.interpreterName ? ` (${c.interpreterName})` : ''}`,
        `Written information given: ${yn(c.leafletGiven)}`,
        `Decision: ${c.decision ? c.decision.replace(/_/g, ' ') : 'not recorded'}${c.decisionNote ? ` — ${c.decisionNote}` : ''}`,
        ...(consent ? [
          `Anaesthesia agreed: ${c.anaesthesiaAgreed || 'not recorded'}`,
          `Clinical photography: ${c.photographyConsent || 'not recorded'}`,
          ...(consent.bloodProducts !== 'unlikely' ? [`Blood products: ${c.bloodConsent ? c.bloodConsent.replace('_', ' ') : 'not recorded'}`] : []),
        ] : []),
        `Consenting clinician: ${c.clinicianName || review.createdByName || 'not recorded'}${c.clinicianRole ? ` (${c.clinicianRole.replace(/_/g, ' ')})` : ''}${c.recordedAt ? `, ${c.recordedAt.slice(0, 16).replace('T', ' ')}` : ''}`,
        `Witness: ${c.witnessName || 'not recorded'}`,
        ...(gaps.length ? [`Not yet complete: ${gaps.join('; ')}`] : []),
      ],
    });
  }

  if (consent) {
    sections.push({ kind: 'consent', title: `Consent: ${consent.procedureName}`, body: 'Information for the patient, and the consent form.' });
    for (const s of consent.sections) sections.push({ kind: 'consent', title: s.title, body: s.body, bullets: s.bullets });
    sections.push({ kind: 'declaration', title: 'Patient declaration', body: PATIENT_DECLARATION, signatures: SIGNATURE_LABELS });
  }

  const status = review.status === 'signed'
    ? `Signed by ${review.signedByName || 'clinician'}${review.signedAt ? ` ${review.signedAt.slice(0, 10)}` : ''}`
    : review.status.replace(/_/g, ' ');
  const safeName = (input.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    title: phaseLabel.toUpperCase(),
    subtitle: module.name,
    hospitalName: input.hospitalName || 'AstroHEALTH',
    patient: input.patient,
    meta: {
      Procedure: module.name,
      Phase: phaseLabel,
      Date: input.date.toISOString().slice(0, 10),
      Clinician: review.createdByName || '',
      Status: status,
      Template: review.templateVersion,
    },
    sections,
    fileName: `${module.id}-${phase}-${safeName}-${input.date.toISOString().slice(0, 10)}.pdf`,
  };
}

/** Draw a review document. */
export function renderReviewDocument(d: ReviewDocument): jsPDF {
  const doc = createSafePDF('p', 'mm', 'a4');
  const width = doc.internal.pageSize.getWidth() - PDF_MARGINS.left * 2;
  let y = addBrandedHeader(doc, { title: d.title, subtitle: d.subtitle, hospitalName: d.hospitalName });
  y = addPatientInfoBox(doc, y, d.patient, Object.fromEntries(Object.entries(d.meta).filter(([, v]) => v)));
  y += 4;
  for (const s of d.sections) {
    y = checkNewPage(doc, y, s.signatures ? 90 : 24);
    y = addSectionTitle(doc, y, s.title.toUpperCase());
    y += 2;
    if (s.table) { y = addSimpleTable(doc, y, s.table.headers, s.table.rows); y += 3; }
    if (s.body) y = paragraph(doc, s.body, y, width);
    if (s.bullets?.length) y = bullets(doc, s.bullets, y, width);
    for (const label of s.signatures ?? []) y = signatureBlock(doc, label, y + 4);
    y += 4;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, pages, 'Decision support: the plan is a draft until approved by a consultant.');
  }
  return doc;
}

/** The PDF as a jsPDF document — for WhatsApp sharing, as the other generators offer. */
export const getProcedureReviewPDFDoc = (input: ReviewDocumentInput): jsPDF => renderReviewDocument(buildReviewDocument(input));

/** Build, draw and download. */
export function generateProcedureReviewPDF(input: ReviewDocumentInput): void {
  const d = buildReviewDocument(input);
  renderReviewDocument(d).save(d.fileName);
}
