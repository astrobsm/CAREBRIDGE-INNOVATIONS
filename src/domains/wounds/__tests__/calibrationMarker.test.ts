/**
 * The calibration marker only works if the colour we PRINT is a colour the
 * detector RECOGNISES. Those lived in two files that knew nothing about each
 * other: the engine hunted for green while the only printable sheet was black
 * and white, so the accurate calibration path could never fire and every
 * measurement fell through to "scale unreliable".
 *
 * These tests bind the two together. If someone restyles the marker or retunes
 * the detector, this fails rather than silently degrading every wound
 * measurement in the product.
 */

import { describe, it, expect } from 'vitest';
import { CALIBRATION_MARKER, isMarkerGreen } from '../../../services/woundMeasurementEngine';

const { r, g, b } = CALIBRATION_MARKER.rgb;

describe('calibration marker colour', () => {
  it('is detectable as marker green', () => {
    expect(isMarkerGreen(r, g, b)).toBe(true);
  });

  it('matches its own hex declaration', () => {
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    expect(hex.toLowerCase()).toBe(CALIBRATION_MARKER.hex.toLowerCase());
  });

  it('survives realistic exposure variation', () => {
    // A printed marker is never photographed under studio light. Ward lighting,
    // phone auto-exposure and JPEG compression shift every channel, so the
    // colour needs headroom on both sides rather than sitting on the threshold.
    for (const scale of [0.7, 0.85, 1.0, 1.15, 1.3]) {
      const sr = Math.min(255, Math.round(r * scale));
      const sg = Math.min(255, Math.round(g * scale));
      const sb = Math.min(255, Math.round(b * scale));
      expect(isMarkerGreen(sr, sg, sb), `failed at exposure x${scale}`).toBe(true);
    }
  });

  it('survives a warm white-balance cast', () => {
    // Tungsten ward lighting pushes red up and blue down; a marker that only
    // passes under neutral light would fail on half the photographs taken.
    expect(isMarkerGreen(Math.round(r + 40), g, Math.max(0, b - 20))).toBe(true);
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
    ];
    for (const [label, cr, cg, cb] of notGreen) {
      expect(isMarkerGreen(cr, cg, cb), `${label} was misread as marker green`).toBe(false);
    }
  });

  it('keeps the marker square and large enough to measure', () => {
    // The detector divides the green bounding box by sizeMm, and rejects
    // anything whose aspect ratio drifts below 0.7 — so the marker must be
    // square by construction, and big enough to span many pixels at arm's length.
    expect(CALIBRATION_MARKER.sizeMm).toBeGreaterThanOrEqual(20);
    expect(CALIBRATION_MARKER.largeSizeMm).toBeGreaterThan(CALIBRATION_MARKER.sizeMm);
    // The border has to stay a ring: two borders must not meet in the middle.
    expect(CALIBRATION_MARKER.borderMm * 2).toBeLessThan(CALIBRATION_MARKER.sizeMm);
  });
});

// ---------------------------------------------------------------------------

import { inferGreenReferenceCm } from '../services/aiWoundMeasurement';

describe('green reference size inference', () => {
  it('reads a square green marker as the marker size, not 1 cm', () => {
    // The bug: a square marker was assumed to be 1 cm while the printed marker
    // is 3 cm. That made every calibrated photo 3x too small in length and 9x
    // too small in area.
    const expected = CALIBRATION_MARKER.sizeMm / 10;
    expect(expected).toBe(3);
    for (const aspect of [1, 1.05, 1.2, 1.5, 2, 2.9]) {
      expect(inferGreenReferenceCm(aspect)).toBe(expected);
    }
  });

  it('still recognises the elongated ruler strips', () => {
    expect(inferGreenReferenceCm(4)).toBe(5);
    expect(inferGreenReferenceCm(12)).toBe(15);
  });

  it('produces the correct area for a known marker and wound', () => {
    // A 3 cm marker spanning 150 px gives 50 px/cm. A wound of 12,500 px²
    // is then 12500 / 50^2 = 5 cm².
    const pxPerCm = 150 / inferGreenReferenceCm(1);
    expect(pxPerCm).toBe(50);
    expect(12500 / (pxPerCm * pxPerCm)).toBe(5);
  });

  it('would have produced the old 9x under-read before the fix', () => {
    // Documents the defect this test exists to prevent returning: the same
    // wound read against a 1 cm assumption came out at 0.55 cm² instead of 5.
    const wrongPxPerCm = 150 / 1;
    const wrongArea = 12500 / (wrongPxPerCm * wrongPxPerCm);
    expect(wrongArea).toBeCloseTo(0.556, 3);
    expect(5 / wrongArea).toBeCloseTo(9, 5);
  });
});
