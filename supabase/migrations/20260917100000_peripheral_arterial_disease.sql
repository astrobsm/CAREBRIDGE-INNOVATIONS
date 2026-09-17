-- ============================================================================
-- Peripheral arterial disease assessment
-- ----------------------------------------------------------------------------
-- Extends the existing limb salvage module rather than replacing it. That
-- module records a WIfI classification the clinician grades by hand; these
-- tables hold the measurements those grades should be derived from — raw arm
-- and ankle pressures, toe pressure, TcPO2, skin perfusion pressure, and
-- per-segment Doppler with its technical quality — and store the computed
-- grades alongside the reason each one was given.
--
-- One assessment belongs to one limb. A patient with bilateral disease has two
-- rows per visit and two independent trajectories; merging them would average a
-- deteriorating leg against a stable one.
--
-- Raw pressures are stored, never only the index. An ABI of 0.62 says nothing
-- about whether the ankle pressure was 60 over a brachial of 97 or 120 over
-- 194, and the WIfI ischaemia grade can be driven by the absolute ankle
-- pressure rather than by the ratio.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pad_assessments (
  id                      TEXT PRIMARY KEY,
  patient_id              TEXT NOT NULL,
  hospital_id             TEXT,
  -- 'left' or 'right'. Never 'bilateral': that is two assessments.
  side                    TEXT NOT NULL,

  assessed_at             TIMESTAMPTZ,
  assessed_by             TEXT,
  is_baseline             BOOLEAN DEFAULT FALSE,
  previous_assessment_id  TEXT,

  -- Holds the suggestion and the clinician's confirmation side by side, so
  -- agreement between the two can be measured later.
  presentation            JSONB,

  -- The six Ps and the findings a Rutherford category rests on. Screened
  -- before the rest of the assessment, because an acutely ischaemic limb has
  -- hours and a questionnaire that must be finished first costs a leg.
  acute_screen            JSONB,

  claudication            JSONB,
  rest_pain               JSONB,
  examination             JSONB,

  -- Pressures as measured, local perfusion records, and the Doppler study with
  -- its technical quality and limitations.
  perfusion               JSONB,

  -- Links to the existing wound module by id rather than duplicating it.
  wound                   JSONB,
  infection               JSONB,

  -- Computed at save and stored, not derived on read: if the thresholds are
  -- reconfigured later, historical assessments keep the grading that was
  -- actually acted on.
  wifi                    JSONB,

  -- Append-only. Each entry records that a clinician disagreed with a computed
  -- classification, and why.
  overrides               JSONB,

  clinician_assessment    TEXT,
  clinician_plan          TEXT,
  reconstruction_plan     TEXT,

  status                  TEXT DEFAULT 'draft',
  finalized_by            TEXT,
  finalized_at            TIMESTAMPTZ,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Interventions
--
-- Kept separate from the assessments so a perfusion change can be read against
-- what was done between the two visits. Knowing a toe pressure rose is of
-- limited use; knowing it rose after an angioplasty is the finding.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vascular_interventions (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT NOT NULL,
  side           TEXT NOT NULL,

  kind           TEXT,
  performed_at   TIMESTAMPTZ,
  indication     TEXT,
  detail         TEXT,
  operator       TEXT,
  complications  TEXT,
  outcome        TEXT,

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- Sync pulls order by updated_at; the rest follow how the UI reads: one
-- patient's limb, in time order.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pad_assessments_updated_at
  ON public.pad_assessments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pad_assessments_patient_side
  ON public.pad_assessments(patient_id, side, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_vascular_interventions_updated_at
  ON public.vascular_interventions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vascular_interventions_patient_side
  ON public.vascular_interventions(patient_id, side, performed_at DESC);

-- ---------------------------------------------------------------------------
-- Row level security
-- Matching the access model the rest of the clinical tables use: the app
-- authenticates, and the anon key reaches these only through it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.pad_assessments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vascular_interventions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pad_assessments', 'vascular_interventions']
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
