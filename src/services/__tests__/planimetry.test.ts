/**
 * Planimetry is where a clinician's traced outline becomes a number in the
 * record, so the geometry is checked against shapes whose areas are known
 * exactly rather than against the implementation's own output.
 *
 * The failure that matters most is a silent one: a freehand ring that crosses
 * itself has a shoelace area in which the lobes partly cancel, reporting an
 * area far smaller than the region enclosed — plausibly, and with no sign that
 * anything went wrong.
 */

import { describe, it, expect } from 'vitest';
import {
  areaPx,
  perimeterPx,
  pointInPolygon,
  isSelfIntersecting,
  simplify,
  measureTrace,
  computePlanimetry,
  donorFromTraces,
  graftFromTraces,
  type Trace,
  type Point,
} from '../planimetry';

/** Axis-aligned rectangle, given in pixels. */
const rect = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
];

/** Regular polygon approximating a circle of radius r. */
const circle = (cx: number, cy: number, r: number, n = 256): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  });

const trace = (role: Trace['role'], points: Point[], id: string = role): Trace =>
  ({ id, role, points, label: id });

describe('polygon geometry', () => {
  it('computes the exact area of a rectangle', () => {
    expect(areaPx(rect(10, 10, 200, 100))).toBe(20000);
  });

  it('is independent of winding direction', () => {
    const r = rect(0, 0, 50, 40);
    expect(areaPx(r)).toBe(areaPx([...r].reverse()));
  });

  it('is independent of where the ring starts', () => {
    const r = rect(0, 0, 50, 40);
    const rotated = [...r.slice(2), ...r.slice(0, 2)];
    expect(areaPx(rotated)).toBe(areaPx(r));
  });

  it('approximates a circle to within a fraction of a percent', () => {
    const r = 100;
    const computed = areaPx(circle(200, 200, r));
    expect(computed).toBeCloseTo(Math.PI * r * r, -1);
    expect(Math.abs(computed - Math.PI * r * r) / (Math.PI * r * r)).toBeLessThan(0.001);
  });

  it('encloses nothing with fewer than three points', () => {
    expect(areaPx([])).toBe(0);
    expect(areaPx([{ x: 0, y: 0 }])).toBe(0);
    expect(areaPx([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(0);
  });

  it('measures the closed perimeter, including the closing edge', () => {
    expect(perimeterPx(rect(0, 0, 30, 20))).toBe(100);
  });
});

describe('self-intersection', () => {
  it('accepts a simple ring', () => {
    expect(isSelfIntersecting(rect(0, 0, 100, 100))).toBe(false);
    expect(isSelfIntersecting(circle(50, 50, 40, 64))).toBe(false);
  });

  it('detects a figure-of-eight', () => {
    const bowtie = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    expect(isSelfIntersecting(bowtie)).toBe(true);
  });

  it('is why a crossed trace must be rejected rather than measured', () => {
    // The two lobes cancel: the shoelace area is far smaller than the region
    // the clinician actually enclosed, and nothing about the number says so.
    const bowtie = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    const honest = rect(0, 0, 100, 100);
    expect(areaPx(bowtie)).toBeLessThan(areaPx(honest) / 2);

    const g = measureTrace(bowtie, 10);
    expect(g.selfIntersecting).toBe(true);
  });
});

describe('point in polygon', () => {
  const square = rect(0, 0, 100, 100);
  it('distinguishes inside from outside', () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
    expect(pointInPolygon({ x: 150, y: 50 }, square)).toBe(false);
    expect(pointInPolygon({ x: -1, y: 50 }, square)).toBe(false);
  });
});

describe('simplification', () => {
  it('keeps the area essentially unchanged', () => {
    const dense = circle(200, 200, 120, 2000);
    const thin = simplify(dense);
    expect(thin.length).toBeLessThan(dense.length / 4);
    const change = Math.abs(areaPx(thin) - areaPx(dense)) / areaPx(dense);
    // Well inside inter-observer variation, which for hand tracing runs to
    // several percent. The default tolerance is set to keep this under 0.5%.
    expect(change).toBeLessThan(0.005);
  });

  it('leaves an already-minimal ring alone', () => {
    const r = rect(0, 0, 10, 10);
    expect(simplify(r).length).toBeLessThanOrEqual(r.length);
  });
});

describe('measureTrace', () => {
  it('converts pixels to centimetres by the square of the scale', () => {
    // 40 px/cm, so a 200x100 px rectangle is 5 cm x 2.5 cm = 12.5 cm2.
    const g = measureTrace(rect(0, 0, 200, 100), 40);
    expect(g.areaCm2).toBeCloseTo(12.5, 2);
    expect(g.perimeterCm).toBeCloseTo(15, 2);
  });

  it('reports pixels but no centimetres without a scale', () => {
    const g = measureTrace(rect(0, 0, 200, 100), null);
    expect(g.areaPx).toBe(20000);
    expect(g.areaCm2).toBeNull();
  });

  it('rejects a non-positive scale rather than dividing by it', () => {
    for (const s of [0, -40, NaN]) {
      expect(measureTrace(rect(0, 0, 100, 100), s).areaCm2).toBeNull();
    }
  });

  it('flags a ring that encloses nothing', () => {
    expect(measureTrace([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }], 40).degenerate).toBe(true);
  });
});

describe('computePlanimetry', () => {
  const PX_PER_CM = 10; // 100 px2 = 1 cm2

  it('subtracts subregions from the total', () => {
    const traces = [
      trace('total', rect(0, 0, 100, 100)),        // 100 cm2
      trace('subregion', rect(10, 10, 50, 50), 's'), // 25 cm2
    ];
    const r = computePlanimetry(traces, PX_PER_CM);
    expect(r.totalAreaCm2).toBeCloseTo(100, 2);
    expect(r.subregionAreaCm2).toBeCloseTo(25, 2);
    expect(r.remainderAreaCm2).toBeCloseTo(75, 2);
    expect(r.subregionPercent).toBeCloseTo(25, 1);
    expect(r.remainderPercent).toBeCloseTo(75, 1);
    expect(r.valid).toBe(true);
  });

  it('sums multiple subregions', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 100, 100)),
      trace('subregion', rect(5, 5, 30, 30), 'a'),   // 9 cm2
      trace('subregion', rect(60, 60, 20, 20), 'b'), // 4 cm2
    ], PX_PER_CM);
    expect(r.subregionAreaCm2).toBeCloseTo(13, 2);
    expect(r.remainderAreaCm2).toBeCloseTo(87, 2);
  });

  it('adds islands back, so an island is not counted as still raw', () => {
    // An epithelial island inside an open area is healed tissue; counting it as
    // open would hold the percentage down for the rest of the admission.
    const r = computePlanimetry([
      trace('total', rect(0, 0, 100, 100)),
      trace('subregion', rect(10, 10, 50, 50), 'open'),
      trace('island', rect(20, 20, 20, 20), 'island'), // 4 cm2 healed inside
    ], PX_PER_CM);
    expect(r.subregionAreaCm2).toBeCloseTo(21, 2);
    expect(r.remainderAreaCm2).toBeCloseTo(79, 2);
  });

  it('will not compute anything without a total outline', () => {
    const r = computePlanimetry([trace('subregion', rect(0, 0, 10, 10))], PX_PER_CM);
    expect(r.valid).toBe(false);
    expect(r.totalAreaCm2).toBeNull();
    expect(r.problems.join(' ')).toMatch(/whole site/i);
  });

  it('refuses two total outlines rather than picking one', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 100, 100), 'a'),
      trace('total', rect(0, 0, 50, 50), 'b'),
    ], PX_PER_CM);
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/more than one/i);
  });

  it('reports pixels-only and stays invalid without a scale', () => {
    const r = computePlanimetry([trace('total', rect(0, 0, 100, 100))], null);
    expect(r.totalAreaCm2).toBeNull();
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/calibration/i);
  });

  it('flags a self-crossing total and refuses to call it valid', () => {
    const bowtie = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    const r = computePlanimetry([trace('total', bowtie)], PX_PER_CM);
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/crosses itself/i);
  });

  it('flags a subregion traced outside the total', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 50, 50)),
      trace('subregion', rect(200, 200, 20, 20), 's'),
    ], PX_PER_CM);
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/outside/i);
  });

  it('never lets the remainder go negative', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 50, 50)),
      trace('subregion', rect(0, 0, 100, 100), 's'), // larger than the total
    ], PX_PER_CM);
    expect(r.remainderAreaCm2).toBeGreaterThanOrEqual(0);
    expect(r.subregionPercent).toBeLessThanOrEqual(100);
    expect(r.problems.join(' ')).toMatch(/more than the whole site/i);
  });

  it('reports a fully open site as 0% remaining', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 100, 100)),
      trace('subregion', rect(0, 0, 100, 100), 's'),
    ], PX_PER_CM);
    expect(r.subregionPercent).toBeCloseTo(100, 1);
    expect(r.remainderPercent).toBeCloseTo(0, 1);
  });

  it('reports a site with nothing traced open as fully remaining', () => {
    const r = computePlanimetry([trace('total', rect(0, 0, 100, 100))], PX_PER_CM);
    expect(r.remainderPercent).toBe(100);
    expect(r.subregionAreaCm2).toBe(0);
  });
});

