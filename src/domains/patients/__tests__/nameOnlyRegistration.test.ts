// The owner's rule: a patient can be registered with their name and nothing
// else. Both registration forms, their schemas and their save paths.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveOptionalDateOfBirth } from '../registration';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const TODAY = new Date(2026, 10, 26);

describe('optional date of birth / age', () => {
  it('nothing entered is fine', () => {
    expect(resolveOptionalDateOfBirth({ mode: 'dob', dobText: '' }, TODAY)).toEqual({ ok: true, dateOfBirth: undefined, dobEstimated: false });
    expect(resolveOptionalDateOfBirth({ mode: 'age', ageText: '  ' }, TODAY)).toEqual({ ok: true, dateOfBirth: undefined, dobEstimated: false });
  });
  it('anything entered must still be valid', () => {
    expect(resolveOptionalDateOfBirth({ mode: 'dob', dobText: '31/02/1990' }, TODAY).ok).toBe(false);
    expect(resolveOptionalDateOfBirth({ mode: 'age', ageText: 'abc' }, TODAY).ok).toBe(false);
    expect(resolveOptionalDateOfBirth({ mode: 'age', ageText: '45' }, TODAY)).toMatchObject({ ok: true, dobEstimated: true });
  });
});

describe('slim registration form', () => {
  const src = read('src/domains/patients/pages/SlimNewPatientPage.tsx');
  const schema = src.slice(src.indexOf('const slimSchema'), src.indexOf('type SlimFormData'));
  it('requires only the first and last name', () => {
    expect(schema).toMatch(/firstName: z\.string\(\)\.trim\(\)\.min\(1/);
    expect(schema).toMatch(/lastName: z\.string\(\)\.trim\(\)\.min\(1/);
    expect(schema).toMatch(/gender: z\.enum\(\['', 'male', 'female'\]\)\.optional\(\)/);
    expect(schema).toMatch(/phone: z\.string\(\)\.trim\(\)\.optional\(\)/);
    expect(schema).toMatch(/hospitalId: z\.string\(\)\.optional\(\)/);
    expect(schema).toMatch(/resolveOptionalDateOfBirth/);
    expect(schema).not.toMatch(/\.min\(7/);
  });
  it('stores no hospital as none, never an empty id', () => {
    expect(src).toMatch(/const hospitalId = data\.hospitalId\?\.trim\(\) \|\| undefined;/);
    expect(src).toMatch(/registeredHospitalId: hospitalId,/);
  });
  it('only the name labels are starred', () => {
    expect((src.match(/ \*<\/label>/g) ?? []).length).toBe(2);
  });
});

describe('comprehensive registration form', () => {
  const src = read('src/domains/patients/pages/NewPatientPage.tsx');
  const schema = src.slice(src.indexOf('const patientSchema'), src.indexOf('type PatientFormData'));
  it('requires only the name; blank selects pass', () => {
    expect(schema).toMatch(/hospitalId: z\.string\(\)\.optional\(\)/);
    expect(schema).toMatch(/gender: z\.enum\(\['', 'male', 'female'\]\)\.optional\(\)/);
    expect(schema).toMatch(/maritalStatus: z\.enum\(\['', 'single'/);
    const required = schema.match(/\.min\(\d+/g) ?? [];
    expect(required).toEqual(['.min(1', '.min(1']);
  });
  it('does not invent a date of birth, sex or marital status', () => {
    expect(src).not.toMatch(/dateOfBirth: data\.dateOfBirth \? new Date\(data\.dateOfBirth\) : new Date\(\)/);
    expect(src).not.toMatch(/data\.gender \|\| 'male'/);
    expect(src).not.toMatch(/data\.maritalStatus \|\| 'single'/);
  });
});
