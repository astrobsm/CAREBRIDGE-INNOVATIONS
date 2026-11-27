import { describe, it, expect } from 'vitest';
import { anaemic, buildRulesPlan } from '../rulesPlan';
import { patientFacts } from '../facts';
import { WOUND_CLINIC_PROTOCOL_V1 as WP } from '../protocols/woundClinic.v1';
import { clerking, complaint } from './fixtures';

const line = (plan: ReturnType<typeof buildRulesPlan>, id: string) => plan.lines.find(l => l.id === id);
const active = (plan: ReturnType<typeof buildRulesPlan>, id: string) => { const l = line(plan, id); return l && !l.withheld ? l : undefined; };

describe('rules plan — adult chronic wound (protocol)', () => {
  const data = clerking({
    complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer', { cw_duration: '3–12 months', cw_ex_length: 6, cw_ex_width: 4, cw_ex_edge: 'Flat / sloping' }, { value: 5, unit: 'months' })],
    vitals: { weight: 70, height: 170 },
    social: { smoking: 'Current smoker' },
  });
  const plan = buildRulesPlan({ data, ctx: { ageYears: 58, sex: 'Male' } });

  it('applies the protocol and orders the whole baseline panel', () => {
    expect(plan.woundProtocolApplied).toBe(true);
    expect(plan.protocolVersion).toBe(WP.version);
    for (const t of WP.baseline) expect(line(plan, `inv:wp_${t.id}`)?.text).toBe(t.test);
  });
  it('targeted tests by situation: leg ulcer ABPI, biopsy after 3 months', () => {
    expect(line(plan, 'inv:wpt_leg_foot_ulcer')?.text).toMatch(/ABPI/);
    expect(line(plan, 'inv:wpt_biopsy')?.text).toMatch(/Wedge biopsy/);
  });
  it('multivitamin for all chronic wounds; vitamin C for a smoker; no empiric iron', () => {
    expect(active(plan, 'med:wp_multivitamin')?.medication?.dose).toBe('1 tablet daily (RDA-level)');
    expect(active(plan, 'med:wp_vitamin_c')?.medication?.dose).toBe('500 mg daily (250 mg twice daily)');
    expect(line(plan, 'med:wp_iron')?.withheld).toMatch(/Awaiting FBC and ferritin/);
  });
  it('nutrition targets come from the engine (30–35 kcal/kg, 1.25–1.5 g/kg)', () => {
    expect(line(plan, 'nut:energy')?.text).toMatch(/2100–2450 kcal\/day/);
    expect(line(plan, 'nut:protein')?.text).toMatch(/88–105 g\/day/);
    expect(line(plan, 'nut:energy')?.source.kind).toBe('engine');
  });
  it('monitoring includes the week-4 40–50% decision point and dated follow-up', () => {
    expect(plan.hardRules).toContain(WP.monitoring.principle);
    expect(line(plan, 'mon:wp_week4')?.text).toMatch(/40–50%/);
    expect(line(plan, 'fu:wp_week4')?.followUp?.days).toBe(28);
  });
  it('every line has a source', () => {
    for (const l of plan.lines) expect(l.source.label).toBeTruthy();
  });
});

