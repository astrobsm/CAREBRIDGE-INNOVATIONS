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
 * The kinds of surface found within one wound outline.
 *
 * A real wound is not one thing minus another. A donor site at day seven is
 * patches of new epithelium, patches still raw, and patches under slough,
 * scattered across the harvest. Each patch is traced separately, as many as
 * there are, and they accumulate — which is why these are additive categories
 * rather than a single subregion subtracted from the whole.
 */
export type SurfaceKind =
  | 'raw'
  | 'slough'
  | 'epithelialised'
  | 'granulation'
  | 'necrotic';

export const SURFACE_KINDS: SurfaceKind[] = [
  'raw', 'slough', 'epithelialised', 'granulation', 'necrotic',
];

/** Surfaces that mean the wound is not yet closed at that spot. */
const NOT_EPITHELIALISED: SurfaceKind[] = ['raw', 'slough', 'granulation', 'necrotic'];

/**
 * What a traced ring represents.
 *
 * `total` is the whole site — the wound, the graft, or the donor site as
 * harvested. Every other role is a patch of a particular surface within it.
 */
export type TraceRole = 'total' | SurfaceKind;

export interface Trace {
  id: string;
  role: TraceRole;
  /** Closed ring in image pixel coordinates; the closing edge is implied. */
  points: Point[];
  label?: string;
}

export interface SurfaceTally {
  areaCm2: number | null;
  areaPx: number;
  /** Share of the traced total. */
  percent: number | null;
  /** How many separate patches of this surface were traced. */
  patches: number;
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
  totalPerimeterCm: number | null;

  /** Per-surface tallies, each summed over however many patches were traced. */
  surfaces: Record<SurfaceKind, SurfaceTally>;

  /** Everything accounted for by traced patches. */
  classifiedAreaCm2: number | null;
  /**
   * The part of the outline no patch covers.
   *
   * Reported rather than assigned. On a donor site this is almost always
   * healed skin, but saying so is a clinical reading of the picture, not a
   * measurement, so the number is shown and the interpretation is left visible
   * in `epithelialisedPercent` below.
   */
  unclassifiedAreaCm2: number | null;
  unclassifiedPercent: number | null;

  /**
   * Share of the outline that is NOT yet epithelialised — raw, sloughy,
   * granulating or necrotic patches added together.
   */
  openPercent: number | null;
  openAreaCm2: number | null;

  /**
   * Share that has epithelialised.
   *
   * Taken from explicitly traced epithelium when any was traced; otherwise the
   * outline minus everything still open, which is how a donor site is usually
   * assessed — you trace what is still raw, not what has healed.
   */
  epithelialisedAreaCm2: number | null;
  epithelialisedPercent: number | null;
  /** True when the figure above was inferred rather than traced directly. */
  epithelialisedInferred: boolean;

  /** Anything that makes the result untrustworthy, in plain language. */
  problems: string[];
  /** True when the numbers can be shown without qualification. */
  valid: boolean;
}

function emptyTally(): SurfaceTally {
  return { areaCm2: null, areaPx: 0, percent: null, patches: 0 };
}

