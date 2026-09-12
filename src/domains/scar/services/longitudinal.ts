/**
 * The longitudinal engine: change, rate, acceleration and trend.
 *
 * Every domain is followed separately and classified separately. Collapsing
 * them into one verdict would discard the most useful signal the module has —
 * whether independent modalities agree — which is what the multimodal reader
 * builds on top of this.
 *
 * TWO THINGS THIS IS CAREFUL ABOUT
 *
 * Percentages near zero. A scar shrinking from 0.2 cm² to 0.1 cm² is a 50%
 * reduction and clinically nothing. Percentage change is withheld below a
 * floor rather than reported, because a large percentage of a negligible
 * baseline reads as a dramatic result.
 *
 * Measured versus meaningful. A 3% area change is arithmetically real and
 * clinically indistinguishable from tracing the same scar twice. The engine
 * separates "changed" from "changed by more than the noise", and it does not
 * invent minimally important differences: the thresholds below are measurement
 * noise floors, declared as such, and clinical significance stays a clinician's
 * judgement.
 *
 * Pure functions: no DOM, no database.
 */

import type {
  DataOrigin, DomainChange, ScarDomain, TrendDirection,
} from '../types';

export const LONGITUDINAL_VERSION = 'longitudinal-1.0.0';

/** One domain's value at one point in time. */
export interface SeriesPoint {
  at: string;
  value: number;
}

export interface DomainSpec {
  domain: ScarDomain;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  origin: DataOrigin;
  /**
   * Relative change below which a difference is within measurement noise.
   *
   * These are repeatability floors for the method, NOT minimally clinically
   * important differences. No MCID is asserted anywhere in this module: those
   * are instrument- and population-specific, they must come from evidence, and
   * inventing one would put a clinical threshold into the software that no
   * study supports.
   */
  noiseFloorRelative?: number;
  /** Absolute floor, for scores where a relative floor makes no sense. */
  noiseFloorAbsolute?: number;
  /** Below this baseline value, percentage change is not reported. */
  percentFloor?: number;
}

/**
 * How each domain behaves.
 *
 * Noise floors reflect how repeatable the underlying method is. Traced area is
 * reproducible to a few percent between careful tracings of the same
 * photograph; a colour index measured on an uncalibrated camera is not, which
 * is why its floor is wider. Ordinal clinical scores move in whole points, so
 * theirs is absolute.
 */
