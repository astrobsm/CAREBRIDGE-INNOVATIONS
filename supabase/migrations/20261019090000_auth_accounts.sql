-- =============================================================================
-- Supabase Auth accounts for AstroHEALTH users (additive).
-- =============================================================================
-- Sign-in moves to Supabase Auth. Each public.users row is linked to the
-- auth.users account that signs in as it (users.auth_user_id), and the
-- database gets the helpers the RLS lockdown
-- (supabase/manual/20261019100000_rls_lockdown.sql) is written with.
--
-- SAFE WHILE OLD CLIENTS STILL RUN. Nothing here changes what the anon key can
-- read or write today:
--   * no policy is added, dropped or changed;
--   * the users trigger only restricts requests that carry a signed-in user
--     (auth.uid() is set). The anon key (old clients), the service role and
--     the SQL editor have no auth.uid() and are not restricted by it. The anon
--     key loses its access in the separate, hand-applied RLS lockdown.
--   * existing plaintext passwords stay readable, so
--     scripts/migrate-users-to-auth.mjs can let people keep them; the trigger
--     only stops NEW values being stored.
--
-- Re-runnable: every statement is guarded (npm run db:check).
-- See docs/AUTH_ROLLOUT.md for the order of the whole rollout.
-- =============================================================================

-- ── Columns ─────────────────────────────────────────────────────────────────
-- password exists on every deployed schema (legacy, plaintext); declared here
-- so the trigger below compiles on a fresh database too.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.users.auth_user_id IS
  'The Supabase Auth account (auth.users.id) that signs in as this user. Set by /api/admin-users, the account migration script, or claim_app_user().';
COMMENT ON COLUMN public.users.password IS
  'LEGACY. Passwords live in Supabase Auth; a trigger stops new values being stored. Cleared by scripts/migrate-users-to-auth.mjs.';

