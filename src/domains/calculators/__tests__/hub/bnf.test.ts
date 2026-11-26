import { describe, it, expect } from 'vitest';
import { parseBnfInputs } from '../../engine/hub/bnf';
import { searchDrugs, generatePatientWarnings } from '../../../../data/bnfDrugDatabase';
import { bnfReport } from '../../../clinician-assistant/services/bnfReport';
import { reportProblems } from '../../report/format';

describe('hub BNF tab', () => {
  it('blank eGFR and weight are unknown — not 100 and 70', () => {
    const p = parseBnfInputs({ gfr: '', weight: '' });
    expect(p.gfr).toBeNull();
    expect(p.weightKg).toBeNull();
    expect(p.errors).toEqual([]);
  });

  it('an entered eGFR of 0 is kept, not replaced by 100', () => {
    expect(parseBnfInputs({ gfr: '0', weight: '60' }).gfr).toBe(0);
  });

  it('out-of-range values are flagged and treated as unknown', () => {
    const p = parseBnfInputs({ gfr: '500', weight: '-3' });
    expect(p.gfr).toBeNull();
    expect(p.weightKg).toBeNull();
    expect(p.errors).toHaveLength(2);
  });

  it('age and sex come from the patient banner, elderly folded to sex', () => {
    const p = parseBnfInputs({ gfr: '40', weight: '70' }, { name: 'X', age: '72', gender: 'elderly-female', comorbidities: [] });
    expect(p.ageYears).toBe(72);
    expect(p.sex).toBe('female');
  });

  // Every drug the retired ten-drug table covered is in the app database.
  it.each(['metronidazole', 'ciprofloxacin', 'ceftriaxone', 'gentamicin', 'amoxicillin', 'morphine', 'tramadol', 'enoxaparin', 'paracetamol', 'ibuprofen'])(
    '%s is in the BNF database and exports cleanly at eGFR 5',
    (q) => {
      const drug = searchDrugs(q)[0];
      expect(drug).toBeDefined();
      const warnings = generatePatientWarnings(drug, { sex: 'male', age: 60, weight: 70, gfr: 5 });
      const r = bnfReport({
        drug, doseLabel: 'Adult', dose: drug.dosage.adult, warnings, weightKg: 70, ageYears: 60, sex: 'male', gfr: 5,
        flags: { pregnant: false, lactating: false, hepatic: false, cardiac: false },
      });
      expect(r.plan).toBeUndefined();
      expect(reportProblems(r)).toEqual([]);
    }
  );
});
