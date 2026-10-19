/**
 * Hospital (folder) numbers: one written form, one matching key.
 *
 * The number is how staff find a patient, and the duplicate check used to be
 * an exact match (where there was one at all), so "cb2612345", "CB 2612345"
 * and "CB-26-12345" were three different patients. The same person could be
 * registered again just by typing the number a little differently.
 *
 *   normalizeHospitalNumber  the form a NEW number is stored in: trimmed,
 *                            upper-cased, single spaces, no spaces around
 *                            "-" or "/"
 *   hospitalNumberKey        the form numbers are COMPARED in: upper case,
 *                            letters and digits only, so case, spaces, dashes,
 *                            slashes and dots never make two numbers differ
 *
 * Existing records are never rewritten. Numbers already on file were issued in
 * several shapes (folder numbers typed by hand, CB2612345 auto-numbers,
 * QP-... quick-add numbers), and those strings are printed on folders and
 * request forms. Matching is done on the key instead, which treats every one
 * of those shapes consistently without changing what is stored.
 *
 * Unlike the single-hospital app this was ported from, no prefix is imposed:
 * each hospital issues its own folder numbers, so a number is unique within
 * the hospital the patient is registered at (see hospitalNumberScope), and a
 * bare "12345" stays "12345".
 *
 * Keep the key in step with public.patient_hospital_number_key() in
 * supabase/migrations/20261018120400_patient_hospital_number_unique.sql.
 */

/** Prefix given to the number of a registration retired by a merge. */
export const RETIRED_PREFIX = 'MERGED-';

export function normalizeHospitalNumber(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.toUpperCase().replace(/\s*([-/])\s*/g, '$1');
}

export function hospitalNumberKey(raw: unknown): string {
  return normalizeHospitalNumber(raw).replace(/[^A-Z0-9]/g, '');
}

/** A number that belonged to a registration merged into another. */
export function isRetiredHospitalNumber(raw: unknown): boolean {
  return normalizeHospitalNumber(raw).startsWith(RETIRED_PREFIX);
}

export interface NumberedPatient {
  id: string;
  hospitalNumber?: string | null;
  registeredHospitalId?: string | null;
  isActive?: boolean | null;
  mergedInto?: string | null;
}

/**
 * The hospital a number belongs to. Folder numbers are issued per hospital,
 * so the same digits at two hospitals are two patients. Older records filed
 * under no hospital ('' / 'global') share one scope of their own.
 */
export function hospitalNumberScope(registeredHospitalId: unknown): string {
  const s = registeredHospitalId == null ? '' : String(registeredHospitalId).trim();
  return s === 'global' ? '' : s;
}

/** Whether a record takes part in the uniqueness rule at all. */
export function countsForUniqueness(p: NumberedPatient): boolean {
  if (p.isActive === false) return false;
  if (p.mergedInto) return false;
  if (isRetiredHospitalNumber(p.hospitalNumber)) return false;
  return hospitalNumberKey(p.hospitalNumber) !== '';
}

/** The identity two registrations of the same patient share: scope + key. */
export function dedupeKey(p: NumberedPatient): string | null {
  if (!countsForUniqueness(p)) return null;
  return `${hospitalNumberScope(p.registeredHospitalId)}|${hospitalNumberKey(p.hospitalNumber)}`;
}

/** Registrations among `patients` that hold the same number in the same hospital. */
export function findHospitalNumberMatches<T extends NumberedPatient>(
  patients: Iterable<T>,
  hospitalNumber: unknown,
  registeredHospitalId: unknown,
  excludeId?: string,
): T[] {
  const key = hospitalNumberKey(hospitalNumber);
  if (!key) return [];
  const scope = hospitalNumberScope(registeredHospitalId);
  const out: T[] = [];
  for (const p of patients) {
    if (excludeId && p.id === excludeId) continue;
    if (!countsForUniqueness(p)) continue;
    if (hospitalNumberScope(p.registeredHospitalId) !== scope) continue;
    if (hospitalNumberKey(p.hospitalNumber) === key) out.push(p);
  }
  return out;
}

export interface DuplicateGroup<T> {
  /** scope|key */
  key: string;
  scope: string;
  patients: T[];
}

/** Every group of two or more registrations sharing a number, oldest first. */
export function groupDuplicateRegistrations<T extends NumberedPatient & { createdAt?: unknown }>(
  patients: Iterable<T>,
): DuplicateGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const p of patients) {
    const k = dedupeKey(p);
    if (!k) continue;
    const list = groups.get(k);
    if (list) list.push(p); else groups.set(k, [p]);
  }
  const time = (v: unknown) => {
    const t = v ? new Date(v as string).getTime() : NaN;
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  };
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      scope: key.slice(0, key.lastIndexOf('|')),
      patients: [...list].sort((a, b) => time(a.createdAt) - time(b.createdAt)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** CB + YY + 5 digits, the auto-number format both registration forms use. */
export function generateHospitalNumber(now: Date = new Date(), random: () => number = Math.random): string {
  const year = now.getFullYear().toString().slice(-2);
  const n = Math.floor(random() * 100000).toString().padStart(5, '0');
  return `CB${year}${n}`;
}

/**
 * An auto-number not already taken in `takenKeys` (hospital number keys).
 * The random part has only 100,000 values a year, so collisions do happen.
 */
export function generateUniqueHospitalNumber(
  takenKeys: Set<string>,
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  for (let i = 0; i < 50; i++) {
    const candidate = generateHospitalNumber(now, random);
    if (!takenKeys.has(hospitalNumberKey(candidate))) return candidate;
  }
  // Practically unreachable; fall back to a time-based suffix that cannot repeat.
  return `CB${now.getFullYear().toString().slice(-2)}${now.getTime().toString(36).toUpperCase()}`;
}
