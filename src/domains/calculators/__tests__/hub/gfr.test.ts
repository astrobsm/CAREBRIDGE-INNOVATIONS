import { describe, it, expect } from 'vitest';
import { computeGfr, gfrReport, type GfrHubInput } from '../../engine/hub/gfr';
import { calculateGFR } from '../../engine/calculationEngine';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';

const base: GfrHubInput = { creatinine: '1.0', creatinineUnit: 'mg/dL', age: '50', gender: 'male', weight: '70' };

describe('/calculators GFR', () => {
  it.each([
    ['G1', { creatinine: '0.7' }],
    ['G3a µmol/L female', { creatinine: '110', creatinineUnit: 'umol/L' as const, gender: 'female' as const, age: '64' }],
    ['G4 no weight', { creatinine: '3.0', weight: '' }],
    ['G5', { creatinine: '9', age: '70' }],
  ])('%s: engine stage, complete report incl. referral', (_n, over) => {
    const input = { ...base, ...over };
    const res = computeGfr(input).result!;
    const g = calculateGFR({ creatinine: Number(input.creatinine), creatinineUnit: input.creatinineUnit, ageYears: Number(input.age), sex: input.gender, weightKg: input.weight ? Number(input.weight) : undefined })!;
    expect(res.ckdStage).toBe(g.ckdStage);
    expect(res.gfrCKDEPI).toBe(g.gfrCKDEPI);
    if (!input.weight) expect(res.gfrCockcroftGault).toBeNull();
    const report = gfrReport(res);
    expect(reportProblems(report)).toEqual([]);
    expect(report.plan!.sections.length).toBeGreaterThan(0);
    if (res.referralCriteria.length) expect(report.plan!.sections.some(s => s.title === 'Referral needed')).toBe(true);
    expect(buildCalculatorPdf(report).getNumberOfPages()).toBeGreaterThan(0);
  });

  it.each([
    ['zero creatinine', { creatinine: '0' }, /greater than zero/],
    ['negative creatinine', { creatinine: '-1' }, /greater than zero/],
    ['µmol/L value in mg/dL', { creatinine: '106' }, /check the unit/],
    ['child', { age: '10' }, /adults/],
    ['blank', { creatinine: '' }, /creatinine/],
  ])('rejects %s (never Infinity, NaN or G1)', (_n, over, msg) => {
    const r = computeGfr({ ...base, ...over });
    expect(r.result).toBeUndefined();
    expect(r.errors!.join(' ')).toMatch(msg);
  });
});
