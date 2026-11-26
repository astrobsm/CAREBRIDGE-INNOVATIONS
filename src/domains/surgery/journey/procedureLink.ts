/**
 * Which procedure review (and so which procedure module) belongs to a surgery.
 *
 * A surgery is booked by name from the fee catalogue; a procedure review is a
 * clinical encounter carrying a module id. The two meet through the module's
 * catalogue links (feeIds) or, failing that, through the patient's newest
 * pre-operative review before the operation. Pure.
 */
import type { ClinicalEncounter, Surgery } from '../../../types';
import type { ProcedureModule, StoredProcedureReview } from '../../clinical/procedureReview/types';
import { getModule, modulesForFeeId } from '../../clinical/procedureReview/registry';
import { surgicalProcedures } from '../../../data/surgicalFees';

export type ReviewEncounter = Pick<ClinicalEncounter, 'id' | 'patientId' | 'createdAt'> & { procedureReview?: StoredProcedureReview };

const DAY = 86_400_000;
const time = (d: unknown) => { const t = new Date(d as string).getTime(); return Number.isNaN(t) ? null : t; };

/** When the operation is (or was): actual start, else the scheduled date. */
export function operationDate(s: Pick<Surgery, 'actualStartTime' | 'scheduledDate'>): Date {
  return new Date(time(s.actualStartTime) ?? time(s.scheduledDate) ?? Date.now());
}

/** Modules linked to the surgery's procedure through the fee catalogue (by exact name). */
export function modulesForSurgeryName(procedureName: string): ProcedureModule[] {
  const name = procedureName.trim().toLowerCase();
  const fee = surgicalProcedures.find(p => p.name.trim().toLowerCase() === name);
  return fee ? modulesForFeeId(fee.id) : [];
}

/**
 * The pre-operative procedure review for this surgery: the newest pre_op
 * review of the patient written in the year before the operation (up to the
 * day after it), preferring one whose module is linked to the procedure.
 */
export function preOpReviewFor(surgery: Surgery, encounters: ReviewEncounter[]): (ReviewEncounter & { procedureReview: StoredProcedureReview }) | null {
  const op = operationDate(surgery).getTime();
  const linked = new Set(modulesForSurgeryName(surgery.procedureName).map(m => m.id));
  const candidates = encounters
    .filter((e): e is ReviewEncounter & { procedureReview: StoredProcedureReview } =>
      e.patientId === surgery.patientId && !!e.procedureReview
      && e.procedureReview.phase === 'pre_op' && e.procedureReview.status !== 'entered_in_error')
    .filter(e => { const t = time(e.createdAt); return t !== null && t <= op + DAY && t >= op - 365 * DAY; })
    .sort((a, b) => (time(b.createdAt) ?? 0) - (time(a.createdAt) ?? 0));
  return candidates.find(e => linked.has(e.procedureReview.moduleId)) ?? candidates[0] ?? null;
}

/** The procedure module for a surgery: from its pre-op review, else from the fee catalogue. */
export function moduleForSurgery(surgery: Surgery, encounters: ReviewEncounter[]): ProcedureModule | null {
  const review = preOpReviewFor(surgery, encounters);
  const fromReview = review ? getModule(review.procedureReview.moduleId) : undefined;
  return fromReview ?? modulesForSurgeryName(surgery.procedureName)[0] ?? null;
}
