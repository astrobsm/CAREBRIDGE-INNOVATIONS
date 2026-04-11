// ============================================================
// COMPREHENSIVE LYMPHEDEMA MANAGEMENT MODULE TYPES
// Based on ISL (International Society of Lymphology) Consensus 2024
// Aligned with WHO & ISBI Guidelines for Low-Resource Settings
// ============================================================

// ==========================================
// ENUMS & LITERAL TYPES
// ==========================================

export type LymphedemaEtiology =
  | 'primary_congenital'     // Milroy disease (onset at birth)
  | 'primary_praecox'        // Meige disease (onset <35yr)
  | 'primary_tarda'          // Onset >35yr
  | 'secondary_post_surgical'// Post-lymphadenectomy / post-mastectomy
  | 'secondary_post_radiation'
  | 'secondary_infection'    // Filariasis, recurrent cellulitis
  | 'secondary_malignancy'   // Tumour compression/infiltration
  | 'secondary_trauma'
  | 'secondary_cvi'          // Chronic venous insufficiency overlap (phlebolymphedema)
  | 'secondary_obesity'      // Obesity-induced lymphedema
  | 'secondary_immobility';

export type LymphedemaLimb =
  | 'left_upper'
  | 'right_upper'
  | 'left_lower'
  | 'right_lower'
  | 'bilateral_upper'
  | 'bilateral_lower'
  | 'genital'
  | 'head_neck'
  | 'trunk';

export type ISLStage = 0 | 1 | 2 | '2_late' | 3;

export type CampisiStage = 'IA' | 'IB' | 'II' | 'IIIA' | 'IIIB' | 'IV' | 'V';

export type LymphedemaSeverity = 'minimal' | 'mild' | 'moderate' | 'severe' | 'elephantiasis';

export type StemmerSignResult = 'positive' | 'negative' | 'equivocal';

export type PittingGrade = 0 | 1 | 2 | 3 | 4;

export type SkinCondition =
  | 'normal'
  | 'dry_hyperkeratotic'
  | 'papillomatosis'
  | 'lymphorrhea'
  | 'fungal_infection'
  | 'cellulitis_active'
  | 'cellulitis_recurrent'
  | 'ulceration'
  | 'elephantiasis_verrucosa'
  | 'lymphangiosarcoma_suspected';

export type TissueConsistency = 'soft_pitting' | 'firm_non_pitting' | 'fibrotic' | 'woody_hard' | 'mixed';

export type CDTPhase = 'intensive' | 'maintenance';

export type BandagingType = 'short_stretch' | 'multi_layer' | 'kinesio_tape' | 'compression_garment';

export type CompressionClass = 'class1_15_21' | 'class2_23_32' | 'class3_34_46' | 'class4_49_plus';

export type SurgicalProcedureType =
  | 'debulking_charles'        // Charles procedure (radical excision)
  | 'debulking_thompson'       // Thompson procedure (buried dermal flap)
  | 'debulking_sistrunk'       // Staged excision
  | 'debulking_suction_assisted' // Liposuction-based  
  | 'physiological_lva'        // Lymphovenous anastomosis
  | 'physiological_vlnt'       // Vascularized lymph node transfer
  | 'combined';

export type TreatmentPhase =
  | 'initial_assessment'
  | 'infection_control'
  | 'cdt_intensive'
  | 'cdt_maintenance'
  | 'surgical_evaluation'
  | 'pre_operative'
  | 'intra_operative'
  | 'post_operative_acute'
  | 'post_operative_rehabilitation'
  | 'long_term_maintenance';

export type MonitoringFrequency = 'twice_daily' | 'daily' | 'every_other_day' | 'twice_weekly' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export type AssessmentStatus =
  | 'draft'
  | 'active_treatment'
  | 'cdt_intensive'
  | 'cdt_maintenance'
  | 'surgical_candidate'
  | 'pre_operative'
  | 'post_operative'
  | 'long_term_follow_up'
  | 'discharged'
  | 'abandoned';

