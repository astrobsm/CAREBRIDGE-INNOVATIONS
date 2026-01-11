// ============================================================
// CareBridge Patient Service
// Universal offline-first patient fetching with cloud sync
// ============================================================

import { db } from '../database/db';
import { supabase, isSupabaseConfigured, LOCAL_TO_CLOUD_TABLE } from './supabaseClient';
import { syncRecord } from './cloudSyncService';
import type {
  Patient,
  VitalSigns,
  Admission,
  Surgery,
  BurnAssessment,
  Wound,
  Prescription,
  Investigation,
  ClinicalEncounter,
  LabRequest,
  DischargeSummary,
  NutritionAssessment,
  BurnMonitoringRecord,
  LimbSalvageAssessment,
} from '../types';

// ============================================================
// TYPES
// ============================================================

export interface PatientWithDetails extends Patient {
  latestVitals?: VitalSigns;
  activeAdmission?: Admission;
  totalAdmissions?: number;
  totalSurgeries?: number;
  totalEncounters?: number;
}

export interface PatientSearchOptions {
  query?: string;
  hospitalId?: string;
  isActive?: boolean;
  hasActiveAdmission?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'hospitalNumber' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PatientFullRecord {
  patient: Patient;
  vitals: VitalSigns[];
  admissions: Admission[];
  surgeries: Surgery[];
  burns: BurnAssessment[];
  wounds: Wound[];
  prescriptions: Prescription[];
  investigations: Investigation[];
  encounters: ClinicalEncounter[];
  labRequests: LabRequest[];
  dischargeSummaries: DischargeSummary[];
  nutritionAssessments: NutritionAssessment[];
  burnMonitoring: BurnMonitoringRecord[];
  limbSalvage: LimbSalvageAssessment[];
}

// ============================================================
// PATIENT SERVICE
// ============================================================

class PatientService {
  // ============================================================
  // BASIC PATIENT OPERATIONS
  // ============================================================

  /**
   * Get all active patients
   */
  async getAll(): Promise<Patient[]> {
    try {
      return await db.patients.filter(p => p.isActive !== false).toArray();
    } catch (error) {
      console.error('[PatientService] Error fetching all patients:', error);
      return [];
    }
  }

  /**
   * Get patient by ID
   */
  async getById(id: string): Promise<Patient | undefined> {
    if (!id) return undefined;
    try {
      // Try local first
      let patient = await db.patients.get(id);
      
      // If not found locally and online, try cloud
      if (!patient && isSupabaseConfigured() && supabase && navigator.onLine) {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!error && data) {
          patient = this.transformFromCloud(data);
          // Cache locally
          await db.patients.put(patient);
          syncRecord('patients', patient as unknown as Record<string, unknown>);
        }
      }
      
      return patient;
    } catch (error) {
      console.error('[PatientService] Error fetching patient by ID:', error);
      return undefined;
    }
  }

  /**
   * Get patient by hospital number
   */
  async getByHospitalNumber(hospitalNumber: string): Promise<Patient | undefined> {
    if (!hospitalNumber) return undefined;
    try {
      return await db.patients.where('hospitalNumber').equals(hospitalNumber).first();
    } catch (error) {
      console.error('[PatientService] Error fetching by hospital number:', error);
      return undefined;
    }
  }

  // ============================================================
  // SEARCH AND FILTER
  // ============================================================

  /**
   * Search patients with advanced filtering
   */
  async search(options: PatientSearchOptions = {}): Promise<PatientWithDetails[]> {
    const {
      query = '',
      hospitalId,
      isActive = true,
      hasActiveAdmission,
      limit = 100,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    try {
      let patients = await db.patients.toArray();

      // Filter by active status
      if (isActive !== undefined) {
        patients = patients.filter(p => p.isActive !== !isActive);
      }

      // Filter by hospital
      if (hospitalId) {
        patients = patients.filter(p => p.registeredHospitalId === hospitalId);
      }

      // Search query
      if (query) {
        const lowerQuery = query.toLowerCase().trim();
        patients = patients.filter(p =>
          p.firstName?.toLowerCase().includes(lowerQuery) ||
          p.lastName?.toLowerCase().includes(lowerQuery) ||
          p.hospitalNumber?.toLowerCase().includes(lowerQuery) ||
          p.phone?.includes(lowerQuery) ||
          p.email?.toLowerCase().includes(lowerQuery) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowerQuery)
        );
      }

      // Sort
      patients.sort((a, b) => {
        let valueA: unknown, valueB: unknown;
        switch (sortBy) {
          case 'name':
            valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
            valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
            break;
          case 'hospitalNumber':
            valueA = a.hospitalNumber || '';
            valueB = b.hospitalNumber || '';
            break;
          case 'updatedAt':
            valueA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            valueB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            break;
          default:
            valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        }
        
        if (sortOrder === 'asc') {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        }
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      });

      // Paginate
      const paginated = patients.slice(offset, offset + limit);

      // Enrich with details
      const enriched = await Promise.all(
        paginated.map(async (patient) => {
          const [latestVitals, activeAdmission, totalAdmissions, totalSurgeries, totalEncounters] = await Promise.all([
            db.vitalSigns.where('patientId').equals(patient.id).reverse().first(),
            db.admissions.where('patientId').equals(patient.id).filter(a => a.status === 'active').first(),
            db.admissions.where('patientId').equals(patient.id).count(),
            db.surgeries.where('patientId').equals(patient.id).count(),
            db.clinicalEncounters.where('patientId').equals(patient.id).count(),
          ]);

          return {
            ...patient,
            latestVitals,
            activeAdmission,
            totalAdmissions,
            totalSurgeries,
            totalEncounters,
          } as PatientWithDetails;
        })
      );

      // Filter by active admission if needed
      if (hasActiveAdmission !== undefined) {
        return enriched.filter(p => 
          hasActiveAdmission ? !!p.activeAdmission : !p.activeAdmission
        );
      }

      return enriched;
    } catch (error) {
      console.error('[PatientService] Error searching patients:', error);
      return [];
    }
  }

