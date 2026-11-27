-- ============================================================================
-- View-only patient review links ("Share for review")
--
-- A clinician shares one patient's comprehensive summary with an invited
-- doctor, who opens it without signing in. The summary is a FROZEN SNAPSHOT
-- built on the clinician's device at share time (much of the record lives in
-- the device database and the cloud copy may lag): the viewer never touches a
-- live clinical table.
--
-- New tables (classified in supabase/manual/20261020100000_hospital_scoping.sql):
--   patient_review_shares            one link: token hash, optional PIN hash,
--                                    expiry / revocation, the snapshot (JSON,
--                                    no photos), counters and PIN lock-out.
--                                    Class 'patient'.
--   patient_review_share_photos      the snapshot's photos, one row each
--                                    (compressed JPEG, base64), uploaded one
--                                    request at a time so no request is large.
--                                    A refresh uploads a new batch and switches
--                                    the share to it in one update.
--                                    Class 'parent' (follows its share).
--   patient_review_share_access_log  every open attempt on a link: when,
--                                    opened or why not, IP and user agent from
--                                    the request headers. Written only by the
--                                    open function. Class 'parent'.
--
-- ACCESS
--   anon: NO table access at all (no policy, no grant). Anonymous viewers get
--   only two SECURITY DEFINER functions:
--     app_review_share_status(p_token)       -> { needs_pin, expired_or_invalid }
--     app_open_review_share(p_token, p_pin)  -> the snapshot, its photos and
--                                               who shared it, or a reason
--   The raw token exists only in the link; the database keeps its sha256.
--   A PIN is kept as sha256(salt || ':' || pin) with a per-row salt. Five
--   wrong PINs lock the link for 15 minutes; fifteen in all revoke it.
--
--   authenticated members: create, list and revoke links, upload photos and
--   read the access log, for patients they can access — members-only now,
--   hospital-scoped when scoping is on (as clerking_plans). Column privileges
--   keep the token hash, PIN hash and salt unreadable from the API, and the
--   counters / lock-out writable only by the open function. No client deletes
--   a link or a log row (RESTRICTIVE app_* policies, which the RLS lockdown
--   and the scoping both keep).
--
-- Additive and idempotent: safe to run and to re-run. Run by hand in the
-- Supabase SQL editor. No pgcrypto: hashing uses the built-in sha256().
-- ============================================================================

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_review_shares (
  id                   TEXT PRIMARY KEY,
  token_hash           TEXT NOT NULL,                 -- sha256 hex of the link token
  pin_hash             TEXT,                          -- sha256 hex of pin_salt || ':' || PIN; NULL = no PIN
  pin_salt             TEXT,
  has_pin              BOOLEAN GENERATED ALWAYS AS (pin_hash IS NOT NULL) STORED,
  patient_id           TEXT NOT NULL,
  hospital_id          TEXT,
  patient_name         TEXT,                          -- shown on the viewer's banner and in "Manage shared links"
  created_by           TEXT NOT NULL,
  created_by_name      TEXT,
  invitee_name         TEXT,
  invitee_note         TEXT,                          -- specialty / note about the invited doctor
  consent_confirmed_at TIMESTAMPTZ NOT NULL,          -- patient agreed to the share (NDPA 2023)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ NOT NULL,
  revoked_at           TIMESTAMPTZ,
  revoked_by           TEXT,
  revoked_reason       TEXT,                          -- 'revoked' (by a member) | 'pin_failures'
  snapshot             JSONB,                         -- the summary, without photos
  snapshot_at          TIMESTAMPTZ,                   -- when the device built it
  snapshot_batch       TEXT,                          -- live photo batch; NULL = upload not finished, link not usable yet
  photo_count          INTEGER NOT NULL DEFAULT 0,
  access_count         INTEGER NOT NULL DEFAULT 0,
  last_accessed_at     TIMESTAMPTZ,
  failed_pin_attempts  INTEGER NOT NULL DEFAULT 0,    -- consecutive, reset by a lock or a correct PIN
  pin_failures_total   INTEGER NOT NULL DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_review_shares_token_hash_key UNIQUE (token_hash),
  CONSTRAINT patient_review_shares_token_hash_chk CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT patient_review_shares_pin_chk CHECK (
    (pin_hash IS NULL AND pin_salt IS NULL)
    OR (pin_hash ~ '^[0-9a-f]{64}$' AND pin_salt ~ '^[0-9a-f]{16,64}$')),
  CONSTRAINT patient_review_shares_expiry_chk CHECK (expires_at > created_at),
  CONSTRAINT patient_review_shares_snapshot_chk CHECK (
    snapshot IS NULL OR (jsonb_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 4000000)),
  CONSTRAINT patient_review_shares_counts_chk CHECK (
    photo_count >= 0 AND access_count >= 0 AND failed_pin_attempts >= 0 AND pin_failures_total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_patient_review_shares_patient ON public.patient_review_shares (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_review_shares_created ON public.patient_review_shares (created_at);

CREATE TABLE IF NOT EXISTS public.patient_review_share_photos (
  id          TEXT PRIMARY KEY,
  share_id    TEXT NOT NULL REFERENCES public.patient_review_shares (id) ON DELETE CASCADE,
  batch       TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  caption     TEXT,
  source      TEXT,                                   -- where in the record it came from
  taken_at    TIMESTAMPTZ,
  mime        TEXT NOT NULL DEFAULT 'image/jpeg',
  data        TEXT NOT NULL,                          -- base64, no "data:" prefix
  width       INTEGER,
  height      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Raster only (never SVG, which can carry script), and one photo per row of
  -- a sane size: 1024 px JPEGs are ~100–400 kB.
  CONSTRAINT patient_review_share_photos_mime_chk CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT patient_review_share_photos_data_chk CHECK (length(data) <= 2000000 AND data ~ '^[A-Za-z0-9+/]+={0,2}$')
);
CREATE INDEX IF NOT EXISTS idx_patient_review_share_photos_share ON public.patient_review_share_photos (share_id, batch, seq);

CREATE TABLE IF NOT EXISTS public.patient_review_share_access_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  share_id    TEXT NOT NULL REFERENCES public.patient_review_shares (id) ON DELETE CASCADE,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok          BOOLEAN NOT NULL,
  reason      TEXT NOT NULL,                          -- opened | wrong_pin | pin_required | locked | expired | revoked | not_ready
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_patient_review_share_access_log_share ON public.patient_review_share_access_log (share_id, at);

-- ── Server-side rules on what a member may write ────────────────────────────
-- A link is at most 30 days long (plus a few minutes for clock skew), starts
-- unrevoked with clean counters, and is credited to the signed-in member. Once
-- revoked it stays revoked and its snapshot no longer changes.
CREATE OR REPLACE FUNCTION public.app_review_shares_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me TEXT;
BEGIN
  IF to_regprocedure('public.app_user_id()') IS NOT NULL THEN
    EXECUTE 'SELECT public.app_user_id()' INTO v_me;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    NEW.created_by := coalesce(v_me, NEW.created_by);
    NEW.consent_confirmed_at := now();
    NEW.revoked_at := NULL;
    NEW.revoked_by := NULL;
    NEW.revoked_reason := NULL;
    NEW.access_count := 0;
    NEW.last_accessed_at := NULL;
    NEW.failed_pin_attempts := 0;
    NEW.pin_failures_total := 0;
    NEW.locked_until := NULL;
    IF NEW.expires_at IS NULL OR NEW.expires_at <= now() OR NEW.expires_at > now() + interval '30 days 10 minutes' THEN
      RAISE EXCEPTION 'A review link must expire within 30 days.' USING ERRCODE = '22023';
    END IF;
    IF NEW.snapshot_at IS NOT NULL AND NEW.snapshot_at > now() + interval '10 minutes' THEN
      NEW.snapshot_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  NEW.updated_at := now();
  IF OLD.revoked_at IS NOT NULL THEN
    IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.snapshot_batch IS DISTINCT FROM OLD.snapshot_batch THEN
      RAISE EXCEPTION 'This review link has been revoked.' USING ERRCODE = '22023';
    END IF;
    NEW.revoked_at := OLD.revoked_at;
    NEW.revoked_by := OLD.revoked_by;
    NEW.revoked_reason := OLD.revoked_reason;
  ELSIF NEW.revoked_at IS NOT NULL THEN
    NEW.revoked_at := now();
    NEW.revoked_by := coalesce(v_me, NEW.revoked_by);
    NEW.revoked_reason := coalesce(NEW.revoked_reason, 'revoked');
  END IF;
  IF NEW.snapshot_at IS DISTINCT FROM OLD.snapshot_at AND NEW.snapshot_at > now() + interval '10 minutes' THEN
    NEW.snapshot_at := now();
  END IF;
  -- These belong to the open function and the insert, never to a client.
  NEW.token_hash := OLD.token_hash;
  NEW.patient_id := OLD.patient_id;
  NEW.created_at := OLD.created_at;
  NEW.created_by := OLD.created_by;
  NEW.expires_at := OLD.expires_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS app_review_shares_guard ON public.patient_review_shares;
CREATE TRIGGER app_review_shares_guard
  BEFORE INSERT OR UPDATE ON public.patient_review_shares
  FOR EACH ROW EXECUTE FUNCTION public.app_review_shares_guard();

-- ── Privileges: anon nothing; members only the columns they need ────────────
REVOKE ALL ON public.patient_review_shares FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.patient_review_share_photos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.patient_review_share_access_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.patient_review_shares, public.patient_review_share_photos, public.patient_review_share_access_log TO service_role;

-- Never readable from the API: token_hash, pin_hash, pin_salt (a 4-digit PIN
-- hash is trivially reversed), and the snapshot itself (the device has it).
GRANT SELECT (id, has_pin, patient_id, hospital_id, patient_name, created_by, created_by_name,
              invitee_name, invitee_note, consent_confirmed_at, created_at, expires_at,
              revoked_at, revoked_by, revoked_reason, snapshot_at, snapshot_batch, photo_count,
              access_count, last_accessed_at, failed_pin_attempts, pin_failures_total,
              locked_until, updated_at)
  ON public.patient_review_shares TO authenticated;
GRANT INSERT (id, token_hash, pin_hash, pin_salt, patient_id, hospital_id, patient_name,
              created_by, created_by_name, invitee_name, invitee_note, consent_confirmed_at,
              expires_at, snapshot, snapshot_at, snapshot_batch, photo_count)
  ON public.patient_review_shares TO authenticated;
GRANT UPDATE (revoked_at, revoked_by, revoked_reason, snapshot, snapshot_at, snapshot_batch,
              photo_count, invitee_name, invitee_note)
  ON public.patient_review_shares TO authenticated;

GRANT SELECT (id, share_id, batch, seq, caption, source, taken_at, mime, width, height, created_at)
  ON public.patient_review_share_photos TO authenticated;
GRANT INSERT (id, share_id, batch, seq, caption, source, taken_at, mime, data, width, height)
  ON public.patient_review_share_photos TO authenticated;
GRANT DELETE ON public.patient_review_share_photos TO authenticated;

GRANT SELECT ON public.patient_review_share_access_log TO authenticated;

-- ── Row level security ──────────────────────────────────────────────────────
-- Scoped by patient when hospital scoping is on (the expression
-- app_private.apply_hospital_scoping() writes for class 'patient'),
-- members-only otherwise. The child tables follow their share through the
-- share's own row security (an EXISTS on it sees only shares you may see),
-- until the scoping is re-applied with them classified as 'parent'.
DO $$
DECLARE
  scoped BOOLEAN := false;
  expr TEXT := 'public.app_can_access_patient(patient_id::text, hospital_id::text)';
  child TEXT := 'public.is_app_member() AND EXISTS (SELECT 1 FROM public.patient_review_shares s WHERE s.id = share_id)';
  t TEXT;
BEGIN
  -- The scoping state table only exists once hospital scoping is installed.
  -- Postgres resolves every table a statement names before running it, so it
  -- is read through EXECUTE, and only when it is there.
  IF to_regclass('app_private.access_policy_state') IS NOT NULL
     AND to_regprocedure('public.app_can_access_patient(text,text)') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM app_private.access_policy_state WHERE hospital_scoped IS TRUE)'
      INTO scoped;
  END IF;

  EXECUTE 'ALTER TABLE public.patient_review_shares ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS app_members_all ON public.patient_review_shares';
  EXECUTE 'DROP POLICY IF EXISTS app_scoped_all ON public.patient_review_shares';
  IF scoped THEN
    EXECUTE format('CREATE POLICY app_scoped_all ON public.patient_review_shares FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', expr, expr);
  ELSE
    EXECUTE 'CREATE POLICY app_members_all ON public.patient_review_shares FOR ALL TO authenticated '
            'USING (public.is_app_member()) WITH CHECK (public.is_app_member())';
  END IF;

  FOREACH t IN ARRAY ARRAY['patient_review_share_photos', 'patient_review_share_access_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_members_all ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', t);
    IF scoped THEN
      EXECUTE format('CREATE POLICY app_scoped_all ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', t, child, child);
    ELSE
      EXECUTE format('CREATE POLICY app_members_all ON public.%I FOR ALL TO authenticated '
                     'USING (public.is_app_member()) WITH CHECK (public.is_app_member())', t);
    END IF;
  END LOOP;

  -- Keep the database's copy of the classification in step, so a re-run of
  -- the RLS lockdown (which re-applies the scoping while it is on) does not
  -- stop on "not classified" before the scoping file itself is run again.
  IF to_regclass('app_private.hospital_scoping_classes') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO app_private.hospital_scoping_classes (tablename, class, patient_col, hospital_col, parent_col, parent_table) VALUES
        ('patient_review_shares',           'patient', 'patient_id', 'hospital_id', NULL,       NULL),
        ('patient_review_share_photos',     'parent',  NULL,         NULL,          'share_id', 'patient_review_shares'),
        ('patient_review_share_access_log', 'parent',  NULL,         NULL,          'share_id', 'patient_review_shares')
      ON CONFLICT (tablename) DO NOTHING
    $q$;
  END IF;
END $$;

-- A link and its access log are the audit trail of who saw the record: no
-- client deletes either (a link is revoked instead). The log is written only
-- by app_open_review_share (its owner bypasses row security).
DROP POLICY IF EXISTS app_review_shares_no_delete ON public.patient_review_shares;
CREATE POLICY app_review_shares_no_delete ON public.patient_review_shares AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS app_review_share_log_no_insert ON public.patient_review_share_access_log;
CREATE POLICY app_review_share_log_no_insert ON public.patient_review_share_access_log AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS app_review_share_log_no_update ON public.patient_review_share_access_log;
CREATE POLICY app_review_share_log_no_update ON public.patient_review_share_access_log AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false);
DROP POLICY IF EXISTS app_review_share_log_no_delete ON public.patient_review_share_access_log;
CREATE POLICY app_review_share_log_no_delete ON public.patient_review_share_access_log AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- Photos are added only to a link that is still live.
DROP POLICY IF EXISTS app_review_share_photos_live ON public.patient_review_share_photos;
CREATE POLICY app_review_share_photos_live ON public.patient_review_share_photos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.patient_review_shares s WHERE s.id = share_id AND s.revoked_at IS NULL));

