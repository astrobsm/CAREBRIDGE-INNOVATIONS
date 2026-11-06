/**
 * Limb, hand and burns modules: the key behaviours of their scores and rules.
 * (The registry test checks every module against the contract.)
 */
import { describe, it, expect } from 'vitest';
import { getModule } from '../../registry';
import { planLines } from '../../planBuilder';
import { patientRisks } from '../../consent';
import { adult, contextFor, planFor } from '../../__tests__/fixtures';
import { diabeticFootDebridement as dfu } from './diabeticFootDebridement';
import { lowerLimbAmputation as amp } from './lowerLimbAmputation';
import { tendonRepair as tendon } from './tendonRepair';
import { nerveRepairHandTrauma as nerve } from './nerveRepairHandTrauma';
import { burnsExcisionGrafting as burns } from './burnsExcisionGrafting';
import { necrotisingSoftTissueInfection as nsti } from './necrotisingSoftTissueInfection';
import { npwt } from './npwt';

const lines = (p: ReturnType<typeof planFor>) => planLines(p.plan);
const text = (p: ReturnType<typeof planFor>) => lines(p).map(l => l.line.text).join('\n');
const urgent = (p: ReturnType<typeof planFor>, re: RegExp) => lines(p).find(l => re.test(l.line.text))?.line.priority;

describe('registration', () => {
  it('registers all seven modules', () => {
    for (const id of ['diabetic_foot_debridement', 'lower_limb_amputation', 'tendon_repair', 'nerve_repair_hand_trauma',
      'burns_excision_grafting', 'necrotising_soft_tissue_infection', 'npwt']) expect(getModule(id), id).toBeDefined();
  });
});

describe('diabetic foot debridement', () => {
  const D = (x: string) => `diabetic_foot_debridement.${x}`;

  it('grades WIfI with computeWifi and flags toe pressure below 30 mmHg as urgent', () => {
    const answers = {
      [D('region')]: 'forefoot', [D('gangrene')]: 'dry_toe', [D('infection_grade')]: '3',
      [D('brachial_r')]: 140, [D('brachial_l')]: 135, [D('ankle_pressure')]: 210, [D('toe_pressure')]: 25,
      'core.diabetes': 'insulin',
    };
    const c = contextFor(dfu, 'wound_review', answers);
    const w = c.scores['diabetic_foot_debridement.wifi'];
    expect(w.band?.label).toMatch(/^W2 I3 fI2/);
    expect(w.flag?.level).toBe('red');
    const abi = c.scores['diabetic_foot_debridement.abi'];
    expect(abi.band?.label).toMatch(/Non-compressible/);
    const out = planFor(dfu, 'wound_review', answers);
    expect(urgent(out, /Urgent vascular imaging/)).toBe('urgent');
    expect(out.plan.cautions.join(' ')).toMatch(/drain and debride now, then revascularise/);
  });

  it('SINBAD takes ischaemia from absent pulses and depth from exposed bone', () => {
    const c = contextFor(dfu, 'wound_review', {
      [D('region')]: 'hindfoot', [D('pedal_pulses')]: 'none', [D('monofilament')]: 'lost', [D('infection_grade')]: '2',
      'core.wound_area': 4, 'core.wound_exposed': ['bone'],
    });
    expect(c.scores['diabetic_foot_debridement.sinbad'].total).toBe(6);
  });

  it('severe infection is its own urgent problem; uninfected ulcers get no antibiotics', () => {
    const severe = planFor(dfu, 'wound_review', { [D('infection_grade')]: '4' });
    expect(severe.plan.problems.some(p => p.problem === 'Severe diabetic foot infection')).toBe(true);
    const clean = planFor(dfu, 'wound_review', { [D('infection_grade')]: '1' });
    expect(text(clean)).toMatch(/No antibiotics for an uninfected ulcer/);
  });

  it('consent modifiers fire for renal failure and late presentation', () => {
    const r = patientRisks(contextFor(dfu, 'pre_op', { 'core.renal': 'dialysis', [D('presentation')]: 'over_4w' })).map(x => x.why);
    expect(r).toEqual(expect.arrayContaining(['CKD 4–5 / dialysis', 'Late presentation (over 4 weeks)']));
  });

  it('follow-up: IWGDF category 3 after an ulcer with loss of protective sensation', () => {
    const c = contextFor(dfu, 'follow_up', { [D('monofilament')]: 'lost', [D('ulcer_status')]: 'healed' });
    expect(c.scores['diabetic_foot_debridement.iwgdf_risk'].total).toBe(3);
  });
});

