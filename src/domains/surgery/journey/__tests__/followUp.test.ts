import { describe, it, expect } from 'vitest';
import {
  proposeFollowUps, groupByDate, planItem, mergePlan, dischargeProposals, nextSeriesOffers, appointmentText, updateItem,
} from '../followUpPlan';
import { selectRecallList, recallCount } from '../recall';
import { getModule } from '../../../clinical/procedureReview/registry';
import type { Appointment, Surgery, SurgeryFollowUpPlan } from '../../../../types';

const OP = new Date('2026-11-02T10:30:00');
const NOW = new Date('2026-11-02T15:00:00');
const skinGraft = getModule('skin_graft')!;
const freeFlap = getModule('free_flap')!;
const tumour = getModule('skin_tumour_excision')!;
const wound = getModule('wound_care_review')!;

describe('proposeFollowUps', () => {
  it('books each window at its start, from the operation date (months x30)', () => {
    const p = proposeFollowUps({ module: skinGraft, operationDate: OP, dischargeDate: OP });
    expect(p.map(x => [x.when, x.dueDate, x.action])).toEqual([
      ['Day 3–7', '2026-11-05', 'book'],
      ['Day 10–14', '2026-11-12', 'book'],
      ['Weeks 2–3', '2026-11-16', 'book'],
      ['3 months', '2027-01-31', 'book'],
      ['6 and 12 months', '2027-05-01', 'book'],
      ['6 and 12 months', '2027-10-28', 'book'],
    ]);
  });

  it('never proposes ward frequencies', () => {
    const p = proposeFollowUps({ module: freeFlap, operationDate: OP, dischargeDate: null });
    expect(p.some(x => /Daily/.test(x.when))).toBe(false);
  });

  it('waits for the discharge for "after discharge" visits while admitted, and dates them once discharged', () => {
    const p = proposeFollowUps({ module: freeFlap, operationDate: OP, dischargeDate: null });
    const after = p.filter(x => x.from === 'discharge');
    expect(after.map(x => [x.action, x.dueDate, x.day])).toEqual([['pending_discharge', undefined, 14], ['pending_discharge', undefined, 42]]);
    const plan: SurgeryFollowUpPlan = mergePlan(undefined, freeFlap.id, after.map(x => planItem(x, 'pending_discharge', [], NOW)), NOW);
    expect(dischargeProposals(plan, new Date('2026-11-10')).map(x => x.dueDate)).toEqual(['2026-11-24', '2026-12-22']);
  });

  it('a day case (discharged on the operation day) books "after discharge" visits straight away', () => {
    const p = proposeFollowUps({ module: freeFlap, operationDate: OP, dischargeDate: OP }).filter(x => x.from === 'discharge');
    expect(p.map(x => x.dueDate)).toEqual(['2026-11-16', '2026-12-14']);
  });

  it('puts conditional visits on recall, with the template text and due date', () => {
    const r = proposeFollowUps({ module: tumour, operationDate: OP, dischargeDate: OP }).filter(x => x.action === 'recall');
    expect(r.map(x => x.when)).toEqual(['BCC', 'cSCC', 'Albinism or transplant recipients']);
    expect(r[0].dueDate).toBe('2026-11-30');
  });

  it('books only the first visit of a recurring series', () => {
    const p = proposeFollowUps({ module: wound, operationDate: OP, dischargeDate: OP });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ kind: 'next', everyDays: 14, dueDate: '2026-11-16', action: 'book' });
  });

  it('is idempotent: visits already in the plan are not proposed again', () => {
    const first = proposeFollowUps({ module: skinGraft, operationDate: OP, dischargeDate: OP });
    const plan = mergePlan(undefined, skinGraft.id, first.map(x => planItem(x, 'booked', ['a'], NOW)), NOW);
    expect(proposeFollowUps({ module: skinGraft, operationDate: OP, dischargeDate: OP, existing: plan })).toEqual([]);
    const again = mergePlan(plan, skinGraft.id, first.map(x => planItem(x, 'booked', ['b'], NOW)), NOW);
    expect(again.items).toHaveLength(first.length);
    expect(again.items.every(i => i.appointmentIds[0] === 'a')).toBe(true);
  });

  it('a cancelled visit stays cancelled (its key is kept)', () => {
    const first = proposeFollowUps({ module: skinGraft, operationDate: OP, dischargeDate: OP });
    let plan = mergePlan(undefined, skinGraft.id, first.map(x => planItem(x, 'booked', [], NOW)), NOW);
    plan = updateItem(plan, first[0].key, { status: 'cancelled' }, NOW);
    expect(proposeFollowUps({ module: skinGraft, operationDate: OP, dischargeDate: OP, existing: plan })).toEqual([]);
  });
});

describe('groupByDate', () => {
  it('books one appointment for visits on the same day, and skips recall / pending', () => {
    const p = proposeFollowUps({ module: getModule('diabetic_foot_debridement')!, operationDate: OP, dischargeDate: OP });
    const g = groupByDate(p);
    expect(g[0]).toMatchObject({ date: '2026-11-09' });
    expect(g[0].proposals).toHaveLength(2);
    expect(appointmentText('Debridement', g[0].proposals).notes).toContain('(template: 1–2 weeks after discharge)');
    expect(g.flatMap(x => x.proposals).some(x => x.action !== 'book')).toBe(false);
  });
});

