// Supabase Client Configuration for AstroHEALTH
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
  // Core tables
  users: 'users',
  hospitals: 'hospitals',
  patients: 'patients',
  
  // Clinical tables
  vitalSigns: 'vital_signs',
  clinicalEncounters: 'clinical_encounters',
  surgeries: 'surgeries',
  wounds: 'wounds',
  burnAssessments: 'burn_assessments',
  
  // Lab & Pharmacy
  labRequests: 'lab_requests',
  prescriptions: 'prescriptions',
  
  // Nutrition
  nutritionAssessments: 'nutrition_assessments',
  nutritionPlans: 'nutrition_plans',
  
  // Billing
  invoices: 'invoices',
  
  // Admission & Ward
  admissions: 'admissions',
  admissionNotes: 'admission_notes',
  bedAssignments: 'bed_assignments',
  
  // Treatment
  treatmentPlans: 'treatment_plans',
  treatmentProgress: 'treatment_progress',
  
  // Ward Rounds & Assignments
  wardRounds: 'ward_rounds',
  doctorAssignments: 'doctor_assignments',
  nurseAssignments: 'nurse_assignments',
  
  // Investigations
  investigations: 'investigations',
  
  // Communication
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  videoConferences: 'video_conferences',
  enhancedVideoConferences: 'enhanced_video_conferences',
  
  // Discharge & Documentation
  dischargeSummaries: 'discharge_summaries',
  consumableBOMs: 'consumable_boms',
  histopathologyRequests: 'histopathology_requests',
  
  // Blood Transfusion & MDT
  bloodTransfusions: 'blood_transfusions',
  mdtMeetings: 'mdt_meetings',
  
  // Limb Salvage
  limbSalvageAssessments: 'limb_salvage_assessments',
  
  // Burn Care Monitoring
  burnMonitoringRecords: 'burn_monitoring_records',
  escharotomyRecords: 'escharotomy_records',
  skinGraftRecords: 'skin_graft_records',
  burnCarePlans: 'burn_care_plans',
  
  // Appointments
  appointments: 'appointments',
  appointmentReminders: 'appointment_reminders',
  appointmentSlots: 'appointment_slots',
  clinicSessions: 'clinic_sessions',
  
  // NPWT (Negative Pressure Wound Therapy)
  npwtSessions: 'npwt_sessions',
  npwtNotifications: 'npwt_notifications',
  
  // Medication Charts
  medicationCharts: 'medication_charts',
  nursePatientAssignments: 'nurse_patient_assignments',
  
  // Transfusion Orders & Monitoring
  transfusionOrders: 'transfusion_orders',
  transfusionMonitoringCharts: 'transfusion_monitoring_charts',
  
  // Audit & Sync
  auditLogs: 'audit_logs',
  syncStatus: 'sync_status',
  
  // Staff Assignments & Billing
  staffPatientAssignments: 'staff_patient_assignments',
  activityBillingRecords: 'activity_billing_records',
  
  // Payroll
  payrollPeriods: 'payroll_periods',
  staffPayrollRecords: 'staff_payroll_records',
  payslips: 'payslips',
  
  // Post-Operative Notes
  postOperativeNotes: 'post_operative_notes',
  
  // Preoperative Assessments
  preoperativeAssessments: 'preoperative_assessments',
  
  // External Reviews (Admin only)
  externalReviews: 'external_reviews',
} as const;

// Local to cloud table name mapping
export const LOCAL_TO_CLOUD_TABLE: Record<string, string> = {
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
  nutritionPlans: 'nutrition_plans',
  invoices: 'invoices',
  admissions: 'admissions',
  admissionNotes: 'admission_notes',
  bedAssignments: 'bed_assignments',
  treatmentPlans: 'treatment_plans',
  treatmentProgress: 'treatment_progress',
  wardRounds: 'ward_rounds',
  doctorAssignments: 'doctor_assignments',
  nurseAssignments: 'nurse_assignments',
  investigations: 'investigations',
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  videoConferences: 'video_conferences',
  enhancedVideoConferences: 'enhanced_video_conferences',
  dischargeSummaries: 'discharge_summaries',
  consumableBOMs: 'consumable_boms',
  histopathologyRequests: 'histopathology_requests',
  bloodTransfusions: 'blood_transfusions',
  mdtMeetings: 'mdt_meetings',
  limbSalvageAssessments: 'limb_salvage_assessments',
  burnMonitoringRecords: 'burn_monitoring_records',
  escharotomyRecords: 'escharotomy_records',
  skinGraftRecords: 'skin_graft_records',
  burnCarePlans: 'burn_care_plans',
  // Appointments
  appointments: 'appointments',
  appointmentReminders: 'appointment_reminders',
  appointmentSlots: 'appointment_slots',
  clinicSessions: 'clinic_sessions',
  // NPWT
  npwtSessions: 'npwt_sessions',
  npwtNotifications: 'npwt_notifications',
  // Medication Charts
  medicationCharts: 'medication_charts',
  nursePatientAssignments: 'nurse_patient_assignments',
  // Transfusion
  transfusionOrders: 'transfusion_orders',
  transfusionMonitoringCharts: 'transfusion_monitoring_charts',
  auditLogs: 'audit_logs',
  syncStatus: 'sync_status',
  // Staff Assignments & Billing
  staffPatientAssignments: 'staff_patient_assignments',
  activityBillingRecords: 'activity_billing_records',
  // Payroll
  payrollPeriods: 'payroll_periods',
  staffPayrollRecords: 'staff_payroll_records',
  payslips: 'payslips',
  // Post-Operative Notes
  postOperativeNotes: 'post_operative_notes',
  // Preoperative Assessments
  preoperativeAssessments: 'preoperative_assessments',
  // External Reviews (Admin only)
  externalReviews: 'external_reviews',
};

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
