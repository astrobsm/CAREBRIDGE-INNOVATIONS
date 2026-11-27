/**
 * "Draft clerking fields with Claude", for a condition with no template.
 *
 * Claude is asked for question modules in EXACTLY the clerking's own shape
 * (clerking/types Question / QuestionModule). The reply is validated against
 * that shape and rejected whole if anything is wrong: an id that is not a
 * slug, a select with no options, a red flag that is not an option, a showIf
 * pointing at a question that does not exist. Ids are prefixed so they can
 * never collide with a template's answers. Drafts are cached on this device
 * per condition, shown labelled "AI-drafted fields", editable, and stay
 * "draft" until a clinician approves them.
 */
import { proxyChat, type ProxyChatArgs } from '../../../services/aiProxy';
import { deidentifyText } from '../clerking/aiSuggestions';
import type { FieldType, Question, QuestionModule } from '../clerking/types';
import { aiErrorMessage, parseJsonObject, type Validation } from './aiPlan';
import type { AiDraftedFields } from './types';

export const AI_FIELDS_SOURCE = 'Drafted by Claude (Anthropic)';

export const FIELDS_SYSTEM_PROMPT = `You are a senior consultant plastic and reconstructive surgeon. A clinician in a Nigerian private practice is clerking a patient with a condition the app has no template for. Draft the condition-specific clerking fields: the history questions and the examination findings that a specialist would document, including red flags, associated anomalies and any standard classification as a select field.

Return ONLY a JSON object of this exact shape:
{"modules": [
  {"id": "history", "title": string, "questions": [Question]},
  {"id": "examination", "title": string, "questions": [Question]}
]}
where Question is:
{"id": string (lower_snake_case, unique), "label": string, "type": "select"|"multiselect"|"text"|"number"|"textarea", "options": [string] (required for select / multiselect, 2–20 items, include "Unknown" or "Not examined" where sensible), "unit": string (numbers only), "showIf": {"q": question id in the same module, "in": [option]} (optional), "redFlags": [option] (optional, must be options), "hint": string (optional)}
At most 15 questions per module. No patient identifiers.`;

const TYPES: FieldType[] = ['select', 'multiselect', 'text', 'number', 'textarea'];
const ID = /^[a-z][a-z0-9_]{0,39}$/;
const s = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export const conditionSlug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'condition';

/** Validate Claude's modules against the clerking Question shape; prefix ids. Rejects the whole reply on any error. */
export function validateFields(raw: unknown, condition: string): Validation<QuestionModule[]> {
  const { obj, error } = parseJsonObject(raw);
  if (!obj) return { ok: false, errors: [error!] };
  const mods = obj.modules;
  const errors: string[] = [];
  if (!Array.isArray(mods) || mods.length < 1 || mods.length > 3) return { ok: false, errors: ['modules must be a list of 1–3 modules'] };
  const prefix = `ai_${conditionSlug(condition)}_`;
  const seen = new Set<string>();
  const out: QuestionModule[] = [];
  mods.forEach((m: any, mi: number) => {
    const title = s(m?.title, 80);
    if (!title) errors.push(`module ${mi + 1} has no title`);
    if (!Array.isArray(m?.questions) || m.questions.length < 1 || m.questions.length > 15) { errors.push(`module ${mi + 1} needs 1–15 questions`); return; }
    const ids = new Set(m.questions.map((q: any) => q?.id));
    const qs: Question[] = [];
    m.questions.forEach((q: any, qi: number) => {
      const where = `module ${mi + 1} question ${qi + 1}`;
      if (!q || typeof q !== 'object') { errors.push(`${where} is not an object`); return; }
      const id = typeof q.id === 'string' ? q.id : '';
      if (!ID.test(id)) errors.push(`${where}: id "${id}" is not lower_snake_case`);
      if (seen.has(id)) errors.push(`${where}: duplicate id "${id}"`);
      seen.add(id);
      const label = s(q.label, 160);
      if (!label) errors.push(`${where}: label missing`);
      if (!TYPES.includes(q.type)) errors.push(`${where}: type "${q.type}" is not allowed`);
      let options: string[] | undefined;
      if (q.type === 'select' || q.type === 'multiselect') {
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 20 || q.options.some((o: unknown) => !s(o, 100))) errors.push(`${where}: needs 2–20 text options`);
        else options = q.options.map((o: string) => o.trim().slice(0, 100));
      } else if (q.options !== undefined && !(Array.isArray(q.options) && q.options.length === 0)) errors.push(`${where}: options only for select / multiselect`);
      if (q.redFlags !== undefined && (!Array.isArray(q.redFlags) || !options || q.redFlags.some((r: unknown) => !options!.includes(String(r))))) errors.push(`${where}: red flags must be options`);
      let showIf: Question['showIf'];
      if (q.showIf !== undefined) {
        if (!q.showIf || !ids.has(q.showIf.q) || !Array.isArray(q.showIf.in) || !q.showIf.in.length) errors.push(`${where}: showIf must name a question in the same module`);
        else showIf = { q: `${prefix}${q.showIf.q}`, in: q.showIf.in.map(String) };
      }
      qs.push({
        id: `${prefix}${id}`, label: label ?? '', type: q.type, options,
        unit: q.type === 'number' ? s(q.unit, 20) ?? undefined : undefined,
        showIf, redFlags: Array.isArray(q.redFlags) && q.redFlags.length ? q.redFlags.map(String) : undefined, hint: s(q.hint, 200) ?? undefined,
      });
    });
    out.push({ id: `${prefix}${mi === 0 ? 'history' : mi === 1 ? 'exam' : `extra${mi}`}`, title: title ?? '', questions: qs });
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: out };
}

