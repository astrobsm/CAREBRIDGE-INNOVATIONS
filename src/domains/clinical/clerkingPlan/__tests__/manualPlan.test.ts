import { describe, it, expect, vi, beforeEach } from 'vitest';

const { store, table, created } = vi.hoisted(() => {
  const store = { clerkingPlans: new Map<string, any>(), investigations: new Map<string, any>(), appointments: new Map<string, any>() };
  const table = (m: Map<string, any>) => ({
    get: async (id: string) => m.get(id),
    put: async (r: any) => { m.set(r.id, structuredClone(r)); return r.id; },
    where: () => ({ equals: (v: string) => ({ toArray: async () => [...m.values()].filter(x => x.patientId === v) }) }),
  });
  return { store, table, created: [] as any[] };
});
vi.mock('../../../../database', () => ({
  db: {
    clerkingPlans: table(store.clerkingPlans), investigations: table(store.investigations), appointments: table(store.appointments),
    patients: { get: async () => ({ id: 'p1', firstName: 'Ada', lastName: 'Okafor', hospitalNumber: 'H1', phone: '08030000000', gender: 'female' }) },
    hospitals: { get: async () => ({ name: 'Test Clinic' }) },
  },
}));
vi.mock('../../../../services/cloudSyncService', () => ({ syncRecord: vi.fn() }));
vi.mock('../../../../services/appointmentService', () => ({
  createAppointment: vi.fn(async (i: any) => { const a = { ...i, id: `a${created.length + 1}`, status: 'scheduled' }; created.push(a); store.appointments.set(a.id, a); return a; }),
}));
vi.mock('../../../../utils/whatsappShareUtils', () => ({ sharePDFOnWhatsApp: vi.fn() }));

import { getDrugById } from '../../../../data/bnfDrugDatabase';
import { surgicalProcedures } from '../../../../data/surgicalFees';
import { approvePlan, appointmentProposals, bookPlanAppointments, finalLinesOf, savePlanDraft, updatePlan } from '../service';
import { buildClinicianPlanDocument, buildPatientPlanDocument } from '../pdf';
import { buildRulesPlan } from '../rulesPlan';
import { patientFacts } from '../facts';
import { PATIENT_MEDICINE_BANNED } from '../patientMedicine';
import { PATIENT_COPY_EXCLUDE } from '../../procedureReview/pdf';
import { buildFinalPlan, manualLine } from '../finalPlan';
import {
  builderContext, counsellingLine, counsellingTopics, dressingOptions, duplicatesOf, followUpLine, freeTextLine, investigationCategories,
  investigationLine, investigationPanels, medicationCautions, medicationLine, medicationOptions, newManualIds, perKgDose, procedureLine,
  referralLine, referralSpecialties, withIds, woundCareLine, CLINICIAN_SOURCE,
} from '../manualPlan';
import { clerking, complaint } from './fixtures';

const user = { id: 'u1', firstName: 'Kene', lastName: 'Eze', role: 'surgeon', hospitalId: 'h1' } as any;
const patient = { id: 'p1', firstName: 'Ada', lastName: 'Okafor', phone: '08030000000' } as any;
const adultData = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')], vitals: { weight: 70 } });
const adultCtx = { ageYears: 45, sex: 'Female' };
const ctxFor = (data: ReturnType<typeof clerking>, ctx: { ageYears?: number; ageMonths?: number; sex?: string }, labs: Record<string, number> = {}) =>
  builderContext(patientFacts({ data, ctx, labs }));
const drug = (id: string) => getDrugById(id)!;
const docText = (d: { sections: { title: string; body?: string; bullets?: string[] }[] }) => d.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? [])]).join('\n');

beforeEach(() => { store.clerkingPlans.clear(); store.appointments.clear(); created.length = 0; });