function emptySurfaces(): Record<SurfaceKind, SurfaceTally> {
  return {
    raw: emptyTally(), slough: emptyTally(), epithelialised: emptyTally(),
    granulation: emptyTally(), necrotic: emptyTally(),
  };
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
 * Area of one patch after removing any patches nested inside it.
 *
 * A clinician who traces a raw area and then an island of new epithelium
 * within it has described a ring, not two overlapping discs. Summing both
 * would count the island twice — once as raw and once as epithelium — and
 * inflate the classified total past the outline. Nesting is resolved by
 * containment so the clinician can simply trace what they see, in any order,
 * without thinking about set arithmetic.
 */
function nettArea(index: number, patches: { points: Point[]; areaPx: number }[]): number {
  const self = patches[index];
  let nested = 0;
  for (let j = 0; j < patches.length; j++) {
    if (j === index) continue;
    const other = patches[j];
    // Strictly smaller and centred inside: a patch within this one.
    if (other.areaPx >= self.areaPx) continue;
    if (pointInPolygon(centroid(other.points), self.points)) nested += other.areaPx;
  }
  return Math.max(0, self.areaPx - nested);
}

/**
 * Do two patches overlap without one containing the other?
 *
 * Nesting is legitimate and handled above. A partial overlap is not: it means
 * the same tissue has been traced twice under two different labels, and the
 * areas would both count. Sampling the ring's own vertices is enough to notice
 * it — exact polygon clipping is far more machinery than a warning needs.
 */
function partiallyOverlaps(a: Point[], b: Point[]): boolean {
  const inside = (pts: Point[], poly: Point[]) =>
    pts.reduce((n, p) => n + (pointInPolygon(p, poly) ? 1 : 0), 0);

  const aInB = inside(a, b);
  const bInA = inside(b, a);
  if (aInB === 0 && bInA === 0) return false;          // disjoint
  if (aInB === a.length || bInA === b.length) return false; // fully nested
  return true;
}

/**
 * Compute the clinical quantities from a traced outline and its patches.
 *
 * Exactly one `total` ring is expected. Every other trace is a patch of a
 * particular surface, and patches accumulate: trace as many areas of slough,
 * raw tissue or new epithelium as the wound actually has, in any order and
 * across as many sittings as it takes.
 *
 * Every condition that would make the output misleading is reported rather
 * than absorbed — a self-crossing ring, a patch outside the outline, patches
 * that overlap each other, patches summing past the outline, or no scale.
 */
export function computePlanimetry(
  traces: Trace[],
  pixelsPerCm: number | null,
): PlanimetryResult {
  const problems: string[] = [];
  const scaleOk = pixelsPerCm !== null && Number.isFinite(pixelsPerCm) && pixelsPerCm > 0;
  const toCm2 = (px: number) => (scaleOk ? round2(px / (pixelsPerCm! * pixelsPerCm!)) : null);

  const empty: PlanimetryResult = {
    totalAreaCm2: null, totalPerimeterCm: null,
    surfaces: emptySurfaces(),
    classifiedAreaCm2: null, unclassifiedAreaCm2: null, unclassifiedPercent: null,
    openAreaCm2: null, openPercent: null,
    epithelialisedAreaCm2: null, epithelialisedPercent: null, epithelialisedInferred: false,
    problems, valid: false,
  };

  const totals = traces.filter(t => t.role === 'total');
  if (totals.length === 0) {
    problems.push('Trace the outline of the whole wound before any area can be calculated.');
    return empty;
  }
  if (totals.length > 1) {
    problems.push('More than one outline was traced. Keep one, or the percentages have no single denominator.');
    return empty;
  }
  if (!scaleOk) {
    problems.push('No calibration scale, so the trace cannot be converted to centimetres.');
  }

  const totalGeom = measureTrace(totals[0].points, pixelsPerCm);
  if (totalGeom.degenerate) {
    problems.push('The outline does not enclose an area.');
    return empty;
  }
  if (totalGeom.selfIntersecting) {
    problems.push('The outline crosses itself, so its area is not meaningful. Retrace it.');
  }

  // Gather usable patches, rejecting individually so one bad ring names itself
  // rather than quietly corrupting the totals.
  const patches: { kind: SurfaceKind; points: Point[]; areaPx: number }[] = [];
  for (const t of traces) {
    if (t.role === 'total') continue;
    const kind = t.role as SurfaceKind;
    const g = measureTrace(t.points, pixelsPerCm);
    if (g.degenerate) continue;
    if (g.selfIntersecting) {
      problems.push(`A traced ${t.label || kind} patch crosses itself and cannot be measured. Retrace it.`);
      continue;
    }
    if (!pointInPolygon(centroid(t.points), totals[0].points)) {
      problems.push(`A traced ${t.label || kind} patch lies outside the wound outline.`);
    }
    patches.push({ kind, points: t.points, areaPx: g.areaPx });
  }

  for (let i = 0; i < patches.length; i++) {
    for (let j = i + 1; j < patches.length; j++) {
      if (partiallyOverlaps(patches[i].points, patches[j].points)) {
        problems.push(
          `Traced ${patches[i].kind} and ${patches[j].kind} patches overlap, so that area would be counted twice. ` +
          'Retrace one of them, or trace the smaller fully inside the larger.',
        );
      }
    }
  }

  // Tally by surface, each patch net of anything nested within it.
  const surfaces = emptySurfaces();
  patches.forEach((p, i) => {
    const nett = nettArea(i, patches);
    const tally = surfaces[p.kind];
    tally.areaPx += nett;
    tally.patches += 1;
  });

  const classifiedPx = SURFACE_KINDS.reduce((sum, k) => sum + surfaces[k].areaPx, 0);
  if (classifiedPx > totalGeom.areaPx * 1.02) {
    problems.push('The traced patches add up to more than the wound outline. Check for overlapping traces.');
  }

  const cappedClassifiedPx = Math.min(classifiedPx, totalGeom.areaPx);
  const unclassifiedPx = Math.max(0, totalGeom.areaPx - cappedClassifiedPx);
  const pct = (px: number) =>
    totalGeom.areaPx > 0 ? round1((px / totalGeom.areaPx) * 100) : null;

  for (const k of SURFACE_KINDS) {
    surfaces[k].areaCm2 = toCm2(surfaces[k].areaPx);
    surfaces[k].percent = pct(surfaces[k].areaPx);
  }

  const openPx = NOT_EPITHELIALISED.reduce((sum, k) => sum + surfaces[k].areaPx, 0);

  // Only epithelium that was actually traced is reported here. Whether the
  // untraced remainder counts as healed depends entirely on what the outline
  // means: on a donor site it is healed skin, on a raw wound it is more wound.
  // That reading belongs to the caller - see donorFromTraces.
  const epithelialisedPx = surfaces.epithelialised.areaPx;

  return {
    totalAreaCm2: toCm2(totalGeom.areaPx),
    totalPerimeterCm: totalGeom.perimeterCm,
    surfaces,
    classifiedAreaCm2: toCm2(cappedClassifiedPx),
    unclassifiedAreaCm2: toCm2(unclassifiedPx),
    unclassifiedPercent: pct(unclassifiedPx),
    openAreaCm2: toCm2(Math.min(openPx, totalGeom.areaPx)),
    openPercent: pct(Math.min(openPx, totalGeom.areaPx)),
    epithelialisedAreaCm2: toCm2(Math.min(epithelialisedPx, totalGeom.areaPx)),
    epithelialisedPercent: pct(Math.min(epithelialisedPx, totalGeom.areaPx)),
    epithelialisedInferred: false,
    problems,
    valid: scaleOk && problems.length === 0,
  };
}

/**
 * Donor site: re-epithelialization from the traced outline and its patches.
 *
 * Trace what is still raw and what is under slough; anything left is taken as
 * healed. Trace epithelium explicitly instead and that is used directly.
 */
export function donorFromTraces(traces: Trace[], pixelsPerCm: number | null) {
  const p = computePlanimetry(traces, pixelsPerCm);

  // A donor site outline is the harvest as taken, so anything within it that is
  // not still open has epithelialised - including, when nothing is traced open
  // at all, the whole of it. Explicitly traced epithelium is used as traced.
  const tracedEpi = p.surfaces.epithelialised.areaCm2 ?? 0;
  const inferred = p.surfaces.epithelialised.patches === 0;
  const epithelializedAreaCm2 = p.totalAreaCm2 === null
    ? null
    : inferred
      ? round2(Math.max(0, p.totalAreaCm2 - (p.openAreaCm2 ?? 0)))
      : tracedEpi;
  const epithelializedPercent = epithelializedAreaCm2 === null || !p.totalAreaCm2
    ? null
    : round1((epithelializedAreaCm2 / p.totalAreaCm2) * 100);

  return {
    totalAreaCm2: p.totalAreaCm2,
    openAreaCm2: p.openAreaCm2,
    epithelializedAreaCm2,
    epithelializedPercent,
    /** True when epithelium was deduced from what was left, not traced. */
    inferred,
    surfaces: p.surfaces,
    problems: p.problems,
    valid: p.valid,
  };
}

/**
 * Recipient site: graft take from the traced graft and its non-viable patches.
 *
 * Necrotic and sloughy patches are graft that has not taken. Take is viable
 * area over the PRESERVED baseline — the area recorded when the graft was
 * applied — never over the area traced today. A shrinking graft measured
 * against its own current outline reports full take of a failing graft, which
 * is the failure this module exists to detect.
 */
export function graftFromTraces(
  traces: Trace[],
  pixelsPerCm: number | null,
  baselineAreaCm2: number | null,
) {
  const p = computePlanimetry(traces, pixelsPerCm);
  const problems = [...p.problems];

  const nonviableCm2 = p.totalAreaCm2 === null ? null : round2(
    (p.surfaces.necrotic.areaCm2 ?? 0) + (p.surfaces.slough.areaCm2 ?? 0),
  );
  const viableCm2 = p.totalAreaCm2 === null || nonviableCm2 === null
    ? null
    : round2(Math.max(0, p.totalAreaCm2 - nonviableCm2));

  let takePercent: number | null = null;
  if (viableCm2 !== null) {
    if (baselineAreaCm2 !== null && Number.isFinite(baselineAreaCm2) && baselineAreaCm2 > 0) {
      takePercent = round1(Math.max(0, Math.min(100, (viableCm2 / baselineAreaCm2) * 100)));
    } else {
      problems.push('No baseline graft area recorded, so a take percentage cannot be calculated.');
    }
  }

  return {
    currentGraftAreaCm2: p.totalAreaCm2,
    nonviableAreaCm2: nonviableCm2,
    viableAreaCm2: viableCm2,
    takePercent,
    surfaces: p.surfaces,
    problems,
    valid: p.valid && takePercent !== null,
  };
}
