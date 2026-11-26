/**
 * The Bedside eGFR and the /calculators eGFR are one implementation: the
 * bedside adapter delegates to calculationEngine.calculateGFR, so the two
 * surfaces cannot disagree on the value or the stage.
 */
import { describe, it, expect } from 'vitest';
import { egfrCkdEpi } from '../../clinician-assistant/services/clinicalCalculators';
import { calculateGFR } from '../engine/calculationEngine';

describe('one eGFR for both surfaces', () => {
  it('matches the engine value and stage across creatinine, age and sex', () => {
    for (const creat of [40, 62, 88, 120, 180, 260, 450, 900]) {
      for (const age of [20, 45, 70, 90]) {
        for (const sex of ['male', 'female'] as const) {
          const bedside = egfrCkdEpi({ creatinineUmolL: creat, ageYears: age, sex });
          const hub = calculateGFR({ creatinine: creat, creatinineUnit: 'umol/L', ageYears: age, sex })!;
          expect(bedside.egfr).toBe(hub.gfrCKDEPI);
          expect(bedside.stage.startsWith(hub.ckdStage + ' ')).toBe(true);
        }
      }
    }
  });

  it('stages on the unrounded value at a boundary', () => {
    // Search for a creatinine that lands in [59.5, 60) — rounding to an
    // integer used to stage it G2 here and G3a on the hub.
    let found = false;
    for (let c = 100; c < 140 && !found; c += 0.1) {
      const hub = calculateGFR({ creatinine: c, creatinineUnit: 'umol/L', ageYears: 60, sex: 'male' })!;
      if (hub.gfrCKDEPI >= 59.5 && hub.gfrCKDEPI < 60) {
        found = true;
        const b = egfrCkdEpi({ creatinineUmolL: c, ageYears: 60, sex: 'male' });
        expect(b.stage).toMatch(/^G3a/);
      }
    }
    expect(found).toBe(true);
  });

  it('rejects zero, negative and missing values', () => {
    expect(egfrCkdEpi({ creatinineUmolL: 0, ageYears: 50, sex: 'male' }).egfr).toBeNull();
    expect(egfrCkdEpi({ creatinineUmolL: -5, ageYears: 50, sex: 'male' }).egfr).toBeNull();
    expect(egfrCkdEpi({ creatinineUmolL: 90, ageYears: null, sex: 'male' }).egfr).toBeNull();
  });
});
