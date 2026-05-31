import { openDB } from 'idb';

const DB_NAME = 'FamilyApp';
const DB_VERSION = 1;

const STORES = {
  keyval: 'keyval',
  syncQueue: 'syncQueue',
  children: 'children',
  tasks: 'tasks',
  taskAssignments: 'taskAssignments',
  transactions: 'transactions',
  plans: 'plans',
  assignments: 'assignments',
  prayerSchedules: 'prayerSchedules',
  prayerLogs: 'prayerLogs',
  events: 'events',
  growthRecords: 'growthRecords',
  healthRecords: 'healthRecords',
};

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Key-value store for misc data
        if (!db.objectStoreNames.contains(STORES.keyval)) {
          db.createObjectStore(STORES.keyval);
        }

        // Sync queue for offline changes
        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp');
        }

        // Data stores
        const dataStores = [
          'children', 'tasks', 'taskAssignments', 'transactions',
          'plans', 'assignments', 'prayerSchedules', 'prayerLogs',
          'events', 'growthRecords', 'healthRecords'
        ];

        for (const name of dataStores) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export const offlineStorage = {
  // Key-value operations
  async get(key) {
    const db = await getDb();
    return db.get(STORES.keyval, key);
  },

  async set(key, value) {
    const db = await getDb();
    return db.put(STORES.keyval, value, key);
  },

  async delete(key) {
    const db = await getDb();
    return db.delete(STORES.keyval, key);
  },

  // Data store operations
  async getAll(storeName) {
    const db = await getDb();
    return db.getAll(storeName);
  },

  async getById(storeName, id) {
    const db = await getDb();
    return db.get(storeName, id);
  },

  async putItem(storeName, item) {
    const db = await getDb();
    return db.put(storeName, item);
  },

  async putMany(storeName, items) {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  },

  async deleteItem(storeName, id) {
    const db = await getDb();
    return db.delete(storeName, id);
  },

  async clearStore(storeName) {
    const db = await getDb();
    return db.clear(storeName);
  },

  // Sync queue operations
  async addToSyncQueue(entry) {
    const db = await getDb();
    return db.add(STORES.syncQueue, {
      ...entry,
      timestamp: new Date().toISOString(),
    });
  },

  async getSyncQueue() {
    const db = await getDb();
    return db.getAll(STORES.syncQueue);
  },

  async clearSyncQueue() {
    const db = await getDb();
    return db.clear(STORES.syncQueue);
  },

  async removeSyncEntry(id) {
    const db = await getDb();
    return db.delete(STORES.syncQueue, id);
  },
};

export { STORES };
