// ---------------------------------------------------------------------------
// The device database is never deleted automatically when it fails to open.
// A newer schema on the device (an old cached build) is an update, never a
// delete; anything else gets an export first and a typed confirmation.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DELETE_CONFIRMATION_PHRASE,
  buildExportParts,
  canDeleteLocalDatabase,
  classifyDbOpenFailure,
  countUnsyncedRecords,
  describeDbError,
  exportFileName,
  isDeleteConfirmed,
  lastPushFromStorage,
  recordModifiedAt,
  recoveryPlan,
  summariseExport,
  toJsonSafe,
  type DbOpenFailureKind,
} from '../dbOpenRecovery';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// Shapes Dexie 3 rejects db.open() with: its own error wrapping the native one.
const dom = (name: string, message: string) => ({ name, message });
const dexie = (name: string, inner: { name: string; message: string } | null, message?: string) => ({
  name,
  message: message ?? (inner ? `${inner.name} ${inner.message}` : name),
  inner,
});

const chromeVersion = dexie('VersionError', dom('VersionError', 'The requested version (920) is less than the existing version (930).'));
const firefoxVersion = dom('VersionError', 'The operation failed because the stored database is a higher version than the version requested.');
const openFailedVersion = dexie('OpenFailedError', chromeVersion);
const backingStore = dexie('UnknownError', dom('UnknownError', 'Internal error opening backing store for indexedDB.open.'));
const openFailedUnknown = dexie('OpenFailedError', backingStore);
const upgrade = dexie('UpgradeError', null, 'Not yet support for changing primary key');
const quota = dexie('QuotaExceededError', dom('QuotaExceededError', 'The quota has been exceeded.'));
const missing = dexie('MissingAPIError', null, 'IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb');
const corrupted = new Error('Database corrupted');

describe('classifyDbOpenFailure', () => {
  it('a newer schema on the device is newer_schema, however it is wrapped', () => {
    expect(classifyDbOpenFailure(chromeVersion)).toBe('newer_schema');
    expect(classifyDbOpenFailure(firefoxVersion)).toBe('newer_schema');
    expect(classifyDbOpenFailure(openFailedVersion)).toBe('newer_schema');
    expect(classifyDbOpenFailure(new Error('The requested version (10) is less than the existing version (20).'))).toBe('newer_schema');
  });

  it('classifies the other failures', () => {
    expect(classifyDbOpenFailure(backingStore)).toBe('damaged');
    expect(classifyDbOpenFailure(openFailedUnknown)).toBe('damaged');
    expect(classifyDbOpenFailure(corrupted)).toBe('damaged');
    expect(classifyDbOpenFailure(upgrade)).toBe('upgrade_failed');
    expect(classifyDbOpenFailure(quota)).toBe('storage_full');
    expect(classifyDbOpenFailure(missing)).toBe('unavailable');
  });

  it('copes with non-errors', () => {
    expect(classifyDbOpenFailure(undefined)).toBe('damaged');
    expect(classifyDbOpenFailure('boom')).toBe('damaged');
    expect(classifyDbOpenFailure({ inner: { inner: { inner: {} } } })).toBe('damaged');
  });
});

describe('describeDbError', () => {
  it('lists the chain once each', () => {
    expect(describeDbError(openFailedUnknown)).toContain('Internal error opening backing store');
    expect(describeDbError(openFailedUnknown)).toContain('OpenFailedError');
    expect(describeDbError(undefined)).toBe('Unknown error');
    expect(describeDbError('plain')).toBe('Error: plain');
    expect(describeDbError({ name: 'X', message: 'y'.repeat(2000) }).length).toBeLessThanOrEqual(500);
  });
});

