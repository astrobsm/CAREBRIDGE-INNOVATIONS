/**
 * The clerking plan: shared types.
 *
 * A PLAN is a list of LINES, each in one section, each carrying where it came
 * from (the wound clinic protocol, a condition template, a guideline, the
 * nutrition engine, Claude, or the clinician). The rules plan is computed by a
 * pure function from the clerking as it is typed (no AI); Claude's plan, when
 * the clinician asks for it, is a second list of lines in the same shape; the
 * FINAL plan is the lines the clinician accepted (or edited, or added).
 *
 * Patient-facing text never lives here: a line's `patient` text comes from the
 * locale table (patient-pack/locale), and a line without one is not printed on
 * the patient copy.
 */
import type { ComplaintEntry } from '../clerking/types';

export type PlanSection =
  | 'problems' | 'investigations' | 'medications' | 'nutrition' | 'procedures'
  | 'counselling' | 'monitoring' | 'follow_up' | 'referrals';

export const PLAN_SECTIONS: { id: PlanSection; label: string }[] = [
  { id: 'problems', label: 'Problems' },
  { id: 'investigations', label: 'Investigations' },
  { id: 'medications', label: 'Medications' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'procedures', label: 'Procedures and options' },
  { id: 'counselling', label: 'Counselling' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'referrals', label: 'Referrals' },
];

export type SourceKind = 'protocol' | 'template' | 'guideline' | 'engine' | 'clerking' | 'ai' | 'clinician';

export interface PlanSource {
  kind: SourceKind;
  /** e.g. "Wound clinic protocol v1.0.0", "Syndactyly template", "IWGDF 2023". */
  label: string;
}

export interface PlanMedication {
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  /** How the dose was worked out ("0.5–1 mg/kg × 8 kg, capped at 40 mg"). */
  weightBasis?: string;
  cautions: string[];
}

export interface PlanLine {
  /** Stable across recomputation, so decisions and staleness survive edits. */
  id: string;
  section: PlanSection;
  text: string;
  why?: string;
  urgency?: 'urgent' | 'soon' | 'routine';
  source: PlanSource;
  medication?: PlanMedication;
  /** An investigation that becomes a result row. */
  test?: { id: string; analytes?: string[]; qualitative?: { options?: string[] }; target?: string };
  /** A follow-up visit: days from approval, when it can be dated. */
  followUp?: { when: string; purpose: string; days?: number };
  /** Link to a procedure-review template when surgery is considered. */
  procedureReviewModuleId?: string;
  /** Plain-English text for the patient copy, from the locale table. Absent = clinician only. */
  patient?: string;
  /** Shown but advisory: the line is not recommended for this patient (and why). */
  withheld?: string;
}

export interface RulesPlan {
  /** The rules engine's own version, and the protocol version, recorded on the plan. */
  engineVersion: string;
  protocolVersion: string | null;
  conditions: { id: string; label: string; aiDrafted?: boolean }[];
  woundProtocolApplied: boolean;
  lines: PlanLine[];
  /** Verbatim rules that must never be broken (protocol contraindications, child dose caps). */
  hardRules: string[];
  /** Inputs the plan would use but that are not documented yet. */
  missing: string[];
  /** Hash of the inputs, for stale detection. */
  inputsHash: string;
}

// ── AI-drafted clerking fields ────────────────────────────────────────────

/** Claude-drafted question modules on a free-text complaint (clerking/types ComplaintEntry.aiFields). */
export type AiDraftedFields = NonNullable<ComplaintEntry['aiFields']>;
