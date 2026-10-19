/** Merging double registrations: which tables move, what the kept record keeps, who may merge. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Patient } from '../../../types';
import {
  linkedTablesFromSchema,
  repointRow,
  fillFromDuplicate,
  retireDuplicate,
  checkMergeable,
  canMergePatients,
  suggestKeep,
  MergeRefusedError,
} from '../services/patientMergePlan';

/** Every store declared in db.ts, latest definition wins (as Dexie applies them). */
function dexieStores(): Record<string, string> {
  const src = readFileSync(join(process.cwd(), 'src/database/db.ts'), 'utf8');
  const out: Record<string, string> = {};
  for (const block of src.matchAll(/this\.version\(\d+\)\.stores\(\{([\s\S]*?)\}\);/g)) {
    for (const m of block[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*\n?\s*'([^']+)'/gm)) out[m[1]] = m[2];
  }
  return out;
}

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: 'p-keep', hospitalNumber: 'CB2612345', firstName: 'Ada', lastName: 'Obi',
  dateOfBirth: new Date('1990-01-01'), gender: 'female', maritalStatus: 'single',
  phone: '', address: '', city: '', state: '',
  nextOfKin: { name: '', relationship: '', phone: '', address: '' },
  allergies: [], chronicConditions: [], registeredHospitalId: 'h1', isActive: true,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  ...over,
} as Patient);

describe('tables re-pointed by a merge', () => {
  const stores = dexieStores();
  const { indexed, scanned } = linkedTablesFromSchema(stores);

  it('parses the real Dexie schema', () => {
    expect(Object.keys(stores).length).toBeGreaterThan(90);
  });

  it('includes every patient-linked module, old and new', () => {
    for (const t of [
      'vitalSigns', 'clinicalEncounters', 'surgeries', 'wounds', 'admissions', 'prescriptions', 'labRequests',
      'investigations', 'invoices', 'wardRounds', 'dischargeSummaries', 'medicationCharts', 'appointments',
      'treatmentPlans', 'treatmentSessions', 'referrals', 'npwtSessions', 'burnMonitoringRecords',
      'limbSalvageAssessments', 'substanceUseAssessments', 'lymphedemaAssessments', 'woundMeasurements',
      'scannedDocuments', 'monitoredWounds', 'woundAssessments', 'tumourBoardCases', 'clinicianAnalyses',
      'skinGraftEpisodes', 'scarCases', 'padAssessments', 'vascularInterventions', 'chatRooms', 'clinicalComments',
    ]) expect(indexed).toContain(t);
  });

  it('never touches the patients themselves or the audit trail', () => {
    for (const t of ['patients', 'auditLogs', 'syncStatus', 'financeAuditLogs']) {
      expect(indexed).not.toContain(t);
      expect(scanned).not.toContain(t);
    }
  });

  it('tables without a patientId index are still scanned (a link can be unindexed)', () => {
    expect(scanned).toContain('admissionNotes');
    expect(indexed.length + scanned.length + 4).toBe(Object.keys(stores).length);
  });
});

describe('repointRow', () => {
  const now = new Date('2026-10-18T10:00:00Z');
  it('moves patientId, aligns the denormalised number, bumps updatedAt where present', () => {
    const r = repointRow({ id: 'r1', patientId: 'p-drop', hospitalNumber: 'cb 2612345', updatedAt: new Date(0) }, 'p-drop', { id: 'p-keep', hospitalNumber: 'CB2612345' }, now);
    expect(r).toEqual({ id: 'r1', patientId: 'p-keep', hospitalNumber: 'CB2612345', updatedAt: now });
  });
  it('does not add columns a row never had', () => {
    const r = repointRow({ id: 'r1', patientId: 'p-drop' }, 'p-drop', { id: 'p-keep', hospitalNumber: 'X' }, now);
    expect(r).toEqual({ id: 'r1', patientId: 'p-keep' });
  });
  it('rewrites a patientIds list without doubling the kept patient', () => {
    const r = repointRow({ id: 'n1', patientIds: ['a', 'p-drop', 'p-keep'] }, 'p-drop', { id: 'p-keep' }, now);
    expect(r.patientIds).toEqual(['a', 'p-keep']);
  });
});

