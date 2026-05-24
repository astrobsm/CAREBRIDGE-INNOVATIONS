-- ============================================================
-- AstroHEALTH Investigation Request Bundles — SAFE / IDEMPOTENT Migration
-- Run this SQL in Supabase SQL Editor.
--
-- Creates table for dynamic checkbox-driven investigation requests
-- (printable as A4 form or 80mm thermal receipt).
--
-- Safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS investigation_request_bundles (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS hospital_id TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS encounter_id TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS admission_id TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS source_module TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS source_assessment_id TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS requested_by_name TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS clinician_designation TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS clinician_bleep TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS affected_side TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'routine';
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE investigation_request_bundles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_irb_patient        ON investigation_request_bundles(patient_id);
CREATE INDEX IF NOT EXISTS idx_irb_hospital       ON investigation_request_bundles(hospital_id);
CREATE INDEX IF NOT EXISTS idx_irb_encounter      ON investigation_request_bundles(encounter_id);
CREATE INDEX IF NOT EXISTS idx_irb_admission      ON investigation_request_bundles(admission_id);
CREATE INDEX IF NOT EXISTS idx_irb_status         ON investigation_request_bundles(status);
CREATE INDEX IF NOT EXISTS idx_irb_request_date   ON investigation_request_bundles(request_date);
CREATE INDEX IF NOT EXISTS idx_irb_source_module  ON investigation_request_bundles(source_module);

ALTER TABLE investigation_request_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_access" ON investigation_request_bundles;
CREATE POLICY "public_access" ON investigation_request_bundles
  FOR ALL USING (true) WITH CHECK (true);

-- Limb-salvage assessments: add gate override reason
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS gate_override_reason TEXT;

SELECT 'investigation_request_bundles OK — rows: ' || COUNT(*)::text AS result
FROM investigation_request_bundles;
