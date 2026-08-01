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
 * The healing analytics are pure and live in ./woundAnalytics, so they can be
 * unit-tested without a DB or a browser. They are re-exported from here, so
 * this module stays the single entry point for callers.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import {
  type MonitoredWound,
  type WoundAssessment,
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

// The pure healing analytics live in ./woundAnalytics so they can be unit-tested
// without importing the sync layer (which touches `window` at module scope).
// Re-exported here so this module remains the single entry point for callers.
import {
  MS_PER_WEEK,
  areaVelocityCm2PerWeek,
  computeHealingAnalytics,
  healingAlerts,
} from './woundAnalytics';

export {
  areaVelocityCm2PerWeek,
  computeHealingAnalytics,
  healingAlerts,
} from './woundAnalytics';

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