-- ── The two functions anonymous viewers may call ────────────────────────────
-- Both answer an unknown, expired, revoked or unfinished link the same way, so
-- a caller learns nothing about which it was.

-- Whether to ask for a PIN before opening. Changes nothing, logs nothing.
CREATE OR REPLACE FUNCTION public.app_review_share_status(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s public.patient_review_shares%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{32,128}$' THEN
    RETURN jsonb_build_object('needs_pin', false, 'expired_or_invalid', true);
  END IF;
  SELECT * INTO s FROM public.patient_review_shares
   WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at <= now() OR s.snapshot_batch IS NULL OR s.snapshot IS NULL THEN
    RETURN jsonb_build_object('needs_pin', false, 'expired_or_invalid', true);
  END IF;
  RETURN jsonb_build_object('needs_pin', s.pin_hash IS NOT NULL, 'expired_or_invalid', false);
END;
$$;

-- Open a link: check it, check the PIN, log the attempt, return the snapshot.
-- Never raises for a refused attempt (that would roll back the log and the
-- PIN counters); it returns { ok: false, error } instead. The share row is
-- locked FOR UPDATE, so parallel guesses cannot slip past the counter.
CREATE OR REPLACE FUNCTION public.app_open_review_share(p_token TEXT, p_pin TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s public.patient_review_shares%ROWTYPE;
  v_headers JSON;
  v_ip TEXT;
  v_ua TEXT;
  v_fail INTEGER;
  v_total INTEGER;
  v_photos JSONB;
  c_max_consecutive CONSTANT INTEGER := 5;
  c_lock CONSTANT INTERVAL := interval '15 minutes';
  c_max_total CONSTANT INTEGER := 15;
BEGIN
  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;
  v_ip := left(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip', ''), ',', 1)), 64);
  v_ip := nullif(v_ip, '');
  v_ua := left(v_headers ->> 'user-agent', 300);

  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{32,128}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  SELECT * INTO s FROM public.patient_review_shares
   WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF s.revoked_at IS NOT NULL OR s.expires_at <= now() OR s.snapshot_batch IS NULL OR s.snapshot IS NULL THEN
    INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
    VALUES (s.id, false,
            CASE WHEN s.revoked_at IS NOT NULL THEN 'revoked' WHEN s.expires_at <= now() THEN 'expired' ELSE 'not_ready' END,
            v_ip, v_ua);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF s.pin_hash IS NOT NULL THEN
    IF s.locked_until IS NOT NULL AND s.locked_until > now() THEN
      INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
      VALUES (s.id, false, 'locked', v_ip, v_ua);
      RETURN jsonb_build_object('ok', false, 'error', 'locked', 'locked_until', s.locked_until);
    END IF;
    IF p_pin IS NULL OR btrim(p_pin) = '' THEN
      INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
      VALUES (s.id, false, 'pin_required', v_ip, v_ua);
      RETURN jsonb_build_object('ok', false, 'error', 'pin_required');
    END IF;
    IF btrim(p_pin) !~ '^[0-9]{4}$'
       OR encode(sha256(convert_to(s.pin_salt || ':' || btrim(p_pin), 'UTF8')), 'hex') <> s.pin_hash THEN
      v_fail := s.failed_pin_attempts + 1;
      v_total := s.pin_failures_total + 1;
      IF v_total >= c_max_total THEN
        -- Too many guesses in all: the link is finished; the clinician issues a new one.
        UPDATE public.patient_review_shares
           SET failed_pin_attempts = 0, pin_failures_total = v_total, locked_until = NULL,
               revoked_at = now(), revoked_reason = 'pin_failures'
         WHERE id = s.id;
        INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
        VALUES (s.id, false, 'wrong_pin', v_ip, v_ua);
        RETURN jsonb_build_object('ok', false, 'error', 'invalid');
      ELSIF v_fail >= c_max_consecutive THEN
        UPDATE public.patient_review_shares
           SET failed_pin_attempts = 0, pin_failures_total = v_total, locked_until = now() + c_lock
         WHERE id = s.id;
        INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
        VALUES (s.id, false, 'wrong_pin', v_ip, v_ua);
        RETURN jsonb_build_object('ok', false, 'error', 'locked', 'locked_until', now() + c_lock);
      END IF;
      UPDATE public.patient_review_shares
         SET failed_pin_attempts = v_fail, pin_failures_total = v_total
       WHERE id = s.id;
      INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
      VALUES (s.id, false, 'wrong_pin', v_ip, v_ua);
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_pin', 'attempts_left', c_max_consecutive - v_fail);
    END IF;
  END IF;

  UPDATE public.patient_review_shares
     SET access_count = access_count + 1, last_accessed_at = now(),
         failed_pin_attempts = 0, locked_until = NULL
   WHERE id = s.id;
  INSERT INTO public.patient_review_share_access_log (share_id, ok, reason, ip, user_agent)
  VALUES (s.id, true, 'opened', v_ip, v_ua);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'seq', p.seq, 'caption', p.caption, 'source', p.source, 'taken_at', p.taken_at,
           'mime', p.mime, 'data', p.data, 'width', p.width, 'height', p.height) ORDER BY p.seq), '[]'::jsonb)
    INTO v_photos
    FROM public.patient_review_share_photos p
   WHERE p.share_id = s.id AND p.batch = s.snapshot_batch;

  RETURN jsonb_build_object(
    'ok', true,
    'share', jsonb_build_object(
      'patient_name', s.patient_name,
      'shared_by', s.created_by_name,
      'invitee_name', s.invitee_name,
      'created_at', s.created_at,
      'expires_at', s.expires_at,
      'snapshot_at', s.snapshot_at),
    'snapshot', s.snapshot,
    'photos', v_photos);
END;
$$;

REVOKE ALL ON FUNCTION public.app_review_share_status(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_open_review_share(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_review_shares_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_review_share_status(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_open_review_share(TEXT, TEXT) TO anon, authenticated, service_role;

COMMENT ON TABLE public.patient_review_shares IS
  'View-only patient review links: token hash, optional PIN hash, expiry, frozen summary snapshot. Opened by anon only through app_open_review_share(); see supabase/migrations/20261128130000_patient_review_shares.sql.';
COMMENT ON TABLE public.patient_review_share_photos IS 'Photos of a review-link snapshot (compressed JPEG, base64), by batch.';
COMMENT ON TABLE public.patient_review_share_access_log IS 'Every open attempt on a review link (written only by app_open_review_share).';

NOTIFY pgrst, 'reload schema';
