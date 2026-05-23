-- ============================================================
-- AstroHEALTH Limb Salvage Assessment — SAFE / IDEMPOTENT Migration
-- Run this SQL in Supabase SQL Editor
--
-- This version NEVER drops the table. It only:
--   • Creates the table if it does not exist
--   • Adds any missing columns
--   • Creates indexes if missing
--   • Ensures RLS + a permissive policy exist
--
-- Safe to run multiple times. Preserves all existing rows.
-- ============================================================

-- 1. Create table only if missing
CREATE TABLE IF NOT EXISTS limb_salvage_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add any missing columns (no-op if already present)
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS encounter_id TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS admission_id TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS hospital_id TEXT;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS assessment_date TIMESTAMPTZ;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS assessed_by TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS assessed_by_name TEXT;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS patient_age INTEGER;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS patient_gender TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS affected_side TEXT;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wagner_grade JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS texas_classification JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wifi_classification JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS sinbad_score JSONB;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_location TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_size JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_duration INTEGER;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS previous_debridement BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS debridement_count INTEGER;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_photos JSONB;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS doppler_findings JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS angiogram_performed BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS angiogram_findings TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS previous_revascularization BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS revascularization_details TEXT;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS monofilament_test BOOLEAN;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS vibration_sense BOOLEAN;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS ankle_reflexes TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS neuropathy_symptoms JSONB;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS osteomyelitis JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS sepsis JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS renal_status JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS comorbidities JSONB;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS albumin DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS prealbumin DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS bmi DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS must_score INTEGER;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS limb_salvage_score JSONB;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommended_management TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommended_amputation_level TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommendations JSONB;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS treatment_plan TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS progress_notes TEXT;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS actual_outcome TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS actual_amputation_level TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMPTZ;

ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_limb_salvage_patient    ON limb_salvage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_admission  ON limb_salvage_assessments(admission_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_encounter  ON limb_salvage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_date       ON limb_salvage_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_status     ON limb_salvage_assessments(status);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_hospital   ON limb_salvage_assessments(hospital_id);

-- 4. RLS enable (idempotent)
ALTER TABLE limb_salvage_assessments ENABLE ROW LEVEL SECURITY;

-- 5. Permissive policy (drop-and-recreate the policy only, NOT the table)
DROP POLICY IF EXISTS "public_access" ON limb_salvage_assessments;
CREATE POLICY "public_access" ON limb_salvage_assessments
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Verify
SELECT 'limb_salvage_assessments OK — rows: ' || COUNT(*)::text AS result
FROM limb_salvage_assessments;

-- Ankle joint integrity + treatment consent (added with ankle-joint scoring feature)
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS ankle_joint_integrity JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS treatment_consent JSONB;