describe('recoveryPlan', () => {
  const kinds: DbOpenFailureKind[] = ['newer_schema', 'unavailable', 'storage_full', 'upgrade_failed', 'damaged'];

  it('a newer schema never offers deletion, and offers the update', () => {
    const plan = recoveryPlan('newer_schema');
    expect(plan.offerDelete).toBe(false);
    expect(plan.offerUpdate).toBe(true);
    expect(plan.explanation).toMatch(/safe/i);
  });

  it('every plan that offers deletion also offers an export', () => {
    for (const k of kinds) {
      const plan = recoveryPlan(k);
      if (plan.offerDelete) expect(plan.offerExport, k).toBe(true);
    }
  });

  it('no storage: nothing to export or delete', () => {
    expect(recoveryPlan('unavailable')).toMatchObject({ offerExport: false, offerDelete: false });
  });
});

describe('typed confirmation', () => {
  it('requires the phrase', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('   ')).toBe(false);
    expect(isDeleteConfirmed('delete')).toBe(false);
    expect(isDeleteConfirmed('DELETE')).toBe(false);
    expect(isDeleteConfirmed('yes')).toBe(false);
    expect(isDeleteConfirmed(DELETE_CONFIRMATION_PHRASE)).toBe(true);
  });

  it('ignores case and spacing from phone keyboards', () => {
    expect(isDeleteConfirmed('Delete local data')).toBe(true);
    expect(isDeleteConfirmed('  delete   LOCAL data ')).toBe(true);
  });

  it('never allows a delete for a newer schema or missing storage, even when typed', () => {
    expect(canDeleteLocalDatabase('newer_schema', DELETE_CONFIRMATION_PHRASE)).toBe(false);
    expect(canDeleteLocalDatabase('unavailable', DELETE_CONFIRMATION_PHRASE)).toBe(false);
    expect(canDeleteLocalDatabase('damaged', '')).toBe(false);
    expect(canDeleteLocalDatabase('damaged', DELETE_CONFIRMATION_PHRASE)).toBe(true);
    expect(canDeleteLocalDatabase('upgrade_failed', DELETE_CONFIRMATION_PHRASE)).toBe(true);
    expect(canDeleteLocalDatabase('storage_full', DELETE_CONFIRMATION_PHRASE)).toBe(true);
  });
});

describe('unsynced records', () => {
  const mark = '2026-10-20T10:00:00.000Z';
  const tables = [
    {
      name: 'patients',
      records: [
        { id: 'a', updatedAt: '2026-10-20T09:00:00.000Z' }, // synced
        { id: 'b', updatedAt: '2026-10-20T11:00:00.000Z' }, // after the push
        { id: 'c', createdAt: new Date('2026-10-20T12:00:00.000Z') }, // Date, after
        { id: 'd' }, // no timestamp: cannot tell, not counted
      ],
    },
    { name: 'vitalSigns', records: [{ id: 'v', recordedAt: '2026-10-21T00:00:00.000Z' }] },
    { name: 'localOnly', records: [{ id: 'x', updatedAt: '2026-10-21T00:00:00.000Z' }] },
    { name: 'emptyNoMark', records: [] },
  ];
  const marks: Record<string, string> = { patients: mark, vitalSigns: mark };

  it('counts records changed after their table was last pushed', () => {
    const r = countUnsyncedRecords(tables, t => marks[t] ?? null);
    expect(r.determinable).toBe(true);
    expect(r.total).toBe(3);
    expect(r.perTable).toEqual({ patients: 2, vitalSigns: 1 });
    expect(r.unknownTables).toEqual(['localOnly']);
  });

  it('is not determinable without any watermark', () => {
    const r = countUnsyncedRecords(tables, () => null);
    expect(r.determinable).toBe(false);
    expect(r.total).toBe(0);
  });

  it('reads watermarks from storage and survives a throwing or junk storage', () => {
    const store = { getItem: (k: string) => (k === 'astro_last_push_patients' ? mark : k === 'astro_last_push_bad' ? 'nope' : null) };
    expect(lastPushFromStorage(store)('patients')).toBe(mark);
    expect(lastPushFromStorage(store)('bad')).toBeNull();
    expect(lastPushFromStorage(store)('other')).toBeNull();
    expect(lastPushFromStorage({ getItem: () => { throw new Error('blocked'); } })('patients')).toBeNull();
    expect(lastPushFromStorage(null)('patients')).toBeNull();
  });

  it('recordModifiedAt follows the sync engine fallbacks', () => {
    expect(recordModifiedAt({ requestedAt: '2026-01-01T00:00:00Z' })).toBe('2026-01-01T00:00:00.000Z');
    expect(recordModifiedAt({ updatedAt: 'garbage' })).toBeNull();
    expect(recordModifiedAt(null)).toBeNull();
  });
});

