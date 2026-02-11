// ============================================
// Pressure Sore Management Module Types
// WHO Best Practice Protocols
// ============================================

// ============================================
// Pressure Sore Classification (NPUAP/EPUAP)
// ============================================
export type PressureUlcerStage =
  | 'stage_1'           // Non-blanchable erythema
  | 'stage_2'           // Partial thickness
  | 'stage_3'           // Full thickness skin loss
  | 'stage_4'           // Full thickness tissue loss
  | 'unstageable'       // Obscured by slough/eschar
  | 'dtpi'              // Deep Tissue Pressure Injury
  | 'mucosal'           // Mucosal membrane pressure injury
  | 'device_related';   // Medical device-related

export type PressureSoreLocation =
  | 'sacrum'
  | 'coccyx'
  | 'ischial_tuberosity'
  | 'greater_trochanter'
  | 'heel_left'
  | 'heel_right'
  | 'malleolus_left'
  | 'malleolus_right'
  | 'occiput'
  | 'ear_left'
  | 'ear_right'
  | 'scapula_left'
  | 'scapula_right'
  | 'elbow_left'
  | 'elbow_right'
  | 'spinous_process'
  | 'iliac_crest'
  | 'knee_left'
  | 'knee_right'
  | 'nose'
  | 'other';

export type PressureSoreStatus = 'active' | 'healing' | 'healed' | 'deteriorating' | 'chronic' | 'palliative';

// ============================================
// Braden Scale Assessment
// ============================================
export interface BradenScaleAssessment {
  sensoryPerception: 1 | 2 | 3 | 4;  // Completely limited → No impairment
  moisture: 1 | 2 | 3 | 4;            // Constantly moist → Rarely moist
  activity: 1 | 2 | 3 | 4;            // Bedfast → Walks frequently
  mobility: 1 | 2 | 3 | 4;            // Completely immobile → No limitations
  nutrition: 1 | 2 | 3 | 4;           // Very poor → Excellent
  frictionShear: 1 | 2 | 3;           // Problem → No apparent problem
  totalScore: number;                   // 6-23
  riskLevel: 'very_high' | 'high' | 'moderate' | 'mild' | 'no_risk';
  interpretation: string;
}

// ============================================
// Waterlow Score Assessment
// ============================================
export interface WaterlowScoreAssessment {
  buildBMI: number;         // 0-3
  skinType: number;          // 0-2
  sex: number;               // 1-2
  age: number;               // 1-5
  continence: number;        // 0-3
  mobility: number;          // 0-5
  appetite: number;          // 0-3
  specialRisks: {
    tissueNutrition: number;   // 0-8 (cachexia, cardiac failure, anemia, etc.)
    neurologicalDeficit: number; // 0-6
    surgery: number;           // 0-5
    medication: number;        // 0-4
  };
  totalScore: number;
  riskLevel: 'not_at_risk' | 'at_risk' | 'high_risk' | 'very_high_risk';
  interpretation: string;
}

// ============================================
// PUSH Tool 3.0 (Pressure Ulcer Scale for Healing)
// ============================================
export interface PUSHScore {
  lengthTimesWidth: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // Sub-score
  exudateAmount: 0 | 1 | 2 | 3;  // None → Heavy
  surfaceType: 0 | 1 | 2 | 3 | 4; // Closed → Necrotic
  totalScore: number;              // 0-17
  healingTrend: 'healing' | 'stable' | 'deteriorating';
}

// ============================================
// Norton Scale (Alternative to Braden)
// ============================================
export interface NortonScaleAssessment {
  physicalCondition: 1 | 2 | 3 | 4;
  mentalCondition: 1 | 2 | 3 | 4;
  activity: 1 | 2 | 3 | 4;
  mobility: 1 | 2 | 3 | 4;
  incontinence: 1 | 2 | 3 | 4;
  totalScore: number; // 5-20
  riskLevel: 'very_high' | 'high' | 'moderate' | 'low';
  interpretation: string;
}

// ============================================
// Wound Bed Assessment (TIME Framework)
// ============================================
export interface TIMEAssessment {
  tissue: {
    type: 'epithelializing' | 'granulation' | 'slough' | 'necrotic' | 'eschar' | 'mixed';
    percentage: number;
    color: string;
    description: string;
  };
  infectionInflammation: {
    signs: string[];
    biofilmSuspected: boolean;
    criticalColonization: boolean;
    clinicalInfection: boolean;
    systemicInfection: boolean;
    swabTaken: boolean;
    cultureResult?: string;
  };
  moisture: {
    level: 'dry' | 'moist' | 'wet' | 'saturated';
    exudateType: 'none' | 'serous' | 'serosanguinous' | 'sanguinous' | 'purulent';
    exudateAmount: 'none' | 'scant' | 'small' | 'moderate' | 'large';
  };
  edge: {
    type: 'advancing' | 'non_advancing' | 'undermining' | 'rolled' | 'fibrotic';
    underminingCm?: number;
    underminingClockPosition?: string;
    periWoundSkin: string;
    maceration: boolean;
    callus: boolean;
  };
}

