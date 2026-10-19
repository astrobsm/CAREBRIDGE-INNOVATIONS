-- =============================================================================
-- RLS LOCKDOWN — apply BY HAND, LAST, after the whole auth rollout.
-- =============================================================================
-- NOT in supabase/migrations on purpose: that folder is applied to production
-- automatically on every push to main, and this file locks out every client
-- that does not sign in with Supabase Auth. Apply it from the Supabase SQL
-- editor only once docs/AUTH_ROLLOUT.md says so (accounts migrated, new
-- client deployed, sign-ins verified). Undo: 20261019100000_rls_lockdown_rollback.sql.
--
-- What it does, for every table in the public schema EXCEPT family_* tables
-- and the public booking table:
--   * backs up, then drops, every policy that grants to anon or PUBLIC or
--     whose condition is literally `true` ("Allow all access");
--   * enables RLS where it was off;
--   * creates one policy: signed-in, active AstroHEALTH users
--     (public.is_app_member()) may read and write.
-- users gets its own policies (members read; you update your own row, with
-- the account fields guarded by the trigger; administrators write; a new
-- sign-up may insert its own inactive row). public_clinic_bookings: anyone may
-- INSERT a confirmed booking, members read and manage. Public views stop being
-- readable by anon (a view runs with its owner's rights and would bypass RLS).
--
-- The family app lives in the separate `family` schema and is not touched.
--
-- Re-runnable: policies are dropped before being created, and the backup keeps
-- the FIRST copy of every policy it saw.
-- =============================================================================

BEGIN;

-- ── Preconditions ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('public.is_app_member()') IS NULL THEN
    RAISE EXCEPTION 'Apply supabase/migrations/20261019090000_auth_accounts.sql first.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
     WHERE role = 'super_admin' AND is_active IS TRUE AND auth_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'No active super_admin is linked to a Supabase Auth account. Run scripts/migrate-users-to-auth.mjs --apply and sign in as a super admin first, or nobody could administer accounts afterwards.';
  END IF;
END $$;

-- ── Backup (not exposed through the API) ────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.rls_lockdown_policies (
  tablename   TEXT NOT NULL,
  policyname  TEXT NOT NULL,
  permissive  TEXT NOT NULL,
  roles       TEXT[] NOT NULL,
  cmd         TEXT NOT NULL,
  qual        TEXT,
  with_check  TEXT,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tablename, policyname)
);
CREATE TABLE IF NOT EXISTS app_private.rls_lockdown_rls_enabled (
  tablename TEXT PRIMARY KEY,
  saved_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.rls_lockdown_view_grants (
  viewname TEXT PRIMARY KEY,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Every table: drop open policies, enable RLS, members only ───────────────
DO $$
DECLARE
  t RECORD;
  p RECORD;
BEGIN
  FOR t IN
    SELECT c.relname AS name, c.relrowsecurity AS rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND c.relname NOT LIKE 'family\_%'
       AND c.relname <> 'public_clinic_bookings'
  LOOP
    FOR p IN
      SELECT * FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = t.name
         AND policyname NOT LIKE 'app\_%'
         AND (roles && ARRAY['public', 'anon']::name[]
              OR btrim(coalesce(qual, '')) = 'true'
              OR btrim(coalesce(with_check, '')) = 'true')
    LOOP
      INSERT INTO app_private.rls_lockdown_policies (tablename, policyname, permissive, roles, cmd, qual, with_check)
      VALUES (p.tablename, p.policyname, p.permissive, p.roles::text[], p.cmd, p.qual, p.with_check)
      ON CONFLICT DO NOTHING;
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t.name);
    END LOOP;

    IF NOT t.rls THEN
      INSERT INTO app_private.rls_lockdown_rls_enabled (tablename) VALUES (t.name) ON CONFLICT DO NOTHING;
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.name);
    END IF;

    IF t.name <> 'users' THEN
      EXECUTE format('DROP POLICY IF EXISTS app_members_all ON public.%I', t.name);
      EXECUTE format(
        'CREATE POLICY app_members_all ON public.%I FOR ALL TO authenticated '
        'USING (public.is_app_member()) WITH CHECK (public.is_app_member())',
        t.name
      );
    END IF;
  END LOOP;
END $$;