describe('rules plan — child with a wound and low ferritin', () => {
  const data = clerking({
    complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer', { cw_ex_exudate: 'Heavy' })],
    vitals: { weight: 20 },
    pmh: { malnutrition: 'Yes' },
  });
  const plan = buildRulesPlan({ data, ctx: { ageYears: 6, ageMonths: 72, sex: 'Female' }, labs: { hb: 9.2, ferritin: 12, crp: 3, zinc: 60 } });
  const withWeight = (kg: number, ageYears: number, labs: Record<string, number>) =>
    buildRulesPlan({ data: { ...data, vitals: { ...data.vitals, weight: kg } }, ctx: { ageYears, sex: 'Female' }, labs });
  it('iron 3 mg/kg once daily (child table), not capped at the 65 mg adult dose (owner decision 2026-11-27)', () => {
    const iron = active(plan, 'med:wp_iron')!;
    expect(iron.medication?.dose).toBe('60 mg once daily');
    expect(iron.medication?.weightBasis).toMatch(/3 mg\/kg × 20 kg/);
    const big = withWeight(30, 10, { hb: 9, ferritin: 12 });
    expect(active(big, 'med:wp_iron')?.medication?.dose).toBe('90 mg once daily');
    expect(active(big, 'med:wp_iron')?.medication?.weightBasis).not.toMatch(/never above the adult dose/);
    expect(active(big, 'med:wp_iron')?.medication?.weightBasis).toMatch(/not capped at the adult dose/);
    expect(big.hardRules.join(' ')).toMatch(/not capped at the 65 mg adult dose/);
  });
  it('iron is capped at the child table maximum of 200 mg/day', () => {
    expect(active(withWeight(80, 15, { hb: 9, ferritin: 12 }), 'med:wp_iron')?.medication?.dose).toBe('200 mg once daily');
  });
  it('severe anaemia (Hb below 7 g/dL, WHO): up to 6 mg/kg/day, still at most 200 mg/day', () => {
    const severe = withWeight(20, 6, { hb: 6.5, ferritin: 12 });
    expect(active(severe, 'med:wp_iron')?.medication?.dose).toBe('60–120 mg daily');
    expect(active(severe, 'med:wp_iron')?.medication?.weightBasis).toMatch(/3–6 mg\/kg × 20 kg = 60–120 mg.*Hb below 7 g\/dL/);
    expect(active(withWeight(40, 12, { hb: 6, ferritin: 12 }), 'med:wp_iron')?.medication?.dose).toBe('120–200 mg daily');
    expect(active(withWeight(20, 6, { hb: 7, ferritin: 12 }), 'med:wp_iron')?.medication?.dose).toBe('60 mg once daily');
  });
  it('zinc stays capped at 40 mg/day', () => {
    expect(active(withWeight(50, 14, { hb: 12, ferritin: 50, zinc: 50 }), 'med:wp_zinc')?.medication?.dose).toBe('25–40 mg once daily');
  });
  it('zinc 0.5–1 mg/kg (maximum 40 mg) and the child hard rules', () => {
    expect(active(plan, 'med:wp_zinc')?.medication?.dose).toBe('10–20 mg once daily');
    expect(plan.hardRules).toContain(WP.childMicronutrients.principle);
    expect(plan.hardRules.join(' ')).toMatch(/Do not give extra vitamin A only to speed wound healing in children/);
  });
  it('child nutrition: Holliday–Segar fluid, 1.5–2.5 g/kg protein, STRONGkids', () => {
    expect(line(plan, 'nut:fluid')?.text).toMatch(/1500 mL\/day/);
    expect(line(plan, 'nut:protein')?.text).toMatch(/30–50 g\/day/);
    expect(line(plan, 'nut:screen')?.text).toMatch(/STRONGkids/);
  });
});

describe('anaemia cut-offs (owner decision 2026-11-27: WHO 2024; Buseri et al. 2010, Port Harcourt)', () => {
  const d = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')] });
  const an = (hb: number, ctx: { ageYears: number; ageMonths?: number; sex?: string }) => anaemic(patientFacts({ data: d, ctx, labs: { hb } }));
  it('adults keep the protocol rule: Hb below 10 g/dL', () => {
    expect(an(9.9, { ageYears: 40, sex: 'Male' })).toBe(true);
    expect(an(10, { ageYears: 40, sex: 'Female' })).toBe(false);
  });
  it('6–11 months 10.5 (WHO 2024); 1–4 years 10.5; 5–8 years 11.5; 9–13 years 12.5', () => {
    expect(an(10.4, { ageYears: 0, ageMonths: 8 })).toBe(true);
    expect(an(10.5, { ageYears: 0, ageMonths: 8 })).toBe(false);
    expect(an(10.4, { ageYears: 3 })).toBe(true);
    expect(an(10.8, { ageYears: 3 })).toBe(false); // anaemic under the old WHO 2011 cut-off (11)
    expect(an(11.4, { ageYears: 6 })).toBe(true);
    expect(an(11.5, { ageYears: 8 })).toBe(false);
    expect(an(12.4, { ageYears: 9 })).toBe(true); // not anaemic under the old cut-off (11.5)
    expect(an(12.5, { ageYears: 13 })).toBe(false);
  });
  it('14–17 years: 13.0 boys, 12.0 girls, 12.0 when sex is not recorded', () => {
    expect(an(12.9, { ageYears: 15, sex: 'Male' })).toBe(true);
    expect(an(12.9, { ageYears: 15, sex: 'Female' })).toBe(false);
    expect(an(11.9, { ageYears: 17, sex: 'Female' })).toBe(true);
    expect(an(12.5, { ageYears: 15 })).toBe(false);
    expect(an(11.9, { ageYears: 15 })).toBe(true);
  });
  it('under 6 months: no cut-off; the iron line says to interpret against neonatal / infant ranges', () => {
    expect(an(8, { ageYears: 0, ageMonths: 3 })).toBeNull();
    const plan = buildRulesPlan({ data: { ...d, vitals: { ...d.vitals, weight: 6 } }, ctx: { ageYears: 0, ageMonths: 3 }, labs: { hb: 8, ferritin: 10 } });
    expect(line(plan, 'med:wp_iron')?.withheld).toMatch(/interpret against neonatal \/ infant ranges/);
  });
});

