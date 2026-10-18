/**
 * Persistence for structured clerking: initial clerking, follow-up encounters
 * and the problem list / plan they feed.
 *
 * Offline-first through Dexie with the Supabase mirror on the existing sync
 * path. The encounter is an ordinary clinicalEncounters row carrying a
 * `clerking` block; tracked problems and plan items have their own tables.
 * Every rule the original server enforced (versioned edits, who may sign,
 * who may withdraw, reasons required) is checked in lifecycle.ts before
 * anything is written, and every state change is audited.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { logAuditEvent } from '../../../services/auditService';
import type { ClinicalEncounter, Patient, User } from '../../../types';
import type { ClerkingData, Suggestion } from '../clerking/types';
import type { FollowUpData, PatientContext } from '../clerking/engine';
import type { ClinicalPlanItem, ClinicalProblem, ClerkingKind, StructuredClerking } from '../clerking/records';
import {
  assertCanEdit, assertCanMarkError, assertCanSubmit, assertTrackedStatus, cleanPayload, encounterStatusFor,
  proseFromClerking, proseFromFollowUp, reconcileTracking, type Actor,
} from '../clerking/lifecycle';

const nowIso = () => new Date().toISOString();

export const actorOf = (u: Pick<User, 'id' | 'role' | 'firstName' | 'lastName'>): Actor => ({
  id: u.id, role: u.role, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || undefined,
});

/** Age and sex as the clerking engine reads them. */
export function patientContext(p?: Pick<Patient, 'dateOfBirth' | 'gender'> | null): PatientContext {
  if (!p) return {};
  const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
  let age: number | null = null;
  if (dob && !Number.isNaN(dob.getTime())) {
    const now = new Date();
    age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  }
  return { ageYears: age, sex: p.gender === 'female' ? 'Female' : p.gender === 'male' ? 'Male' : null };
}

/** What identifies this patient, to be removed from anything sent to the AI. */
export function patientIdentifiers(p?: Partial<Patient> | null): string[] {
  if (!p) return [];
  return [p.firstName, p.lastName, p.middleName, p.hospitalNumber, p.phone, p.alternatePhone, p.email]
    .map(v => String(v || '').trim())
    .filter(v => v.length >= 2);
}

export const patientLabelOf = (p?: Partial<Patient> | null) =>
  p ? `${[p.firstName, p.lastName].filter(Boolean).join(' ')}${p.hospitalNumber ? ` · ${p.hospitalNumber}` : ''}` : 'Patient';

export type ClerkedEncounter = ClinicalEncounter & { clerking: StructuredClerking };

export interface PatientClerking {
  /** Newest first. */
  encounters: ClerkedEncounter[];
  /** Withdrawn rows are left out. */
  problems: ClinicalProblem[];
  planItems: ClinicalPlanItem[];
}

