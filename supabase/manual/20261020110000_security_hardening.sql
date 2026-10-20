-- =============================================================================
-- SECURITY HARDENING (October 2026 audit) — apply BY HAND, after the RLS lockdown.
-- =============================================================================
-- Closes what supabase/manual/20261019100000_rls_lockdown.sql does not cover.
-- See docs/SECURITY_AUDIT_2026-10.md for each finding. Undo:
-- 20261020110000_security_hardening_rollback.sql.
--
--   1. app_secrets (the VAPID private key for push): the lockdown replaced its
--      "USING (false)" policy with members-may-read-and-write, so every staff
--      account can read the push signing key. Back to server-only.
--   2. Push internals (push_notification_log / _queue, notification_logs) are
--      not used by the app; only the edge function (service role) needs them.
--   3. Functions: the push-subscription lookups are SECURITY DEFINER and
--      executable by anyone (PUBLIC), so the anon key returned every device's
--      push endpoint and keys. Service role only. The hospital-number helpers
--      were GRANTed to anon; the app calls them signed in only.
--   4. Views run with their owner's rights (bypassing RLS). The lockdown took
--      them from anon, but any signed-in account — including a self-registered
--      one still awaiting approval — could read them. They now run with the
--      caller's rights (security_invoker, Postgres 15+), or lose client access.
--   5. Storage: the app does not use Supabase Storage. Any bucket is made
--      private and policies open to anon/PUBLIC on storage.objects are dropped.
--
-- Does NOT touch: the family schema, public_clinic_bookings, the users
-- policies or the auth helpers (is_app_member() & co.), or any policy named
-- app_* that the lockdown created.
--
-- Re-runnable, one transaction, every object guarded (to_regclass /
-- pg_proc lookups), and everything it changes is recorded first in
-- app_private.security_hardening_backup for the rollback (first copy kept).
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_app_member()') IS NULL THEN
    RAISE EXCEPTION 'Apply supabase/migrations/20261019090000_auth_accounts.sql (and the RLS lockdown) first.';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.security_hardening_backup (
  kind     TEXT NOT NULL,   -- table_acl | function | view | bucket | storage_policy
  name     TEXT NOT NULL,
  detail   JSONB NOT NULL DEFAULT '{}'::jsonb,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, name)
);

-- ── 1 + 2. Server-only tables ───────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_secrets', 'push_notification_log', 'push_notification_queue', 'notification_logs']
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO app_private.security_hardening_backup (kind, name, detail)
    SELECT 'table_acl', t, jsonb_build_object(
             'acl', c.relacl::text,
             'rls', c.relrowsecurity)
      FROM pg_class c
     WHERE c.oid = to_regclass(format('public.%I', t))
    ON CONFLICT DO NOTHING;

    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- RESTRICTIVE: even if a grant or a permissive policy comes back (a
    -- replayed migration, the lockdown's members policy), clients get nothing.
    -- Named app_* so the lockdown's re-apply leaves it alone. The service role
    -- bypasses RLS.
    EXECUTE format('DROP POLICY IF EXISTS app_server_only ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY app_server_only ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated '
      'USING (false) WITH CHECK (false)', t);
  END LOOP;
END $$;

-- ── 3. Functions ────────────────────────────────────────────────────────────
DO $$
DECLARE
  f RECORD;
  members_only CONSTANT TEXT[] := ARRAY[
    'patient_hospital_number_duplicates',
    'find_patients_by_hospital_number',
    'ensure_patient_hospital_number_unique'];
  server_only CONSTANT TEXT[] := ARRAY[
    'get_user_subscriptions', 'get_hospital_subscriptions', 'get_subscriptions_by_role',
    'get_user_push_subscriptions', 'get_hospital_push_subscriptions', 'get_role_push_subscriptions',
    'cleanup_old_signaling_messages'];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig, p.proname, p.prosecdef, p.proacl, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY (members_only || server_only)
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    INSERT INTO app_private.security_hardening_backup (kind, name, detail)
    VALUES ('function', f.sig, jsonb_build_object(
              'acl', f.proacl::text,          -- NULL = the default (PUBLIC may execute)
              'config', to_jsonb(f.proconfig)))
    ON CONFLICT DO NOTHING;

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    IF f.proname = ANY (members_only) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END IF;

    -- A SECURITY DEFINER function without a pinned search_path can be steered
    -- to another schema's objects.
    IF f.prosecdef AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(f.proconfig, ARRAY[]::text[])) c WHERE c LIKE 'search_path=%') THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
    END IF;
  END LOOP;
