import { describe, it, expect } from 'vitest';
import type { Appointment, Investigation, LabRequest, Patient, Surgery } from '../../../types';
import {
  localDay, appointmentStart, todaysAppointments, overdueFollowUps, pendingResults,
  theatreList, activePatientCount, recentRegistrations,
} from '../today';

// Thursday 26 Nov 2026, 10:00 local.
const NOW = new Date(2026, 10, 26, 10, 0);

let n = 0;
const appt = (day: Date | string, time: string, status: Appointment['status'], patientId = `p${++n}`, extra: Partial<Appointment> = {}) =>
  ({ id: `a${++n}`, patientId, appointmentDate: day, appointmentTime: time, status, ...extra }) as unknown as Appointment;

describe('local day boundaries', () => {
  it('reads a bare YYYY-MM-DD as that local day', () => {
    expect(localDay('2026-11-26')!.getDate()).toBe(26);
  });
  it('reads the form-saved UTC midnight as the same local day (UTC+1)', () => {
    // AppointmentBookingForm saves new Date('2026-11-26') = 2026-11-26T00:00Z.
    expect(localDay(new Date('2026-11-26'))!.getDate()).toBe(26);
  });
  it('combines the day and HH:mm time', () => {
    const s = appointmentStart({ appointmentDate: new Date(2026, 10, 26), appointmentTime: '14:30' })!;
    expect([s.getDate(), s.getHours(), s.getMinutes()]).toEqual([26, 14, 30]);
  });
});

describe("today's appointments", () => {
  const list = [
    appt(new Date(2026, 10, 26), '15:00', 'scheduled'),
    appt(new Date(2026, 10, 26), '08:30', 'completed'),
    appt(new Date(2026, 10, 26), '09:00', 'cancelled'),
    appt(new Date(2026, 10, 25), '23:59', 'scheduled'),
    appt(new Date(2026, 10, 27), '00:00', 'scheduled'),
    appt('2026-11-26', '11:00', 'confirmed'),
  ];
  it('keeps only today, drops cancelled, earliest first', () => {
    expect(todaysAppointments(list, NOW).map(a => a.appointmentTime)).toEqual(['08:30', '11:00', '15:00']);
  });
  it('the day starts at local midnight', () => {
    const justAfter = new Date(2026, 10, 26, 0, 1);
    expect(todaysAppointments(list, justAfter)).toHaveLength(3);
  });
});

describe('overdue follow-ups', () => {
  it('lists unattended booked appointments and no-shows from the last 30 days', () => {
    const list = [
      appt(new Date(2026, 10, 25), '09:00', 'scheduled', 'A'),
      appt(new Date(2026, 10, 20), '09:00', 'no_show', 'B'),
      appt(new Date(2026, 10, 19), '09:00', 'confirmed', 'C'),
      appt(new Date(2026, 10, 24), '09:00', 'completed', 'D'),
      appt(new Date(2026, 10, 24), '09:00', 'cancelled', 'E'),
      appt(new Date(2026, 10, 24), '09:00', 'scheduled', 'F', { checkedInAt: new Date(2026, 10, 24, 9) }),
      appt(new Date(2026, 9, 26), '09:00', 'scheduled', 'G'),      // 31 days ago
      appt(new Date(2026, 9, 27), '09:00', 'scheduled', 'H'),      // 30 days ago
      appt(new Date(2026, 10, 26), '08:00', 'scheduled', 'I'),     // today: not overdue yet
    ];
    const out = overdueFollowUps(list, NOW);
    expect(out.map(o => o.appointment.patientId)).toEqual(['A', 'B', 'C', 'H']);
    expect(out.find(o => o.appointment.patientId === 'B')!.reason).toBe('no_show');
    expect(out[0].daysAgo).toBe(1);
    expect(out.find(o => o.appointment.patientId === 'H')!.daysAgo).toBe(30);
  });

  it('drops a patient who has already been rebooked', () => {
    const list = [
      appt(new Date(2026, 10, 23), '09:00', 'no_show', 'R'),
      appt(new Date(2026, 10, 30), '09:00', 'scheduled', 'R'),
    ];
    expect(overdueFollowUps(list, NOW)).toEqual([]);
  });
});

describe('pending results', () => {
  const inv = (status: Investigation['status'], extra: Partial<Investigation> = {}) =>
    ({ id: `i${++n}`, patientId: 'P', status, type: 'fbc', typeName: 'Full blood count', requestedAt: new Date(2026, 10, 20), ...extra }) as unknown as Investigation;
  const lab = (status: LabRequest['status']) =>
    ({ id: `l${++n}`, patientId: 'Q', status, tests: [{ name: 'U&E' }, { name: 'LFT' }], requestedAt: new Date(2026, 10, 18) }) as unknown as LabRequest;

  it('includes requested work without results, oldest first, linking to the patient', () => {
    const out = pendingResults(
      [inv('requested'), inv('processing'), inv('completed'), inv('cancelled'),
        inv('requested', { approvalStatus: 'rejected' }),
        inv('requested', { results: [{ parameter: 'Hb' }] as unknown as Investigation['results'] })],
      [lab('pending'), lab('completed')],
    );
    expect(out.map(o => o.source)).toEqual(['lab_request', 'investigation', 'investigation']);
    expect(out[0].name).toBe('U&E, LFT');
    expect(out[1].href).toBe('/patients/P?tab=results');
  });
});

describe('theatre list', () => {
  const s = (d: Date, status: Surgery['status']) => ({ id: `s${++n}`, scheduledDate: d, status }) as unknown as Surgery;
  it('covers today through the next 7 days, live cases only', () => {
    const list = [
      s(new Date(2026, 10, 26, 7, 0), 'scheduled'),           // earlier today: still today's list
      s(new Date(2026, 10, 25, 23, 0), 'scheduled'),          // yesterday
      s(new Date(2026, 11, 3, 23, 59), 'incomplete_preparation'), // day 7
      s(new Date(2026, 11, 4, 0, 0), 'scheduled'),            // day 8
      s(new Date(2026, 10, 27), 'cancelled'),
      s(new Date(2026, 10, 27), 'completed'),
    ];
    expect(theatreList(list, NOW).map(x => x.status)).toEqual(['scheduled', 'incomplete_preparation']);
  });
});

describe('patients', () => {
  const p = (created: Date, extra: Partial<Patient> = {}) => ({ id: `p${++n}`, createdAt: created, isActive: true, ...extra }) as unknown as Patient;
  it('counts active registered patients, not admissions', () => {
    expect(activePatientCount([p(NOW), p(NOW), p(NOW, { isActive: false }), p(NOW, { mergedInto: 'x' }), p(NOW)])).toBe(3);
  });
  it('lists registrations from the last 7 calendar days, newest first', () => {
    const list = [p(new Date(2026, 10, 20, 0, 0)), p(new Date(2026, 10, 19, 23, 59)), p(new Date(2026, 10, 26, 9, 0))];
    const out = recentRegistrations(list, NOW);
    expect(out.map(x => (x.createdAt as Date).getDate())).toEqual([26, 20]);
  });
});
