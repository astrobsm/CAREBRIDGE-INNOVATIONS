// Offline-first data hooks with automatic sync integration
import { useState, useEffect, useCallback } from 'react';
import { db } from '../database/db';
import { syncService } from './syncService';
import { syncRecord } from './cloudSyncService';
import type { Patient, Hospital, User } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';

// Generic offline-first hook for any Dexie table
export function useOfflineData<T extends { id: string }>(
  tableName: string,
  queryFn: () => Promise<T[]>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await queryFn();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, deps);

  const create = useCallback(async (item: Omit<T, 'id'> & { id: string }) => {
    try {
      // @ts-expect-error - dynamic table access
      await db[tableName].add(item);
      
      // Queue for sync
      await syncService.queueChange(tableName, item.id, 'create', item as unknown as Record<string, unknown>);
      
      // Refresh data
      const result = await queryFn();
      setData(result);
      
      return item;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create');
    }
  }, [tableName, queryFn]);

  const update = useCallback(async (id: string, changes: Partial<T>) => {
    try {
      // @ts-expect-error - dynamic table access
      await db[tableName].update(id, changes);
      
      // Get updated record
      // @ts-expect-error - dynamic table access
      const updated = await db[tableName].get(id);
      
      // Queue for sync
      if (updated) {
        await syncService.queueChange(tableName, id, 'update', updated as unknown as Record<string, unknown>);
      }
      
      // Refresh data
      const result = await queryFn();
      setData(result);
      
      return updated;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update');
    }
  }, [tableName, queryFn]);

  const remove = useCallback(async (id: string) => {
    try {
      // @ts-expect-error - dynamic table access
      await db[tableName].delete(id);
      
      // Queue for sync
      await syncService.queueChange(tableName, id, 'delete', { id });
      
      // Refresh data
      const result = await queryFn();
      setData(result);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete');
    }
  }, [tableName, queryFn]);

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: async () => {
      const result = await queryFn();
      setData(result);
    }
  };
}

// Hook for patients with live updates
export function usePatients(hospitalId?: string) {
  const patients = useLiveQuery(
    () => hospitalId 
      ? db.patients.where('hospitalId').equals(hospitalId).toArray()
      : db.patients.toArray(),
    [hospitalId]
  );

  const createPatient = useCallback(async (patient: Patient) => {
    await db.patients.add(patient);
    syncRecord('patients', patient as unknown as Record<string, unknown>);
    await syncService.queueChange('patients', patient.id, 'create', patient as unknown as Record<string, unknown>);
    return patient;
  }, []);

  const updatePatient = useCallback(async (id: string, changes: Partial<Patient>) => {
    await db.patients.update(id, changes);
    const updated = await db.patients.get(id);
    if (updated) {
      syncRecord('patients', updated as unknown as Record<string, unknown>);
      await syncService.queueChange('patients', id, 'update', updated as unknown as Record<string, unknown>);
    }
    return updated;
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    await db.patients.delete(id);
    await syncService.queueChange('patients', id, 'delete', { id });
  }, []);

  return {
    patients: patients || [],
    isLoading: patients === undefined,
    createPatient,
    updatePatient,
    deletePatient
  };
}

// Hook for hospitals with live updates
export function useHospitals() {
  const hospitals = useLiveQuery(() => db.hospitals.toArray());

  const createHospital = useCallback(async (hospital: Hospital) => {
    await db.hospitals.add(hospital);
    syncRecord('hospitals', hospital as unknown as Record<string, unknown>);
    await syncService.queueChange('hospitals', hospital.id, 'create', hospital as unknown as Record<string, unknown>);
    return hospital;
  }, []);

  const updateHospital = useCallback(async (id: string, changes: Partial<Hospital>) => {
    await db.hospitals.update(id, changes);
    const updated = await db.hospitals.get(id);
    if (updated) {
      syncRecord('hospitals', updated as unknown as Record<string, unknown>);
      await syncService.queueChange('hospitals', id, 'update', updated as unknown as Record<string, unknown>);
    }
    return updated;
  }, []);

  const deleteHospital = useCallback(async (id: string) => {
    await db.hospitals.delete(id);
    await syncService.queueChange('hospitals', id, 'delete', { id });
  }, []);

  return {
    hospitals: hospitals || [],
    isLoading: hospitals === undefined,
    createHospital,
    updateHospital,
    deleteHospital
  };
}

// Hook for user profile
export function useCurrentUser(userId?: string) {
  const user = useLiveQuery(
    () => userId ? db.users.get(userId) : undefined,
    [userId]
  );

  const updateUser = useCallback(async (changes: Partial<User>) => {
    if (!userId) return;
    
    await db.users.update(userId, changes);
    const updated = await db.users.get(userId);
    if (updated) {
      syncRecord('users', updated as unknown as Record<string, unknown>);
      await syncService.queueChange('users', userId, 'update', updated as unknown as Record<string, unknown>);
    }
    return updated;
  }, [userId]);

  return {
    user,
    isLoading: user === undefined,
    updateUser
  };
}

// Hook for checking network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        syncService.forceSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

// Hook for checking if data is cached locally
export function useDataAvailability() {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkData = async () => {
      try {
        const patientCount = await db.patients.count();
        const hospitalCount = await db.hospitals.count();
        setHasLocalData(patientCount > 0 || hospitalCount > 0);
      } catch {
        setHasLocalData(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkData();
  }, []);

  return { hasLocalData, isChecking };
}
