// Burns Module Components Index
// Export all burn care protocol components

export { default as LundBrowderChart } from './LundBrowderChart';
export { default as FluidResuscitationDashboard } from './FluidResuscitationDashboard';
export { default as VitalsMonitor } from './VitalsMonitor';
export { default as BurnAlertsPanel } from './BurnAlertsPanel';
export { default as BurnScoreSummary } from './BurnScoreSummary';
export { default as BurnWoundAssessment } from './BurnWoundAssessment';

// Re-export types
export * from '../types';

// Re-export services
export * from '../services/burnScoringService';
