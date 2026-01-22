// Enhanced Cloud Sync Service for AstroHEALTH
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
    
    // Set up periodic sync every 5 minutes (300000ms) - real-time handles immediate updates
    syncInterval = setInterval(() => {
      if (navigator.onLine && isSupabaseConfigured()) {
        fullSync();
      }
    }, 300000);
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

// Debug function to diagnose sync issues
export async function debugUserSync(): Promise<{
  local: { count: number; users: any[] };
  cloud: { count: number; users: any[]; error?: string };
  diagnosis: string[];
}> {
  const diagnosis: string[] = [];
  
  // Get local users
  let localUsers: any[] = [];
  try {
    localUsers = await db.users.toArray();
    console.log('[CloudSync Debug] Local users:', localUsers.length, localUsers);
  } catch (err) {
    diagnosis.push(`Error reading local users: ${err}`);
  }
  
  // Get cloud users
  let cloudUsers: any[] = [];
  let cloudError: string | undefined;
  
  if (!isSupabaseConfigured() || !supabase) {
    cloudError = 'Supabase not configured';
    diagnosis.push('Supabase is not configured - check environment variables');
  } else {
    try {
      const { data, error } = await supabase
        .from(TABLES.users)
        .select('*');
      
      if (error) {
        cloudError = `${error.message} (code: ${error.code}, details: ${error.details})`;
        diagnosis.push(`Cloud query error: ${cloudError}`);
        
        if (error.code === '42P01') {
          diagnosis.push('CRITICAL: The "users" table does not exist in Supabase! Run the supabase-users-sync-fix.sql migration.');
        }
      } else {
        cloudUsers = data || [];
        console.log('[CloudSync Debug] Cloud users:', cloudUsers.length, cloudUsers);
      }
    } catch (err) {
      cloudError = `Exception: ${err}`;
      diagnosis.push(`Cloud exception: ${err}`);
    }
  }
  
  // Compare and diagnose
  if (localUsers.length > cloudUsers.length) {
    diagnosis.push(`Local has ${localUsers.length} users but cloud only has ${cloudUsers.length}. Users need to be pushed to cloud.`);
    
    // Find missing users
    const cloudIds = new Set(cloudUsers.map(u => u.id));
    const missingInCloud = localUsers.filter(u => !cloudIds.has(u.id));
    diagnosis.push(`Missing in cloud: ${missingInCloud.map(u => u.username || u.email).join(', ')}`);
  } else if (cloudUsers.length > localUsers.length) {
    diagnosis.push(`Cloud has ${cloudUsers.length} users but local only has ${localUsers.length}. Users need to be pulled from cloud.`);
    
    // Find missing users
    const localIds = new Set(localUsers.map(u => u.id));
    const missingLocally = cloudUsers.filter((u: any) => !localIds.has(u.id));
    diagnosis.push(`Missing locally: ${missingLocally.map((u: any) => u.username || u.email).join(', ')}`);
  } else if (localUsers.length === cloudUsers.length && localUsers.length > 0) {
    diagnosis.push(`Both have ${localUsers.length} users - sync appears to be working.`);
  }
  
  if (localUsers.length === 0 && cloudUsers.length === 0) {
    diagnosis.push('No users in either local or cloud storage.');
  }
  
  return {
    local: { count: localUsers.length, users: localUsers },
    cloud: { count: cloudUsers.length, users: cloudUsers, error: cloudError },
    diagnosis,
  };
}

// Expose debug function to window for browser console access
(window as any).debugUserSync = debugUserSync;

// Force push users to cloud (for debugging)
export async function forcePushUsers(): Promise<{ success: boolean; message: string; details?: any }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, message: 'Supabase not configured' };
  }
  
  try {
    const localUsers = await db.users.toArray();
    console.log('[CloudSync] Force pushing', localUsers.length, 'users to cloud...');
    
    if (localUsers.length === 0) {
      return { success: true, message: 'No local users to push' };
    }
    
    // Convert to Supabase format (cast to any to handle User type)
    const preparedUsers = localUsers.map((user: any) => convertToSupabase(user as Record<string, unknown>));
    console.log('[CloudSync] Prepared users for upload:', preparedUsers);
    
    const { error, data } = await supabase
      .from(TABLES.users)
      .upsert(preparedUsers, { onConflict: 'id', ignoreDuplicates: false });
    
    if (error) {
      console.error('[CloudSync] Force push failed:', error);
      return { 
        success: false, 
        message: `Push failed: ${error.message}`,
        details: { code: error.code, details: error.details, hint: error.hint }
      };
    }
    
    console.log('[CloudSync] Force push successful!');
    return { success: true, message: `Pushed ${localUsers.length} users to cloud`, details: data };
  } catch (err) {
    console.error('[CloudSync] Force push exception:', err);
    return { success: false, message: `Exception: ${err}` };
  }
}

