/**
 * AI-drafted management plans for every calculator, through Claude.
 *
 * One module for every calculator on both surfaces. The calculator supplies a
 * CalculatorReport — its inputs, its result and its deterministic plan — and
 * this module:
 *
 *   1. builds a de-identified prompt: no name, hospital number or phone, and
 *      the payload is passed through deidentifyText with the patient's own
 *      identifiers as a safety net;
 *   2. sends it to /api/ai-chat (server-side Claude) in JSON mode;
 *   3. validates the reply against a fixed schema. Anything that does not fit
 *      is rejected, and the caller keeps showing the deterministic plan.
 *
 * The deterministic plan is never replaced. Its hard limits are passed to the
 * model verbatim with an instruction to quote them; the UI repeats the
 * engine's hard limits above the AI card whatever the model returned, and
 * flags any the model failed to restate.
 */
import { proxyChat, type ProxyChatArgs } from '../../../services/aiProxy';
import { deidentifyText } from '../../clinical/clerking/aiSuggestions';
import { stepToText } from '../report/format';
import type { CalculatorReport } from '../report/types';

export const CALCULATOR_AI_SYSTEM_PROMPT = `You are a senior clinician (consultant level) supporting a doctor in a private plastic and reconstructive surgery practice in Nigeria. Resources are limited: assume a ward or small high-dependency area, intermittent laboratory access (results may take hours), no guaranteed ICU bed, and drugs and fluids commonly stocked in Nigerian hospitals.

You receive, as JSON, one bedside calculator's de-identified inputs, its computed result, and the DETERMINISTIC PLAN the app produced from validated rules, including HARD LIMITS.

Write an excellent, patient-specific management plan for this patient. Rules:
- Stay WITHIN every hard limit. Quote every item of "hard_limits" verbatim, word for word, in "hard_limits_quoted". Never propose a dose, rate, volume or speed of correction that exceeds a hard limit.
- Use only the values given. Never invent laboratory results, vital signs, examination findings or history. Where something important is not given, say so in "unknowns" and state how it changes the plan.
- Give drug and fluid doses, routes, rates and durations computed for this patient's weight where the deterministic plan supports it; show the arithmetic briefly in "notes".
- Monitoring must have a concrete frequency. Escalation criteria must be specific and observable (numbers, signs).
- Counselling points are for the patient and family, in plain language.
- Prefer what is practical where resources are limited, and say what to do if a preferred drug or test is unavailable.
- Be concise. No preamble.

Return ONLY a JSON object with exactly these keys:
{
  "assessment_summary": string,
  "hard_limits_quoted": [string],
  "immediate_actions": [{"action": string, "timing": string}],
  "fluids_and_drugs": [{"item": string, "dose": string, "route": string, "rate_or_frequency": string, "duration": string, "notes": string}],
  "monitoring": [{"what": string, "frequency": string, "target": string}],
  "escalation_criteria": [string],
  "counselling_points": [string],
  "follow_up": [string],
  "unknowns": [string]
}`;

export interface AiPlanAction { action: string; timing: string }
export interface AiPlanDrug { item: string; dose: string; route: string; rateOrFrequency: string; duration: string; notes: string }
export interface AiPlanMonitor { what: string; frequency: string; target: string }

export interface AiPlan {
  assessmentSummary: string;
  hardLimitsQuoted: string[];
  immediateActions: AiPlanAction[];
  fluidsAndDrugs: AiPlanDrug[];
  monitoring: AiPlanMonitor[];
  escalationCriteria: string[];
  counsellingPoints: string[];
  followUp: string[];
  unknowns: string[];
}

// ── Prompt ──────────────────────────────────────────────────────────────────

/** The patient's own identifiers, to be scrubbed from anything sent. */
export function reportIdentifiers(report: CalculatorReport): string[] {
  const p = report.patient;
  if (!p) return [];
  const name = (p.name || '').trim();
  return [name, ...name.split(/\s+/).filter(n => n.length >= 2), p.hospitalNumber, p.phone]
    .filter((x): x is string => typeof x === 'string' && x.trim().length >= 2);
}