describe('rules plan — pregnant woman: no high-dose vitamin A', () => {
  const data = clerking({
    complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')],
    vitals: { weight: 65 },
    gyn: { pregnancy_possible: 'Pregnancy confirmed' },
    medications: [{ name: 'Prednisolone', indication: 'asthma' }],
  });
  const plan = buildRulesPlan({ data, ctx: { ageYears: 29, sex: 'Female' } });
  it('vitamin A is withheld and the protocol caution is a hard rule', () => {
    expect(line(plan, 'med:wp_vitamin_a')?.withheld).toMatch(/NOT in pregnancy/);
    expect(plan.hardRules).toContain('NOT in pregnancy or women who may be pregnant (max 10,000 IU); avoid in liver disease');
    expect(plan.hardRules).toContain(WP.cautions.pregnancy);
  });
  it('antenatal supplement and folic acid instead of a routine multivitamin; no ibuprofen', () => {
    expect(active(plan, 'med:wp_antenatal')).toBeTruthy();
    expect(line(plan, 'med:wp_multivitamin')).toBeUndefined();
    expect(line(plan, 'med:ibuprofen')?.withheld).toMatch(/Pregnancy/);
  });
  it('pregnancy not asked counts as "may be pregnant"', () => {
    const unknown = buildRulesPlan({ data: { ...data, history: { ...data.history, gyn: {} } }, ctx: { ageYears: 29, sex: 'Female' } });
    expect(line(unknown, 'med:wp_vitamin_a')?.withheld).toMatch(/NOT in pregnancy/);
    expect(unknown.missing).toContain('Pregnancy status');
  });
});

describe('rules plan — sickle cell disease: no empiric iron', () => {
  const data = clerking({ complaints: [complaint('leg_ulcer', 'Leg ulcer')], vitals: { weight: 55 }, pmh: { sickle_cell: 'Yes' } });
  it('iron is withheld without proven iron deficiency, and folic acid is continuous', () => {
    const plan = buildRulesPlan({ data, ctx: { ageYears: 22, sex: 'Male' }, labs: { hb: 7.5 } });
    expect(line(plan, 'med:wp_iron')?.withheld).toMatch(/Sickle cell disease: no empiric iron/);
    expect(plan.hardRules).toContain(WP.cautions.sickleCell);
    expect(active(plan, 'med:wp_folic_acid')?.medication?.duration).toMatch(/continuous in sickle cell disease/);
  });
  it('iron only once iron deficiency is proven', () => {
    const plan = buildRulesPlan({ data, ctx: { ageYears: 22, sex: 'Male' }, labs: { hb: 7.5, ferritin: 15 } });
    expect(active(plan, 'med:wp_iron')?.medication?.cautions).toContain(WP.cautions.sickleCell);
  });
});

describe('rules plan — renal impairment', () => {
  const data = clerking({ complaints: [complaint('pressure_sore', 'Pressure sore / bed sore', { pi_ex_stage: 'Stage 3 — full thickness skin loss' })], vitals: { weight: 60 }, pmh: { ckd: 'Yes', malnutrition: 'Yes' } });
  const plan = buildRulesPlan({ data, ctx: { ageYears: 70, sex: 'Male' } });
  it('protein reduction, no high-dose vitamin C, review zinc', () => {
    expect(line(plan, 'nut:protein')?.why).toMatch(/reduce protein/i);
    expect(line(plan, 'med:wp_vitamin_c')?.withheld).toMatch(/avoid high-dose vitamin C/);
    expect(active(plan, 'med:wp_zinc')?.medication?.cautions.join(' ')).toMatch(/review zinc/);
    expect(plan.hardRules).toContain(WP.cautions.renal);
  });
  it('arginine for a stage 3 pressure injury in a malnourished patient', () => {
    expect(active(plan, 'med:wp_arginine')?.medication?.dose).toMatch(/4\.5 g/);
  });
});

