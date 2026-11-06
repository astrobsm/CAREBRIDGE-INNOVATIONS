/**
 * The PDF section model, the encounter prose, the stored-review helpers and
 * the wiring into storage and approval.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildReviewDocument, renderReviewDocument } from '../pdf';
import { computeReview, toStored } from '../compute';
import { applyPlanEdits, carriedForward, priorReviewsFrom, proseFromReview } from '../records';
import { emptyCounselling } from '../consent';
import { skinGraft } from '../procedures/reconstruction/skinGraft';
import { woundCareReview } from '../procedures/wound/woundCareReview';
import { flattenPlan } from '../../scribe/planItems';
import { adult, provocativeAnswers } from './fixtures';
import type { ProcedureModule, ReviewPhase } from '../types';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

function computed(module: ProcedureModule, phase: ReviewPhase, answers = provocativeAnswers(module, phase)) {
  const input = {
    module, phase, answers, patient: adult(), prior: [],
    counselling: { ...emptyCounselling(), decision: 'consents' as const, topicsDiscussed: ['Clinical photography'] },
    pdfPatient: { name: 'Ada Obi', hospitalNumber: 'UNTH-1' }, clinician: { id: 'u1', name: 'Dr Eze', role: 'registrar' }, now: '2026-11-06T09:00:00Z',
  };
  const c = computeReview(input);
  const stored = toStored(input, c, { status: 'draft', version: 1, createdBy: 'u1', createdByName: 'Dr Eze' });
  return { c, stored };
}

describe('review PDF section model', () => {
  it('has every part of the review, consent last with declaration and signatures', () => {
    const { c, stored } = computed(skinGraft, 'pre_op');
    const d = buildReviewDocument({ module: skinGraft, phase: 'pre_op', reading: c.reading, review: stored, patient: { name: 'Ada Obi', hospitalNumber: 'UNTH-1' }, date: new Date('2026-11-06') });
    const kinds = d.sections.map(s => s.kind);
    for (const k of ['summary', 'assessment', 'scores', 'flags', 'barriers', 'plan', 'counselling', 'consent', 'declaration'] as const) expect(kinds).toContain(k);
    expect(kinds[kinds.length - 1]).toBe('declaration');
    expect(d.sections.find(s => s.kind === 'declaration')!.signatures).toHaveLength(3);
    const scores = d.sections.find(s => s.kind === 'scores')!;
    expect(scores.table!.headers).toEqual(['Score', 'Result', 'Band']);
    expect(scores.table!.rows.some(r => r[0] === 'Caprini')).toBe(true);
    expect(d.sections.filter(s => s.kind === 'plan').some(s => s.title === 'Plan: VTE prophylaxis')).toBe(true);
    expect(d.sections.find(s => s.kind === 'counselling')!.bullets!.some(b => b.startsWith('[x] Clinical photography'))).toBe(true);
    expect(d.meta).toMatchObject({ Procedure: skinGraft.name, Phase: 'Pre-operative review', Clinician: 'Dr Eze' });
    expect(d.fileName).toBe('skin_graft-pre_op-ada-obi-2026-11-06.pdf');
  });

  it('has no consent form or declaration where the phase takes no consent', () => {
    const { c, stored } = computed(skinGraft, 'post_op');
    const d = buildReviewDocument({ module: skinGraft, phase: 'post_op', reading: c.reading, review: stored, patient: { name: 'A', hospitalNumber: '1' }, date: new Date() });
    expect(d.sections.some(s => s.kind === 'declaration')).toBe(false);
  });

  it('renders to a multi-page PDF', () => {
    const { c, stored } = computed(woundCareReview, 'wound_review');
    const d = buildReviewDocument({ module: woundCareReview, phase: 'wound_review', reading: c.reading, review: stored, patient: { name: 'A', hospitalNumber: '1' }, date: new Date() });
    expect(renderReviewDocument(d).getNumberOfPages()).toBeGreaterThan(1);
  });
});

describe('encounter prose', () => {
  it('writes the narrative into the ordinary fields every reader uses', () => {
    const { c } = computed(skinGraft, 'pre_op');
    const p = proseFromReview(skinGraft, 'pre_op', c.reading, c.plan);
    expect(p.chiefComplaint).toBe(`${skinGraft.name} — Pre-operative review`);
    expect(p.historyOfPresentIllness).toMatch(/The graft:/);
    expect(p.pastMedicalHistory).toMatch(/Comorbidity and risk factors:/);
    expect(p.socialHistory).toMatch(/Social circumstances/);
    expect(p.physicalExamination?.additionalFindings).toMatch(/Anaesthetic and peri-operative fitness/);
    expect(p.treatmentPlan).toMatch(/VTE prophylaxis:/);
    expect(p.notes).toMatch(/Scores:/);
  });
});

describe('stored reviews', () => {
  it('stores what the answers produce, with the template version and lifecycle', () => {
    const { stored } = computed(woundCareReview, 'wound_review');
    expect(stored).toMatchObject({ moduleId: 'wound_care_review', phase: 'wound_review', status: 'draft', version: 1 });
    expect(stored.templateVersion).toMatch(/^procedure-review-/);
    expect(stored.plan.problems.length).toBeGreaterThan(0);
    expect(stored.consent?.procedureName).toBe('Wound debridement and dressing');
    expect(stored.counselling.clinicianName).toBe('Dr Eze');
  });

  it('applies the clinician\'s edits by the scribe\'s keys', () => {
    const { c } = computed(skinGraft, 'pre_op');
    const first = flattenPlan(c.generated.plan)[0];
    const edited = applyPlanEdits(c.generated.plan, { excluded: [first.key], additions: ['Book theatre for Tuesday'] }, 'Dr Eze');
    expect(flattenPlan(edited).some(i => i.text === first.text && i.key === first.key)).toBe(false);
    const added = edited.general.find(g => g.heading === 'Added at review')!;
    expect(added.items[0]).toEqual({ text: 'Book theatre for Tuesday', why: 'Added by Dr Eze at the review' });
  });

  it('reads earlier reviews newest first, leaving out entered-in-error', () => {
    const r = (id: string, at: string, status: 'signed' | 'entered_in_error') => ({
      id, createdAt: new Date(at),
      procedureReview: { moduleId: 'skin_graft', phase: 'pre_op', answers: { 'skin_graft.graft_type': 'ftsg' }, scores: [], status } as never,
    });
    const prior = priorReviewsFrom([r('a', '2026-10-01', 'signed'), r('b', '2026-10-20', 'signed'), r('c', '2026-10-25', 'entered_in_error')]);
    expect(prior.map(p => p.encounterId)).toEqual(['b', 'a']);
    expect(carriedForward(skinGraft, prior)).toEqual({ 'skin_graft.graft_type': 'ftsg' });
  });
});

describe('wiring', () => {
  it('stores the review on the encounter and syncs it as procedure_review', () => {
    expect(read('src/types/index.ts')).toMatch(/procedureReview\?: import\('\.\.\/domains\/clinical\/procedureReview\/types'\)\.StoredProcedureReview/);
    const sql = read('supabase/migrations/20261106120000_procedure_review.sql');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS procedure_review JSONB/);
    expect(sql).not.toMatch(/CREATE POLICY/i);
    // The sync layer converts camelCase keys generically, as it does for `clerking`.
    expect(read('src/services/cloudSyncService.ts')).toMatch(/key\.replace\(\/\[A-Z\]\/g/);
  });

  it('uses the clerking lifecycle rules and the scribe approval queue — no parallel system', () => {
    const svc = read('src/domains/clinical/procedureReview/procedureReviewService.ts');
    for (const fn of ['assertCanEditRecord', 'assertCanSubmitRecord', 'assertCanMarkErrorRecord', 'encounterStatusFor', 'submitPlan']) expect(svc).toContain(fn);
    expect(svc).not.toMatch(/approvePlan|canApprove/);
  });
});
