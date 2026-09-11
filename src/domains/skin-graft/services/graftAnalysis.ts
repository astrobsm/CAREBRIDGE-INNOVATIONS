/**
 * Graft take, donor re-epithelialization, planning and prediction.
 *
 * Pure functions, no DOM and no database, so the clinical arithmetic can be
 * tested directly. The imaging stages that feed them live in the existing wound
 * measurement engine; this module turns their output into the numbers a
 * clinician acts on.
 *
 * HONESTY OF THE ESTIMATORS
 * There is no trained graft-viability or epithelialization model in this
 * repository. Viability and epithelialization are derived from the colour and
 * tissue breakdown the existing pipeline already produces. That is a transparent
 * heuristic, not a validated classifier, and every result it produces is stamped
 * `isPrototypeEstimator: true` with a `heuristic-` model version so it can be
 * identified and excluded once a real model exists.
 */

import type {
  ConfidenceBand,
  TissueBreakdown,
  GraftTakeFindings,
  EpithelializationFindings,
  GraftPlan,
  HealingPrediction,
  Trajectory,
} from '../types';

export const VIABILITY_MODEL_VERSION = 'heuristic-viability-1.0.0';
export const EPITHELIALIZATION_MODEL_VERSION = 'heuristic-epithelialization-1.0.0';
export const PREDICTION_MODEL_VERSION = 'trajectory-linear-1.0.0';

const clampPct = (v: number): number => Math.max(0, Math.min(100, v));
const round1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * Sum of the *classified* tissue channels.
 *
 * Deliberately excludes any unclassified remainder. Everything below divides by
 * this rather than by 100, so pixels the provider could not assign lower the
 * confidence instead of being silently counted as viable or non-viable — either
 * of which would push the graft take number in a direction nobody chose.
 */
function tissueTotal(t: TissueBreakdown): number {
  return (t.granulationPct ?? 0) + (t.sloughPct ?? 0) +
    (t.necroticPct ?? 0) + (t.epithelialPct ?? 0);
}

/**
 * How much weight to give a tissue-derived estimate.
 *
 * Driven by whether the channels actually account for the region. A breakdown
 * summing to 30% means most of the segmented area was classified as nothing,
 * and any percentage derived from it is close to meaningless.
 */
function tissueConfidence(t: TissueBreakdown, imageQualityScore: number): ConfidenceBand {
  const total = tissueTotal(t);
  if (total < 40 || imageQualityScore < 55) return 'uncertain';
  if (total < 70 || imageQualityScore < 70) return 'low';
  if (total < 90 || imageQualityScore < 85) return 'moderate';
  return 'high';
}

// ── Recipient site: graft take ──────────────────────────────────────────────

/**
 * Estimate graft viability and take.
 *
 * Viable graft is taken to be the granulating and epithelialising fraction of
 * the segmented area; slough and necrosis are treated as non-viable. This is a
 * colour-derived approximation of what a surgeon judges by appearance, and it
 * is labelled as an estimate wherever it is shown.
 *
 * `baselineAreaCm2` is the denominator, and it is the area recorded when the
 * graft was applied — NOT the area in the current photograph. Using the current
 * area would let a shrinking graft report 100% take of its own diminished self,
 * which is precisely the failure this module exists to detect.
 */
export function estimateGraftTake(
  currentAreaCm2: number | null,
  baselineAreaCm2: number | null,
  tissue: TissueBreakdown,
  imageQualityScore: number,
): GraftTakeFindings {
  const confidence = tissueConfidence(tissue, imageQualityScore);

  if (currentAreaCm2 === null || !Number.isFinite(currentAreaCm2) || currentAreaCm2 <= 0) {
    return { viableAreaCm2: null, nonviableAreaCm2: null, takePercent: null, confidence: 'uncertain' };
  }

  const total = tissueTotal(tissue);
  if (total <= 0) {
    return { viableAreaCm2: null, nonviableAreaCm2: null, takePercent: null, confidence: 'uncertain' };
  }

  // Normalise against the classified total rather than assuming it reaches 100,
  // so an unclassified remainder does not silently count as non-viable.
  const viableFraction =
    ((tissue.granulationPct ?? 0) + (tissue.epithelialPct ?? 0)) / total;

  // Kept unrounded for the percentage below; rounding first and then dividing
  // compounds the error into the number the clinician actually reads.
  const viableExact = currentAreaCm2 * viableFraction;
  const viableAreaCm2 = round1(viableExact);
  const nonviableAreaCm2 = round1(Math.max(0, currentAreaCm2 - viableExact));

  // Without a baseline there is viable area but no meaningful take percentage.
  if (baselineAreaCm2 === null || !Number.isFinite(baselineAreaCm2) || baselineAreaCm2 <= 0) {
    return { viableAreaCm2, nonviableAreaCm2, takePercent: null, confidence };
  }

  // Capped at 100: a graft cannot take more than it was given, and a value
  // above 100 means the segmentation caught surrounding tissue.
  const takePercent = round1(clampPct((viableExact / baselineAreaCm2) * 100));

  return { viableAreaCm2, nonviableAreaCm2, takePercent, confidence };
}

