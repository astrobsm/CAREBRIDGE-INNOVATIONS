/**
 * Substance Use Disorder Assessment & Detoxification Module (CSUD-DSM)
 * Type Definitions - Extracted for Integration into External Applications
 * 
 * ⚠️ CLINICAL DECISION SUPPORT ONLY.
 * Final clinical responsibility rests with the licensed clinician.
 */

// ==================== ENUMS & LITERAL TYPES ====================

export type SubstanceCategory = 
  | 'opioids'
  | 'cannabinoids'
  | 'sedatives'
  | 'stimulants'
  | 'alcohol'
  | 'hallucinogens'
  | 'inhalants'
  | 'tobacco'
  | 'other';

export type RouteOfAdministration = 
  | 'oral'
  | 'intravenous'
  | 'intramuscular'
  | 'subcutaneous'
  | 'inhalation'
  | 'intranasal'
  | 'transdermal'
  | 'sublingual'
  | 'rectal'
  | 'other';

export type AddictionSeverity = 'mild' | 'moderate' | 'severe' | 'complicated';

export type WithdrawalSeverity = 'minimal' | 'mild' | 'moderate' | 'severe' | 'life_threatening';

export type WithdrawalPhase = 'early' | 'peak' | 'late' | 'post_acute';

export type CareSettingRecommendation = 
  | 'outpatient_detox'
  | 'supervised_outpatient'
  | 'inpatient_admission'
  | 'icu_hdu_alert';

export type PainType = 'nociceptive' | 'neuropathic' | 'mixed' | 'psychogenic' | 'unknown';

export type DetoxStatus = 
  | 'assessment_pending'
  | 'in_assessment'
  | 'detox_planned'
  | 'detox_in_progress'
  | 'detox_completed'
  | 'transferred'
  | 'discharged'
  | 'relapsed'
  | 'abandoned';

// ==================== SUBSTANCE INTAKE ====================

export interface SubstanceIntake {
  id: string;
  substanceCategory: SubstanceCategory;
  substanceName: string;
  durationOfUseMonths: number;
  averageDailyDose: string;
  doseUnit: string;
  routeOfAdministration: RouteOfAdministration;
  escalationPattern: 'stable' | 'increasing' | 'decreasing' | 'erratic';
  lastUseDateTime: Date;
  frequencyPerDay: number;
  isPrimaryConcern: boolean;
  notes?: string;
}

// ==================== SCORING INTERFACES ====================

export interface PhysicalDependenceScore {
  tolerance: number;
  withdrawalSymptoms: number;
  compulsiveUse: number;
  physicalCravings: number;
  totalScore: number;
}

export interface PsychologicalDependenceScore {
  emotionalReliance: number;
  copingMechanism: number;
  preoccupation: number;
  anxietyWithoutSubstance: number;
  totalScore: number;
}

export interface BehavioralDysfunctionScore {
  prioritizingSubstance: number;
  failedAttemptsToCut: number;
  timeSpentObtaining: number;
  givingUpActivities: number;
  totalScore: number;
}

export interface SocialImpairmentScore {
  occupationalImpact: number;
  relationshipImpact: number;
  financialImpact: number;
  legalIssues: number;
  totalScore: number;
}

export interface MedicalComplicationsScore {
  liverDysfunction: number;
  renalDysfunction: number;
  cardiacComplications: number;
  neurologicalComplications: number;
  infectiousComplications: number;
  psychiatricComorbidity: number;
  totalScore: number;
}

export interface AddictionSeverityScore {
  physicalDependence: PhysicalDependenceScore;
  psychologicalDependence: PsychologicalDependenceScore;
  behavioralDysfunction: BehavioralDysfunctionScore;
  socialImpairment: SocialImpairmentScore;
  medicalComplications: MedicalComplicationsScore;
  totalCompositeScore: number;
  severityLevel: AddictionSeverity;
  interpretationNotes: string;
}

// ==================== WITHDRAWAL ====================

