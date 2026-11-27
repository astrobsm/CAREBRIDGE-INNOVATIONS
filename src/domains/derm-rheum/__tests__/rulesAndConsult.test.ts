import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { deterministicReview, reviewApplies } from '../review';
import { HARD_RULE_TEXT, checkConsult, type ConsultForCheck } from '../hardRules';
import { buildConsultPrompt, requestDermRheumConsult, validateConsult, consultToLines, DERM_RHEUM_SYSTEM_PROMPT } from '../consult';
import { buildRulesPlan } from '../../clinical/clerkingPlan/rulesPlan';
import { caseA, caseB, caseC, caseD, caseSjs } from './cases';

const review = (c: { data: any; ctx: any }) => deterministicReview(c.data, c.ctx);
const ruleIds = (c: { data: any; ctx: any }) => review(c).hardRules.map(r => r.id);

describe('deterministic screen and candidates', () => {
  it('(a) leg ulcer with undermined violaceous edge and IBD → pyoderma gangrenosum first', () => {
    const r = review(caseA());
    expect(r.screen.atypical).toBe(true);
    expect(r.screen.candidates[0].id).toBe('pyoderma_gangrenosum');
    expect(r.tools).toContain('paracelsus');
  });
  it('(b) 2-year burn-scar ulcer with rolled edge → Marjolin, must not miss', () => {
    const r = review(caseB());
    const m = r.screen.candidates.find(c => c.id === 'marjolin_scc')!;
    expect(r.screen.candidates[0].id).toBe('marjolin_scc');
    expect(m.mustNotMiss).toBe(true);
  });
  it('(c) digital ulcers, Raynaud\'s, skin thickening → systemic sclerosis', () => {
    expect(review(caseC()).screen.candidates[0].id).toBe('systemic_sclerosis');
    // Digital ulcers in a systemic sclerosis pattern are not biopsied for being multiple.
    expect(ruleIds(caseC())).not.toContain('biopsy_chronic');
  });
  it('(d) pigmented plantar lesion → acral melanoma, must not miss', () => {
    const r = review(caseD());
    expect(r.screen.candidates[0].id).toBe('acral_melanoma');
    expect(r.tools).toEqual(expect.arrayContaining(['seven_point', 'abcde', 'cubed']));
  });
  it('offers the review for skin and ulcer complaints only', () => {
    expect(reviewApplies(caseA().data)).toBe(true);
    expect(reviewApplies(caseD().data)).toBe(true);
    expect(reviewApplies({ complaints: [{ complaintId: 'carpal_tunnel' } as any] })).toBe(false);
  });
});

