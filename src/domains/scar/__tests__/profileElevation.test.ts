import { describe, it, expect } from 'vitest';
import {
  measureProfile, describeProfile, vssHeightFor, MIN_PROFILE_POINTS,
} from '../services/profileElevation';
import { profileReconstructionProvider } from '../services/profileProvider';
import {
  registerReconstructionProvider, reconstruct, describe3DStatus,
} from '../services/reconstruction3d';
import type { Point } from '../../../services/planimetry';

/**
 * A symmetrical triangular ridge sitting on a horizontal skin line.
 *
 * Chosen because its height and cross-sectional area are known exactly, so the
 * measured figures can be checked against arithmetic rather than against
 * whatever the code happens to produce.
 */
const ridge = (baseY: number, halfWidth: number, height: number): Point[] => [
  { x: -halfWidth, y: baseY },
  { x: 0, y: baseY - height },
  { x: halfWidth, y: baseY },
  { x: halfWidth, y: baseY + 1 },
  { x: -halfWidth, y: baseY + 1 },
  { x: -halfWidth, y: baseY },
];

const flatBaseline = (y: number): [Point, Point] => [{ x: -200, y }, { x: 200, y }];

describe('measureProfile', () => {
  it('measures the height of a ridge above the marked skin line', () => {
    // 50 px tall at 10 px/cm = 5 cm = 50 mm.
    const m = measureProfile({
      baseline: flatBaseline(100),
      profile: ridge(100, 60, 50),
      pixelsPerCm: 10,
    });
    expect(m.measured).toBe(true);
    expect(m.maxElevationMm).toBeCloseTo(50, 1);
  });

  it('does not care which way round the skin line was tapped', () => {
    const forwards = measureProfile({
      baseline: [{ x: -200, y: 100 }, { x: 200, y: 100 }],
      profile: ridge(100, 60, 40),
      pixelsPerCm: 10,
    });
    const backwards = measureProfile({
      baseline: [{ x: 200, y: 100 }, { x: -200, y: 100 }],
      profile: ridge(100, 60, 40),
      pixelsPerCm: 10,
    });
    expect(forwards.maxElevationMm).toBeCloseTo(backwards.maxElevationMm as number, 4);
  });

  it('measures perpendicular to a sloping skin line, not to the image', () => {
    // The same ridge on a 45° surface must report the same height: a scar on a
    // shoulder is not taller because the shoulder is tilted in the frame.
    const angle = Math.PI / 4;
    const rotate = (p: Point): Point => ({
      x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
      y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
    });

    const flat = measureProfile({
      baseline: flatBaseline(0),
      profile: ridge(0, 60, 30),
      pixelsPerCm: 10,
    });
    const tilted = measureProfile({
      baseline: [rotate({ x: -200, y: 0 }), rotate({ x: 200, y: 0 })],
      profile: ridge(0, 60, 30).map(rotate),
      pixelsPerCm: 10,
    });

    expect(tilted.maxElevationMm).toBeCloseTo(flat.maxElevationMm as number, 1);
  });

  it('reports mean elevation below the maximum for a peaked lesion', () => {
    const m = measureProfile({
      baseline: flatBaseline(100),
      profile: ridge(100, 60, 50),
      pixelsPerCm: 10,
    });
    expect(m.meanElevationMm as number).toBeLessThan(m.maxElevationMm as number);
    expect(m.meanElevationMm as number).toBeGreaterThan(0);
  });

  it('scales with the calibration, not with the pixels', () => {
    const coarse = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 50), pixelsPerCm: 10,
    });
    // Same lesion photographed twice as close: twice the pixels, same millimetres.
    const fine = measureProfile({
      baseline: [{ x: -400, y: 200 }, { x: 400, y: 200 }],
      profile: ridge(200, 120, 100),
      pixelsPerCm: 20,
    });
    expect(fine.maxElevationMm).toBeCloseTo(coarse.maxElevationMm as number, 1);
  });

  it('withholds millimetres when the profile frame is uncalibrated', () => {
    const m = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 50), pixelsPerCm: null,
    });
    expect(m.measured).toBe(false);
    expect(m.maxElevationMm).toBeNull();
    expect(m.limitations.join(' ')).toMatch(/calibration marker/i);
  });

  it('refuses an outline lying flat along the skin line', () => {
    // Zero enclosed area: nothing stands proud of anything.
    const flat: Point[] = [
      { x: -60, y: 100 }, { x: -20, y: 100 }, { x: 20, y: 100 },
      { x: 60, y: 100 }, { x: 20, y: 100 }, { x: -20, y: 100 },
    ];
    const m = measureProfile({ baseline: flatBaseline(100), profile: flat, pixelsPerCm: 10 });
    expect(m.measured).toBe(false);
    expect(m.maxElevationMm).toBeNull();
  });

  it('states that it cannot tell a raised lesion from a depressed one', () => {
    // The normal is flipped toward the traced outline so tap order does not
    // matter; the price is that a depression measures the same as a bump, and
    // that has to be said rather than silently resolved.
    const above = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 40), pixelsPerCm: 10,
    });
    const below = measureProfile({
      baseline: flatBaseline(100),
      profile: ridge(100, 60, 40).map(p => ({ x: p.x, y: 200 - p.y })),
      pixelsPerCm: 10,
    });
    expect(below.maxElevationMm).toBeCloseTo(above.maxElevationMm as number, 1);
    expect(above.limitations.join(' ')).toMatch(/depressed or atrophic scar the same/i);
  });

  it('refuses an untraced outline', () => {
    const m = measureProfile({
      baseline: flatBaseline(100),
      profile: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      pixelsPerCm: 10,
    });
    expect(m.measured).toBe(false);
    expect(MIN_PROFILE_POINTS).toBeGreaterThan(2);
  });

  it('refuses two skin-line points that are the same point', () => {
    const m = measureProfile({
      baseline: [{ x: 10, y: 10 }, { x: 10, y: 10 }],
      profile: ridge(100, 60, 50),
      pixelsPerCm: 10,
    });
    expect(m.measured).toBe(false);
    expect(m.limitations.join(' ')).toMatch(/on top of each other/i);
  });

  it('always states that an oblique view foreshortens the height', () => {
    const m = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 50), pixelsPerCm: 10,
    });
    expect(m.limitations.join(' ')).toMatch(/tangential/i);
  });
});

