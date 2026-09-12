/**
 * Scar colour, measured in CIELAB against the patient's own adjacent skin.
 *
 * WHY NOT RGB
 * RGB distance is not perceptual: the same numeric gap means a large visible
 * difference in one part of the space and none in another. CIELAB is designed
 * so that equal distances look roughly equally different, which is what makes
 * a colour change comparable between visits.
 *
 * WHY AGAINST REFERENCE SKIN, ALWAYS
 * Absolute colour cannot be read clinically without knowing what this patient's
 * unaffected skin looks like. A system judging scars against an assumed
 * baseline would report deeply pigmented normal skin as hyperpigmentation — the
 * failure mode is not theoretical, it is the predictable result of treating
 * absolute L* as pathology. Every figure produced here is a *contrast* between
 * a traced scar region and a traced region of this patient's adjacent skin, so
 * constitutive pigmentation cancels out of the comparison.
 *
 * The trade is that reference skin must actually be traced. Without it, this
 * module returns nothing rather than falling back to absolute colour.
 *
 * Pure functions over pixel arrays: no DOM, no canvas, directly testable.
 */

import type { Point } from '../../../services/planimetry';
import { pointInPolygon } from '../../../services/planimetry';
import type { LabColour, ScarColourAnalysis, ScarProvenance } from '../types';

export const COLOUR_METHOD = 'cielab-reference-contrast';
export const COLOUR_METHOD_VERSION = '1.0.0';

/**
 * Below this, a region's mean colour is too noisy to compare.
 *
 * A handful of pixels can be dominated by a single specular highlight or a
 * hair, and the resulting mean would be reported with the same apparent
 * authority as one drawn from a large region.
 */
export const MIN_REGION_PIXELS = 200;

// ── sRGB → CIELAB (D65) ─────────────────────────────────────────────────────

/** Undo the sRGB transfer function to get linear light. */
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** D65 white point, the reference sRGB is defined against. */
const WHITE = { x: 95.047, y: 100.0, z: 108.883 };

function labF(t: number): number {
  // The linear segment near zero keeps the function well-behaved for very dark
  // pixels, where the cube root's derivative would otherwise blow up.
  const d = 6 / 29;
  return t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
}

export function rgbToLab(r: number, g: number, b: number): LabColour {
  const rl = srgbToLinear(r) * 100;
  const gl = srgbToLinear(g) * 100;
  const bl = srgbToLinear(b) * 100;

  // sRGB D65 primaries.
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  const fx = labF(x / WHITE.x);
  const fy = labF(y / WHITE.y);
  const fz = labF(z / WHITE.z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// ── Colour difference ───────────────────────────────────────────────────────

export function deltaE76(p: LabColour, q: LabColour): number {
  return Math.sqrt((p.l - q.l) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2);
}

/**
 * CIEDE2000.
 *
 * Worth the arithmetic here: CIE76 systematically overstates differences in
 * the blue region and understates them near neutral, and scar-versus-skin
 * comparisons sit in exactly the low-chroma region where the 2000 formula's
 * corrections matter most.
 */
export function deltaE2000(p: LabColour, q: LabColour): number {
  const kL = 1, kC = 1, kH = 1;
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const c1 = Math.sqrt(p.a ** 2 + p.b ** 2);
  const c2 = Math.sqrt(q.a ** 2 + q.b ** 2);
  const cBar = (c1 + c2) / 2;

  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const a1p = (1 + g) * p.a;
  const a2p = (1 + g) * q.a;

  const c1p = Math.sqrt(a1p ** 2 + p.b ** 2);
  const c2p = Math.sqrt(a2p ** 2 + q.b ** 2);

  const h1p = c1p === 0 ? 0 : ((Math.atan2(p.b, a1p) * deg) + 360) % 360;
  const h2p = c2p === 0 ? 0 : ((Math.atan2(q.b, a2p) * deg) + 360) % 360;

  const dLp = q.l - p.l;
  const dCp = c2p - c1p;

  let dhp: number;
  if (c1p * c2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp / 2) * rad);

  const lBarP = (p.l + q.l) / 2;
  const cBarP = (c1p + c2p) / 2;

  let hBarP: number;
  if (c1p * c2p === 0) hBarP = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBarP = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hBarP = (h1p + h2p + 360) / 2;
  else hBarP = (h1p + h2p - 360) / 2;

  const t = 1
    - 0.17 * Math.cos((hBarP - 30) * rad)
    + 0.24 * Math.cos((2 * hBarP) * rad)
    + 0.32 * Math.cos((3 * hBarP + 6) * rad)
    - 0.20 * Math.cos((4 * hBarP - 63) * rad);

  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7));
  const rT = -rC * Math.sin(2 * dTheta * rad);

  const sL = 1 + (0.015 * (lBarP - 50) ** 2) / Math.sqrt(20 + (lBarP - 50) ** 2);
  const sC = 1 + 0.045 * cBarP;
  const sH = 1 + 0.015 * cBarP * t;

  return Math.sqrt(
    (dLp / (kL * sL)) ** 2
    + (dCp / (kC * sC)) ** 2
    + (dHp / (kH * sH)) ** 2
    + rT * (dCp / (kC * sC)) * (dHp / (kH * sH)),
  );
}

// ── Region sampling ─────────────────────────────────────────────────────────

export interface RegionStats {
  mean: LabColour;
  /** Standard deviation of per-pixel ΔE from the region mean. */
  heterogeneity: number;
  pixelCount: number;
}

/**
 * Mean Lab and internal variation of the pixels inside a traced polygon.
 *
 * Specular highlights are excluded: a blown-out reflection off ointment or wet
 * skin carries no tissue colour at all, and including it drags the mean toward
 * white in a way that reads as hypopigmentation.
 */
