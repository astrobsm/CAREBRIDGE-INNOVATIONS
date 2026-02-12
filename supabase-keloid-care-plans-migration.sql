-- =====================================================
-- SUPABASE MIGRATION: Keloid Care Plans Table
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create keloid_care_plans table
CREATE TABLE IF NOT EXISTS keloid_care_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES hospitals(id) ON DELETE SET NULL,
  encounter_id TEXT,
  clinical_summary TEXT,
  diagnosis_date TIMESTAMPTZ,
  keloid_assessments JSONB DEFAULT '[]'::jsonb,
  identified_problems JSONB DEFAULT '[]'::jsonb,
  other_concerns TEXT,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  comorbidities JSONB DEFAULT '[]'::jsonb,
  has_no_comorbidities BOOLEAN DEFAULT false,
  pre_triamcinolone_tests JSONB DEFAULT '[]'::jsonb,
  patient_gender TEXT CHECK (patient_gender IN ('male', 'female')),
  patient_age INTEGER,
  all_tests_cleared BOOLEAN DEFAULT false,
  treatment_plan JSONB,
  multi_modality_explained BOOLEAN DEFAULT false,
  compliance_importance_explained BOOLEAN DEFAULT false,
  patient_consent_obtained BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  local_id TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_keloid_care_plans_patient ON keloid_care_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_keloid_care_plans_hospital ON keloid_care_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_keloid_care_plans_status ON keloid_care_plans(status);
CREATE INDEX IF NOT EXISTS idx_keloid_care_plans_created_by ON keloid_care_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_keloid_care_plans_created_at ON keloid_care_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_keloid_care_plans_updated_at ON keloid_care_plans(updated_at);

-- Enable Row Level Security
ALTER TABLE keloid_care_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users
CREATE POLICY "keloid_care_plans_all" ON keloid_care_plans
  FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE keloid_care_plans;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_keloid_care_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_keloid_care_plans_updated_at
  BEFORE UPDATE ON keloid_care_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_keloid_care_plans_updated_at();

-- Verify
SELECT 'keloid_care_plans table created successfully' AS status;
