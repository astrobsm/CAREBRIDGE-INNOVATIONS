// Discharge Module Components Index
// Export all discharge-related components
// AstroHEALTH Innovations in Healthcare

// Existing Discharge Components
export { default as DischargeFormModal } from './DischargeFormModal';
export { default as DischargeSummaryView } from './DischargeSummaryView';
export { default as FollowUpTracker } from './FollowUpTracker';
export { default as DischargeChecklist } from './DischargeChecklist';
export { default as AMADischargeForm } from './AMADischargeForm';
export { default as PatientEducationSheet } from './PatientEducationSheet';
export { default as DischargeReadinessAssessment } from './DischargeReadinessAssessment';

// NEW: WHO-Based Pre-Discharge Assessment
export { default as PreDischargeAssessment } from './PreDischargeAssessment';
export type {
  DischargeCriterion,
  DischargeDecision,
  CriterionStatus,
  CriterionAssessment,
  DischargeReadinessResult,
} from './PreDischargeAssessment';
export { dischargeReadinessCriteria } from './PreDischargeAssessment';

// NEW: Lifestyle Modifications Generator
export { default as LifestyleModifications } from './LifestyleModifications';
export type {
  ComorbidityType,
  SurgeryCategory,
  LifestyleCategory,
  LifestyleRecommendation,
} from './LifestyleModifications';
export { lifestyleCategories, lifestyleRecommendations } from './LifestyleModifications';

// NEW: Comprehensive Discharge Summary Generator
export { default as DischargeSummaryGenerator } from './DischargeSummaryGenerator';
export type {
  Medication,
  AdmissionDetails,
  DischargeSummaryData,
} from './DischargeSummaryGenerator';
