/**
 * "Build Plan": the detailed plan, drafted by Claude ONLY when the
 * clinician presses the button (owner decision), through the existing proxy
 * (services/aiProxy → /api/ai-chat). Mirrors the calculators' Claude plan
 * (calculators/ai/calculatorAiPlan.ts) and reuses its validators:
 *
 *   1. a de-identified payload: no name, hospital number or phone by
 *      construction, then deidentifyText with the patient's own identifiers;
 *   2. JSON mode with a fixed schema;
 *   3. validated in code. Anything that does not fit is rejected and the
 *      rules plan stays as it is.
 *
 * The rules plan's hard rules are sent verbatim with an instruction to quote
 * them; the UI repeats them above the draft whatever the model returned and
 * flags any it failed to restate. Nothing in the draft is used until the
 * clinician accepts it line by line.
 */
import { proxyChat, type ProxyChatArgs } from '../../../services/aiProxy';
import { deidentifyText } from '../clerking/aiSuggestions';
import { aiPayload, type PatientContext } from '../clerking/engine';
import type { ClerkingData } from '../clerking/types';
import { norm, objArray, str, strArray } from '../../calculators/ai/calculatorAiPlan';
import type { PlanLine, PlanSection, RulesPlan } from './types';

export const AI_SOURCE = { kind: 'ai' as const, label: 'Claude (AI-drafted — check before use)' };

export const CLERKING_PLAN_SYSTEM_PROMPT = `You are a senior consultant plastic and reconstructive surgeon and wound-care specialist in a private practice in Nigeria. Resources are limited: intermittent laboratory access, results that may take days, no guaranteed ICU, and drugs and dressings commonly stocked in Nigerian pharmacies; patients usually pay out of pocket.

You receive, as JSON, a de-identified clerking (history and examination answers, vitals, comorbidities, medicines, allergies, red flags), any results entered, and the RULES PLAN the app built from validated templates and the practice's own Wound Clinic Protocol, with its HARD RULES.

Write a comprehensive, detailed, patient-specific management plan that addresses the likely challenges: investigations, medicines, procedures and their timing, nutrition, counselling, monitoring, follow-up and referrals. Rules:
- RESPECT every hard rule. Quote each item of "hard_rules" verbatim, word for word, in "hard_rules_quoted". Never propose anything a hard rule forbids (for example high-dose vitamin A when pregnancy is not excluded, empiric iron in sickle cell disease, a child dose above the adult dose or the stated maximum).
- Children: every dose by weight, show the mg/kg basis in "weight_basis", and never above the adult dose.
- Use only the information given. NEVER invent results, examination findings or history. Where something important is unknown, say so in "unknowns" and how it changes the plan.
- Antibiotics only where there is an indication documented in the input. Respect allergies.
- Counselling points are for the patient or parents, in plain English.
- Follow-up "when" must be concrete (e.g. "in 2 weeks", "at 12 months of age").
- Be concise and specific. No preamble.

Return ONLY a JSON object with exactly these keys:
{
  "assessment": string,
  "problems": [string],
  "investigations": [{"test": string, "why": string, "urgency": "urgent"|"soon"|"routine"}],
  "medications": [{"drug": string, "dose": string, "route": string, "frequency": string, "duration": string, "weight_basis": string, "cautions": [string]}],
  "procedures": [{"name": string, "timing": string, "why": string}],
  "nutrition": [string],
  "counselling_points": [string],
  "monitoring": [string],
  "follow_up": [{"when": string, "purpose": string}],
  "referrals": [string],
  "unknowns": [string],
  "hard_rules_quoted": [string]
}`;

export interface AiPlanDraft {
  assessment: string;
  problems: string[];
  investigations: { test: string; why: string; urgency: 'urgent' | 'soon' | 'routine' }[];
  medications: { drug: string; dose: string; route: string; frequency: string; duration: string; weightBasis: string; cautions: string[] }[];
  procedures: { name: string; timing: string; why: string }[];
  nutrition: string[];
  counsellingPoints: string[];
  monitoring: string[];
  followUp: { when: string; purpose: string }[];
  referrals: string[];
  unknowns: string[];
  hardRulesQuoted: string[];
}

export interface PlanAiContext {
  data: ClerkingData;
  ctx: PatientContext;
  rules: RulesPlan;
  weightKg?: number | null;
  /** Results already entered: label → "value unit". */
  results?: Record<string, string>;
  /** Patient's own identifiers, scrubbed from the text as a safety net. */
  identifiers?: string[];
}

