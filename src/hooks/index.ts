// ============================================================
// AstroHEALTH Hooks Index
// Central export for all custom React hooks
// ============================================================

// Database hooks - for fetching data from IndexedDB with live updates
export * from './useDatabase';

// Billing activity hook - for recording billable activities during clinical workflows
export { useBillingActivity } from './useBillingActivity';

// Re-export database operations for convenience
export { dbOps } from './useDatabase';
