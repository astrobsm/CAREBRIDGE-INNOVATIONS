// ---------------------------------------------------------------------------
// What to do when the device database (IndexedDB 'AstroHEALTHDB') will not open.
// ---------------------------------------------------------------------------
// The database holds clinical work that may not have reached the cloud yet, so
// it is NEVER deleted automatically. These are the decisions, as pure
// functions (tested in __tests__/dbOpenRecovery.test.ts); the screen that acts
// on them is components/system/DatabaseRecoveryScreen.tsx and the raw reader
// is ./rawIndexedDbExport.ts.
//
//   newer_schema   The device has a NEWER schema than this build (VersionError:
//                  an old cached copy of the app is running). The data is fine;
//                  the app needs updating. Never offers deletion.
//   unavailable    IndexedDB is missing or disabled (private window, blocked
//                  site data). Nothing to export or delete.
//   storage_full   The device is out of space. Free space and retry.
//   upgrade_failed Upgrading to this build's schema failed. The upgrade is
//                  rolled back, so the data is still at the old version.
//   damaged        Anything else ("Internal error opening backing store", …).
//
// For the last three the screen tries to export every readable table to a
// JSON file first, and deletes only after the person types the confirmation
// phrase.
// ---------------------------------------------------------------------------

export const LOCAL_DB_NAME = 'AstroHEALTHDB';

/** The phrase the person types before the device database is deleted. */
export const DELETE_CONFIRMATION_PHRASE = 'DELETE LOCAL DATA';

/** localStorage key prefix cloudSyncService uses for each table's push watermark. */
export const LAST_PUSH_PREFIX = 'astro_last_push_';

export type DbOpenFailureKind =
  | 'newer_schema'
  | 'unavailable'
  | 'storage_full'
  | 'upgrade_failed'
  | 'damaged';

export interface DbOpenFailure {
  kind: DbOpenFailureKind;
  /** "Name: message" of the error and any inner error, for support. */
  detail: string;
}

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  inner?: unknown;
}

/** The error and the chain of `inner` errors Dexie wraps around the native one. */
function errorChain(error: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  let current: unknown = error;
  for (let i = 0; i < 5 && current && typeof current === 'object'; i++) {
    chain.push(current as ErrorLike);
    current = (current as ErrorLike).inner;
  }
  if (chain.length === 0 && error != null) chain.push({ name: 'Error', message: String(error) });
  return chain;
}

const nameOf = (e: ErrorLike) => (typeof e.name === 'string' ? e.name : '');
const messageOf = (e: ErrorLike) => (typeof e.message === 'string' ? e.message : '');

/** One line for the screen and for support: every error in the chain. */
export function describeDbError(error: unknown): string {
  const parts = errorChain(error)
    .map(e => [nameOf(e), messageOf(e)].filter(Boolean).join(': '))
    .filter(Boolean);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return (unique.join(' <- ') || 'Unknown error').slice(0, 500);
}

/** Which kind of failure db.open() rejected with. */
export function classifyDbOpenFailure(error: unknown): DbOpenFailureKind {
  const chain = errorChain(error);
  const names = chain.map(nameOf);
  const text = chain.map(messageOf).join(' ').toLowerCase();

  // The stored database is a higher version than this build asks for.
  if (
    names.includes('VersionError') ||
    /less than the existing version|higher version than the version requested|is higher than the requested/.test(text)
  ) {
    return 'newer_schema';
  }
  if (names.includes('MissingAPIError') || /indexeddb api missing|indexeddb is not available/.test(text)) {
    return 'unavailable';
  }
  if (names.includes('QuotaExceededError') || /quota|no space|disk is full/.test(text)) {
    return 'storage_full';
  }
  if (names.includes('UpgradeError')) return 'upgrade_failed';
  return 'damaged';
}

export interface RecoveryPlan {
  kind: DbOpenFailureKind;
  title: string;
  explanation: string;
  /** Offer "update the app" (clear the cached app shell, keep the data). */
  offerUpdate: boolean;
  /** Offer exporting the readable tables to a file. */
  offerExport: boolean;
  /** Offer deleting the device database (behind the typed confirmation). */
  offerDelete: boolean;
}

