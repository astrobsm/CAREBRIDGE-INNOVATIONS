/**
 * Limb volume, measured per side rather than "affected versus contralateral".
 *
 * WHY THE OLD MODEL WAS WRONG
 * The measurement table asked for an affected limb and a contralateral limb and
 * reported the difference. That works for unilateral disease, where the other
 * limb is a genuine control. In BILATERAL lymphoedema there is no control: both
 * limbs are diseased, and subtracting one from the other measures asymmetry
 * between two swollen legs, not excess over normal.
 *
 * Worse, the old calculation returned an excess of 0% whenever no contralateral
 * measurements existed — which is exactly the bilateral case — and that 0 was
 * fed straight into the ISL and Campisi staging functions. A patient with
 * severe bilateral disease was therefore staged as having no volume excess at
 * all. The fix is not to compute a better number; it is to return null and say
 * why, so the staging can decline to use a criterion it does not have.
 *
 * WHAT REPLACES IT
 *   Unilateral  — inter-limb comparison, which is the validated approach.
 *   Bilateral   — each limb against its OWN earlier measurement. Serial
 *                 intra-limb change is the only defensible comparison when
 *                 there is no healthy side, and it needs a baseline to exist.
 *   Neither     — absolute volumes are still reported, and excess is null.
 *
 * Pure functions: no DOM, no database.
 */

export type Side = 'right' | 'left';

export const SIDES: Side[] = ['right', 'left'];

/** One circumference at one standardised point on one limb. */
export interface SiteMeasurement {
  /** Distance from the anatomical landmark, in cm. Defines segment height. */
  distanceFromLandmarkCm: number;
  circumferenceCm: number;
}

export interface LimbMeasurementSet {
  side: Side;
  measurements: SiteMeasurement[];
  measuredAt?: string;
}

export type Laterality = 'right_only' | 'left_only' | 'bilateral' | 'unknown';

/** Which limbs the clinician has marked as affected. */
export function lateralityOf(affected: { right: boolean; left: boolean }): Laterality {
  if (affected.right && affected.left) return 'bilateral';
  if (affected.right) return 'right_only';
  if (affected.left) return 'left_only';
  return 'unknown';
}

// ── Volume ──────────────────────────────────────────────────────────────────

/**
 * Truncated cone (frustum) volume from serial circumferences.
 *
 *   V = h / (12π) × (C₁² + C₁C₂ + C₂²)
 *
 * summed over adjacent pairs. Two measurements are the minimum: a single
 * circumference describes a ring, not a solid, and returning a volume from one
 * would be inventing the limb's length.
 */
export function limbVolumeMl(measurements: SiteMeasurement[]): number | null {
  const usable = measurements
    .filter(m => Number.isFinite(m.circumferenceCm) && m.circumferenceCm > 0
      && Number.isFinite(m.distanceFromLandmarkCm))
    .sort((a, b) => a.distanceFromLandmarkCm - b.distanceFromLandmarkCm);

  if (usable.length < 2) return null;

  let total = 0;
  for (let i = 0; i < usable.length - 1; i++) {
    const c1 = usable[i].circumferenceCm;
    const c2 = usable[i + 1].circumferenceCm;
    const h = Math.abs(usable[i + 1].distanceFromLandmarkCm - usable[i].distanceFromLandmarkCm);
    if (h === 0) continue;   // two readings at the same level add no volume
    total += (h / (12 * Math.PI)) * (c1 * c1 + c1 * c2 + c2 * c2);
  }

  return total > 0 ? Math.round(total) : null;
}

// ── Comparison ──────────────────────────────────────────────────────────────

export type ComparisonStrategy =
  | 'inter_limb'        // unilateral: the other limb is a valid control
  | 'intra_limb'        // bilateral: each limb against its own baseline
  | 'unavailable';      // neither is possible; excess is not determinable

