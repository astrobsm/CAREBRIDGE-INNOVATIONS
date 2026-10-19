/**
 * Merging two registrations of the same patient: the decisions, without the
 * database. patientDedupeService.mergePatients() gathers the rows, asks this
 * module what to write, and writes it.
 *
 * Kept pure so the rules can be tested without IndexedDB:
 *   - which Dexie tables hold patient-linked rows (linkedTablesFromSchema)
 *   - what each linked row becomes (repointRow)
 *   - which blanks the kept record fills from the duplicate (fillFromDuplicate)
 *   - what the retired duplicate looks like (retireDuplicate)
 *   - who may merge (canMergePatients)
 */
import type { Patient } from '../../../types';
import {
  RETIRED_PREFIX,
  hospitalNumberKey,
  hospitalNumberScope,
  isRetiredHospitalNumber,
} from '../../../utils/hospitalNumber';

/** Never re-pointed: the patients themselves, and logs that must say what happened. */
export const MERGE_SKIP_TABLES = new Set(['patients', 'auditLogs', 'syncStatus', 'financeAuditLogs']);

/**
 * Tables to re-point, from the Dexie store definitions ({ table: 'id, patientId, ...' }).
 *
 * `indexed` tables have a patientId index and are queried through it; every
 * other table is scanned, because a patientId (or a patientIds array, as nurse
 * assignments carry) can live on a row without being indexed. Derived from the
 * schema rather than listed, so a module added later is merged too.
 */
export function linkedTablesFromSchema(stores: Record<string, string>): { indexed: string[]; scanned: string[] } {
  const indexed: string[] = [];
  const scanned: string[] = [];
  for (const [name, spec] of Object.entries(stores)) {
    if (MERGE_SKIP_TABLES.has(name)) continue;
    const fields = spec.split(',').map((f) => f.trim().replace(/^[&*+]+/, ''));
    if (fields.includes('patientId')) indexed.push(name); else scanned.push(name);
  }
  return { indexed: indexed.sort(), scanned: scanned.sort() };
}

/** Whether a row belongs to the patient `id`. */
export function rowBelongsTo(row: Record<string, unknown>, id: string): boolean {
  if (row.patientId === id) return true;
  const ids = row.patientIds;
  return Array.isArray(ids) && ids.includes(id);
}

/**
 * The row moved to the kept patient: patientId re-pointed, a patientIds array
 * de-duplicated, and a denormalised hospitalNumber aligned with the kept record.
 * `updatedAt` is bumped only where the row already carries one, so the sync
 * engine pushes the change without growing columns the cloud table lacks.
 */
export function repointRow<T extends Record<string, unknown>>(
  row: T,
  dropId: string,
  keep: { id: string; hospitalNumber?: string },
  now: Date,
): T {
  const out: Record<string, unknown> = { ...row };
  if (out.patientId === dropId) out.patientId = keep.id;
  if (Array.isArray(out.patientIds)) {
    out.patientIds = [...new Set((out.patientIds as unknown[]).map((v) => (v === dropId ? keep.id : v)))];
  }
  if ('hospitalNumber' in out && keep.hospitalNumber) out.hospitalNumber = keep.hospitalNumber;
  if ('updatedAt' in out) out.updatedAt = now;
  return out as T;
}

// ── filling the kept record ────────────────────────────────────────────────

/** Scalar fields the kept record takes from the duplicate when it has none. */
export const FILL_FIELDS = [
  'middleName', 'bloodGroup', 'genotype', 'phone', 'alternatePhone', 'email',
  'address', 'city', 'state', 'occupation', 'religion', 'tribe', 'photo',
  'ward', 'hospitalId', 'hospitalName', 'careType',
  'dvtRiskAssessment', 'pressureSoreRiskAssessment',
] as const;

/** Placeholders registration wrote when a field was not asked. */
const PLACEHOLDERS = new Set(['', 'not provided', 'n/a', 'unknown']);

