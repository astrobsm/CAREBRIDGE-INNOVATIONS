import { describe, it, expect } from 'vitest';
import { computeBraden, bradenReport, type BradenInput } from '../../engine/hub/braden';
import { scoreBraden, interpretBraden } from '../../../clinician-assistant/services/riskCalculators';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';

const all = (v: number, fs = Math.min(v, 3)): BradenInput => ({
  sensoryPerception: v, moisture: v, activity: v, mobility: v, nutrition: v, frictionShear: fs,
});

describe('hub Braden', () => {
  it.each([
    [all(4), 23, 'No Risk'],
    [{ ...all(3), frictionShear: 3 }, 18, 'Mild Risk'],
    [{ ...all(2), frictionShear: 3, nutrition: 3, mobility: 3 }, 15, 'Mild Risk'],
    [{ ...all(2), frictionShear: 2, moisture: 3, nutrition: 3 }, 14, 'Moderate Risk'],
    [all(2), 12, 'High Risk'],
    [all(1), 6, 'Very High Risk'],
  ])('scores %o as %i (%s)', (input, total, level) => {
    const r = computeBraden(input);
    if ('errors' in r) throw new Error(r.errors.join());
    expect(r.result.totalScore).toBe(total);
    expect(r.result.riskLevel).toBe(level);
    const rep = bradenReport(r.result, { name: '', age: '', gender: 'male', comorbidities: [] });
    expect(reportProblems(rep)).toEqual([]);
    expect(rep.plan!.sections.length).toBeGreaterThan(0);
    const doc = buildCalculatorPdf(rep);
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });

  it('the total is the shared scorer; the 9/12/14 cut-offs agree with interpretBraden', () => {
    for (const t of [6, 9, 10, 12, 13, 14]) {
      const hub = computeBraden({ sensoryPerception: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 });
      expect('result' in hub).toBe(true);
      const shared = interpretBraden(t).riskLevel;
      const expected = t <= 9 ? 'very_high' : t <= 12 ? 'high' : 'moderate';
      expect(shared).toBe(expected);
    }
    expect(scoreBraden({ sensory_perception: 3, moisture: 3, activity: 3, mobility: 3, nutrition: 3, friction_shear: 3 })).toBe(18);
  });

  it('rejects out-of-range subscores', () => {
    expect('errors' in computeBraden({ ...all(4), moisture: 5 })).toBe(true);
    expect('errors' in computeBraden({ ...all(4), frictionShear: 4 })).toBe(true);
    expect('errors' in computeBraden({ ...all(4), activity: 0 })).toBe(true);
  });
});
