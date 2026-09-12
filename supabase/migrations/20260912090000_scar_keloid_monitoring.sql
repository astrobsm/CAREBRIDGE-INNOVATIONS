-- ============================================================================
-- Scar and keloid longitudinal assessment
-- ----------------------------------------------------------------------------
-- A scar is a persistent clinical entity, not a folder of photographs. One
-- patient may carry several, each with its own baseline, treatments and
-- trajectory, and measurements are never merged across them — hence scar_id on
-- every row rather than a bare patient_id.
--
-- Finalized assessments are immutable. Corrections append to the `corrections`
-- array with the previous value, the new one, who changed it and why; nothing
-- overwrites a recorded clinical value in place.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Scar cases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scar_cases (
  id                        TEXT PRIMARY KEY,
  patient_id                TEXT NOT NULL,
  hospital_id               TEXT,

  label                     TEXT,
  anatomical_site           TEXT,
  laterality                TEXT,

  -- Holds the application's suggestion and the clinician's judgement side by
  -- side. The suggestion is never cleared, so agreement between the two can be
  -- measured later — a module that discards its own disagreements cannot be
  -- evaluated.
  classification            JSONB,

  onset_at                  TIMESTAMPTZ,
  cause_of_scar             TEXT,
  prior_treatments          TEXT,

  -- The original wound, where it is known. Load-bearing for keloids: growth
  -- beyond the original margin is what separates keloid from hypertrophic
  -- scar. Left null when nobody recorded it; never inferred.
  original_wound_area_cm2   NUMERIC,
  original_wound_length_cm  NUMERIC,
  original_wound_source     TEXT,

  status                    TEXT DEFAULT 'active',
  baseline_assessment_id    TEXT,
  created_by                TEXT,

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Assessments
--
-- One visit. `quality` and `completeness_percent` are deliberately separate:
-- a fully populated assessment built on a blurred photograph is 100% complete
-- and unreliable at the same time, and collapsing the two would let a tidy
-- record hide bad measurement.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scar_assessments (
  id                      TEXT PRIMARY KEY,
  scar_id                 TEXT NOT NULL,
  patient_id              TEXT NOT NULL,

  assessed_at             TIMESTAMPTZ,
  is_baseline             BOOLEAN DEFAULT FALSE,
  previous_assessment_id  TEXT,

  -- Captured frames with their quality verdicts and conditions. The original
  -- photograph is preserved; annotated copies are derivatives alongside it.
  images                  JSONB,
  -- Traced boundaries in image pixel space, so an assessment can be reopened
  -- and re-measured from the same outlines.
  regions                 JSONB,

  morphometry             JSONB,
  colour                  JSONB,
  three_d                 JSONB,
  exam                    JSONB,
  patient_reported        JSONB,
  validated_scores        JSONB,

  quality                 TEXT,
  quality_reasons         JSONB,
  completeness_percent    INTEGER,

  status                  TEXT DEFAULT 'draft',
  finalized_by            TEXT,
  finalized_at            TIMESTAMPTZ,
  clinician_notes         TEXT,
  -- Append-only. Each entry carries the previous value, the new one, the
  -- reason, the user and the timestamp.
  corrections             JSONB,

  created_by              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Treatments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scar_treatments (
  id               TEXT PRIMARY KEY,
  scar_id          TEXT NOT NULL,
  patient_id       TEXT NOT NULL,

  kind             TEXT,
  detail           TEXT,
  dose             TEXT,
  route            TEXT,
  session_number   INTEGER,

  administered_at  TIMESTAMPTZ,
  administered_by  TEXT,
  adverse_events   TEXT,
  notes            TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Alerts
--
-- Decision support, not diagnoses. Each carries the measurements that raised
-- it so a clinician can check the reasoning rather than take it on trust, and
-- dismissing a high-priority alert records a reason.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scar_alerts (
  id               TEXT PRIMARY KEY,
  scar_id          TEXT NOT NULL,
  patient_id       TEXT NOT NULL,
  assessment_id    TEXT,

  kind             TEXT,
  priority         TEXT,
  message          TEXT,
  evidence         JSONB,
  disclaimer       TEXT,

  acknowledged_by  TEXT,
  acknowledged_at  TIMESTAMPTZ,
  override_reason  TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- Sync pulls order by updated_at; the rest follow how the UI reads: scars for
-- a patient, then assessments and treatments for a scar in time order.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_scar_cases_updated_at
  ON public.scar_cases(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scar_cases_patient
  ON public.scar_cases(patient_id);

CREATE INDEX IF NOT EXISTS idx_scar_assessments_updated_at
  ON public.scar_assessments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scar_assessments_scar
  ON public.scar_assessments(scar_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_scar_treatments_updated_at
  ON public.scar_treatments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scar_treatments_scar
  ON public.scar_treatments(scar_id, administered_at DESC);

CREATE INDEX IF NOT EXISTS idx_scar_alerts_updated_at
  ON public.scar_alerts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scar_alerts_scar
  ON public.scar_alerts(scar_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row level security
-- Matching the access model the rest of the clinical tables use: the app
-- authenticates, and the anon key reaches these only through it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.scar_cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scar_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scar_treatments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scar_alerts       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['scar_cases', 'scar_assessments', 'scar_treatments', 'scar_alerts']
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
