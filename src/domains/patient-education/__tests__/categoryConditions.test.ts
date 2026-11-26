import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EDUCATION_CATEGORIES } from '../types';
import { CONDITIONS_BY_CATEGORY, buildEducationCategories } from '../categoryConditions';
import { preparedForLine } from '../handoutText';

describe('patient education categories', () => {
  it('maps every category code (N used to be missing and showed 0 conditions)', () => {
    for (const cat of EDUCATION_CATEGORIES) {
      expect(CONDITIONS_BY_CATEGORY[cat.code], `category ${cat.code}`).toBeDefined();
    }
  });

  it('Day Case / Minor Procedures (N) has its conditions', () => {
    const n = buildEducationCategories().find((c) => c.code === 'N');
    expect(n?.conditions.length).toBeGreaterThan(0);
    expect(n?.conditions.every((c) => c.category === 'N')).toBe(true);
  });

  it('never lists an empty category', () => {
    expect(buildEducationCategories().every((c) => c.conditions.length > 0)).toBe(true);
  });
});

describe('personalised handout', () => {
  it('puts the name and hospital number on the "Prepared for" line', () => {
    expect(preparedForLine('Ada Obi', 'AH-0042')).toBe('Prepared for: Ada Obi (Hospital No: AH-0042)');
    expect(preparedForLine('Ada Obi')).toBe('Prepared for: Ada Obi');
    expect(preparedForLine('Ada Obi', '  ')).toBe('Prepared for: Ada Obi');
  });

  it('the page reads ?patientId= and scrolls the chosen condition into view', () => {
    const page = readFileSync(join(process.cwd(), 'src/domains/patient-education/pages/PatientEducationPage.tsx'), 'utf8');
    expect(page).toMatch(/searchParams\.get\('patientId'\)/);
    expect(page).toMatch(/db\.patients\.get\(patientId\)/);
    expect(page).toMatch(/detailsRef\.current\?\.scrollIntoView/);
  });
});