/** What the model is given. Built without identifiers in the first place. */
export function buildAiPlanPayload(report: CalculatorReport) {
  const p = report.patient;
  const plan = report.plan;
  return {
    calculator: report.calculatorName,
    setting: 'Private plastic and reconstructive surgery practice, Nigeria; limited resources.',
    patient: {
      age_years: p?.ageYears ?? null,
      sex: p?.sex || null,
      weight_kg: p?.weightKg ?? null,
      height_cm: p?.heightCm ?? null,
      comorbidities: p?.comorbidities ?? [],
      working_diagnosis: p?.diagnosis || null,
    },
    inputs: Object.fromEntries(report.inputs.map(f => [f.label, f.value])),
    result: Object.fromEntries(report.results.map(f => [f.label, f.value])),
    interpretation: report.notes ?? [],
    reference: (report.reference ?? []).map(s => ({ [s.title]: s.items })),
    deterministic_plan: plan ? {
      title: plan.title ?? null,
      target: plan.target ?? null,
      check_first: plan.prerequisites,
      steps: plan.steps.map(stepToText),
      hard_limits: plan.hardLimits,
      monitoring: plan.monitoring,
      other: plan.sections.map(s => ({ [s.title]: s.items })),
    } : null,
  };
}

export function buildAiPlanPrompt(report: CalculatorReport): string {
  const limits = report.plan?.hardLimits ?? [];
  const json = JSON.stringify(buildAiPlanPayload(report), null, 1).slice(0, 60000);
  const header = limits.length
    ? `HARD LIMITS (quote each verbatim in hard_limits_quoted; never exceed):\n${limits.map(l => `- ${l}`).join('\n')}\n\n`
    : 'There are no engine hard limits for this calculator; return "hard_limits_quoted": [].\n\n';
  return deidentifyText(`${header}CALCULATOR OUTPUT:\n${json}`, reportIdentifiers(report));
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Shared with the clerking plan's Claude drafts (clinical/clerkingPlan/aiPlan.ts). */
export const str = (v: unknown, max = 600): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

export function strArray(v: unknown, key: string, errors: string[], { required = false, max = 20 } = {}): string[] {
  if (!Array.isArray(v)) { errors.push(`${key} is not a list`); return []; }
  const out = v.map(x => str(x)).filter((x): x is string => x !== null).slice(0, max);
  if (out.length !== v.filter(x => x !== null && x !== undefined && x !== '').length) errors.push(`${key} contains non-text items`);
  if (required && out.length === 0) errors.push(`${key} is empty`);
  return out;
}

export function objArray<T>(v: unknown, key: string, errors: string[], map: (o: Record<string, unknown>) => T | null, { required = false, max = 20 } = {}): T[] {
  if (!Array.isArray(v)) { errors.push(`${key} is not a list`); return []; }
  const out: T[] = [];
  for (const x of v.slice(0, max)) {
    const m = x && typeof x === 'object' && !Array.isArray(x) ? map(x as Record<string, unknown>) : null;
    if (!m) { errors.push(`${key} has a malformed item`); continue; }
    out.push(m);
  }
  if (required && out.length === 0) errors.push(`${key} is empty`);
  return out;
}

export type AiPlanValidation = { ok: true; plan: AiPlan } | { ok: false; errors: string[] };

/** The model's reply, accepted only if it has the fixed shape. */
export function validateAiPlan(raw: unknown): AiPlanValidation {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return { ok: false, errors: ['reply is not JSON'] }; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['reply is not a JSON object'] };
  const o = obj as Record<string, unknown>;
  const errors: string[] = [];

  const assessmentSummary = str(o.assessment_summary, 2000);
  if (!assessmentSummary) errors.push('assessment_summary is missing');

  const plan: AiPlan = {
    assessmentSummary: assessmentSummary ?? '',
    hardLimitsQuoted: strArray(o.hard_limits_quoted, 'hard_limits_quoted', errors),
    immediateActions: objArray(o.immediate_actions, 'immediate_actions', errors, x => {
      const action = str(x.action);
      return action ? { action, timing: str(x.timing, 200) ?? '' } : null;
    }, { required: true }),
    fluidsAndDrugs: objArray(o.fluids_and_drugs, 'fluids_and_drugs', errors, x => {
      const item = str(x.item, 300), dose = str(x.dose, 300);
      return item && dose ? {
        item, dose,
        route: str(x.route, 100) ?? '',
        rateOrFrequency: str(x.rate_or_frequency, 200) ?? '',
        duration: str(x.duration, 200) ?? '',
        notes: str(x.notes) ?? '',
      } : null;
    }),
    monitoring: objArray(o.monitoring, 'monitoring', errors, x => {
      const what = str(x.what, 300), frequency = str(x.frequency, 200);
      return what && frequency ? { what, frequency, target: str(x.target, 300) ?? '' } : null;
    }, { required: true }),
    escalationCriteria: strArray(o.escalation_criteria, 'escalation_criteria', errors, { required: true }),
    counsellingPoints: strArray(o.counselling_points, 'counselling_points', errors),
    followUp: strArray(o.follow_up, 'follow_up', errors),
    unknowns: strArray(o.unknowns, 'unknowns', errors),
  };

  return errors.length ? { ok: false, errors } : { ok: true, plan };
}

