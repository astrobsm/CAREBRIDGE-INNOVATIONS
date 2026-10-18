/**
 * What the record actually says about a patient — the facts the medical
 * scribe summary is built from.
 *
 * The old scribe ran loose, case-insensitive patterns over every piece of free
 * text: /SS|SC/ matched the "ss" in "assessment" and "pressure", so a pressure
 * ulcer patient was flagged for sickle cell; /DM/ matched "admitted", so she
 * was flagged diabetic; "no diabetes" counted as diabetes. And it never read
 * the structured clerking at all — the presenting complaint, the problem list,
 * the comorbidities answered Yes/No, the risk factors, the plan.
 *
 * Here:
 *   • the structured clerking comes first and is authoritative — a
 *     comorbidity answered "No" is absent, whatever the free text says;
 *   • free text is matched on whole words, acronyms case-sensitively, and a
 *     mention preceded by a negation ("no", "denies", "not known", "negative
 *     for", "-ve") is a documented negative, not a finding;
 *   • every fact carries the evidence it came from.
 */
import type { Admission, ClinicalEncounter, Patient, WardRoundPatient } from '../../../types';
import type { ClerkingData } from '../clerking/types';
import type { ClinicalPlanItem, ClinicalProblem } from '../clerking/records';

export type Presence = 'present' | 'absent';

export interface Fact {
  id: string;
  label: string;
  presence: Presence;
  detail?: string;
  evidence: string;      // where it was recorded
}

export interface Problem { label: string; code?: string; status?: string; since?: string; source: string }
export interface PlanItem { text: string; kind?: string; priority?: string; status: string; source: string }

export interface ClinicalFacts {
  complaints: { label: string; duration?: string }[];
  problems: Problem[];
  conditions: Map<string, Fact>;
  riskFactors: string[];
  redFlags: string[];
  allergies: { status: 'documented' | 'nkda' | 'not_documented'; items: string[] };
  medications: string[];
  plan: PlanItem[];
  mobility?: string;
  bmi?: number | null;
  age: number | null;
  sex: string;
  impression?: string;
  gaps: string[];
}

// ── Text matching ──────────────────────────────────────────────────────────

/** Conditions recognised in free text. Acronyms are case-sensitive and whole-word. */
export const CONDITION_TERMS: Record<string, { label: string; patterns: RegExp[] }> = {
  diabetes: { label: 'Diabetes mellitus', patterns: [/\bdiabet(es|ic)\b/i, /\b(T1DM|T2DM|IDDM|NIDDM|DM)\b/] },
  hypertension: { label: 'Hypertension', patterns: [/\bhypertensi(on|ve)\b/i, /\bHTN\b/] },
  sickle_cell: { label: 'Sickle cell disease', patterns: [/\bsickle[- ]?cell\b/i, /\bHb ?S[SC]\b/, /\bgenotype\s*[:=-]?\s*(SS|SC)\b/i, /\bSCD\b/] },
  hiv: { label: 'HIV infection', patterns: [/\bHIV\b/, /\bRVD\b/, /\bretroviral (disease|infection)\b/i] },
  tb: { label: 'Tuberculosis', patterns: [/\btubercul(osis|ous)\b/i, /\bPTB\b/, /\bTB\b/] },
  liver_disease: { label: 'Liver disease / viral hepatitis', patterns: [/\bhepatitis\b/i, /\bcirrhosis\b/i, /\b(HBV|HCV|HBsAg)\b/] },
  heart_disease: { label: 'Heart disease / heart failure', patterns: [/\bheart failure\b/i, /\b(CCF|CHF|IHD|CAD)\b/, /\bcardiomyopathy\b/i] },
  stroke: { label: 'Previous stroke', patterns: [/\bstroke\b/i, /\bCVA\b/, /\bhemi(plegi|pares)/i] },
  ckd: { label: 'Chronic kidney disease', patterns: [/\bchronic kidney disease\b/i, /\bCKD\b/, /\brenal failure\b/i, /\bESRD\b/] },
  asthma_copd: { label: 'Asthma / COPD', patterns: [/\basthma\b/i, /\bCOPD\b/] },
  epilepsy: { label: 'Epilepsy', patterns: [/\bepilep(sy|tic)\b/i, /\bseizure disorder\b/i] },
  cancer: { label: 'Malignancy', patterns: [/\bcarcinoma\b/i, /\bmalignan(t|cy)\b/i, /\bcancer\b/i, /\bmetasta/i, /\bmarjolin\b/i, /\bmelanoma\b/i, /\bsarcoma\b/i, /\blymphoma\b/i] },
  thromboembolism: { label: 'Previous DVT / PE', patterns: [/\bDVT\b/, /\bdeep vein thrombosis\b/i, /\bpulmonary embol/i, /\bPE\b/] },
  thyroid: { label: 'Thyroid disease', patterns: [/\b(hypo|hyper)thyroid/i, /\bthyroid disease\b/i, /\bgoitre\b/i] },
  peripheral_arterial: { label: 'Peripheral arterial disease', patterns: [/\bperipheral arter(ial|y) disease\b/i, /\bPAD\b/, /\bPVD\b/, /\bclaudication\b/i] },
  immunosuppression: { label: 'Immunosuppression / steroids', patterns: [/\bimmunosuppress/i, /\blong[- ]term steroids?\b/i] },
  obesity: { label: 'Obesity', patterns: [/\bobes(e|ity)\b/i, /\bBMI\s*(≥|>=|>)\s*3\d\b/i] },
  pregnancy: { label: 'Pregnancy', patterns: [/\bpregnan(t|cy)\b/i, /\bgravid\b/i, /\bantenatal\b/i] },
  pressure_injury: { label: 'Pressure injury', patterns: [/\bpressure (ulcer|sore|injur(y|ies))\b/i, /\bdecubitus\b/i, /\bbed ?sores?\b/i, /\bL89\b/] },
  sepsis: { label: 'Sepsis', patterns: [/\bsepsis\b/i, /\bseptic(aemia|emia| shock)?\b/i, /\bbacter(a)?emia\b/i] },
  wound_infection: { label: 'Wound infection', patterns: [/\b(infected|purulent|sloughy and offensive)\b/i, /\bcellulitis\b/i, /\babscess\b/i, /\bwound infection\b/i, /\bpus\b/i] },
  osteomyelitis: { label: 'Osteomyelitis', patterns: [/\bosteomyelitis\b/i] },
  burns: { label: 'Burn injury', patterns: [/\bburns?\b(?! out)/i, /\bscald\b/i, /\bTBSA\b/] },
  malnutrition: { label: 'Malnutrition', patterns: [/\bmalnutrition\b/i, /\bmalnourished\b/i, /\bcachexi/i, /\bwasting\b/i, /\bhypoalbumin/i] },
  anaemia: { label: 'Anaemia', patterns: [/\ban(a)?emi(a|c)\b/i] },
};

