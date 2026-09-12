/**
 * Persistence and orchestration for scar monitoring.
 *
 * Offline-first through Dexie with a Supabase mirror, using the application's
 * existing sync path — a ward phone records an assessment with no signal and it
 * reaches the desk computer when there is one. Audit goes through the existing
 * `auditService`; nothing here builds a second one.
 *
 * FINALIZED ASSESSMENTS ARE IMMUTABLE
 * Once finalized, an assessment is never edited in place. A correction appends
 * to `corrections` with the old value, the new one, who made it and why. A scar
 * record whose history can be quietly rewritten cannot support the longitudinal
 * claims the rest of this module makes.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { logAuditEvent } from '../../../services/auditService';
import type {
  DomainChange, MultimodalReading, ScarAlert, ScarAssessment, ScarCase,
  ScarCorrection, ScarDomain, ScarTreatment, TreatmentResponseIndex,
  ScarPrediction, AssessmentQuality, ValidatedScoreEntry,
} from '../types';
import { analyseDomain, type SeriesPoint } from './longitudinal';
import {
  readMultimodal, compareCaptureConditions, compareMeasurementMethods,
  summariseIntelligence, type IntelligenceSummary,
} from './multimodal';
import {
  predictProgressionRisk, predictTrajectory, predictTreatmentResponse,
  type PredictionInput,
} from './scarPrediction';
import { computeResponseIndex, buildAlerts } from './responseAndAlerts';
import { getScale, scoreScale } from '../data/scales';

const nowIso = () => new Date().toISOString();

// ── Scar cases ──────────────────────────────────────────────────────────────

export interface CreateScarInput {
  patientId: string;
  hospitalId?: string;
  label: string;
  anatomicalSite: string;
  laterality: ScarCase['laterality'];
  classification?: ScarCase['classification']['clinician'];
  onsetAt?: string;
  causeOfScar?: string;
  priorTreatments?: string;
  originalWoundAreaCm2?: number;
  originalWoundSource?: ScarCase['originalWoundSource'];
  createdBy?: string;
}

export async function createScar(input: CreateScarInput): Promise<ScarCase> {
  const ts = nowIso();
  const scar: ScarCase = {
    id: uuidv4(),
    patientId: input.patientId,
    hospitalId: input.hospitalId,
    label: input.label,
    anatomicalSite: input.anatomicalSite,
    laterality: input.laterality,
    classification: input.classification
      ? { clinician: input.classification, clinicianId: input.createdBy, confirmedAt: ts }
      : {},
    onsetAt: input.onsetAt,
    causeOfScar: input.causeOfScar,
    priorTreatments: input.priorTreatments,
    originalWoundAreaCm2: input.originalWoundAreaCm2,
    originalWoundSource: input.originalWoundSource,
    status: 'active',
    createdBy: input.createdBy,
    createdAt: ts,
    updatedAt: ts,
  };

  await db.scarCases.add(scar);
  syncRecord('scarCases', scar as unknown as Record<string, unknown>);
  void logAuditEvent(input.createdBy ?? 'system', 'create', 'scarCase', scar.id, {
    newValue: { label: scar.label, site: scar.anatomicalSite },
  });
  return scar;
}

export async function listScars(patientId?: string): Promise<ScarCase[]> {
  const all = await db.scarCases.toArray();
  return all
    .filter(s => (patientId ? s.patientId === patientId : true) && s.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const getScar = (id: string): Promise<ScarCase | undefined> => db.scarCases.get(id);

/**
 * Record the clinician's classification alongside any suggestion.
 *
 * The suggestion is never cleared. Keeping both is what allows agreement
 * between the module and the clinician to be measured later — and a module
 * that discards its own disagreements can never be evaluated.
 */
