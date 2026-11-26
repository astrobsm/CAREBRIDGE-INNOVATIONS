import { describe, it, expect } from 'vitest';
import { buildPatientPack, packText, packContents, renderPatientPack, SCORE_TERMS } from '../patientPack';
import { buildBeforeSurgery, classifyMedicine, medicineLines, medicinesFromReviewAnswers, defaultFastingLines } from '../beforeSurgery';
import { computeReview, toStored } from '../../clinical/procedureReview/compute';
import { emptyCounselling } from '../../clinical/procedureReview/consent';
import { skinGraft } from '../../clinical/procedureReview/procedures/reconstruction/skinGraft';
import { adult, provocativeAnswers } from '../../clinical/procedureReview/__tests__/fixtures';
import { getProcedureEducation } from '../../../data/patientEducation';
import type { Appointment, ConsumableBOM, Surgery } from '../../../types';

const NOW = new Date('2026-11-20T09:00:00');
const surgery: Surgery = {
  id: 's1', patientId: 'p1', hospitalId: 'h1', procedureName: 'Split skin graft', type: 'elective', category: 'intermediate',
  preOperativeAssessment: { asaScore: 3, capriniScore: 5, mallampatiScore: 2, npoStatus: true, consentSigned: true, bloodTyped: false, investigations: [], riskFactors: [] },
  scheduledDate: new Date('2026-11-25'), status: 'scheduled', surgeon: 'Dr A', surgeonFee: 200000, anaesthesiaFee: 50000, assistantFeePercentage: 20,
  anaesthesiaType: 'general', createdAt: NOW, updatedAt: NOW,
};
const bom = { consumables: [{ id: 'c1', name: 'Paraffin gauze', category: 'dressing', quantity: 4, unit: 'piece', unitPrice: 500, totalPrice: 2000, isReusable: false }], grandTotal: 2000 } as unknown as ConsumableBOM;
const appt = (over: Partial<Appointment>) => ({
  id: 'a', appointmentDate: new Date('2026-11-28'), appointmentTime: '09:00', status: 'scheduled', reasonForVisit: 'Split skin graft: First graft inspection', ...over,
} as Appointment);

function storedReview() {
  const answers = provocativeAnswers(skinGraft, 'pre_op');
  const input = {
    module: skinGraft, phase: 'pre_op' as const, answers, patient: adult(), prior: [],
    counselling: { ...emptyCounselling(), decision: 'consents' as const },
    pdfPatient: { name: 'Ada Obi', hospitalNumber: 'H-1' }, clinician: { id: 'u1', name: 'Dr Eze' }, now: NOW.toISOString(),
  };
  const c = computeReview(input);
  return toStored(input, c, { status: 'signed', version: 2, createdBy: 'u1', createdByName: 'Dr Eze' });
}

function pack(over: Partial<Parameters<typeof buildPatientPack>[0]> = {}) {
  return buildPatientPack({
    surgery, patient: { name: 'Ada Obi', hospitalNumber: 'H-1' }, hospitalName: 'Clinic', clinicPhone: '0803',
    review: { module: skinGraft, stored: storedReview() }, education: getProcedureEducation(skinGraft.catalog.educationId ?? '') ?? null,
    bom, before: buildBeforeSurgery({ anaesthesiaType: 'general', medicines: ['Metformin 500mg', 'Rivaroxaban', 'Amlodipine'] }),
    appointments: [appt({}), appt({ id: 'b', status: 'cancelled' }), appt({ id: 'old', appointmentDate: new Date('2026-11-01') })],
    now: NOW, ...over,
  });
}

