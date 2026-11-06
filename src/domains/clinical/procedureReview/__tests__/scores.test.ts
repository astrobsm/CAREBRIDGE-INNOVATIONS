/**
 * The new screening instruments: published item counts, totals and bands,
 * scored by the scar module's scoreScale (no partial totals), and the PHQ-9
 * item-9 safety flag.
 */
import { describe, it, expect } from 'vitest';
import {
  APFEL, APPEARANCE_SCREEN, CFS, GAD2_BANDS, GAD2_ITEMS, GAD7, PHQ2_BANDS, PHQ2_ITEMS, PHQ9,
  appearanceScreenResult, bandFor, instrumentFields, responsesFrom, scoreInstrument, SCREENING_INSTRUMENTS,
} from '../scores';
import { woundCareReview } from '../procedures/wound/woundCareReview';
import { readReview } from '../engine';
import { adult } from './fixtures';

const all = (n: number, v: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`q${i + 1}`, v]));

describe('PHQ-9 / PHQ-2', () => {
  it('has the nine published items scored 0–3', () => {
    expect(PHQ9.items).toHaveLength(9);
    expect(PHQ9.items.every(i => i.options?.map(o => o.value).join() === '0,1,2,3')).toBe(true);
    expect(PHQ9.items[8].label).toMatch(/better off dead or of hurting yourself/);
  });

  it('totals and bands as Kroenke 2001', () => {
    expect(scoreInstrument(PHQ9, all(9, 0)).total).toBe(0);
    expect(scoreInstrument(PHQ9, all(9, 3)).total).toBe(27);
    const cases: [number, string][] = [[4, 'Minimal'], [5, 'Mild'], [9, 'Mild'], [10, 'Moderate'], [14, 'Moderate'], [15, 'Moderately severe'], [19, 'Moderately severe'], [20, 'Severe'], [27, 'Severe']];
    for (const [total, label] of cases) expect(bandFor(PHQ9, total)?.label).toBe(label);
  });

  it('PHQ-2 is items 1–2 with a cut-point of 3', () => {
    expect(scoreInstrument(PHQ9, { q1: 1, q2: 1 }, PHQ2_ITEMS, PHQ2_BANDS).band?.label).toBe('Negative screen');
    expect(scoreInstrument(PHQ9, { q1: 2, q2: 1 }, PHQ2_ITEMS, PHQ2_BANDS).band?.label).toBe('Positive screen');
  });

  it('never reports a total over unanswered items', () => {
    const r = scoreInstrument(PHQ9, { q1: 3, q2: 3 });
    expect(r.total).toBeNull();
    expect(r.incomplete).toHaveLength(7);
  });

  it('raises a red flag for ANY positive answer to item 9, even with a low total', () => {
    const answers = { 'core.phq.q1': '0', 'core.phq.q2': '0', 'core.phq.q9': '1' };
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers, patient: adult() });
    const phq9 = r.scoreMap.phq9;
    expect(phq9.flag?.level).toBe('red');
    expect(r.flags[0].level).toBe('red');
    expect(r.flags.some(f => /item 9/.test(f.reason))).toBe(true);
  });
});

describe('GAD-7 / GAD-2', () => {
  it('has seven items and Spitzer 2006 bands', () => {
    expect(GAD7.items).toHaveLength(7);
    expect(scoreInstrument(GAD7, all(7, 3)).total).toBe(21);
    const cases: [number, string][] = [[4, 'Minimal'], [5, 'Mild'], [10, 'Moderate'], [15, 'Severe'], [21, 'Severe']];
    for (const [t, l] of cases) expect(bandFor(GAD7, t)?.label).toBe(l);
    expect(scoreInstrument(GAD7, { q1: 3, q2: 0 }, GAD2_ITEMS, GAD2_BANDS).band?.label).toBe('Positive screen');
  });
});

describe('Apfel', () => {
  it('sums four factors with the published risks', () => {
    expect(scoreInstrument(APFEL, { female: 1, non_smoker: 1, history: 1, opioids: 1 }).total).toBe(4);
    expect(scoreInstrument(APFEL, { female: 0, non_smoker: 0, history: 0, opioids: 0 }).band?.label).toMatch(/10%/);
    expect(bandFor(APFEL, 2)?.label).toMatch(/39%/);
    expect(bandFor(APFEL, 3)?.label).toMatch(/61%/);
  });
});

describe('Clinical Frailty Scale', () => {
  it('is one item, levels 1–9, with frailty from 5', () => {
    expect(CFS.items[0].options).toHaveLength(9);
    expect(bandFor(CFS, 3)?.label).toBe('Not frail');
    expect(bandFor(CFS, 5)?.level).toBe('moderate');
    expect(bandFor(CFS, 7)?.level).toBe('very_high');
  });
});

describe('Appearance-concern screen', () => {
  it('is positive only with concern, preoccupation and distress or avoidance', () => {
    expect(appearanceScreenResult({ concern: 0 }).positive).toBe(false);
    expect(appearanceScreenResult({ concern: 1 }).positive).toBeNull();
    expect(appearanceScreenResult({ concern: 1, preoccupied: 1, distress: 0, avoidance: 0 }).positive).toBe(false);
    expect(appearanceScreenResult({ concern: 1, preoccupied: 1, distress: 0, avoidance: 1 }).positive).toBe(true);
    expect(appearanceScreenResult({ concern: 1, preoccupied: 0, distress: 1, avoidance: 1 }).positive).toBe(false);
  });

  it('says it is a screen and not the BDDQ', () => {
    expect(APPEARANCE_SCREEN.citation).toMatch(/screen, not a diagnosis/i);
    expect(APPEARANCE_SCREEN.licence).toMatch(/not reproduced/);
  });
});

describe('instrument fields', () => {
  it('are generated from the items, so form and scoring share the wording', () => {
    const fields = instrumentFields(PHQ9, 'core.phq');
    expect(fields.map(f => f.id)).toEqual(PHQ9.items.map(i => `core.phq.${i.id}`));
    expect(fields[0].label).toBe(PHQ9.items[0].label);
    expect(responsesFrom(PHQ9, 'core.phq', { 'core.phq.q1': '2', 'core.phq.q2': '' })).toEqual({ q1: 2 });
  });

  it('every instrument cites its source and licence', () => {
    for (const i of SCREENING_INSTRUMENTS) {
      expect(i.citation.length).toBeGreaterThan(10);
      expect(i.licence.length).toBeGreaterThan(10);
    }
  });
});
