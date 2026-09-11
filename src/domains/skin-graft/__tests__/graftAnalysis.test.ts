/**
 * The clinical arithmetic behind graft take, donor re-epithelialization,
 * planning and prediction.
 *
 * The behaviour that matters most is the preserved baseline: take is measured
 * against the area the graft had when it was applied, never against the area in
 * the current photograph. Measuring a shrinking graft against itself reports
 * 100% take of a failing graft, which is the exact failure this module exists
 * to catch.
 */

import { describe, it, expect } from 'vitest';
import {
  estimateGraftTake,
  estimateEpithelialization,
  planGraft,
  predictDonorHealing,
  classifyGraftTrend,
  PREDICTION_MODEL_VERSION,
} from '../services/graftAnalysis';
import type { TissueBreakdown } from '../types';

const healthy: TissueBreakdown = { granulationPct: 85, epithelialPct: 10, sloughPct: 5, necroticPct: 0 };
const failing: TissueBreakdown = { granulationPct: 30, epithelialPct: 5, sloughPct: 25, necroticPct: 40 };
const unclassified: TissueBreakdown = { granulationPct: 10, epithelialPct: 5, sloughPct: 5, necroticPct: 0 };
const GOOD_IMAGE = 90;

describe('graft take', () => {
  it('measures take against the preserved baseline, not the current area', () => {
    // A graft applied at 50 cm2 that is now 25 cm2 and entirely healthy has
    // taken about half — not 95% of its own shrunken self.
    const r = estimateGraftTake(25, 50, healthy, GOOD_IMAGE);
    expect(r.viableAreaCm2).toBeCloseTo(23.8, 1);
    expect(r.takePercent).toBeCloseTo(47.5, 1);
  });

  it('would have reported near-total take if measured against itself', () => {
    // Documents the defect the preserved baseline prevents.
    const selfReferential = estimateGraftTake(25, 25, healthy, GOOD_IMAGE);
    expect(selfReferential.takePercent).toBeGreaterThan(90);

    const correct = estimateGraftTake(25, 50, healthy, GOOD_IMAGE);
    expect(correct.takePercent!).toBeLessThan(50);
  });

  it('splits viable from non-viable by tissue', () => {
    const r = estimateGraftTake(100, 100, failing, GOOD_IMAGE);
    expect(r.viableAreaCm2! + r.nonviableAreaCm2!).toBeCloseTo(100, 0);
    // Only granulation and epithelium count as viable: 35 of 100 classified.
    expect(r.takePercent).toBeCloseTo(35, 0);
  });

  it('normalises against classified tissue, not an assumed 100', () => {
    // 20% of the region was classified at all. Treating the unclassified 80%
    // as non-viable would report a failing graft from a poor colour read.
    const r = estimateGraftTake(50, 50, unclassified, GOOD_IMAGE);
    expect(r.takePercent).toBeCloseTo(75, 0);
  });

  it('reports viable area but no percentage when there is no baseline', () => {
    const r = estimateGraftTake(40, null, healthy, GOOD_IMAGE);
    expect(r.viableAreaCm2).not.toBeNull();
    expect(r.takePercent).toBeNull();
  });

  it('never reports more than 100% take', () => {
    // Segmentation catching surrounding tissue must not produce 150% take.
    const r = estimateGraftTake(200, 50, healthy, GOOD_IMAGE);
    expect(r.takePercent).toBeLessThanOrEqual(100);
  });

  it('returns nothing measurable when the area is missing or zero', () => {
    for (const area of [null, 0, -5, NaN]) {
      const r = estimateGraftTake(area as number, 50, healthy, GOOD_IMAGE);
      expect(r.takePercent).toBeNull();
      expect(r.confidence).toBe('uncertain');
    }
  });

  it('degrades confidence when the tissue read is thin or the image is poor', () => {
    expect(estimateGraftTake(50, 50, healthy, GOOD_IMAGE).confidence).toBe('high');
    expect(estimateGraftTake(50, 50, unclassified, GOOD_IMAGE).confidence).toBe('uncertain');
    expect(estimateGraftTake(50, 50, healthy, 50).confidence).toBe('uncertain');
  });
});

describe('donor re-epithelialization', () => {
  it('measures the open wound against the original harvest area', () => {
    const r = estimateEpithelialization(7.1, 36.5, healthy, GOOD_IMAGE);
    expect(r.epithelializedAreaCm2).toBeCloseTo(29.4, 1);
    expect(r.epithelializedPercent).toBeCloseTo(80.5, 1);
  });

  it('reaches 100% when nothing open remains', () => {
    // A healed donor site segments to nothing; that is closure, not failure.
    const r = estimateEpithelialization(0, 36.5, healthy, GOOD_IMAGE);
    expect(r.epithelializedPercent).toBe(100);
    expect(r.openAreaCm2).toBe(0);
  });

  it('treats an unmeasurable open area as closed rather than unknown', () => {
    const r = estimateEpithelialization(null, 36.5, healthy, GOOD_IMAGE);
    expect(r.epithelializedPercent).toBe(100);
  });

  it('never reports negative epithelialization when the open area exceeds baseline', () => {
    // A wound measuring larger than its recorded harvest means the baseline or
    // the segmentation is wrong; it must not produce a negative percentage.
    const r = estimateEpithelialization(50, 36.5, healthy, GOOD_IMAGE);
    expect(r.epithelializedPercent).toBe(0);
    expect(r.epithelializedAreaCm2).toBe(0);
  });

  it('cannot compute a percentage without a total donor area', () => {
    const r = estimateEpithelialization(7, null, healthy, GOOD_IMAGE);
    expect(r.epithelializedPercent).toBeNull();
    expect(r.confidence).toBe('uncertain');
  });
});