describe('patient pack', () => {
  it('has every part, in order', () => {
    const titles = packContents(pack());
    const order = ['Your diagnosis and plan', 'What to buy before your operation', 'Your cost estimate', 'Before your operation: eating and drinking',
      'Your medicines before your operation', 'After your operation', 'Get help straight away if', 'Your follow-up dates'];
    const idx = order.map(t => titles.indexOf(t));
    expect(idx.every(i => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('never shows a score, even with a provocative review and an ASA 3 / Caprini 5 surgery', () => {
    const text = packText(pack());
    expect(text).not.toMatch(SCORE_TERMS);
    expect(text).not.toMatch(/\bscore|\bflag|safeguard|PHQ|alcohol/i);
  });

  it('reuses the review patient copy (aims of treatment) and drops its own follow-up section', () => {
    const d = pack();
    expect(d.sections.some(s => s.title === 'The aims of your treatment')).toBe(true);
    expect(d.sections.filter(s => s.kind === 'follow_up')).toHaveLength(1);
  });

  it('lists the booked future follow-up dates only, in plain words', () => {
    const f = pack().sections.find(s => s.title === 'Your follow-up dates')!;
    expect(f.bullets).toEqual(['Saturday 28 November 2026 at 09:00: First graft inspection']);
  });

  it('shows the shopping list and the cost estimate', () => {
    const d = pack();
    expect(d.sections.find(s => s.title === 'What to buy before your operation')!.bullets).toEqual(['Paraffin gauze x 4 piece']);
    const cost = d.sections.find(s => s.title === 'Your cost estimate')!.bullets!;
    expect(cost[cost.length - 1]).toMatch(/Total estimate: .*292,000/);
  });

  it('after-surgery content comes from the procedure, never "standard instructions apply"', () => {
    const after = pack().sections.find(s => s.title === 'After your operation')!;
    expect(after.bullets!.length).toBeGreaterThan(0);
    expect(packText(pack())).not.toMatch(/standard postoperative care instructions apply/i);
    const noEdu = pack({ education: null, review: null }).sections.find(s => s.title === 'After your operation')!;
    expect(noEdu.bullets!.length).toBeGreaterThan(0);
  });

  it('renders a PDF', () => {
    const doc = renderPatientPack(pack());
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});

describe('before-surgery sheet', () => {
  it('uses 6 h food / 2 h clear fluids for a general anaesthetic, and local wording for a local', () => {
    expect(defaultFastingLines('general').join(' ')).toMatch(/6 hours.*2 hours/);
    expect(defaultFastingLines('local').join(' ')).toMatch(/local anaesthetic only/);
    expect(defaultFastingLines('general', 1).join(' ')).toMatch(/breast milk .*4 hours/);
  });

  it('the clinician\'s edited fasting text replaces the default', () => {
    expect(buildBeforeSurgery({ medicines: [], fastingText: 'Nothing after midnight\n\nWater until 6am' }).fasting).toEqual(['Nothing after midnight', 'Water until 6am']);
  });

  it('gives medicine lines only for medicines recorded, with the standard guidance', () => {
    expect(classifyMedicine('Xarelto 20mg')).toBe('doac');
    expect(classifyMedicine('empagliflozin')).toBe('sglt2');
    expect(classifyMedicine('Metformin')).toBe('metformin');
    const lines = medicineLines(['Warfarin 5mg', 'warfarin 5mg', 'Clopidogrel', 'Dapagliflozin', 'Herbal mixture', 'Amlodipine', 'none']);
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/^Warfarin 5mg: .*5 days/);
    expect(lines[2]).toMatch(/3 days/);
    expect(lines[3]).toMatch(/2 weeks/);
    expect(lines[4]).toMatch(/ask your anaesthetist/i);
    expect(buildBeforeSurgery({ medicines: [] }).medsIntro).toMatch(/no medicines recorded/);
  });

  it('reads medicines from the review answers', () => {
    expect(medicinesFromReviewAnswers({ 'core.anticoagulant': ['warfarin', 'aspirin'], 'core.diabetes': 'insulin', 'core.traditional_remedies': 'oral' }))
      .toEqual(['Warfarin', 'Aspirin', 'Insulin', 'Herbal or traditional remedies']);
    expect(medicinesFromReviewAnswers({ 'core.anticoagulant': ['none'] })).toEqual([]);
  });
});
