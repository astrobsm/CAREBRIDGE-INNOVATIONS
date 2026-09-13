/**
 * Scar elevation, measured from a calibrated side-on photograph.
 *
 * WHAT THIS IS — AND WHY IT IS NOT PHOTOGRAMMETRY
 * There is still no 3D reconstruction engine here, and this does not pretend to
 * be one. It is something narrower and, for a raised lesion, more dependable: a
 * clinician photographs the scar tangentially so that it stands against the
 * surrounding skin in profile, marks the skin line, and traces the raised
 * outline. Elevation is then the perpendicular distance from that skin line,
 * converted by the same green marker used everywhere else in the module.
 *
 * That makes elevation a *measurement*, not an inference. The height of a
 * pedunculated earlobe keloid seen edge-on is as directly measurable from a
 * calibrated photograph as its width is from an en-face one — it is the same
 * planimetry, turned ninety degrees.
 *
 * WHAT IT CANNOT DO
 * It measures the profile presented to the camera, and nothing behind it. A
 * lesion photographed off-tangent reports a foreshortened height, and the
 * software cannot tell a true tangential view from a nearly-tangential one — so
 * the view is declared by the clinician and recorded as a stated assumption
 * rather than a verified fact. Surface contour and true surface area still need
 * a reconstruction engine and remain unmeasured.
 *
 * Pure functions over geometry: no DOM, no database.
 */

import type { Point } from '../../../services/planimetry';
import { areaPx } from '../../../services/planimetry';

export const PROFILE_METHOD = 'calibrated-profile-planimetry';
export const PROFILE_METHOD_VERSION = '1.0.0';

/** Below this the profile is too small for its height to mean much. */
export const MIN_PROFILE_POINTS = 6;

export interface ProfileInput {
  /** Two points along the skin line, on either side of the lesion. */
  baseline: [Point, Point];
  /** The raised outline, traced in the same frame. */
  profile: Point[];
  pixelsPerCm: number | null;
  /**
   * Plan-view area from the en-face photograph, in cm².
   *
   * Optional, and only used for the volume estimate — elevation needs nothing
   * but the profile itself.
   */
  planAreaCm2?: number | null;
}

export interface ProfileMeasurement {
  maxElevationMm: number | null;
  meanElevationMm: number | null;
  /** Cross-sectional area of the raised part, in the profile plane. */
  crossSectionAreaCm2: number | null;
  /** How wide the lesion sits along the skin line, in the profile view. */
  footprintLengthCm: number | null;
  /** Derived, not measured — see the assumption recorded in `limitations`. */
  estimatedVolumeCm3: number | null;
  limitations: string[];
  /** True when a number was produced at all. */
  measured: boolean;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

const EMPTY: ProfileMeasurement = {
  maxElevationMm: null,
  meanElevationMm: null,
  crossSectionAreaCm2: null,
  footprintLengthCm: null,
  estimatedVolumeCm3: null,
  limitations: [],
  measured: false,
};

/**
 * Measure a traced profile against a marked skin line.
 *
 * The baseline is the reference surface. Measuring against it rather than
 * against the image's own axes is what makes the figure meaningful: on a curved
 * or tilted surface, height above an arbitrary horizontal would include the
 * body's own slope, and a scar on a shoulder would read as raised simply
 * because the shoulder is not level in the frame.
 */
export function measureProfile(input: ProfileInput): ProfileMeasurement {
  const { baseline, profile, pixelsPerCm } = input;
  const limitations: string[] = [];

  if (profile.length < MIN_PROFILE_POINTS) {
    return { ...EMPTY, limitations: ['The raised outline was not traced.'] };
  }

  const [a, b] = baseline;
  const bx = b.x - a.x;
  const by = b.y - a.y;
  const baseLenPx = Math.hypot(bx, by);

  if (baseLenPx < 1) {
    return { ...EMPTY, limitations: ['The two skin-line points are on top of each other.'] };
  }

  // Unit vector along the skin line, and its normal.
  const ux = bx / baseLenPx;
  const uy = by / baseLenPx;
  let nx = -uy;
  let ny = ux;

  // Decide which side of the line is "up" from the lesion itself, so the
  // clinician can mark the skin line in either direction without the sign of
  // the result depending on which point they tapped first.
  const meanSigned = profile.reduce(
    (sum, p) => sum + ((p.x - a.x) * nx + (p.y - a.y) * ny), 0,
  ) / profile.length;
  if (meanSigned < 0) { nx = -nx; ny = -ny; }

  let maxHeightPx = 0;
  let minT = Infinity;
  let maxT = -Infinity;

  for (const p of profile) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const h = dx * nx + dy * ny;       // height above the skin line
    const t = dx * ux + dy * uy;       // position along it
    if (h > maxHeightPx) maxHeightPx = h;
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }

  const footprintPx = maxT - minT;
  const crossSectionPx2 = areaPx(profile);

