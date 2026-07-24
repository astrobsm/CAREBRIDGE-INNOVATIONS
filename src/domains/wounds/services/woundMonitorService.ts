/**
 * WoundProgress Monitor — service layer (offline-first, AstroHEALTH data layer).
 *
 * Introduces a FIRST-CLASS longitudinal wound entity on top of the app's
 * existing wound suite. The pre-existing surface (the per-visit `wounds` table,
 * `woundMeasurements`) is per-assessment and cannot follow a single physical
 * wound over time; this service gives each wound an identity and a serial
 * assessment timeline, then derives healing analytics from it.
 *
 * Persistence rides the app's shared offline-first stack:
 *   - IndexedDB (Dexie) tables `monitoredWounds` + `woundAssessments`
 *   - Supabase mirror via `syncRecord` / fullSync (`monitored_wounds`,
 *     `wound_assessments`)
 *
 * The analytics functions are pure so they can be unit-tested without a DB.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import {
  type MonitoredWound,
  type WoundAssessment,
  type HealingAnalytics,
  type HealingStatus,
  type MonitoredWoundSummary,
  HEALING_STATUS_META,
} from '../monitorTypes';

export {
  HEALING_STATUS_META,
};
export type {
  MonitoredWound,
  WoundAssessment,
  HealingAnalytics,
  HealingStatus,
  MonitoredWoundSummary,
} from '../monitorTypes';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Below this fraction of change between two visits, a wound is "not moving".
const STAGNATION_THRESHOLD = 0.03; // 3%

// ── Pure healing analytics ──────────────────────────────────────────────────

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

// ── Persistence (offline-first via Dexie; Supabase mirror via syncRecord) ────

function nowIso(): string {
  return new Date().toISOString();
}

/** All wounds for a patient, newest first. */
export async function listWounds(patientId: string): Promise<MonitoredWound[]> {
  try {
    const wounds = await db.monitoredWounds
      .where('patientId')
      .equals(patientId)
      .toArray();
    return wounds
      .filter(w => w.status !== 'archived')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error('[WoundMonitor] listWounds failed:', e);
    return [];
  }
}

/** Full assessment timeline for one wound (newest first). */
export async function getWoundTimeline(woundId: string): Promise<WoundAssessment[]> {
  try {
    const rows = await db.woundAssessments
      .where('woundId')
      .equals(woundId)
      .toArray();
    return rows.sort(
      (a, b) => new Date(b.assessedAt || b.createdAt).getTime() - new Date(a.assessedAt || a.createdAt).getTime(),
    );
  } catch (e) {
    console.error('[WoundMonitor] getWoundTimeline failed:', e);
    return [];
  }
}

/** Enrich a wound with the latest-assessment rollups + derived healing status. */
async function summariseWound(wound: MonitoredWound): Promise<MonitoredWoundSummary> {
  const assessments = await getWoundTimeline(wound.id);
  const analytics = computeHealingAnalytics(assessments);
  const withArea = assessments.filter(a => a.areaCm2 != null && Number.isFinite(Number(a.areaCm2)));
  const chronological = [...withArea].sort(
    (a, b) => new Date(a.assessedAt || a.createdAt).getTime() - new Date(b.assessedAt || b.createdAt).getTime(),
  );
  const latest = chronological[chronological.length - 1];
  const baseline = chronological[0];

  return {
    ...wound,
    latestAreaCm2: latest ? Number(latest.areaCm2) : null,
    latestAssessmentAt: latest ? (latest.assessedAt || latest.createdAt) : null,
    baselineAreaCm2: baseline ? Number(baseline.areaCm2) : null,
    assessmentCount: assessments.length,
    healingStatus: analytics.status,
    healingVelocityCm2PerWeek: analytics.assessmentCount >= 2 ? analytics.velocityCm2PerWeek : null,
  };
}

export interface MonitorDashboard {
  totalActive: number;
  improving: number;
  stagnant: number;
  worsening: number;
  healedThisWeek: number;
  avgVelocityCm2PerWeek: number | null;
  wounds: MonitoredWoundSummary[];
}

/**
 * The monitor dashboard aggregate across all monitored wounds. Computed
 * client-side from the local mirror so it works fully offline; worsening wounds
 * are surfaced first.
 */
