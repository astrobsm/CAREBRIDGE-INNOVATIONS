-- Clinical Encounters Migration - Add Initial and Follow-up Encounter Fields
-- Created: 2026-02-06
-- Purpose: Add missing columns to support distinction between initial and follow-up encounters

-- =====================================================
-- ADD MISSING COLUMNS TO clinical_encounters TABLE
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

-- Reference to previous encounter for follow-ups
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS previous_encounter_id UUID REFERENCES clinical_encounters(id);

-- Clinical photos as JSONB array
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS clinical_photos JSONB DEFAULT '[]'::jsonb;

-- Sync tracking
ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

ALTER TABLE clinical_encounters 
ADD COLUMN IF NOT EXISTS local_id TEXT;

-- =====================================================
-- CREATE INDEXES FOR BETTER QUERY PERFORMANCE
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
-- UPDATE EXISTING RECORDS TO SET is_first_encounter
-- =====================================================

-- Mark the earliest encounter for each patient as the first encounter
WITH first_encounters AS (
    SELECT DISTINCT ON (patient_id) 
        id
    FROM clinical_encounters
    ORDER BY patient_id, created_at ASC
)
UPDATE clinical_encounters ce
SET is_first_encounter = true
WHERE ce.id IN (SELECT id FROM first_encounters);

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
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
-- VERIFY MIGRATION
-- =====================================================

-- Check that all columns exist
DO $$
DECLARE
    missing_columns TEXT := '';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'is_first_encounter') THEN
        missing_columns := missing_columns || 'is_first_encounter, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'interval_history') THEN
        missing_columns := missing_columns || 'interval_history, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'compliance_assessment') THEN
        missing_columns := missing_columns || 'compliance_assessment, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'treatment_response') THEN
        missing_columns := missing_columns || 'treatment_response, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'new_symptoms') THEN
        missing_columns := missing_columns || 'new_symptoms, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'previous_encounter_id') THEN
        missing_columns := missing_columns || 'previous_encounter_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'allergy_history') THEN
        missing_columns := missing_columns || 'allergy_history, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_encounters' AND column_name = 'medication_history') THEN
        missing_columns := missing_columns || 'medication_history, ';
    END IF;
    
    IF missing_columns <> '' THEN
        RAISE NOTICE 'Missing columns: %', missing_columns;
    ELSE
        RAISE NOTICE 'All clinical_encounters columns migrated successfully!';
    END IF;
END $$;
