import { describe, it, expect } from 'vitest';
import {
  rgbToLab, deltaE76, deltaE2000, sampleRegion, analyseScarColour, MIN_REGION_PIXELS,
} from '../services/colourAnalysis';
import { measureScar, convexHull, maxCaliper, suggestClassification } from '../services/scarMorphometry';
import {
  analyseDomain, classifyTrend, safePercentChange, exceedsNoiseFloor,
  ratePerMonth, accelerationPerMonth, isAccelerating, DOMAIN_SPECS,
} from '../services/longitudinal';
import { readMultimodal, compareCaptureConditions, compareMeasurementMethods } from '../services/multimodal';
import {
  predictProgressionRisk, predictTrajectory, predictTreatmentResponse,
  riskBand, DEFAULT_ELIGIBILITY, type PredictionInput,
} from '../services/scarPrediction';
import { computeResponseIndex, buildAlerts } from '../services/responseAndAlerts';
import { unavailableMeasurement, reconstruct, captureSequenceFor } from '../services/reconstruction3d';
import { scoreScale, getScale, SCALE_DEFINITIONS } from '../data/scales';
import type { DomainChange, MultimodalReading, ScarDomain } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const square = (x: number, y: number, size: number) => [
  { x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size },
];

const day = (n: number) => new Date(2026, 0, 1 + n).toISOString();

const change = (over: Partial<DomainChange> & { domain: ScarDomain }): DomainChange => ({
  label: DOMAIN_SPECS[over.domain].label,
  unit: DOMAIN_SPECS[over.domain].unit,
  lowerIsBetter: true,
  baselineValue: null, previousValue: null, currentValue: null,
  absoluteChangeFromBaseline: null, percentChangeFromBaseline: null,
  absoluteChangeFromPrevious: null, percentChangeFromPrevious: null,
  ratePerMonth: null, accelerationPerMonth: null,
  trend: 'indeterminate',
  origin: DOMAIN_SPECS[over.domain].origin,
  limitations: [],
  ...over,
});

// ── Colour ──────────────────────────────────────────────────────────────────

describe('CIELAB conversion', () => {
  it('maps pure white to L*100, neutral a* and b*', () => {
    const lab = rgbToLab(255, 255, 255);
    expect(lab.l).toBeCloseTo(100, 1);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });

  it('maps black to L*0', () => {
    expect(rgbToLab(0, 0, 0).l).toBeCloseTo(0, 3);
  });

  it('puts red in the positive a* quadrant and blue in the negative b*', () => {
    expect(rgbToLab(255, 0, 0).a).toBeGreaterThan(50);
    expect(rgbToLab(0, 0, 255).b).toBeLessThan(-50);
  });

  it('gives a mid grey a neutral chroma', () => {
    const lab = rgbToLab(128, 128, 128);
    expect(Math.abs(lab.a)).toBeLessThan(0.5);
    expect(Math.abs(lab.b)).toBeLessThan(0.5);
  });
});

describe('colour difference', () => {
  it('reports zero difference between a colour and itself', () => {
    const c = rgbToLab(180, 120, 110);
    expect(deltaE76(c, c)).toBeCloseTo(0, 6);
    expect(deltaE2000(c, c)).toBeCloseTo(0, 6);
  });

  it('is symmetric', () => {
    const p = rgbToLab(200, 140, 130);
    const q = rgbToLab(170, 120, 115);
    expect(deltaE2000(p, q)).toBeCloseTo(deltaE2000(q, p), 6);
  });

  it('grows with visible difference', () => {
    const skin = rgbToLab(190, 140, 120);
    const slight = rgbToLab(195, 138, 120);
    const marked = rgbToLab(220, 90, 85);
    expect(deltaE2000(skin, marked)).toBeGreaterThan(deltaE2000(skin, slight));
  });

  it('returns a finite value for neutral colours, where the 2000 formula is delicate', () => {
    const a = rgbToLab(128, 128, 128);
    const b = rgbToLab(130, 130, 130);
    const d = deltaE2000(a, b);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(0);
  });
});

