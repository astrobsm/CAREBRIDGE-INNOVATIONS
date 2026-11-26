/**
 * The bedside "Plan" section rendered every electrolyte step blank: the panel
 * read s.title / s.detail / s.text, but engine steps are CorrectionSteps
 * (indication, route, preparation, dose, administration, access, cautions).
 * These tests pin both halves: the engine produces complete steps for every
 * analyte it supports, and formatCorrectionStep — the function the panel, the
 * PDF and the AI prompt all render through — carries every field across.
 */
import { describe, it, expect } from 'vitest';
import { electrolyteCorrection, type ElectrolyteFinding } from '../../clinician-assistant/services/clinicalCalculators';
import { formatCorrectionStep, correctionPlanToReportPlan, stepToText } from '../report/format';

/** Each supported finding, with a representative low-or-high value. */
const CASES: Array<{ finding: ElectrolyteFinding; key: string; values: number[] }> = [
  { finding: 'lyte.hyponatraemia', key: 'na', values: [110, 128, 133] },
  { finding: 'lyte.hypernatraemia', key: 'na', values: [150, 165] },
  { finding: 'lyte.hypokalaemia', key: 'k', values: [2.2, 2.8, 3.2] },
  { finding: 'lyte.hyperkalaemia', key: 'k', values: [5.8, 6.2, 7.4] },
  { finding: 'lyte.hypomagnesaemia', key: 'magnesium', values: [0.4, 0.6] },
  { finding: 'lyte.hypocalcaemia', key: 'calcium', values: [1.6, 1.95] },
  { finding: 'lyte.hypercalcaemia', key: 'calcium', values: [2.9, 3.6] },
  { finding: 'lyte.hypophosphataemia', key: 'phosphate', values: [0.25, 0.5] },
];

const SEVERITIES = ['mild', 'moderate', 'severe', 'critical'] as const;

describe('engine correction steps are complete for every analyte', () => {
  for (const c of CASES) {
    for (const v of c.values) {
      for (const weightKg of [100, null]) {
        it(`${c.finding} at ${v} (weight ${weightKg ?? 'missing'})`, () => {
          const plan = electrolyteCorrection({
            finding: c.finding, values: { [c.key]: v }, weightKg, ageYears: 56, sex: 'male', severity: 'severe',
          });
          expect(plan).not.toBeNull();
          expect(plan!.steps.length).toBeGreaterThan(0);
          for (const s of plan!.steps) {
            expect(s.indication.trim()).not.toBe('');
            expect((s.dose + s.preparation).trim()).not.toBe('');
            const f = formatCorrectionStep(s);
            expect(f.heading).toBe(s.indication.trim());
            expect(f.lines.find(l => l.label === 'Dose')?.value).toBe(s.dose);
            expect(f.lines.find(l => l.label === 'Preparation')?.value).toBe(s.preparation);
            expect(f.lines.find(l => l.label === 'Administration')?.value).toBe(s.administration);
            if (s.access) expect(f.lines.find(l => l.label === 'Access')?.value).toBe(s.access);
            expect(f.cautions).toEqual((s.cautions ?? []).filter(Boolean));
            const text = stepToText(f);
            expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
          }
          const rp = correctionPlanToReportPlan(plan!);
          expect(rp.hardLimits.length).toBeGreaterThan(0);
          expect(rp.monitoring.length).toBeGreaterThan(0);
        });
      }
    }
  }

  it('the owner\'s case — 100 kg, 56 y, male, Na 110, severe symptomatic — has a populated plan', () => {
    for (const severity of SEVERITIES) {
      const plan = electrolyteCorrection({
        finding: 'lyte.hyponatraemia', values: { na: 110 }, weightKg: 100, ageYears: 56, sex: 'male', severity,
      })!;
      const rp = correctionPlanToReportPlan(plan);
      expect(rp.steps[0].heading).toMatch(/Severe symptoms/);
      expect(rp.steps[0].lines.map(l => l.label)).toEqual(['Route', 'Preparation', 'Dose', 'Administration', 'Access']);
      expect(rp.steps[0].lines.find(l => l.label === 'Preparation')!.value).toMatch(/3%/);
      // 100 kg man under 65: TBW 60 L; 60 × (130 − 110) = 1200 mmol.
      expect(plan.deficit!.value).toMatch(/1200 mmol/);
      expect(rp.hardLimits.join(' ')).toMatch(/10 mmol\/L in the first 24 hours/);
    }
  });
});

describe('formatCorrectionStep', () => {
  it('uses the indication as the heading and drops empty fields', () => {
    const f = formatCorrectionStep({
      indication: 'When oral is possible', route: 'oral', preparation: 'Tablet', dose: '1 bd', administration: '',
    });
    expect(f.heading).toBe('When oral is possible');
    expect(f.lines).toEqual([
      { label: 'Route', value: 'Oral' },
      { label: 'Preparation', value: 'Tablet' },
      { label: 'Dose', value: '1 bd' },
    ]);
    expect(f.cautions).toEqual([]);
  });
});
