import { describe, it, expect } from 'vitest';
import { surgicalReadiness, investigationsForSurgery, unresolvedRedFlags, type ReadinessInput } from '../readiness';
import { emptyCounselling } from '../../../clinical/procedureReview/consent';
import type { Investigation, PreoperativeAssessment, ScannedDocument, Surgery } from '../../../../types';
import type { StoredProcedureReview } from '../../../clinical/procedureReview/types';

const NOW = new Date('2026-11-20T09:00:00Z');

export function surgery(over: Partial<Surgery> = {}): Surgery {
  return {
    id: 's1', patientId: 'p1', hospitalId: 'h1', procedureName: 'Excision of lipoma', type: 'elective', category: 'minor',
    preOperativeAssessment: { asaScore: 1, npoStatus: false, consentSigned: false, bloodTyped: false, investigations: [], riskFactors: [] },
    scheduledDate: new Date('2026-11-25'), status: 'incomplete_preparation', surgeon: 'Dr A',
    surgeonFee: 100000, createdAt: NOW, updatedAt: NOW, ...over,
  };
}

const review = (over: Partial<StoredProcedureReview> = {}): StoredProcedureReview => ({
  moduleId: 'soft_tissue_lesion_excision', phase: 'pre_op', templateVersion: '1', answers: {}, scores: [], flags: [],
  plan: { problems: [], comorbidities: [], general: [], cautions: [], followUp: [], dischargeCriteria: [] } as never,
  counsellingPoints: [], consent: null, followUp: [], narrative: '', status: 'signed', version: 2, createdBy: 'u1', signedByName: 'Dr A',
  counselling: { ...emptyCounselling(), decision: 'consents', understanding: 'good', witnessName: 'Nurse B' },
  ...over,
});

const inv = (over: Partial<Investigation> = {}): Investigation => ({
  id: 'i1', patientId: 'p1', hospitalId: 'h1', type: 'full_blood_count', category: 'haematology', priority: 'routine',
  status: 'completed', requestedBy: 'u1', requestedAt: NOW, createdAt: NOW, updatedAt: NOW, ...over,
});

const doc = (kind: 'consent' | 'payment', over: Partial<ScannedDocument> = {}): ScannedDocument => ({
  id: `d-${kind}`, patientId: 'p1', encounterId: 's1', documentType: 'consent_form' as never, title: `${kind} file`,
  pages: [], fullText: '', extractedFields: [{ key: 'surgeryAttachment', label: 'x', value: kind } as never],
  createdBy: 'u1', createdAt: NOW, updatedAt: NOW, ...over,
});

const fit = (grade: PreoperativeAssessment['fitnessGrade'] = 'fit'): PreoperativeAssessment => ({
  id: 'pa1', surgeryId: 's1', patientId: 'p1', patientName: 'X', hospitalNumber: '1', surgeryName: 'x', surgeryType: 'minor',
  scheduledDate: NOW, asaClass: 1, asaEmergency: false, fitnessGrade: grade,
  airwayAssessment: {} as never, cardiacRisk: {} as never, vteRisk: {} as never, bleedingRisk: {} as never,
  status: 'completed', clearanceStatus: 'cleared', assessedBy: 'u1', createdAt: NOW, updatedAt: NOW,
});

const complete = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  surgery: surgery({ bookingApproval: { at: NOW, by: 'u1' } }),
  review: { encounterId: 'e1', review: review() },
  investigations: [inv()],
  documents: [doc('consent'), doc('payment')],
  preAnaesthetic: [fit()],
  ...over,
});

const item = (r: ReturnType<typeof surgicalReadiness>, id: string) => r.items.find(i => i.id === id);