// ============================================
// Comorbidity Assessment for Pressure Sores
// ============================================
export interface PSComorbidityAssessment {
  spinalCordInjury: boolean;
  stroke: boolean;
  diabetesMellitus: {
    present: boolean;
    controlled?: boolean;
    hba1c?: number;
  };
  peripheralVascularDisease: boolean;
  anemia: {
    present: boolean;
    hemoglobin?: number;
  };
  malnutrition: {
    present: boolean;
    albumin?: number;
    prealbumin?: number;
    mustScore?: number;
  };
  incontinence: {
    urinary: boolean;
    fecal: boolean;
  };
  cognitiveImpairment: boolean;
  edema: boolean;
  smoking: boolean;
  obesity: boolean;
  immunosuppression: boolean;
  renalFailure: boolean;
  cardiovascularDisease: boolean;
  otherComorbidities: string[];
}

// ============================================
// Treatment Protocol
// ============================================
export interface PSTreatmentProtocol {
  // Pressure Relief
  pressureRelief: {
    surfaceType: 'static_overlay' | 'alternating_pressure' | 'low_air_loss' | 'air_fluidized' | 'foam_mattress' | 'specialized_wheelchair';
    repositioningSchedule: string; // e.g., "Every 2 hours"
    positioningDevices: string[];
    offloadingDevices: string[];
    heelElevation: boolean;
    seatCushion?: string;
  };

  // Wound Care
  woundCare: {
    cleansingAgent: string;
    cleansingFrequency: string;
    debridementType?: 'surgical' | 'autolytic' | 'enzymatic' | 'mechanical' | 'biological' | 'none';
    debridementFrequency?: string;
    primaryDressing: string;
    secondaryDressing?: string;
    dressingChangeFrequency: string;
    npwtIndicated: boolean;
    npwtSettings?: string;
    topicalAgents?: string[];
    barrierCream?: string;
  };

  // Infection Management
  infectionManagement?: {
    topicalAntimicrobial?: string;
    systemicAntibiotics?: PSSysAntibiotic[];
    woundSwabSent: boolean;
    cultureResults?: string;
  };

  // Nutrition
  nutritionPlan: {
    caloricTarget: string;
    proteinTarget: string;
    supplements: string[];
    hydrateTarget: string;
    vitamins: string[];
    enteralFeeding?: boolean;
    parenteralFeeding?: boolean;
    dietaryModifications: string[];
  };

  // Pain Management
  painManagement: {
    assessmentTool: string;
    pharmacological: string[];
    nonPharmacological: string[];
    preDressingAnalgesia?: string;
  };

  // Surgical Options
  surgicalOptions?: {
    required: boolean;
    procedures: PSProcedure[];
    flapType?: string;
    graftType?: string;
    timingPlan?: string;
  };

  // Continence Management
  continenceManagement?: {
    catheterization: boolean;
    bowelProgram: boolean;
    skinProtection: string[];
    absorbentProducts: string[];
  };
}

export interface PSSysAntibiotic {
  name: string;
  dose: string;
  route: 'IV' | 'PO';
  frequency: string;
  duration: string;
  indication: string;
}

export interface PSProcedure {
  name: string;
  type: 'debridement' | 'flap_closure' | 'skin_graft' | 'npwt' | 'osteotomy' | 'other';
  description: string;
  urgency: 'emergency' | 'urgent' | 'elective';
  status: 'planned' | 'completed' | 'cancelled';
  completedAt?: Date;
  performedBy?: string;
  findings?: string;
}

// ============================================
// Monitoring Record
// ============================================
export interface PSMonitoringRecord {
  id: string;
  assessmentId: string;
  patientId: string;
  hospitalId: string;

  recordedAt: Date;
  recordedBy: string;
  recordedByName: string;

  // Wound Measurements
  woundMeasurements: {
    length: number;
    width: number;
    depth: number;
    area: number;
    underminingPresent: boolean;
    underminingCm?: number;
    tunnelingPresent: boolean;
    tunnelingCm?: number;
  };

  // PUSH Score
  pushScore: PUSHScore;

  // TIME Assessment
  timeAssessment: TIMEAssessment;

  // Wound Bed
  woundBedDescription: string;
  periWoundSkin: string;
  exudateCharacter: string;

