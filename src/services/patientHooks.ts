// ============================================================
// AstroHEALTH Patient Hooks
// React hooks for universal patient data access
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { patientService, type PatientWithDetails, type PatientSearchOptions, type PatientFullRecord } from './patientService';
import type { Patient, VitalSigns, Admission } from '../types';

// ============================================================
// HOOK: usePatientSearch
// Universal patient search with debouncing
// ============================================================

export interface UsePatientSearchOptions extends PatientSearchOptions {
  debounceMs?: number;
  autoSearch?: boolean;
}

export interface UsePatientSearchResult {
  patients: PatientWithDetails[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  search: (query: string) => void;
  refresh: () => Promise<void>;
  setOptions: (options: Partial<PatientSearchOptions>) => void;
}

export function usePatientSearch(
  initialOptions: UsePatientSearchOptions = {}
): UsePatientSearchResult {
  const {
    query: initialQuery = '',
    debounceMs = 300,
    autoSearch = true,
    ...restOptions
  } = initialOptions;

  const [patients, setPatients] = useState<PatientWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [options, setOptionsState] = useState<PatientSearchOptions>(restOptions);
  
  const debounceTimer = useRef<NodeJS.Timeout>();
  const abortController = useRef<AbortController>();

  const performSearch = useCallback(async (searchQuery: string, searchOptions: PatientSearchOptions) => {
    // Cancel previous search
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const results = await patientService.search({
        ...searchOptions,
        query: searchQuery,
      });
      setPatients(results);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        setPatients([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the search
    debounceTimer.current = setTimeout(() => {
      performSearch(newQuery, options);
    }, debounceMs);
  }, [debounceMs, options, performSearch]);

  const refresh = useCallback(async () => {
    await performSearch(query, options);
  }, [query, options, performSearch]);

  const setOptions = useCallback((newOptions: Partial<PatientSearchOptions>) => {
    setOptionsState(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Initial search
  useEffect(() => {
    if (autoSearch) {
      performSearch(initialQuery, restOptions);
    }
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []); // Only run on mount

  // Re-search when options change
  useEffect(() => {
    if (autoSearch) {
      performSearch(query, options);
    }
  }, [options]); // Re-run when options change

  return {
    patients,
    loading,
    error,
    totalCount: patients.length,
    search,
    refresh,
    setOptions,
  };
}

// ============================================================
// HOOK: usePatientById
// Get single patient by ID with live updates
// ============================================================

export interface UsePatientByIdResult {
  patient: Patient | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePatientById(patientId: string | undefined): UsePatientByIdResult {
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live query for reactive updates
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const refresh = useCallback(async () => {
    if (!patientId) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      await patientService.refreshFromCloud(patientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh patient');
    } finally {
      setIsRefreshing(false);
    }
  }, [patientId]);

  return {
    patient,
    loading: patient === undefined || isRefreshing,
    error,
    refresh,
  };
}

// ============================================================
// HOOK: usePatientFullRecord
// Get complete patient record with all related data
// ============================================================

export interface UsePatientFullRecordResult {
  record: PatientFullRecord | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePatientFullRecord(patientId: string | undefined): UsePatientFullRecordResult {
  const [record, setRecord] = useState<PatientFullRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!patientId) {
      setRecord(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullRecord = await patientService.getFullRecord(patientId);
      setRecord(fullRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient record');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  return {
    record,
    loading,
    error,
    refresh: fetchRecord,
  };
}

// ============================================================
// HOOK: usePatientVitals
// Get patient's vital signs with live updates
// ============================================================

export interface UsePatientVitalsResult {
  vitals: VitalSigns[];
  latest: VitalSigns | undefined;
  loading: boolean;
}

export function usePatientVitals(patientId: string | undefined): UsePatientVitalsResult {
  const vitals = useLiveQuery(
    () => patientId 
      ? db.vitalSigns.where('patientId').equals(patientId).reverse().sortBy('recordedAt')
      : [],
    [patientId]
  );

  return {
    vitals: vitals || [],
    latest: vitals?.[0],
    loading: vitals === undefined,
  };
}

// ============================================================
// HOOK: usePatientAdmission
// Get patient's admission status with live updates
// ============================================================

export interface UsePatientAdmissionResult {
  admissions: Admission[];
  activeAdmission: Admission | undefined;
  isAdmitted: boolean;
  loading: boolean;
}

export function usePatientAdmission(patientId: string | undefined): UsePatientAdmissionResult {
  const admissions = useLiveQuery(
    () => patientId 
      ? db.admissions.where('patientId').equals(patientId).reverse().sortBy('admissionDate')
      : [],
    [patientId]
  );

  const activeAdmission = useMemo(() => {
    return admissions?.find(a => a.status === 'active');
  }, [admissions]);

  return {
    admissions: admissions || [],
    activeAdmission,
    isAdmitted: !!activeAdmission,
    loading: admissions === undefined,
  };
}

// ============================================================
// HOOK: useAdmittedPatients
// Get all currently admitted patients
// ============================================================

export function useAdmittedPatients() {
  const [patients, setPatients] = useState<PatientWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for admission changes
  const activeAdmissions = useLiveQuery(
    () => db.admissions.filter(a => a.status === 'active').toArray(),
    []
  );

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      const admitted = await patientService.getAdmittedPatients();
      setPatients(admitted);
      setLoading(false);
    };

    if (activeAdmissions !== undefined) {
      loadPatients();
    }
  }, [activeAdmissions]);

  return {
    patients,
    loading,
    count: patients.length,
  };
}

// ============================================================
// HOOK: usePatientSelector
// For patient selection dropdowns/search inputs
// ============================================================

export interface UsePatientSelectorResult {
  patients: Patient[];
  selectedPatient: Patient | undefined;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectPatient: (patientId: string | undefined) => void;
  clearSelection: () => void;
}

export function usePatientSelector(
  initialPatientId?: string,
  options?: { hospitalId?: string }
): UsePatientSelectorResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(initialPatientId);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Selected patient with live updates
  const selectedPatient = useLiveQuery(
    () => selectedPatientId ? db.patients.get(selectedPatientId) : undefined,
    [selectedPatientId]
  );

  // Search patients
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length < 2) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    debounceTimer.current = setTimeout(async () => {
      const results = await patientService.quickSearch(searchQuery);
      setPatients(options?.hospitalId 
        ? results.filter(p => p.registeredHospitalId === options.hospitalId)
        : results
      );
      setLoading(false);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, options?.hospitalId]);

  const selectPatient = useCallback((patientId: string | undefined) => {
    setSelectedPatientId(patientId);
    setSearchQuery('');
    setPatients([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPatientId(undefined);
    setSearchQuery('');
    setPatients([]);
  }, []);

  return {
    patients,
    selectedPatient,
    loading,
    searchQuery,
    setSearchQuery,
    selectPatient,
    clearSelection,
  };
}

// ============================================================
// HOOK: useAllPatients
// Get all patients with live updates (for lists)
// ============================================================

export function useAllPatients(options?: { hospitalId?: string; isActive?: boolean }) {
  const patients = useLiveQuery(async () => {
    let query = db.patients.orderBy('createdAt').reverse();
    let results = await query.toArray();
    
    if (options?.hospitalId) {
      results = results.filter(p => p.registeredHospitalId === options.hospitalId);
    }
    
    if (options?.isActive !== undefined) {
      results = results.filter(p => p.isActive === options.isActive);
    } else {
      results = results.filter(p => p.isActive !== false);
    }
    
    return results;
  }, [options?.hospitalId, options?.isActive]);

  return {
    patients: patients || [],
    loading: patients === undefined,
    count: patients?.length || 0,
  };
}

// ============================================================
// UTILITY: Patient map for quick lookups
// ============================================================

export function usePatientMap(): Map<string, Patient> {
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  
  return useMemo(() => {
    const map = new Map<string, Patient>();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);
}
