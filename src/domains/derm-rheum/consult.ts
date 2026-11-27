/**
 * "Dermatology & Rheumatology review": a Claude consult, ONLY when the
 * clinician presses the button (owner decision: each press costs money).
 * Follows the clerking plan's Claude pattern (clerkingPlan/aiPlan.ts):
 *
 *   1. a de-identified payload: built without name, hospital number or
 *      phone, then deidentifyText with the patient's own identifiers;
 *   2. grounded: the knowledge-base entries for the candidate conditions,
 *      the deterministic screen and the hard rules go with it;
 *   3. a strict JSON schema, validated in code. Any malformed part rejects
 *      the whole reply, and the deterministic guidance stays as it is;
 *   4. checked: every hard rule the reply contradicts or omits is flagged.
 *
 * Photos (up to 3) go in the same request, through /api/ai-vision, without
 * the patient's name. Nothing in the consult is used until the clinician
 * accepts it line by line into the treatment plan.
 */
import { proxyChat, proxyVisionJsonText, AI_MAX_IMAGES, type ProxyChatArgs } from '../../services/aiProxy';
import { deidentifyText } from '../clinical/clerking/aiSuggestions';
import { aiPayload, type PatientContext } from '../clinical/clerking/engine';
import type { ClerkingData } from '../clinical/clerking/types';
import { objArray, str, strArray, norm } from '../calculators/ai/calculatorAiPlan';
import { parseJsonObject, aiErrorMessage, type Validation } from '../clinical/clerkingPlan/aiPlan';
import type { PlanLine, PlanSection } from '../clinical/clerkingPlan/types';
import { INVESTIGATION_CATALOG } from '../../services/investigationRequestService';
import { KB_BY_ID, KB_VERSION, kbReference } from './kb';
import { checkConsult, type DermHardRule, type RuleCheck } from './hardRules';
import type { DeterministicReview } from './review';

export const DERM_AI_SOURCE = { kind: 'ai' as const, label: 'Claude derm & rheum review (AI-drafted — check before use)' };

export const DERM_RHEUM_SYSTEM_PROMPT = `You are a consultant dermatologist with rheumatology expertise, advising a plastic and reconstructive surgeon in a private practice in Enugu, Nigeria. Most patients have dark skin (Fitzpatrick V–VI). Resources are limited: laboratory access is intermittent, results take days, patients pay out of pocket, and specialist dermatology and rheumatology are referral services.

You receive, as JSON, a de-identified clerking of a patient with a skin lesion or ulcer, any results, the app's deterministic screen and candidate conditions, HARD RULES, and KNOWLEDGE-BASE entries (cited) for the candidate conditions. Photos of the lesion may be attached.

Give a consultant-level opinion. Rules:
- RESPECT every hard rule and quote each verbatim, word for word, in "hard_rules_quoted". Never recommend what a hard rule forbids (for example debridement of suspected pyoderma gangrenosum).
- Ground your answer in the knowledge-base entries; use their investigations and catalogue codes where they fit. You may add conditions the knowledge base does not list.
- Skin of colour: describe erythema and purpura as they appear on dark skin (violaceous, dusky, grey-brown; felt as warmth and induration) and allow for post-inflammatory hyper- and hypopigmentation.
- Use only the information given. NEVER invent results, history or examination findings. If photos are attached, put what you see in "photo_observations" and say how sure you are; photos never replace examination or histology.
- Always consider malignancy (squamous cell carcinoma / Marjolin ulcer, basal cell carcinoma, acral lentiginous melanoma, Kaposi sarcoma) and infection (Buruli ulcer, cutaneous TB, mycetoma, deep fungal) before inflammatory causes are treated with immunosuppression.
- "investigations" use the catalogue's names; set "catalogue_code" only to a code from "investigation_catalogue", otherwise null. Biopsy entries say the site ("biopsy_site").
- Management: "immediate" (today / this week) and "definitive". Doses are adult unless the patient is a child; children by weight.
- "do_not": the specific things not to do for this patient.
- "patient_counselling": plain English for the patient, no medical jargon, no drug doses per kilogram, no "e.g.".
- "confidence": high | moderate | low, and in "would_change_confidence" the extra information (test, history, photo) that would change it.
- Be concise and specific. No preamble.

Return ONLY a JSON object with exactly these keys:
{
  "summary": string,
  "urgency": "emergency"|"urgent"|"soon"|"routine",
  "differential": [{"diagnosis": string, "kb_id": string|null, "likelihood": "high"|"moderate"|"low", "reasoning": string, "supporting": [string], "against": [string]}],
  "must_not_miss": [{"diagnosis": string, "why": string, "how_to_exclude": string}],
  "investigations": [{"test": string, "catalogue_code": string|null, "why": string, "urgency": "urgent"|"soon"|"routine", "biopsy_site": string|null}],
  "management": {"immediate": [string], "definitive": [string]},
  "do_not": [string],
  "referrals": [{"to": string, "urgency": "urgent"|"soon"|"routine", "why": string}],
  "patient_counselling": [string],
  "confidence": "high"|"moderate"|"low",
  "would_change_confidence": [string],
  "photo_observations": [string],
  "hard_rules_quoted": [string]
}`;

