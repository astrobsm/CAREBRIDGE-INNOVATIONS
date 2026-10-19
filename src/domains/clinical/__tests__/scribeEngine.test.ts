/**
 * The medical scribe reads the record, not word fragments: a pressure-ulcer
 * patient is not "sickle cell" because of the "ss" in "pressure", nor diabetic
 * because of the "dm" in "admitted"; negations are negatives; the structured
 * clerking is authoritative; and the draft plan follows the diagnosis.
 */
import { describe, it, expect } from 'vitest';
import { buildClinicalFacts, mentionIn, CONDITION_TERMS, has, type FactsInput } from '../scribe/clinicalFacts';
import { buildScribePlan, buildFindings } from '../scribe/scribePlan';
import { assertCanReview, assertCanSubmitPlan, canApprove, filterPlan, ScribePlanError, toTreatmentPlan } from '../scribe/approval';
import { buildScribeSummary } from '../scribe/scribeSummary';
import type { ScribeTreatmentPlan } from '../scribe/records';
import type { Admission, ClinicalEncounter, Patient } from '../../../types';
import type { ClinicalPlanItem, ClinicalProblem } from '../clerking/records';
import { emptyClerking } from '../clerking/engine';

const NOW = new Date('2026-10-18T18:00:00Z');

const patient = {
  id: 'p42', firstName: 'Comfort', lastName: 'Anike', dateOfBirth: new Date('1962-01-24'), gender: 'female',
  hospitalNumber: 'PT-556269', allergies: [], chronicConditions: [],
} as unknown as Patient;

const admission = {
  id: 'a1', patientId: 'p42', admissionDiagnosis: 'Gluteal pressure ulcer', wardName: 'Ward 10', bedNumber: '16', status: 'active',
  chiefComplaint: 'ADMITTED from clinic for pressure ulcer assessment. Wound assessed, sloughy.', admissionDate: new Date('2026-10-10'),
  createdAt: new Date('2026-10-10'),
} as unknown as Admission;

const clerkingData = {
  ...emptyClerking(),
  complaints: [{ uid: '1', complaintId: 'pressure_sore', label: 'Gluteal ulcer', duration: { value: 2, unit: 'months' }, answers: {} }],
  history: {
    pmh: { stroke: { status: 'Yes' }, diabetes: { status: 'No' }, sickle_cell: { status: 'No' }, hypertension: { status: 'No' } },
    social: { mobility: 'Bed-bound' },
  },
  allergyStatus: 'not_asked' as const, vitals: { weight: 92, height: 165 },
};

const encounter = {
  id: 'e1', patientId: 'p42', hospitalId: 'h1', type: 'initial', status: 'completed', chiefComplaint: 'Gluteal ulcer — 2 months', diagnosis: [],
  attendingClinician: 'u1', startedAt: NOW, createdAt: NOW, updatedAt: NOW,
  clerking: {
    kind: 'initial', status: 'signed', data: clerkingData, suggestions: [], narrative: '', version: 2, createdBy: 'u1',
    summary: { risk_factors: ['Previous stroke', 'Obesity (BMI ≥ 30) — Wound complications, VTE', 'Bed-bound — pressure injury and VTE risk'], accepted: { differential: [] } },
  },
} as unknown as ClinicalEncounter;

const problems: ClinicalProblem[] = [{ id: 'e1|d', patientId: 'p42', encounterId: 'e1', suggestionId: 'd', label: 'Pressure ulcer (L89)', reasons: [], dangerous: false, status: 'active', createdAt: '2026-10-18', updatedAt: '2026-10-18' }];
const item = (id: string, text: string, kind: ClinicalPlanItem['kind'], priority?: string): ClinicalPlanItem =>
  ({ id, patientId: 'p42', encounterId: 'e1', suggestionId: id, kind, text, priority, status: 'pending', createdAt: '2026-10-18', updatedAt: '2026-10-18' });
const planItems = [item('i1', 'Complete blood count', 'investigation', 'urgent'), item('i2', 'Wound debridement', 'treatment', 'urgent'), item('i3', 'Nutritional support', 'treatment')];

const comfort: FactsInput = { patient, admissions: [admission], encounters: [encounter], clinical: { problems, planItems }, now: NOW };

