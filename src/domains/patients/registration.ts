/**
 * Quick registration rules (pure; no React, no Dexie).
 *
 * Required: first name, last name, sex, phone, and EITHER an exact date of
 * birth OR an age in years. Everything else is optional.
 *
 * Many patients do not know their exact birthday. An age-only registration
 * stores an estimated date of birth of 1 July of (this year - age) — the
 * middle of the year, so the computed age is never more than six months out —
 * and marks it `dobEstimated` so screens can say "estimated".
 *
 * Dates of birth are date-only values. They are built at UTC midnight, the
 * same instant `new Date('yyyy-mm-dd')` gives, because the cloud column is a
 * DATE and the ISO string is cut at the 'T': a LOCAL midnight in WAT (UTC+1)
 * would be the previous day in UTC and land in the cloud a day early.
 */

export type DobMode = 'dob' | 'age';

/** Build a date-only value (UTC midnight). Month is 1-12. */
export function dateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Parse "dd/mm/yyyy" (also accepts "-" or "." separators and 1-digit day or
 * month). Returns null when it is not a real calendar date.
 */
export function parseDdMmYyyy(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = dateOnly(year, month, day);
  // Reject rollovers such as 31/02/2000 -> 02/03/2000.
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/** Format a date-only value as "dd/mm/yyyy". */
export function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Auto-insert slashes while typing: "2611" -> "26/11", "26112026" -> "26/11/2026". */
export function maskDdMmYyyy(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Estimated date of birth for an age in years: 1 July of (this year - age). */
export function estimatedDobFromAge(ageYears: number, today: Date = new Date()): Date {
  return dateOnly(today.getFullYear() - Math.floor(ageYears), 7, 1);
}

/** Today's calendar date (local) as a date-only value, for comparisons. */
function todayDateOnly(today: Date): Date {
  return dateOnly(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

export const MAX_AGE_YEARS = 130;

export interface DobInput {
  mode: DobMode;
  dobText?: string;
  ageText?: string;
}

export type DobResult =
  | { ok: true; dateOfBirth: Date; dobEstimated: boolean }
  | { ok: false; error: string };

/** Resolve the date-of-birth part of the form into a stored value. */
export function resolveDateOfBirth(input: DobInput, today: Date = new Date()): DobResult {
  if (input.mode === 'age') {
    const text = (input.ageText ?? '').trim();
    if (!text) return { ok: false, error: 'Enter the age in years' };
    if (!/^\d{1,3}$/.test(text)) return { ok: false, error: 'Age must be a whole number of years' };
    const age = Number(text);
    if (age > MAX_AGE_YEARS) return { ok: false, error: `Age must be ${MAX_AGE_YEARS} or less` };
    return { ok: true, dateOfBirth: estimatedDobFromAge(age, today), dobEstimated: true };
  }

  const text = (input.dobText ?? '').trim();
  if (!text) return { ok: false, error: 'Enter the date of birth (dd/mm/yyyy), or switch to age only' };
  const dob = parseDdMmYyyy(text);
  if (!dob) return { ok: false, error: 'Date of birth must be a real date as dd/mm/yyyy' };
  if (dob.getTime() > todayDateOnly(today).getTime()) return { ok: false, error: 'Date of birth cannot be in the future' };
  if (today.getFullYear() - dob.getUTCFullYear() > MAX_AGE_YEARS) return { ok: false, error: 'Check the year of birth' };
  return { ok: true, dateOfBirth: dob, dobEstimated: false };
}

export type OptionalDobResult =
  | { ok: true; dateOfBirth?: Date; dobEstimated: boolean }
  | { ok: false; error: string };

/**
 * The date of birth / age is optional: nothing entered is fine (no DOB
 * stored); anything entered must still be valid.
 */
export function resolveOptionalDateOfBirth(input: DobInput, today: Date = new Date()): OptionalDobResult {
  const text = (input.mode === 'age' ? input.ageText : input.dobText) ?? '';
  if (!text.trim()) return { ok: true, dateOfBirth: undefined, dobEstimated: false };
  return resolveDateOfBirth(input, today);
}

/** Whole years between a date-only DOB and today (local calendar date). */
export function ageFromDob(dob: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getUTCMonth() ||
    (today.getMonth() === dob.getUTCMonth() && today.getDate() < dob.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

export interface HospitalOption {
  id: string;
  isActive?: boolean;
}

/**
 * Which hospital to register at, and whether to ask.
 *
 * A private practice has one hospital: register there and do not show a
 * picker. With several (or none yet), default to the user's own hospital and
 * show the picker.
 */
export function registrationHospital(
  hospitals: HospitalOption[],
  userHospitalId?: string | null,
): { defaultId: string; showPicker: boolean } {
  const active = hospitals.filter((h) => h.isActive !== false);
  if (active.length === 1) return { defaultId: active[0].id, showPicker: false };
  return { defaultId: userHospitalId || '', showPicker: true };
}