// ==========================================
// MEASUREMENT TYPES
// ==========================================

/** Circumferential limb measurement at standardized points */
export interface LimbMeasurement {
  locationName: string;          // e.g. 'Metacarpals', 'Wrist', '10cm above wrist'
  distanceFromLandmarkCm: number; // Distance from anatomical landmark
  landmark: string;              // e.g. 'wrist', 'olecranon', 'lateral malleolus', 'patella'
  circumferenceCm: number;       // Current measurement
  contralateralCm?: number;      // Normal side if unilateral
  previousCm?: number;           // Last measurement for trend
  measuredAt: Date;
}

/** Volume calculation from circumferential measurements (truncated cone formula) */
export interface LimbVolumeCalculation {
  method: 'truncated_cone' | 'water_displacement' | 'perometer' | 'bioimpedance';
  affectedLimbVolumeMl: number;
  contralateralVolumeMl?: number;
  volumeDifferenceMl: number;
  volumeDifferencePercent: number;
  calculatedAt: Date;
  measurements: LimbMeasurement[];
}

/** Bioimpedance spectroscopy result */
export interface BioimpedanceResult {
  l_dex_score: number;    // L-Dex score (normal: -10 to +10)
  ratio: number;
  interpretation: 'normal' | 'subclinical' | 'clinical';
  measuredAt: Date;
}

// ==========================================
// ASSESSMENT TYPES
// ==========================================

/** Complete Lymphedema Assessment */
export interface LymphedemaAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;

  // Demographics relevant to lymphedema
  assessmentDate: Date;
  assessedBy: string;
  assessedByName: string;
  status: AssessmentStatus;

  // Etiology & History
  etiology: LymphedemaEtiology;
  etiologyDetails: string;
  onsetDate?: string;                    // Approximate onset
  durationMonths: number;
  affectedLimb: LymphedemaLimb;
  isUnilateral: boolean;
  previousSurgery: string[];             // e.g. ['mastectomy', 'lymphadenectomy']
  radiationHistory: boolean;
  radiationDetails?: string;
  filariasisStatus: 'positive' | 'negative' | 'not_tested';
  episodesOfCellulitis: number;          // Count of acute dermatolymphangioadenitis
  lastCellulitisDate?: string;
  comorbidities: string[];
  medications: string[];
  bmi: number;
  
  // Clinical Examination
  stemmerSign: StemmerSignResult;
  pittingGrade: PittingGrade;
  skinConditions: SkinCondition[];
  tissueConsistency: TissueConsistency;
  limbElevationResponse: 'reduces_significantly' | 'reduces_partially' | 'no_change';
  kaposi_stemmer_positive: boolean;
  
  // Measurements
  limbMeasurements: LimbMeasurement[];
  volumeCalculation?: LimbVolumeCalculation;
  bioimpedance?: BioimpedanceResult;
  
  // Staging & Scoring
  islStage: ISLStage;
  campisiStage: CampisiStage;
  severityScore: LymphedemaSeverityScore;
  functionalImpactScore: FunctionalImpactScore;
  qualityOfLifeScore: QualityOfLifeScore;
  
  // Investigations
  investigationsOrdered: LymphedemaInvestigation[];
  
  // Treatment Plan
  currentTreatmentPhase: TreatmentPhase;
  treatmentPlan: LymphedemaTreatmentPlan;
  
  // Surgical Candidacy
  surgicalCandidacy?: SurgicalCandidacyAssessment;
  
  // Audit
  auditLog: LymphedemaAuditEntry[];
  
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

// ==========================================
// SCORING TYPES
// ==========================================

export interface LymphedemaSeverityScore {
  volumeExcessPercent: number;        // 0–20 mild, 20–40 moderate, >40 severe
  skinChangesScore: number;           // 0-4
  tissueConsistencyScore: number;     // 0-4
  infectionFrequencyScore: number;    // 0-4
  functionalLimitationScore: number;  // 0-4
  totalScore: number;                 // Out of 20
  severity: LymphedemaSeverity;
  interpretation: string;
}