describe('surgicalReadiness', () => {
  it('is ready when every record is in place', () => {
    const r = surgicalReadiness(complete());
    expect(r.missing).toEqual([]);
    expect(r.ready).toBe(true);
  });

  it('is not ready with nothing recorded, and lists what is missing', () => {
    const r = surgicalReadiness({ surgery: surgery({ surgeonFee: 0 }), review: null, investigations: [], documents: [], preAnaesthetic: [] });
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(expect.arrayContaining([
      'Pre-operative procedure review', 'Signed consent form uploaded', 'Payment evidence uploaded', 'Cost estimate',
      'Booking approved', 'Pre-anaesthetic review: fit',
    ]));
    expect(item(r, 'investigations')!.status).toBe('warning');
  });

  it('blocks on counselling gaps and a missing decision', () => {
    const r = surgicalReadiness(complete({ review: { encounterId: 'e1', review: review({ counselling: { ...emptyCounselling() } }) } }));
    expect(item(r, 'consent_decision')!.status).toBe('missing');
    expect(item(r, 'counselling')!.status).toBe('missing');
    expect(item(r, 'counselling')!.detail).toMatch(/decision/);
    expect(r.ready).toBe(false);
  });

  it('a declined decision is missing, with the reason', () => {
    const r = surgicalReadiness(complete({ review: { encounterId: 'e1', review: review({ counselling: { ...emptyCounselling(), decision: 'declines', understanding: 'good' } }) } }));
    expect(item(r, 'consent_decision')).toMatchObject({ status: 'missing', detail: 'The patient declined' });
  });

  it('an unsigned review warns but does not block', () => {
    const r = surgicalReadiness(complete({ review: { encounterId: 'e1', review: review({ status: 'draft' }) } }));
    expect(item(r, 'review')!.status).toBe('warning');
    expect(r.ready).toBe(true);
  });

  it('blocks on unreviewed red flags, and clears once the same flags are reviewed', () => {
    const flags = [{ level: 'red', fieldLabel: 'Anticoagulant', answerLabel: 'Warfarin', reason: 'x', source: 'answer' }] as never;
    const blocked = surgicalReadiness(complete({ review: { encounterId: 'e1', review: review({ flags }) } }));
    expect(item(blocked, 'red_flags')).toMatchObject({ status: 'missing', detail: 'Anticoagulant: Warfarin' });
    const s = surgery({ bookingApproval: { at: NOW, by: 'u1' }, redFlagReview: { at: NOW, by: 'u1', note: 'INR 1.1, bridging done', flags: ['Anticoagulant: Warfarin'] } });
    const cleared = surgicalReadiness(complete({ surgery: s, review: { encounterId: 'e1', review: review({ flags }) } }));
    expect(item(cleared, 'red_flags')!.status).toBe('done');
    expect(unresolvedRedFlags(s, review({ flags }))).toEqual([]);
  });

  it('ignores amber flags', () => {
    const flags = [{ level: 'amber', fieldLabel: 'Smoking', answerLabel: 'Yes', reason: 'x', source: 'answer' }] as never;
    expect(item(surgicalReadiness(complete({ review: { encounterId: 'e1', review: review({ flags }) } })), 'red_flags')!.status).toBe('done');
  });

  it('blocks while results are awaited, and warns on abnormal results', () => {
    const waiting = surgicalReadiness(complete({ investigations: [inv(), inv({ id: 'i2', status: 'requested', type: 'renal_function' })] }));
    expect(item(waiting, 'investigations')).toMatchObject({ status: 'missing' });
    expect(item(waiting, 'investigations')!.detail).toMatch(/Awaiting 1 of 2: renal function/);
    const bad = surgicalReadiness(complete({ investigations: [inv({ results: [{ value: 8, isAbnormal: true }] })] }));
    expect(item(bad, 'investigations')!.status).toBe('warning');
    expect(bad.ready).toBe(true);
  });

  it('counts only this operation\'s investigations', () => {
    const old = inv({ id: 'old', status: 'requested', requestedAt: new Date('2025-01-01') });
    const cancelled = inv({ id: 'c', status: 'cancelled' });
    const other = inv({ id: 'o', patientId: 'p2', status: 'requested' });
    expect(investigationsForSurgery(surgery(), [inv(), old, cancelled, other]).map(i => i.id)).toEqual(['i1']);
  });

  it('a withdrawn consent file no longer counts', () => {
    const withdrawn = doc('consent', { extractedFields: [{ key: 'surgeryAttachment', label: 'x', value: 'withdrawn' } as never] });
    expect(item(surgicalReadiness(complete({ documents: [withdrawn, doc('payment')] })), 'consent_form')!.status).toBe('missing');
  });

  it('the booking stage does not ask for the booking, the anaesthetic review or the conference', () => {
    const r = surgicalReadiness(complete({ surgery: surgery({ needsConference: true }), preAnaesthetic: [], stage: 'booking' }));
    expect(r.items.map(i => i.id)).not.toEqual(expect.arrayContaining(['booking']));
    expect(r.items.some(i => i.id === 'preanaesthetic' || i.id === 'conference')).toBe(false);
    expect(r.ready).toBe(true);
  });

  it('theatre needs fitness = fit for THIS surgery', () => {
    expect(item(surgicalReadiness(complete({ preAnaesthetic: [fit('optimize')] })), 'preanaesthetic')).toMatchObject({ status: 'missing', detail: 'Needs optimisation' });
    expect(item(surgicalReadiness(complete({ preAnaesthetic: [{ ...fit(), surgeryId: 'other' }] })), 'preanaesthetic')!.status).toBe('missing');
  });

  it('asks for the conference only when the surgery needs one', () => {
    expect(item(surgicalReadiness(complete()), 'conference')).toBeUndefined();
    const s = surgery({ bookingApproval: { at: NOW, by: 'u1' }, needsConference: true });
    expect(item(surgicalReadiness(complete({ surgery: s })), 'conference')!.status).toBe('missing');
    expect(item(surgicalReadiness(complete({ surgery: { ...s, conferenceCompletedAt: NOW } })), 'conference')!.status).toBe('done');
  });

  it('links every workflow item to its section', () => {
    const r = surgicalReadiness(complete({ documents: [] }));
    expect(item(r, 'consent_form')!.link).toBe('/surgery/workflow/p1?edit=s1&tab=uploads');
    expect(item(r, 'review')!.link).toContain('/patients/p1/procedure-review');
  });
});
