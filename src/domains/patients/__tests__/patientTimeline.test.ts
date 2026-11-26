import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildPatientTimeline, joinAddress, whatsappNumber, TAB_OF_KIND, type PatientRecords } from '../patientTimeline';

const NOW = new Date(2026, 10, 26, 10, 0);
const d = (day: number, h = 9) => new Date(2026, 10, day, h, 0);
const any = <T,>(x: unknown) => x as T;

const records: PatientRecords = {
  patientId: 'P1',
  encounters: any([
    { id: 'e1', createdAt: d(1), type: 'outpatient', status: 'completed', chiefComplaint: 'Burn scar' },
    { id: 'e2', createdAt: d(2), type: 'initial', status: 'completed', chiefComplaint: 'Keloid',
      clerking: { kind: 'initial', status: 'signed' } },
    { id: 'e3', createdAt: d(3), type: 'follow_up', status: 'completed', chiefComplaint: '',
      clerking: { kind: 'follow_up', status: 'entered_in_error' } },
    { id: 'e4', createdAt: d(4), type: 'pre_operative', status: 'in-progress', chiefComplaint: '',
      procedureReview: { phase: 'pre_op', moduleId: 'keloid_excision', status: 'draft' } },
  ]),
  surgeries: any([
    { id: 's1', patientId: 'P1', procedureName: 'Keloid excision', scheduledDate: d(28), status: 'scheduled', type: 'elective', category: 'minor' },
  ]),
  postOpNotes: any([{ id: 'n1', surgeryId: 's0', procedureName: 'Debridement', procedureDate: d(5) }]),
  investigations: any([
    { id: 'i1', type: 'fbc', typeName: 'FBC', requestedAt: d(6), status: 'requested', priority: 'routine', category: 'haematology' },
    { id: 'i2', type: 'mcs', typeName: 'Wound swab', requestedAt: d(6), completedAt: d(8), status: 'completed', priority: 'urgent', category: 'microbiology' },
  ]),
  labRequests: any([{ id: 'l1', tests: [{ name: 'U&E' }], requestedAt: d(7), status: 'pending' }]),
  woundAssessments: any([{ id: 'w1', woundId: 'W', patientId: 'P1', assessedAt: d(9).toISOString(), areaCm2: 12.345 }]),
  treatmentPlans: any([{ id: 't1', title: 'Steroid injections', startDate: d(10), status: 'active' }]),
  appointments: any([
    { id: 'a1', appointmentDate: d(11, 0), appointmentTime: '14:30', type: 'follow_up', status: 'completed' },
    { id: 'a2', appointmentDate: new Date(2026, 11, 2), appointmentTime: '09:00', type: 'review', status: 'scheduled' },
  ]),
  admissions: any([{ id: 'ad1', admissionDate: d(12), wardName: 'Ward 2', status: 'discharged' }]),
  dischargeSummaries: any([{ id: 'ds1', dischargeDate: d(13), finalDiagnosis: ['Keloid'] }]),
  prescriptions: any([{ id: 'rx1', prescribedAt: d(14), medications: [{ name: 'Paracetamol' }], status: 'pending' }]),
  scannedDocuments: any([{ id: 'doc1', createdAt: d(15), title: 'Referral letter', documentType: 'referral' }]),
  educationRecords: any([{ id: 'ed1', deliveredAt: d(16), topicTitle: 'Keloid care', category: 'scar' }]),
};

describe('buildPatientTimeline', () => {
  const items = buildPatientTimeline(records, NOW);

  it('merges every table, newest first', () => {
    expect(items.map(i => i.id)).toEqual([
      'a2', 's1', 'ed1', 'doc1', 'rx1', 'ds1', 'ad1', 'a1', 't1', 'w1', 'i2', 'l1', 'i1', 'n1', 'e4', 'e2', 'e1',
    ]);
  });

  it('drops a clerking entered in error', () => {
    expect(items.find(i => i.id === 'e3')).toBeUndefined();
  });

  it('names each item and links to its existing page', () => {
    const by = Object.fromEntries(items.map(i => [i.id, i]));
    expect(by.e1).toMatchObject({ kind: 'visit', href: '/patients/P1/clinical-summary' });
    expect(by.e2).toMatchObject({ kind: 'clerking', title: 'Initial clerking', href: '/patients/P1?tab=visits' });
    expect(by.e4).toMatchObject({ kind: 'procedure_review', title: 'Pre-operative review', href: '/patients/P1/procedure-review?encounter=e4' });
    expect(by.s1).toMatchObject({ kind: 'surgery', href: '/surgery/workflow/P1/s1', upcoming: true });
    expect(by.n1.href).toBe('/surgery/post-op-note/s0');
    expect(by.i2.title).toBe('Result: Wound swab');
    expect(by.i2.at).toEqual(d(8));
    expect(by.i1.title).toBe('Requested: FBC');
    expect(by.w1).toMatchObject({ detail: '12.3 cm²', href: '/wound-monitor?patientId=P1' });
    expect(by.t1.href).toBe('/treatment-planning/t1');
    expect(by.a1.at).toEqual(new Date(2026, 10, 11, 14, 30));
    expect(by.a1.upcoming).toBe(false);
    expect(by.a2).toMatchObject({ href: '/appointments?view=a2', upcoming: true });
    expect(by.ed1.href).toBe('/patient-education?patientId=P1');
  });

  it('skips records with no usable date and copes with empty input', () => {
    expect(buildPatientTimeline({ patientId: 'P', encounters: any([{ id: 'x', createdAt: 'garbage' }]) })).toEqual([]);
    expect(buildPatientTimeline({ patientId: 'P' })).toEqual([]);
  });

  it('every kind has a tab', () => {
    for (const i of items) expect(TAB_OF_KIND[i.kind]).toBeTruthy();
  });

  it('every href is a route App.tsx declares', () => {
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
    for (const i of items) {
      const path = i.href.split('?')[0];
      const last = path.split('/').filter(Boolean).slice(-1)[0];
      const known = new RegExp(`path="([^"]*/)?${last}"`).test(app) || /^\/patients\/[^/]+$/.test(path) || /\/(s1|t1|s0)$/.test(path);
      expect(known, i.href).toBe(true);
    }
  });
});

describe('joinAddress', () => {
  it('joins only non-empty parts', () => {
    expect(joinAddress('5 Ogui Road', 'Enugu', '')).toBe('5 Ogui Road, Enugu');
    expect(joinAddress('', undefined, '  ')).toBe('');
    expect(joinAddress('5 Ogui Road,', ' Enugu ', 'Enugu State')).toBe('5 Ogui Road, Enugu, Enugu State');
  });
});

describe('whatsappNumber', () => {
  it('makes Nigerian local numbers international', () => {
    expect(whatsappNumber('0803 123 4567')).toBe('2348031234567');
    expect(whatsappNumber('+234 803 123 4567')).toBe('2348031234567');
    expect(whatsappNumber('00447700900123')).toBe('447700900123');
    expect(whatsappNumber('')).toBeNull();
    expect(whatsappNumber('123')).toBeNull();
  });
});
