/**
 * The AI plan: what is sent (hard limits verbatim, no identifiers), and what
 * is accepted back (a fixed shape, or nothing). proxyChat is always mocked —
 * these tests never touch the network.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildAiPlanPrompt, buildAiPlanPayload, validateAiPlan, requestAiPlan, unquotedHardLimits,
  aiUnavailableReason, CALCULATOR_AI_SYSTEM_PROMPT,
} from '../ai/calculatorAiPlan';
import { electrolyteCorrection } from '../../clinician-assistant/services/clinicalCalculators';
import { correctionPlanToReportPlan } from '../report/format';
import type { CalculatorReport } from '../report/types';

vi.mock('../../../services/aiProxy', () => ({
  proxyChat: vi.fn(async () => { throw new Error('network must not be used in tests'); }),
}));

function sodiumReport(): CalculatorReport {
  const plan = electrolyteCorrection({ finding: 'lyte.hyponatraemia', values: { na: 110 }, weightKg: 100, ageYears: 56, sex: 'male', severity: 'severe' })!;
  return {
    calculatorId: 'sodium',
    calculatorName: 'Sodium',
    inputs: [{ label: 'Sodium', value: '110 mmol/L' }, { label: 'Clinical severity', value: 'Severe — symptomatic' }],
    results: [{ label: 'Sodium required to reach 130 mmol/L', value: plan.deficit!.value }],
    plan: correctionPlanToReportPlan(plan),
    patient: {
      name: 'Chukwuemeka Obi', hospitalNumber: 'UNTH/2024/00123', phone: '08031234567',
      ageYears: 56, sex: 'male', weightKg: 100, diagnosis: 'Hyponatraemia, seen by Chukwuemeka\'s wife on 0803 123 4567',
      comorbidities: ['Hypertension'],
    },
  };
}

const GOOD = (limits: string[]) => ({
  assessment_summary: '56-year-old man, 100 kg, severe symptomatic hyponatraemia (Na 110).',
  hard_limits_quoted: limits,
  immediate_actions: [{ action: '3% saline 150 mL IV over 20 min', timing: 'now' }],
  fluids_and_drugs: [{ item: 'Sodium chloride 3%', dose: '150 mL', route: 'IV', rate_or_frequency: 'over 20 min, up to 3 times', duration: 'until Na +5', notes: '' }],
  monitoring: [{ what: 'Serum sodium', frequency: 'every 2 hours', target: 'rise 4-6 mmol/L then hold' }],
  escalation_criteria: ['Seizure persists after 3 boluses'],
  counselling_points: ['Explain why the sodium is corrected slowly'],
  follow_up: ['Review cause once stable'],
  unknowns: ['Volume status not recorded'],
});

describe('prompt builder', () => {
  it('includes every engine hard limit verbatim', () => {
    const r = sodiumReport();
    const prompt = buildAiPlanPrompt(r);
    expect(r.plan!.hardLimits.length).toBeGreaterThan(0);
    for (const l of r.plan!.hardLimits) expect(prompt).toContain(l);
    expect(prompt).toMatch(/HARD LIMITS/);
  });

  it('excludes the patient\'s name, hospital number and phone', () => {
    const prompt = buildAiPlanPrompt(sodiumReport());
    expect(prompt).not.toMatch(/Chukwuemeka/i);
    expect(prompt).not.toMatch(/Obi\b/);
    expect(prompt).not.toContain('UNTH/2024/00123');
    expect(prompt).not.toContain('08031234567');
    expect(prompt).not.toMatch(/0803 123 4567/);
    // Clinical context still goes.
    expect(prompt).toContain('"age_years": 56');
    expect(prompt).toContain('Hypertension');
  });

  it('the payload has no identifier keys at all', () => {
    const p = buildAiPlanPayload(sodiumReport());
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/"name"|hospitalNumber|hospital_number|"phone"/);
  });

  it('the steps are sent with their doses', () => {
    const prompt = buildAiPlanPrompt(sodiumReport());
    expect(prompt).toMatch(/Hypertonic sodium chloride 3%/);
    expect(prompt).toMatch(/Dose: 100–150 mL/);
  });

  it('the system prompt fixes the setting, the limits rule and the schema', () => {
    expect(CALCULATOR_AI_SYSTEM_PROMPT).toMatch(/Nigeria/);
    expect(CALCULATOR_AI_SYSTEM_PROMPT).toMatch(/hard_limits_quoted/);
    expect(CALCULATOR_AI_SYSTEM_PROMPT).toMatch(/Never invent/);
  });
});

describe('response validator', () => {
  const limits = sodiumReport().plan!.hardLimits;

  it('accepts a good shape (object or JSON string)', () => {
    const a = validateAiPlan(GOOD(limits));
    expect(a.ok).toBe(true);
    const b = validateAiPlan(JSON.stringify(GOOD(limits)));
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.plan.fluidsAndDrugs[0].rateOrFrequency).toMatch(/20 min/);
      expect(unquotedHardLimits(b.plan, limits)).toEqual([]);
    }
  });

  it.each([
    ['not JSON', 'here is your plan'],
    ['an array', '[]'],
    ['missing summary', { ...GOOD(limits), assessment_summary: '' }],
    ['actions not a list', { ...GOOD(limits), immediate_actions: 'give saline' }],
    ['no actions', { ...GOOD(limits), immediate_actions: [] }],
    ['monitoring without frequency', { ...GOOD(limits), monitoring: [{ what: 'Na' }] }],
    ['drug without dose', { ...GOOD(limits), fluids_and_drugs: [{ item: '3% saline' }] }],
    ['no escalation', { ...GOOD(limits), escalation_criteria: [] }],
    ['numbers where text belongs', { ...GOOD(limits), counselling_points: [1, 2] }],
    ['missing hard_limits_quoted', (() => { const g: Record<string, unknown> = GOOD(limits); delete g.hard_limits_quoted; return g; })()],
  ])('rejects %s', (_label, raw) => {
    expect(validateAiPlan(raw).ok).toBe(false);
  });

  it('reports hard limits the model did not restate', () => {
    const v = validateAiPlan(GOOD([limits[0]]));
    expect(v.ok).toBe(true);
    if (v.ok) expect(unquotedHardLimits(v.plan, limits)).toEqual(limits.slice(1));
  });
});

describe('requestAiPlan (mocked proxy)', () => {
  it('sends JSON mode with the system prompt and returns the validated plan', async () => {
    const r = sodiumReport();
    const chat = vi.fn(async () => JSON.stringify(GOOD(r.plan!.hardLimits)));
    const out = await requestAiPlan(r, chat);
    expect(out.status).toBe('ok');
    expect(chat).toHaveBeenCalledOnce();
    const args = (chat.mock.calls[0] as unknown[])[0] as { responseFormat: unknown; system: string; prompt: string };
    expect(args.responseFormat).toEqual({ type: 'json_object' });
    expect(args.system).toBe(CALCULATOR_AI_SYSTEM_PROMPT);
    expect(args.prompt).not.toMatch(/Chukwuemeka/);
  });

  it('a malformed reply is an error, not a plan', async () => {
    const out = await requestAiPlan(sodiumReport(), async () => '{"plan": "do stuff"}');
    expect(out.status).toBe('error');
    if (out.status === 'error') expect(out.message).toMatch(/deterministic plan is unchanged/);
  });

  it('an empty reply is an error', async () => {
    const out = await requestAiPlan(sodiumReport(), async () => '');
    expect(out.status).toBe('error');
  });

  it('a server without a key is reported as not configured', async () => {
    const out = await requestAiPlan(sodiumReport(), async () => { throw new Error('AI is not configured on the server (ANTHROPIC_API_KEY is not set).'); });
    expect(out).toMatchObject({ status: 'error', notConfigured: true });
  });

  it('a network failure is an error with the reason', async () => {
    const out = await requestAiPlan(sodiumReport(), async () => { throw new Error('Failed to fetch'); });
    expect(out.status).toBe('error');
    if (out.status === 'error') expect(out.message).toMatch(/Failed to fetch/);
  });
});

describe('availability', () => {
  it('offline and not-configured disable the button with a reason', () => {
    expect(aiUnavailableReason(false, false)).toMatch(/Offline/);
    expect(aiUnavailableReason(true, true)).toMatch(/not configured/);
    expect(aiUnavailableReason(true, false)).toBeNull();
  });
});