describe('region sampling', () => {
  /** A flat field of one colour, so the mean is known exactly. */
  const field = (w: number, h: number, rgb: [number, number, number]) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1];
      data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255;
    }
    return data;
  };

  it('recovers the colour of a uniform region', () => {
    const data = field(40, 40, [190, 140, 120]);
    const stats = sampleRegion(data, 40, 40, square(5, 5, 20));
    const expected = rgbToLab(190, 140, 120);
    expect(stats.mean.l).toBeCloseTo(expected.l, 4);
    expect(stats.pixelCount).toBe(400);
    expect(stats.heterogeneity).toBeCloseTo(0, 4);
  });

  it('excludes specular highlights, which carry no tissue colour', () => {
    const w = 40, h = 40;
    const data = field(w, h, [190, 140, 120]);
    // Blow out a 10×10 block inside the sampled square.
    for (let y = 5; y < 15; y++) {
      for (let x = 5; x < 15; x++) {
        const i = (y * w + x) * 4;
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
      }
    }
    const stats = sampleRegion(data, w, h, square(5, 5, 20));
    expect(stats.pixelCount).toBe(300);
    expect(stats.mean.l).toBeCloseTo(rgbToLab(190, 140, 120).l, 4);
  });

  it('returns nothing for a degenerate polygon', () => {
    const data = field(10, 10, [100, 100, 100]);
    expect(sampleRegion(data, 10, 10, [{ x: 0, y: 0 }, { x: 1, y: 1 }]).pixelCount).toBe(0);
  });
});

describe('analyseScarColour', () => {
  /** Two flat regions side by side: a redder scar and normal skin. */
  const twoTone = (w: number, h: number) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const scar = x < w / 2;
        data[i] = scar ? 215 : 190;
        data[i + 1] = scar ? 110 : 145;
        data[i + 2] = scar ? 100 : 125;
        data[i + 3] = 255;
      }
    }
    return data;
  };

  it('measures the scar as redder than the skin beside it', () => {
    const w = 80, h = 40;
    const result = analyseScarColour({
      data: twoTone(w, h), width: w, height: h,
      scarPolygon: square(2, 2, 30),
      referencePolygon: square(44, 2, 30),
    });
    expect(result).not.toBeNull();
    expect(result!.erythemaIndex).toBeGreaterThan(0);
    expect(result!.deltaE2000).toBeGreaterThan(1);
    expect(result!.provenance.origin).toBe('measured');
  });

  it('refuses to report a colour from too few pixels', () => {
    const w = 80, h = 40;
    const result = analyseScarColour({
      data: twoTone(w, h), width: w, height: h,
      scarPolygon: square(2, 2, 5),   // 25 px, well below the floor
      referencePolygon: square(44, 2, 30),
    });
    expect(result).toBeNull();
    expect(MIN_REGION_PIXELS).toBeGreaterThan(25);
  });

  it('always states that absolute colour is not comparable between devices', () => {
    const w = 80, h = 40;
    const result = analyseScarColour({
      data: twoTone(w, h), width: w, height: h,
      scarPolygon: square(2, 2, 30),
      referencePolygon: square(44, 2, 30),
    });
    expect(result!.limitations.join(' ')).toMatch(/uncalibrated camera/i);
  });
});

// ── Morphometry ─────────────────────────────────────────────────────────────

describe('measureScar', () => {
  it('measures a calibrated square exactly', () => {
    // 20 px square at 10 px/cm = 2 cm × 2 cm = 4 cm², perimeter 8 cm.
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: 10 });
    expect(m.areaCm2).toBeCloseTo(4, 2);
    expect(m.perimeterCm).toBeCloseTo(8, 2);
    expect(m.maxLengthCm).toBeCloseTo(Math.sqrt(8), 2); // the diagonal
  });

  it('withholds every dimension when there is no calibration', () => {
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: null });
    expect(m.areaCm2).toBeNull();
    expect(m.perimeterCm).toBeNull();
    expect(m.maxLengthCm).toBeNull();
    expect(m.limitations.join(' ')).toMatch(/no calibration marker/i);
  });

  it('still reports shape without calibration, because ratios need no scale', () => {
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: null });
    expect(m.circularity).not.toBeNull();
    expect(m.solidity).not.toBeNull();
    expect(m.borderIrregularity).not.toBeNull();
  });

  it('gives a square the circularity of a square, not a circle', () => {
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: 10 });
    // 4πA/P² for a square is π/4 ≈ 0.785.
    expect(m.circularity).toBeCloseTo(Math.PI / 4, 2);
  });

  it('gives a convex shape solidity near 1', () => {
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: 10 });
    expect(m.solidity).toBeGreaterThan(0.95);
  });

  it('produces no extension figure when the original wound is unknown', () => {
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: 10 });
    expect(m.extensionBeyondOriginalCm2).toBeNull();
    expect(m.extensionBeyondOriginalPercent).toBeNull();
  });

  it('computes extension against a recorded original wound area', () => {
    const m = measureScar({
      scarPolygon: square(0, 0, 20), pixelsPerCm: 10, originalWoundAreaCm2: 2,
    });
    expect(m.extensionBeyondOriginalCm2).toBeCloseTo(2, 2);
    expect(m.extensionBeyondOriginalPercent).toBeCloseTo(100, 1);
  });

  it('handles a degenerate trace without throwing', () => {
    const m = measureScar({ scarPolygon: [{ x: 0, y: 0 }], pixelsPerCm: 10 });
    expect(m.areaCm2).toBeNull();
    expect(m.limitations.length).toBeGreaterThan(0);
  });
});

