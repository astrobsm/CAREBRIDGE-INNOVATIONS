-- =============================================================================
-- ROLLBACK of 20261019100000_rls_lockdown.sql — apply BY HAND if needed.
-- =============================================================================
-- Puts back exactly what the lockdown took away, from the backup it made in
-- app_private:
--   * drops the policies the lockdown created (app_members_all, app_users_*,
--     app_bookings_*);
--   * recreates every policy it dropped, as it was;
--   * disables RLS on the tables where the lockdown enabled it;
--   * gives anon back its (Supabase default: ALL) access to the views it revoked.
-- This re-opens the database to the anon key. Use it to get old clients
-- working again while a problem is fixed, then re-apply the lockdown.
--
-- NOT restored: legacy plaintext passwords the lockdown cleared (nothing
-- reads them any more; sign-in is Supabase Auth). The backup tables are kept,
-- so the lockdown can be re-applied and rolled back again.
-- Re-runnable.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('app_private.rls_lockdown_policies') IS NULL THEN
    RAISE EXCEPTION 'No lockdown backup found (app_private.rls_lockdown_policies): the lockdown was never applied here.';
  END IF;
  -- Hospital scoping sits on top of the lockdown; undo it first, or its
  -- policies would be left mixed with the old open ones.
  IF to_regclass('app_private.access_policy_state') IS NOT NULL
     AND EXISTS (SELECT 1 FROM app_private.access_policy_state WHERE hospital_scoped IS TRUE) THEN
    RAISE EXCEPTION 'Hospital scoping is on. Apply supabase/manual/20261020100000_hospital_scoping_rollback.sql first.';
  END IF;
END $$;

-- ── Drop the lockdown's own policies ────────────────────────────────────────
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname IN (
         'app_members_all',
         'app_users_select', 'app_users_insert', 'app_users_update', 'app_users_delete',
         'app_bookings_public_insert', 'app_bookings_members_all'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- ── Recreate the policies it dropped ────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
  role_list TEXT;
  stmt TEXT;
BEGIN
  FOR b IN SELECT * FROM app_private.rls_lockdown_policies ORDER BY tablename, policyname LOOP
    IF to_regclass(format('public.%I', b.tablename)) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT string_agg(CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ')
      INTO role_list
      FROM unnest(b.roles) AS r;

    stmt := format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      b.policyname, b.tablename, b.permissive, b.cmd, coalesce(role_list, 'PUBLIC')
    );
    IF b.qual IS NOT NULL AND b.cmd <> 'INSERT' THEN
      stmt := stmt || format(' USING (%s)', b.qual);
    END IF;
    IF b.with_check IS NOT NULL AND b.cmd IN ('ALL', 'INSERT', 'UPDATE') THEN
      stmt := stmt || format(' WITH CHECK (%s)', b.with_check);
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', b.policyname, b.tablename);
    EXECUTE stmt;
  END LOOP;
END $$;

-- ── RLS back off where the lockdown turned it on ────────────────────────────
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT tablename FROM app_private.rls_lockdown_rls_enabled LOOP
    IF to_regclass(format('public.%I', t.tablename)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
    END IF;
  END LOOP;
END $$;

-- ── View access for anon ────────────────────────────────────────────────────
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN SELECT viewname FROM app_private.rls_lockdown_view_grants LOOP
    IF to_regclass(format('public.%I', v.viewname)) IS NOT NULL THEN
      EXECUTE format('GRANT ALL ON public.%I TO anon', v.viewname);
    END IF;
  END LOOP;
END $$;

-- Switch the lockdown off, so the migrations workflow stops re-applying it.
CREATE TABLE IF NOT EXISTS app_private.rls_lockdown_state (
  id         BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  in_force   BOOLEAN NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO app_private.rls_lockdown_state (id, in_force, changed_at)
VALUES (TRUE, FALSE, now())
ON CONFLICT (id) DO UPDATE SET in_force = FALSE, changed_at = now();

COMMIT;

NOTIFY pgrst, 'reload schema';