describe('text matching', () => {
  it('does not find sickle cell in "pressure" / "assessment", nor diabetes in "admitted"', () => {
    const t = 'ADMITTED for pressure ulcer assessment; SS SC';
    expect(mentionIn('ADMITTED for pressure ulcer assessment', CONDITION_TERMS.sickle_cell.patterns)).toBeNull();
    expect(mentionIn(t.toLowerCase(), CONDITION_TERMS.diabetes.patterns)).toBeNull();
    expect(mentionIn('admitted', CONDITION_TERMS.diabetes.patterns)).toBeNull();
    expect(mentionIn('Known DM on metformin', CONDITION_TERMS.diabetes.patterns)).toBe('present');
    expect(mentionIn('genotype SS', CONDITION_TERMS.sickle_cell.patterns)).toBe('present');
    expect(mentionIn('genotype AA', CONDITION_TERMS.sickle_cell.patterns)).toBeNull();
  });
  it('a negated mention is a documented negative', () => {
    expect(mentionIn('No history of diabetes or hypertension', CONDITION_TERMS.diabetes.patterns)).toBe('absent');
    expect(mentionIn('Denies HTN', CONDITION_TERMS.hypertension.patterns)).toBe('absent');
    expect(mentionIn('RVS: HIV -ve', CONDITION_TERMS.hiv.patterns)).toBe('absent');
    expect(mentionIn('pending PE workup', CONDITION_TERMS.thromboembolism.patterns)).toBe('present');
    expect(mentionIn('pending results', CONDITION_TERMS.thromboembolism.patterns)).toBeNull();
  });
});

describe('Comfort Anike — gluteal pressure ulcer', () => {
  const facts = buildClinicalFacts(comfort);
  it('reads the structured clerking', () => {
    expect(facts.complaints[0]).toEqual({ label: 'Gluteal ulcer', duration: '2 months' });
    expect(facts.problems[0]).toMatchObject({ label: 'Pressure ulcer', code: 'L89', source: 'Problem list' });
    expect(has(facts, 'stroke')).toBe(true);
    expect(has(facts, 'immobility')).toBe(true);
    expect(has(facts, 'obesity')).toBe(true);
    expect(facts.conditions.get('diabetes')?.presence).toBe('absent');
    expect(facts.conditions.get('sickle_cell')?.presence).toBe('absent');
    expect(facts.allergies.status).toBe('not_documented');
    expect(facts.age).toBe(64);
  });
  it('findings follow the diagnosis — no sickle cell, no diabetes', () => {
    const findings = buildFindings(facts);
    const names = findings.map(f => f.finding).join(' | ');
    expect(names).not.toMatch(/sickle|diabet/i);
    expect(names).toMatch(/Pressure ulcer \(L89\)/);
    expect(names).toMatch(/Previous stroke/);
    expect(names).toMatch(/VTE risk present — no prophylaxis/);
    expect(names).toMatch(/Allergy status not documented/);
    expect(findings.every(f => f.evidence)).toBe(true);
  });
  it('drafts a pressure-injury plan with VTE, nutrition, pressure care and the comorbidities', () => {
    const plan = buildScribePlan(facts);
    const p = plan.problems[0];
    expect(p.problem).toBe('Pressure ulcer');
    expect(p.treatment.map(t => t.text).join(' ')).toMatch(/debridement/i);
    expect(p.investigations.map(t => t.text).join(' ')).toMatch(/osteomyelitis|X-ray/i);
    expect(p.treatment.map(t => t.text).join(' ')).toMatch(/flap/i);
    expect(plan.comorbidities.map(c => c.condition).join(' ')).toMatch(/stroke/i);
    expect(plan.comorbidities.map(c => c.condition).join(' ')).not.toMatch(/diabet|sickle/i);
    const vte = plan.general.find(g => g.heading === 'VTE prophylaxis')!;
    expect(vte.items[0].text).toMatch(/Enoxaparin 40 mg SC once daily \(weight-adjusted\)/);
    expect(vte.items[0].why).toMatch(/immobility.*obesity.*stroke.*age 64/);
    expect(plan.carriedOver.map(c => c.text)).toContain('Wound debridement');
    expect(plan.cautions.join(' ')).toMatch(/Allergy status is not documented/);
    expect(plan.cautions.join(' ')).not.toMatch(/Pregnancy test/); // 64-year-old
  });
  it('a resolved or ruled-out problem is not a current problem', () => {
    const f = buildClinicalFacts({ ...comfort, clinical: { problems: [{ ...problems[0], status: 'ruled_out' }], planItems } });
    expect(f.problems.map(p => p.label)).not.toContain('Pressure ulcer');
  });
});

