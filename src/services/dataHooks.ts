// ============================================================
// AstroHEALTH Sync-Aware Data Hooks
// React hooks for offline-first data operations with automatic sync
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { API, SyncAPI } from './apiService';
import { 
  initCloudSync, 
  subscribeSyncState, 
  fullSync,
  getSyncState,
  type CloudSyncState 
} from './cloudSyncService';
import type {
  Patient,
  VitalSigns,
  Admission,
  Surgery,
  BurnAssessment,
  Investigation,
  Prescription,
  LimbSalvageAssessment,
  BurnMonitoringRecord,
  EscharotomyRecord,
  SkinGraftRecord,
  BurnCarePlan,
} from '../types';

// ============================================================
// SYNC STATE HOOK
// ============================================================

export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline' | 'success';
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(() => {
    const cloudState = getSyncState();
    return {
      status: cloudState.isSyncing ? 'syncing' : cloudState.error ? 'error' : cloudState.isOnline ? 'idle' : 'offline',
      lastSyncAt: cloudState.lastSyncAt,
      pendingChanges: cloudState.pendingChanges,
      error: cloudState.error,
      isOnline: cloudState.isOnline,
    };
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState((cloudState) => {
      setState({
        status: cloudState.isSyncing ? 'syncing' : cloudState.error ? 'error' : cloudState.isOnline ? (cloudState.lastSyncAt ? 'success' : 'idle') : 'offline',
        lastSyncAt: cloudState.lastSyncAt,
        pendingChanges: cloudState.pendingChanges,
        error: cloudState.error,
        isOnline: cloudState.isOnline,
      });
    });
    return unsubscribe;
  }, []);

  return state;
}

// ============================================================
// NETWORK STATUS HOOK
// ============================================================

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ============================================================
// PATIENT HOOKS
// ============================================================

export function usePatients() {
  const patients = useLiveQuery(
    () => db.patients.filter(p => p.isActive === true).toArray(),
    []
  );

  const create = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.patients.create(patient);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Patient>) => {
    return API.patients.update(id, updates);
  }, []);

  const remove = useCallback(async (id: string) => {
    return API.patients.delete(id);
  }, []);

  const search = useCallback(async (query: string) => {
    return API.patients.search(query);
  }, []);

  return {
    patients: patients || [],
    loading: patients === undefined,
    create,
    update,
    remove,
    search,
  };
}

export function usePatient(patientId: string | undefined) {
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Use separate state for details since it's an async API call
  const [details, setDetails] = useState<{
    patient: Patient;
    vitals: VitalSigns[];
    admissions: Admission[];
    surgeries: Surgery[];
    burns: BurnAssessment[];
  } | null>(null);

  useEffect(() => {
    if (patientId) {
      API.patients.getWithDetails(patientId).then(setDetails);
    } else {
      setDetails(null);
    }
  }, [patientId]);

  return {
    patient,
    details,
    loading: patient === undefined,
  };
}

// ============================================================
// VITAL SIGNS HOOKS
// ============================================================

export function usePatientVitals(patientId: string | undefined) {
  const vitals = useLiveQuery(
    () => patientId 
      ? db.vitalSigns.where('patientId').equals(patientId).reverse().sortBy('recordedAt')
      : [],
    [patientId]
  );

  const latest = vitals?.[0];

  const create = useCallback(async (vitalSigns: Omit<VitalSigns, 'id'>) => {
    return API.vitals.create(vitalSigns);
  }, []);

  return {
    vitals: vitals || [],
    latest,
    loading: vitals === undefined,
    create,
  };
}

// ============================================================
// ADMISSION HOOKS
// ============================================================

export function useAdmissions() {
  const admissions = useLiveQuery(
    () => db.admissions.reverse().sortBy('admissionDate'),
    []
  );

  const activeAdmissions = useLiveQuery(
    () => db.admissions.where('status').equals('active').toArray(),
    []
  );

  const create = useCallback(async (admission: Omit<Admission, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.admissions.create(admission);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Admission>) => {
    return API.admissions.update(id, updates);
  }, []);

  const discharge = useCallback(async (id: string, dischargeData: Partial<Admission>) => {
    return API.admissions.discharge(id, dischargeData);
  }, []);

  return {
    admissions: admissions || [],
    activeAdmissions: activeAdmissions || [],
    loading: admissions === undefined,
    create,
    update,
    discharge,
  };
}

export function usePatientAdmission(patientId: string | undefined) {
  const admissions = useLiveQuery(
    () => patientId 
      ? db.admissions.where('patientId').equals(patientId).reverse().sortBy('admissionDate')
      : [],
    [patientId]
  );

  const activeAdmission = admissions?.find(a => a.status === 'active');

  return {
    admissions: admissions || [],
    activeAdmission,
    loading: admissions === undefined,
  };
}

// ============================================================
// SURGERY HOOKS
// ============================================================

