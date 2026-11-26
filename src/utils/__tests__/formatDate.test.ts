import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatTime } from '../formatDate';

describe('formatDate / formatDateTime', () => {
  it('formats as dd MMM yyyy', () => {
    expect(formatDate(new Date(2026, 10, 26, 14, 30))).toBe('26 Nov 2026');
    expect(formatDate(new Date(2026, 0, 5))).toBe('05 Jan 2026');
  });

  it('adds a 24-hour time', () => {
    expect(formatDateTime(new Date(2026, 10, 26, 14, 30))).toBe('26 Nov 2026, 14:30');
    expect(formatTime(new Date(2026, 10, 26, 9, 5))).toBe('09:05');
  });

  it('accepts ISO strings and epoch numbers', () => {
    const d = new Date(2026, 10, 26, 8, 0);
    expect(formatDate(d.toISOString())).toBe('26 Nov 2026');
    expect(formatDateTime(d.getTime())).toBe('26 Nov 2026, 08:00');
  });

  it('never throws on missing or invalid values', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate(null, '')).toBe('');
    expect(formatDate('not a date')).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });
});
