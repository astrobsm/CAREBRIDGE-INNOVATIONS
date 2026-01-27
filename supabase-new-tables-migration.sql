-- ============================================
-- AstroHEALTH New Tables Migration
-- ============================================
-- This migration adds tables for:
-- 1. Referrals
-- 2. Patient Education Records
-- 3. Calculator Results
-- 4. User Settings
-- 5. Hospital Settings
-- 
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. REFERRALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referral_number TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  from_hospital_id TEXT NOT NULL,
  from_hospital_name TEXT,
  to_hospital_id TEXT,
  to_hospital_name TEXT,
  to_specialty TEXT,
  to_specialist_id TEXT,
  to_specialist_name TEXT,
  referral_type TEXT NOT NULL CHECK (referral_type IN ('internal', 'external', 'specialist', 'emergency')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  referral_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  clinical_summary TEXT NOT NULL,
  current_diagnosis TEXT,
  relevant_investigations TEXT,
  current_treatment TEXT,
  referral_questions TEXT,
  urgency_justification TEXT,
  attachments JSONB DEFAULT '[]'::JSONB,
  referred_by TEXT NOT NULL,
  referred_by_name TEXT,
  accepted_by TEXT,
  accepted_by_name TEXT,
  accepted_at TEXT,
  completed_at TEXT,
  response_notes TEXT,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_from_hospital ON referrals(from_hospital_id);
CREATE INDEX IF NOT EXISTS idx_referrals_to_hospital ON referrals(to_hospital_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_date ON referrals(referral_date);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by ON referrals(referred_by);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Create public access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referrals' 
    AND policyname = 'public_access'
  ) THEN
    CREATE POLICY "public_access" ON referrals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 2. PATIENT EDUCATION RECORDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS patient_education_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  hospital_id TEXT NOT NULL,
  encounter_id TEXT,
  admission_id TEXT,
  topic_id TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  category TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('verbal', 'written', 'video', 'demonstration', 'interactive', 'group_session')),
  comprehension_level TEXT NOT NULL CHECK (comprehension_level IN ('understood_fully', 'understood_partially', 'needs_reinforcement', 'barrier_identified')),
  comprehension_notes TEXT,
  barriers JSONB DEFAULT '[]'::JSONB,
  barriers_mitigated TEXT,
  teach_back_performed BOOLEAN DEFAULT false,
  teach_back_successful BOOLEAN,
  materials_provided JSONB DEFAULT '[]'::JSONB,
  family_member_present BOOLEAN DEFAULT false,
  family_member_name TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  educator_id TEXT NOT NULL,
  educator_name TEXT,
  educator_role TEXT,
  delivered_at TEXT NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for patient_education_records
CREATE INDEX IF NOT EXISTS idx_education_patient ON patient_education_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_education_hospital ON patient_education_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_education_encounter ON patient_education_records(encounter_id);
CREATE INDEX IF NOT EXISTS idx_education_admission ON patient_education_records(admission_id);
CREATE INDEX IF NOT EXISTS idx_education_topic ON patient_education_records(topic_id);
CREATE INDEX IF NOT EXISTS idx_education_educator ON patient_education_records(educator_id);
CREATE INDEX IF NOT EXISTS idx_education_delivered ON patient_education_records(delivered_at);

-- Enable RLS
ALTER TABLE patient_education_records ENABLE ROW LEVEL SECURITY;

-- Create public access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patient_education_records' 
    AND policyname = 'public_access'
  ) THEN
    CREATE POLICY "public_access" ON patient_education_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 3. CALCULATOR RESULTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS calculator_results (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  hospital_id TEXT,
  encounter_id TEXT,
  calculator_type TEXT NOT NULL,
  calculator_name TEXT NOT NULL,
  input_values JSONB NOT NULL,
  result_value TEXT NOT NULL,
  result_interpretation TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high', 'very_high', 'critical')),
  recommendations JSONB DEFAULT '[]'::JSONB,
  calculated_by TEXT NOT NULL,
  calculated_by_name TEXT,
  calculated_at TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for calculator_results
CREATE INDEX IF NOT EXISTS idx_calculator_patient ON calculator_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_calculator_hospital ON calculator_results(hospital_id);
CREATE INDEX IF NOT EXISTS idx_calculator_encounter ON calculator_results(encounter_id);
CREATE INDEX IF NOT EXISTS idx_calculator_type ON calculator_results(calculator_type);
CREATE INDEX IF NOT EXISTS idx_calculator_calculated_by ON calculator_results(calculated_by);
CREATE INDEX IF NOT EXISTS idx_calculator_calculated_at ON calculator_results(calculated_at);

-- Enable RLS
ALTER TABLE calculator_results ENABLE ROW LEVEL SECURITY;

-- Create public access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calculator_results' 
    AND policyname = 'public_access'
  ) THEN
    CREATE POLICY "public_access" ON calculator_results FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 4. USER SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  whatsapp_notifications BOOLEAN DEFAULT false,
  -- Alert preferences
  critical_alerts_only BOOLEAN DEFAULT false,
  appointment_reminders BOOLEAN DEFAULT true,
  ward_round_reminders BOOLEAN DEFAULT true,
  medication_reminders BOOLEAN DEFAULT true,
  lab_result_alerts BOOLEAN DEFAULT true,
  -- Display preferences
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'en',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  default_landing_page TEXT,
  -- Clinical preferences
  default_hospital_id TEXT,
  default_ward TEXT,
  auto_save_interval INTEGER DEFAULT 30,
  voice_dictation_language TEXT DEFAULT 'en-US',
  -- Accessibility
  font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  high_contrast BOOLEAN DEFAULT false,
  reduce_motion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create public access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' 
    AND policyname = 'public_access'
  ) THEN
    CREATE POLICY "public_access" ON user_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 5. HOSPITAL SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS hospital_settings (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL UNIQUE,
  -- Branding
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  -- Operational settings
  default_consultation_fee DECIMAL(10,2),
  default_currency TEXT DEFAULT 'NGN',
  tax_rate DECIMAL(5,2),
  -- Ward configuration
  wards JSONB DEFAULT '[]'::JSONB,
  -- Appointment settings
  appointment_slot_duration INTEGER DEFAULT 30,
  appointment_lead_time INTEGER DEFAULT 24,
  max_advance_booking_days INTEGER DEFAULT 90,
  -- Clinical protocols
  default_dvt_prophylaxis TEXT,
  default_antibiotic_protocol TEXT,
  require_two_factor_auth BOOLEAN DEFAULT false,
  session_timeout_minutes INTEGER DEFAULT 60,
  -- Sync settings
  sync_interval_minutes INTEGER DEFAULT 5,
  offline_storage_limit_mb INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hospital_settings
CREATE INDEX IF NOT EXISTS idx_hospital_settings_hospital ON hospital_settings(hospital_id);

-- Enable RLS
ALTER TABLE hospital_settings ENABLE ROW LEVEL SECURITY;

-- Create public access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'hospital_settings' 
    AND policyname = 'public_access'
  ) THEN
    CREATE POLICY "public_access" ON hospital_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 6. ENABLE REALTIME ON ALL NEW TABLES
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'referrals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE referrals;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patient_education_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE patient_education_records;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'calculator_results') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calculator_results;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'hospital_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hospital_settings;
  END IF;
END $$;

-- ============================================
-- Done! New tables created with sync support.
-- ============================================
