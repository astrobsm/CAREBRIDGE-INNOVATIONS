// Enhanced Cloud Sync Service for CareBridge
// Real-time bidirectional sync between local IndexedDB and Supabase
// Version 2.0 - Fixed React imports

import { useState, useEffect } from 'react';
import { db } from '../database/db';
import { supabase, isSupabaseConfigured, TABLES } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
let realtimeChannels: RealtimeChannel[] = [];
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Subscribe to sync state changes
export function subscribeSyncState(callback: (state: CloudSyncState) => void): () => void {
  syncListeners.add(callback);
  callback(syncState);
  return () => syncListeners.delete(callback);
}

function notifySyncListeners(): void {
  syncListeners.forEach((cb) => {
    try {
      if (typeof cb === 'function') {
        cb(syncState);
      } else {
        console.error('[CloudSync] Invalid listener (not a function):', typeof cb);
        syncListeners.delete(cb);
      }
    } catch (err) {
      console.error('[CloudSync] Error in sync listener:', err);
    }
  });
}

function updateSyncState(updates: Partial<CloudSyncState>) {
  syncState = { ...syncState, ...updates };
  notifySyncListeners();
}

// Initialize cloud sync with real-time subscriptions
export function initCloudSync() {
  console.log('[CloudSync] Initializing cloud sync...');
  console.log('[CloudSync] Supabase configured:', isSupabaseConfigured());
  console.log('[CloudSync] Online:', navigator.onLine);
  
  // Expose test function to browser console for debugging
  (window as any).testSupabaseConnection = testSupabaseConnection;
  (window as any).triggerSync = fullSync;
  
  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('[CloudSync] Device online');
    updateSyncState({ isOnline: true });
    if (isSupabaseConfigured()) {
      fullSync();
    }
  });

  window.addEventListener('offline', () => {
    console.log('[CloudSync] Device offline');
    updateSyncState({ isOnline: false });
  });

  // Initial sync and setup if online and configured
  if (navigator.onLine && isSupabaseConfigured()) {
    console.log('[CloudSync] Starting initial sync...');
    // Pull data first, then set up real-time
    fullSync().then(() => {
      console.log('[CloudSync] Initial sync complete, setting up real-time...');
      setupRealtimeSubscriptions();
    }).catch(err => {
      console.error('[CloudSync] Initial sync failed:', err);
    });
    
    // Set up periodic sync every 30 seconds
    syncInterval = setInterval(() => {
      if (navigator.onLine && isSupabaseConfigured()) {
        fullSync();
      }
    }, 30000);
  } else {
    console.log('[CloudSync] Skipping sync - not online or Supabase not configured');
  }
}

// Test Supabase connection and verify tables exist
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  console.log('[CloudSync] Testing Supabase connection...');
  
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, message: 'Supabase not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.' };
  }

  try {
    // Try to query the patients table
    const { data, error, status } = await supabase
      .from('patients')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[CloudSync] Supabase test failed:', error);
      return { 
        success: false, 
        message: `Database error: ${error.message}. Code: ${error.code}`,
        details: { error, status }
      };
    }

    console.log('[CloudSync] Supabase connection successful!');
    return { 
      success: true, 
      message: 'Connected to Supabase successfully!',
      details: { recordCount: data?.length || 0, status }
    };
  } catch (err) {
    console.error('[CloudSync] Connection test error:', err);
    return { 
      success: false, 
      message: err instanceof Error ? err.message : 'Unknown error',
      details: err
    };
  }
}

