// ============================================================
// AstroHEALTH Database Hooks
// React hooks for easy data fetching from IndexedDB
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import {
  PatientOps,
  VitalSignsOps,
  SurgeryOps,
  AdmissionOps,
  MDTMeetingOps,
  DashboardOps,
  dbOps,
} from '../database/operations';
import type {
  Patient,
  VitalSigns,
  ClinicalEncounter,
  Surgery,
  Admission,
  LabRequest,
  Investigation,
  Prescription,
  MDTMeeting,
} from '../types';

// ============================================================
// PATIENT HOOKS
// ============================================================

/**
 * Hook to get all patients with live updates
 */
export function usePatients() {
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  return {
    patients: patients ?? [],
    loading: patients === undefined,
  };
}

/**
 * Hook to get a single patient by ID with live updates
 */
export function usePatient(patientId: string | undefined) {
  const patient = useLiveQuery(
    () => (patientId ? db.patients.get(patientId) : undefined),
    [patientId]
  );
  return {
    patient,
    loading: patient === undefined && !!patientId,
  };
}

/**
 * Hook to search patients by name or hospital number
 */
export function usePatientSearch(searchQuery: string) {
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    PatientOps.searchByName(searchQuery)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [searchQuery]);

  return { results, loading };
}

/**
 * Hook to get patient with all related data
 */
export function usePatientWithDetails(patientId: string | undefined) {
  const [data, setData] = useState<{
    patient: Patient | undefined;
    vitals: VitalSigns[];
    encounters: ClinicalEncounter[];
    surgeries: Surgery[];
    admissions: Admission[];
    prescriptions: Prescription[];
    labRequests: LabRequest[];
    investigations: Investigation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await PatientOps.getWithDetails(patientId);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

// ============================================================
// VITAL SIGNS HOOKS
// ============================================================

/**
 * Hook to get vital signs for a patient with live updates
 */
export function usePatientVitals(patientId: string | undefined) {
  const vitals = useLiveQuery(
    () => (patientId ? db.vitalSigns.where('patientId').equals(patientId).reverse().sortBy('recordedAt') : []),
    [patientId]
  );
  return {
    vitals: vitals ?? [],
    loading: vitals === undefined,
  };
}

/**
 * Hook to get latest vital signs for a patient
 */
export function useLatestVitals(patientId: string | undefined) {
  const [vitals, setVitals] = useState<VitalSigns | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setVitals(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    VitalSignsOps.getLatest(patientId)
      .then(setVitals)
      .finally(() => setLoading(false));
  }, [patientId]);

  return { vitals, loading };
}

// ============================================================
// CLINICAL ENCOUNTER HOOKS
// ============================================================

/**
 * Hook to get all clinical encounters with live updates
 */
export function useEncounters() {
  const encounters = useLiveQuery(() => db.clinicalEncounters.reverse().sortBy('createdAt'), []);
  return {
    encounters: encounters ?? [],
    loading: encounters === undefined,
  };
}

/**
 * Hook to get encounters for a patient
 */
export function usePatientEncounters(patientId: string | undefined) {
  const encounters = useLiveQuery(
    () => (patientId ? db.clinicalEncounters.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    encounters: encounters ?? [],
    loading: encounters === undefined,
  };
}

// ============================================================
// SURGERY HOOKS
// ============================================================

/**
 * Hook to get all surgeries with live updates
 */
export function useSurgeries() {
  const surgeries = useLiveQuery(() => db.surgeries.reverse().sortBy('scheduledDate'), []);
  return {
    surgeries: surgeries ?? [],
    loading: surgeries === undefined,
  };
}

/**
 * Hook to get surgeries for a patient
 */
export function usePatientSurgeries(patientId: string | undefined) {
  const surgeries = useLiveQuery(
    () => (patientId ? db.surgeries.where('patientId').equals(patientId).reverse().sortBy('scheduledDate') : []),
    [patientId]
  );
  return {
    surgeries: surgeries ?? [],
    loading: surgeries === undefined,
  };
}

/**
 * Hook to get today's surgeries
 */
export function useTodaySurgeries() {
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SurgeryOps.getScheduledToday()
      .then(setSurgeries)
      .finally(() => setLoading(false));
  }, []);

  return { surgeries, loading };
}

// ============================================================
// ADMISSION HOOKS
// ============================================================

/**
 * Hook to get all admissions with live updates
 */
