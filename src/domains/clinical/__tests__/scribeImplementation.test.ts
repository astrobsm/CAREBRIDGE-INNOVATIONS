/**
 * Approved-plan implementation: items are classified (medication /
 * investigation / procedure / care), prescribing and requesting start from
 * this app's own formulary and investigation catalogue, a log needs an
 * approved plan (and a reason when an item was not done), and the summary
 * shows who did what, when and where.
 */
import { describe, it, expect } from 'vitest';
import { classifyLine, flattenPlan, itemState, type LoggedAction } from '../scribe/planItems';
import { buildClinicalFacts } from '../scribe/clinicalFacts';
import { buildScribePlan } from '../scribe/scribePlan';
import { assertCanLog, canLog, MAX_ATTACHMENT_CHARS, ScribePlanError } from '../scribe/approval';
import { drugFromText, investigationFromText, medicationRoute } from '../scribe/catalogMatch';
import { buildScribeSummary } from '../scribe/scribeSummary';
import type { ScribePlanAction, ScribeTreatmentPlan } from '../scribe/records';
import type { Patient } from '../../../types';
import type { ClinicalProblem } from '../clerking/records';

const problem: ClinicalProblem = { id: 'e|d', patientId: 'p1', encounterId: 'e', suggestionId: 'd', label: 'Pressure ulcer (L89)', reasons: [], dangerous: false, status: 'active', createdAt: '2026-10-18', updatedAt: '2026-10-18' };
const patient = { id: 'p1', firstName: 'A', lastName: 'B', dateOfBirth: new Date('1962-01-24'), gender: 'female', allergies: [], chronicConditions: [] } as unknown as Patient;
const NOW = new Date('2026-10-18T18:00:00Z');
const plan = buildScribePlan(buildClinicalFacts({ patient, clinical: { problems: [problem] }, now: NOW }));

describe('classifying plan items', () => {
  it('investigations, procedures, medications and care', () => {
    expect(classifyLine('FBC, CRP / ESR, U&E', 'investigations')).toBe('investigation');
    expect(classifyLine('Sharp surgical debridement of necrotic tissue', 'treatment')).toBe('procedure');
    expect(classifyLine('Enoxaparin 40 mg SC once daily + mechanical prophylaxis', 'general', 'VTE prophylaxis')).toBe('medication');
    expect(classifyLine('Regular paracetamol; add opioid for dressing changes', 'general', 'Analgesia')).toBe('medication');
    expect(classifyLine('Swallow screen before oral intake', 'comorbidity')).toBe('care');
  });
  it('flattens a real plan with stable keys; goals are not tasks', () => {
    const items = flattenPlan(plan);
    expect(items.find(i => i.key === 'p0.goals|0')?.actionable).toBe(false);
    expect(items.find(i => i.key === 'p0.investigations|0')?.kind).toBe('investigation');
    expect(items.some(i => i.kind === 'medication')).toBe(true);
  });
  it('state follows the latest log', () => {
    const a = (status: string) => ({ id: status, itemKey: 'k', status, loggedAt: 'x' }) as unknown as LoggedAction;
    expect(itemState([]).label).toBe('Not started');
    expect(itemState([a('ordered')]).label).toMatch(/awaiting result/);
    expect(itemState([a('result_entered')]).tone).toBe('done');
    expect(itemState([a('ordered'), a('result_entered')]).label).toBe('Result entered');
    expect(itemState([a('not_done')]).tone).toBe('problem');
  });
});

describe('prescribe / request from the catalogues', () => {
  it('the drug named in the plan line is found in the formulary', () => {
    expect(drugFromText('Enoxaparin 40 mg SC once daily (weight-adjusted)')?.id).toMatch(/enoxaparin/i);
    expect(drugFromText('Regular paracetamol; add opioid for dressing changes')?.genericName).toMatch(/Paracetamol/);
    expect(drugFromText('Swallow screen before oral intake')).toBeUndefined();
  });
  it('the investigation named in the plan line is found in the catalogue', () => {
    const m = investigationFromText('FBC, CRP / ESR, U&E, creatinine');
    expect(m?.item.code).toBe('fbc');
    expect(m?.category).toBe('hematology');
    expect(investigationFromText('Offloading: 2-hourly repositioning')).toBeUndefined();
  });
  it('formulary routes map onto prescription routes', () => {
    expect(medicationRoute('SC')).toBe('subcutaneous');
    expect(medicationRoute('IV')).toBe('intravenous');
    expect(medicationRoute(undefined)).toBe('oral');
  });
});

