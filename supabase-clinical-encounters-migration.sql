-- Clinical Encounters Migration - Add Initial and Follow-up Encounter Fields
-- Created: 2026-02-06
-- Purpose: Add missing columns to support distinction between initial and follow-up encounters
-- NOTE: Run each section separately if timeouts occur

-- =====================================================
-- SECTION 1: ADD MISSING COLUMNS TO clinical_encounters TABLE
-- =====================================================

-- Flag to distinguish initial vs follow-up encounters
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS is_first_encounter BOOLEAN DEFAULT false;

-- Initial encounter specific - comprehensive history fields
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS allergy_history TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS medication_history TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS immunization_history TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS obstetric_history TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS developmental_history TEXT;

-- Follow-up encounter specific fields
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS interval_history TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS compliance_assessment TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS treatment_response TEXT;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS new_symptoms TEXT;

-- Reference to previous encounter for follow-ups (TEXT to match id column type)
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS previous_encounter_id TEXT;

-- Clinical photos as JSONB array
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS clinical_photos JSONB DEFAULT '[]'::jsonb;

-- Sync tracking
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS local_id TEXT;

-- =====================================================
-- SECTION 2: CREATE INDEXES FOR BETTER QUERY PERFORMANCE
-- Run this section AFTER section 1 completes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clinical_encounters_is_first_encounter 
ON clinical_encounters(is_first_encounter);

CREATE INDEX IF NOT EXISTS idx_clinical_encounters_patient_type 
ON clinical_encounters(patient_id, type);

CREATE INDEX IF NOT EXISTS idx_clinical_encounters_patient_created 
ON clinical_encounters(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_encounters_local_id 
ON clinical_encounters(local_id);

CREATE INDEX IF NOT EXISTS idx_clinical_encounters_previous 
ON clinical_encounters(previous_encounter_id);

-- =====================================================
-- SECTION 3: UPDATE EXISTING RECORDS TO SET is_first_encounter
-- Run this section AFTER section 2 completes
-- This uses a batched approach to avoid timeouts
-- =====================================================

-- Simple update: mark encounters with type 'initial' as first encounters
UPDATE clinical_encounters 
SET is_first_encounter = true 
WHERE type = 'initial' AND is_first_encounter = false;

-- For patients without 'initial' type, mark their earliest encounter
-- This is done in a more efficient way
UPDATE clinical_encounters ce
SET is_first_encounter = true
FROM (
    SELECT DISTINCT ON (patient_id) id
    FROM clinical_encounters
    WHERE is_first_encounter = false
    ORDER BY patient_id, created_at ASC
) first_enc
WHERE ce.id = first_enc.id
AND NOT EXISTS (
    SELECT 1 FROM clinical_encounters 
    WHERE patient_id = ce.patient_id AND is_first_encounter = true
);

-- =====================================================
-- SECTION 4: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN clinical_encounters.is_first_encounter IS 'True if this is the initial/first encounter for the patient';
COMMENT ON COLUMN clinical_encounters.allergy_history IS 'Patient allergy history (initial encounter)';
COMMENT ON COLUMN clinical_encounters.medication_history IS 'Current and past medications (initial encounter)';
COMMENT ON COLUMN clinical_encounters.immunization_history IS 'Vaccination history (initial encounter)';
COMMENT ON COLUMN clinical_encounters.obstetric_history IS 'Obstetric/gynecological history for female patients (initial encounter)';
COMMENT ON COLUMN clinical_encounters.developmental_history IS 'Developmental milestones for pediatric patients (initial encounter)';
COMMENT ON COLUMN clinical_encounters.interval_history IS 'Changes since last visit (follow-up encounter)';
COMMENT ON COLUMN clinical_encounters.compliance_assessment IS 'Medication and treatment compliance (follow-up encounter)';
COMMENT ON COLUMN clinical_encounters.treatment_response IS 'Response to treatment since last visit (follow-up encounter)';
COMMENT ON COLUMN clinical_encounters.new_symptoms IS 'New symptoms since last visit (follow-up encounter)';
COMMENT ON COLUMN clinical_encounters.clinical_photos IS 'Array of clinical photos taken during encounter';

-- =====================================================
-- SECTION 5: VERIFY MIGRATION (Optional)
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clinical_encounters'
AND column_name IN (
    'is_first_encounter', 
    'interval_history', 
    'compliance_assessment', 
    'treatment_response', 
    'new_symptoms',
    'previous_encounter_id',
    'allergy_history',
    'medication_history',
    'clinical_photos'
)
ORDER BY column_name;
