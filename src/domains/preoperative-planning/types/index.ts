// Preoperative Planning Types
// WHO-aligned peri-operative framework for surgical patient optimization

// Surgical urgency definitions
export type SurgicalUrgency = 'elective' | 'urgent' | 'emergency';

// Anaesthesia types (risk gradient: Local < Spinal < Epidural < General)
export type AnaesthesiaType = 'local' | 'spinal' | 'epidural' | 'general' | 'sedation';

// ASA Physical Status Classification
export type ASAClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

// Patient comorbidity categories
export type ComorbidityCategory =
  | 'none'
  | 'hypertension'
  | 'diabetes'
  | 'severe_sepsis'
  | 'asthma'
  | 'sickle_cell'
  | 'bleeding_disorder'
  | 'cardiac_disease'
  | 'renal_disease'
  | 'liver_disease'
  | 'obesity'
  | 'elderly';

// Investigation types
export type InvestigationType =
  | 'fbc'
  | 'electrolytes'
  | 'renal_function'
  | 'liver_function'
  | 'coagulation'
  | 'blood_glucose'
  | 'hba1c'
  | 'urinalysis'
  | 'ecg'
  | 'chest_xray'
  | 'abg'
  | 'lactate'
  | 'blood_group'
  | 'pregnancy_test'
  | 'sickling_test'
  | 'thyroid_function'
  | 'cardiac_enzymes'
  | 'bnp'
  | 'echo'
  | 'pulmonary_function';

// Investigation requirement level
export type RequirementLevel = 'mandatory' | 'recommended' | 'if_indicated' | 'not_required';

// Surgical procedure category
export type ProcedureCategory =
  | 'minor'
  | 'intermediate'
  | 'major'
  | 'super_major'
  | 'cardiac'
  | 'neurosurgical'
  | 'emergency';

// Investigation requirement
export interface InvestigationRequirement {
  type: InvestigationType;
  name: string;
  requirement: RequirementLevel;
  rationale: string;
  expectedValue: string;
  minSafeLevel: string;
  unit?: string;
}

// Optimization recommendation
export interface OptimizationRecommendation {
  category: string;
  recommendation: string;
  priority: 'critical' | 'important' | 'recommended';
  timing: 'immediate' | 'before_surgery' | 'peri_operative';
}

// Surgical timing guidance
export interface SurgicalTimingGuidance {
  urgency: SurgicalUrgency;
  guidance: string;
  canProceed: boolean;
  conditions?: string[];
}

// Comorbidity protocol
export interface ComorbidityProtocol {
  category: ComorbidityCategory;
  name: string;
  description: string;
  investigations: InvestigationRequirement[];
  optimizations: OptimizationRecommendation[];
  surgicalTiming: SurgicalTimingGuidance[];
  anaesthesiaConsiderations: string[];
  redFlags: string[];
}

// Preoperative assessment record
export interface PreoperativeAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'pending_review' | 'approved' | 'requires_optimization' | 'cancelled';
  
  // Planned surgery details
  plannedProcedure: string;
  procedureCategory: ProcedureCategory;
  plannedAnaesthesia: AnaesthesiaType;
  surgicalUrgency: SurgicalUrgency;
  plannedDate?: Date;
  surgeonId?: string;
  
  // Patient assessment
  asaClass: ASAClass;
  comorbidities: ComorbidityCategory[];
  clinicalNotes: string;
  
  // Airway assessment
  airwayAssessment?: {
    mallampatiScore: 1 | 2 | 3 | 4;
    neckMobility: 'normal' | 'limited' | 'severely_limited';
    mouthOpening: 'adequate' | 'limited';
    dentition: 'normal' | 'loose_teeth' | 'dentures' | 'edentulous';
    predictedDifficulty: 'easy' | 'potentially_difficult' | 'difficult';
  };
  
  // Functional capacity
  functionalCapacity?: {
    mets: number; // Metabolic equivalents (1-12+)
    canClimbStairs: boolean;
    canWalkTwoBlocks: boolean;
    limitations: string;
  };
  
  // Required investigations
  requiredInvestigations: {
    type: InvestigationType;
    requirement: RequirementLevel;
    result?: string;
    resultDate?: Date;
    isAbnormal?: boolean;
    withinSafeRange?: boolean;
  }[];
  
  // Optimization plan
  optimizationPlan: {
    recommendation: string;
    status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
    notes?: string;
    completedAt?: Date;
  }[];
  
  // Clearances
  anaesthetistClearance?: {
    clearedBy: string;
    clearedAt: Date;
    asaClassAssigned: ASAClass;
    comments: string;
    cleared: boolean;
  };
  
  // Fasting status
  fastingInstructions?: {
    clearFluidsUntil: string;
    lightMealUntil: string;
    regularMealUntil: string;
  };
  
  // Medication instructions
  medicationInstructions?: {
    continue: string[];
    hold: string[];
    bridging?: string[];
  };
  
  // Consent
  consentObtained: boolean;
  consentDate?: Date;
  
  // Education
  educationProvided: boolean;
  educationProcedureId?: string;
  
  // Surgical estimate
  estimateId?: string;
  estimateCreated: boolean;
}

// Investigation result entry
export interface InvestigationResult {
  type: InvestigationType;
  value: string;
  unit: string;
  resultDate: Date;
  isAbnormal: boolean;
  interpretation: string;
}

// Preoperative checklist item
export interface PreoperativeChecklistItem {
  id: string;
  label: string;
  category: 'documentation' | 'clinical' | 'laboratory' | 'consent' | 'fasting';
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}
