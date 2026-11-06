/** Measurements come from the WoundProgress Monitor, not a second measurement. */
import { describe, it, expect } from 'vitest';
import { answersFromWoundAssessment, describeAssessment } from '../woundLink';
import type { WoundAssessment } from '../../../wounds/monitorTypes';

const base: WoundAssessment = { id: 'a', woundId: 'w', patientId: 'p', createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z' };

describe('answersFromWoundAssessment', () => {
  it('maps what the Monitor recorded onto the review fields', () => {
    const a = answersFromWoundAssessment({
      ...base, lengthCm: 4, widthCm: 3, depthCm: 0.5, areaCm2: 9.4, sloughPct: 30, necroticPct: 10,
      tissueTypes: ['granulation', 'slough'], exudateAmount: 'moderate', exudateType: 'serous', odor: true, painLevel: 5,
    });
    expect(a).toEqual({
      'core.wound_length': 4, 'core.wound_width': 3, 'core.wound_depth': 0.5, 'core.wound_area': 9.4,
      'core.wound_tissue': ['granulation', 'slough'], 'core.wound_nonviable': '25_50',
      'core.wound_exudate': 'moderate', 'core.wound_exudate_type': 'serous', 'core.wound_odour': 'present', 'core.pain_score': 5,
    });
  });

  it('invents nothing the Monitor did not record', () => {
    expect(answersFromWoundAssessment({ ...base, lengthCm: 2 })).toEqual({ 'core.wound_length': 2 });
  });

  it('says what it pulled in, and whether the scale was reliable', () => {
    expect(describeAssessment({ ...base, areaCm2: 9.4, scaleReliable: false })).toBe('9.4 cm2 on 2026-11-02 (scale not reliable)');
  });
});
