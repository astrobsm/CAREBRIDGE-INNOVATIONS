/**
 * Monitoring alerts: pure functions over measurement series, plus a
 * monitoring schedule by risk level. Each alert function returns the alerts it
 * raised AND the data gaps it found — a gap in a series is reported, never
 * read as "fine".
 */

import { classifyTrend, type SeriesPoint } from '../../../services/longitudinalMath';
import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { positive, finite, r1, r2 } from './estimate';
import { electrolyteLowerLimit, electrolyteMmolL, type RefeedingElectrolyte, type RefeedingLabs } from './refeeding';
import type { WeightPoint } from './types';

const C = ACTIVE_NUTRITION_CONFIG;
const DAY = 86_400_000;

export type AlertKind =
  | 'intake_below_target' | 'circumference_decline' | 'prealbumin_falling_crp_not_rising'
  | 'negative_nitrogen_balance' | 'refeeding_lab_low' | 'refeeding_lab_missing' | 'weight_change_faster_than_planned';

export interface NutritionAlert {
  kind: AlertKind;
  severity: 'warning' | 'urgent';
  message: string;
  /** Dates of the readings that triggered it. */
  at: string[];
}

export interface AlertResult {
  alerts: NutritionAlert[];
  /** Missing data that limited the check. */
  gaps: string[];
  configVersion: string;
}

const result = (config: NutritionConfig, alerts: NutritionAlert[], gaps: string[]): AlertResult => ({ alerts, gaps, configVersion: config.version });
const dayKey = (at: string) => new Date(at).toISOString().slice(0, 10);
const byDate = <T extends { at: string }>(xs: T[]) =>
  xs.filter(x => Number.isFinite(new Date(x.at).getTime())).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

// ───────────────────────────── Intake ─────────────────────────────

export interface IntakeDay {
  at: string;
  intakeKcal: number | null;
  targetKcal: number | null;
}

/** Intake below 60% of target on 3+ consecutive calendar days. A missing day breaks the run and is reported as a gap. */
export function intakeBelowTargetAlert(days: IntakeDay[], config: NutritionConfig = C): AlertResult {
  const frac = config.monitoring.intakeBelowFraction.value;
  const need = config.monitoring.intakeConsecutiveDays.value;
  const pts = byDate(days);
  const gaps: string[] = []; const alerts: NutritionAlert[] = [];
  let run: string[] = []; let prev: number | null = null;
  const flush = () => {
    if (run.length >= need) alerts.push({ kind: 'intake_below_target', severity: 'warning', at: [...run],
      message: `Intake below ${frac * 100}% of target for ${run.length} consecutive days (${run[0]} to ${run[run.length - 1]}).` });
    run = [];
  };
  for (const d of pts) {
    const t = new Date(dayKey(d.at)).getTime();
    if (prev !== null && t - prev > DAY) {
      for (let x = prev + DAY; x < t; x += DAY) gaps.push(`No intake recorded on ${new Date(x).toISOString().slice(0, 10)}`);
      flush();
    }
    prev = t;
    const intake = finite(d.intakeKcal); const target = positive(d.targetKcal);
    if (intake === null || target === null) { gaps.push(`${dayKey(d.at)}: ${intake === null ? 'intake' : 'target'} not recorded`); flush(); continue; }
    if (intake < frac * target) run.push(dayKey(d.at)); else flush();
  }
  flush();
  return result(config, alerts, gaps);
}

// ───────────────────────────── MUAC / calf ─────────────────────────────

/** Latest MUAC or calf circumference ≥ 5% below baseline (first reading unless given). */
export function circumferenceDeclineAlert(series: SeriesPoint[], measure: 'MUAC' | 'calf circumference',
  baseline?: SeriesPoint, config: NutritionConfig = C): AlertResult {
  const pct = config.monitoring.circumferenceDeclinePercent.value;
  const pts = byDate(series.filter(p => positive(p.value) !== null));
  const base = baseline ?? pts[0];
  if (!base || pts.length === 0 || (pts.length < 2 && !baseline)) return result(config, [], [`${measure}: need a baseline and a later reading`]);
  const latest = pts[pts.length - 1];
  const change = ((latest.value - base.value) / base.value) * 100;
  const alerts: NutritionAlert[] = change <= -pct ? [{ kind: 'circumference_decline', severity: 'warning', at: [base.at, latest.at],
    message: `${measure} down ${r1(-change)}% from baseline (${base.value} → ${latest.value} cm).` }] : [];
  return result(config, alerts, []);
}

// ───────────────────────────── Prealbumin vs CRP ─────────────────────────────

/**
 * Prealbumin falling while CRP is falling or stable: the fall is less likely
 * to be the acute-phase response and more likely inadequate intake.
 * Both series must be in consistent units.
 */
