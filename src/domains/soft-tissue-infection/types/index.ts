// ============================================
// Soft Tissue Infection / Necrotizing (STI/NEC) Module Types
// WHO Best Practice Protocols
// ============================================

// ============================================
// LRINEC Score - Laboratory Risk Indicator for Necrotizing Fasciitis
// ============================================
export interface LRINECScore {
  crp: number;                // C-Reactive Protein (mg/L) → 0 or 4
  wbc: number;                // White Blood Cell count (×10³/µL) → 0, 1, or 2
  hemoglobin: number;         // Hemoglobin (g/dL) → 0, 1, or 2
  sodium: number;             // Sodium (mmol/L) → 0 or 2
  creatinine: number;         // Creatinine (µmol/L) → 0 or 2
  glucose: number;            // Glucose (mmol/L) → 0 or 1
  totalScore: number;         // Sum: 0-13
  riskCategory: 'low' | 'moderate' | 'high'; // ≤5 low, 6-7 moderate, ≥8 high
  interpretation: string;
}

// ============================================
// NSTI Classification & Staging
// ============================================
export type STIClassification =
  | 'simple_cellulitis'
  | 'complicated_cellulitis'
  | 'abscess'
  | 'necrotizing_fasciitis_type1'   // Polymicrobial
  | 'necrotizing_fasciitis_type2'   // Monomicrobial (GAS)
  | 'necrotizing_fasciitis_type3'   // Gas gangrene (Clostridium)
  | 'fournier_gangrene'
  | 'pyomyositis'
  | 'gas_gangrene';

export type STISeverity = 'mild' | 'moderate' | 'severe' | 'critical';

export type STIStage =
  | 'early_cellulitis'          // Stage 1
  | 'advancing_infection'       // Stage 2
  | 'suppurative'               // Stage 3
  | 'necrotizing'               // Stage 4
  | 'systemic_sepsis'           // Stage 5
  | 'multi_organ_failure';      // Stage 6

export type STILocation =
  | 'head_neck'
  | 'upper_extremity'
  | 'lower_extremity'
  | 'trunk_anterior'
  | 'trunk_posterior'
  | 'perineum'
  | 'abdominal_wall'
  | 'breast'
  | 'hand'
  | 'foot'
  | 'other';

// ============================================
// Comorbidity Assessment
// ============================================
export interface STIComorbidityAssessment {
  diabetesMellitus: {
    present: boolean;
    type?: 'type1' | 'type2';
    controlled?: boolean;
    hba1c?: number;
    lastFastingGlucose?: number;
    onInsulin?: boolean;
    oralHypoglycemics?: string[];
  };
  jaundice: {
    present: boolean;
    type?: 'obstructive' | 'hepatocellular' | 'haemolytic';
    bilirubinLevel?: number;
  };
  renalImpairment: {
    present: boolean;
    severity?: 'mild' | 'moderate' | 'severe' | 'dialysis';
    gfr?: number;
    creatinine?: number;
    onDialysis?: boolean;
  };
  sepsis: {
    present: boolean;
    sepsisScore?: number; // qSOFA
    sIRS?: boolean;
    septicShock?: boolean;
    lactateLevel?: number;
    vasopressorRequired?: boolean;
  };
  immunosuppression: {
    present: boolean;
    cause?: string[];
    hivStatus?: 'positive' | 'negative' | 'unknown';
    cd4Count?: number;
    onSteroids?: boolean;
    onChemotherapy?: boolean;
  };
  peripheralVascularDisease: {
    present: boolean;
    ankleIndex?: number;
  };
  malnutrition: {
    present: boolean;
    mustScore?: number;
    albumin?: number;
  };
  obesity: {
    present: boolean;
    bmi?: number;
  };
  hepaticDisease: {
    present: boolean;
    childPughScore?: string;
    cirrhosis?: boolean;
  };
  otherComorbidities: string[];
}

// ============================================
// Clinical Assessment
// ============================================
export interface STIClinicalAssessment {
  // Presentation
  presentationTime: Date;
  durationOfSymptoms: string; // hours/days
  acuteOnset: boolean;

  // Local Signs
  localSigns: {
    erythema: boolean;
    erythemaExtentCm: number;
    warmth: boolean;
    swelling: boolean;
    tenderness: boolean;
    painOutOfProportion: boolean; // Key sign of NSTI
    crepitus: boolean;           // Key sign of gas gangrene
    bullae: boolean;             // Key sign of NSTI
    skinNecrosis: boolean;
    dishwaterDischarge: boolean;
    foulSmell: boolean;
    rapidSpread: boolean;
    spreadRateCmPerHour?: number;
    fluctuance: boolean;         // Abscess sign
    lymphangitis: boolean;
    induration: boolean;
  };