export interface FunctionalImpactScore {
  rangeOfMotion: number;              // 0-4 (0=full, 4=severely restricted)
  grip_strength: number;              // 0-4 (upper limb)
  ambulation: number;                 // 0-4 (lower limb)
  activitiesOfDailyLiving: number;    // 0-4
  occupation: number;                 // 0-4
  totalScore: number;
  interpretation: string;
}

export interface QualityOfLifeScore {
  // LYMQOL domains
  appearance: number;                 // 0-4
  symptoms: number;                   // 0-4 (heaviness, tightness, pain)
  emotions: number;                   // 0-4
  function: number;                   // 0-4
  overallQoL: number;                // 0-10 VAS
  totalScore: number;
  interpretation: string;
}

// ==========================================
// INVESTIGATION TYPES
// ==========================================

export interface LymphedemaInvestigation {
  type: 'lymphoscintigraphy' | 'mri_lymphangiography' | 'duplex_ultrasound' | 'ct_scan' 
       | 'blood_filariasis' | 'skin_biopsy' | 'bioimpedance' | 'icg_lymphography'
       | 'full_blood_count' | 'albumin' | 'liver_function' | 'renal_function' | 'thyroid_function';
  indication: string;
  result?: string;
  status: 'ordered' | 'pending' | 'completed' | 'cancelled';
  orderedAt: Date;
  resultAt?: Date;
}

// ==========================================
// TREATMENT PLAN TYPES
// ==========================================

export interface LymphedemaTreatmentPlan {
  id: string;
  assessmentId: string;
  
  // Phase 0: Infection control (if active)
  infectionControl?: InfectionControlPlan;
  
  // Phase 1: CDT Intensive
  cdtIntensive: CDTIntensivePlan;
  
  // Phase 2: CDT Maintenance
  cdtMaintenance: CDTMaintenancePlan;
  
  // Surgical pathway (if applicable)
  surgicalPlan?: SurgicalPlan;
  
  // Post-operative rehabilitation
  postOperativeRehab?: PostOperativeRehabPlan;
  
  // Long-term maintenance
  longTermPlan: LongTermMaintenancePlan;
  
  // Treatment timeline
  timeline: TreatmentTimeline;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InfectionControlPlan {
  hasActiveInfection: boolean;
  infectionType: 'cellulitis' | 'fungal' | 'lymphorrhea' | 'ulcer_infection' | 'multiple';
  antibioticRegimen: string;
  antifungalRegimen?: string;
  woundCareProtocol?: string;
  skinHygieneProtocol: string;
  durationDays: number;
  prophylaxisRecommended: boolean;
  prophylaxisRegimen?: string;  // e.g. 'Phenoxymethylpenicillin 250mg BD × 2 years'
  notes: string;
}

export interface CDTIntensivePlan {
  // Phase 1 — typically 2-6 weeks
  durationWeeks: number;
  sessionsPerWeek: number;
  
  // Component 1: Manual Lymphatic Drainage (MLD)
  mld: {
    technique: 'vodder' | 'foldi' | 'casley_smith' | 'leduc';
    sessionDurationMinutes: number;
    drainageSequence: string[];         // Ordered list of body regions
    contraindications: string[];
    precautions: string[];
  };
  
  // Component 2: Multi-Layer Lymphedema Bandaging (MLLB)
  bandaging: {
    type: BandagingType;
    layers: BandagingLayer[];
    applicationProtocol: string;
    wearSchedule: string;               // e.g. '23 hours/day, remove for bathing/MLD'
    pressureGradient: string;           // e.g. 'Distal to proximal gradient'
    paddingMaterials: string[];
    recheckFrequency: string;
  };
  
  // Component 3: Skin & Nail Care
  skinCare: {
    cleansingProtocol: string;
    moisturizer: string;
    antifungalProphylaxis: boolean;
    woundCareIfNeeded?: string;
    nailCare: string;
    inspectionFrequency: string;
  };
  
