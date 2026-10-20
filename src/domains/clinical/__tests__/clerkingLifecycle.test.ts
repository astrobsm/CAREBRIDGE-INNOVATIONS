/**
 * The rules the original server enforced on structured encounters, now run
 * on the device before anything is written: versioned edits, who may sign,
 * who may withdraw, and how accepted suggestions become the tracked problem
 * list and plan.
 */
import { describe, it, expect } from 'vitest';
import {
  assertCanEdit, assertCanMarkError, assertCanSubmit, assertTrackedStatus, cleanPayload, ClerkingError,
  canSign, encounterStatusFor, narrativeSections, proseFromClerking, proseFromFollowUp, reconcileTracking, trackedId,
} from '../clerking/lifecycle';
import { emptyClerking, emptyFollowUp, generateNarrative, generateFollowUpNarrative } from '../clerking/engine';
import type { StructuredClerking, ClinicalProblem, ClinicalPlanItem } from '../clerking/records';
import type { Suggestion } from '../clerking/types';

const HO = { id: 'u-ho', role: 'house_officer' };
const REG = { id: 'u-reg', role: 'registrar' };
const NURSE = { id: 'u-nurse', role: 'nurse' };

function clerking(over: Partial<StructuredClerking> = {}): StructuredClerking {
  return { kind: 'initial', status: 'draft', data: emptyClerking(), suggestions: [], summary: {}, narrative: '', version: 3, createdBy: HO.id, ...over };
}
const enc = (c: StructuredClerking) => ({ id: 'e1', patientId: 'p1', clerking: c });

const code = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return (e as ClerkingError).code; } };

describe('who may sign', () => {
  it('registrars and consultants sign; house officers submit for review', () => {
    expect(canSign(REG)).toBe(true);
    expect(canSign({ id: 'c', role: 'consultant' })).toBe(true);
    expect(canSign(HO)).toBe(false);
    // Clinical decision 2026-10-20: surgeons and plastic surgeons sign; doctors do not.
    expect(canSign({ id: 's', role: 'surgeon' })).toBe(true);
    expect(canSign({ id: 'p', role: 'plastic_surgeon' })).toBe(true);
    expect(canSign({ id: 'd', role: 'doctor' })).toBe(false);
    expect(canSign({ id: 'm', role: 'medical_officer' })).toBe(false);
    expect(assertCanSubmit(enc(clerking()), 3, HO, false)).toBe('pending_review');
    expect(assertCanSubmit(enc(clerking()), 3, REG, false)).toBe('signed');
  });
  it('a house officer cannot sign, and cannot submit someone else\'s clerking', () => {
    expect(code(() => assertCanSubmit(enc(clerking()), 3, HO, true))).toBe(403);
    expect(code(() => assertCanSubmit(enc(clerking({ createdBy: 'other' })), 3, HO, false))).toBe(403);
  });
  it('a signed or withdrawn encounter cannot be resubmitted', () => {
    expect(code(() => assertCanSubmit(enc(clerking({ status: 'signed' })), 3, REG, true))).toBe(409);
    expect(code(() => assertCanSubmit(enc(clerking({ status: 'entered_in_error' })), 3, REG, true))).toBe(409);
  });
});

describe('versioned edits', () => {
  it('a stale version is refused rather than overwriting', () => {
    expect(code(() => assertCanEdit(enc(clerking()), 2, HO))).toBe(409);
    expect(assertCanEdit(enc(clerking()), 3, HO).version).toBe(3);
  });
  it('signed encounters are closed to edits; only the author or a signer may edit a draft', () => {
    expect(code(() => assertCanEdit(enc(clerking({ status: 'signed' })), 3, REG))).toBe(409);
    expect(code(() => assertCanEdit(enc(clerking()), 3, NURSE))).toBe(403);
    expect(assertCanEdit(enc(clerking()), 3, REG).createdBy).toBe(HO.id);
    expect(code(() => assertCanEdit(undefined, 1, HO))).toBe(404);
  });
});

