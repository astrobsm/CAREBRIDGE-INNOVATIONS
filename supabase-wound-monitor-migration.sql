-- =====================================================
-- SUPABASE MIGRATION: WoundProgress Monitor
--
-- NOTE: This is auto-applied by the Supabase CLI as
--   supabase/migrations/20260724120000_wound_monitor.sql
-- (`supabase db push` / deploy). This root copy is kept only for manual runs
-- in the Supabase SQL Editor. Both are idempotent and safe to re-run.
--
-- Adds a FIRST-CLASS longitudinal wound identity (`monitored_wounds`) and its
-- serial assessment timeline (`wound_assessments`) for the WoundProgress
-- Monitor. These are separate from the per-visit `wounds` table: a monitored
-- wound is a single physical wound followed over time, and each assessment is
-- one measurement on it (on-device AI CV + tissue composition + optional
-- clinician confirmation).
--
-- Columns are snake_case to match the app's camelCase→snake_case sync layer.
-- =====================================================

-- ── Monitored wounds (the wound identity) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitored_wounds (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES hospitals(id) ON DELETE SET NULL,
  hospital_number TEXT,
  label TEXT,
  wound_type TEXT,
  anatomical_location TEXT,
  body_side TEXT,
  etiology TEXT,
  stage TEXT,
  date_first_seen TEXT,
  date_of_injury TEXT,
  cause TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'healed', 'archived')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_monitored_wounds_patient ON monitored_wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_monitored_wounds_hospital ON monitored_wounds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_monitored_wounds_status ON monitored_wounds(status);
CREATE INDEX IF NOT EXISTS idx_monitored_wounds_updated_at ON monitored_wounds(updated_at);

-- ── Wound assessments (serial timeline) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS wound_assessments (
  id TEXT PRIMARY KEY,
  wound_id TEXT REFERENCES monitored_wounds(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ,
  length_cm NUMERIC,
  width_cm NUMERIC,
  depth_cm NUMERIC,
  area_cm2 NUMERIC,
  perimeter_cm NUMERIC,
  granulation_pct NUMERIC,
  slough_pct NUMERIC,
  necrotic_pct NUMERIC,
  epithelial_pct NUMERIC,
  healing_stage TEXT,
  clinical_description TEXT,
  ai_confidence NUMERIC,
  calibration_type TEXT,
  scale_reliable BOOLEAN,
  contour_cm JSONB,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wound_assessments_wound ON wound_assessments(wound_id);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_patient ON wound_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_assessed_at ON wound_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_updated_at ON wound_assessments(updated_at);

-- ── Row Level Security (permissive, matching the app's other clinical tables) ─
ALTER TABLE monitored_wounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE wound_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitored_wounds_all" ON monitored_wounds;
CREATE POLICY "monitored_wounds_all" ON monitored_wounds
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wound_assessments_all" ON wound_assessments;
CREATE POLICY "wound_assessments_all" ON wound_assessments
  FOR ALL USING (true) WITH CHECK (true);

-- ── Real-time ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE monitored_wounds;
ALTER PUBLICATION supabase_realtime ADD TABLE wound_assessments;

-- ── updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_wound_monitor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monitored_wounds_updated_at ON monitored_wounds;
CREATE TRIGGER trg_monitored_wounds_updated_at
  BEFORE UPDATE ON monitored_wounds
  FOR EACH ROW
  EXECUTE FUNCTION update_wound_monitor_updated_at();

DROP TRIGGER IF EXISTS trg_wound_assessments_updated_at ON wound_assessments;
CREATE TRIGGER trg_wound_assessments_updated_at
  BEFORE UPDATE ON wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_wound_monitor_updated_at();
