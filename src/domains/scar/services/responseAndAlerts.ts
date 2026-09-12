/**
 * Treatment-response index and clinical alerts.
 *
 * THE INDEX IS A CONVENIENCE, NOT A SCALE
 * The composite score exists so a single line can be plotted over time. It is
 * not validated, it is not a clinical instrument, and it is never shown without
 * the components that produced it. The components are the evidence; the index
 * is a summary of them, and a summary that hid its own inputs would be worse
 * than no summary at all.
 *
 * ALERTS ARE PROMPTS, NOT DIAGNOSES
 * Each carries the measurements that raised it, so a clinician can check the
 * reasoning rather than take the alert on trust. A high-priority alert that is
 * dismissed requires a reason, because the dismissal is itself a clinical
 * decision worth recording.
 *
 * Pure functions: no DOM, no database.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ConfidenceBand, DomainChange, MultimodalReading, ResponseIndexWeights,
  ScarAlert, ScarAlertKind, ScarDomain, TreatmentResponseIndex, AlertPriority,
} from '../types';
import { DEFAULT_RESPONSE_WEIGHTS } from '../types';
import { isAccelerating } from './longitudinal';

export const RESPONSE_INDEX_LABEL = 'Longitudinal treatment-response index (experimental, not a validated scale)';

/** Which measured domains feed each weighted group. */
const DOMAIN_GROUPS: Record<keyof ResponseIndexWeights, ScarDomain[]> = {
  morphology: ['area'],
  elevationVolume: ['volume', 'elevation'],
  colour: ['erythema', 'pigmentation'],
  validatedScore: ['vss', 'posas_observer'],
  symptoms: ['symptoms', 'posas_patient'],
};

/**
 * Build the composite index.
 *
 * Weights for groups with no data are redistributed across the groups that do,
 * rather than counted as zero. Counting a missing domain as no-change would
 * drag every index toward the middle and make a scar with a thin record look
 * more settled than one fully assessed — the opposite of the truth.
 */
export function computeResponseIndex(
  changes: DomainChange[],
  weights: ResponseIndexWeights = DEFAULT_RESPONSE_WEIGHTS,
): TreatmentResponseIndex {
  const components: TreatmentResponseIndex['components'] = [];
  const missingDomains: ScarDomain[] = [];
  const present: { group: keyof ResponseIndexWeights; changes: DomainChange[] }[] = [];

  for (const group of Object.keys(DOMAIN_GROUPS) as (keyof ResponseIndexWeights)[]) {
    const domains = DOMAIN_GROUPS[group];
    const usable = domains
      .map(d => changes.find(c => c.domain === d))
      .filter((c): c is DomainChange => !!c && c.percentChangeFromBaseline != null);

    if (usable.length === 0) {
      for (const d of domains) {
        if (!changes.find(c => c.domain === d && c.percentChangeFromBaseline != null)) {
          missingDomains.push(d);
        }
      }
      continue;
    }
    present.push({ group, changes: usable });
  }

  if (present.length === 0) {
    return {
      score: null,
      components: [],
      missingDomains,
      weights,
      confidence: 'not_reliable',
      label: RESPONSE_INDEX_LABEL,
      limitations: ['No domain has a computable change from baseline yet.'],
    };
  }

  const totalWeight = present.reduce((s, p) => s + weights[p.group], 0);
  let score = 0;

  for (const { group, changes: groupChanges } of present) {
    // Redistribute the missing groups' weight proportionally.
    const weight = weights[group] / totalWeight;

    for (const c of groupChanges) {
      const pct = c.percentChangeFromBaseline as number;
      // Improvement is positive on the index. Every domain here is
      // lower-is-better, so a fall in the measurement is a rise in the score.
      const improvement = c.lowerIsBetter ? -pct : pct;
      const share = weight / groupChanges.length;
      // Clamped: a 400% increase should not swamp every other domain.
      const clamped = Math.max(-100, Math.min(100, improvement));
      const contribution = clamped * share;
      score += contribution;
      components.push({
        domain: c.domain,
        percentChange: pct,
        weight: Math.round(share * 1000) / 1000,
        contribution: Math.round(contribution * 100) / 100,
      });
    }
  }

  const groupsRepresented = present.length;
  const confidence: ConfidenceBand =
    groupsRepresented >= 4 ? 'moderate'
      : groupsRepresented >= 2 ? 'low'
        : 'not_reliable';

  const limitations = [
    'Not a validated clinical scale. A weighted summary of independently measured domains, for trend display only.',
    'The weighting is a configurable institutional choice, not an evidence-derived one.',
  ];
  if (missingDomains.length) {
    limitations.push(
      `Computed without ${missingDomains.join(', ')}; their weight was redistributed across the domains that were measured.`,
    );
  }

  return {
    score: Math.round(score * 10) / 10,
    components,
    missingDomains,
    weights,
    confidence,
    label: RESPONSE_INDEX_LABEL,
    limitations,
  };
}

