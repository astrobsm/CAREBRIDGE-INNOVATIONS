/**
 * The report leaves the building. These tests hold it to the two rules that
 * matter once it does: it prints nothing that was not recorded, and it never
 * lets a prediction read like an observation.
 *
 * jsPDF is exercised for real rather than mocked — the point is that the
 * document builds and carries the right text, and a mock would only prove the
 * test's own assumptions.
 */

import { describe, it, expect } from 'vitest';
import { buildScarReport } from '../services/scarReport';
import type { ScarOverview } from '../services/scarService';
import type {
  ScarAssessment, ScarCase, MultimodalReading, ScarPrediction, DomainChange,
} from '../types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const scar: ScarCase = {
  id: 's1',
  patientId: 'p1',
  label: 'Left earlobe keloid',
  anatomicalSite: 'Earlobe',
  laterality: 'left',
  classification: { clinician: 'keloid', clinicianId: 'u1', confirmedAt: '2026-01-01T00:00:00.000Z' },
  onsetAt: '2025-06-01T00:00:00.000Z',
  causeOfScar: 'Ear piercing',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const assessment = (over: Partial<ScarAssessment> = {}): ScarAssessment => ({
  id: 'a1',
  scarId: 's1',
  patientId: 'p1',
  assessedAt: '2026-01-01T00:00:00.000Z',
  isBaseline: true,
  images: [],
  regions: [],
  quality: 'acceptable',
  qualityReasons: ['Calibrated and traced.'],
  completenessPercent: 70,
  status: 'finalized',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const reading: MultimodalReading = {
  verdict: 'concordant_improvement',
  headline: 'Multimodal evidence of treatment response.',
  improving: [], worsening: [], stable: [],
  supportingStatements: [], conflicts: [],
  confidence: 'moderate',
};

const areaChange: DomainChange = {
  domain: 'area',
  label: 'Surface area',
  unit: 'cm²',
  lowerIsBetter: true,
  baselineValue: 10,
  previousValue: 9,
  currentValue: 8,
  absoluteChangeFromBaseline: -2,
  percentChangeFromBaseline: -20,
  absoluteChangeFromPrevious: -1,
  percentChangeFromPrevious: -11.1,
  ratePerMonth: -1,
  accelerationPerMonth: null,
  trend: 'improving',
  origin: 'measured',
  limitations: [],
};

const ineligiblePrediction: ScarPrediction = {
  kind: 'progression_risk',
  horizonDays: 84,
  probability: null,
  confidence: 'not_reliable',
  supportingFeatures: [],
  limitations: ['Prediction unavailable due to insufficient reliable longitudinal data.'],
  eligible: false,
  ineligibleReasons: ['Needs 3 reliable assessments; 1 recorded.'],
  modelName: 'scar-trajectory-rules',
  modelVersion: 'experimental-1.0.0',
  generatedAt: '2026-01-01T00:00:00.000Z',
};

const overview = (over: Partial<ScarOverview> = {}): ScarOverview => {
  const a = assessment();
  return {
    scar,
    assessments: [a],
    baseline: a,
    latest: a,
    treatments: [],
    changes: [],
    reading,
    intelligence: {
      whatChanged: ['No measured domain has changed beyond measurement noise.'],
      directionFavourable: null,
      consistentAcrossModalities: null,
      needsAttention: [],
      limitations: [],
    },
    responseIndex: {
      score: null, components: [], missingDomains: [],
      weights: { morphology: 0.3, elevationVolume: 0.2, colour: 0.15, validatedScore: 0.2, symptoms: 0.15 },
      confidence: 'not_reliable',
      label: 'Longitudinal treatment-response index (experimental, not a validated scale)',
      limitations: [],
    },
    predictions: [ineligiblePrediction],
    alerts: [],
    ...over,
  };
};

/**
 * Everything the document actually prints, as one searchable string.
 *
 * Only the shown strings are pulled out of the content stream, and they are
 * joined with a space. jsPDF emits a separate text-show operator per wrapped
 * line, so a sentence that wraps would otherwise never match as one phrase —
 * a property of the extraction, not of the report.
 */
async function textOf(o: ScarOverview, options = {}): Promise<string> {
  const doc = await buildScarReport({ overview: o, includeImages: false, ...options });
  const pages = (doc as any).internal.pages as unknown[];
  const stream = pages
    .filter(Boolean)
    .map(p => (Array.isArray(p) ? p.join('\n') : String(p)))
    .join('\n');

  const shown: string[] = [];
  // (escaped string) Tj — the only operator this report emits text through.
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stream)) !== null) {
    shown.push(match[1].replace(/\\([()\\])/g, '$1'));
  }
  return shown.join(' ').replace(/\s+/g, ' ');
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('scar report', () => {
  it('builds a document from a minimal record without throwing', async () => {
    const doc = await buildScarReport({ overview: overview(), includeImages: false });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('carries the lesion’s identity', async () => {
    const text = await textOf(overview());
    expect(text).toMatch(/earlobe keloid/i);
    expect(text).toMatch(/Earlobe/);
  });

  it('says a domain was not measured rather than leaving it blank', async () => {
    const text = await textOf(overview({ changes: [] }));
    expect(text).toMatch(/No domain has been measured yet/i);
  });

  it('prints the source beside a measurement', async () => {
    const text = await textOf(overview({ changes: [areaChange] }));
    expect(text).toMatch(/Surface area/);
    expect(text).toMatch(/Measured/);
  });

  it('says so when no treatment has been recorded', async () => {
    const text = await textOf(overview({ treatments: [] }));
    expect(text).toMatch(/No treatment has been recorded/i);
  });

  it('never prints an ineligible prediction as a figure', async () => {
    const text = await textOf(overview());
    expect(text).toMatch(/Not estimable/i);
    expect(text).toMatch(/Needs 3 reliable assessments/);
  });

  it('marks the prediction model experimental in the body, not a footnote', async () => {
    const text = await textOf(overview());
    expect(text).toMatch(/experimental/i);
    expect(text).toMatch(/has not been validated against outcomes/i);
  });

  it('carries a high-priority alert with the evidence that raised it', async () => {
    const text = await textOf(overview({
      alerts: [{
        id: 'al1', scarId: 's1', patientId: 'p1',
        kind: 'rapid_expansion', priority: 'high',
        message: 'Possible rapid scar/keloid expansion detected.',
        evidence: ['Area increasing at 3 cm2/month.'],
        disclaimer: 'Decision support based on the recorded measurements. Not a diagnosis; clinical assessment required.',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
    }));
    expect(text).toMatch(/HIGH/);
    expect(text).toMatch(/rapid scar/i);
    expect(text).toMatch(/Not a diagnosis/i);
  });

  it('reports an incomplete scale as having no total', async () => {
    const a = assessment({
      validatedScores: [{
        scaleId: 'vss',
        scaleVersion: '1.0',
        responses: { vascularity: 2 },
        total: null,
        subscales: {},
        completedAt: '2026-01-01T00:00:00.000Z',
        incompleteItems: ['pigmentation', 'pliability', 'height'],
      }],
    });
    const text = await textOf(overview({ assessments: [a], baseline: a, latest: a }));
    expect(text).toMatch(/incomplete/i);
    expect(text).toMatch(/no total/i);
  });

  it('states that elevation was not measured when 3D is unavailable', async () => {
    const a = assessment({
      threeD: {
        quality: 'unavailable',
        maxElevationMm: null, meanElevationMm: null,
        volumeCm3: null, surfaceAreaCm2: null,
        imageCount: 0,
        limitations: ['No 3D reconstruction engine is configured, so elevation and volume are not measured.'],
      },
    });
    const text = await textOf(overview({ assessments: [a], baseline: a, latest: a }));
    expect(text).toMatch(/not measured/i);
  });

  it('notes when the patient record was not attached', async () => {
    const text = await textOf(overview());
    expect(text).toMatch(/Patient record not attached/i);
  });
});
