/**
 * Saving the tumour board record twice must not double it: the same plan is
 * not re-versioned, there is one live referral per specialty, completed
 * surveillance is not re-added, and a measurement in the wrong unit never
 * reaches the staging record. Ported from the UNTH tumour board audit.
 *
 * The Dexie tables are replaced by a small in-memory store, which is all the
 * service touches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, any> & { id: string };

const tables: Record<string, Map<string, Row>> = {};
const table = (name: string) => {
  const rows = (tables[name] ??= new Map());
  return {
    where: (field: string) => ({
      equals: (v: unknown) => ({ toArray: async () => [...rows.values()].filter(r => r[field] === v) }),
    }),
    add: async (r: Row) => { rows.set(r.id, { ...r }); return r.id; },
    put: async (r: Row) => { rows.set(r.id, { ...r }); return r.id; },
    bulkAdd: async (rs: Row[]) => { for (const r of rs) rows.set(r.id, { ...r }); },
    bulkDelete: async (ids: string[]) => { for (const id of ids) rows.delete(id); },
    update: async (id: string, patch: Partial<Row>) => {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...patch });
      return r ? 1 : 0;
    },
    get: async (id: string) => rows.get(id),
    toArray: async () => [...rows.values()],
  };
};

vi.mock('../../../database', () => ({
  db: new Proxy({}, { get: (_t, name: string) => table(name) }),
}));
vi.mock('../../../services/cloudSyncService', () => ({
  syncRecord: vi.fn(),
  deleteRecordFromCloud: vi.fn(async () => undefined),
}));

import {
  savePlan, saveReferrals, saveSurveillance, completeSurveillanceItem, markReferralSent,
  recordAssessment,
} from '../services/tumourBoardService';
import type { TumourBoardCase } from '../tumourBoardTypes';

const caseRecord = { id: 'case-1', patientId: 'p-1', tumorFamily: 'cutaneous_melanoma' } as unknown as TumourBoardCase;

beforeEach(() => { for (const k of Object.keys(tables)) delete tables[k]; });

describe('plans', () => {
  const plan = { intent: 'curative', summary: 's', items: [{ id: 'a' }], specialtiesInvolved: [], caveats: [] } as any;

  it('does not re-version an unchanged plan', async () => {
    const first = await savePlan(caseRecord, plan, { assessmentId: 'as-1' });
    const again = await savePlan(caseRecord, plan, { assessmentId: 'as-1' });
    expect(again.id).toBe(first.id);
    expect(tables.tumourBoardPlans.size).toBe(1);
  });

  it('saves a changed plan as a new one', async () => {
    await savePlan(caseRecord, plan, { assessmentId: 'as-1' });
    await savePlan(caseRecord, { ...plan, items: [{ id: 'b' }] }, { assessmentId: 'as-1' });
    expect(tables.tumourBoardPlans.size).toBe(2);
  });
});

describe('referrals', () => {
  const letter = (body: string) => ({
    specialty: 'oncology', specialtyLabel: 'Oncology', subject: 'x', body, requestedItems: [], urgency: 'routine',
  }) as any;

  it('refreshes an unsent draft in place rather than adding another', async () => {
    await saveReferrals(caseRecord, [letter('v1')]);
    await saveReferrals(caseRecord, [letter('v2')]);
    const rows = [...tables.tumourBoardReferrals.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe('v2');
  });

  it('does not redraft a letter already sent with the same text', async () => {
    const [r] = await saveReferrals(caseRecord, [letter('v1')]);
    await markReferralSent(r.id);
    await saveReferrals(caseRecord, [letter('v1')]);
    expect(tables.tumourBoardReferrals.size).toBe(1);
    // Changed content after sending gets a new draft beside the sent one.
    await saveReferrals(caseRecord, [letter('v2')]);
    expect(tables.tumourBoardReferrals.size).toBe(2);
  });
});

describe('surveillance', () => {
  const sched = {
    items: [
      { category: 'clinic', title: 'Review', detail: '', dueMonth: 3, dueDate: '2027-01-01', phase: 'p', basis: 'b' },
      { category: 'clinic', title: 'Review', detail: '', dueMonth: 6, dueDate: '2027-04-01', phase: 'p', basis: 'b' },
    ],
  } as any;

  it('does not re-add an item already completed', async () => {
    const saved = await saveSurveillance(caseRecord, sched);
    await completeSurveillanceItem(saved[0].id, 'NED');
    await saveSurveillance(caseRecord, sched);
    const rows = [...tables.tumourBoardSurveillance.values()];
    expect(rows).toHaveLength(2);
    expect(rows.filter(r => r.dueDate === '2027-01-01')).toHaveLength(1);
    expect(rows.find(r => r.dueDate === '2027-01-01')!.status).toBe('completed');
  });
});

describe('measurement units', () => {
  it('refuses a Breslow entered in micrometres', async () => {
    await expect(recordAssessment(caseRecord, { family: 'cutaneous_melanoma', basis: 'pathological', breslowMm: 1200 } as any))
      .rejects.toThrow(/micrometres/);
  });
});
