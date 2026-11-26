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
  | 'plan' | 'counselling' | 'consent' | 'declaration' | 'follow_up' | 'warning_signs';

/**
 * Who the PDF is for. 'clinician' (default) is the full record. 'patient' is
 * what may be sent to the patient's own phone (WhatsApp): the plan in plain
 * words, counselling points, the consent information, follow-up and warning
 * signs. It never carries risk flags, scores, the assessment narrative, the
 * clinician's reasoning, or psychological / safeguarding / substance content:
 * a child's or a vulnerable adult's phone may be read by the very person a
 * flag is about.
 */
export type ReviewAudience = 'clinician' | 'patient';

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
  audience: ReviewAudience;
  footer: string;
}

export interface ReviewDocumentInput {
  module: ProcedureModule;
  phase: ReviewPhase;
  reading: ReviewReading;
  review: Pick<StoredProcedureReview, 'plan' | 'counselling' | 'counsellingPoints' | 'consent' | 'status' | 'signedByName' | 'signedAt' | 'createdByName' | 'templateVersion' | 'followUp'>;
  patient: PDFPatientInfo;
  hospitalName?: string;
  date: Date;
  audience?: ReviewAudience;
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

/**
 * Content that must never reach the patient copy, whatever section it sits in:
 * safeguarding / child protection, abuse and violence, mental health screens
 * and referrals, substance use, capacity, and scoring / flag language. Erring
 * wide is deliberate; anything dropped here is still in the clinician PDF and
 * can be discussed in person.
 */
export const PATIENT_COPY_EXCLUDE =
  /safeguard|child[\s-]*protection|social[\s-]*work|abuse|neglect|domestic|violence|assault|trafficking|\bFGM\b|\bPHQ|\bGAD\b|GAD-|depress|anxiet|suicid|self[\s-]*harm|harm (?:to )?(?:your|them|him|her)self|psycholog|psychiatr|mental[\s-]*health|wellbeing|substance|alcohol|drug (?:use|misuse)|withdrawal|AUDIT-C|opioid use|sexual|capacity|\bflag|\bscore/i;

const patientSafe = (text: string | undefined) => !!text && !PATIENT_COPY_EXCLUDE.test(text);

const WARNING_HEADING = /^Red flags/i;

/** A plan line in plain words: no URGENT tag, no clinical reasoning; declined lines are left out. */
const plainLine = (l: { text: string; declined?: unknown }) => (l.declined ? null : l.text.trim());

/**
 * The plan in the patient's terms: the GOALS of each (non-sensitive) problem.
 * The treatment, investigation, monitoring and referral lines, the general
 * plan and the cautions are instructions to staff ("examine now for
 * haematoma", "interpret albumin with CRP"), several of them raised by a
 * flag, so they stay in the clinician PDF.
 */
function patientPlanSections(plan: ScribePlan): ReviewDocSection[] {
  const aims: string[] = [];
  for (const p of plan.problems) {
    if (!patientSafe(p.problem)) continue;
    for (const l of p.goals) {
      const t = plainLine(l);
      if (t && patientSafe(t)) aims.push(t);
    }
  }
  return aims.length ? [{ kind: 'plan', title: 'The aims of your treatment', bullets: [...new Set(aims)] }] : [];
}

/** The patient copy's section model. Pure. See ReviewAudience. */
function buildPatientDocument(input: ReviewDocumentInput): ReviewDocument {
  const { module, phase, review } = input;
  const phaseLabel = phaseDefinition(phase).label;
  const sections: ReviewDocSection[] = [];

  sections.push({
    kind: 'summary', title: 'About this leaflet',
    body: `This is your copy of your ${module.name} review (${phaseLabel.toLowerCase()}) on ${input.date.toISOString().slice(0, 10)}. `
      + 'It explains the aims of your treatment, what we discussed with you, the procedure, your follow-up and when to seek help. Please keep it and bring it to your next visit. '
      + 'If anything is unclear, ask your care team.',
  });

  sections.push(...patientPlanSections(review.plan));

  // Counselling: the topics, not the point texts, which are written as
  // instructions to the clinician ("confirm which blood products the patient
  // refuses"). Topics actually ticked as discussed come first.
  const topics = [
    ...review.counselling.topicsDiscussed,
    ...review.counsellingPoints.map(p => p.topic),
  ].map(t => t.trim()).filter(t => patientSafe(t) && !/^interpreter$/i.test(t));
  if (topics.length) sections.push({ kind: 'counselling', title: 'What we discussed with you', bullets: [...new Set(topics)] });

  const consent = review.consent;
  if (consent) {
    sections.push({ kind: 'consent', title: `About your procedure: ${consent.procedureName}`, body: 'The information you were given when consent was discussed.' });
    for (const s of consent.sections) sections.push({ kind: 'consent', title: s.title, body: s.body, bullets: s.bullets });
  }

  const followUp = [
    ...(review.followUp ?? []).filter(f => patientSafe(f.purpose)).map(f => `${f.when}: ${f.purpose}`),
    ...review.plan.followUp.filter(patientSafe),
  ];
  if (followUp.length) sections.push({ kind: 'follow_up', title: 'Your follow-up', bullets: [...new Set(followUp)] });

  const warnings = review.plan.general
    .filter(g => WARNING_HEADING.test(g.heading))
    .flatMap(g => g.items.map(plainLine))
    .filter((t): t is string => !!t && patientSafe(t));
  sections.push({
    kind: 'warning_signs', title: 'Seek help straight away if',
    bullets: warnings.length ? warnings : ['You have fever, increasing pain, redness, swelling, bleeding or discharge from the wound, or you feel unwell. Contact the clinic or go to the nearest emergency department.'],
  });

  const safeName = (input.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    title: 'YOUR CARE PLAN',
    subtitle: module.name,
    hospitalName: input.hospitalName || 'AstroHEALTH',
    patient: input.patient,
    meta: {
      Procedure: module.name,
      Date: input.date.toISOString().slice(0, 10),
      Clinician: review.createdByName || '',
    },
    sections,
    fileName: `${module.id}-${phase}-${safeName}-${input.date.toISOString().slice(0, 10)}-patient-copy.pdf`,
    audience: 'patient',
    footer: 'Patient copy. Keep it safe; contact your care team with any questions.',
  };
}

/** The section model of the review PDF. Pure. */
export function buildReviewDocument(input: ReviewDocumentInput): ReviewDocument {
  if (input.audience === 'patient') return buildPatientDocument(input);
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
    audience: 'clinician',
    footer: 'Decision support: the plan is a draft until approved by a consultant.',
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
    addBrandedFooter(doc, i, pages, d.footer);
  }
  return doc;
}

/** The PDF as a jsPDF document. Pass audience 'patient' for anything sent to the patient. */
export const getProcedureReviewPDFDoc = (input: ReviewDocumentInput): jsPDF => renderReviewDocument(buildReviewDocument(input));

/** The patient copy, for WhatsApp / sending to the patient's phone. Never the clinician PDF. */
export function getPatientCopyPDF(input: ReviewDocumentInput): { doc: jsPDF; fileName: string } {
  const d = buildReviewDocument({ ...input, audience: 'patient' });
  return { doc: renderReviewDocument(d), fileName: d.fileName };
}

/** Build, draw and download. */
export function generateProcedureReviewPDF(input: ReviewDocumentInput): void {
  const d = buildReviewDocument(input);
  renderReviewDocument(d).save(d.fileName);
}
