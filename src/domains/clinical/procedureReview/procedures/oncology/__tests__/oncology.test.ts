/**
 * Key behaviours of the oncology modules: risk groups, staging through the
 * Tumour Board engine, margins by Breslow, the SLNB threshold, the sarcoma
 * red flags, keloid adjuvant rules and the infantile-haemangioma pathway.
 */
import { describe, it, expect } from 'vitest';
import type { EncounterAnswers } from '../../../../data/encounterModel';
import type { ProcedureModule, ReviewPhase } from '../../../types';
import { adult, contextFor, planFor } from '../../../__tests__/fixtures';
import { planLines } from '../../../planBuilder';
import { patientRisks } from '../../../consent';
import { skinTumourExcision, skinTumourRisk } from '../skinTumourExcision';
import { melanomaWle, stageOf } from '../melanomaWle';
import { scalpTumourExcision } from '../scalpTumourExcision';
import { softTissueLesionExcision, sarcomaRedFlags } from '../softTissueLesionExcision';
import { keloidManagement } from '../keloidManagement';
import { vascularAnomaly } from '../vascularAnomaly';
import { ONCOLOGY_MODULES } from '..';

const texts = (m: ProcedureModule, phase: ReviewPhase, a: EncounterAnswers, patient = adult()) =>
  planLines(planFor(m, phase, a, patient).plan).map(l => l.line.text);
const has = (lines: string[], re: RegExp) => lines.some(t => re.test(t));

describe('oncology registry', () => {
  it('registers six modules with unique ids', () => {
    expect(ONCOLOGY_MODULES.map(m => m.id)).toEqual([
      'skin_tumour_excision', 'melanoma_wle', 'scalp_tumour_excision', 'soft_tissue_lesion_excision', 'keloid_management', 'vascular_anomaly',
    ]);
  });
});

describe('skin_tumour_excision', () => {
  const s = (id: string) => `skin_tumour_excision.${id}`;

  it('classifies a small trunk nodular BCC as low risk with a 4 mm margin', () => {
    const a = { [s('diagnosis')]: 'bcc', [s('site')]: 'trunk_limbs', [s('size_mm')]: 8, [s('borders')]: 'well', [s('primary')]: 'primary' };
    expect(skinTumourRisk(a).tier).toBe('low');
    expect(has(texts(skinTumourExcision, 'pre_op', a), /margin 4 mm/)).toBe(true);
  });

  it('makes an H-zone BCC high risk and asks for margin control on the face', () => {
    const a = { [s('diagnosis')]: 'bcc', [s('site')]: 'h_zone', [s('size_mm')]: 8 };
    expect(skinTumourRisk(a).tier).toBe('high');
    expect(has(texts(skinTumourExcision, 'pre_op', a), /Margin-controlled excision/)).toBe(true);
  });

  it('puts a thick, poorly differentiated cSCC in the very-high tier with 10 mm margins and an MDT', () => {
    const a = { [s('diagnosis')]: 'scc', [s('site')]: 'trunk_limbs', [s('size_mm')]: 15, [s('biopsy')]: 'done', [s('biopsy_result')]: 'scc_poor' };
    const r = skinTumourRisk(a);
    expect(r.tier).toBe('very_high');
    const lines = texts(skinTumourExcision, 'pre_op', a);
    expect(has(lines, /margin 10 mm/)).toBe(true);
    expect(has(lines, /Skin-cancer MDT before excision/)).toBe(true);
  });

  it('cautions when the planned margin is below the published one', () => {
    const a = { [s('diagnosis')]: 'scc', [s('site')]: 'trunk_limbs', [s('size_mm')]: 25, [s('margin_mm')]: 3 };
    const out = planFor(skinTumourExcision, 'pre_op', a);
    expect(out.plan.cautions.some(c => /narrower than the published 6 mm/.test(c))).toBe(true);
  });

  it('flags a pigmented lesion with a 7-point score of 3 or more as suspected melanoma', () => {
    const a = { [s('diagnosis')]: 'pigmented', [s('sp.size_change')]: '2', [s('sp.diameter')]: '1', [s('sp.shape')]: '0', [s('sp.colour')]: '0', [s('sp.inflammation')]: '0', [s('sp.oozing')]: '0', [s('sp.sensation')]: '0' };
    const ctx = contextFor(skinTumourExcision, 'pre_op', a);
    expect(ctx.scores['skin_tumour_excision.seven_point'].total).toBe(3);
    expect(has(texts(skinTumourExcision, 'pre_op', a), /excision biopsy with a 2 mm clinical margin/)).toBe(true);
  });

  it('adds the albinism problem and Marjolin work-up', () => {
    const a = { [s('diagnosis')]: 'scc', [s('predisposition')]: ['albinism', 'marjolin'] };
    const out = planFor(skinTumourExcision, 'pre_op', a);
    expect(out.plan.problems.some(p => /albinism/i.test(p.problem))).toBe(true);
    expect(has(planLines(out.plan).map(l => l.line.text), /Multiple biopsies from the edge and the base/)).toBe(true);
  });

  it('stages head and neck cSCC with the Tumour Board engine (thickness over 6 mm is T3)', () => {
    const a = { [s('site')]: 'face_other', [s('size_mm')]: 15, [s('histology')]: 'scc_mod', [s('thickness_mm')]: 7, [s('margin_status')]: 'clear' };
    const ctx = contextFor(skinTumourExcision, 'post_op', a);
    expect(ctx.scores['skin_tumour_excision.ajcc'].band?.label).toMatch(/^pT3/);
  });

  it('re-excises an involved deep margin', () => {
    const a = { [s('diagnosis')]: 'bcc', [s('histology')]: 'bcc_low', [s('margin_status')]: 'deep' };
    expect(has(texts(skinTumourExcision, 'post_op', a), /Re-excise the deep margin/)).toBe(true);
  });
});

