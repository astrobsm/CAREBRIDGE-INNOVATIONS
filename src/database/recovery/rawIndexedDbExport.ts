// ---------------------------------------------------------------------------
// Best-effort read of the device database WITHOUT Dexie, for the recovery
// screen. Opens 'AstroHEALTHDB' at whatever version is on disk (no version
// argument, so no upgrade runs and nothing is changed) and reads every object
// store in its own transaction: one unreadable table does not stop the rest.
// ---------------------------------------------------------------------------

import { LOCAL_DB_NAME, toJsonSafe, type TableExportResult } from './dbOpenRecovery';

const errText = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? `${(e as Error).name || 'Error'}: ${(e as Error).message}` : String(e);

/** Open the existing database read-only in practice. Resolves null if it does not exist. */
function openExisting(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    let created = false;
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      // No database on disk: the open would create an empty one. Abort it.
      created = true;
      try { req.transaction?.abort(); } catch { /* ignore */ }
    };
    req.onsuccess = () => {
      if (created) {
        req.result.close();
        resolve(null);
      } else {
        resolve(req.result);
      }
    };
    req.onerror = () => {
      if (created) resolve(null);
      else reject(req.error ?? new Error('Could not open the database.'));
    };
    req.onblocked = () => { /* waits for other tabs; the screen asks to close them */ };
  });
}

function readStoreGetAll(idb: IDBDatabase, store: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as unknown[]);
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

/** Record by record: slower, but keeps what can be read when getAll fails. */
function readStoreByCursor(idb: IDBDatabase, store: string): Promise<{ records: unknown[]; error?: string }> {
  return new Promise((resolve) => {
    const records: unknown[] = [];
    let tx: IDBTransaction;
    try {
      tx = idb.transaction(store, 'readonly');
    } catch (e) {
      resolve({ records, error: errText(e) });
      return;
    }
    const req = tx.objectStore(store).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve({ records });
        return;
      }
      records.push(cursor.value);
      cursor.continue();
    };
    req.onerror = () => resolve({ records, error: errText(req.error) });
  });
}

export interface RawExport {
  databaseVersion: number | null;
  /** True when no database exists on this device. */
  missing: boolean;
  results: TableExportResult[];
}

/**
 * Read every table. Throws only when the database cannot be opened at all.
 * `onProgress` reports each table as it is read (for the screen).
 */
export async function readAllTables(
  onProgress?: (table: string, index: number, total: number) => void,
  dbName: string = LOCAL_DB_NAME,
): Promise<RawExport> {
  const idb = await openExisting(dbName);
  if (!idb) return { databaseVersion: null, missing: true, results: [] };
  try {
    // Dexie stores version × 10; report the schema number people see in db.ts.
    const databaseVersion = idb.version ? Math.round(idb.version / 10) : null;
    const stores = Array.from(idb.objectStoreNames);
    const results: TableExportResult[] = [];
    for (let i = 0; i < stores.length; i++) {
      const name = stores[i];
      onProgress?.(name, i, stores.length);
      let raw: unknown[] = [];
      let error: string | undefined;
      try {
        raw = await readStoreGetAll(idb, name);
      } catch (e) {
        const partial = await readStoreByCursor(idb, name);
        raw = partial.records;
        error = partial.error ?? (raw.length === 0 ? errText(e) : undefined);
      }
      const records: unknown[] = [];
      for (const r of raw) records.push(await toJsonSafe(r));
      results.push({ name, records, ...(error ? { error } : {}) });
    }
    return { databaseVersion, missing: false, results };
  } finally {
    idb.close();
  }
}

/** Hand the file to the person (download; share sheet where downloads are awkward). */
export async function saveExportFile(parts: string[], fileName: string): Promise<'downloaded' | 'shared'> {
  const blob = new Blob(parts, { type: 'application/json' });
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
  }) : undefined;

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'downloaded';
  } catch (downloadError) {
    if (nav?.share && typeof File !== 'undefined') {
      const file = new File([blob], fileName, { type: 'application/json' });
      if (!nav.canShare || nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: fileName });
        return 'shared';
      }
    }
    throw downloadError;
  } finally {
    // Give the browser time to start the download before the URL is revoked.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

/** Delete the device database. Only ever called after the typed confirmation. */
export function deleteLocalDatabase(dbName: string = LOCAL_DB_NAME): Promise<'deleted' | 'blocked'> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve('deleted');
    req.onerror = () => reject(req.error ?? new Error('Could not delete the database.'));
    req.onblocked = () => resolve('blocked');
  });
}

/**
 * Drop the cached app (service worker + Cache Storage), never IndexedDB, so the
 * next load fetches the current build. For a device running an old cached copy.
 */
export async function clearCachedApp(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister().catch(() => false)));
    }
  } catch { /* best effort */ }
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n).catch(() => false)));
    }
  } catch { /* best effort */ }
}
