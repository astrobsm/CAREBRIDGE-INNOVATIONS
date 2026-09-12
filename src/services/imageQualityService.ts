/**
 * Image quality gate.
 *
 * Nothing quantitative runs until a photograph passes this. A blurred,
 * blown-out or half-obscured frame still segments into *something*, and that
 * something becomes an area in cm2 that looks exactly as authoritative as a
 * good one. Refusing to measure is the only honest response to a bad frame, so
 * this gate sits in front of calibration and segmentation rather than reporting
 * a caveat afterwards.
 *
 * Every check is a real measurement on the pixels, not a placeholder:
 *
 *  - focus       variance of the Laplacian, the standard sharpness estimator.
 *                A sharp image has strong second derivatives; blur suppresses
 *                them and collapses the variance.
 *  - exposure    histogram clipping at both ends plus mean luminance. Detail
 *                lost to pure black or pure white cannot be recovered, and a
 *                wound bed rendered as a white patch cannot be classified.
 *  - contrast    luminance spread. A flat frame indicates fog, a dirty lens or
 *                a photograph of a dressing rather than a wound.
 *  - framing     whether the subject runs off the edge of the frame, which
 *                truncates the wound and understates its area.
 *  - obstruction saturated non-tissue colour (blue/green drapes, gloves, steel)
 *                covering the centre of the frame.
 *  - calibration whether marker green is present at all.
 *
 * Thresholds are declared in one place, documented, and tuned for phone
 * photography under ward lighting rather than studio conditions.
 */

import { isMarkerGreen } from './woundMeasurementEngine';

export type QualityVerdict = 'accept' | 'review' | 'recapture';

export type QualityCheckId =
  | 'focus'
  | 'exposure'
  | 'contrast'
  | 'framing'
  | 'obstruction'
  | 'calibration';

export interface QualityCheck {
  id: QualityCheckId;
  label: string;
  /** 0-1. Not a probability — a normalised score against the thresholds below. */
  score: number;
  passed: boolean;
  /** Shown to the clinician when the check fails. Says what to do, not just what is wrong. */
  detail: string;
}

export interface ImageQualityReport {
  verdict: QualityVerdict;
  /** 0-100, the weighted aggregate of the checks. */
  score: number;
  checks: QualityCheck[];
  /** Reasons a frame was not accepted, in the order worth acting on. */
  problems: string[];
  /** Identifies the algorithm that produced this, for audit and reproducibility. */
  version: string;
}

export const IMAGE_QUALITY_VERSION = 'IQG-1.0.0';

/**
 * Thresholds, all measured on the normalised statistics computed below.
 *
 * `min` fails outright; anything between `min` and `good` is usable but flagged
 * for review rather than silently accepted.
 */
const T = {
  /** Variance of Laplacian, on 0-255 luminance. Below `min` is visibly soft. */
  focus: { min: 60, good: 250 },
  /** Proportion of pixels clipped to pure black or white. */
  clipping: { max: 0.12, good: 0.02 },
  /** Mean luminance, 0-255. Outside this band the wound bed loses colour fidelity. */
  luminance: { min: 55, max: 215, idealLow: 90, idealHigh: 180 },
  /** Standard deviation of luminance. A flat frame is fog, not a wound. */
  contrast: { min: 22, good: 50 },
  /** Proportion of the border ring that is subject rather than background. */
  edgeTouch: { max: 0.28, good: 0.08 },
  /** Proportion of the central region covered by obstructing material. */
  obstruction: { max: 0.25, good: 0.05 },
} as const;

/** Relative importance when aggregating. Focus and calibration dominate. */
const WEIGHTS: Record<QualityCheckId, number> = {
  focus: 0.28,
  exposure: 0.2,
  contrast: 0.12,
  framing: 0.13,
  obstruction: 0.15,
  calibration: 0.12,
};

/** Map a measurement onto 0-1 against a floor and a "good" level. */
function rampUp(value: number, min: number, good: number): number {
  if (value <= min) return Math.max(0, value / Math.max(min, 1)) * 0.5;
  if (value >= good) return 1;
  return 0.5 + 0.5 * ((value - min) / (good - min));
}

/** As rampUp, for measurements where lower is better. */
function rampDown(value: number, good: number, max: number): number {
  if (value <= good) return 1;
  if (value >= max) return Math.max(0, 1 - value / Math.max(max, 1e-6)) * 0.5;
  return 1 - 0.5 * ((value - good) / (max - good));
}

interface Stats {
  luminance: Float32Array;
  width: number;
  height: number;
}

