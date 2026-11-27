import { describe, it, expect } from 'vitest';
import { deterministicReview } from '../review';
import { validateConsult, consultToLines } from '../consult';
import { checkConsult } from '../hardRules';
import { buildConsultClinicianDocument, buildConsultPatientDocument } from '../pdf';
import { dermRheumLines, type DermRheumConsultRecord } from '../store';
import { PATIENT_COPY_EXCLUDE } from '../../clinical/procedureReview/pdf';
import { SCORE_TERMS } from '../../patient-pack/patientPack';
import { patientText } from '../../patient-pack/locale/en';
import { caseA } from './cases';

const reply = {
  summary: 'Probable pyoderma gangrenosum.', urgency: 'urgent',
  differential: [{ diagnosis: 'Pyoderma gangrenosum', kb_id: 'pyoderma_gangrenosum', likelihood: 'high', reasoning: 'Edge and IBD', supporting: ['IBD'], against: [] },
    { diagnosis: 'Squamous cell carcinoma', kb_id: 'marjolin_scc', likelihood: 'low', reasoning: 'Exclude', supporting: [], against: ['short history'] }],
  must_not_miss: [], investigations: [{ test: 'Edge biopsy with DIF', catalogue_code: 'histo_dif', why: 'mimics', urgency: 'soon', biopsy_site: 'edge' }, { test: 'ANCA', catalogue_code: 'anca', why: 'vasculitis', urgency: 'routine', biopsy_site: null }],
  management: { immediate: ['Moist dressings'], definitive: ['Prednisolone 0.75 mg/kg/day'] }, do_not: ['Do not debride'],
  referrals: [{ to: 'Dermatology', urgency: 'soon', why: 'confirm' }],
  patient_counselling: ['This is an inflammation, not an infection.', 'Take prednisolone 0.75 mg/kg each morning, e.g. with food.', 'Your score is 12.'],
  confidence: 'moderate', would_change_confidence: ['Biopsy'], photo_observations: [], hard_rules_quoted: [],
};

function record(): DermRheumConsultRecord {
  const c = caseA();
  const r = deterministicReview(c.data, c.ctx);
  const v = validateConsult(reply);
  if (!v.ok) throw new Error(v.errors.join());
  return { id: 'x', at: '2026-11-28T09:00:00Z', byName: 'Dr K', kbVersion: '1.0.0', screenVersion: '1.0.0', inputsHash: 'h', photosSent: 2,
    deterministic: { flags: r.screen.flags, candidates: r.screen.candidates, hardRules: r.hardRules }, consult: v.value, lines: consultToLines(v.value),
    checks: checkConsult(v.value, r.hardRules), missingHardRules: [] };
}
const text = (d: { sections: { title: string; body?: string; bullets?: string[]; table?: { rows: string[][] } }[] }) =>
  d.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? []), ...(s.table?.rows.flat() ?? [])]).join('\n');

describe('consult PDFs', () => {
  const input = () => ({ record: record(), patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date: new Date('2026-11-28T10:00:00') });
  it('clinician copy: AI labelled, hard rules with their check, sources and pending validation', () => {
    const t = text(buildConsultClinicianDocument(input()));
    expect(t).toMatch(/AI-DRAFTED/);
    expect(t).toMatch(/do NOT debride/);
    expect(t).toMatch(/Maverakis E/);
    expect(t).toMatch(/0\.75 mg\/kg/);
  });
  it('patient leaflet: plain names, plain tests, no mg/kg, "e.g.", scores or likelihoods', () => {
    const d = buildConsultPatientDocument(input());
    const t = text(d);
    expect(d.audience).toBe('patient');
    expect(t).toContain(patientText.plan.dermRheum.names.pyoderma_gangrenosum);
    expect(t).toContain('This is an inflammation, not an infection.');
    expect(t).toContain(patientText.plan.dermRheum.photosNote);
    expect(t).not.toMatch(/mg\/kg|e\.g\.|elemental|likelihood|\bscore\b/i);
    for (const s of d.sections) for (const b of s.bullets ?? []) { expect(PATIENT_COPY_EXCLUDE.test(b), b).toBe(false); expect(SCORE_TERMS.test(b), b).toBe(false); }
  });
});

describe('stored consults', () => {
  it('the plan shows the latest consult\'s lines and keeps accepted lines of older ones', () => {
    const a = record(), b = { ...record(), id: 'y', lines: record().lines.slice(0, 1) };
    const old = a.lines.find(l => l.section === 'investigations')!;
    const lines = dermRheumLines([a, b], [{ lineId: old.id, decision: 'accepted', at: '' }]);
    expect(lines.map(l => l.id)).toEqual([b.lines[0].id, ...(old.id === b.lines[0].id ? [] : [old.id])]);
    expect(dermRheumLines(undefined, [])).toEqual([]);
  });
});
