-- ==========================================================
-- AstroHEALTH: Soft Tissue Infection (STI) Assessment
-- Necrotising Fasciitis & Complex STI Management
-- ==========================================================

-- Table: sti_assessments
CREATE TABLE IF NOT EXISTS public.sti_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  encounter_id TEXT REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  admission_id TEXT REFERENCES public.admissions(id) ON DELETE SET NULL,

  -- Classification & Severity
  classification TEXT NOT NULL,
  classification_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild','moderate','severe','critical')),
  eron_class TEXT NOT NULL CHECK (eron_class IN ('I','II','III','IV')),
  location TEXT NOT NULL,
  onset_date TEXT,
  duration_hours NUMERIC(8,2),
  pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),

  -- Clinical Features & Red Flags (stored as JSON)
  clinical_features JSONB NOT NULL DEFAULT '[]',
  red_flags JSONB NOT NULL DEFAULT '{}',

  -- Comorbidities (stored as JSON)
  comorbidities JSONB NOT NULL DEFAULT '{}',
  hba1c NUMERIC(5,2),

  -- Scores
  lrinec_score NUMERIC(5,2),
  lrinec_risk TEXT CHECK (lrinec_risk IN ('Low','Moderate','High')),
  qsofa_score INTEGER,

  -- AI-Generated Treatment Plan (stored as JSON)
  generated_treatment_plan JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','discharged')),
  additional_notes TEXT,

  -- Metadata
  assessed_by TEXT NOT NULL,
  assessed_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  local_id TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sti_assessments_patient_id ON public.sti_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_sti_assessments_hospital_id ON public.sti_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_sti_assessments_status ON public.sti_assessments(status);
CREATE INDEX IF NOT EXISTS idx_sti_assessments_severity ON public.sti_assessments(severity);
CREATE INDEX IF NOT EXISTS idx_sti_assessments_created_at ON public.sti_assessments(created_at DESC);

-- RLS
ALTER TABLE public.sti_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sti_assessments"
  ON public.sti_assessments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create sti_assessments"
  ON public.sti_assessments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sti_assessments"
  ON public.sti_assessments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete sti_assessments"
  ON public.sti_assessments FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sti_assessments;

-- ==========================================================
-- Table: sti_debridement_records
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.sti_debridement_records (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES public.sti_assessments(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  surgery_id TEXT REFERENCES public.surgeries(id) ON DELETE SET NULL,

  debridement_number INTEGER NOT NULL DEFAULT 1,
  debridement_date TEXT NOT NULL,
  debridement_time TEXT,
  surgeon TEXT NOT NULL,
  surgeon_name TEXT NOT NULL,
  assistants JSONB NOT NULL DEFAULT '[]',

  procedure_type TEXT NOT NULL CHECK (procedure_type IN (
    'radical_debridement','serial_debridement','fasciotomy','amputation','wound_washout'
  )),
  anesthesia_type TEXT NOT NULL CHECK (anesthesia_type IN ('general','regional','local','sedation')),
  areas_debrided JSONB NOT NULL DEFAULT '[]',
  tissue_viability TEXT NOT NULL,
  extent_of_necrosis TEXT NOT NULL,
  fascial_involvement BOOLEAN NOT NULL DEFAULT false,
  muscle_involvement BOOLEAN NOT NULL DEFAULT false,

  -- Wound details
  wound_dimensions JSONB,
  wound_bed_description TEXT NOT NULL,
  bleeding_status TEXT NOT NULL CHECK (bleeding_status IN ('healthy_bleeding','minimal','non_bleeding')),
  margin_status TEXT NOT NULL,

  -- Microbiology
  is_culture_sent BOOLEAN NOT NULL DEFAULT false,
  culture_results TEXT,
  is_histopathology_sent BOOLEAN NOT NULL DEFAULT false,

  -- Closure
  closure_method TEXT NOT NULL CHECK (closure_method IN (
    'open','vac_therapy','loose_packing','delayed_primary','skin_graft','flap'
  )),
  dressing_type TEXT NOT NULL,
  vac_settings JSONB,

  -- Follow-up
  next_debridement_planned BOOLEAN NOT NULL DEFAULT false,
  next_debridement_date TEXT,
  blood_loss NUMERIC(8,2),
  complications TEXT,
  post_op_instructions JSONB NOT NULL DEFAULT '[]',

  findings TEXT NOT NULL,
  photos JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  local_id TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sti_debridement_assessment_id ON public.sti_debridement_records(assessment_id);
CREATE INDEX IF NOT EXISTS idx_sti_debridement_patient_id ON public.sti_debridement_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_sti_debridement_hospital_id ON public.sti_debridement_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_sti_debridement_date ON public.sti_debridement_records(debridement_date DESC);
CREATE INDEX IF NOT EXISTS idx_sti_debridement_created_at ON public.sti_debridement_records(created_at DESC);

-- RLS
ALTER TABLE public.sti_debridement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sti_debridement_records"
  ON public.sti_debridement_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create sti_debridement_records"
  ON public.sti_debridement_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sti_debridement_records"
  ON public.sti_debridement_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete sti_debridement_records"
  ON public.sti_debridement_records FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sti_debridement_records;