function toLuminance(data: Uint8ClampedArray, width: number, height: number): Stats {
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Rec. 601 luma: matches how brightness is perceived, so a dark red wound
    // bed is not mistaken for underexposure.
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { luminance: lum, width, height };
}

/**
 * Variance of the Laplacian — the sharpness estimator.
 *
 * Computed on a subsampled grid: sharpness is a global property and stepping
 * over the image keeps this fast enough to run on a phone between shutter and
 * preview, which is the only time the clinician can still retake the shot.
 */
function focusScore({ luminance, width, height }: Stats): number {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 400));
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const i = y * width + x;
      const lap =
        4 * luminance[i] -
        luminance[i - 1] -
        luminance[i + 1] -
        luminance[i - width] -
        luminance[i + width];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.max(0, sumSq / n - mean * mean);
}

interface ExposureStats {
  clipped: number;
  mean: number;
  stdDev: number;
}

function exposureStats({ luminance }: Stats): ExposureStats {
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < luminance.length; i++) {
    const v = luminance[i];
    sum += v;
    if (v <= 4 || v >= 251) clipped++;
  }
  const mean = sum / luminance.length;
  let varSum = 0;
  for (let i = 0; i < luminance.length; i++) {
    const d = luminance[i] - mean;
    varSum += d * d;
  }
  return {
    clipped: clipped / luminance.length,
    mean,
    stdDev: Math.sqrt(varSum / luminance.length),
  };
}

/**
 * How much of the frame's border ring differs from the corners.
 *
 * A wound that runs off the edge is truncated, and its measured area is an
 * underestimate with no way to tell from the number alone. Comparing the border
 * against the corner background is a cheap proxy for "the subject reaches the
 * edge".
 */
function edgeTouchRatio(data: Uint8ClampedArray, width: number, height: number): number {
  const band = Math.max(2, Math.floor(Math.min(width, height) * 0.04));
  const at = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };

  // Corners are the most likely background, being furthest from the subject.
  const corners = [
    at(band, band),
    at(width - band - 1, band),
    at(band, height - band - 1),
    at(width - band - 1, height - band - 1),
  ];
  const bg = [0, 1, 2].map(c => corners.reduce((s, p) => s + p[c], 0) / corners.length);

  let differing = 0;
  let total = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 200));
  const consider = (x: number, y: number) => {
    const [r, g, b] = at(x, y);
    const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
    if (dist > 90) differing++;
    total++;
  };
  for (let x = 0; x < width; x += step) {
    consider(x, Math.min(band, height - 1));
    consider(x, Math.max(0, height - band - 1));
  }
  for (let y = 0; y < height; y += step) {
    consider(Math.min(band, width - 1), y);
    consider(Math.max(0, width - band - 1), y);
  }
  return total === 0 ? 0 : differing / total;
}

/**
 * Proportion of the central region covered by material that is not tissue.
 *
 * Targets the things that actually obscure a ward photograph: blue and green
 * drapes, gloves, instrument wraps and bright steel. Marker green is excluded —
 * the calibration marker is supposed to be in frame, and counting it as an
 * obstruction would reject every correctly taken photograph.
 */
function obstructionRatio(data: Uint8ClampedArray, width: number, height: number): number {
  const x0 = Math.floor(width * 0.25);
  const x1 = Math.floor(width * 0.75);
  const y0 = Math.floor(height * 0.25);
  const y1 = Math.floor(height * 0.75);
  const step = Math.max(1, Math.floor(Math.min(width, height) / 150));

  let obstructing = 0;
  let total = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total++;

      if (isMarkerGreen(r, g, b)) continue; // the marker belongs in frame

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      const blueDrape = b > 90 && b > r * 1.25 && b > g * 1.1;
      const greenDrape = g > 80 && g > r * 1.25 && sat > 0.25;
      const steel = sat < 0.12 && max > 150; // bright, colourless: instrument or glare
      const shadow = max < 25;               // no usable signal at all

      if (blueDrape || greenDrape || steel || shadow) obstructing++;
    }
  }
  return total === 0 ? 0 : obstructing / total;
}

/** Whether any marker green is present, and how much. */
function markerGreenRatio(data: Uint8ClampedArray, width: number, height: number): number {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 250));
  let green = 0;
  let total = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (isMarkerGreen(data[i], data[i + 1], data[i + 2])) green++;
      total++;
    }
  }
  return total === 0 ? 0 : green / total;
}

/**
 * Assess a captured frame.
 *
 * Pure and synchronous: it takes pixels, not a canvas or a DOM node, so it runs
 * identically in a worker, in a test, and on the capture screen.
 */
