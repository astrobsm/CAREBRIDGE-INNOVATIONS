-- Migration: Add public_clinic_bookings table for clinic appointment booking sync
-- This enables cross-device sync of patient bookings made via the public booking page

CREATE TABLE IF NOT EXISTS public_clinic_bookings (
  id TEXT PRIMARY KEY,
  booking_number TEXT NOT NULL,
  
  -- Patient Information
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  
  -- Appointment Details
  hospital_code TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  appointment_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  slot_end_time TEXT NOT NULL,
  
  -- Terms & Conditions
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'confirmed',
  
  -- WhatsApp Notifications
  confirmation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Check-in Details
  checked_in_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Cancellation/Rescheduling
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  rescheduled_to TEXT,
  
  -- Sync & Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_pcb_appointment_date ON public_clinic_bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_pcb_hospital_code ON public_clinic_bookings(hospital_code);
CREATE INDEX IF NOT EXISTS idx_pcb_status ON public_clinic_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pcb_booking_number ON public_clinic_bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_pcb_updated_at ON public_clinic_bookings(updated_at);

-- Enable Row Level Security
ALTER TABLE public_clinic_bookings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public bookings - no auth required for reads)
CREATE POLICY "Allow all access to public_clinic_bookings"
  ON public_clinic_bookings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public_clinic_bookings;
