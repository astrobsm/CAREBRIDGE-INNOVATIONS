// Supabase Client Configuration for CareBridge
// This provides cloud sync capabilities for the offline-first PWA

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (only if credentials are provided)
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export { supabase };

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// Database table names (matching local IndexedDB structure)
export const TABLES = {
  users: 'users',
  hospitals: 'hospitals',
  patients: 'patients',
  vitalSigns: 'vital_signs',
  clinicalEncounters: 'clinical_encounters',
  surgeries: 'surgeries',
  wounds: 'wounds',
  burnAssessments: 'burn_assessments',
  labRequests: 'lab_requests',
  prescriptions: 'prescriptions',
  nutritionAssessments: 'nutrition_assessments',
  invoices: 'invoices',
  admissions: 'admissions',
  treatmentPlans: 'treatment_plans',
  treatmentProgress: 'treatment_progress',
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  wardRounds: 'ward_rounds',
  investigations: 'investigations',
} as const;

// Type for sync status
export interface SyncRecord {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  synced: boolean;
  created_at: string;
  device_id: string;
}
