/**
 * The profile provider: 3D elevation, configured.
 *
 * This fills the `ReconstructionProvider` extension point that has been sitting
 * empty since the module was built. It is not photogrammetry and does not claim
 * to be — it reports `moderate` quality at best, because a single tangential
 * photograph gives a true height and nothing about the surface behind it.
 *
 * WHY THIS RATHER THAN WAITING FOR PHOTOGRAMMETRY
 * A raised lesion photographed edge-on presents its height directly to the
 * camera. Measuring it from a calibrated profile is ordinary planimetry turned
 * on its side, and it is available today on the phone already in the clinician's
 * hand. Structure-from-motion would give surface contour too, but it needs a
 * capture rig, a reconstruction service, and validation before any of its
 * millimetres could be trusted — and until then, a measured profile height beats
 * an unmeasured field.
 *
 * When a real reconstruction engine is registered later it simply replaces this
 * one: same interface, same call site, no change to the assessment workflow.
 */

import type {
  ReconstructionProvider, ReconstructionRequest,
} from './reconstruction3d';
import { registerReconstructionProvider } from './reconstruction3d';
import type { ReconstructionQuality, Scar3DMeasurement } from '../types';
import { measureProfile, PROFILE_METHOD, PROFILE_METHOD_VERSION } from './profileElevation';

export const PROFILE_PROVIDER_NAME = 'Calibrated profile measurement';

/**
 * Judge whether the captured profile can support a measurement.
 *
 * Never 'high': that band is reserved for a reconstruction that has actually
 * recovered a surface. A profile measurement is a good height and no surface at
 * all, and labelling it 'high' would misrepresent what is known.
 */
function judge(request: ReconstructionRequest): { quality: ReconstructionQuality; reasons: string[] } {
  const reasons: string[] = [];
  const frame = request.frames[0];

  if (!frame) {
    return { quality: 'failed', reasons: ['No profile photograph was captured.'] };
  }
  if (!request.profile?.baseline || !request.profile?.outline?.length) {
    return {
      quality: 'failed',
      reasons: ['The skin line and the raised outline were not both marked on the profile view.'],
    };
  }
  if (frame.pixelsPerCm == null) {
    return {
      quality: 'failed',
      reasons: [
        'The profile photograph has no calibration marker, so a height in millimetres cannot be '
        + 'derived from it.',
      ],
    };
  }

  reasons.push(
    'Height is measured from one tangential view; surface contour and true surface area are not '
    + 'recovered and remain unmeasured.',
  );

  if (!request.profile.tangentialConfirmed) {
    reasons.push(
      'The clinician has not confirmed the view was tangential, so foreshortening cannot be ruled out.',
    );
    return { quality: 'low', reasons };
  }

  return { quality: 'moderate', reasons };
}

export const profileReconstructionProvider: ReconstructionProvider = {
  name: PROFILE_PROVIDER_NAME,
  version: PROFILE_METHOD_VERSION,

  // Needs no hardware beyond the camera already used for every other view.
  async isAvailable() { return true; },

  async assessQuality(request) { return judge(request); },

  async reconstruct(request): Promise<Scar3DMeasurement> {
    const verdict = judge(request);
    const frame = request.frames[0];

    if (verdict.quality === 'failed') {
      return {
        quality: 'failed',
        maxElevationMm: null,
        meanElevationMm: null,
        volumeCm3: null,
        surfaceAreaCm2: null,
        imageCount: request.frames.length,
        limitations: verdict.reasons,
      };
    }

    const measurement = measureProfile({
      baseline: request.profile!.baseline,
      profile: request.profile!.outline,
      pixelsPerCm: frame.pixelsPerCm,
      planAreaCm2: request.profile!.planAreaCm2 ?? null,
    });

    if (!measurement.measured) {
      return {
        quality: 'failed',
        maxElevationMm: null,
        meanElevationMm: null,
        volumeCm3: null,
        surfaceAreaCm2: null,
        imageCount: request.frames.length,
        limitations: [...verdict.reasons, ...measurement.limitations],
      };
    }

    return {
      quality: verdict.quality,
      maxElevationMm: measurement.maxElevationMm,
      meanElevationMm: measurement.meanElevationMm,
      volumeCm3: measurement.estimatedVolumeCm3,
      // Left null on purpose: a profile shows an outline, not a surface, and
      // any "surface area" from it would be invented.
      surfaceAreaCm2: null,
      referencePlaneMethod: 'Skin line marked by the clinician on the profile view',
      imageCount: request.frames.length,
      provenance: {
        // Elevation is measured; the volume alongside it is derived, which its
        // own limitation states. Flagged as a prototype because the method has
        // not been validated against callipers or ultrasound.
        origin: 'measured',
        method: PROFILE_METHOD,
        methodVersion: PROFILE_METHOD_VERSION,
        computedAt: new Date().toISOString(),
        isPrototype: true,
        inputImageIds: frame.imageId ? [frame.imageId] : undefined,
      },
      limitations: [...verdict.reasons, ...measurement.limitations],
    };
  },
};

/**
 * Turn profile measurement on.
 *
 * Called once at start-up. Registering here rather than inside the module's
 * pages means the 3D status shown to the clinician is the same wherever it is
 * read from, and swapping in a real reconstruction engine later is a one-line
 * change at this call site.
 */
export function configureProfileReconstruction(): void {
  registerReconstructionProvider(profileReconstructionProvider);
}
