/**
 * Scar and keloid longitudinal assessment — the data model.
 *
 * THE CENTRAL DISTINCTION
 * Every clinical value in this module carries its provenance, because the
 * safety of the whole thing rests on a reader being able to tell these apart:
 *
 *   measured   — geometry or colour taken from a calibrated photograph
 *   examined   — a clinician's hands on the scar
 *   reported   — the patient's own answer
 *   derived    — computed by this application from the above
 *   predicted  — a forward-looking estimate, never an observation
 *
 * A prediction rendered as though it were a finding is the specific failure
 * this module is built to prevent, so `DataOrigin` is required wherever a
 * value could be mistaken for an observation.
 *
 * A scar is a persistent entity, not a folder of photographs. One patient may
 * carry several, each with its own baseline, treatments and trajectory, and
 * they are never merged.
 */

import type { ImageQualityReport } from '../../services/imageQualityService';
import type { Trace } from '../../services/planimetry';

// ── Provenance ──────────────────────────────────────────────────────────────

export type DataOrigin =
  | 'measured'
  | 'examined'
  | 'reported'
  | 'derived'
  | 'predicted';

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'not_reliable';

/**
 * Quality of an assessment as a whole.
 *
 * Deliberately separate from completeness: a fully populated assessment built
 * on an out-of-focus photograph is complete and unreliable at the same time,
 * and conflating the two would let a tidy-looking record hide bad measurement.
 */
export type AssessmentQuality = 'high' | 'acceptable' | 'limited' | 'unreliable';

/**
 * Identifies exactly what produced a result so it can be reproduced, audited,
 * or excluded wholesale once a component is replaced.
 */
export interface ScarProvenance {
  origin: DataOrigin;
  /** e.g. 'traced-planimetry-1.0.0', 'cielab-1.0.0'. */
  method: string;
  methodVersion: string;
  /** Image quality gate version, where an image was involved. */
  qualityGateVersion?: string;
  computedAt: string;
  /** True while the producing component is a transparent heuristic. */
  isPrototype: boolean;
  /** Images this rests on, so a result can be traced back to its source. */
  inputImageIds?: string[];
}

// ── Scar case ───────────────────────────────────────────────────────────────

export type ScarClassification =
  | 'normal'
  | 'immature'
  | 'mature'
  | 'hypertrophic'
  | 'keloid'
  | 'contracture'
  | 'atrophic'
  | 'depressed'
  | 'mixed'
  | 'uncertain';

export const SCAR_CLASSIFICATIONS: { value: ScarClassification; label: string }[] = [
  { value: 'normal', label: 'Normal scar' },
  { value: 'immature', label: 'Immature scar' },
  { value: 'mature', label: 'Mature scar' },
  { value: 'hypertrophic', label: 'Hypertrophic scar' },
  { value: 'keloid', label: 'Keloid' },
  { value: 'contracture', label: 'Contracture scar' },
  { value: 'atrophic', label: 'Atrophic scar' },
  { value: 'depressed', label: 'Depressed scar' },
  { value: 'mixed', label: 'Mixed scar' },
  { value: 'uncertain', label: 'Uncertain — not yet classified' },
];

export type Laterality = 'left' | 'right' | 'midline' | 'bilateral' | 'not_applicable';

/**
 * A classification held two ways at once.
 *
 * The application's suggestion and the clinician's judgement are stored side by
 * side rather than the second overwriting the first. Everything downstream
 * reads `clinician` when it is present, but the suggestion survives so that
 * agreement can be measured later — the only way to find out whether the
 * suggestion is any good is to keep both.
 */
export interface ScarClassificationRecord {
  suggested?: ScarClassification;
  suggestedConfidence?: ConfidenceBand;
  suggestedBasis?: string;
  clinician?: ScarClassification;
  clinicianId?: string;
  confirmedAt?: string;
  /** Set when the clinician disagreed with the suggestion. */
  overrideReason?: string;
}

export interface ScarCase {
  id: string;
  patientId: string;
  hospitalId?: string;

  /** Short name the clinician recognises it by, e.g. 'Left earlobe keloid'. */
  label: string;
  anatomicalSite: string;
  laterality: Laterality;

  classification: ScarClassificationRecord;

  /** When the injury or operation that produced the scar occurred. */
  onsetAt?: string;
  causeOfScar?: string;
  /** Free text: excision, steroid, radiotherapy elsewhere, and so on. */
  priorTreatments?: string;

