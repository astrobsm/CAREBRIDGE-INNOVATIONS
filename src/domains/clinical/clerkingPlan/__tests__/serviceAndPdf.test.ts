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
import { buildRulesPlan } from '../rulesPlan';
import { plainMedicineLine, PATIENT_MEDICINE_BANNED } from '../patientMedicine';
import { patientText } from '../../../patient-pack/locale/en';

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
    expect(text).toMatch(/Metformin – take 500 mg twice a day, ongoing\./);
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

describe('patient copy medicine lines (owner decision 2026-11-27): plain words, clinician copy unchanged', () => {
  const docText = (d: ReturnType<typeof buildPatientPlanDocument>) => d.sections.flatMap(s => [s.title, s.body ?? '', ...(s.bullets ?? [])]).join('\n');
  const medsOf = (d: ReturnType<typeof buildPatientPlanDocument>) => d.sections.find(s => s.title === 'Your medicines and how to take them')!.bullets!;
  const approvedDocs = async (clerkingData: ReturnType<typeof clerking>, ctx: { ageYears: number; ageMonths?: number; sex: string }, results: ReturnType<typeof enterValue>[]) => {
    let r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: clerkingData, ctx }, user);
    r = await updatePlan(r.id, { results });
    r = await approvePlan(r.id, user);
    const input = { record: r, approval: r.approvals[0], patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date: new Date(2026, 10, 27) };
    return { patient: buildPatientPlanDocument(input), clinician: buildClinicianPlanDocument(input) };
  };
  const labs = () => [enterValue('fbc', 'hb', 8.5, 'g/dL'), enterValue('iron_studies', 'ferritin', 10, 'ng/mL'), enterValue('zinc', 'zinc', 50, 'mcg/dL'), enterValue('vitamin_d', 'vitaminD', 12, 'ng/mL')];

  it('adult: name, amount, how often, how long and one tip; no "elemental", "e.g." or mg/kg', async () => {
    const adult = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')], vitals: { weight: 70 }, social: { smoking: 'Current smoker' } });
    const { patient, clinician } = await approvedDocs(adult, { ageYears: 50, sex: 'Male' }, labs());
    const meds = medsOf(patient);
    expect(meds).toContain('Zinc tablet – take 1 tablet (50 mg) once a day with food for 8–12 weeks. Do not take it at the same time as your iron tablet.');
    expect(meds.some(m => /^Iron tablet – take 1 tablet \(ferrous sulphate 200 mg\) once a day or every other day/.test(m))).toBe(true);
    expect(meds.some(m => /^Multivitamin with minerals – take 1 tablet once a day/.test(m))).toBe(true);
    expect(meds.some(m => /^Vitamin C tablet – take 500 mg once a day/.test(m))).toBe(true);
    expect(meds.some(m => /^Vitamin D3 – take 50,000 units once a week for 8 weeks/.test(m))).toBe(true);
    expect(meds.some(m => /^Paracetamol 500 mg tablets – take 2 tablets \(1 g\)/.test(m))).toBe(true);
    const text = docText(patient);
    expect(text).not.toMatch(/elemental/i);
    expect(text).not.toMatch(/e\.g\./i);
    expect(text).not.toMatch(/mg\/kg/i);
    // The clinician copy keeps the protocol's full wording.
    const ctext = docText(clinician);
    expect(ctext).toContain('25–50 mg daily with food (e.g. zinc sulphate 220 mg = 50 mg elemental)');
    expect(ctext).toContain('Zinc (elemental)');
  });

  it('child: the dose worked out for the child only, no mg/kg working', async () => {
    const child = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer', { cw_ex_exudate: 'Heavy' })], vitals: { weight: 30 }, pmh: { malnutrition: 'Yes', sickle_cell: 'Yes' }, social: { diet: 'Poor intake' } });
    const { patient, clinician } = await approvedDocs(child, { ageYears: 10, sex: 'Female' }, labs());
    const meds = medsOf(patient);
    expect(meds.some(m => /^Iron – give 90 mg once a day/.test(m))).toBe(true);
    expect(meds.some(m => /^Zinc – give 15–30 mg once a day with food for 8–12 weeks/.test(m))).toBe(true);
    expect(meds.some(m => /^Vitamin C – give 250 mg once a day/.test(m))).toBe(true);
    expect(meds.some(m => /^Vitamin D3 – give 3,000–6,000 units once a day for 12 weeks, then 600 units once a day/.test(m))).toBe(true);
    expect(meds.some(m => /^Folic acid – give 5 mg once a day, every day/.test(m))).toBe(true);
    expect(meds.some(m => /^Paracetamol – give 450 mg every 6 hours/.test(m))).toBe(true);
    const text = docText(patient);
    expect(text).not.toMatch(/elemental|e\.g\.|mg\/kg|\bIU\b/i);
    expect(docText(clinician)).toMatch(/3 mg\/kg × 30 kg = 90 mg/);
  });

  it('condition medicines have plain patient lines', () => {
    const foot = buildRulesPlan({ data: clerking({ complaints: [complaint('foot_ulcer', 'Foot ulcer / diabetic foot', { df_ex_iwgdf: '2 — mild (skin / subcutaneous, erythema 0.5–2 cm)' })], pmh: { diabetes: 'Yes' }, vitals: { weight: 80 } }), ctx: { ageYears: 60, sex: 'Male' } });
    expect(foot.lines.find(l => l.id === 'med:df_oral')?.patient).toBe('Co-amoxiclav antibiotic – take 1 tablet (625 mg) three times a day for 1–2 weeks. Finish the course, even if the wound looks better.');
    for (const l of foot.lines.filter(x => x.section === 'medications' && x.medication && x.medication.dose !== '-')) {
      expect(l.patient, l.id).toBeTruthy();
      expect(PATIENT_MEDICINE_BANNED.test(l.patient!), l.patient).toBe(false);
    }
  });

  it('every plain template, in every variant, is free of "elemental", "e.g." and mg/kg', () => {
    const M = patientText.plan.medicines as Record<string, (k: any) => string>;
    const variants = [{}, { child: true }, { child: false }, { child: true, dose: '10 mg' }, { child: true, dose: null }, { child: false, light: true },
      { child: true, continuous: true }, { child: false, continuous: true }, { child: true, dose: '2,000 units', then: '400 units' }, { child: false, drip: true },
      { penicillinAllergy: true }, { penicillinAllergy: false }, { start: '4 mg' }, { start: null }, { child: true, severe: true, dose: '60–120 mg' }];
    expect(Object.keys(M)).toEqual(expect.arrayContaining(['multivitamin', 'vitamin_c', 'zinc', 'iron', 'vitamin_d', 'b12', 'folic_acid', 'vitamin_a', 'paracetamol', 'ibuprofen', 'coamoxiclav', 'flucloxacillin', 'clindamycin', 'propranolol']));
    for (const [id, fn] of Object.entries(M)) for (const v of variants) {
      const t = fn({ duration: 'for 5 days', ...v });
      expect(PATIENT_MEDICINE_BANNED.test(t), `${id}: ${t}`).toBe(false);
      expect(PATIENT_COPY_EXCLUDE.test(t), `${id}: ${t}`).toBe(false);
      expect(t, id).not.toMatch(/undefined|null/);
    }
  });

  it('a medicine with no template falls back to a cleaned line, not the raw protocol text', () => {
    expect(plainMedicineLine({ drug: 'Zinc (elemental)', dose: '25–50 mg daily with food (e.g. zinc sulphate 220 mg = 50 mg elemental)', route: 'oral', frequency: '', duration: '8–12 weeks', cautions: [] }))
      .toBe('Zinc – take 25–50 mg daily with food for 8–12 weeks.');
    expect(plainMedicineLine({ drug: 'Paracetamol', dose: '15 mg/kg', route: 'oral', frequency: 'every 6 hours', duration: '', cautions: [] })).toBe('Paracetamol – take the dose on your prescription every 6 hours.');
    expect(plainMedicineLine({ drug: 'Clotrimazole 1% cream', dose: 'thin layer', route: 'topical', frequency: 'twice a day', duration: '2–4 weeks', cautions: [] })).toBe('Clotrimazole 1% cream – use thin layer twice a day for 2–4 weeks.');
    expect(plainMedicineLine({ drug: 'No antibiotic', dose: '-', route: '-', frequency: '-', duration: '-', cautions: [] })).toBeUndefined();
  });
});