  if (maxHeightPx <= 0 || footprintPx <= 0 || crossSectionPx2 <= 0) {
    return {
      ...EMPTY,
      limitations: ['The traced outline does not stand above the marked skin line.'],
    };
  }

  // Everything above is dimensionless until a scale exists.
  const hasScale = pixelsPerCm !== null && Number.isFinite(pixelsPerCm) && pixelsPerCm > 0;
  if (!hasScale) {
    return {
      ...EMPTY,
      limitations: [
        'No calibration marker was detected in the profile photograph, so the elevation cannot '
        + 'be given in millimetres. Include the marker flat in the same plane as the profile.',
      ],
    };
  }

  const ppc = pixelsPerCm as number;
  const toCm = (px: number) => px / ppc;
  const toMm = (px: number) => (px / ppc) * 10;

  const maxElevationMm = round2(toMm(maxHeightPx));
  const crossSectionAreaCm2 = round2(crossSectionPx2 / (ppc * ppc));
  const footprintLengthCm = round2(toCm(footprintPx));

  // Mean height of the raised part: its cross-sectional area spread evenly
  // across the footprint it occupies. More faithful than averaging the traced
  // vertices, which would be weighted by wherever the clinician's hand happened
  // to place more points.
  const meanElevationMm = round2((crossSectionAreaCm2 / footprintLengthCm) * 10);

  limitations.push(
    'Elevation is measured from a profile view: it is the height presented to the camera. '
    + 'A view that is not truly tangential foreshortens it, and the software cannot detect that.',
  );

  /**
   * The one assumption the geometry cannot check.
   *
   * The normal is flipped toward whichever side the traced outline sits on, so
   * the skin line can be tapped in either direction without changing the sign.
   * The cost is that a depressed scar traced below the skin line yields the
   * same positive figure as a raised one: both are excursions from the line,
   * and two tapped points cannot say which side is skin and which is lesion.
   *
   * So this is stated rather than silently resolved. On a raised lesion — what
   * this step is for — the figure is a height; on an atrophic or depressed scar
   * the same number is a depth, and reading it as elevation would inflate the
   * Vancouver height item in exactly the wrong direction.
   */
  limitations.push(
    'The figure is the excursion of the outline from the marked skin line, taken as a height '
    + 'because this step is intended for raised lesions. On a depressed or atrophic scar the same '
    + 'measurement is a depth, and should not be recorded as elevation.',
  );

  if (maxElevationMm < 1.5) {
    limitations.push(
      'A lesion this low is near the limit of what a profile photograph resolves; treat small '
      + 'changes in it with caution.',
    );
  }

  // ── Volume: derived, with the assumption stated ──────────────────────────
  //
  // Deliberately separated from everything above. Elevation and cross-section
  // are measured; volume is not — it needs a shape the photographs do not show.
  let estimatedVolumeCm3: number | null = null;
  const planArea = input.planAreaCm2;
  if (planArea != null && Number.isFinite(planArea) && planArea > 0) {
    // Half-ellipsoid over the traced footprint: V = (2/3) · A · h.
    estimatedVolumeCm3 = round2((2 / 3) * planArea * (maxElevationMm / 10));
    limitations.push(
      `Volume is an estimate, not a measurement: it assumes the lesion is a dome over its traced `
      + `area (V = 2/3 × ${planArea} cm² × ${(maxElevationMm / 10).toFixed(2)} cm). The absolute `
      + 'figure depends on that assumption; the trend over time does not, because the same '
      + 'assumption is applied at every visit.',
    );
  } else {
    limitations.push(
      'No volume is estimated: that needs the plan-view area from the front-on photograph as well '
      + 'as the profile.',
    );
  }

  return {
    maxElevationMm,
    meanElevationMm,
    crossSectionAreaCm2,
    footprintLengthCm,
    estimatedVolumeCm3,
    limitations,
    measured: true,
  };
}

/**
 * Plain-language reading of a profile measurement.
 *
 * Vancouver Scar Scale height bands are quoted because that is the scale the
 * clinician is about to fill in, and a measured height is a far better basis
 * for that item than an impression — but the band is offered, never applied.
 */
export function describeProfile(m: ProfileMeasurement): string[] {
  if (!m.measured || m.maxElevationMm === null) return [];

  const h = m.maxElevationMm;
  const band = h < 2 ? 'VSS height 1 (< 2 mm)'
    : h <= 5 ? 'VSS height 2 (2–5 mm)'
      : 'VSS height 3 (> 5 mm)';

  return [
    `Maximum elevation ${h} mm above the marked skin line.`,
    `Mean elevation ${m.meanElevationMm} mm across a ${m.footprintLengthCm} cm footprint.`,
    `Consistent with ${band} — confirm by palpation before recording it.`,
  ];
}

/** The VSS height option a measured elevation corresponds to. */
export function vssHeightFor(maxElevationMm: number | null): number | null {
  if (maxElevationMm === null) return null;
  if (maxElevationMm < 2) return 1;
  if (maxElevationMm <= 5) return 2;
  return 3;
}