  /**
   * The original wound or incision, where it is known.
   *
   * Load-bearing for keloids: extension beyond the original wound margin is
   * the definition that separates keloid from hypertrophic scar. Never
   * inferred — if nobody recorded it, it stays absent and the extension
   * figures are simply not produced.
   */
  originalWoundAreaCm2?: number;
  originalWoundLengthCm?: number;
  originalWoundSource?: 'traced' | 'measured_at_surgery' | 'clinician_estimate';

  status: 'active' | 'resolved' | 'archived';
  baselineAssessmentId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Photography ─────────────────────────────────────────────────────────────

/**
 * Capture conditions, kept so that two assessments can be compared honestly.
 *
 * A scar photographed at a different distance, on a different phone, under
 * different light will measure differently for reasons that have nothing to do
 * with the scar. Storing the conditions is what makes it possible to warn
 * about that instead of silently reporting it as change.
 */
export interface CaptureConditions {
  deviceLabel?: string;
  imageWidth: number;
  imageHeight: number;
  /** 'flash' | 'daylight' | 'ward_fluorescent' | 'theatre' | 'other'. */
  lighting?: string;
  /** Roughly how the camera was held relative to the scar. */
  viewAngle?: 'perpendicular' | 'oblique' | 'unknown';
  distanceCm?: number;
}

export type ScarViewKind =
  | 'primary'
  | 'close_up'
  | 'left_oblique'
  | 'right_oblique'
  | 'left_lateral'
  | 'right_lateral'
  | 'functional';

export interface ScarImage {
  id: string;
  assessmentId: string;
  scarId: string;
  view: ScarViewKind;
  /** Downscaled JPEG data URL. The original capture is never discarded. */
  dataUrl: string;
  /** The same frame with traced boundaries drawn on, as visible evidence. */
  annotatedDataUrl?: string;
  quality: ImageQualityReport;
  conditions: CaptureConditions;
  /** Pixels per cm from the green marker; null when calibration failed. */
  pixelsPerCm: number | null;
  capturedAt: string;
}

// ── Traced regions ──────────────────────────────────────────────────────────

/**
 * What a traced ring on a scar photograph means.
 *
 * `reference_skin` is the one that makes colour analysis defensible across
 * skin tones: every colour figure is a difference between the scar and this
 * patient's own adjacent skin, never an absolute value judged against an
 * assumed baseline.
 */
export type ScarRegionRole =
  | 'scar'
  | 'reference_skin'
  | 'original_wound'
  | 'ulceration'
  | 'nodule';

export interface ScarRegionTrace {
  role: ScarRegionRole;
  /** Image-pixel space, so an assessment can be reopened and re-measured. */
  trace: Trace;
  imageId: string;
}

// ── 2D morphometry ──────────────────────────────────────────────────────────

export interface ScarMorphometry {
  areaCm2: number | null;
  perimeterCm: number | null;
  maxLengthCm: number | null;
  maxWidthCm: number | null;
  meanWidthCm: number | null;

  /** Dimensionless shape descriptors, computable without calibration. */
  aspectRatio: number | null;
  /** 4πA/P². 1 is a perfect circle; keloids trend low and lobulated. */
  circularity: number | null;
  /** Area over its convex hull. Low means lobulated or branching. */
  solidity: number | null;
  /** Perimeter over the convex hull's. Above 1 means an irregular border. */
  borderIrregularity: number | null;

  /** Present only when the original wound boundary was actually recorded. */
  extensionBeyondOriginalCm2: number | null;
  extensionBeyondOriginalPercent: number | null;

  provenance: ScarProvenance;
  /** Why a figure is missing or should not be trusted. */
  limitations: string[];
}

// ── Colour ──────────────────────────────────────────────────────────────────

export interface LabColour {
  l: number;
  a: number;
  b: number;
}

/**
 * Colour measured as a difference from the patient's own adjacent skin.
 *
 * Absolute colour cannot be interpreted clinically without knowing the
 * patient's constitutive pigmentation, and a system that tried would read
 * normal deeply pigmented skin as pathology. Every figure here is a contrast.
 */
export interface ScarColourAnalysis {
  scarLab: LabColour;
  referenceLab: LabColour;

  /** CIE76 — simple, and adequate for the differences seen here. */
  deltaE76: number;
  /** CIEDE2000 — perceptually weighted, better near neutral colours. */
  deltaE2000: number;

  /** a* difference. Positive means the scar is redder than adjacent skin. */
  erythemaIndex: number;
  /** L* difference. Negative means the scar is darker than adjacent skin. */
  pigmentationIndex: number;

  /** Standard deviation of ΔE within the scar — how mottled it is. */
  colourHeterogeneity: number;