  // Systemic Signs
  systemicSigns: {
    fever: boolean;
    temperature?: number;
    tachycardia: boolean;
    heartRate?: number;
    hypotension: boolean;
    systolicBP?: number;
    diastolicBP?: number;
    tachypnea: boolean;
    respiratoryRate?: number;
    alteredMentalStatus: boolean;
    gcsScore?: number;
    rigors: boolean;
    oliguria: boolean;
    urineOutput?: number;
  };

  // Wound Characteristics
  woundCharacteristics: {
    size: { length: number; width: number; depth?: number };
    location: STILocation;
    locationDetail: string;
    hasExudate: boolean;
    exudateType?: 'serous' | 'serosanguinous' | 'purulent' | 'dishwater' | 'necrotic';
    exudateAmount?: 'minimal' | 'moderate' | 'copious';
    tissueColor?: string;
    surroundingSkin?: string;
    photos?: string[];
  };

  // Risk Assessment
  riskOfNSTI: 'low' | 'moderate' | 'high' | 'very_high';
  fingerTestPositive?: boolean; // Bedside finger test for NSTI
  probeToFascia?: boolean;
}

// ============================================
// Treatment Protocol
// ============================================
export interface STITreatmentProtocol {
  // Antibiotic Therapy
  antibiotics: STIAntibiotic[];
  empiricRegimen: string;
  targetedRegimen?: string;
  deEscalationPlan?: string;
  duration: string;

  // Surgical Management
  surgicalPlan: {
    required: boolean;
    urgency: 'emergency' | 'urgent' | 'elective' | 'not_required';
    procedures: STIProcedure[];
    debridementFrequency?: string;
    numberOfDebridements?: number;
    serialDebriedmentPlan?: string;
  };

  // Wound Management
  woundManagement: {
    dressingType: string;
    dressingFrequency: string;
    npwtIndicated: boolean;
    npwtSettings?: string;
    reconstructionPlan?: string;
    skinGraftRequired?: boolean;
    flapRequired?: boolean;
  };

  // Supportive Care
  supportiveCare: {
    ivFluids: boolean;
    fluidRegimen?: string;
    vasopressors: boolean;
    icuRequired: boolean;
    ventilationRequired: boolean;
    renalReplacement: boolean;
    nutritionalSupport: string;
    dvtProphylaxis: string;
    stressUlcerProphylaxis: boolean;
    bloodGlucoseControl: boolean;
    targetGlucose?: string;
    tetanusProphylaxis: boolean;
    painManagement: string;
  };

  // Hyperbaric Oxygen Therapy
  hbot: {
    indicated: boolean;
    sessions?: number;
    rationale?: string;
  };

  // IVIG (for Streptococcal toxic shock)
  ivig: {
    indicated: boolean;
    dose?: string;
    rationale?: string;
  };
}

export interface STIAntibiotic {
  name: string;
  dose: string;
  route: 'IV' | 'IM' | 'PO';
  frequency: string;
  duration: string;
  category: 'empiric' | 'targeted' | 'adjunct';
  indication: string;
  renalAdjustment?: string;
  hepaticAdjustment?: string;
}

export interface STIProcedure {
  name: string;
  type: 'debridement' | 'fasciotomy' | 'amputation' | 'drainage' | 'exploration' | 'wound_closure' | 'skin_graft' | 'flap' | 'npwt';
  urgency: 'emergency' | 'urgent' | 'elective';
  description: string;
  estimatedDuration?: string;
  anesthesiaType?: string;
  status: 'planned' | 'completed' | 'cancelled';
  completedAt?: Date;
  performedBy?: string;
  findings?: string;
  specimenSent?: boolean;
}

// ============================================
// Laboratory Monitoring
// ============================================
export interface STILabPanel {
  // Required Labs
  fbc: boolean;
  crp: boolean;
  esrOrPct: boolean;
  ueCreatinine: boolean;
  lft: boolean;
  rbs: boolean;
  lactate: boolean;
  bloodCulture: boolean;
  woundSwabMCS: boolean;
  tissueForMCS: boolean;
  urinalysis: boolean;

  // Conditional Labs
  hba1c?: boolean;        // If DM
  arterialBloodGas?: boolean; // If sepsis
  coagulationProfile?: boolean;
  dDimer?: boolean;
  procalcitonin?: boolean;
  serialCRP?: boolean;
  serialLactate?: boolean;

  // Imaging
  xray?: boolean;         // Soft tissue gas
  ctScan?: boolean;       // Fascial plane tracking
  mri?: boolean;          // Best for early NSTI
  ultrasound?: boolean;  // Fluid collections

