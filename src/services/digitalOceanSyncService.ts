// DigitalOcean MySQL Sync Service for AstroHEALTH
// Real-time bidirectional sync between local IndexedDB and DigitalOcean MySQL
// This replaces the Supabase-based cloudSyncService

import { db } from '../database/db';
import { 
  checkHealth, 
  pullFromCloud, 
  pushToCloud, 
  upsertToCloud,
  TABLE_MAPPINGS 
} from './digitalOceanClient';

// Sync state management
export interface DOSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
}

let syncState: DOSyncState = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
};

const syncListeners: Set<(state: DOSyncState) => void> = new Set();
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Subscribe to sync state changes
export function subscribeDOSyncState(callback: (state: DOSyncState) => void): () => void {
  syncListeners.add(callback);
  callback(syncState);
  return () => syncListeners.delete(callback);
}

function notifySyncListeners(): void {
  syncListeners.forEach((cb) => {
    try {
      if (typeof cb === 'function') {
        cb(syncState);
      }
    } catch (err) {
      console.error('[DO Sync] Error in sync listener:', err);
    }
  });
}

function updateSyncState(updates: Partial<DOSyncState>) {
  syncState = { ...syncState, ...updates };
  notifySyncListeners();
}

// Sanitize value for storage (convert Date objects, etc.)
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }
  
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    value.forEach((v, k) => {
      obj[String(k)] = sanitizeValue(v);
    });
    return obj;
  }
  
  if (value instanceof Set) {
    return Array.from(value).map(sanitizeValue);
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeValue(obj[key]);
    }
    return result;
  }
  
  return value;
}

// Sanitize a record for upload
function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    result[key] = sanitizeValue(record[key]);
  }
  return result;
}

// Initialize DigitalOcean sync
export function initDOSync() {
  console.log('[DO Sync] Initializing DigitalOcean MySQL sync...');
  console.log('[DO Sync] Online:', navigator.onLine);
  
  // Expose debug functions
  (window as any).testDOConnection = testDOConnection;
  (window as any).triggerDOSync = fullDOSync;
  
  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('[DO Sync] Device online');
    updateSyncState({ isOnline: true });
    fullDOSync();
  });

  window.addEventListener('offline', () => {
    console.log('[DO Sync] Device offline');
    updateSyncState({ isOnline: false });
  });

  // Initial sync if online
  if (navigator.onLine) {
    console.log('[DO Sync] Starting initial sync...');
    fullDOSync().catch(err => {
      console.error('[DO Sync] Initial sync failed:', err);
    });
    
    // Set up periodic sync every 2 minutes
    syncInterval = setInterval(() => {
      if (navigator.onLine) {
        fullDOSync();
      }
    }, 120000);

    // Set up critical data sync every 30 seconds
    setInterval(() => {
      if (navigator.onLine) {
        syncCriticalData();
      }
    }, 30000);
  }
}