  /**
   * Quick search for autocomplete (lightweight)
   */
  async quickSearch(query: string, limit: number = 10): Promise<Patient[]> {
    if (!query || query.length < 2) return [];
    
    try {
      const lowerQuery = query.toLowerCase().trim();
      const patients = await db.patients
        .filter(p => 
          p.isActive !== false && (
            p.firstName?.toLowerCase().includes(lowerQuery) ||
            p.lastName?.toLowerCase().includes(lowerQuery) ||
            p.hospitalNumber?.toLowerCase().includes(lowerQuery) ||
            p.phone?.includes(lowerQuery)
          )
        )
        .limit(limit)
        .toArray();
      
      return patients;
    } catch (error) {
      console.error('[PatientService] Error in quick search:', error);
      return [];
    }
  }

  // ============================================================
  // PATIENT DETAILS AND RECORDS
  // ============================================================

  /**
   * Get full patient record with all related data
   */
  async getFullRecord(patientId: string): Promise<PatientFullRecord | null> {
    if (!patientId) return null;

    try {
      const patient = await this.getById(patientId);
      if (!patient) return null;

      const [
        vitals,
        admissions,
        surgeries,
        burns,
        wounds,
        prescriptions,
        investigations,
        encounters,
        labRequests,
        dischargeSummaries,
        nutritionAssessments,
        burnMonitoring,
        limbSalvage,
      ] = await Promise.all([
        db.vitalSigns.where('patientId').equals(patientId).reverse().sortBy('recordedAt'),
        db.admissions.where('patientId').equals(patientId).reverse().sortBy('admissionDate'),
        db.surgeries.where('patientId').equals(patientId).reverse().sortBy('scheduledDate'),
        db.burnAssessments.where('patientId').equals(patientId).reverse().sortBy('createdAt'),
        db.wounds.where('patientId').equals(patientId).reverse().sortBy('createdAt'),
        db.prescriptions.where('patientId').equals(patientId).reverse().sortBy('prescribedAt'),
        db.investigations.where('patientId').equals(patientId).reverse().sortBy('requestedAt'),
        db.clinicalEncounters.where('patientId').equals(patientId).reverse().sortBy('createdAt'),
        db.labRequests.where('patientId').equals(patientId).reverse().sortBy('requestedAt'),
        db.dischargeSummaries.where('patientId').equals(patientId).reverse().sortBy('dischargeDate'),
        db.nutritionAssessments.where('patientId').equals(patientId).reverse().sortBy('assessedAt'),
        db.burnMonitoringRecords.where('patientId').equals(patientId).reverse().sortBy('recordedAt'),
        db.limbSalvageAssessments.where('patientId').equals(patientId).reverse().sortBy('createdAt'),
      ]);

      return {
        patient,
        vitals,
        admissions,
        surgeries,
        burns,
        wounds,
        prescriptions,
        investigations,
        encounters,
        labRequests,
        dischargeSummaries,
        nutritionAssessments,
        burnMonitoring,
        limbSalvage,
      };
    } catch (error) {
      console.error('[PatientService] Error fetching full record:', error);
      return null;
    }
  }

  /**
   * Get patient's latest vitals
   */
  async getLatestVitals(patientId: string): Promise<VitalSigns | undefined> {
    if (!patientId) return undefined;
    try {
      return await db.vitalSigns
        .where('patientId')
        .equals(patientId)
        .reverse()
        .first();
    } catch (error) {
      console.error('[PatientService] Error fetching latest vitals:', error);
      return undefined;
    }
  }

  /**
   * Get patient's active admission
   */
  async getActiveAdmission(patientId: string): Promise<Admission | undefined> {
    if (!patientId) return undefined;
    try {
      return await db.admissions
        .where('patientId')
        .equals(patientId)
        .filter(a => a.status === 'active')
        .first();
    } catch (error) {
      console.error('[PatientService] Error fetching active admission:', error);
      return undefined;
    }
  }

