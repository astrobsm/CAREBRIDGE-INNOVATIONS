/**
 * The prediction engine.
 *
 * WHAT THIS IS
 * A transparent, rule-based longitudinal model. It fits observed trajectories
 * and states what they imply if they continue. Every number it produces can be
 * derived by hand from the measurements on screen — which is the point, because
 * a clinician who cannot check a risk estimate has no way to disagree with it.
 *
 * WHAT THIS IS NOT
 * It is not trained, not calibrated against outcomes, and not validated. It has
 * never been shown that a scar this model calls 68% likely to progress does so
 * 68 times in a hundred. It is therefore labelled EXPERIMENTAL everywhere it
 * appears, and the label is part of the output rather than a footnote in the UI.
 *
 * WHY THE PROBABILITIES ARE SHAPED THE WAY THEY ARE
 * The coefficients below are not borrowed from any published model — inventing
 * a plausible-looking regression would be the worst thing this file could do.
 * They are a declared monotone mapping from observed growth to a risk band:
 * more growth, and growth that is accelerating, yields higher risk, with the
 * bands deliberately coarse. The honest claim is ordinal — this scar is at
 * higher risk than that one — and the interface presents it as a band rather
 * than a spuriously precise percentage.
 *
 * Pure functions: no DOM, no database.
 */

import type {
  ConfidenceBand, DomainChange, ScarDomain, ScarPrediction, MultimodalReading,
} from '../types';
import { isAccelerating } from './longitudinal';

export const PREDICTION_MODEL_NAME = 'scar-trajectory-rules';
export const PREDICTION_MODEL_VERSION = 'experimental-1.0.0';

/**
 * Where this model sits on the validation ladder.
 *
 * It will stay EXPERIMENTAL until outcomes have been collected and the
 * predictions checked against them. Moving it is a deliberate act requiring
 * evidence, not a version bump.
 */
export type ValidationStatus =
  | 'experimental'
  | 'internally_validated'
  | 'externally_validated'
  | 'clinically_deployed';

export const PREDICTION_VALIDATION_STATUS: ValidationStatus = 'experimental';

/** What a prediction needs before it will produce anything at all. */
export interface EligibilityPolicy {
  minAssessments: number;
  minFollowUpDays: number;
  /** Assessments whose quality was 'unreliable' do not count toward the above. */
  requireBaseline: boolean;
  /** Horizons this model is willing to speak to, in days. */
  allowedHorizonDays: number[];
}

/**
 * Defaults, deliberately conservative and configurable.
 *
 * Three assessments is the minimum at which acceleration exists at all, and
 * acceleration is the feature that distinguishes a keloid that is taking off
 * from one that is merely large.
 */
export const DEFAULT_ELIGIBILITY: EligibilityPolicy = {
  minAssessments: 3,
  minFollowUpDays: 28,
  requireBaseline: true,
  allowedHorizonDays: [28, 56, 84],
};

export interface PredictionInput {
  changes: DomainChange[];
  reading: MultimodalReading;
  /** Assessments that produced a usable measurement. */
  reliableAssessmentCount: number;
  /** Days from baseline to the most recent assessment. */
  followUpDays: number;
  hasBaseline: boolean;
  /** Worst image-quality score across the series, 0–100. */
  worstImageQuality?: number | null;
  /** True when a treatment was given during the observed window. */
  treatedDuringWindow?: boolean;
  policy?: EligibilityPolicy;
}

const nowIso = () => new Date().toISOString();
const round2 = (v: number) => Math.round(v * 100) / 100;

const findDomain = (changes: DomainChange[], d: ScarDomain) =>
  changes.find(c => c.domain === d);