describe('export file', () => {
  it('names the file with a local timestamp', () => {
    expect(exportFileName(new Date(2026, 9, 20, 14, 3, 5))).toBe('astrohealth-device-backup-20261020-140305.json');
  });

  it('builds valid JSON table by table, keeping readable tables when one fails', async () => {
    const results = [
      { name: 'patients', records: [{ id: 'a' }, { id: 'b' }] },
      { name: 'broken', records: [], error: 'UnknownError: backing store' },
      { name: 'partial', records: [{ id: 'p' }], error: 'cursor failed after 1' },
      { name: 'empty', records: [] },
    ];
    const parts = await buildExportParts(results, { exportedAt: '2026-10-20T00:00:00.000Z', databaseVersion: 92, reason: 'damaged: x' });
    const parsed = JSON.parse(parts.join(''));
    expect(parsed.meta.summary).toEqual({ tablesRead: 2, tablesFailed: ['broken', 'partial'], records: 3 });
    expect(parsed.meta.tableErrors.broken).toMatch(/backing store/);
    expect(parsed.meta.databaseVersion).toBe(92);
    expect(parsed.tables.patients).toHaveLength(2);
    expect(parsed.tables.partial).toEqual([{ id: 'p' }]);
    expect(parsed.tables.empty).toEqual([]);
    expect('broken' in parsed.tables).toBe(false);
    expect(summariseExport(results).records).toBe(3);
  });

  it('a record that cannot be serialised is marked, not fatal', async () => {
    const cyclic: Record<string, unknown> = { id: 'c' };
    cyclic.self = cyclic;
    const parts = await buildExportParts([{ name: 't', records: [cyclic, { id: 'ok' }] }], { exportedAt: 'x', databaseVersion: null, reason: 'r' });
    const parsed = JSON.parse(parts.join(''));
    expect(parsed.tables.t[0].__unexported).toBeTruthy();
    expect(parsed.tables.t[1]).toEqual({ id: 'ok' });
  });

  it('toJsonSafe keeps binary data and dates', async () => {
    const blob = new Blob([new Uint8Array([104, 105])], { type: 'image/png' });
    const safe = (await toJsonSafe({
      when: new Date('2026-10-20T00:00:00.000Z'),
      photo: blob,
      bytes: new Uint8Array([1, 2, 3]),
      nested: [{ big: BigInt(5) }],
      fn: () => 1,
    })) as Record<string, any>;
    expect(safe.when).toBe('2026-10-20T00:00:00.000Z');
    expect(safe.photo).toEqual({ __type: 'Blob', mime: 'image/png', base64: 'aGk=' });
    expect(safe.bytes).toEqual({ __type: 'Uint8Array', base64: 'AQID' });
    expect(safe.nested[0].big).toBe('5');
    expect('fn' in safe).toBe(false);
  });
});

describe('wiring', () => {
  const auth = read('src/contexts/AuthContext.tsx');
  const screen = read('src/components/pwa/DatabaseRecoveryScreen.tsx');

  it('AuthContext never deletes the device database', () => {
    expect(auth).not.toMatch(/Dexie\.delete\(/);
    expect(auth).not.toMatch(/deleteDatabase\(/);
    expect(auth).toMatch(/classifyDbOpenFailure\(error\)/);
    expect(auth).toMatch(/<DatabaseRecoveryScreen/);
  });

  it('the recovery screen deletes only behind the typed confirmation', () => {
    const del = screen.indexOf('await deleteLocalDatabase()');
    const guard = screen.indexOf('if (!canDeleteLocalDatabase(failure.kind, typed)) return;');
    expect(guard).toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(guard);
    expect(screen.match(/deleteLocalDatabase\(/g)).toHaveLength(1);
  });
});