  // LRINEC Components
  lrinecScore?: LRINECScore;
}

// ============================================
// Monitoring Record
// ============================================
export interface STIMonitoringRecord {
  id: string;
  assessmentId: string;
  patientId: string;
  hospitalId: string;

  // Timestamp
  recordedAt: Date;
  recordedBy: string;
  recordedByName: string;

  // Vitals
  vitals: {
    temperature: number;
    heartRate: number;
    bloodPressure: { systolic: number; diastolic: number };
    respiratoryRate: number;
    spo2: number;
    gcs: number;
    urineOutput: number;
    painScore: number;
  };

  // Wound Status
  woundStatus: {
    erythemaProgression: 'improving' | 'stable' | 'worsening';
    erythemaExtentCm: number;
    necrosisProgression: 'improving' | 'stable' | 'worsening';
    dischargeAmount: 'none' | 'minimal' | 'moderate' | 'copious';
    woundBedAppearance: string;
    odor: boolean;
    crepitus: boolean;
    serialPhotos?: string[];
    markedBoundary: boolean; // Skin marker boundary tracking
  };

  // Lab Results
  labResults?: {
    wbc?: number;
    crp?: number;
    lactate?: number;
    procalcitonin?: number;
    creatinine?: number;
    glucose?: number;
    hemoglobin?: number;
    platelets?: number;
    inr?: number;
  };

  // Antibiotic Compliance
  antibioticCompliance: {
    allDosesGiven: boolean;
    missedDoses?: string[];
    sideEffects?: string[];
    cultureResults?: string;
    antibioticChanged: boolean;
    changeReason?: string;
  };

  // Assessment
  overallTrend: 'improving' | 'stable' | 'deteriorating';
  newsScore?: number;
  sofaScore?: number;
  escalationRequired: boolean;
  escalationAction?: string;
  notes: string;

  createdAt: Date;
  updatedAt?: Date;
  syncedAt?: Date;
  localId?: string;
}

// ============================================
// Main Assessment Record
// ============================================
export interface SoftTissueInfectionAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;

  // Classification
  classification: STIClassification;
  severity: STISeverity;
  stage: STIStage;
  location: STILocation;
  locationDetail: string;

  // Clinical Assessment
  clinicalAssessment: STIClinicalAssessment;

  // Scoring
  lrinecScore?: LRINECScore;
  qSofaScore?: number;
  sofaScore?: number;
  newsScore?: number;

  // Comorbidities
  comorbidities: STIComorbidityAssessment;

  // Treatment
  treatmentProtocol: STITreatmentProtocol;

  // Lab Panel
  labPanel: STILabPanel;

  // Auto-requested items tracking
  autoRequestedLabs: string[];    // IDs of auto-created lab requests
  autoRequestedPrescriptions: string[]; // IDs of auto-created prescriptions
  autoRequestedProcedures: string[];   // IDs of auto-created procedure requests

  // Status Tracking
  status: 'active' | 'improving' | 'resolved' | 'complicated' | 'transferred' | 'deceased';
  outcomeAssessment?: {
    outcome: 'resolved' | 'chronic' | 'amputation' | 'death' | 'transferred';
    lossDays?: number;
    icuDays?: number;
    numberOfDebridements?: number;
    reconstructionPerformed?: boolean;
    functionalOutcome?: string;
    mortalityRisk?: string;
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
export interface STIEducationContent {
  patientEducation: {
    overview: string;
    warningSigns: string[];
    woundCareInstructions: string[];
    medicationAdherence: string[];
    nutritionAdvice: string[];
    whenToSeekHelp: string[];
    preventionStrategies: string[];
    diabeticFootCare?: string[];
    followUpSchedule: string[];
  };
  nursingEducation: {
    assessmentProtocol: string[];
    woundCareProtocol: string[];
    infectionControlMeasures: string[];
    antibioticAdministration: string[];
    monitoringFrequency: string[];
    escalationCriteria: string[];
    documentationRequirements: string[];
    painAssessment: string[];
    nutritionMonitoring: string[];
    dischargeTeaching: string[];
  };
  cmeContent: {
    title: string;
    objectives: string[];
    clinicalPearls: string[];
    evidenceBasedGuidelines: string[];
    diagnosticAlgorithm: string[];
    treatmentAlgorithm: string[];
    controversies: string[];
    recentAdvances: string[];
    references: string[];
    caseStudies: STICaseStudy[];
  };
}

export interface STICaseStudy {
  title: string;
  presentation: string;
  investigations: string;
  diagnosis: string;
  management: string;
  outcome: string;
  learningPoints: string[];
}
