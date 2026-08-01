/**
 * WoundProgress Monitor — healing analytics.
 *
 * PURE functions only: no IndexedDB, no Supabase, no browser globals. They are
 * split out from woundMonitorService so they can be unit-tested (and reasoned
 * about) without dragging in the sync layer, which touches `window` at import
 * time.
 *
 * This is the correctness-critical core of the Monitor: it classifies a wound
 * as improving, stalled or worsening and projects closure, which drives the
 * dashboard triage order and the clinician-facing alerts.
 *
 * woundMonitorService re-exports everything here, so existing imports are
 * unaffected.
 */

import type { HealingAnalytics, HealingStatus, WoundAssessment } from '../monitorTypes';

export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Below this fraction of change between two visits, a wound is "not moving". */
export const STAGNATION_THRESHOLD = 0.03; // 3%

/** Chronologically sort assessments that carry a usable area + timestamp. */
function usableSeries(assessments: WoundAssessment[]): Array<{ t: number; area: number; reliable: boolean }> {
  return assessments
    .map(a => ({
      t: a.assessedAt ? new Date(a.assessedAt).getTime() : NaN,
      area: typeof a.areaCm2 === 'number' ? a.areaCm2 : NaN,
      reliable: a.scaleReliable !== false,
    }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.area) && p.area >= 0)
    .sort((a, b) => a.t - b.t);
}

/**
 * Least-squares slope of area (cm²) against time (weeks).
 * Returns 0 when there is no time spread to regress over.
 */
export function areaVelocityCm2PerWeek(assessments: WoundAssessment[]): number {
  const series = usableSeries(assessments);
  if (series.length < 2) return 0;
  const t0 = series[0].t;
  const xs = series.map(p => (p.t - t0) / MS_PER_WEEK);
  const ys = series.map(p => p.area);
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return 0;
  return num / den;
}

/** Count trailing assessments whose area barely changed vs the prior one. */
function trailingStagnantStreak(series: Array<{ area: number }>): number {
  let streak = 0;
  for (let i = series.length - 1; i > 0; i--) {
    const prev = series[i - 1].area;
    const cur = series[i].area;
    const denom = Math.max(prev, 1e-6);
    const change = Math.abs(cur - prev) / denom;
    if (change < STAGNATION_THRESHOLD) streak++;
    else break;
  }
  return streak;
}

/**
 * Derive the full healing picture for one wound from its assessment timeline.
 * This is the analytical heart of the Monitor and is intentionally pure.
 */
export function computeHealingAnalytics(assessments: WoundAssessment[]): HealingAnalytics {
  const series = usableSeries(assessments);
  const assessmentCount = series.length;
  const hasUnreliableScale = series.some(p => !p.reliable);

  if (assessmentCount === 0) {
    return {
      status: 'insufficient_data',
      absoluteAreaChangeCm2: 0,
      percentAreaReduction: 0,
      velocityCm2PerWeek: 0,
      projectedDaysToClosure: null,
      stagnantStreak: 0,
      assessmentCount: 0,
      hasUnreliableScale,
    };
  }

  const baseline = series[0].area;
  const latest = series[series.length - 1].area;
  const absoluteAreaChangeCm2 = latest - baseline;
  const percentAreaReduction = baseline > 0 ? ((baseline - latest) / baseline) * 100 : 0;
  const velocityCm2PerWeek = areaVelocityCm2PerWeek(assessments);
  const stagnantStreak = trailingStagnantStreak(series);

  // Closure projection: only meaningful when actively shrinking.
  let projectedDaysToClosure: number | null = null;
  if (velocityCm2PerWeek < 0 && latest > 0) {
    const weeks = latest / -velocityCm2PerWeek;
    projectedDaysToClosure = Math.round((weeks * MS_PER_WEEK) / MS_PER_DAY);
  }

  let status: HealingStatus;
  if (latest === 0) {
    status = 'healed';
  } else if (assessmentCount < 2) {
    status = 'insufficient_data';
  } else if (velocityCm2PerWeek > baseline * 0.01) {
    // Area growing by >1% of baseline per week.
    status = 'worsening';
  } else if (stagnantStreak >= 2 || Math.abs(percentAreaReduction) < STAGNATION_THRESHOLD * 100) {
    status = 'stagnant';
  } else if (velocityCm2PerWeek < 0) {
    status = 'improving';
  } else {
    status = 'stagnant';
  }

  return {
    status,
    absoluteAreaChangeCm2,
    percentAreaReduction,
    velocityCm2PerWeek,
    projectedDaysToClosure,
    stagnantStreak,
    assessmentCount,
    hasUnreliableScale,
  };
}

/** Human-readable, non-prescriptive flags for the notifications surface. */
export function healingAlerts(analytics: HealingAnalytics): string[] {
  const alerts: string[] = [];
  if (analytics.status === 'worsening') {
    alerts.push('Wound area is increasing — clinical review recommended.');
  }
  if (analytics.status === 'stagnant' && analytics.assessmentCount >= 2) {
    alerts.push(`Healing has stalled across ${analytics.stagnantStreak + 1} recent assessments.`);
  }
  if (analytics.hasUnreliableScale) {
    alerts.push('Some measurements lacked a reliable calibration marker — absolute sizes are approximate.');
  }
  return alerts;
}
