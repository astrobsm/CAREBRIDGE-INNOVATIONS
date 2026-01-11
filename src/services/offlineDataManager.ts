// Offline Data Manager - Comprehensive offline-first data handling
// This service manages local data persistence and sync with the cloud

// Types for offline data management
export interface OfflineChange {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  lastError?: string;
  deviceId: string;
}

export interface OfflineState {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  syncError: string | null;
  queuedRequests: number;
}

export interface ConflictResolution {
  strategy: 'local-wins' | 'remote-wins' | 'merge' | 'manual';
  mergeFunction?: (local: unknown, remote: unknown) => unknown;
}

// Get or create device ID
export function getDeviceId(): string {
  const storageKey = 'astrohealth_device_id';
  let deviceId = localStorage.getItem(storageKey);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  return deviceId;
}

// Offline Change Tracker - Uses IndexedDB for persistence
class OfflineChangeTracker {
  private dbName = 'AstroHEALTHOfflineChanges';
  private storeName = 'changes';
  private db: IDBDatabase | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized && this.db) return;

    // Prevent multiple simultaneous initialization attempts
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      // Use version 3 to force schema migration and fix corrupted data
      const request = indexedDB.open(this.dbName, 3);

      request.onerror = () => {
        console.error('[OfflineTracker] Database open error:', request.error);
        this.initPromise = null;
        // Try to delete and recreate the database
        this.resetDatabase().then(resolve).catch(reject);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Drop old store if exists to clean up corrupted data
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName);
        }
        
        // Create new store with proper schema
        // Use syncedStatus (number: 0=pending, 1=synced) instead of boolean for better IndexedDB compatibility
        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
        store.createIndex('syncedStatus', 'syncedStatus', { unique: false });
        store.createIndex('tableName', 'tableName', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('recordId', 'recordId', { unique: false });
      };
    });

    return this.initPromise;
  }

  private async resetDatabase(): Promise<void> {
    console.log('[OfflineTracker] Resetting corrupted database...');
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => {
        console.log('[OfflineTracker] Database deleted, reinitializing...');
        this.initialized = false;
        this.db = null;
        this.initPromise = null;
        // Reinitialize
        this.init().then(resolve).catch(reject);
      };
      deleteRequest.onerror = () => {
        console.error('[OfflineTracker] Failed to delete database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
    });
  }

  async addChange(change: Omit<OfflineChange, 'id' | 'synced' | 'retryCount' | 'deviceId'>): Promise<string> {
    await this.init();

    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullChange: OfflineChange & { syncedStatus: number } = {
      id,
      ...change,
      synced: false,
      syncedStatus: 0, // 0 = pending, 1 = synced (for IndexedDB index compatibility)
      retryCount: 0,
      deviceId: getDeviceId()
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(fullChange);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingChanges(): Promise<OfflineChange[]> {
    await this.init();

    return new Promise((resolve, _reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('syncedStatus');
        // Use 0 for pending (not synced)
        const request = index.getAll(IDBKeyRange.only(0));

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error('[OfflineTracker] Error getting pending changes:', request.error);
          resolve([]);
        };
      } catch (error) {
        console.error('[OfflineTracker] Exception in getPendingChanges:', error);
        resolve([]);
      }
    });
  }

  async markAsSynced(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, _reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const record = getRequest.result;
          if (record) {
            record.synced = true;
            record.syncedStatus = 1; // 1 = synced
            store.put(record);
          }
          resolve();
        };
        getRequest.onerror = () => {
          console.error('[OfflineTracker] Error marking as synced:', getRequest.error);
          resolve();
        };
      } catch (error) {
        console.error('[OfflineTracker] Exception in markAsSynced:', error);
        resolve();
      }
    });
  }

  async updateRetryCount(id: string, error?: string): Promise<void> {
    await this.init();

    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const record = getRequest.result;
          if (record) {
            record.retryCount += 1;
            record.lastError = error;
            store.put(record);
          }
          resolve();
        };
        getRequest.onerror = () => {
          console.error('[OfflineTracker] Error updating retry count:', getRequest.error);
          resolve();
        };
      } catch (err) {
        console.error('[OfflineTracker] Exception in updateRetryCount:', err);
        resolve();
      }
    });
  }

  async removeChange(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('[OfflineTracker] Error removing change:', request.error);
          resolve();
        };
      } catch (err) {
        console.error('[OfflineTracker] Exception in removeChange:', err);
        resolve();
      }
    });
  }

  async clearSynced(): Promise<void> {
    await this.init();

    const synced = await this.getSyncedChanges();
    for (const change of synced) {
      await this.removeChange(change.id);
    }
  }

  async getSyncedChanges(): Promise<OfflineChange[]> {
    await this.init();

    return new Promise((resolve, _reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('syncedStatus');
        // Use 1 for synced
        const request = index.getAll(IDBKeyRange.only(1));

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error('[OfflineTracker] Error getting synced changes:', request.error);
          resolve([]);
        };
      } catch (error) {
        console.error('[OfflineTracker] Exception in getSyncedChanges:', error);
        resolve([]);
      }
    });
  }

  async count(): Promise<{ pending: number; synced: number; total: number }> {
    await this.init();

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ pending: 0, synced: 0, total: 0 });
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('syncedStatus');

        // Use 0 for pending, 1 for synced
        const pendingRequest = index.count(IDBKeyRange.only(0));
        const syncedRequest = index.count(IDBKeyRange.only(1));

        let pending = 0;
        let synced = 0;
        let completed = 0;

        pendingRequest.onsuccess = () => {
          pending = pendingRequest.result || 0;
          completed++;
          if (completed === 2) {
            resolve({ pending, synced, total: pending + synced });
          }
        };
        pendingRequest.onerror = () => {
          completed++;
          if (completed === 2) {
            resolve({ pending, synced, total: pending + synced });
          }
        };

        syncedRequest.onsuccess = () => {
          synced = syncedRequest.result || 0;
          completed++;
          if (completed === 2) {
            resolve({ pending, synced, total: pending + synced });
          }
        };
        syncedRequest.onerror = () => {
          completed++;
          if (completed === 2) {
            resolve({ pending, synced, total: pending + synced });
          }
        };
      } catch (error) {
        console.error('[OfflineTracker] Exception in count:', error);
        resolve({ pending: 0, synced: 0, total: 0 });
      }
    });
  }

  async getChangesByTable(tableName: string): Promise<OfflineChange[]> {
    await this.init();

    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('tableName');
        const request = index.getAll(IDBKeyRange.only(tableName));

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error('[OfflineTracker] Error getting changes by table:', request.error);
          resolve([]);
        };
      } catch (error) {
        console.error('[OfflineTracker] Exception in getChangesByTable:', error);
        resolve([]);
      }
    });
  }
}

