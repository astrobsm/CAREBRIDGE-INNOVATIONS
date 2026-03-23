-- AstroHEALTH Supabase Sync Columns Fix Migration
-- Run this in Supabase SQL Editor to fix sync errors
-- This adds missing columns that exist in TypeScript types but not in the database

-- ============================================
-- SURGERIES TABLE - Add billing-related columns
-- ============================================

-- Add surgeon ID for billing (links to users table)
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_id TEXT;

-- Add surgeon fee for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_fee DECIMAL(12,2);

-- Add assistant surgeon ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_id TEXT;

-- Add assistant fee percentage (typically 20% of surgeon fee)
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee_percentage DECIMAL(5,2);

-- Add calculated assistant fee
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee DECIMAL(12,2);

-- Add anaesthetist ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist_id TEXT;

-- Add anaesthesia fee
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthesia_fee DECIMAL(12,2);

-- Add scrub nurse ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse_id TEXT;

-- Add circulating nurse ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse_id TEXT;

-- Add outstanding preparation items
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS outstanding_items JSONB;

-- Add priority field if missing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'elective';

-- Ensure assistant column exists (this was reported as missing)
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant TEXT;

-- ============================================
-- WOUNDS TABLE - Ensure all columns exist
-- ============================================

-- Add photo_urls if missing (for external image URLs)
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photo_urls JSONB;

-- Add photos JSONB for photo data
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photos JSONB;

-- Add created_by field
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add wound_bed_color field
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_bed_color TEXT;

-- Add tunneling/undermining fields
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS tunneling TEXT;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS undermining TEXT;

-- ============================================
-- ADMISSIONS TABLE - Ensure all columns exist
-- ============================================

-- Add created_by field (reported as missing)
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add admission_number if missing
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_number TEXT;

-- Add ward_type if missing
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_type TEXT;

-- Add primary_doctor and primary_nurse for care team
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_doctor TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_nurse TEXT;

-- Add severity field
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS severity TEXT;

-- Add additional diagnosis fields
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS indication_for_admission TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitting_diagnosis TEXT;

-- Add discharge-related fields
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMPTZ;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_time TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_summary TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharged_by TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_type TEXT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_diagnosis TEXT;

-- Add follow-up fields
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT;

-- ============================================
-- VITAL_SIGNS TABLE - Ensure all columns exist
-- ============================================

ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS spo2 INTEGER;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_sugar DECIMAL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS urine_output DECIMAL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS consciousness_level TEXT;

-- ============================================
-- PATIENTS TABLE - Ensure all columns exist
-- ============================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS registered_hospital_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_type TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dvt_risk_assessment JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pressure_sore_risk_assessment JSONB;

-- ============================================
-- LAB_REQUESTS TABLE - Ensure all columns exist
-- ============================================

ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS results JSONB;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS result_notes TEXT;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ============================================
-- PRESCRIPTIONS TABLE - Ensure all columns exist
-- ============================================

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescribed_by TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_by TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ;

-- ============================================
-- USERS TABLE - Ensure billing columns exist
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name TEXT;

-- ============================================
-- INVOICES TABLE - Ensure all columns exist
-- ============================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_evidence TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_evidence_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2);

-- ============================================
-- Create indexes for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_surgeries_surgeon_id ON surgeries(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_assistant_id ON surgeries(assistant_id);
CREATE INDEX IF NOT EXISTS idx_admissions_admission_number ON admissions(admission_number);
CREATE INDEX IF NOT EXISTS idx_admissions_created_by ON admissions(created_by);
CREATE INDEX IF NOT EXISTS idx_wounds_created_by ON wounds(created_by);

-- ============================================
-- Enable realtime for updated tables
-- ============================================

-- Re-enable realtime subscriptions if needed
DO $$
BEGIN
  -- These might fail if already enabled, that's OK
  ALTER PUBLICATION supabase_realtime ADD TABLE surgeries;
  ALTER PUBLICATION supabase_realtime ADD TABLE wounds;
  ALTER PUBLICATION supabase_realtime ADD TABLE admissions;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if tables are already in publication
  NULL;
END $$;

-- ============================================
-- Verification query - run after migration
-- ============================================

-- Run this to verify columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'surgeries' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'wounds' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'admissions' ORDER BY ordinal_position;
