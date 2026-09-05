/**
 * Surgical consent + patient education — one generated document.
 *
 * Consent and patient education were two disconnected things: consent was a
 * free-text box with a hardcoded fallback paragraph that named no procedure and
 * listed no risks, while the education library sat in its own module that the
 * theatre workflow never touched. A consent form that cannot say what the
 * operation is, what it is for, or what could go wrong is not informed consent.
 *
 * This module composes both from what the case already knows — the procedure,
 * the patient, the recorded comorbidities and the anaesthetic planned — and
 * renders one document: the explanation the patient keeps, followed by the
 * declaration they sign.
 *
 * Everything renders through `createSafePDF`, so characters outside jsPDF's
 * WinAnsi set (arrows, bullets, ≥, °, emoji) can never reach the page as
 * spaced-out garbage.
 */

import {
  addBrandedHeader,
  addPatientInfoBox,
  addSectionTitle,
  checkNewPage,
  type PDFPatientInfo,
} from '../../../utils/pdfUtils';
import { PDF_MARGINS, PDF_FONTS, PDF_FONT_SIZES } from '../../../utils/pdfConfig';
import { createSafePDF } from '../../../utils/pdfTextSafe';
import type { EducationCondition } from '../../patient-education/types';
import educationData from '../../patient-education/data';
import { getProtocolForComorbidity } from '../../preoperative-planning/data/protocols';
import type { ComorbidityCategory } from '../../preoperative-planning/types';

// ── Matching a procedure to its education content ───────────────────────────

/** Every condition in the education library, flattened once on first use. */
let cachedConditions: EducationCondition[] | null = null;

function allConditions(): EducationCondition[] {
  if (cachedConditions) return cachedConditions;
  const d = educationData as unknown as Record<string, unknown>;
  const out: EducationCondition[] = [];
  for (const [key, value] of Object.entries(d)) {
    // The library exposes one array per category (allBurnsConditions, ...)
    // alongside helper functions; take only the arrays.
    if (key.startsWith('all') && Array.isArray(value)) {
      out.push(...(value as EducationCondition[]));
    }
  }
  cachedConditions = out;
  return out;
}

const STOP_WORDS = new Set([
  'the', 'of', 'and', 'with', 'for', 'to', 'a', 'an', 'left', 'right',
  'bilateral', 'surgery', 'operation', 'procedure', 'repair', 'excision',
]);

function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Best-matching education content for a procedure name, or null.
 *
 * Scores on shared significant words rather than exact title match, because a
 * booked procedure ("Left inguinal hernia mesh repair") rarely matches a
 * library title ("Inguinal Hernia") verbatim. A single shared word is not
 * enough to claim a match — that would attach the wrong leaflet to a consent
 * form, which is worse than attaching none — so weak matches return null and
 * the document falls back to generic surgical content.
 */
export function findEducationForProcedure(procedureName: string): EducationCondition | null {
  const wanted = tokenise(procedureName || '');
  if (!wanted.length) return null;

  let best: EducationCondition | null = null;
  let bestScore = 0;

  for (const c of allConditions()) {
    const names = [c.name, ...(c.alternateNames || [])].filter(Boolean) as string[];
    for (const n of names) {
      const have = new Set(tokenise(n));
      if (!have.size) continue;
      const shared = wanted.filter(w => have.has(w)).length;
      if (!shared) continue;
      // Favour a match that covers more of the library title, so "hernia"
      // prefers "Inguinal Hernia" over a long unrelated title that happens to
      // contain the word.
      const score = shared * 2 - Math.abs(have.size - shared) * 0.25;
      if (score > bestScore) { bestScore = score; best = c; }
    }
  }
  // Require either two shared words, or one that covers a short title well.
  return bestScore >= 2 ? best : null;
}

// ── Document model ──────────────────────────────────────────────────────────

