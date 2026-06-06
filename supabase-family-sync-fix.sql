-- ============================================================================
-- Family App — fix cross-device sync
-- ============================================================================
-- Run AFTER all previous family migrations. Safe to run multiple times.
--
-- Background: AstroHEALTH users are stored locally in Dexie with a fresh
-- UUID per device. If you log in on a second device for the same person, you
-- get a different `user.id`, which previously made the Family domain create
-- (or fail to create) a *separate* family.users row keyed by that id.
--
-- The app code now keys on EMAIL (stable across devices). This script:
--   1. Merges any duplicate family.users rows that share a (case-insensitive)
--      email by re-parenting their children, tasks, events, prayer_schedules,
--      and notifications to the OLDEST surviving row, then deleting the dups.
--   2. Re-runs the realtime publication step so new tables added later
--      (school_performance, awards, etc.) are included.

-- ---------------------------------------------------------------------------
-- 1) Merge duplicates by email (keep the OLDEST row)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  keeper UUID;
BEGIN
  FOR r IN
    SELECT lower(email) AS email_lc, count(*) AS n
    FROM family.users
    GROUP BY lower(email)
    HAVING count(*) > 1
  LOOP
    SELECT id INTO keeper
    FROM family.users
    WHERE lower(email) = r.email_lc
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    RAISE NOTICE 'Merging % duplicates of % into %', r.n, r.email_lc, keeper;

    UPDATE family.children           SET parent_id   = keeper WHERE parent_id   IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.tasks              SET parent_id   = keeper WHERE parent_id   IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.family_events      SET parent_id   = keeper WHERE parent_id   IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.prayer_schedules   SET parent_id   = keeper WHERE parent_id   IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.notifications      SET user_id     = keeper WHERE user_id     IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.task_assignments   SET assigned_by = keeper WHERE assigned_by IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.growth_records     SET recorded_by = keeper WHERE recorded_by IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    UPDATE family.health_records     SET recorded_by = keeper WHERE recorded_by IN (SELECT id FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper);
    -- school_performance + awards exist only after supabase-family-school-migration.sql
    BEGIN
      EXECUTE 'UPDATE family.school_performance SET recorded_by = $1 WHERE recorded_by IN (SELECT id FROM family.users WHERE lower(email)=$2 AND id<>$1)'
        USING keeper, r.email_lc;
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      EXECUTE 'UPDATE family.awards SET recorded_by = $1 WHERE recorded_by IN (SELECT id FROM family.users WHERE lower(email)=$2 AND id<>$1)'
        USING keeper, r.email_lc;
    EXCEPTION WHEN undefined_table THEN NULL; END;

    DELETE FROM family.users WHERE lower(email)=r.email_lc AND id<>keeper;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Normalise email to lowercase so future equality lookups are stable
-- ---------------------------------------------------------------------------
UPDATE family.users SET email = lower(email) WHERE email <> lower(email);

-- ---------------------------------------------------------------------------
-- 3) Re-publish every family.* table for Realtime (idempotent)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'family' LOOP
    EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL', r.schemaname, r.tablename);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname=r.schemaname AND tablename=r.tablename
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', r.schemaname, r.tablename);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT 'family.users count' AS metric, count(*)::text AS value FROM family.users
UNION ALL
SELECT 'duplicate emails', count(*)::text
  FROM (SELECT lower(email), count(*) c FROM family.users GROUP BY lower(email) HAVING count(*)>1) d
UNION ALL
SELECT 'realtime-published family.* tables', count(*)::text
  FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='family';
