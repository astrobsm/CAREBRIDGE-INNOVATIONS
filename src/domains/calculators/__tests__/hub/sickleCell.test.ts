import { describe, it, expect } from 'vitest';
import { computeSickle, sickleReport, type SickleHubInput } from '../../engine/hub/sickleCell';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';

const base: SickleHubInput = {
  weight: '55', age: '24', hbLevel: '7.5', hbS: '', reticulocyteCount: '', crisisType: 'vaso-occlusive',
  painScore: 6, hasFever: false, hasACS: false, hasStroke: false, hasPriapism: false, hasSplenic: false, hasAplastic: false,
  onHydroxyurea: false, currentHUDose: '', transfusionHistory: 'none',
  wound: { hasWound: false, woundType: 'leg_ulcer', woundLocation: 'medial_malleolus', woundDuration: '', woundSize: '', currentTreatment: '', zincLevel: '', albuminLevel: '', nutritionStatus: 'adequate' },
};

describe('/calculators sickle cell', () => {
  it('mild pain never downgrades a stroke, ACS or Hb < 5', () => {
    expect(computeSickle({ ...base, painScore: 2, hasStroke: true }).result!.severity).toBe('Critical');
    expect(computeSickle({ ...base, painScore: 3, hbLevel: '4.5' }).result!.severity).toBe('Critical');
    expect(computeSickle({ ...base, painScore: 4, hbLevel: '5.5' }).result!.severity).toBe('Severe');
    expect(computeSickle({ ...base, painScore: 3 }).result!.severity).toBe('Mild');
    const stroke = computeSickle({ ...base, painScore: 2, hasStroke: true }).result!;
    expect(stroke.hydroxyureaIndicated).toBe(true);
    expect(stroke.exchangeTransfusion).toBe(true);
  });

  it('the crisis type counts as the complication', () => {
    const acs = computeSickle({ ...base, crisisType: 'acs' }).result!;
    expect(acs.severity).toBe('Critical');
    expect(acs.acsManagement!.length).toBeGreaterThan(0);
    const stroke = computeSickle({ ...base, crisisType: 'stroke' }).result!;
    expect(stroke.exchangeTransfusion).toBe(true);
    expect(stroke.emergencyReferral).toBe(true);
    const pri = computeSickle({ ...base, crisisType: 'priapism' }).result!;
    expect(pri.referralReasons!.join(' ')).toMatch(/urology/);
  });

  it('a blank Hb is "not entered", not 8 g/dL', () => {
    const r = computeSickle({ ...base, hbLevel: '' }).result!;
    expect(r.hb).toBeNull();
    expect(r.severityFactors!.join(' ')).toMatch(/not entered/);
    const report = sickleReport(r);
    expect(report.inputs.find(f => f.label === 'Haemoglobin')!.value).toBe('Not entered');
  });

  it.each([
    ['simple VOC', {}],
    ['severe pain with fever', { painScore: 9, hasFever: true }],
    ['ACS with high HbS', { hasACS: true, hbS: '45' }],
    ['child with stroke', { age: '9', weight: '25', hasStroke: true, onHydroxyurea: true, currentHUDose: '500' }],
    ['aplastic, Hb blank', { crisisType: 'aplastic', hbLevel: '' }],
    ['chronic wound with low albumin', { wound: { ...base.wound, hasWound: true, woundDuration: '16', woundSize: '12', albuminLevel: '2.8' } }],
  ])('%s: complete report, populated plan, PDF', (_n, over) => {
    const r = computeSickle({ ...base, ...over });
    expect(r.errors).toBeUndefined();
    const report = sickleReport(r.result!);
    expect(reportProblems(report)).toEqual([]);
    expect(report.plan!.sections.length).toBeGreaterThan(3);
    expect(report.plan!.monitoring.length).toBeGreaterThan(0);
    expect(buildCalculatorPdf(report).getNumberOfPages()).toBeGreaterThan(0);
  });

  it('the wound protocol becomes headed sections', () => {
    const r = computeSickle({ ...base, wound: { ...base.wound, hasWound: true, woundDuration: '20' } }).result!;
    const titles = sickleReport(r).plan!.sections.map(s => s.title);
    expect(titles).toContain('Wound healing — Chronic Wound (>12 weeks)');
  });

  it.each([
    ['no weight', { weight: '' }, /weight/i],
    ['no age', { age: '' }, /age/i],
    ['bad Hb', { hbLevel: '45' }, /Haemoglobin/],
    ['bad pain', { painScore: 14 }, /Pain score/],
  ])('rejects %s', (_n, over, msg) => {
    expect(computeSickle({ ...base, ...over }).errors!.join(' ')).toMatch(msg);
  });
});
