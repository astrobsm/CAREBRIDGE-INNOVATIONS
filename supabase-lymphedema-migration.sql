-- ============================================================
-- LYMPHEDEMA MODULE - Supabase Migration
-- AstroHEALTH Innovations in Healthcare
-- Tables: lymphedema_assessments, lymphedema_monitoring_records,
--         post_op_lymphedema_monitoring
-- ============================================================

-- 1. Lymphedema Assessments
CREATE TABLE IF NOT EXISTS public.lymphedema_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES public.hospitals(id),
  encounter_id TEXT REFERENCES public.clinical_encounters(id),
  admission_id TEXT REFERENCES public.admissions(id),

  -- Limb & Etiology
  affected_limb TEXT NOT NULL,
  etiology TEXT NOT NULL,
  onset_date TIMESTAMPTZ,
  duration_months INTEGER,

  -- Clinical Examination
  isl_stage TEXT,
  campisi_stage TEXT,
  pitting_grade INTEGER DEFAULT 0,
  tissue_consistency TEXT,
  stemmer_sign TEXT,
  limb_elevation_response TEXT,
  skin_conditions TEXT[] DEFAULT '{}',
  episodes_of_cellulitis_per_year INTEGER DEFAULT 0,
  has_active_infection BOOLEAN DEFAULT FALSE,

  -- Measurements
  affected_limb_measurements JSONB DEFAULT '[]',
  contralateral_limb_measurements JSONB DEFAULT '[]',
  affected_limb_volume_ml NUMERIC(10,2),
  contralateral_limb_volume_ml NUMERIC(10,2),
  volume_difference_ml NUMERIC(10,2),
  volume_difference_percent NUMERIC(5,2),

  -- Scoring
  severity_score JSONB,
  functional_impact_score JSONB,
  quality_of_life_score JSONB,

  -- Treatment Plans
  cdt_intensive_plan JSONB,
  cdt_maintenance_plan JSONB,
  infection_control_plan JSONB,
  debulking_criteria JSONB,
  surgical_plan JSONB,
  treatment_timeline JSONB,

  -- Clinical Info
  bmi NUMERIC(5,2),
  comorbidities TEXT[] DEFAULT '{}',
  previous_cdt_months INTEGER DEFAULT 0,
  previous_cdt_volume_reduction_percent NUMERIC(5,2) DEFAULT 0,
  patient_motivated BOOLEAN DEFAULT TRUE,
  psychosocial_impact TEXT,

  -- Status & Metadata
  status TEXT NOT NULL DEFAULT 'draft',
  assessed_by TEXT,
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  clinical_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 2. Lymphedema Monitoring Records
CREATE TABLE IF NOT EXISTS public.lymphedema_monitoring_records (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES public.lymphedema_assessments(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

  -- Measurements
  affected_limb_measurements JSONB DEFAULT '[]',
  contralateral_limb_measurements JSONB DEFAULT '[]',
  affected_limb_volume_ml NUMERIC(10,2),
  volume_change_from_baseline_ml NUMERIC(10,2),
  volume_change_from_baseline_percent NUMERIC(5,2),
  volume_change_from_last_ml NUMERIC(10,2),
  volume_change_from_last_percent NUMERIC(5,2),

  -- Clinical Findings
  pitting_grade INTEGER DEFAULT 0,
  tissue_consistency TEXT,
  skin_conditions TEXT[] DEFAULT '{}',
  pain_level INTEGER DEFAULT 0,
  functional_score NUMERIC(5,2),

  -- Treatment Compliance
  compression_compliance TEXT,
  exercise_compliance TEXT,
  skin_care_compliance TEXT,
  self_mld_compliance TEXT,

  -- Alerts
  alerts JSONB DEFAULT '[]',

  -- Metadata
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  clinical_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 3. Post-Operative Lymphedema Monitoring
CREATE TABLE IF NOT EXISTS public.post_op_lymphedema_monitoring (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES public.lymphedema_assessments(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  surgery_id TEXT REFERENCES public.surgeries(id),

  -- Post-Op Phase
  phase TEXT NOT NULL, -- 'immediate' | 'early' | 'intermediate' | 'late'
  post_op_day INTEGER,

  -- Drain Output
  drain_output_ml NUMERIC(10,2),
  drain_color TEXT,

  -- Wound Site
  wound_site_condition TEXT,
  wound_photo_url TEXT,

  -- Compression
  compression_applied BOOLEAN DEFAULT FALSE,
  compression_type TEXT,
  compression_class TEXT,

  -- Vitals
  temperature NUMERIC(4,1),
  limb_temperature_difference TEXT,

  -- Measurements
  limb_circumference_measurements JSONB DEFAULT '[]',
  volume_ml NUMERIC(10,2),

  -- Complications
  complications TEXT[] DEFAULT '{}',
  infection_signs BOOLEAN DEFAULT FALSE,
  seroma BOOLEAN DEFAULT FALSE,
  hematoma BOOLEAN DEFAULT FALSE,
  skin_necrosis BOOLEAN DEFAULT FALSE,

  -- Metadata
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  clinical_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_lymphedema_assessments_patient ON public.lymphedema_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_lymphedema_assessments_hospital ON public.lymphedema_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lymphedema_assessments_status ON public.lymphedema_assessments(status);
CREATE INDEX IF NOT EXISTS idx_lymphedema_assessments_date ON public.lymphedema_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_lymphedema_monitoring_assessment ON public.lymphedema_monitoring_records(assessment_id);
CREATE INDEX IF NOT EXISTS idx_lymphedema_monitoring_patient ON public.lymphedema_monitoring_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_lymphedema_monitoring_date ON public.lymphedema_monitoring_records(recorded_at);

CREATE INDEX IF NOT EXISTS idx_post_op_lymphedema_assessment ON public.post_op_lymphedema_monitoring(assessment_id);
CREATE INDEX IF NOT EXISTS idx_post_op_lymphedema_patient ON public.post_op_lymphedema_monitoring(patient_id);
CREATE INDEX IF NOT EXISTS idx_post_op_lymphedema_surgery ON public.post_op_lymphedema_monitoring(surgery_id);
CREATE INDEX IF NOT EXISTS idx_post_op_lymphedema_phase ON public.post_op_lymphedema_monitoring(phase);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.lymphedema_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lymphedema_monitoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_op_lymphedema_monitoring ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can CRUD
CREATE POLICY "lymphedema_assessments_select" ON public.lymphedema_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "lymphedema_assessments_insert" ON public.lymphedema_assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lymphedema_assessments_update" ON public.lymphedema_assessments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lymphedema_assessments_delete" ON public.lymphedema_assessments FOR DELETE TO authenticated USING (true);

CREATE POLICY "lymphedema_monitoring_select" ON public.lymphedema_monitoring_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "lymphedema_monitoring_insert" ON public.lymphedema_monitoring_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lymphedema_monitoring_update" ON public.lymphedema_monitoring_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lymphedema_monitoring_delete" ON public.lymphedema_monitoring_records FOR DELETE TO authenticated USING (true);

CREATE POLICY "post_op_lymphedema_select" ON public.post_op_lymphedema_monitoring FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_op_lymphedema_insert" ON public.post_op_lymphedema_monitoring FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "post_op_lymphedema_update" ON public.post_op_lymphedema_monitoring FOR UPDATE TO authenticated USING (true);
CREATE POLICY "post_op_lymphedema_delete" ON public.post_op_lymphedema_monitoring FOR DELETE TO authenticated USING (true);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.lymphedema_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lymphedema_monitoring_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_op_lymphedema_monitoring;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lymphedema_assessments_updated_at
  BEFORE UPDATE ON public.lymphedema_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER lymphedema_monitoring_updated_at
  BEFORE UPDATE ON public.lymphedema_monitoring_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER post_op_lymphedema_updated_at
  BEFORE UPDATE ON public.post_op_lymphedema_monitoring
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
