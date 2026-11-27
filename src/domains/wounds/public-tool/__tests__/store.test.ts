/**
 * The wound tool's storage layer, run against the in-memory tables (the Dexie
 * adapter in toolDb.ts is a one-line mapping onto the same interface).
 */

import { describe, it, expect } from 'vitest';
import {
  createMemoryTables, createWoundStore, ellipseAreaCm2, looksLikeFullName, ValidationError,
} from '../store';
import type { NewAssessmentInput } from '../types';

const store = () => createWoundStore(createMemoryTables());

const wound = { patientLabel: 'AO bed 12', site: 'Heel', aetiology: 'Pressure injury', dateFirstSeen: '2026-11-01' };

const assessment = (woundId: string, assessedAt: string, areaCm2: number, extra: Partial<NewAssessmentInput> = {}): NewAssessmentInput => ({
  woundId, assessedAt, areaCm2, lengthCm: 4, widthCm: 3, method: 'manual', scaleReliable: true, ...extra,
});

describe('wounds', () => {
  it('creates, trims and lists a wound', async () => {
    const s = store();
    const w = await s.createWound({ ...wound, patientLabel: '  AO bed 12 ' });
    expect(w.id).toBeTruthy();
    expect(w.patientLabel).toBe('AO bed 12');
    const list = await s.listWounds();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ patientLabel: 'AO bed 12', assessmentCount: 0, latestAreaCm2: null });
    expect(list[0].analytics.status).toBe('insufficient_data');
  });

  it('refuses a wound without a label, a site or a date', async () => {
    const s = store();
    await expect(s.createWound({ ...wound, patientLabel: ' ' })).rejects.toBeInstanceOf(ValidationError);
    await expect(s.createWound({ ...wound, site: '' })).rejects.toThrow(/site/);
    await expect(s.createWound({ ...wound, dateFirstSeen: 'yesterday' })).rejects.toThrow(/date/);
    await expect(s.createWound({ ...wound, patientLabel: 'x'.repeat(41) })).rejects.toThrow(/40/);
  });

  it('edits a wound', async () => {
    const s = store();
    const w = await s.createWound(wound);
    const edited = await s.updateWound(w.id, { ...wound, site: 'Sacrum' });
    expect(edited.site).toBe('Sacrum');
    expect(edited.createdAt).toBe(w.createdAt);
  });

  it('flags labels that look like a full name, not initials or a bed', () => {
    expect(looksLikeFullName('Ngozi Okafor')).toBe(true);
    expect(looksLikeFullName('AO')).toBe(false);
    expect(looksLikeFullName('AO bed 12')).toBe(false);
    expect(looksLikeFullName('Bed 4')).toBe(false);
    expect(looksLikeFullName('C.E.')).toBe(false);
  });
});

describe('assessments', () => {
  it('saves an assessment with its photo, and the list shows the latest area and reduction', async () => {
    const s = store();
    const w = await s.createWound(wound);
    await s.addAssessment(assessment(w.id, '2026-11-01T10:00:00.000Z', 10));
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
    const a2 = await s.addAssessment(assessment(w.id, '2026-11-15T10:00:00.000Z', 6, { method: 'trace' }), { blob: photo, widthPx: 3, heightPx: 1 });
    expect(a2.photoId).toBeTruthy();
    const stored = await s.getPhoto(a2.photoId!);
    expect(stored?.assessmentId).toBe(a2.id);
    expect(stored?.mimeType).toBe('image/jpeg');

    const [summary] = await s.listWounds();
    expect(summary.assessmentCount).toBe(2);
    expect(summary.latestAreaCm2).toBe(6);
    expect(summary.analytics.percentAreaReduction).toBeCloseTo(40, 5);
    expect(summary.analytics.status).toBe('improving');
  });

  it('lists assessments oldest first whatever order they were entered', async () => {
    const s = store();
    const w = await s.createWound(wound);
    await s.addAssessment(assessment(w.id, '2026-11-20T10:00:00.000Z', 5));
    await s.addAssessment(assessment(w.id, '2026-11-02T10:00:00.000Z', 9));
    const rows = await s.listAssessments(w.id);
    expect(rows.map(r => r.areaCm2)).toEqual([9, 5]);
  });

  it('refuses an assessment with no area, and clamps percentages', async () => {
    const s = store();
    const w = await s.createWound(wound);
    await expect(s.addAssessment(assessment(w.id, '2026-11-01T10:00:00.000Z', 0))).rejects.toThrow(/area/);
    await expect(s.addAssessment(assessment(w.id, 'not a date', 3))).rejects.toThrow(/date/);
    await expect(s.addAssessment(assessment('missing', '2026-11-01T10:00:00.000Z', 3))).rejects.toThrow(/no longer/);
    const a = await s.addAssessment(assessment(w.id, '2026-11-01T10:00:00.000Z', 3, { granulationPct: 140, sloughPct: -5 }));
    expect(a.granulationPct).toBe(100);
    expect(a.sloughPct).toBeNull();
  });

  it('deleting an assessment deletes its photo', async () => {
    const s = store();
    const w = await s.createWound(wound);
    const a = await s.addAssessment(assessment(w.id, '2026-11-01T10:00:00.000Z', 3), { blob: new Blob(['x']) });
    await s.deleteAssessment(a.id);
    expect(await s.listAssessments(w.id)).toHaveLength(0);
    expect(await s.getPhoto(a.photoId!)).toBeUndefined();
  });

  it('deleting a wound deletes its assessments and photos, and leaves other wounds alone', async () => {
    const s = store();
    const w1 = await s.createWound(wound);
    const w2 = await s.createWound({ ...wound, patientLabel: 'Bed 7' });
    await s.addAssessment(assessment(w1.id, '2026-11-01T10:00:00.000Z', 3), { blob: new Blob(['a']) });
    await s.addAssessment(assessment(w2.id, '2026-11-01T10:00:00.000Z', 4), { blob: new Blob(['b']) });
    await s.deleteWound(w1.id);
    expect(await s.counts()).toEqual({ wounds: 1, assessments: 1, photos: 1 });
    expect((await s.listWounds())[0].patientLabel).toBe('Bed 7');
  });
});

describe('manual size', () => {
  it('estimates area from length x width as an ellipse', () => {
    expect(ellipseAreaCm2(4, 3)).toBeCloseTo(9.42, 2);
    expect(ellipseAreaCm2(0, 3)).toBe(0);
    expect(ellipseAreaCm2(Number.NaN, 3)).toBe(0);
  });
});
