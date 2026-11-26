import { describe, it, expect } from 'vitest';
import { computeSodium, sodiumReport, type SodiumHubInput } from '../../engine/hub/sodium';
import { electrolyteCorrection } from '../../../clinician-assistant/services/clinicalCalculators';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';
import type { CalculatorReport } from '../../report/types';
import type { PatientCalculatorInfo } from '../../types';

function pdfText(r: CalculatorReport): string {
  const doc = buildCalculatorPdf(r, { clinician: 'Dr Test' });
  const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
  const stream = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
  const shown: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) shown.push(m[1].replace(/\\([()\\])/g, '$1'));
  return shown.join(' ').replace(/\s+/g, ' ');
}

const base: SodiumHubInput = {
  currentNa: '110', targetNa: '140', weight: '100', gender: 'male', volumeStatus: 'euvolemic',
  isAcute: false, hasSymptoms: true, ageYears: 56,
};
const patient: PatientCalculatorInfo = { name: 'Owner Case', age: '56', gender: 'male', weight: '100', comorbidities: [] };

describe('/calculators sodium', () => {
  it('the owner\'s case (Na 110, 100 kg, male 56, severe symptoms) has the engine plan', () => {
    const r = computeSodium(base);
    expect(r.errors).toBeUndefined();
    const res = r.result!;
    expect(res.tbwL).toBe(60);
    expect(res.sodiumDeficitMmol).toBe(1800); // (140 − 110) × 60
    expect(res.nsRateMlPerHr).toBeNull(); // not a 0.9% saline situation
    expect(res.fluidType).toMatch(/3% sodium chloride/);
    // The plan is the bedside engine's, step for step.
    const engine = electrolyteCorrection({ finding: 'lyte.hyponatraemia', values: { na: 110 }, weightKg: 100, ageYears: 56, sex: 'male', severity: 'severe' })!;
    expect(res.plan!.steps).toEqual(engine.steps);
    expect(res.plan!.hardLimits).toEqual(engine.hardLimits);
    const report = sodiumReport(res, patient);
    expect(reportProblems(report)).toEqual([]);
    expect(report.plan!.steps.length).toBeGreaterThan(0);
    expect(report.plan!.hardLimits.join(' ')).toMatch(/10 mmol\/L in the first 24 hours/);
    // No conflicting "6 mmol/L per 24h" rule survives anywhere in the report.
    expect(JSON.stringify(report)).not.toMatch(/6 mmol\/L per 24/);
    const text = pdfText(report);
    expect(text).toContain('Sodium disorder');
    expect(text).toMatch(/Hypertonic sodium chloride 3%/);
  });

  it.each([
    ['hypovolaemic mild hyponatraemia', { currentNa: '130', hasSymptoms: false, volumeStatus: 'hypovolemic' as const }],
    ['hypervolaemic hyponatraemia', { currentNa: '126', hasSymptoms: false, volumeStatus: 'hypervolemic' as const }],
    ['hypernatraemia, elderly female', { currentNa: '160', targetNa: '145', gender: 'elderly-female' as const, ageYears: null, hasSymptoms: false }],
    ['hypernatraemia, hypovolaemic', { currentNa: '158', targetNa: '145', volumeStatus: 'hypovolemic' as const, hasSymptoms: false }],
    ['normal sodium', { currentNa: '140', targetNa: '140', hasSymptoms: false }],
  ])('%s: report is complete', (_n, over) => {
    const r = computeSodium({ ...base, ...over });
    expect(r.errors).toBeUndefined();
    const report = sodiumReport(r.result!, patient);
    expect(reportProblems(report)).toEqual([]);
    expect(pdfText(report)).toContain('Sodium disorder');
    if (r.result!.isHypo || r.result!.isHyper) expect(report.plan!.monitoring.length).toBeGreaterThan(0);
    else expect(report.plan).toBeUndefined();
  });

  it('the 0.9% saline rate is shown only for hypovolaemic hyponatraemia without severe symptoms', () => {
    const r = computeSodium({ ...base, currentNa: '128', volumeStatus: 'hypovolemic', hasSymptoms: false }).result!;
    expect(r.nsRateMlPerHr).toBeGreaterThan(0);
    expect(Number.isFinite(r.nsRateMlPerHr!)).toBe(true);
  });

  it.each([
    ['blank sodium', { currentNa: '' }, /current sodium/],
    ['zero sodium', { currentNa: '0' }, /between 90 and 200/],
    ['zero weight', { weight: '0' }, /Weight must be/],
    ['blank weight', { weight: '' }, /body weight/],
    ['non-numeric', { currentNa: 'abc' }, /between 90 and 200/],
    ['target below current in hyponatraemia', { targetNa: '125', currentNa: '128' }, /target must be above/],
  ])('rejects %s', (_n, over, msg) => {
    const r = computeSodium({ ...base, ...over });
    expect(r.result).toBeUndefined();
    expect(r.errors!.join(' ')).toMatch(msg);
  });
});
