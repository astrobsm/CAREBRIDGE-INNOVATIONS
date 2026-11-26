/**
 * Every Bedside calculator, run on representative inputs through the same
 * service functions its panel uses, produces a report in which every
 * displayed field is defined and finite — no NaN, undefined, Infinity or
 * [object Object] — and, where it has a plan, the plan is populated. The
 * shared PDF builder then produces a document from each.
 */
import { describe, it, expect } from 'vitest';
import {
  acidBaseReport, burnsReport, electrolyteReport, gfrReport, nutritionReport, resuscitationReport,
  scoreReport, sickleReport, weightPlanReport, woundMealReport, mealPlanSections,
} from '../../clinician-assistant/services/bedsideReports';
import { interpretBraden, interpretCaprini, interpretMust, scoreMust } from '../../clinician-assistant/services/riskCalculators';
import { generateMealPlan } from '../../../data/nigerianFoods';
import { reportProblems } from '../report/format';
import { buildCalculatorPdf, PDF_FOOTER_TEXT } from '../report/pdf';
import type { CalculatorReport } from '../report/types';

const patient = { name: 'Test Patient', hospitalNumber: 'HN-1', ageYears: 56, sex: 'male', weightKg: 100, heightCm: 175 };

function pdfText(r: CalculatorReport): string {
  const doc = buildCalculatorPdf(r, { clinician: 'Dr Test', generatedAt: new Date('2026-11-26T10:00:00Z') });
  const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
  const stream = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
  const shown: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) shown.push(m[1].replace(/\\([()\\])/g, '$1'));
  return shown.join(' ').replace(/\s+/g, ' ');
}

function expectClean(r: CalculatorReport | null, { plan = true } = {}) {
  expect(r).not.toBeNull();
  expect(reportProblems(r!)).toEqual([]);
  if (plan) expect(r!.plan).toBeDefined();
  const text = pdfText(r!);
  expect(text).toContain(r!.calculatorName);
  expect(text).toMatch(/Decision support/);
  expect(text).not.toMatch(/\bNaN\b|undefined|\[object Object\]/);
  return text;
}

const vitals = { systolicBP: 84, diastolicBP: 50, heartRate: 124, respiratoryRate: 26, temperature: 38.9, gcs: 14 };

const CASES: Array<[string, () => CalculatorReport | null]> = [
  ['Emergency & sepsis — septic', () => resuscitationReport({ weightKg: 70, vitals, labs: { wbc: 18, lactate: 4.2 }, dehydration: 'moderate' }, patient)],
  ['Emergency & sepsis — weight only', () => resuscitationReport({ weightKg: 70, vitals: {}, labs: {}, dehydration: 'mild' })],
  ['Sodium — owner case', () => electrolyteReport({ analyteLabel: 'Sodium', unit: 'mmol/L', key: 'na', value: 110, finding: 'lyte.hyponatraemia', weightKg: 100, ageYears: 56, sex: 'male', severity: 'severe' }, patient)],
  ['Sodium — high, no weight', () => electrolyteReport({ analyteLabel: 'Sodium', unit: 'mmol/L', key: 'na', value: 158, finding: 'lyte.hypernatraemia', weightKg: 0, ageYears: 0, sex: 'unspecified', severity: 'moderate' })],
  ['Potassium — low', () => electrolyteReport({ analyteLabel: 'Potassium', unit: 'mmol/L', key: 'k', value: 2.6, finding: 'lyte.hypokalaemia', weightKg: 60, ageYears: 30, sex: 'female', severity: 'severe' })],
  ['Potassium — high', () => electrolyteReport({ analyteLabel: 'Potassium', unit: 'mmol/L', key: 'k', value: 6.8, finding: 'lyte.hyperkalaemia', weightKg: 60, ageYears: 30, sex: 'female', severity: 'critical' })],
  ['Acid-base', () => acidBaseReport({ ph: 7.21, paco2: 3.1, paco2Unit: 'kPa', hco3: 9, sodium: 138, chloride: 100, albumin: 28 })],
  ['Acid-base mmHg', () => acidBaseReport({ ph: 7.5, paco2: 48, paco2Unit: 'mmHg', hco3: 36, sodium: null, chloride: null, albumin: null })],
  ['GFR', () => gfrReport({ creatinineUmolL: 180, enteredValue: 180, enteredUnit: 'umol', ageYears: 64, sex: 'female' }, patient)],
  ['Burns', () => burnsReport({ weightKg: 70, ageYears: 35, hoursSince: 3, inhalation: true, fullThickness: true, circumferential: false, areas: [{ label: 'Anterior trunk', pct: 18 }, { label: 'Right arm', pct: 9 }], now: new Date('2026-11-26T10:00:00Z') })],
  ['Burns — no weight', () => burnsReport({ weightKg: 0, ageYears: 0, hoursSince: 0, inhalation: false, fullThickness: false, circumferential: false, areas: [{ label: 'Left leg', pct: 5 }] })],
  ['Sickle cell', () => sickleReport({ weightKg: 55, painScore: 9, haemoglobinGdL: 5.5, baselineHbGdL: 8, spo2: 91, temperatureC: 38.4, chestSymptoms: true, priorStroke: false }, patient)],
  ['Sickle cell — defaults', () => sickleReport({ weightKg: 0, painScore: 7 })],
  ['Weight loss', () => weightPlanReport({ mode: 'reduction', weightKg: 100, heightCm: 170, ageYears: 45, sex: 'female', activity: 'light', targetChangeKg: 10, weeks: 20, days: null })],
  ['Weight gain', () => weightPlanReport({ mode: 'gain', weightKg: 48, heightCm: 172, ageYears: 25, sex: 'male', activity: 'moderate', days: null })],
  ['Wound meal plan', () => woundMealReport({ weightKg: 70, severity: 'severe', albuminGdL: 25, diabetes: true, ckd: false, liverDisease: false }, patient)],
  ['Nutrition', () => nutritionReport({ weightKg: 70, kcal: 2200, proteinPerKg: 1.5, days: generateMealPlan(2200, 105) })],
  ['Caprini', () => scoreReport({ id: 'dvt', name: 'Caprini VTE risk', scoreLabel: 'Caprini score', scoreValue: '6', result: interpretCaprini(6), inputs: [{ label: 'Age', value: '56 years' }], advice: ['Bleeding risk is separate.'] })],
  ['Braden', () => scoreReport({ id: 'pressuresore', name: 'Braden', scoreLabel: 'Braden total', scoreValue: '11/23', result: interpretBraden(11), inputs: [{ label: 'Mobility', value: '2 — Very limited' }], advice: [] })],
  ['MUST', () => scoreReport({ id: 'must', name: 'MUST', scoreLabel: 'MUST score', scoreValue: '3', result: interpretMust(scoreMust({ bmi_score: 1, weight_loss_score: 2, acute_disease_score: 0 })), inputs: [{ label: 'BMI', value: '19.2' }], advice: [] })],
];