describe('hard rules', () => {
  it('suspected PG → do not debride; rules plan withholds every debridement line', () => {
    expect(ruleIds(caseA())).toContain('pg_no_debride');
    const plan = buildRulesPlan(caseA());
    expect(plan.hardRules).toContain(HARD_RULE_TEXT.pg_no_debride);
    const debride = plan.lines.filter(l => l.section === 'procedures' && /debrid/i.test(l.id));
    for (const l of debride) expect(l.withheld, l.id).toMatch(/pyoderma/i);
    expect(plan.lines.some(l => l.id === 'proc:au_gentle')).toBe(true);
  });
  it('a chronic wound with a purple undermined edge fires the PG rule too (not only the screen)', () => {
    const data = caseB().data;
    data.complaints = [{ ...data.complaints[0], complaintId: 'chronic_ulcer', answers: { cw_atypical: ['Purple / undermined edge'] } }];
    const plan = buildRulesPlan({ data, ctx: caseB().ctx });
    expect(plan.hardRules).toContain(HARD_RULE_TEXT.pg_no_debride);
    expect(plan.lines.find(l => l.id === 'proc:cw_debride')?.withheld).toMatch(/pyoderma/i);
  });
  it('ulcer over 3 months → biopsy', () => {
    expect(ruleIds(caseB())).toContain('biopsy_chronic');
    const plan = buildRulesPlan(caseB());
    expect(plan.hardRules).toContain(HARD_RULE_TEXT.biopsy_chronic);
    expect(plan.lines.some(l => l.section === 'investigations' && l.test?.id === 'biopsy')).toBe(true);
  });
  it('a 3-week ulcer without atypical features gets no biopsy rule', () => {
    const c = caseA();
    c.data.complaints[0].answers = { au_duration: 'Under 6 weeks' };
    c.data.exam = {};
    expect(ruleIds(c)).not.toContain('biopsy_chronic');
  });
  it('SJS / TEN → emergency; template is urgent and admits', () => {
    expect(ruleIds(caseSjs())).toContain('sjs_emergency');
    const plan = buildRulesPlan(caseSjs());
    expect(plan.hardRules).toContain(HARD_RULE_TEXT.sjs_emergency);
    expect(plan.lines.find(l => l.id === 'pr:sjs')?.urgency).toBe('urgent');
    expect(plan.lines.find(l => l.id === 'proc:sjs_admit')?.text).toMatch(/Admit/);
  });
  it('acral pigmented lesion → full-thickness biopsy, never shave', () => {
    expect(ruleIds(caseD())).toContain('acral_full_thickness');
  });
  it('the atypical-ulcer plan lines carry KB sources and catalogue test ids', () => {
    const plan = buildRulesPlan(caseA());
    const kb = plan.lines.filter(l => l.id.startsWith('inv:dr_'));
    expect(kb.length).toBeGreaterThan(3);
    expect(kb.every(l => /Derm & rheum knowledge base v/.test(l.source.label))).toBe(true);
    expect(kb.map(l => l.test?.id)).toContain('histo_dif');
  });
});

// ── Claude consult (mocked) ────────────────────────────────────────────────

const good = (over: Record<string, unknown> = {}) => ({
  summary: 'Probable pyoderma gangrenosum.', urgency: 'urgent',
  differential: [{ diagnosis: 'Pyoderma gangrenosum', kb_id: 'pyoderma_gangrenosum', likelihood: 'high', reasoning: 'Undermined violaceous edge, IBD', supporting: ['IBD'], against: [] }],
  must_not_miss: [{ diagnosis: 'Squamous cell carcinoma', why: 'Chronic ulcer', how_to_exclude: 'edge biopsy' }],
  investigations: [{ test: 'Edge biopsy with DIF', catalogue_code: 'histo_dif', why: 'Exclude mimics', urgency: 'soon', biopsy_site: 'violaceous edge' },
    { test: 'Tissue culture for AFB and fungi', catalogue_code: 'nonsense_code', why: 'Before steroids', urgency: 'soon', biopsy_site: null }],
  management: { immediate: ['Moist dressings', 'Analgesia'], definitive: ['Prednisolone 0.75 mg/kg/day'] },
  do_not: ['Do not debride'], referrals: [{ to: 'Dermatology', urgency: 'soon', why: 'Confirm PG' }],
  patient_counselling: ['This is an inflammation, not an infection.'], confidence: 'moderate', would_change_confidence: ['Biopsy result'],
  photo_observations: [], hard_rules_quoted: [HARD_RULE_TEXT.pg_no_debride],
  ...over,
});

