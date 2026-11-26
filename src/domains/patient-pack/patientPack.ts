/**
 * The patient pack: ONE plain-English PDF with everything the patient needs.
 *
 *   1. Your diagnosis and plan — the procedure review's patient copy
 *      (procedureReview/pdf.ts buildPatientCopyDocument: no scores, flags or
 *      sensitive content), not re-written here
 *   2. What to buy — the operation's consumables list
 *   3. Your cost estimate
 *   4. Before your operation — fasting and the patient's own medicines
 *      (beforeSurgery.ts), "confirm with your surgeon or anaesthetist"
 *   5. After your operation — from the procedure's education record and the
 *      clinician's instructions (never "standard instructions apply")
 *   6. Get help straight away if — the review's and the procedure's warning signs
 *   7. Your follow-up dates — the booked appointments
 *
 * No ASA, Mallampati, Caprini or RCRI anywhere: the last step drops any line
 * the patient-copy filter would refuse (PATIENT_COPY_EXCLUDE), and a test
 * checks the whole pack. Every string the pack adds is in locale/en.ts.
 * Pure model + renderer (the review PDF's own renderer).
 */
import { format } from 'date-fns';
import type { Appointment, ConsumableBOM, Surgery } from '../../types';
import type { PDFPatientInfo } from '../../utils/pdfUtils';
import type { ProcedureEducation } from '../../data/patientEducation';
import type { ProcedureModule, StoredProcedureReview } from '../clinical/procedureReview/types';
import {
  buildPatientCopyDocument, renderReviewDocument, PATIENT_COPY_EXCLUDE,
  type ReviewDocSection, type ReviewDocument,
} from '../clinical/procedureReview/pdf';
import { formatNaira } from '../../data/surgicalFees';
import type { BeforeSurgerySheet } from './beforeSurgery';
import { patientText } from './locale/en';

const L = patientText.pack;

/** Scores and staff shorthand that must never reach a patient document. */
export const SCORE_TERMS = /\bASA\b|Mallampati|Caprini|RCRI|\bMACE\b|STOP-?BANG|Apfel|Braden|\bMUST\b/i;
const safe = (t: string | undefined): t is string => !!t && !PATIENT_COPY_EXCLUDE.test(t) && !SCORE_TERMS.test(t);

export interface PatientPackInput {
  surgery: Surgery;
  patient: PDFPatientInfo;
  hospitalName?: string;
  clinicPhone?: string;
  /** The pre-op procedure review and its module, when there is one. */
  review?: { module: ProcedureModule; stored: StoredProcedureReview } | null;
  education?: ProcedureEducation | null;
  bom?: ConsumableBOM | null;
  before: BeforeSurgerySheet;
  appointments: Appointment[];
  now: Date;
}

