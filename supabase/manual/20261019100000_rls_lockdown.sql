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
--   * backs up, then drops, every policy whose condition is literally `true`
--     ("Allow all access"); a permissive anon/PUBLIC policy with a real
--     condition is kept but moved to authenticated; restrictive policies are
--     left alone (an earlier version dropped every PUBLIC policy, which turned
--     app_secrets' USING (false) into members-may-read);
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
--
-- Hospital scoping (20261020100000_hospital_scoping.sql) narrows this further.
-- While it is on, the end of this file re-applies it in the same transaction,
-- so re-running the lockdown never widens access back to every hospital.
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

-- Whether the lockdown is in force. The backup tables outlive a rollback, so
-- they cannot answer that; this row can. The migrations workflow reads it after
-- every push and re-applies this file while it is on, because replaying the
-- migrations (20260127224153_fix_users_rls.sql among others) recreates
-- "Allow all access" policies and would otherwise silently re-open the data.
CREATE TABLE IF NOT EXISTS app_private.rls_lockdown_state (
  id         BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  in_force   BOOLEAN NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO app_private.rls_lockdown_state (id, in_force, changed_at)
VALUES (TRUE, TRUE, now())
ON CONFLICT (id) DO UPDATE SET in_force = TRUE, changed_at = now();

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
    -- Open policies ("Allow all access": a condition that is literally true)
    -- are dropped. A PERMISSIVE policy for anon/PUBLIC with a real condition
    -- (owner-only, deny-all, ...) keeps its condition but stops applying to
    -- anon: it is moved to authenticated. RESTRICTIVE policies only ever
    -- narrow access and are left exactly as they are. Everything changed is
    -- backed up first, so the rollback restores it as it was.
    FOR p IN
      SELECT * FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = t.name
         AND policyname NOT LIKE 'app\_%'
         AND (btrim(coalesce(qual, '')) = 'true'
              OR btrim(coalesce(with_check, '')) = 'true'
              OR (permissive = 'PERMISSIVE' AND roles && ARRAY['public', 'anon']::name[]))
    LOOP
      INSERT INTO app_private.rls_lockdown_policies (tablename, policyname, permissive, roles, cmd, qual, with_check)
      VALUES (p.tablename, p.policyname, p.permissive, p.roles::text[], p.cmd, p.qual, p.with_check)
      ON CONFLICT DO NOTHING;
      IF btrim(coalesce(p.qual, '')) = 'true' OR btrim(coalesce(p.with_check, '')) = 'true' THEN
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t.name);
      ELSE
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', p.policyname, t.name);
      END IF;
    END LOOP;

    IF NOT t.rls THEN
      INSERT INTO app_private.rls_lockdown_rls_enabled (tablename) VALUES (t.name) ON CONFLICT DO NOTHING;
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.name);
    END IF;

    -- users: own policies below. No client access at all (no members policy;
    -- the service role bypasses RLS): user_hospitals (which hospitals a user
    -- belongs to — written only by /api/admin-users), app_secrets (the VAPID
    -- private key; its original policy was USING (false)), and the push
    -- internals the app never reads (only the send-push edge function does).
    -- Matches 20261020110000_security_hardening.sql, whose RESTRICTIVE
    -- app_server_only policies this file never drops (app_* are skipped).
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

-- ── Hospital scoping, when it is on ─────────────────────────────────────────
-- The members-only policies above are wider than hospital scoping
-- (20261020100000_hospital_scoping.sql). While app_private.access_policy_state
-- says hospital_scoped, put the scoping straight back in this same
-- transaction, so re-applying the lockdown never opens one hospital's data to
-- another — not even between two statements. If the scoping cannot be
-- re-applied (e.g. a new table is not classified yet), this fails and the
-- whole lockdown run is rolled back: loud, never wider.
-- db-sql --with-scoping sets app.hospital_scoping_follows when the full
-- scoping file comes later in the same transaction (with the repository's
-- newest classification); it is re-applied there instead.
DO $$
BEGIN
  IF to_regclass('app_private.access_policy_state') IS NULL
     OR NOT EXISTS (SELECT 1 FROM app_private.access_policy_state WHERE hospital_scoped IS TRUE) THEN
    RETURN;
  END IF;
  IF coalesce(current_setting('app.hospital_scoping_follows', true), '') = 'on' THEN
    RAISE NOTICE 'Hospital scoping is on; it is re-applied later in this transaction.';
    RETURN;
  END IF;
  IF to_regprocedure('app_private.apply_hospital_scoping()') IS NULL THEN
    RAISE EXCEPTION 'Hospital scoping is on but app_private.apply_hospital_scoping() is missing. Apply supabase/manual/20261020100000_hospital_scoping.sql in the same run (node scripts/db-sql.mjs --with-lockdown --with-scoping).';
  END IF;
  PERFORM app_private.apply_hospital_scoping();
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