/** What the screen offers for a failure. Deletion is never offered for a newer schema. */
export function recoveryPlan(kind: DbOpenFailureKind): RecoveryPlan {
  switch (kind) {
    case 'newer_schema':
      return {
        kind,
        title: 'This copy of the app is out of date',
        explanation:
          'The data on this device was saved by a newer version of AstroHEALTH than the one now running ' +
          '(an old copy of the app was loaded from the cache). Your data is safe. Update the app to continue.',
        offerUpdate: true,
        offerExport: true,
        offerDelete: false,
      };
    case 'unavailable':
      return {
        kind,
        title: 'Offline storage is not available',
        explanation:
          'This browser is not letting AstroHEALTH use its on-device storage (for example a private window, ' +
          'or site data is blocked). Open the app in a normal browser window, or allow site data, and try again.',
        offerUpdate: false,
        offerExport: false,
        offerDelete: false,
      };
    case 'storage_full':
      return {
        kind,
        title: 'This device is out of storage space',
        explanation:
          'The on-device database could not be opened because storage is full. Free some space (photos, ' +
          'downloads, other apps) and try again. Your records are still on this device.',
        offerUpdate: false,
        offerExport: true,
        offerDelete: true,
      };
    case 'upgrade_failed':
      return {
        kind,
        title: 'The on-device database could not be updated',
        explanation:
          'Updating the on-device database for this version of the app failed. The update was rolled back, ' +
          'so your records should still be there. Try again first; if it keeps failing, save a copy of the data ' +
          'before doing anything else.',
        offerUpdate: true,
        offerExport: true,
        offerDelete: true,
      };
    case 'damaged':
    default:
      return {
        kind: 'damaged',
        title: 'The on-device database could not be opened',
        explanation:
          'AstroHEALTH could not open the records stored on this device. This is sometimes temporary: close ' +
          'other AstroHEALTH tabs and try again. If it keeps failing, save a copy of the data before doing anything else.',
        offerUpdate: false,
        offerExport: true,
        offerDelete: true,
      };
  }
}

/** Case and spacing do not matter (phone keyboards capitalise and add spaces). */
export function isDeleteConfirmed(typed: string, phrase: string = DELETE_CONFIRMATION_PHRASE): boolean {
  const norm = (s: string) => String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  return norm(typed) !== '' && norm(typed) === norm(phrase);
}

/** Whether the delete button may act. Only when offered AND confirmed by typing. */
export function canDeleteLocalDatabase(kind: DbOpenFailureKind, typed: string): boolean {
  return recoveryPlan(kind).offerDelete && isDeleteConfirmed(typed);
}

// ── Unsynced records ────────────────────────────────────────────────────────

/** A record's effective "modified" time, the way cloudSyncService decides it. */
export function recordModifiedAt(record: unknown): string | null {
  if (!record || typeof record !== 'object') return null;
  const r = record as Record<string, unknown>;
  const ts = r.updatedAt || r.createdAt || r.timestamp || r.recordedAt || r.requestedAt || r.modifiedAt;
  if (!ts) return null;
  const d = new Date(String(ts instanceof Date ? ts.toISOString() : ts));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface UnsyncedCount {
  /** False when no table has a push watermark, so nothing can be said. */
  determinable: boolean;
  /** Records changed after their table's last successful push. */
  total: number;
  perTable: Record<string, number>;
  /** Tables read but without a watermark (never pushed, or local only). */
  unknownTables: string[];
}

/**
 * How many records were changed after this device last pushed their table.
 * `lastPushFor` returns the table's watermark (ISO) or null when it has none.
 * A table with no watermark is reported as unknown, not guessed at.
 */
export function countUnsyncedRecords(
  tables: Array<{ name: string; records: unknown[] }>,
  lastPushFor: (table: string) => string | null,
): UnsyncedCount {
  const perTable: Record<string, number> = {};
  const unknownTables: string[] = [];
  let total = 0;
  let anyWatermark = false;

  for (const { name, records } of tables) {
    const mark = lastPushFor(name);
    if (!mark) {
      if (records.length > 0) unknownTables.push(name);
      continue;
    }
    anyWatermark = true;
    const markIso = new Date(mark).toISOString();
    let n = 0;
    for (const r of records) {
      const ts = recordModifiedAt(r);
      if (ts && ts > markIso) n++;
    }
    if (n > 0) perTable[name] = n;
    total += n;
  }
  return { determinable: anyWatermark, total, perTable, unknownTables };
}

/** Reads the watermarks cloudSyncService keeps in localStorage. Never throws. */
export function lastPushFromStorage(storage: Pick<Storage, 'getItem'> | null | undefined) {
  return (table: string): string | null => {
    try {
      const v = storage?.getItem(`${LAST_PUSH_PREFIX}${table}`) ?? null;
      if (!v || isNaN(new Date(v).getTime())) return null;
      return v;
    } catch {
      return null;
    }
  };
}

// ── Export file ─────────────────────────────────────────────────────────────

/** e.g. astrohealth-device-backup-20261020-143005.json (local time). */
export function exportFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `astrohealth-device-backup-${stamp}.json`;
}

