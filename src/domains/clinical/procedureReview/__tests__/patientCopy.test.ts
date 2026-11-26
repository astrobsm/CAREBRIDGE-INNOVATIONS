/**
 * The patient copy of a procedure review: what WhatsApp sends to the
 * patient's phone. It must carry the plan, counselling, consent information,
 * follow-up and warning signs, and never the risk flags, scores, assessment
 * narrative or any psychological / safeguarding content.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildReviewDocument, renderReviewDocument, PATIENT_COPY_EXCLUDE } from '../pdf';
import { computeReview, toStored } from '../compute';
import { emptyCounselling } from '../consent';
import { skinGraft } from '../procedures/reconstruction/skinGraft';
import { woundCareReview } from '../procedures/wound/woundCareReview';
import { adult, provocativeAnswers } from './fixtures';
import type { EncounterAnswers } from '../../data/encounterModel';
import type { ProcedureModule, ReviewPhase, ReviewPatient } from '../types';

function docsFor(module: ProcedureModule, phase: ReviewPhase, answers: EncounterAnswers, patient: ReviewPatient = adult()) {
  const input = {
    module, phase, answers, patient, prior: [],
    counselling: { ...emptyCounselling(), decision: 'consents' as const, topicsDiscussed: ['Clinical photography'] },
    pdfPatient: { name: 'Ada Obi', hospitalNumber: 'UNTH-1' }, clinician: { id: 'u1', name: 'Dr Eze', role: 'registrar' }, now: '2026-11-06T09:00:00Z',
  };
  const c = computeReview(input);
  const stored = toStored(input, c, { status: 'draft', version: 1, createdBy: 'u1', createdByName: 'Dr Eze' });
  const base = { module, phase, reading: c.reading, review: stored, patient: { name: 'Ada Obi', hospitalNumber: 'UNTH-1' }, date: new Date('2026-11-06') };
  return {
    c,
    clinician: buildReviewDocument(base),
    patient: buildReviewDocument({ ...base, audience: 'patient' }),
  };
}

const allText = (d: ReturnType<typeof buildReviewDocument>) => [
  d.title, d.subtitle, ...Object.values(d.meta), d.footer,
  ...d.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? []), ...(s.table ? [...s.table.headers, ...s.table.rows.flat()] : [])]),
].join('\n');

describe('procedure review patient copy', () => {
  const { c, clinician, patient } = docsFor(skinGraft, 'pre_op', provocativeAnswers(skinGraft, 'pre_op'));

  it('the fixture really has flags and scores (so their absence means something)', () => {
    expect(c.reading.flags.length).toBeGreaterThan(0);
    expect(clinician.sections.some(s => s.kind === 'flags')).toBe(true);
    expect(clinician.sections.some(s => s.kind === 'scores')).toBe(true);
  });

  it('has no flags, scores, assessment, barriers, comparison or declaration sections', () => {
    const kinds = new Set(patient.sections.map(s => s.kind));
    for (const k of ['flags', 'scores', 'assessment', 'barriers', 'comparison', 'declaration'] as const) expect(kinds.has(k)).toBe(false);
    expect(patient.audience).toBe('patient');
  });

  it('carries no flag text, no score abbreviations and no RED / AMBER marker', () => {
    const text = allText(patient);
    expect(text).not.toMatch(/\bRED\b|\bAMBER\b/);
    for (const f of c.reading.flags) expect(text).not.toContain(f.reason);
    // Score names: the acronyms (MUST, ASA, STOP-BANG, PHQ-9...) and the
    // named scales. ("Appearance" is also a counselling topic, so word-named
    // scores are checked through their results instead.)
    const scored = c.reading.scores.filter(x => x.total != null);
    for (const s of scored.filter(x => /^[A-Z][A-Z0-9-]+$/.test(x.abbreviation))) {
      expect(text, s.abbreviation).not.toMatch(new RegExp(`\\b${s.abbreviation}\\b`));
    }
    expect(text).not.toMatch(/Caprini|Braden|Apfel|RCRI|STOP-BANG/);
    for (const s of scored) {
      if (s.max != null) expect(text).not.toContain(`${s.total} / ${s.max}`);
    }
    expect(text).not.toMatch(/\(why:/);
    expect(text).not.toMatch(/URGENT:/);
    // Clinician instructions raised by flags stay out of the patient copy.
    expect(text).not.toMatch(/examine now|recheck in 15 minutes|Interpret albumin/i);
  });

  it('carries the plan, follow-up and warning signs, and the consent information', () => {
    const kinds = patient.sections.map(s => s.kind);
    expect(kinds).toContain('plan');
    expect(kinds).toContain('counselling');
    expect(kinds).toContain('summary');
    expect(kinds).toContain('warning_signs');
    expect(kinds).toContain('consent');
    expect(patient.sections.find(s => s.kind === 'warning_signs')!.bullets!.length).toBeGreaterThan(0);
    expect(patient.fileName).toMatch(/-patient-copy\.pdf$/);
  });

  it('nothing in it matches the exclusion list', () => {
    for (const s of patient.sections.filter(x => x.kind !== 'consent' && x.kind !== 'summary')) {
      for (const b of s.bullets ?? []) expect(b, `${s.title}: ${b}`).not.toMatch(PATIENT_COPY_EXCLUDE);
    }
  });

  it('renders', () => {
    expect(renderReviewDocument(patient).getNumberOfPages()).toBeGreaterThan(0);
  });
});

describe('patient copy with a safeguarding concern (child)', () => {
  const { clinician, patient } = docsFor(skinGraft, 'pre_op', { 'core.child_safeguarding': 'concern' }, adult({ ageYears: 3 }));

  it('the clinician PDF has the safeguarding problem; the patient copy has none of it', () => {
    expect(allText(clinician)).toMatch(/safeguarding/i);
    const text = allText(patient);
    expect(text).not.toMatch(/safeguard|child-protection|child protection|social work/i);
  });
});

describe('patient copy with a sensitive personal consent risk', () => {
  const { clinician, patient } = docsFor(skinGraft, 'pre_op', { 'core.alcohol': 'dependent' });

  it('keeps the risk in the clinician document and drops it from the WhatsApp copy', () => {
    expect(allText(clinician)).toMatch(/heavy drinking/i);
    expect(allText(patient)).not.toMatch(/heavy drinking|alcohol/i);
    expect(allText(patient)).toMatch(/full consent form/i);
  });

  it('no consent bullet matches the exclusion list', () => {
    for (const s of patient.sections.filter(x => x.kind === 'consent')) {
      for (const b of s.bullets ?? []) expect(b, `${s.title}: ${b}`).not.toMatch(PATIENT_COPY_EXCLUDE);
    }
  });
});

describe('patient copy for a wound review', () => {
  it('omits psychological screening content', () => {
    const { patient } = docsFor(woundCareReview, 'wound_review', provocativeAnswers(woundCareReview, 'wound_review'));
    expect(allText(patient)).not.toMatch(/PHQ|GAD-|psycholog|depress|self-harm|suicid/i);
  });
});

describe('WhatsApp share wiring', () => {
  it('the review form shares the patient copy, and downloads the clinician PDF', () => {
    const src = readFileSync(join(process.cwd(), 'src/domains/clinical/components/procedureReview/ProcedureReviewForm.tsx'), 'utf8');
    const share = src.slice(src.indexOf('const sharePdf'), src.indexOf('};', src.indexOf('const sharePdf')));
    expect(share).toMatch(/getPatientCopyPDF\(/);
    expect(share).not.toMatch(/getProcedureReviewPDFDoc\(/);
    expect(src).toMatch(/const exportPdf = \(\) => \{ const i = pdfInput\(\); if \(i\) generateProcedureReviewPDF\(i\); \};/);
  });
});
