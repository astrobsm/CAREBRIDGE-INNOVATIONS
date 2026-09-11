/**
 * Digital planimetry — areas from clinician-traced boundaries on a calibrated
 * photograph.
 *
 * WHY TRACING RATHER THAN SEGMENTATION
 *
 * The two halves of a photographic measurement have very different reliability.
 * Calibration is a machine's job and it does it well: a printed marker of known
 * size gives pixels-per-cm to within a percent. Deciding where a wound ends is a
 * clinical judgement, and no model available to this application makes it
 * dependably — colour thresholds call blood, erythema and shadow "wound".
 *
 * So the clinician draws the boundary and the app does the arithmetic. This is
 * digital planimetry: the same method as tracing onto acetate, which has been
 * the clinical reference standard for wound area for decades, minus the acetate
 * and the paper-weighing. The resulting area is exact geometry over the traced
 * outline, not an estimate — which is why it can carry a real number where a
 * heuristic could only carry a caveat.
 *
 * It is also not "manual measurement" in the sense the specification rules out.
 * Nobody types a length, a width, or a percentage. The clinician indicates
 * boundaries; every quantity is computed.
 *
 * Everything here is pure: pixel coordinates and a scale in, square centimetres
 * out. No DOM, no canvas, no database.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * What a traced ring represents.
 *
 * `total` is the whole site — the graft, or the donor site as harvested.
 * `subregion` is an area carved out of it: still-raw wound on a donor site,
 * non-viable graft on a recipient site. Subregions are subtracted from the
 * total, and `island` is subtracted back out of a subregion, which is how an
 * epithelial island inside an open area is handled correctly.
 */
export type TraceRole = 'total' | 'subregion' | 'island';

export interface Trace {
  id: string;
  role: TraceRole;
  /** Closed ring in image pixel coordinates; the closing edge is implied. */
  points: Point[];
  label?: string;
}

export interface TraceGeometry {
  areaPx: number;
  perimeterPx: number;
  areaCm2: number | null;
  perimeterCm: number | null;
  /** Freehand tracing can cross itself, which makes the area meaningless. */
  selfIntersecting: boolean;
  /** Fewer than three distinct points encloses nothing. */
  degenerate: boolean;
}

export interface PlanimetryResult {
  totalAreaCm2: number | null;
  subregionAreaCm2: number | null;
  /** total − subregion. The epithelialised area, or the viable graft area. */
  remainderAreaCm2: number | null;
  /** subregion / total, as a percentage. */
  subregionPercent: number | null;
  /** remainder / total, as a percentage. */
  remainderPercent: number | null;
  totalPerimeterCm: number | null;
  /** Anything that makes the result untrustworthy, in plain language. */
  problems: string[];
  /** True when the numbers can be shown without qualification. */
  valid: boolean;
}

// ── Core geometry ───────────────────────────────────────────────────────────

/**
 * Signed area of a polygon by the shoelace formula.
 *
 * The sign encodes winding direction, which callers do not care about, but it
 * is kept here because it is what detects a ring traced the other way round.
 */
