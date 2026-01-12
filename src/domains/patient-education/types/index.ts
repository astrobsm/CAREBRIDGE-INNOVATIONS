/**
 * Patient Education Module Types
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive educational content following WHO guidelines
 */

export interface EducationCategory {
  id?: string;
  code: string; // A, B, C, etc.
  name: string;
  description?: string;
  icon?: string;
  color: string;
  conditions: EducationCondition[];
}

export interface EducationCondition {
  id: string;
  category?: string;
  categoryId?: string;
  name: string;
  description?: string;
  alternateNames?: string[];
  icdCode?: string;
  
  // Condition Overview
  overview: ConditionOverview;
  
  // Treatment Phases
  treatmentPhases: TreatmentPhase[];
  
  // Pre-operative Instructions
  preoperativeInstructions?: PreoperativeInstructions;
  
  // Intra-operative Information
  intraoperativeInfo?: IntraoperativeInfo;
  
  // Post-operative Instructions
  postoperativeInstructions?: PostoperativeInstructions;
  
  // Expected Outcomes
  expectedOutcomes: ExpectedOutcomes;
  
  // Follow-up Care
  followUpCare: FollowUpCare;
  
  // Compliance Requirements
  complianceRequirements: ComplianceRequirement[];
  
  // WHO Guidelines Reference
  whoGuidelines?: WHOGuideline[];
  
  // Warning Signs
  warningSigns: string[];
  
  // When to Seek Emergency Care
  emergencySigns: string[];
}

export interface ConditionOverview {
  definition: string;
  causes: string[];
  riskFactors: string[];
  symptoms: string[];
  diagnosis?: string[];
  complications?: string[];
  classification?: ClassificationSystem[];
  epidemiology?: string;
  prevalence?: string;
  prognosis?: string;
}

export interface ClassificationSystem {
  name: string;
  description: string;
  grades: ClassificationGrade[];
}

export interface ClassificationGrade {
  grade: string;
  description: string;
  characteristics: string[];
}

export interface TreatmentPhase {
  phase: number;
  name: string;
  duration: string;
  description: string;
  goals: string[];
  interventions?: string[];
  activities?: string[];
  milestones?: string[];
  nursingCare?: string[];
  medications?: PhasesMedication[];
  warningSignsThisPhase?: string[];
}

export interface PhasesMedication {
  name: string;
  purpose: string;
  duration?: string;
}

export interface PreoperativeInstructions {
  consultations: string[];
  investigations: string[];
  medications: MedicationInstruction[];
  dietaryRestrictions?: string[];
  physicalPreparation?: string[];
  psychologicalPreparation?: string[];
  consentRequirements?: string[];
  dayBeforeSurgery: string[];
  dayOfSurgery: string[];
  whatToBring?: string[];
  fastingInstructions?: string;
}

export interface MedicationInstruction {
  medication: string;
  instruction: 'continue' | 'stop' | 'modify' | 'discuss' | string;
  timing?: string;
  reason: string;
}

export interface IntraoperativeInfo {
  anesthesiaType: string | string[];
  procedureDescription?: string;
  procedureSteps?: string[];
  duration: string;
  techniques?: string[];
  expectedBloodLoss?: string;
  possibleComplications?: string[];
  whatToExpect?: string;
}

export interface PostoperativeInstructions {
  immediatePostop: ImmediatePostop;
  woundCare: WoundCareInstruction[];
  painManagement: PainManagement;
  activityRestrictions: ActivityRestriction[];
  dietaryGuidelines: string[];
  medicationRegimen?: PostopMedication[];
  physicalTherapy?: PhysicalTherapyPlan;
  returnToWork?: string;
  returnToNormalActivities?: string;
}

export interface ImmediatePostop {
  monitoring?: string[];
  positioning: string;
  fluidManagement?: string;
  painControl?: string;
  painManagement?: string;
  activityLevel?: string;
  expectedSymptoms?: string[];
  nursingInstructions?: string[];
}

export interface WoundCareInstruction {
  day: string;
  instruction: string;
  dressingType?: string;
  frequency?: string;
}

export interface PainManagement {
  expectedPainLevel: string;
  medications: string[];
  nonPharmacological: string[];
  whenToSeekHelp?: string;
}

export interface ActivityRestriction {
  activity: string;
  restriction: string;
  duration: string;
  reason: string;
}

export interface PostopMedication {
  name: string;
  dose: string;
  frequency: string;
  duration?: string;
  purpose: string;
  sideEffects?: string[];
}

export interface PhysicalTherapyPlan {
  startTiming: string;
  frequency: string;
  exercises: ExerciseInstruction[];
  precautions: string[];
  goals: string[];
}

export interface ExerciseInstruction {
  name: string;
  description: string;
  repetitions?: string;
  frequency: string;
  progression?: string;
}

export interface ExpectedOutcomes {
  shortTerm: OutcomeExpectation[];
  longTerm: OutcomeExpectation[];
  functionalRecovery: string;
  cosmeticOutcome?: string;
  qualityOfLife?: string;
  possibleComplications?: (ComplicationRisk | string)[];
  successRate?: string;
}

export interface OutcomeExpectation {
  timeframe: string;
  expectation: string;
  indicators?: string[];
}

export interface ComplicationRisk {
  complication: string;
  riskLevel: 'low' | 'moderate' | 'high';
  prevention: string;
  management: string;
}

export interface FollowUpCare {
  schedule: FollowUpSchedule[];
  ongoingMonitoring?: string[];
  rehabilitationNeeds?: string[];
  supportServices?: string[];
  longTermConsiderations?: string[];
  lifestyleModifications?: string[];
}

export interface FollowUpSchedule {
  timing: string;
  purpose: string;
  investigations?: string[];
  whatToExpect?: string;
}

export interface ComplianceRequirement {
  requirement: string;
  importance: 'critical' | 'important' | 'recommended';
  consequence: string;
  tips?: string[];
}

export interface WHOGuideline {
  title: string;
  reference: string;
  keyPoints: string[];
  link?: string;
}

// Education Categories
export const EDUCATION_CATEGORIES = [
  { code: 'A', name: 'Burns and Burn-Related Conditions', color: 'red' },
  { code: 'B', name: 'Acute Wound, Soft-Tissue and Trauma Reconstructions', color: 'orange' },
  { code: 'C', name: 'Wound Care and Chronic Wounds', color: 'yellow' },
  { code: 'D', name: 'Skin, Soft-Tissue & Oncologic Reconstructions', color: 'purple' },
  { code: 'E', name: 'Hand and Microsurgical Conditions', color: 'blue' },
  { code: 'F', name: 'Pediatric Congenital and Developmental Conditions', color: 'pink' },
  { code: 'G', name: 'Maxillofacial and Craniofacial Conditions', color: 'teal' },
  { code: 'H', name: 'Breast and Chest Wall Reconstruction', color: 'rose' },
  { code: 'I', name: 'Cosmetic and Elective Reconstructive Procedures', color: 'indigo' },
  { code: 'J', name: 'Genital and Perineal Reconstruction', color: 'amber' },
  { code: 'K', name: 'Reconstructive Techniques and Procedures', color: 'emerald' },
  { code: 'L', name: 'Systemic/Complicating Conditions', color: 'slate' },
] as const;
