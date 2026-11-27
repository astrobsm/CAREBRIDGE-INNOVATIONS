import { describe, it, expect, vi } from 'vitest';
import { buildRulesPlan } from '../rulesPlan';
import { buildPlanPrompt, draftToLines, requestClaudePlan, validatePlanDraft, daysFromWhen } from '../aiPlan';
import { requestClaudeInterpretation, interpretationToLines } from '../aiInterpret';
import { requestDraftFields, validateFields, editFields, approveFields } from '../aiFields';
import { buildFinalPlan, decide, isStale, manualLine } from '../finalPlan';
import { completeness, enterValue, interpretResults, mapScanned, plannedRows, qualitativeValue, resultMaps, hba1cPercentFromIfcc } from '../results';
import { clerking, complaint } from './fixtures';

const data = clerking({
  complaints: [complaint('foot_ulcer', 'Foot ulcer / diabetic foot', { df_ex_iwgdf: '2 — mild (skin / subcutaneous, erythema 0.5–2 cm)', free_text: 'Mr Chukwuemeka Obi, call 08031234567' })],
  pmh: { diabetes: 'Yes', sickle_cell: 'No' }, vitals: { weight: 78 },
});
const ctx = { ageYears: 61, sex: 'Male' };
const rules = buildRulesPlan({ data, ctx });

const goodDraft = {
  assessment: 'Mild diabetic foot infection.',
  problems: ['Diabetic foot ulcer, IWGDF 2'],
  investigations: [{ test: 'Deep tissue culture', why: 'Infected', urgency: 'soon' }],
  medications: [{ drug: 'Co-amoxiclav', dose: '625 mg', route: 'oral', frequency: 'TDS', duration: '7 days', weight_basis: '', cautions: [] }],
  procedures: [{ name: 'Sharp debridement', timing: 'today', why: 'Slough' }],
  nutrition: ['Protein 1.25–1.5 g/kg/day'],
  counselling_points: ['Keep weight off the foot.'],
  monitoring: ['Glucose log daily'],
  follow_up: [{ when: 'in 2 weeks', purpose: 'Wound review' }],
  referrals: ['Diabetes team'],
  unknowns: ['HbA1c not available'],
  hard_rules_quoted: rules.hardRules,
};

describe('Build plan with Claude', () => {
  it('sends a de-identified prompt with the hard rules and the rules plan', () => {
    const prompt = buildPlanPrompt({ data, ctx, rules, weightKg: 78, identifiers: ['Chukwuemeka', 'Obi', 'UNTH/2026/001'] });
    expect(prompt).not.toMatch(/Chukwuemeka|Obi|08031234567/);
    expect(prompt).toMatch(/\[PATIENT\]|\[PHONE\]/);
    expect(prompt).toContain('HARD RULES');
    for (const r of rules.hardRules) expect(prompt).toContain(r);
    expect(prompt).toContain('rules_plan');
  });
  it('accepts a valid JSON plan and reports hard rules it did not quote', async () => {
    const chat = vi.fn().mockResolvedValue(JSON.stringify({ ...goodDraft, hard_rules_quoted: rules.hardRules.slice(1) }));
    const r = await requestClaudePlan({ data, ctx, rules }, chat);
    expect(chat).toHaveBeenCalledWith(expect.objectContaining({ responseFormat: { type: 'json_object' } }));
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.missingHardRules).toEqual([rules.hardRules[0]]);
  });
  it('rejects an invalid reply and keeps the rules plan', async () => {
    const r = await requestClaudePlan({ data, ctx, rules }, vi.fn().mockResolvedValue('{"assessment": "x"}'));
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.message).toMatch(/rules plan is unchanged/);
    const notJson = await requestClaudePlan({ data, ctx, rules }, vi.fn().mockResolvedValue('Sure! Here is a plan'));
    expect(notJson.status).toBe('error');
    const down = await requestClaudePlan({ data, ctx, rules }, vi.fn().mockRejectedValue(new Error('AI is not configured (ANTHROPIC_API_KEY)')));
    expect(down.status === 'error' && down.notConfigured).toBe(true);
  });
  it('draft lines are AI-sourced, dated where possible', () => {
    const v = validatePlanDraft(JSON.stringify(goodDraft));
    expect(v.ok).toBe(true);
    const lines = v.ok ? draftToLines(v.value) : [];
    expect(lines.every(l => l.source.kind === 'ai')).toBe(true);
    expect(lines.find(l => l.section === 'follow_up')?.followUp?.days).toBe(14);
    expect(daysFromWhen('at 12 months of age')).toBeUndefined();
    expect(daysFromWhen('in 3 months')).toBe(90);
  });
});

