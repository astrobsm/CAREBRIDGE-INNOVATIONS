/**
 * Composition, scoring through the existing calculators, flags, completeness,
 * narrative and follow-up comparison.
 */
import { describe, it, expect } from 'vitest';
import { composeTemplate, readReview, coreIdsFor, iwiiStage } from '../engine';
import { woundCareReview } from '../procedures/wound/woundCareReview';
import { skinGraft } from '../procedures/reconstruction/skinGraft';
import { scoreCaprini, scoreBraden } from '../../../clinician-assistant/services/riskCalculators';
import { calculateBMI } from '../../../calculators/engine/calculationEngine';
import { adult } from './fixtures';
import type { ProcedureModule } from '../types';

describe('composeTemplate', () => {
  it('orders lead core, module, holistic core, closing core', () => {
    const t = composeTemplate(woundCareReview, 'wound_review');
    const order = t.sections.map(s => s.coreId ?? s.id);
    expect(order[0]).toBe('wound_assessment');
    expect(order[1]).toBe('wound_infection');
    expect(order[2]).toBe('tetanus');
    expect(order[3]).toBe('wound_care_review.cause');
    expect(order[order.length - 1]).toBe('wound_dressing');
    expect(order).toContain('psychology');
    expect(order).not.toContain('anaesthetic');
  });

  it('gives pre-op the anaesthetic and VTE sections, post-op the post-operative status', () => {
    expect(coreIdsFor(skinGraft, 'pre_op')).toEqual(expect.arrayContaining(['anaesthetic', 'vte', 'patient_factors', 'psychology', 'social']));
    expect(coreIdsFor(skinGraft, 'post_op')).toEqual(expect.arrayContaining(['post_op_status', 'pain', 'nutrition']));
    expect(coreIdsFor(skinGraft, 'post_op')).not.toContain('anaesthetic');
  });

  it('honours includeCore and excludeCore', () => {
    expect(coreIdsFor(woundCareReview, 'follow_up')).toEqual(expect.arrayContaining(['follow_up_interval', 'wound_assessment', 'wound_infection']));
    const trimmed: ProcedureModule = { ...woundCareReview, excludeCore: { wound_review: ['social'] } };
    expect(coreIdsFor(trimmed, 'wound_review')).not.toContain('social');
  });

  it('refuses a phase the module does not offer', () => {
    expect(() => composeTemplate(woundCareReview, 'pre_op')).toThrow(/not reviewed/);
  });

  it('has unique field ids within every composed template', () => {
    for (const m of [woundCareReview, skinGraft]) for (const p of m.phases) {
      const ids = composeTemplate(m, p).sections.flatMap(s => s.fields.map(f => f.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('is deterministic', () => {
    const answers = { 'core.smoking': 'current', 'core.weight_kg': 70, 'core.height_cm': 170 };
    const a = readReview({ module: skinGraft, phase: 'pre_op', answers, patient: adult() });
    const b = readReview({ module: skinGraft, phase: 'pre_op', answers, patient: adult() });
    expect(JSON.stringify(a.scores)).toBe(JSON.stringify(b.scores));
    expect(a.narrative.text).toBe(b.narrative.text);
  });
});

describe('scores use the existing calculators', () => {
  it('computes BMI with calculateBMI and only where nutrition is asked', () => {
    const r = readReview({ module: skinGraft, phase: 'pre_op', answers: { 'core.weight_kg': 90, 'core.height_cm': 170 }, patient: adult() });
    expect(r.scoreMap.bmi.total).toBe(calculateBMI(90, 170));
  });

  it('computes Caprini with scoreCaprini, adding age, BMI and the operation', () => {
    const answers = { 'core.caprini': ['malignancy'], 'core.surgery_extent': 'major', 'core.weight_kg': 90, 'core.height_cm': 170 };
    const r = readReview({ module: skinGraft, phase: 'pre_op', answers, patient: adult({ ageYears: 66 }) });
    expect(r.scoreMap.caprini.total).toBe(scoreCaprini({ malignancy: true, major_surgery_45min: true, age_61_74: true, bmi_over_25: true }));
    expect(r.scoreMap.caprini.total).toBe(7);
    expect(r.scoreMap.caprini.flag?.level).toBe('amber');
  });

  it('withholds Caprini until its factors are answered', () => {
    const r = readReview({ module: skinGraft, phase: 'pre_op', answers: { 'core.surgery_extent': 'minor' }, patient: adult() });
    expect(r.scoreMap.caprini.total).toBeNull();
  });

  it('computes Braden with scoreBraden', () => {
    const answers = Object.fromEntries(['sensory_perception', 'moisture', 'activity', 'mobility', 'nutrition', 'friction_shear'].map(k => [`core.braden_${k}`, '2']));
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers, patient: adult() });
    expect(r.scoreMap.braden.total).toBe(scoreBraden({ sensory_perception: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction_shear: 2 }));
    expect(r.scoreMap.braden.flag?.level).toBe('amber');
  });

  it('computes MUST from BMI, weight loss and acute illness', () => {
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers: { 'core.weight_kg': 50, 'core.height_cm': 170, 'core.weight_loss': '2', 'core.acute_disease': false }, patient: adult() });
    // BMI 17.3 -> 2; >10% loss -> 2
    expect(r.scoreMap.must.total).toBe(4);
    expect(r.scoreMap.must.band?.level).toBe('high');
  });

  it('does not report an anaesthetic score in a wound review', () => {
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers: {}, patient: adult() });
    expect(r.scoreMap.asa).toBeUndefined();
    expect(r.scoreMap.caprini).toBeUndefined();
  });

  it('computes NEWS2 post-operatively from complete observations only', () => {
    const obs = { 'core.obs_rr': 26, 'core.obs_spo2': 91, 'core.obs_temp': 39.2, 'core.obs_sbp': 95, 'core.obs_hr': 125, 'core.obs_avpu': 'alert' };
    const r = readReview({ module: skinGraft, phase: 'post_op', answers: obs, patient: adult() });
    expect(r.scoreMap.news2.total).toBeGreaterThanOrEqual(7);
    expect(r.scoreMap.news2.flag?.level).toBe('red');
    const partial = readReview({ module: skinGraft, phase: 'post_op', answers: { 'core.obs_rr': 18 }, patient: adult() });
    expect(partial.scoreMap.news2.total).toBeNull();
  });

  it('stages wound infection on the IWII continuum', () => {
    expect(iwiiStage({ 'core.iwii_covert': ['none'] }).total).toBe(0);
    expect(iwiiStage({ 'core.iwii_covert': ['hypergranulation'] }).total).toBe(1);
    expect(iwiiStage({ 'core.iwii_overt': ['purulent'] }).total).toBe(2);
    expect(iwiiStage({ 'core.iwii_spreading': ['lymphangitis'] }).total).toBe(3);
    expect(iwiiStage({ 'core.iwii.systemic': ['fever'] }).total).toBe(4);
  });

  it('computes graft take with estimateGraftTake against the grafted area', () => {
    const r = readReview({ module: skinGraft, phase: 'post_op', answers: { 'skin_graft.grafted_area': 100, 'skin_graft.adherent_pct': 70, 'skin_graft.nonviable_pct': 30 }, patient: adult() });
    expect(r.scoreMap['skin_graft.take'].total).toBe(70);
    expect(r.scoreMap['skin_graft.take'].flag?.level).toBe('amber');
  });
});

