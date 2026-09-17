/**
 * Peripheral arterial disease — the data model.
 *
 * WHAT THIS ADDS TO WHAT ALREADY EXISTS
 * The limb salvage module already records a WIfI classification, Doppler
 * findings and an ABI. Those are typed by hand: a clinician picks the grade.
 * This module supplies the measurements those grades should be *derived* from —
 * raw arm and ankle pressures, toe pressure, TcPO2, skin perfusion pressure,
 * per-segment Doppler with its technical quality — and computes the grades from
 * them, showing which measurement decided each one.
 *
 * WHY RAW PRESSURES ARE STORED, NOT JUST THE INDEX
 * An ABI of 0.62 tells you nothing about whether the ankle pressure was 60 over
 * a brachial of 97 or 120 over 194, and the WIfI ischaemia grade can be driven
 * by the absolute ankle pressure rather than the ratio. Storing only the
 * quotient throws away the inputs to a grade the limb is staged on.
 *
 * NOTHING HERE DIAGNOSES. Every derived classification is a decision-support
 * signal carrying its reasons, and every one can be overridden by the clinician
 * with a recorded reason.
 */

export type Side = 'left' | 'right';

// ── Clinical presentation ───────────────────────────────────────────────────

export type PadPresentation =
  | 'asymptomatic'
  | 'claudication'
  | 'rest_pain'
  | 'clti_suspected'
  | 'clti_established'
  | 'tissue_loss'
  | 'gangrene'
  | 'acute_suspected'
  | 'acute_established'
  | 'mixed_arterial_venous'
  | 'diabetic_foot'
  | 'pad_with_neuropathy'
  | 'non_healing_surgical_wound'
  | 'affecting_reconstruction'
  | 'uncertain';

export const PAD_PRESENTATIONS: { value: PadPresentation; label: string }[] = [
  { value: 'asymptomatic', label: 'Asymptomatic PAD' },
  { value: 'claudication', label: 'Chronic symptomatic PAD / claudication' },
  { value: 'rest_pain', label: 'Ischaemic rest pain' },
  { value: 'clti_suspected', label: 'Chronic limb-threatening ischaemia suspected' },
  { value: 'clti_established', label: 'Chronic limb-threatening ischaemia established' },
  { value: 'tissue_loss', label: 'Tissue loss' },
  { value: 'gangrene', label: 'Gangrene' },
  { value: 'acute_suspected', label: 'Acute limb ischaemia suspected' },
  { value: 'acute_established', label: 'Acute limb ischaemia established' },
  { value: 'mixed_arterial_venous', label: 'Mixed arterial / venous disease' },
  { value: 'diabetic_foot', label: 'PAD with diabetic foot' },
  { value: 'pad_with_neuropathy', label: 'PAD with neuropathy' },
  { value: 'non_healing_surgical_wound', label: 'PAD with non-healing surgical wound' },
  { value: 'affecting_reconstruction', label: 'PAD affecting reconstructive surgery' },
  { value: 'uncertain', label: 'Uncertain — requires further assessment' },
];

/**
 * A classification the software suggested and the clinician settled.
 *
 * Both are kept. The suggestion is never cleared by the confirmation, because
 * the only way to find out whether the suggestion is any good is to be able to
 * compare it against what the clinician decided.
 */
export interface ConfirmedClassification<T> {
  suggested?: T;
  suggestedBasis?: string[];
  clinician?: T;
  clinicianId?: string;
  confirmedAt?: string;
  /** Required when the clinician's answer differs from the suggestion. */
  overrideReason?: string;
}

// ── Acute limb ischaemia ────────────────────────────────────────────────────

/**
 * The six Ps, recorded as findings rather than as a verdict.
 *
 * Screened before anything else, and never gated behind completing the rest of
 * the assessment: an acutely ischaemic limb has hours, and a questionnaire that
 * has to be finished first is a questionnaire that costs a leg.
 */
export interface AcuteIschaemiaScreen {
  suddenOnsetPain?: boolean;
  pallor?: boolean;
  pulselessness?: boolean;
  paraesthesia?: boolean;
  paralysis?: boolean;
  poikilothermia?: boolean;

  sensoryLoss?: 'none' | 'toes_only' | 'more_than_toes' | 'profound_anaesthesia';
  motorDeficit?: 'none' | 'mild_moderate' | 'profound_paralysis';
  arterialDopplerAudible?: boolean;
  venousDopplerAudible?: boolean;

  newAbsentPulse?: boolean;
  newLossOfDopplerSignal?: boolean;
  rapidlyProgressive?: boolean;
  knownEmbolicSource?: boolean;
  recentVascularProcedure?: boolean;
  recentTrauma?: boolean;
  screenedAt?: string;
  screenedBy?: string;
}

// ── Symptoms ────────────────────────────────────────────────────────────────