export async function confirmClassification(
  scarId: string,
  classification: NonNullable<ScarCase['classification']['clinician']>,
  clinicianId: string,
  overrideReason?: string,
): Promise<void> {
  const scar = await db.scarCases.get(scarId);
  if (!scar) return;

  const previous = { ...scar.classification };
  const updated: ScarCase['classification'] = {
    ...scar.classification,
    clinician: classification,
    clinicianId,
    confirmedAt: nowIso(),
    overrideReason:
      scar.classification.suggested && scar.classification.suggested !== classification
        ? overrideReason ?? 'Clinician classification differs from the suggestion.'
        : undefined,
  };

  await db.scarCases.update(scarId, { classification: updated, updatedAt: nowIso() });
  const fresh = await db.scarCases.get(scarId);
  if (fresh) syncRecord('scarCases', fresh as unknown as Record<string, unknown>);

  void logAuditEvent(clinicianId, 'classify', 'scarCase', scarId, {
    oldValue: previous as unknown as Record<string, unknown>,
    newValue: updated as unknown as Record<string, unknown>,
  });
}

// ── Assessments ─────────────────────────────────────────────────────────────

export async function listAssessments(scarId: string): Promise<ScarAssessment[]> {
  const all = await db.scarAssessments.toArray();
  return all
    .filter(a => a.scarId === scarId && a.status !== 'superseded')
    .sort((a, b) => a.assessedAt.localeCompare(b.assessedAt));
}

/**
 * Proportion of the intended dataset actually captured.
 *
 * Explicitly NOT a confidence figure. A fully populated assessment built on a
 * blurred photograph scores 100% complete and remains unreliable, which is why
 * quality is computed separately and shown beside it.
 */
export function completenessOf(a: ScarAssessment): { percent: number; parts: { label: string; done: boolean }[] } {
  const parts = [
    { label: 'Photography', done: a.images.length > 0 },
    { label: 'Calibration', done: a.images.some(i => i.pixelsPerCm != null) },
    { label: 'Scar boundary traced', done: a.regions.some(r => r.role === 'scar') },
    { label: 'Reference skin traced', done: a.regions.some(r => r.role === 'reference_skin') },
    { label: '2D measurements', done: a.morphometry?.areaCm2 != null },
    { label: 'Colour analysis', done: !!a.colour },
    { label: '3D reconstruction', done: a.threeD != null && a.threeD.quality !== 'unavailable' && a.threeD.quality !== 'failed' },
    { label: 'Physical examination', done: !!a.exam?.pliability },
    { label: 'Patient-reported outcomes', done: a.patientReported?.itch != null || a.patientReported?.pain != null },
    { label: 'Validated scales', done: (a.validatedScores?.length ?? 0) > 0 },
  ];
  const done = parts.filter(p => p.done).length;
  return { percent: Math.round((done / parts.length) * 100), parts };
}

/**
 * Judge how far an assessment can be trusted.
 *
 * Driven by the weakest link rather than an average: a perfect examination
 * cannot rescue a measurement taken without calibration, and averaging the two
 * would produce a reassuring middling grade for a record that cannot support
 * the numbers printed on it.
 */
export function judgeQuality(a: ScarAssessment): { quality: AssessmentQuality; reasons: string[] } {
  const reasons: string[] = [];
  let quality: AssessmentQuality = 'high';

  const worstImage = a.images.reduce<number | null>(
    (worst, i) => (worst === null ? i.quality.score : Math.min(worst, i.quality.score)), null,
  );

  if (a.images.length === 0) {
    return { quality: 'unreliable', reasons: ['No photograph was captured.'] };
  }
  if (a.images.some(i => i.quality.verdict === 'recapture')) {
    quality = 'unreliable';
    reasons.push('At least one frame was rejected by the image quality gate.');
  } else if (worstImage != null && worstImage < 60) {
    quality = 'limited';
    reasons.push(`The weakest frame scored ${worstImage}% on the quality gate.`);
  }

  if (!a.images.some(i => i.pixelsPerCm != null)) {
    quality = quality === 'unreliable' ? 'unreliable' : 'limited';
    reasons.push('No calibration marker was detected, so no dimension is reported.');
  }

  if (!a.regions.some(r => r.role === 'scar')) {
    quality = 'unreliable';
    reasons.push('No scar boundary was traced, so nothing was measured.');
  }
  if (!a.regions.some(r => r.role === 'reference_skin')) {
    if (quality === 'high') quality = 'acceptable';
    reasons.push('No reference skin was traced, so colour was not analysed.');
  }

  if (a.threeD && (a.threeD.quality === 'failed' || a.threeD.quality === 'low')) {
    if (quality === 'high') quality = 'acceptable';
    reasons.push('3D reconstruction did not produce usable measurements.');
  }

  if (quality === 'high' && reasons.length === 0) {
    reasons.push('Calibrated, traced, and captured on frames the quality gate accepted.');
  }
  return { quality, reasons };
}

