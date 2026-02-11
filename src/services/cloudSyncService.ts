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
let criticalSyncInterval: ReturnType<typeof setInterval> | null = null;

// Echo-back prevention: track recently synced record IDs to skip real-time echo
const recentlySyncedIds = new Map<string, number>(); // id -> timestamp
const ECHO_BACK_TTL_MS = 10000; // 10 seconds TTL

function markRecentlySynced(id: string): void {
  recentlySyncedIds.set(id, Date.now());
  // Cleanup old entries
  const now = Date.now();
  for (const [key, ts] of recentlySyncedIds) {
    if (now - ts > ECHO_BACK_TTL_MS) {
      recentlySyncedIds.delete(key);
    }
  }
}

function isRecentlySynced(id: string): boolean {
  const ts = recentlySyncedIds.get(id);
  if (!ts) return false;
  if (Date.now() - ts > ECHO_BACK_TTL_MS) {
    recentlySyncedIds.delete(id);
    return false;
  }
  return true;
}

// Retry tracking for real-time subscriptions
const subscriptionRetryCount = new Map<string, number>();
const MAX_RETRY_COUNT = 5;
const BASE_RETRY_DELAY_MS = 2000;

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

// Migration key to track if we've sanitized the database
const SANITIZE_MIGRATION_KEY = 'astrohealth_db_sanitized_v2';

/**
 * Sanitizes a single value, converting Date objects and other problematic types to strings.
 * This is a simpler version for migrating existing data.
 */
function sanitizeExistingValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  
  // Date objects -> ISO strings
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }
  
  // Map -> plain object
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    value.forEach((v, k) => {
      obj[String(k)] = sanitizeExistingValue(v);
    });
    return obj;
  }
  
  // Set -> array
  if (value instanceof Set) {
    return Array.from(value).map(sanitizeExistingValue);
  }
  
  // Arrays
  if (Array.isArray(value)) {
    return value.map(sanitizeExistingValue);
  }
  
  // Objects
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    
    // Check for Firestore timestamps
    if (keys.includes('seconds') && typeof (obj as any).seconds === 'number') {
      return new Date((obj as any).seconds * 1000).toISOString();
    }
    
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = sanitizeExistingValue(obj[key]);
    }
    return result;
  }
  
  return value;
}

/**
 * One-time migration to sanitize existing IndexedDB data.
 * Converts all Date objects to ISO strings to prevent React #310 errors.
 */
async function sanitizeExistingData(): Promise<void> {
  // Check if we've already run this migration
  if (localStorage.getItem(SANITIZE_MIGRATION_KEY)) {
    console.log('[CloudSync] Database already sanitized, skipping migration');
    return;
  }
  
  console.log('[CloudSync] Starting database sanitization migration...');
  
  // Tables that are most likely to have Date objects
  const tablesToSanitize = [
    'patients',
    'admissions', 
    'appointments',
    'prescriptions',
    'chatMessages',
    'chatRooms',
    'medicationCharts',
    'clinicalEncounters',
    'vitalSigns',
    'surgeries',
    'wounds',
    'labRequests',
    'investigations',
    'invoices',
    'treatmentPlans',
    'wardRounds',
  ];
  
  let totalSanitized = 0;
  
  for (const tableName of tablesToSanitize) {
    try {
      const table = (db as any)[tableName];
      if (!table) continue;
      
      const records = await table.toArray();
      let sanitizedCount = 0;
      
      for (const record of records) {
        let needsUpdate = false;
        const sanitizedRecord: Record<string, unknown> = {};
        
        for (const key in record) {
          const originalValue = record[key];
          const sanitizedValue = sanitizeExistingValue(originalValue);
          
          // Check if value changed (Date was converted)
          if (originalValue instanceof Date || 
              (originalValue instanceof Map) || 
              (originalValue instanceof Set) ||
              JSON.stringify(originalValue) !== JSON.stringify(sanitizedValue)) {
            needsUpdate = true;
          }
          
          sanitizedRecord[key] = sanitizedValue;
        }
        
        if (needsUpdate) {
          await table.put(sanitizedRecord);
          sanitizedCount++;
        }
      }
      
      if (sanitizedCount > 0) {
        console.log(`[CloudSync] Sanitized ${sanitizedCount} records in ${tableName}`);
        totalSanitized += sanitizedCount;
      }
    } catch (err) {
      console.warn(`[CloudSync] Failed to sanitize ${tableName}:`, err);
    }
  }
  
  console.log(`[CloudSync] Database sanitization complete. Total records sanitized: ${totalSanitized}`);
  localStorage.setItem(SANITIZE_MIGRATION_KEY, new Date().toISOString());
}