describe('manual plan builder: catalogues', () => {
  it('investigations come from the protocol and the request catalogue; consultations are referrals, not tests', () => {
    const cats = investigationCategories();
    expect(cats[0].groups[0].tests.map(t => t.test.id)).toEqual(['fbc', 'esr_crp', 'glucose_hba1c', 'eucr', 'lft_albumin', 'iron_studies', 'zinc', 'vitamin_d', 'hiv', 'genotype', 'urinalysis', 'nutrition_screen', 'wound_baseline']);
    expect(cats.some(c => c.id === 'consultation')).toBe(false);
    expect(cats.find(c => c.id === 'hematology')!.groups[0].tests.find(t => t.key === 'cat:fbc')!.test.analytes).toEqual(['hb', 'wbc', 'plt', 'mcv']);
    expect(referralSpecialties().flatMap(g => g.items.map(i => i.name))).toContain('Plastic Surgery');
  });

  it('the wound clinic baseline panel is the rules plan\'s own baseline (same test ids, text and patient lines)', () => {
    const rules = buildRulesPlan({ data: adultData, ctx: adultCtx });
    const panel = investigationPanels().find(p => p.id === 'wp_baseline')!;
    const ruleTests = rules.lines.filter(l => l.id.startsWith('inv:wp_'));
    for (const t of panel.tests) {
      const r = ruleTests.find(l => l.test?.id === t.test.id)!;
      expect(r.text).toBe(t.label);
      expect(r.patient).toBe(t.patient);
    }
  });

  it('dressing types and frequencies come from the existing dressing guide and wound review', () => {
    const labels = dressingOptions().map(d => d.label);
    expect(labels).toEqual(expect.arrayContaining(['Hydrocolloid', 'Foam dressing', 'Alginate', 'Hydrogel', 'Honey', 'NPWT']));
    expect(labels.some(l => /e\.g\./.test(l))).toBe(false);
  });
});

