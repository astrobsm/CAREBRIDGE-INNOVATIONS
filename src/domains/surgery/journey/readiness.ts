/**
 * Surgical readiness: ONE answer to "is this patient ready?", computed from
 * the records themselves (procedure review, investigations, stored consent
 * and payment documents, the estimate, the pre-anaesthetic review, the
 * booking approval) — never from localStorage ticks or `surgery.status`.
 *
 * Two gates read it:
 *   stage 'booking'  — what must be true before the booking is approved
 *   stage 'theatre'  — everything, before Start Surgery
 * An item is 'missing' (blocks), 'warning' (shown, does not block) or 'done'.
 * Pure: the loader (readinessData.ts) gathers the records.
 */
import type { Investigation, PreoperativeAssessment, ScannedDocument, Surgery } from '../../../types';
import type { StoredProcedureReview } from '../../clinical/procedureReview/types';
import { counsellingGaps } from '../../clinical/procedureReview/consent';
import { findSurgeryAttachment } from '../services/surgeryAttachments';

export type ReadinessStatus = 'done' | 'missing' | 'warning';
export type ReadinessStage = 'booking' | 'theatre';

export interface ReadinessItem {
  id: ReadinessItemId;
  label: string;
  status: ReadinessStatus;
  detail?: string;
  /** Where to go to fix it (an app route). */
  link?: string;
  /** The Surgical Workflow section that fixes it, when it is one. */
  section?: string;
  /** The raw values behind the item (the unreviewed red flags). */
  values?: string[];
}

export type ReadinessItemId =
  | 'review' | 'consent_decision' | 'counselling' | 'red_flags' | 'investigations'
  | 'consent_form' | 'payment' | 'estimate' | 'booking' | 'preanaesthetic' | 'conference';

export interface Readiness {
  ready: boolean;
  items: ReadinessItem[];
  /** Labels of the missing items, for toasts and the override record. */
  missing: string[];
}

export interface ReadinessInput {
  surgery: Surgery;
  /** The surgery's pre-op procedure review (procedureLink.preOpReviewFor), if any. */
  review?: { encounterId: string; review: StoredProcedureReview } | null;
  /** The patient's investigations; filtered here to those for this operation. */
  investigations: Investigation[];
  /** Documents stored against the surgery (scannedDocuments with encounterId = surgery id). */
  documents: ScannedDocument[];
  /** Pre-anaesthetic reviews for this surgery (newest wins). */
  preAnaesthetic: PreoperativeAssessment[];
  stage?: ReadinessStage;
}

const DAY = 86_400_000;
/** Statuses the old flow set only after a booking was approved. */
const LEGACY_BOOKED_STATUSES: Surgery['status'][] = ['scheduled', 'in-progress', 'completed'];
const time = (d: unknown) => { const t = new Date(d as string).getTime(); return Number.isNaN(t) ? 0 : t; };

/** Investigations that belong to this operation: requested from 90 days before the case was opened. */
export function investigationsForSurgery(surgery: Surgery, all: Investigation[]): Investigation[] {
  const from = time(surgery.createdAt) - 90 * DAY;
  return all.filter(i => i.patientId === surgery.patientId && i.status !== 'cancelled'
    && time(i.requestedAt ?? i.createdAt) >= from);
}

const resultBack = (i: Investigation) => i.status === 'completed'
  || (i.results?.length ?? 0) > 0
  || !!(i as unknown as { result?: string }).result;

const ABNORMAL_FLAGS = new Set(['L', 'H', 'LL', 'HH', 'A', 'low', 'high', 'critical']);
const abnormal = (i: Investigation) => (i.results ?? []).some(r =>
  r.isAbnormal === true || (r.flag && ABNORMAL_FLAGS.has(r.flag))
  || (r.status && r.status !== 'normal'));

const nameOf = (i: Investigation) => i.typeName || i.name || String(i.type).replace(/_/g, ' ');

/** Red flags on the review that the clinician has not reviewed (or that changed since). */
export function unresolvedRedFlags(surgery: Surgery, review: StoredProcedureReview | undefined): string[] {
  const reds = (review?.flags ?? []).filter(f => f.level === 'red').map(f => `${f.fieldLabel}: ${f.answerLabel}`);
  if (!reds.length) return [];
  const reviewed = new Set(surgery.redFlagReview?.flags ?? []);
  return reds.filter(r => !reviewed.has(r));
}