export interface ClaudicationRecord {
  present?: boolean;
  /** Metres walked before pain begins. The figure that is trended. */
  walkingDistanceM?: number;
  walkingTimeMin?: number;
  location?: string;
  reproducible?: boolean;
  relievedByRest?: boolean;
  timeToReliefMin?: number;
  limitsDailyActivity?: boolean;
  /**
   * Causes of leg pain that are not arterial.
   *
   * Offered explicitly because the module's whole framing invites every leg
   * pain to be read as vascular, and most leg pain is not.
   */
  alternativeCauseConsidered?: string;
}

export interface RestPainRecord {
  present?: boolean;
  durationWeeks?: number;
  nocturnal?: boolean;
  forefootOrToePredominant?: boolean;
  relievedByDependency?: boolean;
  needsToHangLimb?: boolean;
  disturbsSleep?: boolean;
  worsening?: boolean;
  severity0to10?: number;
  analgesiaRequired?: string;
}

// ── Examination ─────────────────────────────────────────────────────────────

export type PulseGrade = 0 | 1 | 2 | 3 | null;

export interface LimbPulses {
  femoral?: PulseGrade;
  popliteal?: PulseGrade;
  posteriorTibial?: PulseGrade;
  dorsalisPedis?: PulseGrade;
  notes?: string;
}

export interface LimbExamination {
  side: Side;
  skin?: string[];
  temperature?: 'normal' | 'reduced' | 'markedly_reduced' | 'cold' | 'very_cold';
  capillaryRefillSec?: number;
  pulses?: LimbPulses;
  femoralBruit?: boolean;
  sensation?: 'normal' | 'reduced' | 'absent';
  monofilamentFelt?: boolean;
  motor?: 'normal' | 'weakness' | 'severe_weakness' | 'paralysis';
  oedema?: boolean;
  notes?: string;
}

// ── Doppler ─────────────────────────────────────────────────────────────────

export type ArterialSegment =
  | 'common_femoral'
  | 'profunda_femoris'
  | 'superficial_femoral'
  | 'popliteal'
  | 'anterior_tibial'
  | 'posterior_tibial'
  | 'peroneal'
  | 'dorsalis_pedis';

export const ARTERIAL_SEGMENTS: { value: ArterialSegment; label: string }[] = [
  { value: 'common_femoral', label: 'Common femoral' },
  { value: 'profunda_femoris', label: 'Profunda femoris' },
  { value: 'superficial_femoral', label: 'Superficial femoral' },
  { value: 'popliteal', label: 'Popliteal' },
  { value: 'anterior_tibial', label: 'Anterior tibial' },
  { value: 'posterior_tibial', label: 'Posterior tibial' },
  { value: 'peroneal', label: 'Peroneal' },
  { value: 'dorsalis_pedis', label: 'Dorsalis pedis' },
];

export type Waveform = 'triphasic' | 'biphasic' | 'monophasic' | 'dampened_monophasic' | 'absent';

export type SegmentInterpretation =
  | 'normal' | 'mild' | 'moderate_stenosis' | 'severe_stenosis'
  | 'near_occlusion' | 'occlusion' | 'uncertain' | 'technically_limited';

export interface DopplerSegmentFinding {
  segment: ArterialSegment;
  signalPresent?: boolean;
  waveform?: Waveform;
  psvCmS?: number;
  edvCmS?: number;
  psvRatio?: number;
  interpretation?: SegmentInterpretation;
  notes?: string;
}

export type TechnicalQuality = 'excellent' | 'good' | 'adequate' | 'limited' | 'non_diagnostic';

/**
 * One Doppler study of one limb.
 *
 * Technical quality is mandatory, not decorative. A monophasic signal through
 * oedema over a dressing is a different observation from a monophasic signal in
 * good conditions, and a trend built from studies of mixed quality will
 * otherwise read the conditions as the patient.
 */
export interface DopplerStudy {
  side: Side;
  performedAt: string;
  operator?: string;
  equipment?: string;
  probe?: string;
  patientPosition?: string;
  technicalQuality: TechnicalQuality;
  limitations?: string[];
  segments: DopplerSegmentFinding[];
  /** The laboratory's stated interpretation standard for velocity criteria. */
  velocityStandard?: string;
  notes?: string;
}

// ── Perfusion measurements ──────────────────────────────────────────────────

/**
 * Pressures as measured, plus the indices derived from them.
 *
 * Brachial pressures are recorded for both arms because the ABI denominator is
 * the higher of the two — using the ipsilateral arm, or an average, inflates
 * the index in exactly the patients with subclavian disease.
 */
export interface PressureSet {
  rightBrachialMmHg?: number;
  leftBrachialMmHg?: number;
  ankleMmHg?: number;
  /** Which ankle vessel the cuff reading came from. */
  ankleVessel?: 'posterior_tibial' | 'dorsalis_pedis' | 'peroneal' | 'highest';
  toeMmHg?: number;
  measuredAt?: string;
  operator?: string;
  notes?: string;
}

