/**
 * Tumour Board — persisted entity types.
 *
 * Multidisciplinary oncology assessment, staging, multimodality planning,
 * referral generation, surveillance and patient counselling for soft tissue
 * malignancy and all skin cancers (melanoma and non-melanoma).
 *
 * The CLINICAL logic is not here — staging, plan, letters, surveillance and
 * counselling are pure functions in `services/oncology/*`, unit-testable
 * without a database and running unchanged offline. These types describe only
 * what is written to IndexedDB and mirrored to Supabase.
 *
 * Field names are camelCase locally and are auto-converted to snake_case by the
 * shared sync layer (`tumour_board_cases`, `tumour_board_assessments`,
 * `tumour_board_plans`, `tumour_board_referrals`, `tumour_board_surveillance`).
 */

import type {
  StagingBasis,
  StagingInput,
  SarcomaGrade,
  SarcomaSite,
  TumorFamily,
} from './services/oncology/stagingEngine';
import type { PlanItem, Specialty, TreatmentIntent } from './services/oncology/managementPlan';
import type { SurveillanceCategory } from './services/oncology/surveillance';

export type CaseStatus = 'active' | 'in_treatment' | 'surveillance' | 'closed';

/** One patient's oncology case, carried from presentation through surveillance. */
export interface TumourBoardCase {
  id: string;
  patientId: string;
  hospitalId?: string;
  hospitalNumber?: string;
  tumorFamily: TumorFamily;
  diagnosis?: string;
  primarySite?: string;
  laterality?: string;
  sarcomaSite?: SarcomaSite;
  dateOfDiagnosis?: string;
  dateFirstPresented?: string;
  status?: CaseStatus;
  treatmentIntent?: TreatmentIntent | string;
  performanceStatus?: string;
  comorbidities?: string;
  immunosuppressed?: boolean;
  highRiskSite?: boolean;
  recurrentDisease?: boolean;
  fitForRadicalTherapy?: boolean | null;
  brafMutated?: boolean | null;
  histologyAvailable?: boolean;
  histologicType?: string | null;
  /** Denormalised rollups from the newest assessment, for the worklist. */
  currentStageGroup?: string;
  currentStageFormatted?: string;
  assessmentCount?: number;
  lastBoardDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One staging assessment. This table is APPEND-ONLY.
 *
 * A case is typically staged clinically, re-staged when histology lands, and
 * re-staged again after neoadjuvant therapy. Overwriting would destroy the
 * record of what was known when a decision was taken — which is precisely what
 * a tumour board record exists to preserve.
 */
export interface TumourBoardAssessment {
  id: string;
  caseId: string;
  patientId: string;
  /**
   * Best-effort version stamp assigned at write time. Two clinicians assessing
   * the same case offline can both mint the same number, so the UI derives the
   * DISPLAYED ordinal from chronological order instead (see
   * `withDerivedVersions`). This field is kept for the exported record.
   */
  version?: number;
  basis: StagingBasis;
  stagingSystem?: string;
  assessedAt?: string;
  assessedBy?: string;
  /** The full staging input, so the StageResult can be re-derived exactly. */
  inputs?: StagingInput;
  tCategory?: string;
  nCategory?: string;
  mCategory?: string;
  stageGroup?: string;
  stageFormatted?: string;
  stageDescription?: string;
  caveats?: string[];
  localSpread?: string;
  regionalSpread?: string;
  metastaticSpread?: string;
  histologicType?: string | null;
  histologicGrade?: SarcomaGrade | string | null;
  margins?: string;
  lymphovascularInvasion?: boolean | null;
  perineuralInvasion?: boolean | null;
  molecularFindings?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** A ratifiable multimodality plan snapshot, tied to the assessment it came from. */
export interface TumourBoardPlan {
  id: string;
  caseId: string;
  patientId: string;
  assessmentId?: string | null;
  intent: TreatmentIntent;
  summary: string;
  items: PlanItem[];
  specialties: Specialty[];
  caveats: string[];
  boardDate?: string | null;
  boardMembers?: string | null;
  /**
   * Every generated plan is a DRAFT until the board ratifies it. Only a
   * consultant-level role may set this.
   */
  ratified?: boolean;
  ratifiedBy?: string | null;
  ratifiedAt?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferralStatus = 'draft' | 'sent' | 'acknowledged';

export interface TumourBoardReferral {
  id: string;
  caseId: string;
  patientId: string;
  planId?: string | null;
  specialty: Specialty;
  specialtyLabel: string;
  subject: string;
  body: string;
  requestedItems: string[];
  urgency: 'routine' | 'urgent' | 'two_week';
  status: ReferralStatus;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SurveillanceStatus = 'scheduled' | 'completed' | 'missed';

export interface TumourBoardSurveillanceItem {
  id: string;
  caseId: string;
  patientId: string;
  category: SurveillanceCategory;
  title: string;
  detail: string;
  dueMonth: number;
  dueDate: string;
  phase: string;
  basis: string;
  status: SurveillanceStatus;
  completedAt?: string | null;
  findings?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Worklist aggregate for the board landing view. */
export interface BoardSummary {
  total: number;
  awaitingHistology: number;
  overdueSurveillance: number;
}

/** A case row enriched with its patient's identifiers for the worklist. */
export interface TumourBoardCaseRow extends TumourBoardCase {
  firstName?: string;
  lastName?: string;
  patientHospitalNumber?: string;
  overdueSurveillanceCount?: number;
}

export interface CaseDetail {
  case: TumourBoardCaseRow;
  /** Newest first. */
  assessments: TumourBoardAssessment[];
  plans: TumourBoardPlan[];
  referrals: TumourBoardReferral[];
  surveillance: TumourBoardSurveillanceItem[];
}

export const CASE_STATUS_META: Record<CaseStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_treatment: { label: 'In treatment', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  surveillance: { label: 'Surveillance', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  closed: { label: 'Closed', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export type {
  TumorFamily,
  StagingBasis,
  StagingInput,
  SarcomaGrade,
  SarcomaSite,
  Specialty,
  PlanItem,
  TreatmentIntent,
  SurveillanceCategory,
};
