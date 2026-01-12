// Cross-Device Sync Service for AstroHEALTH
import { useState, useEffect } from 'react';
import { db } from '../database/db';
import type { Patient, Hospital, User } from '../types';

// Sync configuration
const SYNC_API_BASE = import.meta.env.VITE_SYNC_API_URL || '';
const SYNC_INTERVAL = 30000; // 30 seconds
const BATCH_SIZE = 50;

// Sync status types
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'success';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

export interface SyncRecord {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  synced: 0 | 1;  // Use 0/1 instead of boolean for IndexedDB compatibility
  retryCount: number;
  deviceId: string;
}

// Generate unique device ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('AstroHEALTH_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('AstroHEALTH_device_id', deviceId);
  }
  return deviceId;
}

// Sync queue stored in IndexedDB
class SyncQueue {
  private dbName = 'AstroHEALTHSyncQueue';
  private storeName = 'pendingSync';
  private db: IDBDatabase | null = null;
  private initAttempted = false;

  async init(): Promise<void> {
    if (this.initAttempted && this.db) return;
    this.initAttempted = true;
    
    try {
      await this.openDatabase();
    } catch (error) {
      // If opening fails, try deleting and recreating the database
      console.warn('[Sync] Database upgrade failed, recreating database...');
      await this.deleteDatabase();
      await this.openDatabase();
    }
  }

  private async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => {
        console.log('[Sync] Old database deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onblocked = () => {
        console.warn('[Sync] Database deletion blocked, proceeding anyway');
        resolve();
      };
    });
  }

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Version 3: Fixed version conflict issues
      const request = indexedDB.open(this.dbName, 3);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // Delete old store if it exists (handles all upgrade scenarios)
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName);
        }
        
        // Create fresh store with correct schema
        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tableName', 'tableName', { unique: false });
        
        if (oldVersion > 0) {
          console.log(`[Sync] Upgraded database from v${oldVersion} to v3`);
        }
      };
      
      request.onblocked = () => {
        console.warn('[Sync] Database upgrade blocked by another connection');
        reject(new Error('Database upgrade blocked'));
      };
    });
  }

  async add(record: Omit<SyncRecord, 'id' | 'synced' | 'retryCount' | 'deviceId'>): Promise<void> {
    if (!this.db) await this.init();
    
    const syncRecord: SyncRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...record,
      synced: 0,  // 0 = not synced, 1 = synced (IndexedDB compatible)
      retryCount: 0,
      deviceId: getDeviceId()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(syncRecord);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPending(): Promise<SyncRecord[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        // Get all records and filter manually to handle mixed data types
        const request = store.getAll();
        
        request.onsuccess = () => {
          const allRecords = request.result || [];
          // Filter for unsynced records (handle both 0 and false for compatibility)
          const pending = allRecords.filter(r => r.synced === 0 || r.synced === false);
          resolve(pending);
        };
        request.onerror = async () => {
          // If query fails (old schema), try to reinitialize
          console.warn('[Sync] getPending failed, reinitializing database...');
          this.db = null;
          this.initAttempted = false;
          try {
            await this.deleteDatabase();
            await this.init();
            resolve([]);
          } catch {
            resolve([]);
          }
        };
      } catch (error) {
        console.warn('[Sync] getPending error:', error);
        resolve([]);
      }
    });
  }

  async markSynced(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = 1;  // 1 = synced
          store.put(record);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async incrementRetry(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.retryCount += 1;
          store.put(record);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        // Get all records and count manually to handle mixed data types
        const request = store.getAll();
        
        request.onsuccess = () => {
          const allRecords = request.result || [];
          // Count unsynced records (handle both 0 and false for compatibility)
          const count = allRecords.filter(r => r.synced === 0 || r.synced === false).length;
          resolve(count);
        };
        request.onerror = async () => {
          // If query fails (old schema), try to reinitialize
          console.warn('[Sync] count failed, reinitializing database...');
          this.db = null;
          this.initAttempted = false;
          try {
            await this.deleteDatabase();
            await this.init();
            resolve(0);
          } catch {
            resolve(0);
          }
        };
      } catch (error) {
        console.warn('[Sync] count error:', error);
        resolve(0);
      }
    });
  }
}

