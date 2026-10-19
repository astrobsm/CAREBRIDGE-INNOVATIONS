/**
 * The baseline is only taken from a reliably calibrated capture — every later
 * take percentage is a ratio to it. Ported from the UNTH skin-graft audit.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../database', () => ({ db: {} }));
vi.mock('../../../services/cloudSyncService', () => ({ syncRecord: vi.fn() }));

import { canEstablishBaseline } from '../services/skinGraftService';

const good = { totalAreaCm2: 42, valid: true };

describe('canEstablishBaseline', () => {
  it('accepts a clean, calibrated, accepted capture', () => {
    expect(canEstablishBaseline(good, 38, { verdict: 'accept' })).toBe(true);
    expect(canEstablishBaseline(good, 38, { verdict: 'review' })).toBe(true);
  });
  it('refuses a capture with no scale', () => {
    expect(canEstablishBaseline(good, null, { verdict: 'accept' })).toBe(false);
    expect(canEstablishBaseline(good, 0, { verdict: 'accept' })).toBe(false);
  });
  it('refuses an outline the planimetry flagged (e.g. self-crossing)', () => {
    expect(canEstablishBaseline({ totalAreaCm2: 42, valid: false }, 38, { verdict: 'accept' })).toBe(false);
  });
  it('refuses a frame the quality gate sent back', () => {
    expect(canEstablishBaseline(good, 38, { verdict: 'recapture' })).toBe(false);
  });
  it('refuses a zero or missing area', () => {
    expect(canEstablishBaseline({ totalAreaCm2: null, valid: true }, 38, { verdict: 'accept' })).toBe(false);
    expect(canEstablishBaseline({ totalAreaCm2: 0, valid: true }, 38, { verdict: 'accept' })).toBe(false);
  });
});
