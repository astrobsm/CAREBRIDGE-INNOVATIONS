// ============================================================
// AstroHEALTH Unified API Service
// Comprehensive offline-first API layer with automatic sync
// ============================================================

import { db } from '../database/db';
import { syncRecord } from './cloudSyncService';
import { supabase, isSupabaseConfigured, LOCAL_TO_CLOUD_TABLE } from './supabaseClient';
import type {
  User,
  Hospital,
  Patient,
  VitalSigns,
  ClinicalEncounter,
  Surgery,
  BurnAssessment,
  LabRequest,
  Prescription,
  Admission,
  Investigation,
  LimbSalvageAssessment,
  BurnMonitoringRecord,
  EscharotomyRecord,
  SkinGraftRecord,
  BurnCarePlan,
} from '../types';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// Generate unique ID
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// Get device ID for sync tracking
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('AstroHEALTH_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('AstroHEALTH_device_id', deviceId);
  }
  return deviceId;
}

// Convert camelCase to snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    let value = obj[key];
    if (value instanceof Date) {
      value = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      value = toSnakeCase(value as Record<string, unknown>);
    }
    result[snakeKey] = value;
  }
  return result;
}

// Convert snake_case to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = obj[key];
    if (typeof value === 'string' && isDateField(camelKey)) {
      value = new Date(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      value = toCamelCase(value as Record<string, unknown>);
    }
    result[camelKey] = value;
  }
  return result;
}

// Check if a field should be converted to Date
function isDateField(fieldName: string): boolean {
  const dateFields = [
    'createdAt', 'updatedAt', 'startDate', 'endDate', 'date',
    'recordedAt', 'scheduledDate', 'admissionDate', 'dischargeDate',
    'requestedAt', 'completedAt', 'collectedAt', 'prescribedAt',
    'dispensedAt', 'assessedAt', 'startedAt', 'performedAt',
    'actualStartTime', 'actualEndTime', 'expectedDischargeDate',
    'actualDischargeDate', 'expectedEndDate', 'actualEndDate',
    'agreementAcceptedAt', 'lastMessageAt', 'dateOfBirth', 'roundDate',
    'timeOfInjury', 'followUpDate', 'outcomeDate', 'reviewedAt',
    'meetingDate', 'requestDate', 'scheduledAt', 'assignedFrom',
    'assignedTo', 'assignedAt', 'scheduledStart', 'scheduledEnd',
    'actualStart', 'actualEnd', 'assessmentDate',
  ];
  return dateFields.includes(fieldName);
}

// ============================================================
// SYNC QUEUE
// ============================================================

interface SyncQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  deviceId: string;
}

class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private storageKey = 'astrohealth_sync_queue';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('[SyncQueue] Failed to save to storage:', error);
    }
  }

  add(item: Omit<SyncQueueItem, 'id' | 'synced' | 'retryCount' | 'deviceId'>): void {
    const queueItem: SyncQueueItem = {
      id: generateId('sync'),
      ...item,
      synced: false,
      retryCount: 0,
      deviceId: getDeviceId(),
    };
    this.queue.push(queueItem);
    this.saveToStorage();
  }

  getPending(): SyncQueueItem[] {
    return this.queue.filter(item => !item.synced && item.retryCount < 5);
  }

  markSynced(id: string): void {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.synced = true;
      this.saveToStorage();
    }
  }

  incrementRetry(id: string): void {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.retryCount++;
      this.saveToStorage();
    }
  }

  cleanup(): void {
    // Remove synced items older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.queue = this.queue.filter(
      item => !item.synced || item.timestamp > cutoff
    );
    this.saveToStorage();
  }

  count(): number {
    return this.getPending().length;
  }
}

const syncQueue = new SyncQueue();

// ============================================================
// BASE API OPERATIONS
// ============================================================

async function syncToCloud(
  tableName: string,
  record: Record<string, unknown>,
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    // Queue for later sync
    syncQueue.add({
      tableName,
      recordId: record.id as string,
      operation,
      data: record,
      timestamp: Date.now(),
    });
    return;
  }

  const cloudTableName = LOCAL_TO_CLOUD_TABLE[tableName];
  if (!cloudTableName) {
    console.warn(`[API] No cloud table mapping for ${tableName}`);
    return;
  }

  try {
    const preparedRecord = toSnakeCase(record);

    if (operation === 'delete') {
      const { error } = await supabase
        .from(cloudTableName)
        .delete()
        .eq('id', record.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(cloudTableName)
        .upsert(preparedRecord, { onConflict: 'id' });
      if (error) throw error;
    }
  } catch (error) {
    console.warn(`[API] Cloud sync failed for ${tableName}:`, error);
    // Queue for retry
    syncQueue.add({
      tableName,
      recordId: record.id as string,
      operation,
      data: record,
      timestamp: Date.now(),
    });
  }
}