/** Gate every prediction through the same eligibility check. */
function checkEligibility(input: PredictionInput, horizonDays: number): string[] {
  const policy = input.policy ?? DEFAULT_ELIGIBILITY;
  const reasons: string[] = [];

  if (policy.requireBaseline && !input.hasBaseline) {
    reasons.push('No baseline assessment has been established.');
  }
  if (input.reliableAssessmentCount < policy.minAssessments) {
    reasons.push(
      `Needs ${policy.minAssessments} reliable assessments; ${input.reliableAssessmentCount} recorded.`,
    );
  }
  if (input.followUpDays < policy.minFollowUpDays) {
    reasons.push(
      `Needs ${policy.minFollowUpDays} days of follow-up; ${Math.round(input.followUpDays)} elapsed.`,
    );
  }
  if (!policy.allowedHorizonDays.includes(horizonDays)) {
    reasons.push(
      `This model has not been evaluated for a ${horizonDays}-day horizon.`,
    );
  }
  if (input.worstImageQuality != null && input.worstImageQuality < 40) {
    reasons.push(
      'At least one assessment in the series rests on a frame the quality gate would not accept.',
    );
  }
  return reasons;
}

function ineligible(
  kind: ScarPrediction['kind'],
  horizonDays: number,
  reasons: string[],
): ScarPrediction {
  return {
    kind,
    horizonDays,
    probability: null,
    confidence: 'not_reliable',
    supportingFeatures: [],
    limitations: [
      'Prediction unavailable due to insufficient reliable longitudinal data.',
      `Model ${PREDICTION_MODEL_NAME} ${PREDICTION_MODEL_VERSION} is ${PREDICTION_VALIDATION_STATUS} and has not been validated against outcomes.`,
    ],
    eligible: false,
    ineligibleReasons: reasons,
    modelName: PREDICTION_MODEL_NAME,
    modelVersion: PREDICTION_MODEL_VERSION,
    generatedAt: nowIso(),
  };
}

/** Confidence falls as the evidence thins — it is never asserted independently. */
function confidenceFrom(
  input: PredictionInput,
  reading: MultimodalReading,
): ConfidenceBand {
  if (reading.verdict === 'discordant') return 'low';
  if (input.worstImageQuality != null && input.worstImageQuality < 60) return 'low';
  if (input.reliableAssessmentCount >= 5 && input.followUpDays >= 84) return 'moderate';
  if (input.reliableAssessmentCount >= 4) return 'moderate';
  return 'low';
}

/**
 * Progression risk over a chosen horizon.
 *
 * The band is driven by relative growth per month in the size domains, raised
 * when growth is accelerating and when several modalities agree. Expressed as a
 * band, never as a bare figure, because the underlying mapping is ordinal.
 */
