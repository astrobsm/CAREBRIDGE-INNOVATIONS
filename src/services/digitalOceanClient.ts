// DigitalOcean Database Client for AstroHEALTH
// This service handles all communication with the DigitalOcean PostgreSQL database
// via the Vercel API routes

const API_BASE = '/api/db/sync';

export interface DOSyncConfig {
  apiUrl: string;
}

export interface SyncResult {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
  details?: string;
}

// Check if DigitalOcean sync is configured
export function isDOConfigured(): boolean {
  // In production, the API routes are always available
  return typeof window !== 'undefined';
}

// Generic API call helper
async function apiCall(action: string, body: Record<string, any> = {}): Promise<SyncResult> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...body }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[DO Sync] API error for ${action}:`, error);
      return { 
        success: false, 
        error: error.error || 'API request failed',
        details: error.details || error.sqlError || error.stack || JSON.stringify(error),
      };
    }

    const result = await response.json();
    if (!result.success && result.error) {
      return { 
        success: false, 
        error: result.error,
        details: result.details || result.sqlError || result.stack,
      };
    }
    return { success: true, ...result };
  } catch (error: any) {
    console.error(`[DO Sync] Network error for ${action}:`, error);
    return { 
      success: false, 
      error: error.message || 'Network error',
      details: error.stack || `Request body: ${JSON.stringify(body).substring(0, 500)}`,
    };
  }
}

// Health check
export async function checkHealth(): Promise<{ healthy: boolean; provider?: string }> {
  const result = await apiCall('health');
  return {
    healthy: result.success && (result as any).status === 'healthy',
    provider: (result as any).provider,
  };
}

// Initialize database tables
export async function initDatabase(): Promise<SyncResult> {
  return apiCall('init');
}

// Pull data from cloud
export async function pullFromCloud(table: string, since?: string): Promise<SyncResult> {
  return apiCall('pull', { table, since });
}

// Push data to cloud
export async function pushToCloud(table: string, data: any[]): Promise<SyncResult> {
  return apiCall('push', { table, data });
}

// Upsert single record
export async function upsertToCloud(table: string, data: any): Promise<SyncResult> {
  return apiCall('upsert', { table, data });
}

// Delete from cloud
export async function deleteFromCloud(table: string, filters: Record<string, any>): Promise<SyncResult> {
  return apiCall('delete', { table, filters });
}

// Query with filters
export async function queryCloud(table: string, filters?: Record<string, any>): Promise<SyncResult> {
  return apiCall('query', { table, filters });
}

// Table name mappings (camelCase to snake_case)
export const TABLE_MAPPINGS: Record<string, string> = {
  // Core tables
  users: 'users',
  hospitals: 'hospitals',
  patients: 'patients',
  
  // Clinical tables
  vitalSigns: 'vital_signs',
  clinicalEncounters: 'clinical_encounters',
  surgeries: 'surgeries',
  wounds: 'wounds',
  woundMeasurements: 'wound_measurements',
  burnAssessments: 'burn_assessments',
  burnMonitoring: 'burn_monitoring',
  burnMonitoringRecords: 'burn_monitoring_records',
  escharotomyRecords: 'escharotomy_records',
  skinGraftRecords: 'skin_graft_records',
  burnCarePlans: 'burn_care_plans',
  
  // Lab & Investigations
  labRequests: 'lab_requests',
  investigations: 'investigations',
  prescriptions: 'prescriptions',
  
  // Nutrition
  nutritionAssessments: 'nutrition_assessments',
  nutritionPlans: 'nutrition_plans',
  
  // Admissions & Ward
  admissions: 'admissions',
  admissionNotes: 'admission_notes',
  bedAssignments: 'bed_assignments',
  wardRounds: 'ward_rounds',
  doctorAssignments: 'doctor_assignments',
  nurseAssignments: 'nurse_assignments',
  nursePatientAssignments: 'nurse_patient_assignments',
  staffPatientAssignments: 'staff_patient_assignments',
  
  // Treatment
  treatmentPlans: 'treatment_plans',
  treatmentProgress: 'treatment_progress',
  dischargeSummaries: 'discharge_summaries',
  
  // Appointments
  appointments: 'appointments',
  appointmentReminders: 'appointment_reminders',
  appointmentSlots: 'appointment_slots',
  clinicSessions: 'clinic_sessions',
  
  // Billing & Invoicing
  invoices: 'invoices',
  invoiceItems: 'invoice_items',
  activityBillingRecords: 'activity_billing_records',
  payrollPeriods: 'payroll_periods',
  staffPayrollRecords: 'staff_payroll_records',
  payslips: 'payslips',
  
  // Communication
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  chatParticipants: 'chat_participants',
  videoConferences: 'video_conferences',
  videoParticipants: 'video_participants',
  enhancedVideoConferences: 'enhanced_video_conferences',
  webrtcSignaling: 'webrtc_signaling',
  
  // Surgical
  preoperativeAssessments: 'preoperative_assessments',
  postoperativeNotes: 'postoperative_notes',
  surgicalNotes: 'surgical_notes',
  consumableBoms: 'consumable_boms',
  consumableBOMs: 'consumable_boms',
  consumableBomItems: 'consumable_bom_items',
  
  // Specialized Assessments
  externalReviews: 'external_reviews',
  mdtMeetings: 'mdt_meetings',
  bloodTransfusions: 'blood_transfusions',
  histopathologyRequests: 'histopathology_requests',
  limbSalvageAssessments: 'limb_salvage_assessments',
  
  // NPWT
  npwtSessions: 'npwt_sessions',
  npwtNotifications: 'npwt_notifications',
  
  // Medication Charts
  medicationCharts: 'medication_charts',
  medicationAdministrations: 'medication_administrations',
  
  // Transfusion
  transfusionOrders: 'transfusion_orders',
  transfusionMonitoringCharts: 'transfusion_monitoring_charts',
  
  // Nursing
  shiftAssignments: 'shift_assignments',
  nurseNotes: 'nurse_notes',
  comorbidities: 'comorbidities',
  
  // Referrals & Education
  referrals: 'referrals',
  patientEducationRecords: 'patient_education_records',
  calculatorResults: 'calculator_results',
  
  // Settings
  userSettings: 'user_settings',
  hospitalSettings: 'hospital_settings',
  
  // Audit & Sync
  auditLogs: 'audit_logs',
  syncStatus: 'sync_status',
  
  // Meeting Minutes
  meetingMinutes: 'meeting_minutes',
};

// Get snake_case table name
export function getCloudTableName(localTable: string): string {
  return TABLE_MAPPINGS[localTable] || localTable.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Sync helper class for batch operations
export class DOSyncManager {
  private pendingPush: Map<string, any[]> = new Map();
  private syncInProgress: boolean = false;

  // Queue data for push
  queueForPush(table: string, data: any): void {
    const cloudTable = getCloudTableName(table);
    if (!this.pendingPush.has(cloudTable)) {
      this.pendingPush.set(cloudTable, []);
    }
    this.pendingPush.get(cloudTable)!.push(data);
  }

  // Flush all pending pushes
  async flushPending(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      for (const [table, items] of this.pendingPush.entries()) {
        if (items.length > 0) {
          await pushToCloud(table, items);
        }
      }
      this.pendingPush.clear();
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get pending count
  getPendingCount(): number {
    let count = 0;
    for (const items of this.pendingPush.values()) {
      count += items.length;
    }
    return count;
  }
}

// Singleton instance
export const doSyncManager = new DOSyncManager();
