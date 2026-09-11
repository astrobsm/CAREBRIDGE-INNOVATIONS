/**
 * Date formatting that cannot crash a screen.
 *
 * date-fns `format()` THROWS a RangeError on an invalid date rather than
 * returning something harmless, so `format(new Date(patient.dateOfBirth), …)`
 * takes down the whole page the moment a record is missing that field.
 *
 * That used to be theoretical, because every patient came through the full
 * registration form. It is not any more: a patient can be registered from the
 * wound module with a name, folder number and gender only, so the rest of the
 * profile — date of birth included — is legitimately absent until someone fills
 * it in. A half-registered patient must still be viewable, printable and
 * referable.
 *
 * Use these instead of calling `format` on anything that came off a record.
 */

import { format, differenceInYears } from 'date-fns';

/** Parse to a valid Date, or null. Accepts Date, ISO string, epoch number. */
export function toValidDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date, returning `fallback` when it is missing or unparseable.
 * Never throws.
 */
export function formatDateSafe(
  value: Date | string | number | null | undefined,
  pattern = 'dd/MM/yyyy',
  fallback = 'Not recorded',
): string {
  const d = toValidDate(value);
  if (!d) return fallback;
  try {
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

/** Whole years since `value`, or null when it is missing or unparseable. */
export function ageInYears(value: Date | string | number | null | undefined): number | null {
  const d = toValidDate(value);
  if (!d) return null;
  const years = differenceInYears(new Date(), d);
  return Number.isFinite(years) ? years : null;
}

/**
 * Age rendered for display, e.g. "34 years" — or `fallback` when unknown.
 * Prevents the "NaN years" that an unguarded differenceInYears produces.
 */
export function ageLabel(
  value: Date | string | number | null | undefined,
  fallback = 'Age not recorded',
): string {
  const years = ageInYears(value);
  return years === null ? fallback : `${years} years`;
}
