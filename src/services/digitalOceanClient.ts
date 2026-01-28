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
      return { success: false, error: error.error || 'API request failed' };
    }

    const result = await response.json();
    return { success: true, ...result };
  } catch (error: any) {
    console.error(`[DO Sync] Network error for ${action}:`, error);
    return { success: false, error: error.message || 'Network error' };
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
  users: 'users',
  patients: 'patients',
  vitalSigns: 'vital_signs',
  clinicalEncounters: 'clinical_encounters',
  surgeries: 'surgeries',
  admissions: 'admissions',
  wardRounds: 'ward_rounds',
  wounds: 'wounds',
  woundMeasurements: 'wound_measurements',
  burnAssessments: 'burn_assessments',
  burnMonitoring: 'burn_monitoring',
  labRequests: 'lab_requests',
  investigations: 'investigations',
  prescriptions: 'prescriptions',
  treatmentPlans: 'treatment_plans',
  treatmentProgress: 'treatment_progress',
  dischargeSummaries: 'discharge_summaries',
  nutritionAssessments: 'nutrition_assessments',
  appointments: 'appointments',
  invoices: 'invoices',
  invoiceItems: 'invoice_items',
  hospitals: 'hospitals',
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  chatParticipants: 'chat_participants',
  videoConferences: 'video_conferences',
  videoParticipants: 'video_participants',
  preoperativeAssessments: 'preoperative_assessments',
  postoperativeNotes: 'postoperative_notes',
  surgicalNotes: 'surgical_notes',
  externalReviews: 'external_reviews',
  mdtMeetings: 'mdt_meetings',
  bloodTransfusions: 'blood_transfusions',
  histopathologyRequests: 'histopathology_requests',
  npwtSessions: 'npwt_sessions',
  limbSalvageAssessments: 'limb_salvage_assessments',
  medicationCharts: 'medication_charts',
  medicationAdministrations: 'medication_administrations',
  shiftAssignments: 'shift_assignments',
  consumableBoms: 'consumable_boms',
  consumableBomItems: 'consumable_bom_items',
  comorbidities: 'comorbidities',
  nurseNotes: 'nurse_notes',
  webrtcSignaling: 'webrtc_signaling',
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
