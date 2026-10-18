-- ============================================================================
-- Clinical safety fixes — database guards
-- ----------------------------------------------------------------------------
-- Withdrawal scale totals. The app now rejects a CIWA-Ar outside 0–67 or a
-- COWS outside 0–48 before saving (src/domains/substance-use/services/
-- detoxMonitoring.ts); these constraints hold the same line for any other
-- writer. A total outside the scale is not a severe score, it is a wrong one,
-- and it would otherwise drive escalation and the severity band.
--
-- Added NOT VALID so rows already stored are not re-checked and the migration
-- cannot fail on historical data; every new or updated row is checked.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.detox_monitoring_records') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = 'detox_monitoring_ciwa_score_range'
         AND conrelid = 'public.detox_monitoring_records'::regclass
    ) THEN
      ALTER TABLE public.detox_monitoring_records
        ADD CONSTRAINT detox_monitoring_ciwa_score_range
        CHECK (ciwa_score IS NULL OR (ciwa_score >= 0 AND ciwa_score <= 67)) NOT VALID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = 'detox_monitoring_cows_score_range'
         AND conrelid = 'public.detox_monitoring_records'::regclass
    ) THEN
      ALTER TABLE public.detox_monitoring_records
        ADD CONSTRAINT detox_monitoring_cows_score_range
        CHECK (cows_score IS NULL OR (cows_score >= 0 AND cows_score <= 48)) NOT VALID;
    END IF;
  END IF;
END $$;