// Full bidirectional sync
export async function fullSync(): Promise<void> {
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
    console.log('[CloudSync] Starting full sync...');

    // First pull from cloud (to get changes from other devices)
    await pullAllFromCloud();
    
    // Then push local changes to cloud
    await pushAllToCloud();

    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
      pendingChanges: 0,
    });
    console.log('[CloudSync] Full sync completed successfully');
  } catch (error) {
    console.error('[CloudSync] Full sync failed:', error);
    updateSyncState({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}

// Pull all data from cloud
async function pullAllFromCloud(): Promise<void> {
  console.log('[CloudSync] Pulling data from cloud...');
  
  // Core tables
  await pullTable(TABLES.hospitals, 'hospitals');
  await pullTable(TABLES.patients, 'patients');
  
  // Clinical tables
  await pullTable(TABLES.vitalSigns, 'vitalSigns');
  await pullTable(TABLES.clinicalEncounters, 'clinicalEncounters');
  await pullTable(TABLES.surgeries, 'surgeries');
  await pullTable(TABLES.wounds, 'wounds');
  await pullTable(TABLES.burnAssessments, 'burnAssessments');
  
  // Lab & Pharmacy
  await pullTable(TABLES.labRequests, 'labRequests');
  await pullTable(TABLES.prescriptions, 'prescriptions');
  
  // Nutrition
  await pullTable(TABLES.nutritionAssessments, 'nutritionAssessments');
  await pullTable(TABLES.nutritionPlans, 'nutritionPlans');
  
  // Billing
  await pullTable(TABLES.invoices, 'invoices');
  
  // Admission & Ward
  await pullTable(TABLES.admissions, 'admissions');
  await pullTable(TABLES.admissionNotes, 'admissionNotes');
  await pullTable(TABLES.bedAssignments, 'bedAssignments');
  
  // Treatment
  await pullTable(TABLES.treatmentPlans, 'treatmentPlans');
  await pullTable(TABLES.treatmentProgress, 'treatmentProgress');
  
  // Ward Rounds & Assignments
  await pullTable(TABLES.wardRounds, 'wardRounds');
  await pullTable(TABLES.doctorAssignments, 'doctorAssignments');
  await pullTable(TABLES.nurseAssignments, 'nurseAssignments');
  
  // Investigations
  await pullTable(TABLES.investigations, 'investigations');
  
  // Communication
  await pullTable(TABLES.chatRooms, 'chatRooms');
  await pullTable(TABLES.chatMessages, 'chatMessages');
  await pullTable(TABLES.videoConferences, 'videoConferences');
  await pullTable(TABLES.enhancedVideoConferences, 'enhancedVideoConferences');
  
  // Discharge & Documentation
  await pullTable(TABLES.dischargeSummaries, 'dischargeSummaries');
  await pullTable(TABLES.consumableBOMs, 'consumableBOMs');
  await pullTable(TABLES.histopathologyRequests, 'histopathologyRequests');
  
  // Blood Transfusion & MDT
  await pullTable(TABLES.bloodTransfusions, 'bloodTransfusions');
  await pullTable(TABLES.mdtMeetings, 'mdtMeetings');
  
  // Limb Salvage
  await pullTable(TABLES.limbSalvageAssessments, 'limbSalvageAssessments');
  
  // Burn Care Monitoring
  await pullTable(TABLES.burnMonitoringRecords, 'burnMonitoringRecords');
  await pullTable(TABLES.escharotomyRecords, 'escharotomyRecords');
  await pullTable(TABLES.skinGraftRecords, 'skinGraftRecords');
  await pullTable(TABLES.burnCarePlans, 'burnCarePlans');
  
  // Appointments
  await pullTable(TABLES.appointments, 'appointments');
  await pullTable(TABLES.appointmentReminders, 'appointmentReminders');
  await pullTable(TABLES.appointmentSlots, 'appointmentSlots');
  await pullTable(TABLES.clinicSessions, 'clinicSessions');
  
  // NPWT
  await pullTable(TABLES.npwtSessions, 'npwtSessions');
  await pullTable(TABLES.npwtNotifications, 'npwtNotifications');
  
  // Medication Charts
  await pullTable(TABLES.medicationCharts, 'medicationCharts');
  await pullTable(TABLES.nursePatientAssignments, 'nursePatientAssignments');
  
  // Transfusion Orders
  await pullTable(TABLES.transfusionOrders, 'transfusionOrders');
  await pullTable(TABLES.transfusionMonitoringCharts, 'transfusionMonitoringCharts');
}

// Push all local data to cloud
async function pushAllToCloud(): Promise<void> {
  console.log('[CloudSync] Pushing data to cloud...');
  
  // Core tables
  await pushTable('hospitals', TABLES.hospitals);
  await pushTable('patients', TABLES.patients);
  
  // Clinical tables
  await pushTable('vitalSigns', TABLES.vitalSigns);
  await pushTable('clinicalEncounters', TABLES.clinicalEncounters);
  await pushTable('surgeries', TABLES.surgeries);
  await pushTable('wounds', TABLES.wounds);
  await pushTable('burnAssessments', TABLES.burnAssessments);
  
  // Lab & Pharmacy
  await pushTable('labRequests', TABLES.labRequests);
  await pushTable('prescriptions', TABLES.prescriptions);
  
  // Nutrition
  await pushTable('nutritionAssessments', TABLES.nutritionAssessments);
  await pushTable('nutritionPlans', TABLES.nutritionPlans);
  
  // Billing
  await pushTable('invoices', TABLES.invoices);
  
  // Admission & Ward
  await pushTable('admissions', TABLES.admissions);
  await pushTable('admissionNotes', TABLES.admissionNotes);
  await pushTable('bedAssignments', TABLES.bedAssignments);
  
  // Treatment
  await pushTable('treatmentPlans', TABLES.treatmentPlans);
  await pushTable('treatmentProgress', TABLES.treatmentProgress);
  
  // Ward Rounds & Assignments
  await pushTable('wardRounds', TABLES.wardRounds);
  await pushTable('doctorAssignments', TABLES.doctorAssignments);
  await pushTable('nurseAssignments', TABLES.nurseAssignments);
  
  // Investigations
  await pushTable('investigations', TABLES.investigations);
  
  // Communication
  await pushTable('chatRooms', TABLES.chatRooms);
  await pushTable('chatMessages', TABLES.chatMessages);
  await pushTable('videoConferences', TABLES.videoConferences);
  await pushTable('enhancedVideoConferences', TABLES.enhancedVideoConferences);
  
  // Discharge & Documentation
  await pushTable('dischargeSummaries', TABLES.dischargeSummaries);
  await pushTable('consumableBOMs', TABLES.consumableBOMs);
  await pushTable('histopathologyRequests', TABLES.histopathologyRequests);
  
  // Blood Transfusion & MDT
  await pushTable('bloodTransfusions', TABLES.bloodTransfusions);
  await pushTable('mdtMeetings', TABLES.mdtMeetings);
  
  // Limb Salvage
  await pushTable('limbSalvageAssessments', TABLES.limbSalvageAssessments);
  
  // Burn Care Monitoring
  await pushTable('burnMonitoringRecords', TABLES.burnMonitoringRecords);
  await pushTable('escharotomyRecords', TABLES.escharotomyRecords);
  await pushTable('skinGraftRecords', TABLES.skinGraftRecords);
  await pushTable('burnCarePlans', TABLES.burnCarePlans);
  
  // Appointments
  await pushTable('appointments', TABLES.appointments);
  await pushTable('appointmentReminders', TABLES.appointmentReminders);
  await pushTable('appointmentSlots', TABLES.appointmentSlots);
  await pushTable('clinicSessions', TABLES.clinicSessions);
  
  // NPWT
  await pushTable('npwtSessions', TABLES.npwtSessions);
  await pushTable('npwtNotifications', TABLES.npwtNotifications);
  
  // Medication Charts
  await pushTable('medicationCharts', TABLES.medicationCharts);
  await pushTable('nursePatientAssignments', TABLES.nursePatientAssignments);
  
  // Transfusion Orders
  await pushTable('transfusionOrders', TABLES.transfusionOrders);
  await pushTable('transfusionMonitoringCharts', TABLES.transfusionMonitoringCharts);
}

// Pull a single table from cloud
async function pullTable(cloudTableName: string, localTableName: string): Promise<void> {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from(cloudTableName)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn(`[CloudSync] Error pulling ${cloudTableName}:`, error.message);
      return;
    }

    if (data && data.length > 0) {
      // Convert snake_case to camelCase and parse dates
      const records = data.map((record: Record<string, unknown>) => convertFromSupabase(record));

      // Merge with local data (cloud wins for conflicts based on updated_at)
      for (const record of records) {
        try {
          const localRecord = await (db as any)[localTableName].get(record.id);
          
          if (!localRecord) {
            // Record doesn't exist locally, add it
            await (db as any)[localTableName].add(record);
          } else {
            // Compare updated_at timestamps
            const localUpdated = new Date(String(localRecord.updatedAt || '1970-01-01')).getTime();
            const cloudUpdated = new Date(String((record as any).updatedAt || '1970-01-01')).getTime();
            
            if (cloudUpdated > localUpdated) {
              // Cloud version is newer, update local
              await (db as any)[localTableName].put(record);
            }
          }
        } catch (err) {
          // If add fails (duplicate), try put
          try {
            await (db as any)[localTableName].put(record);
          } catch {
            // Ignore errors for individual records
          }
        }
      }
      
      console.log(`[CloudSync] Pulled ${records.length} records from ${cloudTableName}`);
    }
  } catch (error) {
    console.warn(`[CloudSync] Failed to pull ${cloudTableName}:`, error);
  }
}

