-- ============================================================================
-- Family App — Routines (bedtime / morning / school-readiness / church /
--                        weekend chores / homework), real-time tracked with
--                        auto-rewards and penalties for missed deadlines.
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql. Idempotent.
--
-- Model:
--   routines           : parent-defined recurring routine (days_of_week + deadline)
--   routine_items      : checklist items within a routine
--   routine_logs       : one row per (routine, child, day) — created on demand
--                        when the child opens their Routines tab. Holds status
--                        + reward/penalty bookkeeping.
--   routine_item_logs  : per-item check-off log
--   homework           : kid-entered schoolwork list

CREATE TABLE IF NOT EXISTS family.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES family.children(id) ON DELETE CASCADE,  -- NULL = all children
    name VARCHAR(120) NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'general',
        -- bedtime | morning | school_readiness | church_readiness
        -- | weekend_chores | homework | general
    description TEXT,
    days_of_week INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],  -- 0=Sun..6=Sat
    deadline_time TIME,                       -- local time, e.g. 21:30
    reward_amount NUMERIC(10,2) DEFAULT 0,    -- credited on on-time completion
    penalty_amount NUMERIC(10,2) DEFAULT 0,   -- debited on miss
    partial_reward_pct INT DEFAULT 50 CHECK (partial_reward_pct BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INT DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_routines_parent ON family.routines(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_routines_child  ON family.routines(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_routines_active ON family.routines(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS family.routine_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES family.routines(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_routine_items_routine ON family.routine_items(routine_id);

CREATE TABLE IF NOT EXISTS family.routine_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES family.routines(id) ON DELETE CASCADE,
    child_id   UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    log_date   DATE NOT NULL,
    deadline_at TIMESTAMPTZ,                  -- log_date + routine.deadline_time
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- pending | in_progress | completed_on_time | completed_late | missed
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    score_pct INT,
    reward_paid NUMERIC(10,2) DEFAULT 0,
    penalty_paid NUMERIC(10,2) DEFAULT 0,
    settled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (routine_id, child_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_fam_routine_logs_child_date ON family.routine_logs(child_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_fam_routine_logs_unsettled  ON family.routine_logs(settled) WHERE settled = FALSE;

CREATE TABLE IF NOT EXISTS family.routine_item_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id  UUID NOT NULL REFERENCES family.routine_logs(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES family.routine_items(id) ON DELETE CASCADE,
    done BOOLEAN DEFAULT FALSE,
    done_at TIMESTAMPTZ,
    UNIQUE (log_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_fam_routine_item_logs_log ON family.routine_item_logs(log_id);

CREATE TABLE IF NOT EXISTS family.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    subject VARCHAR(80),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',     -- pending | in_progress | completed
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_homework_child ON family.homework(child_id, status);

-- ---------------------------------------------------------------------------
-- RLS + grants — same permissive pattern as other family.* tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['routines','routine_items','routine_logs','routine_item_logs','homework'] LOOP
    EXECUTE format('ALTER TABLE family.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "public_access" ON family.%I', t);
    EXECUTE format('CREATE POLICY "public_access" ON family.%I FOR ALL USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT ALL ON family.%I TO anon, authenticated, service_role', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Realtime: REPLICA IDENTITY FULL + supabase_realtime publication
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['routines','routine_items','routine_logs','routine_item_logs','homework'] LOOP
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
SELECT table_name, count(*) AS columns
FROM information_schema.columns
WHERE table_schema='family'
  AND table_name IN ('routines','routine_items','routine_logs','routine_item_logs','homework')
GROUP BY table_name
ORDER BY table_name;
