-- ============================================================
-- AstroHEALTH Additional Tables Migration
-- Run this SQL in Supabase SQL Editor
-- Adds: Appointments, NPWT, Medication Charts, Transfusion Orders
-- ============================================================

-- ================================================
-- Drop existing tables if any (for clean migration)
-- ================================================

DROP TABLE IF EXISTS appointment_reminders CASCADE;
DROP TABLE IF EXISTS appointment_slots CASCADE;
DROP TABLE IF EXISTS clinic_sessions CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS npwt_notifications CASCADE;
DROP TABLE IF EXISTS npwt_sessions CASCADE;
DROP TABLE IF EXISTS medication_charts CASCADE;
DROP TABLE IF EXISTS nurse_patient_assignments CASCADE;
DROP TABLE IF EXISTS transfusion_monitoring_charts CASCADE;
DROP TABLE IF EXISTS transfusion_orders CASCADE;

-- ================================================
-- Appointments Tables
-- ================================================

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  appointment_number TEXT,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TEXT,
  duration INTEGER DEFAULT 30,
  type TEXT, -- 'follow_up', 'fresh_consultation', 'review', 'procedure', etc.
  priority TEXT DEFAULT 'routine', -- 'routine', 'urgent', 'emergency'
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'
  clinician_id TEXT,
  clinician_name TEXT,
  department TEXT,
  location_type TEXT, -- 'hospital', 'home', 'telemedicine'
  room TEXT,
  home_address TEXT,
  home_city TEXT,
  home_state TEXT,
  home_landmarks TEXT,
  assigned_driver_id TEXT,
  assigned_home_care_giver_id TEXT,
  reason_for_visit TEXT,
  notes TEXT,
  reminder_settings JSONB,
  booked_by TEXT,
  booked_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointment_reminders (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  channel TEXT NOT NULL, -- 'sms', 'email', 'whatsapp', 'push'
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointment_slots (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  clinician_id TEXT NOT NULL,
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_duration INTEGER DEFAULT 30,
  max_appointments INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clinic_sessions (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  clinician_id TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  max_appointments INTEGER DEFAULT 20,
  current_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- 'open', 'full', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- NPWT (Negative Pressure Wound Therapy) Tables
-- ================================================

CREATE TABLE npwt_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  wound_id TEXT,
  wound_type TEXT,
  wound_location TEXT,
  wound_dimensions JSONB, -- { length, width, depth, area }
  cycle_type TEXT, -- 'initial', 'change', 'final'
  cycle_number INTEGER DEFAULT 1,
  session_date DATE NOT NULL,
  next_change_date DATE,
  change_interval_days INTEGER DEFAULT 3,
  negative_pressure INTEGER, -- mmHg
  therapy_mode TEXT, -- 'continuous', 'intermittent'
  foam_type TEXT, -- 'black', 'white', 'silver'
  canister_volume INTEGER,
  exudate_type TEXT,
  exudate_amount TEXT, -- 'minimal', 'moderate', 'heavy'
  wound_bed_appearance TEXT,
  periwound_condition TEXT,
  pain_level INTEGER,
  complications JSONB, -- array of strings
  photos JSONB, -- array of URLs
  notes TEXT,
  performed_by TEXT,
  performed_by_name TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'discontinued'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE npwt_notifications (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  notification_type TEXT DEFAULT 'change_due', -- 'change_due', 'review_needed'
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Medication Charts (MAR) Tables
-- ================================================

CREATE TABLE medication_charts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  admission_id TEXT,
  chart_date DATE NOT NULL,
  shift_type TEXT, -- 'morning', 'afternoon', 'night'
  assigned_nurse_id TEXT,
  assigned_nurse_name TEXT,
  medications JSONB, -- array of medication entries
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nurse_patient_assignments (
  id TEXT PRIMARY KEY,
  nurse_id TEXT NOT NULL,
  nurse_name TEXT,
  hospital_id TEXT,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  admission_id TEXT,
  ward_name TEXT,
  bed_number TEXT,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL, -- 'morning', 'afternoon', 'night'
  assignment_type TEXT DEFAULT 'primary', -- 'primary', 'secondary'
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  assigned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Transfusion Orders & Monitoring Tables
-- ================================================

CREATE TABLE transfusion_orders (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  admission_id TEXT,
  surgery_id TEXT,
  request_id TEXT, -- links to blood_transfusions
  order_id TEXT UNIQUE,
  blood_product TEXT NOT NULL, -- 'whole_blood', 'prbc', 'ffp', 'platelets', 'cryoprecipitate'
  blood_group TEXT,
  rhesus TEXT,
  units INTEGER DEFAULT 1,
  volume_ml INTEGER,
  indication TEXT,
  urgency TEXT DEFAULT 'routine', -- 'routine', 'urgent', 'emergency'
  special_requirements JSONB, -- irradiated, leukoreduced, washed, etc.
  crossmatch_result TEXT,
  crossmatch_date TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  issued_by TEXT,
  unit_numbers JSONB, -- array of blood unit numbers
  expiry_dates JSONB, -- array of expiry dates
  status TEXT DEFAULT 'pending', -- 'pending', 'crossmatched', 'issued', 'transfusing', 'completed', 'cancelled', 'reaction'
  ordered_by TEXT,
  ordered_by_name TEXT,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transfusion_monitoring_charts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  transfusion_order_id TEXT NOT NULL,
  unit_number TEXT,
  chart_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  baseline_vitals JSONB, -- { temp, pulse, bp, rr, spo2 }
  monitoring_entries JSONB, -- array of { time, vitals, observations }
  adverse_reactions JSONB, -- array of reactions
  has_reaction BOOLEAN DEFAULT false,
  reaction_type TEXT,
  reaction_severity TEXT,
  reaction_time TIMESTAMPTZ,
  actions_taken TEXT,
  transfusion_completed BOOLEAN DEFAULT false,
  volume_transfused INTEGER,
  administered_by TEXT,
  administered_by_name TEXT,
  verified_by TEXT,
  verified_by_name TEXT,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'stopped', 'reaction'
  uploaded_chart_url TEXT,
  ocr_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Indexes for better performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician ON appointments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment ON appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_scheduled ON appointment_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_hospital ON appointment_slots(hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinic_sessions_date ON clinic_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_npwt_sessions_patient ON npwt_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_npwt_sessions_next_change ON npwt_sessions(next_change_date);
CREATE INDEX IF NOT EXISTS idx_medication_charts_patient ON medication_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_date ON medication_charts(chart_date);
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_nurse ON nurse_patient_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_patient_assignments_patient ON nurse_patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_orders_patient ON transfusion_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_orders_status ON transfusion_orders(status);
CREATE INDEX IF NOT EXISTS idx_transfusion_monitoring_order ON transfusion_monitoring_charts(transfusion_order_id);

-- ================================================
-- Enable RLS and create public access policies
-- ================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npwt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npwt_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfusion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfusion_monitoring_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON appointment_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON appointment_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON clinic_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON npwt_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON npwt_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON medication_charts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON nurse_patient_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON transfusion_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON transfusion_monitoring_charts FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- Done! 10 additional tables created
-- Run this migration in Supabase SQL Editor
-- ================================================
