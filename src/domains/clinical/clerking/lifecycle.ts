/**
 * The rules of a structured clerking's life: who may edit, submit, sign and
 * withdraw it, how its accepted suggestions become the tracked problem list
 * and plan, and how its answers become the encounter's ordinary prose.
 *
 * These were server rules in the original application (api/_lib/
 * clinicalEncounters.js). This app is offline-first, so they run in the
 * client service before anything is written — pure functions here, so they
 * can be tested without a database — and the Supabase migration backs the
 * status vocabulary with CHECK constraints.
 */
import type { ClinicalEncounter, Diagnosis, PhysicalExamination, UserRole } from '../../../types';
import type { ClerkingData, Suggestion } from './types';
import type { FollowUpData } from './engine';
import { EXAM_SECTIONS } from './examination';
import {
  PLAN_STATUSES, PROBLEM_STATUSES,
  type ClinicalPlanItem, type ClinicalProblem, type ClerkingStatus, type StructuredClerking,
} from './records';

// ── Roles ──────────────────────────────────────────────────────────────────

/**
 * Who may sign a clerking. The original default (Clinical Governance D6) was
 * registrar, junior registrar, senior registrar and consultant, plus admins;
 * a house officer submits for review. `resident` is this app's junior
 * registrar.
 */
export const SIGN_ROLES: readonly UserRole[] = ['registrar', 'resident', 'senior_registrar', 'consultant', 'super_admin', 'hospital_admin'];
/** Who may mark a signed encounter entered in error (D6 amend roles). */
export const AMEND_ROLES: readonly UserRole[] = ['senior_registrar', 'consultant', 'super_admin', 'hospital_admin'];

export interface Actor { id: string; role?: UserRole | string; name?: string }

export const canSign = (u?: Actor | null) => !!u?.role && SIGN_ROLES.includes(u.role as UserRole);
export const canAmend = (u?: Actor | null) => !!u?.role && AMEND_ROLES.includes(u.role as UserRole);

/** A rule refused. `code` mirrors the HTTP status the original endpoint returned. */
export class ClerkingError extends Error {
  constructor(message: string, public code: 400 | 403 | 404 | 409) {
    super(message);
    this.name = 'ClerkingError';
  }
}

/** A user-facing message from a refused rule or a failed write. */
export const messageOf = (e: unknown, fallback: string) => (e instanceof Error ? e.message : '') || fallback;

// ── Payload ────────────────────────────────────────────────────────────────

const MAX_DATA_BYTES = 512 * 1024;

/** Cap what is stored, as the original endpoint did. */
export function cleanPayload(p: { data: unknown; suggestions: unknown; summary: unknown; narrative: unknown }) {
  const data = p.data && typeof p.data === 'object' ? p.data : {};
  const suggestions = Array.isArray(p.suggestions) ? (p.suggestions as Suggestion[]).slice(0, 200) : [];
  const summary = p.summary && typeof p.summary === 'object' ? (p.summary as Record<string, any>) : {};
  const narrative = typeof p.narrative === 'string' ? p.narrative.slice(0, 100000) : '';
  if (JSON.stringify({ data, suggestions, summary }).length > MAX_DATA_BYTES) {
    throw new ClerkingError('Encounter is too large to save', 400);
  }
  return { data, suggestions, summary, narrative };
}

// ── Lifecycle checks ───────────────────────────────────────────────────────

type WithClerking = Pick<ClinicalEncounter, 'id' | 'patientId'> & { clerking?: StructuredClerking };

export function assertCanEdit(enc: WithClerking | undefined, version: number | undefined, user: Actor): StructuredClerking {
  const c = enc?.clerking;
  if (!enc || !c) throw new ClerkingError('Encounter not found', 404);
  if (!['draft', 'pending_review'].includes(c.status)) throw new ClerkingError('This encounter is signed. Add a follow-up encounter instead.', 409);
  if (String(c.createdBy) !== String(user.id) && !canSign(user)) throw new ClerkingError('Only the author or a registrar / consultant can edit this encounter', 403);
  if (version != null && Number(version) !== c.version) throw new ClerkingError('Someone else saved this encounter after you opened it. Reload to see their changes.', 409);
  return c;
}

