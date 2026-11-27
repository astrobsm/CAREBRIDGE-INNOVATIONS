import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  saveEncounterDraft, loadEncounterDraft, clearEncounterDraft, draftHasContent, encounterDraftKey,
  type DraftStorage,
} from '../services/encounterDraft';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

function fakeStorage(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: k => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
  };
}

const empty = { form: { type: 'follow_up' }, diagnoses: [], physicalExam: {}, lmpDate: '', lmpUnknown: false };

describe('encounter draft', () => {
  it('an untouched form (only the auto-chosen type) is not a draft', () => {
    expect(draftHasContent(empty)).toBe(false);
    expect(draftHasContent({ ...empty, form: { type: 'initial', notes: '   ' } })).toBe(false);
  });

  it('typed notes, a diagnosis or an examination finding are', () => {
    expect(draftHasContent({ ...empty, form: { chiefComplaint: 'Burn to hand' } })).toBe(true);
    expect(draftHasContent({ ...empty, diagnoses: [{ id: 'd' }] })).toBe(true);
    expect(draftHasContent({ ...empty, physicalExam: { generalAppearance: 'Pale' } })).toBe(true);
  });

  it('round-trips per patient', () => {
    const st = fakeStorage();
    const d = { ...empty, form: { chiefComplaint: 'Burn to hand', notes: 'Dressing intact' }, lmpDate: '2026-11-01' };
    saveEncounterDraft(st, 'p1', d, new Date('2026-11-26T10:00:00Z'));
    const back = loadEncounterDraft(st, 'p1')!;
    expect(back.form).toEqual(d.form);
    expect(back.lmpDate).toBe('2026-11-01');
    expect(back.savedAt).toBe('2026-11-26T10:00:00.000Z');
    expect(loadEncounterDraft(st, 'p2')).toBeNull();
  });

  it('saving an empty form removes the draft rather than storing nothing', () => {
    const st = fakeStorage();
    saveEncounterDraft(st, 'p1', { ...empty, form: { notes: 'x' } });
    saveEncounterDraft(st, 'p1', empty);
    expect(st.data.has(encounterDraftKey('p1'))).toBe(false);
  });

  it('ignores corrupt or foreign data, and clears', () => {
    const st = fakeStorage();
    st.setItem(encounterDraftKey('p1'), '{bad json');
    expect(loadEncounterDraft(st, 'p1')).toBeNull();
    st.setItem(encounterDraftKey('p1'), JSON.stringify({ v: 99, form: { notes: 'x' } }));
    expect(loadEncounterDraft(st, 'p1')).toBeNull();
    saveEncounterDraft(st, 'p1', { ...empty, form: { notes: 'x' } });
    clearEncounterDraft(st, 'p1');
    expect(loadEncounterDraft(st, 'p1')).toBeNull();
  });
});

describe('ClinicalEncounterPage wiring', () => {
  const src = read('src/domains/clinical/pages/ClinicalEncounterPage.tsx');
  const hook = read('src/hooks/useUnsavedChangesGuard.ts');

  it('guards unload, and its own navigation buttons ask first', () => {
    expect(hook).toMatch(/addEventListener\('beforeunload'/);
    expect(src).toMatch(/useUnsavedChangesGuard\(isDirty\)/);
    // No navigate() button bypasses the guard. (The post-save modal navigates
    // from handlers after the draft is cleared.)
    expect(src).not.toMatch(/onClick=\{\(\) => navigate\(/);
    expect(src).toMatch(/leaveTo\(`\/patients\/\$\{patientId\}`\)/);
  });

  it('restores the draft with a visible note and a discard button, and clears it on save', () => {
    expect(src).toMatch(/loadEncounterDraft\(localStorage, patientId\)/);
    expect(src).toMatch(/Draft restored/);
    expect(src).toMatch(/onClick=\{discardDraft\}/);
    const submit = src.slice(src.indexOf('const onSubmit'), src.indexOf("toast.success('Clinical encounter saved successfully!')"));
    expect(submit).toMatch(/clearEncounterDraft\(localStorage, patientId\)/);
  });

  it('the app uses a BrowserRouter, so useBlocker is not used', () => {
    expect(read('src/bootEmr.tsx')).toMatch(/<BrowserRouter>/);
    expect(hook).not.toMatch(/import[^;]*useBlocker/);
  });
});
