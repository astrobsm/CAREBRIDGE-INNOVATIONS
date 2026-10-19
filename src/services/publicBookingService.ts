// ---------------------------------------------------------------------------
// The public clinic booking page (/book-appointment) works without signing in.
//
// It used to save the booking on the visitor's own device and rely on cloud
// sync to carry it to the clinic. Cloud sync now runs only for signed-in
// staff, so without a session the booking is sent straight to Supabase — an
// INSERT, the one thing the anon key may still do on public_clinic_bookings
// once the RLS lockdown is applied. Which slots are taken comes from
// public_booked_slots(), which reveals times only, never other patients.
// On a signed-in staff device the normal local-save-then-sync path is used.
// ---------------------------------------------------------------------------

import type { PublicClinicBooking } from '../types';
import { supabase } from './supabaseClient';
import { hasCloudSession } from './cloudSession';

const iso = (d?: Date | string) => (d ? new Date(d).toISOString() : null);

/** A booking as the public_clinic_bookings row. */
export function bookingToCloudRow(b: PublicClinicBooking): Record<string, unknown> {
  return {
    id: b.id,
    booking_number: b.bookingNumber,
    full_name: b.fullName,
    phone_number: b.phoneNumber,
    hospital_code: b.hospitalCode,
    hospital_name: b.hospitalName,
    appointment_date: b.appointmentDate,
    time_slot: b.timeSlot,
    slot_end_time: b.slotEndTime,
    terms_accepted: b.termsAccepted,
    terms_accepted_at: iso(b.termsAcceptedAt),
    status: b.status,
    created_at: iso(b.createdAt),
    updated_at: iso(b.updatedAt),
  };
}

/** Is this a visitor (no staff session) whose booking must go straight to the server? */
export function isPublicVisitor(): boolean {
  return !hasCloudSession();
}

/** Time slots already taken at the server (empty when it cannot be asked). */
export async function fetchTakenSlots(hospitalCode: string, appointmentDate: string): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('public_booked_slots', {
      p_hospital_code: hospitalCode,
      p_date: appointmentDate,
    });
    if (error || !Array.isArray(data)) return [];
    return data.map(v => (typeof v === 'string' ? v : String((v as Record<string, unknown>)?.public_booked_slots ?? v)));
  } catch {
    return [];
  }
}

/** Send a visitor's booking to the clinic. Throws when it could not be sent. */
export async function submitPublicBooking(booking: PublicClinicBooking): Promise<void> {
  if (!supabase) throw new Error('Online booking is not configured.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You are offline. Please connect to the internet to book.');
  }
  // No .select(): the visitor may insert but not read bookings back.
  const { error } = await supabase.from('public_clinic_bookings').insert(bookingToCloudRow(booking));
  if (error) throw new Error('Could not send your booking. Please try again.');
}