/** Submit for review, or sign. Returns the status the encounter moves to. */
export function assertCanSubmit(enc: WithClerking | undefined, version: number | undefined, user: Actor, sign: boolean): ClerkingStatus {
  const c = enc?.clerking;
  if (!enc || !c) throw new ClerkingError('Encounter not found', 404);
  if (c.status === 'signed') throw new ClerkingError('Already signed', 409);
  if (c.status === 'entered_in_error') throw new ClerkingError('This encounter was marked entered in error', 409);
  if (version != null && Number(version) !== c.version) throw new ClerkingError('The encounter changed since you opened it. Reload first.', 409);
  const signer = canSign(user);
  if (sign && !signer) throw new ClerkingError('Your role cannot sign clinical encounters. Submit it for review instead.', 403);
  if (String(c.createdBy) !== String(user.id) && !signer) throw new ClerkingError('Only the author or a registrar / consultant can submit this encounter', 403);
  return signer ? 'signed' : 'pending_review';
}

export function assertCanMarkError(enc: WithClerking | undefined, user: Actor, reason: string | undefined) {
  const c = enc?.clerking;
  if (!enc || !c) throw new ClerkingError('Encounter not found', 404);
  const isAuthorDraft = String(c.createdBy) === String(user.id) && c.status !== 'signed';
  if (!isAuthorDraft && !canAmend(user)) {
    throw new ClerkingError('Only the author (before signing) or a senior registrar / consultant can mark this entered in error', 403);
  }
  if (!reason || String(reason).trim().length < 3) throw new ClerkingError('A reason is required', 400);
}

export function assertTrackedStatus(kind: 'problem' | 'plan', status: string) {
  const allowed: readonly string[] = kind === 'problem' ? PROBLEM_STATUSES : PLAN_STATUSES;
  if (!allowed.includes(status) || status === 'withdrawn') {
    throw new ClerkingError(`status must be one of ${allowed.filter(s => s !== 'withdrawn').join(', ')}`, 400);
  }
}

/** The encounter row's own status, for readers that know nothing of clerking. */
export function encounterStatusFor(s: ClerkingStatus): ClinicalEncounter['status'] {
  return s === 'signed' ? 'completed' : s === 'entered_in_error' ? 'cancelled' : 'in-progress';
}

// ── Tracking ───────────────────────────────────────────────────────────────

// Follow-up review vocabulary → tracked status.
const PROBLEM_REVIEW_MAP: Record<string, ClinicalProblem['status']> = { improved: 'improving', unchanged: 'active', worse: 'worsening', resolved: 'resolved', ruled_out: 'ruled_out' };
const PLAN_REVIEW_MAP: Record<string, ClinicalPlanItem['status']> = { done: 'done', in_progress: 'in_progress', not_done: 'not_done', stopped: 'stopped' };

/**
 * A tracked row's id is derived from (encounter, suggestion). The original
 * kept that pair UNIQUE in Postgres; here it is the primary key itself, so
 * two devices reconciling the same encounter offline upsert one row rather
 * than creating two.
 */
export const trackedId = (encounterId: string, suggestionId: string) => `${encounterId}|${suggestionId}`;

/**
 * Bring the problem list and plan items in line with a submitted encounter's
 * accepted suggestions, and apply a follow-up's reviews of earlier ones.
 *
 * `existing` is every tracked row the patient has. Returns only the rows that
 * changed (new or updated), ready to be written.
 */
