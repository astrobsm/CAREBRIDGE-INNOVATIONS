-- =============================================================================
-- HOSPITAL SCOPING — verification (READ-ONLY; changes nothing).
-- =============================================================================
-- Run in the Supabase SQL editor AFTER 20261020100000_hospital_scoping.sql
-- (it reads the tables that script creates; after a rollback it still runs and
-- reports scoping "off"). Problems are listed first; every other row should
-- read "ok", except the counts (kind = 'info'), which show what the rule
-- relies on: legacy patients visible to all, hospitals with patients but no
-- staff, staff with no hospital.
-- =============================================================================

WITH
state AS (
  SELECT
    (to_regclass('app_private.access_policy_state') IS NOT NULL
      AND EXISTS (SELECT 1 FROM app_private.access_policy_state WHERE hospital_scoped)) AS scoped,
    (to_regclass('app_private.rls_lockdown_state') IS NOT NULL
      AND EXISTS (SELECT 1 FROM app_private.rls_lockdown_state WHERE in_force)) AS locked
),
tables AS (
  SELECT c.relname AS name
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname NOT LIKE 'family\_%'
),
classes AS (
  SELECT * FROM app_private.hospital_scoping_classes
   WHERE to_regclass('app_private.hospital_scoping_classes') IS NOT NULL
),
checks AS (
  SELECT 'state' AS kind, 'lockdown in force' AS item,
         CASE WHEN (SELECT locked FROM state) THEN 'ok' ELSE 'NOT IN FORCE' END AS result
  UNION ALL
  SELECT 'state', 'hospital scoping on',
         CASE WHEN (SELECT scoped FROM state) THEN 'ok' ELSE 'off' END
  UNION ALL
  -- Every public table is classified.
  SELECT 'classification', t.name, 'UNCLASSIFIED'
    FROM tables t
   WHERE NOT EXISTS (SELECT 1 FROM classes k WHERE k.tablename = t.name)
  UNION ALL
  -- No scoped table still carries a members-wide (or any other permissive) policy.
  SELECT 'policy', k.tablename || ': ' || p.policyname, 'WIDENS ACCESS'
    FROM classes k
    JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = k.tablename AND p.permissive = 'PERMISSIVE'
   WHERE (SELECT scoped FROM state)
     AND k.class IN ('patients', 'patient', 'hospital', 'parent', 'service_only', 'user_hospitals')
     AND p.policyname NOT IN ('app_scoped_all', 'app_user_hospitals_select')
  UNION ALL
  -- Every scoped table that exists has its scoped policy.
  SELECT 'policy', k.tablename || ': app_scoped_all', 'MISSING'
    FROM classes k
   WHERE (SELECT scoped FROM state)
     AND k.class IN ('patients', 'patient', 'hospital', 'parent')
     AND to_regclass(format('public.%I', k.tablename)) IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies p
                      WHERE p.schemaname = 'public' AND p.tablename = k.tablename AND p.policyname = 'app_scoped_all')
  UNION ALL
  -- Wider than before the lockdown: the table's original policies (backed up
  -- by the lockdown, or kept by it) all had a real condition — owner-only,
  -- deny-all, admin-only — none was "Allow all", yet a members-wide or scoped
  -- policy now applies. Members-wide is a problem; scoped is for review.
  SELECT 'wider than original', o.tablename,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = o.tablename AND p.policyname = 'app_members_all')
              THEN 'WIDER: members-wide, originally ' || o.original
              ELSE 'review: hospital-scoped, originally ' || o.original END
    FROM (
      SELECT x.tablename, string_agg(DISTINCT x.policyname, '; ') AS original
        FROM (
          SELECT b.tablename, b.policyname, b.qual, b.with_check FROM app_private.rls_lockdown_policies b
          UNION ALL
          SELECT p.tablename::text, p.policyname::text, p.qual, p.with_check FROM pg_policies p
           WHERE p.schemaname = 'public' AND p.permissive = 'PERMISSIVE' AND p.policyname NOT LIKE 'app\_%'
        ) x
       WHERE x.tablename NOT IN ('users', 'public_clinic_bookings') AND x.tablename NOT LIKE 'family\_%'
       GROUP BY x.tablename
      HAVING bool_and(btrim(coalesce(x.qual, '')) <> 'true' AND btrim(coalesce(x.with_check, '')) <> 'true')
    ) o
   WHERE EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = o.tablename
                   AND p.policyname IN ('app_members_all', 'app_scoped_all'))
  UNION ALL
  -- Server-only tables: no permissive policy may let a client in.
  SELECT 'server only', k.tablename,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = k.tablename AND p.permissive = 'PERMISSIVE')
              THEN 'CLIENT ACCESS' ELSE 'ok' END
    FROM classes k
   WHERE k.class = 'service_only' AND to_regclass(format('public.%I', k.tablename)) IS NOT NULL
  UNION ALL
  -- users reading is scoped.
  SELECT 'policy', 'users: app_users_select',
         CASE WHEN (SELECT qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'app_users_select') LIKE '%app_can_see_user%'
              THEN 'ok' ELSE CASE WHEN (SELECT scoped FROM state) THEN 'NOT SCOPED' ELSE 'members (scoping off)' END END
  UNION ALL
  -- Nobody but the service role writes memberships.
  SELECT 'grants', 'user_hospitals writable by authenticated',
         CASE WHEN to_regclass('public.user_hospitals') IS NULL THEN 'not created yet'
              WHEN has_table_privilege('authenticated', 'public.user_hospitals', 'INSERT')
                OR has_table_privilege('authenticated', 'public.user_hospitals', 'UPDATE')
                OR has_table_privilege('authenticated', 'public.user_hospitals', 'DELETE') THEN 'WRITABLE'
              ELSE 'ok' END
  UNION ALL
  -- Views must not bypass row security.
  SELECT 'view', c.relname,
         CASE WHEN 'security_invoker=true' = ANY (coalesce(c.reloptions, '{}')) THEN 'ok'
              WHEN NOT has_table_privilege('authenticated', c.oid, 'SELECT') THEN 'ok (no member access)'
              WHEN (SELECT scoped FROM state) THEN 'BYPASSES SCOPING'
              ELSE 'owner rights (scoping off)' END
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm') AND c.relname NOT LIKE 'family\_%'
  UNION ALL
  -- What the rule relies on.
  SELECT 'info', 'patients with no registered hospital (NULL, blank, global): visible to every member',
         count(*)::text
    FROM public.patients p
   WHERE p.registered_hospital_id IS NULL OR btrim(p.registered_hospital_id::text) IN ('', 'global')
  UNION ALL
  SELECT 'info', 'patients registered at an id that is not in hospitals: super admins only, unless linked',
         count(*)::text
    FROM public.patients p
   WHERE NOT (p.registered_hospital_id IS NULL OR btrim(p.registered_hospital_id::text) IN ('', 'global'))
     AND NOT EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id::text = btrim(p.registered_hospital_id::text))
  UNION ALL
  SELECT 'info', 'hospital "' || coalesce(h.name, h.id::text) || '": patients registered / staff who belong',
         (SELECT count(*) FROM public.patients p WHERE btrim(p.registered_hospital_id::text) = h.id::text)::text
         || ' / ' ||
         (SELECT count(*) FROM public.users u
           WHERE u.is_active IS TRUE AND (u.hospital_id::text = h.id::text
              OR (to_regclass('public.user_hospitals') IS NOT NULL
                  AND u.id::text IN (SELECT uh.user_id FROM public.user_hospitals uh WHERE uh.hospital_id = h.id::text)))))::text
    FROM public.hospitals h
  UNION ALL
  SELECT 'info', 'active staff with no hospital (see only legacy patients and links)',
         count(*)::text
    FROM public.users u
   WHERE u.is_active IS TRUE AND u.role <> 'super_admin'
     AND (u.hospital_id IS NULL OR btrim(u.hospital_id::text) = '')
)
SELECT kind, item, result
  FROM checks
 ORDER BY CASE WHEN result IN ('ok', 'off', 'ok (no member access)', 'members (scoping off)', 'owner rights (scoping off)', 'not created yet')
                    OR kind = 'info' OR result LIKE 'review:%' THEN 1 ELSE 0 END,
          kind, item;
