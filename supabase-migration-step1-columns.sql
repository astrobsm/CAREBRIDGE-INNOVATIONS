-- STEP 1: Add columns only (run this first)
-- Each ALTER is fast - should complete in < 1 second

ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS is_first_encounter BOOLEAN DEFAULT false;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS allergy_history TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS medication_history TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS immunization_history TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS obstetric_history TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS developmental_history TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS interval_history TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS compliance_assessment TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS treatment_response TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS new_symptoms TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS previous_encounter_id TEXT;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS clinical_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS local_id TEXT;

-- Verify columns were added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clinical_encounters' 
AND column_name IN ('is_first_encounter', 'interval_history', 'allergy_history')
ORDER BY column_name;
