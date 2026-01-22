/**
 * Emergency Clinical Decision Support Types
 * AstroHEALTH - Emergency Resuscitation & Pre-Operative Optimization
 * 
 * Types for AI-powered clinical decision support for emergency surgical cases
 * Aligned with WHO, Surviving Sepsis Campaign, and standard peri-operative care principles
 */

// ============================================================
// PATIENT CLINICAL INPUT PARAMETERS
// ============================================================

export interface EmergencyPatientProfile {
  patientId: string;
  age: number;
  sex: 'male' | 'female';
  weight?: number; // kg
  height?: number; // cm
  
  // Primary Conditions
  confirmedDiabetesMellitus: boolean;
  diabeticFootInfection: boolean;
  requiresEmergencyDebridement: boolean;
  
  // Sepsis Indicators
  sepsis: boolean;
  septicShock?: boolean;
  
  // Metabolic State
  dehydration: boolean;
  dehydrationSeverity?: 'mild' | 'moderate' | 'severe';
  anaemia: boolean;
  electrolyteImbalance: boolean;
  markedHyperglycaemia: boolean;
}

export interface VitalSignsInput {
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  meanArterialPressure?: number;
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number; // SpO2 %
  temperature: number; // Celsius
  capillaryRefillTime?: number; // seconds
}

export interface MentalStatusInput {
  gcsTotal?: number;
  gcsEye?: number;
  gcsVerbal?: number;
  gcsMotor?: number;
  avpu?: 'alert' | 'verbal' | 'pain' | 'unresponsive';
}

export interface LaboratoryInput {
  // Glucose
  randomBloodGlucose?: number; // mmol/L
  hba1c?: number; // %
  
  // Electrolytes
  sodium?: number; // mmol/L
  potassium?: number; // mmol/L
  chloride?: number; // mmol/L
  bicarbonate?: number; // mmol/L
  calcium?: number; // mmol/L
  magnesium?: number; // mmol/L
  phosphate?: number; // mmol/L
  
  // Full Blood Count
  haemoglobin?: number; // g/dL
  haematocrit?: number; // %
  whiteBloodCellCount?: number; // x10^9/L
  plateletCount?: number; // x10^9/L
  
  // Renal Function
  creatinine?: number; // µmol/L
  bloodUreaNitrogen?: number; // mmol/L
  estimatedGFR?: number; // mL/min/1.73m²
  
  // Liver Function
  albumin?: number; // g/L
  bilirubin?: number; // µmol/L
  alt?: number; // U/L
  ast?: number; // U/L
  
  // Sepsis Markers
  lactate?: number; // mmol/L
  procalcitonin?: number; // ng/mL
  crp?: number; // mg/L
  
  // Coagulation
  inr?: number;
  pt?: number; // seconds
  aptt?: number; // seconds
}

export interface UrineOutputInput {
  lastRecordedOutput?: number; // mL
  hoursSinceLastOutput?: number;
  hourlyUrineOutput?: number; // mL/hr
  estimatedDailyOutput?: number; // mL/24hr
  catheterInSitu?: boolean;
}

export interface OrganDysfunctionInput {
  hasShock: boolean;
  requiresVasopressors?: boolean;
  hasAcuteKidneyInjury?: boolean;
  hasAcuteLiverFailure?: boolean;
  hasAcuteRespiratoryFailure?: boolean;
  hasCoagulopathy?: boolean;
  hasDIC?: boolean; // Disseminated Intravascular Coagulation
}

// Complete Clinical Scenario Input
export interface EmergencyCDSInput {
  patientProfile: EmergencyPatientProfile;
  vitalSigns: VitalSignsInput;
  mentalStatus?: MentalStatusInput;
  laboratory?: LaboratoryInput;
  urineOutput?: UrineOutputInput;
  organDysfunction?: OrganDysfunctionInput;
  
  // Time Context
  timeOfPresentationHours?: number;
  timeSinceLastAntibioticHours?: number;
  
  // Additional Clinical Context
  bloodCulturesTaken?: boolean;
  ivAccessEstablished?: boolean;
  currentAntibioticTherapy?: string;
  allergies?: string[];
  
  // Resource Setting
  resourceSetting: 'low' | 'standard' | 'tertiary';
}

// ============================================================
// CDS OUTPUT STRUCTURES
// ============================================================

