-- =============================================================================
-- ROLLBACK of 20261020110000_security_hardening.sql — apply BY HAND.
-- =============================================================================
-- Restores, from app_private.security_hardening_backup, exactly what the
-- hardening changed: table and function privileges, function search_path,
-- view options and privileges, public buckets and dropped storage policies.
-- Each restored backup row is deleted, so the hardening can be applied again.
--
-- WARNING: this re-opens the push signing key (app_secrets) to every staff
-- account and the push-subscription lookups to the anon key. Rotate the VAPID
-- keys afterwards if they were exposed again.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('app_private.security_hardening_backup') IS NULL THEN
    RAISE EXCEPTION 'Nothing to roll back: app_private.security_hardening_backup does not exist.';
  END IF;
END $$;

-- Re-grant every privilege recorded in an ACL (aclitem[] as text). NULL means
-- the object had default privileges.
CREATE OR REPLACE FUNCTION app_private.security_hardening_regrant(p_object TEXT, p_acl TEXT, p_is_function BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  g RECORD;
  target TEXT := CASE WHEN p_is_function THEN 'FUNCTION ' || p_object ELSE p_object END;
BEGIN
  IF p_acl IS NULL THEN
    IF p_is_function THEN
      EXECUTE format('GRANT EXECUTE ON %s TO PUBLIC', target);
    END IF;
    RETURN;
  END IF;
  FOR g IN
    SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END AS who,
           a.privilege_type
      FROM aclexplode(p_acl::aclitem[]) a
      LEFT JOIN pg_roles r ON r.oid = a.grantee
     WHERE a.grantee = 0 OR r.rolname IS NOT NULL
  LOOP
    EXECUTE format('GRANT %s ON %s TO %s', g.privilege_type, target, g.who);
  END LOOP;
END;
$fn$;

-- ── Tables ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
BEGIN
  FOR b IN SELECT * FROM app_private.security_hardening_backup WHERE kind = 'table_acl'
  LOOP
    IF to_regclass(format('public.%I', b.name)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS app_server_only ON public.%I', b.name);
      PERFORM app_private.security_hardening_regrant(format('public.%I', b.name), b.detail->>'acl', false);
      IF (b.detail->>'rls')::boolean IS FALSE THEN
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', b.name);
      END IF;
    END IF;
    DELETE FROM app_private.security_hardening_backup WHERE kind = b.kind AND name = b.name;
  END LOOP;
END $$;

-- ── Functions ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
  had_path BOOLEAN;
BEGIN
  FOR b IN SELECT * FROM app_private.security_hardening_backup WHERE kind = 'function'
  LOOP
    IF to_regprocedure(b.name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', b.name);
      PERFORM app_private.security_hardening_regrant(b.name, b.detail->>'acl', true);
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(coalesce(NULLIF(b.detail->'config', 'null'::jsonb), '[]'::jsonb)) c
         WHERE c LIKE 'search_path=%') INTO had_path;
      IF NOT had_path THEN
        EXECUTE format('ALTER FUNCTION %s RESET search_path', b.name);
      END IF;
    END IF;
    DELETE FROM app_private.security_hardening_backup WHERE kind = b.kind AND name = b.name;
  END LOOP;
END $$;

-- ── Views ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
  had_invoker BOOLEAN;
BEGIN
  FOR b IN SELECT * FROM app_private.security_hardening_backup WHERE kind = 'view'
  LOOP
    IF to_regclass(format('public.%I', b.name)) IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(coalesce(NULLIF(b.detail->'reloptions', 'null'::jsonb), '[]'::jsonb)) o
         WHERE o ILIKE 'security_invoker=%') INTO had_invoker;
      IF b.detail->>'relkind' = 'v' AND NOT had_invoker
         AND current_setting('server_version_num')::int >= 150000 THEN
        EXECUTE format('ALTER VIEW public.%I RESET (security_invoker)', b.name);
      END IF;
      PERFORM app_private.security_hardening_regrant(format('public.%I', b.name), b.detail->>'acl', false);
    END IF;
    DELETE FROM app_private.security_hardening_backup WHERE kind = b.kind AND name = b.name;
  END LOOP;
END $$;

-- ── Storage ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  b RECORD;
  roles_sql TEXT;
  stmt TEXT;
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS app_storage_members_all ON storage.objects';

  FOR b IN SELECT * FROM app_private.security_hardening_backup WHERE kind = 'bucket'
  LOOP
    EXECUTE 'UPDATE storage.buckets SET public = true WHERE id::text = $1' USING b.name;
    DELETE FROM app_private.security_hardening_backup WHERE kind = b.kind AND name = b.name;
  END LOOP;

  FOR b IN SELECT * FROM app_private.security_hardening_backup WHERE kind = 'storage_policy'
  LOOP
    SELECT string_agg(CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ')
      INTO roles_sql
      FROM jsonb_array_elements_text(b.detail->'roles') r;
    stmt := format('CREATE POLICY %I ON storage.objects AS %s FOR %s TO %s',
                   b.name, b.detail->>'permissive', b.detail->>'cmd', coalesce(roles_sql, 'PUBLIC'));
    IF b.detail->>'qual' IS NOT NULL THEN
      stmt := stmt || ' USING (' || (b.detail->>'qual') || ')';
    END IF;
    IF b.detail->>'with_check' IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || (b.detail->>'with_check') || ')';
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b.name);
    EXECUTE stmt;
    DELETE FROM app_private.security_hardening_backup WHERE kind = b.kind AND name = b.name;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS app_private.security_hardening_regrant(TEXT, TEXT, BOOLEAN);

COMMIT;

NOTIFY pgrst, 'reload schema';
