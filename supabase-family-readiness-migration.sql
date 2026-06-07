-- ============================================================================
-- Family App — homework, daily readiness checklist, compliance rewards
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql and the child-login migration.
-- Idempotent.
--
-- Adds:
--   family.homework            — school assignments (child can add + mark done)
--   family.checklist_items     — parent-defined daily readiness items per child
--   family.checklist_logs      — child's tick-offs per item per day
--   family.compliance_config   — per-child reward/penalty + deadline + active days
--   family.compliance_events   — day_passed / day_failed audit + reward link
--
-- The child app evaluates each day client-side and uses UNIQUE constraints
-- to prevent double-crediting / double-penalising.

-- ---------------------------------------------------------------------------
-- 1) HOMEWORK
-- ---------------------------------------------------------------------------
-- Drop any earlier minimal/partial versions so the schema below always wins.
-- These tables are new for this feature — no data loss.
DROP TABLE IF EXISTS family.compliance_events CASCADE;
DROP TABLE IF EXISTS family.compliance_config CASCADE;
DROP TABLE IF EXISTS family.checklist_logs    CASCADE;
DROP TABLE IF EXISTS family.checklist_items   CASCADE;
DROP TABLE IF EXISTS family.homework          CASCADE;

CREATE TABLE IF NOT EXISTS family.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES family.users(id) ON DELETE SET NULL,
  subject VARCHAR(80),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  completed_at TIMESTAMPTZ,
  source VARCHAR(10) NOT NULL DEFAULT 'child' CHECK (source IN ('child','parent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_hw_child  ON family.homework(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_hw_status ON family.homework(status);
CREATE INDEX IF NOT EXISTS idx_fam_hw_due    ON family.homework(due_date);

-- ---------------------------------------------------------------------------
-- 2) CHECKLIST ITEMS (parent template per child)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_ci_child  ON family.checklist_items(child_id) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 3) CHECKLIST LOGS (one tick = one row, unique per item per day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family.checklist_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
  item_id  UUID NOT NULL REFERENCES family.checklist_items(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_fam_cl_item_day UNIQUE (child_id, item_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_fam_cl_child_date ON family.checklist_logs(child_id, log_date);

-- ---------------------------------------------------------------------------
-- 4) COMPLIANCE CONFIG (per child)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family.compliance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID UNIQUE NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
  deadline_time TIME NOT NULL DEFAULT '21:30',
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 50,
  penalty_amount NUMERIC(10,2) NOT NULL DEFAULT 50,
  active_days TEXT[] NOT NULL DEFAULT ARRAY['sun','mon','tue','wed','thu'],
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- 5) COMPLIANCE EVENTS (one row per child per day per kind; idempotent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family.compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('day_passed','day_failed')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  transaction_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_fam_ce_child_day UNIQUE (child_id, event_date, kind)
);
CREATE INDEX IF NOT EXISTS idx_fam_ce_child_date ON family.compliance_events(child_id, event_date);

-- ---------------------------------------------------------------------------
-- 6) RLS (permissive — mirrors other family.* tables) + grants
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'homework','checklist_items','checklist_logs','compliance_config','compliance_events'
  ] LOOP
    EXECUTE format('ALTER TABLE family.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "public_access" ON family.%I', t);
    EXECUTE format('CREATE POLICY "public_access" ON family.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT ALL ON family.homework           TO anon, authenticated, service_role;
GRANT ALL ON family.checklist_items    TO anon, authenticated, service_role;
GRANT ALL ON family.checklist_logs     TO anon, authenticated, service_role;
GRANT ALL ON family.compliance_config  TO anon, authenticated, service_role;
GRANT ALL ON family.compliance_events  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Realtime: REPLICA IDENTITY FULL + publication membership
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'homework','checklist_items','checklist_logs','compliance_config','compliance_events'
  ] LOOP
    EXECUTE format('ALTER TABLE family.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='family' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE family.%I', t);
    END IF;
  END LOOP;
END $$;

-- Verification
SELECT 'homework' AS tbl, count(*) AS cols
FROM information_schema.columns WHERE table_schema='family' AND table_name='homework'
UNION ALL SELECT 'checklist_items', count(*) FROM information_schema.columns
  WHERE table_schema='family' AND table_name='checklist_items'
UNION ALL SELECT 'checklist_logs', count(*) FROM information_schema.columns
  WHERE table_schema='family' AND table_name='checklist_logs'
UNION ALL SELECT 'compliance_config', count(*) FROM information_schema.columns
  WHERE table_schema='family' AND table_name='compliance_config'
UNION ALL SELECT 'compliance_events', count(*) FROM information_schema.columns
  WHERE table_schema='family' AND table_name='compliance_events';