describe('convexHull and maxCaliper', () => {
  it('reduces a square with an interior point to four corners', () => {
    const hull = convexHull([...square(0, 0, 10), { x: 5, y: 5 }]);
    expect(hull.length).toBe(4);
  });

  it('finds the diagonal as the longest extent of a square', () => {
    const c = maxCaliper(square(0, 0, 10));
    expect(c!.distance).toBeCloseTo(Math.sqrt(200), 4);
  });
});

describe('suggestClassification', () => {
  it('refuses to guess between keloid and hypertrophic without the original margin', () => {
    const m = measureScar({ scarPolygon: square(0, 0, 20), pixelsPerCm: 10 });
    const s = suggestClassification(m);
    expect(s.suggestion).toBeNull();
    expect(s.confidence).toBe('not_reliable');
    expect(s.basis).toMatch(/original wound boundary/i);
  });

  it('suggests keloid only on measured extension beyond the original wound', () => {
    const m = measureScar({
      scarPolygon: square(0, 0, 20), pixelsPerCm: 10, originalWoundAreaCm2: 1,
    });
    const s = suggestClassification(m);
    expect(s.suggestion).toBe('keloid');
    expect(s.basis).toMatch(/confirmation required/i);
  });

  it('never claims high confidence in a shape-based suggestion', () => {
    const m = measureScar({
      scarPolygon: square(0, 0, 20), pixelsPerCm: 10, originalWoundAreaCm2: 1,
    });
    expect(suggestClassification(m).confidence).not.toBe('high');
  });
});

// ── Longitudinal ────────────────────────────────────────────────────────────

describe('safePercentChange', () => {
  it('computes an ordinary percentage', () => {
    expect(safePercentChange(10, 8, 0.5)).toBeCloseTo(-20, 5);
  });

  it('withholds a percentage against a negligible baseline', () => {
    // 0.2 → 0.1 cm² is a 50% reduction and clinically nothing.
    expect(safePercentChange(0.2, 0.1, 0.5)).toBeNull();
  });

  it('handles a negative baseline by magnitude', () => {
    expect(safePercentChange(-4, -2, 0.5)).toBeCloseTo(50, 5);
  });
});

describe('noise floor', () => {
  it('treats a small relative change in area as within measurement noise', () => {
    expect(exceedsNoiseFloor(DOMAIN_SPECS.area, 10, 10.3)).toBe(false);
    expect(exceedsNoiseFloor(DOMAIN_SPECS.area, 10, 12)).toBe(true);
  });

  it('uses an absolute floor for ordinal scores', () => {
    expect(exceedsNoiseFloor(DOMAIN_SPECS.vss, 6, 6.5)).toBe(false);
    expect(exceedsNoiseFloor(DOMAIN_SPECS.vss, 6, 8)).toBe(true);
  });
});