  scarPixelCount: number;
  referencePixelCount: number;

  provenance: ScarProvenance;
  limitations: string[];
}

// ── 3D ──────────────────────────────────────────────────────────────────────

export type ReconstructionQuality = 'high' | 'moderate' | 'low' | 'failed' | 'unavailable';

/**
 * 3D morphometry.
 *
 * No reconstruction engine ships with this application, and elevation and
 * volume cannot be recovered from a single photograph by any honest means. The
 * shape is defined so a real photogrammetry or depth-sensor provider can fill
 * it later; until one is registered, `quality` is 'unavailable' and every
 * measurement is null. Nothing here is ever estimated from 2D.
 */
export interface Scar3DMeasurement {
  quality: ReconstructionQuality;
  maxElevationMm: number | null;
  meanElevationMm: number | null;
  volumeCm3: number | null;
  surfaceAreaCm2: number | null;
  /** How the reference skin plane was established, when one was. */
  referencePlaneMethod?: string;
  imageCount: number;
  provenance?: ScarProvenance;
  limitations: string[];
}

// ── Physical examination ────────────────────────────────────────────────────

export interface ScarPhysicalExam {
  pliability?: 'normal' | 'slightly_firm' | 'moderately_firm' | 'very_firm' | 'rigid';
  consistency?: 'soft' | 'rubbery' | 'firm' | 'hard';
  mobility?: 'freely_mobile' | 'mildly_restricted' | 'moderately_restricted' | 'fixed';
  tenderness?: 'none' | 'mild' | 'moderate' | 'severe';
  itchSeverity?: 'none' | 'mild' | 'moderate' | 'severe';
  adherence?: 'absent' | 'mild' | 'moderate' | 'severe';
  compressibility?: 'compressible' | 'partially_compressible' | 'non_compressible';

  contracturePresent?: boolean;
  contractureJoint?: string;
  contractureDirection?: string;
  romRestrictionDegrees?: number;

  clinicianImpression?: string;
  examinedBy?: string;
  examinedAt?: string;
}

// ── Patient-reported outcomes ───────────────────────────────────────────────

/**
 * The patient's own answers, on 0–10 numerical rating scales.
 *
 * Kept apart from the clinician's scores throughout. POSAS's patient scale is
 * stored separately again, under `validatedScores`, with its own published
 * wording — these are the module's own symptom questions and must not be
 * confused with it.
 */
export interface ScarPatientReported {
  pain?: number;
  itch?: number;
  tenderness?: number;
  tightness?: number;
  pullingSensation?: number;
  cosmeticConcern?: number;
  functionalLimitation?: number;
  psychosocialImpact?: number;
  treatmentSatisfaction?: number;
  freeText?: string;
  recordedAt?: string;
}

// ── Validated scales ────────────────────────────────────────────────────────

/** Item responses keyed by item id, as raw scores. */
export type ScaleResponses = Record<string, number>;

export interface ValidatedScoreEntry {
  scaleId: string;
  scaleVersion: string;
  responses: ScaleResponses;
  total: number | null;
  /** Sub-totals where the instrument defines them. */
  subscales?: Record<string, number>;
  completedBy?: string;
  completedAt: string;
  /** Set when items were left blank, so a partial total is never read as whole. */
  incompleteItems?: string[];
}

// ── Treatment ───────────────────────────────────────────────────────────────

export type ScarTreatmentKind =
  | 'intralesional_steroid'
  | 'intralesional_5fu'
  | 'intralesional_combination'
  | 'surgical_excision'
  | 'pressure_therapy'
  | 'silicone'
  | 'laser'
  | 'cryotherapy'
  | 'radiotherapy'
  | 'other';

export interface ScarTreatment {
  id: string;
  scarId: string;
  patientId: string;
  kind: ScarTreatmentKind;
  detail?: string;
  dose?: string;
  route?: string;
  sessionNumber?: number;
  administeredAt: string;
  administeredBy?: string;
  adverseEvents?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Assessment ──────────────────────────────────────────────────────────────

export type AssessmentStatus = 'draft' | 'awaiting_review' | 'finalized' | 'superseded';

/**
 * One visit's worth of assessment.
 *
 * Finalizing freezes it. A later correction is appended as a `corrections`
 * entry carrying the old value, the new one, who changed it and why — the
 * original is never overwritten, because a scar record whose history can be
 * quietly rewritten cannot support the longitudinal claims this module makes.
 */
export interface ScarCorrection {
  field: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  correctedBy: string;
  correctedAt: string;
}

export interface ScarAssessment {
  id: string;
  scarId: string;
  patientId: string;