export function predictProgressionRisk(
  input: PredictionInput,
  horizonDays = 84,
): ScarPrediction {
  const reasons = checkEligibility(input, horizonDays);
  if (reasons.length) return ineligible('progression_risk', horizonDays, reasons);

  const area = findDomain(input.changes, 'area');
  const volume = findDomain(input.changes, 'volume');
  const elevation = findDomain(input.changes, 'elevation');

  const supporting: string[] = [];
  const limitations: string[] = [
    `${PREDICTION_MODEL_NAME} ${PREDICTION_MODEL_VERSION} is ${PREDICTION_VALIDATION_STATUS}: `
    + 'the mapping from observed growth to risk is a declared rule, not a model fitted to outcomes. '
    + 'Treat the ordering as meaningful and the absolute percentage as indicative only.',
  ];

  // Relative growth per month in the primary size domain available.
  const sizeDomain = area?.ratePerMonth != null ? area
    : volume?.ratePerMonth != null ? volume
      : null;

  if (!sizeDomain || sizeDomain.ratePerMonth == null || sizeDomain.currentValue == null) {
    return ineligible('progression_risk', horizonDays, [
      'No size domain has a computable rate of change.',
    ]);
  }

  const base = Math.abs(sizeDomain.currentValue);
  const relativeRate = base > 0 ? sizeDomain.ratePerMonth / base : 0;

  supporting.push(
    `${sizeDomain.label} is changing at ${sizeDomain.ratePerMonth} ${sizeDomain.unit}/month `
    + `(${round2(relativeRate * 100)}% of its current size per month).`,
  );

  /**
   * The declared mapping.
   *
   * Growth of roughly 10% a month is the hinge: below it a scar is broadly
   * holding station, above it the trajectory is unmistakable within a couple of
   * months. The bands are wide on purpose — narrower ones would imply a
   * resolution this rule does not have.
   */
  let risk: number;
  if (relativeRate <= 0) risk = 0.10;
  else if (relativeRate < 0.05) risk = 0.25;
  else if (relativeRate < 0.10) risk = 0.40;
  else if (relativeRate < 0.20) risk = 0.60;
  else risk = 0.75;

  if (isAccelerating(sizeDomain)) {
    risk += 0.12;
    supporting.push(
      `Growth is accelerating: the rate rose by ${sizeDomain.accelerationPerMonth} ${sizeDomain.unit}/month `
      + 'between the last two intervals.',
    );
  }

  // Corroboration from independent modalities raises risk; contradiction lowers
  // confidence rather than the number, which is handled separately.
  if (input.reading.verdict === 'concordant_progression') {
    const kinds = new Set(input.reading.worsening.map(c => c.origin)).size;
    if (kinds >= 2) {
      risk += 0.08;
      supporting.push(
        `Independent modalities agree: ${input.reading.worsening.map(c => c.label).join(', ')} all worsening.`,
      );
    }
  }

  if (elevation?.trend === 'worsening') {
    supporting.push(`${elevation.label} is increasing (${elevation.currentValue} ${elevation.unit}).`);
  }

  const symptoms = findDomain(input.changes, 'symptoms');
  if (symptoms?.trend === 'worsening') {
    supporting.push(`Patient-reported symptom burden has risen to ${symptoms.currentValue}/10.`);
  }

  if (input.treatedDuringWindow) {
    limitations.push(
      'Treatment was given during the observed window, so the trajectory reflects the treated course, '
      + 'not the natural history.',
    );
  }
  if (input.reading.verdict === 'discordant') {
    limitations.push('Modalities disagree over the direction; the estimate rests on the size domain alone.');
  }
  for (const l of sizeDomain.limitations) limitations.push(`${sizeDomain.label}: ${l}`);

  return {
    kind: 'progression_risk',
    horizonDays,
    probability: Math.min(0.9, round2(risk)),
    confidence: confidenceFrom(input, input.reading),
    supportingFeatures: supporting,
    limitations,
    eligible: true,
    ineligibleReasons: [],
    modelName: PREDICTION_MODEL_NAME,
    modelVersion: PREDICTION_MODEL_VERSION,
    generatedAt: nowIso(),
  };
}

/**
 * Where a size domain lands if the present rate holds.
 *
 * A straight-line projection, stated as a range and labelled as an
 * extrapolation. The range widens with the horizon because a rate measured over
 * one interval says progressively less the further it is carried, and a range
 * that stayed narrow would imply a precision the single interval cannot carry.
 */
