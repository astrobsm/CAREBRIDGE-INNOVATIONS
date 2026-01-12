-- ============================================================
-- AstroHEALTH Missing Tables Migration
-- Run this SQL in Supabase SQL Editor to fix 404 errors
-- Tables: appointments, appointment_reminders, appointment_slots,
--         clinic_sessions, npwt_sessions, npwt_notifications,
--         medication_charts, nurse_patient_assignments,
--         transfusion_orders, transfusion_monitoring_charts
-- ============================================================

-- ============================================================
-- 1. APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  appointment_number TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  
  -- Scheduling
  appointment_date TIMESTAMPTZ NOT NULL,
  appointment_time TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  
  -- Appointment Details
  type TEXT NOT NULL, -- 'follow_up', 'fresh_consultation', 'review', 'procedure', 'dressing_change', 'suture_removal', 'home_visit', 'telemedicine', 'pre_operative', 'post_operative', 'emergency', 'other'
  priority TEXT DEFAULT 'routine', -- 'routine', 'urgent', 'emergency'
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled'
  
  -- Location
  location JSONB,
  
  -- Clinical Context
  reason_for_visit TEXT,
  notes TEXT,
  related_encounter_id TEXT,
  related_surgery_id TEXT,
  related_wound_id TEXT,
  
  -- Staff Assignment
  clinician_id TEXT,
  clinician_name TEXT,
  
  -- Patient Contact
  patient_whatsapp TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  
  -- Reminder Configuration
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_schedule JSONB,
  
  -- Booking Details
  booked_by TEXT NOT NULL,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by TEXT,
  
  -- Completion Details
  checked_in_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome_notes TEXT,
  next_appointment_id TEXT,
  
  -- Sync & Audit
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician ON appointments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON appointments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. APPOINTMENT REMINDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  
  -- Reminder Details
  channel TEXT NOT NULL, -- 'push_notification', 'whatsapp', 'sms', 'email'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'acknowledged'
  
  -- Message Content
  message_template TEXT,
  message_content TEXT,
  
  -- WhatsApp Specific
  whatsapp_number TEXT,
  whatsapp_message_id TEXT,
  
  -- Response Tracking
  patient_response TEXT, -- 'confirmed', 'cancelled', 'rescheduled', 'no_response'
  response_received_at TIMESTAMPTZ,
  
  -- Error Handling
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment ON appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_patient ON appointment_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_scheduled ON appointment_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_status ON appointment_reminders(status);

ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON appointment_reminders FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. APPOINTMENT SLOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_slots (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  clinician_id TEXT NOT NULL,
  
  -- Schedule Pattern
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_duration INTEGER DEFAULT 30,
  
  -- Capacity
  max_appointments INTEGER DEFAULT 20,
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  
  -- Location
  location_type TEXT DEFAULT 'hospital', -- 'hospital', 'home', 'telemedicine'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_hospital ON appointment_slots(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_clinician ON appointment_slots(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_day ON appointment_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_active ON appointment_slots(is_active);

ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON appointment_slots FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. CLINIC SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_sessions (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  clinician_id TEXT NOT NULL,
  
  session_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  
  clinic_type TEXT,
  location TEXT,
  
  max_patients INTEGER DEFAULT 20,
  booked_count INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_sessions_hospital ON clinic_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinic_sessions_clinician ON clinic_sessions(clinician_id);
CREATE INDEX IF NOT EXISTS idx_clinic_sessions_date ON clinic_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_clinic_sessions_status ON clinic_sessions(status);

ALTER TABLE clinic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON clinic_sessions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. NPWT SESSIONS TABLE (Negative Pressure Wound Therapy)
-- ============================================================
CREATE TABLE IF NOT EXISTS npwt_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  
  -- Wound Information
  wound_type TEXT NOT NULL,
  wound_class TEXT,
  wound_location TEXT,
  dimensions JSONB,
  
  -- NPWT Settings
  machine_code TEXT,
  timer_code TEXT,
  cycle_type TEXT NOT NULL, -- '72_hour', '48_hour', '24_hour', 'daily'
  cycle_number INTEGER DEFAULT 1,
  pressure_setting INTEGER,
  therapy_mode TEXT DEFAULT 'continuous', -- 'continuous', 'intermittent'
  
  -- Session Details
  session_date TIMESTAMPTZ NOT NULL,
  next_change_date TIMESTAMPTZ NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  
  -- Materials Used
  agents_used JSONB,
  cleaning_agents JSONB,
  materials JSONB,
  
  -- Progress Tracking
  image_url TEXT,
  image_base64 TEXT,
  wound_condition TEXT, -- 'improving', 'stable', 'deteriorating'
  exudate_amount TEXT, -- 'none', 'scant', 'moderate', 'heavy'
  exudate_type TEXT, -- 'serous', 'serosanguinous', 'sanguinous', 'purulent'
  granulation_percent INTEGER,
  
  -- Clinical Notes
  clinical_notes TEXT,
  complications TEXT,
  
  -- Audit
  performed_by TEXT NOT NULL,
  performed_by_name TEXT,
  sync_status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npwt_sessions_patient ON npwt_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_npwt_sessions_hospital ON npwt_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_npwt_sessions_date ON npwt_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_npwt_sessions_next_change ON npwt_sessions(next_change_date);

ALTER TABLE npwt_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON npwt_sessions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. NPWT NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS npwt_notifications (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  
  scheduled_time TIMESTAMPTZ NOT NULL,
  notification_type TEXT NOT NULL, -- '24_hour', '2_hour', 'overdue'
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npwt_notifications_session ON npwt_notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_npwt_notifications_patient ON npwt_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_npwt_notifications_scheduled ON npwt_notifications(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_npwt_notifications_sent ON npwt_notifications(sent);

ALTER TABLE npwt_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON npwt_notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. MEDICATION CHARTS TABLE (MAR - Medication Administration Record)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_charts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  admission_id TEXT,
  
  chart_date DATE NOT NULL,
  shift_type TEXT NOT NULL, -- 'morning', 'afternoon', 'night'
  assigned_nurse_id TEXT,
  assigned_nurse_name TEXT,
  
  -- Medications
  medications JSONB, -- Array of medication entries with times, doses, administered status
  
  -- PRN Medications
  prn_medications JSONB,
  
  -- Allergies (quick reference)
  allergies TEXT[],
  
  -- Status
  is_completed BOOLEAN DEFAULT false,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_charts_patient ON medication_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_hospital ON medication_charts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_admission ON medication_charts(admission_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_date ON medication_charts(chart_date);
CREATE INDEX IF NOT EXISTS idx_medication_charts_nurse ON medication_charts(assigned_nurse_id);

ALTER TABLE medication_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON medication_charts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. NURSE PATIENT ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS nurse_patient_assignments (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  nurse_id TEXT NOT NULL,
  nurse_name TEXT,
  nurse_specialty TEXT,
  
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  hospital_number TEXT,
  
  ward_name TEXT,
  bed_number TEXT,
  
  shift_type TEXT NOT NULL, -- 'morning', 'afternoon', 'night'
  shift_date DATE NOT NULL,
  assignment_date TIMESTAMPTZ NOT NULL,
  
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'handover'
  care_level TEXT DEFAULT 'routine', -- 'routine', 'intermediate', 'intensive', 'critical'
  
  tasks JSONB,
  notes TEXT,
  assigned_by TEXT NOT NULL,
  handover_notes TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nurse_assignments_hospital ON nurse_patient_assignments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_nurse ON nurse_patient_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_patient ON nurse_patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_shift_date ON nurse_patient_assignments(shift_date);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_status ON nurse_patient_assignments(status);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_active ON nurse_patient_assignments(is_active);

ALTER TABLE nurse_patient_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON nurse_patient_assignments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 9. TRANSFUSION ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transfusion_orders (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  patient_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  request_id TEXT,
  
  -- Order Details
  order_date TIMESTAMPTZ NOT NULL,
  ordered_by TEXT NOT NULL,
  orderer_designation TEXT,
  urgency TEXT DEFAULT 'routine', -- 'routine', 'urgent', 'emergency', 'massive_transfusion'
  
  -- Patient Blood Details
  patient_blood_group TEXT NOT NULL,
  patient_rh_factor TEXT NOT NULL,
  patient_genotype TEXT,
  antibody_screen_result TEXT,
  crossmatch_result TEXT,
  crossmatch_date TIMESTAMPTZ,
  
  -- Indication
  indication TEXT NOT NULL,
  hemoglobin_level DECIMAL,
  platelet_count INTEGER,
  inr DECIMAL,
  fibrinogen DECIMAL,
  
  -- Product Details
  product_type TEXT NOT NULL,
  product_code TEXT,
  number_of_units INTEGER DEFAULT 1,
  volume_per_unit INTEGER,
  blood_group_of_product TEXT,
  donor_id TEXT,
  collection_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  
  -- Product Source
  blood_bank_name TEXT,
  blood_bank_address TEXT,
  blood_bank_phone TEXT,
  
  -- Screening Tests
  screening_tests JSONB, -- { hiv, hbsAg, hcv, vdrl, malaria }
  
  -- Transfusion Details
  rate_of_transfusion INTEGER,
  estimated_duration TEXT,
  
  -- Pre-transfusion Vitals
  pre_transfusion_vitals JSONB,
  
  -- Consent
  consent_obtained BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  consent_witness TEXT,
  
  -- Verification
  verifying_nurse_1 TEXT,
  verifying_nurse_2 TEXT,
  
  -- Ward/Bed Info
  ward_bed TEXT,
  diagnosis TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'in_progress', 'completed', 'cancelled'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfusion_orders_patient ON transfusion_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_orders_hospital ON transfusion_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_orders_date ON transfusion_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_transfusion_orders_status ON transfusion_orders(status);
CREATE INDEX IF NOT EXISTS idx_transfusion_orders_order_id ON transfusion_orders(order_id);

ALTER TABLE transfusion_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON transfusion_orders FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 10. TRANSFUSION MONITORING CHARTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transfusion_monitoring_charts (
  id TEXT PRIMARY KEY,
  chart_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  transfusion_order_id TEXT,
  
  -- Patient Info (denormalized)
  patient_name TEXT,
  hospital_number TEXT,
  ward_bed TEXT,
  
  -- Transfusion Details
  chart_date TIMESTAMPTZ NOT NULL,
  product_type TEXT,
  unit_number TEXT,
  start_time TEXT,
  end_time TEXT,
  
  -- Monitoring Entries
  entries JSONB, -- Array of { time, temperature, pulse, bp, respiratoryRate, spo2, volumeInfused, symptoms, nurseInitials }
  
  -- Summary
  total_volume_transfused INTEGER,
  complications TEXT,
  outcome TEXT, -- 'completed_uneventful', 'completed_with_reaction', 'stopped_due_to_reaction'
  
  -- Signatures
  nurse_signature TEXT,
  doctor_review TEXT,
  
  -- Upload/OCR Support
  uploaded_chart_url TEXT,
  uploaded_chart_base64 TEXT,
  ocr_text TEXT,
  ocr_processed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'template', -- 'template', 'in_progress', 'completed', 'uploaded'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfusion_charts_patient ON transfusion_monitoring_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_charts_hospital ON transfusion_monitoring_charts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_charts_order ON transfusion_monitoring_charts(transfusion_order_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_charts_date ON transfusion_monitoring_charts(chart_date);
CREATE INDEX IF NOT EXISTS idx_transfusion_charts_status ON transfusion_monitoring_charts(status);

ALTER TABLE transfusion_monitoring_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON transfusion_monitoring_charts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE! All 10 missing tables have been created.
-- Run this migration in Supabase SQL Editor to fix 404 errors.
-- ============================================================

-- Summary of tables created:
-- 1. appointments
-- 2. appointment_reminders
-- 3. appointment_slots
-- 4. clinic_sessions
-- 5. npwt_sessions
-- 6. npwt_notifications
-- 7. medication_charts
-- 8. nurse_patient_assignments
-- 9. transfusion_orders
-- 10. transfusion_monitoring_charts
