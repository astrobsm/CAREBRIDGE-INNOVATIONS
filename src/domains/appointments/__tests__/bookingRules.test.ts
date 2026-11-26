import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REMINDER_PLAN,
  STEP_FIELDS,
  reminderOffsetsSummary,
  reminderPlanLines,
  findBookingClashes,
  bookingSlotKey,
  cliniciansWithCurrentUser,
  type BookingSlot,
} from '../bookingRules';

const day = new Date(2026, 11, 3); // 3 Dec 2026, local
const slot = (over: Partial<BookingSlot> = {}): BookingSlot => ({
  id: 'x',
  patientId: 'p1',
  clinicianId: 'c1',
  appointmentDate: day,
  appointmentTime: '10:00',
  duration: 30,
  status: 'scheduled',
  ...over,
});

describe('booking step validation', () => {
  it('step 2 requires a date and a time before Next', () => {
    expect(STEP_FIELDS[2]).toEqual(expect.arrayContaining(['appointmentDate', 'appointmentTime']));
  });
  it('step 1 requires the patient and reason', () => {
    expect(STEP_FIELDS[1]).toEqual(expect.arrayContaining(['patientId', 'hospitalId', 'reasonForVisit']));
  });
});

describe('findBookingClashes', () => {
  const candidate = { patientId: 'p1', clinicianId: 'c1', appointmentDate: day, appointmentTime: '10:00', duration: 30 };

  it('flags the same patient at the same date and time', () => {
    const r = findBookingClashes(candidate, [slot({ clinicianId: 'other' })]);
    expect(r).toHaveLength(1);
    expect(r[0].reason).toBe('same_patient');
  });

  it('flags the same clinician at an overlapping time with another patient', () => {
    const r = findBookingClashes(candidate, [slot({ patientId: 'p2', appointmentTime: '10:15' })]);
    expect(r).toHaveLength(1);
    expect(r[0].reason).toBe('same_clinician');
  });

  it('does not flag back-to-back slots, other days, or cancelled bookings', () => {
    expect(findBookingClashes(candidate, [slot({ appointmentTime: '10:30' })])).toEqual([]);
    expect(findBookingClashes(candidate, [slot({ appointmentTime: '09:30' })])).toEqual([]);
    expect(findBookingClashes(candidate, [slot({ appointmentDate: new Date(2026, 11, 4) })])).toEqual([]);
    expect(findBookingClashes(candidate, [slot({ status: 'cancelled' })])).toEqual([]);
  });

  it('does not flag an unrelated patient with another clinician', () => {
    expect(findBookingClashes(candidate, [slot({ patientId: 'p2', clinicianId: 'c2' })])).toEqual([]);
  });

  it('matches dates stored as ISO strings (after a cloud pull) and the form\'s yyyy-MM-dd', () => {
    const r = findBookingClashes(
      { ...candidate, appointmentDate: '2026-12-03T00:00' },
      [slot({ appointmentDate: new Date(2026, 11, 3).toISOString() })],
    );
    expect(r).toHaveLength(1);
    // The form's yyyy-MM-dd value against a booking saved from that same value.
    const r2 = findBookingClashes(
      { ...candidate, appointmentDate: '2026-12-03' },
      [slot({ appointmentDate: new Date('2026-12-03') })],
    );
    expect(r2).toHaveLength(1);
  });

  it('without a clinician only the patient can clash', () => {
    const r = findBookingClashes({ ...candidate, clinicianId: null }, [slot({ patientId: 'p2', clinicianId: null })]);
    expect(r).toEqual([]);
  });

  it('the accepted-clash key changes when the slot changes', () => {
    expect(bookingSlotKey(candidate)).toBe(bookingSlotKey({ ...candidate }));
    expect(bookingSlotKey(candidate)).not.toBe(bookingSlotKey({ ...candidate, appointmentTime: '11:00' }));
  });
});

describe('clinician list', () => {
  it('adds the signed-in user when their role is not in the list', () => {
    const me: { id: string; isActive?: boolean } = { id: 'me', isActive: true };
    expect(cliniciansWithCurrentUser([], me)).toEqual([me]);
    expect(cliniciansWithCurrentUser([{ id: 'a' }], me).map((c) => c.id)).toEqual(['me', 'a']);
  });
  it('does not duplicate the user', () => {
    expect(cliniciansWithCurrentUser([{ id: 'me' }], { id: 'me' })).toHaveLength(1);
  });
});

describe('reminder copy matches the schedule', () => {
  it('lists every offset in the plan, including the 2-hour push', () => {
    expect(reminderOffsetsSummary()).toBe('48h, 24h, 2h and 1h');
    expect(reminderPlanLines().map((l) => l.text)).toEqual([
      'WhatsApp: 48 hours before',
      'WhatsApp + Push: 24 hours before',
      'Push: 2 hours before',
      'WhatsApp: 1 hour before',
    ]);
  });

  it('the service builds reminders from REMINDER_PLAN and the form shows it', () => {
    const service = readFileSync(join(process.cwd(), 'src/services/appointmentService.ts'), 'utf8');
    expect(service).toMatch(/for \(const entry of REMINDER_PLAN\)/);
    const form = readFileSync(join(process.cwd(), 'src/domains/appointments/components/AppointmentBookingForm.tsx'), 'utf8');
    expect(form).toMatch(/reminderOffsetsSummary\(\)/);
    expect(form).not.toMatch(/48h, 24h, and 1h/);
    expect(REMINDER_PLAN.length).toBe(4);
  });
});
