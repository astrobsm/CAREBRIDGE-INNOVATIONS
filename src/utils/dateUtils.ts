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
 * Safely converts a value to an ISO string for storage.
 * Returns null if the date is invalid.
 */
export function toISOString(value: Date | string | number | null | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

/**
 * Ensures a value is safe to render as a React child.
 * Converts Date objects, Maps, Sets, and other objects to strings.
 * This prevents React error #310 ("Objects are not valid as a React child").
 * 
 * @param value - Any value that might be rendered
 * @param fallback - Fallback string for invalid values
 * @returns A string or number that's safe to render
 */
export function safeRender(value: unknown, fallback: string = ''): string | number {
  // Null/undefined -> fallback
  if (value === null || value === undefined) {
    return fallback;
  }
  
  // Primitives are safe
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return String(value);
  
  // Date objects -> formatted string
  if (value instanceof Date) {
    console.warn('[safeRender] Caught Date object being rendered directly');
    return isValid(value) ? format(value, 'PPP') : fallback;
  }
  
  // Map -> JSON string
  if (value instanceof Map) {
    console.warn('[safeRender] Caught Map being rendered directly');
    return JSON.stringify(Object.fromEntries(value));
  }
  
  // Set -> JSON array string
  if (value instanceof Set) {
    console.warn('[safeRender] Caught Set being rendered directly');
    return JSON.stringify(Array.from(value));
  }
  
  // Arrays are generally safe, but log for debugging
  if (Array.isArray(value)) {
    console.warn('[safeRender] Array being rendered - this may cause issues');
    return JSON.stringify(value);
  }
  
  // Plain objects -> JSON string
  if (typeof value === 'object') {
    console.warn('[safeRender] Caught object being rendered directly:', Object.keys(value));
    return JSON.stringify(value);
  }
  
  // Symbol, function, etc -> fallback
  console.warn('[safeRender] Unknown value type being rendered:', typeof value);
  return fallback;
}