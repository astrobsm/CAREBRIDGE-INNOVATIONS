import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isArchivedPatient, listablePatients } from '../services/patientArchiveRules';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('patient archive', () => {
  const rows = [
    { id: 'a', isActive: true },
    { id: 'b', isActive: false },
    { id: 'c', isActive: undefined as unknown as boolean }, // legacy row, never flagged
    { id: 'd', isActive: 0 as unknown as boolean },          // legacy numeric flag
    { id: 'e', isActive: true, mergedInto: 'a' },
  ];

  it('treats only an explicit false (or 0) as archived', () => {
    expect(rows.map(r => isArchivedPatient(r))).toEqual([false, true, false, true, false]);
  });

  it('hides archived and merged rows by default', () => {
    expect(listablePatients(rows, false).map(r => r.id)).toEqual(['a', 'c']);
  });

  it('"Show archived" adds archived rows but never merged ones', () => {
    expect(listablePatients(rows, true).map(r => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('the patients list never hard-deletes a patient', () => {
    const page = read('src/domains/patients/pages/PatientsListPage.tsx');
    expect(page).not.toMatch(/db\.patients\.delete\(/);
    expect(page).toMatch(/archivePatient\(/);
  });

  it('archiving syncs the patient row to the cloud', () => {
    const svc = read('src/domains/patients/services/patientArchive.ts');
    expect(svc).toMatch(/isActive, updatedAt: new Date\(\)/);
    expect(svc).toMatch(/syncRecord\('patients'/);
  });
});

describe('patient edit link', () => {
  it('PatientDetailsPage honours ?edit=true by opening its edit modal', () => {
    const page = read('src/domains/patients/pages/PatientDetailsPage.tsx');
    expect(page).toMatch(/searchParams\.get\('edit'\) === 'true'[\s\S]{0,80}setShowEditModal\(true\)/);
  });

  it('"View Treatment Plan" links to the plan itself, not a new-plan form', () => {
    const page = read('src/domains/patients/pages/PatientDetailsPage.tsx');
    expect(page).not.toMatch(/treatment-plans\/new\?patientId/);
    expect(page).toMatch(/\/treatment-planning\/\$\{activeAdmission\.treatmentPlanId\}/);
  });
});
