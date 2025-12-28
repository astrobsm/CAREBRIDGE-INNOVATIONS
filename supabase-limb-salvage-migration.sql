-- ============================================================
-- CareBridge Limb Salvage Assessment Table Migration
-- Run this SQL in Supabase SQL Editor
-- Version 2.0 - Updated to match full LimbSalvageAssessment interface
-- ============================================================

DROP TABLE IF EXISTS limb_salvage_assessments CASCADE;

CREATE TABLE limb_salvage_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  
  -- Assessment Details
  assessment_date TIMESTAMPTZ NOT NULL,
  assessed_by TEXT NOT NULL,
  assessed_by_name TEXT,
  
  -- Patient Demographics for Scoring
  patient_age INTEGER,
  patient_gender TEXT, -- 'male', 'female'
  
  -- Affected Limb
  affected_side TEXT, -- 'left', 'right', 'bilateral'
  
  -- Wound Classification Scores
  wagner_grade JSONB,
  texas_classification JSONB,
  wifi_classification JSONB,
  sinbad_score JSONB,
  
  -- Wound Details
  wound_location TEXT,
  wound_size JSONB, -- { length, width, depth, area }
  wound_duration INTEGER, -- days
  previous_debridement BOOLEAN DEFAULT false,
  debridement_count INTEGER,
  wound_photos JSONB, -- array of URLs
  
  -- Vascular Assessment
  doppler_findings JSONB,
  angiogram_performed BOOLEAN DEFAULT false,
  angiogram_findings TEXT,
  previous_revascularization BOOLEAN DEFAULT false,
  revascularization_details TEXT,
  
  -- Neuropathy Assessment
  monofilament_test BOOLEAN, -- true = protective sensation absent
  vibration_sense BOOLEAN, -- true = absent
  ankle_reflexes TEXT, -- 'present', 'diminished', 'absent'
  neuropathy_symptoms JSONB, -- array of strings
  
  -- Osteomyelitis Assessment
  osteomyelitis JSONB,
  
  -- Sepsis Assessment
  sepsis JSONB,
  
  -- Renal Status
  renal_status JSONB,
  
  -- Comorbidities
  comorbidities JSONB,
  
  -- Nutritional Status
  albumin DECIMAL,
  prealbumin DECIMAL,
  bmi DECIMAL,
  must_score INTEGER,
  
  -- Calculated Scores
  limb_salvage_score JSONB,
  
  -- Decision
  recommended_management TEXT, -- 'conservative', 'revascularization', 'minor_amputation', 'major_amputation'
  recommended_amputation_level TEXT,
  
  -- Generated Recommendations
  recommendations JSONB,
  
  -- Treatment Plan
  treatment_plan TEXT,
  
  -- Progress Monitoring
  follow_up_date TIMESTAMPTZ,
  progress_notes TEXT,
  
  -- Outcome Tracking
  actual_outcome TEXT, -- 'healed', 'improved', 'stable', 'worsened', 'amputated'
  actual_amputation_level TEXT,
  outcome_date TIMESTAMPTZ,
  
  -- Metadata
  status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'reviewed'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_limb_salvage_patient ON limb_salvage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_admission ON limb_salvage_assessments(admission_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_encounter ON limb_salvage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_date ON limb_salvage_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_status ON limb_salvage_assessments(status);

-- RLS
ALTER TABLE limb_salvage_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON limb_salvage_assessments FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- Done! limb_salvage_assessments table updated
-- Run this migration in Supabase SQL Editor
-- ==========================================