describe('entered in error', () => {
  it('needs a reason; after signing only an amending role may do it', () => {
    expect(code(() => assertCanMarkError(enc(clerking()), HO, ' '))).toBe(400);
    expect(code(() => assertCanMarkError(enc(clerking()), HO, 'wrong patient'))).toBeNull();
    expect(code(() => assertCanMarkError(enc(clerking({ status: 'signed' })), HO, 'wrong patient'))).toBe(403);
    expect(code(() => assertCanMarkError(enc(clerking({ status: 'signed' })), { id: 'x', role: 'consultant' }, 'wrong patient'))).toBeNull();
  });
  it('maps onto the encounter row status that existing readers understand', () => {
    expect(encounterStatusFor('signed')).toBe('completed');
    expect(encounterStatusFor('entered_in_error')).toBe('cancelled');
    expect(encounterStatusFor('pending_review')).toBe('in-progress');
  });
});

describe('payload and statuses', () => {
  it('refuses an oversized encounter and caps suggestions', () => {
    expect(code(() => cleanPayload({ data: { x: 'a'.repeat(600 * 1024) }, suggestions: [], summary: {}, narrative: '' }))).toBe(400);
    expect(cleanPayload({ data: {}, suggestions: new Array(250).fill({}), summary: {}, narrative: 'n' }).suggestions).toHaveLength(200);
  });
  it('tracked statuses are a closed vocabulary, and "withdrawn" is never set by hand', () => {
    expect(code(() => assertTrackedStatus('problem', 'improving'))).toBeNull();
    expect(code(() => assertTrackedStatus('problem', 'withdrawn'))).toBe(400);
    expect(code(() => assertTrackedStatus('plan', 'improving'))).toBe(400);
  });
});

const sug = (id: string, kind: Suggestion['kind'], text: string, decision: Suggestion['decision'] = 'accepted'): Suggestion =>
  ({ id, kind, text, reasons: ['why'], source: 'rules', decision, priority: 'urgent' });

describe('tracking', () => {
  const now = '2026-10-18T10:00:00.000Z';
  it('accepted diagnoses become problems and accepted work-up becomes plan items, with stable ids', () => {
    const c = clerking({ suggestions: [sug('rules:dx:marjolin_ulcer', 'differential', "Marjolin's ulcer (C44.9)"), sug('rules:inv:biopsy', 'investigation', 'Wedge biopsy'), sug('rules:tx:x', 'treatment', 'X', 'rejected')] });
    const out = reconcileTracking({ ...enc(c) }, { problems: [], planItems: [] }, now);
    expect(out.problems).toHaveLength(1);
    expect(out.problems[0]).toMatchObject({ id: trackedId('e1', 'rules:dx:marjolin_ulcer'), status: 'active', label: "Marjolin's ulcer (C44.9)", patientId: 'p1' });
    expect(out.planItems).toHaveLength(1);
    expect(out.planItems[0]).toMatchObject({ kind: 'investigation', status: 'pending', priority: 'urgent' });
  });
  it('resubmitting never duplicates; an un-accepted item is withdrawn, and restored if accepted again', () => {
    const accepted = clerking({ suggestions: [sug('d1', 'differential', 'Venous ulcer')] });
    const first = reconcileTracking(enc(accepted), { problems: [], planItems: [] }, now);
    const again = reconcileTracking(enc(accepted), { problems: first.problems, planItems: [] }, now);
    expect(again.problems.map(p => p.id)).toEqual(first.problems.map(p => p.id));
    const dropped = reconcileTracking(enc(clerking({ suggestions: [] })), { problems: first.problems, planItems: [] }, now);
    expect(dropped.problems[0].status).toBe('withdrawn');
    const back = reconcileTracking(enc(accepted), { problems: dropped.problems, planItems: [] }, now);
    expect(back.problems[0].status).toBe('active');
  });
  it('a follow-up review moves earlier problems and plan items', () => {
    const problem: ClinicalProblem = { id: 'e0|d1', patientId: 'p1', encounterId: 'e0', suggestionId: 'd1', label: 'Venous ulcer', reasons: [], dangerous: false, status: 'active', createdAt: now, updatedAt: now };
    const item: ClinicalPlanItem = { id: 'e0|i1', patientId: 'p1', encounterId: 'e0', suggestionId: 'i1', kind: 'investigation', text: 'ABPI', status: 'pending', createdAt: now, updatedAt: now };
    const other: ClinicalProblem = { ...problem, id: 'x|d1', patientId: 'someone-else' };
    const fu = emptyFollowUp();
    fu.problems = [{ problemId: 'e0|d1', label: 'Venous ulcer', status: 'improved', note: 'smaller' }, { problemId: 'x|d1', label: 'x', status: 'resolved' }];
    fu.plan = [{ itemId: 'e0|i1', text: 'ABPI', status: 'done' }];
    const out = reconcileTracking({ id: 'e2', patientId: 'p1', clerking: clerking({ kind: 'follow_up', data: fu }) }, { problems: [problem, other], planItems: [item] }, now);
    expect(out.problems.find(p => p.id === 'e0|d1')).toMatchObject({ status: 'improving', lastReview: { status: 'improved', note: 'smaller', encounterId: 'e2' } });
    expect(out.problems.find(p => p.id === 'x|d1')).toBeUndefined(); // another patient's row is never touched
    expect(out.planItems[0].status).toBe('done');
  });
});

