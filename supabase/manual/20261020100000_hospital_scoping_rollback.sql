-- =============================================================================
-- ROLLBACK of 20261020100000_hospital_scoping.sql — apply BY HAND if needed.
-- =============================================================================
-- Returns the database to the members-only RLS lockdown, exactly as
-- supabase/manual/20261019100000_rls_lockdown.sql leaves it: every active
-- signed-in member reads and writes every hospital's data again.
--   * every table the lockdown covers gets back its app_members_all policy,
--     and the scoped policies (app_scoped_all) go;
--   * users: members read every user again (app_users_select);
--   * policies the scoping dropped are recreated as they were;
--   * views get back the options/grants they had;
--   * the "creator joins the hospital" trigger is removed;
--   * app_private.access_policy_state says hospital_scoped = false, so the
--     lockdown stops re-applying the scoping.
-- KEPT: public.user_hospitals and its rows (grants are not lost; the table has
-- no member write access either way), the helper functions (unused), the
-- indexes (harmless) and the classification. Re-applying the scoping file
-- turns it all back on.
-- Re-runnable. One transaction.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('app_private.access_policy_state') IS NULL THEN
    RAISE EXCEPTION 'Hospital scoping was never applied here (no app_private.access_policy_state).';
  END IF;
  IF to_regprocedure('public.is_app_member()') IS NULL THEN
    RAISE EXCEPTION 'public.is_app_member() is missing: this database is not in the lockdown state the rollback returns to.';
  END IF;
  IF to_regclass('app_private.rls_lockdown_state') IS NULL
     OR NOT EXISTS (SELECT 1 FROM app_private.rls_lockdown_state WHERE in_force IS TRUE) THEN
    RAISE EXCEPTION 'The RLS lockdown is not in force here; there is no members-only state to return to.';
  END IF;
END $$;

-- ── Members-only policies back, exactly as the lockdown makes them ──────────
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND c.relname NOT LIKE 'family\_%'
       AND c.relname <> 'public_clinic_bookings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', t.name);
    IF t.name IN ('user_hospitals', 'app_secrets', 'push_notification_log', 'push_notification_queue', 'notification_logs') THEN
      EXECUTE format('DROP POLICY IF EXISTS app_members_all ON public.%I', t.name);
    ELSIF t.name <> 'users' THEN
      EXECUTE format('DROP POLICY IF EXISTS app_members_all ON public.%I', t.name);
      EXECUTE format(
        'CREATE POLICY app_members_all ON public.%I FOR ALL TO authenticated '
        'USING (public.is_app_member()) WITH CHECK (public.is_app_member())',
        t.name
      );
    END IF;
  END LOOP;
END $$;

-- users: the lockdown's read policy.
DROP POLICY IF EXISTS app_users_select ON public.users;
CREATE POLICY app_users_select ON public.users
  FOR SELECT TO authenticated
  USING (public.is_app_member() OR auth_user_id = auth.uid());

-- ── Policies the scoping dropped ────────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
  role_list TEXT;
  stmt TEXT;
BEGIN
  IF to_regclass('app_private.hospital_scoping_policies') IS NULL THEN
    RETURN;
  END IF;
  FOR b IN SELECT * FROM app_private.hospital_scoping_policies ORDER BY tablename, policyname LOOP
    IF to_regclass(format('public.%I', b.tablename)) IS NULL THEN
      DELETE FROM app_private.hospital_scoping_policies WHERE tablename = b.tablename AND policyname = b.policyname;
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
    -- Restored: forget it, so a later rollback cannot resurrect a policy that
    -- was removed on purpose in between.
    DELETE FROM app_private.hospital_scoping_policies WHERE tablename = b.tablename AND policyname = b.policyname;
  END LOOP;
END $$;

-- ── Views as they were ──────────────────────────────────────────────────────
DO $$
DECLARE
  v RECORD;
BEGIN
  IF to_regclass('app_private.hospital_scoping_views') IS NULL THEN
    RETURN;
  END IF;
  FOR v IN SELECT * FROM app_private.hospital_scoping_views LOOP
    -- The security hardening (20261020110000_security_hardening.sql) secures
    -- views too. If it has this view, leave it secured: its own rollback
    -- decides, not this one.
    IF to_regclass('app_private.security_hardening_backup') IS NOT NULL
       AND EXISTS (SELECT 1 FROM app_private.security_hardening_backup h
                    WHERE h.kind = 'view' AND h.name = v.viewname) THEN
      DELETE FROM app_private.hospital_scoping_views WHERE viewname = v.viewname;
      CONTINUE;
    END IF;
    IF to_regclass(format('public.%I', v.viewname)) IS NOT NULL THEN
      IF v.change = 'security_invoker' THEN
        IF coalesce('security_invoker=true' = ANY (v.reloptions), FALSE) THEN
          NULL; -- it was already on before the scoping
        ELSIF coalesce('security_invoker=false' = ANY (v.reloptions), FALSE) THEN
          EXECUTE format('ALTER VIEW public.%I SET (security_invoker = false)', v.viewname);
        ELSE
          EXECUTE format('ALTER VIEW public.%I RESET (security_invoker)', v.viewname);
        END IF;
      ELSE
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v.viewname);
      END IF;
    END IF;
    DELETE FROM app_private.hospital_scoping_views WHERE viewname = v.viewname;
  END LOOP;
END $$;

-- ── The creator-joins trigger ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS hospitals_grant_creator ON public.hospitals;

-- ── user_hospitals stays readable by its member and administrators only ────
DO $$
BEGIN
  IF to_regclass('public.user_hospitals') IS NOT NULL THEN
    ALTER TABLE public.user_hospitals ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_hospitals FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ── Off ─────────────────────────────────────────────────────────────────────
INSERT INTO app_private.access_policy_state (id, hospital_scoped, changed_at)
VALUES (TRUE, FALSE, now())
ON CONFLICT (id) DO UPDATE SET hospital_scoped = FALSE, changed_at = now();

COMMIT;

NOTIFY pgrst, 'reload schema';