type Urgency3 = 'urgent' | 'soon' | 'routine';
export interface DermConsult {
  summary: string;
  urgency: 'emergency' | Urgency3;
  differential: { diagnosis: string; kbId: string | null; likelihood: 'high' | 'moderate' | 'low'; reasoning: string; supporting: string[]; against: string[] }[];
  mustNotMiss: { diagnosis: string; why: string; howToExclude: string }[];
  investigations: { test: string; catalogueCode: string | null; why: string; urgency: Urgency3; biopsySite: string | null }[];
  management: { immediate: string[]; definitive: string[] };
  doNot: string[];
  referrals: { to: string; urgency: Urgency3; why: string }[];
  patientCounselling: string[];
  confidence: 'high' | 'moderate' | 'low';
  wouldChangeConfidence: string[];
  photoObservations: string[];
  hardRulesQuoted: string[];
}

export interface ConsultInput {
  data: ClerkingData;
  ctx: PatientContext;
  review: DeterministicReview;
  /** Rules-plan hard rules (wound protocol etc.), sent with the derm hard rules. */
  planHardRules?: string[];
  /** Free-text lesion description typed on the review (scrubbed). */
  description?: string;
  /** Results already entered: label → "value unit". */
  results?: Record<string, string>;
  /** Patient's own identifiers, scrubbed from the text as a safety net. */
  identifiers?: string[];
  weightKg?: number | null;
}

/** Catalogue codes Claude may cite: every code the KB uses, plus the derm / rheum serology and biopsy groups. */
export function consultCatalogue(): { code: string; name: string }[] {
  const wanted = new Set<string>();
  for (const c of Object.values(KB_BY_ID)) for (const i of c.investigations) if (i.catalogueCode) wanted.add(i.catalogueCode);
  const out: { code: string; name: string }[] = [];
  for (const cat of INVESTIGATION_CATALOG) for (const g of cat.groups) for (const it of g.items) {
    if (wanted.has(it.code) || /^histo_|^consult_(derm|rheum|haem|neph|id)$/.test(it.code) || g.group === 'Immunology & Autoimmune Serology') out.push({ code: it.code, name: it.name });
  }
  return out;
}
const CATALOGUE_CODES = () => new Set(consultCatalogue().map(c => c.code));

export const allHardRules = (i: Pick<ConsultInput, 'review' | 'planHardRules'>) => [...new Set([...i.review.hardRules.map(r => r.text), ...(i.planHardRules ?? [])])];

/** What Claude is given: built without identifiers in the first place. */
export function buildConsultPayload(i: ConsultInput, photoCount = 0) {
  const s = i.review.screen;
  return {
    setting: 'Private plastic and reconstructive surgery practice, Enugu, Nigeria; limited resources; mostly dark skin.',
    patient: { age_years: i.ctx.ageYears ?? null, sex: i.ctx.sex || null, weight_kg: i.weightKg ?? null, skin_tone: i.review.features.darkSkin ? 'dark (Fitzpatrick V–VI) or not recorded' : 'not dark' },
    clerking: aiPayload(i.data, i.ctx),
    lesion_description: i.description?.trim() || null,
    results: i.results ?? {},
    photos_attached: photoCount,
    deterministic_screen: {
      flags: s.flags.map(f => `${f.text} (${f.kind})`),
      candidates: s.candidates.map(c => ({ kb_id: c.id, condition: c.label, rank_points: c.score, features: c.why, must_not_miss: c.mustNotMiss })),
    },
    hard_rules: allHardRules(i),
    knowledge_base: { version: KB_VERSION, entries: kbReference(i.review.kbIds) },
    investigation_catalogue: consultCatalogue(),
  };
}