describe('classifyTrend', () => {
  it('calls a steadily shrinking scar improving', () => {
    expect(classifyTrend(DOMAIN_SPECS.area, [
      { at: day(0), value: 12 }, { at: day(30), value: 10 }, { at: day(60), value: 8 },
    ])).toBe('improving');
  });

  it('calls a steadily growing scar worsening', () => {
    expect(classifyTrend(DOMAIN_SPECS.area, [
      { at: day(0), value: 8 }, { at: day(30), value: 10 }, { at: day(60), value: 13 },
    ])).toBe('worsening');
  });

  it('calls small wobble stable', () => {
    expect(classifyTrend(DOMAIN_SPECS.area, [
      { at: day(0), value: 10 }, { at: day(30), value: 10.2 }, { at: day(60), value: 9.9 },
    ])).toBe('stable');
  });

  it('does not report a scar that went up then down as stable', () => {
    expect(classifyTrend(DOMAIN_SPECS.area, [
      { at: day(0), value: 10 }, { at: day(30), value: 16 }, { at: day(60), value: 10 },
    ])).toBe('fluctuating');
  });

  it('is indeterminate from a single point', () => {
    expect(classifyTrend(DOMAIN_SPECS.area, [{ at: day(0), value: 10 }])).toBe('indeterminate');
  });
});

describe('rate and acceleration', () => {
  it('computes a monthly rate from the most recent interval', () => {
    expect(ratePerMonth([{ at: day(0), value: 10 }, { at: day(30), value: 13 }])).toBeCloseTo(3, 2);
  });

  it('needs three points before it will compute acceleration', () => {
    expect(accelerationPerMonth([{ at: day(0), value: 10 }, { at: day(30), value: 13 }])).toBeNull();
  });

  it('detects growth that is speeding up', () => {
    const c = analyseDomain('area', [
      { at: day(0), value: 10 }, { at: day(30), value: 11 }, { at: day(60), value: 14 },
    ]);
    expect(c.accelerationPerMonth).toBeGreaterThan(0);
    expect(isAccelerating(c)).toBe(true);
  });

  it('does not call steady growth acceleration', () => {
    const c = analyseDomain('area', [
      { at: day(0), value: 10 }, { at: day(30), value: 12 }, { at: day(60), value: 14 },
    ]);
    expect(isAccelerating(c)).toBe(false);
  });

  it('survives two assessments on the same day without dividing by zero', () => {
    const c = analyseDomain('area', [{ at: day(0), value: 10 }, { at: day(0), value: 11 }]);
    expect(c.ratePerMonth).toBeNull();
  });
});

describe('analyseDomain', () => {
  it('says so when a domain was never recorded', () => {
    const c = analyseDomain('volume', []);
    expect(c.currentValue).toBeNull();
    expect(c.trend).toBe('indeterminate');
    expect(c.limitations.join(' ')).toMatch(/not recorded/i);
  });

  it('reports a single measurement without inventing a change', () => {
    const c = analyseDomain('area', [{ at: day(0), value: 10 }]);
    expect(c.currentValue).toBe(10);
    expect(c.absoluteChangeFromBaseline).toBeNull();
    expect(c.limitations.join(' ')).toMatch(/only one assessment/i);
  });

  it('flags a change that sits inside the measurement noise', () => {
    const c = analyseDomain('area', [{ at: day(0), value: 10 }, { at: day(30), value: 10.2 }]);
    expect(c.limitations.join(' ')).toMatch(/within the repeatability/i);
  });
});

// ── Multimodal ──────────────────────────────────────────────────────────────

describe('readMultimodal', () => {
  it('reports insufficient data when nothing has a direction', () => {
    const r = readMultimodal({ changes: [change({ domain: 'area' })] });
    expect(r.verdict).toBe('insufficient_data');
  });

  it('calls agreement across modalities a response', () => {
    const r = readMultimodal({
      changes: [
        change({ domain: 'area', trend: 'improving', currentValue: 8, percentChangeFromBaseline: -20 }),
        change({ domain: 'pliability', trend: 'improving', currentValue: 1 }),
        change({ domain: 'symptoms', trend: 'improving', currentValue: 2 }),
      ],
    });
    expect(r.verdict).toBe('concordant_improvement');
    expect(r.headline).toMatch(/multimodal/i);
  });

  it('does not force a verdict when modalities disagree', () => {
    const r = readMultimodal({
      changes: [
        change({ domain: 'area', trend: 'worsening', currentValue: 14 }),
        change({ domain: 'pliability', trend: 'improving', currentValue: 1 }),
      ],
    });
    expect(r.verdict).toBe('discordant');
    expect(r.headline).toMatch(/discordance/i);
    expect(r.conflicts.length).toBeGreaterThan(0);
  });

  it('does not treat three figures from one photograph as corroboration', () => {
    const r = readMultimodal({
      changes: [
        change({ domain: 'area', trend: 'worsening', currentValue: 14 }),
        change({ domain: 'erythema', trend: 'worsening', currentValue: 8 }),
        change({ domain: 'pigmentation', trend: 'worsening', currentValue: 9 }),
      ],
    });
    expect(r.verdict).toBe('concordant_progression');
    expect(r.headline).toMatch(/single modality/i);
  });

  it('excludes unmeasured domains rather than counting them as stable', () => {
    const r = readMultimodal({
      changes: [
        change({ domain: 'area', trend: 'improving', currentValue: 8 }),
        change({ domain: 'volume' }),
      ],
    });
    expect(r.stable.find(c => c.domain === 'volume')).toBeUndefined();
    expect(r.supportingStatements.join(' ')).toMatch(/not yet assessable/i);
  });
});

