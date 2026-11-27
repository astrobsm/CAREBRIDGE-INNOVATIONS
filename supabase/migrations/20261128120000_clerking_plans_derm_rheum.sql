-- ============================================================================
-- Derm & rheum review on the clerking plan
--
-- One new JSONB column on the existing clerking_plans table (no new table):
--   derm_rheum   the Dermatology & Rheumatology reviews made on this plan
--                (Dexie clerkingPlans.dermRheum): the deterministic screen,
--                Claude's validated consult, its plan lines, the hard-rule
--                checks. Photos are never stored, only how many were sent.
--
-- ACCESS: unchanged. The column inherits the table's existing row level
-- security (members-only / hospital-scoped, class 'patient' in
-- supabase/manual/20261020100000_hospital_scoping.sql), and the table is
-- already in the sync lists.
--
-- Until this runs, the app keeps consults on the device and the sync drops
-- the unknown column (PGRST204) without failing; plans saved meanwhile sync
-- the consults the next time they change.
--
-- Additive and idempotent — safe to run and to re-run. Run by hand in the
-- Supabase SQL editor.
-- ============================================================================

ALTER TABLE public.clerking_plans ADD COLUMN IF NOT EXISTS derm_rheum JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clerking_plans_derm_rheum_chk') THEN
    ALTER TABLE public.clerking_plans ADD CONSTRAINT clerking_plans_derm_rheum_chk CHECK (jsonb_typeof(derm_rheum) = 'array');
  END IF;
END $$;

COMMENT ON COLUMN public.clerking_plans.derm_rheum IS 'Derm & rheum reviews (screen, validated Claude consult, plan lines, hard-rule checks); no photos.';

NOTIFY pgrst, 'reload schema';