describe('manual plan builder: lines', () => {
  it('every line is the clinician\'s, with a fresh id that is never reused', () => {
    const ids = newManualIds('investigations', 3, [{ id: 'manual:investigations:abc' }], 0);
    expect(new Set(ids).size).toBe(3);
    const again = newManualIds('investigations', 1, ids.map(id => ({ id })), 0);
    expect(ids).not.toContain(again[0]);
    const lines = withIds('investigations', investigationPanels()[0].tests, [], investigationLine, 1);
    expect(lines.every(l => l.source === CLINICIAN_SOURCE && l.source.label === 'Added by the clinician')).toBe(true);
    expect(lines.every(l => l.id.startsWith('manual:investigations:'))).toBe(true);
  });

  it('an adult medicine line has the structure and a clean patient line', () => {
    const ctx = ctxFor(adultData, adultCtx);
    const o = medicationOptions(drug('ibuprofen'), ctx, 'oral');
    expect(o.doses).toEqual(expect.arrayContaining(['400 mg', '200 mg', '600 mg']));
    expect(o.frequencies.slice(0, 2)).toEqual(['tds', 'qds']);
    const l = medicationLine({ drug: drug('ibuprofen'), route: 'oral', dose: '400 mg', frequency: 'tds', duration: '5 days' }, ctx, 'manual:medications:x');
    expect(l.medication).toMatchObject({ drug: 'Ibuprofen', dose: '400 mg', route: 'Oral (PO)', frequency: 'three times a day', duration: '5 days' });
    expect(l.medication!.cautions).toContain('Maximum daily dose: 2.4g.');
    expect(l.text).toBe('Ibuprofen 400 mg Oral (PO), three times a day (TDS), for 5 days');
    expect(l.patient).toBe('Ibuprofen – take 400 mg three times a day for 5 days.');
    expect(l.patient).not.toMatch(PATIENT_MEDICINE_BANNED);
  });

  it('a child dose is by weight, capped at the adult dose, with the basis shown; the patient line has no mg/kg', () => {
    const child = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')], vitals: { weight: 50 } });
    const ctx = ctxFor(child, { ageYears: 12, sex: 'Male' });
    expect(perKgDose('5-10mg/kg')).toEqual({ low: 5, high: 10, maxMg: undefined });
    expect(perKgDose('3-6mg/kg/day elemental iron in 2-3 divided doses')).toBeNull();
    const o = medicationOptions(drug('ibuprofen'), ctx, 'oral');
    expect(o.weight).toEqual({ dose: '250–400 mg', basis: '5–10 mg/kg × 50 kg = 250–500 mg, capped at 400 mg (never above the adult dose)', capped: true });
    const l = medicationLine({ drug: drug('ibuprofen'), route: 'oral', dose: o.weight!.dose, frequency: 'tds', duration: '3 days', weightBasis: o.weight!.basis }, ctx, 'manual:medications:c');
    expect(l.medication!.weightBasis).toMatch(/capped at 400 mg/);
    expect(l.patient).toBe('Ibuprofen – take 250–400 mg three times a day for 3 days.');
    expect(l.patient).not.toMatch(PATIENT_MEDICINE_BANNED);
    // Paracetamol: 15 mg/kg × 8 kg, under the 1 g adult cap; no weight → no dose offered.
    const baby = ctxFor(clerking({ complaints: [], vitals: { weight: 8 } }), { ageYears: 0, ageMonths: 10, sex: 'Female' });
    expect(medicationOptions(drug('paracetamol'), baby).weight).toMatchObject({ dose: '120 mg', capped: false });
    const noWeight = ctxFor(clerking({ complaints: [] }), { ageYears: 4, sex: 'Female' });
    expect(medicationOptions(drug('paracetamol'), noWeight)).toMatchObject({ weight: null, weightNote: 'Record the weight for a weight-based dose.' });
  });

  it('carries the formulary\'s renal flags at a known eGFR, and allergy warnings', () => {
    const ctx = ctxFor(adultData, adultCtx, { egfr: 25 });
    expect(ctx.egfr).toBe(25);
    const c = medicationCautions(drug('ibuprofen'), ctx);
    expect(c.some(x => /AVOID IN RENAL IMPAIRMENT \(GFR: 25\)/.test(x))).toBe(true);
    const amox = medicationCautions(drug('amoxicillin'), ctx);
    expect(amox.some(x => /Renal dose at eGFR 25: 500mg 24-hourly/.test(x))).toBe(true);
    const allergic = builderContext(patientFacts({ data: clerking({ complaints: [], allergies: ['Penicillin'] }), ctx: adultCtx }), ['Penicillin']);
    expect(medicationCautions(drug('amoxicillin'), allergic)[0]).toMatch(/PENICILLIN ALLERGY RECORDED/);
    // eGFR worked out from creatinine (umol/L) in adults when not reported.
    expect(ctxFor(adultData, adultCtx, { creatinine: 265 })).toMatchObject({ egfrSource: 'calculated' });
  });

  it('procedures, wound care, counselling, referrals and free text', () => {
    const graft = surgicalProcedures.find(p => /skin graft/i.test(p.name))!;
    const p = procedureLine(graft, '2w', 'manual:procedures:1');
    expect(p).toMatchObject({ section: 'procedures', urgency: 'routine' });
    expect(p.patient).toMatch(/: an operation, planned within the next 2 weeks\.$/);
    const w = woundCareLine({ dressing: 'foam_dressing', frequency: 'alternate', cleansing: 'saline', who: 'clinic' }, 'manual:procedures:2');
    expect(w.patient).toBe('Wound dressing: foam dressing, after cleaning the wound with clean salt water (saline), changed every other day at the clinic.');
    const topic = counsellingTopics().find(g => g.id.startsWith('edu:'))!.topics[0];
    expect(counsellingLine(topic, 'manual:counselling:1').patient).toMatch(/^We talked about /);
    expect(referralLine('Plastic Surgery', 'flap cover', 'soon', 'manual:referrals:1').text).toBe('Refer to Plastic Surgery: flap cover');
    expect(freeTextLine('medications', 'Zinc 1 mg/kg', true, 'manual:medications:f').patient).toBeUndefined();
    expect(freeTextLine('counselling', 'Keep the leg raised', true, 'manual:counselling:f').patient).toBe('Keep the leg raised');
    expect(freeTextLine('counselling', 'Keep the leg raised', false, 'manual:counselling:g').patient).toBeUndefined();
  });

  it('warns when a pick repeats a rules line: the same test, analyte, medicine or follow-up day', () => {
    const rules = buildRulesPlan({ data: adultData, ctx: adultCtx });
    const crp = investigationCategories().flatMap(c => c.groups.flatMap(g => g.tests)).find(t => t.key === 'cat:crp')!;
    expect(duplicatesOf(investigationLine(crp, 'manual:investigations:1'), rules.lines).map(l => l.id)).toEqual(['inv:wp_esr_crp']);
    const para = medicationLine({ drug: drug('paracetamol'), route: 'oral', dose: '1 g', frequency: 'q6h', duration: 'as needed' }, ctxFor(adultData, adultCtx), 'manual:medications:1');
    expect(duplicatesOf(para, rules.lines).map(l => l.id)).toEqual(['med:paracetamol']);
    const zinc = medicationLine({ drug: drug('zinc_sulfate'), route: 'oral', dose: '20 mg', frequency: 'od', duration: '4 weeks' }, ctxFor(adultData, adultCtx), 'manual:medications:2');
    expect(duplicatesOf(zinc, [{ id: 'med:wp_zinc', section: 'medications', text: 'Zinc (elemental): 25–50 mg daily', source: { kind: 'protocol', label: 'x' }, medication: { drug: 'Zinc (elemental)', dose: '25–50 mg', route: 'oral', frequency: '', duration: '', cautions: [] } }])).toHaveLength(1);
    expect(duplicatesOf(followUpLine('2w', { id: 'wound' }, 'manual:follow_up:1'), rules.lines).map(l => l.id)).toEqual(['fu:wp_2w']);
    expect(duplicatesOf(followUpLine('1w', { id: 'wound' }, 'manual:follow_up:2'), rules.lines)).toEqual([]);
  });
});