const appt = (over: Partial<Appointment>): Appointment => ({
  id: 'a1', appointmentNumber: 'APT-1', patientId: 'p1', hospitalId: 'h1', appointmentDate: new Date('2026-11-16'), appointmentTime: '09:00',
  duration: 30, type: 'post_operative', priority: 'routine', status: 'scheduled', location: { type: 'hospital' }, reasonForVisit: 'Wound review',
  clinicianId: 'u1', patientWhatsApp: '0803', reminderEnabled: true, reminderSchedule: [], bookedBy: 'u1', bookedAt: NOW,
  createdAt: NOW, updatedAt: NOW, ...over,
});

const surgery = (plan?: SurgeryFollowUpPlan, over: Partial<Surgery> = {}): Surgery => ({
  id: 's1', patientId: 'p1', hospitalId: 'h1', procedureName: 'Wound debridement', type: 'elective', category: 'minor',
  preOperativeAssessment: { asaScore: 1, npoStatus: false, consentSigned: true, bloodTyped: false, investigations: [], riskFactors: [] },
  scheduledDate: OP, status: 'completed', surgeon: 'Dr A', followUpPlan: plan, createdAt: OP, updatedAt: OP, ...over,
});

describe('nextSeriesOffers', () => {
  const p = proposeFollowUps({ module: wound, operationDate: OP, dischargeDate: OP });
  const plan = mergePlan(undefined, wound.id, [planItem(p[0], 'booked', ['a1'], NOW)], NOW);

  it('offers nothing while the visit is still to come', () => {
    expect(nextSeriesOffers([surgery(plan)], [appt({})])).toEqual([]);
  });

  it('offers the next visit everyDays after the completed one', () => {
    const done = appt({ status: 'completed', completedAt: new Date('2026-11-17T10:00:00') });
    expect(nextSeriesOffers([surgery(plan)], [done]).map(o => o.dueDate)).toEqual(['2026-12-01']);
  });

  it('a stopped series offers nothing', () => {
    const stopped = updateItem(plan, p[0].key, { status: 'stopped' }, NOW);
    expect(nextSeriesOffers([surgery(stopped)], [appt({ status: 'completed' })])).toEqual([]);
  });
});

describe('selectRecallList', () => {
  const patients = [{ id: 'p1', firstName: 'Ada', lastName: 'Obi', phone: '0803' }];
  const later = new Date('2026-11-20T12:00:00');

  it('lists a past appointment that was not attended, and a no-show', () => {
    const list = selectRecallList({ appointments: [appt({}), appt({ id: 'a2', status: 'no_show', appointmentDate: new Date('2026-11-18') })], surgeries: [], patients, now: later });
    expect(list.map(e => [e.kind, e.dueDate, e.overdueDays])).toEqual([['missed', '2026-11-16', 4], ['no_show', '2026-11-18', 2]]);
    expect(list[0].patientName).toBe('Ada Obi');
  });

  it('does not list attended, cancelled or future appointments', () => {
    const list = selectRecallList({
      appointments: [appt({ status: 'completed' }), appt({ id: 'c', status: 'cancelled' }), appt({ id: 'ci', status: 'checked_in' }), appt({ id: 'f', appointmentDate: new Date('2026-12-01') })],
      surgeries: [], patients, now: later,
    });
    expect(list).toEqual([]);
  });

  it('a later visit booked after the missed one covers it', () => {
    const rebooked = appt({ id: 'r', appointmentDate: new Date('2026-11-25'), createdAt: new Date('2026-11-19') });
    expect(selectRecallList({ appointments: [appt({}), rebooked], surgeries: [], patients, now: later })).toEqual([]);
  });

  it('lists template recall items with their template text, untimed ones last', () => {
    const p = proposeFollowUps({ module: getModule('cleft_lip_palate')!, operationDate: OP, dischargeDate: OP }).filter(x => x.action === 'recall');
    const plan = mergePlan(undefined, 'cleft_lip_palate', p.map(x => planItem(x, 'recall', [], NOW)), NOW);
    const list = selectRecallList({ appointments: [], surgeries: [surgery(plan)], patients, now: later });
    expect(list.map(e => [e.kind, e.templateText, e.dueDate])).toEqual([
      ['template_recall', 'Age about 3 and 5 years', undefined],
      ['template_recall', 'Age 8–11 years', undefined],
    ]);
  });

  it('lists discharge-dated visits once the patient is discharged', () => {
    const p = proposeFollowUps({ module: freeFlap, operationDate: OP, dischargeDate: null }).filter(x => x.action === 'pending_discharge');
    const plan = mergePlan(undefined, freeFlap.id, p.map(x => planItem(x, 'pending_discharge', [], NOW)), NOW);
    expect(selectRecallList({ appointments: [], surgeries: [surgery(plan)], patients, now: later })).toEqual([]);
    const list = selectRecallList({ appointments: [], surgeries: [surgery(plan, { dischargedAt: new Date('2026-11-06') })], patients, now: later });
    expect(list.map(e => [e.kind, e.dueDate])).toEqual([['awaiting_booking', '2026-11-20'], ['awaiting_booking', '2026-12-18']]);
    expect(recallCount({ appointments: [], surgeries: [surgery(plan, { dischargedAt: new Date('2026-11-06') })], patients, now: later })).toBe(1);
  });
});
