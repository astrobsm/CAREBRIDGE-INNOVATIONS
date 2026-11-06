/**
 * Clinical-safety regressions: each case is a hazard found in review, held
 * here so it cannot come back. One describe per theme.
 */
import { describe, it, expect } from 'vitest';
import { composeTemplate, readReview } from '../engine';
import { planLines } from '../planBuilder';
import { buildConsentDraft } from '../consent';
import { getModule } from '../registry';
import { adult, contextFor, planFor } from './fixtures';
import { applyPlanEdits, planAsText } from '../records';
import { filterPlan, toTreatmentPlan } from '../../scribe/approval';
import type { EncounterAnswers } from '../../data/encounterModel';
import type { PriorReview, ReviewPatient, ReviewPhase } from '../types';
import { isVisible } from '../../services/templateEngine';
import { riskKey } from '../../../surgery/utils/surgicalDocumentGenerator';

const mod = (id: string) => getModule(id)!;
const lines = (id: string, phase: ReviewPhase, a: EncounterAnswers, p: ReviewPatient = adult()) =>
  planLines(planFor(mod(id), phase, a, p).plan).map(l => l.line);
const texts = (id: string, phase: ReviewPhase, a: EncounterAnswers, p: ReviewPatient = adult()) =>
  lines(id, phase, a, p).map(l => l.text);
const cautions = (id: string, phase: ReviewPhase, a: EncounterAnswers, p: ReviewPatient = adult()) =>
  planFor(mod(id), phase, a, p).plan.cautions;
const infant = (months: number): ReviewPatient => adult({ ageYears: Math.floor(months / 12), ageMonths: months });
const fields = (id: string, phase: ReviewPhase, p: ReviewPatient = adult()) =>
  composeTemplate(mod(id), phase, p).sections.flatMap(s => s.fields.map(f => f.id));

describe('core: age gating', () => {
  const normalInfantObs = { 'core.obs_rr': 35, 'core.obs_spo2': 98, 'core.obs_temp': 37, 'core.obs_sbp': 85, 'core.obs_hr': 135, 'core.obs_avpu': 'alert' };

  it('does not score NEWS2 under 16', () => {
    const r = readReview({ module: mod('cleft_lip_palate'), phase: 'post_op', answers: { 'cleft_lip_palate.operation': 'palate', ...normalInfantObs }, patient: infant(10) });
    expect(r.scoreMap.news2.total).toBeNull();
    expect(r.scoreMap.news2.band?.label).toMatch(/paediatric early warning/);
    expect(r.flags.some(f => f.fieldLabel.includes('NEWS2'))).toBe(false);
  });

  it('flags a single NEWS2 3-point parameter in an adult when the set is incomplete', () => {
    const r = readReview({ module: mod('skin_graft'), phase: 'post_op', answers: { 'core.obs_sbp': 82 }, patient: adult() });
    expect(r.scoreMap.news2.total).toBeNull();
    expect(r.scoreMap.news2.flag?.level).toBe('red');
    expect(lines('skin_graft', 'post_op', { 'core.obs_sbp': 82 }).some(l => /systolic BP 82/.test(l.text) && l.priority === 'urgent')).toBe(true);
  });

  it('does not offer NSAIDs to an infant under 3 months, or in pregnancy', () => {
    const t = texts('cleft_lip_palate', 'pre_op', {}, infant(2));
    expect(t).toContain('Avoid NSAIDs');
    expect(t.some(x => /Add a regular NSAID/.test(x))).toBe(false);
    expect(texts('breast_and_body_contouring', 'pre_op', { 'core.pregnancy': 'pregnant' }, adult({ sex: 'female', ageYears: 30 }))).toContain('Avoid NSAIDs');
    expect(texts('cleft_lip_palate', 'pre_op', {}, infant(6)).some(x => /Add a regular NSAID/.test(x))).toBe(true);
  });

  it('gives a weight-based hypoglycaemia dose to a child', () => {
    const t = texts('skin_graft', 'pre_op', { 'core.glucose': 3.1 }, adult({ ageYears: 6 }));
    expect(t.some(x => /0\.3 g\/kg/.test(x))).toBe(true);
    expect(t.some(x => /15–20 g/.test(x))).toBe(false);
  });

  it('asks the safeguarding question of adolescents (13–17)', () => {
    expect(fields('skin_graft', 'pre_op', adult({ ageYears: 15 }))).toContain('core.child_safeguarding');
    expect(fields('skin_graft', 'pre_op', adult({ ageYears: 18 }))).not.toContain('core.child_safeguarding');
  });
});

describe('core: heparin-induced thrombocytopenia', () => {
  it('never prescribes LMWH with HIT, and says so as a caution', () => {
    const a = { 'core.surgery_extent': 'major', 'core.caprini': ['heparin_thrombocytopenia', 'malignancy'] };
    const t = texts('free_flap', 'pre_op', a);
    expect(t.some(x => /enoxaparin 40 mg/.test(x))).toBe(false);
    expect(t.some(x => /non-heparin/.test(x))).toBe(true);
    expect(cautions('free_flap', 'pre_op', a).some(c => /no heparin of any kind/.test(c))).toBe(true);
    expect(cautions('free_flap', 'post_op', {}, adult({ allergies: ['heparin'] })).some(c => /no heparin of any kind/.test(c))).toBe(true);
  });
});

