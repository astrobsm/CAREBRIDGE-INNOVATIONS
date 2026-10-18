/**
 * Saving the same analysis twice updates one record; it does not file the
 * analysis twice. Ported from the UNTH Clinician Assistant audit (sync key).
 */
import { describe, it, expect, vi } from 'vitest';

const rows = new Map<string, any>();
vi.mock('../../../database', () => ({
  db: {
    patients: { get: async () => undefined },
    clinicianAnalyses: {
      get: async (id: string) => rows.get(id),
      put: async (r: any) => { rows.set(r.id, { ...r }); return r.id; },
    },
  },
}));
vi.mock('../../../services/cloudSyncService', () => ({ syncRecord: vi.fn() }));

import { saveAnalysis } from '../services/clinicianAssistantService';

const result = {
  analysis: {
    patient: { hospitalNumber: 'H1' }, overallSeverity: 'normal', impression: [], nextSteps: [],
    modules: [], correlations: [],
  },
  unmapped: [],
  sources: { investigations: 1, vitals: 0 },
} as any;

describe('saveAnalysis', () => {
  it('updates the same record when the same result is saved again, keeping its note', async () => {
    const first = await saveAnalysis('p1', result, { id: 'k1', notes: 'reviewed' });
    const again = await saveAnalysis('p1', result, { id: 'k1' });
    expect(again.id).toBe(first.id);
    expect(rows.size).toBe(1);
    expect(again.createdAt).toBe(first.createdAt);
    expect(again.notes).toBe('reviewed');
  });

  it('files a new run as a new record', async () => {
    await saveAnalysis('p1', result, {});
    expect(rows.size).toBe(2);
  });
});