  // Component 4: Remedial Exercises
  exercises: {
    exerciseList: LymphedemaExercise[];
    frequency: string;
    precautions: string[];
    progressionCriteria: string[];
  };
  
  // Goals & Milestones
  volumeReductionTargetPercent: number;  // Typically 40-60% of excess
  expectedOutcome: string;
  milestonesWeekly: CDTMilestone[];
}

export interface CDTMaintenancePlan {
  // Phase 2 — lifelong
  compressionGarment: {
    type: 'flat_knit' | 'circular_knit' | 'custom_made';
    compressionClass: CompressionClass;
    garmentDescription: string;
    wearSchedule: string;               // 'All waking hours'
    replacementFrequencyMonths: number; // Typically every 4-6 months
    fitCheckFrequency: string;
  };
  
  selfMLD: {
    technique: string;
    frequency: string;
    durationMinutes: number;
    bodyRegions: string[];
    instructionProvided: boolean;
  };
  
  exerciseProgram: {
    exercises: LymphedemaExercise[];
    frequency: string;
    activityRestrictions: string[];
    encouragedActivities: string[];
  };
  
  skinCareRegimen: {
    dailySkinCare: string;
    moisturizerType: string;
    signToWatch: string[];
    skinInspectionFrequency: string;
  };
  
  weightManagement: {
    targetBMI: number;
    dietaryGuidance: string[];
    exerciseAdvice: string;
  };
  
  followUpSchedule: FollowUpAppointment[];
  
  escalationCriteria: string[];         // When to return for intensive CDT
}

// ==========================================
// CDT COMPONENT DETAIL TYPES
// ==========================================

export interface BandagingLayer {
  layer: number;
  material: string;
  purpose: string;
  applicationNotes: string;
}

export interface LymphedemaExercise {
  name: string;
  description: string;
  repetitions: string;
  sets: number;
  frequency: string;
  category: 'breathing' | 'proximal_joint' | 'distal_joint' | 'aerobic' | 'resistance';
  precautions: string[];
  imageUrl?: string;
}

export interface CDTMilestone {
  weekNumber: number;
  expectedVolumeReductionPercent: number;
  circumferenceTargetsCm?: Record<string, number>;
  assessmentChecklist: string[];
  adjustmentCriteria: string[];
}

// ==========================================
// SURGICAL TYPES
// ==========================================

export interface SurgicalCandidacyAssessment {
  isCandidate: boolean;
  indicationsMet: string[];
  contraindicationsMet: string[];
  
  // Debulking Criteria (Charles/Thompson/staged excision)
  debulkingCriteria: DebulkingCriteria;
  
  // Physiological Surgery Criteria (LVA/VLNT)
  physiologicalCriteria?: PhysiologicalSurgeryCriteria;
  
  recommendedProcedure?: SurgicalProcedureType;
  recommendation: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  
  mdtDiscussionRequired: boolean;
  mdtDate?: Date;
  mdtOutcome?: string;
  
  assessedBy: string;
  assessedAt: Date;
}

export interface DebulkingCriteria {
  // All must be met for surgical debulking
  cdtCompletedMinimum6Months: boolean;
  failedToRespondToCDT: boolean;       // <20% volume reduction after adequate CDT
  islStage2LateOrAbove: boolean;       // Stage 2 late or Stage 3
  predominantlyFibrous: boolean;        // Non-pitting, fibrotic tissue
  significantFunctionalImpairment: boolean;
  recurrentInfectionsDespiteProphylaxis: boolean;
  bmiBelow40: boolean;                 // BMI >40 = relative contraindication
  noActiveInfection: boolean;
  adequateArterialSupply: boolean;     // ABPI >0.8
  patientMotivatedForPostOpCompression: boolean;
  
  // Additional factors
  skinChangesScore: number;             // Severity of papillomatosis/verrucae
  volumeExcessMl: number;
  volumeExcessPercent: number;
  frequencyOfCellulitisPerYear: number;
  functionalDebt: string;              // Description of functional limitation
  psychosocialImpact: string;
  
