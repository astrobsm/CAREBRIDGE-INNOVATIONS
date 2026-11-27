/**
 * CSV export: one row per assessment, for a spreadsheet or an audit.
 */

import type { ToolAssessment, ToolWound } from './types';

export const CSV_HEADERS = [
  'Wound label', 'Site', 'Aetiology', 'Date first seen',
  'Assessment date', 'Length (cm)', 'Width (cm)', 'Area (cm2)', 'Perimeter (cm)', 'Depth (cm)',
  'Area reduction from first (%)',
  'Granulation (%)', 'Slough (%)', 'Necrotic (%)', 'Epithelial (%)',
  'Tissue types', 'Exudate amount', 'Exudate type',
  'Method', 'Calibration', 'Scale reliable', 'Photo kept', 'Notes',
];

/**
 * One CSV cell. Quotes when needed, and defuses text that a spreadsheet would
 * run as a formula (=, +, -, @ at the start).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

const r1 = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;

export function buildCsv(wounds: ToolWound[], assessments: ToolAssessment[]): string {
  const byWound = new Map<string, ToolAssessment[]>();
  for (const a of assessments) {
    const list = byWound.get(a.woundId) ?? [];
    list.push(a);
    byWound.set(a.woundId, list);
  }
  const lines = [CSV_HEADERS.map(csvCell).join(',')];
  const sortedWounds = wounds.slice().sort((a, b) => a.patientLabel.localeCompare(b.patientLabel));
  for (const w of sortedWounds) {
    const rows = (byWound.get(w.id) ?? []).slice()
      .sort((a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime());
    const baseline = rows[0]?.areaCm2;
    for (const a of rows) {
      const reduction = baseline && baseline > 0 ? ((baseline - a.areaCm2) / baseline) * 100 : null;
      lines.push([
        w.patientLabel, w.site, w.aetiology ?? '', w.dateFirstSeen,
        a.assessedAt.slice(0, 10), r1(a.lengthCm), r1(a.widthCm), r1(a.areaCm2), r1(a.perimeterCm), r1(a.depthCm),
        r1(reduction),
        r1(a.granulationPct), r1(a.sloughPct), r1(a.necroticPct), r1(a.epithelialPct),
        (a.tissueTypes ?? []).join('; '), a.exudateAmount ?? '', a.exudateType ?? '',
        a.method, a.calibrationMethod ?? '', a.scaleReliable ? 'yes' : 'no', a.photoId ? 'yes' : 'no', a.notes ?? '',
      ].map(csvCell).join(','));
    }
  }
  // CRLF, and a BOM so Excel reads the UTF-8 (cm², names) correctly.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function csvFileName(date = new Date()): string {
  return `wound-measure-${date.toISOString().slice(0, 10)}.csv`;
}
