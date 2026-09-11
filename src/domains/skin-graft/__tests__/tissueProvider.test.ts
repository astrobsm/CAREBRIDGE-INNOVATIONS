/**
 * Tissue classification is the most safety-critical step in the module: graft
 * take and donor re-epithelialization are both computed from its output.
 *
 * The behaviour these tests pin down is that ambiguity is REPORTED rather than
 * absorbed. The implementation this replaces defaulted ambiguous wound-coloured
 * pixels to granulation, which counts them as viable and inflates graft take —
 * a failing graft reading healthier than it is, which is the one direction a
 * wound-monitoring system must never err in.
 */

import { describe, it, expect } from 'vitest';
import {
  heuristicTissueProvider,
  registerTissueProvider,
  selectTissueProvider,
  listTissueProviders,
  describeOnnxIntegration,
  HEURISTIC_TISSUE_VERSION,
  type TissueProvider,
} from '../services/tissueProvider';
import { estimateGraftTake } from '../services/graftAnalysis';

/** Minimal canvas stand-in: the provider only reads pixels. */
function fakeCanvas(pixels: Array<[number, number, number]>): HTMLCanvasElement {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255;
  });
  return {
    width: pixels.length,
    height: 1,
    getContext: () => ({ getImageData: () => ({ data }) }),
  } as unknown as HTMLCanvasElement;
}

const allIn = (n: number) => new Array(n).fill(true);

const GRANULATION: [number, number, number] = [180, 40, 40];   // vivid red
const SLOUGH: [number, number, number] = [205, 180, 90];       // yellow
const NECROTIC: [number, number, number] = [22, 18, 16];       // near-black
const EPITHELIAL: [number, number, number] = [225, 175, 175];  // pale pink
const AMBIGUOUS: [number, number, number] = [150, 110, 70];    // orange-brown
const MARKER_GREEN: [number, number, number] = [0, 160, 0];

describe('heuristic tissue provider', () => {
  it('declares itself a prototype, and stamps its version', async () => {
    // This flag is what lets every result it produced be found and excluded
    // once a trained model exists.
    expect(heuristicTissueProvider.isPrototypeEstimator).toBe(true);
    expect(heuristicTissueProvider.modelVersion).toBe(HEURISTIC_TISSUE_VERSION);
    expect(HEURISTIC_TISSUE_VERSION).toContain('heuristic-');
  });

  it('classifies the four tissue types', async () => {
    const px = [GRANULATION, GRANULATION, SLOUGH, NECROTIC, EPITHELIAL];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), allIn(px.length));
    expect(r.granulationPct).toBe(40);
    expect(r.sloughPct).toBe(20);
    expect(r.necroticPct).toBe(20);
    expect(r.epithelialPct).toBe(20);
    expect(r.unclassifiedPct).toBe(0);
  });

  it('reports ambiguous pixels as unclassified rather than granulation', async () => {
    // The defect this replaces: ambiguous pixels became granulation, i.e. viable.
    const px = [GRANULATION, AMBIGUOUS, AMBIGUOUS, AMBIGUOUS];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), allIn(px.length));
    expect(r.unclassifiedPct).toBe(75);
    expect(r.granulationPct).toBe(25);
  });

  it('does not let ambiguity inflate graft take', async () => {
    // The whole point. A graft that is one quarter clearly healthy and three
    // quarters unreadable must not report as three quarters viable.
    const px = [GRANULATION, AMBIGUOUS, AMBIGUOUS, AMBIGUOUS];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), allIn(px.length));

    const take = estimateGraftTake(40, 40, r, 90);
    // Of the classified tissue, all is viable — but confidence collapses,
    // which is how the uncertainty surfaces instead of a wrong number.
    expect(take.confidence).toBe('uncertain');

    // Had the ambiguous pixels defaulted to granulation, coverage would have
    // looked complete and confidence would have been high on a guess.
    expect(r.coverage).toBeLessThan(0.4);
  });

  it('never counts the calibration marker as tissue', async () => {
    // The marker is required in frame. Classifying its green as tissue would
    // corrupt every percentage on a correctly taken photograph.
    const px = [GRANULATION, MARKER_GREEN, MARKER_GREEN];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), allIn(px.length));
    expect(r.granulationPct).toBeCloseTo(33.3, 0);
    expect(r.unclassifiedPct).toBeCloseTo(66.7, 0);
  });

  it('leaves deep shadow unclassified rather than calling it necrosis', async () => {
    // A shadow over healthy tissue reported as necrosis would understate graft
    // take and prompt intervention on an image artefact.
    const shadowedRed: [number, number, number] = [46, 20, 18]; // dark but saturated
    const px = [shadowedRed, shadowedRed];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), allIn(px.length));
    expect(r.necroticPct).toBe(0);
  });

  it('ignores pixels outside the mask', async () => {
    const px = [GRANULATION, SLOUGH, NECROTIC];
    const mask = [true, false, false];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), mask);
    expect(r.granulationPct).toBe(100);
    expect(r.sloughPct).toBe(0);
  });

  it('returns an empty, uncertain result for an empty mask', async () => {
    const r = await heuristicTissueProvider.analyse(fakeCanvas([GRANULATION]), [false]);
    expect(r.coverage).toBe(0);
    expect(r.confidence).toBe('uncertain');
  });

  it('lowers confidence as coverage falls', async () => {
    const clear = await heuristicTissueProvider.analyse(
      fakeCanvas([GRANULATION, GRANULATION, SLOUGH, NECROTIC]), allIn(4));
    expect(clear.confidence).toBe('high');

    const murky = await heuristicTissueProvider.analyse(
      fakeCanvas([GRANULATION, AMBIGUOUS, AMBIGUOUS, AMBIGUOUS]), allIn(4));
    expect(murky.confidence).toBe('uncertain');
  });

  it('percentages account for the whole mask', async () => {
    const px = [GRANULATION, SLOUGH, NECROTIC, EPITHELIAL, AMBIGUOUS, MARKER_GREEN];
    const r = await heuristicTissueProvider.analyse(fakeCanvas(px), allIn(px.length));
    const sum = r.granulationPct + r.sloughPct + r.necroticPct +
      r.epithelialPct + r.unclassifiedPct;
    expect(sum).toBeCloseTo(100, 0);
  });
});

