// Services Index

// Patient Service (Universal Patient Access)
export { patientService, PatientService } from './patientService';
export type { PatientWithDetails, PatientSearchOptions, PatientFullRecord } from './patientService';

// Patient Hooks (Universal Patient Hooks)
export {
  usePatientSearch,
  usePatientById,
  usePatientFullRecord,
  usePatientVitals as usePatientVitalsNew,
  usePatientAdmission as usePatientAdmissionNew,
  useAdmittedPatients,
  usePatientSelector,
  useAllPatients,
  usePatientMap,
} from './patientHooks';
export type {
  UsePatientSearchOptions,
  UsePatientSearchResult,
  UsePatientByIdResult,
  UsePatientFullRecordResult,
  UsePatientVitalsResult,
  UsePatientAdmissionResult,
  UsePatientSelectorResult,
} from './patientHooks';

// Database Operations - Comprehensive data access for all modules
export {
  PatientOps,
  VitalSignsOps,
  EncounterOps,
  SurgeryOps,
  AdmissionOps,
  AdmissionNotesOps,
  WoundOps,
  BurnOps,
  LabRequestOps,
  InvestigationOps,
  PrescriptionOps,
  NutritionOps,
  TreatmentPlanOps,
  InvoiceOps,
  WardRoundOps,
  DischargeSummaryOps,
  BloodTransfusionOps,
  MDTMeetingOps,
  HistopathologyOps,
  ConsumableBOMOps,
  HospitalOps,
  UserOps,
  ChatOps,
  VideoConferenceOps,
  AssignmentOps,
  DashboardOps,
  dbOps,
} from '../database/operations';

// Unified API Service (Recommended)
export {
  API,
  PatientAPI,
  VitalSignsAPI,
  AdmissionAPI,
  SurgeryAPI,
  BurnAssessmentAPI,
  BurnMonitoringAPI,
  EscharotomyAPI,
  SkinGraftAPI,
  BurnCarePlanAPI,
  InvestigationAPI,
  PrescriptionAPI,
  LimbSalvageAPI,
  HospitalAPI,
  UserAPI,
  DashboardAPI,
  SyncAPI,
  generateId,
  getDeviceId,
} from './apiService';

// Sync-Aware Data Hooks (Recommended)
export {
  useSyncState,
  useNetworkStatus,
  usePatients,
  usePatient,
  usePatientVitals,
  useAdmissions,
  usePatientAdmission,
  useSurgeries,
  useBurnAssessments,
  usePatientBurnAssessments,
  useBurnMonitoring,
  useEscharotomies,
  useSkinGrafts,
  useBurnCarePlan,
  useInvestigations,
  usePatientInvestigations,
  usePrescriptions,
  useLimbSalvageAssessments,
  usePatientLimbSalvage,
  useDashboardStats,
  useSync,
  useDataAvailability,
  useInitSync,
  initializeSyncOnMount,
} from './dataHooks';

// Legacy Sync Services
export { syncService, useSyncState as useLegacySyncState } from './syncService';
export type { SyncState as LegacySyncState, SyncStatus, SyncRecord } from './syncService';

// Cloud Sync Service
export {
  initCloudSync,
  fullSync,
  triggerSync,
  syncRecord,
  deleteRecordFromCloud,
  getSyncState,
  subscribeSyncState,
  cleanupCloudSync,
} from './cloudSyncService';

// Offline Data Manager
export {
  offlineDataManager,
  useOfflineState,
  useIsOnline,
  getDeviceId,
} from './offlineDataManager';
export type { OfflineChange, OfflineState, ConflictResolution } from './offlineDataManager';

export { default as initPWA, usePWA, registerServiceWorker, promptInstall, applyUpdate, isAppInstalled } from './pwaService';

export { 
  useOfflineData, 
  usePatients as useLegacyPatients, 
  useHospitals, 
  useCurrentUser, 
  useNetworkStatus as useLegacyNetworkStatus,
  useDataAvailability as useLegacyDataAvailability 
} from './offlineHooks';

// Clinical Services
export { woundCareService } from './woundCareService';
export { investigationLabService, testDefinitions, referenceRanges } from './investigationLabService';
export type { UnifiedCategory, InvestigationPriority, InvestigationStatus, TestDefinition, TrendAnalysis } from './investigationLabService';
export { burnCareService, ruleOfNines, lundBrowderChart } from './burnCareService';
export type { FluidCalculation, ABSIScore, BurnNutrition, BurnWoundCareProtocol, BurnPrognosisFactors } from './burnCareService';
export { preoperativeService, asaClassifications, mallampatiScores, capriniRiskFactors, rcriFactors, fastingGuidelines } from './preoperativeService';
export type { PreoperativeAssessment, ASAClassification, AirwayAssessment, CardiacRiskAssessment, VTERiskAssessment, AnaestheticPlan } from './preoperativeService';
export { mdtService, specialtyDefinitions } from './mdtService';
export type { 
  SpecialtyType, 
  MDTMeeting, 
  SpecialtyTreatmentPlan, 
  HarmonizedCarePlan, 
  TeamMember,
  ReconciledMedication,
  HarmonizedTreatment,
  TeamResponsibility 
} from './mdtService';

export { 
  bloodTransfusionService, 
  bloodProductInfo, 
  compatibilityMatrix, 
  transfusionTriggers, 
  reactionProtocols 
} from './bloodTransfusionService';
export type { 
  BloodType, 
  BloodProduct, 
  TransfusionUrgency, 
  TransfusionStatus, 
  ReactionType,
  PatientBloodProfile,
  TransfusionRequest,
  TransfusionRecord,
  TransfusionVitals,
  TransfusionReaction,
  MassiveTransfusionProtocol 
} from './bloodTransfusionService';

export { 
  nutritionPlannerService, 
  africanFoodDatabase, 
  mustScreeningCriteria 
} from './nutritionPlannerService';
export type { 
  NutritionStatus, 
  FeedingRoute, 
  DietType, 
  MealType, 
  FoodCategory,
  NutritionAssessment,
  FoodItem,
  MealPlan,
  DailyMeal,
  MealItem,
  NutritionSupplement 
} from './nutritionPlannerService';