describe('lower-limb amputation', () => {
  const A = (x: string) => `lower_limb_amputation.${x}`;
  it('stages an infected major amputation and asks about the limb disposal', () => {
    const out = planFor(amp, 'pre_op', { [A('level')]: 'transtibial', [A('skin_at_level')]: 'infected', [A('limb_disposal')]: 'not_discussed' });
    expect(urgent(out, /open \(guillotine\) amputation/)).toBe('urgent');
    expect(text(out)).toMatch(/what the patient and family want done with the limb/);
  });
  it('post-op flap necrosis returns to theatre urgently', () => {
    expect(urgent(planFor(amp, 'post_op', { [A('flap')]: 'necrosis' }), /Return to theatre/)).toBe('urgent');
  });
});

describe('tendon repair', () => {
  const T = (x: string) => `tendon_repair.${x}`;
  it('computes the Strickland score with the published bands', () => {
    const c = contextFor(tendon, 'follow_up', { [T('type')]: 'flexor', [T('pip_flex')]: 90, [T('dip_flex')]: 60, [T('pip_lag')]: 10, [T('dip_lag')]: 5 });
    const s = c.scores['tendon_repair.strickland'];
    expect(s.total).toBe(77); // (90 + 60 - 15) / 175
    expect(s.band?.label).toMatch(/Good/);
  });
  it('suspected rupture is urgent; a devascularised digit goes to theatre now', () => {
    expect(urgent(planFor(tendon, 'post_op', { [T('complication')]: ['rupture'] }), /re-exploration/)).toBe('urgent');
    expect(urgent(planFor(tendon, 'pre_op', { [T('nv_injury')]: ['devascularised'] }), /digital arteries/)).toBe('urgent');
  });
  it('children under 10 are steered to immobilisation', () => {
    expect(text(planFor(tendon, 'pre_op', {}, adult({ ageYears: 6 })))).toMatch(/3–4 weeks of immobilisation/);
  });
});

