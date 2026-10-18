/**
 * AI-assisted clerking suggestions.
 *
 * Routed through the existing server proxy (services/aiProxy → /api/ai-chat),
 * which holds the keys; there is no clerking-specific endpoint. What the
 * original server endpoint did is kept, but on this side of the proxy:
 *
 *   - the payload is the compact, structured clerking from engine.aiPayload —
 *     no name, no hospital number by construction;
 *   - it is passed through deidentifyText as a safety net anyway, with the
 *     patient's own identifiers, before it leaves the device;
 *   - the model's reply is normalised into PENDING suggestions. Nothing the
 *     model says is accepted, ordered or tracked until a clinician decides.
 */
import { proxyChat } from '../../../services/aiProxy';
import type { Suggestion } from './types';

export const AI_MODEL = 'gpt-4o';

export const AI_SYSTEM_PROMPT = `You are a senior consultant plastic and reconstructive surgeon and wound-care specialist supporting a resident doctor's clerking at a Nigerian teaching hospital.
You receive a de-identified, structured clerking as JSON. Missing fields mean "not documented" — never assume they are normal.
Return ONLY a JSON object:
{
  "differentials": [{"diagnosis": string, "icd10": string|null, "reasons": [string], "against": [string], "dangerous": boolean}],
  "investigations": [{"test": string, "reason": string, "urgent": boolean}],
  "treatment": [{"action": string, "reason": string, "urgent": boolean}],
  "missing_information": [string]
}
Rules:
- Up to 6 differentials, most likely first. Every reason must cite a documented finding from the input; do not invent findings.
- Always include relevant can't-miss diagnoses (malignancy in chronic wounds, necrotising infection, compartment syndrome, sepsis, airway burn) marked dangerous when the presentation allows them.
- Investigations and treatment must follow international guidance (e.g. WHO, NICE, IWGDF, ATLS, ISBI) and be practical in a resource-limited setting.
- Do not give patient-specific drug doses; say "per local guideline" where a drug is needed. Respect the listed allergies.
- "missing_information": the most important history or examination items still needed to narrow the diagnosis.
- These are suggestions for a clinician who will accept, edit or reject each one.`;

/** The model's JSON, made safe: capped, trimmed, labelled, and never pre-accepted. */
export function normaliseAiSuggestions(raw: any): { suggestions: Suggestion[]; missing: string[] } {
  const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
  const s = (v: unknown, n = 300) => String(v ?? '').trim().slice(0, n);
  const slug = (t: unknown) => s(t, 80).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const out: Suggestion[] = [];
  for (const d of arr(raw?.differentials).slice(0, 8)) {
    if (!s(d?.diagnosis)) continue;
    out.push({
      id: `ai:dx:${slug(d.diagnosis)}`, kind: 'differential', text: s(d.diagnosis) + (d.icd10 ? ` (${s(d.icd10, 12)})` : ''),
      reasons: arr(d.reasons).map(x => s(x)).filter(Boolean).slice(0, 6), against: arr(d.against).map(x => s(x)).filter(Boolean).slice(0, 4),
      source: 'ai', dangerous: !!d.dangerous, priority: d.dangerous ? 'urgent' : 'routine', decision: 'pending',
    });
  }
  for (const i of arr(raw?.investigations).slice(0, 12)) {
    if (!s(i?.test)) continue;
    out.push({ id: `ai:inv:${slug(i.test)}`, kind: 'investigation', text: s(i.test), reasons: i.reason ? [s(i.reason)] : [], source: 'ai', priority: i.urgent ? 'urgent' : 'routine', decision: 'pending' });
  }
  for (const t of arr(raw?.treatment).slice(0, 12)) {
    if (!s(t?.action)) continue;
    out.push({ id: `ai:tx:${slug(t.action)}`, kind: 'treatment', text: s(t.action), reasons: t.reason ? [s(t.reason)] : [], source: 'ai', priority: t.urgent ? 'urgent' : 'routine', decision: 'pending' });
  }
  return { suggestions: out, missing: arr(raw?.missing_information).map(x => s(x, 200)).filter(Boolean).slice(0, 10) };
}

// ── De-identification ──────────────────────────────────────────────────────

/**
 * Anything shaped like a hospital number, an email address or a Nigerian
 * phone number. Clinical content, ages, dates of events and measurements are
 * left intact. A safety net, not a guarantee — the payload is built without
 * identifiers in the first place.
 */
const PATTERNS: Array<[RegExp, string]> = [
  [/\bUNTH\/\d{2,4}\/[A-Z0-9]+\b/gi, '[HOSPITAL-NO]'],
  [/\b(?:PS|AUTO-[A-Z]{3,6}-|CONSULT-)[A-Z0-9-]{4,}\b/g, '[HOSPITAL-NO]'],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]'],
  [/(?:\+?234[\s-]?|\b0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]'],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replace the patient's own identifiers, then anything identifier-shaped. */
export function deidentifyText(text: string, identifiers: Array<string | null | undefined> = []): string {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const raw of identifiers) {
    const id = String(raw || '').trim();
    if (id.length < 2) continue;
    // Whole-word for names; hospital numbers contain slashes so match literally.
    const re = /^[A-Za-z' -]+$/.test(id) ? new RegExp(`\\b${escapeRe(id)}\\b`, 'gi') : new RegExp(escapeRe(id), 'gi');
    out = out.replace(re, id.includes('/') || /\d/.test(id) ? '[HOSPITAL-NO]' : '[PATIENT]');
  }
  for (const [re, token] of PATTERNS) out = out.replace(re, token);
  return out;
}

/**
 * Ask the model. Throws with a readable message on failure; the forms then
 * keep showing the rule-based suggestions, which never depend on the network.
 */
export async function requestAiSuggestions(
  payload: unknown,
  identifiers: Array<string | null | undefined>,
): Promise<{ suggestions: Suggestion[]; missing: string[] }> {
  const text = deidentifyText(JSON.stringify(payload).slice(0, 40000), identifiers);
  let raw: string;
  try {
    raw = await proxyChat({
      system: AI_SYSTEM_PROMPT, prompt: text, model: AI_MODEL, temperature: 0.2, maxTokens: 2500,
      responseFormat: { type: 'json_object' },
    });
  } catch {
    throw new Error('The AI service did not respond. Rule-based suggestions are still available.');
  }
  let parsed: unknown = null;
  try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { parsed = null; }
  return normaliseAiSuggestions(parsed);
}