describe('final plan', () => {
  const v = validatePlanDraft(JSON.stringify(goodDraft));
  const ai = v.ok ? draftToLines(v.value) : [];
  it('rules lines in by default, AI lines only when accepted, edits kept, manual lines added', () => {
    let d = decide([], { lineId: ai[0].id, decision: 'accepted', at: 'x' });
    const firstRule = rules.lines.find(l => !l.withheld)!;
    d = decide(d, { lineId: firstRule.id, decision: 'accepted', editedText: 'Edited text', at: 'x' });
    const fp = buildFinalPlan(rules.lines, ai, d, [manualLine('referrals', 'Podiatry', 1)]);
    expect(fp.some(l => l.id === ai[0].id)).toBe(true);
    expect(fp.some(l => l.id === ai[1].id)).toBe(false);
    expect(fp.find(l => l.id === firstRule.id)).toMatchObject({ text: 'Edited text', edited: true });
    expect(fp.some(l => l.source.kind === 'clinician')).toBe(true);
    expect(fp.some(l => !!l.withheld)).toBe(false);
  });
  it('stale when inputs change after the draft', () => {
    const later = buildRulesPlan({ data, ctx: { ...ctx, ageYears: 62 } });
    expect(isStale(later, rules.inputsHash)).toBe(true);
    expect(isStale(rules, rules.inputsHash)).toBe(false);
  });
});