describe('melanoma_wle', () => {
  const m = (id: string) => `melanoma_wle.${id}`;
  const base = { [m('invasion')]: 'invasive', [m('ulceration')]: 'no', [m('site')]: 'trunk', [m('diagnosis_basis')]: 'excision_biopsy' };

  it('uses NCCN margins by Breslow', () => {
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('breslow_mm')]: 0.5 }), /with 1 cm clinical margins/)).toBe(true);
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('breslow_mm')]: 1.5 }), /with 1-2 cm clinical margins/)).toBe(true);
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('breslow_mm')]: 3 }), /with 2 cm clinical margins/)).toBe(true);
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('invasion')]: 'insitu' }), /0.5-1.0 cm/)).toBe(true);
  });

  it('applies the SLNB threshold at T1b', () => {
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('breslow_mm')]: 0.5 }, adult({ ageYears: 60 })), /Sentinel node biopsy not recommended/)).toBe(true);
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('breslow_mm')]: 0.9 }), /Discuss and consider sentinel node biopsy/)).toBe(true);
    expect(has(texts(melanomaWle, 'pre_op', { ...base, [m('breslow_mm')]: 1.2 }), /Offer sentinel node biopsy/)).toBe(true);
  });

  it('stages through AJCC 8 (2.5 mm ulcerated, SLNB positive = IIIC)', () => {
    const a = { ...base, [m('breslow_mm')]: 2.5, [m('ulceration')]: 'yes', [m('slnb_result')]: 'positive', [m('positive_nodes')]: 1 };
    expect(stageOf(a)?.stageGroup).toBe('IIIC');
    const lines = texts(melanomaWle, 'post_op', a);
    expect(has(lines, /Completion lymph-node dissection is not routinely recommended/)).toBe(true);
  });

  it('plans digit amputation for nail-unit melanoma and refers when SLNB is unavailable', () => {
    const a = { ...base, [m('site')]: 'subungual', [m('subtype')]: 'alm', [m('breslow_mm')]: 2, [m('digit_level')]: 'dip', [m('slnb')]: 'unavailable' };
    const lines = texts(melanomaWle, 'pre_op', a);
    expect(has(lines, /Amputation at the most distal level/)).toBe(true);
    expect(has(lines, /Refer for SLNB to a centre with lymphoscintigraphy/)).toBe(true);
    const risks = patientRisks(contextFor(melanomaWle, 'pre_op', a)).map(r => r.why);
    expect(risks).toContain('Nail-unit melanoma');
  });

  it('gives the stage-based follow-up schedule', () => {
    expect(has(texts(melanomaWle, 'follow_up', { ...base, [m('breslow_mm')]: 0.5 }), /every 6–12 months for 5 years/)).toBe(true);
    expect(has(texts(melanomaWle, 'follow_up', { ...base, [m('breslow_mm')]: 3, [m('ulceration')]: 'yes' }), /every 3–6 months for 2 years/)).toBe(true);
  });
});

describe('scalp_tumour_excision', () => {
  const sc = (id: string) => `scalp_tumour_excision.${id}`;

  it('asks for CT when the tumour is fixed and hands the closure to scalp_reconstruction', () => {
    const a = { [sc('tumour')]: 'scc', [sc('fixation')]: 'pericranium', [sc('ct')]: 'not_done', [sc('mri')]: 'not_done' };
    const lines = texts(scalpTumourExcision, 'pre_op', a);
    expect(has(lines, /CT head with bone windows/)).toBe(true);
    expect(has(lines, /Scalp reconstruction procedure review \(scalp_reconstruction\)/)).toBe(true);
  });

  it('warns against frozen sections for DFSP', () => {
    const out = planFor(scalpTumourExcision, 'pre_op', { [sc('tumour')]: 'dfsp', [sc('margin_control')]: 'frozen' });
    expect(out.plan.cautions.some(c => /Frozen sections are unreliable for DFSP/.test(c))).toBe(true);
  });

  it('stages calvarial invasion as T4a', () => {
    const ctx = contextFor(scalpTumourExcision, 'post_op', { [sc('tumour')]: 'scc', [sc('size_cm')]: 3, [sc('bone_histology')]: 'involved' });
    expect(ctx.scores['scalp_tumour_excision.ajcc'].band?.label).toMatch(/T4a/);
  });
});

