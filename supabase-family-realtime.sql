-- ============================================================================
-- Family App — enable Supabase Realtime on every family.* table
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql.
-- Idempotent: safe to re-run.
--
-- After this, any INSERT/UPDATE/DELETE on a family.* table is pushed in real
-- time to every connected client (Family frontend uses this to trigger
-- syncEngine.sync() on remote changes => perfect cross-device sync).
-- ============================================================================

-- Make sure the publication exists (Supabase ships with it, but be defensive).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add every family.* table to the publication with REPLICA IDENTITY FULL so
-- UPDATE/DELETE payloads carry the full row (needed for clients that diff).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'family'
  LOOP
    -- REPLICA IDENTITY FULL
    EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL', r.schemaname, r.tablename);

    -- Add to publication if not already a member
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = r.schemaname
        AND tablename = r.tablename
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I',
                     r.schemaname, r.tablename);
    END IF;
  END LOOP;
END $$;

-- Verification
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'family'
ORDER BY tablename;
