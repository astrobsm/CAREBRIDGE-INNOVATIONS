// ---------------------------------------------------------------------------
// syncRecord() takes the LOCAL (Dexie, camelCase) table name and looks it up in
// LOCAL_TO_CLOUD_TABLE. Pass anything else (a cloud snake_case name, a store
// that has no cloud table) and it returns silently: the record stays on the
// device and nobody is told. Follow-up encounters, their vitals and treatment
// plans were all lost to the cloud this way.
//
// This scans every source file for syncRecord('<name>' and fails when <name>
// is not a key of the map.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { LOCAL_TO_CLOUD_TABLE } from '../supabaseClient';

const root = process.cwd();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir))) {
    const p = join(dir, name);
    if (statSync(join(root, p)).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...sourceFiles(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(relative(root, join(root, p)).replace(/\\/g, '/'));
    }
  }
  return out;
}

const calls: { file: string; table: string }[] = [];
for (const file of sourceFiles('src')) {
  const src = readFileSync(join(root, file), 'utf8');
  for (const m of src.matchAll(/syncRecord\(\s*(['"`])([^'"`]+)\1/g)) {
    calls.push({ file, table: m[2] });
  }
}

describe('syncRecord table names', () => {
  it('finds the call sites (the scan itself works)', () => {
    expect(calls.length).toBeGreaterThan(50);
  });

  it('every literal syncRecord() table is a known local table name', () => {
    const unknown = calls
      .filter(c => !Object.prototype.hasOwnProperty.call(LOCAL_TO_CLOUD_TABLE, c.table))
      .map(c => `${c.file}: syncRecord('${c.table}', ...)`);
    expect(unknown).toEqual([]);
  });
});
