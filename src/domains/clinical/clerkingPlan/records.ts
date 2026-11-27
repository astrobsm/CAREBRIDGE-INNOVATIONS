/**
 * The stored clerking plan (Dexie `clerkingPlans`, Supabase `clerking_plans`).
 *
 * WHY A TABLE OF ITS OWN, NOT THE ENCOUNTER: the clerking rides on the
 * ClinicalEncounter row and becomes read-only once signed, while the plan
 * keeps changing after the visit — results arrive days later, the plan is
 * re-interpreted and re-approved (versions), shared and booked. Writing those
 * onto a signed encounter would either break its read-only guarantee or
 * fight its version check; and a plan can also start from a follow-up visit
 * or a wound review. So the plan has its own row, linked to the encounter by
 * encounterId, with a snapshot of the clerking it was built from.
 */
import type { ClerkingData } from '../clerking/types';
import type { PatientContext } from '../clerking/engine';
import type { AiPlanDraft } from './aiPlan';
import type { AiInterpretation } from './aiInterpret';
import type { FinalLine, LineDecision } from './finalPlan';
import type { Interpretation, ResultValue } from './results';
import type { PlanLine, RulesPlan } from './types';

export type ClerkingPlanSource = 'initial' | 'follow_up' | 'wound_review';
export type ClerkingPlanStatus = 'draft' | 'approved';

export interface PlanApproval {
  version: number;
  at: string;
  by: string;
  byName?: string;
  byRole?: string;
  lines: FinalLine[];
  hardRules: string[];
  rulesInputsHash: string;
  protocolVersion: string | null;
  engineVersion: string;
  /** The approved plan included Claude-drafted lines. */
  includesAi: boolean;
}

export interface PlanShare {
  id: string;
  at: string;
  by: string;
  byName?: string;
  via: 'whatsapp' | 'download';
  audience: 'patient' | 'clinician';
  fileName: string;
  planVersion: number;
  phone?: string;
}

export interface PlanAppointment {
  /** follow-up line id + plan version: booking the same visit twice is a no-op. */
  key: string;
  lineId: string;
  appointmentId: string;
  date: string;
  purpose: string;
  planVersion: number;
  at: string;
}

export interface ClerkingPlanRecord {
  id: string;
  patientId: string;
  hospitalId?: string;
  encounterId?: string;
  source: ClerkingPlanSource;
  status: ClerkingPlanStatus;
  /** Latest approved version (0 until approved). */
  planVersion: number;
  conditions: RulesPlan['conditions'];
  /** The clerking the plan was built from (snapshot), and the patient context. */
  clerking: ClerkingData;
  ctx: PatientContext;
  conditionIds: string[];
  woundProtocol: boolean | null;
  rulesPlan: RulesPlan;
  aiDraft?: { draft: AiPlanDraft; lines: PlanLine[]; inputsHash: string; at: string; by?: string; missingHardRules: string[] } | null;
  decisions: LineDecision[];
  manualLines: PlanLine[];
  results: ResultValue[];
  interpretation?: {
    deterministic: Interpretation;
    at: string;
    ai?: { value: AiInterpretation; lines: PlanLine[]; at: string; missingHardRules: string[] } | null;
  } | null;
  approvals: PlanApproval[];
  shares: PlanShare[];
  appointments: PlanAppointment[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}
