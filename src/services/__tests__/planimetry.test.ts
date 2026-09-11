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


describe('computePlanimetry — typed patches', () => {
  const PX_PER_CM = 10; // 100 px² = 1 cm²
  const outline = () => trace('total', rect(0, 0, 100, 100)); // 100 cm²

  it('accumulates several patches of the same surface', () => {
    // A donor site is rarely one raw area. Three separate raw patches must add
    // up, not replace one another.
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(5, 5, 20, 20), 'r1'),    // 4 cm²
      trace('raw', rect(40, 5, 20, 20), 'r2'),   // 4 cm²
      trace('raw', rect(70, 70, 10, 20), 'r3'),  // 2 cm²
    ], PX_PER_CM);

    expect(r.surfaces.raw.patches).toBe(3);
    expect(r.surfaces.raw.areaCm2).toBeCloseTo(10, 2);
    expect(r.surfaces.raw.percent).toBeCloseTo(10, 1);
  });

  it('keeps different surfaces separate and sums them into the open total', () => {
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(5, 5, 20, 20), 'raw'),        // 4 cm²
      trace('slough', rect(40, 5, 30, 20), 'slough'), // 6 cm²
      trace('necrotic', rect(5, 60, 10, 10), 'nec'),  // 1 cm²
    ], PX_PER_CM);

    expect(r.surfaces.raw.areaCm2).toBeCloseTo(4, 2);
    expect(r.surfaces.slough.areaCm2).toBeCloseTo(6, 2);
    expect(r.surfaces.necrotic.areaCm2).toBeCloseTo(1, 2);
    // Everything not yet epithelialised, added together.
    expect(r.openAreaCm2).toBeCloseTo(11, 2);
    expect(r.openPercent).toBeCloseTo(11, 1);
  });

  it('does not decide for itself what untraced area means', () => {
    // Whether the remainder is healed skin or more wound depends on what the
    // outline represents: a donor harvest, or a raw wound. This layer measures;
    // it does not interpret. The donor rule lives in donorFromTraces.
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(5, 5, 40, 50), 'raw'), // 20 cm²
    ], PX_PER_CM);

    expect(r.openAreaCm2).toBeCloseTo(20, 2);
    expect(r.unclassifiedAreaCm2).toBeCloseTo(80, 2);
    // Nothing was traced as epithelium, so nothing is reported as epithelium.
    expect(r.epithelialisedAreaCm2).toBeCloseTo(0, 2);
    expect(r.epithelialisedInferred).toBe(false);
  });

  it('uses traced epithelium directly when it is given', () => {
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(5, 5, 40, 50), 'raw'),               // 20 cm²
      trace('epithelialised', rect(60, 60, 30, 30), 'epi'),  // 9 cm²
    ], PX_PER_CM);

    expect(r.epithelialisedInferred).toBe(false);
    expect(r.epithelialisedAreaCm2).toBeCloseTo(9, 2);
    // The rest of the outline is simply untraced, and says so.
    expect(r.unclassifiedAreaCm2).toBeCloseTo(71, 2);
  });

  it('treats a patch inside another as an island, not a double count', () => {
    // An island of new epithelium within a raw area: the raw patch is a ring.
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(10, 10, 60, 60), 'raw'),               // 36 cm²
      trace('epithelialised', rect(20, 20, 20, 20), 'island'), // 4 cm² inside it
    ], PX_PER_CM);

    // Raw is net of the island, so the two do not sum past 36.
    expect(r.surfaces.raw.areaCm2).toBeCloseTo(32, 2);
    expect(r.surfaces.epithelialised.areaCm2).toBeCloseTo(4, 2);
    expect(r.classifiedAreaCm2).toBeCloseTo(36, 2);
  });

  it('warns when two patches partly overlap', () => {
    // Partial overlap means the same tissue was traced twice under two labels.
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(10, 10, 40, 40), 'a'),
      trace('slough', rect(30, 30, 40, 40), 'b'),
    ], PX_PER_CM);

    expect(r.problems.join(' ')).toMatch(/overlap/i);
    expect(r.valid).toBe(false);
  });

  it('does not mistake a nested patch for an overlap', () => {
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(10, 10, 60, 60), 'outer'),
      trace('epithelialised', rect(20, 20, 20, 20), 'inner'),
    ], PX_PER_CM);
    expect(r.problems.join(' ')).not.toMatch(/overlap/i);
  });

  it('reports untraced area rather than assigning it', () => {
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(5, 5, 30, 30), 'raw'), // 9 cm²
    ], PX_PER_CM);
    expect(r.classifiedAreaCm2).toBeCloseTo(9, 2);
    expect(r.unclassifiedAreaCm2).toBeCloseTo(91, 2);
    expect(r.unclassifiedPercent).toBeCloseTo(91, 1);
  });

  it('flags a patch traced outside the outline', () => {
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(300, 300, 20, 20), 'stray'),
    ], PX_PER_CM);
    expect(r.problems.join(' ')).toMatch(/outside/i);
    expect(r.valid).toBe(false);
  });

  it('refuses a self-crossing patch but keeps measuring the rest', () => {
    const bowtie = [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 50, y: 10 }, { x: 10, y: 50 }];
    const r = computePlanimetry([
      outline(),
      { id: 'x', role: 'raw', points: bowtie, label: 'bad' },
      trace('slough', rect(60, 60, 20, 20), 'ok'),
    ], PX_PER_CM);

    expect(r.problems.join(' ')).toMatch(/crosses itself/i);
    expect(r.surfaces.raw.patches).toBe(0);
    expect(r.surfaces.slough.areaCm2).toBeCloseTo(4, 2);
  });

  it('needs an outline before anything can be measured', () => {
    const r = computePlanimetry([trace('raw', rect(0, 0, 10, 10))], PX_PER_CM);
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/outline/i);
  });

  it('refuses two outlines rather than picking one', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 100, 100), 'a'),
      trace('total', rect(0, 0, 50, 50), 'b'),
    ], PX_PER_CM);
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/more than one/i);
  });

  it('stays invalid without a calibration scale', () => {
    const r = computePlanimetry([outline()], null);
    expect(r.totalAreaCm2).toBeNull();
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toMatch(/calibration/i);
  });

  it('reports a fully raw wound as 0% epithelialised', () => {
    const r = computePlanimetry([
      outline(),
      trace('raw', rect(0, 0, 100, 100), 'raw'),
    ], PX_PER_CM);
    expect(r.openPercent).toBeCloseTo(100, 1);
    expect(r.epithelialisedPercent).toBeCloseTo(0, 1);
  });

  it('never lets percentages exceed 100 or go negative', () => {
    const r = computePlanimetry([
      trace('total', rect(0, 0, 50, 50)),
      trace('raw', rect(0, 0, 100, 100), 'toobig'),
    ], PX_PER_CM);
    expect(r.openPercent!).toBeLessThanOrEqual(100);
    expect(r.epithelialisedPercent!).toBeGreaterThanOrEqual(0);
  });
});

