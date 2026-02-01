// ============================================================
// AstroHEALTH Hooks Index
// Central export for all custom React hooks
// ============================================================

// Database hooks - for fetching data from IndexedDB with live updates
export * from './useDatabase';

// Billing activity hook - for recording billable activities during clinical workflows
export { useBillingActivity } from './useBillingActivity';

// Speech-to-text hook - for voice dictation in forms
export { 
  useSpeechToText, 
  useSpeechEnabledInput, 
  type UseSpeechToTextOptions,
  type UseSpeechToTextReturn 
} from './useSpeechToText';

// Export options hook - for unified PDF export (A4, WhatsApp, Thermal)
export { 
  useExportOptions, 
  type UseExportOptionsConfig,
  type UseExportOptionsReturn 
} from './useExportOptions';

// Re-export database operations for convenience
export { dbOps } from './useDatabase';