export type TriagePriority = 'immediate' | 'urgent' | 'delayed';
export type SepsisSeverity = 'sepsis' | 'severe_sepsis' | 'septic_shock';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'not_applicable';

export interface CDSRecommendation {
  id: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale?: string;
  target?: string;
  timeline?: string;
  status: ActionStatus;
  completedAt?: Date;
  completedBy?: string;
  clinicianNotes?: string;
  isEdited?: boolean;
  originalRecommendation?: string;
}

export interface CDSSection {
  title: string;
  icon?: string;
  recommendations: CDSRecommendation[];
  clinicianOverride?: string;
  isExpanded?: boolean;
}

// 1. Immediate Triage & Prioritization
export interface TriageAssessment {
  triagePriority: TriagePriority;
  lifeThreatening: string[];
  sepsisSeverity: SepsisSeverity;
  surgicalUrgency: 'immediate' | 'within_1_hour' | 'within_6_hours';
  parallelResuscitationSurgery: boolean;
  resuscitationNote: string;
}

// 2. Airway, Breathing, Circulation
export interface ABCAssessment {
  // Airway
  airway: {
    status: 'patent' | 'at_risk' | 'compromised';
    assessmentSteps: string[];
    airwayProtectionIndicated: boolean;
    interventions: string[];
  };
  
  // Breathing
  breathing: {
    status: 'adequate' | 'compromised' | 'failing';
    oxygenTarget: string;
    currentSpO2?: number;
    supplementalOxygenRequired: boolean;
    assistedVentilationIndicated: boolean;
    interventions: string[];
  };
  
  // Circulation
  circulation: {
    status: 'stable' | 'unstable' | 'shock';
    ivAccessRequired: string; // e.g., "2 large-bore IV cannulae (≥18G)"
    fluidType: string;
    initialBolusVolume: number; // mL
    bolusRate: string;
    monitoringParameters: string[];
    interventions: string[];
  };
}

// 3. Sepsis Management
export interface SepsisManagement {
  hourOneSepsisBundle: CDSRecommendation[];
  empiricalAntibioticPrinciples: string[];
  bloodCultureTiming: string;
  sourceControlRationale: string;
  lactateAssessment: {
    currentLevel?: number;
    target: string;
    reassessmentInterval: string;
  };
  vasopressorIndications: string[];
  perfusionTargets: string[];
}

// 4. Glycaemic Control
export interface GlycaemicControl {
  currentGlucose?: number;
  immediateStrategy: string[];
  targetGlucoseRange: {
    min: number;
    max: number;
    unit: string;
  };
  monitoringFrequency: string;
  hypoglycaemiaPrevention: string[];
  insulinProtocol?: string;
}

// 5. Fluid & Electrolyte Correction
export interface FluidElectrolyteManagement {
  dehydrationSeverity: 'mild' | 'moderate' | 'severe';
  estimatedFluidDeficit?: number; // mL
  correctionPriorities: string[];
  electrolyteCorrections: {
    electrolyte: string;
    currentLevel?: number;
    targetLevel: string;
    correctionApproach: string;
    rate?: string;
  }[];
  monitoringRequirements: string[];
  fluidPlan: {
    phase: 'resuscitation' | 'replacement' | 'maintenance';
    fluidType: string;
    volume: number;
    rate: string;
    duration: string;
  }[];
}

// 6. Anaemia Assessment
export interface AnaemiaManagement {
  currentHaemoglobin?: number;
  anaemiaSeverity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  transfusionIndicated: boolean;
  transfusionThreshold: string;
  preOpHaemoglobinTarget: string;
  unitsRequired?: number;
  specialConsiderations: string[];
}

// 7. Renal & Metabolic Support
export interface RenalMetabolicSupport {
  renalStatus: 'normal' | 'impaired' | 'acute_injury' | 'failure';
  currentCreatinine?: number;
  currentGFR?: number;
  urineOutputTarget: string;
  renalProtectionStrategies: string[];
  fluidAdjustments?: string;
  glucoseAdjustmentsInRenalImpairment?: string[];
  nephrotoxicAvoidance: string[];
  dialysisConsideration?: string;
}

// 8. Pre-Operative Preparation
export interface PreOperativePreparation {
  minimumPhysiologicalParameters: {
    parameter: string;
    minimumValue: string;
    currentValue?: string;
    status: 'met' | 'not_met' | 'borderline';
  }[];
  optimizeBeforeTheatre: string[];
  optimizeDuringSurgery: string[];
  anaestheticConsiderations: string[];
  consentPriorities: string[];
  documentationPriorities: string[];
}