export interface WithdrawalSymptom {
  symptom: string;
  phase: WithdrawalPhase;
  expectedOnsetHours: number;
  expectedPeakHours: number;
  expectedDurationDays: number;
  severity: WithdrawalSeverity;
  isRedFlag: boolean;
  managementNotes: string;
}

export interface WithdrawalRiskPrediction {
  overallRisk: WithdrawalSeverity;
  riskScore: number;
  expectedSymptoms: WithdrawalSymptom[];
  earlyPhaseSymptoms: string[];
  peakPhaseSymptoms: string[];
  latePhaseSymptoms: string[];
  redFlagComplications: string[];
  timelineDescription: string;
  monitoringRecommendations: string[];
  pharmacologicalSupport: string[];
}

// ==================== PAIN MANAGEMENT ====================

export interface PainContextAssessment {
  hasPainCondition: boolean;
  painType: PainType;
  painCause: string;
  currentPainScore: number;
  averagePainScore: number;
  worstPainScore: number;
  currentAnalgesics: string[];
  analgesicMisuseRisk: 'low' | 'moderate' | 'high';
  analgesicMisuseIndicators: string[];
}

export interface AnalgesicRecommendation {
  category: 'primary' | 'adjuvant' | 'non_pharmacological' | 'escalation';
  recommendation: string;
  rationale: string;
  cautions: string[];
  requiresClinicianConfirmation: boolean;
  contraindications?: string[];
}

export interface PainManagementSupport {
  painContext: PainContextAssessment;
  nonOpioidPrimaryOptions: AnalgesicRecommendation[];
  adjuvantTherapies: AnalgesicRecommendation[];
  nonPharmacologicalStrategies: AnalgesicRecommendation[];
  escalationCriteria: string[];
  highRiskCombinationsWarning: string[];
  monitoringRequirements: string[];
}

// ==================== COMORBIDITY ====================

export interface ComorbidityModification {
  condition: string;
  affectsWithdrawal: boolean;
  withdrawalModifications: string[];
  affectsAnalgesics: boolean;
  analgesicModifications: string[];
  affectsInpatientThreshold: boolean;
  inpatientThresholdNotes: string;
  specialConsiderations: string[];
}

// ==================== CARE SETTING ====================

export interface CareSettingDecision {
  recommendation: CareSettingRecommendation;
  confidenceLevel: 'low' | 'medium' | 'high';
  triggerFactors: string[];
  supportingEvidence: string[];
  alternativeOptions: CareSettingRecommendation[];
  escalationCriteria: string[];
  clinicianOverrideReason?: string;
  clinicianOverrideBy?: string;
  clinicianOverrideAt?: Date;
}

// ==================== DOCUMENTS ====================

export interface SubstanceUseConsent {
  id: string;
  assessmentId: string;
  diagnosisExplanation: string;
  detoxificationRisks: string[];
  possibleWithdrawalEffects: string[];
  painManagementPlan: string;
  monitoringRequirements: string[];
  patientAcknowledged: boolean;
  witnessName?: string;
  witnessSignature?: string;
  consentTimestamp?: Date;
  consentDeviceInfo?: string;
  documentVersion: string;
}

export interface PatientInfoLeaflet {
  id: string;
  assessmentId: string;
  dayByDayExpectations: Array<{
    day: number;
    description: string;
    symptoms: string[];
    selfCareAdvice: string[];
  }>;
  warningSymptoms: string[];
  complianceExpectations: string[];
  familyInvolvement: string[];
  followUpSchedule: Array<{
    date: Date;
    purpose: string;
    location: string;
  }>;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    role: string;
  }>;
  generatedAt: Date;
  generatedBy: string;
}

// ==================== MONITORING ====================