-- ── Email normalisation (same rules as src/utils/loginIdentity.ts) ──────────
CREATE OR REPLACE FUNCTION public.app_normalise_email(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(btrim(
    replace(
      regexp_replace(coalesce(value, ''), '[​-‍⁠﻿­]', '', 'g'),
      chr(160), ' '
    ),
    E' \t\r\n\f'
  ))
$$;

-- ── Who is calling ──────────────────────────────────────────────────────────
-- SECURITY DEFINER so RLS policies on users can call them without recursing
-- into users' own policies. search_path is pinned and every name is qualified.

CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id::text
    FROM public.users u
   WHERE u.auth_user_id = auth.uid()
     AND u.is_active IS TRUE
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_app_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.auth_user_id = auth.uid()
       AND u.is_active IS TRUE
  )
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.auth_user_id = auth.uid()
       AND u.is_active IS TRUE
       AND u.role IN ('super_admin', 'hospital_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_app_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.auth_user_id = auth.uid()
       AND u.is_active IS TRUE
       AND u.role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.app_user_hospital_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.hospital_id::text
    FROM public.users u
   WHERE u.auth_user_id = auth.uid()
     AND u.is_active IS TRUE
   LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.app_normalise_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_user_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_member() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_super_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_user_hospital_id() TO anon, authenticated, service_role;

-- ── Account fields are an administrator's business ──────────────────────────
-- BEFORE INSERT OR UPDATE on users:
--   1. A password value is never stored: a new row gets NULL, and an update
--      that changes the column sets it to NULL. An update that leaves it
--      unchanged (an old client re-pushing the whole row) keeps the existing
--      value, which the migration script still needs.
--   2. For a signed-in caller who is not an administrator, role, is_active,
--      hospital_id and auth_user_id stay as they were (silently, so a sync
--      push of a stale whole row still saves the person's other changes). A
--      new row they insert — their own registration — must be linked to their
--      own account, is forced inactive (awaiting approval), and may not carry
--      an administrator role.
--   3. A hospital administrator acts within their own hospital and never
--      creates, promotes to or edits the account fields of a super_admin.
--   4. No auth.uid() (anon key, service role, SQL editor): not restricted
--      here — see the header.
--
-- An upsert of an existing row fires the BEFORE INSERT trigger first; that
-- pass leaves the row alone and the BEFORE UPDATE pass decides.

CREATE OR REPLACE FUNCTION public.users_guard_account_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_super BOOLEAN;
  v_hospital TEXT;
  v_claiming BOOLEAN := coalesce(current_setting('app.claiming_account', true), '') = 'on';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.id) THEN
      RETURN NEW;
    END IF;
    NEW.password := NULL;
  ELSIF NEW.password IS DISTINCT FROM OLD.password THEN
    NEW.password := NULL;
  END IF;

  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_app_admin();
  v_is_super := public.is_app_super_admin();
  v_hospital := public.app_user_hospital_id();

  IF TG_OP = 'INSERT' THEN
    IF v_is_super THEN
      RETURN NEW;
    END IF;
    IF v_is_admin THEN
      IF NEW.role = 'super_admin' THEN
        RAISE EXCEPTION 'Only a super administrator can create a super administrator'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.hospital_id::text IS DISTINCT FROM v_hospital THEN
        RAISE EXCEPTION 'Hospital administrators can only add users to their own hospital'
          USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
    -- A self-registration.
    IF NEW.role IN ('super_admin', 'hospital_admin') THEN
      RAISE EXCEPTION 'Administrator roles are assigned by an administrator'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.auth_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'A new account can only be linked to your own sign-in'
        USING ERRCODE = '42501';
    END IF;
    NEW.is_active := false;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF v_is_super THEN
    RETURN NEW;
  END IF;

  -- claim_app_user() linking the caller's own sign-in to their unlinked row.
  IF v_claiming
     AND OLD.auth_user_id IS NULL
     AND NEW.auth_user_id = v_uid
     AND NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
     AND NEW.hospital_id IS NOT DISTINCT FROM OLD.hospital_id THEN
    RETURN NEW;
  END IF;

  IF v_is_admin THEN
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Only a super administrator can relink a sign-in account'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id THEN
      IF OLD.role = 'super_admin' OR NEW.role = 'super_admin' THEN
        RAISE EXCEPTION 'Only a super administrator can manage a super administrator account'
          USING ERRCODE = '42501';
      END IF;
      IF (OLD.hospital_id IS NOT NULL AND OLD.hospital_id::text IS DISTINCT FROM v_hospital)
         OR NEW.hospital_id::text IS DISTINCT FROM v_hospital THEN
        RAISE EXCEPTION 'Hospital administrators can only manage users at their own hospital'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.is_active := OLD.is_active;
  NEW.hospital_id := OLD.hospital_id;
  NEW.auth_user_id := OLD.auth_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_account_fields ON public.users;
CREATE TRIGGER users_guard_account_fields
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_guard_account_fields();

-- ── Linking at first sign-in ────────────────────────────────────────────────
-- A signed-in person whose Supabase account is not linked to a users row yet
-- (an account the migration did not reach, or one created before this) gets
-- the row with their email — the active one, most recently updated among
-- duplicates, as utils/loginIdentity.pickSignInAccount chooses — linked to
-- them. Only a CONFIRMED email may claim a row (see docs/AUTH_ROLLOUT.md:
-- email confirmation must stay on). Returns the linked row, or nothing.

CREATE OR REPLACE FUNCTION public.claim_app_user()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_id TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = v_uid) THEN
    RETURN QUERY SELECT * FROM public.users u WHERE u.auth_user_id = v_uid LIMIT 1;
    RETURN;
  END IF;

  SELECT public.app_normalise_email(a.email) INTO v_email
    FROM auth.users a
   WHERE a.id = v_uid
     AND a.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  SELECT u.id::text INTO v_id
    FROM public.users u
   WHERE u.auth_user_id IS NULL
     AND public.app_normalise_email(u.email) = v_email
   ORDER BY (u.is_active IS TRUE) DESC, u.updated_at DESC NULLS LAST
   LIMIT 1;
  IF v_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM set_config('app.claiming_account', 'on', true);
  UPDATE public.users u SET auth_user_id = v_uid WHERE u.id::text = v_id AND u.auth_user_id IS NULL;
  PERFORM set_config('app.claiming_account', 'off', true);

  RETURN QUERY SELECT * FROM public.users u WHERE u.id::text = v_id AND u.auth_user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_app_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_app_user() TO authenticated;

-- ── Public booking: which slots are taken ───────────────────────────────────
-- The public booking page (/book-appointment, no sign-in) must not read other
-- patients' bookings once the RLS lockdown is applied, but it still needs to
-- know which slots are gone. This answers only that.

CREATE OR REPLACE FUNCTION public.public_booked_slots(p_hospital_code TEXT, p_date TEXT)
RETURNS SETOF TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF to_regclass('public.public_clinic_bookings') IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY EXECUTE
    'SELECT DISTINCT b.time_slot::text FROM public.public_clinic_bookings b
      WHERE b.hospital_code = $1 AND b.appointment_date = $2
        AND coalesce(b.status, '''') <> ''cancelled'''
    USING p_hospital_code, p_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_booked_slots(TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