  // Photos
  photos: string[];
  photoComparison?: string;

  // Dressing Assessment
  dressingAssessment: {
    currentDressing: string;
    dressingIntegrity: 'intact' | 'partially_displaced' | 'saturated' | 'soiled';
    dressingChanged: boolean;
    newDressingApplied: string;
  };

  // Repositioning Compliance
  repositioningCompliance: {
    scheduleFollowed: boolean;
    deviations?: string[];
    skinChecksPerformed: boolean;
    newAreasOfConcern?: string[];
  };

  // Nutritional Intake
  nutritionalIntake: {
    oralIntakePercentage: number;
    supplementsTaken: boolean;
    proteinIntakeAdequate: boolean;
  };

  overallTrend: 'healing' | 'stable' | 'deteriorating';
  notes: string;

  createdAt: Date;
  updatedAt?: Date;
  syncedAt?: Date;
  localId?: string;
}

// ============================================
// Main Assessment Record
// ============================================
export interface PressureSoreAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;

  // Classification
  stage: PressureUlcerStage;
  location: PressureSoreLocation;
  locationDetail: string;
  status: PressureSoreStatus;

  // Multiple ulcers
  isMultiple: boolean;
  additionalUlcers?: Array<{
    stage: PressureUlcerStage;
    location: PressureSoreLocation;
    locationDetail: string;
    size: { length: number; width: number; depth: number };
  }>;

  // Wound Measurements
  woundMeasurements: {
    length: number;
    width: number;
    depth: number;
    area: number;
    underminingPresent: boolean;
    underminingCm?: number;
    underminingClockPosition?: string;
    tunnelingPresent: boolean;
    tunnelingCm?: number;
    tunnelingClockPosition?: string;
  };

  // Risk Scoring
  bradenScore: BradenScaleAssessment;
  waterlowScore?: WaterlowScoreAssessment;
  nortonScore?: NortonScaleAssessment;
  pushScore?: PUSHScore;

  // TIME Assessment
  timeAssessment: TIMEAssessment;

  // Comorbidities
  comorbidities: PSComorbidityAssessment;

  // Treatment
  treatmentProtocol: PSTreatmentProtocol;

  // Lab Panel
  labPanel: {
    fbc: boolean;
    albumin: boolean;
    prealbumin: boolean;
    crp: boolean;
    ueCreatinine: boolean;
    rbs: boolean;
    hba1c: boolean;
    woundSwabMCS: boolean;
    tissueBiopsy: boolean;
    boneScan?: boolean; // If osteomyelitis suspected
    mri?: boolean;
    xray?: boolean;
  };

  // Auto-requested items tracking
  autoRequestedLabs: string[];
  autoRequestedPrescriptions: string[];
  autoRequestedProcedures: string[];

  // Outcome
  outcomeAssessment?: {
    outcome: 'healed' | 'improving' | 'chronic' | 'surgical_closure' | 'death';
    healingDuration?: number;
    numberOfDebridements?: number;
    surgicalClosureType?: string;
    recurrence?: boolean;
    recurrenceLocation?: string;
    functionalOutcome?: string;
  };

  // Metadata
  assessedBy: string;
  assessedByName: string;
  assessmentDate: Date;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
  syncedAt?: Date;
  localId?: string;
}

// ============================================
// Education & CME Types
// ============================================
export interface PSEducationContent {
  patientEducation: {
    overview: string;
    preventionStrategies: string[];
    skinCareInstructions: string[];
    positioningGuidance: string[];
    nutritionAdvice: string[];
    equipmentUse: string[];
    warningSigns: string[];
    whenToSeekHelp: string[];
    homeCareTips: string[];
    caregiverGuidance: string[];
  };
  nursingEducation: {
    riskAssessmentProtocol: string[];
    skinAssessmentTechnique: string[];
    repositioningProtocol: string[];
    woundCareProtocol: string[];
    dressingSelection: string[];
    documentationRequirements: string[];
    pressureReliefDevices: string[];
    nutritionMonitoring: string[];
    patientFamilyTeaching: string[];
    qualityIndicators: string[];
  };
  cmeContent: {
    title: string;
    objectives: string[];
    clinicalPearls: string[];
    evidenceBasedGuidelines: string[];
    classificationSystems: string[];
    treatmentAlgorithm: string[];
    surgicalOptions: string[];
    preventionStrategies: string[];
    qualityImprovement: string[];
    references: string[];
    caseStudies: PSCaseStudy[];
  };
}

export interface PSCaseStudy {
  title: string;
  presentation: string;
  assessment: string;
  management: string;
  outcome: string;
  learningPoints: string[];
}