export function surgicalReadiness(input: ReadinessInput): Readiness {
  const { surgery } = input;
  const stage = input.stage ?? 'theatre';
  const wf = `/surgery/workflow/${surgery.patientId}?edit=${surgery.id}`;
  const prLink = (phase = 'pre_op') => `/patients/${surgery.patientId}/procedure-review?phase=${phase}${input.review ? `&module=${input.review.review.moduleId}` : ''}`;
  const items: ReadinessItem[] = [];
  const add = (i: ReadinessItem) => items.push(i);

  // ── Procedure review, consent decision, counselling, red flags ────────────
  const r = input.review?.review;
  if (!r) {
    add({ id: 'review', label: 'Pre-operative procedure review', status: 'missing', detail: 'No pre-operative review recorded for this patient', link: prLink() });
  } else {
    const signed = r.status === 'signed';
    add({
      id: 'review', label: 'Pre-operative procedure review', link: prLink(),
      status: signed ? 'done' : 'warning',
      detail: signed ? `Signed${r.signedByName ? ` by ${r.signedByName}` : ''}` : `Saved, ${r.status.replace(/_/g, ' ')} (not signed)`,
    });
    const d = r.counselling?.decision;
    add({
      id: 'consent_decision', label: 'Patient\'s decision', link: prLink(),
      status: d === 'consents' ? 'done' : 'missing',
      detail: d === 'consents' ? 'Consents to the operation' : d === 'declines' ? 'The patient declined' : d === 'wants_time' ? 'The patient wants more time' : 'Not recorded',
    });
    const gaps = counsellingGaps(r.counselling, r.consent);
    add({
      id: 'counselling', label: 'Counselling complete', link: prLink(),
      status: gaps.length ? 'missing' : 'done',
      detail: gaps.length ? gaps.join('; ') : 'All counselling points recorded',
    });
    const reds = (r.flags ?? []).filter(f => f.level === 'red');
    const open = unresolvedRedFlags(surgery, r);
    add({
      id: 'red_flags', label: 'Red flags reviewed', section: 'planning',
      status: open.length ? 'missing' : 'done', values: open,
      detail: open.length ? open.join('; ')
        : reds.length ? `${reds.length} red flag(s) reviewed: ${surgery.redFlagReview?.note ?? ''}`.trim() : 'No red flags',
    });
  }

  // ── Investigations ────────────────────────────────────────────────────────
  const invs = investigationsForSurgery(surgery, input.investigations);
  if (!invs.length) {
    add({ id: 'investigations', label: 'Investigation results', status: 'warning', detail: 'No investigations requested', section: 'investigations' });
  } else {
    const pending = invs.filter(i => !resultBack(i));
    const bad = invs.filter(i => resultBack(i) && abnormal(i));
    add({
      id: 'investigations', label: 'Investigation results', section: 'investigations',
      status: pending.length ? 'missing' : bad.length ? 'warning' : 'done',
      detail: pending.length ? `Awaiting ${pending.length} of ${invs.length}: ${pending.map(nameOf).join(', ')}`
        : bad.length ? `All back; abnormal: ${bad.map(nameOf).join(', ')}` : `All ${invs.length} back`,
    });
  }

  // ── Consent form, payment, estimate ──────────────────────────────────────
  const consent = findSurgeryAttachment(input.documents, surgery.id, 'consent');
  add({ id: 'consent_form', label: 'Signed consent form uploaded', status: consent ? 'done' : 'missing', section: 'uploads', detail: consent ? consent.title : undefined });
  const payment = findSurgeryAttachment(input.documents, surgery.id, 'payment');
  add({ id: 'payment', label: 'Payment evidence uploaded', status: payment ? 'done' : 'missing', section: 'uploads', detail: payment ? payment.title : undefined });
  const fees = (surgery.surgeonFee ?? 0) + (surgery.anaesthesiaFee ?? 0);
  add({ id: 'estimate', label: 'Cost estimate', status: fees > 0 ? 'done' : 'missing', section: 'estimates', detail: fees > 0 ? undefined : 'No fees entered' });

  // ── Theatre-only items ───────────────────────────────────────────────────
  if (stage === 'theatre') {
    // A case booked before the approval record existed was approved under the
    // old flow (status went to 'scheduled'). Don't block it; ask for the
    // approval to be recorded again.
    const legacyBooked = !surgery.bookingApproval && LEGACY_BOOKED_STATUSES.includes(surgery.status);
    add({
      id: 'booking', label: 'Booking approved', section: 'booking',
      status: surgery.bookingApproval ? 'done' : legacyBooked ? 'warning' : 'missing',
      detail: surgery.bookingApproval
        ? `Approved${surgery.bookingApproval.byName ? ` by ${surgery.bookingApproval.byName}` : ''}`
        : legacyBooked ? 'Booked before approvals were recorded: approve again to record who approved it' : undefined,
    });
    const pa = [...input.preAnaesthetic].filter(a => a.surgeryId === surgery.id)
      .sort((a, b) => time(b.updatedAt ?? b.createdAt) - time(a.updatedAt ?? a.createdAt))[0];
    add({
      id: 'preanaesthetic', label: 'Pre-anaesthetic review: fit', section: 'preanaesthetic',
      status: pa?.fitnessGrade === 'fit' ? 'done' : 'missing',
      detail: !pa ? 'Not done' : pa.fitnessGrade === 'fit' ? 'Fit for surgery' : pa.fitnessGrade === 'defer' ? 'Surgery deferred' : 'Needs optimisation',
    });
    if (surgery.needsConference) {
      add({ id: 'conference', label: 'Pre-surgical conference', section: 'conference', status: surgery.conferenceCompletedAt ? 'done' : 'missing' });
    }
  }

  for (const i of items) if (i.section && !i.link) i.link = `${wf}&tab=${i.section}`;
  const missing = items.filter(i => i.status === 'missing').map(i => i.label);
  return { ready: missing.length === 0, items, missing };
}
