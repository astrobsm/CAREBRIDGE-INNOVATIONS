/**
 * The 3D service boundary.
 *
 * THERE IS NO RECONSTRUCTION ENGINE IN THIS APPLICATION, AND THIS FILE DOES NOT
 * PRETEND OTHERWISE.
 *
 * Elevation and volume cannot be recovered from a single photograph. Every
 * shortcut that looks like it might — inferring height from shading, from
 * erythema, from area, from a nomogram — produces a number with no relationship
 * to the scar in front of you, and it produces it in millimetres, which is
 * exactly the form a surgeon will act on. A fabricated 4.1 mm elevation is far
 * worse than a blank field, because a blank field cannot be believed.
 *
 * So this module exports an interface and a registry, and nothing else. Until a
 * real provider is registered — photogrammetry, LiDAR, structured light, a
 * depth camera — every 3D measurement is null and `quality` is 'unavailable'.
 * The UI shows the gap and what would fill it. The longitudinal engine skips
 * the domain. The prediction engine treats it as missing rather than zero.
 *
 * WHAT A PROVIDER MUST DO
 * Measure elevation against a reference surface fitted to the surrounding
 * unaffected skin, not against an arbitrary image plane — on a curved surface
 * like a chest or a shoulder, an arbitrary plane makes the body's own curvature
 * read as scar elevation.
 */

import type { ReconstructionQuality, Scar3DMeasurement, ScarProvenance } from '../types';

export const THREE_D_INTERFACE_VERSION = '1.0.0';

/** A frame offered to a reconstruction provider, with its viewpoint. */
export interface ReconstructionFrame {
  imageId: string;
  dataUrl: string;
  view: string;
  pixelsPerCm: number | null;
}

export interface ReconstructionRequest {
  frames: ReconstructionFrame[];
  /** The scar boundary as traced on the primary frame, in image pixels. */
  scarPolygon?: { x: number; y: number }[];
  anatomicalSite?: string;
}

/**
 * What a 3D provider must implement.
 *
 * `assessQuality` is separate from `reconstruct` on purpose: the capture
 * workflow needs to tell a clinician that the frames are inadequate while the
 * patient is still there, rather than after a reconstruction has failed.
 */
export interface ReconstructionProvider {
  name: string;
  version: string;
  /** Can this provider run at all here — the device, the browser, the frames? */
  isAvailable(): Promise<boolean>;
  /** Judge the captured set before attempting reconstruction. */
  assessQuality(request: ReconstructionRequest): Promise<{
    quality: ReconstructionQuality;
    reasons: string[];
  }>;
  reconstruct(request: ReconstructionRequest): Promise<Scar3DMeasurement>;
}

let provider: ReconstructionProvider | null = null;

export function registerReconstructionProvider(p: ReconstructionProvider): void {
  provider = p;
}

export function getReconstructionProvider(): ReconstructionProvider | null {
  return provider;
}

/** Guidance for the capture sequence, adapted to where the scar is. */
export function captureSequenceFor(anatomicalSite: string | undefined): string[] {
  const site = (anatomicalSite ?? '').toLowerCase();

  // A protruding structure needs views around it; a flat surface does not, and
  // asking for lateral views of an abdomen wastes the clinician's time.
  if (site.includes('ear')) {
    return ['Front', 'Anterior oblique', 'Posterior oblique', 'Close-up'];
  }
  if (site.includes('nose') || site.includes('lip') || site.includes('face')) {
    return ['Front', 'Left oblique', 'Right oblique', 'Close-up'];
  }
  if (site.includes('hand') || site.includes('finger') || site.includes('foot')) {
    return ['Dorsal', 'Oblique', 'Lateral', 'Close-up'];
  }
  return ['Front', 'Left oblique', 'Right oblique', 'Close-up'];
}

/**
 * The measurement returned when no provider is registered.
 *
 * Every figure is null, never zero. Zero is a measurement — it says the scar is
 * flat — and substituting it for "we did not measure this" would let a raised
 * keloid be recorded as having no elevation at all.
 */