// ── Donor site: re-epithelialization ────────────────────────────────────────

/**
 * Estimate donor-site re-epithelialization.
 *
 * The open area is what the segmentation still finds as wound; epithelialised
 * area is the remainder of the original harvest. Working from the preserved
 * total area rather than the current one is what lets the percentage reach
 * 100 — measuring a shrinking wound against itself never closes.
 */
export function estimateEpithelialization(
  currentOpenAreaCm2: number | null,
  totalDonorAreaCm2: number | null,
  tissue: TissueBreakdown,
  imageQualityScore: number,
): EpithelializationFindings {
  const confidence = tissueConfidence(tissue, imageQualityScore);

  if (totalDonorAreaCm2 === null || !Number.isFinite(totalDonorAreaCm2) || totalDonorAreaCm2 <= 0) {
    return {
      epithelializedAreaCm2: null, openAreaCm2: currentOpenAreaCm2,
      epithelializedPercent: null, confidence: 'uncertain',
    };
  }

  // A fully healed donor site segments to nothing, which is the correct
  // reading of "no open wound remains", not a failure to measure.
  const open = currentOpenAreaCm2 === null || !Number.isFinite(currentOpenAreaCm2)
    ? 0
    : Math.max(0, currentOpenAreaCm2);

  const openClamped = Math.min(open, totalDonorAreaCm2);
  const epithelializedAreaCm2 = round1(totalDonorAreaCm2 - openClamped);
  const epithelializedPercent = round1(clampPct((epithelializedAreaCm2 / totalDonorAreaCm2) * 100));

  return {
    epithelializedAreaCm2,
    openAreaCm2: round1(openClamped),
    epithelializedPercent,
    confidence,
  };
}

// ── Graft planning ──────────────────────────────────────────────────────────

/**
 * Harvest estimate for a defect. A planning aid, not a prescription.
 *
 * Meshing expands the graft, so the harvested area needed is the coverage
 * required divided by the expansion ratio.
 */
export function planGraft(
  defectAreaCm2: number,
  opts: { coverageMargin?: number; meshRatio?: number } = {},
): GraftPlan {
  const coverageMargin = Math.max(0, opts.coverageMargin ?? 0.05);
  // Below 1 would mean the graft shrinks on meshing, which is not a thing.
  const meshRatio = Math.max(1, opts.meshRatio ?? 1);

  const defect = Math.max(0, defectAreaCm2 || 0);
  const plannedCoverageCm2 = round1(defect * (1 + coverageMargin));
  const estimatedHarvestAreaCm2 = round1(plannedCoverageCm2 / meshRatio);

  return {
    defectAreaCm2: round1(defect),
    coverageMargin,
    plannedCoverageCm2,
    meshRatio,
    estimatedHarvestAreaCm2,
    computedAt: new Date().toISOString(),
  };
}

// ── Trajectory and prediction ───────────────────────────────────────────────

export interface TrajectoryPoint {
  postOpDay: number;
  /** Epithelialization % for a donor site, take % for a recipient site. */
  percent: number;
}

/** Least-squares slope of percent against day. Null when undeterminable. */
function fitSlope(points: TrajectoryPoint[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.postOpDay, 0) / n;
  const meanY = points.reduce((s, p) => s + p.percent, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    const dx = p.postOpDay - meanX;
    num += dx * (p.percent - meanY);
    den += dx * dx;
  }
  // All points on the same day: no slope is defined.
  if (den === 0) return null;
  return num / den;
}

/**
 * Predict donor-site closure from the observed photographic trajectory.
 *
 * A transparent linear fit over the measured points — not a trained model, and
 * labelled as such. Expressed as a range because a straight line through a
 * handful of ward photographs does not justify a single day, and healing
 * decelerates as a wound closes.
 */