  assessedAt: string;
  /** True for the assessment that anchors every change figure. */
  isBaseline: boolean;
  previousAssessmentId?: string;

  images: ScarImage[];
  regions: ScarRegionTrace[];

  morphometry?: ScarMorphometry;
  colour?: ScarColourAnalysis;
  threeD?: Scar3DMeasurement;
  exam?: ScarPhysicalExam;
  patientReported?: ScarPatientReported;
  validatedScores?: ValidatedScoreEntry[];

  /** Overall usability of this assessment, with its reasons. */
  quality: AssessmentQuality;
  qualityReasons: string[];
  /** Proportion of the intended dataset actually captured, 0–100. */
  completenessPercent: number;

  status: AssessmentStatus;
  finalizedBy?: string;
  finalizedAt?: string;
  clinicianNotes?: string;
  corrections?: ScarCorrection[];

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Longitudinal ────────────────────────────────────────────────────────────

export type TrendDirection =
  | 'improving'
  | 'stable'
  | 'worsening'
  | 'fluctuating'
  | 'indeterminate';

/**
 * A measurable domain that can be followed over time.
 *
 * Each is tracked and classified separately. Collapsing them into one verdict
 * would throw away the most useful signal in the whole module — that the
 * modalities agree, or that they do not.
 */
export type ScarDomain =
  | 'area'
  | 'volume'
  | 'elevation'
  | 'erythema'
  | 'pigmentation'
  | 'pliability'
  | 'symptoms'
  | 'vss'
  | 'posas_observer'
  | 'posas_patient';

export interface DomainChange {
  domain: ScarDomain;
  label: string;
  unit: string;
  /** Lower is better for every domain here; stated so the sign can be read. */
  lowerIsBetter: boolean;

  baselineValue: number | null;
  previousValue: number | null;
  currentValue: number | null;

  absoluteChangeFromBaseline: number | null;
  percentChangeFromBaseline: number | null;
  absoluteChangeFromPrevious: number | null;
  percentChangeFromPrevious: number | null;

  /** Units per 30 days, from the most recent interval. */
  ratePerMonth: number | null;
  /** Change in that rate between the last two intervals. */
  accelerationPerMonth: number | null;

  trend: TrendDirection;
  origin: DataOrigin;
  /** Why a figure is absent or unreliable. */
  limitations: string[];
}

// ── Multimodal reading ──────────────────────────────────────────────────────

export type MultimodalVerdict =
  | 'concordant_improvement'
  | 'concordant_progression'
  | 'concordant_stable'
  | 'discordant'
  | 'insufficient_data';

/**
 * What several independent modalities say when read together.
 *
 * Agreement across photograph, examination and the patient's own report is far
 * stronger evidence than any one of them. Disagreement is reported as
 * disagreement — it is a finding in itself, and forcing it into a single
 * verdict would discard exactly the information a clinician needs.
 */
export interface MultimodalReading {
  verdict: MultimodalVerdict;
  headline: string;
  improving: DomainChange[];
  worsening: DomainChange[];
  stable: DomainChange[];
  /** Plain statements of what points which way. */
  supportingStatements: string[];
  /** Populated when modalities conflict. */
  conflicts: string[];
  confidence: ConfidenceBand;
}

// ── Prediction ──────────────────────────────────────────────────────────────

export type PredictionKind =
  | 'progression_risk'
  | 'trajectory'
  | 'treatment_response';

export interface ScarPrediction {
  kind: PredictionKind;
  /** Days ahead. Only horizons the model can actually support are offered. */
  horizonDays: number;
  /** 0–1. Null whenever the data do not support a number at all. */
  probability: number | null;
  /** For trajectory predictions: the projected value and its range. */
  projectedValue?: number | null;
  projectedRangeLow?: number | null;
  projectedRangeHigh?: number | null;
  unit?: string;

  confidence: ConfidenceBand;
  /** The observations that drove it, in plain language. */
  supportingFeatures: string[];
  /** What would make this wrong, and what is missing. */
  limitations: string[];
  eligible: boolean;
  /** When not eligible, exactly what is missing. */
  ineligibleReasons: string[];