describe('flags', () => {
  it('flags anaemia by the WHO threshold for the patient\'s sex', () => {
    const answers = { 'core.hb': 12.5 };
    const male = readReview({ module: woundCareReview, phase: 'wound_review', answers, patient: adult({ sex: 'male' }) });
    const female = readReview({ module: woundCareReview, phase: 'wound_review', answers, patient: adult({ sex: 'female' }) });
    expect(male.flags.some(f => /Anaemia/.test(f.reason))).toBe(true);
    expect(female.flags.some(f => /Anaemia/.test(f.reason))).toBe(false);
  });

  it('raises only the most severe of nested numeric thresholds', () => {
    const r = readReview({ module: skinGraft, phase: 'pre_op', answers: { 'core.platelets': 30 }, patient: adult() });
    const plt = r.flags.filter(f => f.fieldLabel === 'Platelets');
    expect(plt).toHaveLength(1);
    expect(plt[0].level).toBe('red');
  });

  it('raises yes-flags declared on the field', () => {
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers: { 'core.nsti_concern': true }, patient: adult() });
    expect(r.flags[0].level).toBe('red');
    expect(r.flags[0].reason).toMatch(/necrotising/i);
  });
});

describe('visibility and completeness', () => {
  it('shows the rest of the PHQ-9 only when the PHQ-2 is positive', () => {
    const t = composeTemplate(woundCareReview, 'wound_review');
    const q3 = t.sections.flatMap(s => s.fields).find(f => f.id === 'core.phq.q3')!;
    expect(q3.visibleWhen!({ 'core.phq.q1': '1', 'core.phq.q2': '1' })).toBe(false);
    expect(q3.visibleWhen!({ 'core.phq.q1': '2', 'core.phq.q2': '1' })).toBe(true);
  });

  it('counts only important visible fields', () => {
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers: {}, patient: adult() });
    expect(r.completeness.percent).toBe(0);
    expect(r.completeness.missing).toContain('Wound aetiology');
  });
});

