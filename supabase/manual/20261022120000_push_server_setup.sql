-- =============================================================================
-- PUSH NOTIFICATIONS — server side (apply by hand, once)
-- =============================================================================
-- Production had push_subscriptions (phones could subscribe) but none of what
-- supabase/functions/send-push-notification needs to send: the VAPID key table,
-- the delivery log, or the two subscriber lookups. Every send failed with
-- "VAPID keys not configured". This creates them, server-only from the start:
-- clients get nothing (RESTRICTIVE deny for anon/authenticated, no grants);
-- the edge function reaches them with the service role, which bypasses RLS.
--
-- No secrets in this file. Store the keys afterwards with the INSERT shown at
-- the end, typed into the SQL editor — never committed.
--
-- Idempotent; one transaction. Matches the classification in
-- 20261020100000_hospital_scoping.sql (app_secrets and push_notification_log
-- are service_only) and the app_server_only policy of
-- 20261020110000_security_hardening.sql.
-- =============================================================================

BEGIN;

-- ── VAPID keys ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Delivery log (what the edge function inserts per sent notification) ────
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   TEXT,
  user_id           TEXT,
  notification_type TEXT,
  title             TEXT,
  body              TEXT,
  data              JSONB,
  sent_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_notification_log_user ON public.push_notification_log (user_id, sent_at DESC);

-- ── Server-only, both tables ────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_secrets', 'push_notification_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS app_server_only ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY app_server_only ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated '
      'USING (false) WITH CHECK (false)', t);
  END LOOP;
END $$;

-- ── Bring push_subscriptions to the shape the app writes ────────────────────
-- Production's copy predates both repo definitions: id INTEGER, user_id TEXT,
-- endpoint TEXT, keys JSONB NOT NULL ({p256dh, auth}), is_active, timestamps.
-- The app (src/services/webPushService.ts) upserts p256dh, auth, user_agent,
-- preferences and hospital_id ON CONFLICT (endpoint), and the edge function
-- reads p256dh/auth — so every subscribe and every send failed. Additive only;
-- existing rows keep their keys, copied into the new columns.
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS preferences JSONB   DEFAULT '{}'::jsonb;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS hospital_id TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS p256dh      TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS auth        TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_agent  TEXT;
UPDATE public.push_subscriptions SET is_active = TRUE WHERE is_active IS NULL;

DO $$
DECLARE
  has_keys BOOLEAN := EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'keys');
  id_type TEXT;
  id_default TEXT;
BEGIN
  -- The legacy combined column: copy its halves out, then stop requiring it
  -- (the app no longer sends it).
  IF has_keys THEN
    EXECUTE $q$
      UPDATE public.push_subscriptions
         SET p256dh = coalesce(p256dh, keys->>'p256dh'),
             auth   = coalesce(auth,   keys->>'auth')
       WHERE keys IS NOT NULL$q$;
    EXECUTE 'ALTER TABLE public.push_subscriptions ALTER COLUMN keys DROP NOT NULL';
  END IF;

  -- The app inserts without an id: make sure one is generated.
  SELECT data_type, column_default INTO id_type, id_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'id';
  IF id_default IS NULL THEN
    IF id_type IN ('integer', 'bigint', 'smallint') THEN
      CREATE SEQUENCE IF NOT EXISTS public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;
      PERFORM setval('public.push_subscriptions_id_seq',
                     coalesce((SELECT max(id) FROM public.push_subscriptions), 0) + 1, false);
      EXECUTE $q$ALTER TABLE public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq')$q$;
    ELSIF id_type = 'uuid' THEN
      EXECUTE 'ALTER TABLE public.push_subscriptions ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSIF id_type = 'text' THEN
      EXECUTE 'ALTER TABLE public.push_subscriptions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
    END IF;
  END IF;

  -- The app upserts ON CONFLICT (endpoint), which needs a unique index. Keep
  -- the newest row per endpoint if an old client left duplicates.
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
     WHERE i.indrelid = 'public.push_subscriptions'::regclass
       AND i.indisunique AND i.indnkeyatts = 1 AND a.attname = 'endpoint') THEN
    DELETE FROM public.push_subscriptions s
     USING public.push_subscriptions newer
     WHERE s.endpoint = newer.endpoint
       AND (coalesce(newer.updated_at, newer.created_at, 'epoch'), newer.ctid::text)
         > (coalesce(s.updated_at, s.created_at, 'epoch'), s.ctid::text);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_push_subscriptions_endpoint ON public.push_subscriptions (endpoint);
  END IF;
