-- ============================================
-- AstroHEALTH Complete Sync Fix Migration
-- ============================================
-- This migration ensures all tables are properly configured
-- for two-way real-time cross-device synchronization
-- 
-- Run this in Supabase SQL Editor to:
-- 1. Add missing columns to admissions table
-- 2. Ensure external_reviews table exists
-- 3. Enable realtime on all tables
-- ============================================

-- ============================================
-- 1. ADD MISSING COLUMNS TO ADMISSIONS TABLE
-- ============================================
-- Add primaryManagingConsultant for MDT workflow approval

DO $$
BEGIN
  -- Add primary_managing_consultant column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admissions' 
    AND column_name = 'primary_managing_consultant'
  ) THEN
    ALTER TABLE admissions ADD COLUMN primary_managing_consultant TEXT;
    RAISE NOTICE 'Added primary_managing_consultant column to admissions';
  END IF;
  
  -- Add primary_managing_consultant_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admissions' 
    AND column_name = 'primary_managing_consultant_name'
  ) THEN
    ALTER TABLE admissions ADD COLUMN primary_managing_consultant_name TEXT;
    RAISE NOTICE 'Added primary_managing_consultant_name column to admissions';
  END IF;
END $$;

-- ============================================
-- 2. ENSURE EXTERNAL_REVIEWS TABLE EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS external_reviews (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  folder_number TEXT,
  service_date DATE,
  diagnoses JSONB DEFAULT '[]'::JSONB,
  surgeries JSONB DEFAULT '[]'::JSONB,
  pathology_results JSONB DEFAULT '[]'::JSONB,
  radiology_results JSONB DEFAULT '[]'::JSONB,
  lab_results JSONB DEFAULT '[]'::JSONB,
  medications JSONB DEFAULT '[]'::JSONB,
  clinical_notes TEXT,
  discharge_summary TEXT,
  follow_up_plan TEXT,
  attachments JSONB DEFAULT '[]'::JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for external_reviews
CREATE INDEX IF NOT EXISTS idx_external_reviews_patient ON external_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_hospital ON external_reviews(hospital_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_folder ON external_reviews(folder_number);

-- Enable RLS on external_reviews
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

-- Create public access policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'external_reviews' 
    AND policyname = 'public_access'
  ) THEN
    CREATE POLICY "public_access" ON external_reviews FOR ALL USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created public_access policy for external_reviews';
  END IF;
END $$;

-- ============================================
-- 3. ENSURE ALL TABLES HAVE REALTIME ENABLED
-- ============================================

-- Core tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'hospitals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patients') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE patients;
  END IF;
END $$;

-- Clinical tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vital_signs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vital_signs;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'clinical_encounters') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE clinical_encounters;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'surgeries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE surgeries;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wounds') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wounds;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'burn_assessments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE burn_assessments;
  END IF;
END $$;

-- Lab & Pharmacy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lab_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lab_requests;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prescriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions;
  END IF;
END $$;

-- Nutrition
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nutrition_assessments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nutrition_assessments;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nutrition_plans') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nutrition_plans;
  END IF;
END $$;

-- Billing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'invoices') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
  END IF;
END $$;

-- Admission & Ward
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'admissions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admissions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'admission_notes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admission_notes;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bed_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bed_assignments;
  END IF;
END $$;

-- Treatment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'treatment_plans') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE treatment_plans;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'treatment_progress') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE treatment_progress;
  END IF;
END $$;

-- Ward Rounds & Assignments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ward_rounds') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ward_rounds;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'doctor_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE doctor_assignments;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nurse_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nurse_assignments;
  END IF;
END $$;

-- Investigations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'investigations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE investigations;
  END IF;
END $$;

-- Communication
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'video_conferences') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE video_conferences;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'enhanced_video_conferences') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE enhanced_video_conferences;
  END IF;
END $$;

-- Discharge & Documentation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'discharge_summaries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE discharge_summaries;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'consumable_boms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE consumable_boms;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'histopathology_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE histopathology_requests;
  END IF;
END $$;

-- Blood Transfusion & MDT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'blood_transfusions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blood_transfusions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mdt_meetings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mdt_meetings;
  END IF;
END $$;

-- Limb Salvage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'limb_salvage_assessments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE limb_salvage_assessments;
  END IF;
END $$;

-- Burn Care Monitoring
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'burn_monitoring_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE burn_monitoring_records;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'escharotomy_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escharotomy_records;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'skin_graft_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE skin_graft_records;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'burn_care_plans') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE burn_care_plans;
  END IF;
END $$;

-- Appointments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_reminders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointment_reminders;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_slots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointment_slots;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'clinic_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE clinic_sessions;
  END IF;
END $$;

-- NPWT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'npwt_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE npwt_sessions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'npwt_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE npwt_notifications;
  END IF;
END $$;

-- Medication Charts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'medication_charts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE medication_charts;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nurse_patient_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nurse_patient_assignments;
  END IF;
END $$;

-- Transfusion
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transfusion_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transfusion_orders;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transfusion_monitoring_charts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transfusion_monitoring_charts;
  END IF;
END $$;

-- Staff Assignments & Billing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_patient_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_patient_assignments;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'activity_billing_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_billing_records;
  END IF;
END $$;

-- Payroll
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'payroll_periods') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payroll_periods;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_payroll_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_payroll_records;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'payslips') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payslips;
  END IF;
END $$;

-- Post-Operative Notes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_operative_notes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_operative_notes;
  END IF;
END $$;

-- Preoperative Assessments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'preoperative_assessments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE preoperative_assessments;
  END IF;
END $$;

-- External Reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'external_reviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE external_reviews;
  END IF;
END $$;

-- Audit Logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
  END IF;
END $$;

-- ============================================
-- 4. VERIFY TABLE COUNT
-- ============================================

-- Run this query to verify all tables exist:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ============================================
-- Done! All sync configurations are complete.
-- ============================================
