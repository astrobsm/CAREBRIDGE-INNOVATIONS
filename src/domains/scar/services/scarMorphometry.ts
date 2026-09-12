/**
 * 2D scar morphometry from a traced boundary.
 *
 * Geometry over what the clinician drew, converted by the green calibration
 * marker — the same measurement path the wound and graft modules use, reused
 * rather than reimplemented. There is no segmentation model here and none is
 * claimed: the boundary is human, the arithmetic is exact.
 *
 * CALIBRATION IS NOT OPTIONAL FOR DIMENSIONS
 * Without a detected marker there is no scale, and every length and area is
 * withheld rather than reported in pixels dressed up as centimetres. The
 * dimensionless shape descriptors survive, because a ratio does not need a
 * scale — which is worth having, since border irregularity is one of the more
 * useful keloid measures and it costs nothing when calibration fails.
 */

import type { Point } from '../../../services/planimetry';
import { areaPx, perimeterPx, pointInPolygon } from '../../../services/planimetry';
import type { ScarMorphometry, ScarProvenance } from '../types';

export const MORPHOMETRY_METHOD = 'traced-planimetry';
export const MORPHOMETRY_METHOD_VERSION = '1.0.0';

const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Geometry helpers ────────────────────────────────────────────────────────

/** Andrew's monotone chain. Returns the hull in order. */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];
  const pts = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y));

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const build = (src: Point[]) => {
    const out: Point[] = [];
    for (const p of src) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };

  return [...build(pts), ...build([...pts].reverse())];
}

/**
 * Longest distance between any two boundary points, and the pair.
 *
 * Brute force over the hull rather than rotating callipers: a simplified scar
 * outline has tens of hull points, so the quadratic cost is irrelevant and the
 * straightforward version is the one that can be read and checked.
 */
export function maxCaliper(points: Point[]): { distance: number; a: Point; b: Point } | null {
  const hull = convexHull(points);
  if (hull.length < 2) return null;

  let best = { distance: 0, a: hull[0], b: hull[0] };
  for (let i = 0; i < hull.length; i++) {
    for (let j = i + 1; j < hull.length; j++) {
      const d = Math.hypot(hull[i].x - hull[j].x, hull[i].y - hull[j].y);
      if (d > best.distance) best = { distance: d, a: hull[i], b: hull[j] };
    }
  }
  return best.distance > 0 ? best : null;
}

/**
 * Widest extent perpendicular to the long axis.
 *
 * This is the clinically meaningful width of an elongated scar. A bounding-box
 * width would be measured against the image's axes, so the same scar would
 * report a different width purely because the patient was photographed at an
 * angle.
 */
export function widthPerpendicularTo(
  points: Point[],
  axisA: Point,
  axisB: Point,
): { max: number; mean: number } {
  const dx = axisB.x - axisA.x;
  const dy = axisB.y - axisA.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { max: 0, mean: 0 };

  // Unit normal to the long axis.
  const nx = -dy / len;
  const ny = dx / len;

  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const proj = (p.x - axisA.x) * nx + (p.y - axisA.y) * ny;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  const extent = max - min;

  // Mean width from area over length is the honest average for an irregular
  // shape: it is what the scar would measure if straightened into a ribbon.
  const meanWidth = areaPx(points) / len;
  return { max: extent, mean: meanWidth };
}

// ── Analysis ────────────────────────────────────────────────────────────────

export interface MorphometryInput {
  scarPolygon: Point[];
  pixelsPerCm: number | null;
  /** Traced on the same frame, when the original wound margin is known. */
  originalWoundPolygon?: Point[];
  /** Recorded at surgery, when there is no traced original boundary. */
  originalWoundAreaCm2?: number;
  imageId?: string;
  qualityGateVersion?: string;
}

/**
 * Measure a traced scar.
 *
 * Extension beyond the original wound is produced only when the original
 * boundary was genuinely recorded. It is the measurement that distinguishes a
 * keloid from a hypertrophic scar, which is exactly why it must never be
 * inferred — a fabricated original margin would manufacture the finding that
 * drives the diagnosis.
 */
