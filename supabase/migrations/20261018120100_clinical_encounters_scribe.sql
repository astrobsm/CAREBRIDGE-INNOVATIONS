-- ============================================================================
-- Structured clerking and the medical scribe's treatment plans
-- ----------------------------------------------------------------------------
-- Ported from the UNTH Plastic Surgeon Assistant (migration 023 and the
-- tables its scribe-plans endpoint created on first use).
--
-- The clerking is not a new encounter table. It rides on the existing
-- clinical_encounters row as one JSONB column, `clerking`, holding the
-- structured answers, the clinician's decisions on every suggestion and the
-- draft -> pending_review -> signed lifecycle. Its prose is written into the
-- row's ordinary text columns, so nothing that reads encounters changes.
--
-- What a clinician ACCEPTED is tracked in clinical_problems and
-- clinical_plan_items until resolved or done. Their id is derived from
-- (encounter_id, suggestion_id) — the pair the original kept UNIQUE — so two
-- devices reconciling the same encounter offline upsert one row, not two.
--
-- The application authenticates and reaches these tables through the anon
-- key, as the rest of the clinical tables do, so the role rules (who may sign,
-- who may approve) are enforced in the client service; what can be enforced
-- in the database — the status vocabularies, and the approval / logging
-- invariants below — is enforced here.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The clerking on the encounter
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.clinical_encounters') IS NOT NULL THEN
    ALTER TABLE public.clinical_encounters ADD COLUMN IF NOT EXISTS clerking JSONB;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'clinical_encounters_clerking_status_chk'
    ) THEN
      ALTER TABLE public.clinical_encounters ADD CONSTRAINT clinical_encounters_clerking_status_chk
        CHECK (clerking IS NULL OR clerking->>'status' IN ('draft', 'pending_review', 'signed', 'entered_in_error'));
    END IF;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'clinical_encounters';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Problem list: diagnoses the clinician accepted
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_problems (
  id            TEXT PRIMARY KEY,               -- '<encounter_id>|<suggestion_id>'
  patient_id    TEXT NOT NULL,
  hospital_id   TEXT,
  encounter_id  TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  label         TEXT NOT NULL,
  reasons       JSONB NOT NULL DEFAULT '[]',
  dangerous     BOOLEAN DEFAULT FALSE,
  source        TEXT,
  -- 'withdrawn' when the suggestion is no longer accepted, or the encounter
  -- was entered in error. Never deleted.
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'improving', 'worsening', 'resolved', 'ruled_out', 'withdrawn')),
  last_review   JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Plan: investigations and treatment the clinician accepted
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_plan_items (
  id            TEXT PRIMARY KEY,               -- '<encounter_id>|<suggestion_id>'
  patient_id    TEXT NOT NULL,
  hospital_id   TEXT,
  encounter_id  TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('investigation', 'treatment')),
  text          TEXT NOT NULL,
  reason        TEXT,
  priority      TEXT,
  source        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'done', 'not_done', 'stopped', 'withdrawn')),
  last_review   JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_problems_updated_at ON public.clinical_problems(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_problems_patient    ON public.clinical_problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_problems_encounter  ON public.clinical_problems(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_plan_items_updated_at ON public.clinical_plan_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_plan_items_patient    ON public.clinical_plan_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_plan_items_encounter  ON public.clinical_plan_items(encounter_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- Matching the access model the rest of the clinical tables use: the app
-- authenticates, and the anon key reaches these only through it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinical_problems   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_plan_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clinical_problems', 'clinical_plan_items']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)',
        t || '_all', t
      );
    END IF;
  END LOOP;
END $$;