export function reconcileTracking(
  enc: { id: string; patientId: string; hospitalId?: string; clerking: StructuredClerking },
  existing: { problems: ClinicalProblem[]; planItems: ClinicalPlanItem[] },
  now: string,
): { problems: ClinicalProblem[]; planItems: ClinicalPlanItem[] } {
  const problems = new Map(existing.problems.map(p => [p.id, p]));
  const planItems = new Map(existing.planItems.map(p => [p.id, p]));
  const changedP = new Set<string>(), changedI = new Set<string>();
  const setP = (p: ClinicalProblem) => { problems.set(p.id, p); changedP.add(p.id); };
  const setI = (p: ClinicalPlanItem) => { planItems.set(p.id, p); changedI.add(p.id); };

  const accepted = (enc.clerking.suggestions || []).filter(s => s && s.decision === 'accepted');
  const keep = new Set(accepted.map(s => String(s.id)));
  for (const s of accepted) {
    const text = String(s.edited || s.text || '').slice(0, 500);
    if (!text) continue;
    if (s.kind === 'differential') {
      const prev = problems.get(trackedId(enc.id, String(s.id)));
      setP(prev
        ? { ...prev, label: text, reasons: s.reasons || [], status: prev.status === 'withdrawn' ? 'active' : prev.status, updatedAt: now }
        : { id: trackedId(enc.id, String(s.id)), patientId: enc.patientId, hospitalId: enc.hospitalId, encounterId: enc.id, suggestionId: String(s.id), label: text,
            reasons: s.reasons || [], dangerous: !!s.dangerous, source: s.source, status: 'active', lastReview: null, createdAt: now, updatedAt: now });
    } else if (s.kind === 'investigation' || s.kind === 'treatment') {
      const prev = planItems.get(trackedId(enc.id, String(s.id)));
      setI(prev
        ? { ...prev, text, priority: s.priority, status: prev.status === 'withdrawn' ? 'pending' : prev.status, updatedAt: now }
        : { id: trackedId(enc.id, String(s.id)), patientId: enc.patientId, hospitalId: enc.hospitalId, encounterId: enc.id, suggestionId: String(s.id), kind: s.kind, text,
            reason: (s.reasons || []).join('; ').slice(0, 500), priority: s.priority, source: s.source, status: 'pending', lastReview: null, createdAt: now, updatedAt: now });
    }
  }
  // An accepted suggestion later un-accepted is withdrawn, never deleted.
  for (const p of problems.values()) if (p.encounterId === enc.id && !keep.has(p.suggestionId) && p.status !== 'withdrawn') setP({ ...p, status: 'withdrawn', updatedAt: now });
  for (const i of planItems.values()) if (i.encounterId === enc.id && !keep.has(i.suggestionId) && i.status !== 'withdrawn') setI({ ...i, status: 'withdrawn', updatedAt: now });

  if (enc.clerking.kind === 'follow_up') {
    const fu = enc.clerking.data as FollowUpData;
    const review = { encounterId: enc.id, at: now };
    for (const r of fu.problems || []) {
      const status = PROBLEM_REVIEW_MAP[r.status];
      const p = problems.get(String(r.problemId));
      if (!status || !p || p.patientId !== enc.patientId) continue;
      setP({ ...p, status, lastReview: { ...review, status: r.status, note: r.note || null }, updatedAt: now });
    }
    for (const r of fu.plan || []) {
      const status = PLAN_REVIEW_MAP[r.status];
      const i = planItems.get(String(r.itemId));
      if (!status || !i || i.patientId !== enc.patientId) continue;
      setI({ ...i, status, lastReview: { ...review, status: r.status, note: r.note || null }, updatedAt: now });
    }
  }
  return { problems: [...changedP].map(id => problems.get(id)!), planItems: [...changedI].map(id => planItems.get(id)!) };
}

// ── Prose for the encounter's ordinary fields ──────────────────────────────

/** Split a generated narrative into its UPPER-CASE sections. */
export function narrativeSections(narrative: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  const lines = narrative.split('\n');
  lines.forEach((line, i) => {
    const isTitle = (i === 0 || lines[i - 1] === '') && /^[A-Z][A-Z /()-]{3,}$/.test(line.trim());
    if (isTitle) { current = line.trim(); out[current] = ''; return; }
    if (current && line !== '') out[current] += (out[current] ? '\n' : '') + line;
  });
  return out;
}

const ICD = /\s*\(([A-Z]\d{2}(?:\.\d+)?)\)\s*$/;

/** Accepted differentials as encounter diagnoses, ICD-10 code split off. */
export function acceptedDiagnoses(suggestions: Suggestion[]): Diagnosis[] {
  return suggestions
    .filter(s => s.kind === 'differential' && s.decision === 'accepted')
    .map((s, i) => {
      const text = s.edited || s.text;
      const m = ICD.exec(text);
      return { id: s.id, description: m ? text.replace(ICD, '') : text, code: m?.[1], type: i === 0 ? 'primary' : 'differential', status: 'suspected' } as Diagnosis;
    });
}

const EXAM_FIELD: Record<string, keyof PhysicalExamination> = {
  general: 'generalAppearance', general_extra: 'generalAppearance', cvs: 'cardiovascular', resp: 'chest', abdo: 'abdomen',
  neuro: 'neurological', msk: 'musculoskeletal', spine: 'musculoskeletal', genital: 'genitourinary', head_neck: 'neck', eye: 'eyes', oral: 'throat',
};

/**
 * Examination lines ("<section title>: findings", "Vitals: …") mapped onto
 * the encounter's examination fields. Lines that are not examination lines
 * are ignored, so a whole follow-up note can be passed in.
 */
