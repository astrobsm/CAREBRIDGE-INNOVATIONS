-- ============================================================================
-- Family App — Task LIBRARY + scheduling (time, duration, frequency)
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql. Idempotent.
--
-- - is_template: row appears in the household task LIBRARY (build once,
--   assign to many children, many times).
-- - scheduled_time / duration_minutes: optional time-of-day + how long it
--   should take.
-- - frequency / days_of_week: optional recurrence info shown on the task.
--   (Actual recurrence engine — auto-creating future assignments — is a
--   later concern; for now these are descriptive + used by the UI.)

ALTER TABLE family.tasks
  ADD COLUMN IF NOT EXISTS is_template       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scheduled_time    TIME,
  ADD COLUMN IF NOT EXISTS duration_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS frequency         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS days_of_week      INTEGER[];

ALTER TABLE family.tasks
  DROP CONSTRAINT IF EXISTS tasks_frequency_chk;
ALTER TABLE family.tasks
  ADD CONSTRAINT tasks_frequency_chk
  CHECK (frequency IS NULL OR frequency IN
    ('once','daily','weekdays','weekends','weekly','monthly','custom'));

CREATE INDEX IF NOT EXISTS idx_fam_tasks_template ON family.tasks(is_template) WHERE is_template = TRUE;

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='family' AND table_name='tasks'
ORDER BY ordinal_position;
