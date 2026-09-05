// ---------------------------------------------------------------------------
// Guards the frontend <-> backend contract for the cloud sync layer.
//
// The sync engine is driven by several lists that live in different files and
// used to be maintained by hand. They had already drifted: whole modules
// (finance, lymphedema, STI, wound measurements, investigation bundles) had
// Supabase tables and migrations but were never added to the sync engine, so
// everything written to them stayed on the device forever. Nothing failed
// loudly, which is exactly why it went unnoticed.
//
// These tests read the real source files and fail the build the moment the
// lists disagree again.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const dbSrc = read('src/database/db.ts');
const clientSrc = read('src/services/supabaseClient.ts');
const syncSrc = read('src/services/cloudSyncService.ts');

/** Dexie stores that are deliberately device-local and must never sync. */
const LOCAL_ONLY_STORES = new Set([
  'syncStatus', // bookkeeping for the sync engine itself
]);

// ── parse the sources ──────────────────────────────────────────────────────

/** Every store declared on the Dexie class (`foo!: Table<Foo, string>`). */
function dexieStores(): Set<string> {
  const out = new Set<string>();
  for (const m of dbSrc.matchAll(/^\s*([a-zA-Z0-9_]+)!?:\s*Table<\s*[A-Za-z0-9_]+/gm)) out.add(m[1]);
  return out;
}

function objectLiteral(src: string, header: RegExp): Record<string, string> {
  const m = src.match(header);
  if (!m) throw new Error(`could not locate object literal: ${header}`);
  const out: Record<string, string> = {};
  for (const e of m[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*'([a-z0-9_]+)'/gm)) out[e[1]] = e[2];
  return out;
}

const TABLES = objectLiteral(clientSrc, /export const TABLES\s*=\s*\{([\s\S]*?)\n\} as const;/);
const LOCAL_TO_CLOUD = objectLiteral(
  clientSrc,
  /export const LOCAL_TO_CLOUD_TABLE: Record<string, string> = \{([\s\S]*?)\n\};/
);

const pulled = new Set(
  [...syncSrc.matchAll(/pullTable\(\s*TABLES\.([a-zA-Z0-9_]+)\s*,\s*'([a-zA-Z0-9_]+)'/g)].map(m => m[2])
);
const pushed = new Set(
  [...syncSrc.matchAll(/pushTable\(\s*'([a-zA-Z0-9_]+)'\s*,\s*TABLES\.([a-zA-Z0-9_]+)/g)].map(m => m[1])
);

/** Every table name created or altered anywhere in the repo's SQL. */
function sqlTables(): Set<string> {
  let sql = '';
  const walk = (dir: string) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(e.name)) walk(rel);
      } else if (e.name.endsWith('.sql')) {
        sql += read(rel) + '\n';
      }
    }
  };
  walk('.');
  const out = new Set<string>();
  for (const m of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi
  )) out.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi))
    out.add(m[1].toLowerCase());
  return out;
}

const sorted = (s: Iterable<string>) => [...s].sort();
const missing = (from: Iterable<string>, present: Set<string>) =>
  sorted([...from].filter(x => !present.has(x)));

// ── the contract ───────────────────────────────────────────────────────────

describe('cloud sync table alignment', () => {
  it('pulls and pushes exactly the same set of tables', () => {
    // A table in one list but not the other is a one-way street: either local
    // edits never reach the cloud, or remote records never reach the device.
    expect(missing(pulled, pushed)).toEqual([]);
    expect(missing(pushed, pulled)).toEqual([]);
  });

  it('registers every synced table in LOCAL_TO_CLOUD_TABLE', () => {
    // getCloudTableName() resolves through this map, so a table missing here
    // makes every single-record syncRecord() call for it a silent no-op.
    const known = new Set(Object.keys(LOCAL_TO_CLOUD));
    expect(missing([...pulled, ...pushed], known)).toEqual([]);
  });

  it('keeps TABLES and LOCAL_TO_CLOUD_TABLE in agreement', () => {
    const disagree = Object.entries(LOCAL_TO_CLOUD)
      .filter(([local, cloud]) => TABLES[local] && TABLES[local] !== cloud)
      .map(([local, cloud]) => `${local}: TABLES=${TABLES[local]} vs LOCAL_TO_CLOUD_TABLE=${cloud}`);
    expect(disagree).toEqual([]);
  });

  it('points every mapped cloud table at a table that exists in SQL', () => {
    const defined = sqlTables();
    const absent = sorted(
      Object.entries(LOCAL_TO_CLOUD)
        .filter(([, cloud]) => !defined.has(cloud))
        .map(([local, cloud]) => `${local} -> ${cloud}`)
    );
    expect(absent).toEqual([]);
  });

  it('syncs every Dexie store that is not explicitly device-local', () => {
    // This is the check that would have caught the finance / lymphedema / STI /
    // wound-measurement / investigation-bundle modules never leaving the device.
    const syncedOrLocal = new Set([...pulled, ...pushed, ...LOCAL_ONLY_STORES]);
    expect(missing(dexieStores(), syncedOrLocal)).toEqual([]);
  });

  it('only names real Dexie stores in the sync lists', () => {
    // A typo here is a silent no-op: the engine would sync a store that does
    // not exist rather than the one that does.
    expect(missing([...pulled, ...pushed], dexieStores())).toEqual([]);
  });
});
