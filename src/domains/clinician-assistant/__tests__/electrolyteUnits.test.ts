// Electrolytes reported in mEq/L. Sodium, potassium, chloride and bicarbonate
// carry one charge, so 1 mEq/L is 1 mmol/L; only divalent ions (calcium,
// magnesium) halve. They were sharing the calcium rule, so a sodium of
// 140 mEq/L read as 70 mmol/L — a false critical hyponatraemia.

import { describe, it, expect } from 'vitest';
import { toCanonical } from '../services/engine/units';
import { ANALYTE_BY_KEY } from '../services/engine/referenceRanges';

const ruleOf = (key: string) => ANALYTE_BY_KEY[key].unitRule;

describe('electrolyte units', () => {
  it.each([
    ['na', 140], ['k', 4.2], ['cl', 102], ['hco3', 24], ['baseExcess', -3],
  ])('%s in mEq/L equals mmol/L', (key, v) => {
    expect(toCanonical(ruleOf(key), v, 'mEq/L').value).toBe(v);
    expect(toCanonical(ruleOf(key), v, 'mmol/L').value).toBe(v);
  });

  it('still halves divalent ions given in mEq/L', () => {
    expect(toCanonical(ruleOf('calcium'), 4.8, 'mEq/L').value).toBe(2.4);
    expect(toCanonical(ruleOf('magnesium'), 1.8, 'mEq/L').value).toBe(0.9);
  });
});