export interface SaveAssessmentInput {
  scarId: string;
  patientId: string;
  assessment: Omit<ScarAssessment,
    'id' | 'quality' | 'qualityReasons' | 'completenessPercent' | 'createdAt' | 'updatedAt' | 'isBaseline' | 'previousAssessmentId'>;
  createdBy?: string;
}

export async function saveAssessment(input: SaveAssessmentInput): Promise<ScarAssessment> {
  const ts = nowIso();
  const existing = await listAssessments(input.scarId);
  const previous = existing[existing.length - 1];

  const draft = {
    ...input.assessment,
    id: uuidv4(),
    isBaseline: existing.length === 0,
    previousAssessmentId: previous?.id,
    createdAt: ts,
    updatedAt: ts,
  } as ScarAssessment;

  const { quality, reasons } = judgeQuality(draft);
  const assessment: ScarAssessment = {
    ...draft,
    quality,
    qualityReasons: reasons,
    completenessPercent: completenessOf(draft).percent,
  };

  await db.scarAssessments.add(assessment);
  syncRecord('scarAssessments', assessment as unknown as Record<string, unknown>);

  if (assessment.isBaseline) {
    await db.scarCases.update(input.scarId, {
      baselineAssessmentId: assessment.id, updatedAt: ts,
    });
    const fresh = await db.scarCases.get(input.scarId);
    if (fresh) syncRecord('scarCases', fresh as unknown as Record<string, unknown>);
  }

  void logAuditEvent(input.createdBy ?? 'system', 'create', 'scarAssessment', assessment.id, {
    newValue: {
      scarId: input.scarId,
      isBaseline: assessment.isBaseline,
      quality: assessment.quality,
      areaCm2: assessment.morphometry?.areaCm2 ?? null,
    },
  });
  return assessment;
}

export async function finalizeAssessment(
  assessmentId: string,
  clinicianId: string,
  notes?: string,
): Promise<void> {
  const a = await db.scarAssessments.get(assessmentId);
  if (!a) return;
  if (a.status === 'finalized') return;

  const ts = nowIso();
  await db.scarAssessments.update(assessmentId, {
    status: 'finalized', finalizedBy: clinicianId, finalizedAt: ts,
    clinicianNotes: notes, updatedAt: ts,
  });
  const fresh = await db.scarAssessments.get(assessmentId);
  if (fresh) syncRecord('scarAssessments', fresh as unknown as Record<string, unknown>);

  void logAuditEvent(clinicianId, 'finalize', 'scarAssessment', assessmentId, {
    newValue: { status: 'finalized', quality: a.quality },
  });
}

/**
 * Correct a finalized assessment without destroying what it said.
 *
 * The previous value is kept in the correction entry, so the record shows both
 * what was recorded at the time and what it was later changed to. Anything else
 * would let today's judgement silently rewrite what was seen three months ago.
 */
export async function correctAssessment(
  assessmentId: string,
  correction: Omit<ScarCorrection, 'correctedAt'>,
): Promise<void> {
  const a = await db.scarAssessments.get(assessmentId);
  if (!a) return;

  const ts = nowIso();
  const entry: ScarCorrection = { ...correction, correctedAt: ts };
  const corrections = [...(a.corrections ?? []), entry];

  await db.scarAssessments.update(assessmentId, { corrections, updatedAt: ts });
  const fresh = await db.scarAssessments.get(assessmentId);
  if (fresh) syncRecord('scarAssessments', fresh as unknown as Record<string, unknown>);

  void logAuditEvent(correction.correctedBy, 'correct', 'scarAssessment', assessmentId, {
    oldValue: { [correction.field]: correction.previousValue },
    newValue: { [correction.field]: correction.newValue, reason: correction.reason },
  });
}

