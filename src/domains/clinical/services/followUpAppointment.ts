// ---------------------------------------------------------------------------
// Follow-up encounter -> appointment.
//
// The follow-up page asks for a "Next Appointment Date", a visit type and
// instructions. Those used to be thrown away on save, so the clinician saw
// "Encounter saved" and believed the review was booked when nothing was. This
// turns them into the input for the appointment diary's createAppointment().
// ---------------------------------------------------------------------------

import type { AppointmentType } from '../../../types';
import type { CreateAppointmentInput } from '../../../services/appointmentService';

/** Visit types offered on the follow-up page, mapped to the diary's types. */
export const FOLLOW_UP_VISIT_TYPES: Record<string, { type: AppointmentType; label: string }> = {
  clinic: { type: 'review', label: 'Clinic Review' },
  wound_review: { type: 'follow_up', label: 'Wound Review' },
  post_op: { type: 'post_operative', label: 'Post-Op Check' },
  investigation_review: { type: 'review', label: 'Investigation Review' },
  dressing: { type: 'dressing_change', label: 'Dressing Change' },
  suture_removal: { type: 'suture_removal', label: 'Suture Removal' },
};

/** Default clinic time when the page only collects a date. */
export const DEFAULT_FOLLOW_UP_TIME = '09:00';

/**
 * Parse a yyyy-MM-dd date input as a LOCAL calendar date. `new Date('2026-12-01')`
 * is UTC midnight, which lands on the previous day west of Greenwich.
 */
export function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface FollowUpAppointmentArgs {
  followUpDate: string;
  followUpType: string;
  followUpNotes: string;
  patient: { id: string; phone?: string; alternatePhone?: string; email?: string };
  hospitalId: string;
  hospitalName?: string;
  encounterId: string;
  clinician: { id: string; name?: string };
}

/**
 * Build the createAppointment() input for a follow-up, or null when no date
 * was entered (booking is optional) or the date cannot be read.
 */
export function buildFollowUpAppointment(args: FollowUpAppointmentArgs): CreateAppointmentInput | null {
  if (!args.followUpDate?.trim()) return null;
  const date = parseLocalDate(args.followUpDate);
  if (!date) return null;

  const visit = FOLLOW_UP_VISIT_TYPES[args.followUpType] ?? FOLLOW_UP_VISIT_TYPES.clinic;
  const notes = args.followUpNotes.trim();
  const phone = args.patient.phone || args.patient.alternatePhone || '';

  return {
    patientId: args.patient.id,
    hospitalId: args.hospitalId,
    appointmentDate: date,
    appointmentTime: DEFAULT_FOLLOW_UP_TIME,
    type: visit.type,
    location: {
      type: 'hospital',
      hospitalId: args.hospitalId || undefined,
      hospitalName: args.hospitalName,
    },
    reasonForVisit: visit.label,
    notes: notes || undefined,
    clinicianId: args.clinician.id,
    clinicianName: args.clinician.name,
    patientWhatsApp: phone,
    patientPhone: args.patient.phone || undefined,
    patientEmail: args.patient.email || undefined,
    bookedBy: args.clinician.id,
    relatedEncounterId: args.encounterId,
  };
}
