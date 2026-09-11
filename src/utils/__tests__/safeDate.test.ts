/**
 * These helpers exist because date-fns format() throws on an invalid date, and
 * a patient can now be registered with a name, folder number and gender alone.
 * A half-registered patient must still be viewable, printable and referable —
 * so the one property that matters here is that nothing throws, whatever it is
 * handed.
 */

import { describe, it, expect } from 'vitest';
import { toValidDate, formatDateSafe, ageInYears, ageLabel } from '../safeDate';

const JUNK: unknown[] = [
  undefined, null, '', '   ', 'not a date', NaN, {}, [],
  new Date('nonsense'), '0000-00-00', 'Invalid Date',
];

describe('toValidDate', () => {
  it('accepts the shapes records actually store', () => {
    expect(toValidDate(new Date('1990-05-20'))?.getUTCFullYear()).toBe(1990);
    expect(toValidDate('1990-05-20')?.getUTCFullYear()).toBe(1990);
    expect(toValidDate('1990-05-20T00:00:00.000Z')?.getUTCFullYear()).toBe(1990);
    expect(toValidDate(Date.UTC(1990, 4, 20))?.getUTCFullYear()).toBe(1990);
  });

  it('returns null for anything unusable', () => {
    for (const v of JUNK) {
      expect(toValidDate(v as never), `should be null for ${String(v)}`).toBeNull();
    }
  });
});

describe('formatDateSafe', () => {
  it('formats a real date', () => {
    expect(formatDateSafe('1990-05-20', 'dd/MM/yyyy')).toBe('20/05/1990');
  });

  it('never throws, and falls back instead', () => {
    for (const v of JUNK) {
      expect(() => formatDateSafe(v as never)).not.toThrow();
      expect(formatDateSafe(v as never)).toBe('Not recorded');
    }
  });

  it('honours a caller-supplied fallback', () => {
    expect(formatDateSafe(undefined, 'dd/MM/yyyy', 'N/A')).toBe('N/A');
  });

  it('does not throw on a malformed pattern', () => {
    // A bad format string is a programming slip; it must not take down a page
    // that was only trying to print a date of birth.
    expect(() => formatDateSafe('1990-05-20', 'qqqqqqqq')).not.toThrow();
  });
});

describe('ageInYears / ageLabel', () => {
  it('computes a plausible age', () => {
    const twenty = new Date();
    twenty.setFullYear(twenty.getFullYear() - 20);
    expect(ageInYears(twenty)).toBe(20);
    expect(ageLabel(twenty)).toBe('20 years');
  });

  it('returns null rather than NaN when the date is missing', () => {
    for (const v of JUNK) {
      expect(ageInYears(v as never), `should be null for ${String(v)}`).toBeNull();
      // The visible failure this replaces was a literal "NaN years" on screen.
      expect(ageLabel(v as never)).not.toContain('NaN');
    }
  });

  it('uses the supplied fallback label', () => {
    expect(ageLabel(null, 'Unknown')).toBe('Unknown');
  });
});
