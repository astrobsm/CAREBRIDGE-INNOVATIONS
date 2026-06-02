-- ============================================================================
-- Family App — add vitals (BP, HR, FBS, Temp) to family.health_records
-- and allow parent-as-subject (Daddy / Mummy)
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql. Idempotent.

-- 1) Make child_id nullable so a row can belong to a parent instead.
ALTER TABLE family.health_records
  ALTER COLUMN child_id DROP NOT NULL;

-- 2) Add subject_parent_id (when set + child_id NULL => row belongs to that parent)
ALTER TABLE family.health_records
  ADD COLUMN IF NOT EXISTS subject_parent_id UUID
    REFERENCES family.users(id) ON DELETE CASCADE;

-- 3) Make illness optional (vitals-only entries shouldn't require an illness name)
ALTER TABLE family.health_records
  ALTER COLUMN illness DROP NOT NULL;

-- 4) Add vitals columns
ALTER TABLE family.health_records
  ADD COLUMN IF NOT EXISTS systolic_bp        INTEGER,
  ADD COLUMN IF NOT EXISTS diastolic_bp       INTEGER,
  ADD COLUMN IF NOT EXISTS heart_rate         INTEGER,
  ADD COLUMN IF NOT EXISTS fasting_blood_sugar NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS temperature_c      NUMERIC(4,1);

-- 5) Integrity: exactly one of child_id / subject_parent_id must be set
ALTER TABLE family.health_records
  DROP CONSTRAINT IF EXISTS health_records_subject_chk;
ALTER TABLE family.health_records
  ADD CONSTRAINT health_records_subject_chk
  CHECK ((child_id IS NOT NULL)::int + (subject_parent_id IS NOT NULL)::int = 1);

CREATE INDEX IF NOT EXISTS idx_fam_hr_subject_parent
  ON family.health_records(subject_parent_id);

-- 6) Realtime: republish (REPLICA IDENTITY FULL already set by realtime migration)
--    No action needed — the table is already in supabase_realtime publication.

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='family' AND table_name='health_records'
ORDER BY ordinal_position;