describe('donor site', () => {
  const PX_PER_CM = 10;

  it('derives re-epithelialization from the traced geometry', () => {
    // At 10 px/cm, 100 px2 is 1 cm2.
    // Harvested 60x60 px = 36 cm2; still raw 40x18 px = 7.2 cm2.
    // Epithelialised 28.8 cm2, i.e. 80% — computed, never judged by eye.
    const r = donorFromTraces([
      trace('total', rect(0, 0, 60, 60)),
      trace('subregion', rect(5, 5, 40, 18), 'raw'),
    ], PX_PER_CM);
    expect(r.totalAreaCm2).toBeCloseTo(36, 2);
    expect(r.openAreaCm2).toBeCloseTo(7.2, 2);
    expect(r.epithelializedAreaCm2).toBeCloseTo(28.8, 2);
    expect(r.epithelializedPercent).toBeCloseTo(80, 1);
    // The parts must account for the whole.
    expect(r.epithelializedAreaCm2! + r.openAreaCm2!).toBeCloseTo(r.totalAreaCm2!, 1);
    expect(r.valid).toBe(true);
  });

  it('reaches 100% when nothing raw is traced', () => {
    const r = donorFromTraces([trace('total', rect(0, 0, 100, 100))], PX_PER_CM);
    expect(r.epithelializedPercent).toBe(100);
    expect(r.valid).toBe(true);
  });

  it('carries its problems through rather than returning a bare number', () => {
    const r = donorFromTraces([trace('total', rect(0, 0, 100, 100))], null);
    expect(r.valid).toBe(false);
    expect(r.problems.length).toBeGreaterThan(0);
  });
});

