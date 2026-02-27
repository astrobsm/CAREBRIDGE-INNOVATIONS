-- ============================================================
-- Migration: Fix missing columns for npwt_sessions and limb_salvage_assessments
-- Date: 2026-02-24
-- Purpose: Add columns that exist in IndexedDB but not in Supabase,
--          fixing CloudSync 400 errors (PGRST204)
-- ============================================================

-- =============================
-- NPWT_SESSIONS - Missing columns
-- =============================

-- Machine/Timer
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS machine_code TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS timer_code TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS pressure_setting INTEGER;

-- Wound classification
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS wound_class TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS dimensions JSONB;

-- Materials & consumables (CRITICAL - these cause sync failures)
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS agents_used JSONB;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS cleaning_agents JSONB;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS materials JSONB;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS consumables JSONB;

-- Session tracking
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

-- Progress tracking
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS image_base64 TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS wound_condition TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS granulation_percent INTEGER;

-- Clinical notes (separate from 'notes')
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;

-- Sync tracking
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- =============================
-- LIMB_SALVAGE_ASSESSMENTS - ALL Missing columns
-- =============================

-- Core identifiers
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS admission_id TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS hospital_id TEXT;

-- Assessment details
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS assessed_by_name TEXT;

-- Patient demographics for scoring
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS patient_age INTEGER;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS patient_gender TEXT;

-- Affected limb
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS affected_side TEXT;

-- Wound classification scores
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wagner_grade JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS texas_classification JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wifi_classification JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS sinbad_score JSONB;

-- Wound details
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_location TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_size JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_shape TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_duration INTEGER;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wounds JSONB DEFAULT '[]';
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS previous_debridement BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS debridement_count INTEGER;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_photos JSONB;

-- Vascular assessment
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS doppler_findings JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS angiogram_performed BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS angiogram_findings TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS previous_revascularization BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS revascularization_details TEXT;

-- Neuropathy assessment
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS monofilament_test BOOLEAN;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS vibration_sense BOOLEAN;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS ankle_reflexes TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS neuropathy_symptoms JSONB;

-- Osteomyelitis & Sepsis
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS osteomyelitis JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS sepsis JSONB;

-- Renal & Comorbidities
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS renal_status JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS comorbidities JSONB;

-- Nutritional status
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS albumin DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS prealbumin DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS bmi DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS must_score INTEGER;

-- Calculated scores
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS limb_salvage_score JSONB;

-- Decision
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommended_management TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommended_amputation_level TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommendations JSONB;

-- Treatment plan
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS treatment_plan TEXT;

-- Progress monitoring
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS progress_notes TEXT;

-- Outcome tracking
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS actual_outcome TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS actual_amputation_level TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMPTZ;

-- Metadata
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Sync tracking
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- Indexes for limb_salvage_assessments
CREATE INDEX IF NOT EXISTS idx_limb_salvage_patient ON limb_salvage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_admission ON limb_salvage_assessments(admission_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_encounter ON limb_salvage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_date ON limb_salvage_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_status ON limb_salvage_assessments(status);

-- =============================
-- SUBSTANCE_USE_ASSESSMENTS - Fix status check constraint
-- The app uses DetoxStatus values but Supabase had a restrictive CHECK constraint
-- =============================

-- Drop the old restrictive constraint (silently ignore if it doesn't exist)
DO $$
BEGIN
  ALTER TABLE substance_use_assessments DROP CONSTRAINT IF EXISTS substance_use_assessments_status_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Add new constraint matching DetoxStatus type from the TypeScript interface
ALTER TABLE substance_use_assessments DROP CONSTRAINT IF EXISTS substance_use_assessments_status_check;
ALTER TABLE substance_use_assessments ADD CONSTRAINT substance_use_assessments_status_check
  CHECK (status IN (
    'assessment_pending',
    'in_assessment',
    'detox_planned',
    'detox_in_progress',
    'detox_completed',
    'transferred',
    'discharged',
    'relapsed',
    'abandoned',
    -- Keep backwards compatibility with old values
    'in_progress',
    'completed',
    'reviewed',
    'archived',
    'draft'
  ));

-- =============================
-- Notify PostgREST to refresh schema cache
-- =============================
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- Done! All missing columns added + substance_use status constraint fixed
-- Run this in Supabase SQL Editor
-- ==========================================
