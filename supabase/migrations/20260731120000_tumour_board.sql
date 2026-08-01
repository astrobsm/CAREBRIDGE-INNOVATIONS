-- =====================================================
-- SUPABASE MIGRATION: Tumour Board (multidisciplinary oncology)
--
-- Auto-applied by the Supabase CLI on push to main. A copy is kept at the repo
-- root as `supabase-tumour-board-migration.sql` for manual runs in the SQL
-- Editor. Both are idempotent and safe to re-run.
--
-- Covers soft tissue malignancy and all skin cancers (melanoma and
-- non-melanoma): staging, multimodality planning, subspecialty referrals,
-- surveillance scheduling and patient counselling.
--
-- Design notes:
--  * `tumour_board_assessments` is APPEND-ONLY. A case is staged clinically,
--    re-staged when histology lands, and re-staged again after neoadjuvant
--    therapy. Overwriting would destroy the record of what was known when a
--    decision was taken — which is exactly what a tumour board record exists to
--    preserve. There is deliberately no unique constraint on (case_id, version):
--    two clinicians assessing offline may mint the same number, and the client
--    derives the displayed ordinal from `assessed_at` instead.
--  * `staging_system` is stored per assessment so a future AJCC edition can be
--    adopted site-by-site without invalidating historical staging.
--  * Clinical logic is entirely client-side and pure; these tables only persist
--    its output.
--
-- Columns are snake_case to match the app's camelCase -> snake_case sync layer.
-- =====================================================

