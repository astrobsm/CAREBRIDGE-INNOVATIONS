-- ============================================================================
-- Rename the practice hospital.
--
-- The original seed created "AstroHEALTH General Hospital" with a placeholder
-- Lagos address. The practice is AstroHEALTH Services, Enugu, Nigeria.
--
-- Data only: no table, column or policy changes. updated_at moves forward so
-- every device picks the new name up on its next sync. Idempotent: once
-- renamed, the WHERE clause matches nothing.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.hospitals') IS NOT NULL THEN
    UPDATE public.hospitals
       SET name       = 'AstroHEALTH Services',
           address    = 'Enugu, Nigeria',
           city       = 'Enugu',
           state      = 'Enugu',
           updated_at = now()
     WHERE name = 'AstroHEALTH General Hospital';
  ELSE
    RAISE NOTICE 'skipped: table hospitals not present';
  END IF;
END $$;
