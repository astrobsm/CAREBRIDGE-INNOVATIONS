import { describe, it, expect } from 'vitest';
import { computeAcidBase, acidBaseReport, type AcidBaseHubInput } from '../../engine/hub/acidBase';
import { acidBase } from '../../../clinician-assistant/services/clinicalCalculators';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';

const base: AcidBaseHubInput = { ph: '7.21', pco2: '24', pco2Unit: 'mmHg', hco3: '9', sodium: '138', chloride: '100', albumin: '' };

describe('/calculators acid-base', () => {
  it.each([
    ['metabolic acidosis, raised gap', {}],
    ['metabolic acidosis, no Na/Cl', { sodium: '', chloride: '' }],
    ['metabolic acidosis, albumin in g/L', { albumin: '28' }],
    ['respiratory acidosis in kPa', { ph: '7.25', pco2: '8.5', pco2Unit: 'kPa' as const, hco3: '27' }],
    ['respiratory alkalosis', { ph: '7.52', pco2: '28', hco3: '22' }],
    ['metabolic alkalosis', { ph: '7.50', pco2: '48', hco3: '36' }],
    ['mixed', { ph: '7.10', pco2: '60', hco3: '15' }],
    ['normal', { ph: '7.40', pco2: '40', hco3: '24' }],
  ])('%s: same disorder as the bedside engine; complete report', (_n, over) => {
    const input = { ...base, ...over };
    const r = computeAcidBase(input);
    expect(r.errors).toBeUndefined();
    const res = r.result!;
    const n = (v: string) => (v.trim() === '' ? null : Number(v));
    const engine = acidBase({ ph: n(input.ph), paco2: n(input.pco2), paco2Unit: input.pco2Unit, hco3: n(input.hco3), sodium: n(input.sodium), chloride: n(input.chloride), albumin: n(input.albumin) });
    expect(res.primary).toBe(engine.interpretation!.primary);
    expect(res.anionGap).toBe(engine.anionGap);
    expect(res.correctedAnionGap).toBe(engine.correctedAnionGap);
    const report = acidBaseReport(res);
    expect(reportProblems(report)).toEqual([]);
    if (res.primary === 'normal') expect(report.plan).toBeUndefined();
    else expect(report.plan!.sections.length).toBeGreaterThan(0);
    expect(buildCalculatorPdf(report).getNumberOfPages()).toBeGreaterThan(0);
  });

  it('blank Na/Cl gives no anion gap instead of NaN', () => {
    const res = computeAcidBase({ ...base, sodium: '', chloride: '' }).result!;
    expect(res.anionGap).toBeNull();
    expect(JSON.stringify(acidBaseReport(res))).not.toMatch(/NaN/);
  });

  it('PaCO₂ entered in kPa is shown rounded in mmHg', () => {
    const res = computeAcidBase({ ...base, pco2: '5', pco2Unit: 'kPa' }).result!;
    const v = acidBaseReport(res).inputs.find(f => f.label === 'PaCO₂')!.value;
    expect(v).toMatch(/^\d+ mmHg \(5\.0 kPa\)$/);
  });

  it.each([
    ['blank pH', { ph: '' }, /pH/],
    ['mmHg value in kPa', { pco2: '40', pco2Unit: 'kPa' as const }, /switch the unit/],
    ['impossible HCO3', { hco3: '99' }, /Bicarbonate/],
  ])('rejects %s', (_n, over, msg) => {
    expect(computeAcidBase({ ...base, ...over }).errors!.join(' ')).toMatch(msg);
  });
});
