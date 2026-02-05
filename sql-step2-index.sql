-- Step 2: Add one index at a time
-- Run each line SEPARATELY if timeout occurs

CREATE INDEX idx_sub_patient ON substance_use_assessments(patient_id);
