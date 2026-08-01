import { describe, it, expect } from 'vitest';
import { aiWoundMeasurement } from '../services/aiWoundMeasurement';
import type { AiWoundAssessment, WoundMeasurementResult } from '../services/aiWoundMeasurement';

/**
 * Tests for the Vision-enrichment merge.
 *
 * This is the boundary where a language model's opinion is allowed to affect a
 * clinical record, so the rules matter: the AI may supply the qualitative
 * wound-bed read, but it must NEVER silently replace the calibrated on-device
 * geometry — a large disagreement has to surface as a warning instead.
 */

/** Minimal on-device result; only the fields merge touches are meaningful. */
function cvResult(over: Partial<WoundMeasurementResult> = {}): WoundMeasurementResult {
  return {
    length: 4, width: 3, area: 12, perimeter: 11,
    confidence: 0.8,
    boundingBox: { x: 0, y: 0, width: 10, height: 10 },
    contourPoints: [],
    segmentationMask: { width: 10, height: 10, data: new Uint8ClampedArray(400) } as unknown as ImageData,
    measurements: { pixelLength: 0, pixelWidth: 0, pixelArea: 0, pixelPerimeter: 0, calibrationFactor: 10 },
    calibrationMethod: 'green_marker',
    centroid: { x: 5, y: 5 },
    contourCm: [],
    scaleReliable: true,
    calibrationConfidence: 0.9,
    tissue: { granulation: 50, slough: 30, necrotic: 15, epithelial: 5 },
    warnings: [],
    ...over,
  };
}

const ai = (over: Partial<AiWoundAssessment> = {}): AiWoundAssessment => ({
  wound_bed: { granulation_pct: 70, slough_pct: 20, necrotic_pct: 5, epithelialization_pct: 5 },
  ...over,
});

describe('mergeAiAssessment', () => {
  it('returns the on-device result untouched when there is no AI assessment', () => {
    const base = cvResult();
    expect(aiWoundMeasurement.mergeAiAssessment(base, null)).toBe(base);
  });

  it('prefers the AI wound-bed percentages over the on-device colour heuristic', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(cvResult(), ai());
    expect(merged.tissue).toEqual({ granulation: 70, slough: 20, necrotic: 5, epithelial: 5 });
  });

  it('keeps the on-device geometry — the AI never overwrites the measurement', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(
      cvResult(),
      ai({ dimensions: { length_cm: 9, width_cm: 9, area_cm2: 13 } }),
    );
    expect(merged.area).toBe(12);
    expect(merged.length).toBe(4);
    expect(merged.width).toBe(3);
  });

  it('warns when the AI area disagrees with the calibrated area by more than 2x', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(
      cvResult(),
      ai({ dimensions: { area_cm2: 40 } }),
    );
    expect(merged.warnings.some(w => /differs from the measured/i.test(w))).toBe(true);
  });

  it('warns when the AI area is less than half the calibrated area', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(
      cvResult(),
      ai({ dimensions: { area_cm2: 4 } }),
    );
    expect(merged.warnings.some(w => /differs from the measured/i.test(w))).toBe(true);
  });

  it('does not warn when the two areas broadly agree', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(
      cvResult(),
      ai({ dimensions: { area_cm2: 13 } }),
    );
    expect(merged.warnings).toHaveLength(0);
  });

  it('suppresses the size cross-check when the scale was never reliable', () => {
    // Without a trustworthy calibration the on-device area is not a fair
    // benchmark, so disagreeing with it says nothing worth flagging.
    const merged = aiWoundMeasurement.mergeAiAssessment(
      cvResult({ scaleReliable: false }),
      ai({ dimensions: { area_cm2: 40 } }),
    );
    expect(merged.warnings).toHaveLength(0);
  });

  it('does not mutate the original result', () => {
    const base = cvResult();
    aiWoundMeasurement.mergeAiAssessment(base, ai({ dimensions: { area_cm2: 40 } }));
    expect(base.warnings).toHaveLength(0);
    expect(base.tissue).toEqual({ granulation: 50, slough: 30, necrotic: 15, epithelial: 5 });
  });

  it('attaches the assessment so the UI can show the qualitative findings', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(
      cvResult(),
      ai({ healing_stage: 'proliferative', signs_of_infection: ['erythema'] }),
    );
    expect(merged.aiAssessment?.healing_stage).toBe('proliferative');
    expect(merged.aiAssessment?.signs_of_infection).toEqual(['erythema']);
  });

  it('leaves on-device tissue in place when the AI reports no wound bed', () => {
    const merged = aiWoundMeasurement.mergeAiAssessment(cvResult(), ai({ wound_bed: undefined }));
    expect(merged.tissue).toEqual({ granulation: 50, slough: 30, necrotic: 15, epithelial: 5 });
  });
});