// 9. Surgical Fitness Endpoints
export interface SurgicalFitnessEndpoints {
  haemodynamicStability: {
    target: string;
    achieved: boolean;
    currentValue?: string;
  };
  oxygenation: {
    target: string;
    achieved: boolean;
    currentValue?: string;
  };
  glycaemicControl: {
    target: string;
    achieved: boolean;
    currentValue?: string;
  };
  electrolytesSafe: {
    target: string;
    achieved: boolean;
    currentValues?: Record<string, string>;
  };
  urineOutput: {
    target: string;
    achieved: boolean;
    currentValue?: string;
  };
  mentalStatus: {
    target: string;
    achieved: boolean;
    currentValue?: string;
  };
  overallFitnessDeclaration: string;
  criticalStatement: string; // "In life-threatening sepsis, surgery should not be delayed..."
}

// 10. Post-Debridement Continuity
export interface PostDebridementCare {
  immediatePostOpMonitoring: string[];
  ongoingSepsisControl: string[];
  glycaemicManagement: string[];
  woundCarePrinciples: string[];
}

// ============================================================
// COMPLETE CDS ASSESSMENT
// ============================================================

export interface EmergencyCDSAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  surgeryId?: string;
  
  // Input Data (snapshot at time of assessment)
  input: EmergencyCDSInput;
  
  // Generated Outputs
  triage: TriageAssessment;
  abcAssessment: ABCAssessment;
  sepsisManagement: SepsisManagement;
  glycaemicControl: GlycaemicControl;
  fluidElectrolyte: FluidElectrolyteManagement;
  anaemiaManagement: AnaemiaManagement;
  renalMetabolic: RenalMetabolicSupport;
  preOperativePrep: PreOperativePreparation;
  fitnessEndpoints: SurgicalFitnessEndpoints;
  postDebridementCare: PostDebridementCare;
  
  // Additional Sections
  allRecommendations: CDSSection[];
  
  // Red Zone Flags
  redZoneAlerts: {
    parameter: string;
    value: string;
    threshold: string;
    action: string;
  }[];
  
  // Safety & Governance
  safetyStatements: string[];
  disclaimers: string[];
  
  // Audit Trail
  generatedAt: Date;
  generatedBy: string; // System or AI version
  
  // Clinician Modifications
  attendingSurgeon?: string;
  attendingAnaesthetist?: string;
  clinicianOverrides: {
    section: string;
    originalRecommendation: string;
    modifiedRecommendation: string;
    rationale: string;
    modifiedBy: string;
    modifiedAt: Date;
  }[];
  
  // Status
  status: 'draft' | 'active' | 'completed' | 'archived';
  completedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CDS CHECKLIST VIEW
// ============================================================

export interface CDSChecklistItem {
  id: string;
  sectionId: string;
  text: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeLimit?: string;
}

export interface CDSChecklist {
  id: string;
  assessmentId: string;
  title: string;
  sections: {
    id: string;
    title: string;
    items: CDSChecklistItem[];
    progress: number; // 0-100
  }[];
  overallProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CDS HISTORY & AUDIT
// ============================================================

export interface CDSAuditEntry {
  id: string;
  assessmentId: string;
  action: 'created' | 'modified' | 'recommendation_completed' | 'override' | 'exported';
  details: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export type CDSExportFormat = 'pdf' | 'json' | 'checklist';

// ============================================================
// UI STATE TYPES
// ============================================================

export interface CDSUIState {
  activeSection: string;
  expandedSections: string[];
  viewMode: 'full' | 'checklist' | 'summary';
  showRedZonesOnly: boolean;
  isEditing: boolean;
}

// ============================================================
// QUICK SOFA & qSOFA SCORING
// ============================================================

export interface QSOFAScore {
  respiratoryRate: boolean; // ≥22/min
  alteredMentation: boolean; // GCS <15
  systolicBP: boolean; // ≤100 mmHg
  totalScore: number; // 0-3
  sepsisSuspected: boolean; // ≥2 indicates sepsis
}

export interface SOFAScore {
  respiration: number; // 0-4
  coagulation: number; // 0-4
  liver: number; // 0-4
  cardiovascular: number; // 0-4
  cns: number; // 0-4
  renal: number; // 0-4
  totalScore: number; // 0-24
  mortalityRisk: string;
}
