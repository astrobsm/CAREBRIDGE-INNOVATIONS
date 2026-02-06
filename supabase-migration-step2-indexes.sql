-- STEP 2: Create indexes (run after step 1)
-- Run each CREATE INDEX separately if timeouts occur

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

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'clinical_encounters';