export function useSurgeries() {
  const surgeries = useLiveQuery(
    () => db.surgeries.reverse().sortBy('scheduledDate'),
    []
  );

  const todaySurgeries = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return db.surgeries
      .where('scheduledDate')
      .between(today, tomorrow)
      .toArray();
  }, []);

  const create = useCallback(async (surgery: Omit<Surgery, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.surgeries.create(surgery);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Surgery>) => {
    return API.surgeries.update(id, updates);
  }, []);

  return {
    surgeries: surgeries || [],
    todaySurgeries: todaySurgeries || [],
    loading: surgeries === undefined,
    create,
    update,
  };
}

// ============================================================
// BURN ASSESSMENT HOOKS
// ============================================================

export function useBurnAssessments() {
  const assessments = useLiveQuery(
    () => db.burnAssessments.reverse().sortBy('createdAt'),
    []
  );

  const create = useCallback(async (assessment: Omit<BurnAssessment, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.burnAssessments.create(assessment);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<BurnAssessment>) => {
    return API.burnAssessments.update(id, updates);
  }, []);

  return {
    assessments: assessments || [],
    loading: assessments === undefined,
    create,
    update,
  };
}

export function usePatientBurnAssessments(patientId: string | undefined) {
  const assessments = useLiveQuery(
    () => patientId 
      ? db.burnAssessments.where('patientId').equals(patientId).reverse().sortBy('createdAt')
      : [],
    [patientId]
  );

  return {
    assessments: assessments || [],
    loading: assessments === undefined,
  };
}

// ============================================================
// BURN MONITORING HOOKS
// ============================================================

export function useBurnMonitoring(burnAssessmentId: string | undefined) {
  const records = useLiveQuery(
    () => burnAssessmentId
      ? db.burnMonitoringRecords
          .where('burnAssessmentId')
          .equals(burnAssessmentId)
          .reverse()
          .sortBy('recordedAt')
      : [],
    [burnAssessmentId]
  );

  const last24Hours = useLiveQuery(
    () => burnAssessmentId
      ? API.burnMonitoring.getLast24Hours(burnAssessmentId)
      : [],
    [burnAssessmentId]
  );

  const create = useCallback(async (record: Omit<BurnMonitoringRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.burnMonitoring.create(record);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<BurnMonitoringRecord>) => {
    return API.burnMonitoring.update(id, updates);
  }, []);

  return {
    records: records || [],
    last24Hours: last24Hours || [],
    loading: records === undefined,
    create,
    update,
  };
}

// ============================================================
// ESCHAROTOMY HOOKS
// ============================================================

export function useEscharotomies(burnAssessmentId: string | undefined) {
  const records = useLiveQuery(
    () => burnAssessmentId
      ? db.escharotomyRecords
          .where('burnAssessmentId')
          .equals(burnAssessmentId)
          .reverse()
          .sortBy('performedAt')
      : [],
    [burnAssessmentId]
  );

  const create = useCallback(async (record: Omit<EscharotomyRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.escharotomies.create(record);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<EscharotomyRecord>) => {
    return API.escharotomies.update(id, updates);
  }, []);

  return {
    records: records || [],
    loading: records === undefined,
    create,
    update,
  };
}

// ============================================================
// SKIN GRAFT HOOKS
// ============================================================

export function useSkinGrafts(burnAssessmentId: string | undefined) {
  const records = useLiveQuery(
    () => burnAssessmentId
      ? db.skinGraftRecords
          .where('burnAssessmentId')
          .equals(burnAssessmentId)
          .reverse()
          .sortBy('performedAt')
      : [],
    [burnAssessmentId]
  );

  const create = useCallback(async (record: Omit<SkinGraftRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.skinGrafts.create(record);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<SkinGraftRecord>) => {
    return API.skinGrafts.update(id, updates);
  }, []);

  return {
    records: records || [],
    loading: records === undefined,
    create,
    update,
  };
}

// ============================================================
// BURN CARE PLAN HOOKS
// ============================================================

export function useBurnCarePlan(burnAssessmentId: string | undefined) {
  const plan = useLiveQuery(
    () => burnAssessmentId
      ? db.burnCarePlans.where('burnAssessmentId').equals(burnAssessmentId).first()
      : undefined,
    [burnAssessmentId]
  );

  const create = useCallback(async (carePlan: Omit<BurnCarePlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.burnCarePlans.create(carePlan);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<BurnCarePlan>) => {
    return API.burnCarePlans.update(id, updates);
  }, []);

  return {
    plan,
    loading: plan === undefined,
    create,
    update,
  };
}

// ============================================================
// INVESTIGATION HOOKS
// ============================================================

