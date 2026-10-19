/**
 * Clinical-safety corrections ported from the UNTH module audit (batch 3):
 * albumin in g/L is understood, a missing Braden subscale is not "no risk",
 * platelets typed per µL are converted, and no Parkland implementation turns
 * late presentation into a bolus.
 */
import { describe, it, expect } from 'vitest';
import { acidBase, woundHealingMealPlan } from '../services/clinicalCalculators';
import { riskAssessmentService, scoreBraden, bradenIncomplete } from '../services/riskCalculators';
import { preoperativeService } from '../../../services/preoperativeService';
import { burnCareService as legacyBurnCareService } from '../../../services/burnCareService';
import { calculateFluidResuscitation } from '../../burns/services/burnScoringService';

describe('albumin in g/L', () => {
  it('corrects the anion gap the same whether albumin is entered in g/dL or g/L', () => {
    const base = { ph: 7.3, paco2: 4, hco3: 18, sodium: 140, chloride: 105 };
    const gdl = acidBase({ ...base, albumin: 2.5 });
    const gl = acidBase({ ...base, albumin: 25 });
    expect(gl.correctedAnionGap).toBeCloseTo(gdl.correctedAnionGap!, 5);
    // Used as g/dL, 25 g/L gave a corrected gap of about -36.
    expect(gl.correctedAnionGap!).toBeGreaterThan(gl.anionGap!);
  });

  it('reads a g/L albumin as depletion in the wound meal plan', () => {
    const gl = woundHealingMealPlan({ weightKg: 70, severity: 'mild', albuminGdL: 25 });
    const gdl = woundHealingMealPlan({ weightKg: 70, severity: 'mild', albuminGdL: 2.5 });
    expect(gl.proteinPerKg).toBe(gdl.proteinPerKg);
    expect(gl.proteinPerKg).toBeGreaterThanOrEqual(1.8);
  });
});

describe('Braden', () => {
  it('counts a missing subscale as highest risk, not as no risk', () => {
    const partial = { sensory_perception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4 };
    expect(scoreBraden(partial)).toBe(21);
    expect(bradenIncomplete(partial)).toBe(true);
  });

  it('says the scale is incomplete', async () => {
    const r = await riskAssessmentService.calculatePressureSoreRisk({ braden_subscores: { moisture: 4 } });
    expect(r.interpretation).toMatch(/Braden incomplete/);
    expect(r.score).toBe(9);
  });

  it('is unchanged for a complete scale', async () => {
    const all = { sensory_perception: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction_shear: 3 };
    const r = await riskAssessmentService.calculatePressureSoreRisk({ braden_subscores: all });
    expect(r.score).toBe(23);
    expect(r.interpretation).not.toMatch(/incomplete/);
  });
});

describe('pre-operative bleeding risk', () => {
  it('reads platelets in ×10⁹/L, and converts a count typed per µL', () => {
    expect(preoperativeService.assessBleedingRisk({ platelets: 250 })).toBe('low');
    expect(preoperativeService.assessBleedingRisk({ platelets: 40 })).toBe('moderate');
    // 40,000 per µL is 40 ×10⁹/L — it used to read as a normal count.
    expect(preoperativeService.assessBleedingRisk({ platelets: 40000 })).toBe('moderate');
    expect(preoperativeService.assessBleedingRisk({ platelets: 250000 })).toBe('low');
  });
});

describe('Parkland in the Burns module', () => {
  const HOUR = 3600_000;

  it('caps the late-presentation catch-up at twice the scheduled rate', () => {
    const burn = new Date(Date.now() - 7.9 * HOUR);
    const p = calculateFluidResuscitation(70, 30, burn, 'parkland');
    const scheduled = (4 * 70 * 30) / 2 / 8;
    expect(p.currentInfusionRate).toBeLessThanOrEqual(Math.round(scheduled * 2));
    expect(p.notes!.join(' ')).toMatch(/capped/);
  });

  it('stops scheduling after 24 hours', () => {
    const p = calculateFluidResuscitation(70, 30, new Date(Date.now() - 30 * HOUR), 'parkland');
    expect(p.currentInfusionRate).toBe(0);
    expect(p.notes!.join(' ')).toMatch(/More than 24 h/);
  });

  it('caps the legacy burn-care service the same way', () => {
    const p = legacyBurnCareService.calculateParklandFormula(70, 30, 7.9);
    expect(p.hourlyRate8h).toBeLessThanOrEqual(Math.round(((4 * 70 * 30) / 2 / 8) * 2));
    expect(p.recommendations.join(' ')).toMatch(/capped/);
  });
});