export function buildConsultPrompt(i: ConsultInput, photoCount = 0): string {
  const rules = allHardRules(i);
  const header = rules.length
    ? `HARD RULES (quote each verbatim in hard_rules_quoted; never break one):\n${rules.map(r => `- ${r}`).join('\n')}\n\n`
    : 'There are no hard rules for this patient; return "hard_rules_quoted": [].\n\n';
  const json = JSON.stringify(buildConsultPayload(i, photoCount), null, 1).slice(0, 90000);
  return deidentifyText(`${header}${photoCount ? `${photoCount} photo(s) of the lesion are attached (no identifying details).\n\n` : ''}PATIENT, SCREEN AND KNOWLEDGE BASE:\n${json}`, i.identifiers ?? []);
}

// ── Validation ──────────────────────────────────────────────────────────────

const U3 = ['urgent', 'soon', 'routine'] as const;
const enumOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return (allowed as readonly string[]).includes(s) ? s as T : null;
};

/** The reply, accepted only whole: any missing key or malformed item rejects it. */
export function validateConsult(raw: unknown): Validation<DermConsult> {
  const { obj: o, error } = parseJsonObject(raw);
  if (!o) return { ok: false, errors: [error!] };
  const errors: string[] = [];
  const codes = CATALOGUE_CODES();
  const summary = str(o.summary, 2000);
  if (!summary) errors.push('summary is missing');
  const urgency = enumOf(o.urgency, ['emergency', ...U3] as const);
  if (!urgency) errors.push('urgency is not emergency / urgent / soon / routine');
  const confidence = enumOf(o.confidence, ['high', 'moderate', 'low'] as const);
  if (!confidence) errors.push('confidence is not high / moderate / low');
  const mgmt = o.management && typeof o.management === 'object' && !Array.isArray(o.management) ? o.management as Record<string, unknown> : null;
  if (!mgmt) errors.push('management is not an object');
  const optList = (v: unknown, key: string) => (v === undefined ? [] : strArray(v, key, errors));
  const value: DermConsult = {
    summary: summary ?? '',
    urgency: urgency ?? 'routine',
    differential: objArray(o.differential, 'differential', errors, x => {
      const diagnosis = str(x.diagnosis, 200), likelihood = enumOf(x.likelihood, ['high', 'moderate', 'low'] as const), reasoning = str(x.reasoning, 1200);
      if (!diagnosis || !likelihood || !reasoning) return null;
      const sup = Array.isArray(x.supporting) ? x.supporting : null, ag = Array.isArray(x.against) ? x.against : null;
      if (!sup || !ag || [...sup, ...ag].some(s => typeof s !== 'string')) return null;
      const kb = typeof x.kb_id === 'string' && KB_BY_ID[x.kb_id] ? x.kb_id : null;
      return { diagnosis, kbId: kb, likelihood, reasoning, supporting: (sup as string[]).map(s => s.trim()).filter(Boolean).slice(0, 8), against: (ag as string[]).map(s => s.trim()).filter(Boolean).slice(0, 8) };
    }, { required: true, max: 8 }),
    mustNotMiss: objArray(o.must_not_miss, 'must_not_miss', errors, x => {
      const diagnosis = str(x.diagnosis, 200), why = str(x.why, 600);
      return diagnosis && why ? { diagnosis, why, howToExclude: str(x.how_to_exclude, 600) ?? '' } : null;
    }, { max: 8 }),
    investigations: objArray(o.investigations, 'investigations', errors, x => {
      const test = str(x.test, 300);
      if (!test) return null;
      const code = typeof x.catalogue_code === 'string' && codes.has(x.catalogue_code) ? x.catalogue_code : null;
      return { test, catalogueCode: code, why: str(x.why, 500) ?? '', urgency: enumOf(x.urgency, U3) ?? 'routine', biopsySite: str(x.biopsy_site, 300) };
    }, { required: true, max: 25 }),
    management: {
      immediate: mgmt ? strArray(mgmt.immediate, 'management.immediate', errors, { required: true }) : [],
      definitive: mgmt ? strArray(mgmt.definitive, 'management.definitive', errors) : [],
    },
    doNot: strArray(o.do_not, 'do_not', errors),
    referrals: objArray(o.referrals, 'referrals', errors, x => {
      const to = str(x.to, 120);
      return to ? { to, urgency: enumOf(x.urgency, U3) ?? 'routine', why: str(x.why, 400) ?? '' } : null;
    }),
    patientCounselling: strArray(o.patient_counselling, 'patient_counselling', errors, { required: true }),
    confidence: confidence ?? 'low',
    wouldChangeConfidence: strArray(o.would_change_confidence, 'would_change_confidence', errors),
    photoObservations: optList(o.photo_observations, 'photo_observations'),
    hardRulesQuoted: strArray(o.hard_rules_quoted, 'hard_rules_quoted', errors, { max: 40 }),
  };
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Hard rules the reply did not restate verbatim. */
export const unquoted = (quoted: string[], rules: string[]) => rules.filter(r => !quoted.map(norm).some(q => q.includes(norm(r))));

// ── Lines for the treatment plan ────────────────────────────────────────────

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);