/** What Claude is given: built without identifiers in the first place. */
export function buildPlanPayload(i: PlanAiContext) {
  const base = aiPayload(i.data, i.ctx);
  const bySection = (s: PlanSection) => i.rules.lines.filter(l => l.section === s).map(l => (l.withheld ? `${l.text} [NOT RECOMMENDED: ${l.withheld}]` : l.text) + (l.medication?.weightBasis ? ` (${l.medication.weightBasis})` : ''));
  return {
    setting: 'Private plastic and reconstructive surgery practice, Enugu, Nigeria; limited resources.',
    patient: {
      age_years: i.ctx.ageYears ?? null,
      age_months: i.ctx.ageMonths != null && i.ctx.ageMonths < 36 ? i.ctx.ageMonths : undefined,
      sex: i.ctx.sex || null,
      weight_kg: i.weightKg ?? null,
    },
    conditions: i.rules.conditions.map(c => c.label),
    wound_clinic_protocol_applied: i.rules.woundProtocolApplied,
    clerking: { ...base },
    results: i.results ?? {},
    rules_plan: {
      problems: bySection('problems'), investigations: bySection('investigations'), medications: bySection('medications'),
      nutrition: bySection('nutrition'), procedures: bySection('procedures'), counselling: bySection('counselling'),
      monitoring: bySection('monitoring'), follow_up: bySection('follow_up'), referrals: bySection('referrals'),
      not_yet_documented: i.rules.missing,
    },
    hard_rules: i.rules.hardRules,
  };
}

export function buildPlanPrompt(i: PlanAiContext): string {
  const json = JSON.stringify(buildPlanPayload(i), null, 1).slice(0, 60000);
  const header = i.rules.hardRules.length
    ? `HARD RULES (quote each verbatim in hard_rules_quoted; never break one):\n${i.rules.hardRules.map(r => `- ${r}`).join('\n')}\n\n`
    : 'There are no hard rules for this plan; return "hard_rules_quoted": [].\n\n';
  return deidentifyText(`${header}CLERKING AND RULES PLAN:\n${json}`, i.identifiers ?? []);
}