// Main Sync Service
class SyncService {
  private syncQueue: SyncQueue;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    pendingChanges: 0,
    error: null,
    isOnline: navigator.onLine
  };
  private listeners: Set<(state: SyncState) => void> = new Set();

  constructor() {
    this.syncQueue = new SyncQueue();
    this.init();
  }

  private async init(): Promise<void> {
    await this.syncQueue.init();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_REQUIRED') {
          this.sync();
        }
      });
    }

    // Initial sync
    if (navigator.onLine) {
      this.startPeriodicSync();
      this.sync();
    }

    // Update pending count
    this.updatePendingCount();
  }

  private handleOnline(): void {
    this.state.isOnline = true;
    this.state.status = 'idle';
    this.notifyListeners();
    this.startPeriodicSync();
    this.sync();
  }

  private handleOffline(): void {
    this.state.isOnline = false;
    this.state.status = 'offline';
    this.notifyListeners();
    this.stopPeriodicSync();
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, SYNC_INTERVAL);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async updatePendingCount(): Promise<void> {
    this.state.pendingChanges = await this.syncQueue.count();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  // Subscribe to sync state changes
  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  // Queue a change for sync
  async queueChange(
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<void> {
    await this.syncQueue.add({
      tableName,
      recordId,
      operation,
      data,
      timestamp: Date.now()
    });
    await this.updatePendingCount();

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  // Main sync function
  async sync(): Promise<void> {
    if (this.state.status === 'syncing' || !navigator.onLine) {
      return;
    }

    this.state.status = 'syncing';
    this.state.error = null;
    this.notifyListeners();

    try {
      // Get pending changes
      const pending = await this.syncQueue.getPending();
      
      if (pending.length === 0) {
        this.state.status = 'success';
        this.state.lastSyncAt = new Date();
        this.notifyListeners();
        return;
      }

      // Process in batches
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        await this.processBatch(batch);
      }

      // Pull remote changes
      await this.pullRemoteChanges();

      this.state.status = 'success';
      this.state.lastSyncAt = new Date();
      await this.updatePendingCount();
    } catch (error) {
      console.error('[Sync] Error:', error);
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : 'Sync failed';
    }

    this.notifyListeners();
  }

  private async processBatch(batch: SyncRecord[]): Promise<void> {
    // If no API configured, just mark as synced (local-only mode)
    if (!SYNC_API_BASE) {
      for (const record of batch) {
        await this.syncQueue.markSynced(record.id);
      }
      return;
    }

    try {
      const response = await fetch(`${SYNC_API_BASE}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': getDeviceId()
        },
        body: JSON.stringify({
          changes: batch,
          deviceId: getDeviceId(),
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mark synced records
        for (const syncedId of result.synced || []) {
          await this.syncQueue.markSynced(syncedId);
        }
      } else {
        throw new Error(`Sync failed: ${response.status}`);
      }
    } catch (error) {
      // On error, increment retry count
      for (const record of batch) {
        await this.syncQueue.incrementRetry(record.id);
      }
      throw error;
    }
  }

  private async pullRemoteChanges(): Promise<void> {
    if (!SYNC_API_BASE) return;

    try {
      const lastSync = this.state.lastSyncAt?.getTime() || 0;
      
      const response = await fetch(
        `${SYNC_API_BASE}/sync/pull?since=${lastSync}&deviceId=${getDeviceId()}`,
        {
          headers: {
            'X-Device-ID': getDeviceId()
          }
        }
      );

      if (response.ok) {
        const changes = await response.json();
        await this.applyRemoteChanges(changes);
      }
    } catch (error) {
      console.error('[Sync] Pull failed:', error);
    }
  }

  private async applyRemoteChanges(changes: SyncRecord[]): Promise<void> {
    for (const change of changes) {
      // Skip changes from this device
      if (change.deviceId === getDeviceId()) continue;

      try {
        switch (change.tableName) {
          case 'patients':
            await this.applyPatientChange(change);
            break;
          case 'hospitals':
            await this.applyHospitalChange(change);
            break;
          case 'users':
            await this.applyUserChange(change);
            break;
          // Add more tables as needed
        }
      } catch (error) {
        console.error(`[Sync] Failed to apply change for ${change.tableName}:`, error);
      }
    }
  }

  private async applyPatientChange(change: SyncRecord): Promise<void> {
    const patient = change.data as unknown as Patient;
    
    switch (change.operation) {
      case 'create':
      case 'update':
        await db.patients.put(patient);
        break;
      case 'delete':
        await db.patients.delete(change.recordId);
        break;
    }
  }

  private async applyHospitalChange(change: SyncRecord): Promise<void> {
    const hospital = change.data as unknown as Hospital;
    
    switch (change.operation) {
      case 'create':
      case 'update':
        await db.hospitals.put(hospital);
        break;
      case 'delete':
        await db.hospitals.delete(change.recordId);
        break;
    }
  }

  private async applyUserChange(change: SyncRecord): Promise<void> {
    const user = change.data as unknown as User;
    
    switch (change.operation) {
      case 'create':
      case 'update':
        await db.users.put(user);
        break;
      case 'delete':
        await db.users.delete(change.recordId);
        break;
    }
  }

  // Force sync
  async forceSync(): Promise<void> {
    return this.sync();
  }

  // Get current state
  getState(): SyncState {
    return { ...this.state };
  }

  // Clear all pending syncs
  async clearPending(): Promise<void> {
    await this.syncQueue.clear();
    await this.updatePendingCount();
  }
}

// Singleton instance
export const syncService = new SyncService();

// Hook for React components
export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(syncService.getState());

  useEffect(() => {
    return syncService.subscribe(setState);
  }, []);

  return state;
}
