import api from './api';
import { offlineStorage } from './offlineStorage';

const DEVICE_ID = getOrCreateDeviceId();

function getOrCreateDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('device_id', id);
  }
  return id;
}

export const syncEngine = {
  async sync() {
    if (!navigator.onLine) return;

    // 1. Push local changes to server
    await this.pushChanges();

    // 2. Pull remote changes
    await this.pullChanges();
  },

  async pushChanges() {
    const queue = await offlineStorage.getSyncQueue();
    if (queue.length === 0) return;

    const changes = queue.map(entry => ({
      table_name: entry.table_name,
      record_id: entry.record_id,
      action: entry.action,
      payload: entry.payload,
      client_timestamp: entry.timestamp,
    }));

    try {
      const result = await api.post('/sync/push', { changes, device_id: DEVICE_ID });

      // Process results and handle conflicts
      for (const r of result.results) {
        if (r.status === 'synced') {
          // Remove from queue
          const entry = queue.find(q => q.record_id === r.record_id);
          if (entry) await offlineStorage.removeSyncEntry(entry.id);
        } else if (r.status === 'conflict') {
          // Server wins by default - remove from queue,
          // the pull will get the server version
          const entry = queue.find(q => q.record_id === r.record_id);
          if (entry) await offlineStorage.removeSyncEntry(entry.id);
        }
        // rejected entries stay in queue for retry
      }

      await offlineStorage.set('lastSync', result.server_timestamp);
    } catch (err) {
      console.error('Push sync error:', err);
    }
  },

  async pullChanges() {
    try {
      const lastSync = await offlineStorage.get('lastSync') || '1970-01-01T00:00:00Z';
      const result = await api.get(`/sync/pull?last_sync=${encodeURIComponent(lastSync)}&device_id=${DEVICE_ID}`);

      // Map server table names to local store names
      const tableToStore = {
        children: 'children',
        tasks: 'tasks',
        task_assignments: 'taskAssignments',
        wallets: 'keyval', // stored differently
        transactions: 'transactions',
        plans: 'plans',
        plan_goals: 'keyval',
        assignments: 'assignments',
        prayer_schedules: 'prayerSchedules',
        prayer_logs: 'prayerLogs',
        events: 'events',
        growth_records: 'growthRecords',
        health_records: 'healthRecords',
      };

      for (const [table, records] of Object.entries(result.changes || {})) {
        const storeName = tableToStore[table];
        if (!storeName || storeName === 'keyval') continue;

        for (const record of records) {
          const local = await offlineStorage.getById(storeName, record.id);
          if (!local || !local.version || local.version <= (record.version || 0)) {
            await offlineStorage.putItem(storeName, record);
          }
        }
      }

      await offlineStorage.set('lastSync', result.server_timestamp);
    } catch (err) {
      console.error('Pull sync error:', err);
    }
  },

  // Wrapper for offline-aware API calls
  async offlineRequest(method, endpoint, data, storeName, recordId) {
    if (navigator.onLine) {
      try {
        const result = await api[method](endpoint, data);
        if (storeName && result) {
          await offlineStorage.putItem(storeName, result);
        }
        return result;
      } catch (err) {
        // If network fails, fall through to offline handling
        if (err.message !== 'Failed to fetch') throw err;
      }
    }

    // Offline: save locally and queue for sync
    if (method === 'post' || method === 'put') {
      const id = recordId || data?.id || crypto.randomUUID();
      const localData = { ...data, id, _offline: true };

      if (storeName) {
        await offlineStorage.putItem(storeName, localData);
      }

      const tableName = storeToTable(storeName);
      if (tableName) {
        await offlineStorage.addToSyncQueue({
          table_name: tableName,
          record_id: id,
          action: method === 'post' ? 'create' : 'update',
          payload: localData,
        });
      }

      return localData;
    }

    if (method === 'delete' && storeName && recordId) {
      await offlineStorage.deleteItem(storeName, recordId);
      const tableName = storeToTable(storeName);
      if (tableName) {
        await offlineStorage.addToSyncQueue({
          table_name: tableName,
          record_id: recordId,
          action: 'delete',
          payload: null,
        });
      }
      return { message: 'Deleted offline' };
    }

    // GET: return cached data
    if (method === 'get' && storeName) {
      return offlineStorage.getAll(storeName);
    }

    throw new Error('Offline and no cached data available');
  },
};

function storeToTable(storeName) {
  const map = {
    children: 'children',
    tasks: 'tasks',
    taskAssignments: 'task_assignments',
    transactions: 'transactions',
    plans: 'plans',
    assignments: 'assignments',
    prayerSchedules: 'prayer_schedules',
    prayerLogs: 'prayer_logs',
    events: 'events',
    growthRecords: 'growth_records',
    healthRecords: 'health_records',
  };
  return map[storeName] || null;
}