describe('soft_tissue_lesion_excision', () => {
  const st = (id: string) => `soft_tissue_lesion_excision.${id}`;

  it('counts the published sarcoma red flags', () => {
    expect(sarcomaRedFlags({ [st('size_cm')]: 6, [st('depth')]: 'deep', [st('growth')]: 'increasing', [st('painful')]: true, [st('recurrent')]: true })).toHaveLength(5);
    expect(sarcomaRedFlags({ [st('size_cm')]: 3, [st('depth')]: 'subcut', [st('growth')]: 'static' })).toHaveLength(0);
  });

  it('orders urgent ultrasound for a growing superficial lump, and MRI + core biopsy for a deep one', () => {
    expect(has(texts(softTissueLesionExcision, 'pre_op', { [st('size_cm')]: 3, [st('depth')]: 'subcut', [st('growth')]: 'increasing' }), /Urgent ultrasound \(within 2 weeks\)/)).toBe(true);
    expect(has(texts(softTissueLesionExcision, 'pre_op', { [st('size_cm')]: 3, [st('depth')]: 'deep' }), /MRI with contrast, then image-guided core biopsy/)).toBe(true);
  });

  it('uses the 48-hour pathway for a young person', () => {
    expect(has(texts(softTissueLesionExcision, 'pre_op', { [st('size_cm')]: 3, [st('depth')]: 'subcut', [st('growth')]: 'increasing' }, adult({ ageYears: 12 })), /within 48 hours/)).toBe(true);
  });

  it('sends an unexpected sarcoma to the sarcoma MDT', () => {
    expect(has(texts(softTissueLesionExcision, 'post_op', { [st('histology')]: 'malignant' }), /Urgent sarcoma MDT/)).toBe(true);
  });
});

describe('keloid_management', () => {
  const k = (id: string) => `keloid_management.${id}`;

  it('never lets excision alone stand', () => {
    expect(has(texts(keloidManagement, 'pre_op', { [k('plan')]: 'excision_alone' }), /Add an adjuvant/)).toBe(true);
  });

  it('gives the JSW site-based radiotherapy dose', () => {
    expect(has(texts(keloidManagement, 'pre_op', { [k('plan')]: 'excision_rt', [k('site')]: 'earlobe' }), /10 Gy in 2 fractions/)).toBe(true);
    expect(has(texts(keloidManagement, 'pre_op', { [k('plan')]: 'excision_rt', [k('site')]: 'chest' }), /20 Gy in 4 fractions/)).toBe(true);
  });

  it('scores the VSS with the scar module', () => {
    const ctx = contextFor(keloidManagement, 'pre_op', { [k('vss.vascularity')]: '2', [k('vss.pigmentation')]: '3', [k('vss.pliability')]: '3', [k('vss.height')]: '3' });
    expect(ctx.scores['keloid_management.vss'].total).toBe(11);
  });

  it('raises the high-tension-site consent modifier', () => {
    const risks = patientRisks(contextFor(keloidManagement, 'pre_op', { [k('site')]: 'chest' })).map(r => r.why);
    expect(risks.some(w => /High-tension site/.test(w))).toBe(true);
  });
});

describe('vascular_anomaly', () => {
  const v = (id: string) => `vascular_anomaly.${id}`;

  it('works up a segmental facial haemangioma for PHACE and prescribes propranolol at 2–3 mg/kg/day', () => {
    const a = { [v('issva')]: 'ih', [v('segmental')]: 'facial', [v('intervention')]: 'propranolol', [v('ih_count')]: 6 };
    const lines = texts(vascularAnomaly, 'pre_op', a, adult({ ageYears: 0 }));
    expect(has(lines, /PHACE work-up before propranolol/)).toBe(true);
    expect(has(lines, /Propranolol 2–3 mg\/kg\/day/)).toBe(true);
    expect(has(lines, /Abdominal ultrasound for hepatic haemangiomas/)).toBe(true);
  });

  it('checks coagulation before treating a venous malformation and forbids partial AVM excision', () => {
    expect(has(texts(vascularAnomaly, 'pre_op', { [v('issva')]: 'vm', [v('coag')]: 'not_done' }), /D-dimer, fibrinogen/)).toBe(true);
    expect(has(texts(vascularAnomaly, 'pre_op', { [v('issva')]: 'avm' }), /do not ligate proximally or excise partially/)).toBe(true);
  });
});
