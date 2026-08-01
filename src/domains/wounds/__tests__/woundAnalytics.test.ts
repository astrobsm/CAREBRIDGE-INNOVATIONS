import { describe, it, expect } from 'vitest';
import {
  computeHealingAnalytics,
  areaVelocityCm2PerWeek,
  healingAlerts,
} from '../services/woundAnalytics';
import type { WoundAssessment } from '../monitorTypes';

/**
 * Tests for the WoundProgress Monitor healing analytics.
 *
 * These are the correctness-critical core: they classify a wound as improving,
 * stalled or worsening and project closure, which drives the dashboard triage
 * and the clinician-facing alerts. The functions under test are pure, so this
 * runs without IndexedDB or a browser.
 */

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Build a timeline: areas spaced one week apart, oldest first. */
function series(areas: Array<number | null>, opts: { reliable?: boolean } = {}): WoundAssessment[] {
  const base = Date.UTC(2026, 0, 1);
  return areas.map((area, i) => {
    const at = new Date(base + i * WEEK).toISOString();
    return {
      id: `a${i}`,
      woundId: 'w1',
      patientId: 'p1',
      areaCm2: area,
      assessedAt: at,
      scaleReliable: opts.reliable !== false,
      createdAt: at,
      updatedAt: at,
    };
  });
}

describe('areaVelocityCm2PerWeek', () => {
  it('is negative when the wound is shrinking', () => {
    expect(areaVelocityCm2PerWeek(series([10, 8, 6, 4]))).toBeCloseTo(-2, 5);
  });

  it('is positive when the wound is growing', () => {
    expect(areaVelocityCm2PerWeek(series([4, 6, 8]))).toBeCloseTo(2, 5);
  });

  it('is zero for a single assessment (no spread to regress over)', () => {
    expect(areaVelocityCm2PerWeek(series([10]))).toBe(0);
  });
});

describe('computeHealingAnalytics', () => {
  it('reports insufficient_data with no assessments', () => {
    const a = computeHealingAnalytics([]);
    expect(a.status).toBe('insufficient_data');
    expect(a.assessmentCount).toBe(0);
  });

  it('classifies a steadily shrinking wound as improving', () => {
    const a = computeHealingAnalytics(series([12, 9, 6, 3]));
    expect(a.status).toBe('improving');
    expect(a.percentAreaReduction).toBeCloseTo(75, 5);
    expect(a.velocityCm2PerWeek).toBeLessThan(0);
    expect(a.projectedDaysToClosure).toBeGreaterThan(0);
  });

  it('classifies a growing wound as worsening', () => {
    const a = computeHealingAnalytics(series([4, 6, 9, 12]));
    expect(a.status).toBe('worsening');
    expect(a.projectedDaysToClosure).toBeNull();
  });

  it('classifies an unchanging wound as stagnant', () => {
    expect(computeHealingAnalytics(series([8, 8, 8, 8])).status).toBe('stagnant');
  });

  it('marks a wound as healed when the latest area is zero', () => {
    expect(computeHealingAnalytics(series([6, 3, 0])).status).toBe('healed');
  });

  it('does not project closure for a wound that is not shrinking', () => {
    expect(computeHealingAnalytics(series([5, 5, 5])).projectedDaysToClosure).toBeNull();
  });

  it('flags unreliable scale when any measurement lacked calibration', () => {
    const rows = series([10, 8, 6]);
    rows[1].scaleReliable = false;
    expect(computeHealingAnalytics(rows).hasUnreliableScale).toBe(true);
  });

  it('ignores assessments with no usable area', () => {
    const rows = series([10, 5, null]);
    expect(computeHealingAnalytics(rows).assessmentCount).toBe(2);
  });

  it('orders the series chronologically regardless of input order', () => {
    const chronological = series([12, 9, 6, 3]);
    const shuffled = [chronological[2], chronological[0], chronological[3], chronological[1]];
    expect(computeHealingAnalytics(shuffled).percentAreaReduction).toBeCloseTo(75, 5);
  });
});

describe('healingAlerts', () => {
  it('raises a review alert for a worsening wound', () => {
    const alerts = healingAlerts(computeHealingAnalytics(series([4, 6, 9, 12])));
    expect(alerts.some(a => /increasing|review/i.test(a))).toBe(true);
  });

  it('raises a stalled alert for a stagnant wound', () => {
    const alerts = healingAlerts(computeHealingAnalytics(series([8, 8, 8, 8])));
    expect(alerts.some(a => /stall/i.test(a))).toBe(true);
  });

  it('warns about approximate sizing when calibration was unreliable', () => {
    const rows = series([10, 8]);
    rows[0].scaleReliable = false;
    const alerts = healingAlerts(computeHealingAnalytics(rows));
    expect(alerts.some(a => /calibration|approximate/i.test(a))).toBe(true);
  });

  it('is empty for a cleanly improving, calibrated wound', () => {
    expect(healingAlerts(computeHealingAnalytics(series([12, 8, 4])))).toHaveLength(0);
  });
});
