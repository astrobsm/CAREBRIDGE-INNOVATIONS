/**
 * The quality gate's entire value is refusing to measure a frame that cannot be
 * measured honestly. A blurred or obscured photograph still segments into
 * something, and that something becomes an area in cm2 indistinguishable from a
 * good one — so these tests construct images with known defects and assert the
 * gate catches each.
 */

import { describe, it, expect } from 'vitest';
import {
  assessImageQuality,
  IMAGE_QUALITY_VERSION,
  type QualityCheckId,
} from '../imageQualityService';

const W = 240;
const H = 180;

interface Painter {
  (x: number, y: number): [number, number, number];
}

function makeImage(paint: Painter, w = W, h = H): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

/** Deterministic value noise — sharp detail without a random seed. */
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Pale skin background with a red wound bed, sharp texture, and a green bar. */
function goodFrame(opts: { marker?: boolean; fillFrame?: boolean } = {}): Uint8ClampedArray {
  const marker = opts.marker !== false;
  return makeImage((x, y) => {
    // Calibration bar: 50x10 proportions, left edge, clear of the wound.
    if (marker && y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];

    const inWound = opts.fillFrame
      ? true
      : (x - 120) ** 2 / 1600 + (y - 80) ** 2 / 900 < 1;
    const grain = hash(x, y) * 70; // high-frequency detail => sharp
    return inWound
      ? [170 + grain * 0.5, 60 + grain * 0.3, 60 + grain * 0.3]
      : [190 + grain * 0.4, 150 + grain * 0.4, 135 + grain * 0.4];
  });
}

/**
 * A subject too big for the frame, truncated on all four sides.
 *
 * A disc centred in the frame with a radius that clears every edge midpoint but
 * not the corners, so the border ring is mostly lesion while the corners stay
 * background — which is exactly the signature the framing check looks for.
 */
function runsOffTheEdgeFrame(): Uint8ClampedArray {
  const cx = W / 2;
  const cy = H / 2;
  // Edge midpoints sit 90 and 120 px from the centre; the corners sit at 150.
  const radius = 130;
  return makeImage((x, y) => {
    const grain = hash(x, y) * 70;
    const inLesion = Math.hypot(x - cx, y - cy) < radius;
    return inLesion
      ? [170 + grain * 0.5, 60 + grain * 0.3, 60 + grain * 0.3]
      : [190 + grain * 0.4, 150 + grain * 0.4, 135 + grain * 0.4];
  });
}

/** A soft frame: a smooth gradient has almost no second derivative. */
function blurredFrame(marker = true): Uint8ClampedArray {
  return makeImage((x, y) => {
    if (marker && y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];
    const v = 150 + (x / W) * 20 + (y / H) * 10;
    return [v + 20, v - 10, v - 20];
  });
}

const check = (data: Uint8ClampedArray, id: QualityCheckId) => {
  const r = assessImageQuality(data, W, H);
  return r.checks.find(c => c.id === id)!;
};