describe('graft planning', () => {
  it('adds a coverage margin and divides by the mesh expansion', () => {
    const p = planGraft(42.7, { coverageMargin: 0.054, meshRatio: 1.5 });
    expect(p.plannedCoverageCm2).toBeCloseTo(45.0, 1);
    expect(p.estimatedHarvestAreaCm2).toBeCloseTo(30.0, 1);
  });

  it('harvests the full coverage area when unmeshed', () => {
    const p = planGraft(40, { coverageMargin: 0, meshRatio: 1 });
    expect(p.estimatedHarvestAreaCm2).toBe(40);
  });

  it('refuses a mesh ratio below 1, which would shrink the graft', () => {
    const p = planGraft(40, { meshRatio: 0.5 });
    expect(p.meshRatio).toBe(1);
  });

  it('handles a zero or missing defect without producing nonsense', () => {
    expect(planGraft(0).estimatedHarvestAreaCm2).toBe(0);
    expect(planGraft(NaN).defectAreaCm2).toBe(0);
  });
});

describe('donor healing prediction', () => {
  const series = [
    { postOpDay: 4, percent: 22 },
    { postOpDay: 7, percent: 49 },
    { postOpDay: 10, percent: 73 },
  ];

  it('stamps its model version', () => {
    expect(predictDonorHealing(series).modelVersion).toBe(PREDICTION_MODEL_VERSION);
  });

  it('projects a closure range ahead of the latest assessment', () => {
    const p = predictDonorHealing(series);
    expect(p.ratePerDay).toBeGreaterThan(7);
    expect(p.predictedClosurePodFrom).toBeGreaterThan(10);
    expect(p.predictedClosurePodTo!).toBeGreaterThan(p.predictedClosurePodFrom!);
    expect(p.trajectory).toBe('improving');
  });

  it('gives a range, never a single day', () => {
    // A straight line through a few ward photographs cannot justify one date.
    const p = predictDonorHealing(series);
    expect(p.predictedClosurePodTo! - p.predictedClosurePodFrom!).toBeGreaterThanOrEqual(2);
  });

  it('always states what limits the prediction', () => {
    expect(predictDonorHealing(series).caveats.length).toBeGreaterThan(0);
  });

  it('will not predict from a single assessment', () => {
    const p = predictDonorHealing([{ postOpDay: 5, percent: 30 }]);
    expect(p.trajectory).toBe('insufficient_data');
    expect(p.predictedClosurePodFrom).toBeNull();
    expect(p.basedOnAssessments).toBe(1);
  });

  it('projects no date when healing has stalled', () => {
    const p = predictDonorHealing([
      { postOpDay: 7, percent: 40 },
      { postOpDay: 14, percent: 41 },
    ]);
    expect(p.trajectory).toBe('delayed');
    expect(p.predictedClosurePodFrom).toBeNull();
  });

  it('reports deterioration when the open area is growing', () => {
    const p = predictDonorHealing([
      { postOpDay: 7, percent: 60 },
      { postOpDay: 10, percent: 45 },
      { postOpDay: 14, percent: 30 },
    ]);
    expect(p.trajectory).toBe('deteriorating');
    expect(p.predictedClosurePodFrom).toBeNull();
  });

  it('recognises a site already closed', () => {
    const p = predictDonorHealing([
      { postOpDay: 7, percent: 60 },
      { postOpDay: 14, percent: 100 },
    ]);
    expect(p.predictedClosurePodFrom).toBe(14);
    expect(p.confidence).toBe('high');
  });

  it('gains confidence as assessments accumulate', () => {
    const two = predictDonorHealing(series.slice(0, 2));
    const four = predictDonorHealing([...series, { postOpDay: 14, percent: 94 }]);
    expect(two.confidence).toBe('uncertain');
    expect(four.confidence).toBe('moderate');
  });

  it('does not fall over when every assessment is on the same day', () => {
    const p = predictDonorHealing([
      { postOpDay: 7, percent: 40 },
      { postOpDay: 7, percent: 45 },
    ]);
    expect(p.trajectory).toBe('insufficient_data');
    expect(p.predictedClosurePodFrom).toBeNull();
  });

  it('ignores unusable points rather than producing NaN', () => {
    const p = predictDonorHealing([
      { postOpDay: NaN, percent: 20 },
      { postOpDay: 7, percent: 49 },
      { postOpDay: 10, percent: 73 },
    ]);
    expect(p.basedOnAssessments).toBe(2);
    expect(Number.isFinite(p.ratePerDay!)).toBe(true);
  });
});

describe('graft trend', () => {
  it('calls a holding graft stable', () => {
    expect(classifyGraftTrend([
      { postOpDay: 3, percent: 96 },
      { postOpDay: 7, percent: 95 },
      { postOpDay: 14, percent: 95 },
    ])).toBe('stable');
  });

  it('flags a graft that is being lost', () => {
    expect(classifyGraftTrend([
      { postOpDay: 3, percent: 95 },
      { postOpDay: 7, percent: 70 },
      { postOpDay: 10, percent: 55 },
    ])).toBe('deteriorating');
  });

  it('will not judge a trend from one point', () => {
    expect(classifyGraftTrend([{ postOpDay: 3, percent: 96 }])).toBe('insufficient_data');
  });
});