describe('free text fallback', () => {
  it('a record with only text still finds real conditions, and respects negation', () => {
    const f = buildClinicalFacts({ patient: { chronicConditions: ['Known hypertensive. No diabetes. Genotype AA.'] } });
    expect(has(f, 'hypertension')).toBe(true);
    expect(f.conditions.get('diabetes')?.presence).toBe('absent');
    expect(has(f, 'sickle_cell')).toBe(false);
  });
  it('an ordinary encounter\'s recorded diagnosis is a problem', () => {
    const plain = { ...encounter, id: 'e0', clerking: undefined, diagnosis: [{ id: 'x', description: 'Keloid', type: 'primary', status: 'confirmed' }] } as unknown as ClinicalEncounter;
    const f = buildClinicalFacts({ patient, encounters: [plain] });
    expect(f.problems[0]).toMatchObject({ label: 'Keloid', source: 'Encounter diagnosis' });
  });
});

describe('consultant edits', () => {
  it('unticked lines are left out and instructions are added', () => {
    const plan = buildScribePlan(buildClinicalFacts(comfort));
    const out = filterPlan(plan, new Set(['p0.treatment|0', 'carried|0']), 'Book gluteal rotation flap\n\n');
    expect(out.problems[0].treatment.length).toBe(plan.problems[0].treatment.length - 1);
    expect(out.carriedOver.length).toBe(plan.carriedOver.length - 1);
    const ci = out.general.find(g => g.heading === 'Consultant instructions')!;
    expect(ci.items.map(i => i.text)).toEqual(['Book gluteal rotation flap']);
  });
});

describe('approval', () => {
  const pending = { id: 's1', status: 'pending_approval' } as ScribeTreatmentPlan;
  const code = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return (e as ScribePlanError).code; } };
  it('only a consultant (or an administrator) approves or returns a plan', () => {
    expect(canApprove({ id: 'c', role: 'consultant' })).toBe(true);
    expect(canApprove({ id: 'r', role: 'senior_registrar' })).toBe(false);
    expect(code(() => assertCanReview({ id: 'r', role: 'registrar' }, pending, 'approve'))).toBe(403);
    expect(code(() => assertCanReview({ id: 'c', role: 'consultant' }, pending, 'approve'))).toBeNull();
  });
  it('a plan is reviewed once, and returning it needs a reason', () => {
    expect(code(() => assertCanReview({ id: 'c', role: 'consultant' }, { ...pending, status: 'approved' }, 'approve'))).toBe(409);
    expect(code(() => assertCanReview({ id: 'c', role: 'consultant' }, pending, 'reject', '  '))).toBe(400);
    expect(code(() => assertCanReview({ id: 'c', role: 'consultant' }, undefined, 'approve'))).toBe(404);
  });
  it('the team may submit; others may not', () => {
    const plan = buildScribePlan(buildClinicalFacts(comfort));
    expect(code(() => assertCanSubmitPlan({ id: 'h', role: 'house_officer' }, 'p42', plan))).toBeNull();
    expect(code(() => assertCanSubmitPlan({ id: 'a', role: 'accountant' }, 'p42', plan))).toBe(403);
  });
  it('the approved plan becomes an active treatment plan', () => {
    const plan = buildScribePlan(buildClinicalFacts(comfort));
    const tp = toTreatmentPlan(plan, { id: 't1', patientId: 'p42', scribePlanId: 's1', version: 3, approverName: 'Dr Okafor', createdBy: 'c', now: NOW });
    expect(tp).toMatchObject({ status: 'active', relatedEntityId: 'scribe:s1', patientId: 'p42' });
    expect(tp.title).toMatch(/^Pressure ulcer \(L89\)/);
    expect(tp.description).toMatch(/Scribe plan v3, approved by Dr Okafor/);
    expect(tp.clinicalGoals.length).toBeGreaterThan(0);
    expect(tp.orders.some(o => o.category === 'medication' && /Enoxaparin/.test(o.order))).toBe(true);
    expect(tp.orders.some(o => o.category === 'procedure' && /debridement/i.test(o.order))).toBe(true);
  });
});

describe('scribe summary', () => {
  it('reports allergies as not documented, the real conditions only, and the draft plan', () => {
    const s = buildScribeSummary({ patient, admissions: [admission], encounters: [encounter], problems, planItems, now: NOW });
    expect(s.content).toMatch(/Allergies: NOT DOCUMENTED — confirm before prescribing/);
    expect(s.content).toMatch(/Comorbidities: Previous stroke/);
    expect(s.content).toMatch(/Relevant negatives: no diabetes mellitus/);
    expect(s.content).not.toMatch(/Comorbidities:[^\n]*(sickle|diabet)/i);
    expect(s.content).toMatch(/DRAFT TREATMENT PLAN — FOR CONSULTANT APPROVAL/);
    expect(s.keyPoints).toContain('!! Allergy status not documented');
    expect(s.place).toBe('Ward 10, Bed 16');
  });
});