describe('donor site from patches', () => {
  const PX_PER_CM = 10;

  it('derives re-epithelialization from patches traced in steps', () => {
    // 36 cm² harvested; two raw patches totalling 7.2 cm² => 80% healed.
    const r = donorFromTraces([
      trace('total', rect(0, 0, 60, 60)),
      trace('raw', rect(5, 5, 40, 12), 'r1'),  // 4.8 cm²
      trace('raw', rect(5, 40, 20, 12), 'r2'), // 2.4 cm²
    ], PX_PER_CM);

    expect(r.totalAreaCm2).toBeCloseTo(36, 2);
    expect(r.openAreaCm2).toBeCloseTo(7.2, 2);
    expect(r.epithelializedAreaCm2).toBeCloseTo(28.8, 2);
    expect(r.epithelializedPercent).toBeCloseTo(80, 1);
    expect(r.inferred).toBe(true);
    expect(r.valid).toBe(true);
  });

  it('counts slough as not yet healed', () => {
    const r = donorFromTraces([
      trace('total', rect(0, 0, 100, 100)),
      trace('raw', rect(5, 5, 20, 20), 'raw'),         // 4 cm²
      trace('slough', rect(40, 40, 20, 20), 'slough'), // 4 cm²
    ], PX_PER_CM);
    expect(r.openAreaCm2).toBeCloseTo(8, 2);
    expect(r.epithelializedPercent).toBeCloseTo(92, 1);
  });

  it('reaches 100% when nothing is left raw', () => {
    const r = donorFromTraces([trace('total', rect(0, 0, 100, 100))], PX_PER_CM);
    expect(r.epithelializedPercent).toBe(100);
  });
});

describe('graft take from patches', () => {
  const PX_PER_CM = 10;

  it('treats necrotic and sloughy patches as graft that has not taken', () => {
    const r = graftFromTraces([
      trace('total', rect(0, 0, 100, 100)),             // 100 cm²
      trace('necrotic', rect(5, 5, 30, 30), 'nec'),     // 9 cm²
      trace('slough', rect(50, 50, 40, 40), 'slough'),  // 16 cm²
    ], PX_PER_CM, 100);

    expect(r.nonviableAreaCm2).toBeCloseTo(25, 2);
    expect(r.viableAreaCm2).toBeCloseTo(75, 2);
    expect(r.takePercent).toBeCloseTo(75, 1);
  });

  it('measures take against the preserved baseline, not the current outline', () => {
    // Applied at 100 cm². Today it outlines 50 cm², all viable: 50% take.
    const traces = [trace('total', rect(0, 0, 100, 50))];
    expect(graftFromTraces(traces, PX_PER_CM, 100).takePercent).toBeCloseTo(50, 1);
    // Measured against itself it would read as complete take of a failing graft.
    expect(graftFromTraces(traces, PX_PER_CM, 50).takePercent).toBeCloseTo(100, 1);
  });

  it('will not report take without a baseline', () => {
    const r = graftFromTraces([trace('total', rect(0, 0, 100, 100))], PX_PER_CM, null);
    expect(r.takePercent).toBeNull();
    expect(r.problems.join(' ')).toMatch(/baseline/i);
  });
});
