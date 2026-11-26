import { describe, it, expect } from 'vitest';
import {
  computeBurns, burnsReport, clampBodyParts, isChildAge, EMPTY_BODY_PARTS, ABSI_CAVEAT, type BurnsInput,
} from '../../engine/hub/burns';
import { calculateABSI } from '../../engine/calculationEngine';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';
import type { CalculatorReport } from '../../report/types';
import type { PatientCalculatorInfo } from '../../types';

function pdfText(r: CalculatorReport): string {
  const doc = buildCalculatorPdf(r, { clinician: 'Dr Test' });
  const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
  const stream = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
  const shown: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) shown.push(m[1].replace(/\\([()\\])/g, '$1'));
  return shown.join(' ').replace(/\s+/g, ' ');
}

const patientInfo: PatientCalculatorInfo = { name: 'Ada Eze', age: '35', gender: 'elderly-male', comorbidities: [] };

const base = (over: Partial<BurnsInput> = {}): BurnsInput => ({
  weight: '70', age: '35', isChild: false, timeSinceBurn: '', burnDepth: 'partial', inhalationInjury: false, gender: 'male',
  bodyParts: { ...EMPTY_BODY_PARTS, chestAbdomen: 18, rightArm: 9 },
  ...over,
});

describe('hub burns', () => {
  it.each([
    ['adult partial 27%', base()],
    ['late presentation, inhalation, full thickness', base({ timeSinceBurn: '3', inhalationInjury: true, burnDepth: 'full' })],
    ['beyond 8 h', base({ timeSinceBurn: '12' })],
    ['beyond 24 h', base({ timeSinceBurn: '30' })],
    ['child', base({ weight: '18', age: '4', isChild: true, bodyParts: { ...EMPTY_BODY_PARTS, head: 10, genitalia: 1 } })],
    ['superficial small', base({ burnDepth: 'superficial', bodyParts: { ...EMPTY_BODY_PARTS, leftArm: 3 } })],
  ])('%s produces a complete report and PDF', (_n, input) => {
    const r = computeBurns(input);
    if ('errors' in r) throw new Error(r.errors.join('; '));
    const rep = burnsReport(r.result, r.extras, {
      weightKg: Number(input.weight), ageYears: Number(input.age), timeSinceBurn: Number(input.timeSinceBurn) || 0,
      bodyParts: clampBodyParts(input.bodyParts, input.isChild), isChild: input.isChild, gender: input.gender,
    }, patientInfo);
    expect(reportProblems(rep)).toEqual([]);
    expect(rep.plan!.sections.length).toBeGreaterThan(0);
    expect(rep.plan!.monitoring.length).toBeGreaterThan(0);
    const text = pdfText(rep);
    expect(text).toContain('Burns assessment');
    expect(text).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('uses the engine survival band, not a shifted local table', () => {
    const r = computeBurns(base({ bodyParts: { ...EMPTY_BODY_PARTS, leftArm: 5 } }));
    if ('errors' in r) throw new Error();
    const engine = calculateABSI(5, 35, 'male', false, false);
    expect(r.result.absiScore).toBe(engine.score);
    expect(r.result.absiSurvival).toBe(engine.survival);
    expect(r.result.absiSurvival).not.toMatch(/<1%/);
    expect(r.extras.absiCaveat).toBe(ABSI_CAVEAT);
  });

  it('a late presenter gets the full first-half volume over the time left, not a reduced one', () => {
    const r = computeBurns(base({ timeSinceBurn: '4' }));
    if ('errors' in r) throw new Error();
    // 70 kg x 27% x 2 mL = 3780; first half 1890 over the remaining 4 h.
    expect(r.extras.fluidTimingNote).toMatch(/1890 mL/);
    expect(r.extras.fluidTimingNote).toMatch(/473 mL\/h/);
  });

  it('nutrition comes from the shared burns targets (Curreri, TBSA cap)', () => {
    const r = computeBurns(base({ bodyParts: { ...EMPTY_BODY_PARTS, chestAbdomen: 18, back: 18, rightLeg: 18, leftLeg: 18 } }));
    if ('errors' in r) throw new Error();
    // 72% TBSA capped at 50: 25 x 70 + 40 x 50 = 3750.
    expect(r.result.nutritionNeeds!.calories).toBe(3750);
  });

  it.each([
    ['no TBSA', base({ bodyParts: EMPTY_BODY_PARTS }), /TBSA is 0%/],
    ['no weight', base({ weight: '' }), /weight/i],
    ['weight 0', base({ weight: '0' }), /Weight should be/],
    ['age blank', base({ age: '' }), /age/i],
    ['time negative', base({ timeSinceBurn: '-2' }), /Time since burn/],
  ])('rejects %s', (_n, input, msg) => {
    const r = computeBurns(input);
    expect('errors' in r).toBe(true);
    if ('errors' in r) expect(r.errors.join(' ')).toMatch(msg);
  });

  it('the child chart follows a prefilled age and re-clamps regions', () => {
    expect(isChildAge('4')).toBe(true);
    expect(isChildAge('35')).toBe(false);
    expect(isChildAge('')).toBe(false);
    const adult = { ...EMPTY_BODY_PARTS, head: 15, rightLeg: 18 };
    expect(clampBodyParts(adult, false)).toMatchObject({ head: 9, rightLeg: 18 });
    expect(clampBodyParts(adult, true)).toMatchObject({ head: 15, rightLeg: 13.5 });
  });
});