describe('capture and method comparability', () => {
  it('warns when the camera changed', () => {
    const w = compareCaptureConditions({ previousDevice: 'Phone A', currentDevice: 'Phone B' });
    expect(w.join(' ')).toMatch(/different device/i);
  });

  it('warns when the working distance changed substantially', () => {
    const w = compareCaptureConditions({ previousPixelsPerCm: 20, currentPixelsPerCm: 45 });
    expect(w.join(' ')).toMatch(/working distance/i);
  });

  it('stays quiet when conditions match', () => {
    expect(compareCaptureConditions({
      previousDevice: 'Phone A', currentDevice: 'Phone A',
      previousPixelsPerCm: 20, currentPixelsPerCm: 21,
    })).toEqual([]);
  });

  it('warns when the boundary was produced different ways', () => {
    const w = compareMeasurementMethods('clinician-traced', 'auto-segmented');
    expect(w.join(' ')).toMatch(/method, not scar/i);
  });
});

// ── Prediction ──────────────────────────────────────────────────────────────

const stableReading: MultimodalReading = {
  verdict: 'concordant_progression', headline: '', improving: [], worsening: [], stable: [],
  supportingStatements: [], conflicts: [], confidence: 'moderate',
};

const growingInput = (over: Partial<PredictionInput> = {}): PredictionInput => ({
  changes: [change({
    domain: 'area', trend: 'worsening', currentValue: 14,
    baselineValue: 10, percentChangeFromBaseline: 40, ratePerMonth: 2,
  })],
  reading: stableReading,
  reliableAssessmentCount: 4,
  followUpDays: 90,
  hasBaseline: true,
  ...over,
});

describe('prediction eligibility', () => {
  it('refuses to predict without a baseline', () => {
    const p = predictProgressionRisk(growingInput({ hasBaseline: false }));
    expect(p.eligible).toBe(false);
    expect(p.probability).toBeNull();
    expect(p.ineligibleReasons.join(' ')).toMatch(/baseline/i);
  });

  it('refuses to predict from too few assessments', () => {
    const p = predictProgressionRisk(growingInput({ reliableAssessmentCount: 1 }));
    expect(p.eligible).toBe(false);
    expect(p.ineligibleReasons.join(' ')).toMatch(/reliable assessments/i);
  });

  it('refuses to predict over too short a follow-up', () => {
    const p = predictProgressionRisk(growingInput({ followUpDays: 5 }));
    expect(p.eligible).toBe(false);
    expect(p.ineligibleReasons.join(' ')).toMatch(/days of follow-up/i);
  });

  it('refuses a horizon the model has not been evaluated for', () => {
    const p = predictProgressionRisk(growingInput(), 365);
    expect(p.eligible).toBe(false);
    expect(p.ineligibleReasons.join(' ')).toMatch(/has not been evaluated/i);
    expect(DEFAULT_ELIGIBILITY.allowedHorizonDays).not.toContain(365);
  });

  it('never returns a number when it is ineligible', () => {
    for (const bad of [
      growingInput({ hasBaseline: false }),
      growingInput({ reliableAssessmentCount: 0 }),
      growingInput({ followUpDays: 0 }),
    ]) {
      const p = predictProgressionRisk(bad);
      expect(p.probability).toBeNull();
      expect(p.confidence).toBe('not_reliable');
    }
  });
});