// Test connection
export async function testDOConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  console.log('[DO Sync] Testing DigitalOcean connection...');
  
  try {
    const result = await checkHealth();
    
    if (result.healthy) {
      console.log('[DO Sync] Connection successful!');
      return { 
        success: true, 
        message: 'Connected to DigitalOcean MySQL successfully!',
        details: { provider: result.provider }
      };
    } else {
      return { success: false, message: 'Health check failed' };
    }
  } catch (err) {
    console.error('[DO Sync] Connection test error:', err);
    return { 
      success: false, 
      message: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

// Full bidirectional sync
export async function fullDOSync(): Promise<void> {
  if (syncState.isSyncing) {
    console.log('[DO Sync] Sync already in progress');
    return;
  }

  try {
    updateSyncState({ isSyncing: true, error: null });
    console.log('[DO Sync] Starting full sync...');

    // Pull from cloud first
    await pullAllFromCloud();
    
    // Then push local changes
    await pushAllToCloud();

    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
      pendingChanges: 0,
    });
    console.log('[DO Sync] Full sync completed successfully');
  } catch (error) {
    console.error('[DO Sync] Full sync failed:', error);
    updateSyncState({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}

// Tables to sync (in priority order)
const SYNC_TABLES = [
  // Core tables
  { local: 'users', cloud: 'users' },
  { local: 'hospitals', cloud: 'hospitals' },
  { local: 'patients', cloud: 'patients' },
  
  // Clinical
  { local: 'vitalSigns', cloud: 'vital_signs' },
  { local: 'clinicalEncounters', cloud: 'clinical_encounters' },
  { local: 'surgeries', cloud: 'surgeries' },
  { local: 'admissions', cloud: 'admissions' },
  { local: 'wardRounds', cloud: 'ward_rounds' },
  
  // Wound & Burns
  { local: 'wounds', cloud: 'wounds' },
  { local: 'woundMeasurements', cloud: 'wound_measurements' },
  { local: 'burnAssessments', cloud: 'burn_assessments' },
  { local: 'burnMonitoring', cloud: 'burn_monitoring' },
  
  // Lab & Investigations
  { local: 'labRequests', cloud: 'lab_requests' },
  { local: 'investigations', cloud: 'investigations' },
  
  // Medications
  { local: 'prescriptions', cloud: 'prescriptions' },
  { local: 'medicationCharts', cloud: 'medication_charts' },
  { local: 'medicationAdministrations', cloud: 'medication_administrations' },
  
  // Treatment & Discharge
  { local: 'treatmentPlans', cloud: 'treatment_plans' },
  { local: 'treatmentProgress', cloud: 'treatment_progress' },
  { local: 'dischargeSummaries', cloud: 'discharge_summaries' },
  { local: 'nutritionAssessments', cloud: 'nutrition_assessments' },
  
  // Appointments & Billing
  { local: 'appointments', cloud: 'appointments' },
  { local: 'invoices', cloud: 'invoices' },
  { local: 'invoiceItems', cloud: 'invoice_items' },
  
  // Communication
  { local: 'chatRooms', cloud: 'chat_rooms' },
  { local: 'chatMessages', cloud: 'chat_messages' },
  { local: 'chatParticipants', cloud: 'chat_participants' },
  { local: 'videoConferences', cloud: 'video_conferences' },
  { local: 'videoParticipants', cloud: 'video_participants' },
  
  // Specialized
  { local: 'preoperativeAssessments', cloud: 'preoperative_assessments' },
  { local: 'postoperativeNotes', cloud: 'postoperative_notes' },
  { local: 'surgicalNotes', cloud: 'surgical_notes' },
  { local: 'externalReviews', cloud: 'external_reviews' },
  { local: 'mdtMeetings', cloud: 'mdt_meetings' },
  { local: 'bloodTransfusions', cloud: 'blood_transfusions' },
  { local: 'histopathologyRequests', cloud: 'histopathology_requests' },
  { local: 'npwtSessions', cloud: 'npwt_sessions' },
  { local: 'limbSalvageAssessments', cloud: 'limb_salvage_assessments' },
  { local: 'shiftAssignments', cloud: 'shift_assignments' },
  { local: 'nurseNotes', cloud: 'nurse_notes' },
  { local: 'comorbidities', cloud: 'comorbidities' },
  { local: 'consumableBOMs', cloud: 'consumable_boms' },
];

// Critical data that syncs frequently
const CRITICAL_TABLES = ['vitalSigns', 'patients', 'admissions', 'surgeries'];

// Pull all data from cloud
async function pullAllFromCloud(): Promise<void> {
  console.log('[DO Sync] Pulling data from cloud...');
  
  for (const { local, cloud } of SYNC_TABLES) {
    await pullTable(cloud, local);
  }
}

// Push all data to cloud
async function pushAllToCloud(): Promise<void> {
  console.log('[DO Sync] Pushing data to cloud...');
  
  for (const { local, cloud } of SYNC_TABLES) {
    await pushTable(local, cloud);
  }
}

// Sync critical clinical data more frequently
async function syncCriticalData(): Promise<void> {
  if (syncState.isSyncing) return;
  
  try {
    for (const localTable of CRITICAL_TABLES) {
      const mapping = SYNC_TABLES.find(t => t.local === localTable);
      if (mapping) {
        await pullTable(mapping.cloud, mapping.local);
        await pushTable(mapping.local, mapping.cloud);
      }
    }
  } catch (error) {
    console.warn('[DO Sync] Critical data sync error:', error);
  }
}

// Pull a single table from cloud
async function pullTable(cloudTableName: string, localTableName: string): Promise<void> {
  try {
    const result = await pullFromCloud(cloudTableName);
    
    if (!result.success) {
      console.warn(`[DO Sync] Error pulling ${cloudTableName}:`, result.error);
      return;
    }

    const data = result.data || [];
    if (data.length === 0) return;

    const localTable = (db as any)[localTableName];
    if (!localTable) {
      console.warn(`[DO Sync] Local table ${localTableName} not found`);
      return;
    }

    let added = 0, updated = 0, skipped = 0;
    
    for (const record of data) {
      try {
        const localRecord = await localTable.get(record.id);
        
        if (!localRecord) {
          await localTable.add(record);
          added++;
        } else {
          const localUpdated = new Date(String(localRecord.updatedAt || '1970-01-01')).getTime();
          const cloudUpdated = new Date(String(record.updatedAt || '1970-01-01')).getTime();
          
          if (cloudUpdated > localUpdated) {
            await localTable.put(record);
            updated++;
          } else {
            skipped++;
          }
        }
      } catch (err) {
        try {
          await localTable.put(record);
          updated++;
        } catch {
          // Ignore individual record errors
        }
      }
    }
    
    if (added > 0 || updated > 0) {
      console.log(`[DO Sync] Pulled ${data.length} from ${cloudTableName} (added: ${added}, updated: ${updated}, skipped: ${skipped})`);
    }
  } catch (error) {
    console.warn(`[DO Sync] Failed to pull ${cloudTableName}:`, error);
  }
}

// Push a single table to cloud
async function pushTable(localTableName: string, cloudTableName: string): Promise<void> {
  try {
    const localTable = (db as any)[localTableName];
    if (!localTable) return;

    const localRecords = await localTable.toArray();
    if (localRecords.length === 0) return;

    // Sanitize and prepare records
    const preparedRecords = localRecords.map((record: Record<string, unknown>) => 
      sanitizeRecord(record)
    );

    // Push in batches of 50
    const batchSize = 50;
    let successCount = 0;
    
    for (let i = 0; i < preparedRecords.length; i += batchSize) {
      const batch = preparedRecords.slice(i, i + batchSize);
      
      const result = await pushToCloud(cloudTableName, batch);
      
      if (result.success) {
        successCount += batch.length;
      } else {
        console.warn(`[DO Sync] Error pushing batch to ${cloudTableName}:`, result.error);
      }
    }

    if (successCount > 0) {
      console.log(`[DO Sync] Pushed ${successCount}/${localRecords.length} records to ${cloudTableName}`);
    }
  } catch (error) {
    console.warn(`[DO Sync] Failed to push ${localTableName}:`, error);
  }
}

// Push single record immediately (for real-time updates)
export async function pushRecordToCloud(localTableName: string, record: Record<string, unknown>): Promise<boolean> {
  const cloudTableName = TABLE_MAPPINGS[localTableName] || localTableName;
  
  try {
    const sanitized = sanitizeRecord(record);
    const result = await upsertToCloud(cloudTableName, sanitized);
    return result.success;
  } catch (error) {
    console.error(`[DO Sync] Failed to push record to ${cloudTableName}:`, error);
    return false;
  }
}

// Hook for React components
export function useDOSyncState(): DOSyncState {
  // Import React hooks properly
  const React = require('react');
  const [state, setState] = React.useState(syncState);
  
  React.useEffect(() => {
    const unsubscribe = subscribeDOSyncState(setState);
    return unsubscribe;
  }, []);
  
  return state;
}

// Stop sync (cleanup)
export function stopDOSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