export function measureScar(input: MorphometryInput): ScarMorphometry {
  const { scarPolygon, pixelsPerCm } = input;
  const limitations: string[] = [];

  const provenance: ScarProvenance = {
    origin: 'measured',
    method: MORPHOMETRY_METHOD,
    methodVersion: MORPHOMETRY_METHOD_VERSION,
    qualityGateVersion: input.qualityGateVersion,
    computedAt: new Date().toISOString(),
    isPrototype: false,
    inputImageIds: input.imageId ? [input.imageId] : undefined,
  };

  const empty: ScarMorphometry = {
    areaCm2: null, perimeterCm: null, maxLengthCm: null, maxWidthCm: null, meanWidthCm: null,
    aspectRatio: null, circularity: null, solidity: null, borderIrregularity: null,
    extensionBeyondOriginalCm2: null, extensionBeyondOriginalPercent: null,
    provenance, limitations,
  };

  if (scarPolygon.length < 3) {
    limitations.push('No scar boundary was traced.');
    return empty;
  }

  const aPx = areaPx(scarPolygon);
  const pPx = perimeterPx(scarPolygon);
  if (aPx <= 0 || pPx <= 0) {
    limitations.push('The traced boundary encloses no area.');
    return empty;
  }

  // ── Dimensionless descriptors: no calibration needed ──────────────────────
  const hull = convexHull(scarPolygon);
  const hullArea = hull.length >= 3 ? areaPx(hull) : 0;
  const hullPerim = hull.length >= 3 ? perimeterPx(hull) : 0;

  const circularity = round2((4 * Math.PI * aPx) / (pPx * pPx));
  const solidity = hullArea > 0 ? round2(aPx / hullArea) : null;
  const borderIrregularity = hullPerim > 0 ? round2(pPx / hullPerim) : null;

  const caliper = maxCaliper(scarPolygon);
  const widths = caliper
    ? widthPerpendicularTo(scarPolygon, caliper.a, caliper.b)
    : { max: 0, mean: 0 };
  const aspectRatio = caliper && widths.max > 0
    ? round2(caliper.distance / widths.max)
    : null;

  // ── Dimensions: only with a scale ─────────────────────────────────────────
  const hasScale = pixelsPerCm != null && Number.isFinite(pixelsPerCm) && pixelsPerCm > 0;
  if (!hasScale) {
    limitations.push(
      'No calibration marker was detected, so no dimension is reported. Shape descriptors are '
      + 'unaffected because they are ratios.',
    );
    return {
      ...empty,
      aspectRatio, circularity, solidity, borderIrregularity,
    };
  }

  const ppc = pixelsPerCm as number;
  const toCm = (px: number) => round2(px / ppc);
  const toCm2 = (px2: number) => round2(px2 / (ppc * ppc));

  const areaCm2 = toCm2(aPx);

  // ── Extension beyond the original wound ───────────────────────────────────
  let extensionBeyondOriginalCm2: number | null = null;
  let extensionBeyondOriginalPercent: number | null = null;

  if (input.originalWoundPolygon && input.originalWoundPolygon.length >= 3) {
    const originalCm2 = toCm2(areaPx(input.originalWoundPolygon));
    if (originalCm2 > 0) {
      extensionBeyondOriginalCm2 = round2(Math.max(0, areaCm2 - originalCm2));
      extensionBeyondOriginalPercent = round2((extensionBeyondOriginalCm2 / originalCm2) * 100);

      // Growing outside the original margin is the keloid finding; growing
      // while staying inside it is not, and the two must not be conflated.
      const outside = scarPolygon.filter(
        p => !pointInPolygon(p, input.originalWoundPolygon as Point[]),
      ).length;
      if (outside === 0 && extensionBeyondOriginalCm2 > 0) {
        limitations.push(
          'The scar is larger than the recorded original wound but no part of its traced boundary lies '
          + 'outside it. Check that both boundaries were traced on the same frame.',
        );
      }
    }
  } else if (input.originalWoundAreaCm2 != null && input.originalWoundAreaCm2 > 0) {
    extensionBeyondOriginalCm2 = round2(Math.max(0, areaCm2 - input.originalWoundAreaCm2));
    extensionBeyondOriginalPercent =
      round2((extensionBeyondOriginalCm2 / input.originalWoundAreaCm2) * 100);
    limitations.push(
      'Extension is computed against an original wound area recorded at surgery rather than a traced '
      + 'boundary, so it compares areas without knowing where the margin lay.',
    );
  }

  return {
    areaCm2,
    perimeterCm: toCm(pPx),
    maxLengthCm: caliper ? toCm(caliper.distance) : null,
    maxWidthCm: widths.max > 0 ? toCm(widths.max) : null,
    meanWidthCm: widths.mean > 0 ? toCm(widths.mean) : null,
    aspectRatio, circularity, solidity, borderIrregularity,
    extensionBeyondOriginalCm2, extensionBeyondOriginalPercent,
    provenance, limitations,
  };
}

/**
 * A suggested classification from shape alone, offered only where the geometry
 * actually carries the distinction.
 *
 * This deliberately refuses the interesting question. Hypertrophic scar and
 * keloid are separated by growth beyond the original wound margin and by
 * palpation, not by outline shape, so when the original boundary is unknown
 * this returns nothing rather than guessing from irregularity. A confident
 * shape-based guess between the two would be the module's most dangerous
 * output: plausible, unfounded, and pointed straight at a treatment decision.
 */
export function suggestClassification(m: ScarMorphometry): {
  suggestion: 'keloid' | 'hypertrophic' | null;
  confidence: 'high' | 'moderate' | 'low' | 'not_reliable';
  basis: string;
} {
  const ext = m.extensionBeyondOriginalPercent;

  if (ext == null) {
    return {
      suggestion: null,
      confidence: 'not_reliable',
      basis:
        'The original wound boundary has not been recorded, so growth beyond it cannot be measured. '
        + 'Outline shape alone does not separate keloid from hypertrophic scar.',
    };
  }

  if (ext >= 25) {
    return {
      suggestion: 'keloid',
      confidence: m.provenance.origin === 'measured' ? 'moderate' : 'low',
      basis: `The traced scar extends ${ext}% beyond the recorded original wound area, which is the pattern that distinguishes a keloid. Clinician confirmation required.`,
    };
  }

  if (ext <= 5) {
    return {
      suggestion: 'hypertrophic',
      confidence: 'low',
      basis: `The scar extends ${ext}% beyond the recorded original wound area — it has largely stayed within the original margin. Palpation and history remain necessary.`,
    };
  }

  return {
    suggestion: null,
    confidence: 'not_reliable',
    basis: `Extension of ${ext}% is intermediate and does not separate the two. Clinical assessment required.`,
  };
}