// Initialize cloud sync with real-time subscriptions
export function initCloudSync() {
  console.log('[CloudSync] Initializing cloud sync...');
  console.log('[CloudSync] Supabase configured:', isSupabaseConfigured());
  console.log('[CloudSync] Online:', navigator.onLine);
  
  // Run database sanitization migration FIRST to fix any existing Date objects
  // This prevents React #310 errors from data stored before the fix
  sanitizeExistingData().then(() => {
    console.log('[CloudSync] Database sanitization check complete');
  }).catch(err => {
    console.warn('[CloudSync] Database sanitization failed:', err);
  });
  
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

    // Set up polling for critical clinical data every 2 minutes
    // Real-time subscriptions handle immediate updates; this is a safety net
    criticalSyncInterval = setInterval(() => {
      if (navigator.onLine && isSupabaseConfigured()) {
        syncCriticalClinicalData();
      }
    }, 120000);
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
  
  // External Reviews (Admin only)
  await pullTable(TABLES.externalReviews, 'externalReviews');
  
  // Referrals
  await pullTable(TABLES.referrals, 'referrals');
  
  // Patient Education Records
  await pullTable(TABLES.patientEducationRecords, 'patientEducationRecords');
  
  // Calculator Results
  await pullTable(TABLES.calculatorResults, 'calculatorResults');
  
  // User & Hospital Settings
  await pullTable(TABLES.userSettings, 'userSettings');
  await pullTable(TABLES.hospitalSettings, 'hospitalSettings');
  
  // Meeting Minutes
  await pullTable(TABLES.meetingMinutes, 'meetingMinutes');
  
  // Substance Use Disorder Assessment & Detoxification (CSUD-DSM)
  await pullTable(TABLES.substanceUseAssessments, 'substanceUseAssessments');
  await pullTable(TABLES.detoxMonitoringRecords, 'detoxMonitoringRecords');
  await pullTable(TABLES.detoxFollowUps, 'detoxFollowUps');
  await pullTable(TABLES.substanceUseConsents, 'substanceUseConsents');
  await pullTable(TABLES.substanceUseClinicalSummaries, 'substanceUseClinicalSummaries');
  
  // Clinical Comments (Post-Submission Notes)
  await pullTable(TABLES.clinicalComments, 'clinicalComments');
  
  // Investigation Approval Logs - uses 'created_at' column instead of 'updated_at'
  await pullTable(TABLES.investigationApprovalLogs, 'investigationApprovalLogs', 'created_at');
  
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
  
  // External Reviews (Admin only)
  await pushTable('externalReviews', TABLES.externalReviews);
  
  // Referrals
  await pushTable('referrals', TABLES.referrals);
  
  // Patient Education Records
  await pushTable('patientEducationRecords', TABLES.patientEducationRecords);
  
  // Calculator Results
  await pushTable('calculatorResults', TABLES.calculatorResults);
  
  // User & Hospital Settings
  await pushTable('userSettings', TABLES.userSettings);
  await pushTable('hospitalSettings', TABLES.hospitalSettings);
  
  // Meeting Minutes
  await pushTable('meetingMinutes', TABLES.meetingMinutes);
  
  // Substance Use Disorder Assessment & Detoxification (CSUD-DSM)
  await pushTable('substanceUseAssessments', TABLES.substanceUseAssessments);
  await pushTable('detoxMonitoringRecords', TABLES.detoxMonitoringRecords);
  await pushTable('detoxFollowUps', TABLES.detoxFollowUps);
  await pushTable('substanceUseConsents', TABLES.substanceUseConsents);
  await pushTable('substanceUseClinicalSummaries', TABLES.substanceUseClinicalSummaries);
  
  // Clinical Comments (Post-Submission Notes)
  await pushTable('clinicalComments', TABLES.clinicalComments);
  
  // Investigation Approval Logs
  await pushTable('investigationApprovalLogs', TABLES.investigationApprovalLogs);
  
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
    // Gracefully handle network/CORS errors without flooding console
    const err = error as Error;
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('CORS')) {
      // Network/CORS errors - log once quietly, don't spam console
      if (cloudTableName === 'users') {
        console.warn(`[CloudSync] Network issue pulling ${cloudTableName} - will retry on next sync. Check Supabase RLS policies.`);
      }
    } else {
      console.warn(`[CloudSync] Failed to pull ${cloudTableName}:`, err.message || error);
    }
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