export interface SurgicalDocumentInput {
  procedureName: string;
  indication?: string;
  anaesthesiaType?: string;
  surgeryCategory?: string;
  scheduledDate?: string;
  comorbidities?: ComorbidityCategory[];
  patient: PDFPatientInfo;
  surgeonName?: string;
  hospitalName?: string;
  /** Free-text the surgeon added in the workflow; appended verbatim. */
  additionalNotes?: string;
}

export interface DocumentSection {
  title: string;
  /** Rendered as a paragraph. */
  body?: string;
  /** Rendered as a bulleted list. */
  bullets?: string[];
}

/** Risks every operation carries, stated whatever the procedure. */
const GENERAL_RISKS = [
  'Bleeding, which may rarely require a blood transfusion',
  'Infection of the wound, which may need antibiotics or further surgery',
  'Pain and bruising around the operation site',
  'Scarring, which may be thickened or keloid',
  'A reaction to the anaesthetic or to medicines given',
  'Blood clots in the legs or lungs',
  'The possibility that the operation does not fully correct the problem',
];

const GENERAL_ALTERNATIVES = [
  'No treatment, accepting the symptoms and the risk that they worsen',
  'Non-surgical treatment such as medication, dressings or physiotherapy, where appropriate',
  'Delaying surgery until the condition or your general health changes',
  'A different surgical approach, if one is suitable for your case',
];

/** Flatten the loosely-typed string/object list shapes the library uses. */
function toLines(value: unknown, limit = 12): string[] {
  if (!value) return [];
  const out: string[] = [];
  const push = (v: unknown) => {
    if (out.length >= limit) return;
    if (typeof v === 'string') { if (v.trim()) out.push(v.trim()); return; }
    if (Array.isArray(v)) { v.forEach(push); return; }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      // Pick the most human field the shape offers.
      const text = o.complication || o.recommendation || o.expectation ||
        o.instruction || o.description || o.name || o.item || o.text;
      if (typeof text === 'string' && text.trim()) {
        const risk = typeof o.riskLevel === 'string' ? ` (${o.riskLevel} risk)` : '';
        out.push(text.trim() + risk);
      }
    }
  };
  push(value);
  return out.slice(0, limit);
}