END $$;

-- ── Subscriber lookups (service role only) ──────────────────────────────────
-- Ids are compared as text: users.id / hospital ids are TEXT in some copies of
-- the schema and UUID in others. A subscription counts for a hospital when the
-- device registered there or its user belongs there.
CREATE OR REPLACE FUNCTION public.get_hospital_subscriptions(p_hospital_id TEXT)
RETURNS TABLE (id TEXT, user_id TEXT, endpoint TEXT, p256dh TEXT, auth TEXT, preferences JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id::text, s.user_id::text, s.endpoint, s.p256dh, s.auth, coalesce(s.preferences, '{}'::jsonb)
    FROM public.push_subscriptions s
    LEFT JOIN public.users u ON u.id::text = s.user_id::text
   WHERE s.is_active IS TRUE
     AND (s.hospital_id::text = p_hospital_id OR u.hospital_id::text = p_hospital_id)
     AND (u.id IS NULL OR u.is_active IS TRUE)
$$;

CREATE OR REPLACE FUNCTION public.get_subscriptions_by_role(p_role TEXT, p_hospital_id TEXT)
RETURNS TABLE (id TEXT, user_id TEXT, endpoint TEXT, p256dh TEXT, auth TEXT, preferences JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id::text, s.user_id::text, s.endpoint, s.p256dh, s.auth, coalesce(s.preferences, '{}'::jsonb)
    FROM public.push_subscriptions s
    JOIN public.users u ON u.id::text = s.user_id::text
   WHERE s.is_active IS TRUE
     AND u.is_active IS TRUE
     AND u.role = p_role
     AND (s.hospital_id::text = p_hospital_id OR u.hospital_id::text = p_hospital_id)
$$;

REVOKE ALL ON FUNCTION public.get_hospital_subscriptions(TEXT)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_subscriptions_by_role(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_hospital_subscriptions(TEXT)      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_subscriptions_by_role(TEXT, TEXT) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Check ───────────────────────────────────────────────────────────────────
-- Every row should read true; the last three must read false (clients locked out).
SELECT 'app_secrets exists'               AS check, to_regclass('public.app_secrets') IS NOT NULL AS ok
UNION ALL SELECT 'push_notification_log exists', to_regclass('public.push_notification_log') IS NOT NULL
UNION ALL SELECT 'lookups exist', to_regprocedure('public.get_hospital_subscriptions(text)') IS NOT NULL
                                   AND to_regprocedure('public.get_subscriptions_by_role(text,text)') IS NOT NULL
UNION ALL SELECT 'staff can read app_secrets (must be false)', has_table_privilege('authenticated', 'public.app_secrets', 'SELECT')
UNION ALL SELECT 'visitors can read app_secrets (must be false)', has_table_privilege('anon', 'public.app_secrets', 'SELECT')
UNION ALL SELECT 'staff can call lookups (must be false)', has_function_privilege('authenticated', 'public.get_hospital_subscriptions(text)', 'EXECUTE');

-- ── Then, separately, store the keys (from `npx.cmd web-push generate-vapid-keys`) ──
-- insert into public.app_secrets (key, value, updated_at) values
--   ('vapid_public_key',  'PASTE-PUBLIC-KEY-HERE',  now()),
--   ('vapid_private_key', 'PASTE-PRIVATE-KEY-HERE', now())
-- on conflict (key) do update set value = excluded.value, updated_at = now();
