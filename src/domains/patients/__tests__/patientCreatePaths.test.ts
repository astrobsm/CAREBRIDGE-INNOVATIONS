// ---------------------------------------------------------------------------
// No double registration, on every route.
//
// The duplicate hospital-number check lives in registerPatient(). A patient
// written to Dexie any other way skips it, which is exactly how the same
// patient came to be registered twice. These tests read the real sources and
// fail the build when a new path creates a patient around the check, or when
// the server-side guarantee is weakened.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

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

/** The one sanctioned local create of a patient. */
const REGISTER = 'src/domains/patients/services/patientDedupeService.ts';

/** Every route that registers a patient, and must do it through registerPatient. */
const CREATE_PATHS = [
  'src/domains/patients/pages/SlimNewPatientPage.tsx',
  'src/domains/patients/pages/NewPatientPage.tsx',
  'src/components/patient/PatientSelector.tsx',
  'src/domains/wounds/pages/WoundProgressMonitorPage.tsx',
  'src/database/operations.ts',
  'src/services/apiService.ts',
  'src/services/offlineHooks.ts',
];

describe('patient create paths', () => {
  const files = sourceFiles('src');

  it('nothing but registerPatient adds a patient to Dexie', () => {
    const offenders = files.filter((f) => f !== REGISTER && /\bpatients\s*\.\s*(add|bulkAdd)\s*\(/.test(read(f)));
    expect(offenders).toEqual([]);
  }, 60_000); // reads every source file

  it('every known create path goes through registerPatient', () => {
    for (const f of CREATE_PATHS) expect(read(f), f).toMatch(/registerPatient\(/);
  });

  it('the registration forms check the number as it is typed', () => {
    for (const f of CREATE_PATHS.slice(0, 4)) expect(read(f), f).toContain('<HospitalNumberField');
  });

  it('edit helpers refuse renumbering onto a taken number', () => {
    for (const f of ['src/database/operations.ts', 'src/services/apiService.ts', 'src/services/offlineHooks.ts']) {
      expect(read(f), f).toMatch(/assertRenumberAllowed\(/);
    }
  });
});

describe('server-side guarantee (Supabase migration)', () => {
  const sql = read('supabase/migrations/20261018120400_patient_hospital_number_unique.sql');

  it('refuses new duplicates with a trigger, whatever the existing data holds', () => {
    expect(sql).toMatch(/CREATE TRIGGER trg_patients_reject_duplicate_hospital_number\s+BEFORE INSERT OR UPDATE ON public\.patients/);
    expect(sql).toContain("ERRCODE = '23505'");
  });

  it('never runs a bare CREATE UNIQUE INDEX that existing duplicates would abort', () => {
    // The only unique index is inside ensure_patient_hospital_number_unique(),
    // after the duplicate count, with its own unique_violation handler.
    const fn = sql.slice(sql.indexOf('FUNCTION public.ensure_patient_hospital_number_unique'));
    const body = fn.slice(0, fn.indexOf('$$;', fn.indexOf('$$') + 2));
    expect(sql.match(/CREATE UNIQUE INDEX/g)?.length).toBe(1);
    // IF NOT EXISTS is what db:check requires of every CREATE INDEX.
    expect(body).toMatch(/CREATE UNIQUE INDEX (IF NOT EXISTS )?ux_patients_hospital_number_key/);
    expect(body.indexOf('patient_hospital_number_duplicates()')).toBeLessThan(body.indexOf('CREATE UNIQUE INDEX'));
    expect(body).toContain('EXCEPTION WHEN unique_violation');
  });

  it('is additive and re-runnable', () => {
    expect(sql).not.toMatch(/\bDROP TABLE\b|\bDELETE FROM\b|\bTRUNCATE\b/i);
    for (const m of sql.matchAll(/ALTER TABLE[^;]*ADD COLUMN(?! IF NOT EXISTS)/g)) throw new Error(`non-idempotent: ${m[0]}`);
  });
});
