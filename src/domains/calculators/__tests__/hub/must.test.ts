import { describe, it, expect } from 'vitest';
import { computeMust, mustReport, type MustInput } from '../../engine/hub/must';
import { reportProblems } from '../../report/format';
import { pdfText } from './nutritionPdfText';
import type { PatientCalculatorInfo } from '../../types';

const base: MustInput = { weightKg: '65', heightCm: '170', previousWeightKg: '', weightLossDuration: '3-6 months', acutelyIll: false, npoOrReduced: false };
const patient: PatientCalculatorInfo = { name: 'Test Patient', age: '70', gender: 'elderly-male', comorbidities: ['Diabetes Mellitus', 'Chronic Kidney Disease'] };

describe('hub MUST', () => {
  it.each([
    ['low risk', base, 0, 'Low'],
    ['BMI 18.5-20', { ...base, weightKg: '56' }, 1, 'Medium'],
    ['BMI < 18.5, 12% loss, acutely ill', { ...base, weightKg: '50', previousWeightKg: '57', acutelyIll: true, npoOrReduced: true }, 6, 'High'],
    ['weight gain scores 0', { ...base, previousWeightKg: '58' }, 0, 'Low'],
  ] as const)('%s', (_n, input, score, risk) => {
    const out = computeMust(input);
    expect('result' in out).toBe(true);
    if (!('result' in out)) return;
    expect(out.result.totalScore).toBe(score);
    expect(out.result.riskCategory).toBe(risk);
    const r = mustReport(out.result, input, patient);
    expect(reportProblems(r)).toEqual([]);
    expect(r.plan!.sections.length).toBeGreaterThan(0);
    const text = pdfText(r);
    expect(text).toContain('MUST malnutrition screening');
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('rejects height 0 / blank instead of scoring an Infinity BMI', () => {
    for (const heightCm of ['0', '', 'abc']) {
      const out = computeMust({ ...base, heightCm });
      expect('errors' in out).toBe(true);
    }
    expect('errors' in computeMust({ ...base, weightKg: '-5' })).toBe(true);
  });

  it('matches "Diabetes Mellitus" and "Chronic Kidney Disease" on the comorbidity list', () => {
    const out = computeMust({ ...base, comorbidities: patient.comorbidities });
    if (!('result' in out)) throw new Error('expected result');
    expect(out.result.additionalConsiderations!.join(' ')).toMatch(/Diabetes present/);
    expect(out.result.additionalConsiderations!.join(' ')).toMatch(/CKD present/);
  });

  it('a blank previous weight is stated as not assessed', () => {
    const out = computeMust(base);
    if (!('result' in out)) throw new Error('expected result');
    expect(String(out.result.scoreBreakdown!.weightLoss)).toMatch(/not assessed/);
  });
});