const NEGATION = /\b(no|not|nil|denies|denied|without|negative for|free of|absence of|no history of|no known|never had|rules? out|ruled out|r\/o)\b[^.;\n]{0,40}$/i;

/** 'present', 'absent' (explicitly negated), or null (not mentioned). */
export function mentionIn(text: string, patterns: RegExp[]): Presence | null {
  if (!text) return null;
  let sawNegated = false;
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const before = text.slice(Math.max(0, m.index - 60), m.index);
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 6);
      // "HIV -ve", "HbSS negative"
      if (NEGATION.test(before) || /^\s*(-ve|negative|neg\b)/i.test(after)) { sawNegated = true; continue; }
      return 'present';
    }
  }
  return sawNegated ? 'absent' : null;
}

// ── Building the facts ─────────────────────────────────────────────────────

const yes = (v: unknown) => String(v ?? '').toLowerCase() === 'yes';
const no = (v: unknown) => String(v ?? '').toLowerCase() === 'no';

export function ageOf(dob: unknown, now = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob as string | Date);
  if (Number.isNaN(d.getTime())) return null;
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

/**
 * What the facts are read from — this app's own records.
 *
 * The original read its server's rows (registration medical history, the
 * admission's reasons, ward-round findings, SOAP progress notes, treatment
 * plan diagnoses). Here the same roles are played by the patient's chronic
 * conditions and comorbidities, the admission's diagnosis and indication,
 * the patient's ward-round entries, and the ordinary (non-clerked) clinical
 * encounters with their recorded diagnoses.
 */
export interface FactsInput {
  patient: Partial<Patient> | null | undefined;
  admissions?: Admission[];
  /** This patient's entries on ward rounds. */
  wardRoundEntries?: Array<Partial<Pick<WardRoundPatient, 'diagnosis' | 'notes' | 'orders'>>>;
  /** Every clinical encounter, clerked or not. */
  encounters?: ClinicalEncounter[];
  clinical?: { problems?: ClinicalProblem[]; planItems?: ClinicalPlanItem[] } | null;
  medicationNames?: string[];
  now?: Date;
}

/** The latest usable clerking of a kind (not entered in error). */
export function latestClerking(encs: ClinicalEncounter[], kind: 'initial' | 'follow_up') {
  return [...encs]
    .filter(e => e.clerking && e.clerking.kind === kind && e.clerking.status !== 'entered_in_error')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0];
}

