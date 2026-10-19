/**
 * No double registration, and a way out of the ones already made.
 *
 * Every path that registers a patient goes through registerPatient(): the
 * full and slim registration forms, quick add in the patient selector and the
 * wound monitor, and the patientOps / API / hook create helpers. It refuses a
 * hospital number already held by another active registration at the same
 * hospital, checking this device always and the cloud whenever it can be
 * reached. A source test (patientCreatePaths.test.ts) fails the build if a new
 * `db.patients.add(` appears anywhere else.
 *
 * Records arriving FROM the cloud (pull, realtime, cache fills, backup
 * restore) are not registrations and are not refused: the device mirrors what
 * the server holds. The server's own guarantee is the trigger and unique index
 * in supabase/migrations/20261018120400_patient_hospital_number_unique.sql.
 *
 * mergePatients() folds a duplicate into the record being kept.
 */
import { db } from '../../../database/db';
import { supabase, isSupabaseConfigured, LOCAL_TO_CLOUD_TABLE } from '../../../services/supabaseClient';
import type { Patient } from '../../../types';
import {
  findHospitalNumberMatches,
  generateUniqueHospitalNumber,
  groupDuplicateRegistrations,
  hospitalNumberKey,
  hospitalNumberScope,
  normalizeHospitalNumber,
  type DuplicateGroup,
} from '../../../utils/hospitalNumber';
import {
  checkMergeable,
  fillFromDuplicate,
  linkedTablesFromSchema,
  MERGE_SKIP_TABLES,
  repointRow,
  retireDuplicate,
  rowBelongsTo,
  type MergeActor,
} from './patientMergePlan';

// ── lookups ────────────────────────────────────────────────────────────────

export interface PatientMatch {
  id: string;
  name: string;
  hospitalNumber: string;
  dateOfBirth?: string;
  registeredHospitalId?: string;
  source: 'device' | 'cloud';
}

export class DuplicateHospitalNumberError extends Error {
  readonly code = 'DUPLICATE_HOSPITAL_NUMBER';
  constructor(public hospitalNumber: string, public matches: PatientMatch[]) {
    super(`Hospital number ${hospitalNumber} is already registered to ${matches[0]?.name || 'another patient'}.`);
    this.name = 'DuplicateHospitalNumberError';
  }
}

export function isDuplicateHospitalNumberError(e: unknown): e is DuplicateHospitalNumberError {
  return e instanceof DuplicateHospitalNumberError
    || (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'DUPLICATE_HOSPITAL_NUMBER');
}