describe('fillFromDuplicate', () => {
  it('fills blanks and placeholders, never overwrites', () => {
    const keep = patient({ phone: '0803', address: 'Not provided', bloodGroup: undefined });
    const drop = patient({ id: 'p-drop', phone: '0999', address: '12 Okpara Ave', bloodGroup: 'O+' });
    const c = fillFromDuplicate(keep, drop);
    expect(c.phone).toBeUndefined();
    expect(c.address).toBe('12 Okpara Ave');
    expect(c.bloodGroup).toBe('O+');
  });
  it('combines allergy and condition lists so nothing recorded is lost', () => {
    const keep = patient({ allergies: ['Penicillin'], chronicConditions: [] });
    const drop = patient({ id: 'p-drop', allergies: ['penicillin', 'Sulfa'], chronicConditions: ['Diabetes'] });
    const c = fillFromDuplicate(keep, drop);
    expect(c.allergies).toEqual(['Penicillin', 'Sulfa']);
    expect(c.chronicConditions).toEqual(['Diabetes']);
  });
  it('takes next of kin and comorbidities only where missing', () => {
    const keep = patient({ comorbidities: [{ condition: 'Hypertension', currentlyManaged: true }] });
    const drop = patient({
      id: 'p-drop',
      nextOfKin: { name: 'Chidi Obi', relationship: 'Brother', phone: '0812', address: '' },
      comorbidities: [{ condition: 'hypertension', currentlyManaged: false }, { condition: 'Asthma', currentlyManaged: true }],
    });
    const c = fillFromDuplicate(keep, drop);
    expect(c.nextOfKin?.name).toBe('Chidi Obi');
    expect(c.comorbidities?.map((x) => x.condition)).toEqual(['Hypertension', 'Asthma']);
  });
  it('nothing to take, nothing changed', () => {
    expect(fillFromDuplicate(patient(), patient({ id: 'p-drop' }))).toEqual({});
  });
});

describe('retireDuplicate', () => {
  it('inactive, pointing at the kept record, number retired - not deleted', () => {
    const now = new Date('2026-10-18T10:00:00Z');
    const r = retireDuplicate(patient({ id: 'abcdef12-3456', hospitalNumber: 'cb 2612345' }), 'p-keep', now);
    expect(r).toMatchObject({ id: 'abcdef12-3456', isActive: false, mergedInto: 'p-keep', mergedAt: now, hospitalNumber: 'MERGED-abcdef12-cb 2612345' });
  });
});

describe('who may merge, and what', () => {
  const admin = { id: 'u1', role: 'hospital_admin', hospitalId: 'h1' };
  const superAdmin = { id: 'u0', role: 'super_admin' };
  const keep = patient();
  const drop = patient({ id: 'p-drop', hospitalNumber: 'cb-26-12345' });

  it('administrators only; a hospital admin only within their hospital', () => {
    expect(canMergePatients(superAdmin, [keep, patient({ registeredHospitalId: 'h9' })])).toBe(true);
    expect(canMergePatients(admin, [keep, drop])).toBe(true);
    expect(canMergePatients(admin, [keep, patient({ registeredHospitalId: 'h2' })])).toBe(false);
    expect(canMergePatients({ id: 'u2', role: 'surgeon', hospitalId: 'h1' }, [keep, drop])).toBe(false);
    expect(canMergePatients(null, [keep])).toBe(false);
  });

  it('accepts two registrations of one number', () => {
    expect(() => checkMergeable(keep, drop, admin)).not.toThrow();
  });

  const refusal = (fn: () => void) => { try { fn(); } catch (e) { return (e as MergeRefusedError).code; } return null; };
  it('refuses what must not be merged', () => {
    expect(refusal(() => checkMergeable(keep, undefined, admin))).toBe('NOT_FOUND');
    expect(refusal(() => checkMergeable(keep, keep, admin))).toBe('SAME_PATIENT');
    expect(refusal(() => checkMergeable(keep, { ...drop, mergedInto: 'x' }, admin))).toBe('ALREADY_MERGED');
    expect(refusal(() => checkMergeable(keep, drop, { id: 'n', role: 'nurse', hospitalId: 'h1' }))).toBe('NOT_ALLOWED');
    expect(refusal(() => checkMergeable(keep, { ...drop, hospitalNumber: 'CB2699999' }, admin))).toBe('DIFFERENT_NUMBERS');
    expect(refusal(() => checkMergeable(keep, { ...drop, registeredHospitalId: 'h2' }, superAdmin))).toBe('DIFFERENT_HOSPITALS');
  });

  it('different numbers only with an explicit force', () => {
    expect(() => checkMergeable(keep, { ...drop, hospitalNumber: 'CB2699999' }, admin, true)).not.toThrow();
  });
});

describe('suggestKeep', () => {
  it('the fuller record; the earlier registration on a tie', () => {
    const a = { id: 'a', createdAt: '2026-01-01' };
    const b = { id: 'b', createdAt: '2026-02-01' };
    expect(suggestKeep([a, b], { a: 2, b: 9 })?.id).toBe('b');
    expect(suggestKeep([b, a], { a: 3, b: 3 })?.id).toBe('a');
  });
});