describe('nerve repair and hand trauma', () => {
  const N = (x: string) => `nerve_repair_hand_trauma.${x}`;
  it('flags a Tinel sign that has not advanced since the last review', () => {
    const prior = [{ encounterId: 'e1', at: '2026-08-01T10:00:00Z', moduleId: 'nerve_repair_hand_trauma', phase: 'follow_up' as const, answers: { [N('tinel_cm')]: 3 }, scores: [] }];
    const out = planFor(nerve, 'follow_up', { [N('tinel_cm')]: 3, [N('weeks_post')]: 16 }, adult(), prior);
    expect(urgent(out, /Tinel's sign has not advanced/)).toBe('urgent');
  });
  it('replant: venous congestion is urgent; ischaemia time beyond tolerance is a caution', () => {
    expect(urgent(planFor(nerve, 'post_op', { [N('components')]: ['amputation'], [N('replant_monitor')]: 'venous' }), /Venous congestion/)).toBe('urgent');
    const pre = planFor(nerve, 'pre_op', { [N('components')]: ['amputation'], [N('amp_level')]: 'hand_wrist', [N('ischaemia_h')]: 8 });
    expect(pre.plan.cautions.join(' ')).toMatch(/about 6 h/);
  });
});

describe('burns', () => {
  const B = (x: string) => `burns_excision_grafting.${x}`;
  it('computes the starting fluid volume with calculateParkland and the revised Baux with calculateBaux', () => {
    const c = contextFor(burns, 'wound_review', { [B('tbsa')]: 30, [B('inhalation')]: 'suspected', 'core.weight_kg': 70 }, adult({ ageYears: 40 }));
    expect(c.scores['burns_excision_grafting.fluids'].total).toBe(4200); // 2 x 70 x 30
    expect(c.scores['burns_excision_grafting.baux'].total).toBe(87); // 40 + 30 + 17
    const out = planFor(burns, 'wound_review', { [B('tbsa')]: 30, 'core.weight_kg': 70 }, adult({ ageYears: 40 }));
    expect(out.plan.problems.some(p => p.problem === 'Burn shock — fluid resuscitation')).toBe(true);
  });
  it('no fluid formula below the major-burn threshold', () => {
    const c = contextFor(burns, 'wound_review', { [B('tbsa')]: 12, 'core.weight_kg': 70 }, adult({ ageYears: 40 }));
    expect(c.scores['burns_excision_grafting.fluids']).toBeUndefined();
  });
  it('escharotomy and safeguarding concerns are urgent', () => {
    const out = planFor(burns, 'wound_review', { [B('escharotomy')]: 'needed', [B('safeguarding')]: ['immersion'] }, adult({ ageYears: 1 }));
    expect(urgent(out, /Escharotomy now/)).toBe('urgent');
    expect(out.plan.problems.some(p => p.problem === 'Safeguarding concern')).toBe(true);
    expect(text(out)).toMatch(/Skeletal survey/);
  });
  it('ABA sepsis: three criteria raise a red flag and a sepsis problem', () => {
    const c = contextFor(burns, 'post_op', { [B('aba_sepsis')]: ['temperature', 'tachycardia', 'thrombocytopenia'] });
    expect(c.scores['burns_excision_grafting.aba_sepsis'].flag?.level).toBe('red');
    expect(planFor(burns, 'post_op', { [B('aba_sepsis')]: ['temperature', 'tachycardia', 'thrombocytopenia'] }).plan.problems.some(p => p.problem === 'Burn sepsis (ABA criteria)')).toBe(true);
  });
});

describe('necrotising soft-tissue infection', () => {
  const S = (x: string) => `necrotising_soft_tissue_infection.${x}`;
  it('computes LRINEC with calculateLRINEC (Hb and glucose from the core)', () => {
    const c = contextFor(nsti, 'pre_op', { [S('crp')]: 200, [S('wbc')]: 20, [S('sodium')]: 130, [S('creatinine')]: 150, 'core.hb': 12, 'core.glucose': 12 });
    expect(c.scores['necrotising_soft_tissue_infection.lrinec'].total).toBe(4 + 1 + 1 + 2 + 2 + 1);
  });
  it('hard signs mean emergency theatre even with a low LRINEC', () => {
    const out = planFor(nsti, 'pre_op', { [S('hard_signs')]: ['bullae'], [S('crp')]: 10, [S('wbc')]: 9, [S('sodium')]: 140, [S('creatinine')]: 80, 'core.hb': 14, 'core.glucose': 6 });
    expect(urgent(out, /Emergency theatre now/)).toBe('urgent');
    expect(out.plan.cautions.join(' ')).toMatch(/misses about a third/);
  });
  it('post-op: an unbooked re-look is urgent', () => {
    expect(urgent(planFor(nsti, 'post_op', { [S('completeness')]: 'complete', [S('relook_booked')]: 'not_booked' }), /Book a re-look/)).toBe('urgent');
  });
});

describe('NPWT', () => {
  const P = (x: string) => `npwt.${x}`;
  it('contraindications stop application; frank blood stops therapy; missing pieces are urgent', () => {
    expect(urgent(planFor(npwt, 'wound_review', { [P('contraindications')]: ['exposed_vessels'] }), /Do not apply NPWT/)).toBe('urgent');
    const out = planFor(npwt, 'post_op', { [P('canister_fluid')]: 'frank_blood', [P('pieces_in')]: 3, [P('pieces_out')]: 2 });
    expect(urgent(out, /Stop NPWT now/)).toBe('urgent');
    expect(urgent(out, /Pieces unaccounted for/)).toBe('urgent');
  });
  it('stops after 2 weeks without improvement', () => {
    expect(text(planFor(npwt, 'post_op', { [P('response')]: 'static', [P('days_on')]: 15 }))).toMatch(/no measurable improvement after 2 weeks/);
  });
});
