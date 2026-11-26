import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { matchesPatientSearch } from '../patientSearch';

const amaka = { firstName: 'Amaka', middleName: 'Chioma', lastName: 'Ugwu', hospitalNumber: 'AH-2026-0042', phone: '0803 123 4567' };
const obi = { firstName: 'Obinna', lastName: 'Eze', hospitalNumber: 'AH-2026-0007', phone: '+2348099990000' };
const m = (q: string) => [amaka, obi].filter(p => matchesPatientSearch(p, q)).map(p => p.firstName);

describe('matchesPatientSearch', () => {
  it('matches a full name across fields, any order, any case', () => {
    expect(m('amaka ugwu')).toEqual(['Amaka']);
    expect(m('Ugwu Amaka')).toEqual(['Amaka']);
    expect(m('amaka chioma ugwu')).toEqual(['Amaka']);
    expect(m('chioma')).toEqual(['Amaka']);
  });

  it('every word must match something', () => {
    expect(m('amaka eze')).toEqual([]);
  });

  it('matches hospital number and name together', () => {
    expect(m('0042')).toEqual(['Amaka']);
    expect(m('ah-2026 eze')).toEqual(['Obinna']);
  });

  it('matches phones with or without spaces, local or international', () => {
    expect(m('08031234567')).toEqual(['Amaka']);
    expect(m('+234 803 123')).toEqual(['Amaka']);
    expect(m('2348031234567')).toEqual(['Amaka']);
    expect(m('08099990000')).toEqual(['Obinna']);
    expect(m('9999')).toEqual(['Obinna']);
  });

  it('an empty query matches everyone, and missing fields do not crash', () => {
    expect(m('  ')).toEqual(['Amaka', 'Obinna']);
    expect(matchesPatientSearch({ firstName: '', lastName: '', hospitalNumber: '', phone: '' }, 'x')).toBe(false);
  });
});

describe('patient list cards', () => {
  const page = readFileSync(join(process.cwd(), 'src/domains/patients/pages/PatientsListPage.tsx'), 'utf8');
  it('uses the shared search and labels every icon button', () => {
    expect(page).toMatch(/matchesPatientSearch\(patient, searchQuery\)/);
    const iconLinks = page.match(/className="btn-icon[^"]*"/g) ?? [];
    const labelled = page.match(/aria-label=\{?[`"']/g) ?? [];
    expect(iconLinks.length).toBeGreaterThan(0);
    expect(labelled.length).toBeGreaterThanOrEqual(iconLinks.length);
  });
  it('the whole phone card is a link to the patient', () => {
    expect(page).toMatch(/after:absolute after:inset-0/);
  });
});