describe('results', () => {
  const rows = plannedRows(rules.lines);
  it('one row per planned test, with the analytes and units', () => {
    const fbc = rows.find(r => r.testId === 'fbc')!;
    expect(fbc.analytes.map(a => a.key)).toEqual(['hb', 'wbc', 'plt', 'mcv']);
    expect(rows.find(r => r.testId === 'zinc')!.analytes[0].units).toEqual(['mcg/dL', 'umol/L']);
    expect(rows.find(r => r.testId === 'hiv')!.qualitative?.options).toContain('Positive');
  });
  it('direct entry converts units and grades', () => {
    expect(enterValue('zinc', 'zinc', 9, 'umol/L')).toMatchObject({ value: 58.86, unit: 'mcg/dL', flag: 'low' });
    expect(enterValue('vitamin_d', 'vitaminD', 40, 'nmol/L')).toMatchObject({ value: 16.024, flag: 'low' });
    expect(hba1cPercentFromIfcc(53)).toBe(7);
    expect(enterValue('glucose_hba1c', 'hba1c', 64, 'mmol/mol').value).toBe(8);
    expect(enterValue('fbc', 'hb', 98, 'g/L').value).toBe(9.8);
    expect(enterValue('fbc', 'hb', 740, 'g/dL').error).toMatch(/outside what is possible/);
  });
  it('completeness counts rows, not values', () => {
    const vals = [enterValue('fbc', 'hb', 9.5, 'g/dL'), enterValue('fbc', 'wbc', 8, '10^9/L'), enterValue('fbc', 'plt', 300, '10^9/L'), enterValue('fbc', 'mcv', 80, 'fL'), qualitativeValue('hiv', 'Negative')];
    const c = completeness(rows, vals);
    expect(c.done).toBe(2);
    expect(c.total).toBe(rows.length);
    expect(c.complete).toBe(false);
  });
  it('scanned values map to planned rows and wait for confirmation', () => {
    const { proposals, unplanned } = mapScanned([{ key: 'ferritin', value: 18, unit: 'ng/mL', confidence: 0.9 }, { key: 'troponin', value: 3, unit: 'ng/L', confidence: 0.9 }], rows);
    expect(proposals[0]).toMatchObject({ testId: 'iron_studies', analyte: 'ferritin', confirmed: false, via: 'scan' });
    expect(unplanned).toEqual(['Troponin (high sensitivity)']);
    expect(resultMaps(proposals).labs.ferritin).toBeUndefined();
  });
  it('protocol thresholds: Hb < 10, HbA1c ≥ 7, ferritin < 100 with high CRP, zinc < 70 with the CRP caveat, vitamin D < 20', () => {
    const vals = [enterValue('fbc', 'hb', 9.1, 'g/dL'), enterValue('glucose_hba1c', 'hba1c', 8.2, '%'), enterValue('esr_crp', 'crp', 40, 'mg/L'),
      enterValue('iron_studies', 'ferritin', 80, 'ng/mL'), enterValue('zinc', 'zinc', 60, 'mcg/dL'), enterValue('vitamin_d', 'vitaminD', 15, 'ng/mL')];
    const i = interpretResults(vals, { sex: 'male', ageYears: 61 });
    const t = i.findings.map(f => f.text).join('\n');
    expect(t).toMatch(/Hb 9.1 g\/dL — below the protocol's 10 g\/dL/);
    expect(t).toMatch(/HbA1c 8.2% — above the protocol target/);
    expect(t).toMatch(/Ferritin 80 ng\/mL with CRP 40 mg\/L — suggests iron deficiency/);
    expect(t).toMatch(/falsely low because CRP is high/);
    expect(t).toMatch(/deficient \(below 20 ng\/mL\)/);
    // the rules plan follows the results
    const withLabs = buildRulesPlan({ data, ctx, labs: resultMaps(vals).labs });
    expect(withLabs.lines.find(l => l.id === 'med:wp_iron')?.withheld).toBeUndefined();
    expect(withLabs.lines.find(l => l.id === 'med:wp_vitamin_d')?.medication?.dose).toBe('50,000 IU once weekly for 8 weeks, then 800–2,000 IU daily');
  });
  it('child Hb is graded against the owner\'s child cut-offs (WHO 2024; Buseri 2010), not the adult 10 g/dL', () => {
    const hb = (v: number, e: Parameters<typeof interpretResults>[1]) => interpretResults([enterValue('fbc', 'hb', v, 'g/dL')], { isChild: true, ...e }).findings.find(f => f.text.startsWith(`Hb ${v}`))!;
    expect(hb(12.4, { ageYears: 10 })).toMatchObject({ severity: 'abnormal' });
    expect(hb(12.4, { ageYears: 10 }).text).toMatch(/below 12\.5 g\/dL \(9–13 years\)/);
    expect(hb(12.4, { ageYears: 10 }).source).toMatch(/Buseri/);
    expect(hb(10.6, { ageYears: 0, ageMonths: 8 })).toMatchObject({ severity: 'normal' });
    expect(hb(10.4, { ageYears: 0, ageMonths: 8 }).source).toMatch(/WHO .*2024/);
    expect(hb(6.5, { ageYears: 3 })).toMatchObject({ severity: 'critical' });
    expect(hb(9, { ageYears: 0, ageMonths: 3 }).text).toMatch(/interpret against neonatal \/ infant ranges/);
    expect(hb(12.5, { ageYears: 15 }).text).toMatch(/Sex not recorded: the girls' limit \(12\.0 g\/dL\) is used/);
    expect(hb(12.5, { ageYears: 15, sex: 'male' })).toMatchObject({ severity: 'abnormal' });
    const t = interpretResults([enterValue('fbc', 'hb', 9, 'g/dL')], { isChild: true, ageYears: 6 }).findings.map(f => f.text).join(' ');
    expect(t).not.toMatch(/protocol's 10 g\/dL/);
  });
});

describe('Interpret with Claude', () => {
  const deterministic = interpretResults([enterValue('fbc', 'hb', 9, 'g/dL')], {});
  const base = { summary: { age_years: 61 }, rules, finalLines: rules.lines, results: { Hb: '9 g/dL' }, deterministic, identifiers: ['Obi'] };
  it('validates and turns recommendations into AI lines', async () => {
    const chat = vi.fn().mockResolvedValue(JSON.stringify({ interpretation: 'Anaemia.', findings: [{ test: 'Hb', meaning: 'low' }], recommendations: [{ section: 'investigations', action: 'Blood film', why: 'Anaemia' }, { section: 'nonsense', action: 'x', why: '' }], unknowns: [], hard_rules_quoted: rules.hardRules }));
    const r = await requestClaudeInterpretation(base, chat);
    expect(r.status).toBe('error'); // one malformed recommendation rejects the reply
    chat.mockResolvedValue(JSON.stringify({ interpretation: 'Anaemia.', findings: [], recommendations: [{ section: 'investigations', action: 'Blood film', why: 'Anaemia' }], unknowns: [], hard_rules_quoted: rules.hardRules }));
    const ok = await requestClaudeInterpretation(base, chat);
    expect(ok.status).toBe('ok');
    if (ok.status === 'ok') expect(interpretationToLines(ok.value)[0]).toMatchObject({ section: 'investigations', source: { kind: 'ai' } });
  });
});

describe('Draft clerking fields with Claude', () => {
  const good = { modules: [
    { id: 'history', title: 'Accessory tragus history', questions: [{ id: 'number', label: 'How many', type: 'select', options: ['One', 'Several'] }, { id: 'hearing', label: 'Hearing concern', type: 'select', options: ['Yes', 'No'], redFlags: ['Yes'] }] },
    { id: 'examination', title: 'Accessory tragus examination', questions: [{ id: 'cartilage', label: 'Cartilage core', type: 'select', options: ['Yes', 'No', 'Not examined'] }, { id: 'size', label: 'Size', type: 'number', unit: 'mm' }] },
  ] };
  it('validates against the clerking Question shape and prefixes ids', () => {
    const v = validateFields(JSON.stringify(good), 'Accessory tragus');
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value[0].questions[0].id).toBe('ai_accessory_tragus_number');
  });
  it('rejects the whole reply when any question is malformed', () => {
    const bad = JSON.parse(JSON.stringify(good));
    bad.modules[0].questions[1].redFlags = ['Maybe'];
    expect(validateFields(JSON.stringify(bad), 'x').ok).toBe(false);
    bad.modules[0].questions[1].redFlags = undefined;
    bad.modules[1].questions[0].type = 'slider';
    expect(validateFields(JSON.stringify(bad), 'x').ok).toBe(false);
    expect(validateFields('{"modules": []}', 'x').ok).toBe(false);
  });
  it('drafts are labelled, editable and need approval', async () => {
    const r = await requestDraftFields('Accessory tragus', { ageYears: 1 }, [], vi.fn().mockResolvedValue(JSON.stringify(good)));
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.fields).toMatchObject({ status: 'draft', source: 'Drafted by Claude (Anthropic)' });
    const edited = editFields(r.fields, { removeId: 'ai_accessory_tragus_size' });
    expect(edited.modules[1].questions).toHaveLength(1);
    expect(approveFields(edited, 'Dr A').status).toBe('approved');
  });
});