describe('provider registry', () => {
  it('falls back to the heuristic when nothing better is available', async () => {
    expect((await selectTissueProvider()).id).toBe(heuristicTissueProvider.id);
  });

  it('prefers a registered trained model', async () => {
    const trained: TissueProvider = {
      id: 'test-trained', label: 'Test', modelVersion: 'test-1.0.0',
      isPrototypeEstimator: false, priority: 100,
      isAvailable: async () => true,
      analyse: async () => ({
        granulationPct: 100, sloughPct: 0, necroticPct: 0, epithelialPct: 0,
        unclassifiedPct: 0, coverage: 1, providerId: 'test-trained',
        modelVersion: 'test-1.0.0', isPrototypeEstimator: false, confidence: 'high',
      }),
    };
    registerTissueProvider(trained);
    expect((await selectTissueProvider()).id).toBe('test-trained');

    // A model whose weights fail to load must not break the analysis.
    registerTissueProvider({ ...trained, isAvailable: async () => false });
    expect((await selectTissueProvider()).id).toBe(heuristicTissueProvider.id);

    registerTissueProvider({ ...trained, isAvailable: async () => { throw new Error('no weights'); } });
    expect((await selectTissueProvider()).id).toBe(heuristicTissueProvider.id);
  });

  it('orders providers by priority', () => {
    const ids = listTissueProviders().map(p => p.priority);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });
});

describe('integration contract for a future model', () => {
  it('records the requirements and why each candidate was or was not used', () => {
    const d = describeOnnxIntegration();
    expect(d.requirements.length).toBeGreaterThanOrEqual(5);

    // A repository without a stated licence grants no rights, and the reason a
    // technically convenient model was rejected must stay written down — it is
    // exactly the decision someone will otherwise quietly reverse.
    const unlicensed = d.candidates.find(c => /none stated|unstated|no licence/i.test(c.licence));
    expect(unlicensed).toBeDefined();
    expect(unlicensed!.suitability).toMatch(/licence|rights/i);

    // Every candidate carries a reason, not just a verdict.
    expect(d.candidates.every(c => c.suitability.length > 40)).toBe(true);

    // A licence permitting clinical use has to be an explicit requirement.
    expect(d.requirements.some(r => /licen[cs]e/i.test(r))).toBe(true);
  });
});
