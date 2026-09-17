/**
 * Trending for vascular measurements.
 *
 * Pure functions over stored assessments: no database, no DOM, so the
 * arithmetic can be tested directly. The service layer imports from here rather
 * than the other way round — keeping this free of the data layer is what makes
 * it testable at all.
 *
 * The maths itself comes from the shared longitudinalMath module. The
 * measurements differ from the scar module's entirely; the traps are identical.
 */

import {
  classifyTrend, safePercentChange, exceedsNoiseFloor,
  type MeasureSpec, type SeriesPoint, type TrendDirection,
} from '../../../services/longitudinalMath';
import type { PadAssessment } from '../types';
import { calculateAbi, calculateTbi } from './perfusion';

const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Measures followed over time ─────────────────────────────────────────────

export type VascularMeasure =
  | 'abi' | 'tbi' | 'toe_pressure' | 'ankle_pressure' | 'tcpo2' | 'spp'
  | 'wound_area' | 'walking_distance' | 'rest_pain_severity'
  | 'wifi_ischaemia' | 'wifi_wound' | 'wifi_infection';

export interface MeasureDef extends MeasureSpec {
  measure: VascularMeasure;
  label: string;
  unit: string;
}

/**
 * How each measurement behaves.
 *
 * The noise floors are repeatability, not clinical importance. Toe pressure in
 * particular is a noisy measurement — a swing of under about 10 mmHg between
 * visits is within what the technique itself produces, and calling that an
 * improvement would manufacture trends out of cuff variation.
 */
export const MEASURES: Record<VascularMeasure, MeasureDef> = {
  abi: {
    measure: 'abi', label: 'Ankle-brachial index', unit: '',
    lowerIsBetter: false, noiseFloorAbsolute: 0.10, percentFloor: 0.2,
  },
  tbi: {
    measure: 'tbi', label: 'Toe-brachial index', unit: '',
    lowerIsBetter: false, noiseFloorAbsolute: 0.08, percentFloor: 0.1,
  },
  toe_pressure: {
    measure: 'toe_pressure', label: 'Toe pressure', unit: 'mmHg',
    lowerIsBetter: false, noiseFloorAbsolute: 10, percentFloor: 10,
  },
  ankle_pressure: {
    measure: 'ankle_pressure', label: 'Ankle pressure', unit: 'mmHg',
    lowerIsBetter: false, noiseFloorAbsolute: 15, percentFloor: 20,
  },
  tcpo2: {
    measure: 'tcpo2', label: 'TcPO2', unit: 'mmHg',
    lowerIsBetter: false, noiseFloorAbsolute: 8, percentFloor: 10,
  },
  spp: {
    measure: 'spp', label: 'Skin perfusion pressure', unit: 'mmHg',
    lowerIsBetter: false, noiseFloorAbsolute: 8, percentFloor: 10,
  },
  wound_area: {
    measure: 'wound_area', label: 'Wound area', unit: 'cm²',
    lowerIsBetter: true, noiseFloorRelative: 0.10, percentFloor: 0.5,
  },
  walking_distance: {
    measure: 'walking_distance', label: 'Claudication distance', unit: 'm',
    lowerIsBetter: false, noiseFloorRelative: 0.20, percentFloor: 10,
  },
  rest_pain_severity: {
    measure: 'rest_pain_severity', label: 'Rest pain severity', unit: '/10',
    lowerIsBetter: true, noiseFloorAbsolute: 1,
  },
  wifi_ischaemia: {
    measure: 'wifi_ischaemia', label: 'WIfI ischaemia grade', unit: '',
    lowerIsBetter: true, noiseFloorAbsolute: 1,
  },
  wifi_wound: {
    measure: 'wifi_wound', label: 'WIfI wound grade', unit: '',
    lowerIsBetter: true, noiseFloorAbsolute: 1,
  },
  wifi_infection: {
    measure: 'wifi_infection', label: 'WIfI infection grade', unit: '',
    lowerIsBetter: true, noiseFloorAbsolute: 1,
  },
};

/** Pull one measure's value out of a stored assessment. */
export function valueOf(measure: VascularMeasure, a: PadAssessment): number | null {
  const p = a.perfusion?.pressures;
  const local = a.perfusion?.local ?? [];

  switch (measure) {
    case 'abi': return p ? calculateAbi(p).value : null;
    case 'tbi': return p ? calculateTbi(p).value : null;
    case 'toe_pressure': return p?.toeMmHg ?? null;
    case 'ankle_pressure': return p?.ankleMmHg ?? null;
    case 'tcpo2': return local.find(l => l.kind === 'tcpo2')?.value ?? null;
    case 'spp': return local.find(l => l.kind === 'spp')?.value ?? null;
    case 'wound_area': return a.wound?.areaCm2 ?? null;
    case 'walking_distance': return a.claudication?.walkingDistanceM ?? null;
    case 'rest_pain_severity': return a.restPain?.severity0to10 ?? null;
    case 'wifi_ischaemia': return a.wifi?.ischaemia.grade ?? null;
    case 'wifi_wound': return a.wifi?.wound.grade ?? null;
    case 'wifi_infection': return a.wifi?.footInfection.grade ?? null;
    default: return null;
  }
}

export interface MeasureTrend {
  measure: VascularMeasure;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  series: SeriesPoint[];
  baseline: number | null;
  previous: number | null;
  current: number | null;
  changeFromPrevious: number | null;
  percentChangeFromPrevious: number | null;
  changeFromBaseline: number | null;
  percentChangeFromBaseline: number | null;
  trend: TrendDirection;
  /** Set when the change sits inside the method's own variability. */
  withinNoise: boolean;
  note: string | null;
}


export function trendFor(
  measure: VascularMeasure,
  assessments: PadAssessment[],
): MeasureTrend {
  const def = MEASURES[measure];
  const series: SeriesPoint[] = assessments
    .map(a => {
      const v = valueOf(measure, a);
      return v == null ? null : { at: a.assessedAt, value: v };
    })
    .filter((p): p is SeriesPoint => p !== null);

  const base: MeasureTrend = {
    measure, label: def.label, unit: def.unit, lowerIsBetter: def.lowerIsBetter,
    series,
    baseline: null, previous: null, current: null,
    changeFromPrevious: null, percentChangeFromPrevious: null,
    changeFromBaseline: null, percentChangeFromBaseline: null,
    trend: 'indeterminate', withinNoise: false, note: null,
  };

  if (series.length === 0) return { ...base, note: 'Not recorded at any assessment.' };

  const first = series[0];
  const last = series[series.length - 1];
  const prev = series.length >= 2 ? series[series.length - 2] : null;

  base.baseline = round2(first.value);
  base.current = round2(last.value);
  base.previous = prev ? round2(prev.value) : null;

  if (series.length === 1) {
    return { ...base, note: 'One measurement only — no change can be computed yet.' };
  }

  const floor = def.percentFloor ?? 0;
  base.changeFromBaseline = round2(last.value - first.value);
  base.percentChangeFromBaseline = safePercentChange(first.value, last.value, floor);

  if (prev) {
    base.changeFromPrevious = round2(last.value - prev.value);
    base.percentChangeFromPrevious = safePercentChange(prev.value, last.value, floor);
    base.withinNoise = !exceedsNoiseFloor(def, prev.value, last.value);
  }

  base.trend = classifyTrend(def, series);

  if (base.withinNoise) {
    base.note =
      `The change since the previous assessment is within the repeatability of ${def.label.toLowerCase()} `
      + 'measurement, so it should not be read as a real change on its own.';
  }

  return base;
}

