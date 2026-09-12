/**
 * The multimodal consistency and discordance engine.
 *
 * This is the part of the module that earns its keep. Any one modality can
 * mislead: a photograph taken from a different angle measures a different area,
 * a patient's itch score moves with their week, an examiner's sense of firmness
 * drifts. Several independent modalities moving together is far stronger
 * evidence than any of them alone — and when they move apart, that is a
 * finding, not a problem to be averaged away.
 *
 * WHY DISCORDANCE IS AN OUTPUT, NOT A FAILURE
 * A system that always produces a verdict will produce one when the data do not
 * support it. Stable area with rising volume and improving examination is a real
 * clinical situation — often a scar flattening while its footprint stays put, or
 * a measurement problem — and the useful thing to tell a surgeon is exactly
 * which measurements disagree, not a confident average of them.
 *
 * Pure functions: no DOM, no database.
 */

import type {
  ConfidenceBand, DomainChange, MultimodalReading, MultimodalVerdict, DataOrigin,
} from '../types';

export const MULTIMODAL_VERSION = 'multimodal-1.0.0';

/** Reading a change's direction in clinical terms, not arithmetic ones. */
function direction(c: DomainChange): 'better' | 'worse' | 'same' | 'unknown' {
  switch (c.trend) {
    case 'improving': return 'better';
    case 'worsening': return 'worse';
    case 'stable': return 'same';
    default: return 'unknown';
  }
}

/** How a domain reads out loud, with the number that justifies it. */
export function stateChange(c: DomainChange): string {
  const arrow = direction(c) === 'better' ? 'improved'
    : direction(c) === 'worse' ? 'worsened'
      : direction(c) === 'same' ? 'unchanged'
        : 'indeterminate';

  const pct = c.percentChangeFromBaseline;
  const abs = c.absoluteChangeFromBaseline;

  if (pct != null) {
    const sign = pct > 0 ? '+' : '';
    return `${c.label}: ${arrow} (${sign}${pct}% from baseline, now ${c.currentValue} ${c.unit}).`;
  }
  if (abs != null) {
    const sign = abs > 0 ? '+' : '';
    return `${c.label}: ${arrow} (${sign}${abs} ${c.unit} from baseline, now ${c.currentValue} ${c.unit}).`;
  }
  return `${c.label}: ${arrow}.`;
}

/**
 * How many independent *kinds* of evidence are represented.
 *
 * Three photographic measurements from one frame are one modality wearing
 * three hats: area, erythema and pigmentation all fail together if the
 * photograph was bad. Counting distinct origins is what stops a single
 * photograph from being mistaken for corroboration.
 */
function distinctOrigins(changes: DomainChange[]): Set<DataOrigin> {
  return new Set(changes.map(c => c.origin));
}

export interface MultimodalInput {
  changes: DomainChange[];
  /**
   * Raised when the frames being compared were captured differently enough
   * that photographic change may be an artefact of the camera.
   */
  captureWarnings?: string[];
  /**
   * Raised when the boundary behind the compared measurements was produced
   * different ways — one clinician-traced, one machine-segmented.
   */
  methodWarnings?: string[];
}

/**
 * Read every domain together.
 *
 * Domains with an indeterminate trend are excluded from the vote and reported
 * as missing, rather than counted as stable. Absence of evidence is not
 * evidence of stability, and treating it as such would let a thin record read
 * as a settled scar.
 */