export function predictTrajectory(
  input: PredictionInput,
  domain: ScarDomain = 'area',
  horizonDays = 84,
): ScarPrediction {
  const reasons = checkEligibility(input, horizonDays);
  if (reasons.length) return ineligible('trajectory', horizonDays, reasons);

  const change = findDomain(input.changes, domain);
  if (!change || change.ratePerMonth == null || change.currentValue == null) {
    return ineligible('trajectory', horizonDays, [
      `${change?.label ?? domain} has no computable rate of change.`,
    ]);
  }

  const months = horizonDays / 30;
  const projected = Math.max(0, change.currentValue + change.ratePerMonth * months);

  // Spread grows with the horizon: ±20% of the projected movement per month
  // carried forward, floored so a near-flat trajectory still shows a band.
  const movement = Math.abs(change.ratePerMonth * months);
  const spread = Math.max(movement * 0.4, Math.abs(change.currentValue) * 0.1);

  const limitations = [
    'A straight-line extrapolation of the most recent interval, not a fitted growth model.',
    'Scars rarely change at a constant rate; the range widens with the horizon but cannot capture a change in course.',
    `${PREDICTION_MODEL_NAME} ${PREDICTION_MODEL_VERSION} is ${PREDICTION_VALIDATION_STATUS}.`,
    ...change.limitations.map(l => `${change.label}: ${l}`),
  ];

  return {
    kind: 'trajectory',
    horizonDays,
    probability: null,
    projectedValue: round2(projected),
    projectedRangeLow: round2(Math.max(0, projected - spread)),
    projectedRangeHigh: round2(projected + spread),
    unit: change.unit,
    confidence: confidenceFrom(input, input.reading),
    supportingFeatures: [
      `Currently ${change.currentValue} ${change.unit}, changing at ${change.ratePerMonth} ${change.unit}/month.`,
      `Projected over ${horizonDays} days at the present rate.`,
    ],
    limitations,
    eligible: true,
    ineligibleReasons: [],
    modelName: PREDICTION_MODEL_NAME,
    modelVersion: PREDICTION_MODEL_VERSION,
    generatedAt: nowIso(),
  };
}

/**
 * Whether the treatment given so far is associated with improvement.
 *
 * Deliberately narrow: this reports what happened alongside treatment, and says
 * so. A single scar's course cannot establish that the treatment caused the
 * change, and the wording never implies that it can.
 */
export function predictTreatmentResponse(
  input: PredictionInput,
  horizonDays = 84,
): ScarPrediction {
  if (!input.treatedDuringWindow) {
    return ineligible('treatment_response', horizonDays, [
      'No treatment has been recorded during the observed window.',
    ]);
  }

  const reasons = checkEligibility(input, horizonDays);
  if (reasons.length) return ineligible('treatment_response', horizonDays, reasons);

  const { reading } = input;
  const improving = reading.improving.length;
  const worsening = reading.worsening.length;
  const kinds = new Set(reading.improving.map(c => c.origin)).size;

  let probability: number;
  if (reading.verdict === 'concordant_improvement') {
    probability = kinds >= 3 ? 0.75 : kinds >= 2 ? 0.65 : 0.55;
  } else if (reading.verdict === 'concordant_stable') {
    probability = 0.40;
  } else if (reading.verdict === 'discordant') {
    probability = 0.40;
  } else {
    probability = 0.20;
  }

  return {
    kind: 'treatment_response',
    horizonDays,
    probability: round2(probability),
    confidence: confidenceFrom(input, reading),
    supportingFeatures: [
      `${improving} domain${improving === 1 ? '' : 's'} improving, ${worsening} worsening, across ${kinds} independent modalit${kinds === 1 ? 'y' : 'ies'}.`,
      ...reading.improving.slice(0, 4).map(c =>
        `${c.label}: ${c.percentChangeFromBaseline != null ? `${c.percentChangeFromBaseline}% from baseline` : `now ${c.currentValue} ${c.unit}`}.`),
    ],
    limitations: [
      'This describes what was observed alongside treatment. A single scar’s course cannot establish that the treatment caused the change.',
      `${PREDICTION_MODEL_NAME} ${PREDICTION_MODEL_VERSION} is ${PREDICTION_VALIDATION_STATUS} and uncalibrated: the percentage is indicative, the ordering is what carries meaning.`,
      ...reading.conflicts,
    ],
    eligible: true,
    ineligibleReasons: [],
    modelName: PREDICTION_MODEL_NAME,
    modelVersion: PREDICTION_MODEL_VERSION,
    generatedAt: nowIso(),
  };
}

/** Risk expressed the way it should be read: a band, not a false decimal. */
export function riskBand(p: number | null): string {
  if (p == null) return 'Not estimable';
  if (p < 0.2) return 'Low';
  if (p < 0.45) return 'Moderate';
  if (p < 0.7) return 'High';
  return 'Very high';
}
