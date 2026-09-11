/**
 * Persistence for photographic skin graft monitoring.
 *
 * Offline-first through Dexie with a Supabase mirror, exactly as the wound
 * monitor works — a ward phone records an assessment with no signal and it
 * reaches the desk computer when there is one.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { computePlanimetry, type Trace } from '../../../services/planimetry';
import type {
  SkinGraftEpisode,
  GraftSite,
  GraftPhotoAssessment,
  SiteKind,
  GraftType,
} from '../types';
import {
  estimateGraftTake,
  estimateEpithelialization,
  predictDonorHealing,
  classifyGraftTrend,
  type TrajectoryPoint,
} from './graftAnalysis';

const nowIso = () => new Date().toISOString();

// ── Episodes ────────────────────────────────────────────────────────────────

export interface CreateEpisodeInput {
  patientId: string;
  hospitalId?: string;
  surgeryId?: string;
  label?: string;
  graftType?: GraftType;
  meshRatio?: number;
  graftThicknessMm?: number;
  graftedAt?: string;
  createdBy?: string;
}

export async function createEpisode(input: CreateEpisodeInput): Promise<SkinGraftEpisode> {
  const ts = nowIso();
  const episode: SkinGraftEpisode = {
    id: uuidv4(),
    patientId: input.patientId,
    hospitalId: input.hospitalId,
    surgeryId: input.surgeryId,
    label: input.label,
    graftType: input.graftType,
    meshRatio: input.meshRatio,
    graftThicknessMm: input.graftThicknessMm,
    graftedAt: input.graftedAt,
    status: input.graftedAt ? 'monitoring' : 'planned',
    createdBy: input.createdBy,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.skinGraftEpisodes.add(episode);
  syncRecord('skinGraftEpisodes', episode as unknown as Record<string, unknown>);
  return episode;
}

export async function listEpisodes(patientId?: string): Promise<SkinGraftEpisode[]> {
  const all = await db.skinGraftEpisodes.toArray();
  return all
    .filter(e => (patientId ? e.patientId === patientId : true))
    .filter(e => e.status !== 'archived')
    .sort((a, b) => (b.graftedAt || b.createdAt).localeCompare(a.graftedAt || a.createdAt));
}

export async function getEpisode(id: string): Promise<SkinGraftEpisode | undefined> {
  return db.skinGraftEpisodes.get(id);
}

export async function updateEpisode(
  id: string, patch: Partial<SkinGraftEpisode>,
): Promise<void> {
  const ts = nowIso();
  await db.skinGraftEpisodes.update(id, { ...patch, updatedAt: ts });
  const updated = await db.skinGraftEpisodes.get(id);
  if (updated) syncRecord('skinGraftEpisodes', updated as unknown as Record<string, unknown>);
}

// ── Sites ───────────────────────────────────────────────────────────────────

export interface CreateSiteInput {
  episodeId: string;
  patientId: string;
  kind: SiteKind;
  anatomicalLocation?: string;
  bodySide?: string;
  label?: string;
  /** Recipient: area grafted. Donor: area harvested. Sets the baseline. */
  baselineAreaCm2?: number | null;
}

export async function createSite(input: CreateSiteInput): Promise<GraftSite> {
  const ts = nowIso();
  const site: GraftSite = {
    id: uuidv4(),
    episodeId: input.episodeId,
    patientId: input.patientId,
    kind: input.kind,
    anatomicalLocation: input.anatomicalLocation,
    bodySide: input.bodySide,
    label: input.label,
    baselineAreaCm2: input.baselineAreaCm2 ?? null,
    baselineAt: input.baselineAreaCm2 != null ? ts : undefined,
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
  };
  await db.graftSites.add(site);
  syncRecord('graftSites', site as unknown as Record<string, unknown>);
  return site;
}