export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return PLACEHOLDERS.has(v.trim().toLowerCase());
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function union(a: unknown, b: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const s = String(v ?? '').trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

/**
 * Changes to the kept record. Blanks are filled, never overwritten. Allergies,
 * chronic conditions and comorbidities are combined rather than filled: an
 * allergy recorded only on the duplicate must not disappear with it.
 */
export function fillFromDuplicate(keep: Patient, drop: Patient): Partial<Patient> {
  const k = keep as unknown as Record<string, unknown>;
  const d = drop as unknown as Record<string, unknown>;
  const changes: Record<string, unknown> = {};

  for (const f of FILL_FIELDS) {
    if (isBlank(k[f]) && !isBlank(d[f])) changes[f] = d[f];
  }

  // Date of birth: only when the kept record has none at all. Quick add stores
  // none rather than a placeholder, so a missing value is a real gap.
  if (!keep.dateOfBirth && drop.dateOfBirth) changes.dateOfBirth = drop.dateOfBirth;

  const nok = keep.nextOfKin;
  if ((!nok || isBlank(nok.name)) && drop.nextOfKin && !isBlank(drop.nextOfKin.name)) {
    changes.nextOfKin = drop.nextOfKin;
  }

  for (const f of ['allergies', 'chronicConditions'] as const) {
    const merged = union(keep[f], drop[f]);
    if (merged.length !== (Array.isArray(keep[f]) ? keep[f].length : 0)) changes[f] = merged;
  }

  if (drop.comorbidities?.length) {
    const have = new Set((keep.comorbidities || []).map((c) => c.condition.trim().toLowerCase()));
    const extra = drop.comorbidities.filter((c) => !have.has(c.condition.trim().toLowerCase()));
    if (extra.length) changes.comorbidities = [...(keep.comorbidities || []), ...extra];
  }

  return changes as Partial<Patient>;
}

/**
 * The duplicate after the merge: inactive, pointing at the kept record, its
 * number retired as MERGED-<id>-<number> so the number is free and the
 * unique index can be built. Never deleted: several modules and the audit
 * trail refer to it by id.
 */
export function retireDuplicate(drop: Patient, keepId: string, now: Date): Patient {
  return {
    ...drop,
    isActive: false,
    mergedInto: keepId,
    mergedAt: now,
    hospitalNumber: `${RETIRED_PREFIX}${drop.id.slice(0, 8)}-${drop.hospitalNumber || ''}`,
    updatedAt: now,
  };
}

// ── preconditions and permission ───────────────────────────────────────────

export type MergeRefusal =
  | 'SAME_PATIENT' | 'NOT_FOUND' | 'ALREADY_MERGED' | 'DIFFERENT_NUMBERS' | 'DIFFERENT_HOSPITALS' | 'NOT_ALLOWED';

export class MergeRefusedError extends Error {
  constructor(public code: MergeRefusal, message: string) {
    super(message);
    this.name = 'MergeRefusedError';
  }
}

export interface MergeActor { id: string; role: string; hospitalId?: string }

/**
 * Administrators only. A super admin may merge any registrations; a hospital
 * admin only patients registered at their own hospital.
 */
export function canMergePatients(user: MergeActor | null | undefined, patients: Pick<Patient, 'registeredHospitalId'>[] = []): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.role !== 'hospital_admin' || !user.hospitalId) return false;
  return patients.every((p) => hospitalNumberScope(p.registeredHospitalId) === user.hospitalId);
}

/** Throws MergeRefusedError when the two records must not be merged. */
export function checkMergeable(
  keep: Patient | undefined,
  drop: Patient | undefined,
  user: MergeActor | null | undefined,
  force = false,
): asserts keep is Patient {
  if (!keep || !drop) throw new MergeRefusedError('NOT_FOUND', 'One of the patients was not found on this device.');
  if (keep.id === drop.id) throw new MergeRefusedError('SAME_PATIENT', 'Choose two different patients.');
  if (drop.mergedInto || isRetiredHospitalNumber(drop.hospitalNumber)) {
    throw new MergeRefusedError('ALREADY_MERGED', 'That record has already been merged.');
  }
  if (keep.mergedInto || isRetiredHospitalNumber(keep.hospitalNumber)) {
    throw new MergeRefusedError('ALREADY_MERGED', 'The record to keep was itself merged into another; keep that one instead.');
  }
  if (!canMergePatients(user, [keep, drop])) {
    throw new MergeRefusedError('NOT_ALLOWED', 'Only an administrator can merge patient records.');
  }
  if (!force && hospitalNumberKey(keep.hospitalNumber) !== hospitalNumberKey(drop.hospitalNumber)) {
    throw new MergeRefusedError('DIFFERENT_NUMBERS', 'These two patients have different hospital numbers. Confirm to merge them anyway.');
  }
  if (!force && hospitalNumberScope(keep.registeredHospitalId) !== hospitalNumberScope(drop.registeredHospitalId)) {
    throw new MergeRefusedError('DIFFERENT_HOSPITALS', 'These two patients are registered at different hospitals. Confirm to merge them anyway.');
  }
}

/** The record with the most linked rows; the earlier registration on a tie. */
export function suggestKeep<T extends { id: string; createdAt?: unknown }>(
  patients: T[],
  totals: Record<string, number>,
): T | undefined {
  const t = (v: unknown) => (v ? new Date(v as string).getTime() || 0 : 0);
  return [...patients].sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0) || t(a.createdAt) - t(b.createdAt))[0];
}