export interface DetoxMonitoringRecord {
  id: string;
  assessmentId: string;
  patientId: string;
  recordedAt: Date;
  recordedBy: string;
  temperature: number;
  pulse: number;
  bloodPressure: string;
  respiratoryRate: number;
  oxygenSaturation: number;
  withdrawalSymptoms: string[];
  ciwaScore?: number;
  cowsScore?: number;
  pawsPresent: boolean;
  painScore: number;
  painLocation?: string;
  anxietyLevel: 'none' | 'mild' | 'moderate' | 'severe';
  agitationLevel: 'none' | 'mild' | 'moderate' | 'severe';
  sleepQuality: 'good' | 'fair' | 'poor' | 'none';
  hallucinationsPresent: boolean;
  suicidalIdeation: boolean;
  medicationCompliance: boolean;
  fluidIntakeAdequate: boolean;
  nutritionIntakeAdequate: boolean;
  interventions: string[];
  medicationsGiven: Array<{
    medication: string;
    dose: string;
    route: string;
    time: Date;
  }>;
  notes: string;
  alertsTriggered: string[];
  requiresEscalation: boolean;
  escalationReason?: string;
}

// ==================== FOLLOW-UP ====================

export interface DetoxFollowUp {
  id: string;
  assessmentId: string;
  patientId: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  followUpType: 'phone' | 'in_person' | 'video' | 'home_visit';
  currentStatus?: 'abstinent' | 'reduced_use' | 'same_level' | 'increased_use' | 'relapsed';
  relapseRiskLevel?: 'low' | 'moderate' | 'high';
  adherenceToRecommendations?: 'full' | 'partial' | 'none';
  withdrawalSymptomsResolved?: boolean;
  supportSystemStrength?: 'strong' | 'moderate' | 'weak' | 'none';
  referralsProvided?: string[];
  counselingRecommended?: boolean;
  clinicalNotes?: string;
  nextSteps?: string[];
  conductedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== MAIN ASSESSMENT ====================

export interface SubstanceUseAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;
  
  status: DetoxStatus;
  assessmentDate: Date;
  assessedBy: string;
  assessedByName: string;
  
  demographics: {
    age: number;
    sex: 'male' | 'female';
    weight: number;
    occupation?: string;
  };
  socialFactors: {
    housingStability: 'stable' | 'unstable' | 'homeless';
    employmentStatus: 'employed' | 'unemployed' | 'retired' | 'student' | 'disabled';
    familySupportLevel: 'strong' | 'moderate' | 'minimal' | 'none';
    legalIssues: boolean;
    legalIssuesDetails?: string;
  };
  previousDetoxAttempts: number;
  previousDetoxDetails?: string;
  psychiatricHistory: string[];
  psychiatricHistoryNotes?: string;
  
  substances: SubstanceIntake[];
  primarySubstance: string;
  polySubstanceUse: boolean;
  
  addictionSeverityScore: AddictionSeverityScore;
  withdrawalRiskPrediction: WithdrawalRiskPrediction;
  painManagementSupport?: PainManagementSupport;
  
  relevantComorbidities: string[];
  comorbidityModifications: ComorbidityModification[];
  
  careSettingDecision: CareSettingDecision;
  
  clinicianOverride?: {
    originalRecommendation: CareSettingRecommendation;
    overriddenTo: CareSettingRecommendation;
    reason: string;
    overriddenBy: string;
    overriddenAt: Date;
  };
  
  consent?: SubstanceUseConsent;
  patientInfoLeaflet?: PatientInfoLeaflet;
  
  exclusionCriteriaFlags: {
    isPregnant: boolean;
    isPediatric: boolean;
    hasSeverePsychiatricIllness: boolean;
    requiresSpecialistReferral: boolean;
    exclusionReason?: string;
  };
  
  auditLog: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: string;
  }>;
  
  clinicalSummary?: string;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  completedBy?: string;
}

// ==================== CLINICAL SUMMARY ====================

export interface SubstanceUseClinicalSummary {
  id: string;
  assessmentId: string;
  patientId: string;
  patientName: string;
  hospitalName: string;
  assessmentDate: Date;
  addictionScoreSummary: {
    compositeScore: number;
    severityLevel: AddictionSeverity;
    interpretation: string;
  };
  riskClassification: WithdrawalSeverity;
  recommendedPathway: CareSettingRecommendation;
  keyFindings: string[];
  recommendedInterventions: string[];
  monitoringChecklist: string[];
  followUpSchedule: string[];
  disclaimers: string[];
  generatedAt: Date;
  generatedBy: string;
}