// Push a single table to cloud
async function pushTable(localTableName: string, cloudTableName: string): Promise<void> {
  if (!supabase) return;

  try {
    const localRecords = await (db as any)[localTableName].toArray();
    
    if (localRecords.length === 0) {
      return;
    }

    // Convert to Supabase format
    const preparedRecords = localRecords.map((record: Record<string, unknown>) => convertToSupabase(record));

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < preparedRecords.length; i += batchSize) {
      const batch = preparedRecords.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(cloudTableName)
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.warn(`[CloudSync] Error pushing to ${cloudTableName}:`, error.message);
      }
    }
    
    console.log(`[CloudSync] Pushed ${localRecords.length} records to ${cloudTableName}`);
  } catch (error) {
    console.warn(`[CloudSync] Failed to push ${localTableName}:`, error);
  }
}

// Set up real-time subscriptions for live updates
function setupRealtimeSubscriptions() {
  if (!supabase) return;
  
  // Store reference to avoid null checks in callbacks
  const sb = supabase;
  
  console.log('[CloudSync] Setting up real-time subscriptions...');
  
  // Clean up existing channels
  realtimeChannels.forEach(channel => {
    sb.removeChannel(channel);
  });
  realtimeChannels = [];

  // Subscribe to key tables for real-time updates
  const tablesToWatch = [
    { cloud: TABLES.patients, local: 'patients' },
    { cloud: TABLES.vitalSigns, local: 'vitalSigns' },
    { cloud: TABLES.clinicalEncounters, local: 'clinicalEncounters' },
    { cloud: TABLES.surgeries, local: 'surgeries' },
    { cloud: TABLES.admissions, local: 'admissions' },
    { cloud: TABLES.treatmentPlans, local: 'treatmentPlans' },
    { cloud: TABLES.wounds, local: 'wounds' },
    { cloud: TABLES.prescriptions, local: 'prescriptions' },
    { cloud: TABLES.burnAssessments, local: 'burnAssessments' },
    { cloud: TABLES.burnMonitoringRecords, local: 'burnMonitoringRecords' },
    { cloud: TABLES.burnCarePlans, local: 'burnCarePlans' },
    { cloud: TABLES.investigations, local: 'investigations' },
    { cloud: TABLES.limbSalvageAssessments, local: 'limbSalvageAssessments' },
  ];

  tablesToWatch.forEach(({ cloud, local }) => {
    const channel = sb
      .channel(`${cloud}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: cloud },
        async (payload) => {
          console.log(`[CloudSync] Real-time update on ${cloud}:`, payload.eventType);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = convertFromSupabase(payload.new as Record<string, unknown>);
            try {
              await (db as any)[local].put(record);
              console.log(`[CloudSync] Applied ${payload.eventType} to local ${local}`);
            } catch (err) {
              console.warn(`[CloudSync] Failed to apply change to ${local}:`, err);
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            try {
              await (db as any)[local].delete((payload.old as any).id);
              console.log(`[CloudSync] Applied DELETE to local ${local}`);
            } catch (err) {
              console.warn(`[CloudSync] Failed to delete from ${local}:`, err);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[CloudSync] Subscription status for ${cloud}:`, status);
      });

    realtimeChannels.push(channel);
  });
}