/** The consult as plan lines (source: Claude), accepted line by line. */
export function consultToLines(c: DermConsult): PlanLine[] {
  const out: PlanLine[] = [];
  const add = (section: PlanSection, key: string, l: Omit<PlanLine, 'id' | 'section' | 'source'>) => {
    const id = `dr:${section}:${slug(key)}`;
    if (!out.some(x => x.id === id)) out.push({ id, section, source: DERM_AI_SOURCE, ...l });
  };
  const top = c.urgency === 'emergency' || c.urgency === 'urgent' ? 'urgent' : c.urgency;
  c.differential.slice(0, 3).forEach((d, i) => add('problems', `ddx_${d.diagnosis}`, { text: `${i === 0 ? 'Working diagnosis' : 'Differential'}: ${d.diagnosis} (${d.likelihood} likelihood)`, why: d.reasoning }));
  c.mustNotMiss.forEach(m => add('problems', `mnm_${m.diagnosis}`, { text: `Must not miss: ${m.diagnosis}${m.howToExclude ? ` — exclude by ${m.howToExclude}` : ''}`, why: m.why }));
  c.investigations.forEach(i => add('investigations', i.test, { text: i.biopsySite ? `${i.test} (site: ${i.biopsySite})` : i.test, why: i.why, urgency: i.urgency, test: { id: i.catalogueCode ?? `dr_${slug(i.test)}` } }));
  c.management.immediate.forEach(m => add('procedures', `now_${m}`, { text: `Immediate: ${m}`, urgency: top === 'routine' ? undefined : top }));
  c.management.definitive.forEach(m => add('procedures', `def_${m}`, { text: `Definitive: ${m}` }));
  c.doNot.forEach(d => add('procedures', `dont_${d}`, { text: `DO NOT: ${d}` }));
  c.referrals.forEach(r => add('referrals', r.to, { text: `${r.to}${r.why ? ` — ${r.why}` : ''}`, urgency: r.urgency }));
  c.patientCounselling.forEach(p => add('counselling', p, { text: p, patient: p }));
  return out;
}

// ── Request ─────────────────────────────────────────────────────────────────

export type ConsultResult =
  | { status: 'ok'; value: DermConsult; lines: PlanLine[]; checks: RuleCheck[]; missingHardRules: string[]; photosSent: number }
  | { status: 'error'; message: string; notConfigured?: boolean };

export interface ConsultTransport {
  chat: (a: ProxyChatArgs) => Promise<string>;
  vision: (images: string[], system: string, text: string, maxTokens?: number) => Promise<string>;
}
const DEFAULT_TRANSPORT: ConsultTransport = { chat: proxyChat, vision: proxyVisionJsonText };

const KEPT = 'The knowledge-base guidance and the rules plan are unchanged.';

/** One press = one request. Called only from the review's button handler. */
export async function requestDermRheumConsult(i: ConsultInput, photos: string[] = [], t: ConsultTransport = DEFAULT_TRANSPORT): Promise<ConsultResult> {
  const imgs = photos.slice(0, AI_MAX_IMAGES);
  const prompt = buildConsultPrompt(i, imgs.length);
  let raw: string;
  try {
    raw = imgs.length
      ? await t.vision(imgs, DERM_RHEUM_SYSTEM_PROMPT, prompt, 12000)
      : await t.chat({ system: DERM_RHEUM_SYSTEM_PROMPT, prompt, maxTokens: 12000, responseFormat: { type: 'json_object' } });
  } catch (e) {
    return { status: 'error', ...aiErrorMessage(e, KEPT) };
  }
  if (!raw) return { status: 'error', message: `Claude returned an empty reply. ${KEPT}` };
  const v = validateConsult(raw);
  if (!v.ok) return { status: 'error', message: `Claude's reply was not a usable consult (${v.errors.slice(0, 3).join('; ')}). ${KEPT}` };
  return {
    status: 'ok', value: v.value, lines: consultToLines(v.value), photosSent: imgs.length,
    checks: checkConsult(v.value, i.review.hardRules),
    missingHardRules: unquoted(v.value.hardRulesQuoted, allHardRules(i)),
  };
}

export type { DermHardRule, RuleCheck };
