/**
 * WoundProgress Monitor — longitudinal wound tracking types.
 *
 * Introduces a FIRST-CLASS wound identity followed over time, on top of the
 * app's existing per-assessment wound suite. Each `MonitoredWound` has a stable
 * identity and a serial `WoundAssessment` timeline; healing analytics are then
 * derived from that timeline (see woundMonitorService).
 *
 * These live in their own IndexedDB tables (`monitoredWounds`,
 * `woundAssessments`) and ride the shared Supabase sync layer
 * (`monitored_wounds`, `wound_assessments`). Field names are camelCase locally
 * and are auto-converted to snake_case on sync.
 */

export type WoundMonitorStatus = 'active' | 'healed' | 'archived';

export type HealingStatus =
  | 'improving'
  | 'stagnant'
  | 'worsening'
  | 'healed'
  | 'insufficient_data';

/** A single physical wound followed over time. */
export interface MonitoredWound {
  id: string;
  patientId: string;
  hospitalId?: string;
  hospitalNumber?: string;
  label?: string;
  woundType?: string;
  anatomicalLocation?: string;
  bodySide?: string;
  etiology?: string;
  stage?: string;
  dateFirstSeen?: string;
  dateOfInjury?: string;
  cause?: string;
  status?: WoundMonitorStatus;
  createdBy?: string;
  /**
   * Set when this wound was imported from a legacy `wounds` record (the
   * standalone Wounds module that the Monitor replaced). Holds that record's
   * id, which makes the import idempotent and preserves the audit trail back
   * to the original entry.
   */
  sourceWoundId?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type ExudateAmount = 'none' | 'light' | 'moderate' | 'heavy';
export type ExudateType = 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent';
export type TissueType = 'epithelial' | 'granulation' | 'slough' | 'necrotic' | 'eschar';

/** A clinical photograph attached to one assessment. */
/**
 * A clinical photograph kept as the evidence behind a measurement.
 *
 * The frame is stored exactly as captured, calibration marker included — that
 * is the point of keeping it. A number in the record says the wound was 5 cm2;
 * the photograph shows the marker that number was derived from, so the
 * measurement can be checked, re-measured or defended months later.
 *
 * Stored downscaled. The measurement runs on the full-resolution frame, but
 * keeping that frame would put several megabytes of base64 into a synced JSONB
 * column on every assessment.
 */
export interface WoundAssessmentPhoto {
  id: string;
  /** Data URL, for offline-first storage; uploaded copies carry `url` instead. */
  imageData?: string;
  url?: string;
  caption?: string;
  takenAt?: string; // ISO

  /** Pixel dimensions of the STORED (downscaled) image. */
  widthPx?: number;
  heightPx?: number;
  /**
   * Scale of the stored image, in pixels per cm — rescaled from the
   * full-resolution measurement. Lets the saved frame be re-measured later
   * without the original.
   */
  pixelsPerCm?: number | null;
  /** How that scale was obtained (green_marker, grid, ruler, manual…). */
  calibrationMethod?: string;
  /** Whether the scale was trustworthy at capture time. */
  scaleReliable?: boolean;
  /**
   * True when the detected wound margin is drawn onto the stored frame.
   *
   * This is what makes the photograph evidence rather than decoration: the
   * area is only believable if the outline it was computed from actually
   * follows the wound edge, and the only way to know that is to look.
   */
  hasContourOverlay?: boolean;
  /** Number of points in the traced margin, 0 when nothing was outlined. */
  contourPointCount?: number;
}

/** Local signs of wound infection, offered as checkboxes at assessment time. */
export const INFECTION_SIGNS = [
  'Erythema',
  'Warmth',
  'Swelling',
  'Purulent discharge',
  'Malodour',
  'Increasing pain',
  'Delayed healing',
  'Friable granulation',
] as const;

/**
 * One serial assessment on a monitored wound.
 *
 * Carries both the measurement layer (dimensions, tissue percentages, the CV
 * contour) and the bedside clinical layer that the standalone Wounds page used
 * to own — exudate, odour, pain, peri-wound skin, infection signs and the
 * dressing in use. They belong on one record: an assessment that reports 40%
 * slough but cannot say whether the wound is malodorous and strikes through
 * daily is not one a clinician can act on, and splitting them is precisely what
 * produced two half-complete wound modules.
 */
export interface WoundAssessment {
  id: string;
  woundId: string;
  patientId: string;
  assessedBy?: string;
  assessedAt?: string; // ISO

  // ── Measurement ──
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  areaCm2?: number | null;
  perimeterCm?: number | null;
  granulationPct?: number | null;
  sloughPct?: number | null;
  necroticPct?: number | null;
  epithelialPct?: number | null;
  healingStage?: string;
  clinicalDescription?: string;
  aiConfidence?: number;
  calibrationType?: string;
  scaleReliable?: boolean;
  contourCm?: Array<{ x: number; y: number }>;
  imageUrl?: string;

  // ── Bedside clinical assessment (merged in from the Wounds module) ──
  /** Qualitative tissue types present, alongside the quantitative *Pct fields. */
  tissueTypes?: TissueType[];
  exudateAmount?: ExudateAmount;
  exudateType?: ExudateType;
  /** Malodour present. Feeds the infection prompt and the dressing protocol. */
  odor?: boolean;
  /** 0-10 numeric rating scale. */
  painLevel?: number | null;
  periWoundCondition?: string;
  infectionSigns?: string[];
  dressingType?: string;
  dressingFrequency?: string;
  /** Serial clinical photographs for this assessment. */
  photos?: WoundAssessmentPhoto[];

  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Derived healing picture for one wound (pure, DB-free). */
export interface HealingAnalytics {
  status: HealingStatus;
  /** Area change from first to latest assessment, cm². Negative = shrinking (good). */
  absoluteAreaChangeCm2: number;
  /** Percentage reduction from baseline. Positive = healing. */
  percentAreaReduction: number;
  /** Least-squares slope of area over time, cm²/week. Negative = healing. */
  velocityCm2PerWeek: number;
  /** Projected days to closure at the current velocity, or null if not closing. */
  projectedDaysToClosure: number | null;
  /** Consecutive assessments with no meaningful improvement. */
  stagnantStreak: number;
  /** Assessments the analysis is based on. */
  assessmentCount: number;
  /** True when at least one measurement lacked a reliable calibration scale. */
  hasUnreliableScale: boolean;
}

/** A wound row enriched with the latest-assessment rollups for list/dashboard views. */
export interface MonitoredWoundSummary extends MonitoredWound {
  latestAreaCm2?: number | null;
  latestAssessmentAt?: string | null;
  baselineAreaCm2?: number | null;
  assessmentCount?: number;
  healingStatus?: HealingStatus;
  healingVelocityCm2PerWeek?: number | null;
  // Denormalised patient fields for the dashboard row (optional).
  firstName?: string;
  lastName?: string;
}

export const HEALING_STATUS_META: Record<HealingStatus, { label: string; color: string; dot: string }> = {
  improving: { label: 'Improving', color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' },
  stagnant: { label: 'Stalled', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  worsening: { label: 'Worsening', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  healed: { label: 'Healed', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  insufficient_data: { label: 'New', color: 'text-gray-600 bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
};