describe('consult validation (Claude mocked)', () => {
  it('accepts a valid reply; unknown catalogue codes become null', () => {
    const v = validateConsult(JSON.stringify(good()));
    expect(v.ok).toBe(true);
    if (v.ok) { expect(v.value.investigations[0].catalogueCode).toBe('histo_dif'); expect(v.value.investigations[1].catalogueCode).toBeNull(); }
  });
  it('rejects the whole reply when any part is malformed', () => {
    expect(validateConsult('not json').ok).toBe(false);
    expect(validateConsult(JSON.stringify(good({ urgency: 'whenever' }))).ok).toBe(false);
    expect(validateConsult(JSON.stringify(good({ differential: [{ diagnosis: 'PG' }] }))).ok).toBe(false);
    expect(validateConsult(JSON.stringify(good({ differential: [] }))).ok).toBe(false);
    expect(validateConsult(JSON.stringify(good({ management: ['x'] }))).ok).toBe(false);
    expect(validateConsult(JSON.stringify(good({ patient_counselling: [1, 2] }))).ok).toBe(false);
    expect(validateConsult(JSON.stringify(good({ investigations: [{ why: 'no test' }] }))).ok).toBe(false);
  });
  it('lines are AI-sourced and labelled', () => {
    const v = validateConsult(good());
    if (!v.ok) throw new Error('invalid');
    const lines = consultToLines(v.value);
    expect(lines.every(l => l.source.kind === 'ai' && /AI-drafted — check before use/.test(l.source.label))).toBe(true);
    expect(lines.find(l => l.section === 'procedures' && /^DO NOT/.test(l.text))).toBeTruthy();
    expect(lines.find(l => l.section === 'counselling')?.patient).toBe('This is an inflammation, not an infection.');
  });
});

describe('contradiction flagging', () => {
  const rules = () => review(caseA()).hardRules;
  const consult = (o: Partial<ConsultForCheck>): ConsultForCheck => ({ urgency: 'urgent', investigations: [{ test: 'Edge biopsy' }, { test: 'Tissue culture AFB' }, { test: 'Urine dipstick' }], management: { immediate: ['Moist dressings'], definitive: [] }, doNot: ['Do not debride'], referrals: [], ...o });
  it('PG: sharp debridement contradicts; "graft once controlled" does not; no warning is an omission', () => {
    const s = (c: ConsultForCheck) => checkConsult(c, rules()).find(x => x.rule.id === 'pg_no_debride')!.status;
    expect(s(consult({ management: { immediate: ['Sharp debridement of slough'], definitive: [] } }))).toBe('contradicted');
    expect(s(consult({ management: { immediate: ['Moist dressings'], definitive: ['Skin graft once the inflammation is controlled'] } }))).toBe('ok');
    expect(s(consult({ management: { immediate: ['No sharp debridement'], definitive: [] } }))).toBe('ok');
    expect(s(consult({ doNot: [] }))).toBe('omitted');
  });
  it('biopsy rule: omitted when no biopsy is requested', () => {
    const r = review(caseB()).hardRules;
    expect(checkConsult(consult({ investigations: [{ test: 'Wound swab' }] }), r).find(x => x.rule.id === 'biopsy_chronic')!.status).toBe('omitted');
  });
  it('SJS: a routine urgency contradicts; admission and drug stop are required', () => {
    const r = review(caseSjs()).hardRules;
    const st = (c: ConsultForCheck) => checkConsult(c, r).find(x => x.rule.id === 'sjs_emergency')!.status;
    expect(st(consult({ urgency: 'routine' }))).toBe('contradicted');
    expect(st(consult({ urgency: 'emergency', management: { immediate: ['Stop co-trimoxazole', 'Admit to the burns unit'], definitive: [] } }))).toBe('ok');
    expect(st(consult({ urgency: 'emergency', management: { immediate: ['Admit'], definitive: [] } }))).toBe('omitted');
  });
  it('acral: a shave biopsy contradicts', () => {
    const r = review(caseD()).hardRules;
    expect(checkConsult(consult({ investigations: [{ test: 'Shave biopsy' }] }), r).find(x => x.rule.id === 'acral_full_thickness')!.status).toBe('contradicted');
  });
  it('request: a valid mocked reply is checked; a failure keeps the KB guidance', async () => {
    const c = caseA();
    const rv = review(c);
    const chat = vi.fn(async () => JSON.stringify(good({ management: { immediate: ['Sharp debridement'], definitive: [] } })));
    const vision = vi.fn(async () => '');
    const res = await requestDermRheumConsult({ ...c, review: rv, identifiers: [] }, [], { chat, vision });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(vision).not.toHaveBeenCalled();
    expect(res.status).toBe('ok');
    if (res.status === 'ok') expect(res.checks.find(x => x.rule.id === 'pg_no_debride')?.status).toBe('contradicted');
    // The unsafe line itself is held back with the rule, not just flagged at the top.
    if (res.status === 'ok') {
      const unsafe = res.lines.find(l => /Sharp debridement/.test(l.text))!;
      expect(unsafe.withheld).toMatch(/^Breaks a safety rule: /);
      expect(res.lines.filter(l => l.withheld)).toHaveLength(1);
    }
    const bad = await requestDermRheumConsult({ ...c, review: rv }, [], { chat: async () => '{"summary": 1}', vision });
    expect(bad.status).toBe('error');
    if (bad.status === 'error') expect(bad.message).toMatch(/knowledge-base guidance and the rules plan are unchanged/);
    const down = await requestDermRheumConsult({ ...c, review: rv }, [], { chat: async () => { throw new Error('ANTHROPIC_API_KEY is not set'); }, vision });
    expect(down.status === 'error' && down.notConfigured).toBe(true);
  });
  it('photos (at most 3) go in one vision request with the same prompt', async () => {
    const c = caseA();
    const vision = vi.fn(async () => JSON.stringify(good()));
    const res = await requestDermRheumConsult({ ...c, review: review(c) }, ['data:image/jpeg;base64,A', 'b', 'c', 'd'], { chat: vi.fn(), vision });
    expect(vision).toHaveBeenCalledTimes(1);
    const [imgs, system, text] = vision.mock.calls[0] as unknown as [string[], string, string];
    expect(imgs).toHaveLength(3);
    expect(system).toBe(DERM_RHEUM_SYSTEM_PROMPT);
    expect(text).toMatch(/3 photo\(s\)/);
    expect(res.status === 'ok' && res.photosSent).toBe(3);
  });
});