  /**
   * Get patients by hospital
   */
  async getByHospital(hospitalId: string): Promise<Patient[]> {
    if (!hospitalId) return [];
    try {
      return await db.patients
        .where('registeredHospitalId')
        .equals(hospitalId)
        .filter(p => p.isActive !== false)
        .toArray();
    } catch (error) {
      console.error('[PatientService] Error fetching by hospital:', error);
      return [];
    }
  }

  /**
   * Get admitted patients
   */
  async getAdmittedPatients(): Promise<PatientWithDetails[]> {
    try {
      const activeAdmissions = await db.admissions
        .filter(a => a.status === 'active')
        .toArray();
      
      const patientIds = [...new Set(activeAdmissions.map(a => a.patientId))];
      
      const patients = await Promise.all(
        patientIds.map(async (id) => {
          const patient = await this.getById(id);
          if (!patient) return null;
          
          const admission = activeAdmissions.find(a => a.patientId === id);
          const latestVitals = await this.getLatestVitals(id);
          
          return {
            ...patient,
            activeAdmission: admission,
            latestVitals,
          } as PatientWithDetails;
        })
      );

      return patients.filter((p): p is PatientWithDetails => p !== null);
    } catch (error) {
      console.error('[PatientService] Error fetching admitted patients:', error);
      return [];
    }
  }

  /**
   * Get patients scheduled for surgery
   */
  async getScheduledForSurgery(date?: Date): Promise<PatientWithDetails[]> {
    try {
      let surgeries = await db.surgeries
        .filter(s => s.status === 'scheduled' || s.status === 'planned')
        .toArray();

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        surgeries = surgeries.filter(s => {
          const scheduledDate = new Date(s.scheduledDate);
          return scheduledDate >= startOfDay && scheduledDate <= endOfDay;
        });
      }

      const patientIds = [...new Set(surgeries.map(s => s.patientId))];
      
      const patients = await Promise.all(
        patientIds.map(async (id) => {
          const patient = await this.getById(id);
          if (!patient) return null;
          
          return {
            ...patient,
          } as PatientWithDetails;
        })
      );

      return patients.filter((p): p is PatientWithDetails => p !== null);
    } catch (error) {
      console.error('[PatientService] Error fetching scheduled patients:', error);
      return [];
    }
  }

  // ============================================================
  // SYNC FROM CLOUD
  // ============================================================

  /**
   * Refresh patient data from cloud
   */
  async refreshFromCloud(patientId?: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase || !navigator.onLine) return;

    try {
      if (patientId) {
        // Refresh single patient
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (!error && data) {
          const patient = this.transformFromCloud(data);
          await db.patients.put(patient);
          syncRecord('patients', patient as unknown as Record<string, unknown>);
        }
      } else {
        // Refresh all patients
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('is_active', true);

        if (!error && data) {
          const patients = data.map(this.transformFromCloud);
          await db.patients.bulkPut(patients);
        }
      }
    } catch (error) {
      console.error('[PatientService] Error refreshing from cloud:', error);
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  /**
   * Transform cloud data to local format
   */
  private transformFromCloud(data: Record<string, unknown>): Patient {
    return {
      id: data.id as string,
      hospitalNumber: data.hospital_number as string,
      firstName: data.first_name as string,
      lastName: data.last_name as string,
      middleName: data.middle_name as string | undefined,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth as string) : undefined,
      gender: data.gender as 'male' | 'female',
      phone: data.phone as string,
      email: data.email as string | undefined,
      address: data.address as string | undefined,
      city: data.city as string | undefined,
      state: data.state as string | undefined,
      occupation: data.occupation as string | undefined,
      maritalStatus: data.marital_status as string | undefined,
      bloodGroup: data.blood_group as string | undefined,
      genotype: data.genotype as string | undefined,
      allergies: data.allergies as string[] | undefined,
      emergencyContact: data.emergency_contact as Patient['emergencyContact'] | undefined,
      nextOfKin: data.next_of_kin as Patient['nextOfKin'] | undefined,
      insurance: data.insurance as Patient['insurance'] | undefined,
      registeredHospitalId: data.registered_hospital_id as string | undefined,
      isActive: data.is_active as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    } as Patient;
  }

  /**
   * Calculate patient age
   */
  calculateAge(dateOfBirth: Date | string | undefined): string {
    if (!dateOfBirth) return 'N/A';
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 1) {
      const months = Math.floor((today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30));
      return months < 1 ? 'Infant' : `${months} months`;
    }
    
    return `${age} years`;
  }

  /**
   * Get full name
   */
  getFullName(patient: Patient | undefined): string {
    if (!patient) return 'Unknown Patient';
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
  }

  /**
   * Get display name with hospital number
   */
  getDisplayName(patient: Patient | undefined): string {
    if (!patient) return 'Unknown Patient';
    const name = this.getFullName(patient);
    return patient.hospitalNumber ? `${name} (${patient.hospitalNumber})` : name;
  }
}

// Export singleton instance
export const patientService = new PatientService();

// Export class for testing
export { PatientService };