  modelName: string;
  modelVersion: string;
  generatedAt: string;
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export type ScarAlertKind =
  | 'rapid_expansion'
  | 'increased_elevation'
  | 'increased_volume'
  | 'increasing_symptoms'
  | 'possible_treatment_failure'
  | 'possible_recurrence'
  | 'morphology_change'
  | 'capture_inconsistency'
  | 'measurement_unreliable';

export type AlertPriority = 'high' | 'medium' | 'low';

export interface ScarAlert {
  id: string;
  scarId: string;
  patientId: string;
  assessmentId?: string;
  kind: ScarAlertKind;
  priority: AlertPriority;
  message: string;
  /** The measurements behind it, so it can be checked rather than believed. */
  evidence: string[];
  /** Decision support, never a diagnosis. Rendered with the alert. */
  disclaimer: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  /** Required when a high-priority alert is dismissed. */
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Automation level and segmentation provenance ────────────────────────────

/**
 * How much of this measurement the machine did, and how much the clinician did.
 *
 * The ladder matters because level 4 is a legitimate quantitative result, not a
 * failure state. A clinician tracing a boundary that the software then measures
 * exactly is a *better* measurement than a confident automatic segmentation of
 * the wrong region — the human supplies the judgement, the software supplies
 * the arithmetic. Only level 5 means nothing was measured.
 */
export type AutomationLevel =
  | 'automated'            // 1 — machine, high confidence
  | 'automated_verified'   // 2 — machine, clinician looked and agreed
  | 'machine_corrected'    // 3 — machine proposed, clinician adjusted
  | 'clinician_traced'     // 4 — clinician drew it, software measured it
  | 'not_measurable';      // 5 — neither path produced a usable result

export const AUTOMATION_LEVEL_LABEL: Record<AutomationLevel, string> = {
  automated: 'Automated',
  automated_verified: 'Automated, clinician verified',
  machine_corrected: 'Automated, clinician corrected',
  clinician_traced: 'Clinician traced',
  not_measurable: 'Not reliably measurable',
};

/**
 * A boundary, kept in all three of its states.
 *
 * The machine's original proposal is never overwritten by the clinician's
 * correction. Keeping both is the only way to find out later whether the
 * automatic segmentation is any good — and a module that discards its own
 * error signal can never be validated.
 */
export interface SegmentationRecord {
  /** What the machine proposed, preserved verbatim. */
  automatic?: ScarRegionTrace[];
  automaticConfidence?: ConfidenceBand;
  /** What the clinician drew or adjusted. */
  clinician?: ScarRegionTrace[];
  /** Whichever was used for the measurements. */
  final: ScarRegionTrace[];
  level: AutomationLevel;
  correctedBy?: string;
  correctedAt?: string;
  correctionReason?: string;
}

// ── Calibration ─────────────────────────────────────────────────────────────

/**
 * How the scale was established, kept in full.
 *
 * Every dimension in the assessment divides by this number, so a wrong
 * calibration is not a small error — it scales the entire record. Storing how
 * it was obtained is what makes a suspect measurement traceable afterwards.
 */
export interface CalibrationRecord {
  pixelsPerCm: number | null;
  /** 'green_marker' | 'manual_reference' | 'ruler_points' | 'none'. */
  method: string;
  /** Physical size of the reference used, in cm. */
  referenceLengthCm?: number;
  confidence: ConfidenceBand;
  /** Set when the clinician established or corrected it by hand. */
  establishedBy?: string;
  establishedAt?: string;
  wasCorrected?: boolean;
  notes?: string;
}

// ── Treatment response index ────────────────────────────────────────────────

/**
 * Weights for the composite response index.
 *
 * Configurable because the right weighting is an institutional judgement, not
 * a fact. The defaults weight what is measured over what is felt, which is a
 * defensible starting point and nothing more.
 */
export interface ResponseIndexWeights {
  morphology: number;
  elevationVolume: number;
  colour: number;
  validatedScore: number;
  symptoms: number;
}

export const DEFAULT_RESPONSE_WEIGHTS: ResponseIndexWeights = {
  morphology: 0.30,
  elevationVolume: 0.20,
  colour: 0.15,
  validatedScore: 0.20,
  symptoms: 0.15,
};

/**
 * A composite treatment-response figure.
 *
 * NOT a validated clinical scale, and labelled so everywhere it appears. It is
 * a weighted summary of independently measured domains, offered as a single
 * number for trend display only, and it is never shown without the components
 * that produced it — the components are the evidence; the index is a
 * convenience.
 */
export interface TreatmentResponseIndex {
  /** −100 to +100. Positive is improvement. */
  score: number | null;
  /** Per-domain contributions, so the score can be taken apart. */
  components: { domain: ScarDomain; percentChange: number; weight: number; contribution: number }[];
  /** Domains that had no data, and therefore had their weight redistributed. */
  missingDomains: ScarDomain[];
  weights: ResponseIndexWeights;
  confidence: ConfidenceBand;
  label: string;
  limitations: string[];
}