export function readMultimodal(input: MultimodalInput): MultimodalReading {
  const usable = input.changes.filter(c => c.trend !== 'indeterminate');
  const missing = input.changes.filter(c => c.trend === 'indeterminate');

  const improving = usable.filter(c => direction(c) === 'better');
  const worsening = usable.filter(c => direction(c) === 'worse');
  const stable = usable.filter(c => direction(c) === 'same');
  const fluctuating = usable.filter(c => c.trend === 'fluctuating');

  const supportingStatements = usable.map(stateChange);
  const conflicts: string[] = [];

  for (const w of input.captureWarnings ?? []) conflicts.push(w);
  for (const w of input.methodWarnings ?? []) conflicts.push(w);

  if (missing.length) {
    supportingStatements.push(
      `Not yet assessable: ${missing.map(m => m.label).join(', ')}.`,
    );
  }

  // ── Not enough to read ────────────────────────────────────────────────────
  if (usable.length === 0) {
    return {
      verdict: 'insufficient_data',
      headline: 'Not enough longitudinal data to read a direction yet.',
      improving, worsening, stable,
      supportingStatements,
      conflicts,
      confidence: 'not_reliable',
    };
  }

  const origins = distinctOrigins(usable);
  const movingOrigins = distinctOrigins([...improving, ...worsening]);

  /**
   * Confidence rests on how many independent kinds of evidence agree, not on
   * how many numbers there are. Two modalities is corroboration; one is a
   * single observation however many figures it produced.
   */
  const confidenceFor = (agreeing: DomainChange[]): ConfidenceBand => {
    const kinds = distinctOrigins(agreeing).size;
    if (kinds >= 3 && agreeing.length >= 4) return 'high';
    if (kinds >= 2 && agreeing.length >= 3) return 'moderate';
    if (agreeing.length >= 2) return 'low';
    return 'not_reliable';
  };

  // ── Genuine disagreement ──────────────────────────────────────────────────
  if (improving.length > 0 && worsening.length > 0) {
    conflicts.push(
      `Improving: ${improving.map(c => c.label).join(', ')}.`,
      `Worsening: ${worsening.map(c => c.label).join(', ')}.`,
    );
    return {
      verdict: 'discordant',
      headline: 'Assessment discordance detected — clinical interpretation required.',
      improving, worsening, stable,
      supportingStatements,
      conflicts,
      // Discordance is stated confidently as discordance; the direction is what
      // cannot be settled, and the confidence band refers to the direction.
      confidence: 'not_reliable',
    };
  }

  if (fluctuating.length > 0 && usable.length >= 3) {
    conflicts.push(
      `Unsettled across the series: ${fluctuating.map(c => c.label).join(', ')}.`,
    );
  }

  // ── Concordant progression ────────────────────────────────────────────────
  if (worsening.length > 0) {
    const kinds = movingOrigins.size;
    return {
      verdict: 'concordant_progression',
      headline: kinds >= 2
        ? 'Multimodal evidence of possible progression.'
        : 'Possible progression on a single modality — corroboration needed.',
      improving, worsening, stable,
      supportingStatements,
      conflicts,
      confidence: confidenceFor(worsening),
    };
  }

  // ── Concordant response ───────────────────────────────────────────────────
  if (improving.length > 0) {
    const kinds = movingOrigins.size;
    return {
      verdict: 'concordant_improvement',
      headline: kinds >= 2
        ? 'Multimodal evidence of treatment response.'
        : 'Improvement on a single modality — corroboration needed.',
      improving, worsening, stable,
      supportingStatements,
      conflicts,
      confidence: confidenceFor(improving),
    };
  }

  // ── Everything measured is holding still ──────────────────────────────────
  return {
    verdict: 'concordant_stable',
    headline: origins.size >= 2
      ? 'Stable across every modality assessed.'
      : 'Stable on the single modality assessed.',
    improving, worsening, stable,
    supportingStatements,
    conflicts,
    confidence: confidenceFor(stable),
  };
}

// ── Capture and method comparability ────────────────────────────────────────

export interface CaptureComparison {
  previousDevice?: string;
  currentDevice?: string;
  previousLighting?: string;
  currentLighting?: string;
  previousPixelsPerCm?: number | null;
  currentPixelsPerCm?: number | null;
}

/**
 * Warn when two photographs were not taken under comparable conditions.
 *
 * A different phone, different light, or a very different working distance
 * changes what the camera records for reasons that have nothing to do with the
 * scar. Silently comparing them produces longitudinal "change" that is purely
 * an artefact — the most insidious failure available to a module like this,
 * because the numbers look perfectly reasonable.
 */
