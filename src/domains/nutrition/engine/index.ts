/**
 * Adult clinical nutrition engine — public API (stage 1).
 *
 * Pure functions only: no UI, no database. Every numeric output is an
 * Estimate carrying its method, formula, inputs, assumptions, warnings,
 * missing inputs, config version and sources. Coefficients live in the
 * versioned config (./config), status pending_clinical_validation.
 *
 * See docs/NUTRITION_ENGINE.md.
 */

export * from './estimate';
export * from './types';
export * from './guards';
export * from './anthropometry';
export * from './screening';
export * from './energy';
export * from './protein';
export * from './fluidMicronutrients';
export * from './labs';
export * from './refeeding';
export * from './weightGoals';
export * from './monitoring';
export * from './assess';
export {
  ACTIVE_NUTRITION_CONFIG, NUTRITION_CONFIG_V1, equationById, auditConfig,
} from './config';
export type {
  NutritionConfig, NutritionValidationStatus, EquationPopulation, RegressionEquation, LinearCoefficients, Source,
} from './config/types';