export async function requestDraftFields(
  condition: string, ctx: { ageYears?: number | null; ageMonths?: number | null; sex?: string | null }, identifiers: string[] = [],
  chat: (a: ProxyChatArgs) => Promise<string> = proxyChat,
): Promise<{ status: 'ok'; fields: AiDraftedFields } | { status: 'error'; message: string }> {
  const prompt = deidentifyText(JSON.stringify({ condition, age_years: ctx.ageYears ?? null, age_months: ctx.ageMonths != null && ctx.ageMonths < 36 ? ctx.ageMonths : undefined, sex: ctx.sex ?? null }), identifiers);
  let raw: string;
  try {
    raw = await chat({ system: FIELDS_SYSTEM_PROMPT, prompt, maxTokens: 4000, responseFormat: { type: 'json_object' } });
  } catch (e) {
    return { status: 'error', message: aiErrorMessage(e, 'Use the general questions and free text.').message };
  }
  const v = validateFields(raw, condition);
  if (!v.ok) return { status: 'error', message: `Claude's fields were rejected (${v.errors.slice(0, 3).join('; ')}). Use the general questions and free text.` };
  return { status: 'ok', fields: { modules: v.value, status: 'draft', draftedAt: new Date().toISOString(), source: AI_FIELDS_SOURCE } };
}

// ── Device cache (per condition) ───────────────────────────────────────────

const KEY = (condition: string) => `astro.aiConditionFields.v1:${conditionSlug(condition)}`;

export const fieldsCache = {
  load(condition: string): AiDraftedFields | null {
    try { const raw = globalThis.localStorage?.getItem(KEY(condition)); return raw ? JSON.parse(raw) as AiDraftedFields : null; } catch { return null; }
  },
  save(condition: string, f: AiDraftedFields) {
    try { globalThis.localStorage?.setItem(KEY(condition), JSON.stringify(f)); } catch { /* storage full or unavailable */ }
  },
};

/** Edits the clinician may make before approving: remove a question, change its label. */
export function editFields(f: AiDraftedFields, edit: { removeId?: string; relabel?: { id: string; label: string } }): AiDraftedFields {
  return {
    ...f, status: 'draft', approvedAt: undefined, approvedBy: undefined,
    modules: f.modules.map(m => ({
      ...m,
      questions: m.questions
        .filter(q => q.id !== edit.removeId)
        .map(q => (edit.relabel && q.id === edit.relabel.id ? { ...q, label: edit.relabel.label.slice(0, 160) } : q)),
    })),
  };
}

export const approveFields = (f: AiDraftedFields, by: string, at = new Date().toISOString()): AiDraftedFields => ({ ...f, status: 'approved', approvedBy: by, approvedAt: at });
