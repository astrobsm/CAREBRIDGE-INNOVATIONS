import { describe, it, expect } from 'vitest';
import { summariseOutcomes, outcomeState, outcomesDue, outcomeWindowDays, pct } from '../outcomes';
import { highestGrade, complicationText } from '../clavienDindo';
import type { Surgery, SurgicalOutcome, GradedComplication } from '../../../../types';

const D = (s: string) => new Date(`${s}T10:00:00`);
const surgery = (id: string, procedureName: string, over: Partial<Surgery> = {}): Surgery => ({
  id, patientId: `p-${id}`, hospitalId: 'h1', procedureName, type: 'elective', category: 'minor',
  preOperativeAssessment: { asaScore: 1, npoStatus: false, consentSigned: true, bloodTyped: false, investigations: [], riskFactors: [] },
  scheduledDate: D('2026-10-01'), actualStartTime: D('2026-10-01'), status: 'completed', surgeon: 'Dr A',
  woundClass: 'clean', createdAt: D('2026-09-01'), updatedAt: D('2026-10-01'), ...over,
});
const comp = (grade: GradedComplication['grade']): GradedComplication => ({ id: grade, description: 'x', grade, recordedAt: D('2026-10-05'), source: 'outcome' });
const outcome = (surgeryId: string, over: Partial<SurgicalOutcome> = {}): SurgicalOutcome => ({
  id: `o-${surgeryId}`, surgeryId, patientId: `p-${surgeryId}`, procedureName: '', operationDate: D('2026-10-01'), windowDays: 30,
  ssi: 'none', complications: [], returnToTheatre: false, readmission: false, vte: false, death: false,
  recordedBy: 'u1', recordedAt: D('2026-10-30'), createdAt: D('2026-10-30'), updatedAt: D('2026-10-30'), ...over,
});

describe('Clavien–Dindo helpers', () => {
  it('finds the highest grade', () => {
    expect(highestGrade([comp('I'), comp('IIIb'), comp('II')])).toBe('IIIb');
    expect(highestGrade([])).toBeNull();
    expect(complicationText({ grade: 'II', description: 'wound infection', ongoing: true })).toBe('Clavien-Dindo IId: wound infection');
  });
});

describe('summariseOutcomes', () => {
  const surgeries = [
    surgery('a', 'Excision of lipoma'), surgery('b', 'Excision of lipoma'), surgery('c', 'Excision of lipoma'),
    surgery('d', 'Split skin graft', { woundClass: 'contaminated' }), surgery('e', 'Split skin graft', { woundClass: 'contaminated' }),
    surgery('f', 'Split skin graft', { status: 'scheduled' }),
  ];
  const outcomes = [
    outcome('a'),
    outcome('b', { ssi: 'superficial_incisional', complications: [comp('II')] }),
    outcome('d', { ssi: 'deep_incisional', complications: [comp('I'), comp('IIIb')], returnToTheatre: true }),
    outcome('e', { complications: [comp('IVa')], readmission: true, vte: true }),
    outcome('f', { ssi: 'organ_space' }), // not a completed operation: ignored
  ];
  const s = summariseOutcomes(surgeries, outcomes);

  it('counts completed operations and recorded outcomes', () => {
    expect([s.operations, s.recorded]).toEqual([5, 4]);
  });

  it('SSI rate = SSIs / recorded outcomes, by CDC category', () => {
    expect(s.ssi).toBe(2);
    expect(s.ssiRate).toBe(0.5);
    expect(s.ssiByCategory).toEqual({ superficial_incisional: 1, deep_incisional: 1, organ_space: 0 });
    expect(pct(s.ssiRate)).toBe('50.0%');
  });

  it('counts each operation once, by its highest Clavien–Dindo grade', () => {
    expect(s.withComplication).toBe(3);
    expect(s.byHighestGrade).toMatchObject({ I: 0, II: 1, IIIa: 0, IIIb: 1, IVa: 1, IVb: 0, V: 0 });
  });

  it('counts return to theatre, readmission, VTE and death', () => {
    expect([s.returnToTheatre, s.readmission, s.vte, s.death]).toEqual([1, 1, 1, 0]);
  });

  it('breaks down by procedure and by wound class', () => {
    expect(s.byProcedure.map(p => [p.procedure, p.operations, p.recorded, p.ssi, p.ssiRate])).toEqual([
      ['Excision of lipoma', 3, 2, 1, 0.5],
      ['Split skin graft', 2, 2, 1, 0.5],
    ]);
    expect(s.byWoundClass).toEqual([
      { woundClass: 'clean', recorded: 2, ssi: 1, ssiRate: 0.5 },
      { woundClass: 'contaminated', recorded: 2, ssi: 1, ssiRate: 0.5 },
    ]);
  });

  it('a death with no graded complication counts as grade V', () => {
    const t = summariseOutcomes([surgery('a', 'X')], [outcome('a', { death: true })]);
    expect(t.byHighestGrade.V).toBe(1);
  });

  it('has no rate when nothing is recorded, and filters by date', () => {
    expect(summariseOutcomes(surgeries, []).ssiRate).toBeNull();
    expect(summariseOutcomes(surgeries, outcomes, { from: D('2026-11-01') }).operations).toBe(0);
  });
});

describe('outcome window', () => {
  it('is 30 days, or 90 with an implant', () => {
    expect(outcomeWindowDays({})).toBe(30);
    expect(outcomeWindowDays({ implantPlaced: true })).toBe(90);
  });

  it('is open, then due, then overdue', () => {
    const s = surgery('a', 'X');
    expect(outcomeState(s, undefined, D('2026-10-10')).state).toBe('open');
    expect(outcomeState(s, undefined, D('2026-10-28')).state).toBe('due');
    expect(outcomeState(s, undefined, D('2026-11-15')).state).toBe('overdue');
    expect(outcomeState(s, outcome('a'), D('2026-11-15')).state).toBe('recorded');
    expect(outcomeState({ ...s, implantPlaced: true }, undefined, D('2026-11-15')).state).toBe('open');
  });

  it('lists due outcome checks for the Today screen', () => {
    const due = outcomesDue([surgery('a', 'X'), surgery('b', 'Y'), surgery('c', 'Z', { status: 'scheduled' })], [outcome('b')], D('2026-10-31'));
    expect(due.map(d => d.surgery.id)).toEqual(['a']);
  });
});