export function assessImageQuality(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageQualityReport {
  if (!width || !height || data.length < width * height * 4) {
    return {
      verdict: 'recapture',
      score: 0,
      checks: [],
      problems: ['The photograph could not be read.'],
      version: IMAGE_QUALITY_VERSION,
    };
  }

  const stats = toLuminance(data, width, height);
  const focus = focusScore(stats);
  const exposure = exposureStats(stats);
  const edge = edgeTouchRatio(data, width, height);
  const obstruction = obstructionRatio(data, width, height);
  const greenRatio = markerGreenRatio(data, width, height);

  // Luminance is scored by distance from the ideal band, so both a dark and a
  // blown-out frame are penalised rather than only one of them.
  const lumScore =
    exposure.mean < T.luminance.min || exposure.mean > T.luminance.max
      ? 0.25
      : exposure.mean >= T.luminance.idealLow && exposure.mean <= T.luminance.idealHigh
        ? 1
        : 0.7;
  const clipScore = rampDown(exposure.clipped, T.clipping.good, T.clipping.max);

  const checks: QualityCheck[] = [
    {
      id: 'focus',
      label: 'Focus',
      score: rampUp(focus, T.focus.min, T.focus.good),
      passed: focus >= T.focus.min,
      detail: 'The image is soft. Hold steady, tap the wound to focus, and retake.',
    },
    {
      id: 'exposure',
      label: 'Exposure',
      score: Math.min(lumScore, clipScore),
      passed: exposure.clipped <= T.clipping.max &&
        exposure.mean >= T.luminance.min && exposure.mean <= T.luminance.max,
      detail: exposure.mean > T.luminance.max || exposure.clipped > T.clipping.max
        ? 'The image is too bright — detail is lost to glare. Move the light or shoot from a slight angle.'
        : 'The image is too dark. Add light rather than relying on the flash alone.',
    },
    {
      id: 'contrast',
      label: 'Contrast',
      score: rampUp(exposure.stdDev, T.contrast.min, T.contrast.good),
      passed: exposure.stdDev >= T.contrast.min,
      detail: 'The image is flat. Check the lens is clean and the wound is not covered by a film or dressing.',
    },
    {
      id: 'framing',
      label: 'Framing',
      score: rampDown(edge, T.edgeTouch.good, T.edgeTouch.max),
      passed: edge <= T.edgeTouch.max,
      detail: 'The subject runs off the edge of the frame. Step back so the whole wound and the marker are inside the picture.',
    },
    {
      id: 'obstruction',
      label: 'Wound visibility',
      score: rampDown(obstruction, T.obstruction.good, T.obstruction.max),
      passed: obstruction <= T.obstruction.max,
      detail: 'Something is covering the wound — a drape, glove, instrument or deep shadow. Clear the field and retake.',
    },
    {
      id: 'calibration',
      label: 'Calibration marker',
      // Presence only. Whether the marker is usable is decided by the
      // calibration stage, which measures it properly.
      score: greenRatio > 0.0008 ? 1 : 0,
      passed: greenRatio > 0.0008,
      detail: 'No green calibration marker is visible. Place one flat beside the wound — without it the size cannot be calculated.',
    },
  ];

  const score = Math.round(
    checks.reduce((sum, c) => sum + c.score * WEIGHTS[c.id], 0) * 100,
  );

  const failed = checks.filter(c => !c.passed);
  const problems = failed.map(c => c.detail);

  // Focus and obstruction are not recoverable by review — if the wound is not
  // sharply visible there is nothing to measure, whoever looks at it. A missing
  // marker is likewise fatal to a size in cm. Everything else can be accepted
  // with a flag so a usable frame is not thrown away over a marginal score.
  const fatal = failed.some(c => c.id === 'focus' || c.id === 'obstruction' || c.id === 'calibration');

  const verdict: QualityVerdict =
    fatal || score < 50 ? 'recapture'
      : failed.length > 0 || score < 75 ? 'review'
        : 'accept';

  return { verdict, score, checks, problems, version: IMAGE_QUALITY_VERSION };
}

/** Convenience wrapper for a canvas, which is what the capture screen holds. */
export function assessCanvasQuality(canvas: HTMLCanvasElement): ImageQualityReport {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !canvas.width || !canvas.height) {
    return {
      verdict: 'recapture',
      score: 0,
      checks: [],
      problems: ['The photograph could not be read.'],
      version: IMAGE_QUALITY_VERSION,
    };
  }
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return assessImageQuality(data, canvas.width, canvas.height);
}
