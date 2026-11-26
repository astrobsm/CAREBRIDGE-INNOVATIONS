import { describe, it, expect, vi, beforeEach } from 'vitest';

const { store, table, created, shared } = vi.hoisted(() => {
  const store = { clerkingPlans: new Map<string, any>(), investigations: new Map<string, any>(), appointments: new Map<string, any>() };
  const table = (m: Map<string, any>) => ({
    get: async (id: string) => m.get(id),
    put: async (r: any) => { m.set(r.id, structuredClone(r)); return r.id; },
    where: () => ({ equals: (v: string) => ({ toArray: async () => [...m.values()].filter(x => x.patientId === v) }) }),
  });
  return { store, table, created: [] as any[], shared: [] as any[] };
});
vi.mock('../../../../database', () => ({
  db: {
    clerkingPlans: table(store.clerkingPlans), investigations: table(store.investigations), appointments: table(store.appointments),
    patients: { get: async () => ({ id: 'p1', firstName: 'Ada', lastName: 'Okafor', hospitalNumber: 'H1', phone: '08030000000', gender: 'male' }) },
    hospitals: { get: async () => ({ name: 'Test Clinic' }) },
  },
}));
vi.mock('../../../../services/cloudSyncService', () => ({ syncRecord: vi.fn() }));
vi.mock('../../../../services/appointmentService', () => ({
  createAppointment: vi.fn(async (i: any) => { const a = { ...i, id: `a${created.length + 1}`, status: 'scheduled' }; created.push(a); store.appointments.set(a.id, a); return a; }),
}));
vi.mock('../../../../utils/whatsappShareUtils', () => ({ sharePDFOnWhatsApp: vi.fn(async (...a: any[]) => { shared.push(a); }) }));

import { approvePlan, appointmentProposals, bookPlanAppointments, finalLinesOf, savePlanDraft, saveResultsToInvestigations, shareWithPatient, updatePlan } from '../service';
import { buildPatientPlanDocument, buildClinicianPlanDocument } from '../pdf';
import { enterValue, qualitativeValue } from '../results';
import { PATIENT_COPY_EXCLUDE } from '../../procedureReview/pdf';
import { SCORE_TERMS } from '../../../patient-pack/patientPack';
import { clerking, complaint } from './fixtures';

const user = { id: 'u1', firstName: 'Kene', lastName: 'Eze', role: 'surgeon', hospitalId: 'h1' } as any;
const patient = { id: 'p1', firstName: 'Ada', lastName: 'Okafor', phone: '08030000000' } as any;
const data = clerking({
  complaints: [complaint('cond_syndactyly', 'Syndactyly (webbed / joined fingers)', { syn_webs: ['Middle–ring (3rd web)'], syn_side: 'Right' })],
  vitals: { weight: 8 },
});

beforeEach(() => { store.clerkingPlans.clear(); store.investigations.clear(); created.length = 0; shared.length = 0; });