// Sync a single record immediately (call this when creating/updating data)
export async function syncRecord(localTableName: string, record: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || !navigator.onLine) {
    console.log('[CloudSync] Offline or not configured, record will sync later');
    return;
  }

  const cloudTableName = getCloudTableName(localTableName);
  if (!cloudTableName) return;

  try {
    const preparedRecord = convertToSupabase(record);
    
    const { error } = await supabase
      .from(cloudTableName)
      .upsert(preparedRecord, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.warn(`[CloudSync] Error syncing record to ${cloudTableName}:`, error.message);
    } else {
      console.log(`[CloudSync] Record synced to ${cloudTableName}`);
    }
  } catch (error) {
    console.warn(`[CloudSync] Failed to sync record:`, error);
  }
}

// Delete a record from cloud
export async function deleteRecordFromCloud(localTableName: string, recordId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || !navigator.onLine) {
    return;
  }

  const cloudTableName = getCloudTableName(localTableName);
  if (!cloudTableName) return;

  try {
    const { error } = await supabase
      .from(cloudTableName)
      .delete()
      .eq('id', recordId);

    if (error) {
      console.warn(`[CloudSync] Error deleting from ${cloudTableName}:`, error.message);
    }
  } catch (error) {
    console.warn(`[CloudSync] Failed to delete record:`, error);
  }
}