export interface SideResult {
  side: Side;
  volumeMl: number | null;
  affected: boolean;
  /** Change against this side's own baseline, when one exists. */
  baselineMl?: number | null;
  changeFromBaselineMl?: number | null;
  changeFromBaselinePercent?: number | null;
}

export interface VolumeAssessment {
  strategy: ComparisonStrategy;
  laterality: Laterality;
  right: SideResult;
  left: SideResult;
  /**
   * Excess volume over the comparator, as a percentage.
   *
   * NULL when it cannot be determined — which is the normal state in bilateral
   * disease with no baseline. Callers must treat null as "unknown" and not as
   * zero; the whole point of this module is that those are different.
   */
  excessPercent: number | null;
  excessMl: number | null;
  /** Difference between the two limbs, whatever the laterality. */
  asymmetryMl: number | null;
  asymmetryPercent: number | null;
  /** What the figures mean and what they do not. Never empty. */
  notes: string[];
  /** What would make the assessment determinable. */
  needed: string[];
}

export interface CompareInput {
  right: SiteMeasurement[];
  left: SiteMeasurement[];
  affected: { right: boolean; left: boolean };
  /** Earlier volumes for the same patient, per side, in ml. */
  baseline?: { right?: number | null; left?: number | null };
}

const pct = (part: number, whole: number): number =>
  Math.round(((part / whole) * 100) * 10) / 10;

/**
 * Compare the two limbs according to what the laterality actually supports.
 *
 * This function's job is as much to refuse as to compute. A number returned
 * here goes on to drive staging and surgical decisions, so "I cannot tell you"
 * has to be one of its answers.
 */
export function compareLimbs(input: CompareInput): VolumeAssessment {
  const laterality = lateralityOf(input.affected);
  const rightVol = limbVolumeMl(input.right);
  const leftVol = limbVolumeMl(input.left);

  const notes: string[] = [];
  const needed: string[] = [];

  const sideResult = (side: Side, volume: number | null): SideResult => {
    const baseline = input.baseline?.[side] ?? null;
    const change = volume != null && baseline != null ? volume - baseline : null;
    return {
      side,
      volumeMl: volume,
      affected: input.affected[side],
      baselineMl: baseline,
      changeFromBaselineMl: change,
      changeFromBaselinePercent:
        change != null && baseline != null && baseline > 0 ? pct(change, baseline) : null,
    };
  };

  const right = sideResult('right', rightVol);
  const left = sideResult('left', leftVol);

  const asymmetryMl = rightVol != null && leftVol != null ? Math.abs(rightVol - leftVol) : null;
  const asymmetryPercent = asymmetryMl != null && rightVol != null && leftVol != null
    ? pct(asymmetryMl, Math.min(rightVol, leftVol))
    : null;

  // ── Unilateral: the other limb is a control ───────────────────────────────
  if (laterality === 'right_only' || laterality === 'left_only') {
    const affectedSide: Side = laterality === 'right_only' ? 'right' : 'left';
    const controlSide: Side = affectedSide === 'right' ? 'left' : 'right';
    const affectedVol = affectedSide === 'right' ? rightVol : leftVol;
    const controlVol = controlSide === 'right' ? rightVol : leftVol;

    if (affectedVol == null || controlVol == null) {
      needed.push(
        affectedVol == null
          ? `At least two circumferences on the ${affectedSide} limb.`
          : `At least two circumferences on the unaffected ${controlSide} limb, which is the comparator.`,
      );
      return {
        strategy: 'unavailable', laterality, right, left,
        excessPercent: null, excessMl: null, asymmetryMl, asymmetryPercent,
        notes: ['Excess volume cannot be calculated until both limbs are measured.'],
        needed,
      };
    }

    const excessMl = affectedVol - controlVol;
    notes.push(
      `Unilateral disease: the ${controlSide} limb is used as the control, which is the `
      + 'validated comparison.',
    );
    if (excessMl < 0) {
      notes.push(
        `The ${affectedSide} limb measures smaller than the ${controlSide}. Check the sides have `
        + 'not been entered the wrong way round, or whether the disease is in fact bilateral.',
      );
    }

    return {
      strategy: 'inter_limb', laterality, right, left,
      excessMl,
      excessPercent: controlVol > 0 ? pct(excessMl, controlVol) : null,
      asymmetryMl, asymmetryPercent, notes, needed,
    };
  }

  // ── Bilateral: no control limb exists ─────────────────────────────────────
  if (laterality === 'bilateral') {
    notes.push(
      'Both limbs are affected, so neither can serve as a control. The difference between them '
      + 'measures asymmetry, not excess over normal, and is not used for staging.',
    );

    const changes = [right, left].filter(
      s => s.changeFromBaselinePercent != null,
    );

    if (!changes.length) {
      needed.push('An earlier volume for at least one limb, so change can be measured against it.');
      notes.push(
        'With no baseline, absolute volumes are reported and excess is left undetermined rather '
        + 'than assumed to be zero.',
      );
      return {
        strategy: 'unavailable', laterality, right, left,
        excessPercent: null, excessMl: null, asymmetryMl, asymmetryPercent, notes, needed,
      };
    }

    // The worse limb drives the figure: staging a bilateral patient on the
    // better leg would understate the disease.
    const worst = changes.reduce((a, b) =>
      (b.changeFromBaselinePercent as number) > (a.changeFromBaselinePercent as number) ? b : a);

    notes.push(
      `Change is measured against each limb's own earlier volume. The ${worst.side} limb has `
      + 'changed most and is used for staging.',
    );

    return {
      strategy: 'intra_limb', laterality, right, left,
      excessPercent: worst.changeFromBaselinePercent ?? null,
      excessMl: worst.changeFromBaselineMl ?? null,
      asymmetryMl, asymmetryPercent, notes, needed,
    };
  }

  // ── Nobody has said which limb is affected ────────────────────────────────
  needed.push('Mark which limb or limbs are affected.');
  return {
    strategy: 'unavailable', laterality, right, left,
    excessPercent: null, excessMl: null, asymmetryMl, asymmetryPercent,
    notes: ['Excess volume needs to know which limb is diseased before it can be computed.'],
    needed,
  };
}