describe('progression risk', () => {
  it('rates a fast-growing scar above a slow-growing one', () => {
    const slow = predictProgressionRisk(growingInput({
      changes: [change({ domain: 'area', trend: 'worsening', currentValue: 100, ratePerMonth: 1 })],
    }));
    const fast = predictProgressionRisk(growingInput({
      changes: [change({ domain: 'area', trend: 'worsening', currentValue: 10, ratePerMonth: 3 })],
    }));
    expect(fast.probability!).toBeGreaterThan(slow.probability!);
  });

  it('raises the estimate when growth is accelerating', () => {
    const steady = predictProgressionRisk(growingInput());
    const accelerating = predictProgressionRisk(growingInput({
      changes: [change({
        domain: 'area', trend: 'worsening', currentValue: 14,
        ratePerMonth: 2, accelerationPerMonth: 1,
      })],
    }));
    expect(accelerating.probability!).toBeGreaterThan(steady.probability!);
    expect(accelerating.supportingFeatures.join(' ')).toMatch(/accelerating/i);
  });

  it('always labels itself experimental and unvalidated', () => {
    const p = predictProgressionRisk(growingInput());
    expect(p.limitations.join(' ')).toMatch(/experimental/i);
    expect(p.limitations.join(' ')).toMatch(/not.*fitted to outcomes/i);
  });

  it('explains itself with the measurements that drove it', () => {
    const p = predictProgressionRisk(growingInput());
    expect(p.supportingFeatures.length).toBeGreaterThan(0);
    expect(p.supportingFeatures.join(' ')).toMatch(/per month/i);
  });

  it('never exceeds a 90% estimate, however extreme the growth', () => {
    const p = predictProgressionRisk(growingInput({
      changes: [change({
        domain: 'area', trend: 'worsening', currentValue: 10,
        ratePerMonth: 50, accelerationPerMonth: 30,
      })],
      reading: { ...stableReading, worsening: [change({ domain: 'area' }), change({ domain: 'symptoms' })] },
    }));
    expect(p.probability!).toBeLessThanOrEqual(0.9);
  });
});

describe('trajectory projection', () => {
  it('projects forward with a range, never a bare figure', () => {
    const p = predictTrajectory(growingInput(), 'area', 84);
    expect(p.projectedValue).toBeGreaterThan(14);
    expect(p.projectedRangeLow!).toBeLessThan(p.projectedValue!);
    expect(p.projectedRangeHigh!).toBeGreaterThan(p.projectedValue!);
  });

  it('never projects a negative area', () => {
    const p = predictTrajectory(growingInput({
      changes: [change({ domain: 'area', trend: 'improving', currentValue: 2, ratePerMonth: -5 })],
    }), 'area', 84);
    expect(p.projectedValue!).toBeGreaterThanOrEqual(0);
    expect(p.projectedRangeLow!).toBeGreaterThanOrEqual(0);
  });

  it('says it is an extrapolation, not a growth model', () => {
    const p = predictTrajectory(growingInput(), 'area', 84);
    expect(p.limitations.join(' ')).toMatch(/straight-line extrapolation/i);
  });
});

describe('treatment response', () => {
  it('declines when no treatment was given', () => {
    const p = predictTreatmentResponse(growingInput({ treatedDuringWindow: false }));
    expect(p.eligible).toBe(false);
    expect(p.ineligibleReasons.join(' ')).toMatch(/no treatment/i);
  });

  it('never claims the treatment caused the change', () => {
    const p = predictTreatmentResponse(growingInput({ treatedDuringWindow: true }));
    expect(p.limitations.join(' ')).toMatch(/cannot establish that the treatment caused/i);
  });
});

describe('riskBand', () => {
  it('reads a missing probability as not estimable', () => {
    expect(riskBand(null)).toBe('Not estimable');
  });

  it('increases monotonically', () => {
    const bands = [0.1, 0.3, 0.5, 0.8].map(riskBand);
    expect(bands).toEqual(['Low', 'Moderate', 'High', 'Very high']);
  });
});

// ── Response index ──────────────────────────────────────────────────────────

