/** Key behaviours of the cleft and breast / body contouring modules (the registry test checks the contract). */
import { describe, it, expect } from 'vitest';
import { planLines } from '../../../planBuilder';
import { patientRisks } from '../../../consent';
import { contextFor, planFor, adult } from '../../../__tests__/fixtures';
import { cleftLipPalate } from '../cleftLipPalate';
import { breastBodyContouring } from '../breastBodyContouring';

const lines = (out: ReturnType<typeof planFor>) => planLines(out.plan).map(l => l.line);
const has = (out: ReturnType<typeof planFor>, re: RegExp) => lines(out).some(l => re.test(l.text));
const infant = adult({ ageYears: 0, sex: 'male' });

describe('cleft lip and palate', () => {
  it('applies the rule of 10s to primary lip repair, reading weight and Hb from the core', () => {
    const out = planFor(cleftLipPalate, 'pre_op', {
      'cleft_lip_palate.operation': 'lip', 'cleft_lip_palate.age_weeks': 8, 'core.weight_kg': 4.1, 'core.hb': 9.2,
    }, infant);
    const l = lines(out).find(x => /^Rule of 10s not met/.test(x.text));
    expect(l?.text).toMatch(/age 8 weeks/);
    expect(l?.text).toMatch(/weight 4.1 kg/);
    expect(l?.text).toMatch(/Hb 9.2/);
    expect(l?.priority).toBe('urgent');
  });

  it('passes the rule of 10s when all three are met', () => {
    const out = planFor(cleftLipPalate, 'pre_op', {
      'cleft_lip_palate.operation': 'lip', 'cleft_lip_palate.age_weeks': 14, 'core.weight_kg': 5.6, 'core.hb': 11,
    }, infant);
    expect(has(out, /Rule of 10s/)).toBe(false);
  });

  it('plans the airway for Pierre Robin sequence', () => {
    const out = planFor(cleftLipPalate, 'pre_op', { 'cleft_lip_palate.operation': 'palate', 'cleft_lip_palate.associated': ['pierre_robin'] }, infant);
    expect(lines(out).find(l => /^ENT and senior paediatric anaesthetist/.test(l.text))?.priority).toBe('urgent');
    expect(patientRisks(contextFor(cleftLipPalate, 'pre_op', { 'cleft_lip_palate.associated': ['pierre_robin'] }, infant)).some(r => /Pierre Robin/.test(r.why))).toBe(true);
  });

  it('prompts alveolar bone graft planning in the mixed dentition', () => {
    const out = planFor(cleftLipPalate, 'follow_up', { 'cleft_lip_palate.cleft': 'uclp' }, adult({ ageYears: 9 }));
    expect(has(out, /alveolar bone grafting in the mixed dentition/)).toBe(true);
  });
});

describe('breast reduction and body contouring', () => {
  it('writes only the chosen operation\'s specific consent risks', () => {
    const reduction = patientRisks(contextFor(breastBodyContouring, 'pre_op', { 'breast_and_body_contouring.procedures': ['reduction'] })).map(r => r.why);
    expect(reduction.some(w => /BREAST-001/.test(w))).toBe(true);
    expect(reduction.some(w => /BODY-001/.test(w))).toBe(false);
    const abdo = patientRisks(contextFor(breastBodyContouring, 'pre_op', { 'breast_and_body_contouring.procedures': ['abdominoplasty'] })).map(r => r.why);
    expect(abdo.some(w => /BODY-001/.test(w))).toBe(true);
    expect(abdo.some(w => /Hatef/.test(w))).toBe(true);
  });

  it('flags large-volume liposuction and plans overnight monitoring (ASPS 2004)', () => {
    const answers = { 'breast_and_body_contouring.procedures': ['liposuction'], 'breast_and_body_contouring.aspirate_ml': 6500 };
    expect(contextFor(breastBodyContouring, 'pre_op', answers).flags.some(f => /large-volume/.test(f.reason))).toBe(true);
    expect(lines(planFor(breastBodyContouring, 'pre_op', answers)).find(l => /^Large-volume liposuction/.test(l.text))?.priority).toBe('urgent');
  });

  it('cautions against abdominoplasty in a nicotine user', () => {
    const out = planFor(breastBodyContouring, 'pre_op', { 'breast_and_body_contouring.procedures': ['abdominoplasty'], 'core.smoking': 'current' });
    expect(out.plan.cautions.some(c => /Abdominoplasty in a nicotine user/.test(c))).toBe(true);
  });

  it('treats a threatened nipple–areola as urgent', () => {
    const out = planFor(breastBodyContouring, 'post_op', { 'breast_and_body_contouring.procedures': ['reduction'], 'breast_and_body_contouring.nac': 'congested' });
    expect(lines(out).find(l => /^Threatened nipple–areola/.test(l.text))?.priority).toBe('urgent');
  });

  it('gives aesthetic-group handling to the appearance screen (core rule)', () => {
    expect(breastBodyContouring.group).toBe('aesthetic');
  });
});