describe('recipient site', () => {
  const PX_PER_CM = 10;

  it('measures take against the preserved baseline, not the current outline', () => {
    // Graft applied at 100 cm2. Today it outlines 50 cm2, all of it viable.
    // Against the baseline that is 50% take; against itself it would be 100%.
    const traces = [trace('total', rect(0, 0, 100, 50))]; // 5000 px2 = 50 cm2
    const r = graftFromTraces(traces, PX_PER_CM, 100);
    expect(r.viableAreaCm2).toBeCloseTo(50, 1);
    expect(r.takePercent).toBeCloseTo(50, 1);

    const selfReferential = graftFromTraces(traces, PX_PER_CM, 50);
    expect(selfReferential.takePercent).toBeCloseTo(100, 1);
  });

  it('subtracts traced non-viable areas from the graft', () => {
    const r = graftFromTraces([
      trace('total', rect(0, 0, 100, 100)),             // 100 cm2
      trace('subregion', rect(10, 10, 50, 50), 'loss'), // 25 cm2 lost
    ], PX_PER_CM, 100);
    expect(r.nonviableAreaCm2).toBeCloseTo(25, 1);
    expect(r.viableAreaCm2).toBeCloseTo(75, 1);
    expect(r.takePercent).toBeCloseTo(75, 1);
  });

  it('will not report a take percentage without a baseline', () => {
    const r = graftFromTraces([trace('total', rect(0, 0, 100, 100))], PX_PER_CM, null);
    expect(r.takePercent).toBeNull();
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/baseline/i);
  });

  it('caps take at 100% when the trace exceeds the baseline', () => {
    const r = graftFromTraces([trace('total', rect(0, 0, 200, 200))], PX_PER_CM, 100);
    expect(r.takePercent).toBe(100);
  });
});