export function prealbuminCrpAlert(prealbumin: SeriesPoint[], crp: SeriesPoint[], config: NutritionConfig = C): AlertResult {
  const gaps: string[] = [];
  if (prealbumin.length < 2) gaps.push('prealbumin: need at least 2 readings');
  if (crp.length < 2) gaps.push('CRP: need at least 2 readings');
  if (gaps.length) return result(config, [], gaps);
  const pa = classifyTrend({ lowerIsBetter: false, noiseFloorRelative: config.monitoring.prealbuminNoiseRelative.value }, byDate(prealbumin));
  const c = classifyTrend({ lowerIsBetter: true, noiseFloorRelative: config.monitoring.crpNoiseRelative.value }, byDate(crp));
  const crpNotRising = c === 'improving' || c === 'stable';
  const alerts: NutritionAlert[] = pa === 'worsening' && crpNotRising ? [{ kind: 'prealbumin_falling_crp_not_rising', severity: 'warning',
    at: [prealbumin[0].at, prealbumin[prealbumin.length - 1].at],
    message: `Prealbumin falling while CRP is ${c === 'stable' ? 'stable' : 'falling'}: consider inadequate intake rather than inflammation.` }] : [];
  if (pa === 'fluctuating' || c === 'fluctuating') gaps.push('Trend fluctuating: not interpretable as a direction.');
  return result(config, alerts, gaps);
}

// ───────────────────────────── Nitrogen balance ─────────────────────────────

export function negativeNitrogenAlert(series: SeriesPoint[], config: NutritionConfig = C): AlertResult {
  const need = config.monitoring.negativeNitrogenConsecutive.value;
  const pts = byDate(series.filter(p => finite(p.value) !== null));
  if (pts.length < need) return result(config, [], [`nitrogen balance: need ${need} measurements`]);
  const alerts: NutritionAlert[] = [];
  let run: SeriesPoint[] = [];
  for (const p of pts) {
    if (p.value < 0) run.push(p); else run = [];
    if (run.length === need) alerts.push({ kind: 'negative_nitrogen_balance', severity: 'warning', at: run.map(r => r.at),
      message: `Negative nitrogen balance on ${need} consecutive measurements (${run.map(r => r.value).join(', ')} g N/day).` });
  }
  return result(config, alerts, []);
}

// ───────────────────────────── Refeeding labs ─────────────────────────────

/** Any K/PO4/Mg below the reference low is urgent; a missing one during refeeding is itself an alert. */
export function refeedingLabAlert(labs: RefeedingLabs & { at: string }, config: NutritionConfig = C): AlertResult {
  const alerts: NutritionAlert[] = [];
  for (const e of ['potassium', 'phosphate', 'magnesium'] as RefeedingElectrolyte[]) {
    const v = electrolyteMmolL(e, labs[e], labs.units?.[e]);
    const lim = electrolyteLowerLimit(e);
    if (v === null) {
      alerts.push({ kind: 'refeeding_lab_missing', severity: 'warning', at: [labs.at], message: `${e} not measured (or unit not recognised) — required during refeeding.` });
    } else if (lim !== null && v < lim) {
      alerts.push({ kind: 'refeeding_lab_low', severity: 'urgent', at: [labs.at], message: `Low ${e} ${v} mmol/L (< ${lim}): correct per local protocol; review feed rate.` });
    }
  }
  return result(config, alerts, []);
}

// ───────────────────────────── Weight rate ─────────────────────────────

/** Observed rate faster than planned by more than the configured tolerance. plannedKgPerWeek: negative for loss. */
export function weightFasterThanPlannedAlert(series: WeightPoint[], plannedKgPerWeek: number, config: NutritionConfig = C): AlertResult {
  const tol = config.monitoring.weightFasterThanPlannedTolerance.value;
  const pts = byDate(series.filter(p => positive(p.weightKg) !== null));
  if (pts.length < 2) return result(config, [], ['weight: need at least 2 readings']);
  if (!Number.isFinite(plannedKgPerWeek) || plannedKgPerWeek === 0) return result(config, [], ['planned rate not set']);
  const a = pts[0]; const b = pts[pts.length - 1];
  const weeks = (new Date(b.at).getTime() - new Date(a.at).getTime()) / (7 * DAY);
  if (weeks <= 0) return result(config, [], ['weight readings on the same date']);
  const observed = (b.weightKg - a.weightKg) / weeks;
  const sameDirection = Math.sign(observed) === Math.sign(plannedKgPerWeek);
  const alerts: NutritionAlert[] = sameDirection && Math.abs(observed) > Math.abs(plannedKgPerWeek) * (1 + tol) ? [{
    kind: 'weight_change_faster_than_planned', severity: 'warning', at: [a.at, b.at],
    message: `Weight changing at ${r2(observed)} kg/week vs planned ${plannedKgPerWeek} kg/week.` }] : [];
  return result(config, alerts, []);
}

// ───────────────────────────── Schedule ─────────────────────────────

export type MonitoringRiskLevel = 'low' | 'medium' | 'high' | 'refeeding_high';

/** Monitoring items by risk level. refeeding_high adds to (does not replace) high. */
export function monitoringSchedule(level: MonitoringRiskLevel, config: NutritionConfig = C) {
  const s = config.monitoring.schedules;
  const items = level === 'refeeding_high' ? [...s.value.high, ...s.value.refeeding_high] : s.value[level];
  return { level, items, configVersion: config.version, source: config.sources[s.sourceId]?.citation ?? s.sourceId };
}