describe('plan lifecycle', () => {
  it('nothing is shared or booked before approval', async () => {
    const r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: data, ctx: { ageYears: 0, ageMonths: 8, sex: 'Male' } }, user);
    expect(r.status).toBe('draft');
    await expect(shareWithPatient(r.id, 'whatsapp', user)).rejects.toThrow(/Approve the plan first/);
    await expect(bookPlanAppointments(r.id, [], patient, user)).rejects.toThrow(/Approve the plan first/);
    expect(shared).toHaveLength(0);
    expect(appointmentProposals(r).proposals).toEqual([]);
  });

  it('approve records version, approver and time; share logs; appointments are idempotent', async () => {
    const r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: data, ctx: { ageYears: 0, ageMonths: 8, sex: 'Male' } }, user);
    const a = await approvePlan(r.id, user);
    expect(a).toMatchObject({ status: 'approved', planVersion: 1 });
    expect(a.approvals[0]).toMatchObject({ version: 1, by: 'u1', byName: 'Kene Eze', includesAi: false });
    const s = await shareWithPatient(r.id, 'whatsapp', user);
    expect(shared[0][1]).toMatch(/^treatment-plan-ada-okafor-/);
    expect(shared[0][2]).toBe('08030000000');
    expect(s.shares[0]).toMatchObject({ via: 'whatsapp', audience: 'patient', planVersion: 1 });
    const { proposals, undated } = appointmentProposals(s, new Date(a.approvals[0].at));
    expect(proposals.map(p => p.purpose)).toContain('Surgical planning visit: consent, anaesthetic review, X-ray review');
    expect(undated.length).toBeGreaterThan(0); // "2–3 weeks after the operation" is not dateable yet
    const b1 = await bookPlanAppointments(r.id, proposals, patient, user);
    const b2 = await bookPlanAppointments(r.id, proposals, patient, user);
    expect(created).toHaveLength(new Set(proposals.map(p => p.date)).size);
    expect(b2.appointments).toHaveLength(b1.appointments.length);
    expect(appointmentProposals(b2).proposals).toEqual([]);
    expect(created[0]).toMatchObject({ type: 'follow_up', appointmentTime: '09:00', patientWhatsApp: '08030000000' });
  });

  it('results are saved to investigation rows and update the plan', async () => {
    const wound = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')], vitals: { weight: 70 } });
    const r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: wound, ctx: { ageYears: 50, sex: 'Male' } }, user);
    const withResults = await updatePlan(r.id, { results: [enterValue('fbc', 'hb', 8.5, 'g/dL'), enterValue('iron_studies', 'ferritin', 10, 'ng/mL'), qualitativeValue('hiv', 'Negative')] });
    expect(withResults.rulesPlan.lines.find(l => l.id === 'med:wp_iron')?.withheld).toBeUndefined();
    const saved = await saveResultsToInvestigations(withResults, user, patient);
    expect(store.investigations.size).toBe(3);
    expect(saved.results.every(v => v.investigationId)).toBe(true);
    const inv = [...store.investigations.values()].find(i => i.results.some((x: any) => x.parameter === 'Haemoglobin'));
    expect(inv).toMatchObject({ status: 'completed', patientId: 'p1', category: 'laboratory' });
    await saveResultsToInvestigations(saved, user, patient);
    expect(store.investigations.size).toBe(3); // re-saving updates, never duplicates
  });
});

describe('PDF section models', () => {
  it('patient copy: plain English, no scores, flags or sensitive content; clinician copy: sources and AI labelled', async () => {
    const wound = clerking({ complaints: [complaint('foot_ulcer', 'Foot ulcer / diabetic foot', { df_ex_iwgdf: '2 — mild (skin / subcutaneous, erythema 0.5–2 cm)' })], pmh: { diabetes: 'Yes' }, vitals: { weight: 80 }, social: { alcohol: 'Heavy' } });
    let r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: wound, ctx: { ageYears: 60, sex: 'Male' } }, user);
    r = await updatePlan(r.id, { aiDraft: { draft: {} as any, lines: [{ id: 'ai:medications:x', section: 'medications', text: 'Metformin review', source: { kind: 'ai', label: 'Claude' }, medication: { drug: 'Metformin', dose: '500 mg', route: 'oral', frequency: 'twice a day', duration: 'ongoing', cautions: [] } }], inputsHash: r.rulesPlan.inputsHash, at: 'x', missingHardRules: [] },
      decisions: [{ lineId: 'ai:medications:x', decision: 'accepted', at: 'x' }] });
    r = await approvePlan(r.id, user);
    const input = { record: r, approval: r.approvals[0], patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date: new Date('2026-11-27') };
    const p = buildPatientPlanDocument(input);
    const text = p.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? [])]).join('\n');
    expect(PATIENT_COPY_EXCLUDE.test(text)).toBe(false);
    expect(SCORE_TERMS.test(text)).toBe(false);
    console.log('OFFENDING', text.split('\n').filter(l => /IWGDF|protocol|source:|hard rule/i.test(l)).join(' || '));
    expect(text).not.toMatch(/IWGDF|protocol|source:|hard rule/i);
    expect(p.sections.map(s => s.title)).toEqual(expect.arrayContaining(['What we found', 'Your tests and why we need them', 'Your medicines and how to take them', 'Get help straight away if', 'Your follow-up visits']));
    expect(text).toMatch(/Diabetic foot ulcer/);
    expect(text).toMatch(/Metformin: 500 mg/);
    expect(text).toMatch(/Full blood count: checks for low blood/);
    const c = buildClinicianPlanDocument(input);
    const ctext = c.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? [])]).join('\n');
    expect(ctext).toMatch(/source: protocol/);
    expect(ctext).toMatch(/AI-drafted, accepted by clinician/);
    expect(ctext).toMatch(/Hard rules/);
    expect(ctext).toMatch(/AstroHEALTH Wound Clinic Protocol/);
    expect(finalLinesOf(r).some(l => l.source.kind === 'ai')).toBe(true);
  });
});
