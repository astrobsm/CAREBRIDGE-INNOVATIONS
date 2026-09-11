-- ============================================================================
-- Photographic skin graft monitoring
-- ----------------------------------------------------------------------------
-- One episode binds the recipient and donor sites of a single grafting
-- operation. Every assessment is a photograph measured against those sites,
-- carrying the evidence and the provenance that produced its numbers.
--
-- Supersedes skin_graft_records, which is built around a manually typed take
-- percentage and is referenced by no UI. That table is left in place so its
-- rows remain readable; nothing new is written to it.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Episodes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skin_graft_episodes (
  id                  TEXT PRIMARY KEY,
  patient_id          TEXT NOT NULL,
  hospital_id         TEXT,
  surgery_id          TEXT,

  label               TEXT,
  graft_type          TEXT,
  -- Expansion applied at meshing: 1.5 means 1:1.5.
  mesh_ratio          NUMERIC,
  graft_thickness_mm  NUMERIC,

  -- Postoperative day is counted from here.
  grafted_at          TIMESTAMPTZ,
  status              TEXT DEFAULT 'monitoring',

  created_by          TEXT,
  -- Set when migrated from the superseded skin_graft_records.
  source_record_id    TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Sites
--
-- baseline_area_cm2 is the load-bearing column. Graft take is measured against
-- the area recorded when the graft was applied, never against the area in the
-- latest photograph — otherwise a shrinking graft reports full take of its own
-- diminished self. Revising it is an explicit, attributed act, which is why the
-- previous value, who changed it and why are all kept.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.graft_sites (
  id                     TEXT PRIMARY KEY,
  episode_id             TEXT NOT NULL,
  patient_id             TEXT NOT NULL,
  -- 'recipient' or 'donor'.
  kind                   TEXT NOT NULL,

  anatomical_location    TEXT,
  body_side              TEXT,
  label                  TEXT,

  baseline_area_cm2      NUMERIC,
  baseline_assessment_id TEXT,
  baseline_at            TIMESTAMPTZ,
  baseline_revision      JSONB,

  status                 TEXT DEFAULT 'active',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Photographic assessments
--
-- A frame rejected by the quality gate is still stored. Knowing a photograph
-- was taken on POD 5 and could not be measured is clinically meaningful: it is
-- the difference between a gap in monitoring and a gap in the record.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.graft_photo_assessments (
  id                  TEXT PRIMARY KEY,
  episode_id          TEXT NOT NULL,
  site_id             TEXT NOT NULL,
  patient_id          TEXT NOT NULL,
  kind                TEXT,

  captured_at         TIMESTAMPTZ,
  post_op_day         INTEGER,
  assessed_by         TEXT,
  status              TEXT,

  -- Gate verdict and its reasons, present even when the frame failed.
  image_quality       JSONB,
  -- Stored frame: downscaled, with the traced margin drawn on it.
  photo               JSONB,
  -- Clinician-traced rings in image pixel space, so an assessment can be
  -- reopened, adjusted, and re-measured from the same outlines.
  traces              JSONB,

  measurement         JSONB,
  tissue              JSONB,
  graft               JSONB,
  donor               JSONB,

  uncertainty_reasons JSONB,
  -- Model and pipeline versions, so any result can be found and excluded later.
  provenance          JSONB,
  -- Automated values are never overwritten; a correction lives alongside them.
  review              JSONB,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- Sync pulls order by updated_at; the rest follow how the UI actually reads:
-- episodes for a patient, sites for an episode, assessments for a site.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_skin_graft_episodes_updated_at
  ON public.skin_graft_episodes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skin_graft_episodes_patient
  ON public.skin_graft_episodes(patient_id);

CREATE INDEX IF NOT EXISTS idx_graft_sites_updated_at
  ON public.graft_sites(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_graft_sites_episode
  ON public.graft_sites(episode_id);

CREATE INDEX IF NOT EXISTS idx_graft_photo_assessments_updated_at
  ON public.graft_photo_assessments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_graft_photo_assessments_site
  ON public.graft_photo_assessments(site_id, captured_at DESC);

-- ---------------------------------------------------------------------------
-- Row level security
-- Matching the access model the rest of the clinical tables use: the app
-- authenticates, and the anon key reaches these only through it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.skin_graft_episodes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graft_sites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graft_photo_assessments  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'skin_graft_episodes'
       AND policyname = 'skin_graft_episodes_all'
  ) THEN
    CREATE POLICY skin_graft_episodes_all ON public.skin_graft_episodes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'graft_sites'
       AND policyname = 'graft_sites_all'
  ) THEN
    CREATE POLICY graft_sites_all ON public.graft_sites FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'graft_photo_assessments'
       AND policyname = 'graft_photo_assessments_all'
  ) THEN
    CREATE POLICY graft_photo_assessments_all ON public.graft_photo_assessments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
