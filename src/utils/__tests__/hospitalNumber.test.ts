/** Hospital numbers: one written form, matched ignoring case and punctuation, per hospital. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  normalizeHospitalNumber,
  hospitalNumberKey,
  hospitalNumberScope,
  isRetiredHospitalNumber,
  countsForUniqueness,
  findHospitalNumberMatches,
  groupDuplicateRegistrations,
  generateHospitalNumber,
  generateUniqueHospitalNumber,
} from '../hospitalNumber';

const p = (id: string, hospitalNumber: string, registeredHospitalId = 'h1', extra: Record<string, unknown> = {}) =>
  ({ id, hospitalNumber, registeredHospitalId, isActive: true, ...extra });

describe('normalizeHospitalNumber', () => {
  it('writes a typed number in one form', () => {
    expect(normalizeHospitalNumber('  cb2612345 ')).toBe('CB2612345');
    expect(normalizeHospitalNumber('unth / 2024 / 0001')).toBe('UNTH/2024/0001');
    expect(normalizeHospitalNumber('qp - abc  - x1')).toBe('QP-ABC-X1');
    expect(normalizeHospitalNumber('Folder  12')).toBe('FOLDER 12');
  });
  it('imposes no prefix: a bare number stays a bare number', () => {
    expect(normalizeHospitalNumber('12345')).toBe('12345');
  });
  it('blank in, blank out', () => {
    for (const v of ['', '   ', null, undefined]) expect(normalizeHospitalNumber(v)).toBe('');
  });
});

describe('hospitalNumberKey', () => {
  it('the same number typed differently has one key', () => {
    const keys = new Set(['cb2612345', 'CB 2612345', 'CB-26-12345', 'cb.26.12345', 'CB/2612345'].map(hospitalNumberKey));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe('CB2612345');
  });
  it('keeps leading zeros', () => {
    expect(hospitalNumberKey('0042')).not.toBe(hospitalNumberKey('42'));
  });
  it('legacy shapes match their own variants without being rewritten', () => {
    expect(hospitalNumberKey('UNTH/2024/0001')).toBe(hospitalNumberKey('unth-2024-0001'));
    expect(hospitalNumberKey('QP-LX2A-9F3K')).toBe(hospitalNumberKey('qp lx2a 9f3k'));
  });
  it('agrees with the SQL key in the migration', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261018120400_patient_hospital_number_unique.sql'), 'utf8');
    expect(sql).toContain("regexp_replace(upper(coalesce(p_number, '')), '[^A-Z0-9]', '', 'g')");
    // The SQL expression, re-stated: upper case, then drop everything but A-Z0-9.
    const sqlKey = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const v of ['cb 26-12345', ' unth/2024/0001 ', 'QP-x.y', 'abc', '']) expect(hospitalNumberKey(v)).toBe(sqlKey(v));
  });
});

describe('scope and eligibility', () => {
  it('blank and the legacy "global" are one scope', () => {
    expect(hospitalNumberScope('global')).toBe('');
    expect(hospitalNumberScope(undefined)).toBe('');
    expect(hospitalNumberScope(' h1 ')).toBe('h1');
  });
  it('inactive, merged and retired registrations do not count', () => {
    expect(countsForUniqueness(p('a', 'X1', 'h1', { isActive: false }))).toBe(false);
    expect(countsForUniqueness(p('a', 'X1', 'h1', { mergedInto: 'b' }))).toBe(false);
    expect(countsForUniqueness(p('a', 'MERGED-abc-X1'))).toBe(false);
    expect(isRetiredHospitalNumber('merged-abc-x1')).toBe(true);
    expect(countsForUniqueness(p('a', '  '))).toBe(false);
    expect(countsForUniqueness(p('a', 'X1'))).toBe(true);
  });
});

describe('findHospitalNumberMatches', () => {
  const all = [p('1', 'CB2612345'), p('2', 'cb 26 12345', 'h2'), p('3', 'CB2612346'), p('4', 'CB-2612345', 'h1', { isActive: false })];
  it('finds the same number at the same hospital, however typed', () => {
    expect(findHospitalNumberMatches(all, 'cb-26-12345', 'h1').map((x) => x.id)).toEqual(['1']);
  });
  it('the same digits at another hospital are another patient', () => {
    expect(findHospitalNumberMatches(all, 'CB2612345', 'h2').map((x) => x.id)).toEqual(['2']);
    expect(findHospitalNumberMatches(all, 'CB2612345', 'h3')).toEqual([]);
  });
  it('leaves out the patient being edited', () => {
    expect(findHospitalNumberMatches(all, 'CB2612345', 'h1', '1')).toEqual([]);
  });
});

describe('groupDuplicateRegistrations', () => {
  it('groups by hospital and key, oldest first; singles are not groups', () => {
    const groups = groupDuplicateRegistrations([
      p('b', 'cb 1', 'h1', { createdAt: '2026-02-01' }),
      p('a', 'CB-1', 'h1', { createdAt: '2026-01-01' }),
      p('c', 'CB1', 'h2'),
      p('d', 'CB2', 'h1'),
      p('e', 'CB1', 'h1', { mergedInto: 'a' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].scope).toBe('h1');
    expect(groups[0].patients.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('auto-numbers', () => {
  it('CB + YY + 5 digits', () => {
    expect(generateHospitalNumber(new Date('2026-05-01'), () => 0.00042)).toBe('CB2600042');
  });
  it('skips a number already taken', () => {
    const seq = [0.1, 0.1, 0.2];
    let i = 0;
    const n = generateUniqueHospitalNumber(new Set(['CB2610000']), new Date('2026-05-01'), () => seq[i++]);
    expect(n).toBe('CB2620000');
  });
});
