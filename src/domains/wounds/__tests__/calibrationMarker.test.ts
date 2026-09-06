/**
 * The calibration marker only works if the colour we PRINT is a colour the
 * detector RECOGNISES, and if the marker's shape identifies its true length.
 * Those lived in separate files that knew nothing about each other, and both
 * had drifted from the sheet actually in clinical use.
 *
 * The markers in the ward are #00A000 bars, 10 mm wide, 50 mm and 100 mm long.
 * Two consequences follow, and both are tested here:
 *
 *  - #00A000 is a darker green than a vivid one, so the detector's brightness
 *    floor has to sit low enough for it to survive ward lighting — but still
 *    high enough to reject tissue, drapes and instruments.
 *  - Because every bar is 10 mm wide, a bar's length in cm equals its aspect
 *    ratio. That, not a size table, is what tells the 5 cm bar from the 10 cm.
 */

import { describe, it, expect } from 'vitest';
import {
  CALIBRATION_MARKER,
  isMarkerGreen,
  inferGreenReferenceCm,
} from '../../../services/woundMeasurementEngine';

const { r, g, b } = CALIBRATION_MARKER.rgb;

describe('calibration marker colour', () => {
  it('is detectable as marker green', () => {
    expect(isMarkerGreen(r, g, b)).toBe(true);
  });

  it('matches its own hex declaration', () => {
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    expect(hex.toLowerCase()).toBe(CALIBRATION_MARKER.hex.toLowerCase());
  });

  it('survives the exposure range of real ward photography', () => {
    // A printed marker is never photographed under studio light. Ward lighting,
    // shadow, phone auto-exposure and JPEG compression all move the channels.
    // #00A000 is dark enough that this range is the binding constraint on the
    // detector's brightness floor.
    for (const scale of [0.6, 0.75, 0.9, 1.0, 1.2, 1.4]) {
      const sr = Math.min(255, Math.round(r * scale));
      const sg = Math.min(255, Math.round(g * scale));
      const sb = Math.min(255, Math.round(b * scale));
      expect(isMarkerGreen(sr, sg, sb), `failed at exposure x${scale}`).toBe(true);
    }
  });

  it('survives a warm white-balance cast', () => {
    // Tungsten ward lighting lifts red and drops blue. A marker that only
    // passes under neutral light would fail on half the photographs taken.
    expect(isMarkerGreen(Math.round(r + 45), g, Math.max(0, b - 20))).toBe(true);
  });

  it('does not match the tissue and materials it must be told apart from', () => {
    const notGreen: Array<[string, number, number, number]> = [
      ['fresh blood', 140, 20, 25],
      ['granulation tissue', 200, 90, 90],
      ['slough', 210, 200, 140],
      ['eschar', 40, 30, 25],
      ['healthy skin (light)', 235, 195, 170],
      ['healthy skin (dark)', 95, 65, 50],
      ['white gauze', 245, 245, 245],
      ['blue drape', 60, 90, 180],
      ['stainless instrument', 170, 172, 175],
      ['black background', 10, 10, 10],
      ['shadowed skin', 70, 50, 42],
      ['dried blood on gauze', 120, 70, 60],
    ];
    for (const [label, cr, cg, cb] of notGreen) {
      expect(isMarkerGreen(cr, cg, cb), `${label} was misread as marker green`).toBe(false);
    }
  });
});

describe('green marker size inference', () => {
  const short = CALIBRATION_MARKER.sizeMm / 10;       // 5 cm
  const long = CALIBRATION_MARKER.largeSizeMm / 10;   // 10 cm

  it('reads each printed bar as its true length', () => {
    // A 50x10 mm bar photographs at 5:1, a 100x10 mm bar at 10:1.
    expect(inferGreenReferenceCm(5).knownCm).toBe(short);
    expect(inferGreenReferenceCm(10).knownCm).toBe(long);
    expect(inferGreenReferenceCm(5).recognised).toBe(true);
    expect(inferGreenReferenceCm(10).recognised).toBe(true);
  });

  it('no longer reads the 10 cm bar as 15 cm', () => {
    // The defect: any aspect above 8 was assumed to be a 15 cm ruler, so the
    // 10 cm bar produced a scale 1.5x too large and an area 56% too small.
    const wrongScale = 15 / 10;
    const areaFactor = 1 / (wrongScale * wrongScale);
    expect(areaFactor).toBeCloseTo(0.444, 3);
    expect(inferGreenReferenceCm(10).knownCm).not.toBe(15);
  });

  it('tolerates the foreshortening of a normal hand-held photograph', () => {
    // Small tilts move the measured aspect; the marker must still be identified.
    for (const aspect of [4.3, 4.7, 5.4, 6.2]) {
      expect(inferGreenReferenceCm(aspect).knownCm, `aspect ${aspect}`).toBe(short);
    }
    for (const aspect of [8.0, 9.2, 10.8, 12.5]) {
      expect(inferGreenReferenceCm(aspect).knownCm, `aspect ${aspect}`).toBe(long);
    }
  });

  it('reports how far a shape had to be snapped', () => {
    expect(inferGreenReferenceCm(5).aspectDeviation).toBeCloseTo(0, 6);
    expect(inferGreenReferenceCm(6).aspectDeviation).toBeCloseTo(0.2, 6);
  });

  it('claims no scale from a roughly square green object', () => {
    // A green swab, drape corner or instrument handle is not a marker, and
    // guessing a size for it would silently corrupt the measurement.
    for (const aspect of [1, 1.3, 2, 2.4]) {
      const ref = inferGreenReferenceCm(aspect);
      expect(ref.recognised).toBe(false);
      expect(ref.knownCm).toBe(0);
    }
  });

  it('falls back on the width invariant for an unrecognised bar', () => {
    // Every bar is 10 mm wide, so length in cm is the aspect ratio. For a shape
    // that matches no printed bar this is still the best available estimate,
    // but it is flagged unrecognised so confidence is reduced.
    const ref = inferGreenReferenceCm(7);
    expect(ref.recognised).toBe(false);
    expect(ref.knownCm).toBe(7);
  });

  it('computes the right area from a correctly identified bar', () => {
    // A 5 cm bar spanning 250 px gives 50 px/cm; a 12,500 px wound is 5 cm2.
    const pxPerCm = 250 / inferGreenReferenceCm(5).knownCm;
    expect(pxPerCm).toBe(50);
    expect(12500 / (pxPerCm * pxPerCm)).toBe(5);
  });
});