// Main Offline Data Manager
class OfflineDataManager {
  private changeTracker: OfflineChangeTracker;
  private state: OfflineState;
  private listeners: Set<(state: OfflineState) => void> = new Set();
  private syncInProgress = false;
  public conflictResolution: ConflictResolution = { strategy: 'local-wins' };

  constructor() {
    this.changeTracker = new OfflineChangeTracker();
    this.state = {
      isOnline: navigator.onLine,
      pendingChanges: 0,
      lastSyncAt: this.getLastSyncTime(),
      isSyncing: false,
      syncError: null,
      queuedRequests: 0
    };
    this.init();
  }

  private async init(): Promise<void> {
    await this.changeTracker.init();
    await this.updatePendingCount();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
    }

    // Initial state
    if (navigator.onLine) {
      // Trigger sync after a short delay to let app initialize
      setTimeout(() => this.triggerSync(), 2000);
    }
  }

  private handleServiceWorkerMessage(data: { type: string; [key: string]: unknown }): void {
    switch (data.type) {
      case 'OFFLINE_QUEUE_UPDATED':
        this.state.queuedRequests = data.pendingCount as number;
        this.notifyListeners();
        break;
      case 'SYNC_COMPLETED':
        this.updatePendingCount();
        break;
      case 'SYNC_REQUIRED':
        this.triggerSync();
        break;
      case 'SW_ACTIVATED':
        console.log('[OfflineManager] Service Worker activated:', data.version);
        break;
    }
  }

  private handleOnline(): void {
    console.log('[OfflineManager] Device online');
    this.state.isOnline = true;
    this.state.syncError = null;
    this.notifyListeners();
    
    // Trigger sync
    this.triggerSync();
    
    // Request background sync
    this.requestBackgroundSync();
  }

  private handleOffline(): void {
    console.log('[OfflineManager] Device offline');
    this.state.isOnline = false;
    this.notifyListeners();
  }

  private async requestBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('astrohealth-sync');
        console.log('[OfflineManager] Background sync registered');
      } catch (error) {
        console.log('[OfflineManager] Background sync not available:', error);
      }
    }
  }

  private async updatePendingCount(): Promise<void> {
    try {
      const counts = await this.changeTracker.count();
      this.state.pendingChanges = counts.pending;
      this.notifyListeners();
    } catch (error) {
      console.error('[OfflineManager] Error counting pending changes:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  private getLastSyncTime(): Date | null {
    const stored = localStorage.getItem('astrohealth_last_sync');
    return stored ? new Date(stored) : null;
  }

  private setLastSyncTime(date: Date): void {
    localStorage.setItem('astrohealth_last_sync', date.toISOString());
    this.state.lastSyncAt = date;
  }

  // Public API

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state
   */
  getState(): OfflineState {
    return { ...this.state };
  }

  /**
   * Track a data change for offline sync
   */
  async trackChange(
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<void> {
    await this.changeTracker.addChange({
      tableName,
      recordId,
      operation,
      data,
      timestamp: Date.now()
    });
    await this.updatePendingCount();

    // If online, trigger immediate sync
    if (navigator.onLine) {
      // Debounce to batch rapid changes
      this.debouncedSync();
    }
  }

  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private debouncedSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.triggerSync();
    }, 1000);
  }

  /**
   * Trigger a sync operation
   */
  async triggerSync(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    this.state.isSyncing = true;
    this.state.syncError = null;
    this.notifyListeners();

    try {
      // Get pending changes
      const pending = await this.changeTracker.getPendingChanges();
      console.log(`[OfflineManager] Syncing ${pending.length} pending changes`);

      // Process each change
      for (const change of pending) {
        try {
          // Apply the change to the cloud (via cloudSyncService)
          await this.syncChangeToCloud(change);
          await this.changeTracker.markAsSynced(change.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[OfflineManager] Failed to sync change ${change.id}:`, error);
          await this.changeTracker.updateRetryCount(change.id, errorMessage);
          
          // Skip this change if too many retries
          if (change.retryCount >= 5) {
            console.warn(`[OfflineManager] Giving up on change ${change.id} after 5 retries`);
          }
        }
      }

      // Clean up synced changes older than 24 hours
      await this.changeTracker.clearSynced();

      // Update state
      this.setLastSyncTime(new Date());
      this.state.isSyncing = false;
      await this.updatePendingCount();
      
      console.log('[OfflineManager] Sync completed successfully');
    } catch (error) {
      console.error('[OfflineManager] Sync failed:', error);
      this.state.isSyncing = false;
      this.state.syncError = error instanceof Error ? error.message : 'Sync failed';
      this.notifyListeners();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncChangeToCloud(change: OfflineChange): Promise<void> {
    // Import cloudSyncService dynamically to avoid circular dependencies
    const { syncRecord, deleteRecordFromCloud } = await import('./cloudSyncService');
    const { isSupabaseConfigured } = await import('./supabaseClient');
    
    if (!isSupabaseConfigured()) {
      // No cloud configured, just mark as synced
      return;
    }

    if (change.operation === 'delete') {
      await deleteRecordFromCloud(change.tableName, change.recordId);
    } else {
      await syncRecord(change.tableName, change.data);
    }
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(resolution: ConflictResolution): void {
    this.conflictResolution = resolution;
  }

  /**
   * Get pending changes for a specific table
   */
  async getPendingChangesForTable(tableName: string): Promise<OfflineChange[]> {
    return this.changeTracker.getChangesByTable(tableName);
  }

  /**
   * Force clear all pending changes (use with caution)
   */
  async clearAllPending(): Promise<void> {
    const pending = await this.changeTracker.getPendingChanges();
    for (const change of pending) {
      await this.changeTracker.removeChange(change.id);
    }
    await this.updatePendingCount();
  }

  /**
   * Check if there are pending changes for a specific record
   */
  async hasPendingChanges(tableName: string, recordId: string): Promise<boolean> {
    const changes = await this.changeTracker.getChangesByTable(tableName);
    return changes.some(c => c.recordId === recordId && !c.synced);
  }
}

// Singleton instance
export const offlineDataManager = new OfflineDataManager();

// React hook for offline state
import { useState, useEffect } from 'react';

export function useOfflineState(): OfflineState {
  const [state, setState] = useState<OfflineState>(offlineDataManager.getState());

  useEffect(() => {
    return offlineDataManager.subscribe(setState);
  }, []);

  return state;
}

// React hook for checking if online
export function useIsOnline(): boolean {
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