const byCreated = (a: { createdAt: Date | string }, b: { createdAt: Date | string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export async function listForPatient(patientId: string): Promise<PatientClerking> {
  const [encs, problems, planItems] = await Promise.all([
    db.clinicalEncounters.where('patientId').equals(patientId).toArray(),
    db.clinicalProblems.where('patientId').equals(patientId).toArray(),
    db.clinicalPlanItems.where('patientId').equals(patientId).toArray(),
  ]);
  const oldestFirst = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);
  return {
    encounters: encs.filter((e): e is ClerkedEncounter => !!e.clerking).sort(byCreated).slice(0, 100),
    problems: problems.filter(p => p.status !== 'withdrawn').sort(oldestFirst),
    planItems: planItems.filter(p => p.status !== 'withdrawn').sort(oldestFirst),
  };
}

async function write(enc: ClinicalEncounter) {
  await db.clinicalEncounters.put(enc);
  await syncRecord('clinicalEncounters', enc as unknown as Record<string, unknown>);
}

export interface SaveClerkingInput {
  id?: string;
  version?: number;
  patientId: string;
  hospitalId?: string;
  kind: ClerkingKind;
  parentEncounterId?: string;
  data: ClerkingData | FollowUpData;
  suggestions: Suggestion[];
  summary: Record<string, any>;
  narrative: string;
}

/** Create (no id) or update a draft / pending clerking. */
export async function saveClerking(input: SaveClerkingInput, user: User): Promise<ClerkedEncounter> {
  const actor = actorOf(user);
  const c = cleanPayload(input);
  const prose = input.kind === 'initial'
    ? proseFromClerking(c.narrative, c.data as ClerkingData, c.suggestions)
    : proseFromFollowUp(c.narrative, c.data as FollowUpData, c.suggestions);
  const ts = nowIso();

  if (!input.id) {
    const clerking: StructuredClerking = {
      kind: input.kind, status: 'draft', data: c.data as ClerkingData | FollowUpData, suggestions: c.suggestions,
      summary: c.summary, narrative: c.narrative, version: 1, parentEncounterId: input.parentEncounterId,
      createdBy: actor.id, createdByName: actor.name, createdByRole: actor.role,
    };
    const enc: ClerkedEncounter = {
      id: uuidv4(),
      patientId: input.patientId,
      hospitalId: input.hospitalId || user.hospitalId || 'hospital-1',
      type: input.kind === 'initial' ? 'initial' : 'follow_up',
      status: encounterStatusFor('draft'),
      isFirstEncounter: input.kind === 'initial',
      previousEncounterId: input.parentEncounterId,
      chiefComplaint: '',
      diagnosis: [],
      ...prose,
      attendingClinician: user.id,
      startedAt: new Date(ts),
      createdAt: new Date(ts),
      updatedAt: new Date(ts),
      clerking,
    } as ClerkedEncounter;
    await write(enc);
    void logAuditEvent(user.id, 'create', 'clinical_encounters', enc.id, { newValue: { kind: input.kind, structured: true } });
    return enc;
  }

  const existing = await db.clinicalEncounters.get(input.id);
  const prev = assertCanEdit(existing, input.version, actor);
  const enc = {
    ...existing!,
    ...prose,
    status: encounterStatusFor(prev.status),
    updatedAt: new Date(ts),
    clerking: { ...prev, data: c.data, suggestions: c.suggestions, summary: c.summary, narrative: c.narrative, version: prev.version + 1 },
  } as ClerkedEncounter;
  await write(enc);
  return enc;
}

/**
 * Submit for review, or sign (when the user may sign). On submit the tracked
 * problem list and plan are brought in line with the accepted suggestions.
 */
export async function submitClerking(id: string, version: number | undefined, user: User, sign = false): Promise<ClerkedEncounter> {
  const actor = actorOf(user);
  const existing = await db.clinicalEncounters.get(id);
  const status = assertCanSubmit(existing, version, actor, sign);
  const prev = existing!.clerking!;
  const ts = nowIso();
  const signed = status === 'signed';
  const enc = {
    ...existing!,
    status: encounterStatusFor(status),
    completedAt: signed ? new Date(ts) : existing!.completedAt,
    updatedAt: new Date(ts),
    clerking: {
      ...prev, status, version: prev.version + 1,
      submittedAt: prev.submittedAt || ts,
      signedBy: signed ? actor.id : undefined, signedByName: signed ? actor.name : undefined, signedAt: signed ? ts : undefined,
    },
  } as ClerkedEncounter;

  const [problems, planItems] = await Promise.all([
    db.clinicalProblems.where('patientId').equals(enc.patientId).toArray(),
    db.clinicalPlanItems.where('patientId').equals(enc.patientId).toArray(),
  ]);
  const changed = reconcileTracking(enc, { problems, planItems }, ts);

  await db.transaction('rw', db.clinicalEncounters, db.clinicalProblems, db.clinicalPlanItems, async () => {
    await db.clinicalEncounters.put(enc);
    if (changed.problems.length) await db.clinicalProblems.bulkPut(changed.problems);
    if (changed.planItems.length) await db.clinicalPlanItems.bulkPut(changed.planItems);
  });
  await syncRecord('clinicalEncounters', enc as unknown as Record<string, unknown>);
  for (const p of changed.problems) await syncRecord('clinicalProblems', p as unknown as Record<string, unknown>);
  for (const p of changed.planItems) await syncRecord('clinicalPlanItems', p as unknown as Record<string, unknown>);
  void logAuditEvent(user.id, signed ? 'sign' : 'submit', 'clinical_encounters', id, { newValue: { status, version: enc.clerking.version } });
  return enc;
}

/** Mark a whole encounter entered in error; everything it fed is withdrawn. */
export async function markEncounterInError(id: string, user: User, reason: string): Promise<ClerkedEncounter> {
  const existing = await db.clinicalEncounters.get(id);
  assertCanMarkError(existing, actorOf(user), reason);
  const ts = nowIso();
  const prev = existing!.clerking!;
  const enc = {
    ...existing!, status: encounterStatusFor('entered_in_error'), updatedAt: new Date(ts),
    clerking: { ...prev, status: 'entered_in_error', errorReason: String(reason).trim().slice(0, 500), version: prev.version + 1 },
  } as ClerkedEncounter;
  const withdraw = <T extends { status: string; updatedAt: string }>(rows: T[]) =>
    rows.filter(r => r.status !== 'withdrawn').map(r => ({ ...r, status: 'withdrawn', updatedAt: ts }) as T);
  const problems = withdraw(await db.clinicalProblems.where('encounterId').equals(id).toArray());
  const planItems = withdraw(await db.clinicalPlanItems.where('encounterId').equals(id).toArray());
  await db.transaction('rw', db.clinicalEncounters, db.clinicalProblems, db.clinicalPlanItems, async () => {
    await db.clinicalEncounters.put(enc);
    await db.clinicalProblems.bulkPut(problems);
    await db.clinicalPlanItems.bulkPut(planItems);
  });
  await syncRecord('clinicalEncounters', enc as unknown as Record<string, unknown>);
  for (const p of problems) await syncRecord('clinicalProblems', p as unknown as Record<string, unknown>);
  for (const p of planItems) await syncRecord('clinicalPlanItems', p as unknown as Record<string, unknown>);
  void logAuditEvent(user.id, 'entered_in_error', 'clinical_encounters', id, { newValue: { reason: String(reason).slice(0, 200) } });
  return enc;
}

/** Quick status change on a tracked problem or plan item (outside a follow-up). */
export async function updateTracked(kind: 'problem' | 'plan', id: string, status: string, note: string | undefined, user: User) {
  assertTrackedStatus(kind, status);
  const ts = nowIso();
  const review = { status, note: note || null, by: actorOf(user).name || user.id, at: ts };
  const table = kind === 'problem' ? 'clinicalProblems' : 'clinicalPlanItems';
  const row = kind === 'problem' ? await db.clinicalProblems.get(id) : await db.clinicalPlanItems.get(id);
  if (!row) throw new Error('Not found');
  const next = { ...row, status, lastReview: review, updatedAt: ts };
  if (kind === 'problem') await db.clinicalProblems.put(next as ClinicalProblem);
  else await db.clinicalPlanItems.put(next as ClinicalPlanItem);
  await syncRecord(table, next as unknown as Record<string, unknown>);
  void logAuditEvent(user.id, 'status_change', kind === 'problem' ? 'clinical_problems' : 'clinical_plan_items', id, { newValue: { status } });
  return next;
}

/** Autosaved work in progress on this device, between explicit saves. */
export const localDraft = {
  key: (patientId: string, type: string) => `clerking-draft:${patientId}:${type}`,
  load<T>(patientId: string, type: string): T | null {
    try { const raw = localStorage.getItem(this.key(patientId, type)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  save(patientId: string, type: string, value: unknown) {
    try { localStorage.setItem(this.key(patientId, type), JSON.stringify({ ...(value as object), savedAt: nowIso() })); } catch { /* storage full / blocked */ }
  },
  clear(patientId: string, type: string) {
    try { localStorage.removeItem(this.key(patientId, type)); } catch { /* ignore */ }
  },
};