export const DOMAIN_SPECS: Record<ScarDomain, DomainSpec> = {
  area: {
    domain: 'area', label: 'Surface area', unit: 'cm²', lowerIsBetter: true,
    origin: 'measured', noiseFloorRelative: 0.08, percentFloor: 0.5,
  },
  volume: {
    domain: 'volume', label: 'Volume', unit: 'cm³', lowerIsBetter: true,
    origin: 'measured', noiseFloorRelative: 0.15, percentFloor: 0.2,
  },
  elevation: {
    domain: 'elevation', label: 'Maximum elevation', unit: 'mm', lowerIsBetter: true,
    origin: 'measured', noiseFloorRelative: 0.15, percentFloor: 0.5,
  },
  erythema: {
    domain: 'erythema', label: 'Erythema vs adjacent skin', unit: 'Δa*', lowerIsBetter: true,
    origin: 'measured', noiseFloorAbsolute: 1.5,
  },
  pigmentation: {
    domain: 'pigmentation', label: 'Pigmentation contrast', unit: 'ΔL*', lowerIsBetter: true,
    origin: 'measured', noiseFloorAbsolute: 2.0,
  },
  pliability: {
    domain: 'pliability', label: 'Pliability', unit: 'grade', lowerIsBetter: true,
    origin: 'examined', noiseFloorAbsolute: 0.5,
  },
  symptoms: {
    domain: 'symptoms', label: 'Symptom burden', unit: '0–10', lowerIsBetter: true,
    origin: 'reported', noiseFloorAbsolute: 1.0,
  },
  vss: {
    domain: 'vss', label: 'Vancouver Scar Scale', unit: 'points', lowerIsBetter: true,
    origin: 'examined', noiseFloorAbsolute: 1.0,
  },
  posas_observer: {
    domain: 'posas_observer', label: 'POSAS observer', unit: 'points', lowerIsBetter: true,
    origin: 'examined', noiseFloorAbsolute: 4.0,
  },
  posas_patient: {
    domain: 'posas_patient', label: 'POSAS patient', unit: 'points', lowerIsBetter: true,
    origin: 'reported', noiseFloorAbsolute: 4.0,
  },
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const DAY_MS = 86_400_000;

const daysBetween = (a: string, b: string): number =>
  (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;

/**
 * Percentage change, or null when the baseline is too small to divide by.
 *
 * Returning null is the point. A percentage computed against a near-zero
 * denominator is arithmetically valid and clinically misleading, and it is the
 * figure most likely to be quoted out of the report.
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
export function exceedsNoiseFloor(spec: DomainSpec, from: number, to: number): boolean {
  const delta = Math.abs(to - from);
  if (spec.noiseFloorAbsolute != null) return delta >= spec.noiseFloorAbsolute;
  if (spec.noiseFloorRelative != null) {
    const base = Math.abs(from);
    if (base === 0) return delta > 0;
    return delta / base >= spec.noiseFloorRelative;
  }
  return delta > 0;
}

/**
 * Classify a domain's direction over its whole series.
 *
 * 'fluctuating' exists so that a scar swinging up and down is not reported as
 * stable because its endpoints happen to match. A scar that has been up, down
 * and up again is telling you something, and averaging it away loses it.
 */
export function classifyTrend(spec: DomainSpec, series: SeriesPoint[]): TrendDirection {
  const pts = series.filter(p => Number.isFinite(p.value));
  if (pts.length < 2) return 'indeterminate';

  const first = pts[0];
  const last = pts[pts.length - 1];

  // Direction of each step, ignoring steps within the noise floor.
  const steps: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const from = pts[i - 1].value;
    const to = pts[i].value;
    if (!exceedsNoiseFloor(spec, from, to)) { steps.push(0); continue; }
    steps.push(to > from ? 1 : -1);
  }

  const ups = steps.filter(s => s === 1).length;
  const downs = steps.filter(s => s === -1).length;

  // Both directions present, more than once: genuinely unsettled.
  if (ups > 0 && downs > 0 && pts.length >= 3) return 'fluctuating';

  if (!exceedsNoiseFloor(spec, first.value, last.value)) return 'stable';

  const rose = last.value > first.value;
  const better = spec.lowerIsBetter ? !rose : rose;
  return better ? 'improving' : 'worsening';
}

/**
 * Rate of change per 30 days over the most recent interval.
 *
 * The latest interval rather than a fit over everything: a keloid that was
 * quiet for six months and has grown in the last fortnight should report the
 * fortnight. A slope through the whole series would dilute exactly the signal
 * that matters.
 */
export function ratePerMonth(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const a = series[series.length - 2];
  const b = series[series.length - 1];
  const days = daysBetween(a.at, b.at);
  if (!Number.isFinite(days) || days <= 0) return null;
  return round2(((b.value - a.value) / days) * 30);
}

/**
 * Change in the rate itself, between the last two intervals.
 *
 * A keloid accelerating from +0.4 to +1.5 cm²/month is a different clinical
 * situation from one growing steadily, and the acceleration is what separates
 * them. Needs three points; below that it returns null rather than guessing.
 */
export function accelerationPerMonth(series: SeriesPoint[]): number | null {
  if (series.length < 3) return null;
  const recent = ratePerMonth(series);
  const earlier = ratePerMonth(series.slice(0, -1));
  if (recent === null || earlier === null) return null;
  return round2(recent - earlier);
}

/**
 * Build the full change record for one domain.
 *
 * The series must be in chronological order, baseline first.
 */
export function analyseDomain(
  domain: ScarDomain,
  series: SeriesPoint[],
): DomainChange {
  const spec = DOMAIN_SPECS[domain];
  const pts = series.filter(p => Number.isFinite(p.value));
  const limitations: string[] = [];

  const base: DomainChange = {
    domain,
    label: spec.label,
    unit: spec.unit,
    lowerIsBetter: spec.lowerIsBetter,
    baselineValue: null,
    previousValue: null,
    currentValue: null,
    absoluteChangeFromBaseline: null,
    percentChangeFromBaseline: null,
    absoluteChangeFromPrevious: null,
    percentChangeFromPrevious: null,
    ratePerMonth: null,
    accelerationPerMonth: null,
    trend: 'indeterminate',
    origin: spec.origin,
    limitations,
  };

  if (pts.length === 0) {
    limitations.push('Not recorded at any assessment.');
    return base;
  }

  const baseline = pts[0];
  const current = pts[pts.length - 1];
  const previous = pts.length >= 2 ? pts[pts.length - 2] : null;

  base.baselineValue = round2(baseline.value);
  base.currentValue = round2(current.value);
  base.previousValue = previous ? round2(previous.value) : null;

  if (pts.length === 1) {
    limitations.push('Only one assessment — no change can be computed yet.');
    return base;
  }

  const floor = spec.percentFloor ?? 0;

  base.absoluteChangeFromBaseline = round2(current.value - baseline.value);
  base.percentChangeFromBaseline = safePercentChange(baseline.value, current.value, floor);
  if (base.percentChangeFromBaseline === null && floor > 0) {
    limitations.push(
      `Percentage change from baseline is withheld: the baseline value (${round2(baseline.value)} ${spec.unit}) `
      + 'is too small for a percentage to be meaningful.',
    );
  }

  if (previous) {
    base.absoluteChangeFromPrevious = round2(current.value - previous.value);
    base.percentChangeFromPrevious = safePercentChange(previous.value, current.value, floor);

    if (!exceedsNoiseFloor(spec, previous.value, current.value)) {
      limitations.push(
        'The change since the previous assessment is within the repeatability of the measurement method.',
      );
    }
  }

  base.ratePerMonth = ratePerMonth(pts);
  base.accelerationPerMonth = accelerationPerMonth(pts);
  base.trend = classifyTrend(spec, pts);

  if (pts.length === 2) {
    limitations.push('Based on two assessments; the trend will firm up with further follow-up.');
  }

  return base;
}

/**
 * Growth that is itself speeding up, in a domain where higher is worse.
 *
 * Contributes to progression risk and to the rapid-expansion alert, which is
 * why it is stated as an observation about the measurements rather than as a
 * conclusion about the scar.
 */
export function isAccelerating(change: DomainChange): boolean {
  if (change.lowerIsBetter !== true) return false;
  const rate = change.ratePerMonth;
  const accel = change.accelerationPerMonth;
  return rate != null && accel != null && rate > 0 && accel > 0;
}
