/** Age-aware core: adult-only instruments are left out for children and replaced. */
import { describe, it, expect } from 'vitest';
import { composeTemplate, readReview, reviewPatientFrom, anaemiaThreshold } from '../engine';
import { planLines } from '../planBuilder';
import { skinGraft } from '../procedures/reconstruction/skinGraft';
import { cleftLipPalate } from '../procedures/aesthetic_other/cleftLipPalate';
import { adult, planFor } from './fixtures';

const ids = (m: typeof skinGraft, phase: Parameters<typeof composeTemplate>[1], p = adult()) =>
  composeTemplate(m, phase, p).sections.flatMap(s => s.fields.map(f => f.id));
const texts = (out: ReturnType<typeof planFor>) => planLines(out.plan).map(l => l.line.text);

describe('age gating of the core', () => {
  it('derives age in months from the date of birth', () => {
    const p = reviewPatientFrom({ dateOfBirth: new Date('2026-07-10'), gender: 'male', allergies: [], chronicConditions: [] } as never, new Date('2026-11-06'));
    expect(p.ageMonths).toBe(3);
    expect(p.ageYears).toBe(0);
    const q = reviewPatientFrom({ dateOfBirth: new Date('1990-12-01') } as never, new Date('2026-11-06'));
    expect(q.ageYears).toBe(35);
  });

  it('adults keep MUST, PHQ, GAD; CFS only from 65', () => {
    const f = ids(skinGraft, 'pre_op', adult({ ageYears: 40 }));
    expect(f).toEqual(expect.arrayContaining(['core.weight_loss', 'core.phq.q1', 'core.gad.q1', 'core.caprini']));
    expect(f.some(id => id.startsWith('core.cfs.'))).toBe(false);
    expect(f).not.toContain('core.paed_growth');
    expect(ids(skinGraft, 'pre_op', adult({ ageYears: 70 })).some(id => id.startsWith('core.cfs.'))).toBe(true);
  });

  it('a 6-year-old gets the growth question, the wellbeing / safeguarding prompt, no MUST, PHQ, GAD or Caprini', () => {
    const f = ids(skinGraft, 'pre_op', adult({ ageYears: 6 }));
    expect(f).toEqual(expect.arrayContaining(['core.paed_growth', 'core.child_wellbeing', 'core.child_safeguarding', 'core.caregiver_coping']));
    for (const gone of ['core.weight_loss', 'core.muac_cm', 'core.acute_disease', 'core.phq.q1', 'core.gad.q1', 'core.caprini']) expect(f).not.toContain(gone);
  });

  it('uses the published lower bounds: GAD-7 from 12, PHQ-9 from 13', () => {
    const twelve = ids(skinGraft, 'pre_op', adult({ ageYears: 12 }));
    expect(twelve).toContain('core.gad.q1');
    expect(twelve).not.toContain('core.phq.q1');
    expect(twelve).toContain('core.child_wellbeing');
    const thirteen = ids(skinGraft, 'pre_op', adult({ ageYears: 13 }));
    expect(thirteen).toContain('core.phq.q1');
    expect(thirteen).not.toContain('core.child_wellbeing');
    expect(thirteen).toContain('core.paed_growth');
  });

  it('does not count hidden fields in completeness, nor score MUST in a child', () => {
    const r = readReview({ module: skinGraft, phase: 'pre_op', answers: {}, patient: adult({ ageYears: 5 }) });
    expect(r.completeness.missing).not.toContain('Unplanned weight loss in the past 3–6 months');
    expect(r.completeness.missing).toContain('Weight-for-age on the growth chart');
    expect(r.scores.some(s => s.id === 'must' || s.id === 'phq2' || s.id === 'caprini')).toBe(false);
  });

  it('a paediatric module treats an unknown age as a child', () => {
    const f = ids(cleftLipPalate as never, 'pre_op', { ageYears: null } as never);
    expect(f).toContain('core.paed_growth');
    expect(f).not.toContain('core.weight_loss');
  });

  it('replaces adult VTE, fasting and post-operative wording for a child', () => {
    const kid = adult({ ageYears: 4 });
    const pre = texts(planFor(skinGraft, 'pre_op', { 'core.paed_growth': 'faltering' }, kid));
    expect(pre.some(t => /No routine pharmacological VTE prophylaxis/.test(t))).toBe(true);
    expect(pre.some(t => /enoxaparin|Complete the Caprini/.test(t))).toBe(false);
    expect(pre.some(t => /^Fasting \(child\)/.test(t))).toBe(true);
    expect(pre.some(t => /^Paediatric dietitian/.test(t))).toBe(true);
    const post = texts(planFor(skinGraft, 'post_op', { 'core.complications': ['chest', 'delirium'], 'core.mobilising': 'no' }, kid));
    expect(post.some(t => /incentive spirometry|^4AT/.test(t))).toBe(false);
    expect(post.some(t => /paediatric delirium tool/.test(t))).toBe(true);
    expect(post.some(t => /age-appropriate activity/.test(t))).toBe(true);
    const adultPost = texts(planFor(skinGraft, 'post_op', { 'core.complications': ['chest', 'delirium'] }));
    expect(adultPost.some(t => /incentive spirometry/.test(t))).toBe(true);
  });

  it('raises the safeguarding concern as an urgent problem', () => {
    const out = planFor(skinGraft, 'pre_op', { 'core.child_safeguarding': 'concern' }, adult({ ageYears: 3 }));
    const p = out.plan.problems.find(x => x.problem === 'Safeguarding concern');
    expect(p?.referrals[0]?.priority).toBe('urgent');
  });

  it('uses the WHO paediatric anaemia thresholds', () => {
    expect(anaemiaThreshold(adult({ ageYears: 2, ageMonths: 30 }), {})).toBe(11);
    expect(anaemiaThreshold(adult({ ageYears: 8 }), {})).toBe(11.5);
    expect(anaemiaThreshold(adult({ ageYears: 13 }), {})).toBe(12);
    expect(anaemiaThreshold(adult({ ageYears: 0, ageMonths: 3 }), {})).toBeNull();
    expect(anaemiaThreshold(adult({ ageYears: 40 }), {})).toBe(13);
  });
});