describe('core tetanus: incomplete primary course', () => {
  it('gives immunoglobulin for a tetanus-prone wound without a complete primary course', () => {
    const t = texts('tendon_repair', 'pre_op', { 'core.tetanus': 'primary_incomplete', 'core.tetanus_wound': 'prone' });
    expect(t.find(x => /Tetanus prophylaxis/.test(x))).toMatch(/immunoglobulin/);
  });

  it('is asked in a necrotising soft-tissue infection review', () => {
    expect(fields('necrotising_soft_tissue_infection', 'pre_op')).toContain('core.tetanus');
  });
});

describe('consent', () => {
  const draft = (id: string, a: EncounterAnswers = {}) =>
    buildConsentDraft(contextFor(mod(id), 'pre_op', a), [], { patient: { name: 'Test', hospitalNumber: '1' } as never })!;
  const text = (id: string) => JSON.stringify(draft(id).sections);

  it('never attaches another procedure\'s leaflet by name', () => {
    expect(text('skin_tumour_excision')).not.toMatch(/Graft take rates/);
    expect(text('keloid_management')).not.toMatch(/Nail deformity|Osteomyelitis/);
  });

  it('does not double a frequency qualifier', () => {
    for (const id of ['skin_tumour_excision', 'melanoma_wle', 'keloid_management', 'necrotising_soft_tissue_infection', 'tendon_repair']) {
      expect(text(id), id).not.toMatch(/about about|about around/i);
    }
  });
});

describe('duplication: burns safeguarding', () => {
  it('asks safeguarding once in burns wound and pre-op reviews of a child', () => {
    for (const phase of ['wound_review', 'pre_op'] as const) {
      const ids = fields('burns_excision_grafting', phase, adult({ ageYears: 8 }));
      expect(ids).toContain('burns_excision_grafting.safeguarding');
      expect(ids).not.toContain('core.child_safeguarding');
    }
  });
});

describe('burns resuscitation', () => {
  const line = (a: EncounterAnswers, p: ReviewPatient) => texts('burns_excision_grafting', 'wound_review', a, p).find(x => /IV crystalloid/.test(x)) ?? '';

  it('uses 3 mL/kg/%TBSA plus maintenance for a child, and 4 for high voltage', () => {
    const child = line({ 'burns_excision_grafting.tbsa': 30, 'core.weight_kg': 20, 'burns_excision_grafting.hours_since': 2 }, adult({ ageYears: 5 }));
    expect(child).toMatch(/1800 mL/);
    expect(child).toMatch(/maintenance with dextrose/);
    const hv = line({ 'burns_excision_grafting.tbsa': 25, 'core.weight_kg': 70, 'burns_excision_grafting.mechanism': 'electrical_high', 'burns_excision_grafting.hours_since': 1 }, adult());
    expect(hv).toMatch(/7000 mL/);
  });

  it('allows for the time already elapsed since the burn', () => {
    const t = line({ 'burns_excision_grafting.tbsa': 40, 'core.weight_kg': 70, 'burns_excision_grafting.hours_since': 5 }, adult());
    expect(t).toMatch(/3 h remain/);
    expect(t).toMatch(/933 mL\/h/);
  });

  it('gives fluids for myoglobinuria whatever the burn size', () => {
    const t = texts('burns_excision_grafting', 'wound_review', { 'burns_excision_grafting.tbsa': 5, 'burns_excision_grafting.mechanism': 'electrical_high', 'burns_excision_grafting.electrical': ['myoglobinuria'] });
    expect(t.some(x => /until the urine is clear of pigment/.test(x))).toBe(true);
  });
});

describe('NSTI', () => {
  it('starts the sepsis bundle on shock alone, and avoids NSAIDs', () => {
    const t = texts('necrotising_soft_tissue_infection', 'pre_op', { 'necrotising_soft_tissue_infection.haemodynamics': 'shock' });
    expect(t.some(x => /antibiotics within 1 hour/.test(x))).toBe(true);
    expect(t).toContain('Avoid NSAIDs');
  });
});