describe('image quality gate', () => {
  it('stamps the algorithm version on every report', () => {
    expect(assessImageQuality(goodFrame(), W, H).version).toBe(IMAGE_QUALITY_VERSION);
  });

  it('refuses to assess an unreadable buffer instead of scoring it', () => {
    const r = assessImageQuality(new Uint8ClampedArray(0), 0, 0);
    expect(r.verdict).toBe('recapture');
    expect(r.score).toBe(0);
    expect(r.problems.length).toBeGreaterThan(0);
  });

  it('accepts a sharp, well-exposed frame with a marker', () => {
    const r = assessImageQuality(goodFrame(), W, H);
    expect(r.verdict).toBe('accept');
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.problems).toEqual([]);
  });

  describe('focus', () => {
    it('fails a blurred frame', () => {
      // A flat gradient has almost no second derivative — the signature of blur.
      const blurred = makeImage((x, y) => {
        if (y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];
        const v = 150 + (x / W) * 20 + (y / H) * 10;
        return [v + 20, v - 10, v - 20];
      });
      expect(check(blurred, 'focus').passed).toBe(false);
      expect(assessImageQuality(blurred, W, H).verdict).toBe('recapture');
    });

    it('treats blur as unrecoverable, not merely flagged', () => {
      // Nobody can measure a wound they cannot see the edge of, so a soft frame
      // must be retaken rather than sent for review.
      const blurred = makeImage((x, y) =>
        (y > 150 && y < 162 && x > 20 && x < 80) ? [0, 160, 0] : [150, 140, 130]);
      expect(assessImageQuality(blurred, W, H).verdict).toBe('recapture');
    });
  });

  describe('exposure', () => {
    it('fails a blown-out frame', () => {
      const blown = makeImage((x, y) => {
        if (y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];
        return hash(x, y) > 0.5 ? [255, 255, 255] : [252, 250, 250];
      });
      expect(check(blown, 'exposure').passed).toBe(false);
    });

    it('fails an underexposed frame', () => {
      const dark = makeImage((x, y) => {
        if (y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];
        const g = hash(x, y) * 8;
        return [g, g, g];
      });
      expect(check(dark, 'exposure').passed).toBe(false);
    });

    it('does not mistake a dark red wound bed for underexposure', () => {
      // Luma weights green heavily; a saturated red wound is dim in luminance
      // terms but perfectly exposed. Scoring it as dark would reject good
      // photographs of exactly the wounds this module exists for.
      const r = assessImageQuality(goodFrame(), W, H);
      expect(r.checks.find(c => c.id === 'exposure')!.passed).toBe(true);
    });
  });

  it('fails a flat, foggy frame on contrast', () => {
    const flat = makeImage((x, y) => {
      if (y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];
      const v = 140 + hash(x, y) * 6;
      return [v, v - 2, v - 4];
    });
    expect(check(flat, 'contrast').passed).toBe(false);
  });

  describe('obstruction', () => {
    it('fails when a drape covers the centre of the frame', () => {
      const draped = makeImage((x, y) => {
        if (y > 150 && y < 162 && x > 20 && x < 80) return [0, 160, 0];
        const central = x > W * 0.25 && x < W * 0.75 && y > H * 0.25 && y < H * 0.75;
        if (central) return [40, 70, 170]; // blue drape
        const grain = hash(x, y) * 60;
        return [190 + grain * 0.3, 150, 135];
      });
      expect(check(draped, 'obstruction').passed).toBe(false);
      expect(assessImageQuality(draped, W, H).verdict).toBe('recapture');
    });

    it('does not count the calibration marker as an obstruction', () => {
      // The marker is supposed to be in frame. Counting its green as a drape
      // would reject every correctly taken photograph.
      const r = assessImageQuality(goodFrame({ marker: true }), W, H);
      expect(r.checks.find(c => c.id === 'obstruction')!.passed).toBe(true);
    });
  });

  describe('calibration', () => {
    it('fails when no marker is in frame', () => {
      const noMarker = goodFrame({ marker: false });
      expect(check(noMarker, 'calibration').passed).toBe(false);
    });

    it('does not reject a frame merely for having no marker', () => {
      // A missing marker costs the dimensions and nothing else: shape
      // descriptors are ratios, colour is a contrast measured inside the same
      // frame, and the clinical scales are answered by a person. Refusing the
      // photograph outright would make the uncalibrated path unreachable even
      // though every stage downstream already withholds sizes and says so.
      const r = assessImageQuality(goodFrame({ marker: false }), W, H);
      expect(r.verdict).toBe('review');
      expect(r.problems.join(' ')).toMatch(/no size in centimetres/i);
    });

    it('still refuses a frame with nothing measurable in it', () => {
      // Focus and obstruction remain fatal: if the lesion is not sharply
      // visible there is nothing to measure, whoever reviews it.
      expect(assessImageQuality(blurredFrame(), W, H).verdict).toBe('recapture');
    });
  });

  describe('cropped frames', () => {
    it('does not fail the framing check on a deliberate crop', () => {
      // A crop to the lesion guarantees the subject reaches the border, so the
      // framing test does not apply. Left on, cropping a rejected photograph
      // would make the rejection worse — the opposite of the point.
      const truncated = runsOffTheEdgeFrame();

      const uncropped = assessImageQuality(truncated, W, H);
      const cropped = assessImageQuality(truncated, W, H, { cropped: true });

      // The fixture must genuinely trip the check, or this proves nothing.
      expect(uncropped.checks.find(c => c.id === 'framing')?.passed).toBe(false);
      expect(uncropped.problems.join(' ')).toMatch(/runs off the edge/i);

      expect(cropped.checks.find(c => c.id === 'framing')?.skipped).toBe(true);
      expect(cropped.checks.find(c => c.id === 'framing')?.passed).toBe(true);
      expect(cropped.problems.join(' ')).not.toMatch(/runs off the edge/i);
      // No longer dragged down by a test that did not apply.
      expect(cropped.score).toBeGreaterThan(uncropped.score);
    });

    it('excludes the skipped check from the score rather than scoring it zero', () => {
      const frame = goodFrame({ marker: true });
      const cropped = assessImageQuality(frame, W, H, { cropped: true });
      // Weight is redistributed, so a clean cropped frame can still reach the
      // top of the scale.
      expect(cropped.score).toBeGreaterThan(60);
      expect(cropped.checks.filter(c => c.skipped).length).toBe(1);
    });

    it('keeps judging everything else on a cropped frame', () => {
      const r = assessImageQuality(blurredFrame(), W, H, { cropped: true });
      expect(r.verdict).toBe('recapture');
      expect(r.checks.find(c => c.id === 'focus')?.passed).toBe(false);
    });
  });

  it('explains every failure it reports', () => {
    const bad = makeImage(() => [250, 250, 250]);
    const r = assessImageQuality(bad, W, H);
    expect(r.problems.length).toBe(r.checks.filter(c => !c.passed).length);
    for (const p of r.problems) {
      expect(p.length).toBeGreaterThan(20); // says what to do, not just "failed"
    }
  });

  it('keeps the score inside 0-100 for any input', () => {
    const frames = [
      goodFrame(),
      makeImage(() => [0, 0, 0]),
      makeImage(() => [255, 255, 255]),
      makeImage((x, y) => [hash(x, y) * 255, hash(y, x) * 255, hash(x + 1, y) * 255]),
    ];
    for (const f of frames) {
      const r = assessImageQuality(f, W, H);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('never returns accept when any check failed', () => {
    // The aggregate score must not be able to carry a frame past a hard failure.
    const frames = [
      goodFrame({ marker: false }),
      makeImage(() => [250, 250, 250]),
      makeImage(() => [5, 5, 5]),
    ];
    for (const f of frames) {
      const r = assessImageQuality(f, W, H);
      if (r.checks.some(c => !c.passed)) expect(r.verdict).not.toBe('accept');
    }
  });
});