export function sampleRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  polygon: Point[],
): RegionStats {
  if (polygon.length < 3) return { mean: { l: 0, a: 0, b: 0 }, heterogeneity: 0, pixelCount: 0 };

  // Only scan the polygon's bounding box rather than the whole frame.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(width - 1, Math.ceil(maxX));
  maxY = Math.min(height - 1, Math.ceil(maxY));

  const labs: LabColour[] = [];
  let sumL = 0, sumA = 0, sumB = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!pointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue;
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // Specular highlight: near-white and nearly neutral.
      if (r > 245 && g > 245 && b > 245) continue;

      const lab = rgbToLab(r, g, b);
      labs.push(lab);
      sumL += lab.l; sumA += lab.a; sumB += lab.b;
    }
  }

  const n = labs.length;
  if (n === 0) return { mean: { l: 0, a: 0, b: 0 }, heterogeneity: 0, pixelCount: 0 };

  const mean = { l: sumL / n, a: sumA / n, b: sumB / n };
  const variance = labs.reduce((sum, lab) => sum + deltaE76(lab, mean) ** 2, 0) / n;

  return { mean, heterogeneity: Math.sqrt(variance), pixelCount: n };
}

// ── Analysis ────────────────────────────────────────────────────────────────

const round2 = (v: number) => Math.round(v * 100) / 100;

export interface ColourAnalysisInput {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  scarPolygon: Point[];
  referencePolygon: Point[];
  imageId?: string;
  qualityGateVersion?: string;
  /** Lowers confidence and is recorded, rather than silently ignored. */
  imageQualityScore?: number;
}

/**
 * Compare a traced scar against traced adjacent skin.
 *
 * Returns null when either region is too small to characterise. A mean colour
 * over forty pixels is a number, but it is not a measurement, and returning it
 * would put a figure on screen that the image cannot support.
 */
export function analyseScarColour(input: ColourAnalysisInput): ScarColourAnalysis | null {
  const { data, width, height, scarPolygon, referencePolygon } = input;

  const scar = sampleRegion(data, width, height, scarPolygon);
  const reference = sampleRegion(data, width, height, referencePolygon);

  if (scar.pixelCount < MIN_REGION_PIXELS || reference.pixelCount < MIN_REGION_PIXELS) {
    return null;
  }

  const limitations: string[] = [];
  if (reference.pixelCount < scar.pixelCount / 4) {
    limitations.push(
      'The reference skin region is much smaller than the scar, so the comparison rests on a narrow sample.',
    );
  }
  if (reference.heterogeneity > 12) {
    limitations.push(
      'The reference skin region is itself variable in colour — it may include shadow, a skin fold or another lesion.',
    );
  }
  if (input.imageQualityScore != null && input.imageQualityScore < 60) {
    limitations.push('Captured on a frame that scored poorly on the image quality gate.');
  }
  limitations.push(
    'Colour is measured from an uncalibrated camera. Differences against adjacent skin in the same frame are '
    + 'meaningful; absolute values are not comparable between devices or lighting.',
  );

  const provenance: ScarProvenance = {
    origin: 'measured',
    method: COLOUR_METHOD,
    methodVersion: COLOUR_METHOD_VERSION,
    qualityGateVersion: input.qualityGateVersion,
    computedAt: new Date().toISOString(),
    isPrototype: false,
    inputImageIds: input.imageId ? [input.imageId] : undefined,
  };

  return {
    scarLab: { l: round2(scar.mean.l), a: round2(scar.mean.a), b: round2(scar.mean.b) },
    referenceLab: {
      l: round2(reference.mean.l), a: round2(reference.mean.a), b: round2(reference.mean.b),
    },
    deltaE76: round2(deltaE76(scar.mean, reference.mean)),
    deltaE2000: round2(deltaE2000(reference.mean, scar.mean)),
    // Positive: the scar is redder than the skin beside it.
    erythemaIndex: round2(scar.mean.a - reference.mean.a),
    // Negative: the scar is darker than the skin beside it.
    pigmentationIndex: round2(scar.mean.l - reference.mean.l),
    colourHeterogeneity: round2(scar.heterogeneity),
    scarPixelCount: scar.pixelCount,
    referencePixelCount: reference.pixelCount,
    provenance,
    limitations,
  };
}

/**
 * Plain-language reading of a colour contrast.
 *
 * Phrased as what was photographed, not as what is happening histologically —
 * an image-derived erythema index is a colour measurement, and calling it
 * vascularity would claim knowledge of the microcirculation that no photograph
 * carries.
 */
export function describeColour(c: ScarColourAnalysis): string[] {
  const out: string[] = [];

  const e = c.erythemaIndex;
  if (e >= 6) out.push(`Markedly redder than adjacent skin (a* +${e}).`);
  else if (e >= 2.5) out.push(`Redder than adjacent skin (a* +${e}).`);
  else if (e <= -2.5) out.push(`Less red than adjacent skin (a* ${e}).`);
  else out.push(`Redness close to adjacent skin (a* ${e >= 0 ? '+' : ''}${e}).`);

  const p = c.pigmentationIndex;
  if (p <= -8) out.push(`Markedly darker than adjacent skin (L* ${p}).`);
  else if (p <= -3) out.push(`Darker than adjacent skin (L* ${p}).`);
  else if (p >= 8) out.push(`Markedly lighter than adjacent skin (L* +${p}).`);
  else if (p >= 3) out.push(`Lighter than adjacent skin (L* +${p}).`);
  else out.push(`Lightness close to adjacent skin (L* ${p >= 0 ? '+' : ''}${p}).`);

  if (c.colourHeterogeneity >= 12) {
    out.push('Colour within the scar is mottled rather than uniform.');
  }

  return out;
}
