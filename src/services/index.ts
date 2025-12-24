// Services Index
export { syncService, useSyncState, getDeviceId } from './syncService';
export type { SyncState, SyncStatus, SyncRecord } from './syncService';

export { default as initPWA, usePWA, registerServiceWorker, promptInstall, applyUpdate, isAppInstalled } from './pwaService';

export { 
  useOfflineData, 
  usePatients, 
  useHospitals, 
  useCurrentUser, 
  useNetworkStatus,
  useDataAvailability 
} from './offlineHooks';