describe('de-identification', () => {
  it('the prompt carries no name, phone or hospital number, and grounds Claude in the KB', () => {
    const c = caseA();
    c.data.complaints[0].answers.au_drugs = 'Ada Okafor started mesalazine, call 08031234567, hospital number UNTH/2024/0099';
    const p = buildConsultPrompt({ ...c, review: review(c), description: 'Ada Okafor has an ulcer', identifiers: ['Ada', 'Okafor', 'UNTH/2024/0099', '08031234567'] });
    expect(p).not.toMatch(/Ada|Okafor|08031234567|UNTH\/2024\/0099/);
    expect(p).toContain(HARD_RULE_TEXT.pg_no_debride);
    expect(p).toContain('"kb_id": "pyoderma_gangrenosum"');
    expect(p).toContain('histo_dif');
  });
});

describe('no Claude call without a press', () => {
  const src = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
  it('only the button handlers call the consult; nothing runs on render or in an effect', () => {
    const ui = src('src/domains/derm-rheum/components/DermRheumReview.tsx');
    const calls = ui.split('\n').filter(l => /requestDermRheumConsult\(/.test(l));
    expect(calls).toHaveLength(1);
    expect(ui).toMatch(/const runConsult = async \(\) =>/);
    expect(ui).toMatch(/onClick=\{runConsult\}/);
    // No effect may reach the consult.
    for (const block of ui.split('useEffect(').slice(1)) expect(block.slice(0, 400)).not.toMatch(/runConsult|requestDermRheumConsult/);
    for (const f of ['src/domains/derm-rheum/pages/DermRheumPage.tsx', 'src/domains/clinical/clerkingPlan/components/ClerkingPlanPanel.tsx', 'src/domains/clinical/clerkingPlan/rulesPlan.ts', 'src/domains/derm-rheum/review.ts'])
      expect(src(f), f).not.toMatch(/requestDermRheumConsult|proxyChat|proxyVision/);
  });
  it('the deterministic review never imports the AI proxy', () => {
    for (const f of ['review.ts', 'screen.ts', 'hardRules.ts', 'features.ts', 'scores.ts', 'kb/index.ts'])
      expect(src(`src/domains/derm-rheum/${f}`), f).not.toMatch(/aiProxy|consult'/);
  });
});