// ============================================================
// PATIENT API
// ============================================================

export const PatientAPI = {
  async getAll(): Promise<Patient[]> {
    return db.patients.filter(p => p.isActive === true).toArray();
  },

  async getById(id: string): Promise<Patient | undefined> {
    return db.patients.get(id);
  },

  async getByHospitalNumber(hospitalNumber: string): Promise<Patient | undefined> {
    return db.patients.where('hospitalNumber').equals(hospitalNumber).first();
  },

  async search(query: string): Promise<Patient[]> {
    const lowerQuery = query.toLowerCase();
    return db.patients
      .filter(p => 
        (p.firstName || '').toLowerCase().includes(lowerQuery) ||
        (p.lastName || '').toLowerCase().includes(lowerQuery) ||
        (p.hospitalNumber?.toLowerCase().includes(lowerQuery) ?? false)
      )
      .toArray();
  },

  async getByHospital(hospitalId: string): Promise<Patient[]> {
    return db.patients.where('registeredHospitalId').equals(hospitalId).toArray();
  },

  async create(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    const newPatient: Patient = {
      ...patient,
      id: generateId('pat'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Patient;
    
    await db.patients.add(newPatient);
    syncRecord('patients', newPatient as unknown as Record<string, unknown>);
    syncToCloud('patients', newPatient as unknown as Record<string, unknown>, 'create');
    return newPatient;
  },

  async update(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.patients.update(id, updated);
    
    const patient = await db.patients.get(id);
    if (patient) {
      syncRecord('patients', patient as unknown as Record<string, unknown>);
      syncToCloud('patients', patient as unknown as Record<string, unknown>, 'update');
    }
    return patient;
  },

  async delete(id: string): Promise<void> {
    await db.patients.update(id, { isActive: false, updatedAt: new Date() });
    const patient = await db.patients.get(id);
    if (patient) {
      syncRecord('patients', patient as unknown as Record<string, unknown>);
      syncToCloud('patients', patient as unknown as Record<string, unknown>, 'update');
    }
  },

  async getWithDetails(id: string): Promise<{
    patient: Patient | undefined;
    vitals: VitalSigns[];
    encounters: ClinicalEncounter[];
    surgeries: Surgery[];
    admissions: Admission[];
    prescriptions: Prescription[];
    labRequests: LabRequest[];
    investigations: Investigation[];
  }> {
    const [patient, vitalsRaw, encountersRaw, surgeriesRaw, admissionsRaw, prescriptionsRaw, labRequestsRaw, investigationsRaw] = await Promise.all([
      db.patients.get(id),
      db.vitalSigns.where('patientId').equals(id).toArray(),
      db.clinicalEncounters.where('patientId').equals(id).toArray(),
      db.surgeries.where('patientId').equals(id).toArray(),
      db.admissions.where('patientId').equals(id).toArray(),
      db.prescriptions.where('patientId').equals(id).toArray(),
      db.labRequests.where('patientId').equals(id).toArray(),
      db.investigations.where('patientId').equals(id).toArray(),
    ]);
    
    // Sort all arrays by their respective date fields in descending order (newest first)
    const vitals = vitalsRaw.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const encounters = encountersRaw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const surgeries = surgeriesRaw.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    const admissions = admissionsRaw.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
    const prescriptions = prescriptionsRaw.sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());
    const labRequests = labRequestsRaw.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    const investigations = investigationsRaw.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    
    return { patient, vitals, encounters, surgeries, admissions, prescriptions, labRequests, investigations };
  },
};

// ============================================================
// VITAL SIGNS API
// ============================================================

export const VitalSignsAPI = {
  async getByPatient(patientId: string): Promise<VitalSigns[]> {
    const vitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
    // Sort by recordedAt descending (newest first)
    return vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  },

  async getLatest(patientId: string): Promise<VitalSigns | undefined> {
    const vitals = await db.vitalSigns
      .where('patientId')
      .equals(patientId)
      .toArray();
    // Sort by recordedAt descending (newest first) and get first
    vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    return vitals[0];
  },

  async create(vitals: Omit<VitalSigns, 'id'>): Promise<VitalSigns> {
    const newVitals: VitalSigns = {
      ...vitals,
      id: generateId('vitals'),
    };
    
    await db.vitalSigns.add(newVitals);
    syncRecord('vitalSigns', newVitals as unknown as Record<string, unknown>);
    syncToCloud('vitalSigns', newVitals as unknown as Record<string, unknown>, 'create');
    return newVitals;
  },

  async update(id: string, updates: Partial<VitalSigns>): Promise<VitalSigns | undefined> {
    await db.vitalSigns.update(id, updates);
    const vitals = await db.vitalSigns.get(id);
    if (vitals) {
      syncRecord('vitalSigns', vitals as unknown as Record<string, unknown>);
      syncToCloud('vitalSigns', vitals as unknown as Record<string, unknown>, 'update');
    }
    return vitals;
  },
};

// ============================================================
// ADMISSION API
// ============================================================

export const AdmissionAPI = {
  async getAll(): Promise<Admission[]> {
    return db.admissions.reverse().sortBy('admissionDate');
  },

  async getById(id: string): Promise<Admission | undefined> {
    return db.admissions.get(id);
  },

  async getByPatient(patientId: string): Promise<Admission[]> {
    return db.admissions.where('patientId').equals(patientId).reverse().sortBy('admissionDate');
  },

  async getActive(): Promise<Admission[]> {
    return db.admissions.where('status').equals('active').toArray();
  },

  async getActiveByPatient(patientId: string): Promise<Admission | undefined> {
    return db.admissions
      .where('patientId').equals(patientId)
      .filter(a => a.status === 'active')
      .first();
  },

  async getByWard(wardName: string): Promise<Admission[]> {
    return db.admissions
      .where('status').equals('active')
      .filter(a => a.wardName === wardName)
      .toArray();
  },

  async create(admission: Omit<Admission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Admission> {
    const newAdmission: Admission = {
      ...admission,
      id: generateId('adm'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Admission;
    
    await db.admissions.add(newAdmission);
    syncRecord('admissions', newAdmission as unknown as Record<string, unknown>);
    syncToCloud('admissions', newAdmission as unknown as Record<string, unknown>, 'create');
    return newAdmission;
  },

  async update(id: string, updates: Partial<Admission>): Promise<Admission | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.admissions.update(id, updated);
    
    const admission = await db.admissions.get(id);
    if (admission) {
      syncRecord('admissions', admission as unknown as Record<string, unknown>);
      syncToCloud('admissions', admission as unknown as Record<string, unknown>, 'update');
    }
    return admission;
  },

  async discharge(id: string, dischargeData: Partial<Admission>): Promise<Admission | undefined> {
    const updated = {
      ...dischargeData,
      status: 'discharged' as const,
      dischargeDate: new Date(),
      updatedAt: new Date(),
    };
    await db.admissions.update(id, updated);
    
    const admission = await db.admissions.get(id);
    if (admission) {
      syncRecord('admissions', admission as unknown as Record<string, unknown>);
      syncToCloud('admissions', admission as unknown as Record<string, unknown>, 'update');
    }
    return admission;
  },
};

// ============================================================
// SURGERY API
// ============================================================

export const SurgeryAPI = {
  async getAll(): Promise<Surgery[]> {
    return db.surgeries.reverse().sortBy('scheduledDate');
  },

  async getById(id: string): Promise<Surgery | undefined> {
    return db.surgeries.get(id);
  },

  async getByPatient(patientId: string): Promise<Surgery[]> {
    return db.surgeries.where('patientId').equals(patientId).reverse().sortBy('scheduledDate');
  },

  async getByStatus(status: string): Promise<Surgery[]> {
    return db.surgeries.where('status').equals(status).toArray();
  },

  async getScheduledToday(): Promise<Surgery[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return db.surgeries
      .where('scheduledDate')
      .between(today, tomorrow)
      .toArray();
  },

  async create(surgery: Omit<Surgery, 'id' | 'createdAt' | 'updatedAt'>): Promise<Surgery> {
    const newSurgery: Surgery = {
      ...surgery,
      id: generateId('surg'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Surgery;
    
    await db.surgeries.add(newSurgery);
    syncRecord('surgeries', newSurgery as unknown as Record<string, unknown>);
    syncToCloud('surgeries', newSurgery as unknown as Record<string, unknown>, 'create');
    return newSurgery;
  },

  async update(id: string, updates: Partial<Surgery>): Promise<Surgery | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.surgeries.update(id, updated);
    
    const surgery = await db.surgeries.get(id);
    if (surgery) {
      syncRecord('surgeries', surgery as unknown as Record<string, unknown>);
      syncToCloud('surgeries', surgery as unknown as Record<string, unknown>, 'update');
    }
    return surgery;
  },
};

// ============================================================
// BURN ASSESSMENT API
// ============================================================

export const BurnAssessmentAPI = {
  async getAll(): Promise<BurnAssessment[]> {
    return db.burnAssessments.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<BurnAssessment | undefined> {
    return db.burnAssessments.get(id);
  },

  async getByPatient(patientId: string): Promise<BurnAssessment[]> {
    return db.burnAssessments.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async create(assessment: Omit<BurnAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<BurnAssessment> {
    const newAssessment: BurnAssessment = {
      ...assessment,
      id: generateId('burn'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BurnAssessment;
    
    await db.burnAssessments.add(newAssessment);
    syncRecord('burnAssessments', newAssessment as unknown as Record<string, unknown>);
    syncToCloud('burnAssessments', newAssessment as unknown as Record<string, unknown>, 'create');
    return newAssessment;
  },

  async update(id: string, updates: Partial<BurnAssessment>): Promise<BurnAssessment | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.burnAssessments.update(id, updated);
    
    const assessment = await db.burnAssessments.get(id);
    if (assessment) {
      syncRecord('burnAssessments', assessment as unknown as Record<string, unknown>);
      syncToCloud('burnAssessments', assessment as unknown as Record<string, unknown>, 'update');
    }
    return assessment;
  },
};

// ============================================================
// BURN MONITORING API
// ============================================================

export const BurnMonitoringAPI = {
  async getAll(): Promise<BurnMonitoringRecord[]> {
    return db.burnMonitoringRecords.reverse().sortBy('recordedAt');
  },

  async getById(id: string): Promise<BurnMonitoringRecord | undefined> {
    return db.burnMonitoringRecords.get(id);
  },

  async getByBurnAssessment(burnAssessmentId: string): Promise<BurnMonitoringRecord[]> {
    return db.burnMonitoringRecords
      .where('burnAssessmentId')
      .equals(burnAssessmentId)
      .reverse()
      .sortBy('recordedAt');
  },

  async getByPatient(patientId: string): Promise<BurnMonitoringRecord[]> {
    return db.burnMonitoringRecords
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('recordedAt');
  },

  async getLast24Hours(burnAssessmentId: string): Promise<BurnMonitoringRecord[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db.burnMonitoringRecords
      .where('burnAssessmentId')
      .equals(burnAssessmentId)
      .filter(r => new Date(r.recordedAt) >= cutoff)
      .sortBy('recordedAt');
  },

  async create(record: Omit<BurnMonitoringRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BurnMonitoringRecord> {
    const newRecord: BurnMonitoringRecord = {
      ...record,
      id: generateId('bmon'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BurnMonitoringRecord;
    
    await db.burnMonitoringRecords.add(newRecord);
    syncRecord('burnMonitoringRecords', newRecord as unknown as Record<string, unknown>);
    syncToCloud('burnMonitoringRecords', newRecord as unknown as Record<string, unknown>, 'create');
    return newRecord;
  },

  async update(id: string, updates: Partial<BurnMonitoringRecord>): Promise<BurnMonitoringRecord | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.burnMonitoringRecords.update(id, updated);
    
    const record = await db.burnMonitoringRecords.get(id);
    if (record) {
      syncRecord('burnMonitoringRecords', record as unknown as Record<string, unknown>);
      syncToCloud('burnMonitoringRecords', record as unknown as Record<string, unknown>, 'update');
    }
    return record;
  },
};

// ============================================================
// ESCHAROTOMY API
// ============================================================

export const EscharotomyAPI = {
  async getAll(): Promise<EscharotomyRecord[]> {
    return db.escharotomyRecords.reverse().sortBy('performedAt');
  },

  async getById(id: string): Promise<EscharotomyRecord | undefined> {
    return db.escharotomyRecords.get(id);
  },

  async getByBurnAssessment(burnAssessmentId: string): Promise<EscharotomyRecord[]> {
    return db.escharotomyRecords
      .where('burnAssessmentId')
      .equals(burnAssessmentId)
      .reverse()
      .sortBy('performedAt');
  },

  async getByPatient(patientId: string): Promise<EscharotomyRecord[]> {
    return db.escharotomyRecords
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('performedAt');
  },

  async create(record: Omit<EscharotomyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscharotomyRecord> {
    const newRecord: EscharotomyRecord = {
      ...record,
      id: generateId('esch'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EscharotomyRecord;
    
    await db.escharotomyRecords.add(newRecord);
    syncRecord('escharotomyRecords', newRecord as unknown as Record<string, unknown>);
    syncToCloud('escharotomyRecords', newRecord as unknown as Record<string, unknown>, 'create');
    return newRecord;
  },

  async update(id: string, updates: Partial<EscharotomyRecord>): Promise<EscharotomyRecord | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.escharotomyRecords.update(id, updated);
    
    const record = await db.escharotomyRecords.get(id);
    if (record) {
      syncRecord('escharotomyRecords', record as unknown as Record<string, unknown>);
      syncToCloud('escharotomyRecords', record as unknown as Record<string, unknown>, 'update');
    }
    return record;
  },
};

// ============================================================
// SKIN GRAFT API
// ============================================================

export const SkinGraftAPI = {
  async getAll(): Promise<SkinGraftRecord[]> {
    return db.skinGraftRecords.reverse().sortBy('performedAt');
  },

  async getById(id: string): Promise<SkinGraftRecord | undefined> {
    return db.skinGraftRecords.get(id);
  },

  async getByBurnAssessment(burnAssessmentId: string): Promise<SkinGraftRecord[]> {
    return db.skinGraftRecords
      .where('burnAssessmentId')
      .equals(burnAssessmentId)
      .reverse()
      .sortBy('performedAt');
  },

  async getByPatient(patientId: string): Promise<SkinGraftRecord[]> {
    return db.skinGraftRecords
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('performedAt');
  },

  async create(record: Omit<SkinGraftRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SkinGraftRecord> {
    const newRecord: SkinGraftRecord = {
      ...record,
      id: generateId('graft'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SkinGraftRecord;
    
    await db.skinGraftRecords.add(newRecord);
    syncRecord('skinGraftRecords', newRecord as unknown as Record<string, unknown>);
    syncToCloud('skinGraftRecords', newRecord as unknown as Record<string, unknown>, 'create');
    return newRecord;
  },

  async update(id: string, updates: Partial<SkinGraftRecord>): Promise<SkinGraftRecord | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.skinGraftRecords.update(id, updated);
    
    const record = await db.skinGraftRecords.get(id);
    if (record) {
      syncRecord('skinGraftRecords', record as unknown as Record<string, unknown>);
      syncToCloud('skinGraftRecords', record as unknown as Record<string, unknown>, 'update');
    }
    return record;
  },
};

// ============================================================
// BURN CARE PLAN API
// ============================================================

export const BurnCarePlanAPI = {
  async getAll(): Promise<BurnCarePlan[]> {
    return db.burnCarePlans.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<BurnCarePlan | undefined> {
    return db.burnCarePlans.get(id);
  },

  async getByBurnAssessment(burnAssessmentId: string): Promise<BurnCarePlan | undefined> {
    return db.burnCarePlans
      .where('burnAssessmentId')
      .equals(burnAssessmentId)
      .first();
  },

  async getByPatient(patientId: string): Promise<BurnCarePlan[]> {
    return db.burnCarePlans
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('createdAt');
  },

  async getActive(patientId: string): Promise<BurnCarePlan | undefined> {
    return db.burnCarePlans
      .where('patientId')
      .equals(patientId)
      .filter(p => p.status === 'active')
      .first();
  },

  async create(plan: Omit<BurnCarePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<BurnCarePlan> {
    const newPlan: BurnCarePlan = {
      ...plan,
      id: generateId('bcp'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BurnCarePlan;
    
    await db.burnCarePlans.add(newPlan);
    syncRecord('burnCarePlans', newPlan as unknown as Record<string, unknown>);
    syncToCloud('burnCarePlans', newPlan as unknown as Record<string, unknown>, 'create');
    return newPlan;
  },

  async update(id: string, updates: Partial<BurnCarePlan>): Promise<BurnCarePlan | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.burnCarePlans.update(id, updated);
    
    const plan = await db.burnCarePlans.get(id);
    if (plan) {
      syncRecord('burnCarePlans', plan as unknown as Record<string, unknown>);
      syncToCloud('burnCarePlans', plan as unknown as Record<string, unknown>, 'update');
    }
    return plan;
  },
};

// ============================================================
// INVESTIGATION API
// ============================================================

export const InvestigationAPI = {
  async getAll(): Promise<Investigation[]> {
    return db.investigations.reverse().sortBy('requestedAt');
  },

  async getById(id: string): Promise<Investigation | undefined> {
    return db.investigations.get(id);
  },

  async getByPatient(patientId: string): Promise<Investigation[]> {
    return db.investigations.where('patientId').equals(patientId).reverse().sortBy('requestedAt');
  },

  async getByStatus(status: string): Promise<Investigation[]> {
    return db.investigations.where('status').equals(status).toArray();
  },

  async getByCategory(category: string): Promise<Investigation[]> {
    return db.investigations.where('category').equals(category).toArray();
  },

  async getPending(): Promise<Investigation[]> {
    return db.investigations.where('status').anyOf(['requested', 'collected', 'processing']).toArray();
  },

  async create(investigation: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Investigation> {
    const newInvestigation: Investigation = {
      ...investigation,
      id: generateId('inv'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Investigation;
    
    await db.investigations.add(newInvestigation);
    syncRecord('investigations', newInvestigation as unknown as Record<string, unknown>);
    syncToCloud('investigations', newInvestigation as unknown as Record<string, unknown>, 'create');
    return newInvestigation;
  },

  async update(id: string, updates: Partial<Investigation>): Promise<Investigation | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.investigations.update(id, updated);
    
    const investigation = await db.investigations.get(id);
    if (investigation) {
      syncRecord('investigations', investigation as unknown as Record<string, unknown>);
      syncToCloud('investigations', investigation as unknown as Record<string, unknown>, 'update');
    }
    return investigation;
  },
};

// ============================================================
// PRESCRIPTION API
// ============================================================

export const PrescriptionAPI = {
  async getAll(): Promise<Prescription[]> {
    return db.prescriptions.reverse().sortBy('prescribedAt');
  },

  async getById(id: string): Promise<Prescription | undefined> {
    return db.prescriptions.get(id);
  },

  async getByPatient(patientId: string): Promise<Prescription[]> {
    return db.prescriptions.where('patientId').equals(patientId).reverse().sortBy('prescribedAt');
  },

  async getByStatus(status: string): Promise<Prescription[]> {
    return db.prescriptions.where('status').equals(status).toArray();
  },

  async getPending(): Promise<Prescription[]> {
    return db.prescriptions.where('status').anyOf(['pending', 'partially_dispensed']).toArray();
  },

  async create(prescription: Omit<Prescription, 'id'>): Promise<Prescription> {
    const newPrescription: Prescription = {
      ...prescription,
      id: generateId('rx'),
    };
    
    await db.prescriptions.add(newPrescription);
    syncRecord('prescriptions', newPrescription as unknown as Record<string, unknown>);
    syncToCloud('prescriptions', newPrescription as unknown as Record<string, unknown>, 'create');
    return newPrescription;
  },

  async update(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    await db.prescriptions.update(id, updates);
    
    const prescription = await db.prescriptions.get(id);
    if (prescription) {
      syncRecord('prescriptions', prescription as unknown as Record<string, unknown>);
      syncToCloud('prescriptions', prescription as unknown as Record<string, unknown>, 'update');
    }
    return prescription;
  },
};

// ============================================================
// LIMB SALVAGE API
// ============================================================

export const LimbSalvageAPI = {
  async getAll(): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments.reverse().sortBy('assessmentDate');
  },

  async getById(id: string): Promise<LimbSalvageAssessment | undefined> {
    return db.limbSalvageAssessments.get(id);
  },

  async getByPatient(patientId: string): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('assessmentDate');
  },

  async getByStatus(status: 'draft' | 'completed' | 'reviewed'): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments.where('status').equals(status).toArray();
  },

  async getHighRisk(): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments
      .filter(a => 
        a.limbSalvageScore?.riskCategory === 'high' || 
        a.limbSalvageScore?.riskCategory === 'very_high'
      )
      .toArray();
  },

  async create(assessment: Omit<LimbSalvageAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<LimbSalvageAssessment> {
    const newAssessment: LimbSalvageAssessment = {
      ...assessment,
      id: generateId('limb'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LimbSalvageAssessment;
    
    await db.limbSalvageAssessments.add(newAssessment);
    syncRecord('limbSalvageAssessments', newAssessment as unknown as Record<string, unknown>);
    syncToCloud('limbSalvageAssessments', newAssessment as unknown as Record<string, unknown>, 'create');
    return newAssessment;
  },

  async update(id: string, updates: Partial<LimbSalvageAssessment>): Promise<LimbSalvageAssessment | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.limbSalvageAssessments.update(id, updated);
    
    const assessment = await db.limbSalvageAssessments.get(id);
    if (assessment) {
      syncRecord('limbSalvageAssessments', assessment as unknown as Record<string, unknown>);
      syncToCloud('limbSalvageAssessments', assessment as unknown as Record<string, unknown>, 'update');
    }
    return assessment;
  },
};

// ============================================================
// HOSPITAL API
// ============================================================

export const HospitalAPI = {
  async getAll(): Promise<Hospital[]> {
    return db.hospitals.filter(h => h.isActive === true).toArray();
  },

  async getById(id: string): Promise<Hospital | undefined> {
    return db.hospitals.get(id);
  },

  async create(hospital: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>): Promise<Hospital> {
    const newHospital: Hospital = {
      ...hospital,
      id: generateId('hosp'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Hospital;
    
    await db.hospitals.add(newHospital);
    syncRecord('hospitals', newHospital as unknown as Record<string, unknown>);
    syncToCloud('hospitals', newHospital as unknown as Record<string, unknown>, 'create');
    return newHospital;
  },

  async update(id: string, updates: Partial<Hospital>): Promise<Hospital | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.hospitals.update(id, updated);
    
    const hospital = await db.hospitals.get(id);
    if (hospital) {
      syncRecord('hospitals', hospital as unknown as Record<string, unknown>);
      syncToCloud('hospitals', hospital as unknown as Record<string, unknown>, 'update');
    }
    return hospital;
  },
};

// ============================================================
// USER API
// ============================================================

export const UserAPI = {
  async getAll(): Promise<User[]> {
    return db.users.filter(u => u.isActive === true).toArray();
  },

  async getById(id: string): Promise<User | undefined> {
    return db.users.get(id);
  },

  async getByEmail(email: string): Promise<User | undefined> {
    return db.users.where('email').equals(email).first();
  },

  async getByRole(role: string): Promise<User[]> {
    return db.users.where('role').equals(role).toArray();
  },

  async getByHospital(hospitalId: string): Promise<User[]> {
    return db.users.where('hospitalId').equals(hospitalId).toArray();
  },

  async getDoctors(): Promise<User[]> {
    return db.users.where('role').anyOf(['surgeon', 'anaesthetist']).toArray();
  },

  async getNurses(): Promise<User[]> {
    return db.users.where('role').equals('nurse').toArray();
  },

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: generateId('user'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
    
    await db.users.add(newUser);
    syncRecord('users', newUser as unknown as Record<string, unknown>);
    syncToCloud('users', newUser as unknown as Record<string, unknown>, 'create');
    return newUser;
  },

  async update(id: string, updates: Partial<User>): Promise<User | undefined> {
    const updated = { ...updates, updatedAt: new Date() };
    await db.users.update(id, updated);
    
    const user = await db.users.get(id);
    if (user) {
      syncRecord('users', user as unknown as Record<string, unknown>);
      syncToCloud('users', user as unknown as Record<string, unknown>, 'update');
    }
    return user;
  },
};

// ============================================================
// DASHBOARD STATS API
// ============================================================

export const DashboardAPI = {
  async getStats(): Promise<{
    totalPatients: number;
    activeAdmissions: number;
    todaySurgeries: number;
    pendingLabs: number;
    pendingInvestigations: number;
    pendingPrescriptions: number;
    activeBurnPatients: number;
    pendingSyncCount: number;
  }> {
    const [
      totalPatients,
      activeAdmissions,
      todaySurgeries,
      pendingLabs,
      pendingInvestigations,
      pendingPrescriptions,
      activeBurnPatients,
    ] = await Promise.all([
      db.patients.filter(p => p.isActive === true).count(),
      db.admissions.where('status').equals('active').count(),
      SurgeryAPI.getScheduledToday().then(s => s.length),
      db.labRequests.where('status').anyOf(['pending', 'collected', 'processing']).count(),
      db.investigations.where('status').anyOf(['requested', 'collected', 'processing']).count(),
      db.prescriptions.where('status').anyOf(['pending', 'partially_dispensed']).count(),
      db.burnCarePlans.where('status').equals('active').count(),
    ]);

    return {
      totalPatients,
      activeAdmissions,
      todaySurgeries,
      pendingLabs,
      pendingInvestigations,
      pendingPrescriptions,
      activeBurnPatients,
      pendingSyncCount: syncQueue.count(),
    };
  },

  async getRecentActivity(): Promise<{
    recentAdmissions: Admission[];
    recentSurgeries: Surgery[];
    recentEncounters: ClinicalEncounter[];
  }> {
    const [recentAdmissions, recentSurgeries, recentEncounters] = await Promise.all([
      db.admissions.reverse().sortBy('createdAt').then(a => a.slice(0, 5)),
      db.surgeries.reverse().sortBy('createdAt').then(s => s.slice(0, 5)),
      db.clinicalEncounters.reverse().sortBy('createdAt').then(e => e.slice(0, 5)),
    ]);

    return { recentAdmissions, recentSurgeries, recentEncounters };
  },
};

// ============================================================
// SYNC MANAGEMENT
// ============================================================

export const SyncAPI = {
  getPendingCount(): number {
    return syncQueue.count();
  },

  async processPendingSync(): Promise<{ success: number; failed: number }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: 0, failed: 0 };
    }

    const pending = syncQueue.getPending();
    let success = 0;
    let failed = 0;

    for (const item of pending) {
      const cloudTableName = LOCAL_TO_CLOUD_TABLE[item.tableName];
      if (!cloudTableName) {
        syncQueue.markSynced(item.id);
        continue;
      }

      try {
        const preparedRecord = toSnakeCase(item.data);

        if (item.operation === 'delete') {
          const { error } = await supabase
            .from(cloudTableName)
            .delete()
            .eq('id', item.recordId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from(cloudTableName)
            .upsert(preparedRecord, { onConflict: 'id' });
          if (error) throw error;
        }

        syncQueue.markSynced(item.id);
        success++;
      } catch (error) {
        console.warn(`[SyncAPI] Failed to sync ${item.tableName}:`, error);
        syncQueue.incrementRetry(item.id);
        failed++;
      }
    }

    syncQueue.cleanup();
    return { success, failed };
  },

  async pullFromCloud(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    const tablesToSync = Object.entries(LOCAL_TO_CLOUD_TABLE);
    
    for (const [localTable, cloudTable] of tablesToSync) {
      try {
        const { data, error } = await supabase
          .from(cloudTable)
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1000);

        if (error) {
          console.warn(`[SyncAPI] Error pulling ${cloudTable}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          const records = data.map(record => toCamelCase(record));
          
          for (const record of records) {
            try {
              const localRecord = await (db as any)[localTable].get(record.id);
              
              if (!localRecord) {
                await (db as any)[localTable].add(record);
              } else {
                const localUpdated = new Date(String(localRecord.updatedAt || '1970-01-01')).getTime();
                const cloudUpdated = new Date(String((record as any).updatedAt || '1970-01-01')).getTime();
                
                if (cloudUpdated > localUpdated) {
                  await (db as any)[localTable].put(record);
                }
              }
            } catch (err) {
              try {
                await (db as any)[localTable].put(record);
              } catch {
                // Ignore individual record errors
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[SyncAPI] Failed to pull ${cloudTable}:`, error);
      }
    }
  },

  async fullSync(): Promise<void> {
    await this.pullFromCloud();
    await this.processPendingSync();
  },
};

// ============================================================
// EXPORT ALL APIS
// ============================================================

export const API = {
  patients: PatientAPI,
  vitals: VitalSignsAPI,
  admissions: AdmissionAPI,
  surgeries: SurgeryAPI,
  burnAssessments: BurnAssessmentAPI,
  burnMonitoring: BurnMonitoringAPI,
  escharotomies: EscharotomyAPI,
  skinGrafts: SkinGraftAPI,
  burnCarePlans: BurnCarePlanAPI,
  investigations: InvestigationAPI,
  prescriptions: PrescriptionAPI,
  limbSalvage: LimbSalvageAPI,
  hospitals: HospitalAPI,
  users: UserAPI,
  dashboard: DashboardAPI,
  sync: SyncAPI,
  generateId,
  getDeviceId,
};

export default API;
