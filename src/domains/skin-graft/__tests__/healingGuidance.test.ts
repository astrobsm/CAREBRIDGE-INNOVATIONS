import { describe, it, expect } from 'vitest';
import { recommendHealingActions, type GuidanceContext } from '../services/healingGuidance';
import {
  predictHealing, predictDonorHealing, DONOR_BENCHMARK, RECIPIENT_BENCHMARK,
} from '../services/graftAnalysis';
import type {
  GraftPhotoAssessment, GraftSite, SkinGraftEpisode, SiteKind,
} from '../types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const episode = (over: Partial<SkinGraftEpisode> = {}): SkinGraftEpisode => ({
  id: 'e1',
  patientId: 'p1',
  status: 'monitoring',
  graftedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const site = (kind: SiteKind, over: Partial<GraftSite> = {}): GraftSite => ({
  id: 's1',
  episodeId: 'e1',
  patientId: 'p1',
  kind,
  baselineAreaCm2: 100,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const assessment = (over: Partial<GraftPhotoAssessment> = {}): GraftPhotoAssessment => ({
  id: 'a1',
  episodeId: 'e1',
  siteId: 's1',
  patientId: 'p1',
  kind: 'recipient',
  capturedAt: '2026-01-08T00:00:00.000Z',
  postOpDay: 7,
  status: 'analysed',
  imageQuality: { verdict: 'accept', score: 88, checks: [], problems: [], version: 'IQG-1.0.0' },
  measurement: {
    areaCm2: 100, perimeterCm: 40, lengthCm: null, widthCm: null,
    pixelsPerCm: 20, calibrationMethod: 'green_marker', calibrationConfidence: 'high',
  },
  provenance: {
    modelVersion: 'planimetry-traced-1.0.0',
    pipelineVersion: 'planimetry-1.0.0',
    qualityGateVersion: 'IQG-1.0.0',
    analysedAt: '2026-01-08T00:00:00.000Z',
    isPrototypeEstimator: false,
  },
  createdAt: '2026-01-08T00:00:00.000Z',
  updatedAt: '2026-01-08T00:00:00.000Z',
  ...over,
});

const ctx = (over: Partial<GuidanceContext>): GuidanceContext => ({
  episode: episode(),
  site: site('recipient'),
  assessments: [],
  trajectory: 'stable',
  ...over,
});

const ids = (c: GuidanceContext) => recommendHealingActions(c).map(r => r.id);

// ── Prediction ──────────────────────────────────────────────────────────────

describe('predictHealing', () => {
  it('projects a closure window, not a single day', () => {
    const p = predictHealing([
      { postOpDay: 2, percent: 20 },
      { postOpDay: 6, percent: 50 },
      { postOpDay: 10, percent: 78 },
    ]);
    expect(p.predictedClosurePodFrom).not.toBeNull();
    expect(p.predictedClosurePodTo).toBeGreaterThan(p.predictedClosurePodFrom as number);
  });

  it('holds a grafted bed to a slower standard than a donor site', () => {
    // ~3.5 points/day: brisk for a bed closing secondarily, slow for a donor site.
    const points = [
      { postOpDay: 0, percent: 10 },
      { postOpDay: 4, percent: 24 },
      { postOpDay: 8, percent: 38 },
    ];
    expect(predictHealing(points, RECIPIENT_BENCHMARK).trajectory).toBe('improving');
    expect(predictHealing(points, DONOR_BENCHMARK).trajectory).toBe('stable');
  });

  it('names the benchmark it fell short of', () => {
    // 0.9 points/day: below the recipient benchmark, but with only 51 points
    // left to go it still projects inside the plausible window, so this
    // exercises the benchmark caveat and not the stalled-wound path.
    const p = predictHealing([
      { postOpDay: 0, percent: 40 },
      { postOpDay: 10, percent: 49 },
    ], RECIPIENT_BENCHMARK);
    expect(p.trajectory).toBe('delayed');
    expect(p.predictedClosurePodFrom).not.toBeNull();
    expect(p.caveats.join(' ')).toContain('grafted bed closing secondarily');
  });

  it('refuses to project a date for a wound that has effectively stalled', () => {
    const p = predictHealing([
      { postOpDay: 0, percent: 40 },
      { postOpDay: 20, percent: 42 },
      { postOpDay: 40, percent: 44 },
    ]);
    expect(p.predictedClosurePodFrom).toBeNull();
    expect(p.trajectory).toBe('delayed');
  });

  it('projects nothing while the wound is enlarging', () => {
    const p = predictHealing([
      { postOpDay: 5, percent: 60 },
      { postOpDay: 12, percent: 35 },
    ]);
    expect(p.trajectory).toBe('deteriorating');
    expect(p.predictedClosurePodFrom).toBeNull();
  });

  it('keeps predictDonorHealing on the donor benchmark', () => {
    const points = [{ postOpDay: 0, percent: 10 }, { postOpDay: 4, percent: 24 }];
    expect(predictDonorHealing(points)).toEqual(predictHealing(points, DONOR_BENCHMARK));
  });
});

// ── Guidance ────────────────────────────────────────────────────────────────

describe('recommendHealingActions', () => {
  it('asks for a photograph when there is nothing to reason from', () => {
    expect(ids(ctx({}))).toEqual(['no-assessment']);
  });

  it('raises shear protection only in the graft’s first days', () => {
    const early = assessment({ postOpDay: 3 });
    const late = assessment({ postOpDay: 12 });
    expect(ids(ctx({ latest: early, assessments: [early] }))).toContain('early-immobilisation');
    expect(ids(ctx({ latest: late, assessments: [late] }))).not.toContain('early-immobilisation');
  });

  it('does not raise graft-specific advice on a donor site', () => {
    const a = assessment({ kind: 'donor', postOpDay: 3 });
    const got = ids(ctx({ site: site('donor'), latest: a, assessments: [a] }));
    expect(got).not.toContain('early-immobilisation');
    expect(got).not.toContain('mesh-interstices');
  });

  it('escalates debridement with the amount of necrosis', () => {
    const mild = assessment({ tissue: { necroticPct: 12 } });
    const heavy = assessment({ tissue: { necroticPct: 30 } });
    const find = (a: GraftPhotoAssessment) =>
      recommendHealingActions(ctx({ latest: a, assessments: [a] }))
        .find(r => r.id === 'necrosis-debride');
    expect(find(mild)?.priority).toBe('important');
    expect(find(heavy)?.priority).toBe('urgent');
  });

  it('leaves a clean bed alone', () => {
    const a = assessment({ tissue: { granulationPct: 95, necroticPct: 2, sloughPct: 3 } });
    const got = ids(ctx({ latest: a, assessments: [a] }));
    expect(got).not.toContain('necrosis-debride');
    expect(got).not.toContain('slough-bed-prep');
  });

  it('sends the clinician to the bedside when the series is deteriorating', () => {
    const a = assessment({ postOpDay: 10 });
    const got = recommendHealingActions(
      ctx({ latest: a, assessments: [a], trajectory: 'deteriorating' }),
    );
    expect(got[0].id).toBe('deteriorating-review');
    expect(got[0].priority).toBe('urgent');
  });

  it('quotes the measurement that raised it', () => {
    const a = assessment({ postOpDay: 9, tissue: { necroticPct: 14, granulationPct: 86 } });
    const r = recommendHealingActions(ctx({ latest: a, assessments: [a] }))
      .find(x => x.id === 'necrosis-debride');
    expect(r?.basis).toContain('14%');
    expect(r?.basis).toContain('POD 9');
  });

  it('gives every recommendation a non-empty basis', () => {
    const a = assessment({ postOpDay: 9, tissue: { necroticPct: 30, sloughPct: 45 } });
    const all = recommendHealingActions(ctx({
      latest: a,
      assessments: [a, a, a],
      trajectory: 'deteriorating',
      chronicConditions: ['Type 2 diabetes', 'Sickle cell anaemia', 'smoker'],
    }));
    expect(all.length).toBeGreaterThan(5);
    for (const r of all) expect(r.basis.trim().length).toBeGreaterThan(0);
  });

  it('raises comorbidity advice only when the record carries it', () => {
    const a = assessment();
    expect(ids(ctx({ latest: a, assessments: [a] }))).not.toContain('glycaemic-control');
    expect(ids(ctx({
      latest: a, assessments: [a], chronicConditions: ['Diabetes Mellitus type 2'],
    }))).toContain('glycaemic-control');
  });

  it('orders urgent findings first', () => {
    const a = assessment({ postOpDay: 9, tissue: { necroticPct: 40 } });
    const got = recommendHealingActions(ctx({
      latest: a, assessments: [a], trajectory: 'deteriorating',
      chronicConditions: ['diabetes'],
    }));
    const priorities = got.map(r => r.priority);
    const rank = { urgent: 0, important: 1, routine: 2 } as const;
    expect(priorities.map(p => rank[p])).toEqual([...priorities.map(p => rank[p])].sort());
  });
});