describe('narrative', () => {
  it('writes sections in the guided history\'s voice and summarises scored items by their score', () => {
    const answers = { 'core.wound_aetiology': 'venous', 'core.phq.q1': '1', 'core.phq.q2': '0', 'core.smoking': 'current' };
    const r = readReview({ module: woundCareReview, phase: 'wound_review', answers, patient: adult() });
    expect(r.narrative.text).toMatch(/Wound aetiology: Venous leg ulcer/);
    expect(r.narrative.text).not.toMatch(/Little interest/);
    expect(r.narrative.scores).toMatch(/PHQ-2 1\/6/);
    expect(r.barriers.some(b => b.barrier === 'Smoking / nicotine')).toBe(true);
  });
});

describe('comparison with the previous review', () => {
  it('reports deltas and direction', () => {
    const prior = [{ encounterId: 'e1', at: '2026-10-01T10:00:00Z', moduleId: 'wound_care_review', phase: 'wound_review' as const,
      answers: { 'core.wound_length': 4, 'core.wound_width': 5, 'core.pain_score': 6 }, scores: [] }];
    const r = readReview({ module: woundCareReview, phase: 'follow_up', answers: { 'core.wound_length': 3, 'core.wound_width': 4, 'core.pain_score': 2 }, patient: adult(), prior });
    const area = r.comparison.find(c => c.label.startsWith('Wound area'))!;
    expect(area).toMatchObject({ before: 20, now: 12, trend: 'better' });
    expect(r.comparison.find(c => c.label === 'Pain score')?.trend).toBe('better');
  });
});

describe('handoffs to another procedure review', () => {
  it('links by module and phase on the same patient page', async () => {
    const { getModule } = await import('../registry');
    const scalp = getModule('scalp_tumour_excision')!;
    const links = composeTemplate(scalp, 'post_op').handoffs ?? [];
    const recon = links.find(h => /Scalp reconstruction/.test(h.label));
    expect(recon?.route).toBe('?module=scalp_reconstruction&phase=pre_op');
    const burns = composeTemplate(getModule('burns_excision_grafting')!, 'follow_up').handoffs ?? [];
    expect(burns.some(h => h.route === '?module=contracture_release&phase=pre_op')).toBe(true);
    const skin = composeTemplate(getModule('skin_tumour_excision')!, 'pre_op').handoffs ?? [];
    expect(skin.some(h => h.route === '?module=melanoma_wle&phase=pre_op')).toBe(true);
  });
});