// Get cloud table name from local table name
function getCloudTableName(localTableName: string): string | null {
  const mapping: Record<string, string> = {
    hospitals: TABLES.hospitals,
    patients: TABLES.patients,
    vitalSigns: TABLES.vitalSigns,
    clinicalEncounters: TABLES.clinicalEncounters,
    surgeries: TABLES.surgeries,
    wounds: TABLES.wounds,
    burnAssessments: TABLES.burnAssessments,
    labRequests: TABLES.labRequests,
    prescriptions: TABLES.prescriptions,
    nutritionAssessments: TABLES.nutritionAssessments,
    nutritionPlans: TABLES.nutritionPlans,
    invoices: TABLES.invoices,
    admissions: TABLES.admissions,
    admissionNotes: TABLES.admissionNotes,
    bedAssignments: TABLES.bedAssignments,
    treatmentPlans: TABLES.treatmentPlans,
    treatmentProgress: TABLES.treatmentProgress,
    wardRounds: TABLES.wardRounds,
    doctorAssignments: TABLES.doctorAssignments,
    nurseAssignments: TABLES.nurseAssignments,
    investigations: TABLES.investigations,
    chatRooms: TABLES.chatRooms,
    chatMessages: TABLES.chatMessages,
    videoConferences: TABLES.videoConferences,
    enhancedVideoConferences: TABLES.enhancedVideoConferences,
    dischargeSummaries: TABLES.dischargeSummaries,
    consumableBOMs: TABLES.consumableBOMs,
    histopathologyRequests: TABLES.histopathologyRequests,
    bloodTransfusions: TABLES.bloodTransfusions,
    mdtMeetings: TABLES.mdtMeetings,
    limbSalvageAssessments: TABLES.limbSalvageAssessments,
    burnMonitoringRecords: TABLES.burnMonitoringRecords,
    escharotomyRecords: TABLES.escharotomyRecords,
    skinGraftRecords: TABLES.skinGraftRecords,
    burnCarePlans: TABLES.burnCarePlans,
  };
  return mapping[localTableName] || null;
}

// Convert record from Supabase format (snake_case) to local format (camelCase)
function convertFromSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const key in record) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = record[key];
    
    // Convert date strings to Date objects
    if (typeof value === 'string' && isDateField(camelKey)) {
      value = new Date(value);
    }
    
    result[camelKey] = value;
  }
  
  return result;
}

// Convert record from local format (camelCase) to Supabase format (snake_case)
function convertToSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const key in record) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    let value = record[key];
    
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      value = value.toISOString();
    }
    
    result[snakeKey] = value;
  }
  
  return result;
}

// Check if a field is a date field
function isDateField(fieldName: string): boolean {
  const dateFields = [
    'createdAt', 'updatedAt', 'startDate', 'endDate', 'date',
    'recordedAt', 'scheduledDate', 'admissionDate', 'dischargeDate',
    'requestedAt', 'completedAt', 'collectedAt', 'prescribedAt',
    'dispensedAt', 'assessedAt', 'startedAt', 'completedAt',
    'actualStartTime', 'actualEndTime', 'expectedDischargeDate',
    'actualDischargeDate', 'expectedEndDate', 'actualEndDate',
    'agreementAcceptedAt', 'lastMessageAt', 'dateOfBirth', 'roundDate'
  ];
  return dateFields.includes(fieldName);
}

// Export sync state getter
export function getSyncState(): CloudSyncState {
  return { ...syncState };
}

// Manual trigger for full sync
export async function triggerSync(): Promise<void> {
  await fullSync();
}

// Cleanup function
export function cleanupCloudSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  
  if (supabase) {
    realtimeChannels.forEach(channel => {
      supabase?.removeChannel(channel);
    });
    realtimeChannels = [];
  }
}

// =====================================
// Compatibility layer for SyncIndicator
// =====================================

import { useState, useEffect } from 'react';

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
  // Use React useState with lazy initialization
  const [state, setState] = useState<SyncState>(() => toSyncState(syncState));

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = subscribeSyncState((cloudState: CloudSyncState) => {
      setState(toSyncState(cloudState));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

// syncService object for compatibility with SyncIndicator
export const syncService = {
  getState(): SyncState {
    return toSyncState(syncState);
  },
  
  subscribe(callback: (state: SyncState) => void): () => void {
    if (typeof callback !== 'function') {
      console.error('[CloudSync] subscribe called with non-function:', typeof callback);
      return () => {}; // Return no-op unsubscribe
    }
    
    const wrappedCallback = (cloudState: CloudSyncState): void => {
      try {
        callback(toSyncState(cloudState));
      } catch (err) {
        console.error('[CloudSync] Error in subscribe callback:', err);
      }
    };
    
    return subscribeSyncState(wrappedCallback);
  },
  
  async forceSync(): Promise<void> {
    await fullSync();
  },
  
  async start(): Promise<void> {
    initCloudSync();
  },
  
  stop(): void {
    cleanupCloudSync();
  },
};