export function buildPatientPack(i: PatientPackInput): ReviewDocument {
  const { surgery } = i;
  const sections: ReviewDocSection[] = [];
  const opDate = surgery.scheduledDate ? format(new Date(surgery.scheduledDate), 'd MMMM yyyy') : undefined;

  sections.push({ kind: 'summary', title: 'About this booklet', body: L.intro(surgery.procedureName) });

  // 1. Diagnosis and plan: the review's patient copy (its follow-up and
  // warning-sign sections are replaced by the booked dates and section 6).
  const copy = i.review ? buildPatientCopyDocument({
    module: i.review.module, phase: i.review.stored.phase, review: i.review.stored,
    patient: i.patient, hospitalName: i.hospitalName, date: i.now,
  }) : null;
  const copyWarnings = copy?.sections.find(s => s.kind === 'warning_signs')?.bullets ?? [];
  sections.push({ kind: 'plan', title: L.sections.diagnosisPlan, body: `${L.procedure(surgery.procedureName, opDate)}${copy ? '' : ` ${L.noReview}`}` });
  for (const s of copy?.sections ?? []) {
    if (s.kind === 'summary' || s.kind === 'follow_up' || s.kind === 'warning_signs') continue;
    sections.push({ ...s });
  }

  // 2. What to buy
  const items = (i.bom?.consumables ?? []).filter(c => c.quantity > 0);
  sections.push({
    kind: 'plan', title: L.sections.shopping,
    body: items.length ? L.shoppingIntro : L.shoppingNone,
    bullets: items.map(c => `${c.name} x ${c.quantity}${c.unit ? ` ${c.unit}` : ''}`),
  });

  // 3. Cost estimate
  const surgeon = surgery.surgeonFee ?? 0;
  const assistant = surgery.assistantFee ?? (surgery.assistantFeePercentage ? surgeon * surgery.assistantFeePercentage / 100 : 0);
  const anaesthesia = surgery.anaesthesiaFee ?? 0;
  const consumables = i.bom?.grandTotal ?? i.bom?.consumablesTotal ?? 0;
  const total = surgeon + assistant + anaesthesia + consumables;
  sections.push(total > 0 ? {
    kind: 'plan', title: L.sections.cost,
    bullets: [
      ...(surgeon ? [L.costLine(L.costLabels.surgeon, formatNaira(surgeon))] : []),
      ...(assistant ? [L.costLine(L.costLabels.assistant, formatNaira(assistant))] : []),
      ...(anaesthesia ? [L.costLine(L.costLabels.anaesthesia, formatNaira(anaesthesia))] : []),
      ...(consumables ? [L.costLine(L.costLabels.consumables, formatNaira(consumables))] : []),
      L.costLine(L.costLabels.total, formatNaira(total)),
    ],
    body: L.costNote,
  } : { kind: 'plan', title: L.sections.cost, body: L.costNone });

  // 4. Before the operation
  sections.push({ kind: 'plan', title: `${L.sections.beforeSurgery}: ${i.before.fastingHeading.toLowerCase()}`, bullets: i.before.fasting });
  sections.push({ kind: 'plan', title: i.before.medsHeading, body: i.before.medsIntro, bullets: i.before.meds });
  sections.push({ kind: 'plan', title: 'Please note', body: i.before.confirm });

  // 5. After the operation: the procedure's own content first.
  const edu = i.education;
  const after = [
    ...(surgery.postOperativeInstructions ? surgery.postOperativeInstructions.split('\n').map(s => s.trim()) : []),
    ...(edu?.patientResponsibilities ?? []).filter(r => r.phase === 'immediate_post_op' || r.phase === 'recovery').map(r => r.responsibility),
    ...(edu?.lifestyleChanges ?? []).filter(l => l.importance === 'essential').map(l => `${l.recommendation}${l.duration ? ` (${l.duration})` : ''}`),
  ].filter(safe);
  sections.push({
    kind: 'plan', title: L.sections.afterSurgery,
    body: edu?.healingTime ? `Healing usually takes ${edu.healingTime}.` : undefined,
    bullets: after.length ? [...new Set(after)] : [...L.afterGeneric],
  });

  // 6. Warning signs
  const warnings = [...copyWarnings, ...(edu?.warningSignsToReport ?? [])].filter(safe);
  sections.push({
    kind: 'warning_signs', title: L.sections.warningSigns,
    bullets: [...new Set(warnings.length ? warnings : [...L.warningGeneric])],
    body: `${L.contactLine}${i.clinicPhone ? ` (${i.clinicPhone})` : ''}`,
  });

  // 7. Follow-up dates: the booked appointments.
  const upcoming = i.appointments
    .filter(a => !['cancelled', 'completed', 'no_show'].includes(a.status) && new Date(a.appointmentDate) >= new Date(format(i.now, 'yyyy-MM-dd')))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  sections.push({
    kind: 'follow_up', title: L.sections.followUp,
    body: upcoming.length ? L.followUpIntro : L.followUpNone,
    bullets: upcoming.map(a => L.followUpLine(format(new Date(a.appointmentDate), 'EEEE d MMMM yyyy'), a.appointmentTime,
      // The reason is written for the clinic; keep only what follows "Procedure:".
      (a.reasonForVisit.split(': ').slice(1).join(': ') || a.reasonForVisit))).filter(safe),
  });

  // Final guard: nothing a patient must not see.
  const clean = sections.map(s => ({
    ...s,
    body: s.body && safe(s.body) ? s.body : undefined,
    bullets: s.bullets?.filter(safe),
  })).filter(s => s.body || s.bullets?.length || s.table);

  const safeName = (i.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const date = format(i.now, 'yyyy-MM-dd');
  return {
    title: L.title,
    subtitle: surgery.procedureName,
    hospitalName: i.hospitalName || 'AstroHEALTH',
    patient: i.patient,
    meta: { Operation: surgery.procedureName, ...(opDate ? { Date: opDate } : {}), Prepared: format(i.now, 'd MMMM yyyy') },
    sections: clean,
    fileName: L.fileName(safeName, date),
    audience: 'patient',
    footer: L.footer,
  };
}

/** Titles of the sections, for the log of what was given. */
export const packContents = (d: ReviewDocument) => [...new Set(d.sections.map(s => s.title))];

export const renderPatientPack = renderReviewDocument;

/** All the text of a pack (for tests and checks). */
export const packText = (d: ReviewDocument) =>
  [d.title, d.subtitle, ...Object.values(d.meta), ...d.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? [])])].join('\n');
