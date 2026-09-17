/**
 * Serial-measurement arithmetic, shared by every longitudinal module.
 *
 * Extracted from the scar module once the vascular module needed the same
 * reasoning. The two domains measure entirely different things, but the traps
 * are identical, and they are worth stating once:
 *
 * PERCENTAGES NEAR ZERO. A wound shrinking from 0.2 cm² to 0.1 cm² is a 50%
 * reduction and clinically nothing. A toe pressure rising from 2 to 4 mmHg is a
 * doubling and still unrecordable perfusion. Percentage change is withheld
 * below a declared floor rather than reported.
 *
 * MEASURED IS NOT MEANINGFUL. A 3% change in a traced area, or 4 mmHg on a toe
 * cuff, is arithmetically real and indistinguishable from measuring the same
 * thing twice. The noise floors here are method repeatability, declared as
 * such. They are NOT minimally clinically important differences — those come
 * from evidence, and inventing one would bury an unfounded clinical threshold
 * inside the software.
 *
 * FLAT ENDPOINTS ARE NOT STABILITY. A measurement that went down and came back
 * up is telling you something that averaging its endpoints would destroy, so
 * 'fluctuating' is a distinct verdict.
 */

export type TrendDirection =
  | 'improving'
  | 'stable'
  | 'worsening'
  | 'fluctuating'
  | 'indeterminate';

/** One value at one point in time. */
export interface SeriesPoint {
  at: string;
  value: number;
}

/** How a particular measurement behaves, so the maths can be applied to it. */
export interface MeasureSpec {
  /** Whether a fall in the number is a clinical improvement. */
  lowerIsBetter: boolean;
  /** Relative change below which a difference is within method repeatability. */
  noiseFloorRelative?: number;
  /** Absolute floor, for scores and pressures where a relative one misleads. */
  noiseFloorAbsolute?: number;
  /** Below this baseline magnitude, percentage change is not reported. */
  percentFloor?: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const DAY_MS = 86_400_000;

/**
 * Percentage change, or null when the baseline is too small to divide by.
 *
 * Returning null is the point. A percentage over a near-zero denominator is
 * arithmetically valid and clinically misleading, and it is the figure most
 * likely to be quoted out of a report.
 */
export function safePercentChange(
  from: number,
  to: number,
  floor: number,
): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  if (Math.abs(from) < floor) return null;
  return round2(((to - from) / Math.abs(from)) * 100);
}

/**
 * Is this difference bigger than the method's own noise?
 *
 * Not a claim of clinical importance — only that the measurement can tell the
 * two values apart.
 */
export function exceedsNoiseFloor(spec: MeasureSpec, from: number, to: number): boolean {
  const delta = Math.abs(to - from);
  if (spec.noiseFloorAbsolute != null) return delta >= spec.noiseFloorAbsolute;
  if (spec.noiseFloorRelative != null) {
    const base = Math.abs(from);
    if (base === 0) return delta > 0;
    return delta / base >= spec.noiseFloorRelative;
  }
  return delta > 0;
}

/** Classify a measurement's direction over its whole series. */
export function classifyTrend(spec: MeasureSpec, series: SeriesPoint[]): TrendDirection {
  const pts = series.filter(p => Number.isFinite(p.value));
  if (pts.length < 2) return 'indeterminate';

  const first = pts[0];
  const last = pts[pts.length - 1];

  // Direction of each step, ignoring steps inside the noise floor.
  const steps: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const from = pts[i - 1].value;
    const to = pts[i].value;
    if (!exceedsNoiseFloor(spec, from, to)) { steps.push(0); continue; }
    steps.push(to > from ? 1 : -1);
  }

  const ups = steps.filter(s => s === 1).length;
  const downs = steps.filter(s => s === -1).length;

  // Both directions present across three or more points: genuinely unsettled.
  if (ups > 0 && downs > 0 && pts.length >= 3) return 'fluctuating';

  if (!exceedsNoiseFloor(spec, first.value, last.value)) return 'stable';

  const rose = last.value > first.value;
  const better = spec.lowerIsBetter ? !rose : rose;
  return better ? 'improving' : 'worsening';
}

/**
 * Rate of change per 30 days over the most recent interval.
 *
 * The latest interval rather than a fit over everything: a limb that was stable
 * for six months and has deteriorated in the last fortnight should report the
 * fortnight. A slope through the whole series dilutes exactly the signal that
 * matters.
 */
export function ratePerMonth(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const a = series[series.length - 2];
  const b = series[series.length - 1];
  const days = (new Date(b.at).getTime() - new Date(a.at).getTime()) / DAY_MS;
  if (!Number.isFinite(days) || days <= 0) return null;
  return round2(((b.value - a.value) / days) * 30);
}

/**
 * Change in the rate itself, between the last two intervals.
 *
 * Needs three points; below that it returns null rather than guessing.
 */
export function accelerationPerMonth(series: SeriesPoint[]): number | null {
  if (series.length < 3) return null;
  const recent = ratePerMonth(series);
  const earlier = ratePerMonth(series.slice(0, -1));
  if (recent === null || earlier === null) return null;
  return round2(recent - earlier);
}