describe('rules plan — syndactyly in an 8-month-old', () => {
  const data = clerking({
    complaints: [complaint('cond_syndactyly', 'Syndactyly (webbed / joined fingers)', { syn_webs: ['Middle–ring (3rd web)'], syn_side: 'Right', syn_family: 'Yes', syn_assoc: ['None known'] })],
    exam: { cond_syndactyly_exam: { syn_ex_extent: 'Complete — joined to the fingertips', syn_ex_type: 'Simple — skin and soft tissue only' } },
    vitals: { weight: 8 },
  });
  const plan = buildRulesPlan({ data, ctx: { ageYears: 0, ageMonths: 8, sex: 'Male' } });
  it('condition fields drive the problem, X-ray and release timing', () => {
    expect(plan.conditions.map(c => c.id)).toEqual(['syndactyly']);
    expect(line(plan, 'pr:syndactyly')?.text).toMatch(/Middle–ring.*complete.*simple/i);
    expect(line(plan, 'inv:syn_xray')).toBeTruthy();
    expect(line(plan, 'proc:syn_release')?.why).toMatch(/12–18 months/);
    expect(line(plan, 'proc:syn_release')?.procedureReviewModuleId).toBe('skin_graft');
    expect(line(plan, 'fu:syn_planning')?.followUp?.when).toMatch(/12 months of age/);
    expect(line(plan, 'fu:syn_planning')?.followUp?.days).toBe(122);
  });
  it('no wound protocol; counselling and genetics referral; weight-based analgesia', () => {
    expect(plan.woundProtocolApplied).toBe(false);
    expect(plan.lines.filter(l => l.section === 'counselling').length).toBeGreaterThanOrEqual(5);
    expect(line(plan, 'ref:syn_genetics')).toBeTruthy();
    expect(line(plan, 'med:paracetamol')?.medication?.dose).toBe('120 mg');
  });
  it('border digits release earlier (6 months)', () => {
    const border = buildRulesPlan({ data: { ...data, complaints: [{ ...data.complaints[0], answers: { ...data.complaints[0].answers, syn_webs: ['Ring–little (4th web)'] } }] }, ctx: { ageYears: 0, ageMonths: 4, sex: 'Male' } });
    expect(line(border, 'proc:syn_release')?.why).toMatch(/about 6 months/);
  });
  it('Apert features trigger craniofacial referral', () => {
    const apert = buildRulesPlan({ data: { ...data, complaints: [{ ...data.complaints[0], answers: { ...data.complaints[0].answers, syn_assoc: ['Skull or face shape (possible Apert / craniosynostosis)'] } }] }, ctx: { ageYears: 0, ageMonths: 8, sex: 'Male' } });
    expect(line(apert, 'ref:syn_craniofacial')).toBeTruthy();
  });
});

describe('rules plan — major burn threshold (owner decision 2026-11-27: BBA / NICE)', () => {
  const burn = (tbsa: number, weight: number) => clerking({ complaints: [complaint('burn', 'Burn', {}, { value: 3, unit: 'days' })], exam: { local_burn: { tbsa_percent: tbsa } }, vitals: { weight } });
  const minerals = (tbsa: number, ctx: { ageYears: number; sex: string }, weight: number) => !!line(buildRulesPlan({ data: burn(tbsa, weight), ctx }), 'inv:wpt_burns_intake');
  it('adults: 15% TBSA or more is a major burn (was 20%)', () => {
    expect(minerals(15, { ageYears: 35, sex: 'Male' }, 70)).toBe(true);
    expect(minerals(14, { ageYears: 35, sex: 'Male' }, 70)).toBe(false);
  });
  it('children: 10% TBSA or more', () => {
    expect(minerals(10, { ageYears: 6, sex: 'Female' }, 20)).toBe(true);
    expect(minerals(9, { ageYears: 6, sex: 'Female' }, 20)).toBe(false);
  });
});

describe('rules plan — stability', () => {
  it('same inputs give the same hash; a change gives a new one', () => {
    const data = clerking({ complaints: [complaint('keloid', 'Keloid')] });
    const a = buildRulesPlan({ data, ctx: { ageYears: 30 } });
    const b = buildRulesPlan({ data, ctx: { ageYears: 30 } });
    const c = buildRulesPlan({ data, ctx: { ageYears: 31 } });
    expect(a.inputsHash).toBe(b.inputsHash);
    expect(a.inputsHash).not.toBe(c.inputsHash);
  });
  it('line ids are unique', () => {
    const data = clerking({ complaints: [complaint('foot_ulcer', 'Foot ulcer / diabetic foot', { df_ex_iwgdf: '3 — moderate (erythema over 2 cm or deeper tissue)', df_ex_probe: 'Positive' })], pmh: { diabetes: 'Yes' }, vitals: { weight: 80 } });
    const plan = buildRulesPlan({ data, ctx: { ageYears: 60, sex: 'Male' } });
    expect(new Set(plan.lines.map(l => l.id)).size).toBe(plan.lines.length);
    expect(line(plan, 'inv:wpt_bone')?.text).toMatch(/X-ray/);
    expect(line(plan, 'inv:wpt_infected')).toBeTruthy();
    expect(active(plan, 'med:df_oral')?.medication?.drug).toMatch(/Co-amoxiclav/);
  });
});