export function useAdmissions() {
  const admissions = useLiveQuery(() => db.admissions.reverse().sortBy('admissionDate'), []);
  return {
    admissions: admissions ?? [],
    loading: admissions === undefined,
  };
}

/**
 * Hook to get active admissions
 */
export function useActiveAdmissions() {
  const admissions = useLiveQuery(() => db.admissions.where('status').equals('active').toArray(), []);
  return {
    admissions: admissions ?? [],
    loading: admissions === undefined,
  };
}

/**
 * Hook to get admissions for a patient
 */
export function usePatientAdmissions(patientId: string | undefined) {
  const admissions = useLiveQuery(
    () => (patientId ? db.admissions.where('patientId').equals(patientId).reverse().sortBy('admissionDate') : []),
    [patientId]
  );
  return {
    admissions: admissions ?? [],
    loading: admissions === undefined,
  };
}

/**
 * Hook to get active admission for a patient
 */
export function useActiveAdmission(patientId: string | undefined) {
  const [admission, setAdmission] = useState<Admission | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setAdmission(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    AdmissionOps.getActiveByPatient(patientId)
      .then(setAdmission)
      .finally(() => setLoading(false));
  }, [patientId]);

  return { admission, loading };
}

// ============================================================
// WOUND HOOKS
// ============================================================

/**
 * Hook to get all wounds with live updates
 */
export function useWounds() {
  const wounds = useLiveQuery(() => db.wounds.reverse().sortBy('createdAt'), []);
  return {
    wounds: wounds ?? [],
    loading: wounds === undefined,
  };
}

/**
 * Hook to get wounds for a patient
 */