// ── Measurement sites ───────────────────────────────────────────────────────

export interface MeasurementSite {
  locationName: string;
  distanceFromLandmarkCm: number;
  landmark: string;
}

export const LOWER_LIMB_SITES: MeasurementSite[] = [
  { locationName: 'Metatarsals (ball of foot)', distanceFromLandmarkCm: -10, landmark: 'lateral malleolus' },
  { locationName: 'Ankle (malleolus)', distanceFromLandmarkCm: 0, landmark: 'lateral malleolus' },
  { locationName: '10 cm above malleolus', distanceFromLandmarkCm: 10, landmark: 'lateral malleolus' },
  { locationName: '20 cm above malleolus', distanceFromLandmarkCm: 20, landmark: 'lateral malleolus' },
  { locationName: '30 cm above malleolus (calf)', distanceFromLandmarkCm: 30, landmark: 'lateral malleolus' },
  { locationName: 'Patella (knee)', distanceFromLandmarkCm: 40, landmark: 'lateral malleolus' },
  { locationName: '10 cm above patella', distanceFromLandmarkCm: 50, landmark: 'lateral malleolus' },
  { locationName: '20 cm above patella', distanceFromLandmarkCm: 60, landmark: 'lateral malleolus' },
  { locationName: '30 cm above patella (thigh)', distanceFromLandmarkCm: 70, landmark: 'lateral malleolus' },
];