describe('every Bedside calculator report is complete and exportable', () => {
  it.each(CASES)('%s', (_name, build) => {
    expectClean(build());
  });

  it('the owner\'s sodium case prints every step field and the hard limits', () => {
    const text = expectClean(CASES[2][1]());
    expect(text).toMatch(/Hypertonic sodium chloride 3%/);
    expect(text).toMatch(/Dose: 100/);
    expect(text).toMatch(/HARD LIMITS/);
    expect(text).toMatch(/Maximum rise/);
    expect(text).toMatch(/Monitoring/);
    expect(text).toMatch(/Test Patient/);
    expect(text).toMatch(/Dr Test/);
    expect(text).toMatch(/1200 mmol/);
  });

  it('calculators with nothing entered produce no report rather than a blank one', () => {
    expect(resuscitationReport({ weightKg: 0, vitals: {}, labs: {}, dehydration: 'mild' })).toBeNull();
    expect(acidBaseReport({ ph: null, paco2: null, hco3: null })).toBeNull();
    expect(gfrReport({ creatinineUmolL: null, enteredValue: null, enteredUnit: 'umol', ageYears: 50, sex: 'male' })).toBeNull();
    expect(gfrReport({ creatinineUmolL: 0, enteredValue: 0, enteredUnit: 'umol', ageYears: 50, sex: 'male' })).toBeNull();
    expect(burnsReport({ weightKg: 70, ageYears: 30, hoursSince: 0, inhalation: false, fullThickness: false, circumferential: false, areas: [] })).toBeNull();
    expect(weightPlanReport({ mode: 'gain', weightKg: 70, heightCm: 0, ageYears: 30, sex: 'male', activity: 'light' })).toBeNull();
    expect(woundMealReport({ weightKg: 0 })).toBeNull();
    expect(nutritionReport({ weightKg: 70, kcal: 0, proteinPerKg: 1.2, days: null })).toBeNull();
  });

  it('meal plans in a report carry every day', () => {
    const days = generateMealPlan(2000, 90, { goal: 'loss' });
    expect(days.length).toBe(7);
    const secs = mealPlanSections(days);
    expect(secs.length).toBe(7);
    for (const s of secs) {
      expect(s.items.length).toBeGreaterThan(0);
      expect(s.title).toMatch(/kcal/);
    }
  });

  it('the AI draft, when given, is printed and labelled as a draft', () => {
    const r = CASES[2][1]()!;
    const doc = buildCalculatorPdf(r, {
      aiPlan: {
        assessmentSummary: 'Severe symptomatic hyponatraemia.', hardLimitsQuoted: [],
        immediateActions: [{ action: 'Give 3% saline 150 mL over 20 minutes', timing: 'now' }],
        fluidsAndDrugs: [], monitoring: [{ what: 'Sodium', frequency: '2-hourly', target: '' }],
        escalationCriteria: ['Seizures continue'], counsellingPoints: [], followUp: [], unknowns: ['Volume status'],
      },
      aiMissingHardLimits: r.plan!.hardLimits,
    });
    const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
    const raw = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
    expect(raw).toMatch(/AI-DRAFTED PLAN/);
    expect(raw).toMatch(/check before use/);
    expect(raw).toMatch(/Give 3% saline 150 mL/);
    expect(raw).toMatch(/did not restate/);
    expect(PDF_FOOTER_TEXT).toMatch(/Decision support/);
  });
});

describe('BNF lookup report', () => {
  it('a looked-up drug exports with no AI plan offered (reference only)', async () => {
    const { searchDrugs, generatePatientWarnings } = await import('../../../data/bnfDrugDatabase');
    const { bnfReport } = await import('../../clinician-assistant/services/bnfReport');
    for (const q of ['paracetamol', 'gentamicin', 'enoxaparin', 'morphine']) {
      const drug = searchDrugs(q)[0];
      expect(drug, q).toBeDefined();
      const warnings = generatePatientWarnings(drug, { sex: 'male', age: 56, weight: 100, gfr: 12 });
      const r = bnfReport({
        drug, doseLabel: 'Adult', dose: drug.dosage.adult, warnings, weightKg: 100, ageYears: 56, sex: 'male', gfr: 12,
        flags: { pregnant: false, lactating: false, hepatic: false, cardiac: false },
      });
      expect(r.plan).toBeUndefined();
      expect(reportProblems(r)).toEqual([]);
      expect(pdfText(r)).toContain(drug.genericName);
    }
  });
});
