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
-- in the database — the status vocabularies, that only a consultant's
-- review can approve a plan, that a returned plan and an undone item carry a
-- reason, that the implementation log only follows an approved plan and is
-- never edited afterwards — is enforced here.
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
-- The medical scribe's treatment plans
--
-- A draft built from the record, submitted by the team, approved (with the
-- consultant's edits) or returned with a reason. Approval creates the
-- patient's active treatment_plans row and supersedes the previous plan.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scribe_treatment_plans (
  id                  TEXT PRIMARY KEY,
  patient_id          TEXT NOT NULL,
  hospital_id         TEXT,
  version             INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'pending_approval'
                      CHECK (status IN ('pending_approval', 'approved', 'rejected', 'superseded')),
  plan                JSONB NOT NULL,
  findings            JSONB DEFAULT '[]',
  basis               JSONB DEFAULT '[]',
  generated_by        TEXT,
  generated_by_name   TEXT,
  generated_at        TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by         TEXT,
  reviewed_by_name    TEXT,
  reviewed_by_role    TEXT,
  reviewed_at         TIMESTAMPTZ,
  review_note         TEXT,
  -- The plan as approved, with any lines removed / instructions added.
  approved_plan       JSONB,
  treatment_plan_id   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Only a consultant (or an administrator) approves. A plan that was
  -- approved keeps its approver when it is later superseded.
  CONSTRAINT scribe_plans_approved_by_consultant CHECK (
    approved_plan IS NULL
    OR (reviewed_by IS NOT NULL AND reviewed_by_role IN ('consultant', 'super_admin', 'hospital_admin'))
  ),
  CONSTRAINT scribe_plans_approved_has_plan CHECK (status <> 'approved' OR approved_plan IS NOT NULL),
  -- A returned plan says why.
  CONSTRAINT scribe_plans_rejected_has_reason CHECK (status <> 'rejected' OR COALESCE(TRIM(review_note), '') <> '')
);

-- ---------------------------------------------------------------------------
-- The implementation log of approved plans
--
-- One row per logged step: who (the signed-in user), when (the device's
-- logged_at, and received_at stamped by this database), where (device
-- location with its accuracy, plus the place named), and what — including
-- the prescription or investigation it created and any result.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scribe_plan_actions (
  id               TEXT PRIMARY KEY,
  scribe_plan_id   TEXT NOT NULL,
  patient_id       TEXT NOT NULL,
  item_key         TEXT NOT NULL,
  item_text        TEXT,
  item_kind        TEXT,
  status           TEXT NOT NULL
                   CHECK (status IN ('done', 'partial', 'not_done', 'ordered', 'prescribed', 'result_entered', 'cancelled')),
  note             TEXT,
  prescription     JSONB,
  investigation    JSONB,
  result           JSONB,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  accuracy_m       DOUBLE PRECISION,
  location_label   TEXT,
  location_status  TEXT,
  user_id          TEXT,
  user_name        TEXT,
  user_role        TEXT,
  logged_at        TIMESTAMPTZ NOT NULL,
  received_at      TIMESTAMPTZ DEFAULT NOW(),
  attachments      JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Not done, partly done or cancelled: say why.
  CONSTRAINT scribe_actions_reason_required CHECK (
    status NOT IN ('not_done', 'partial', 'cancelled') OR COALESCE(TRIM(note), '') <> ''
  )
);

CREATE INDEX IF NOT EXISTS idx_scribe_plans_updated_at ON public.scribe_treatment_plans(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_plans_patient    ON public.scribe_treatment_plans(patient_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_plans_pending    ON public.scribe_treatment_plans(status) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_scribe_actions_updated_at ON public.scribe_plan_actions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_actions_plan       ON public.scribe_plan_actions(scribe_plan_id, item_key, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_actions_patient    ON public.scribe_plan_actions(patient_id, logged_at DESC);

-- ---------------------------------------------------------------------------
-- Results photographed, scanned or uploaded with a log entry
--
-- Kept apart from the log so reading the log stays light. Photos are
-- compressed on the device before they are stored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scribe_plan_attachments (
  id           TEXT PRIMARY KEY,
  action_id    TEXT NOT NULL,
  patient_id   TEXT NOT NULL,
  name         TEXT,
  mime         TEXT,
  size_bytes   INTEGER,
  data         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scribe_attachments_updated_at ON public.scribe_plan_attachments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_attachments_action     ON public.scribe_plan_attachments(action_id);

-- ---------------------------------------------------------------------------
-- The log cannot be edited after the fact
--
-- The original stamped who and when on its server. This app logs offline and
-- syncs later, so the device records logged_at and the user from its
-- session, and the database:
--   * refuses a log entry for a plan that was never approved;
--   * stamps received_at with its own clock when the row first arrives;
--   * refuses any later change to who, when, where or what was logged.
-- A sync re-sending an unchanged row passes, because nothing changed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scribe_plan_actions_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.scribe_treatment_plans
       WHERE id = NEW.scribe_plan_id AND approved_plan IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Only an approved plan can be implemented (plan %)', NEW.scribe_plan_id
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.received_at := NOW();
    RETURN NEW;
  END IF;

  IF NEW.scribe_plan_id IS DISTINCT FROM OLD.scribe_plan_id
     OR NEW.patient_id     IS DISTINCT FROM OLD.patient_id
     OR NEW.item_key       IS DISTINCT FROM OLD.item_key
     OR NEW.status         IS DISTINCT FROM OLD.status
     OR NEW.user_id        IS DISTINCT FROM OLD.user_id
     OR NEW.user_name      IS DISTINCT FROM OLD.user_name
     OR NEW.user_role      IS DISTINCT FROM OLD.user_role
     OR NEW.logged_at      IS DISTINCT FROM OLD.logged_at
     OR NEW.latitude       IS DISTINCT FROM OLD.latitude
     OR NEW.longitude      IS DISTINCT FROM OLD.longitude
     OR NEW.accuracy_m     IS DISTINCT FROM OLD.accuracy_m
     OR NEW.location_label IS DISTINCT FROM OLD.location_label THEN
    RAISE EXCEPTION 'A logged implementation step cannot be changed (action %)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.received_at := OLD.received_at;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_scribe_plan_actions_guard ON public.scribe_plan_actions;
CREATE TRIGGER trg_scribe_plan_actions_guard
  BEFORE INSERT OR UPDATE ON public.scribe_plan_actions
  FOR EACH ROW EXECUTE FUNCTION public.scribe_plan_actions_guard();

-- ---------------------------------------------------------------------------
-- Row level security
-- Matching the access model the rest of the clinical tables use: the app
-- authenticates, and the anon key reaches these only through it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinical_problems      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_plan_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scribe_treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scribe_plan_actions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scribe_plan_attachments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clinical_problems', 'clinical_plan_items', 'scribe_treatment_plans', 'scribe_plan_actions', 'scribe_plan_attachments']
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
