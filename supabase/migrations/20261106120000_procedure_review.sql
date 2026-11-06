-- ============================================================================
-- Procedure-specific plastic-surgery reviews
--
-- A procedure review (wound review, pre-operative, post-operative or
-- follow-up review for a named procedure) is not a new table. Like the
-- structured clerking, it rides on the existing clinical_encounters row as one
-- JSONB column, `procedure_review`, holding the answers, scores, flags, the
-- drafted plan, the counselling record and the consent draft, with the same
-- draft / pending_review / signed / entered_in_error lifecycle. The encounter's
-- ordinary prose columns carry the narrative, so every existing reader keeps
-- working.
--
-- New encounter types ('pre_operative', 'post_operative', 'wound_review')
-- need no change: clinical_encounters.type is TEXT without a CHECK.
--
-- No policies here: clinical_encounters is already covered by the RLS
-- lockdown and hospital scoping migrations, and a new column inherits them.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.clinical_encounters') IS NOT NULL THEN
    ALTER TABLE public.clinical_encounters ADD COLUMN IF NOT EXISTS procedure_review JSONB;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'clinical_encounters_procedure_review_status_chk'
    ) THEN
      ALTER TABLE public.clinical_encounters ADD CONSTRAINT clinical_encounters_procedure_review_status_chk
        CHECK (procedure_review IS NULL OR procedure_review->>'status' IN ('draft', 'pending_review', 'signed', 'entered_in_error'));
    END IF;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'clinical_encounters';
  END IF;
END $$;

-- Finding a patient's reviews of one procedure (follow-up comparison) without
-- scanning every encounter's JSON.
DO $$
BEGIN
  IF to_regclass('public.clinical_encounters') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_clinical_encounters_procedure_review_module
      ON public.clinical_encounters ((procedure_review->>'moduleId'))
      WHERE procedure_review IS NOT NULL;
  END IF;
END $$;