describe('computeResponseIndex', () => {
  it('gives no score when nothing has a change from baseline', () => {
    const r = computeResponseIndex([change({ domain: 'area' })]);
    expect(r.score).toBeNull();
  });

  it('scores improvement positive for a lower-is-better domain', () => {
    const r = computeResponseIndex([
      change({ domain: 'area', percentChangeFromBaseline: -30, currentValue: 7 }),
    ]);
    expect(r.score!).toBeGreaterThan(0);
  });

  it('scores growth negative', () => {
    const r = computeResponseIndex([
      change({ domain: 'area', percentChangeFromBaseline: 30, currentValue: 13 }),
    ]);
    expect(r.score!).toBeLessThan(0);
  });

  it('redistributes weight rather than counting a missing domain as no change', () => {
    const onlyArea = computeResponseIndex([
      change({ domain: 'area', percentChangeFromBaseline: -40, currentValue: 6 }),
    ]);
    // With one group carrying all the weight, a 40% improvement maps to +40,
    // not to 40 × 0.30 as it would if the missing groups counted as zero.
    expect(onlyArea.score!).toBeCloseTo(40, 0);
    expect(onlyArea.missingDomains.length).toBeGreaterThan(0);
  });

  it('always states that it is not a validated scale', () => {
    const r = computeResponseIndex([
      change({ domain: 'area', percentChangeFromBaseline: -30, currentValue: 7 }),
    ]);
    expect(r.label).toMatch(/not a validated scale/i);
    expect(r.limitations.join(' ')).toMatch(/not a validated clinical scale/i);
  });

  it('shows its components so the score can be taken apart', () => {
    const r = computeResponseIndex([
      change({ domain: 'area', percentChangeFromBaseline: -30, currentValue: 7 }),
      change({ domain: 'symptoms', percentChangeFromBaseline: -50, currentValue: 3 }),
    ]);
    expect(r.components.length).toBe(2);
    for (const c of r.components) expect(typeof c.contribution).toBe('number');
  });
});

// ── Alerts ──────────────────────────────────────────────────────────────────

describe('buildAlerts', () => {
  const base = { scarId: 's1', patientId: 'p1', now: day(0) };

  it('raises rapid expansion, at high priority when accelerating', () => {
    const alerts = buildAlerts({
      ...base,
      changes: [change({
        domain: 'area', trend: 'worsening', currentValue: 14,
        ratePerMonth: 3, accelerationPerMonth: 1.2, percentChangeFromBaseline: 40,
      })],
      reading: stableReading,
    });
    const a = alerts.find(x => x.kind === 'rapid_expansion');
    expect(a).toBeTruthy();
    expect(a!.priority).toBe('high');
    expect(a!.evidence.join(' ')).toMatch(/accelerating/i);
  });

  it('stays quiet about a stable scar', () => {
    const alerts = buildAlerts({
      ...base,
      changes: [change({ domain: 'area', trend: 'stable', currentValue: 10 })],
      reading: { ...stableReading, verdict: 'concordant_stable' },
    });
    expect(alerts.find(x => x.kind === 'rapid_expansion')).toBeUndefined();
  });

  it('does not call an untreated scar a treatment failure', () => {
    const alerts = buildAlerts({
      ...base,
      changes: [change({ domain: 'area', trend: 'stable', currentValue: 10 })],
      reading: { ...stableReading, verdict: 'concordant_stable' },
      treatedDuringWindow: false,
    });
    expect(alerts.find(x => x.kind === 'possible_treatment_failure')).toBeUndefined();
  });

  it('raises treatment failure only where treatment was actually given', () => {
    const alerts = buildAlerts({
      ...base,
      changes: [change({ domain: 'area', trend: 'stable', currentValue: 10 })],
      reading: { ...stableReading, verdict: 'concordant_stable', stable: [change({ domain: 'area' })] },
      treatedDuringWindow: true,
    });
    expect(alerts.find(x => x.kind === 'possible_treatment_failure')).toBeTruthy();
  });

  it('gives every alert its evidence and a disclaimer', () => {
    const alerts = buildAlerts({
      ...base,
      changes: [change({
        domain: 'area', trend: 'worsening', currentValue: 14, ratePerMonth: 3,
      })],
      reading: stableReading,
      postTreatmentGrowth: true,
      captureWarnings: ['Different device.'],
    });
    expect(alerts.length).toBeGreaterThan(1);
    for (const a of alerts) {
      expect(a.evidence.length).toBeGreaterThan(0);
      expect(a.disclaimer).toMatch(/not a diagnosis/i);
    }
  });

  it('orders high priority first', () => {
    const alerts = buildAlerts({
      ...base,
      changes: [change({ domain: 'area', trend: 'worsening', currentValue: 14, ratePerMonth: 3, accelerationPerMonth: 1 })],
      reading: stableReading,
      postTreatmentGrowth: true,
      captureWarnings: ['Different device.'],
    });
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const ranks = alerts.map(a => rank[a.priority]);
    expect(ranks).toEqual([...ranks].sort());
  });
});