// Force pull users from cloud (for debugging)
export async function forcePullUsers(): Promise<{ success: boolean; message: string; details?: any }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, message: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await supabase
      .from(TABLES.users)
      .select('*');
    
    if (error) {
      return { 
        success: false, 
        message: `Pull failed: ${error.message}`,
        details: { code: error.code, details: error.details }
      };
    }
    
    if (!data || data.length === 0) {
      return { success: true, message: 'No users in cloud to pull' };
    }
    
    console.log('[CloudSync] Pulled', data.length, 'users from cloud:', data);
    
    // Convert and save locally
    let added = 0;
    let updated = 0;
    
    for (const cloudRecord of data) {
      const record = convertFromSupabase(cloudRecord) as any;
      try {
        const existing = await db.users.get(record.id as string);
        if (existing) {
          await db.users.put(record);
          updated++;
        } else {
          await db.users.add(record);
          added++;
        }
      } catch (err) {
        try {
          await db.users.put(record);
          updated++;
        } catch {
          console.error('[CloudSync] Failed to save user:', record.id, err);
        }
      }
    }
    
    return { 
      success: true, 
      message: `Pulled ${data.length} users: ${added} added, ${updated} updated`,
      details: { total: data.length, added, updated }
    };
  } catch (err) {
    return { success: false, message: `Exception: ${err}` };
  }
}

// Expose force sync functions to window for debugging
(window as any).forcePushUsers = forcePushUsers;
(window as any).forcePullUsers = forcePullUsers;

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
  
  // Core tables - USERS FIRST for authentication
  await pullTable(TABLES.users, 'users');
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
  
  // Staff Assignments & Billing
  await pullTable(TABLES.staffPatientAssignments, 'staffPatientAssignments');
  await pullTable(TABLES.activityBillingRecords, 'activityBillingRecords');
  
  // Payroll
  await pullTable(TABLES.payrollPeriods, 'payrollPeriods');
  await pullTable(TABLES.staffPayrollRecords, 'staffPayrollRecords');
  await pullTable(TABLES.payslips, 'payslips');
  
  // Post-Operative Notes
  await pullTable(TABLES.postOperativeNotes, 'postOperativeNotes');
  
  // Preoperative Assessments
  await pullTable(TABLES.preoperativeAssessments, 'preoperativeAssessments');
  
  // Audit Logs (for accountability across devices) - uses 'timestamp' column instead of 'updated_at'
  await pullTable(TABLES.auditLogs, 'auditLogs', 'timestamp');
}

// Push all local data to cloud
async function pushAllToCloud(): Promise<void> {
  console.log('[CloudSync] Pushing data to cloud...');
  
  // Core tables - USERS FIRST for authentication
  await pushTable('users', TABLES.users);
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
  
  // Staff Assignments & Billing
  await pushTable('staffPatientAssignments', TABLES.staffPatientAssignments);
  await pushTable('activityBillingRecords', TABLES.activityBillingRecords);
  
  // Payroll
  await pushTable('payrollPeriods', TABLES.payrollPeriods);
  await pushTable('staffPayrollRecords', TABLES.staffPayrollRecords);
  await pushTable('payslips', TABLES.payslips);
  
  // Post-Operative Notes
  await pushTable('postOperativeNotes', TABLES.postOperativeNotes);
  
  // Preoperative Assessments
  await pushTable('preoperativeAssessments', TABLES.preoperativeAssessments);
  
  // Audit Logs (for accountability across devices)
  await pushTable('auditLogs', TABLES.auditLogs);
}