describe('volume estimate', () => {
  it('is withheld without the plan-view area', () => {
    const m = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 50), pixelsPerCm: 10,
    });
    expect(m.estimatedVolumeCm3).toBeNull();
    expect(m.limitations.join(' ')).toMatch(/No volume is estimated/i);
  });

  it('follows the stated dome assumption exactly', () => {
    const m = measureProfile({
      baseline: flatBaseline(100),
      profile: ridge(100, 60, 50),
      pixelsPerCm: 10,
      planAreaCm2: 6,
    });
    // V = 2/3 × 6 cm² × 5 cm
    expect(m.estimatedVolumeCm3).toBeCloseTo(20, 1);
  });

  it('names the assumption rather than presenting volume as measured', () => {
    const m = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 50),
      pixelsPerCm: 10, planAreaCm2: 6,
    });
    const text = m.limitations.join(' ');
    expect(text).toMatch(/estimate, not a measurement/i);
    expect(text).toMatch(/dome/i);
    expect(text).toMatch(/trend over time does not/i);
  });
});

describe('VSS height banding', () => {
  it('maps a measured height onto the scale’s own bands', () => {
    expect(vssHeightFor(1.2)).toBe(1);
    expect(vssHeightFor(3.5)).toBe(2);
    expect(vssHeightFor(9)).toBe(3);
  });

  it('has no opinion when nothing was measured', () => {
    expect(vssHeightFor(null)).toBeNull();
  });

  it('asks for palpation before the band is recorded', () => {
    const m = measureProfile({
      baseline: flatBaseline(100), profile: ridge(100, 60, 50), pixelsPerCm: 10,
    });
    expect(describeProfile(m).join(' ')).toMatch(/confirm by palpation/i);
  });
});

describe('the profile provider through the 3D boundary', () => {
  const frame = (pixelsPerCm: number | null) => ({
    imageId: 'img-1', dataUrl: 'data:,', view: 'profile', pixelsPerCm,
  });

  it('reports itself as configured once registered', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    const status = describe3DStatus();
    expect(status.available).toBe(true);
    expect(status.headline).toMatch(/profile/i);
    // Still honest about what a profile cannot give.
    expect(status.detail).toMatch(/surface contour/i);
  });

  it('measures elevation through reconstruct() when the view is confirmed', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    const result = await reconstruct({
      frames: [frame(10)],
      profile: {
        baseline: flatBaseline(100),
        outline: ridge(100, 60, 50),
        planAreaCm2: 6,
        tangentialConfirmed: true,
      },
    });
    expect(result.quality).toBe('moderate');
    expect(result.maxElevationMm).toBeCloseTo(50, 1);
    expect(result.volumeCm3).toBeCloseTo(20, 1);
  });

  it('never claims high quality — a profile recovers no surface', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    const result = await reconstruct({
      frames: [frame(10)],
      profile: {
        baseline: flatBaseline(100), outline: ridge(100, 60, 50), tangentialConfirmed: true,
      },
    });
    expect(result.quality).not.toBe('high');
    expect(result.surfaceAreaCm2).toBeNull();
  });

  it('publishes no elevation when the view was not confirmed tangential', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    const result = await reconstruct({
      frames: [frame(10)],
      profile: {
        baseline: flatBaseline(100), outline: ridge(100, 60, 50), tangentialConfirmed: false,
      },
    });
    expect(result.quality).toBe('low');
    expect(result.maxElevationMm).toBeNull();
    expect(result.limitations.join(' ')).toMatch(/foreshortening/i);
  });

  it('fails rather than guessing when the profile frame is uncalibrated', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    const result = await reconstruct({
      frames: [frame(null)],
      profile: {
        baseline: flatBaseline(100), outline: ridge(100, 60, 50), tangentialConfirmed: true,
      },
    });
    expect(result.quality).toBe('failed');
    expect(result.maxElevationMm).toBeNull();
    expect(result.volumeCm3).toBeNull();
  });

  it('returns nulls, never zeros, on every refusal', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    for (const request of [
      { frames: [frame(10)] },
      { frames: [frame(null)], profile: { baseline: flatBaseline(100), outline: ridge(100, 60, 50) } },
    ]) {
      const result = await reconstruct(request as any);
      expect(result.maxElevationMm).toBeNull();
      expect(result.volumeCm3).toBeNull();
      expect(result.maxElevationMm).not.toBe(0);
    }
  });

  it('records that elevation was measured, not inferred', async () => {
    registerReconstructionProvider(profileReconstructionProvider);
    const result = await reconstruct({
      frames: [frame(10)],
      profile: {
        baseline: flatBaseline(100), outline: ridge(100, 60, 50), tangentialConfirmed: true,
      },
    });
    expect(result.provenance?.origin).toBe('measured');
    expect(result.referencePlaneMethod).toMatch(/skin line/i);
    // Not yet checked against callipers or ultrasound.
    expect(result.provenance?.isPrototype).toBe(true);
  });
});