-- ── Cases ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tumour_board_cases (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES hospitals(id) ON DELETE SET NULL,
  hospital_number TEXT,
  tumor_family TEXT NOT NULL,
  diagnosis TEXT,
  primary_site TEXT,
  laterality TEXT,
  sarcoma_site TEXT,
  date_of_diagnosis TEXT,
  date_first_presented TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_treatment', 'surveillance', 'closed')),
  treatment_intent TEXT,
  performance_status TEXT,
  comorbidities TEXT,
  immunosuppressed BOOLEAN,
  high_risk_site BOOLEAN,
  recurrent_disease BOOLEAN,
  fit_for_radical_therapy BOOLEAN,
  braf_mutated BOOLEAN,
  histology_available BOOLEAN,
  histologic_type TEXT,
  current_stage_group TEXT,
  current_stage_formatted TEXT,
  assessment_count INTEGER DEFAULT 0,
  last_board_date TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tb_cases_patient ON tumour_board_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_tb_cases_hospital ON tumour_board_cases(hospital_id);
CREATE INDEX IF NOT EXISTS idx_tb_cases_status ON tumour_board_cases(status);
CREATE INDEX IF NOT EXISTS idx_tb_cases_updated_at ON tumour_board_cases(updated_at);

-- ── Assessments (append-only staging timeline) ───────────────────────────────
CREATE TABLE IF NOT EXISTS tumour_board_assessments (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES tumour_board_cases(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  version INTEGER,
  basis TEXT NOT NULL,
  staging_system TEXT,
  assessed_at TIMESTAMPTZ,
  assessed_by TEXT,
  inputs JSONB,
  t_category TEXT,
  n_category TEXT,
  m_category TEXT,
  stage_group TEXT,
  stage_formatted TEXT,
  stage_description TEXT,
  caveats JSONB,
  local_spread TEXT,
  regional_spread TEXT,
  metastatic_spread TEXT,
  histologic_type TEXT,
  histologic_grade TEXT,
  margins TEXT,
  lymphovascular_invasion BOOLEAN,
  perineural_invasion BOOLEAN,
  molecular_findings TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tb_assessments_case ON tumour_board_assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_tb_assessments_patient ON tumour_board_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_tb_assessments_assessed_at ON tumour_board_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_tb_assessments_updated_at ON tumour_board_assessments(updated_at);

-- ── Management plans ─────────────────────────────────────────────────────────
-- Every plan is a DRAFT until a consultant ratifies it; `ratified_by` and
-- `ratified_at` record who took that step.
CREATE TABLE IF NOT EXISTS tumour_board_plans (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES tumour_board_cases(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES tumour_board_assessments(id) ON DELETE SET NULL,
  intent TEXT,
  summary TEXT,
  items JSONB,
  specialties JSONB,
  caveats JSONB,
  board_date TEXT,
  board_members TEXT,
  ratified BOOLEAN DEFAULT FALSE,
  ratified_by TEXT,
  ratified_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tb_plans_case ON tumour_board_plans(case_id);
CREATE INDEX IF NOT EXISTS idx_tb_plans_patient ON tumour_board_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_tb_plans_updated_at ON tumour_board_plans(updated_at);

-- ── Referrals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tumour_board_referrals (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES tumour_board_cases(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES tumour_board_plans(id) ON DELETE SET NULL,
  specialty TEXT,
  specialty_label TEXT,
  subject TEXT,
  body TEXT,
  requested_items JSONB,
  urgency TEXT CHECK (urgency IN ('routine', 'urgent', 'two_week')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tb_referrals_case ON tumour_board_referrals(case_id);
CREATE INDEX IF NOT EXISTS idx_tb_referrals_patient ON tumour_board_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_tb_referrals_status ON tumour_board_referrals(status);
CREATE INDEX IF NOT EXISTS idx_tb_referrals_updated_at ON tumour_board_referrals(updated_at);

-- ── Surveillance schedule ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tumour_board_surveillance (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES tumour_board_cases(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  category TEXT,
  title TEXT,
  detail TEXT,
  due_month INTEGER,
  due_date TEXT,
  phase TEXT,
  basis TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed')),
  completed_at TIMESTAMPTZ,
  findings TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tb_surveillance_case ON tumour_board_surveillance(case_id);
CREATE INDEX IF NOT EXISTS idx_tb_surveillance_patient ON tumour_board_surveillance(patient_id);
CREATE INDEX IF NOT EXISTS idx_tb_surveillance_due ON tumour_board_surveillance(due_date);
CREATE INDEX IF NOT EXISTS idx_tb_surveillance_status ON tumour_board_surveillance(status);
CREATE INDEX IF NOT EXISTS idx_tb_surveillance_updated_at ON tumour_board_surveillance(updated_at);

-- ── Row Level Security (permissive, matching the app's other clinical tables) ─
ALTER TABLE tumour_board_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumour_board_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumour_board_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumour_board_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumour_board_surveillance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tumour_board_cases_all" ON tumour_board_cases;
CREATE POLICY "tumour_board_cases_all" ON tumour_board_cases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tumour_board_assessments_all" ON tumour_board_assessments;
CREATE POLICY "tumour_board_assessments_all" ON tumour_board_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tumour_board_plans_all" ON tumour_board_plans;
CREATE POLICY "tumour_board_plans_all" ON tumour_board_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tumour_board_referrals_all" ON tumour_board_referrals;
CREATE POLICY "tumour_board_referrals_all" ON tumour_board_referrals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tumour_board_surveillance_all" ON tumour_board_surveillance;
CREATE POLICY "tumour_board_surveillance_all" ON tumour_board_surveillance FOR ALL USING (true) WITH CHECK (true);

-- ── Real-time (guarded: re-adding a table to the publication is an error) ────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tumour_board_cases',
    'tumour_board_assessments',
    'tumour_board_plans',
    'tumour_board_referrals',
    'tumour_board_surveillance'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ── updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_tumour_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tb_cases_updated_at ON tumour_board_cases;
CREATE TRIGGER trg_tb_cases_updated_at
  BEFORE UPDATE ON tumour_board_cases
  FOR EACH ROW EXECUTE FUNCTION update_tumour_board_updated_at();

DROP TRIGGER IF EXISTS trg_tb_assessments_updated_at ON tumour_board_assessments;
CREATE TRIGGER trg_tb_assessments_updated_at
  BEFORE UPDATE ON tumour_board_assessments
  FOR EACH ROW EXECUTE FUNCTION update_tumour_board_updated_at();

DROP TRIGGER IF EXISTS trg_tb_plans_updated_at ON tumour_board_plans;
CREATE TRIGGER trg_tb_plans_updated_at
  BEFORE UPDATE ON tumour_board_plans
  FOR EACH ROW EXECUTE FUNCTION update_tumour_board_updated_at();

DROP TRIGGER IF EXISTS trg_tb_referrals_updated_at ON tumour_board_referrals;
CREATE TRIGGER trg_tb_referrals_updated_at
  BEFORE UPDATE ON tumour_board_referrals
  FOR EACH ROW EXECUTE FUNCTION update_tumour_board_updated_at();

DROP TRIGGER IF EXISTS trg_tb_surveillance_updated_at ON tumour_board_surveillance;
CREATE TRIGGER trg_tb_surveillance_updated_at
  BEFORE UPDATE ON tumour_board_surveillance
  FOR EACH ROW EXECUTE FUNCTION update_tumour_board_updated_at();