describe('PDF file names use the local date, not the UTC date', () => {
  it('a plan made at 00:30 West Africa Time on 27 Nov is named 27 Nov (UTC is still 26 Nov)', async () => {
    let r = await savePlanDraft({ patientId: 'p1', source: 'initial', clerking: data, ctx: { ageYears: 0, ageMonths: 8, sex: 'Male' } }, user);
    r = await approvePlan(r.id, user);
    const date = new Date('2026-11-27T00:30:00+01:00');
    const input = { record: r, approval: { ...r.approvals[0], at: date.toISOString() }, patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date };
    const local = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const p = buildPatientPlanDocument(input), c = buildClinicianPlanDocument(input);
    expect(p.fileName).toBe(`treatment-plan-ada-okafor-${local}.pdf`);
    expect(c.fileName).toBe(`treatment-plan-ada-okafor-${local}-v1.pdf`);
    expect(c.meta?.Date).toBe(local);
    expect(c.meta?.Approved).toMatch(new RegExp(`${local}$`));
    // On a West Africa Time clock (UTC+1, this practice) the local date is the 27th while UTC is the 26th.
    if (date.getTimezoneOffset() === -60) {
      expect(local).toBe('2026-11-27');
      expect(date.toISOString().slice(0, 10)).toBe('2026-11-26');
    }
  });
});

describe('an edited line reaches both PDFs (no stale dose)', () => {
  it('the edited zinc dose replaces the original on the clinician and patient copies', async () => {
    const adult = clerking({ complaints: [complaint('chronic_ulcer', 'Non-healing wound / chronic ulcer')], vitals: { weight: 70 } });
    let r = await savePlanDraft({ patientId: 'p-edit', source: 'initial', clerking: adult, ctx: { ageYears: 50, sex: 'Male' } }, user);
    r = await updatePlan(r.id, { results: [enterValue('zinc', 'zinc', 50, 'mcg/dL')] });
    const zinc = r.rulesPlan.lines.find(l => l.section === 'medications' && /zinc/i.test(l.text) && !l.withheld)!;
    expect(zinc).toBeTruthy();
    const edited = 'Zinc 25 mg once daily with food for 4 weeks';
    r = await updatePlan(r.id, { decisions: [{ lineId: zinc.id, decision: 'accepted', editedText: edited, at: new Date().toISOString() }] });
    r = await approvePlan(r.id, user);
    const input = { record: r, approval: r.approvals[0], patient: { name: 'Ada Okafor', hospitalNumber: 'H1' }, date: new Date(2026, 10, 27) };
    const text = (d: ReturnType<typeof buildPatientPlanDocument>) => d.sections.flatMap(s => [s.body ?? '', ...(s.bullets ?? [])]).join('\n');
    const patient = text(buildPatientPlanDocument(input)), clinician = text(buildClinicianPlanDocument(input));
    expect(clinician).toContain(edited);
    expect(clinician).toContain('[edited by clinician]');
    expect(patient).toContain(edited);
    expect(patient).not.toMatch(/Zinc tablet – take 1 tablet \(50 mg\)/);
  });
});