// Pull a single table from cloud
async function pullTable(cloudTableName: string, localTableName: string, orderColumn: string = 'updated_at'): Promise<void> {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from(cloudTableName)
      .select('*')
      .order(orderColumn, { ascending: false });

    if (error) {
      console.warn(`[CloudSync] Error pulling ${cloudTableName}:`, error.message, error.code, error.details);
      // For users table, provide more detailed diagnostics
      if (cloudTableName === 'users') {
        console.error(`[CloudSync] USERS TABLE PULL FAILED! Error code: ${error.code}`);
        if (error.code === '42P01') {
          console.error('[CloudSync] The "users" table does not exist in Supabase! Run supabase-users-sync-fix.sql');
        }
      }
      return;
    }

    // Log even when no data for users table
    if (cloudTableName === 'users') {
      console.log(`[CloudSync] Users table pull result: ${data?.length || 0} records from cloud`);
    }

    if (data && data.length > 0) {
      // Convert snake_case to camelCase and parse dates
      const records = data.map((record: Record<string, unknown>) => convertFromSupabase(record));

      // Merge with local data (cloud wins for conflicts based on updated_at)
      let added = 0, updated = 0, skipped = 0;
      
      for (const record of records) {
        try {
          const localRecord = await (db as any)[localTableName].get(record.id);
          
          if (!localRecord) {
            // Record doesn't exist locally, add it
            await (db as any)[localTableName].add(record);
            added++;
          } else {
            // Compare updated_at timestamps
            const localUpdated = new Date(String(localRecord.updatedAt || '1970-01-01')).getTime();
            const cloudUpdated = new Date(String((record as any).updatedAt || '1970-01-01')).getTime();
            
            if (cloudUpdated > localUpdated) {
              // Cloud version is newer, update local
              await (db as any)[localTableName].put(record);
              updated++;
            } else {
              skipped++;
            }
          }
        } catch (err) {
          // If add fails (duplicate), try put
          try {
            await (db as any)[localTableName].put(record);
            updated++;
          } catch {
            // Ignore errors for individual records
            if (cloudTableName === 'users') {
              console.error(`[CloudSync] Failed to save user record:`, record, err);
            }
          }
        }
      }
      
      console.log(`[CloudSync] Pulled ${records.length} records from ${cloudTableName} (added: ${added}, updated: ${updated}, skipped: ${skipped})`);
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
      // Log when no records for users table
      if (localTableName === 'users') {
        console.log('[CloudSync] No local users to push');
      }
      return;
    }

    // Enhanced logging for users table
    if (localTableName === 'users') {
      console.log(`[CloudSync] Pushing ${localRecords.length} users to cloud:`, localRecords.map((u: any) => u.username || u.email || u.id));
    }

    // Convert to Supabase format
    const preparedRecords = localRecords.map((record: Record<string, unknown>) => convertToSupabase(record));
    
    // Debug log for users
    if (localTableName === 'users') {
      console.log('[CloudSync] Prepared users for upload:', preparedRecords);
    }

    // Upsert in batches of 100
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < preparedRecords.length; i += batchSize) {
      const batch = preparedRecords.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(cloudTableName)
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`[CloudSync] Error pushing to ${cloudTableName}:`, error.message, error.code, error.details, error.hint);
        
        // Specific diagnostic for users table
        if (cloudTableName === 'users') {
          console.error('[CloudSync] USERS PUSH FAILED!');
          if (error.code === '42P01') {
            console.error('[CloudSync] The "users" table does not exist in Supabase! Run supabase-users-sync-fix.sql');
          } else if (error.code === '23505') {
            console.error('[CloudSync] Duplicate key error - some users already exist with conflicting IDs');
          } else if (error.code === '23502') {
            console.error('[CloudSync] NOT NULL constraint violation - some required fields are missing');
          } else if (error.code === '42501') {
            console.error('[CloudSync] Permission denied - check RLS policies on users table');
          }
        }
        
        errorCount += batch.length;
        
        // Try individual records if batch fails (to identify problematic records)
        if (batch.length > 1) {
          for (const record of batch) {
            try {
              const { error: singleError } = await supabase
                .from(cloudTableName)
                .upsert(record, { onConflict: 'id' });
              
              if (singleError) {
                console.error(`[CloudSync] Failed record in ${cloudTableName}:`, (record as any).id, singleError.message, singleError.code);
              } else {
                successCount++;
                errorCount--;
              }
            } catch {
              // Individual record failed
            }
          }
        }
      } else {
        successCount += batch.length;
        // Log success for users
        if (cloudTableName === 'users') {
          console.log(`[CloudSync] Successfully pushed batch of ${batch.length} users to cloud`);
        }
      }
    }
    
    if (errorCount > 0) {
      console.warn(`[CloudSync] Pushed ${successCount}/${localRecords.length} records to ${cloudTableName} (${errorCount} failed)`);
    } else {
      console.log(`[CloudSync] Pushed ${localRecords.length} records to ${cloudTableName}`);
    }
  } catch (error) {
    console.error(`[CloudSync] Failed to push ${localTableName}:`, error);
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

  // OPTIMIZED: Subscribe to ESSENTIAL tables only
  // Supabase free tier limits: max 2 connections per client
  // Strategy: Group multiple tables per channel using broadcast
  const essentialTables = [
    // Critical real-time updates only
    { cloud: TABLES.patients, local: 'patients' },
    { cloud: TABLES.admissions, local: 'admissions' },
    { cloud: TABLES.prescriptions, local: 'prescriptions' },
    { cloud: TABLES.appointments, local: 'appointments' },
    { cloud: TABLES.chatMessages, local: 'chatMessages' },
    { cloud: TABLES.medicationCharts, local: 'medicationCharts' },
  ];

  // Batch subscribe to avoid overwhelming Supabase connection limits
  let subscriptionDelay = 0;
  essentialTables.forEach(({ cloud, local }) => {
    // Stagger subscriptions with 200ms delay to prevent connection flooding
    setTimeout(() => {
      const channel = sb
        .channel(`${cloud}-changes`, {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
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
          if (status === 'SUBSCRIBED') {
            console.log(`[CloudSync] ✓ Subscribed to ${cloud}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[CloudSync] ✗ Subscription ${status} for ${cloud}`);
          }
        });

      realtimeChannels.push(channel);
    }, subscriptionDelay);
    
    subscriptionDelay += 200; // 200ms between each subscription
  });
  
  console.log(`[CloudSync] Subscribing to ${essentialTables.length} essential tables...`);
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
    
    console.log(`[CloudSync] Syncing record to ${cloudTableName}:`, (record as any).id);
    
    const { error } = await supabase
      .from(cloudTableName)
      .upsert(preparedRecord, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[CloudSync] Error syncing record to ${cloudTableName}:`, error.message, error.details, error.hint);
      // Log the problematic fields for debugging
      console.error(`[CloudSync] Record keys:`, Object.keys(preparedRecord));
    } else {
      console.log(`[CloudSync] Record synced successfully to ${cloudTableName}:`, (record as any).id);
    }
  } catch (error) {
    console.error(`[CloudSync] Failed to sync record:`, error);
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
    users: TABLES.users,
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
    appointments: TABLES.appointments,
    appointmentSlots: TABLES.appointmentSlots,
    appointmentReminders: TABLES.appointmentReminders,
    clinicSessions: TABLES.clinicSessions,
    // NPWT
    npwtSessions: TABLES.npwtSessions,
    npwtNotifications: TABLES.npwtNotifications,
    // Medication Charts
    medicationCharts: TABLES.medicationCharts,
    nursePatientAssignments: TABLES.nursePatientAssignments,
    // Transfusion
    transfusionOrders: TABLES.transfusionOrders,
    transfusionMonitoringCharts: TABLES.transfusionMonitoringCharts,
    // Staff Assignments & Billing
    staffPatientAssignments: TABLES.staffPatientAssignments,
    activityBillingRecords: TABLES.activityBillingRecords,
    // Payroll
    payrollPeriods: TABLES.payrollPeriods,
    staffPayrollRecords: TABLES.staffPayrollRecords,
    payslips: TABLES.payslips,
    // Post-Operative Notes
    postOperativeNotes: TABLES.postOperativeNotes,
    // Preoperative Assessments
    preoperativeAssessments: TABLES.preoperativeAssessments,
    // Audit Logs
    auditLogs: TABLES.auditLogs,
  };
  return mapping[localTableName] || null;
}

// Convert record from Supabase format (snake_case) to local format (camelCase)
function convertFromSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const key in record) {
    // Check for special case reverse mappings first
    let camelKey = REVERSE_FIELD_MAPPINGS[key];
    
    if (!camelKey) {
      // Convert snake_case to camelCase using regex
      camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    
    let value = record[key];
    
    // Convert date strings to Date objects
    if (typeof value === 'string' && isDateField(camelKey)) {
      value = new Date(value);
    }
    
    result[camelKey] = value;
  }
  
  return result;
}

// Special case mappings for fields that don't follow simple camelCase to snake_case conversion
const SPECIAL_FIELD_MAPPINGS: Record<string, string> = {
  // WhatsApp should be whatsapp (lowercase, no underscore)
  patientWhatsApp: 'patient_whatsapp',
  whatsAppNumber: 'whatsapp_number',
  whatsApp: 'whatsapp',
  // is24Hours should be is_24_hours (with underscore before number)
  is24Hours: 'is_24_hours',
};

// Reverse mappings for converting from Supabase to local
const REVERSE_FIELD_MAPPINGS: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIAL_FIELD_MAPPINGS).map(([k, v]) => [v, k])
);

// Convert record from local format (camelCase) to Supabase format (snake_case)
function convertToSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const key in record) {
    // Check for special case mappings first
    let snakeKey = SPECIAL_FIELD_MAPPINGS[key];
    
    if (!snakeKey) {
      // Convert camelCase to snake_case using regex
      snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    
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
