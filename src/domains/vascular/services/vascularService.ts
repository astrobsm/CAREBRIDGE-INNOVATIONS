/**
 * Persistence and the longitudinal read for PAD assessments.
 *
 * Offline-first through Dexie with a Supabase mirror, on the application's
 * existing sync path, and audited through the existing auditService. One
 * assessment belongs to one limb: a patient with bilateral disease has two
 * independent trajectories, and merging them would average a deteriorating leg
 * against a stable one.
 *
 * The trend arithmetic comes from the shared longitudinalMath module rather
 * than being written again here — the measurements differ, the traps do not.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { logAuditEvent } from '../../../services/auditService';
import type {
  PadAssessment, Side, VascularAlert, VascularIntervention, WifiResult,
  ClinicianOverride,
} from '../types';
import { computeWifi } from './wifiEngine';
import {
  trendFor, MEASURES, valueOf,
  type MeasureTrend, type VascularMeasure,
} from './vascularTrend';

// Re-exported so the service stays the single entry point for callers that
// already have it imported.
import { readAcuteScreen } from './acuteIschaemia';
import {
  assessHealingOutlook, assessReconstructionReadiness, buildVascularAlerts,
  type OutlookResult, type ReadinessResult, type OutlookInput,
} from './healingOutlook';

// Re-exported so the service stays the single entry point for callers that
// already have it imported.
export { trendFor, MEASURES, valueOf };
export type { MeasureTrend, VascularMeasure };

const nowIso = () => new Date().toISOString();

// ── Assessments ─────────────────────────────────────────────────────────────

export async function listAssessments(
  patientId: string, side?: Side,
): Promise<PadAssessment[]> {
  const all = await db.padAssessments.toArray();
  return all
    .filter(a => a.patientId === patientId && (side ? a.side === side : true))
    .sort((a, b) => a.assessedAt.localeCompare(b.assessedAt));
}

export async function getAssessment(id: string): Promise<PadAssessment | undefined> {
  return db.padAssessments.get(id);
}

export interface SaveAssessmentInput {
  assessment: Omit<PadAssessment,
    'id' | 'isBaseline' | 'previousAssessmentId' | 'wifi' | 'createdAt' | 'updatedAt'>;
  createdBy?: string;
}

/**
 * Save an assessment, recomputing WIfI from the measurements it carries.
 *
 * The computed result is stored rather than derived on read, so the record
 * shows what the grades were when the clinician saw them. If the thresholds
 * are later reconfigured, historical assessments keep the grading they were
 * actually acted on — which is what an auditable record requires.
 */
export async function saveAssessment(input: SaveAssessmentInput): Promise<PadAssessment> {
  const ts = nowIso();
  const existing = await listAssessments(input.assessment.patientId, input.assessment.side);
  const previous = existing[existing.length - 1];

  const wifi = computeWifi({
    wound: input.assessment.wound,
    perfusion: input.assessment.perfusion,
    infection: input.assessment.infection,
  });

  const assessment: PadAssessment = {
    ...input.assessment,
    id: uuidv4(),
    isBaseline: existing.length === 0,
    previousAssessmentId: previous?.id,
    wifi,
    createdAt: ts,
    updatedAt: ts,
  };

  await db.padAssessments.add(assessment);
  syncRecord('padAssessments', assessment as unknown as Record<string, unknown>);

  void logAuditEvent(input.createdBy ?? 'system', 'create', 'padAssessment', assessment.id, {
    newValue: {
      patientId: assessment.patientId,
      side: assessment.side,
      wifi: wifi.complete
        ? `W${wifi.wound.grade} I${wifi.ischaemia.grade} fI${wifi.footInfection.grade}`
        : 'incomplete',
      limbThreat: wifi.limbThreat,
    },
  });

  return assessment;
}

export async function finalizeAssessment(
  id: string, clinicianId: string,
): Promise<void> {
  const a = await db.padAssessments.get(id);
  if (!a || a.status === 'finalized') return;
  const ts = nowIso();
  await db.padAssessments.update(id, {
    status: 'finalized', finalizedBy: clinicianId, finalizedAt: ts, updatedAt: ts,
  });
  const fresh = await db.padAssessments.get(id);
  if (fresh) syncRecord('padAssessments', fresh as unknown as Record<string, unknown>);
  void logAuditEvent(clinicianId, 'finalize', 'padAssessment', id, {
    newValue: { status: 'finalized' },
  });
}

/**
 * Record that a clinician disagreed with a computed classification.
 *
 * Appended, never replacing the computed value. The point of the override is
 * not to correct the software but to record that a human looked at it and
 * decided otherwise, with a reason — which is the only way the suggestion can
 * ever be evaluated.
 */
export async function recordOverride(
  id: string, override: Omit<ClinicianOverride, 'at'>,
): Promise<void> {
  const a = await db.padAssessments.get(id);
  if (!a) return;
  const ts = nowIso();
  const entry: ClinicianOverride = { ...override, at: ts };
  const overrides = [...(a.overrides ?? []), entry];

  await db.padAssessments.update(id, { overrides, updatedAt: ts });
  const fresh = await db.padAssessments.get(id);
  if (fresh) syncRecord('padAssessments', fresh as unknown as Record<string, unknown>);

  void logAuditEvent(override.clinicianId, 'override', 'padAssessment', id, {
    oldValue: { [override.field]: override.suggested },
    newValue: { [override.field]: override.clinicianValue, reason: override.reason },
  });
}