// ── Treatments ──────────────────────────────────────────────────────────────

export async function addTreatment(
  t: Omit<ScarTreatment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ScarTreatment> {
  const ts = nowIso();
  const treatment: ScarTreatment = { ...t, id: uuidv4(), createdAt: ts, updatedAt: ts };
  await db.scarTreatments.add(treatment);
  syncRecord('scarTreatments', treatment as unknown as Record<string, unknown>);
  void logAuditEvent(t.administeredBy ?? 'system', 'create', 'scarTreatment', treatment.id, {
    newValue: { kind: treatment.kind, at: treatment.administeredAt },
  });
  return treatment;
}

export async function listTreatments(scarId: string): Promise<ScarTreatment[]> {
  const all = await db.scarTreatments.toArray();
  return all
    .filter(t => t.scarId === scarId)
    .sort((a, b) => a.administeredAt.localeCompare(b.administeredAt));
}

// ── The longitudinal read ───────────────────────────────────────────────────

/** Pull one domain's series out of the assessments that actually recorded it. */
function seriesFor(domain: ScarDomain, assessments: ScarAssessment[]): SeriesPoint[] {
  const out: SeriesPoint[] = [];

  for (const a of assessments) {
    let value: number | null | undefined;

    switch (domain) {
      case 'area': value = a.morphometry?.areaCm2; break;
      case 'volume': value = a.threeD?.volumeCm3; break;
      case 'elevation': value = a.threeD?.maxElevationMm; break;
      case 'erythema': value = a.colour?.erythemaIndex; break;
      // Contrast in either direction is the abnormality; the sign says which
      // way, but the magnitude is what should fall as a scar settles.
      case 'pigmentation':
        value = a.colour ? Math.abs(a.colour.pigmentationIndex) : null; break;
      case 'pliability': {
        const grades = { normal: 0, slightly_firm: 1, moderately_firm: 2, very_firm: 3, rigid: 4 };
        value = a.exam?.pliability ? grades[a.exam.pliability] : null;
        break;
      }
      case 'symptoms': {
        // Mean of whichever symptom scores the patient gave, so a partial
        // questionnaire still contributes without being padded with zeros.
        const p = a.patientReported;
        const vals = [p?.pain, p?.itch, p?.tightness, p?.tenderness]
          .filter((v): v is number => typeof v === 'number');
        value = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        break;
      }
      case 'vss':
        value = a.validatedScores?.find(s => s.scaleId === 'vss')?.total; break;
      case 'posas_observer':
        value = a.validatedScores?.find(s => s.scaleId === 'posas')?.subscales?.observer; break;
      case 'posas_patient':
        value = a.validatedScores?.find(s => s.scaleId === 'posas')?.subscales?.patient; break;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ at: a.assessedAt, value });
    }
  }
  return out;
}

const ALL_DOMAINS: ScarDomain[] = [
  'area', 'volume', 'elevation', 'erythema', 'pigmentation',
  'pliability', 'symptoms', 'vss', 'posas_observer', 'posas_patient',
];

export interface ScarOverview {
  scar: ScarCase;
  assessments: ScarAssessment[];
  baseline?: ScarAssessment;
  latest?: ScarAssessment;
  treatments: ScarTreatment[];
  changes: DomainChange[];
  reading: MultimodalReading;
  intelligence: IntelligenceSummary;
  responseIndex: TreatmentResponseIndex;
  predictions: ScarPrediction[];
  alerts: ScarAlert[];
}

const DAY_MS = 86_400_000;

/**
 * Everything the dashboard needs, computed from stored data only.
 *
 * Nothing here is generated to fill a section. Where the data are absent, the
 * corresponding output says so.
 */