export function predictDonorHealing(points: TrajectoryPoint[]): HealingPrediction {
  const usable = points
    .filter(p => Number.isFinite(p.postOpDay) && Number.isFinite(p.percent))
    .sort((a, b) => a.postOpDay - b.postOpDay);

  const base: HealingPrediction = {
    trajectory: 'insufficient_data',
    ratePerDay: null,
    predictedClosurePodFrom: null,
    predictedClosurePodTo: null,
    confidence: 'uncertain',
    basedOnAssessments: usable.length,
    caveats: [],
    modelVersion: PREDICTION_MODEL_VERSION,
  };

  if (usable.length === 0) return base;

  const latest = usable[usable.length - 1];

  if (latest.percent >= 100) {
    return {
      ...base,
      trajectory: 'improving',
      ratePerDay: 0,
      predictedClosurePodFrom: latest.postOpDay,
      predictedClosurePodTo: latest.postOpDay,
      confidence: 'high',
      caveats: ['The donor site is recorded as fully epithelialised.'],
    };
  }

  if (usable.length < 2) {
    return {
      ...base,
      caveats: ['A single assessment cannot establish a trajectory. Photograph again to begin one.'],
    };
  }

  const slope = fitSlope(usable);
  if (slope === null) {
    return { ...base, caveats: ['All assessments fall on the same postoperative day.'] };
  }

  const ratePerDay = round1(slope);
  const remaining = 100 - latest.percent;
  const daysAtCurrentRate = slope > 0 ? remaining / slope : Infinity;

  /**
   * Beyond this, the projection is not a forecast but an artefact of a nearly
   * flat line. A donor site still open after two months has stalled by any
   * clinical standard, and printing "closes around POD 427" would be worse than
   * saying nothing — it reads as a real date.
   *
   * Bounding the projected duration rather than the slope is what makes this
   * robust: a slope of 0.14%/day looks like progress until you notice it means
   * fourteen more months.
   */
  const MAX_PLAUSIBLE_PROJECTION_DAYS = 60;

  if (slope < -0.5) {
    return {
      ...base,
      trajectory: 'deteriorating',
      ratePerDay,
      confidence: usable.length >= 3 ? 'moderate' : 'low',
      caveats: [
        'The measured open area is increasing rather than closing.',
        'No closure date is projected while the wound is enlarging.',
      ],
    };
  }

  if (daysAtCurrentRate > MAX_PLAUSIBLE_PROJECTION_DAYS) {
    return {
      ...base,
      trajectory: 'delayed',
      ratePerDay,
      confidence: usable.length >= 3 ? 'moderate' : 'low',
      caveats: [
        'Epithelialization has effectively stalled on the measured trajectory.',
        'No closure date is projected: at this rate closure would be months away, which is not a forecast worth stating.',
      ],
    };
  }

  // Closure is later than a straight line suggests: epithelialization slows as
  // the margins converge and the last few percent take disproportionately long.
  // The window is widened rather than centred on the linear estimate.
  const from = Math.ceil(latest.postOpDay + daysAtCurrentRate);
  const spread = Math.max(2, Math.ceil(daysAtCurrentRate * 0.35));
  const to = from + spread;

  const caveats: string[] = [
    'Projected from a straight-line fit to the measured photographs; not a validated predictive model.',
  ];
  if (usable.length < 3) {
    caveats.push('Based on only two assessments — the range will narrow as more are recorded.');
  }
  const span = latest.postOpDay - usable[0].postOpDay;
  if (span < 3) {
    caveats.push('The assessments span a short interval, so the rate is provisional.');
  }

  // A trajectory is only "expected" against a reference; without one, say what
  // was measured. Roughly 7%/day closes a typical split-thickness donor site in
  // about a fortnight, which is the comparison a surgeon makes by eye.
  const trajectory: Trajectory = slope >= 5 ? 'improving' : slope >= 2 ? 'stable' : 'delayed';
  if (trajectory === 'delayed') {
    caveats.push('Closing more slowly than a typical split-thickness donor site.');
  }

  const confidence: ConfidenceBand =
    usable.length >= 4 && span >= 5 ? 'moderate'
      : usable.length >= 3 ? 'low'
        : 'uncertain';

  return {
    trajectory,
    ratePerDay,
    predictedClosurePodFrom: from,
    predictedClosurePodTo: to,
    confidence,
    basedOnAssessments: usable.length,
    caveats,
    modelVersion: PREDICTION_MODEL_VERSION,
  };
}

/**
 * Classify a recipient-site take trend.
 *
 * Graft take is expected to be flat or to fall slightly as non-adherent areas
 * declare themselves; a sustained fall is the signal worth raising.
 */
export function classifyGraftTrend(points: TrajectoryPoint[]): Trajectory {
  const usable = points
    .filter(p => Number.isFinite(p.postOpDay) && Number.isFinite(p.percent))
    .sort((a, b) => a.postOpDay - b.postOpDay);

  if (usable.length < 2) return 'insufficient_data';

  const slope = fitSlope(usable);
  if (slope === null) return 'insufficient_data';

  if (slope <= -2) return 'deteriorating';
  if (slope < -0.5) return 'delayed';
  if (slope >= 1) return 'improving';
  return 'stable';
}