export const norm = (s: string) => s.toLowerCase().replace(/[‐-―-]/g, '-').replace(/\s+/g, ' ').trim();

/** Engine hard limits the model did not restate verbatim. */
export function unquotedHardLimits(plan: AiPlan, hardLimits: string[]): string[] {
  const quoted = plan.hardLimitsQuoted.map(norm);
  return hardLimits.filter(l => !quoted.some(q => q.includes(norm(l))));
}

// ── Request ─────────────────────────────────────────────────────────────────

export type AiPlanResult =
  | { status: 'ok'; plan: AiPlan; missingHardLimits: string[] }
  | { status: 'error'; message: string; notConfigured?: boolean };

/** Why the AI cannot be used right now, or null when it can be tried. */
export function aiUnavailableReason(online: boolean, serverNotConfigured: boolean): string | null {
  if (!online) return 'Offline — AI plans need an internet connection. The plan above is complete without it.';
  if (serverNotConfigured) return 'AI is not configured on the server (ANTHROPIC_API_KEY is not set).';
  return null;
}

export async function requestAiPlan(
  report: CalculatorReport,
  chat: (args: ProxyChatArgs) => Promise<string> = proxyChat,
): Promise<AiPlanResult> {
  let raw: string;
  try {
    raw = await chat({
      system: CALCULATOR_AI_SYSTEM_PROMPT,
      prompt: buildAiPlanPrompt(report),
      maxTokens: 6000,
      responseFormat: { type: 'json_object' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notConfigured = /not configured|ANTHROPIC_API_KEY/i.test(msg);
    return {
      status: 'error',
      notConfigured,
      message: notConfigured
        ? 'AI is not configured on the server (ANTHROPIC_API_KEY is not set). The deterministic plan is unchanged.'
        : `The AI service did not respond (${msg}). The deterministic plan is unchanged.`,
    };
  }
  if (!raw) return { status: 'error', message: 'The AI returned an empty reply. The deterministic plan is unchanged.' };
  const v = validateAiPlan(raw);
  if (!v.ok) {
    return { status: 'error', message: `The AI reply was not a usable plan (${v.errors.slice(0, 3).join('; ')}). The deterministic plan is unchanged.` };
  }
  return { status: 'ok', plan: v.plan, missingHardLimits: unquotedHardLimits(v.plan, report.plan?.hardLimits ?? []) };
}