export async function overviewFor(scarId: string): Promise<ScarOverview | null> {
  const scar = await db.scarCases.get(scarId);
  if (!scar) return null;

  const assessments = await listAssessments(scarId);
  const treatments = await listTreatments(scarId);
  const baseline = assessments[0];
  const latest = assessments[assessments.length - 1];

  const changes = ALL_DOMAINS
    .map(d => analyseDomain(d, seriesFor(d, assessments)))
    // Domains never recorded at all would otherwise fill the dashboard with
    // rows saying nothing; a domain with a single point is kept, because
    // "measured once" is different from "never measured".
    .filter(c => c.currentValue !== null);

  // Comparability of the frames behind the two most recent assessments.
  const captureWarnings = latest && assessments.length >= 2
    ? compareCaptureConditions({
        previousDevice: assessments[assessments.length - 2].images[0]?.conditions.deviceLabel,
        currentDevice: latest.images[0]?.conditions.deviceLabel,
        previousLighting: assessments[assessments.length - 2].images[0]?.conditions.lighting,
        currentLighting: latest.images[0]?.conditions.lighting,
        previousPixelsPerCm: assessments[assessments.length - 2].images[0]?.pixelsPerCm,
        currentPixelsPerCm: latest.images[0]?.pixelsPerCm,
      })
    : [];

  const methodWarnings = baseline && latest && baseline.id !== latest.id
    ? compareMeasurementMethods(
        baseline.morphometry?.provenance.method,
        latest.morphometry?.provenance.method,
      )
    : [];

  const reading = readMultimodal({ changes, captureWarnings, methodWarnings });
  const intelligence = summariseIntelligence(reading, changes);
  const responseIndex = computeResponseIndex(changes);

  const reliable = assessments.filter(a => a.quality === 'high' || a.quality === 'acceptable');
  const followUpDays = baseline && latest
    ? (new Date(latest.assessedAt).getTime() - new Date(baseline.assessedAt).getTime()) / DAY_MS
    : 0;

  const treatedDuringWindow = baseline != null && treatments.some(
    t => t.administeredAt >= baseline.assessedAt,
  );

  // Growth after the last treatment is what raises recurrence, as distinct from
  // a scar that has simply never responded.
  const lastTreatment = treatments[treatments.length - 1];
  const areaChange = changes.find(c => c.domain === 'area');
  const postTreatmentGrowth = !!lastTreatment
    && !!latest && latest.assessedAt > lastTreatment.administeredAt
    && areaChange?.trend === 'worsening';

  const worstImageQuality = assessments
    .flatMap(a => a.images.map(i => i.quality.score))
    .reduce<number | null>((worst, s) => (worst === null ? s : Math.min(worst, s)), null);

  const predictionInput: PredictionInput = {
    changes,
    reading,
    reliableAssessmentCount: reliable.length,
    followUpDays,
    hasBaseline: !!scar.baselineAssessmentId,
    worstImageQuality,
    treatedDuringWindow,
  };

  const predictions: ScarPrediction[] = [
    predictProgressionRisk(predictionInput, 84),
    predictTrajectory(predictionInput, 'area', 84),
    predictTreatmentResponse(predictionInput, 84),
  ];

  const alerts = buildAlerts({
    scarId,
    patientId: scar.patientId,
    assessmentId: latest?.id,
    changes,
    reading,
    treatedDuringWindow,
    postTreatmentGrowth,
    poorQualityAssessments: assessments.filter(a => a.quality === 'unreliable' || a.quality === 'limited').length,
    captureWarnings,
  });

  return {
    scar, assessments, baseline, latest, treatments,
    changes, reading, intelligence, responseIndex, predictions, alerts,
  };
}

// ── Scoring helper ──────────────────────────────────────────────────────────

/** Score a scale's responses and package them for storage. */
export function buildScoreEntry(
  scaleId: string,
  responses: Record<string, number>,
  completedBy?: string,
): ValidatedScoreEntry | null {
  const scale = getScale(scaleId);
  if (!scale) return null;
  const result = scoreScale(scale, responses);
  return {
    scaleId,
    scaleVersion: scale.version,
    responses,
    total: result.total,
    subscales: result.subscales,
    completedBy,
    completedAt: nowIso(),
    incompleteItems: result.incompleteItems.length ? result.incompleteItems : undefined,
  };
}
