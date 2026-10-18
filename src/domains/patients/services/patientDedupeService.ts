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
 */
import { db } from '../../../database/db';
import { supabase, isSupabaseConfigured } from '../../../services/supabaseClient';
import type { Patient } from '../../../types';
import {
  findHospitalNumberMatches,
  generateUniqueHospitalNumber,
  hospitalNumberKey,
  hospitalNumberScope,
  normalizeHospitalNumber,
} from '../../../utils/hospitalNumber';

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