// ── Validation ──────────────────────────────────────────────────────────────

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export function parseJsonObject(raw: unknown): { obj: Record<string, unknown> | null; error?: string } {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { return { obj: null, error: 'reply is not JSON' }; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { obj: null, error: 'reply is not a JSON object' };
  return { obj: obj as Record<string, unknown> };
}

const URGENCY = ['urgent', 'soon', 'routine'] as const;

export function validatePlanDraft(raw: unknown): Validation<AiPlanDraft> {
  const { obj: o, error } = parseJsonObject(raw);
  if (!o) return { ok: false, errors: [error!] };
  const errors: string[] = [];
  const assessment = str(o.assessment, 3000);
  if (!assessment) errors.push('assessment is missing');
  const nutrition = typeof o.nutrition === 'string' ? (str(o.nutrition, 1500) ? [str(o.nutrition, 1500)!] : []) : strArray(o.nutrition, 'nutrition', errors);
  const value: AiPlanDraft = {
    assessment: assessment ?? '',
    problems: strArray(o.problems, 'problems', errors, { required: true }),
    investigations: objArray(o.investigations, 'investigations', errors, x => {
      const test = str(x.test, 300);
      const u = String(x.urgency ?? 'routine').toLowerCase();
      return test ? { test, why: str(x.why, 400) ?? '', urgency: (URGENCY as readonly string[]).includes(u) ? u as AiPlanDraft['investigations'][number]['urgency'] : 'routine' } : null;
    }, { max: 30 }),
    medications: objArray(o.medications, 'medications', errors, x => {
      const drug = str(x.drug, 200), dose = str(x.dose, 200);
      if (!drug || !dose) return null;
      const cautions = Array.isArray(x.cautions) ? x.cautions.map(c => str(c, 300)).filter((c): c is string => !!c).slice(0, 8) : [];
      return { drug, dose, route: str(x.route, 80) ?? '', frequency: str(x.frequency, 160) ?? '', duration: str(x.duration, 160) ?? '', weightBasis: str(x.weight_basis, 300) ?? '', cautions };
    }, { max: 25 }),
    procedures: objArray(o.procedures, 'procedures', errors, x => {
      const name = str(x.name, 300);
      return name ? { name, timing: str(x.timing, 200) ?? '', why: str(x.why, 400) ?? '' } : null;
    }),
    nutrition,
    counsellingPoints: strArray(o.counselling_points, 'counselling_points', errors, { required: true, max: 25 }),
    monitoring: strArray(o.monitoring, 'monitoring', errors),
    followUp: objArray(o.follow_up, 'follow_up', errors, x => {
      const when = str(x.when, 120), purpose = str(x.purpose, 300);
      return when && purpose ? { when, purpose } : null;
    }, { required: true }),
    referrals: strArray(o.referrals, 'referrals', errors),
    unknowns: strArray(o.unknowns, 'unknowns', errors),
    hardRulesQuoted: strArray(o.hard_rules_quoted, 'hard_rules_quoted', errors, { max: 40 }),
  };
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Hard rules the draft did not restate verbatim. */
export function unquotedHardRules(quoted: string[], hardRules: string[]): string[] {
  const q = quoted.map(norm);
  return hardRules.filter(r => !q.some(x => x.includes(norm(r))));
}

/** "in 2 weeks", "at 6 weeks", "3 months", "10 days" → days; null when not dateable. */
export function daysFromWhen(when: string): number | undefined {
  const m = /(\d+(?:\.\d+)?)\s*(?:[–-]\s*\d+\s*)?(day|week|month|year)s?/i.exec(when);
  if (!m || /of age/i.test(when)) return undefined;
  const n = parseFloat(m[1]);
  const f: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };
  return Math.round(n * f[m[2].toLowerCase()]);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);

/** The draft as plan lines (source: Claude), for accept / reject / edit. */
export function draftToLines(d: AiPlanDraft): PlanLine[] {
  const out: PlanLine[] = [];
  const add = (section: PlanSection, key: string, l: Omit<PlanLine, 'id' | 'section' | 'source'>) => {
    const id = `ai:${section}:${slug(key)}`;
    if (!out.some(x => x.id === id)) out.push({ id, section, source: AI_SOURCE, ...l });
  };
  d.problems.forEach(p => add('problems', p, { text: p }));
  d.investigations.forEach(i => add('investigations', i.test, { text: i.test, why: i.why, urgency: i.urgency, test: { id: `ai_${slug(i.test)}` } }));
  d.medications.forEach(m => add('medications', `${m.drug}_${m.dose}`, {
    text: [m.drug, m.dose, m.route, m.frequency, m.duration && `for ${m.duration}`].filter(Boolean).join(' '),
    medication: { drug: m.drug, dose: m.dose, route: m.route, frequency: m.frequency, duration: m.duration, weightBasis: m.weightBasis || undefined, cautions: m.cautions },
  }));
  d.procedures.forEach(p => add('procedures', p.name, { text: p.timing ? `${p.name} (${p.timing})` : p.name, why: p.why }));
  d.nutrition.forEach(n => add('nutrition', n, { text: n }));
  d.counsellingPoints.forEach(c => add('counselling', c, { text: c, patient: c }));
  d.monitoring.forEach(m => add('monitoring', m, { text: m }));
  d.followUp.forEach(f => add('follow_up', `${f.when}_${f.purpose}`, { text: `${f.when}: ${f.purpose}`, followUp: { when: f.when, purpose: f.purpose, days: daysFromWhen(f.when) }, patient: undefined }));
  d.referrals.forEach(r => add('referrals', r, { text: r }));
  return out;
}

// ── Request ─────────────────────────────────────────────────────────────────

export type AiResult<T> =
  | { status: 'ok'; value: T; missingHardRules: string[] }
  | { status: 'error'; message: string; notConfigured?: boolean };

export function aiErrorMessage(e: unknown, what: string): { message: string; notConfigured: boolean } {
  const msg = e instanceof Error ? e.message : String(e);
  const notConfigured = /not configured|ANTHROPIC_API_KEY/i.test(msg);
  return {
    notConfigured,
    message: notConfigured ? `Claude is not configured on the server (ANTHROPIC_API_KEY is not set). ${what}` : `Claude did not respond (${msg}). ${what}`,
  };
}

export async function requestClaudePlan(i: PlanAiContext, chat: (a: ProxyChatArgs) => Promise<string> = proxyChat): Promise<AiResult<AiPlanDraft>> {
  let raw: string;
  try {
    raw = await chat({ system: CLERKING_PLAN_SYSTEM_PROMPT, prompt: buildPlanPrompt(i), maxTokens: 8000, responseFormat: { type: 'json_object' } });
  } catch (e) {
    return { status: 'error', ...aiErrorMessage(e, 'The rules plan is unchanged.') };
  }
  if (!raw) return { status: 'error', message: 'Claude returned an empty reply. The rules plan is unchanged.' };
  const v = validatePlanDraft(raw);
  if (!v.ok) return { status: 'error', message: `Claude's reply was not a usable plan (${v.errors.slice(0, 3).join('; ')}). The rules plan is unchanged.` };
  return { status: 'ok', value: v.value, missingHardRules: unquotedHardRules(v.value.hardRulesQuoted, i.rules.hardRules) };
}