/** Compose the document's sections from the case and the education library. */
export function buildSurgicalDocument(input: SurgicalDocumentInput): DocumentSection[] {
  const edu = findEducationForProcedure(input.procedureName);
  const sections: DocumentSection[] = [];

  // 1. What is proposed
  sections.push({
    title: 'The proposed operation',
    body: [
      `You are being offered ${input.procedureName || 'an operation'}.`,
      input.indication ? `This is being recommended because of ${input.indication}.` : '',
      input.anaesthesiaType ? `It is planned under ${input.anaesthesiaType} anaesthesia.` : '',
      input.scheduledDate ? `It is currently scheduled for ${input.scheduledDate}.` : '',
    ].filter(Boolean).join(' '),
  });

  // 2. About the condition and the operation
  const about: string[] = [];
  if (edu?.overview?.definition) about.push(edu.overview.definition);
  const intraDescription = edu?.intraoperativeInfo?.procedureDescription;
  if (typeof intraDescription === 'string') about.push(intraDescription);
  const duration = edu?.intraoperativeInfo?.duration;
  if (typeof duration === 'string') about.push(`The operation usually takes about ${duration}.`);
  if (about.length) sections.push({ title: 'About this operation', body: about.join(' ') });

  // 3. Benefits
  const benefits = [
    ...toLines(edu?.expectedOutcomes?.shortTerm ?? edu?.expectedOutcomes?.shortTermOutcomes, 4),
    ...toLines(edu?.expectedOutcomes?.longTerm ?? edu?.expectedOutcomes?.longTermOutcomes, 4),
  ];
  if (typeof edu?.expectedOutcomes?.successRate === 'string') {
    benefits.unshift(`Reported success rate: ${edu.expectedOutcomes.successRate}`);
  }
  sections.push({
    title: 'What this operation is intended to achieve',
    bullets: benefits.length ? benefits : ['To treat the condition described above and relieve its symptoms'],
  });

  // 4. Risks — general, then procedure-specific, then comorbidity-driven
  const procedureRisks = [
    ...toLines(edu?.intraoperativeInfo?.possibleComplications, 8),
    ...toLines(edu?.expectedOutcomes?.possibleComplications, 8),
    ...toLines(edu?.overview?.complications, 6),
  ];
  const seen = new Set<string>();
  const risks = [...GENERAL_RISKS, ...procedureRisks].filter(r => {
    const k = r.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  sections.push({ title: 'Risks and possible complications', bullets: risks });

  // Comorbidities raise specific risks the generic list does not cover.
  const comorbidityRisks = (input.comorbidities || [])
    .filter(c => c !== 'none')
    .flatMap(c => {
      const p = getProtocolForComorbidity(c);
      if (!p) return [];
      return p.redFlags.slice(0, 3).map(f => `${p.name}: ${f}`);
    });
  if (comorbidityRisks.length) {
    sections.push({
      title: 'Additional risks because of your other medical conditions',
      bullets: comorbidityRisks,
    });
  }

  // 5. Alternatives
  sections.push({ title: 'Alternatives to this operation', bullets: GENERAL_ALTERNATIVES });

  // 6. Before the operation
  const pre = edu?.preoperativeInstructions;
  const before = [
    ...(typeof pre?.fastingInstructions === 'string' ? [pre.fastingInstructions] : []),
    ...toLines(pre?.dayBeforeSurgery ?? pre?.dayBeforeInstructions, 5),
    ...toLines(pre?.dayOfSurgery ?? pre?.dayOfSurgeryInstructions, 5),
    ...toLines(pre?.physicalPreparation, 4),
    ...toLines(pre?.whatToBring, 4),
  ];
  sections.push({
    title: 'Before your operation',
    bullets: before.length ? before : [
      'Do not eat for at least 6 hours before surgery, and do not drink for at least 2 hours, unless told otherwise',
      'Tell the team about every medicine you take, including herbal and traditional remedies',
      'Bring your investigation results and any previous medical records with you',
      'Arrange for someone to accompany you home afterwards',
    ],
  });

  // 7. After the operation
  const post = edu?.postoperativeInstructions;
  const after = [
    ...toLines(post?.immediatePostop ?? post?.immediatePostOp, 4),
    ...toLines(post?.woundCare, 4),
    ...toLines(post?.painManagement, 3),
    ...toLines(post?.activityRestrictions, 3),
    ...(typeof post?.returnToWork === 'string' ? [`Returning to work: ${post.returnToWork}`] : []),
  ];
  if (after.length) sections.push({ title: 'After your operation', bullets: after });

  // 8. Warning signs
  const warnings = [...toLines(edu?.emergencySigns, 8), ...toLines(edu?.warningSigns, 6)];
  sections.push({
    title: 'Get medical help urgently if you notice',
    bullets: warnings.length ? warnings : [
      'Fever, chills, or feeling generally unwell',
      'Increasing pain, redness, swelling or discharge from the wound',
      'Bleeding that does not stop with pressure',
      'Difficulty breathing, chest pain, or swelling and pain in a calf',
    ],
  });

  // 9. Follow-up
  const follow = [
    ...toLines(edu?.followUpCare?.schedule ?? edu?.followUpCare?.appointments, 4),
    ...toLines(edu?.followUpCare?.ongoingMonitoring, 3),
  ];
  if (follow.length) sections.push({ title: 'Follow-up care', bullets: follow });

  if (input.additionalNotes?.trim()) {
    sections.push({ title: 'Additional information discussed', body: input.additionalNotes.trim() });
  }

  return sections;
}

// ── Rendering ───────────────────────────────────────────────────────────────

const LINE = 5;

function paragraph(doc: ReturnType<typeof createSafePDF>, text: string, y: number, width: number): number {
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text, width) as string[];
  let yy = y;
  for (const line of lines) {
    yy = checkNewPage(doc, yy, 12);
    doc.text(line, PDF_MARGINS.left, yy);
    yy += LINE;
  }
  return yy;
}

function bullets(doc: ReturnType<typeof createSafePDF>, items: string[], y: number, width: number): number {
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(PDF_FONT_SIZES.body);
  doc.setTextColor(0, 0, 0);
  let yy = y;
  for (const item of items) {
    // "-" rather than a bullet glyph: the sanitiser would strip a real bullet,
    // and a hyphen renders identically on every jsPDF core font.
    const lines = doc.splitTextToSize(item, width - 5) as string[];
    lines.forEach((line, i) => {
      yy = checkNewPage(doc, yy, 12);
      doc.text(i === 0 ? '-' : ' ', PDF_MARGINS.left, yy);
      doc.text(line, PDF_MARGINS.left + 4, yy);
      yy += LINE;
    });
  }
  return yy;
}

/**
 * Render the combined education + consent document and hand it to the browser.
 *
 * The education comes first and the declaration last, so the patient reads what
 * they are agreeing to before the signature block, not after it.
 */
export function generateSurgicalConsentPDF(input: SurgicalDocumentInput): void {
  const doc = createSafePDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - PDF_MARGINS.left * 2;

  let y = addBrandedHeader(doc, {
    title: 'INFORMATION AND CONSENT FOR SURGERY',
    subtitle: input.procedureName || 'Surgical procedure',
    hospitalName: input.hospitalName || 'AstroHEALTH',
  });

  y = addPatientInfoBox(doc, y, input.patient, {
    ...(input.surgeonName ? { Surgeon: input.surgeonName } : {}),
    ...(input.scheduledDate ? { 'Planned date': input.scheduledDate } : {}),
  });
  y += 4;

  for (const section of buildSurgicalDocument(input)) {
    y = checkNewPage(doc, y, 24);
    y = addSectionTitle(doc, y, section.title.toUpperCase());
    y += 2;
    if (section.body) y = paragraph(doc, section.body, y, width);
    if (section.bullets?.length) y = bullets(doc, section.bullets, y, width);
    y += 4;
  }

  // ── Declaration ──
  y = checkNewPage(doc, y, 90);
  y = addSectionTitle(doc, y, 'PATIENT DECLARATION');
  y += 2;
  y = paragraph(doc,
    'I confirm that the operation named above has been explained to me, including what it ' +
    'involves, why it is being recommended, its risks and possible complications, and the ' +
    'alternatives available to me. I have had the opportunity to ask questions and they have ' +
    'been answered to my satisfaction. I understand that no guarantee has been given about ' +
    'the result. I understand that additional procedures may become necessary during the ' +
    'operation to deal with an unforeseen but life-threatening condition, and I consent to ' +
    'such procedures being carried out. I give my consent to the operation and to the ' +
    'anaesthetic described above.',
    y, width);
  y += 8;

  const signatureBlock = (label: string, startY: number): number => {
    let yy = checkNewPage(doc, startY, 26);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.setFontSize(PDF_FONT_SIZES.body);
    doc.text(label, PDF_MARGINS.left, yy);
    yy += 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(PDF_MARGINS.left, yy, PDF_MARGINS.left + 78, yy);
    doc.line(PDF_MARGINS.left + 92, yy, PDF_MARGINS.left + 150, yy);
    yy += 4;
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(PDF_FONT_SIZES.footnote);
    doc.text('Signature / thumbprint', PDF_MARGINS.left, yy);
    doc.text('Name and date', PDF_MARGINS.left + 92, yy);
    return yy + 10;
  };

  y = signatureBlock('Patient (or person with parental responsibility)', y);
  y = signatureBlock('Witness / interpreter', y);
  y = signatureBlock('Surgeon confirming the explanation given', y);

  const safeName = (input.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`consent-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
