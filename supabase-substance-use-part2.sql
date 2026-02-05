-- Part 2: Create indexes and enable RLS
-- Run this after Part 1 succeeds

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_substance_use_patient ON substance_use_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_substance_use_hospital ON substance_use_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_substance_use_status ON substance_use_assessments(status);
CREATE INDEX IF NOT EXISTS idx_substance_use_primary_substance ON substance_use_assessments(primary_substance);
CREATE INDEX IF NOT EXISTS idx_substance_use_assessed_by ON substance_use_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_substance_use_assessment_date ON substance_use_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_substance_use_created_at ON substance_use_assessments(created_at);

-- Enable RLS
ALTER TABLE substance_use_assessments ENABLE ROW LEVEL SECURITY;