// Sync critical clinical data more frequently for cross-device consistency
async function syncCriticalClinicalData() {
  if (!isSupabaseConfigured() || !supabase) return;
  
  const criticalTables = [
    { cloud: TABLES.vitalSigns, local: 'vitalSigns' },
    { cloud: TABLES.clinicalEncounters, local: 'clinicalEncounters' },
    { cloud: TABLES.wardRounds, local: 'wardRounds' },
    { cloud: TABLES.prescriptions, local: 'prescriptions' },
    { cloud: TABLES.medicationCharts, local: 'medicationCharts' },
    { cloud: TABLES.labRequests, local: 'labRequests' },
  ];

  for (const { cloud, local } of criticalTables) {
    try {
      await pullTable(cloud, local);
    } catch (err) {
      console.warn(`[CloudSync] Failed to sync critical table ${local}:`, err);
    }
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
    // Critical clinical data for cross-device sync
    { cloud: TABLES.vitalSigns, local: 'vitalSigns' },
    { cloud: TABLES.clinicalEncounters, local: 'clinicalEncounters' },
    { cloud: TABLES.wardRounds, local: 'wardRounds' },
    { cloud: TABLES.surgeries, local: 'surgeries' },
    { cloud: TABLES.wounds, local: 'wounds' },
    { cloud: TABLES.burnAssessments, local: 'burnAssessments' },
    { cloud: TABLES.labRequests, local: 'labRequests' },
    { cloud: TABLES.investigations, local: 'investigations' },
    { cloud: TABLES.treatmentPlans, local: 'treatmentPlans' },
    { cloud: TABLES.treatmentProgress, local: 'treatmentProgress' },
    { cloud: TABLES.dischargeSummaries, local: 'dischargeSummaries' },
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
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const incomingId = (payload.new as any)?.id;
              
              // Skip echo-back: if we just pushed this record, don't re-apply it
              if (incomingId && isRecentlySynced(incomingId)) {
                console.log(`[CloudSync] Skipping echo-back for ${cloud}:`, incomingId);
                return;
              }
              
              console.log(`[CloudSync] Real-time ${payload.eventType} on ${cloud}:`, incomingId);
              const record = convertFromSupabase(payload.new as Record<string, unknown>);
              try {
                await (db as any)[local].put(record);
                console.log(`[CloudSync] Applied ${payload.eventType} to local ${local}`);
              } catch (err) {
                console.warn(`[CloudSync] Failed to apply change to ${local}:`, err);
              }
            } else if (payload.eventType === 'DELETE' && payload.old) {
              console.log(`[CloudSync] Real-time DELETE on ${cloud}:`, (payload.old as any).id);
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
            // Reset retry count on successful subscription
            subscriptionRetryCount.delete(cloud);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[CloudSync] ✗ Subscription ${status} for ${cloud}`);
            
            // Retry with exponential backoff
            const retries = subscriptionRetryCount.get(cloud) || 0;
            if (retries < MAX_RETRY_COUNT) {
              subscriptionRetryCount.set(cloud, retries + 1);
              const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, retries), 30000);
              console.log(`[CloudSync] Retrying ${cloud} subscription in ${delay}ms (attempt ${retries + 1}/${MAX_RETRY_COUNT})`);
              
              setTimeout(() => {
                try {
                  sb.removeChannel(channel);
                  // Remove from tracked channels
                  const idx = realtimeChannels.indexOf(channel);
                  if (idx !== -1) realtimeChannels.splice(idx, 1);
                } catch (_e) { /* ignore cleanup errors */ }
                // Re-setup all subscriptions (simpler than re-subscribing individual)
                setupRealtimeSubscriptions();
              }, delay);
            } else {
              console.error(`[CloudSync] Max retries reached for ${cloud}, relying on polling`);
            }
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
    
    const recordId = (record as any).id as string;
    console.log(`[CloudSync] Syncing record to ${cloudTableName}:`, recordId);
    
    // Mark this record to prevent echo-back from real-time subscription
    if (recordId) {
      markRecentlySynced(recordId);
    }
    
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
      console.log(`[CloudSync] Record synced successfully to ${cloudTableName}:`, recordId);
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
    // External Reviews (Admin only)
    externalReviews: TABLES.externalReviews,
    // Referrals
    referrals: TABLES.referrals,
    // Patient Education Records
    patientEducationRecords: TABLES.patientEducationRecords,
    // Calculator Results
    calculatorResults: TABLES.calculatorResults,
    // User & Hospital Settings
    userSettings: TABLES.userSettings,
    hospitalSettings: TABLES.hospitalSettings,
    // Audit Logs
    auditLogs: TABLES.auditLogs,
  };
  return mapping[localTableName] || null;
}

// Convert record from Supabase format (snake_case) to local format (camelCase)
/**
 * Recursively sanitizes any value from Supabase to ensure it's safe for React rendering.
 * Converts Date objects, Firestore timestamps, and other problematic types to strings.
 * Recursively processes nested objects and arrays.
 */
function sanitizeValue(value: unknown, path: string = ''): unknown {
  // Null/undefined pass through
  if (value === null || value === undefined) {
    return value;
  }
  
  // Date objects -> ISO strings
  if (value instanceof Date) {
    console.warn(`[CloudSync] Converting Date object to string at ${path}`);
    return value.toISOString();
  }
  
  // Map objects -> plain objects
  if (value instanceof Map) {
    console.warn(`[CloudSync] Converting Map to object at ${path}`);
    return sanitizeValue(Object.fromEntries(value), path);
  }
  
  // Set objects -> arrays
  if (value instanceof Set) {
    console.warn(`[CloudSync] Converting Set to array at ${path}`);
    return sanitizeValue(Array.from(value), path);
  }
  
  // Arrays - recursively sanitize each element
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, `${path}[${index}]`));
  }
  
  // Objects - recursively sanitize each property
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    
    // Check for Firestore-style timestamp objects {seconds, nanoseconds}
    if (keys.includes('seconds') || keys.includes('nanoseconds')) {
      const ts = obj as { seconds?: number; nanoseconds?: number };
      if (typeof ts.seconds === 'number') {
        console.warn(`[CloudSync] Converting Firestore timestamp to string at ${path}`);
        return new Date(ts.seconds * 1000).toISOString();
      }
    }
    
    // Recursively sanitize each property
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = sanitizeValue(obj[key], `${path}.${key}`);
    }
    return result;
  }
  
  // Primitives pass through (string, number, boolean)
  return value;
}

/**
 * Convert record from Supabase format (snake_case) to local format (camelCase).
 * Also recursively sanitizes all values to ensure they're safe for React rendering.
 */
function convertFromSupabase(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const key in record) {
    // Check for special case reverse mappings first
    let camelKey = REVERSE_FIELD_MAPPINGS[key];
    
    if (!camelKey) {
      // Convert snake_case to camelCase using regex
      camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    
    // Recursively sanitize the value to ensure it's safe for React
    const value = sanitizeValue(record[key], camelKey);
    
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
  if (criticalSyncInterval) {
    clearInterval(criticalSyncInterval);
    criticalSyncInterval = null;
  }
  // Clear echo-back tracking
  recentlySyncedIds.clear();
  subscriptionRetryCount.clear();
  
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