export function usePatientWounds(patientId: string | undefined) {
  const wounds = useLiveQuery(
    () => (patientId ? db.wounds.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    wounds: wounds ?? [],
    loading: wounds === undefined,
  };
}

// ============================================================
// BURN ASSESSMENT HOOKS
// ============================================================

/**
 * Hook to get all burn assessments with live updates
 */
export function useBurnAssessments() {
  const burns = useLiveQuery(() => db.burnAssessments.reverse().sortBy('createdAt'), []);
  return {
    burns: burns ?? [],
    loading: burns === undefined,
  };
}

/**
 * Hook to get burn assessments for a patient
 */
export function usePatientBurns(patientId: string | undefined) {
  const burns = useLiveQuery(
    () => (patientId ? db.burnAssessments.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    burns: burns ?? [],
    loading: burns === undefined,
  };
}

// ============================================================
// LAB REQUEST HOOKS
// ============================================================

/**
 * Hook to get all lab requests with live updates
 */
export function useLabRequests() {
  const labRequests = useLiveQuery(() => db.labRequests.reverse().sortBy('requestedAt'), []);
  return {
    labRequests: labRequests ?? [],
    loading: labRequests === undefined,
  };
}

/**
 * Hook to get lab requests for a patient
 */
export function usePatientLabRequests(patientId: string | undefined) {
  const labRequests = useLiveQuery(
    () => (patientId ? db.labRequests.where('patientId').equals(patientId).reverse().sortBy('requestedAt') : []),
    [patientId]
  );
  return {
    labRequests: labRequests ?? [],
    loading: labRequests === undefined,
  };
}

/**
 * Hook to get pending lab requests
 */
export function usePendingLabRequests() {
  const labRequests = useLiveQuery(
    () => db.labRequests.where('status').anyOf(['pending', 'collected', 'processing']).toArray(),
    []
  );
  return {
    labRequests: labRequests ?? [],
    loading: labRequests === undefined,
  };
}

// ============================================================
// INVESTIGATION HOOKS
// ============================================================

/**
 * Hook to get all investigations with live updates
 */
export function useInvestigations() {
  const investigations = useLiveQuery(() => db.investigations.reverse().sortBy('requestedAt'), []);
  return {
    investigations: investigations ?? [],
    loading: investigations === undefined,
  };
}

/**
 * Hook to get investigations for a patient
 */
export function usePatientInvestigations(patientId: string | undefined) {
  const investigations = useLiveQuery(
    () => (patientId ? db.investigations.where('patientId').equals(patientId).reverse().sortBy('requestedAt') : []),
    [patientId]
  );
  return {
    investigations: investigations ?? [],
    loading: investigations === undefined,
  };
}

/**
 * Hook to get pending investigations
 */
export function usePendingInvestigations() {
  const investigations = useLiveQuery(
    () => db.investigations.where('status').anyOf(['requested', 'collected', 'processing']).toArray(),
    []
  );
  return {
    investigations: investigations ?? [],
    loading: investigations === undefined,
  };
}

// ============================================================
// PRESCRIPTION HOOKS
// ============================================================

/**
 * Hook to get all prescriptions with live updates
 */
export function usePrescriptions() {
  const prescriptions = useLiveQuery(() => db.prescriptions.reverse().sortBy('prescribedAt'), []);
  return {
    prescriptions: prescriptions ?? [],
    loading: prescriptions === undefined,
  };
}

/**
 * Hook to get prescriptions for a patient
 */
export function usePatientPrescriptions(patientId: string | undefined) {
  const prescriptions = useLiveQuery(
    () => (patientId ? db.prescriptions.where('patientId').equals(patientId).reverse().sortBy('prescribedAt') : []),
    [patientId]
  );
  return {
    prescriptions: prescriptions ?? [],
    loading: prescriptions === undefined,
  };
}

/**
 * Hook to get pending prescriptions
 */
export function usePendingPrescriptions() {
  const prescriptions = useLiveQuery(
    () => db.prescriptions.where('status').anyOf(['pending', 'partially_dispensed']).toArray(),
    []
  );
  return {
    prescriptions: prescriptions ?? [],
    loading: prescriptions === undefined,
  };
}

// ============================================================
// NUTRITION HOOKS
// ============================================================

/**
 * Hook to get nutrition assessments for a patient
 */
export function usePatientNutritionAssessments(patientId: string | undefined) {
  const assessments = useLiveQuery(
    () => (patientId ? db.nutritionAssessments.where('patientId').equals(patientId).reverse().sortBy('assessedAt') : []),
    [patientId]
  );
  return {
    assessments: assessments ?? [],
    loading: assessments === undefined,
  };
}

/**
 * Hook to get nutrition plans for a patient
 */
export function usePatientNutritionPlans(patientId: string | undefined) {
  const plans = useLiveQuery(
    () => (patientId ? db.nutritionPlans.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    plans: plans ?? [],
    loading: plans === undefined,
  };
}

// ============================================================
// TREATMENT PLAN HOOKS
// ============================================================

/**
 * Hook to get all treatment plans with live updates
 */
export function useTreatmentPlans() {
  const plans = useLiveQuery(() => db.treatmentPlans.reverse().sortBy('createdAt'), []);
  return {
    plans: plans ?? [],
    loading: plans === undefined,
  };
}

/**
 * Hook to get treatment plans for a patient
 */
export function usePatientTreatmentPlans(patientId: string | undefined) {
  const plans = useLiveQuery(
    () => (patientId ? db.treatmentPlans.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    plans: plans ?? [],
    loading: plans === undefined,
  };
}

// ============================================================
// INVOICE HOOKS
// ============================================================

/**
 * Hook to get all invoices with live updates
 */
export function useInvoices() {
  const invoices = useLiveQuery(() => db.invoices.reverse().sortBy('createdAt'), []);
  return {
    invoices: invoices ?? [],
    loading: invoices === undefined,
  };
}

/**
 * Hook to get invoices for a patient
 */
export function usePatientInvoices(patientId: string | undefined) {
  const invoices = useLiveQuery(
    () => (patientId ? db.invoices.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    invoices: invoices ?? [],
    loading: invoices === undefined,
  };
}

/**
 * Hook to get pending invoices
 */
export function usePendingInvoices() {
  const invoices = useLiveQuery(
    () => db.invoices.where('status').anyOf(['pending', 'partial', 'overdue']).toArray(),
    []
  );
  return {
    invoices: invoices ?? [],
    loading: invoices === undefined,
  };
}

// ============================================================
// WARD ROUND HOOKS
// ============================================================

/**
 * Hook to get all ward rounds with live updates
 */
export function useWardRounds() {
  const rounds = useLiveQuery(() => db.wardRounds.reverse().sortBy('roundDate'), []);
  return {
    rounds: rounds ?? [],
    loading: rounds === undefined,
  };
}

/**
 * Hook to get today's ward rounds
 */
export function useTodayWardRounds() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const rounds = useLiveQuery(
    () => db.wardRounds.where('roundDate').equals(today).toArray(),
    [today]
  );
  return {
    rounds: rounds ?? [],
    loading: rounds === undefined,
  };
}

// ============================================================
// DISCHARGE SUMMARY HOOKS
// ============================================================

/**
 * Hook to get discharge summaries for a patient
 */
export function usePatientDischargeSummaries(patientId: string | undefined) {
  const summaries = useLiveQuery(
    () => (patientId ? db.dischargeSummaries.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    summaries: summaries ?? [],
    loading: summaries === undefined,
  };
}

// ============================================================
// BLOOD TRANSFUSION HOOKS
// ============================================================

/**
 * Hook to get blood transfusions for a patient
 */
export function usePatientBloodTransfusions(patientId: string | undefined) {
  const transfusions = useLiveQuery(
    () => (patientId ? db.bloodTransfusions.where('patientId').equals(patientId).reverse().sortBy('createdAt') : []),
    [patientId]
  );
  return {
    transfusions: transfusions ?? [],
    loading: transfusions === undefined,
  };
}

/**
 * Hook to get pending blood transfusions
 */
export function usePendingBloodTransfusions() {
  const transfusions = useLiveQuery(
    () => db.bloodTransfusions.where('status').anyOf(['requested', 'crossmatched', 'ready']).toArray(),
    []
  );
  return {
    transfusions: transfusions ?? [],
    loading: transfusions === undefined,
  };
}

// ============================================================
// MDT MEETING HOOKS
// ============================================================

/**
 * Hook to get MDT meetings for a patient
 */
export function usePatientMDTMeetings(patientId: string | undefined) {
  const meetings = useLiveQuery(
    () => (patientId ? db.mdtMeetings.where('patientId').equals(patientId).reverse().sortBy('meetingDate') : []),
    [patientId]
  );
  return {
    meetings: meetings ?? [],
    loading: meetings === undefined,
  };
}

/**
 * Hook to get upcoming MDT meetings
 */
export function useUpcomingMDTMeetings() {
  const [meetings, setMeetings] = useState<MDTMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    MDTMeetingOps.getUpcoming()
      .then(setMeetings)
      .finally(() => setLoading(false));
  }, []);

  return { meetings, loading };
}

// ============================================================
// HOSPITAL HOOKS
// ============================================================

/**
 * Hook to get all hospitals with live updates
 */
export function useHospitals() {
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive === true).toArray(), []);
  return {
    hospitals: hospitals ?? [],
    loading: hospitals === undefined,
  };
}

/**
 * Hook to get a hospital by ID
 */
export function useHospital(hospitalId: string | undefined) {
  const hospital = useLiveQuery(
    () => (hospitalId ? db.hospitals.get(hospitalId) : undefined),
    [hospitalId]
  );
  return {
    hospital,
    loading: hospital === undefined && !!hospitalId,
  };
}

// ============================================================
// USER HOOKS
// ============================================================

/**
 * Hook to get all users with live updates
 */
export function useUsers() {
  const users = useLiveQuery(() => db.users.filter(u => u.isActive === true).toArray(), []);
  return {
    users: users ?? [],
    loading: users === undefined,
  };
}

/**
 * Hook to get users by role
 */
export function useUsersByRole(role: string) {
  const users = useLiveQuery(
    () => db.users.where('role').equals(role).toArray(),
    [role]
  );
  return {
    users: users ?? [],
    loading: users === undefined,
  };
}

/**
 * Hook to get doctors (surgeons and anaesthetists)
 */
export function useDoctors() {
  const users = useLiveQuery(
    () => db.users.where('role').anyOf(['surgeon', 'anaesthetist']).toArray(),
    []
  );
  return {
    doctors: users ?? [],
    loading: users === undefined,
  };
}

/**
 * Hook to get nurses
 */
export function useNurses() {
  const users = useLiveQuery(
    () => db.users.where('role').equals('nurse').toArray(),
    []
  );
  return {
    nurses: users ?? [],
    loading: users === undefined,
  };
}

// ============================================================
// DASHBOARD HOOKS
// ============================================================

/**
 * Hook to get dashboard statistics
 */
export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeAdmissions: 0,
    todaySurgeries: 0,
    pendingLabs: 0,
    pendingInvestigations: 0,
    pendingPrescriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await DashboardOps.getStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

// ============================================================
// GENERIC DATA MUTATION HOOK
// ============================================================

/**
 * Generic hook for data mutations with loading and error states
 */
export function useMutation<TData, TResult>(
  mutationFn: (data: TData) => Promise<TResult>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: TData): Promise<TResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(data);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  return { mutate, loading, error };
}

// ============================================================
// EXPORT DATABASE OPERATIONS FOR DIRECT ACCESS
// ============================================================

export { dbOps };