export function compareCaptureConditions(c: CaptureComparison): string[] {
  const out: string[] = [];

  if (c.previousDevice && c.currentDevice && c.previousDevice !== c.currentDevice) {
    out.push(
      `Captured on a different device (${c.previousDevice} → ${c.currentDevice}). `
      + 'Colour measurements in particular are not directly comparable between cameras.',
    );
  }

  if (c.previousLighting && c.currentLighting && c.previousLighting !== c.currentLighting) {
    out.push(
      `Lighting differed between captures (${c.previousLighting} → ${c.currentLighting}), `
      + 'which affects colour more than geometry.',
    );
  }

  const p = c.previousPixelsPerCm;
  const q = c.currentPixelsPerCm;
  if (p != null && q != null && p > 0 && q > 0) {
    const ratio = q / p;
    // Beyond roughly a third either way the working distance changed enough
    // that perspective, not just scale, differs between the frames.
    if (ratio > 1.5 || ratio < 0.67) {
      out.push(
        `Working distance changed substantially between captures (${p.toFixed(1)} → ${q.toFixed(1)} px/cm). `
        + 'Areas remain calibrated, but oblique foreshortening may differ.',
      );
    }
  }

  return out;
}

/**
 * Warn when the boundary behind two measurements was produced different ways.
 *
 * A clinician-traced margin and a machine-segmented one are not the same
 * measurement, and a change between them may be a change of method rather than
 * of scar. The comparison is still offered — refusing it would be worse — but
 * never silently.
 */
export function compareMeasurementMethods(
  baselineMethod: string | undefined,
  currentMethod: string | undefined,
): string[] {
  if (!baselineMethod || !currentMethod) return [];
  if (baselineMethod === currentMethod) return [];
  return [
    `Measurement method differs between assessments (${baselineMethod} → ${currentMethod}). `
    + 'Interpret the longitudinal change with caution: part of it may be method, not scar.',
  ];
}

// ── Clinical intelligence summary ───────────────────────────────────────────

export interface IntelligenceSummary {
  whatChanged: string[];
  directionFavourable: boolean | null;
  consistentAcrossModalities: boolean | null;
  needsAttention: string[];
  limitations: string[];
}

/**
 * The twelve questions a clinician actually asks, answered from stored data.
 *
 * Every line traces to a measurement. Nothing is generated to fill a heading:
 * where there is no data, the heading reports that there is no data.
 */
export function summariseIntelligence(
  reading: MultimodalReading,
  changes: DomainChange[],
): IntelligenceSummary {
  const whatChanged = [...reading.improving, ...reading.worsening].map(stateChange);

  const needsAttention: string[] = [];
  for (const c of reading.worsening) {
    if (c.ratePerMonth != null && c.accelerationPerMonth != null
        && c.ratePerMonth > 0 && c.accelerationPerMonth > 0) {
      needsAttention.push(
        `${c.label} is not only increasing but increasing faster `
        + `(${c.ratePerMonth} ${c.unit}/month, up ${c.accelerationPerMonth} on the previous interval).`,
      );
    }
  }
  if (reading.verdict === 'discordant') {
    needsAttention.push('Modalities disagree; the direction cannot be settled from the data alone.');
  }

  const limitations: string[] = [];
  for (const c of changes) {
    for (const l of c.limitations) limitations.push(`${c.label}: ${l}`);
  }
  for (const conflict of reading.conflicts) limitations.push(conflict);

  const directionFavourable =
    reading.verdict === 'concordant_improvement' ? true
      : reading.verdict === 'concordant_progression' ? false
        : null;

  const consistentAcrossModalities =
    reading.verdict === 'discordant' ? false
      : reading.verdict === 'insufficient_data' ? null
        : distinctOrigins(changes.filter(c => c.trend !== 'indeterminate')).size >= 2;

  return {
    whatChanged: whatChanged.length ? whatChanged : ['No measured domain has changed beyond measurement noise.'],
    directionFavourable,
    consistentAcrossModalities,
    needsAttention,
    limitations,
  };
}