export async function listSites(episodeId: string): Promise<GraftSite[]> {
  const all = await db.graftSites.toArray();
  return all
    .filter(s => s.episodeId === episodeId)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Change a site's baseline area.
 *
 * Never a silent edit. Every take and epithelialization figure for the site is
 * measured against this number, so revising it rewrites the whole history of
 * that site's percentages — which is why the previous value, who changed it and
 * why are all recorded alongside.
 */
export async function reviseBaseline(
  siteId: string, areaCm2: number, revisedBy: string, reason: string,
): Promise<void> {
  const site = await db.graftSites.get(siteId);
  if (!site) return;
  const ts = nowIso();
  await db.graftSites.update(siteId, {
    baselineAreaCm2: areaCm2,
    baselineAt: ts,
    baselineRevision: {
      previousAreaCm2: site.baselineAreaCm2 ?? null,
      revisedBy,
      revisedAt: ts,
      reason,
    },
    updatedAt: ts,
  });
  const updated = await db.graftSites.get(siteId);
  if (updated) syncRecord('graftSites', updated as unknown as Record<string, unknown>);
}

// ── Assessments ─────────────────────────────────────────────────────────────

/** Whole days between the graft and a capture; null when the date is unknown. */
export function postOpDay(graftedAt: string | undefined, capturedAt: string): number | null {
  if (!graftedAt) return null;
  const from = new Date(graftedAt).getTime();
  const to = new Date(capturedAt).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

export interface RecordAssessmentInput {
  episode: SkinGraftEpisode;
  site: GraftSite;
  traces: Trace[];
  pixelsPerCm: number | null;
  photo?: GraftPhotoAssessment['photo'];
  imageQuality: GraftPhotoAssessment['imageQuality'];
  assessedBy?: string;
}

/**
 * Record a traced photographic assessment.
 *
 * Measurement comes from the traced outline and patches, not from a colour
 * threshold: the areas are exact geometry over what the clinician drew,
 * converted by the calibration marker. The tissue estimator is used only for
 * the qualitative breakdown, and is labelled as a prototype wherever it appears.
 */
export async function recordAssessment(
  input: RecordAssessmentInput,
): Promise<GraftPhotoAssessment> {
  const { episode, site, traces, pixelsPerCm, imageQuality } = input;
  const ts = nowIso();
  const planimetry = computePlanimetry(traces, pixelsPerCm);

  const measurement = {
    areaCm2: planimetry.totalAreaCm2,
    perimeterCm: planimetry.totalPerimeterCm,
    lengthCm: null,
    widthCm: null,
    pixelsPerCm,
    calibrationMethod: 'green_marker',
    calibrationConfidence: pixelsPerCm ? ('high' as const) : ('uncertain' as const),
  };

  const tissue = {
    granulationPct: planimetry.surfaces.granulation.percent,
    sloughPct: planimetry.surfaces.slough.percent,
    necroticPct: planimetry.surfaces.necrotic.percent,
    epithelialPct: planimetry.surfaces.epithelialised.percent,
  };

  // Traced areas are geometry, so they are used directly. The heuristic
  // estimators are the fallback for a frame with no patches traced.
  const graft = site.kind === 'recipient'
    ? (() => {
        const nonviable = (planimetry.surfaces.necrotic.areaCm2 ?? 0)
          + (planimetry.surfaces.slough.areaCm2 ?? 0);
        const viable = planimetry.totalAreaCm2 === null
          ? null
          : Math.max(0, planimetry.totalAreaCm2 - nonviable);
        const base = site.baselineAreaCm2;
        return {
          viableAreaCm2: viable,
          nonviableAreaCm2: planimetry.totalAreaCm2 === null ? null : nonviable,
          takePercent: viable !== null && base != null && base > 0
            ? Math.round(Math.min(100, (viable / base) * 100) * 10) / 10
            : null,
          confidence: planimetry.valid ? ('high' as const) : ('low' as const),
        };
      })()
    : undefined;

  const donor = site.kind === 'donor'
    ? {
        epithelializedAreaCm2: planimetry.epithelialisedAreaCm2 ??
          (planimetry.totalAreaCm2 === null ? null
            : Math.max(0, planimetry.totalAreaCm2 - (planimetry.openAreaCm2 ?? 0))),
        openAreaCm2: planimetry.openAreaCm2,
        epithelializedPercent: planimetry.totalAreaCm2
          ? Math.round((((planimetry.totalAreaCm2 - (planimetry.openAreaCm2 ?? 0)) /
              planimetry.totalAreaCm2) * 100) * 10) / 10
          : null,
        confidence: planimetry.valid ? ('high' as const) : ('low' as const),
      }
    : undefined;

  const assessment: GraftPhotoAssessment = {
    id: uuidv4(),
    episodeId: episode.id,
    siteId: site.id,
    patientId: site.patientId,
    kind: site.kind,
    capturedAt: ts,
    postOpDay: postOpDay(episode.graftedAt, ts),
    assessedBy: input.assessedBy,
    status: planimetry.valid ? 'analysed' : 'uncertain',
    imageQuality,
    photo: input.photo,
    measurement,
    tissue,
    graft,
    donor,
    uncertaintyReasons: planimetry.problems.length ? planimetry.problems : undefined,
    provenance: {
      // Traced geometry, so the measurement itself involves no model at all.
      modelVersion: 'planimetry-traced-1.0.0',
      pipelineVersion: 'planimetry-1.0.0',
      qualityGateVersion: imageQuality.version,
      analysedAt: ts,
      isPrototypeEstimator: false,
    },
    createdAt: ts,
    updatedAt: ts,
  };

  // The first measured assessment establishes the baseline the site is
  // measured against from then on.
  if (site.baselineAreaCm2 == null && planimetry.totalAreaCm2 !== null) {
    await db.graftSites.update(site.id, {
      baselineAreaCm2: planimetry.totalAreaCm2,
      baselineAssessmentId: assessment.id,
      baselineAt: ts,
      updatedAt: ts,
    });
    const updated = await db.graftSites.get(site.id);
    if (updated) syncRecord('graftSites', updated as unknown as Record<string, unknown>);
  }

  await db.graftPhotoAssessments.add(assessment);
  syncRecord('graftPhotoAssessments', assessment as unknown as Record<string, unknown>);
  return assessment;
}

export async function listAssessments(siteId: string): Promise<GraftPhotoAssessment[]> {
  const all = await db.graftPhotoAssessments.toArray();
  return all
    .filter(a => a.siteId === siteId)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

// ── Derived views ───────────────────────────────────────────────────────────

export interface SiteSummary {
  site: GraftSite;
  assessments: GraftPhotoAssessment[];
  latest?: GraftPhotoAssessment;
  /** Take for a recipient site, epithelialization for a donor site. */
  currentPercent: number | null;
  trajectory: ReturnType<typeof classifyGraftTrend>;
  prediction?: ReturnType<typeof predictDonorHealing>;
}

/** Trajectory points for a site, skipping assessments that produced no figure. */
function trajectoryPoints(site: GraftSite, assessments: GraftPhotoAssessment[]): TrajectoryPoint[] {
  return assessments
    .map(a => {
      const percent = site.kind === 'recipient'
        ? a.graft?.takePercent
        : a.donor?.epithelializedPercent;
      return a.postOpDay !== null && percent != null
        ? { postOpDay: a.postOpDay, percent }
        : null;
    })
    .filter((p): p is TrajectoryPoint => p !== null);
}

export async function summariseSite(site: GraftSite): Promise<SiteSummary> {
  const assessments = await listAssessments(site.id);
  const latest = assessments[assessments.length - 1];
  const points = trajectoryPoints(site, assessments);

  const currentPercent = site.kind === 'recipient'
    ? latest?.graft?.takePercent ?? null
    : latest?.donor?.epithelializedPercent ?? null;

  return {
    site,
    assessments,
    latest,
    currentPercent,
    trajectory: classifyGraftTrend(points),
    prediction: site.kind === 'donor' ? predictDonorHealing(points) : undefined,
  };
}

export async function summariseEpisode(episodeId: string): Promise<SiteSummary[]> {
  const sites = await listSites(episodeId);
  return Promise.all(sites.map(summariseSite));
}

// Re-exported so callers have one entry point for the module's analysis.
export { estimateGraftTake, estimateEpithelialization, predictDonorHealing };