describe('NPWT', () => {
  it('will not apply NPWT over a vessel or malignancy recorded in the core', () => {
    const a = { 'npwt.contraindications': ['none'], 'core.wound_exposed': ['vessels'], 'core.wound_aetiology': 'malignant' };
    const t = texts('npwt', 'wound_review', a);
    expect(t.some(x => /^Do not apply NPWT/.test(x))).toBe(true);
    expect(t.some(x => /−125 mmHg continuous as standard/.test(x))).toBe(false);
  });

  it('asks for the contraindications when they are not recorded, and lowers pressure for a child', () => {
    expect(lines('npwt', 'pre_op', {}).some(l => /Check and record the NPWT contraindications/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(texts('npwt', 'wound_review', { 'npwt.contraindications': ['none'] }, adult({ ageYears: 2 })).some(x => /−75 to −80 mmHg/.test(x))).toBe(true);
  });
});

describe('diabetic foot', () => {
  it('does not advise a non-removable cast with severe infection', () => {
    const t = texts('diabetic_foot_debridement', 'wound_review', { 'diabetic_foot_debridement.infection_grade': '4', 'diabetic_foot_debridement.deformity': ['charcot_active'] });
    expect(t.some(x => /removable knee-high device/.test(x) && !/^Offload in a non-removable|^Immobilise and offload now in a non-removable/.test(x))).toBe(true);
    expect(t.some(x => /^Offload in a non-removable|^Immobilise and offload now in a non-removable/.test(x))).toBe(false);
  });

  it('does not call the risk category 0 when PAD was never assessed', () => {
    const r = readReview({ module: mod('diabetic_foot_debridement'), phase: 'follow_up', answers: { 'diabetic_foot_debridement.monofilament': 'intact', 'diabetic_foot_debridement.ulcer_status': 'healed' }, patient: adult() });
    const s = r.scoreMap['diabetic_foot_debridement.iwgdf_risk'];
    expect(s.total).toBeNull();
    expect(texts('diabetic_foot_debridement', 'follow_up', { 'diabetic_foot_debridement.monofilament': 'intact', 'diabetic_foot_debridement.ulcer_status': 'healed' }).some(x => /once a year/.test(x))).toBe(false);
  });
});

describe('bites', () => {
  it('prompts rabies / blood-borne-virus assessment for a bite', () => {
    for (const [id, phase, a] of [
      ['tendon_repair', 'pre_op', { 'tendon_repair.mechanism': 'bite' }],
      ['nerve_repair_hand_trauma', 'pre_op', { 'nerve_repair_hand_trauma.mechanism': 'bite' }],
      ['wound_care_review', 'wound_review', { 'core.wound_aetiology': 'traumatic', 'wound_care_review.contamination': 'bite' }],
    ] as const) {
      expect(lines(id, phase, a).some(l => /rabies/.test(l.text) && l.priority === 'urgent'), id).toBe(true);
    }
  });
});

describe('wound care: perfusion', () => {
  it('refers a diabetic ulcer with ABPI below 0.5 urgently, and every arterial ulcer', () => {
    expect(lines('wound_care_review', 'wound_review', { 'core.wound_aetiology': 'diabetic', 'wound_care_review.abpi': 0.4 }).some(l => /Urgent vascular/.test(l.text) && l.priority === 'urgent')).toBe(true);
    const art = lines('wound_care_review', 'wound_review', { 'core.wound_aetiology': 'arterial', 'wound_care_review.abpi': 0.9 });
    expect(art.some(l => /Urgent vascular referral/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(art.some(l => /compression \(about 40 mmHg/.test(l.text))).toBe(false);
  });
});

describe('oncology', () => {
  it('does not send a possible melanoma for flap closure', () => {
    const a = { 'skin_tumour_excision.diagnosis': 'pigmented', 'skin_tumour_excision.closure': 'local_flap' };
    expect(texts('skin_tumour_excision', 'pre_op', a).some(x => /Plan the closure in its own reconstruction/.test(x))).toBe(false);
    expect(texts('skin_tumour_excision', 'pre_op', a).some(x => /2 mm clinical margin and primary closure/.test(x))).toBe(true);
  });

  it('holds propranolol when the cardiac assessment is abnormal, and observes the start under 8 weeks by date of birth', () => {
    const base = { 'vascular_anomaly.issva': 'ih', 'vascular_anomaly.intervention': 'propranolol' };
    const held = texts('vascular_anomaly', 'pre_op', { ...base, 'vascular_anomaly.hr_bp_normal': 'no' }, infant(3));
    expect(held.some(x => /^Do not start propranolol/.test(x))).toBe(true);
    expect(held.some(x => /^Propranolol 2–3 mg\/kg/.test(x))).toBe(false);
    expect(texts('vascular_anomaly', 'pre_op', base, infant(1)).some(x => /under observation/.test(x))).toBe(true);
  });

  it('does not offer SLNB before a palpable node is sampled, and does not stage without a nodal examination', () => {
    const a = { 'melanoma_wle.invasion': 'invasive', 'melanoma_wle.breslow_mm': 2, 'melanoma_wle.nodes': 'palpable' };
    expect(texts('melanoma_wle', 'pre_op', a).some(x => /Offer sentinel node biopsy/.test(x))).toBe(false);
    const r = readReview({ module: mod('melanoma_wle'), phase: 'pre_op', answers: { 'melanoma_wle.invasion': 'invasive', 'melanoma_wle.breslow_mm': 0.5 }, patient: adult() });
    expect(r.scoreMap['melanoma_wle.stage'].incomplete).toContain('Nodal examination');
  });

  it('does not reassure on an unanswered sarcoma screen', () => {
    const r = readReview({ module: mod('soft_tissue_lesion_excision'), phase: 'pre_op', answers: {}, patient: adult() });
    expect(r.scoreMap['soft_tissue_lesion_excision.sarcoma_flags'].band?.label).toMatch(/Incomplete/);
  });
});

describe('reconstruction', () => {
  it('watches for dysreflexia post-op in high spinal injury recorded pre-op (carried forward)', () => {
    expect(fields('pressure_sore_flap', 'post_op')).toContain('pressure_sore_flap.sci_level');
    expect(mod('pressure_sore_flap').carryForward).toContain('pressure_sore_flap.sci_level');
    expect(texts('pressure_sore_flap', 'post_op', { 'pressure_sore_flap.immobility_cause': 'sci', 'pressure_sore_flap.sci_level': 't6_above' }).some(x => /Watch for dysreflexia/.test(x))).toBe(true);
  });

  it('acts on a weakened Doppler signal and on a black flap', () => {
    expect(lines('free_flap', 'post_op', { 'free_flap.doppler': 'weaker' }).some(l => /Doppler signal changed/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(texts('free_flap', 'post_op', { 'free_flap.flap_colour': 'black' }).some(x => /Established flap necrosis/.test(x))).toBe(true);
  });

  it('gives a child with a pressure injury paediatric nutrition advice, not adult per-kg targets', () => {
    const t = texts('pressure_sore_flap', 'pre_op', {}, adult({ ageYears: 8 }));
    expect(t.some(x => /30–35 kcal\/kg/.test(x))).toBe(false);
    expect(t.some(x => /Paediatric dietitian/.test(x))).toBe(true);
  });
});

describe('H1: urgent lines cannot be removed silently', () => {
  // PHQ-9 item 9 positive: an urgent risk-assessment line under Psychology and wellbeing.
  const a = { 'core.phq.q1': 3, 'core.phq.q2': 3, 'core.phq.q9': 2 };
  const plan = () => planFor(mod('skin_graft'), 'pre_op', a).plan;
  const keyOf = (p: ReturnType<typeof plan>, re: RegExp) => {
    for (const [gi, g] of p.general.entries()) for (const [i, l] of g.items.entries()) if (re.test(l.text)) return { key: `g${gi}|${i}`, line: l };
    throw new Error(`no line ${re}`);
  };
  const SUICIDE = /^Same-day risk assessment/;

  it('keeps an unticked urgent line unchanged when no reason is given', () => {
    const p = plan();
    const { key } = keyOf(p, SUICIDE);
    const edited = applyPlanEdits(p, { excluded: [key], additions: [] });
    const kept = keyOf(edited, SUICIDE).line;
    expect(kept.declined).toBeUndefined();
    expect(kept.priority).toBe('urgent');
  });

  it('keeps it struck through with the reason when one is given, in the plan, the text and the submission', () => {
    const p = plan();
    const { key } = keyOf(p, SUICIDE);
    const edited = applyPlanEdits(p, { excluded: [key], additions: [], reasons: { [key]: 'Assessed by psychiatry this morning' } }, 'Dr A');
    const l = keyOf(edited, SUICIDE).line;
    expect(l.declined).toEqual({ reason: 'Assessed by psychiatry this morning', by: 'Dr A' });
    expect(planAsText(edited)).toMatch(/\[DECLINED — Assessed by psychiatry this morning, Dr A\]/);
    const submitted = filterPlan(p, new Set([key]), '', { [key]: 'Assessed by psychiatry this morning' }, 'Dr A');
    expect(keyOf(submitted, SUICIDE).line.declined?.reason).toBe('Assessed by psychiatry this morning');
    const tp = toTreatmentPlan(submitted, { id: 't', patientId: 'p', scribePlanId: 's', version: 1, createdBy: 'u', now: new Date('2026-11-06') });
    expect(tp.orders.some(o => SUICIDE.test(o.order))).toBe(false);
    expect(tp.description).toMatch(/DECLINED \(urgent\)/);
  });

  it('still removes an unticked routine line', () => {
    const p = plan();
    const { key, line } = keyOf(p, /./);
    if (line.priority === 'urgent') return;
    expect(planLines(applyPlanEdits(p, { excluded: [key], additions: [] })).some(x => x.line.text === line.text)).toBe(false);
  });

  it('copies every red flag into the cautions', () => {
    const c = cautions('skin_graft', 'pre_op', a);
    expect(c.some(x => /^RED FLAG — .*PHQ-9/.test(x))).toBe(true);
  });
});

describe('H2: comorbidity state carried into post-op and follow-up', () => {
  const preOp = (answers: EncounterAnswers): PriorReview[] =>
    [{ encounterId: 'e1', at: '2026-10-20T09:00:00Z', moduleId: 'free_flap', phase: 'pre_op', answers, scores: [] }];
  const post = (prior: PriorReview[], p: ReviewPatient = adult(), phase: ReviewPhase = 'post_op') =>
    planLines(planFor(mod('free_flap'), phase, { 'core.pain_present': 'moderate' }, p, prior).plan).map(l => l.line);

  it('does not offer NSAIDs post-op to a patient recorded pre-op on warfarin or with CKD 4–5', () => {
    for (const a of [{ 'core.anticoagulant': ['warfarin'] }, { 'core.renal': 'ckd_4_5' }] as EncounterAnswers[]) {
      const l = post(preOp(a));
      expect(l.some(x => /Add a regular NSAID/.test(x.text))).toBe(false);
      expect(l.find(x => x.text === 'Avoid NSAIDs')?.why).toMatch(/recorded at the review of 2026-10-20/);
    }
    expect(post([]).some(x => /Add a regular NSAID/.test(x.text))).toBe(true);
  });

  it('monitors glucose post-op for diabetes recorded pre-op, or in the record', () => {
    expect(post(preOp({ 'core.diabetes': 'insulin' })).some(x => /Capillary glucose before meals/.test(x.text))).toBe(true);
    expect(post([], adult({ comorbidities: ['type 2 diabetes'] })).some(x => /Capillary glucose before meals/.test(x.text))).toBe(true);
  });

  it('respects HIT and pregnancy recorded pre-op, and anticoagulants in the medicine list', () => {
    expect(planFor(mod('free_flap'), 'post_op', {}, adult(), preOp({ 'core.caprini': ['heparin_thrombocytopenia'] })).plan.cautions.some(c => /no heparin of any kind/.test(c))).toBe(true);
    expect(post(preOp({ 'core.pregnancy': 'pregnant' }), adult({ sex: 'female', ageYears: 30 }), 'follow_up').some(x => x.text === 'Avoid NSAIDs')).toBe(true);
    expect(post([], adult({ medications: ['rivaroxaban 20 mg'] })).some(x => x.text === 'Avoid NSAIDs')).toBe(true);
  });

  it('never fills a field the current form asks', () => {
    const r = readReview({ module: mod('free_flap'), phase: 'pre_op', answers: {}, patient: adult(), prior: preOp({ 'core.renal': 'dialysis' }) });
    expect(r.planAnswers['core.renal']).toBeUndefined();
  });
});

describe('H3: emergency fasting and therapeutic antibiotics', () => {
  it('uses emergency (RSI) wording, not the 6-hour line, for ASA E or an emergency module', () => {
    for (const [id, a] of [['skin_graft', { 'core.asa_emergency': true }], ['necrotising_soft_tissue_infection', {}]] as const) {
      const t = texts(id, 'pre_op', a);
      expect(t.some(x => /^Emergency: not fasted/.test(x)), id).toBe(true);
      expect(t.some(x => /^Fasting: no food or milk for 6 hours/.test(x)), id).toBe(false);
    }
    expect(texts('skin_graft', 'pre_op', {}).some(x => /^Fasting: no food or milk/.test(x))).toBe(true);
  });

  it('does not tell a patient on therapeutic antibiotics to stop at 24 hours', () => {
    for (const [id, a] of [
      ['necrotising_soft_tissue_infection', {}],
      ['tendon_repair', { 'tendon_repair.mechanism': 'bite' }],
      ['diabetic_foot_debridement', { 'diabetic_foot_debridement.infection_grade': '3' }],
      ['local_regional_flap', { 'local_regional_flap.indication': 'open_fracture' }],
    ] as const) {
      const t = texts(id, 'pre_op', a);
      expect(t.some(x => /not continued beyond 24 hours/.test(x)), id).toBe(false);
      expect(t.some(x => /^Therapeutic antibiotics are part of this plan/.test(x)), id).toBe(true);
    }
    expect(texts('skin_graft', 'pre_op', {}).some(x => /not continued beyond 24 hours/.test(x))).toBe(true);
  });
});

describe('oncology: follow-up fixes', () => {
  const consentText = (id: string, a: EncounterAnswers, p: ReviewPatient = adult()) =>
    JSON.stringify(buildConsentDraft(contextFor(mod(id), 'pre_op', a, p), [], { patient: { name: 'Test', hospitalNumber: '1' } as never })!);

  it('watches the airway after head and neck sclerotherapy, and escalates stridor', () => {
    const base = { 'vascular_anomaly.issva': 'lm', 'vascular_anomaly.site': 'beard_airway', 'vascular_anomaly.intervention': 'sclerotherapy' };
    expect(lines('vascular_anomaly', 'post_op', base).some(l => /Airway observation for 24–72 hours/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(fields('vascular_anomaly', 'post_op')).toContain('vascular_anomaly.airway_post');
    const em = lines('vascular_anomaly', 'post_op', { ...base, 'vascular_anomaly.airway_post': 'stridor' });
    expect(em.some(l => /^Airway emergency/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(lines('vascular_anomaly', 'post_op', { ...base, 'vascular_anomaly.site': 'limb' }).some(l => /Airway observation/.test(l.text))).toBe(false);
  });

  it('adds ethanol and bleomycin consent risks when chosen', () => {
    const a = { 'vascular_anomaly.issva': 'vm', 'vascular_anomaly.intervention': 'sclerotherapy', 'vascular_anomaly.sclerosant': ['ethanol', 'bleomycin'] };
    const t = consentText('vascular_anomaly', a);
    expect(t).toMatch(/collapse of the heart and lungs/);
    expect(t).toMatch(/damage the lungs/);
    expect(consentText('vascular_anomaly', { ...a, 'vascular_anomaly.sclerosant': ['sts_polidocanol'] })).not.toMatch(/damage the lungs/);
  });

  it('does not start propranolol with an absolute contraindication, and starts at 1 mg/kg/day otherwise', () => {
    const base = { 'vascular_anomaly.issva': 'ih', 'vascular_anomaly.intervention': 'propranolol' };
    for (const c of ['heart_block', 'asthma', 'hypotension', 'weight_under_2kg']) {
      const t = texts('vascular_anomaly', 'pre_op', { ...base, 'vascular_anomaly.prop_contra': [c] }, infant(3));
      expect(t.some(x => /^Do not start propranolol/.test(x)), c).toBe(true);
      expect(t.some(x => /^Propranolol: start 1 mg\/kg\/day/.test(x)), c).toBe(false);
    }
    expect(texts('vascular_anomaly', 'pre_op', { ...base, 'core.weight_kg': 1.8 }, infant(3)).some(x => /^Do not start propranolol/.test(x))).toBe(true);
    expect(texts('vascular_anomaly', 'pre_op', { ...base, 'vascular_anomaly.prop_contra': ['none'] }, infant(3)).some(x => /^Propranolol: start 1 mg\/kg\/day.*2 mg\/kg\/day/.test(x))).toBe(true);
  });

  it('monitors sirolimus', () => {
    expect(texts('vascular_anomaly', 'pre_op', { 'vascular_anomaly.issva': 'khe', 'vascular_anomaly.intervention': 'sirolimus' }).some(x => /trough levels/.test(x))).toBe(true);
    expect(texts('vascular_anomaly', 'follow_up', { 'vascular_anomaly.issva': 'khe', 'vascular_anomaly.intervention': 'sirolimus' }).some(x => /no live vaccines/.test(x))).toBe(true);
  });

  it('uses radiocolloid only for SLNB in pregnancy or blue-dye allergy, and consents for dye anaphylaxis, seroma and lymphoedema', () => {
    const a = { 'melanoma_wle.invasion': 'invasive', 'melanoma_wle.breslow_mm': 2, 'melanoma_wle.nodes': 'normal', 'melanoma_wle.slnb': 'planned' };
    const preg = adult({ sex: 'female', ageYears: 30 });
    expect(texts('melanoma_wle', 'pre_op', { ...a, 'core.pregnancy': 'pregnant' }, preg).some(x => /radiocolloid .* only — no blue dye/.test(x))).toBe(true);
    expect(cautions('melanoma_wle', 'pre_op', { ...a, 'melanoma_wle.blue_dye_allergy': 'yes' }).some(c => /no blue dye/.test(c))).toBe(true);
    expect(texts('melanoma_wle', 'pre_op', a).some(x => /no blue dye/.test(x))).toBe(false);
    const t = consentText('melanoma_wle', a);
    expect(t).toMatch(/anaphylaxis/);
    expect(t).toMatch(/0\.1–1%/);
    expect(t).toMatch(/Lymphoedema after sentinel node biopsy/);
    expect(t).toMatch(/Seroma after sentinel node biopsy/);
  });

  it('keeps a transplant recipient cSCC high risk after the operation', () => {
    const pre = { 'skin_tumour_excision.diagnosis': 'scc', 'skin_tumour_excision.site': 'trunk', 'skin_tumour_excision.size_mm': 8, 'core.immune': ['transplant'] };
    const prior: PriorReview[] = [{ encounterId: 'e1', at: '2026-10-01T09:00:00Z', moduleId: 'skin_tumour_excision', phase: 'pre_op', answers: pre, scores: [] }];
    const fu = { 'skin_tumour_excision.diagnosis': 'scc', 'skin_tumour_excision.site': 'trunk', 'skin_tumour_excision.size_mm': 8, 'skin_tumour_excision.histology': 'scc_well', 'skin_tumour_excision.margin_status': 'clear' };
    const r = readReview({ module: mod('skin_tumour_excision'), phase: 'follow_up', answers: fu, patient: adult(), prior });
    expect(r.scoreMap['skin_tumour_excision.risk'].band?.label).toBe('High risk');
    expect(readReview({ module: mod('skin_tumour_excision'), phase: 'follow_up', answers: fu, patient: adult() }).scoreMap['skin_tumour_excision.risk'].band?.label).toBe('Low risk');
    const t = planLines(planFor(mod('skin_tumour_excision'), 'follow_up', fu, adult(), prior).plan).map(l => l.line.text);
    expect(t.some(x => /^Low-risk cSCC/.test(x))).toBe(false);
  });

  it('gives the right second-cancer figure and a tumour-neutral 40 mm flag', () => {
    expect(consentText('skin_tumour_excision', { 'skin_tumour_excision.diagnosis': 'scc' })).toMatch(/about 18% after a cSCC/);
    const r = readReview({ module: mod('skin_tumour_excision'), phase: 'pre_op', answers: { 'skin_tumour_excision.diagnosis': 'bcc', 'skin_tumour_excision.size_mm': 45 }, patient: adult() });
    expect(r.flags.find(fl => /Over 40 mm/.test(fl.reason))?.reason).toMatch(/high risk for a BCC/);
  });

  it('states the triamcinolone per-session ceiling', () => {
    expect(texts('keloid_management', 'pre_op', { 'keloid_management.plan': 'steroid' }).some(x => /up to 40 mg in adults .* check the local protocol/.test(x))).toBe(true);
  });
});

describe('module fixes (round 2)', () => {
  it('treats a high-pressure injection injury as a same-day emergency', () => {
    for (const id of ['tendon_repair', 'nerve_repair_hand_trauma'] as const) {
      const a = { [`${id}.mechanism`]: 'high_pressure' };
      const r = readReview({ module: mod(id), phase: 'pre_op', answers: a, patient: adult() });
      expect(r.flags.some(f => f.level === 'red' && /High-pressure/.test(f.reason)), id).toBe(true);
      expect(lines(id, 'pre_op', a).some(l => /same-day emergency surgical exploration/.test(l.text) && /no digital block with adrenaline/.test(l.text) && l.priority === 'urgent'), id).toBe(true);
    }
  });

  it('gives the BOAST open-fracture antibiotic line, urgent unless given within 1 hour', () => {
    const l = (x?: string) => lines('local_regional_flap', 'pre_op', { 'local_regional_flap.indication': 'open_fracture', ...(x ? { 'local_regional_flap.fracture_antibiotics': x } : {}) })
      .find(y => /within 1 hour of injury, continued until definitive soft-tissue cover/.test(y.text));
    expect(l()?.priority).toBe('urgent');
    expect(l('within_1h')?.priority).toBe('routine');
  });

  it('does not count a missing extension deficit as 0 in the Strickland score', () => {
    const r = readReview({ module: mod('tendon_repair'), phase: 'follow_up', answers: { 'tendon_repair.type': 'flexor', 'tendon_repair.pip_flex': 90, 'tendon_repair.dip_flex': 60 }, patient: adult() });
    const s = r.scoreMap['tendon_repair.strickland'];
    expect(s.total).toBeNull();
    expect(s.incomplete).toContain('PIP extension deficit');
  });

  it('burns: refers when age is unknown, flags a child at 10%, CoHb, and no Baux under 16', () => {
    const unknown = adult({ ageYears: null, ageMonths: null });
    expect(lines('burns_excision_grafting', 'wound_review', { 'burns_excision_grafting.tbsa': 12, 'burns_excision_grafting.inhalation': 'suspected' }, unknown)
      .some(l => /age not recorded/.test(l.why ?? '') && l.priority === 'urgent')).toBe(true);
    const child = readReview({ module: mod('burns_excision_grafting'), phase: 'wound_review', answers: { 'burns_excision_grafting.tbsa': 12, 'core.weight_kg': 20 }, patient: adult({ ageYears: 6 }) });
    expect(child.flags.some(f => /major burn \(10% or more in children\)/.test(f.reason))).toBe(true);
    expect(child.scoreMap['burns_excision_grafting.baux']).toBeUndefined();
    const co = { 'burns_excision_grafting.tbsa': 5, 'burns_excision_grafting.inhalation': 'suspected', 'burns_excision_grafting.cohb': 15 };
    expect(readReview({ module: mod('burns_excision_grafting'), phase: 'wound_review', answers: co, patient: adult() }).flags.some(f => f.level === 'red' && /COHb/.test(f.reason))).toBe(true);
    expect(texts('burns_excision_grafting', 'wound_review', co).some(x => /100% oxygen.*cyanide/.test(x))).toBe(true);
  });

  it('breast / body contouring: lidocaine over 35 mg/kg is red and urgent; pregnancy defers surgery', () => {
    const a = { 'breast_and_body_contouring.procedures': ['liposuction'], 'breast_and_body_contouring.lidocaine_mg_kg': 50 };
    const f = adult({ sex: 'female', ageYears: 35 });
    const r = readReview({ module: mod('breast_and_body_contouring'), phase: 'pre_op', answers: a, patient: f });
    expect(r.flags.some(x => x.level === 'red' && /Lidocaine over 35/.test(x.reason))).toBe(true);
    expect(lines('breast_and_body_contouring', 'pre_op', a, f).some(l => /Planned lidocaine 50 mg\/kg/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(cautions('breast_and_body_contouring', 'pre_op', { 'core.pregnancy': 'pregnant' }, f).some(c => /do not book elective/.test(c))).toBe(true);
  });

  it('asks the core tetanus question where clinically indicated', () => {
    expect(fields('diabetic_foot_debridement', 'wound_review')).toContain('core.tetanus');
    expect(fields('diabetic_foot_debridement', 'pre_op')).toContain('core.tetanus');
    const tet = (id: string, a: EncounterAnswers) =>
      isVisible(composeTemplate(mod(id), 'pre_op').sections.flatMap(s => s.fields).find(x => x.id === 'core.tetanus')!, a);
    expect(tet('lower_limb_amputation', { 'lower_limb_amputation.indication': 'diabetic_sepsis' })).toBe(true);
    expect(tet('lower_limb_amputation', { 'lower_limb_amputation.indication': 'tumour' })).toBe(false);
    expect(tet('skin_graft', { 'skin_graft.indication': 'burn' })).toBe(true);
    expect(tet('skin_graft', { 'skin_graft.indication': 'post_excision' })).toBe(false);
    expect(tet('local_regional_flap', { 'local_regional_flap.indication': 'open_fracture' })).toBe(true);
    expect(tet('scalp_reconstruction', { 'scalp_reconstruction.cause': 'trauma' })).toBe(true);
    const w = composeTemplate(mod('wound_care_review'), 'wound_review').sections.flatMap(s => s.fields).find(x => x.id === 'core.tetanus')!;
    expect(isVisible(w, { 'core.wound_aetiology': 'venous' })).toBe(true);
  });

  it('keeps adult itch, water and phantom-pain advice away from infants and children', () => {
    expect(texts('skin_graft', 'follow_up', { 'skin_graft.itch': 'troublesome' }, infant(12)).some(x => /sedating antihistamine at night|gabapentinoid for persistent/.test(x))).toBe(false);
    expect(texts('skin_graft', 'follow_up', { 'skin_graft.itch': 'troublesome' }, adult({ ageYears: 8 })).some(x => /consider a gabapentinoid/.test(x))).toBe(false);
    expect(texts('cleft_lip_palate', 'post_op', {}, infant(4)).some(x => /clear water after feeds/.test(x))).toBe(false);
    expect(texts('cleft_lip_palate', 'post_op', {}, infant(10)).some(x => /clear water after feeds/.test(x))).toBe(true);
    const ph = texts('lower_limb_amputation', 'post_op', { 'lower_limb_amputation.phantom': 'pain' }, adult({ ageYears: 7 }));
    expect(ph.some(x => /amitriptyline/.test(x))).toBe(false);
    expect(ph.some(x => /paediatric pain team/.test(x))).toBe(true);
  });

  it('free flap: black flap drops routine monitoring; limb modules carry the acute-ischaemia safety net; NPWT lidocaine ceiling', () => {
    expect(texts('free_flap', 'post_op', { 'free_flap.flap_colour': 'black' }).some(x => /^Flap observations hourly/.test(x))).toBe(false);
    for (const [id, phase] of [['diabetic_foot_debridement', 'wound_review'], ['lower_limb_amputation', 'pre_op']] as const) {
      expect(texts(id, phase, {}).some(x => /acute limb ischaemia/.test(x)), id).toBe(true);
    }
    expect(texts('npwt', 'wound_review', { 'npwt.precautions': ['ischaemic'] }).some(x => /acute limb ischaemia/.test(x))).toBe(true);
    expect(texts('npwt', 'wound_review', { 'npwt.pain_change': 'severe' }).some(x => /maximum 3 mg\/kg plain lidocaine/.test(x))).toBe(true);
  });
});

describe('core: age gates (round 2)', () => {
  it('asks pregnancy of females from 12 only, and adult anaesthetic tools of adults only', () => {
    const girl = (y: number) => adult({ sex: 'female', ageYears: y });
    expect(fields('skin_graft', 'pre_op', girl(10))).not.toContain('core.pregnancy');
    expect(fields('skin_graft', 'pre_op', girl(13))).toContain('core.pregnancy');
    expect(fields('skin_graft', 'pre_op', adult({ sex: 'male' }))).not.toContain('core.pregnancy');
    const kid = fields('skin_graft', 'pre_op', adult({ ageYears: 8 }));
    for (const id of ['core.sb_snoring', 'core.neck_cm', 'core.rcri', 'core.mets', 'core.smoking', 'core.alcohol']) expect(kid, id).not.toContain(id);
    expect(kid).toContain('core.apfel.history');
    expect(fields('cleft_lip_palate', 'pre_op', infant(10))).not.toContain('core.apfel.history');
    expect(fields('skin_graft', 'pre_op', adult())).toContain('core.sb_snoring');
  });

  it('scores Apfel in a child without asking about smoking', () => {
    const r = readReview({ module: mod('skin_graft'), phase: 'pre_op', answers: { 'core.apfel.history': 1, 'core.apfel.opioids': 1 }, patient: adult({ ageYears: 8, sex: 'female' }) });
    expect(r.scoreMap.apfel.total).toBe(4);
  });

  it('uses adolescent wording for alcohol and smoking', () => {
    const teen = adult({ ageYears: 15 });
    const t = texts('skin_graft', 'pre_op', { 'core.alcohol': 'within', 'core.smoking': 'current' }, teen);
    expect(t.some(x => /^Alcohol use under 18: no amount is low-risk/.test(x))).toBe(true);
    expect(t.some(x => /nicotine replacement can be used from 12 years/.test(x))).toBe(true);
  });

  it('has no Wells / calf-pain VTE wording under 16, but keeps a swollen-limb prompt', () => {
    const child = adult({ ageYears: 8 });
    const t = texts('skin_graft', 'post_op', { 'core.complications': ['vte'] }, child);
    expect(t.some(x => /Wells/.test(x) || /^Calf pain/.test(x))).toBe(false);
    expect(t.some(x => /swollen painful limb or suspected clot in a child/i.test(x))).toBe(true);
    expect(t.some(x => /A swollen, painful arm or leg/.test(x))).toBe(true);
    expect(texts('skin_graft', 'post_op', { 'core.complications': ['vte'] }).some(x => /Wells score/.test(x))).toBe(true);
  });
});

describe('core: tetanus given today, METs direction, consent merging', () => {
  it('still asks the wound risk after a dose given today, and prompts immunoglobulin', () => {
    const f = composeTemplate(mod('tendon_repair'), 'pre_op').sections.flatMap(s => s.fields).find(x => x.id === 'core.tetanus_wound')!;
    expect(isVisible(f, { 'core.tetanus': 'given_today' })).toBe(true);
    expect(lines('tendon_repair', 'pre_op', { 'core.tetanus': 'given_today', 'core.tetanus_wound': 'high_risk' }).some(l => /^Vaccine given today — decide on immunoglobulin/.test(l.text) && l.priority === 'urgent')).toBe(true);
    expect(texts('tendon_repair', 'pre_op', { 'core.tetanus': 'given_today', 'core.tetanus_wound': 'clean' }).some(x => /Vaccine given today/.test(x))).toBe(false);
  });

  it('reads a rise in METs as better', () => {
    const prior: PriorReview[] = [{ encounterId: 'e1', at: '2026-10-01T09:00:00Z', moduleId: 'skin_graft', phase: 'pre_op', answers: {}, scores: [{ id: 'mets', name: 'Functional capacity', abbreviation: 'METs', total: 3, band: null, incomplete: [], source: '' }] }];
    const r = readReview({ module: mod('skin_graft'), phase: 'pre_op', answers: { 'core.mets': '8' }, patient: adult(), prior });
    expect(r.comparison.find(c => c.label === 'METs')?.trend).toBe('better');
  });

  it('states each kind of risk once on the consent form', () => {
    const risks = (id: string) => buildConsentDraft(contextFor(mod(id), 'pre_op', {}), [], { patient: { name: 'Test', hospitalNumber: '1' } as never })!
      .sections.find(s => s.title === 'Risks and possible complications')!.bullets!;
    const kinds = (id: string) => risks(id).map(r => riskKey(r));
    for (const id of ['burns_excision_grafting', 'tendon_repair', 'skin_graft', 'free_flap']) {
      const k = kinds(id);
      expect(new Set(k).size, `${id}: ${k.join(' | ')}`).toBe(k.length);
    }
    const burns = risks('burns_excision_grafting');
    expect(burns.some(r => /may rarely require a blood transfusion/.test(r))).toBe(false);
  });
});

describe('core: pressure risk by age', () => {
  it('asks adult Braden from 8 and a paediatric rating below', () => {
    const baby = fields('cleft_lip_palate', 'pre_op', infant(10));
    expect(baby.some(id => id.startsWith('core.braden_'))).toBe(false);
    expect(baby).toContain('core.paed_pressure');
    const grown = fields('skin_graft', 'pre_op', adult());
    expect(grown.some(id => id.startsWith('core.braden_'))).toBe(true);
    expect(grown).not.toContain('core.paed_pressure');
  });

  it('a child at high risk gets device-aware pressure care', () => {
    const t = texts('cleft_lip_palate', 'post_op', { 'core.paed_pressure': 'high' }, infant(10));
    expect(t.some(x => /oximeter probes/.test(x) && /pressure-redistributing/.test(x))).toBe(true);
  });
});
