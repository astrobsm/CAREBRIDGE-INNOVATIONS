import { describe, it, expect } from 'vitest';
import { burnCareService } from '../services/burnCalculators';
import {
  scoreCaprini, interpretCaprini,
  scoreBraden, interpretBraden,
  scoreMust, interpretMust,
} from '../services/riskCalculators';

/**
 * Tests for the calculators extracted into this domain (rather than ported
 * wholesale), because AstroHEALTH's own burn and risk services have a different
 * API surface. These are the parts most likely to drift, so the boundaries are
 * pinned down here.
 */

const HOUR = 3600_000;

describe('Parkland resuscitation', () => {
  it('gives 4 mL/kg/%TBSA over 24 h, split in half', () => {
    const p = burnCareService.calculateParklandFormula(70, 30, new Date(0), new Date(0));
    expect(p.totalVolume24h).toBe(8400); // 4 * 70 * 30
    expect(p.firstHalfVolume).toBe(4200);
    expect(p.secondHalfVolume).toBe(4200);
  });

  it('is anchored to the time of injury, not arrival', () => {
    // Half the volume is due within 8 h of the BURN. A patient presenting 4 h
    // late has 4 h left for it, so the rate must double relative to t=0.
    const burn = new Date(0);
    const atInjury = burnCareService.calculateParklandFormula(70, 30, burn, new Date(0));
    const fourHoursLate = burnCareService.calculateParklandFormula(70, 30, burn, new Date(4 * HOUR));
    expect(atInjury.currentRate).toBe(Math.round(4200 / 8));
    expect(fourHoursLate.currentRate).toBe(Math.round(4200 / 4));
    expect(fourHoursLate.currentRate).toBeGreaterThan(atInjury.currentRate);
  });

  it('switches to the second half after 8 hours', () => {
    const p = burnCareService.calculateParklandFormula(70, 30, new Date(0), new Date(16 * HOUR));
    expect(p.currentRate).toBe(Math.round(4200 / 8)); // 8 h remain of the 16 h window
  });

  it('stops scheduling once the 24 h window has passed', () => {
    const p = burnCareService.calculateParklandFormula(70, 30, new Date(0), new Date(30 * HOUR));
    expect(p.currentRate).toBe(0);
  });

  it('targets 0.5-1.0 mL/kg/h urine output', () => {
    const p = burnCareService.calculateParklandFormula(70, 30, new Date(0));
    expect(p.urineOutputTarget).toEqual({ min: 0.5, max: 1.0 });
  });
});

describe('Baux scores', () => {
  it('adds 17 for inhalation injury', () => {
    expect(burnCareService.calculateBauxScore(40, 30)).toBe(70);
    expect(burnCareService.calculateRevisedBauxScore(40, 30, false)).toBe(70);
    expect(burnCareService.calculateRevisedBauxScore(40, 30, true)).toBe(87);
  });
});

describe('Curreri nutrition targets', () => {
  it('computes 25 kcal/kg + 40 kcal per %TBSA', () => {
    const n = burnCareService.calculateNutritionTargets(70, 30);
    expect(n.caloriesPerDay).toBe(25 * 70 + 40 * 30);
    expect(n.proteinPerDay).toBeCloseTo(105, 5); // 1.5 g/kg
  });
});

describe('ABA disposition', () => {
  it('sends >=10% TBSA to a burn centre', () => {
    const d = burnCareService.determineDisposition(15, false, false, 30, 'flame', false);
    expect(d.disposition).toBe('burn_center');
  });

  it('escalates inhalation injury to ICU — it is an airway problem first', () => {
    const d = burnCareService.determineDisposition(15, true, false, 30, 'flame', false);
    expect(d.disposition).toBe('icu');
    expect(d.reasons.some(r => /Inhalation/i.test(r))).toBe(true);
  });

  it('refers electrical burns even when the area looks trivial', () => {
    const d = burnCareService.determineDisposition(2, false, false, 30, 'electrical', false);
    expect(d.disposition).toBe('burn_center');
  });

  it('keeps a small superficial burn as an outpatient', () => {
    const d = burnCareService.determineDisposition(3, false, false, 30, 'scald', false);
    expect(d.disposition).toBe('outpatient');
  });

  it('admits at the extremes of age with a significant burn', () => {
    expect(burnCareService.determineDisposition(6, false, false, 1, 'scald', false).disposition).toBe('ward');
    expect(burnCareService.determineDisposition(6, false, false, 75, 'scald', false).disposition).toBe('ward');
  });
});

describe('Caprini VTE score', () => {
  it('weights factors by their published point value', () => {
    expect(scoreCaprini({ age_41_60: true })).toBe(1);
    expect(scoreCaprini({ age_61_74: true })).toBe(2);
    expect(scoreCaprini({ age_over_75: true })).toBe(3);
    expect(scoreCaprini({ hip_pelvis_fracture: true })).toBe(5);
  });

  it('sums across categories', () => {
    expect(scoreCaprini({ age_over_75: true, malignancy: true, bmi_over_25: true })).toBe(6);
  });

  it('ignores unknown keys rather than throwing', () => {
    expect(scoreCaprini({ not_a_real_factor: true })).toBe(0);
  });

  it('stratifies at the published thresholds', () => {
    expect(interpretCaprini(0).riskLevel).toBe('very_low');
    expect(interpretCaprini(2).riskLevel).toBe('low');
    expect(interpretCaprini(3).riskLevel).toBe('moderate');
    expect(interpretCaprini(5).riskLevel).toBe('high');
  });
});

describe('Braden pressure injury score', () => {
  it('sums the six subscales', () => {
    expect(scoreBraden({
      sensory_perception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction_shear: 3,
    })).toBe(23);
  });

  it('runs in the opposite direction to Caprini — lower is worse', () => {
    expect(interpretBraden(23).riskLevel).toBe('low');
    expect(interpretBraden(14).riskLevel).toBe('moderate');
    expect(interpretBraden(12).riskLevel).toBe('high');
    expect(interpretBraden(9).riskLevel).toBe('very_high');
  });
});

describe('MUST malnutrition score', () => {
  it('sums its three components, tolerating missing ones', () => {
    expect(scoreMust({ bmi_score: 1, weight_loss_score: 1, acute_disease_score: 2 })).toBe(4);
    expect(scoreMust({ bmi_score: 1 })).toBe(1);
    expect(scoreMust({})).toBe(0);
  });

  it('stratifies at 0 / 1 / >=2', () => {
    expect(interpretMust(0).riskLevel).toBe('low');
    expect(interpretMust(1).riskLevel).toBe('moderate');
    expect(interpretMust(2).riskLevel).toBe('high');
  });
});
