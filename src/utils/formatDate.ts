/**
 * The one date format for screens: "26 Nov 2026" and "26 Nov 2026, 14:30".
 *
 * Screens used to show 15+ formats (26/11/2026, Nov 26, 2026, 2026-11-26,
 * Thursday, November 26th ...). New and reworked screens use these two
 * helpers. They never throw: a missing or unparseable value gives `fallback`.
 */

import { format } from 'date-fns';
import { toValidDate } from './safeDate';

type DateInput = Date | string | number | null | undefined;

/** "26 Nov 2026" */
export function formatDate(value: DateInput, fallback = '—'): string {
  const d = toValidDate(value);
  return d ? format(d, 'dd MMM yyyy') : fallback;
}

/** "26 Nov 2026, 14:30" (24-hour clock, local time) */
export function formatDateTime(value: DateInput, fallback = '—'): string {
  const d = toValidDate(value);
  return d ? format(d, 'dd MMM yyyy, HH:mm') : fallback;
}

/** "14:30" */
export function formatTime(value: DateInput, fallback = '—'): string {
  const d = toValidDate(value);
  return d ? format(d, 'HH:mm') : fallback;
}