export const UPPER_LIMB_SITES: MeasurementSite[] = [
  { locationName: 'Metacarpals (knuckles)', distanceFromLandmarkCm: -8, landmark: 'ulnar styloid' },
  { locationName: 'Wrist (ulnar styloid)', distanceFromLandmarkCm: 0, landmark: 'ulnar styloid' },
  { locationName: '10 cm above wrist', distanceFromLandmarkCm: 10, landmark: 'ulnar styloid' },
  { locationName: '20 cm above wrist', distanceFromLandmarkCm: 20, landmark: 'ulnar styloid' },
  { locationName: 'Elbow (olecranon)', distanceFromLandmarkCm: 30, landmark: 'ulnar styloid' },
  { locationName: '10 cm above elbow', distanceFromLandmarkCm: 40, landmark: 'ulnar styloid' },
  { locationName: '20 cm above elbow', distanceFromLandmarkCm: 50, landmark: 'ulnar styloid' },
];

/** The sites that apply to a given region. */
export const sitesFor = (region: 'upper' | 'lower'): MeasurementSite[] =>
  region === 'upper' ? UPPER_LIMB_SITES : LOWER_LIMB_SITES;

// ── Per-site sanity ─────────────────────────────────────────────────────────

/**
 * Check a pair of readings at one level for transcription error.
 *
 * A limb that narrows sharply moving proximally, or a side difference of more
 * than about a third, is far more often a mis-keyed number or a swapped column
 * than a real finding — and a wrong circumference propagates into the volume,
 * the stage and the surgical decision.
 */
export function siteWarnings(
  siteName: string, right?: number, left?: number,
): string[] {
  const out: string[] = [];
  const valid = (v?: number) => typeof v === 'number' && Number.isFinite(v) && v > 0;

  if (valid(right) && valid(left)) {
    const bigger = Math.max(right as number, left as number);
    const smaller = Math.min(right as number, left as number);
    if (smaller > 0 && bigger / smaller > 1.35) {
      out.push(
        `${siteName}: the two sides differ by more than a third (${right} vs ${left} cm). `
        + 'Check the readings have not been entered in the wrong columns.',
      );
    }
  }

  for (const [side, v] of [['right', right], ['left', left]] as const) {
    if (valid(v) && ((v as number) < 5 || (v as number) > 200)) {
      out.push(`${siteName}: ${v} cm on the ${side} is outside the plausible range.`);
    }
  }

  return out;
}

/**
 * Check one limb's profile along its length.
 *
 * This is the check that catches real transcription errors, and it is more
 * useful than comparing the two sides. Two legs can legitimately differ by a
 * lot in asymmetric bilateral disease — but a single limb that narrows sharply
 * as you move proximally is describing an anatomy that does not exist. The
 * ankle is the narrowest part of a normal lower limb; the calf above it is
 * larger, not smaller.
 *
 * So an ankle of 38 cm with 26 cm recorded 10 cm above it is almost certainly a
 * misplaced row or a transposed digit, and it matters because that 26 goes
 * straight into the volume and from there into the stage.
 */
export function limbProfileWarnings(
  sites: MeasurementSite[],
  values: (number | undefined)[],
  side: Side,
): string[] {
  const out: string[] = [];

  const points = sites
    .map((s, i) => ({ site: s, value: values[i] }))
    .filter((p): p is { site: MeasurementSite; value: number } =>
      typeof p.value === 'number' && Number.isFinite(p.value) && p.value > 0)
    .sort((a, b) => a.site.distanceFromLandmarkCm - b.site.distanceFromLandmarkCm);

  for (let i = 0; i < points.length - 1; i++) {
    const lower = points[i];
    const upper = points[i + 1];
    // Below the landmark is the foot or hand, which legitimately narrows.
    if (upper.site.distanceFromLandmarkCm <= 0) continue;

    if (upper.value < lower.value * 0.75) {
      const drop = Math.round((1 - upper.value / lower.value) * 100);
      out.push(
        `${side === 'right' ? 'Right' : 'Left'} limb: ${upper.site.locationName} `
        + `(${upper.value} cm) is ${drop}% narrower than ${lower.site.locationName} `
        + `(${lower.value} cm). A limb does not normally narrow moving upwards — check the row `
        + 'and the value.',
      );
    }
  }

  return out;
}
