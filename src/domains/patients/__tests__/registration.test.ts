import { describe, it, expect } from 'vitest';
import {
  parseDdMmYyyy,
  formatDdMmYyyy,
  maskDdMmYyyy,
  estimatedDobFromAge,
  resolveDateOfBirth,
  ageFromDob,
  registrationHospital,
  dateOnly,
} from '../registration';

// Local wall-clock "today" values; DOBs are date-only (UTC midnight).
const TODAY = new Date(2026, 10, 26, 9, 0); // 26 Nov 2026, 09:00 local

describe('dd/mm/yyyy', () => {
  it('parses real dates to UTC midnight', () => {
    const d = parseDdMmYyyy('05/03/1990')!;
    expect(d.toISOString()).toBe('1990-03-05T00:00:00.000Z');
    expect(parseDdMmYyyy('5-3-1990')!.toISOString()).toBe('1990-03-05T00:00:00.000Z');
    expect(parseDdMmYyyy('29/02/2024')).not.toBeNull();
  });

  it('rejects impossible or malformed dates', () => {
    expect(parseDdMmYyyy('31/02/2000')).toBeNull();
    expect(parseDdMmYyyy('29/02/2023')).toBeNull();
    expect(parseDdMmYyyy('13/13/2000')).toBeNull();
    expect(parseDdMmYyyy('1990-03-05')).toBeNull(); // ISO is not dd/mm/yyyy
    expect(parseDdMmYyyy('')).toBeNull();
  });

  it('formats and round-trips', () => {
    expect(formatDdMmYyyy(dateOnly(1990, 3, 5))).toBe('05/03/1990');
    expect(formatDdMmYyyy(parseDdMmYyyy('26/11/2026')!)).toBe('26/11/2026');
  });

  it('masks digits while typing', () => {
    expect(maskDdMmYyyy('26')).toBe('26');
    expect(maskDdMmYyyy('2611')).toBe('26/11');
    expect(maskDdMmYyyy('26112026')).toBe('26/11/2026');
    expect(maskDdMmYyyy('26/11/20269')).toBe('26/11/2026');
  });
});

describe('date of birth or age', () => {
  it('estimates 1 July of (this year - age)', () => {
    expect(estimatedDobFromAge(40, TODAY).toISOString()).toBe('1986-07-01T00:00:00.000Z');
    // Early January in local time is still the new year.
    expect(estimatedDobFromAge(40, new Date(2027, 0, 1, 0, 30)).toISOString()).toBe('1987-07-01T00:00:00.000Z');
  });

  it('age-only is marked estimated', () => {
    const r = resolveDateOfBirth({ mode: 'age', ageText: '35' }, TODAY);
    expect(r).toEqual({ ok: true, dateOfBirth: dateOnly(1991, 7, 1), dobEstimated: true });
    expect(resolveDateOfBirth({ mode: 'age', ageText: '0' }, TODAY).ok).toBe(true);
  });

  it('exact DOB is not estimated', () => {
    const r = resolveDateOfBirth({ mode: 'dob', dobText: '05/03/1990' }, TODAY);
    expect(r).toEqual({ ok: true, dateOfBirth: dateOnly(1990, 3, 5), dobEstimated: false });
  });

  it('requires one of them, and sane values', () => {
    expect(resolveDateOfBirth({ mode: 'dob', dobText: '' }, TODAY).ok).toBe(false);
    expect(resolveDateOfBirth({ mode: 'age', ageText: '' }, TODAY).ok).toBe(false);
    expect(resolveDateOfBirth({ mode: 'age', ageText: '4.5' }, TODAY).ok).toBe(false);
    expect(resolveDateOfBirth({ mode: 'age', ageText: '131' }, TODAY).ok).toBe(false);
    expect(resolveDateOfBirth({ mode: 'dob', dobText: '27/11/2026' }, TODAY).ok).toBe(false); // tomorrow
    expect(resolveDateOfBirth({ mode: 'dob', dobText: '26/11/2026' }, TODAY).ok).toBe(true); // born today
    expect(resolveDateOfBirth({ mode: 'dob', dobText: '01/01/1800' }, TODAY).ok).toBe(false);
  });

  it('computes age on the local calendar date', () => {
    expect(ageFromDob(dateOnly(1990, 11, 26), TODAY)).toBe(36);
    expect(ageFromDob(dateOnly(1990, 11, 27), TODAY)).toBe(35);
    expect(ageFromDob(estimatedDobFromAge(40, TODAY), TODAY)).toBe(40);
  });
});

describe('registration hospital', () => {
  it('uses the only active hospital and hides the picker', () => {
    expect(registrationHospital([{ id: 'h1', isActive: true }, { id: 'old', isActive: false }], 'x'))
      .toEqual({ defaultId: 'h1', showPicker: false });
  });

  it('shows the picker with several hospitals, defaulting to the user\'s', () => {
    expect(registrationHospital([{ id: 'h1' }, { id: 'h2' }], 'h2')).toEqual({ defaultId: 'h2', showPicker: true });
    expect(registrationHospital([], undefined)).toEqual({ defaultId: '', showPicker: true });
  });
});
