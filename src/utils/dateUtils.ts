/**
 * Date Utility Functions
 * 
 * Provides safe date formatting to prevent React error #310
 * ("Objects are not valid as a React child")
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Safely converts a date value to a Date object.
 * Handles: Date objects, ISO strings, timestamps, null/undefined
 */
export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  
  if (typeof value === 'string') {
    // Try parsing as ISO string
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }
  
  if (typeof value === 'number') {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  
  return null;
}

/**
 * Safely formats a date value to a string.
 * Returns a fallback string if the date is invalid.
 */
export function safeFormat(
  value: Date | string | number | null | undefined,
  formatString: string = 'PPP',
  fallback: string = 'N/A'
): string {
  const date = toDate(value);
  if (!date) return fallback;
  
  try {
    return format(date, formatString);
  } catch (error) {
    console.warn('[dateUtils] Failed to format date:', value, error);
    return fallback;
  }
}

/**
 * Safely formats a date as relative time (e.g., "2 hours ago").
 * Returns a fallback string if the date is invalid.
 */
export function safeFormatDistanceToNow(
  value: Date | string | number | null | undefined,
  options?: { addSuffix?: boolean },
  fallback: string = 'recently'
): string {
  const date = toDate(value);
  if (!date) return fallback;
  
  try {
    return formatDistanceToNow(date, options);
  } catch (error) {
    console.warn('[dateUtils] Failed to format distance:', value, error);
    return fallback;
  }
}

/**
 * Checks if a value is a valid date.
 */
export function isValidDate(value: Date | string | number | null | undefined): boolean {
  return toDate(value) !== null;
}

/**
 * Converts a date value to an ISO string.
 * Returns null if the date is invalid.
 */
export function toISOString(value: Date | string | number | null | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}