export async function getMonitorDashboard(): Promise<MonitorDashboard> {
  const allWounds = await db.monitoredWounds.toArray();
  const active = allWounds.filter(w => w.status !== 'archived' && w.status !== 'healed');

  const summaries = await Promise.all(active.map(summariseWound));

  // Denormalise patient names for the row labels.
  const patientIds = [...new Set(summaries.map(s => s.patientId))];
  const patientMap = new Map<string, { firstName?: string; lastName?: string; hospitalNumber?: string }>();
  await Promise.all(
    patientIds.map(async pid => {
      try {
        const p = await db.patients.get(pid);
        if (p) patientMap.set(pid, { firstName: p.firstName, lastName: p.lastName, hospitalNumber: p.hospitalNumber });
      } catch { /* ignore */ }
    }),
  );

  const enriched = summaries.map(s => {
    const p = patientMap.get(s.patientId);
    return {
      ...s,
      firstName: p?.firstName,
      lastName: p?.lastName,
      hospitalNumber: s.hospitalNumber || p?.hospitalNumber,
    };
  });

  const statusRank: Record<HealingStatus, number> = {
    worsening: 0, stagnant: 1, insufficient_data: 2, improving: 3, healed: 4,
  };
  enriched.sort((a, b) => statusRank[a.healingStatus || 'insufficient_data'] - statusRank[b.healingStatus || 'insufficient_data']);

  const improving = enriched.filter(w => w.healingStatus === 'improving').length;
  const stagnant = enriched.filter(w => w.healingStatus === 'stagnant').length;
  const worsening = enriched.filter(w => w.healingStatus === 'worsening').length;

  const weekAgo = Date.now() - MS_PER_WEEK;
  const healedThisWeek = allWounds.filter(
    w => w.status === 'healed' && new Date(w.updatedAt).getTime() >= weekAgo,
  ).length;

  const velocities = enriched
    .map(w => w.healingVelocityCm2PerWeek)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const avgVelocityCm2PerWeek = velocities.length
    ? velocities.reduce((s, v) => s + v, 0) / velocities.length
    : null;

  return {
    totalActive: active.length,
    improving,
    stagnant,
    worsening,
    healedThisWeek,
    avgVelocityCm2PerWeek,
    wounds: enriched,
  };
}

export interface CreateWoundInput {
  patientId: string;
  hospitalId?: string;
  hospitalNumber?: string;
  label?: string;
  woundType?: string;
  anatomicalLocation?: string;
  bodySide?: string;
  etiology?: string;
  stage?: string;
  dateFirstSeen?: string;
  dateOfInjury?: string;
  cause?: string;
  createdBy?: string;
}

/** Register a new monitored wound. */
export async function createWound(input: CreateWoundInput): Promise<MonitoredWound> {
  const ts = nowIso();
  const wound: MonitoredWound = {
    id: uuidv4(),
    patientId: input.patientId,
    hospitalId: input.hospitalId,
    hospitalNumber: input.hospitalNumber,
    label: input.label || `${input.anatomicalLocation || 'Wound'}${input.woundType ? ` ${input.woundType}` : ''}`.trim(),
    woundType: input.woundType,
    anatomicalLocation: input.anatomicalLocation,
    bodySide: input.bodySide,
    etiology: input.etiology,
    stage: input.stage,
    dateFirstSeen: input.dateFirstSeen,
    dateOfInjury: input.dateOfInjury,
    cause: input.cause,
    status: 'active',
    createdBy: input.createdBy,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.monitoredWounds.add(wound);
  syncRecord('monitoredWounds', wound as unknown as Record<string, unknown>);
  return wound;
}

/** Append an assessment to a wound's timeline. */
export async function addAssessment(
  input: Omit<WoundAssessment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<WoundAssessment> {
  const ts = nowIso();
  const assessment: WoundAssessment = {
    ...input,
    id: uuidv4(),
    assessedAt: input.assessedAt || ts,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.woundAssessments.add(assessment);
  syncRecord('woundAssessments', assessment as unknown as Record<string, unknown>);

  // Bump the parent wound's updatedAt (and auto-heal when area reaches 0).
  try {
    const wound = await db.monitoredWounds.get(input.woundId);
    if (wound) {
      const patch: Partial<MonitoredWound> = { updatedAt: ts };
      if (Number(assessment.areaCm2) === 0) patch.status = 'healed';
      await db.monitoredWounds.update(input.woundId, patch);
      const updated = await db.monitoredWounds.get(input.woundId);
      if (updated) syncRecord('monitoredWounds', updated as unknown as Record<string, unknown>);
    }
  } catch (e) {
    console.warn('[WoundMonitor] Failed to bump parent wound:', e);
  }

  return assessment;
}

/** Change a wound's lifecycle status (e.g. archive, mark healed, reopen). */
export async function setWoundStatus(woundId: string, status: MonitoredWound['status']): Promise<void> {
  const ts = nowIso();
  await db.monitoredWounds.update(woundId, { status, updatedAt: ts });
  const updated = await db.monitoredWounds.get(woundId);
  if (updated) syncRecord('monitoredWounds', updated as unknown as Record<string, unknown>);
}