const durationText = (d: { value?: number | null; unit?: string } | undefined) =>
  (d && d.value != null ? `${d.value} ${d.unit || ''}`.trim() : undefined);

/** Labels of the clerking comorbidities, keyed as the history form keys them. */
const PMH_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CONDITION_TERMS).map(([k, v]) => [k, v.label]));

export function buildClinicalFacts(input: FactsInput): ClinicalFacts {
  const p = input.patient || {};
  const clinical = input.clinical || {};
  const encs = input.encounters || [];
  const initial = latestClerking(encs, 'initial');
  const data: Partial<ClerkingData> = (initial?.clerking?.data as ClerkingData) || {};
  const summary: Record<string, any> = initial?.clerking?.summary || {};
  const history: Record<string, any> = data.history || {};
  const gaps: string[] = [];

  // Presenting complaints
  const complaints = (data.complaints || []).map(c => ({ label: c.label, duration: durationText(c.duration) }));

  // Problems: the tracked problem list first (it carries status), then the
  // diagnoses written elsewhere.
  const problems: Problem[] = [];
  const seen = new Set<string>();
  const addProblem = (pr: Problem) => {
    const k = pr.label.replace(/\s*\([A-Z]\d{2}(\.\d+)?\)\s*$/, '').trim().toLowerCase();
    if (!k || seen.has(k)) return;
    seen.add(k);
    problems.push(pr);
  };
  for (const tp of clinical.problems || []) {
    // Resolved, ruled out and withdrawn diagnoses are not current problems.
    if (['resolved', 'ruled_out', 'withdrawn'].includes(String(tp.status))) continue;
    const m = /^(.*?)\s*\(([A-Z]\d{2}(?:\.\d+)?)\)\s*$/.exec(tp.label || '');
    addProblem({ label: m ? m[1] : tp.label, code: m ? m[2] : undefined, status: tp.lastReview?.status || tp.status, since: tp.createdAt, source: 'Problem list' });
  }
  for (const d of summary.accepted?.differential || []) addProblem({ label: String(d), source: 'Clerking (accepted diagnosis)' });
  if (data.impression) addProblem({ label: String(data.impression), source: 'Clerking impression' });
  for (const a of input.admissions || []) {
    for (const f of [a.admissionDiagnosis, ...(a.provisionalDiagnosis || [])]) if (f) addProblem({ label: String(f), source: 'Admission' });
  }
  const plainEncounters = encs.filter(e => !e.clerking && e.status !== 'cancelled');
  for (const e of plainEncounters) {
    for (const dx of e.diagnosis || []) {
      if (dx.status === 'ruled_out' || !dx.description) continue;
      addProblem({ label: dx.description, code: dx.code || dx.icdCode, source: 'Encounter diagnosis' });
    }
  }

  // Conditions — clerking answers first (authoritative, positive and negative).
  const conditions = new Map<string, Fact>();
  const pmh = history.pmh || {};
  for (const [id, v] of Object.entries<any>(pmh)) {
    const label = PMH_LABELS[id] || id.replace(/_/g, ' ');
    if (yes(v?.status)) {
      const detail = [v.type, v.control && `${String(v.control).toLowerCase()} control`, v.genotype, v.treatment].filter(Boolean).join(', ');
      conditions.set(id, { id, label, presence: 'present', detail: detail || undefined, evidence: 'Clerking — past medical history' });
    } else if (no(v?.status)) {
      conditions.set(id, { id, label, presence: 'absent', evidence: 'Clerking — past medical history' });
    }
  }

  // Free text — only fills what the clerking did not answer.
  const text: { t: string; src: string }[] = [];
  const push = (t: unknown, src: string) => { if (t && typeof t === 'string' && t.trim()) text.push({ t, src }); };
  problems.forEach(pr => push(`${pr.label}${pr.code ? ` (${pr.code})` : ''}`, pr.source));
  complaints.forEach(c => push(c.label, 'Presenting complaint'));
  push((p.chronicConditions || []).join('; '), 'Registration — chronic conditions');
  (p.comorbidities || []).forEach(c => push([c.condition, c.notes].filter(Boolean).join(' — '), 'Registration — comorbidities'));
  if (p.genotype && /^(SS|SC)$/i.test(String(p.genotype).trim())) push(`genotype ${p.genotype}`, 'Registration — genotype');
  for (const a of input.admissions || []) {
    push(a.chiefComplaint, 'Admission'); push(a.indicationForAdmission, 'Admission'); push((a.comorbidities || []).join('; '), 'Admission');
  }
  for (const r of input.wardRoundEntries || []) { push(r.diagnosis, 'Ward round'); push(r.notes, 'Ward round'); }
  for (const e of plainEncounters) {
    for (const t of [e.chiefComplaint, e.historyOfPresentIllness, e.pastMedicalHistory, e.notes]) push(t, 'Encounter note');
  }
  if (initial?.clerking?.narrative) push(initial.clerking.narrative, 'Clerking note');

  for (const [id, def] of Object.entries(CONDITION_TERMS)) {
    if (conditions.has(id)) continue;
    let negatedAt: string | null = null;
    for (const { t, src } of text) {
      const r = mentionIn(t, def.patterns);
      if (r === 'present') { conditions.set(id, { id, label: def.label, presence: 'present', evidence: src }); negatedAt = null; break; }
      if (r === 'absent' && !negatedAt) negatedAt = src;
    }
    if (!conditions.has(id) && negatedAt) conditions.set(id, { id, label: def.label, presence: 'absent', evidence: negatedAt });
  }

  // Risk factors and red flags as the clerking derived them.
  const riskFactors: string[] = Array.isArray(summary.risk_factors) ? summary.risk_factors : [];
  const redFlags: string[] = Array.isArray(summary.red_flags) ? summary.red_flags : [];
  const mobility: string | undefined = history.social?.mobility || undefined;
  if (mobility && /bed|wheelchair/i.test(mobility)) {
    conditions.set('immobility', { id: 'immobility', label: mobility, presence: 'present', evidence: 'Clerking — social history' });
  } else if (riskFactors.some(r => /bed-bound|wheelchair/i.test(r))) {
    conditions.set('immobility', { id: 'immobility', label: 'Bed-bound', presence: 'present', evidence: 'Clerking — risk factors' });
  }
  if (!conditions.get('obesity') && riskFactors.some(r => /BMI|obes/i.test(r))) {
    conditions.set('obesity', { id: 'obesity', label: 'Obesity', presence: 'present', evidence: 'Clerking — risk factors' });
  }
  const w = Number(data.vitals?.weight), h = Number(data.vitals?.height);
  const bmi = w > 0 && h > 0 ? w / ((h / 100) ** 2) : null;

  // Allergies — "NKDA" only when somebody actually recorded it.
  let allergies: ClinicalFacts['allergies'];
  const clerkAllergies = (data.allergies || []).map(a => `${a.substance}${a.reaction ? ` (${a.reaction})` : ''}`).filter(Boolean);
  const regAllergies = (Array.isArray(p.allergies) ? p.allergies : []).map(s => String(s).trim()).filter(Boolean);
  const nkda = (a: string) => /^(nkda|none|nil|no known.*)$/i.test(a);
  if (data.allergyStatus === 'has_allergies' && clerkAllergies.length) allergies = { status: 'documented', items: clerkAllergies };
  else if (data.allergyStatus === 'nkda') allergies = { status: 'nkda', items: [] };
  else if (regAllergies.length && !regAllergies.every(nkda)) allergies = { status: 'documented', items: regAllergies };
  else if (regAllergies.some(nkda)) allergies = { status: 'nkda', items: [] };
  else { allergies = { status: 'not_documented', items: [] }; gaps.push('Allergy status not documented'); }

  // Medications
  const medications = [...new Set([
    ...(input.medicationNames || []),
    ...(data.medications || []).map(m => [m.name, m.dose, m.route, m.frequency].filter(Boolean).join(' ')),
  ].filter(Boolean))];

  // Plan — tracked items, outstanding first.
  const plan: PlanItem[] = (clinical.planItems || [])
    .filter(i => !['stopped', 'withdrawn'].includes(String(i.status)))
    .map(i => ({ text: i.text, kind: i.kind, priority: i.priority, status: i.lastReview?.status || i.status, source: 'Clerking plan' }))
    .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0)
      || (a.priority === 'urgent' ? 0 : 1) - (b.priority === 'urgent' ? 0 : 1));

  if (!complaints.length && !problems.length) gaps.push('No diagnosis or presenting complaint recorded — complete the initial clerking');
  if (!initial) gaps.push('No structured initial clerking on record');

  return {
    complaints, problems, conditions, riskFactors, redFlags, allergies, medications, plan,
    mobility, bmi, age: ageOf(p.dateOfBirth, input.now),
    sex: String(p.gender || '').toLowerCase(),
    impression: data.impression, gaps,
  };
}

export const has = (f: ClinicalFacts, id: string) => f.conditions.get(id)?.presence === 'present';
