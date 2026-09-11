/**
 * Photographic skin graft monitoring — domain model.
 *
 * The organising idea is that a photograph is the measurement instrument, so
 * every derived number carries the evidence and the provenance that produced
 * it: which frame, at what quality, on what scale, by which algorithm version.
 * A result that cannot be traced back to a specific image is not auditable and
 * is not stored.
 *
 * Shape follows the rest of the app: camelCase locally, auto-converted to
 * snake_case by the sync layer, offline-first in Dexie with a Supabase mirror.
 *
 * Supersedes `SkinGraftRecord` / `GraftAssessment` in types/index.ts, which are
 * referenced by no UI and are built around a manually typed take percentage.
 */

import type { ImageQualityReport } from './services/imageQualityService';

// ── Provenance ──────────────────────────────────────────────────────────────

/**
 * Confidence is reported as a band, not a number.
 *
 * The estimators behind viability and epithelialization are colour-analysis
 * heuristics, not probability-calibrated models. Printing "87%" next to their
 * output would imply a precision that does not exist. A band says how much
 * weight to give the result without inventing a figure (spec §35).
 */
export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'uncertain';

/**
 * Identifies exactly what produced a result, so any analysis can be reproduced,
 * audited, or excluded later — in particular, everything produced by the
 * prototype heuristics can be found again once a trained model replaces them.
 */
export interface AnalysisProvenance {
  /** e.g. 'heuristic-viability-1.0.0'. The 'heuristic-' prefix is load-bearing. */
  modelVersion: string;
  /** Version of the segmentation/measurement pipeline used. */
  pipelineVersion: string;
  /** Version of the image quality gate that admitted the frame. */
  qualityGateVersion: string;
  analysedAt: string; // ISO
  /** True when no trained model was involved and the result is a heuristic. */
  isPrototypeEstimator: boolean;
}

// ── Episode ─────────────────────────────────────────────────────────────────

export type GraftType = 'stsg' | 'ftsg' | 'composite' | 'allograft' | 'xenograft' | 'cultured_epithelium';

export type EpisodeStatus = 'planned' | 'grafted' | 'monitoring' | 'healed' | 'failed' | 'archived';

/** One grafting operation, binding its recipient and donor sites together. */
export interface SkinGraftEpisode {
  id: string;
  patientId: string;
  hospitalId?: string;
  /** Links to the existing surgery record when the case came through theatre. */
  surgeryId?: string;

  label?: string;
  graftType?: GraftType;
  /** Expansion applied at meshing, e.g. 1.5 for 1:1.5. */
  meshRatio?: number;
  /** Split-thickness harvest depth, mm, when recorded. */
  graftThicknessMm?: number;

  /** The operation date. Postoperative day is counted from here. */
  graftedAt?: string; // ISO
  status: EpisodeStatus;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  /** Set when migrated from the superseded SkinGraftRecord. */
  sourceRecordId?: string;
}

// ── Sites ───────────────────────────────────────────────────────────────────

export type SiteKind = 'recipient' | 'donor';

/**
 * A recipient or donor site within an episode.
 *
 * `baselineAreaCm2` is the load-bearing field. Graft take is measured against
 * the area established at baseline, never against the most recent photograph —
 * otherwise a graft that shrinks would appear to hold at 100% of its own
 * diminished self, and a donor site would never finish epithelialising. The
 * baseline is written once, from a specific assessment, and changing it is an
 * explicit, recorded act.
 */
export interface GraftSite {
  id: string;
  episodeId: string;
  patientId: string;
  kind: SiteKind;

  anatomicalLocation?: string;
  bodySide?: string;
  label?: string;

  /** Recipient: grafted area at application. Donor: total harvested area. */
  baselineAreaCm2?: number | null;
  /** The assessment that established the baseline. */
  baselineAssessmentId?: string;
  baselineAt?: string; // ISO
  /**
   * Recorded when a clinician deliberately re-baselines, with their reason.
   * Present only if it has happened; its absence means the original stands.
   */
  baselineRevision?: {
    previousAreaCm2: number | null;
    revisedBy: string;
    revisedAt: string;
    reason: string;
  };