  totalCriteriaMet: number;
  totalCriteriaRequired: number;       // Minimum 7/10 for recommendation
  meetsThreshold: boolean;
  clinicianJustification: string;
}

export interface PhysiologicalSurgeryCriteria {
  islStage1Or2Early: boolean;
  predominantlyFluidComponent: boolean;
  identifiableLymphaticVessels: boolean; // On ICG/lymphoscintigraphy
  patientFitForMicrosurgery: boolean;
  specialistAvailable: boolean;
  meetsThreshold: boolean;
  notes: string;
}

export interface SurgicalPlan {
  procedureType: SurgicalProcedureType;
  procedureDetails: string;
  stages?: SurgicalStage[];            // For staged debulking
  
  // Pre-operative requirements
  preOperativeRequirements: string[];
  preOperativeCDTWeeks: number;        // Minimum CDT before surgery
  preOperativeInvestigations: string[];
  
  // Intra-operative
  estimatedDurationHours: number;
  anesthesiaType: string;
  antibioticProphylaxis: string;
  expectedBloodLoss: string;
  drainageRequired: boolean;
  
  // Post-operative  
  postOperativePlan: PostOperativeProtocol;
  
  surgeonName: string;
  plannedDate?: Date;
}

export interface SurgicalStage {
  stageNumber: number;
  description: string;
  areaToAddress: string;
  plannedDate?: Date;
  intervalWeeks: number;
  completedDate?: Date;
  outcome?: string;
}

export interface PostOperativeProtocol {
  // Immediate (0-48h)
  immediateCare: {
    positioningInstructions: string;
    drainManagement: string;
    woundCareProtocol: string;
    painManagement: string;
    antibioticRegimen: string;
    thromboprophylaxis: string;
    monitoringFrequency: MonitoringFrequency;
    vitalSignsFrequency: string;
    limbCheckFrequency: string;
  };
  
  // Early (48h - 2 weeks)
  earlyCare: {
    woundCareContinued: string;
    drainRemovalCriteria: string;
    mobilizationProtocol: string;
    compressionInitiation: string;     // When to start compression after surgery
    physioReferral: boolean;
    sutureRemovalDay: number;
  };
  
  // Intermediate (2-6 weeks)
  intermediateCare: {
    woundHealingAssessment: string;
    compressionGarmentFitting: string;
    exerciseProgression: string;
    returnToActivities: string;
    followUpSchedule: string;
  };
  
  // Late (6 weeks - 6 months)
  lateCare: {
    garmentReview: string;
    volumeReassessment: string;
    functionalAssessment: string;
    furtherSurgeryAssessment: string;
    longTermCompressionPlan: string;
  };
  
  // Complications to monitor
  complications: PostOperativeComplication[];
  
  // Red flags requiring urgent review
  redFlags: string[];
}

export interface PostOperativeComplication {
  complication: string;
  riskLevel: 'low' | 'medium' | 'high';
  prevention: string;
  monitoring: string;
  management: string;
}

// ==========================================
// MONITORING TYPES
// ==========================================

export interface LymphedemaMonitoringRecord {
  id: string;
  assessmentId: string;
  patientId: string;
  hospitalId: string;
  
  recordedAt: Date;
  recordedBy: string;
  recordedByName: string;
  
  treatmentPhase: TreatmentPhase;
  sessionNumber?: number;
  
  // Measurements
  limbMeasurements: LimbMeasurement[];
  volumeCalculation?: LimbVolumeCalculation;
  volumeChangeFromBaseline?: number;    // % change
  volumeChangeFromLast?: number;        // % change from last record
  
  // Clinical assessment
  pittingGrade: PittingGrade;
  tissueConsistency: TissueConsistency;
  skinConditions: SkinCondition[];
  painScore: number;                    // 0-10
  heavinessScore: number;               // 0-10
  tightnessScore: number;               // 0-10
  
  // Bandage/garment compliance
  compressionCompliance: 'excellent' | 'good' | 'fair' | 'poor' | 'non_compliant';
  compressionIssues?: string;
  