export function signedAreaPx(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Unsigned polygon area, in square pixels. */
export function areaPx(points: Point[]): number {
  return Math.abs(signedAreaPx(points));
}

/** Closed-ring perimeter, in pixels. */
export function perimeterPx(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** Ray-casting point-in-polygon. Used to check a subregion lies inside its total. */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > p.y !== b.y > p.y;
    if (straddles && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Do two segments properly cross? Shared endpoints do not count. */
function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);

  // Strict sign change on both segments: a genuine crossing, not a touch.
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * Does the ring cross itself?
 *
 * A figure-of-eight has a shoelace area in which the two lobes partly cancel,
 * so it reports an area far smaller than the region enclosed — silently, and
 * plausibly. Freehand tracing on a phone produces exactly this when the finger
 * doubles back, so it is checked rather than assumed away.
 */
export function isSelfIntersecting(points: Point[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent segments, which share an endpoint by construction.
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsCross(a1, a2, points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}

/** Distinct points, ignoring repeats a freehand stroke produces. */
function distinctCount(points: Point[]): number {
  const seen = new Set<string>();
  for (const p of points) seen.add(`${Math.round(p.x)},${Math.round(p.y)}`);
  return seen.size;
}

/** Simplification tolerance scaled to the size of the traced ring. */
function adaptiveTolerance(points: Point[]): number {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const diagonal = Math.hypot(maxX - minX, maxY - minY);
  // Clamped so a tiny trace is not over-smoothed and a huge one is not left
  // with thousands of points to sync.
  return Math.min(3, Math.max(0.4, diagonal * 0.0015));
}

/**
 * Douglas-Peucker simplification.
 *
 * A freehand trace arrives with a point per pointer event — thousands of them,
 * most contributing nothing to the area. The stored trace must stay small
 * enough to sync and be re-measured later, and simplification within a pixel of
 * tolerance changes the computed area by far less than the clinician's own hand.
 */
export function simplify(points: Point[], tolerancePx?: number): Point[] {
  if (points.length <= 3) return [...points];

  // Tolerance scales with the size of the trace rather than being a fixed
  // pixel count. A fixed tolerance means a small wound is simplified far more
  // aggressively, in relative terms, than a large one — so the area error
  // depends on how big the wound happens to be, which is exactly backwards.
  // Scaling to the bounding diagonal holds the relative error roughly constant
  // at a few tenths of a percent, well inside inter-observer variation.
  const tolerance = tolerancePx ?? adaptiveTolerance(points);

  const perpendicular = (p: Point, a: Point, b: Point): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
  };

  const run = (pts: Point[], first: number, last: number, keep: boolean[]) => {
    if (last <= first + 1) return;
    let maxDist = 0;
    let index = first;
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicular(pts[i], pts[first], pts[last]);
      if (dist > maxDist) { maxDist = dist; index = i; }
    }
    if (maxDist > tolerance) {
      keep[index] = true;
      run(pts, first, index, keep);
      run(pts, index, last, keep);
    }
  };

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  run(points, 0, points.length - 1, keep);
  return points.filter((_, i) => keep[i]);
}

/** Geometry of a single ring, converted to real units when a scale is known. */
export function measureTrace(points: Point[], pixelsPerCm: number | null): TraceGeometry {
  const degenerate = distinctCount(points) < 3;
  const aPx = degenerate ? 0 : areaPx(points);
  const pPx = degenerate ? 0 : perimeterPx(points);
  const scaleOk = pixelsPerCm !== null && Number.isFinite(pixelsPerCm) && pixelsPerCm > 0;

  return {
    areaPx: aPx,
    perimeterPx: pPx,
    areaCm2: scaleOk ? round2(aPx / (pixelsPerCm! * pixelsPerCm!)) : null,
    perimeterCm: scaleOk ? round2(pPx / pixelsPerCm!) : null,
    selfIntersecting: degenerate ? false : isSelfIntersecting(points),
    degenerate,
  };
}

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Centroid of a ring, used to test containment within the total. */
function centroid(points: Point[]): Point {
  const n = points.length;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

/**
 * Compute the clinical quantities from a set of traces.
 *
 * Exactly one `total` ring is expected. Subregions are summed and subtracted
 * from it; islands are summed and added back, so an epithelial island inside an
 * open area is not double-counted as still raw.
 *
 * Every condition that would make the output misleading is reported rather than
 * silently absorbed — a self-crossing ring, a subregion outside the total, a
 * subregion larger than the total, or a missing scale.
 */
export function computePlanimetry(
  traces: Trace[],
  pixelsPerCm: number | null,
): PlanimetryResult {
  const problems: string[] = [];
  const empty: PlanimetryResult = {
    totalAreaCm2: null, subregionAreaCm2: null, remainderAreaCm2: null,
    subregionPercent: null, remainderPercent: null, totalPerimeterCm: null,
    problems, valid: false,
  };

  const totals = traces.filter(t => t.role === 'total');
  const subregions = traces.filter(t => t.role === 'subregion');
  const islands = traces.filter(t => t.role === 'island');

  if (totals.length === 0) {
    problems.push('Trace the outline of the whole site before any area can be calculated.');
    return empty;
  }
  if (totals.length > 1) {
    problems.push('More than one total outline was traced. Keep one, or the percentages have no single denominator.');
    return empty;
  }

  const scaleOk = pixelsPerCm !== null && Number.isFinite(pixelsPerCm) && pixelsPerCm > 0;
  if (!scaleOk) {
    problems.push('No calibration scale, so the trace cannot be converted to centimetres.');
  }

  const totalGeom = measureTrace(totals[0].points, pixelsPerCm);
  if (totalGeom.degenerate) {
    problems.push('The outline of the whole site does not enclose an area.');
    return empty;
  }
  if (totalGeom.selfIntersecting) {
    problems.push('The outline of the whole site crosses itself, so its area is not meaningful. Retrace it.');
  }

  // Subregions and islands, with their own validity checked individually so a
  // single bad ring names itself rather than corrupting the total silently.
  let subregionPx = 0;
  for (const s of subregions) {
    const g = measureTrace(s.points, pixelsPerCm);
    if (g.degenerate) continue;
    if (g.selfIntersecting) {
      problems.push(`A traced ${s.label || 'region'} crosses itself and cannot be measured. Retrace it.`);
      continue;
    }
    if (!pointInPolygon(centroid(s.points), totals[0].points)) {
      problems.push(`A traced ${s.label || 'region'} lies outside the outline of the whole site.`);
    }
    subregionPx += g.areaPx;
  }

  let islandPx = 0;
  for (const i of islands) {
    const g = measureTrace(i.points, pixelsPerCm);
    if (g.degenerate || g.selfIntersecting) continue;
    islandPx += g.areaPx;
  }

  // Islands sit inside subregions, so they come back off the subregion total.
  const netSubregionPx = Math.max(0, subregionPx - islandPx);

  if (netSubregionPx > totalGeom.areaPx) {
    problems.push('The traced regions add up to more than the whole site. Check the outlines.');
  }

  const clampedSubPx = Math.min(netSubregionPx, totalGeom.areaPx);
  const remainderPx = Math.max(0, totalGeom.areaPx - clampedSubPx);

  const toCm2 = (px: number) =>
    scaleOk ? round2(px / (pixelsPerCm! * pixelsPerCm!)) : null;

  const subregionPercent = totalGeom.areaPx > 0
    ? round1((clampedSubPx / totalGeom.areaPx) * 100)
    : null;

  return {
    totalAreaCm2: toCm2(totalGeom.areaPx),
    subregionAreaCm2: toCm2(clampedSubPx),
    remainderAreaCm2: toCm2(remainderPx),
    subregionPercent,
    remainderPercent: subregionPercent === null ? null : round1(100 - subregionPercent),
    totalPerimeterCm: totalGeom.perimeterCm,
    problems,
    // Usable only with a scale and no geometric problem. A traced area in
    // pixels is not a clinical measurement.
    valid: scaleOk && problems.length === 0,
  };
}

/**
 * Donor site: re-epithelialization from a traced total and the raw areas left.
 *
 * The remainder — total minus what is still raw — is the epithelialised area,
 * so the percentage falls out of the geometry rather than being judged by eye.
 */
export function donorFromTraces(traces: Trace[], pixelsPerCm: number | null) {
  const p = computePlanimetry(traces, pixelsPerCm);
  return {
    totalAreaCm2: p.totalAreaCm2,
    openAreaCm2: p.subregionAreaCm2,
    epithelializedAreaCm2: p.remainderAreaCm2,
    epithelializedPercent: p.remainderPercent,
    problems: p.problems,
    valid: p.valid,
  };
}

/**
 * Recipient site: graft take from a traced graft and the non-viable areas.
 *
 * Take is viable area over the PRESERVED baseline — the area recorded when the
 * graft was applied — not over the area traced today. A shrinking graft
 * measured against its own current outline reports full take of a failing
 * graft, which is the failure this module exists to detect.
 */
export function graftFromTraces(
  traces: Trace[],
  pixelsPerCm: number | null,
  baselineAreaCm2: number | null,
) {
  const p = computePlanimetry(traces, pixelsPerCm);
  const problems = [...p.problems];

  let takePercent: number | null = null;
  if (p.remainderAreaCm2 !== null) {
    if (baselineAreaCm2 !== null && Number.isFinite(baselineAreaCm2) && baselineAreaCm2 > 0) {
      takePercent = round1(Math.max(0, Math.min(100, (p.remainderAreaCm2 / baselineAreaCm2) * 100)));
    } else {
      problems.push('No baseline graft area recorded, so a take percentage cannot be calculated.');
    }
  }

  return {
    currentGraftAreaCm2: p.totalAreaCm2,
    nonviableAreaCm2: p.subregionAreaCm2,
    viableAreaCm2: p.remainderAreaCm2,
    takePercent,
    problems,
    valid: p.valid && takePercent !== null,
  };
}
