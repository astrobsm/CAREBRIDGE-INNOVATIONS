-- ============================================================================
-- Miscellaneous fixes
-- ----------------------------------------------------------------------------
-- users.last_login_at — when each person last signed in, for User Management.
-- The app writes it on sign-in as a single-column update; it never travels
-- with the rest of the user row. Until this column exists that update simply
-- fails and sign-in carries on, so applying this is safe at any time.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  END IF;
END $$;
