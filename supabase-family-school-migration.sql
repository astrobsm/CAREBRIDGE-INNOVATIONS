-- ============================================================================
-- Family App — school performance + awards (for children)
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql. Idempotent.
--
-- school_performance: one row per term/report card
-- awards: one row per award (school, church, organization, etc.)

-- ---------------------------------------------------------------------------
-- 1) school_performance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family.school_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    school_name VARCHAR(200),
    class_or_grade VARCHAR(50),                 -- e.g. "Primary 3", "JSS 1"
    term VARCHAR(50),                           -- e.g. "Term 1", "Semester 2"
    academic_year VARCHAR(20),                  -- e.g. "2025/2026"
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    average_score NUMERIC(5,2),                 -- 0..100
    position_in_class INTEGER,
    class_size INTEGER,
    attendance_pct NUMERIC(5,2),                -- 0..100
    conduct_grade VARCHAR(20),                  -- e.g. "A", "Excellent"
    teacher_remark TEXT,
    parent_remark TEXT,
    next_term_begins DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_sp_child ON family.school_performance(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_sp_date  ON family.school_performance(report_date);

-- ---------------------------------------------------------------------------
-- 2) awards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family.awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,                -- e.g. "Best in Mathematics"
    category VARCHAR(40),                       -- academic | sports | spiritual | character | leadership | other
    issuer VARCHAR(200),                        -- school name OR organization
    issuer_type VARCHAR(30),                    -- school | church | community | competition | other
    date_awarded DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    certificate_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_aw_child    ON family.awards(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_aw_date     ON family.awards(date_awarded);
CREATE INDEX IF NOT EXISTS idx_fam_aw_category ON family.awards(category);

-- ---------------------------------------------------------------------------
-- 3) RLS + grants (same permissive pattern as other family.* tables)
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['school_performance','awards'] LOOP
    EXECUTE format('ALTER TABLE family.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "public_access" ON family.%I', t);
    EXECUTE format('CREATE POLICY "public_access" ON family.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

GRANT ALL ON family.school_performance TO anon, authenticated, service_role;
GRANT ALL ON family.awards             TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Realtime: REPLICA IDENTITY FULL + add to supabase_realtime publication
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['school_performance','awards'] LOOP
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
SELECT 'school_performance' AS tbl, count(*) AS cols
FROM information_schema.columns WHERE table_schema='family' AND table_name='school_performance'
UNION ALL
SELECT 'awards', count(*)
FROM information_schema.columns WHERE table_schema='family' AND table_name='awards';