// ── Interventions ───────────────────────────────────────────────────────────

export async function addIntervention(
  i: Omit<VascularIntervention, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<VascularIntervention> {
  const ts = nowIso();
  const intervention: VascularIntervention = { ...i, id: uuidv4(), createdAt: ts, updatedAt: ts };
  await db.vascularInterventions.add(intervention);
  syncRecord('vascularInterventions', intervention as unknown as Record<string, unknown>);
  void logAuditEvent(i.operator ?? 'system', 'create', 'vascularIntervention', intervention.id, {
    newValue: { kind: intervention.kind, at: intervention.performedAt },
  });
  return intervention;
}

export async function listInterventions(
  patientId: string, side?: Side,
): Promise<VascularIntervention[]> {
  const all = await db.vascularInterventions.toArray();
  return all
    .filter(i => i.patientId === patientId && (side ? i.side === side : true))
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

// ── The limb overview ───────────────────────────────────────────────────────

export interface LimbOverview {
  side: Side;
  assessments: PadAssessment[];
  baseline?: PadAssessment;
  latest?: PadAssessment;
  interventions: VascularIntervention[];
  wifi: WifiResult | null;
  trends: MeasureTrend[];
  acute: ReturnType<typeof readAcuteScreen>;
  outlook: OutlookResult | null;
  readiness: ReadinessResult | null;
  alerts: VascularAlert[];
  /** Change-from-previous lines, in neutral wording. */
  changeSummary: string[];
}

const TRACKED: VascularMeasure[] = [
  'toe_pressure', 'abi', 'tbi', 'ankle_pressure', 'tcpo2', 'spp',
  'wound_area', 'walking_distance', 'rest_pain_severity',
  'wifi_ischaemia', 'wifi_wound', 'wifi_infection',
];

export interface OverviewOptions {
  diabetes?: boolean;
  hba1cPercent?: number;
  smoker?: boolean;
  renalImpairment?: boolean;
  albuminGL?: number;
  haemoglobinGDl?: number;
}

export async function limbOverview(
  patientId: string, side: Side, options: OverviewOptions = {},
): Promise<LimbOverview> {
  const assessments = await listAssessments(patientId, side);
  const interventions = await listInterventions(patientId, side);
  const baseline = assessments[0];
  const latest = assessments[assessments.length - 1];

  const trends = TRACKED
    .map(m => trendFor(m, assessments))
    .filter(t => t.series.length > 0);

  const acute = readAcuteScreen(latest?.acuteScreen);

  const woundTrend = trends.find(t => t.measure === 'wound_area');
  const toeTrend = trends.find(t => t.measure === 'toe_pressure');

  // Revascularisation between the previous assessment and this one is the
  // single most important thing to know when reading a change in perfusion.
  const previous = assessments.length >= 2 ? assessments[assessments.length - 2] : undefined;
  const revascularisedSince = !!previous && !!latest && interventions.some(
    i => ['angioplasty', 'stent', 'bypass', 'endarterectomy', 'thrombolysis', 'thrombectomy']
      .includes(i.kind)
      && i.performedAt > previous.assessedAt && i.performedAt <= latest.assessedAt,
  );

  let outlook: OutlookResult | null = null;
  let readiness: ReadinessResult | null = null;
  let alerts: VascularAlert[] = [];

  if (latest?.wifi) {
    const outlookInput: OutlookInput = {
      wifi: latest.wifi,
      perfusion: latest.perfusion,
      wound: latest.wound,
      infection: latest.infection,
      restPain: latest.restPain,
      woundAreaChangePercent: woundTrend?.percentChangeFromPrevious ?? null,
      toePressureChangeMmHg: toeTrend?.changeFromPrevious ?? null,
      revascularisedSince,
      ...options,
    };
    outlook = assessHealingOutlook(outlookInput);
    readiness = assessReconstructionReadiness(outlookInput);
    alerts = buildVascularAlerts({
      ...outlookInput,
      acuteConcerning: acute.concerning,
      acuteHeadline: acute.headline,
      acuteEvidence: [...acute.positiveFeatures, ...acute.supportingFindings],
      newAbsentPulse: latest.acuteScreen?.newAbsentPulse,
      newLossOfDopplerSignal: latest.acuteScreen?.newLossOfDopplerSignal,
    });
  }

  // ── Change since the previous visit, in neutral wording ──────────────────
  const changeSummary: string[] = [];
  for (const t of trends) {
    if (t.previous == null || t.current == null || t.changeFromPrevious == null) continue;
    if (t.changeFromPrevious === 0) continue;
    const better = t.lowerIsBetter
      ? t.changeFromPrevious < 0
      : t.changeFromPrevious > 0;
    const word = t.withinNoise ? 'changed (within measurement variability)'
      : better ? 'improved' : 'worsened';
    changeSummary.push(
      `${t.label}: ${t.previous}${t.unit} to ${t.current}${t.unit} — ${word}.`,
    );
  }
  if (revascularisedSince) {
    changeSummary.unshift('Revascularisation was performed between these two assessments.');
  }

  return {
    side, assessments, baseline, latest, interventions,
    wifi: latest?.wifi ?? null,
    trends, acute, outlook, readiness, alerts, changeSummary,
  };
}