// ── Alerts ──────────────────────────────────────────────────────────────────

const DISCLAIMER =
  'Decision support based on the recorded measurements. Not a diagnosis; clinical assessment required.';

export interface AlertInput {
  scarId: string;
  patientId: string;
  assessmentId?: string;
  changes: DomainChange[];
  reading: MultimodalReading;
  /** True when treatment was given during the observed window. */
  treatedDuringWindow?: boolean;
  /** True when treatment was completed and the scar has since regrown. */
  postTreatmentGrowth?: boolean;
  /** Frames whose quality gate verdict was not 'accept'. */
  poorQualityAssessments?: number;
  captureWarnings?: string[];
  now?: string;
}

const PRIORITY_RANK: Record<AlertPriority, number> = { high: 0, medium: 1, low: 2 };

const find = (changes: DomainChange[], d: ScarDomain) => changes.find(c => c.domain === d);

function makeAlert(
  input: AlertInput,
  kind: ScarAlertKind,
  priority: AlertPriority,
  message: string,
  evidence: string[],
): ScarAlert {
  const ts = input.now ?? new Date().toISOString();
  return {
    id: uuidv4(),
    scarId: input.scarId,
    patientId: input.patientId,
    assessmentId: input.assessmentId,
    kind,
    priority,
    message,
    evidence,
    disclaimer: DISCLAIMER,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Raise the alerts the measurements justify — and no others.
 *
 * Every threshold here is a measurement-based trigger for a clinician to look,
 * not a claim about what is happening. "Possible" and "may be compatible with"
 * are load-bearing words, not hedging: this module cannot see the patient.
 */
export function buildAlerts(input: AlertInput): ScarAlert[] {
  const out: ScarAlert[] = [];
  const { changes, reading } = input;

  const area = find(changes, 'area');
  const volume = find(changes, 'volume');
  const elevation = find(changes, 'elevation');
  const symptoms = find(changes, 'symptoms');

  // ── Rapid expansion ───────────────────────────────────────────────────────
  if (area && area.trend === 'worsening' && area.ratePerMonth != null && area.currentValue) {
    const relative = area.ratePerMonth / Math.abs(area.currentValue);
    if (relative >= 0.15) {
      const evidence = [
        `Area increasing at ${area.ratePerMonth} cm²/month (${Math.round(relative * 100)}% of current size per month).`,
        area.percentChangeFromBaseline != null
          ? `Up ${area.percentChangeFromBaseline}% from baseline, now ${area.currentValue} cm².`
          : `Now ${area.currentValue} cm².`,
      ];
      if (isAccelerating(area)) {
        evidence.push(`Growth is accelerating: rate up ${area.accelerationPerMonth} cm²/month on the previous interval.`);
      }
      out.push(makeAlert(
        input, 'rapid_expansion', isAccelerating(area) ? 'high' : 'medium',
        'Possible rapid scar/keloid expansion detected.', evidence,
      ));
    }
  }

  // ── 3D domains, only when genuinely measured ──────────────────────────────
  if (volume && volume.trend === 'worsening' && volume.percentChangeFromPrevious != null
      && volume.percentChangeFromPrevious >= 15) {
    out.push(makeAlert(
      input, 'increased_volume', 'medium',
      'Scar volume increased significantly since the previous assessment.',
      [`Volume up ${volume.percentChangeFromPrevious}% since the previous assessment, now ${volume.currentValue} cm³.`],
    ));
  }

  if (elevation && elevation.trend === 'worsening' && elevation.percentChangeFromPrevious != null
      && elevation.percentChangeFromPrevious >= 20) {
    out.push(makeAlert(
      input, 'increased_elevation', 'medium',
      'Significant increase in scar elevation detected.',
      [`Maximum elevation up ${elevation.percentChangeFromPrevious}%, now ${elevation.currentValue} mm.`],
    ));
  }

  // ── Symptoms ──────────────────────────────────────────────────────────────
  if (symptoms && symptoms.trend === 'worsening'
      && symptoms.absoluteChangeFromPrevious != null && symptoms.absoluteChangeFromPrevious >= 2) {
    out.push(makeAlert(
      input, 'increasing_symptoms', 'medium',
      'Patient-reported symptoms have increased.',
      [
        `Symptom burden up ${symptoms.absoluteChangeFromPrevious} points since the previous assessment, now ${symptoms.currentValue}/10.`,
        'Rising itch or pain in a keloid often precedes measurable growth.',
      ],
    ));
  }

  // ── Treatment failure ─────────────────────────────────────────────────────
  //
  // Raised only where treatment was actually given. Calling an untreated scar's
  // lack of improvement a treatment failure would be nonsense.
  if (input.treatedDuringWindow
      && (reading.verdict === 'concordant_stable' || reading.verdict === 'concordant_progression')) {
    const evidence = reading.verdict === 'concordant_progression'
      ? reading.worsening.map(c => `${c.label}: worsening.`)
      : reading.stable.map(c => `${c.label}: unchanged beyond measurement noise.`);
    out.push(makeAlert(
      input, 'possible_treatment_failure', 'medium',
      'Minimal objective improvement despite treatment.',
      evidence.length ? evidence : ['No measured domain has improved since treatment began.'],
    ));
  }

  // ── Recurrence ────────────────────────────────────────────────────────────
  if (input.postTreatmentGrowth && area && area.trend === 'worsening') {
    out.push(makeAlert(
      input, 'possible_recurrence', 'high',
      'Post-treatment growth pattern may be compatible with recurrence. Clinical assessment recommended.',
      [
        `Area has increased since treatment was completed (now ${area.currentValue} cm²`
        + `${area.percentChangeFromBaseline != null ? `, ${area.percentChangeFromBaseline}% from baseline` : ''}).`,
        'Growth after apparent response is the pattern that raises this; it is not itself a diagnosis of recurrence.',
      ],
    ));
  }

  // ── Measurement trustworthiness ───────────────────────────────────────────
  //
  // A data-quality problem is a clinical problem here: every figure above rests
  // on the measurements, and a comparison across incomparable frames produces
  // change that was never in the patient.
  if (input.captureWarnings?.length) {
    out.push(makeAlert(
      input, 'capture_inconsistency', 'low',
      'Capture conditions differ between assessments; interpret photographic change with caution.',
      input.captureWarnings,
    ));
  }

  if ((input.poorQualityAssessments ?? 0) > 0) {
    out.push(makeAlert(
      input, 'measurement_unreliable', 'low',
      'Some assessments in this series rest on frames the quality gate flagged.',
      [`${input.poorQualityAssessments} assessment(s) captured on a flagged frame.`],
    ));
  }

  if (reading.verdict === 'discordant') {
    out.push(makeAlert(
      input, 'morphology_change', 'medium',
      'Assessment discordance detected. Clinical interpretation required.',
      reading.conflicts.length ? reading.conflicts : ['Modalities point in different directions.'],
    ));
  }

  return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
