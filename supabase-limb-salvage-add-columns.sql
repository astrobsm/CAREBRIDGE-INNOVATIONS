-- ============================================================
-- CareBridge Limb Salvage Table - Add Missing Columns Migration
-- Run this if you already have the limb_salvage_assessments table
-- and don't want to DROP it (to preserve existing data)
-- ============================================================

-- Add missing columns (will ignore if column already exists)

-- Core relationship columns
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS encounter_id TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS admission_id TEXT;

-- Patient demographics
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
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_duration INTEGER;
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

-- Clinical assessments
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS osteomyelitis JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS sepsis JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS renal_status JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS comorbidities JSONB;

-- Nutritional status
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS albumin DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS prealbumin DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS bmi DECIMAL;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS must_score INTEGER;

-- Scoring and decision
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS limb_salvage_score JSONB;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommended_management TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommended_amputation_level TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS recommendations JSONB;

-- Treatment and follow-up
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS treatment_plan TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS progress_notes TEXT;

-- Outcome tracking
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS actual_outcome TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS actual_amputation_level TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMPTZ;

-- Metadata
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_limb_salvage_admission ON limb_salvage_assessments(admission_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_encounter ON limb_salvage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_status ON limb_salvage_assessments(status);

-- ==========================================
-- Done! Missing columns added
-- ==========================================
