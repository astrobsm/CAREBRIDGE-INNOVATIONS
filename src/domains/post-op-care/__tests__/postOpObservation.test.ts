import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildPostOpObservation,
  buildObservationVitals,
  latestActivePlan,
  monitoringSchema,
  type MonitoringFormData,
} from '../services/postOpObservation';
import type { PostOpCarePlan } from '../types';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const ctx = {
  id: 'obs1',
  vitalSignsId: 'vs1',
  patientId: 'p1',
  surgeryId: 's1',
  carePlanId: 'cp1',
  hospitalId: 'h1',
  surgeryDate: new Date(2026, 10, 20, 8, 0),
  now: new Date(2026, 10, 22, 10, 30),
  recordedBy: 'u1',
  recordedByName: 'Nurse A',
};

const full: MonitoringFormData = {
  heartRate: 88,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  temperature: 37.9,
  painScore: 4,
  woundCondition: 'moderate_drainage',
  dressingChanged: true,
  drainOneOutput: 120,
  drainTwoOutput: 40,
  drainColor: 'serosanguinous',
  urineOutput: 900,
  complicationPresent: true,
  complicationType: 'Haematoma',
  complicationNotes: 'Flap congested at tip',
  overallCondition: 'concerning',
  escalationRequired: true,
  escalationDetails: 'Surgeon informed',
  nursingNotes: 'Leech therapy considered',
};

describe('buildPostOpObservation', () => {
  it('keeps wound, drain, complication and escalation fields', () => {
    const o = buildPostOpObservation(full, ctx);
    expect(o.observation).toMatchObject({
      woundCondition: 'moderate_drainage',
      drainOneOutput: 120,
      drainTwoOutput: 40,
      drainColor: 'serosanguinous',
      complicationType: 'Haematoma',
      complicationNotes: 'Flap congested at tip',
      escalationDetails: 'Surgeon informed',
      urineOutput: 900,
    });
    expect(o.complicationPresent).toBe(true);
    expect(o.escalationRequired).toBe(true);
    expect(o.carePlanId).toBe('cp1');
    expect(o.vitalSignsId).toBe('vs1');
  });

  it('computes day / hour post-op from the surgery date', () => {
    const o = buildPostOpObservation(full, ctx);
    expect(o.dayPostOp).toBe(2);
    expect(o.hourPostOp).toBe(2);
    expect(o.shift).toBe('morning');
  });

  it('drops empty number inputs (NaN) and blank strings', () => {
    const o = buildPostOpObservation(
      { ...full, drainOneOutput: NaN, dressingNotes: '  ' },
      ctx,
    );
    expect(o.observation).not.toHaveProperty('drainOneOutput');
    expect(o.observation).not.toHaveProperty('dressingNotes');
  });

  it('records an observation with no vitals, and links no vitals row', () => {
    const noVitals: MonitoringFormData = {
      painScore: 2, woundCondition: 'signs_of_infection', complicationPresent: false,
      overallCondition: 'stable', escalationRequired: false,
    };
    const o = buildPostOpObservation(noVitals, ctx);
    expect(o.vitalSignsId).toBeUndefined();
    expect(o.observation.woundCondition).toBe('signs_of_infection');
    expect(buildObservationVitals(noVitals, o)).toBeNull();
  });
});

describe('buildObservationVitals', () => {
  it('builds the charted vitals row with the same id the observation links', () => {
    const o = buildPostOpObservation(full, ctx);
    const v = buildObservationVitals(full, o)!;
    expect(v.id).toBe('vs1');
    expect(v.pulse).toBe(88);
    expect(v.encounterId).toBe('s1');
    expect(v.notes).toContain('Complication: Haematoma.');
  });
});

describe('latestActivePlan', () => {
  const plan = (id: string, status: PostOpCarePlan['status'], updated: number) =>
    ({ id, status, updatedAt: new Date(updated) } as PostOpCarePlan);
  it('picks the newest active plan and ignores completed ones', () => {
    expect(latestActivePlan([plan('a', 'active', 1), plan('b', 'completed', 5), plan('c', 'active', 3)])?.id).toBe('c');
    expect(latestActivePlan([])).toBeUndefined();
  });
});

describe('schema', () => {
  it('accepts a minimal observation', () => {
    expect(monitoringSchema.safeParse({ painScore: 0, complicationPresent: false, overallCondition: 'stable', escalationRequired: false }).success).toBe(true);
  });
});

describe('post-op stores (Dexie v94)', () => {
  const DB = read('src/database/db.ts');
  it('declares postOpCarePlans and postOpObservations in v94 and on the class', () => {
    const v94 = DB.match(/this\.version\(94\)\.stores\(\{([\s\S]*?)\}\)/);
    expect(v94).toBeTruthy();
    const stores = [...v94![1].matchAll(/^\s*(\w+):\s*'([^']+)'/gm)].map(m => m[1]).sort();
    expect(stores).toEqual(['postOpCarePlans', 'postOpObservations']);
    expect(DB).toMatch(/^\s*postOpCarePlans!: Table<PostOpCarePlan, string>;/m);
    expect(DB).toMatch(/^\s*postOpObservations!: Table<PostOpObservation, string>;/m);
  });

  it('the modals use the declared tables, not db.table(<string>)', () => {
    const plan = read('src/domains/post-op-care/components/PostOpCarePlanModal.tsx');
    const mon = read('src/domains/post-op-care/components/PostOpMonitoringModal.tsx');
    expect(plan).not.toMatch(/db\.table\(/);
    expect(plan).toMatch(/db\.postOpCarePlans\.put\(/);
    expect(mon).toMatch(/db\.postOpObservations\.add\(/);
  });
});
