import { describe, it, expect } from 'vitest';
import { computePotassium, potassiumReport, type PotassiumHubInput } from '../../engine/hub/potassium';
import { electrolyteCorrection } from '../../../clinician-assistant/services/clinicalCalculators';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';
import type { CalculatorReport } from '../../report/types';

function pdfText(r: CalculatorReport): string {
  const doc = buildCalculatorPdf(r);
  const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
  const stream = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
  const shown: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) shown.push(m[1].replace(/\\([()\\])/g, '$1'));
  return shown.join(' ').replace(/\s+/g, ' ');
}

const base: PotassiumHubInput = {
  currentK: '2.8', weight: '70', hasRenalImpairment: false, onDigoxin: false,
  hasEcgChanges: false, hasMuscleWeakness: false, oralIntakeOk: true,
};

describe('/calculators potassium', () => {
  it.each([
    ['mild hypo', { currentK: '3.2' }],
    ['moderate hypo, digoxin, renal', { currentK: '2.7', onDigoxin: true, hasRenalImpairment: true }],
    ['severe hypo, no oral intake', { currentK: '2.1', oralIntakeOk: false, hasMuscleWeakness: true }],
    ['mild hyper', { currentK: '5.3' }],
    ['moderate hyper with ECG changes', { currentK: '6.1', hasEcgChanges: true }],
    ['severe hyper, renal', { currentK: '7.2', hasRenalImpairment: true }],
    ['no weight', { currentK: '2.9', weight: '' }],
  ])('%s: engine plan, complete report', (_n, over) => {
    const r = computePotassium({ ...base, ...over });
    expect(r.errors).toBeUndefined();
    const res = r.result!;
    const k = Number(over.currentK);
    const engine = electrolyteCorrection({ finding: k < 3.5 ? 'lyte.hypokalaemia' : 'lyte.hyperkalaemia', values: { k }, weightKg: null })!;
    expect(res.plan!.steps).toEqual(engine.steps);
    const report = potassiumReport(res);
    expect(reportProblems(report)).toEqual([]);
    expect(report.plan!.steps.length).toBeGreaterThan(0);
    expect(report.plan!.hardLimits.length).toBeGreaterThan(0);
    expect(pdfText(report)).toContain('Potassium disorder');
  });

  it('ECG changes make a moderate hyperkalaemia severe', () => {
    expect(computePotassium({ ...base, currentK: '6.0', hasEcgChanges: true }).result!.tone).toBe('severe');
    expect(computePotassium({ ...base, currentK: '6.0' }).result!.tone).toBe('moderate');
  });

  it('normal potassium has no plan and a clean report', () => {
    const r = computePotassium({ ...base, currentK: '4.2' }).result!;
    expect(r.plan).toBeNull();
    const report = potassiumReport(r);
    expect(report.plan).toBeUndefined();
    expect(reportProblems(report)).toEqual([]);
  });

  it.each([
    ['blank', { currentK: '' }, /current potassium/],
    ['impossible', { currentK: '28' }, /between 1.0 and 10.0/],
    ['bad weight', { weight: '-3' }, /Weight/],
  ])('rejects %s', (_n, over, msg) => {
    const r = computePotassium({ ...base, ...over });
    expect(r.errors!.join(' ')).toMatch(msg);
  });
});