// ── 3D ──────────────────────────────────────────────────────────────────────

describe('3D reconstruction boundary', () => {
  it('returns nulls, never zeros, when no engine is configured', async () => {
    const m = await reconstruct({ frames: [] });
    expect(m.quality).toBe('unavailable');
    expect(m.maxElevationMm).toBeNull();
    expect(m.volumeCm3).toBeNull();
    // Zero would be a measurement — it would say the scar is flat.
    expect(m.maxElevationMm).not.toBe(0);
    expect(m.volumeCm3).not.toBe(0);
  });

  it('explains that these cannot come from a single photograph', () => {
    const m = unavailableMeasurement(1);
    expect(m.limitations.join(' ')).toMatch(/cannot be derived from a single photograph/i);
    expect(m.limitations.join(' ')).toMatch(/will not estimate them from 2D/i);
  });

  it('adapts the capture sequence to the anatomy', () => {
    expect(captureSequenceFor('Left earlobe').join(' ')).toMatch(/posterior/i);
    expect(captureSequenceFor('Abdomen').join(' ')).not.toMatch(/posterior/i);
  });
});

// ── Validated scales ────────────────────────────────────────────────────────

describe('validated scales', () => {
  it('scores a complete Vancouver Scar Scale', () => {
    const vss = getScale('vss')!;
    const r = scoreScale(vss, { vascularity: 2, pigmentation: 1, pliability: 3, height: 2 });
    expect(r.total).toBe(8);
    expect(r.incompleteItems).toEqual([]);
  });

  it('withholds a total when an item is unanswered', () => {
    const vss = getScale('vss')!;
    const r = scoreScale(vss, { vascularity: 2, pigmentation: 1, pliability: 3 });
    expect(r.total).toBeNull();
    expect(r.incompleteItems).toEqual(['height']);
  });

  it('keeps the two POSAS subscales apart', () => {
    const posas = getScale('posas')!;
    const responses: Record<string, number> = {};
    for (const i of posas.items) responses[i.id] = i.subscale === 'observer' ? 3 : 5;
    const r = scoreScale(posas, responses);
    expect(r.subscales.observer).toBe(18); // six observer items at 3
    expect(r.subscales.patient).toBe(30);  // six patient items at 5
  });

  it('excludes the POSAS overall-opinion items from the totals', () => {
    const posas = getScale('posas')!;
    const scored = posas.items.filter(i => !i.excludedFromTotal);
    expect(scored.length).toBe(12);
    expect(posas.items.length).toBe(14);
  });

  it('marks pliability as an examination item on every scale that has it', () => {
    for (const scale of SCALE_DEFINITIONS) {
      const pliability = scale.items.find(i => i.id.includes('pliability'));
      if (pliability) expect(pliability.source).toBe('clinician');
    }
  });

  it('marks every POSAS patient item as the patient’s own answer', () => {
    const posas = getScale('posas')!;
    for (const i of posas.items.filter(x => x.subscale === 'patient')) {
      expect(i.source).toBe('patient');
    }
  });

  it('refuses to score an instrument whose items were never verified', () => {
    const dks = getScale('dks')!;
    expect(dks.requiresVerification).toBe(true);
    const r = scoreScale(dks, { anything: 3 });
    expect(r.scorable).toBe(false);
    expect(r.total).toBeNull();
    expect(r.reason).toMatch(/source publication/i);
  });

  it('gives every scorable scale a citation and a version', () => {
    for (const s of SCALE_DEFINITIONS) {
      expect(s.citation.length).toBeGreaterThan(10);
      expect(s.version.length).toBeGreaterThan(0);
    }
  });
});