describe('manual lines in the final plan: approval, both PDFs and booking', () => {
  it('a manual plan (no rules lines needed) reaches both PDFs and the follow-up books after approval', async () => {
    const data = clerking({ complaints: [complaint('other', 'Lump on the back')], vitals: { weight: 70 } });
    let r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: data, ctx: adultCtx }, user);
    const ctx = builderContext(patientFacts({ data, ctx: adultCtx }));
    const manual = [
      ...withIds('investigations', investigationPanels()[0].tests.slice(0, 2), r.manualLines, investigationLine, 1),
      medicationLine({ drug: drug('paracetamol'), route: 'oral', dose: '1 g', frequency: 'q6h', duration: '5 days' }, ctx, 'manual:medications:a'),
      procedureLine(surgicalProcedures.find(p => /lipoma/i.test(p.name)) ?? surgicalProcedures[0], 'next_list', 'manual:procedures:a'),
      woundCareLine({ dressing: 'honey', frequency: 'daily', who: 'carer' }, 'manual:procedures:b'),
      followUpLine('2w', { id: 'postop' }, 'manual:follow_up:a'),
      referralLine('Dietitian / Nutritionist', 'weight loss', 'routine', 'manual:referrals:a'),
    ];
    r = await updatePlan(r.id, { manualLines: manual });
    expect(finalLinesOf(r).filter(l => l.source.kind === 'clinician')).toHaveLength(manual.length);
    r = await approvePlan(r.id, user);
    const input = { record: r, approval: r.approvals[0], patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date: new Date(2026, 10, 27) };
    const pt = docText(buildPatientPlanDocument(input)), cl = docText(buildClinicianPlanDocument(input));
    expect(pt).toContain('Full blood count: checks for low blood (anaemia) and signs of infection.');
    expect(pt).toContain('Paracetamol – take 1 g every 6 hours for 5 days.');
    expect(pt).toMatch(/: an operation, planned on the next available operating list\./);
    expect(pt).toContain('Wound dressing: honey, changed every day by your carer at home.');
    expect(pt).toMatch(/: Check after your operation/);
    expect(pt).not.toMatch(/elemental|e\.g\.|mg\/kg/i);
    expect(pt).not.toMatch(PATIENT_COPY_EXCLUDE);
    expect(pt).not.toMatch(/Dietitian/); // referrals are clinician-only
    expect(cl).toContain('Paracetamol (Acetaminophen) 1 g Oral (PO) every 6 hours for 5 days');
    expect(cl).toMatch(/Refer to Dietitian \/ Nutritionist: weight loss — source: clinician \(Added by the clinician\)/);
    expect(cl).toContain('source: clinician (Added by the clinician)');

    const { proposals } = appointmentProposals(r, new Date(r.approvals[0].at));
    const mine = proposals.find(p => p.lineId === 'manual:follow_up:a')!;
    expect(mine).toMatchObject({ when: 'In 2 weeks', purpose: 'Post-operative review' });
    r = await bookPlanAppointments(r.id, [mine], patient, user);
    expect(created).toHaveLength(1);
    expect(r.appointments.map(a => a.lineId)).toEqual(['manual:follow_up:a']);
  });

  it('a removed manual line leaves the plan; an edited one replaces the dose on both copies', async () => {
    let r = await savePlanDraft({ patientId: 'p2', source: 'initial', clerking: adultData, ctx: adultCtx }, user);
    const ctx = builderContext(patientFacts({ data: adultData, ctx: adultCtx }));
    const ibu = medicationLine({ drug: drug('ibuprofen'), route: 'oral', dose: '400 mg', frequency: 'tds', duration: '5 days' }, ctx, 'manual:medications:i');
    const fu = followUpLine('6w', { id: 'response' }, 'manual:follow_up:z');
    r = await updatePlan(r.id, { manualLines: [ibu, fu] });
    r = await updatePlan(r.id, { manualLines: r.manualLines.filter(l => l.id !== fu.id), decisions: [{ lineId: ibu.id, decision: 'accepted', editedText: 'Ibuprofen 200 mg three times a day with food for 3 days', at: new Date().toISOString() }] });
    r = await approvePlan(r.id, user);
    const lines = r.approvals[0].lines;
    expect(lines.some(l => l.id === fu.id)).toBe(false);
    const input = { record: r, approval: r.approvals[0], patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date: new Date(2026, 10, 27) };
    const pt = docText(buildPatientPlanDocument(input)), cl = docText(buildClinicianPlanDocument(input));
    expect(pt).toContain('Ibuprofen 200 mg three times a day with food for 3 days');
    expect(pt).not.toContain('take 400 mg');
    expect(cl).toContain('[edited by clinician]');
  });

  it('a record saved before the builder (old "+ add" lines) still loads, and new ids never collide with it', () => {
    const old = [manualLine('counselling', 'Elevate the leg', 1), manualLine('counselling', 'Stop smoking', 2)];
    const rules = buildRulesPlan({ data: adultData, ctx: adultCtx });
    const fresh = withIds('counselling', [{ id: 'x', label: 'x', text: 'Diet advice', patient: 'Eat well' }], old, counsellingLine, 2);
    const final = buildFinalPlan(rules.lines, [], [], [...old, ...fresh]);
    expect(final.filter(l => l.source.kind === 'clinician').map(l => l.text)).toEqual(['Elevate the leg', 'Stop smoking', 'Diet advice']);
  });
});