export interface TableExportResult {
  name: string;
  records: unknown[];
  /** Set when the table could not be read (the others are still exported). */
  error?: string;
}

export interface ExportSummary {
  tablesRead: number;
  tablesFailed: string[];
  records: number;
}

export function summariseExport(results: TableExportResult[]): ExportSummary {
  return {
    tablesRead: results.filter(r => !r.error).length,
    tablesFailed: results.filter(r => r.error).map(r => r.name),
    records: results.reduce((n, r) => n + r.records.length, 0),
  };
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

/**
 * A copy of `value` that JSON.stringify keeps intact: Blobs (scanned pages,
 * photos) and binary arrays become base64 with their type, Dates become ISO
 * strings. Anything that cannot be converted is replaced by a marker rather
 * than failing the whole export.
 */
export async function toJsonSafe(value: unknown, depth = 0): Promise<unknown> {
  if (depth > 40) return { __unexported: 'nested too deeply' };
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;
    return value;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    try {
      const bytes = new Uint8Array(await value.arrayBuffer());
      return { __type: 'Blob', mime: value.type || 'application/octet-stream', base64: bytesToBase64(bytes) };
    } catch {
      return { __unexported: 'unreadable Blob' };
    }
  }
  if (value instanceof ArrayBuffer) return { __type: 'ArrayBuffer', base64: bytesToBase64(new Uint8Array(value)) };
  if (ArrayBuffer.isView(value)) {
    const v = value as ArrayBufferView;
    return { __type: v.constructor?.name || 'TypedArray', base64: bytesToBase64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) out.push(await toJsonSafe(item, depth + 1));
    return out;
  }
  if (value instanceof Map) return { __type: 'Map', entries: await toJsonSafe([...value.entries()], depth + 1) };
  if (value instanceof Set) return { __type: 'Set', values: await toJsonSafe([...value.values()], depth + 1) };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const safe = await toJsonSafe(v, depth + 1);
    if (safe !== undefined) out[k] = safe;
  }
  return out;
}

/**
 * The export file, as string parts (one table at a time, so a large database
 * is not built as a single giant string). Join them, or pass them to `new Blob`.
 */
export async function buildExportParts(
  results: TableExportResult[],
  meta: { exportedAt: string; databaseVersion: number | null; reason: string; appVersion?: string },
): Promise<string[]> {
  const summary = summariseExport(results);
  const header = {
    format: 'astrohealth-device-backup',
    formatVersion: 1,
    database: LOCAL_DB_NAME,
    ...meta,
    summary,
    tableErrors: Object.fromEntries(results.filter(r => r.error).map(r => [r.name, r.error])),
  };
  const parts: string[] = [`{"meta":${JSON.stringify(header)},"tables":{`];
  let first = true;
  for (const r of results) {
    if (r.error && r.records.length === 0) continue;
    parts.push(`${first ? '' : ','}${JSON.stringify(r.name)}:[`);
    first = false;
    r.records.forEach((rec, i) => {
      let json: string;
      try {
        json = JSON.stringify(rec) ?? 'null';
      } catch {
        json = JSON.stringify({ __unexported: 'record could not be serialised' });
      }
      parts.push(i === 0 ? json : `,${json}`);
    });
    parts.push(']');
  }
  parts.push('}}');
  return parts;
}