describe('logging rules', () => {
  const approved = { id: 's1', patientId: 'p1', status: 'approved' } as ScribeTreatmentPlan;
  const nurse = { id: 'n', role: 'nurse' };
  const code = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return (e as ScribePlanError).code; } };
  it('only an approved plan is carried out, and only by the clinical team', () => {
    expect(code(() => assertCanLog(nurse, { ...approved, status: 'pending_approval' }, { itemKey: 'k', status: 'done' }))).toBe(409);
    expect(code(() => assertCanLog({ id: 'x', role: 'accountant' }, approved, { itemKey: 'k', status: 'done' }))).toBe(403);
    expect(canLog(nurse)).toBe(true);
    expect(code(() => assertCanLog(nurse, approved, { itemKey: 'k', status: 'done' }))).toBeNull();
  });
  it('"not done", "partly" and "cancelled" need a reason', () => {
    for (const status of ['not_done', 'partial', 'cancelled']) {
      expect(code(() => assertCanLog(nurse, approved, { itemKey: 'k', status, note: ' ' }))).toBe(400);
      expect(code(() => assertCanLog(nurse, approved, { itemKey: 'k', status, note: 'Patient in theatre' }))).toBeNull();
    }
    expect(code(() => assertCanLog(nurse, approved, { itemKey: 'k', status: 'finished' }))).toBe(400);
  });
  it('attachments must be data URLs and fit in one save', () => {
    expect(code(() => assertCanLog(nurse, approved, { itemKey: 'k', status: 'result_entered', attachments: [{ data: 'http://x/y.png' }] }))).toBe(400);
    const big = `data:image/jpeg;base64,${'a'.repeat(MAX_ATTACHMENT_CHARS)}`;
    expect(code(() => assertCanLog(nurse, approved, { itemKey: 'k', status: 'result_entered', attachments: [{ data: big }] }))).toBe(413);
  });
});

describe('the summary shows the implementation', () => {
  it('progress, and who / when / where of each item', () => {
    const items = flattenPlan(plan).filter(i => i.actionable);
    const vte = items.find(i => i.kind === 'medication')!;
    const stored: ScribeTreatmentPlan = {
      id: 's1', patientId: 'p1', version: 2, status: 'approved', plan, approvedPlan: plan, findings: [], basis: [],
      generatedAt: '2026-10-18T10:00:00Z', reviewedByName: 'Dr Okafor', createdAt: '2026-10-18T10:00:00Z', updatedAt: '2026-10-18T10:00:00Z',
    };
    const action = {
      id: 'a1', scribePlanId: 's1', patientId: 'p1', itemKey: vte.key, itemText: vte.text, status: 'prescribed',
      prescription: { drug: 'Enoxaparin (LMWH)', dose: '40mg', route: 'subcutaneous', frequency: 'od' },
      userName: 'Nurse Ada', locationLabel: 'Ward 10, Bed 16', loggedAt: '2026-10-18T12:00:00Z', createdAt: '', updatedAt: '',
    } as ScribePlanAction;
    const s = buildScribeSummary({ patient, problems: [problem], scribe: { plans: [stored], actions: [action] }, now: NOW });
    expect(s.content).toMatch(/APPROVED TREATMENT PLAN — IMPLEMENTATION\*\* \(v2, approved by Dr Okafor; 1\/\d+ done\)/);
    expect(s.content).toMatch(/\[PRESCRIBED\] .*\[Rx Enoxaparin \(LMWH\) 40mg OD\] — Nurse Ada, 18\/10 \d\d:00, Ward 10, Bed 16/);
    expect(s.keyPoints.some(k => /^Approved plan v2: 1\/\d+ items implemented$/.test(k))).toBe(true);
    expect(s.keyPoints.some(k => k.startsWith('Last action:') && k.includes('Nurse Ada'))).toBe(true);
  });
});