export interface LocalPerfusionRecord {
  kind: 'tcpo2' | 'spp';
  value: number;
  unit: 'mmHg';
  site: string;
  measuredAt?: string;
  device?: string;
  operator?: string;
  conditions?: string;
  notes?: string;
}

/** Everything perfusion-related for one limb at one visit. */
export interface LimbPerfusion {
  side: Side;
  pressures?: PressureSet;
  local?: LocalPerfusionRecord[];
  doppler?: DopplerStudy;
}

// ── WIfI ────────────────────────────────────────────────────────────────────

export type WifiGrade = 0 | 1 | 2 | 3;

/** A computed grade, with the measurement that decided it. */
export interface GradedComponent {
  grade: WifiGrade | null;
  /** Plain statement of what produced the grade. Never empty when graded. */
  reason: string;
  /** Which measurement drove it, when several were available. */
  decidedBy?: string;
  /** Measurements that were present but not used, and why. */
  notUsed?: string[];
  /** What is missing that would allow, or improve, the grade. */
  missing?: string[];
}

export interface WifiResult {
  wound: GradedComponent;
  ischaemia: GradedComponent;
  footInfection: GradedComponent;
  /** True only when all three graded. */
  complete: boolean;
  /**
   * The institution's published SVS stage, when its table has been configured.
   *
   * Left null by default rather than guessed — see WIFI_STAGE_TABLE.
   */
  svsStage: number | null;
  svsStageNote: string;
  /** A transparent limb-threat signal with its own declared rule. */
  limbThreat: 'low' | 'moderate' | 'high' | 'very_high' | 'insufficient_data';
  limbThreatBasis: string[];
}

// ── Wound and infection ─────────────────────────────────────────────────────

export type GangreneExtent =
  | 'none' | 'dry_toe' | 'wet_toe' | 'forefoot' | 'heel' | 'midfoot' | 'extensive';

export interface VascularWoundSnapshot {
  /** Links to the existing wound module rather than duplicating it. */
  woundId?: string;
  present: boolean;
  location?: string;
  areaCm2?: number;
  depthMm?: number;
  durationWeeks?: number;
  exposedStructure?: ('tendon' | 'bone' | 'joint' | 'muscle' | 'vessel')[];
  heelInvolved?: boolean;
  gangrene?: GangreneExtent;
  notes?: string;
}

export type FootInfectionSeverity =
  | 'none' | 'mild_local' | 'moderate_deeper' | 'severe_systemic';

export interface FootInfectionAssessment {
  severity?: FootInfectionSeverity;
  erythemaRimCm?: number;
  deeperStructuresInvolved?: boolean;
  systemicSigns?: boolean;
  osteomyelitisSuspected?: boolean;
  purulence?: boolean;
  notes?: string;
}

// ── Assessment ──────────────────────────────────────────────────────────────

export type AssessmentStatus = 'draft' | 'awaiting_review' | 'finalized';

export interface ClinicianOverride {
  field: string;
  suggested: string;
  clinicianValue: string;
  reason: string;
  clinicianId: string;
  at: string;
}

export interface PadAssessment {
  id: string;
  patientId: string;
  hospitalId?: string;
  /** The limb this assessment is about. Both limbs get their own record. */
  side: Side;

  assessedAt: string;
  assessedBy?: string;
  isBaseline: boolean;
  previousAssessmentId?: string;

  presentation: ConfirmedClassification<PadPresentation>;
  acuteScreen?: AcuteIschaemiaScreen;

  claudication?: ClaudicationRecord;
  restPain?: RestPainRecord;
  examination?: LimbExamination;
  perfusion?: LimbPerfusion;
  wound?: VascularWoundSnapshot;
  infection?: FootInfectionAssessment;

  /** Recomputed on save, and stored so the record shows what was seen then. */
  wifi?: WifiResult;

  overrides?: ClinicianOverride[];
  clinicianAssessment?: string;
  clinicianPlan?: string;
  reconstructionPlan?: string;

  status: AssessmentStatus;
  finalizedBy?: string;
  finalizedAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ── Interventions ───────────────────────────────────────────────────────────

export type VascularInterventionKind =
  | 'angioplasty' | 'stent' | 'bypass' | 'endarterectomy' | 'thrombectomy'
  | 'thrombolysis' | 'debridement' | 'minor_amputation' | 'major_amputation'
  | 'skin_graft' | 'flap' | 'other';

export interface VascularIntervention {
  id: string;
  patientId: string;
  side: Side;
  kind: VascularInterventionKind;
  performedAt: string;
  indication?: string;
  detail?: string;
  operator?: string;
  complications?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export type VascularAlertLevel = 'red' | 'amber' | 'green';

export interface VascularAlert {
  id: string;
  level: VascularAlertLevel;
  title: string;
  /** The findings that raised it, so the reasoning can be checked. */
  evidence: string[];
  action: string;
}
