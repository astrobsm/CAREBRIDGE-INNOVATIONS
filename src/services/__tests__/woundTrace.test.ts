/**
 * Trace-and-measure: length, width and tissue composition from a clinician's
 * tracing, checked against shapes whose answers are known from geometry.
 *
 * Length and width are the caliper measures a clinician means — the longest
 * axis and the widest span across it — so a wound photographed at a different
 * rotation keeps its dimensions. Tissue percentages always sum to 100, count
 * only what lies inside the margin, and assign the untraced remainder as the
 * clinician chose.
 */

import { describe, it, expect } from 'vitest';
import {
  maxCaliper,
  traceDimensionsCm,
  roundToTotal,
  tissueComposition,
  measureTrace,
  type Point,
  type Trace,
  type TraceRole,
} from '../planimetry';

/** Rectangle from corner to corner, in pixels. */
const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];
let n = 0;
const trace = (role: TraceRole, points: Point[]): Trace => ({ id: `t${n++}`, role, points });

const rotate = (pts: Point[], deg: number): Point[] => {
  const r = (deg * Math.PI) / 180;
  return pts.map(p => ({ x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) }));
};

describe('measurements from a tracing', () => {
  // 10 px/cm: a 40×20 px wound is 4×2 cm = 8 cm².
  const wound = rect(0, 0, 40, 20);

  it('area and perimeter come from the margin and the scale', () => {
    const g = measureTrace(wound, 10);
    expect(g.areaCm2).toBeCloseTo(8, 2);
    expect(g.perimeterCm).toBeCloseTo(12, 2);
  });

  it('length is the longest caliper, width the widest span across it', () => {
    const d = traceDimensionsCm(wound, 10)!;
    expect(d.lengthCm).toBeCloseTo(4.47, 2); // the diagonal
    // Width across the diagonal of a 4×2 rectangle: 2·(4·2)/√20.
    expect(d.widthCm).toBeCloseTo((2 * 8) / Math.sqrt(20), 2);
  });

  it('measures width across the long axis, not the sides of a box', () => {
    // For a polygon whose longest chord is a diagonal, width is the spread
    // across that diagonal: 2·w·h/d for a rectangle.
    const c = maxCaliper(rect(0, 0, 100, 2));
    expect(c.length).toBeCloseTo(Math.hypot(100, 2), 6);
    expect(c.width).toBeCloseTo((2 * 100 * 2) / Math.hypot(100, 2), 6);
  });

  it('does not change when the same wound is photographed rotated', () => {
    const ellipse: Point[] = Array.from({ length: 72 }, (_, i) => {
      const t = (i / 72) * 2 * Math.PI;
      return { x: 50 * Math.cos(t), y: 20 * Math.sin(t) };
    });
    const a = maxCaliper(ellipse);
    const b = maxCaliper(rotate(ellipse, 37));
    expect(a.length).toBeCloseTo(100, 0);
    expect(a.width).toBeCloseTo(40, 0);
    expect(b.length).toBeCloseTo(a.length, 6);
    expect(b.width).toBeCloseTo(a.width, 6);
  });

  it('needs a scale and a closed margin', () => {
    expect(traceDimensionsCm(wound, null)).toBeNull();
    expect(traceDimensionsCm(wound, 0)).toBeNull();
    expect(traceDimensionsCm(wound.slice(0, 2), 10)).toBeNull();
  });
});

describe('tissue composition from a tracing', () => {
  const wound = rect(0, 0, 40, 20);

  it('the whole outline takes the remainder when no tissue is traced', () => {
    const c = tissueComposition([trace('total', wound)], 10, 'granulation')!;
    expect(c.percent).toEqual({ granulation: 100, slough: 0, necrotic: 0, epithelialised: 0 });
    expect(c.unassignedPercent).toBe(0);
    expect(c.areaCm2.granulation).toBeCloseTo(8, 1);
  });

  it('an island inside another patch belongs to the island, and percentages sum to 100', () => {
    const c = tissueComposition([
      trace('total', wound),
      trace('slough', rect(0, 0, 10, 20)),
      trace('necrotic', rect(5, 0, 10, 20)), // within the slough
    ], 10, 'granulation', { samples: 20000 })!;
    expect(c.percent.necrotic).toBeGreaterThanOrEqual(12);
    expect(c.percent.necrotic).toBeLessThanOrEqual(13);
    expect(c.percent.slough).toBeGreaterThanOrEqual(12);
    expect(c.percent.slough).toBeLessThanOrEqual(13);
    expect(c.percent.granulation).toBe(75);
    expect(Object.values(c.percent).reduce((a, b) => a + b, 0) + c.unassignedPercent).toBe(100);
    expect(c.areaCm2.granulation).toBeCloseTo(6, 0);
  });

  it('can leave the remainder unassigned, and counts only tissue inside the margin', () => {
    const c = tissueComposition([
      trace('total', wound),
      trace('slough', rect(20, 0, 60, 20)), // half of it overshoots the margin
    ], 10, 'unassigned')!;
    expect(c.percent.slough).toBe(50);
    expect(c.unassignedPercent).toBe(50);
    expect(c.tracedOutsideMargin).toBe(true);
  });

  it('raw patches, not a recorded wound tissue, count with the remainder', () => {
    const c = tissueComposition([
      trace('total', wound),
      trace('raw', rect(0, 0, 20, 20)),
    ], 10, 'unassigned')!;
    expect(c.unassignedPercent).toBe(100);
  });

  it('gives percentages without a scale, but no areas', () => {
    const c = tissueComposition([trace('total', wound), trace('slough', rect(0, 0, 20, 20))], null, 'granulation')!;
    expect(c.percent.slough).toBe(50);
    expect(c.areaCm2.slough).toBeNull();
  });

  it('needs exactly one closed outline', () => {
    expect(tissueComposition([], 10, 'granulation')).toBeNull();
    expect(tissueComposition([trace('total', wound.slice(0, 2))], 10, 'granulation')).toBeNull();
    expect(tissueComposition([trace('total', wound), trace('total', wound)], 10, 'granulation')).toBeNull();
  });
});

describe('roundToTotal', () => {
  it('rounds by largest remainder to an exact total', () => {
    expect(roundToTotal([1, 1, 1])).toEqual([34, 33, 33]);
    expect(roundToTotal([1, 3])).toEqual([25, 75]);
    expect(roundToTotal([0, 0])).toEqual([0, 0]);
  });
});