const fullName = (p: { firstName?: string; lastName?: string; first_name?: string; last_name?: string }) =>
  `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim();

const isoDate = (v: unknown): string | undefined => {
  if (!v) return undefined;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

function toMatch(p: Patient, source: PatientMatch['source']): PatientMatch {
  return {
    id: p.id,
    name: fullName(p),
    hospitalNumber: p.hospitalNumber,
    dateOfBirth: isoDate(p.dateOfBirth),
    registeredHospitalId: p.registeredHospitalId,
    source,
  };
}

/** Registrations on this device holding the number at that hospital. */
export async function findLocalMatches(hospitalNumber: string, registeredHospitalId: string | undefined, excludeId?: string): Promise<PatientMatch[]> {
  if (!hospitalNumberKey(hospitalNumber)) return [];
  const all = await db.patients.toArray();
  return findHospitalNumberMatches(all, hospitalNumber, registeredHospitalId, excludeId).map((p) => toMatch(p, 'device'));
}

const CLOUD_TIMEOUT_MS = 5000;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Registrations in the cloud holding the number at that hospital, or null when
 * the cloud cannot be asked (offline, not configured, timed out).
 *
 * Uses find_patients_by_hospital_number() (the migration's lookup, matching on
 * the same key as here); before that migration is applied, falls back to a
 * case-insensitive match on the written form.
 */
export async function findCloudMatches(hospitalNumber: string, registeredHospitalId: string | undefined, excludeId?: string): Promise<PatientMatch[] | null> {
  if (!hospitalNumberKey(hospitalNumber)) return [];
  if (!isSupabaseConfigured() || !supabase || typeof navigator === 'undefined' || !navigator.onLine) return null;
  const scope = hospitalNumberScope(registeredHospitalId);
  try {
    let rows: Record<string, unknown>[] | null = null;
    const rpc = await withTimeout(
      supabase.rpc('find_patients_by_hospital_number', { p_number: hospitalNumber, p_hospital: scope }),
      CLOUD_TIMEOUT_MS,
    );
    if (!rpc.error) {
      rows = (rpc.data as Record<string, unknown>[]) || [];
    } else {
      const pattern = normalizeHospitalNumber(hospitalNumber).replace(/[\\%_]/g, (c) => `\\${c}`);
      const res = await withTimeout(
        supabase.from('patients')
          .select('id, hospital_number, first_name, last_name, date_of_birth, registered_hospital_id, is_active, merged_into')
          .ilike('hospital_number', pattern)
          .limit(10),
        CLOUD_TIMEOUT_MS,
      );
      if (res.error) {
        // merged_into is added by the migration; retry without it.
        const bare = await withTimeout(
          supabase.from('patients')
            .select('id, hospital_number, first_name, last_name, date_of_birth, registered_hospital_id, is_active')
            .ilike('hospital_number', pattern)
            .limit(10),
          CLOUD_TIMEOUT_MS,
        );
        if (bare.error) return null;
        rows = (bare.data as Record<string, unknown>[]) || [];
      } else {
        rows = (res.data as Record<string, unknown>[]) || [];
      }
    }
    const patients = rows.map((r) => ({
      id: String(r.id),
      hospitalNumber: String(r.hospital_number ?? ''),
      firstName: String(r.first_name ?? ''),
      lastName: String(r.last_name ?? ''),
      dateOfBirth: r.date_of_birth,
      registeredHospitalId: (r.registered_hospital_id as string) ?? '',
      isActive: r.is_active as boolean | undefined,
      mergedInto: (r.merged_into as string) ?? undefined,
    }));
    return findHospitalNumberMatches(patients, hospitalNumber, scope, excludeId).map((p) => ({
      id: p.id,
      name: fullName(p),
      hospitalNumber: p.hospitalNumber,
      dateOfBirth: isoDate(p.dateOfBirth),
      registeredHospitalId: p.registeredHospitalId,
      source: 'cloud' as const,
    }));
  } catch {
    return null;
  }
}

export interface NumberCheckResult {
  matches: PatientMatch[];
  /** The cloud could not be asked; only this device was checked. */
  cloudUnchecked: boolean;
}

/** This device and (when reachable) the cloud; one entry per patient id. */
export async function checkHospitalNumber(hospitalNumber: string, registeredHospitalId: string | undefined, excludeId?: string): Promise<NumberCheckResult> {
  const [local, cloud] = await Promise.all([
    findLocalMatches(hospitalNumber, registeredHospitalId, excludeId).catch(() => [] as PatientMatch[]),
    findCloudMatches(hospitalNumber, registeredHospitalId, excludeId),
  ]);
  const seen = new Set<string>();
  const matches = [...local, ...(cloud || [])].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  return { matches, cloudUnchecked: cloud === null };
}

// ── registration ───────────────────────────────────────────────────────────

/** An auto-number (CB + YY + 5 digits) not already on this device. */
export async function generateHospitalNumberForRegistration(): Promise<string> {
  const taken = new Set<string>();
  await db.patients.each((p) => { taken.add(hospitalNumberKey(p.hospitalNumber)); });
  return generateUniqueHospitalNumber(taken);
}

export interface RegisterOptions {
  /** Ask the cloud too when online (default true). Offline, the device check stands and the server checks on sync. */
  checkCloud?: boolean;
}

/**
 * Saves a new registration to this device, refusing a duplicate number.
 *
 * A typed number is stored in its written form (normalizeHospitalNumber); a
 * blank one gets an auto-number. Throws DuplicateHospitalNumberError, whose
 * `matches` say who already holds the number, so the caller can offer the
 * existing record instead.
 */
export async function registerPatient<T extends Patient>(patient: T, options: RegisterOptions = {}): Promise<T> {
  const typed = normalizeHospitalNumber(patient.hospitalNumber);
  const record: T = { ...patient, hospitalNumber: typed || await generateHospitalNumberForRegistration() };

  const local = await findLocalMatches(record.hospitalNumber, record.registeredHospitalId, record.id);
  if (local.length) throw new DuplicateHospitalNumberError(record.hospitalNumber, local);

  if (options.checkCloud !== false) {
    const cloud = await findCloudMatches(record.hospitalNumber, record.registeredHospitalId, record.id);
    if (cloud && cloud.length) throw new DuplicateHospitalNumberError(record.hospitalNumber, cloud);
  }

  // The one sanctioned local create of a patient (see patientCreatePaths.test.ts).
  await db.patients.add(record);
  return record;
}

/**
 * For edits: refuses renumbering a patient onto a number another registration
 * at the same hospital holds. A no-op when the number (by key) is unchanged.
 */
export async function assertRenumberAllowed(id: string, updates: Partial<Patient>): Promise<void> {
  if (updates.hospitalNumber === undefined && updates.registeredHospitalId === undefined) return;
  const current = await db.patients.get(id);
  if (!current) return;
  const number = updates.hospitalNumber ?? current.hospitalNumber;
  const hospital = updates.registeredHospitalId ?? current.registeredHospitalId;
  if (hospitalNumberKey(number) === hospitalNumberKey(current.hospitalNumber)
      && hospitalNumberScope(hospital) === hospitalNumberScope(current.registeredHospitalId)) return;
  const local = await findLocalMatches(number, hospital, id);
  if (local.length) throw new DuplicateHospitalNumberError(normalizeHospitalNumber(number), local);
}

// ── duplicates and merging ─────────────────────────────────────────────────

function dexieStoreSpecs(): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const t of db.tables) {
    specs[t.name] = [t.schema.primKey.name, ...t.schema.indexes.map((i) => i.name)].join(', ');
  }
  return specs;
}

/** The registrations on this device that share a number at the same hospital. */
export async function listDuplicateGroups(): Promise<DuplicateGroup<Patient>[]> {
  return groupDuplicateRegistrations(await db.patients.toArray());
}

export interface LinkedCounts { total: number; tables: Record<string, number> }

/** How much is recorded against each patient, by table, so the fuller record is kept. */
export async function countLinkedRecords(patientIds: string[]): Promise<Record<string, LinkedCounts>> {
  const out: Record<string, LinkedCounts> = Object.fromEntries(patientIds.map((id) => [id, { total: 0, tables: {} }]));
  const { indexed } = linkedTablesFromSchema(dexieStoreSpecs());
  for (const name of indexed) {
    for (const id of patientIds) {
      try {
        const n = await db.table(name).where('patientId').equals(id).count();
        if (n) { out[id].tables[name] = n; out[id].total += n; }
      } catch { /* unreadable table counts as none */ }
    }
  }
  return out;
}

export interface MergeResult {
  kept: { id: string; hospitalNumber: string };
  merged: { id: string; hospitalNumber: string };
  /** Rows moved on this device, by table. */
  moved: Record<string, number>;
  movedTotal: number;
  /** Fields of the kept record filled (or combined) from the duplicate. */
  filled: string[];
  cloud:
    | { status: 'skipped'; reason: string }
    | { status: 'done'; moved: string[]; failed: { table: string; reason: string }[]; uniqueIndex?: string };
}

/**
 * Folds `dropId` into `keepId`.
 *
 * On this device, in one transaction: every row of every table that points at
 * the duplicate (patientId, or a patientIds list) moves to the kept patient,
 * its denormalised hospitalNumber aligned; the kept record's blanks are filled
 * and its allergy / condition lists combined; the duplicate is retired
 * (inactive, mergedInto, number renamed MERGED-...) and never deleted.
 *
 * In the cloud (when configured), the same re-pointing is applied table by
 * table so rows this device never pulled move too; a table that refuses is
 * reported back rather than forced. Merging while configured but offline is
 * refused, because rows on other devices would be left behind.
 *
 * Administrators only (canMergePatients). Audited.
 */
export async function mergePatients(args: { keepId: string; dropId: string; user: MergeActor; force?: boolean }): Promise<MergeResult> {
  const { keepId, dropId, user, force = false } = args;
  const cloudConfigured = isSupabaseConfigured() && !!supabase;
  if (cloudConfigured && typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Merging needs a connection, so that records held on other devices move too. Try again when online.');
  }

  const now = new Date();
  const moved: Record<string, number> = {};
  let kept!: Patient;
  let retired!: Patient;
  let filled: string[] = [];
  let dropNumberBefore = '';

  await db.transaction('rw', db.tables, async () => {
    const [keep, drop] = await Promise.all([db.patients.get(keepId), db.patients.get(dropId)]);
    checkMergeable(keep, drop, user, force);
    const dropped = drop as Patient;
    dropNumberBefore = dropped.hospitalNumber;

    for (const table of db.tables) {
      if (MERGE_SKIP_TABLES.has(table.name)) continue;
      const rows = await table.filter((r: Record<string, unknown>) => rowBelongsTo(r, dropped.id)).toArray();
      if (!rows.length) continue;
      await table.bulkPut(rows.map((r: Record<string, unknown>) => repointRow(r, dropped.id, keep, now)));
      moved[table.name] = rows.length;
    }

    const fills = fillFromDuplicate(keep, dropped);
    filled = Object.keys(fills);
    kept = { ...keep, ...fills, updatedAt: now };
    retired = retireDuplicate(dropped, keep.id, now);
    await db.patients.bulkPut([kept, retired]);
  });

  const movedTotal = Object.values(moved).reduce((a, b) => a + b, 0);
  const cloud = cloudConfigured
    ? await repointInCloud(dropId, kept, retired)
    : { status: 'skipped' as const, reason: 'Cloud sync is not configured on this device.' };

  try {
    const { logAuditEvent } = await import('../../../services/auditService');
    const summary = (p: Patient) => ({ id: p.id, hospitalNumber: p.hospitalNumber, name: fullName(p), registeredHospitalId: p.registeredHospitalId });
    await logAuditEvent(user.id, 'patient_merged', 'patients', kept.id, {
      oldValue: { merged: { ...summary(retired), hospitalNumberBefore: dropNumberBefore } },
      newValue: { kept: summary(kept), moved, movedTotal, filled, cloud, forced: force },
    });
    await logAuditEvent(user.id, 'patient_retired_by_merge', 'patients', retired.id, {
      newValue: { mergedInto: kept.id, hospitalNumber: retired.hospitalNumber },
    });
  } catch (e) {
    console.warn('[PatientMerge] Audit log failed:', e);
  }

  return {
    kept: { id: kept.id, hospitalNumber: kept.hospitalNumber },
    merged: { id: retired.id, hospitalNumber: retired.hospitalNumber },
    moved,
    movedTotal,
    filled,
    cloud,
  };
}

/** Cloud errors meaning "this table has no patient_id" (or does not exist): nothing to move. */
const NOT_APPLICABLE_CODES = new Set(['42703', '42P01', 'PGRST204', 'PGRST205']);

async function repointInCloud(dropId: string, kept: Patient, retired: Patient): Promise<MergeResult['cloud']> {
  if (!supabase) return { status: 'skipped', reason: 'Cloud sync is not configured on this device.' };
  const { indexed, scanned } = linkedTablesFromSchema(dexieStoreSpecs());
  const movedTables: string[] = [];
  const failed: { table: string; reason: string }[] = [];

  for (const local of [...indexed, ...scanned]) {
    const cloudTable = LOCAL_TO_CLOUD_TABLE[local];
    if (!cloudTable || cloudTable === 'patients') continue;
    try {
      const { error } = await supabase.from(cloudTable).update({ patient_id: kept.id }).eq('patient_id', dropId);
      if (!error) { if (indexed.includes(local)) movedTables.push(cloudTable); continue; }
      if (NOT_APPLICABLE_CODES.has(String(error.code))) continue;
      failed.push({ table: cloudTable, reason: error.message });
    } catch (e) {
      failed.push({ table: cloudTable, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  // The two patient records themselves: retired duplicate first, so its old
  // number is released before anything else checks it.
  try {
    const { syncRecord } = await import('../../../services/cloudSyncService');
    await syncRecord('patients', retired as unknown as Record<string, unknown>);
    await syncRecord('patients', kept as unknown as Record<string, unknown>);
  } catch (e) {
    failed.push({ table: 'patients', reason: e instanceof Error ? e.message : String(e) });
  }

  // With the duplicate's number retired, the unique index may now be buildable.
  let uniqueIndex: string | undefined;
  try {
    const { data, error } = await supabase.rpc('ensure_patient_hospital_number_unique');
    uniqueIndex = error ? undefined : String(data);
  } catch { /* the migration has not been applied; nothing to build */ }

  return { status: 'done', moved: movedTables, failed, uniqueIndex };
}