export function examinationFields(text: string): PhysicalExamination {
  const byTitle = Object.fromEntries(Object.values(EXAM_SECTIONS).map(s => [s.title, s.id]));
  const out: PhysicalExamination = {};
  const add = (k: keyof PhysicalExamination, v: string) => { out[k] = out[k] ? `${out[k]}\n${v}` : v; };
  for (const line of text.split('\n')) {
    const idx = line.indexOf(': ');
    if (idx < 0) continue;
    const title = line.slice(0, idx), body = line.slice(idx + 2);
    if (/not documented$/.test(body)) continue;
    if (/^(Vitals|VITALS|BMI)$/.test(title)) { add('generalAppearance', `${title === 'VITALS' ? 'Vitals' : title}: ${body}`); continue; }
    const id = byTitle[title];
    if (!id) continue;
    add(EXAM_FIELD[id] || 'additionalFindings', EXAM_FIELD[id] ? body : line);
  }
  return out;
}

/**
 * The encounter's ordinary free-text fields, written from the clerking.
 *
 * Every existing reader consumes these and knows nothing of the structured
 * block, so a structured clerking prints, summarises and discharges exactly
 * like a typed one.
 */
export function proseFromClerking(narrative: string, data: ClerkingData, suggestions: Suggestion[]): Partial<ClinicalEncounter> {
  const s = narrativeSections(narrative);
  const accepted = (k: Suggestion['kind']) => suggestions.filter(x => x.kind === k && x.decision === 'accepted').map(x => `• ${x.edited || x.text}`);
  const plan = [...accepted('investigation'), ...accepted('treatment')];
  return {
    chiefComplaint: data.complaints.map(c => `${c.label}${c.duration?.value ? ` — ${c.duration.value} ${c.duration.unit}` : ''}`).join('; '),
    historyOfPresentIllness: [s['HISTORY OF PRESENTING COMPLAINTS'], s['REVIEW OF SYSTEMS'] && `Review of systems: ${s['REVIEW OF SYSTEMS']}`].filter(Boolean).join('\n\n'),
    pastMedicalHistory: s['PAST MEDICAL HISTORY'],
    pastSurgicalHistory: s['PAST SURGICAL HISTORY'],
    medicationHistory: s['DRUG HISTORY'],
    allergyHistory: s.ALLERGIES,
    obstetricHistory: s['GYNAECOLOGICAL / OBSTETRIC HISTORY'],
    lmp: data.history?.gyn?.lmp || undefined,
    familyHistory: s['FAMILY HISTORY'],
    socialHistory: s['SOCIAL HISTORY'],
    physicalExamination: examinationFields(s.EXAMINATION || ''),
    diagnosis: acceptedDiagnoses(suggestions),
    treatmentPlan: plan.length ? plan.join('\n') : undefined,
    notes: [
      s['CLINICAL IMPRESSION'] && `Impression: ${s['CLINICAL IMPRESSION']}`,
      s['RED FLAGS'] && `Red flags:\n${s['RED FLAGS']}`,
      s['RISK FACTORS / COMORBIDITIES'] && `Risk factors:\n${s['RISK FACTORS / COMORBIDITIES']}`,
    ].filter(Boolean).join('\n\n') || undefined,
  };
}

/** The same for a follow-up encounter, onto the follow-up fields. */
export function proseFromFollowUp(narrative: string, data: FollowUpData, suggestions: Suggestion[]): Partial<ClinicalEncounter> {
  const status = (st: string) => (st === 'not_reviewed' ? 'not reviewed' : st.replace(/_/g, ' '));
  const newDx = acceptedDiagnoses(suggestions);
  return {
    chiefComplaint: data.newComplaints.length ? `Follow-up review; new: ${data.newComplaints.map(c => c.label).join('; ')}` : 'Follow-up review',
    historyOfPresentIllness: narrative,
    intervalHistory: data.symptoms,
    treatmentResponse: data.problems.map(p => `• ${p.label}: ${status(p.status)}${p.note ? ` — ${p.note}` : ''}`).join('\n') || undefined,
    complianceAssessment: data.plan.map(p => `• ${p.text}: ${status(p.status)}${p.note ? ` — ${p.note}` : ''}`).join('\n') || undefined,
    newSymptoms: data.newComplaints.map(c => c.label).join('; ') || undefined,
    physicalExamination: examinationFields(narrative),
    diagnosis: newDx,
    notes: data.impression,
  };
}
