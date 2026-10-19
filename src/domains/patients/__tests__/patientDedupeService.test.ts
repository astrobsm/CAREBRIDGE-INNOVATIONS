/**
 * registerPatient refuses a second registration of a number; mergePatients
 * folds a duplicate into the kept record across every linked table.
 * Runs against a small in-memory stand-in for the Dexie database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Patient } from '../../../types';

const h = vi.hoisted(() => {
  type Row = Record<string, any>;
  class FakeTable {
    rows = new Map<string, Row>();
    schema: { primKey: { name: string }; indexes: { name: string }[] };
    constructor(public name: string, indexes: string[]) {
      this.schema = { primKey: { name: 'id' }, indexes: indexes.map((n) => ({ name: n })) };
    }
    async toArray() { return [...this.rows.values()].map((r) => ({ ...r })); }
    async get(id: string) { const r = this.rows.get(id); return r ? { ...r } : undefined; }
    async add(r: Row) { if (this.rows.has(r.id)) throw new Error('ConstraintError'); this.rows.set(r.id, { ...r }); return r.id; }
    async bulkPut(rs: Row[]) { for (const r of rs) this.rows.set(r.id, { ...r }); }
    async each(fn: (r: Row) => void) { for (const r of this.rows.values()) fn(r); }
    filter(pred: (r: Row) => boolean) { return { toArray: async () => [...this.rows.values()].filter(pred).map((r) => ({ ...r })) }; }
    where(field: string) {
      return { equals: (v: unknown) => ({ count: async () => [...this.rows.values()].filter((r) => r[field] === v).length }) };
    }
  }
  const tables = [
    new FakeTable('patients', ['hospitalNumber', 'registeredHospitalId']),
    new FakeTable('admissions', ['patientId']),
    new FakeTable('vitalSigns', ['patientId']),
    new FakeTable('admissionNotes', ['admissionId']),
    new FakeTable('nurseAssignments', ['patientId']),
    new FakeTable('auditLogs', ['entityId']),
  ];
  const byName = Object.fromEntries(tables.map((t) => [t.name, t]));
  const db = {
    tables,
    table: (n: string) => byName[n],
    patients: byName.patients,
    transaction: async (_mode: string, _tables: unknown, fn: () => Promise<void>) => fn(),
  };
  const audit = vi.fn(async () => {});
  return { db, byName, audit };
});

vi.mock('../../../database/db', () => ({ db: h.db }));
vi.mock('../../../services/supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false, LOCAL_TO_CLOUD_TABLE: {} }));
vi.mock('../../../services/auditService', () => ({ logAuditEvent: h.audit }));

import {
  registerPatient,
  assertRenumberAllowed,
  listDuplicateGroups,
  countLinkedRecords,
  mergePatients,
  DuplicateHospitalNumberError,
} from '../services/patientDedupeService';

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: 'p1', hospitalNumber: 'CB2612345', firstName: 'Ada', lastName: 'Obi',
  dateOfBirth: new Date('1990-01-01'), gender: 'female', maritalStatus: 'single',
  phone: '', address: '', city: '', state: '',
  nextOfKin: { name: '', relationship: '', phone: '', address: '' },
  allergies: [], chronicConditions: [], registeredHospitalId: 'h1', isActive: true,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  ...over,
} as Patient);

beforeEach(() => {
  for (const t of h.db.tables) t.rows.clear();
  h.audit.mockClear();
});

describe('registerPatient', () => {
  it('saves a new number in its written form', async () => {
    const saved = await registerPatient(patient({ hospitalNumber: ' cb 26-12345 ' }));
    expect(saved.hospitalNumber).toBe('CB 26-12345');
    expect(h.byName.patients.rows.size).toBe(1);
  });

  it('refuses the same number typed differently at the same hospital', async () => {
    await registerPatient(patient());
    const second = registerPatient(patient({ id: 'p2', hospitalNumber: 'cb-2612345', firstName: 'Ada' }));
    await expect(second).rejects.toBeInstanceOf(DuplicateHospitalNumberError);
    await expect(second).rejects.toMatchObject({ code: 'DUPLICATE_HOSPITAL_NUMBER', matches: [{ id: 'p1', name: 'Ada Obi', source: 'device' }] });
    expect(h.byName.patients.rows.size).toBe(1);
  });

  it('allows the same digits at another hospital, and reuse of a merged or deleted number', async () => {
    await registerPatient(patient());
    await expect(registerPatient(patient({ id: 'p2', registeredHospitalId: 'h2' }))).resolves.toBeTruthy();
    h.byName.patients.rows.set('old', patient({ id: 'old', hospitalNumber: 'X-1', isActive: false }) as any);
    await expect(registerPatient(patient({ id: 'p3', hospitalNumber: 'x1' }))).resolves.toBeTruthy();
  });

  it('issues an auto-number when none is typed', async () => {
    const saved = await registerPatient(patient({ hospitalNumber: '' }));
    expect(saved.hospitalNumber).toMatch(/^CB\d{7}$/);
  });
});

describe('assertRenumberAllowed', () => {
  it('refuses renumbering onto a number another patient holds; unchanged numbers pass', async () => {
    await registerPatient(patient());
    await registerPatient(patient({ id: 'p2', hospitalNumber: 'CB2699999' }));
    await expect(assertRenumberAllowed('p2', { hospitalNumber: 'cb 2612345' })).rejects.toBeInstanceOf(DuplicateHospitalNumberError);
    await expect(assertRenumberAllowed('p1', { hospitalNumber: 'cb-2612345', phone: '1' })).resolves.toBeUndefined();
    await expect(assertRenumberAllowed('p2', { phone: '1' })).resolves.toBeUndefined();
  });
});

describe('duplicates and merging', () => {
  const seed = () => {
    // Two registrations made before the check existed (straight into the table).
    h.byName.patients.rows.set('keep', patient({ id: 'keep', hospitalNumber: 'CB2612345', phone: '0803', allergies: ['Penicillin'] }) as any);
    h.byName.patients.rows.set('drop', patient({ id: 'drop', hospitalNumber: 'cb 2612345', address: '12 Okpara Ave', allergies: ['Sulfa'], createdAt: new Date('2026-02-01') }) as any);
    h.byName.admissions.rows.set('a1', { id: 'a1', patientId: 'drop', hospitalNumber: 'cb 2612345', updatedAt: new Date(0) });
    h.byName.admissions.rows.set('a2', { id: 'a2', patientId: 'keep' });
    h.byName.vitalSigns.rows.set('v1', { id: 'v1', patientId: 'drop' });
    h.byName.vitalSigns.rows.set('v2', { id: 'v2', patientId: 'drop' });
    h.byName.admissionNotes.rows.set('n1', { id: 'n1', admissionId: 'a1', patientId: 'drop' });
    h.byName.nurseAssignments.rows.set('na1', { id: 'na1', patientIds: ['drop', 'other'] });
    h.byName.auditLogs.rows.set('l1', { id: 'l1', entityId: 'drop', patientId: 'drop' });
  };
  const admin = { id: 'u1', role: 'hospital_admin', hospitalId: 'h1' };

  it('lists the group and counts what each record holds', async () => {
    seed();
    const groups = await listDuplicateGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].patients.map((p) => p.id)).toEqual(['keep', 'drop']);
    const counts = await countLinkedRecords(['keep', 'drop']);
    expect(counts.drop).toEqual({ total: 3, tables: { admissions: 1, vitalSigns: 2 } });
    expect(counts.keep.total).toBe(1);
  });

  it('moves every linked row, fills blanks, retires the duplicate, audits', async () => {
    seed();
    const r = await mergePatients({ keepId: 'keep', dropId: 'drop', user: admin });

    expect(r.moved).toEqual({ admissions: 1, vitalSigns: 2, admissionNotes: 1, nurseAssignments: 1 });
    expect(r.movedTotal).toBe(5);
    expect(h.byName.admissions.rows.get('a1')).toMatchObject({ patientId: 'keep', hospitalNumber: 'CB2612345' });
    expect(h.byName.vitalSigns.rows.get('v2')?.patientId).toBe('keep');
    expect(h.byName.admissionNotes.rows.get('n1')?.patientId).toBe('keep');
    expect(h.byName.nurseAssignments.rows.get('na1')?.patientIds).toEqual(['keep', 'other']);
    // The audit trail still says what happened to whom.
    expect(h.byName.auditLogs.rows.get('l1')?.patientId).toBe('drop');

    const kept = h.byName.patients.rows.get('keep')!;
    expect(kept.phone).toBe('0803');
    expect(kept.address).toBe('12 Okpara Ave');
    expect(kept.allergies).toEqual(['Penicillin', 'Sulfa']);

    const retired = h.byName.patients.rows.get('drop')!;
    expect(retired).toMatchObject({ isActive: false, mergedInto: 'keep' });
    expect(retired.hospitalNumber.startsWith('MERGED-')).toBe(true);

    expect(r.cloud.status).toBe('skipped');
    expect(h.audit).toHaveBeenCalledWith('u1', 'patient_merged', 'patients', 'keep', expect.anything());
    expect(await listDuplicateGroups()).toEqual([]);
  });

  it('refuses a non-administrator and a second merge, changing nothing', async () => {
    seed();
    await expect(mergePatients({ keepId: 'keep', dropId: 'drop', user: { id: 'u2', role: 'surgeon', hospitalId: 'h1' } }))
      .rejects.toMatchObject({ code: 'NOT_ALLOWED' });
    expect(h.byName.vitalSigns.rows.get('v1')?.patientId).toBe('drop');

    await mergePatients({ keepId: 'keep', dropId: 'drop', user: admin });
    await expect(mergePatients({ keepId: 'keep', dropId: 'drop', user: admin })).rejects.toMatchObject({ code: 'ALREADY_MERGED' });
  });
});
