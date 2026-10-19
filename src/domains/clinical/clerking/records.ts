/**
 * Stored shapes for structured clerking: the encounter's clerking block and
 * the problem list / plan items it feeds.
 *
 * The clerking itself is not a separate table. It rides on the existing
 * ClinicalEncounter row (field `clerking`), and its prose is written into the
 * encounter's ordinary free-text fields, so every existing reader — the
 * encounter PDF, the clinical summary, the discharge summary — sees a normal
 * encounter. What is stored here is what makes it reviewable, signable and
 * trackable.
 *
 * Status flow: draft → pending_review (author cannot sign) → signed; a signer
 * may go straight to signed. entered_in_error withdraws everything it fed.
 * Every update carries `version`, so two people editing the same draft on two
 * devices cannot silently overwrite each other.
 */
import type { ClerkingData, Suggestion } from './types';
import type { FollowUpData } from './engine';

export type ClerkingKind = 'initial' | 'follow_up';
export type ClerkingStatus = 'draft' | 'pending_review' | 'signed' | 'entered_in_error';

export interface StructuredClerking {
  kind: ClerkingKind;
  status: ClerkingStatus;
  /** ClerkingData for an initial clerking, FollowUpData for a follow-up. */
  data: ClerkingData | FollowUpData;
  suggestions: Suggestion[];
  /** Compact digest for lists and the summary: complaints, red flags, accepted items. */
  summary: Record<string, any>;
  narrative: string;
  version: number;
  parentEncounterId?: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  submittedAt?: string;
  signedBy?: string;
  signedByName?: string;
  signedAt?: string;
  errorReason?: string;
}

export const PROBLEM_STATUSES = ['active', 'improving', 'worsening', 'resolved', 'ruled_out', 'withdrawn'] as const;
export const PLAN_STATUSES = ['pending', 'in_progress', 'done', 'not_done', 'stopped', 'withdrawn'] as const;
export type ProblemStatus = typeof PROBLEM_STATUSES[number];
export type PlanStatus = typeof PLAN_STATUSES[number];

export interface TrackedReview { status?: string; note?: string | null; at?: string; by?: string | null; encounterId?: string }

/**
 * A diagnosis the clinician ACCEPTED in a clerking — tracked until resolved
 * or ruled out. Keyed by (encounterId, suggestionId): resubmitting never
 * duplicates, and an un-accepted suggestion is withdrawn rather than deleted.
 */
export interface ClinicalProblem {
  id: string;
  patientId: string;
  hospitalId?: string;
  encounterId: string;
  suggestionId: string;
  label: string;
  reasons: string[];
  dangerous: boolean;
  source?: string;
  status: ProblemStatus;
  lastReview?: TrackedReview | null;
  createdAt: string;
  updatedAt: string;
}

/** An investigation or treatment the clinician ACCEPTED — tracked until done or stopped. */
export interface ClinicalPlanItem {
  id: string;
  patientId: string;
  hospitalId?: string;
  encounterId: string;
  suggestionId: string;
  kind: 'investigation' | 'treatment';
  text: string;
  reason?: string;
  priority?: string;
  source?: string;
  status: PlanStatus;
  lastReview?: TrackedReview | null;
  createdAt: string;
  updatedAt: string;
}
