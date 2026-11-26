-- ============================================================================
-- patients.dob_estimated — the date of birth was estimated from an age
-- ----------------------------------------------------------------------------
-- Quick registration accepts EITHER an exact date of birth OR an age in years.
-- An age-only registration stores 1 July of (this year - age) as the date of
-- birth and sets dob_estimated = true, so screens can say "estimated".
-- NULL / false means the date was given.
--
-- Until this column exists the app keeps working: the first patient upsert
-- that carries it gets PGRST204, the sync drops dob_estimated from patients
-- for the session and retries, and the flag stays on the device only. Apply
-- this so the flag reaches the cloud and other devices.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.patients') IS NOT NULL THEN
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS dob_estimated BOOLEAN;
  END IF;
END $$;