describe('prose for existing readers', () => {
  it('writes the clerking into the ordinary encounter fields', () => {
    const d = emptyClerking();
    d.complaints = [{ uid: '1', complaintId: 'pressure_sore', label: 'Pressure sore / bed sore', duration: { value: 2, unit: 'months' }, answers: {} }];
    d.allergyStatus = 'nkda';
    d.medicationStatus = 'none';
    d.vitals = { temperature: 37.2, pulse: 88 };
    d.exam = { general: { pallor: 'Mild' } };
    d.impression = 'Sacral pressure injury';
    const suggestions = [sug('rules:dx:pressure_ulcer', 'differential', 'Pressure ulcer (L89)'), sug('rules:inv:fbc', 'investigation', 'FBC')];
    const narrative = generateNarrative({ ctx: { ageYears: 64, sex: 'Female' }, data: d, suggestions });
    expect(Object.keys(narrativeSections(narrative))).toContain('PAST MEDICAL HISTORY');
    const prose = proseFromClerking(narrative, d, suggestions);
    expect(prose.chiefComplaint).toBe('Pressure sore / bed sore — 2 months');
    expect(prose.allergyHistory).toMatch(/No known drug allergies/);
    expect(prose.medicationHistory).toMatch(/No regular medications/);
    expect(prose.diagnosis?.[0]).toMatchObject({ description: 'Pressure ulcer', code: 'L89', type: 'primary', status: 'suspected' });
    expect(prose.treatmentPlan).toBe('• FBC');
    expect(prose.physicalExamination?.generalAppearance).toMatch(/Vitals: Temperature 37.2/);
    expect(prose.notes).toMatch(/Impression: Sacral pressure injury/);
  });
  it('a follow-up fills the follow-up fields', () => {
    const fu = emptyFollowUp();
    fu.problems = [{ problemId: 'a', label: 'Venous ulcer', status: 'improved', note: '4 x 3 cm' }];
    fu.symptoms = 'Less pain';
    fu.vitals = { pulse: 80 };
    const prose = proseFromFollowUp(generateFollowUpNarrative(fu), fu, []);
    expect(prose.treatmentResponse).toBe('• Venous ulcer: improved — 4 x 3 cm');
    expect(prose.intervalHistory).toBe('Less pain');
    expect(prose.physicalExamination?.generalAppearance).toMatch(/Vitals: Pulse 80/);
  });
});
