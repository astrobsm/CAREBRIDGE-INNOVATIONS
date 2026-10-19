/**
 * Stored shapes for the medical scribe's treatment plans and the log of their
 * implementation.
 *
 *   ScribeTreatmentPlan   a draft built from the record, submitted by the
 *                         team, approved (with edits) or returned by a
 *                         consultant. Never an order until approved.
 *   ScribePlanAction      one logged step of carrying out an approved plan:
 *                         who (the signed-in user), when, where (device
 *                         location plus the place named), what — including
 *                         the prescription or investigation it created.
 *   ScribePlanAttachment  a result photographed, scanned or uploaded with a
 *                         log entry. Kept apart so the log stays light.
 */
import type { ScribeFinding, ScribePlan } from './scribePlan';

export type ScribePlanStatus = 'pending_approval' | 'approved' | 'rejected' | 'superseded';

export interface ScribeTreatmentPlan {
  id: string;
  patientId: string;
  hospitalId?: string;
  version: number;
  status: ScribePlanStatus;
  plan: ScribePlan;
  findings: ScribeFinding[];
  basis: string[];
  generatedBy?: string;
  generatedByName?: string;
  generatedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  reviewNote?: string;
  /** The plan as the consultant approved it, with any lines removed / added. */
  approvedPlan?: ScribePlan | null;
  /** The TreatmentPlan created on approval. */
  treatmentPlanId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ACTION_STATUSES = ['done', 'partial', 'not_done', 'ordered', 'prescribed', 'result_entered', 'cancelled'] as const;
export type ActionStatus = typeof ACTION_STATUSES[number];
/** These need the reason it was not (fully) done. */
export const REASON_REQUIRED: readonly string[] = ['not_done', 'partial', 'cancelled'];

export interface ActionPrescription {
  drug: string; form?: string; dose: string; route: string; frequency: string; frequencyWords?: string;
  duration?: string; instructions?: string; prescriptionId?: string | null;
}
export interface ActionInvestigation {
  category?: string; test: string; code?: string; priority?: string; investigationId?: string | null;
}
export interface ActionResult {
  test: string; value?: string | null; unit?: string | null; text?: string | null; ocrText?: string | null; reference?: string | null;
}

export interface ScribePlanAction {
  id: string;
  scribePlanId: string;
  patientId: string;
  itemKey: string;
  itemText?: string;
  itemKind?: string;
  status: ActionStatus;
  note?: string | null;
  prescription?: ActionPrescription | null;
  investigation?: ActionInvestigation | null;
  result?: ActionResult | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
  locationLabel?: string | null;
  locationStatus?: string | null;
  /** From the signed-in user, never typed. */
  userId?: string;
  userName?: string;
  userRole?: string;
  /** When it was logged, by this device's clock; the database adds its own received_at. */
  loggedAt: string;
  attachments?: { id: string; name: string; mime: string; size?: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface ScribePlanAttachment {
  id: string;
  actionId: string;
  patientId: string;
  name: string;
  mime: string;
  sizeBytes: number;
  /** A data URL. Photos are compressed on the device first. */
  data: string;
  createdAt: string;
  updatedAt: string;
}
