/**
 * Admission Risk Assessment Components Index
 * CareBridge Innovations in Healthcare
 */

// Individual Assessment Components
export { default as DVTCapriniAssessment } from './DVTCapriniAssessment';
export { default as PressureSoreAssessment } from './PressureSoreAssessment';
export { default as NutritionalRiskAssessment } from './NutritionalRiskAssessment';
export { default as MealPlanGenerator } from './MealPlanGenerator';
export { default as DrugAllergyAssessment } from './DrugAllergyAssessment';

// Integrated Assessments (All-in-One)
export { default as AdmissionRiskAssessments } from './AdmissionRiskAssessments';

// Re-export types from individual components
export type { DVTAssessmentResult } from './DVTCapriniAssessment';
export type { PressureSoreAssessmentResult } from './PressureSoreAssessment';
export type { NutritionalAssessmentResult } from './NutritionalRiskAssessment';
export type { WeeklyMealPlan } from './MealPlanGenerator';
export type { AllergyAssessmentResult, DrugAllergy } from './DrugAllergyAssessment';

// Re-export types from integrated component
export type {
  PatientBasicInfo,
  AdmissionRiskAssessments as AdmissionRiskAssessmentsData,
} from './AdmissionRiskAssessments';

