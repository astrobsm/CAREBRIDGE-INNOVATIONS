-- =====================================================
-- SUPABASE MIGRATION: Clinician Assistant
--
-- A copy is kept at the repo root as
-- `supabase-clinician-assistant-migration.sql` for manual runs in the SQL
-- Editor. Both are idempotent and safe to re-run.
--
-- NOTE: the repository's `supabase db push` workflow currently fails because
-- the SUPABASE_DB_URL secret is unset, so this is expected to be applied by
-- hand until that is fixed.
--
-- Stores the output of the client-side diagnostic engine: lab/ECG/microbiology
-- interpretation, correlations and next steps for one patient at one moment.
--
-- Design notes:
--  * APPEND-ONLY. An impression is a record of what was thought at a point in
--    time, so it is never rewritten. A clinician who disagrees adds `notes`
--    beside it; the original stands.
--  * `engine_version` is stored with every row. An impression cannot be
--    interpreted later without knowing which ruleset produced it, and the rules
--    change as guidelines do.
--  * No clinical logic lives server-side. The engine is pure and runs in the
--    browser so it works with no network; this table only persists its output.
--
-- Columns are snake_case to match the app's camelCase -> snake_case sync layer.
-- =====================================================

CREATE TABLE IF NOT EXISTS clinician_analyses (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES hospitals(id) ON DELETE SET NULL,
  hospital_number TEXT,
  source TEXT CHECK (source IN ('record', 'scan', 'manual', 'mixed')),
  overall_severity TEXT,
  impression JSONB,
  next_steps JSONB,
  modules JSONB,
  correlations JSONB,
  patient_context JSONB,
  unmapped JSONB,
  engine_version TEXT,
  notes TEXT,
  analysed_at TIMESTAMPTZ,
  analysed_by TEXT,
  -- Denormalised for the recent-analyses list, which spans patients.
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clinician_analyses_patient ON clinician_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinician_analyses_hospital ON clinician_analyses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinician_analyses_analysed_at ON clinician_analyses(analysed_at);
CREATE INDEX IF NOT EXISTS idx_clinician_analyses_updated_at ON clinician_analyses(updated_at);

-- ── Row Level Security (permissive, matching the app's other clinical tables) ─
ALTER TABLE clinician_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinician_analyses_all" ON clinician_analyses;
CREATE POLICY "clinician_analyses_all" ON clinician_analyses
  FOR ALL USING (true) WITH CHECK (true);

-- ── Real-time (guarded: re-adding a table to the publication is an error) ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clinician_analyses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinician_analyses;
  END IF;
END $$;

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_clinician_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinician_analyses_updated_at ON clinician_analyses;
CREATE TRIGGER trg_clinician_analyses_updated_at
  BEFORE UPDATE ON clinician_analyses
  FOR EACH ROW EXECUTE FUNCTION update_clinician_analyses_updated_at();
