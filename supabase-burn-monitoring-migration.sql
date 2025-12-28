-- ============================================================
-- CareBridge Burn Monitoring Tables Migration
-- Run this SQL in Supabase SQL Editor to add burn monitoring tables
-- ============================================================

-- ==========================================
-- BURN MONITORING RECORDS TABLE
-- Hourly burn patient monitoring
-- ==========================================

DROP TABLE IF EXISTS burn_monitoring_records CASCADE;

CREATE TABLE burn_monitoring_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  burn_assessment_id TEXT NOT NULL,
  admission_id TEXT,
  hospital_id TEXT,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL,
  recorded_by TEXT NOT NULL,
  recorded_by_name TEXT,
  
  -- Vital Signs (JSONB for complex structure)
  vitals JSONB,
  
  -- Urine Output
  urine_output JSONB,
  
  -- Fluid Administered
  fluid_administered JSONB,
  
  -- Neurological (GCS)
  gcs_score JSONB,
  
  -- Pain Assessment
  pain_score INTEGER,
  pain_location TEXT,
  
  -- Wound Status
  wound_status JSONB,
  
  -- Labs (if available)
  labs JSONB,
  
  -- Alerts Generated
  alerts JSONB,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for burn monitoring records
CREATE INDEX IF NOT EXISTS idx_burn_monitoring_patient ON burn_monitoring_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_burn_monitoring_burn_assessment ON burn_monitoring_records(burn_assessment_id);
CREATE INDEX IF NOT EXISTS idx_burn_monitoring_recorded_at ON burn_monitoring_records(recorded_at);

-- RLS
ALTER TABLE burn_monitoring_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON burn_monitoring_records FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- ESCHAROTOMY RECORDS TABLE
-- ==========================================

DROP TABLE IF EXISTS escharotomy_records CASCADE;

CREATE TABLE escharotomy_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  burn_assessment_id TEXT NOT NULL,
  
  -- Procedure Details
  performed_at TIMESTAMPTZ NOT NULL,
  performed_by TEXT NOT NULL,
  performed_by_name TEXT,
  
  -- Location
  location TEXT NOT NULL,
  side TEXT, -- 'left', 'right', 'bilateral', 'midline'
  
  -- Indications
  indications JSONB,
  compartment_pressure DECIMAL,
  
  -- Technique
  incision_length DECIMAL,
  deep_fasciotomy BOOLEAN DEFAULT false,
  
  -- Outcome
  immediate_result TEXT, -- 'restored_perfusion', 'improved_perfusion', 'no_change'
  complications JSONB,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escharotomy_patient ON escharotomy_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_escharotomy_burn_assessment ON escharotomy_records(burn_assessment_id);
CREATE INDEX IF NOT EXISTS idx_escharotomy_performed_at ON escharotomy_records(performed_at);

-- RLS
ALTER TABLE escharotomy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON escharotomy_records FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- SKIN GRAFT RECORDS TABLE
-- ==========================================

DROP TABLE IF EXISTS skin_graft_records CASCADE;

CREATE TABLE skin_graft_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  burn_assessment_id TEXT NOT NULL,
  surgery_id TEXT,
  
  -- Procedure Details
  performed_at TIMESTAMPTZ NOT NULL,
  performed_by TEXT NOT NULL,
  performed_by_name TEXT,
  
  -- Graft Type
  graft_type TEXT NOT NULL, -- 'stsg', 'ftsg', 'composite', 'allograft', 'xenograft', 'cultured_epithelium'
  mesh_ratio TEXT,
  
  -- Donor Site
  donor_site TEXT NOT NULL,
  donor_area DECIMAL,
  
  -- Recipient Site
  recipient_site TEXT NOT NULL,
  recipient_area DECIMAL,
  
  -- Fixation
  fixation_method TEXT, -- 'sutures', 'staples', 'fibrin_glue', 'negative_pressure', 'combination'
  dressing_type TEXT,
  
  -- Follow-up Assessments (array of assessment objects)
  assessments JSONB,
  
  -- Final Outcome
  final_take_percentage DECIMAL,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skin_graft_patient ON skin_graft_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_skin_graft_burn_assessment ON skin_graft_records(burn_assessment_id);
CREATE INDEX IF NOT EXISTS idx_skin_graft_surgery ON skin_graft_records(surgery_id);
CREATE INDEX IF NOT EXISTS idx_skin_graft_performed_at ON skin_graft_records(performed_at);

-- RLS
ALTER TABLE skin_graft_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON skin_graft_records FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- BURN CARE PLANS TABLE
-- ==========================================

DROP TABLE IF EXISTS burn_care_plans CASCADE;

CREATE TABLE burn_care_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  burn_assessment_id TEXT NOT NULL,
  admission_id TEXT,
  hospital_id TEXT,
  
  -- Phase
  current_phase TEXT, -- 'resuscitation', 'acute', 'grafting', 'rehabilitation'
  
  -- Goals
  resuscitation_goals JSONB,
  wound_care_goals JSONB,
  nutrition_goals JSONB,
  rehabilitation_goals JSONB,
  
  -- Orders
  fluid_orders JSONB,
  medication_orders JSONB,
  wound_care_orders JSONB,
  
  -- Team
  primary_surgeon TEXT,
  primary_nurse TEXT,
  dietitian TEXT,
  physiotherapist TEXT,
  occupational_therapist TEXT,
  psychologist TEXT,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'modified'
  
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_burn_care_plan_patient ON burn_care_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_burn_care_plan_burn_assessment ON burn_care_plans(burn_assessment_id);
CREATE INDEX IF NOT EXISTS idx_burn_care_plan_status ON burn_care_plans(status);

-- RLS
ALTER TABLE burn_care_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON burn_care_plans FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- VIEW: Active Burn Patients
-- ==========================================

CREATE OR REPLACE VIEW active_burn_patients AS
SELECT 
  p.id AS patient_id,
  p.first_name,
  p.last_name,
  p.hospital_number,
  ba.id AS burn_assessment_id,
  ba.tbsa_percentage,
  ba.burn_type,
  ba.inhalation_injury,
  bcp.current_phase,
  bcp.status AS care_plan_status,
  a.ward_name,
  a.bed_number,
  a.admission_date,
  (
    SELECT COUNT(*) 
    FROM burn_monitoring_records bmr 
    WHERE bmr.burn_assessment_id = ba.id 
    AND bmr.recorded_at > NOW() - INTERVAL '24 hours'
  ) AS monitoring_entries_24h,
  (
    SELECT bmr.recorded_at 
    FROM burn_monitoring_records bmr 
    WHERE bmr.burn_assessment_id = ba.id 
    ORDER BY bmr.recorded_at DESC 
    LIMIT 1
  ) AS last_monitoring_at
FROM patients p
JOIN burn_assessments ba ON p.id = ba.patient_id
LEFT JOIN burn_care_plans bcp ON ba.id = bcp.burn_assessment_id AND bcp.status = 'active'
LEFT JOIN admissions a ON p.id = a.patient_id AND a.status = 'active'
WHERE p.is_active = true;

-- ==========================================
-- Done! Burn monitoring tables created
-- ==========================================
-- Tables created:
-- 1. burn_monitoring_records
-- 2. escharotomy_records
-- 3. skin_graft_records
-- 4. burn_care_plans
-- ==========================================
