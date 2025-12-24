// Cloud Sync Service for CareBridge
// Syncs local IndexedDB data with Supabase cloud database

import { db } from '../database/db';
import { supabase, isSupabaseConfigured, TABLES } from './supabaseClient';

// Sync state management
export interface CloudSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
}

let syncState: CloudSyncState = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
};

const syncListeners: Set<(state: CloudSyncState) => void> = new Set();

// Subscribe to sync state changes
export function subscribeSyncState(callback: (state: CloudSyncState) => void): () => void {
  syncListeners.add(callback);
  callback(syncState);
  return () => syncListeners.delete(callback);
}

function notifySyncListeners() {
  syncListeners.forEach(cb => cb(syncState));
}

function updateSyncState(updates: Partial<CloudSyncState>) {
  syncState = { ...syncState, ...updates };
  notifySyncListeners();
}

// Initialize cloud sync
export function initCloudSync() {
  // Monitor online/offline status
  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    if (isSupabaseConfigured()) {
      syncToCloud();
    }
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  // Initial sync if online and configured
  if (navigator.onLine && isSupabaseConfigured()) {
    syncToCloud();
  }
}

// Sync local data to cloud
export async function syncToCloud(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[CloudSync] Supabase not configured, skipping sync');
    return;
  }

  if (syncState.isSyncing) {
    console.log('[CloudSync] Sync already in progress');
    return;
  }

  try {
    updateSyncState({ isSyncing: true, error: null });
    console.log('[CloudSync] Starting cloud sync...');

    // Sync each table
    await syncTable('hospitals', TABLES.hospitals);
    await syncTable('patients', TABLES.patients);
    await syncTable('vitalSigns', TABLES.vitalSigns);
    await syncTable('clinicalEncounters', TABLES.clinicalEncounters);
    await syncTable('surgeries', TABLES.surgeries);
    await syncTable('wounds', TABLES.wounds);
    await syncTable('burnAssessments', TABLES.burnAssessments);
    await syncTable('labRequests', TABLES.labRequests);
    await syncTable('prescriptions', TABLES.prescriptions);
    await syncTable('nutritionAssessments', TABLES.nutritionAssessments);
    await syncTable('invoices', TABLES.invoices);
    await syncTable('admissions', TABLES.admissions);
    await syncTable('treatmentPlans', TABLES.treatmentPlans);
    await syncTable('treatmentProgress', TABLES.treatmentProgress);

    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
      pendingChanges: 0,
    });
    console.log('[CloudSync] Sync completed successfully');
  } catch (error) {
    console.error('[CloudSync] Sync failed:', error);
    updateSyncState({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}

// Sync a single table
async function syncTable(localTableName: string, cloudTableName: string): Promise<void> {
  if (!supabase) return;

  try {
    // Get local records
    const localRecords = await (db as any)[localTableName].toArray();
    
    if (localRecords.length === 0) {
      return;
    }

    // Convert dates to ISO strings for Supabase
    const preparedRecords = localRecords.map((record: any) => {
      const prepared: any = { ...record };
      for (const key in prepared) {
        if (prepared[key] instanceof Date) {
          prepared[key] = prepared[key].toISOString();
        }
      }
      // Convert camelCase to snake_case for Supabase
      return toSnakeCase(prepared);
    });

    // Upsert to Supabase (insert or update on conflict)
    const { error } = await supabase
      .from(cloudTableName)
      .upsert(preparedRecords, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.warn(`[CloudSync] Error syncing ${localTableName}:`, error.message);
    } else {
      console.log(`[CloudSync] Synced ${localRecords.length} records from ${localTableName}`);
    }
  } catch (error) {
    console.warn(`[CloudSync] Failed to sync ${localTableName}:`, error);
  }
}

// Pull data from cloud to local
export async function pullFromCloud(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[CloudSync] Supabase not configured, skipping pull');
    return;
  }

  try {
    updateSyncState({ isSyncing: true, error: null });
    console.log('[CloudSync] Pulling data from cloud...');

    await pullTable(TABLES.hospitals, 'hospitals');
    await pullTable(TABLES.patients, 'patients');
    // Add more tables as needed

    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
    });
    console.log('[CloudSync] Pull completed successfully');
  } catch (error) {
    console.error('[CloudSync] Pull failed:', error);
    updateSyncState({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Pull failed',
    });
  }
}

async function pullTable(cloudTableName: string, localTableName: string): Promise<void> {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from(cloudTableName)
      .select('*');

    if (error) {
      console.warn(`[CloudSync] Error pulling ${cloudTableName}:`, error.message);
      return;
    }

    if (data && data.length > 0) {
      // Convert snake_case to camelCase and parse dates
      const records = data.map((record: any) => {
        const converted = toCamelCase(record);
        // Convert date strings back to Date objects
        for (const key of ['createdAt', 'updatedAt', 'startDate', 'endDate', 'recordedAt', 'date']) {
          if (converted[key] && typeof converted[key] === 'string') {
            converted[key] = new Date(converted[key]);
          }
        }
        return converted;
      });

      // Bulk put to local database
      await (db as any)[localTableName].bulkPut(records);
      console.log(`[CloudSync] Pulled ${records.length} records to ${localTableName}`);
    }
  } catch (error) {
    console.warn(`[CloudSync] Failed to pull ${cloudTableName}:`, error);
  }
}

// Utility: Convert object keys from camelCase to snake_case
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// Utility: Convert object keys from snake_case to camelCase
function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

// Export sync state getter
export function getSyncState(): CloudSyncState {
  return { ...syncState };
}