-- ── users ───────────────────────────────────────────────────────────────────
-- Read: every member (staff pickers, chat, assignments) and you, your own row
-- (a sign-up awaiting approval sees its own status).
DROP POLICY IF EXISTS app_users_select ON public.users;
CREATE POLICY app_users_select ON public.users
  FOR SELECT TO authenticated
  USING (public.is_app_member() OR auth_user_id = auth.uid());

-- Insert: administrators; an upsert of your own existing row (sync); or a new
-- sign-up's own row, inactive and without an administrator role (the trigger
-- also forces is_active = false).
DROP POLICY IF EXISTS app_users_insert ON public.users;
CREATE POLICY app_users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_app_admin()
    OR id::text = public.app_user_id()
    OR (auth_user_id = auth.uid()
        AND is_active IS NOT TRUE
        AND role NOT IN ('super_admin', 'hospital_admin'))
  );

-- Update: administrators, or your own row. Role, active flag, hospital and
-- linked account are kept as they were for non-administrators by the trigger.
DROP POLICY IF EXISTS app_users_update ON public.users;
CREATE POLICY app_users_update ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_app_admin() OR id::text = public.app_user_id())
  WITH CHECK (public.is_app_admin() OR id::text = public.app_user_id());

DROP POLICY IF EXISTS app_users_delete ON public.users;
CREATE POLICY app_users_delete ON public.users
  FOR DELETE TO authenticated
  USING (public.is_app_admin());

-- ── Public clinic booking ───────────────────────────────────────────────────
DO $$
DECLARE
  p RECORD;
BEGIN
  IF to_regclass('public.public_clinic_bookings') IS NULL THEN
    RETURN;
  END IF;

  FOR p IN
    SELECT * FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'public_clinic_bookings'
       AND policyname NOT LIKE 'app\_%'
       AND (roles && ARRAY['public', 'anon']::name[]
            OR btrim(coalesce(qual, '')) = 'true'
            OR btrim(coalesce(with_check, '')) = 'true')
  LOOP
    INSERT INTO app_private.rls_lockdown_policies (tablename, policyname, permissive, roles, cmd, qual, with_check)
    VALUES (p.tablename, p.policyname, p.permissive, p.roles::text[], p.cmd, p.qual, p.with_check)
    ON CONFLICT DO NOTHING;
    EXECUTE format('DROP POLICY %I ON public.public_clinic_bookings', p.policyname);
  END LOOP;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.public_clinic_bookings'::regclass) THEN
    INSERT INTO app_private.rls_lockdown_rls_enabled (tablename) VALUES ('public_clinic_bookings') ON CONFLICT DO NOTHING;
    ALTER TABLE public.public_clinic_bookings ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Anyone (the public booking page) may add a confirmed booking with the
  -- terms accepted. Nothing else: no reading other patients' bookings.
  -- Taken slots come from public.public_booked_slots().
  DROP POLICY IF EXISTS app_bookings_public_insert ON public.public_clinic_bookings;
  CREATE POLICY app_bookings_public_insert ON public.public_clinic_bookings
    FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'confirmed' AND terms_accepted IS TRUE);

  DROP POLICY IF EXISTS app_bookings_members_all ON public.public_clinic_bookings;
  CREATE POLICY app_bookings_members_all ON public.public_clinic_bookings
    FOR ALL TO authenticated
    USING (public.is_app_member())
    WITH CHECK (public.is_app_member());
END $$;

-- ── Views ───────────────────────────────────────────────────────────────────
-- A view runs with its owner's rights, so RLS on the tables below it does not
-- apply to anon. Take anon's access away (recorded for the rollback).
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('v', 'm')
       AND c.relname NOT LIKE 'family\_%'
       AND has_table_privilege('anon', c.oid, 'SELECT')
  LOOP
    INSERT INTO app_private.rls_lockdown_view_grants (viewname) VALUES (v.name) ON CONFLICT DO NOTHING;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v.name);
  END LOOP;
END $$;

-- ── Legacy plaintext passwords ──────────────────────────────────────────────
-- By now every account has been moved to Supabase Auth by
-- scripts/migrate-users-to-auth.mjs, which clears this column as it goes. Any
-- value left (a duplicate row it reported, or a row an old client wrote since)
-- is a plaintext secret readable by every member. Not restored by the rollback.
UPDATE public.users SET password = NULL WHERE password IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
