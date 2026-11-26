/**
 * "Interpret with Claude": a narrative interpretation of the entered results
 * and recommendations that may update the plan. Same pattern as aiPlan.ts:
 * de-identified payload, JSON mode with a fixed schema, validated in code,
 * hard rules quoted; recommendations are plan lines the clinician accepts or
 * rejects. The deterministic interpretation (results.ts) always stands.
 */
import { proxyChat, type ProxyChatArgs } from '../../../services/aiProxy';
import { deidentifyText } from '../clerking/aiSuggestions';
import { objArray, str, strArray } from '../../calculators/ai/calculatorAiPlan';
import { AI_SOURCE, aiErrorMessage, parseJsonObject, unquotedHardRules, type AiResult, type Validation } from './aiPlan';
import { PLAN_SECTIONS, type PlanLine, type PlanSection, type RulesPlan } from './types';
import type { Interpretation } from './results';

export const RESULTS_SYSTEM_PROMPT = `You are a senior consultant plastic surgeon and wound-care specialist in a private practice in Nigeria with limited resources. You receive, as JSON, a de-identified patient summary, the plan, the RESULTS entered (with units and flags), the app's deterministic interpretation (from the practice's Wound Clinic Protocol thresholds and a laboratory engine), and HARD RULES.

Interpret the results together, in the context of the condition, and recommend changes to the plan. Rules:
- Quote every hard rule verbatim in "hard_rules_quoted" and never recommend anything a hard rule forbids.
- Use only the results given; never invent a value. Say what is still missing or needs repeating in "unknowns".
- Children: doses by weight, never above the adult dose.
- Each recommendation names the plan section it belongs to: one of problems, investigations, medications, nutrition, procedures, counselling, monitoring, follow_up, referrals.

Return ONLY a JSON object with exactly these keys:
{
  "interpretation": string,
  "findings": [{"test": string, "meaning": string}],
  "recommendations": [{"section": string, "action": string, "why": string}],
  "unknowns": [string],
  "hard_rules_quoted": [string]
}`;

export interface AiInterpretation {
  interpretation: string;
  findings: { test: string; meaning: string }[];
  recommendations: { section: PlanSection; action: string; why: string }[];
  unknowns: string[];
  hardRulesQuoted: string[];
}

const SECTIONS = PLAN_SECTIONS.map(s => s.id) as string[];

export function validateInterpretation(raw: unknown): Validation<AiInterpretation> {
  const { obj: o, error } = parseJsonObject(raw);
  if (!o) return { ok: false, errors: [error!] };
  const errors: string[] = [];
  const interpretation = str(o.interpretation, 4000);
  if (!interpretation) errors.push('interpretation is missing');
  const value: AiInterpretation = {
    interpretation: interpretation ?? '',
    findings: objArray(o.findings, 'findings', errors, x => { const test = str(x.test, 200), meaning = str(x.meaning, 600); return test && meaning ? { test, meaning } : null; }, { max: 30 }),
    recommendations: objArray(o.recommendations, 'recommendations', errors, x => {
      const action = str(x.action, 500);
      const section = String(x.section ?? '').toLowerCase().replace(/[\s-]+/g, '_');
      return action && SECTIONS.includes(section) ? { section: section as PlanSection, action, why: str(x.why, 400) ?? '' } : null;
    }, { max: 25 }),
    unknowns: strArray(o.unknowns, 'unknowns', errors),
    hardRulesQuoted: strArray(o.hard_rules_quoted, 'hard_rules_quoted', errors, { max: 40 }),
  };
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);

export const interpretationToLines = (i: AiInterpretation): PlanLine[] =>
  i.recommendations.map(r => ({ id: `ai:res:${r.section}:${slug(r.action)}`, section: r.section, text: r.action, why: r.why, source: { ...AI_SOURCE, label: 'Claude results interpretation (AI-drafted — check before use)' } }));

export interface InterpretContext {
  summary: Record<string, unknown>;
  rules: RulesPlan;
  finalLines: PlanLine[];
  results: Record<string, string>;
  deterministic: Interpretation;
  identifiers?: string[];
}

export function buildInterpretPrompt(i: InterpretContext): string {
  const payload = {
    patient: i.summary,
    conditions: i.rules.conditions.map(c => c.label),
    plan: i.finalLines.map(l => `${l.section}: ${l.text}`),
    results: i.results,
    deterministic_interpretation: i.deterministic,
    hard_rules: i.rules.hardRules,
  };
  const header = i.rules.hardRules.length ? `HARD RULES (quote each verbatim; never break one):\n${i.rules.hardRules.map(r => `- ${r}`).join('\n')}\n\n` : '';
  return deidentifyText(`${header}RESULTS AND PLAN:\n${JSON.stringify(payload, null, 1).slice(0, 50000)}`, i.identifiers ?? []);
}

export async function requestClaudeInterpretation(i: InterpretContext, chat: (a: ProxyChatArgs) => Promise<string> = proxyChat): Promise<AiResult<AiInterpretation>> {
  let raw: string;
  try {
    raw = await chat({ system: RESULTS_SYSTEM_PROMPT, prompt: buildInterpretPrompt(i), maxTokens: 5000, responseFormat: { type: 'json_object' } });
  } catch (e) {
    return { status: 'error', ...aiErrorMessage(e, 'The deterministic interpretation is unchanged.') };
  }
  const v = validateInterpretation(raw);
  if (!v.ok) return { status: 'error', message: `Claude's reply was not a usable interpretation (${v.errors.slice(0, 3).join('; ')}). The deterministic interpretation is unchanged.` };
  return { status: 'ok', value: v.value, missingHardRules: unquotedHardRules(v.value.hardRulesQuoted, i.rules.hardRules) };
}
