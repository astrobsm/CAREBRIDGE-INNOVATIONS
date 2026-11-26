import { describe, it, expect } from 'vitest';
import { selectPostOpList, buildDayCaseDischargeSummary, DAY_CASE_WINDOW_DAYS } from '../dayCase';
import type { Admission, Patient, Surgery } from '../../../../types';

const NOW = new Date('2026-11-20T12:00:00');
const patient = (id: string) => ({ id, firstName: id, lastName: 'X', hospitalNumber: id } as Patient);
const surgery = (id: string, patientId: string, day: string, over: Partial<Surgery> = {}): Surgery => ({
  id, patientId, hospitalId: 'h1', procedureName: 'Excision of lipoma', type: 'elective', category: 'minor',
  preOperativeAssessment: { asaScore: 1, npoStatus: false, consentSigned: true, bloodTyped: false, investigations: [], riskFactors: [] },
  scheduledDate: new Date(`${day}T08:00:00`), status: 'completed', surgeon: 'Dr A', anaesthesiaType: 'local',
  createdAt: NOW, updatedAt: NOW, ...over,
});
const admission = (patientId: string) => ({ id: `a-${patientId}`, patientId, status: 'active', hospitalId: 'h1', admissionDate: new Date('2026-11-10') } as Admission);

describe('selectPostOpList', () => {
  const patients = [patient('day'), patient('ward'), patient('old'), patient('booked')];
  const surgeries = [
    surgery('s1', 'day', '2026-11-19'),
    surgery('s2', 'ward', '2026-11-12'),
    surgery('s3', 'old', '2026-10-20'),
    surgery('s4', 'booked', '2026-11-19', { status: 'scheduled' }),
  ];
  const list = selectPostOpList({ patients, activeAdmissions: [admission('ward')], surgeries, postOpNotes: [], now: NOW });

  it('lists day cases (completed, not admitted) as well as admitted patients', () => {
    expect(list.map(e => [e.patient.id, e.dayCase])).toEqual([['day', true], ['ward', false]]);
    expect(list[0].admission).toBeUndefined();
    expect(list[0].surgeries[0].dayPostOp).toBe(1);
  });

  it('drops a day case after the day-case window, and ignores operations not done', () => {
    expect(list.some(e => e.patient.id === 'old' || e.patient.id === 'booked')).toBe(false);
    const late = selectPostOpList({ patients, activeAdmissions: [], surgeries: [surgery('s5', 'day', '2026-11-05')], postOpNotes: [], now: NOW });
    expect(DAY_CASE_WINDOW_DAYS).toBe(14);
    expect(late).toEqual([]);
  });
});

describe('buildDayCaseDischargeSummary', () => {
  it('needs no admission: admitted and discharged on the operation day, procedure from the surgery record', () => {
    const s = surgery('s1', 'day', '2026-11-20');
    const sum = buildDayCaseDischargeSummary({
      surgery: s, condition: 'stable', woundCare: 'Keep dry 48 h', activity: 'Normal', warningSigns: ['Fever'], medications: [],
      escortConfirmed: true, clinicContact: '0803', user: { id: 'u1', firstName: 'Ada', lastName: 'Obi' }, now: NOW, id: 'd1',
    });
    expect(sum).toMatchObject({ id: 'd1', encounterId: 's1', dischargeDisposition: 'home', woundCareInstructions: 'Keep dry 48 h', status: 'completed' });
    expect(sum.admissionDate).toEqual(new Date('2026-11-20T08:00:00'));
    expect(sum.proceduresPerformed[0]).toMatchObject({ name: 'Excision of lipoma', surgeon: 'Dr A', surgeryId: 's1' });
    expect(sum.hospitalCourse).toMatch(/responsible adult/);
  });
});
