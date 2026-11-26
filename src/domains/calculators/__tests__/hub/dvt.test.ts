import { describe, it, expect } from 'vitest';
import { computeDvt, dvtReport, NO_DVT_FLAGS, type DvtFlags } from '../../engine/hub/dvt';
import { reportProblems } from '../../report/format';
import { buildCalculatorPdf } from '../../report/pdf';
import type { CalculatorReport } from '../../report/types';

function pdfText(r: CalculatorReport): string {
  const doc = buildCalculatorPdf(r);
  const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
  const stream = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
  const shown: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) shown.push(m[1].replace(/\\([()\\])/g, '$1'));
  return shown.join(' ').replace(/\s+/g, ' ');
}

const f = (over: Partial<DvtFlags> = {}): DvtFlags => ({ ...NO_DVT_FLAGS, ...over });

describe('hub Caprini', () => {
  it.each([
    ['none, young', '25', f(), 0, 'Very Low Risk'],
    ['age 56 + minor surgery', '56', f({ minorSurgery: true }), 2, 'Low Risk'],
    ['major surgery, 65', '65', f({ majorSurgery: true }), 4, 'Moderate Risk'],
    ['cancer + chemo + major surgery', '50', f({ cancer: true, chemotherapy: true, majorSurgery: true }), 6, 'High Risk'],
    ['hip fracture, prior DVT, 80', '80', f({ hipPelvisFracture: true, previousDVT: true }), 11, 'Very High Risk'],
  ])('%s', (_n, age, flags, score, level) => {
    const r = computeDvt({ age, flags, comorbidities: ['Chronic Kidney Disease', 'Liver Cirrhosis'] });
    if ('errors' in r) throw new Error(r.errors.join());
    expect(r.result.score).toBe(score);
    expect(r.result.riskLevel).toBe(level);
    const rep = dvtReport(r.result, Number(age));
    expect(reportProblems(rep)).toEqual([]);
    const titles = rep.plan!.sections.map(s => s.title);
    expect(titles).toContain('Additional considerations');
    expect(titles).toContain('Patient education');
    expect(pdfText(rep)).toContain('Caprini VTE risk');
  });

  it('comorbidity notes now match the list wording', () => {
    const r = computeDvt({ age: '50', flags: f(), comorbidities: ['Chronic Kidney Disease'] });
    if ('errors' in r) throw new Error();
    expect(r.result.additionalRecommendations!.join(' ')).toMatch(/CKD present/);
  });

  it('labels pregnancy as pregnancy, and refuses pregnancy + postpartum together', () => {
    const one = computeDvt({ age: '30', flags: f({ pregnancy: true }) });
    if ('errors' in one) throw new Error();
    expect(one.result.scoreBreakdown['1-point']).toEqual(['Pregnancy']);
    const both = computeDvt({ age: '30', flags: f({ pregnancy: true, postpartum: true }) });
    expect('errors' in both).toBe(true);
  });

  it.each([['', /Enter the age/], ['abc', /Enter the age/], ['130', /between 0 and 120/]])('rejects age "%s"', (age, msg) => {
    const r = computeDvt({ age, flags: f() });
    expect('errors' in r && r.errors.join(' ')).toMatch(msg);
  });
});
