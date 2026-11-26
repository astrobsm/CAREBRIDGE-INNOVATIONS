import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildFollowUpAppointment,
  parseLocalDate,
  FOLLOW_UP_VISIT_TYPES,
  DEFAULT_FOLLOW_UP_TIME,
} from '../services/followUpAppointment';

const base = {
  followUpDate: '2026-12-03',
  followUpType: 'suture_removal',
  followUpNotes: '  Remove sutures, check flap  ',
  patient: { id: 'p1', phone: '08030000000', email: 'a@b.c' },
  hospitalId: 'h1',
  hospitalName: 'Clinic',
  encounterId: 'enc1',
  clinician: { id: 'u1', name: 'Dr A' },
};

describe('buildFollowUpAppointment', () => {
  it('returns null when no date was entered', () => {
    expect(buildFollowUpAppointment({ ...base, followUpDate: '' })).toBeNull();
    expect(buildFollowUpAppointment({ ...base, followUpDate: '   ' })).toBeNull();
  });

  it('returns null for an unreadable date rather than booking a wrong one', () => {
    expect(buildFollowUpAppointment({ ...base, followUpDate: 'next week' })).toBeNull();
  });

  it('carries patient, date, type, notes and the encounter link', () => {
    const a = buildFollowUpAppointment(base)!;
    expect(a.patientId).toBe('p1');
    expect(a.hospitalId).toBe('h1');
    expect(a.appointmentDate.getFullYear()).toBe(2026);
    expect(a.appointmentDate.getMonth()).toBe(11);
    expect(a.appointmentDate.getDate()).toBe(3);
    expect(a.appointmentTime).toBe(DEFAULT_FOLLOW_UP_TIME);
    expect(a.type).toBe('suture_removal');
    expect(a.reasonForVisit).toBe('Suture Removal');
    expect(a.notes).toBe('Remove sutures, check flap');
    expect(a.relatedEncounterId).toBe('enc1');
    expect(a.patientWhatsApp).toBe('08030000000');
    expect(a.bookedBy).toBe('u1');
    expect(a.clinicianId).toBe('u1');
  });

  it('maps every visit type the page offers to a diary type', () => {
    const page = readFileSync(join(process.cwd(), 'src/domains/clinical/pages/EnhancedFollowUpPage.tsx'), 'utf8');
    const section = page.slice(page.indexOf('Visit Type'), page.indexOf('Quick Schedule'));
    const offered = [...section.matchAll(/<option value="([a-z_]+)"/g)].map(m => m[1]);
    expect(offered.length).toBeGreaterThan(0);
    for (const v of offered) expect(FOLLOW_UP_VISIT_TYPES[v], v).toBeDefined();
  });

  it('falls back to clinic review for an unknown type', () => {
    expect(buildFollowUpAppointment({ ...base, followUpType: 'weird' })!.type).toBe('review');
  });
});

describe('parseLocalDate', () => {
  it('parses as a local calendar date, not UTC midnight', () => {
    const d = parseLocalDate('2026-01-01')!;
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });
});

describe('EnhancedFollowUpPage save', () => {
  it('books the follow-up through the appointment service', () => {
    const page = readFileSync(join(process.cwd(), 'src/domains/clinical/pages/EnhancedFollowUpPage.tsx'), 'utf8');
    expect(page).toMatch(/buildFollowUpAppointment\(\{[\s\S]*followUpDate[\s\S]*followUpType[\s\S]*followUpNotes/);
    expect(page).toMatch(/await createAppointment\(appointmentInput\)/);
  });
});