export function useInvestigations() {
  const investigations = useLiveQuery(
    () => db.investigations.reverse().sortBy('requestedAt'),
    []
  );

  const pending = useLiveQuery(
    () => db.investigations.where('status').anyOf(['requested', 'collected', 'processing']).toArray(),
    []
  );

  const create = useCallback(async (investigation: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.investigations.create(investigation);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Investigation>) => {
    return API.investigations.update(id, updates);
  }, []);

  return {
    investigations: investigations || [],
    pending: pending || [],
    loading: investigations === undefined,
    create,
    update,
  };
}

export function usePatientInvestigations(patientId: string | undefined) {
  const investigations = useLiveQuery(
    () => patientId
      ? db.investigations.where('patientId').equals(patientId).reverse().sortBy('requestedAt')
      : [],
    [patientId]
  );

  return {
    investigations: investigations || [],
    loading: investigations === undefined,
  };
}

// ============================================================
// PRESCRIPTION HOOKS
// ============================================================

export function usePrescriptions() {
  const prescriptions = useLiveQuery(
    () => db.prescriptions.reverse().sortBy('prescribedAt'),
    []
  );

  const pending = useLiveQuery(
    () => db.prescriptions.where('status').anyOf(['pending', 'partially_dispensed']).toArray(),
    []
  );

  const create = useCallback(async (prescription: Omit<Prescription, 'id'>) => {
    return API.prescriptions.create(prescription);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Prescription>) => {
    return API.prescriptions.update(id, updates);
  }, []);

  return {
    prescriptions: prescriptions || [],
    pending: pending || [],
    loading: prescriptions === undefined,
    create,
    update,
  };
}

// ============================================================
// LIMB SALVAGE HOOKS
// ============================================================

export function useLimbSalvageAssessments() {
  const assessments = useLiveQuery(
    () => db.limbSalvageAssessments.reverse().sortBy('assessmentDate'),
    []
  );

  const highRisk = useLiveQuery(
    () => db.limbSalvageAssessments
      .filter(a => 
        a.limbSalvageScore?.riskCategory === 'high' || 
        a.limbSalvageScore?.riskCategory === 'very_high'
      )
      .toArray(),
    []
  );

  const create = useCallback(async (assessment: Omit<LimbSalvageAssessment, 'id' | 'createdAt' | 'updatedAt'>) => {
    return API.limbSalvage.create(assessment);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<LimbSalvageAssessment>) => {
    return API.limbSalvage.update(id, updates);
  }, []);

  return {
    assessments: assessments || [],
    highRisk: highRisk || [],
    loading: assessments === undefined,
    create,
    update,
  };
}

export function usePatientLimbSalvage(patientId: string | undefined) {
  const assessments = useLiveQuery(
    () => patientId
      ? db.limbSalvageAssessments
          .where('patientId')
          .equals(patientId)
          .reverse()
          .sortBy('assessmentDate')
      : [],
    [patientId]
  );

  return {
    assessments: assessments || [],
    loading: assessments === undefined,
  };
}

// ============================================================
// DASHBOARD HOOKS
// ============================================================

export function useDashboardStats() {
  const [stats, setStats] = useState<{
    totalPatients: number;
    activeAdmissions: number;
    todaySurgeries: number;
    pendingLabs: number;
    pendingInvestigations: number;
    pendingPrescriptions: number;
    activeBurnPatients: number;
    pendingSyncCount: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const data = await API.dashboard.getStats();
        if (mounted) {
          setStats(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { stats, loading };
}

// ============================================================
// SYNC CONTROL HOOKS
// ============================================================

export function useSync() {
  const syncState = useSyncState();
  const [syncing, setSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fullSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, []);

  const processPending = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await SyncAPI.processPendingSync();
      return result;
    } catch (error) {
      console.error('Process pending failed:', error);
      return { success: 0, failed: 0 };
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    ...syncState,
    syncing: syncing || syncState.status === 'syncing',
    triggerSync,
    processPending,
  };
}

// ============================================================
// DATA AVAILABILITY HOOK
// ============================================================

export function useDataAvailability() {
  const [hasData, setHasData] = useState<{
    patients: boolean;
    hospitals: boolean;
    users: boolean;
  }>({
    patients: false,
    hospitals: false,
    users: false,
  });

  useEffect(() => {
    const checkData = async () => {
      const [patientCount, hospitalCount, userCount] = await Promise.all([
        db.patients.count(),
        db.hospitals.count(),
        db.users.count(),
      ]);

      setHasData({
        patients: patientCount > 0,
        hospitals: hospitalCount > 0,
        users: userCount > 0,
      });
    };

    checkData();
  }, []);

  return hasData;
}

// ============================================================
// AUTO-SYNC INITIALIZATION
// ============================================================

let syncInitialized = false;

export function initializeSyncOnMount() {
  if (!syncInitialized) {
    syncInitialized = true;
    initCloudSync();
  }
}

// Hook to ensure sync is initialized
export function useInitSync() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeSyncOnMount();
    }
  }, []);
}

// ============================================================
// ALL HOOKS ALREADY EXPORTED INLINE WITH 'export function'
// ============================================================
