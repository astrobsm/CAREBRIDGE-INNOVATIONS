import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { consultationOptions, hubQuickActions, hubModuleLinks, consultationChooserHref } from '../patientHubLinks';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const ID = 'pat 1/x';
const ENC = encodeURIComponent(ID);

describe('patient hub links', () => {
  it("every quick action and module link carries the patient", () => {
    for (const l of [...hubQuickActions(ID), ...hubModuleLinks(ID)]) {
      expect(l.href, l.label).toContain(ENC);
    }
  });

  it('books with the patient preselected and opens education for them', () => {
    const byId = Object.fromEntries(hubQuickActions('P').map(l => [l.id, l.href]));
    expect(byId.book).toBe('/appointments/new?patientId=P');
    expect(byId.education).toBe('/patient-education?patientId=P');
    expect(byId.surgery).toBe('/surgery/workflow/P');
    expect(byId.procedure_review).toBe('/patients/P/procedure-review');
  });

  it('the hub offers the specialty modules with the patient', () => {
    const ids = hubModuleLinks('P').map(l => l.id);
    expect(ids).toEqual(expect.arrayContaining(['wound-monitor', 'nutrition', 'burns', 'npwt', 'keloid', 'scar']));
  });
});

describe('Start consultation chooser', () => {
  it('lists each way to document a visit once', () => {
    const o = consultationOptions('P', true);
    const all = [...o.primary, ...o.procedureReview, o.quickNote];
    expect(all.map(x => x.id)).toEqual(['initial', 'follow_up', 'wound_clinic', 'derm_rheum', 'pre_op', 'post_op', 'pr_follow_up', 'wound_review', 'quick_note']);
    expect(o.primary[2].href).toBe('/patients/P?tab=visits&clerk=initial&condition=chronic_ulcer');
    expect(o.primary[3].href).toBe('/derm-rheum?patient=P');
    expect(new Set(all.map(x => x.href)).size).toBe(all.length);
    expect(o.primary[0].href).toBe('/patients/P?tab=visits&clerk=initial');
    expect(o.primary[1].href).toBe('/patients/P?tab=visits&clerk=follow_up');
    expect(o.procedureReview.map(x => x.href.split('phase=')[1])).toEqual(['pre_op', 'post_op', 'follow_up', 'wound_review']);
    expect(o.quickNote.href).toBe('/patients/P/encounter');
  });

  it('without a structured clerking, follow-up uses the follow-up form', () => {
    expect(consultationOptions('P', false).primary[1].href).toBe('/patients/P/follow-up');
  });

  it('the hub opens the chooser and the structured panel from the URL', () => {
    const page = read('src/domains/patients/pages/PatientDetailsPage.tsx');
    expect(page).toMatch(/<StartConsultationSheet/);
    expect(page).toMatch(/searchParams\.get\('consult'\) === '1'/);
    expect(page).toMatch(/autoOpen=\{autoOpen\}/);
    expect(page).toMatch(/hubModuleLinks\(patient\.id\)/);
    expect(page).toMatch(/joinAddress\(patient\.address, patient\.city, patient\.state\)/);
    expect(page).not.toMatch(/\{patient\.address\}, \{patient\.city\}/);
  });

  it('the encounter form links back to the chooser instead of its own competing buttons', () => {
    const enc = read('src/domains/clinical/pages/ClinicalEncounterPage.tsx');
    expect(enc).toMatch(/leaveTo\(consultationChooserHref\(patientId\)\)/);
    expect(enc).not.toMatch(/Quick Follow-Up Form/);
    expect(enc).not.toMatch(/Structured clerking \(recommended\)/);
    expect(enc).not.toMatch(/setStructuredClerking/);
    expect(consultationChooserHref('P')).toBe('/patients/P?consult=1');
  });
});
