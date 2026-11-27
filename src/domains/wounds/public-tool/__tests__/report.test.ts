/**
 * The per-wound PDF is built with the app's shared jsPDF tooling and carries
 * the trend, every assessment and the practice name.
 */

import { describe, it, expect } from 'vitest';
import { buildWoundReport, PRACTICE_NAME, reportFileName } from '../report';
import type { ToolAssessment, ToolWound } from '../types';

const wound: ToolWound = {
  id: 'w1', patientLabel: 'AO bed 12', site: 'Heel', aetiology: 'Pressure injury',
  dateFirstSeen: '2026-11-01', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
};

const a = (id: string, assessedAt: string, areaCm2: number, extra: Partial<ToolAssessment> = {}): ToolAssessment => ({
  id, woundId: 'w1', assessedAt, areaCm2, lengthCm: 4, widthCm: 3, method: 'trace', scaleReliable: true,
  createdAt: assessedAt, updatedAt: assessedAt, ...extra,
});

describe('wound PDF report', () => {
  it('builds a multi-section PDF from the shared generator', () => {
    const rows = [
      a('a1', '2026-11-01T10:00:00Z', 10),
      a('a2', '2026-11-08T10:00:00Z', 8, { scaleReliable: false, method: 'auto' }),
      a('a3', '2026-11-15T10:00:00Z', 6, { notes: 'Granulating well', granulationPct: 80, sloughPct: 20 }),
    ];
    const doc = buildWoundReport(wound, rows);
    const out = doc.output();
    expect(out.startsWith('%PDF-')).toBe(true);
    // Text is in the content stream (uncompressed by default).
    for (const text of [PRACTICE_NAME, 'WOUND MEASUREMENT REPORT', 'AO bed 12', 'Area over time', 'Assessments', 'Granulating well', 'No reliable scale']) {
      expect(out, text).toContain(text);
    }
    expect(out).toContain('40.0%'); // area reduction 10 -> 6
  });

  it('handles a wound with a single assessment', () => {
    const out = buildWoundReport(wound, [a('a1', '2026-11-01T10:00:00Z', 10)]).output();
    expect(out.startsWith('%PDF-')).toBe(true);
    expect(out).not.toContain('Area over time');
  });

  it('names the file from the label, safely', () => {
    expect(reportFileName({ ...wound, patientLabel: 'AO / bed 12' }, new Date('2026-11-27T00:00:00Z')))
      .toBe('wound-report-AO-bed-12-2026-11-27.pdf');
  });
});