  // Exercise compliance
  exerciseCompliance: 'excellent' | 'good' | 'fair' | 'poor' | 'non_compliant';
  
  // Skin care compliance
  skinCareCompliance: 'excellent' | 'good' | 'fair' | 'poor' | 'non_compliant';
  
  // CDT session details (if intensive phase)
  mldPerformed: boolean;
  mldResponse: 'good' | 'moderate' | 'poor' | 'not_applicable';
  bandagingApplied: boolean;
  bandagingType?: BandagingType;
  exercisesPerformed: boolean;
  skinCarePerformed: boolean;
  
  // Infection surveillance
  signsOfInfection: boolean;
  infectionDetails?: string;
  
  // Functional assessment
  rangeOfMotionDegrees?: Record<string, number>;
  functionalStatus: string;
  
  // Photos
  photoUrls?: string[];
  
  // Clinical notes
  clinicianNotes: string;
  planAdjustments?: string;
  
  // Alert flags
  alerts: LymphedemaAlert[];
  
  createdAt: Date;
  syncedAt?: Date;
}

export interface LymphedemaAlert {
  type: 'infection' | 'volume_increase' | 'non_compliance' | 'skin_breakdown' | 'pain_escalation' | 'functional_decline' | 'garment_issue';
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  message: string;
  actionRequired: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// ==========================================
// POST-OPERATIVE MONITORING TYPES
// ==========================================

export interface PostOpLymphedemaMonitoring {
  id: string;
  assessmentId: string;
  patientId: string;
  surgicalProcedure: SurgicalProcedureType;
  surgeryDate: Date;
  
  // Day-specific monitoring
  postOpDay: number;
  monitoredAt: Date;
  monitoredBy: string;
  
  // Wound assessment
  woundStatus: 'clean_dry' | 'serosanguinous' | 'infected' | 'dehiscence' | 'necrotic';
  woundDetails: string;
  drainOutput?: { volumeMl: number; character: string };
  
  // Limb assessment
  limbColor: 'normal' | 'pale' | 'cyanotic' | 'erythematous' | 'mottled';
  limbTemperature: 'warm' | 'cool' | 'cold';
  capillaryRefillSeconds: number;
  pulseStatus: 'present_strong' | 'present_weak' | 'absent';
  sensationIntact: boolean;
  
  // Compression status
  compressionInPlace: boolean;
  compressionType?: string;
  
  // Pain
  painScore: number;
  painManagement: string;
  
  // Vitals
  temperature: number;
  heartRate: number;
  bloodPressure: string;
  
  // Complications
  complications: string[];
  
  // Mobility
  mobilityStatus: 'bed_rest' | 'bed_to_chair' | 'ambulating_assisted' | 'ambulating_independent';
  
  // DVT prophylaxis
  dvtProphylaxis: string;
  
  // Clinical notes
  notes: string;
  
  // Alerts
  alerts: LymphedemaAlert[];
  
  createdAt: Date;
  syncedAt?: Date;
}

// ==========================================
// TIMELINE & FOLLOW-UP TYPES
// ==========================================

export interface TreatmentTimeline {
  phases: TimelinePhase[];
  totalEstimatedDurationWeeks: number;
  criticalMilestones: TimelineMilestone[];
}

export interface TimelinePhase {
  phase: TreatmentPhase;
  label: string;
  startWeek: number;
  durationWeeks: number;
  description: string;
  goals: string[];
  activities: string[];
  monitoringFrequency: MonitoringFrequency;
  exitCriteria: string[];
}

export interface TimelineMilestone {
  weekNumber: number;
  milestone: string;
  assessmentRequired: boolean;
  decisionPoint: boolean;              // e.g. continue CDT vs surgery evaluation
  description: string;
}

export interface FollowUpAppointment {
  weekNumber: number;
  purpose: string;
  assessments: string[];
  location: string;
}

// ==========================================
// AUDIT TYPES
// ==========================================

export interface LymphedemaAuditEntry {
  action: string;
  performedBy: string;
  performedAt: Date;
  details?: string;
}
