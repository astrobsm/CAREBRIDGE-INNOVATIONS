/**
 * Backup export and import, so a clinician can move to a new phone: every
 * wound, assessment and photo (byte for byte) comes back, and a file that is
 * not a backup is refused with a plain message.
 */

import { describe, it, expect } from 'vitest';
import { createMemoryTables, createWoundStore } from '../store';
import {
  BACKUP_FORMAT, BACKUP_VERSION, BackupError, base64ToBlob, blobToBase64, buildBackup, backupFileName, parseBackup,
} from '../backup';
import { buildCsv, csvCell, CSV_HEADERS } from '../csv';

async function seeded() {
  const s = createWoundStore(createMemoryTables());
  const w = await s.createWound({ patientLabel: 'CE bed 3', site: 'Lateral malleolus', aetiology: 'Venous', dateFirstSeen: '2026-10-01' });
  const bytes = new Uint8Array(70_000).map((_, i) => (i * 7) % 256); // bigger than one chunk
  await s.addAssessment(
    { woundId: w.id, assessedAt: '2026-10-01T09:00:00.000Z', areaCm2: 12.5, lengthCm: 5, widthCm: 3.2, method: 'trace', scaleReliable: true, calibrationMethod: 'green_marker', contourCm: [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }], notes: 'Sloughy base, "watch"' },
    { blob: new Blob([bytes], { type: 'image/jpeg' }), widthPx: 1280, heightPx: 960, pixelsPerCm: 41.2, hasContourOverlay: true },
  );
  await s.addAssessment({ woundId: w.id, assessedAt: '2026-10-15T09:00:00.000Z', areaCm2: 8, lengthCm: 4, widthCm: 2.5, method: 'manual', scaleReliable: true });
  return { s, w, bytes };
}

describe('blob <-> base64', () => {
  it('round-trips binary data', async () => {
    const bytes = new Uint8Array([0, 255, 128, 1, 2, 3]);
    const b64 = await blobToBase64(new Blob([bytes]));
    const back = new Uint8Array(await base64ToBlob(b64, 'image/png').arrayBuffer());
    expect([...back]).toEqual([...bytes]);
  });
});

describe('backup round trip', () => {
  it('restores everything, photos byte for byte, onto an empty phone', async () => {
    const { s, bytes } = await seeded();
    const backup = await buildBackup(await s.dumpAll(), new Date('2026-11-27T08:00:00Z'));
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBe('2026-11-27T08:00:00.000Z');

    const text = JSON.stringify(backup);
    const parsed = parseBackup(text);
    const fresh = createWoundStore(createMemoryTables());
    await fresh.loadAll(parsed);

    const before = await s.dumpAll();
    const after = await fresh.dumpAll();
    const strip = (rows: Array<{ id: string }>) => rows.map(r => ({ ...r })).sort((a, b) => a.id.localeCompare(b.id));
    expect(strip(after.wounds)).toEqual(strip(before.wounds));
    expect(strip(after.assessments)).toEqual(strip(before.assessments));
    expect(after.photos).toHaveLength(1);
    const photo = after.photos[0];
    expect(photo).toMatchObject({ mimeType: 'image/jpeg', widthPx: 1280, heightPx: 960, pixelsPerCm: 41.2, hasContourOverlay: true });
    expect(new Uint8Array(await photo.blob.arrayBuffer())).toEqual(bytes);

    const [summary] = await fresh.listWounds();
    expect(summary.analytics.percentAreaReduction).toBeCloseTo(36, 5);
  });

  it('importing the same backup twice changes nothing', async () => {
    const { s } = await seeded();
    const parsed = parseBackup(JSON.stringify(await buildBackup(await s.dumpAll())));
    await s.loadAll(parsed);
    await s.loadAll(parsed);
    expect(await s.counts()).toEqual({ wounds: 1, assessments: 2, photos: 1 });
  });

  it('merges with what is already on the phone, and replace empties it first', async () => {
    const { s } = await seeded();
    const parsed = parseBackup(JSON.stringify(await buildBackup(await s.dumpAll())));
    const other = createWoundStore(createMemoryTables());
    await other.createWound({ patientLabel: 'Bed 9', site: 'Sacrum', dateFirstSeen: '2026-11-01' });
    await other.loadAll(parsed, 'merge');
    expect((await other.counts()).wounds).toBe(2);
    await other.loadAll(parsed, 'replace');
    expect((await other.counts()).wounds).toBe(1);
  });

  it('refuses files that are not a backup, or from a newer version', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a Wound Measure backup/);
    expect(() => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1 }))).toThrow(/newer version/);
  });

  it('skips broken rows, and an assessment whose photo is missing keeps its numbers', () => {
    const parsed = parseBackup(JSON.stringify({
      format: BACKUP_FORMAT, version: 1,
      wounds: [{ id: 'w1', patientLabel: 'AB', site: 'Shin', dateFirstSeen: '2026-11-01' }, { id: 'bad' }],
      assessments: [
        { id: 'a1', woundId: 'w1', assessedAt: '2026-11-01T00:00:00Z', areaCm2: 3, photoId: 'p-missing', method: 'manual', scaleReliable: true },
        { id: 'a2', woundId: 'nowhere', assessedAt: '2026-11-01T00:00:00Z', areaCm2: 3 },
      ],
      photos: [{ id: 'p2', assessmentId: 'a-gone', base64: 'AAAA' }],
    }));
    expect(parsed.wounds.map(w => w.id)).toEqual(['w1']);
    expect(parsed.assessments.map(a => a.id)).toEqual(['a1']);
    expect(parsed.assessments[0].photoId).toBeUndefined();
    expect(parsed.photos).toHaveLength(0);
  });

  it('names the file by date', () => {
    expect(backupFileName(new Date('2026-11-27T10:00:00Z'))).toBe('wound-measure-backup-2026-11-27.json');
  });
});

describe('CSV export', () => {
  it('has one row per assessment with the reduction from the first', async () => {
    const { s } = await seeded();
    const { wounds, assessments } = await s.dumpAll();
    const csv = buildCsv(wounds, assessments);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0].split(',')).toHaveLength(CSV_HEADERS.length);
    expect(lines[1]).toContain('CE bed 3,Lateral malleolus,Venous,2026-10-01,2026-10-01,5,3.2,12.5');
    expect(lines[1]).toContain('"Sloughy base, ""watch"""');
    expect(lines[2]).toContain(',36,'); // (12.5 - 8) / 12.5
    expect(lines[1]).toContain(',yes,'); // photo kept
  });

  it('defuses spreadsheet formulas in typed text', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(null)).toBe('');
  });
});