END $$;

-- Report (does not change) any other SECURITY DEFINER function anon can run.
DO $$
DECLARE
  f RECORD;
  expected CONSTANT TEXT[] := ARRAY[
    'app_normalise_email', 'app_user_id', 'is_app_member', 'is_app_admin', 'is_app_super_admin',
    'app_user_hospital_id', 'public_booked_slots', 'users_guard_account_fields'];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.prorettype <> 'trigger'::regtype
       AND NOT (p.proname = ANY (expected))
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    RAISE WARNING 'Review: SECURITY DEFINER function % is executable by anon (not changed by this script).', f.sig;
  END LOOP;
END $$;

-- ── 4. Views ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v RECORD;
  pg15 CONSTANT BOOLEAN := current_setting('server_version_num')::int >= 150000;
BEGIN
  FOR v IN
    SELECT c.oid, c.relname, c.relkind, c.reloptions, c.relacl
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('v', 'm')
       AND c.relname NOT LIKE 'family\_%'
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    BEGIN
      INSERT INTO app_private.security_hardening_backup (kind, name, detail)
      VALUES ('view', v.relname, jsonb_build_object(
                'relkind', v.relkind,
                'reloptions', to_jsonb(v.reloptions),
                'acl', v.relacl::text))
      ON CONFLICT DO NOTHING;

      EXECUTE format('REVOKE ALL ON public.%I FROM anon', v.relname);
      IF v.relkind = 'v' AND pg15 THEN
        -- RLS on the underlying tables now applies to whoever reads the view.
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname);
      ELSE
        -- Materialized view, or Postgres < 15: no invoker rights. The app
        -- reads none of these views, so clients lose them.
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, authenticated', v.relname);
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE WARNING 'Could not secure view public.% (not its owner) — check it by hand.', v.relname;
    END;
  END LOOP;
END $$;

-- ── 5. Storage ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
  p RECORD;
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Supabase Storage schema not present; skipped.';
    RETURN;
  END IF;

  FOR b IN EXECUTE 'SELECT id::text AS id FROM storage.buckets WHERE public IS TRUE'
  LOOP
    INSERT INTO app_private.security_hardening_backup (kind, name, detail)
    VALUES ('bucket', b.id, jsonb_build_object('public', true))
    ON CONFLICT DO NOTHING;
    EXECUTE 'UPDATE storage.buckets SET public = false WHERE id::text = $1' USING b.id;
    RAISE NOTICE 'Storage bucket % is now private.', b.id;
  END LOOP;

  FOR p IN
    SELECT * FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname NOT LIKE 'app\_%'
       AND (roles && ARRAY['public', 'anon']::name[]
            OR btrim(coalesce(qual, '')) = 'true'
            OR btrim(coalesce(with_check, '')) = 'true')
  LOOP
    BEGIN
      INSERT INTO app_private.security_hardening_backup (kind, name, detail)
      VALUES ('storage_policy', p.policyname, jsonb_build_object(
                'permissive', p.permissive, 'roles', to_jsonb(p.roles::text[]), 'cmd', p.cmd,
                'qual', p.qual, 'with_check', p.with_check))
      ON CONFLICT DO NOTHING;
      EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
      RAISE NOTICE 'Dropped open storage policy %.', p.policyname;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE WARNING 'Could not drop storage policy % (not the owner of storage.objects) — delete it in Storage -> Policies.', p.policyname;
    END;
  END LOOP;

  -- Members only, should the app ever store files.
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS app_storage_members_all ON storage.objects';
    EXECUTE 'CREATE POLICY app_storage_members_all ON storage.objects FOR ALL TO authenticated '
            'USING (public.is_app_member()) WITH CHECK (public.is_app_member())';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Could not create the members-only storage policy (not the owner of storage.objects).';
  END;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- What is left open to the anon key (the public booking page and the family
-- app are expected here; anything else needs a look):
SELECT 'table' AS kind, c.relname AS name
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
   AND (has_table_privilege('anon', c.oid, 'SELECT') OR has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE') OR has_table_privilege('anon', c.oid, 'DELETE'))
   AND EXISTS (SELECT 1 FROM pg_policies pp
                WHERE pp.schemaname = 'public' AND pp.tablename = c.relname
                  AND pp.roles && ARRAY['public', 'anon']::name[] AND pp.permissive = 'PERMISSIVE')
UNION ALL
SELECT 'definer function', p.oid::regprocedure::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
   AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY 1, 2;