export function unavailableMeasurement(imageCount = 0): Scar3DMeasurement {
  return {
    quality: 'unavailable',
    maxElevationMm: null,
    meanElevationMm: null,
    volumeCm3: null,
    surfaceAreaCm2: null,
    imageCount,
    limitations: [
      'No 3D reconstruction engine is configured, so elevation and volume are not measured.',
      'These cannot be derived from a single photograph, and this module will not estimate them from 2D.',
      'Height can still be recorded by examination on the Vancouver Scar Scale, and by direct '
      + 'measurement with callipers or ultrasound where available.',
    ],
  };
}

/**
 * Attempt reconstruction, failing safely and legibly.
 *
 * A provider that throws, returns a failed reconstruction, or judges the frames
 * inadequate all reach the same place: a measurement with null values and
 * stated reasons. The one thing that never happens is a number appearing
 * without a reconstruction behind it.
 */
export async function reconstruct(
  request: ReconstructionRequest,
): Promise<Scar3DMeasurement> {
  const p = provider;
  if (!p) return unavailableMeasurement(request.frames.length);

  try {
    if (!(await p.isAvailable())) {
      return {
        ...unavailableMeasurement(request.frames.length),
        limitations: [
          `The configured 3D provider (${p.name}) is not available on this device.`,
          'Elevation and volume are not measured, and are not estimated from 2D.',
        ],
      };
    }

    const judged = await p.assessQuality(request);
    if (judged.quality === 'failed' || judged.quality === 'low') {
      return {
        quality: judged.quality,
        maxElevationMm: null,
        meanElevationMm: null,
        volumeCm3: null,
        surfaceAreaCm2: null,
        imageCount: request.frames.length,
        limitations: [
          judged.quality === 'failed'
            ? 'Reconstruction failed, so no 3D measurement is reported.'
            : 'Reconstruction quality was too low for measurements to be clinically meaningful.',
          ...judged.reasons,
          'Retry the capture, or continue with the 2D assessment; nothing is estimated in place of these figures.',
        ],
      };
    }

    const result = await p.reconstruct(request);

    // A provider claiming high quality with no measurements is contradicting
    // itself; trust the measurements, not the label.
    if (result.maxElevationMm == null && result.volumeCm3 == null) {
      return {
        ...result,
        quality: 'failed',
        limitations: [
          'The reconstruction returned no measurements despite reporting success.',
          ...result.limitations,
        ],
      };
    }

    return result;
  } catch (err) {
    return {
      quality: 'failed',
      maxElevationMm: null,
      meanElevationMm: null,
      volumeCm3: null,
      surfaceAreaCm2: null,
      imageCount: request.frames.length,
      limitations: [
        'Reconstruction raised an error, so no 3D measurement is reported.',
        err instanceof Error ? err.message : String(err),
      ],
    };
  }
}

/** Provenance for a 3D result, so it can be found and excluded later. */
export function reconstructionProvenance(p: ReconstructionProvider): ScarProvenance {
  return {
    origin: 'measured',
    method: p.name,
    methodVersion: p.version,
    computedAt: new Date().toISOString(),
    isPrototype: true,
  };
}

/** What the UI tells a clinician about the gap, and how it would be filled. */
export function describe3DStatus(): {
  available: boolean;
  headline: string;
  detail: string;
} {
  if (provider) {
    return {
      available: true,
      headline: `3D via ${provider.name} ${provider.version}`,
      detail: 'Elevation and volume are measured from reconstruction and recorded with their quality.',
    };
  }
  return {
    available: false,
    headline: '3D measurement not configured',
    detail:
      'Elevation, volume and surface contour need a reconstruction engine — photogrammetry, a depth '
      + 'camera, or smartphone LiDAR. None is configured, so these are left unmeasured rather than '
      + 'estimated. Scar height is still captured by examination on the Vancouver Scar Scale, and the '
      + 'module reads area, shape and colour from the calibrated photograph as usual.',
  };
}
