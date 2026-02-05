// Cloud Sync Service for AstroHEALTH
// Now uses DigitalOcean MySQL instead of Supabase
// This file re-exports the DigitalOcean sync functions for backwards compatibility

import { useState, useEffect } from 'react';
import {
  initDOSync,
  fullDOSync,
  testDOConnection,
  subscribeDOSyncState,
  pushRecordToCloud,
  stopDOSync,
  type DOSyncState
} from './digitalOceanSyncService';
import { upsertToCloud, deleteFromCloud, TABLE_MAPPINGS } from './digitalOceanClient';

// Re-export the sync state type with the old name for compatibility
export type CloudSyncState = DOSyncState;

// Re-export functions with original names for backwards compatibility
export const initCloudSync = initDOSync;
export const fullSync = fullDOSync;
export const testSupabaseConnection = testDOConnection; // Keep old name for any calls
export const subscribeSyncState = subscribeDOSyncState;
export const pushToCloudImmediate = pushRecordToCloud;
export const cleanupCloudSync = stopDOSync;

// Alias for triggerSync
export const triggerSync = fullDOSync;

// Get current sync state
let currentSyncState: CloudSyncState = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
};

// Subscribe to state updates
subscribeDOSyncState((state) => {
  currentSyncState = state;
});

export function getSyncState(): CloudSyncState {
  return { ...currentSyncState };
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

// Get cloud table name from local table name
function getCloudTableName(localTableName: string): string {
  return TABLE_MAPPINGS[localTableName] || localTableName.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Sync a single record immediately (call this when creating/updating data)
export async function syncRecord(localTableName: string, record: Record<string, unknown>): Promise<void> {
  if (!navigator.onLine) {
    console.log('[CloudSync] Offline, record will sync later');
    return;
  }

  const cloudTableName = getCloudTableName(localTableName);
  if (!cloudTableName) return;

  try {
    const sanitizedRecord = sanitizeRecord(record);
    
    console.log(`[CloudSync] Syncing record to ${cloudTableName}:`, (record as any).id);
    
    const result = await upsertToCloud(cloudTableName, sanitizedRecord);

    if (!result.success) {
      console.error(`[CloudSync] Error syncing record to ${cloudTableName}:`, result.error);
    } else {
      console.log(`[CloudSync] Record synced successfully to ${cloudTableName}:`, (record as any).id);
    }
  } catch (error) {
    console.error(`[CloudSync] Failed to sync record:`, error);
  }
}

// Delete a record from cloud
export async function deleteRecordFromCloud(localTableName: string, recordId: string): Promise<void> {
  if (!navigator.onLine) {
    return;
  }

  const cloudTableName = getCloudTableName(localTableName);
  if (!cloudTableName) return;

  try {
    const result = await deleteFromCloud(cloudTableName, { id: recordId });

    if (!result.success) {
      console.warn(`[CloudSync] Error deleting from ${cloudTableName}:`, result.error);
    }
  } catch (error) {
    console.warn(`[CloudSync] Failed to delete record:`, error);
  }
}

// =====================================
// Compatibility layer for SyncIndicator
// =====================================

// SyncState interface for compatibility with SyncIndicator
export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline' | 'success';
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

// Convert CloudSyncState to SyncState for compatibility
function toSyncState(cloudState: CloudSyncState): SyncState {
  let status: SyncState['status'] = 'idle';
  
  if (!cloudState.isOnline) {
    status = 'offline';
  } else if (cloudState.isSyncing) {
    status = 'syncing';
  } else if (cloudState.error) {
    status = 'error';
  } else if (cloudState.lastSyncAt) {
    status = 'success';
  }
  
  return {
    status,
    lastSyncAt: cloudState.lastSyncAt,
    pendingChanges: cloudState.pendingChanges,
    error: cloudState.error,
    isOnline: cloudState.isOnline,
  };
}

// React hook for sync state - compatible with SyncIndicator
export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(() => toSyncState(currentSyncState));

  useEffect(() => {
    const unsubscribe = subscribeDOSyncState((cloudState: CloudSyncState) => {
      setState(toSyncState(cloudState));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

// Hook for React components (alias)
export function useCloudSyncState(): CloudSyncState {
  const [state, setState] = useState<CloudSyncState>(currentSyncState);
  
  useEffect(() => {
    const unsubscribe = subscribeDOSyncState(setState);
    return unsubscribe;
  }, []);
  
  return state;
}

// syncService object for compatibility with SyncIndicator
export const syncService = {
  getState(): SyncState {
    return toSyncState(currentSyncState);
  },
  
  subscribe(callback: (state: SyncState) => void): () => void {
    if (typeof callback !== 'function') {
      console.error('[CloudSync] subscribe called with non-function:', typeof callback);
      return () => {};
    }
    
    const wrappedCallback = (cloudState: CloudSyncState): void => {
      try {
        callback(toSyncState(cloudState));
      } catch (err) {
        console.error('[CloudSync] Error in subscribe callback:', err);
      }
    };
    
    return subscribeDOSyncState(wrappedCallback);
  },
  
  async forceSync(): Promise<void> {
    await fullDOSync();
  },
  
  async start(): Promise<void> {
    initDOSync();
  },
  
  stop(): void {
    stopDOSync();
  },
};

// Debug helper - exposed to window for console testing
if (typeof window !== 'undefined') {
  (window as any).testCloudConnection = testDOConnection;
  (window as any).triggerSync = fullDOSync;
}

// Stub functions for any remaining Supabase-specific calls
export async function debugUserSync(): Promise<{
  local: { count: number; users: any[] };
  cloud: { count: number; users: any[]; error?: string };
  diagnosis: string[];
}> {
  console.log('[CloudSync] debugUserSync called - now using DigitalOcean');
  return {
    local: { count: 0, users: [] },
    cloud: { count: 0, users: [], error: 'Using DigitalOcean - use triggerDOSync() instead' },
    diagnosis: ['System now uses DigitalOcean MySQL instead of Supabase']
  };
}

export async function forcePushUsers(): Promise<{ success: boolean; message: string }> {
  console.log('[CloudSync] forcePushUsers called - triggering DO sync instead');
  await fullDOSync();
  return { success: true, message: 'Synced via DigitalOcean' };
}

export async function forcePullUsers(): Promise<{ success: boolean; message: string }> {
  console.log('[CloudSync] forcePullUsers called - triggering DO sync instead');
  await fullDOSync();
  return { success: true, message: 'Synced via DigitalOcean' };
}

export async function syncCriticalClinicalData(): Promise<void> {
  console.log('[CloudSync] syncCriticalClinicalData - handled by DO sync service');
}

// Table mappings (for any code that references these)
export const SYNC_TABLES = TABLE_MAPPINGS;

console.log('[CloudSync] Using DigitalOcean MySQL for cloud sync');