  status: 'active' | 'healed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ── Photographic assessment ─────────────────────────────────────────────────

export type AssessmentStatus =
  /** Passed the gate and was measured. */
  | 'analysed'
  /** Gate said the frame could not be measured; no numbers were produced. */
  | 'rejected_quality'
  /** Measured, but the estimator was not confident enough to stand alone. */
  | 'uncertain'
  /** A clinician has reviewed it. */
  | 'reviewed';

export type ReviewAction = 'accepted' | 'corrected' | 'rejected' | 'flagged';

/**
 * A clinician's adjudication of an automated result.
 *
 * Corrections never overwrite: the automated values stay on the assessment and
 * the corrected values live here, so the pair remains available as training and
 * validation data (spec §37, §48).
 */
export interface ClinicalReview {
  action: ReviewAction;
  reviewedBy: string;
  reviewedByName?: string;
  reviewedAt: string;
  reason?: string;
  /** Only the fields the clinician actually changed. */
  corrected?: {
    areaCm2?: number;
    viableAreaCm2?: number;
    takePercent?: number;
    epithelializedPercent?: number;
  };
}

/** Measurements derived from the segmentation, in real-world units. */
export interface SiteMeasurement {
  areaCm2: number | null;
  perimeterCm: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  /** pixels per cm on the analysed frame. */
  pixelsPerCm: number | null;
  calibrationMethod?: string;
  calibrationConfidence?: ConfidenceBand;
}

/** Colour/tissue breakdown of the segmented region, summing to ~100. */
export interface TissueBreakdown {
  granulationPct?: number | null;
  sloughPct?: number | null;
  necroticPct?: number | null;
  epithelialPct?: number | null;
}

/**
 * Recipient-site findings.
 *
 * `takePercent` is viable area over the site's PRESERVED baseline area, not
 * over the area seen in this photograph.
 */
export interface GraftTakeFindings {
  viableAreaCm2: number | null;
  nonviableAreaCm2: number | null;
  takePercent: number | null;
  confidence: ConfidenceBand;
}

/** Donor-site findings. */
export interface EpithelializationFindings {
  epithelializedAreaCm2: number | null;
  openAreaCm2: number | null;
  epithelializedPercent: number | null;
  confidence: ConfidenceBand;
}

/**
 * One photographic assessment of one site.
 *
 * A rejected frame is still stored. Knowing that a photograph was taken on POD 5
 * and could not be measured is clinically meaningful — it is the difference
 * between a gap in monitoring and a gap in the record.
 */
export interface GraftPhotoAssessment {
  id: string;
  episodeId: string;
  siteId: string;
  patientId: string;
  kind: SiteKind;

  capturedAt: string; // ISO
  /** Days since the episode's graft date; null when that date is unknown. */
  postOpDay: number | null;
  assessedBy?: string;

  status: AssessmentStatus;

  /** The gate's verdict and its reasons. Present even when the frame failed. */
  imageQuality: ImageQualityReport;

  /** Stored frame: downscaled, with the traced margin drawn on it. */
  photo?: {
    imageData?: string;
    url?: string;
    widthPx?: number;
    heightPx?: number;
    hasContourOverlay?: boolean;
  };

  measurement?: SiteMeasurement;
  tissue?: TissueBreakdown;
  graft?: GraftTakeFindings;
  donor?: EpithelializationFindings;

  /** Why the automated result could not be trusted, when status is uncertain. */
  uncertaintyReasons?: string[];

  provenance: AnalysisProvenance;
  review?: ClinicalReview;

  createdAt: string;
  updatedAt: string;
}

// ── Trajectory and prediction ───────────────────────────────────────────────

export type Trajectory =
  | 'improving'
  | 'stable'
  | 'deteriorating'
  | 'delayed'
  | 'insufficient_data';

/**
 * A prediction of donor-site closure from the observed photographic trajectory.
 *
 * Deliberately expressed as a range. A point estimate implies a precision that
 * a handful of photographs cannot support, and the honest output of a sparse
 * series is an interval plus a statement of how much it rests on.
 */
export interface HealingPrediction {
  trajectory: Trajectory;
  /** Percentage points of epithelialization per day, from the fitted slope. */
  ratePerDay: number | null;
  /** Predicted POD range for complete closure. Null when not predictable. */
  predictedClosurePodFrom: number | null;
  predictedClosurePodTo: number | null;
  confidence: ConfidenceBand;
  /** Number of measured assessments the prediction rests on. */
  basedOnAssessments: number;
  /** Plain statement of what limits this prediction. */
  caveats: string[];
  modelVersion: string;
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export type AlertKind =
  | 'image_quality'
  | 'calibration_failed'
  | 'graft_loss_increasing'
  | 'viability_falling'
  | 'epithelialization_delayed'
  | 'trajectory_abnormal'
  | 'possible_complication'
  | 'assessment_overdue';

export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface GraftAlert {
  id: string;
  episodeId: string;
  siteId?: string;
  patientId: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  /** The assessment that raised it, so the clinician can see the evidence. */
  assessmentId?: string;
  raisedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Graft planning ──────────────────────────────────────────────────────────

/**
 * Planning estimate for how much graft to harvest. Explicitly an estimate:
 * it informs the harvest, it does not prescribe it (spec §11).
 */
export interface GraftPlan {
  defectAreaCm2: number;
  /** Extra coverage for graft edges and handling, as a fraction, e.g. 0.05. */
  coverageMargin: number;
  plannedCoverageCm2: number;
  /** 1 means unmeshed; 1.5 means 1:1.5. */
  meshRatio: number;
  estimatedHarvestAreaCm2: number;
  computedAt: string;
}
