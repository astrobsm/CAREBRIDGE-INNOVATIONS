-- ============================================================================
-- Surgical journey: readiness, theatre, follow-up, outcomes, patient pack
--
-- New patient tables (hospital-scoped, class 'patient' in
-- supabase/manual/20261020100000_hospital_scoping.sql):
--   post_op_care_plans     post-operative care plans (Dexie postOpCarePlans,
--                          device-local since Dexie v94)
--   post_op_observations   every field of a post-op monitoring entry
--                          (Dexie postOpObservations)
--   surgical_outcomes      the 30-day (90 with an implant) outcome of one
--                          operation: CDC SSI category, Clavien–Dindo graded
--                          complications, return to theatre, readmission,
--                          VTE, death (Dexie surgicalOutcomes)
-- Existing tables extended (additive):
--   surgeries                 booking approval, conference flag, red-flag
--                             review, readiness override, WHO Surgical Safety
--                             Checklist, CDC wound class, implant flag,
--                             intra-operative record, graded complications,
--                             follow-up plan, patient pack log, day-case
--                             discharge, pre-operative information notes
--   preoperative_assessments  link to the surgery, fitness grade, notes
--   appointments              related_surgery_id (follow-up booking)
--
-- ACCESS
--   Members-only now; when hospital scoping is already on, the scoped policy
--   is created directly, so a new table is never wider than its neighbours.
--   Outcomes: a recorded outcome is never deleted by a client (RESTRICTIVE,
--   named app_* so the RLS lockdown and the scoping keep it); it may be
--   corrected (re-sent upserts are updates).
--
-- Additive and idempotent — safe to run and to re-run. Run by hand in the
-- Supabase SQL editor.
-- ============================================================================

-- ── New patient tables ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_op_care_plans (
  id                        TEXT PRIMARY KEY,
  patient_id                TEXT NOT NULL,
  surgery_id                TEXT NOT NULL,
  hospital_id               TEXT,
  surgery_date              TIMESTAMPTZ,
  surgery_name              TEXT,
  surgeon_id                TEXT,
  surgeon_name              TEXT,
  vital_signs_frequency     TEXT,
  pain_management_protocol  JSONB,
  wound_care_instructions   TEXT,
  mobilization_plan         JSONB,
  diet_progression          JSONB,
  medication_schedule       JSONB,
  drain_management          JSONB,
  catheter_care             JSONB,
  iv_line_management        JSONB,
  special_monitoring        JSONB,
  warning_signs_to_watch    JSONB,
  expected_recovery_milestones JSONB,
  nursing_instructions      TEXT,
  doctor_instructions       TEXT,
  patient_instructions      TEXT,
  status                    TEXT NOT NULL DEFAULT 'active',
  completed_at              TIMESTAMPTZ,
  discontinued_reason       TEXT,
  created_by                TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT post_op_care_plans_status_chk CHECK (status IN ('active', 'completed', 'discontinued'))
);
CREATE INDEX IF NOT EXISTS idx_post_op_care_plans_surgery ON public.post_op_care_plans (surgery_id);
CREATE INDEX IF NOT EXISTS idx_post_op_care_plans_patient ON public.post_op_care_plans (patient_id);
CREATE INDEX IF NOT EXISTS idx_post_op_care_plans_updated ON public.post_op_care_plans (updated_at);

CREATE TABLE IF NOT EXISTS public.post_op_observations (
  id                   TEXT PRIMARY KEY,
  patient_id           TEXT NOT NULL,
  surgery_id           TEXT NOT NULL,
  care_plan_id         TEXT,
  hospital_id          TEXT,
  vital_signs_id       TEXT,
  recorded_at          TIMESTAMPTZ NOT NULL,
  day_post_op          INTEGER,
  hour_post_op         INTEGER,
  shift                TEXT,
  observation          JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_condition    TEXT,
  complication_present BOOLEAN NOT NULL DEFAULT false,
  escalation_required  BOOLEAN NOT NULL DEFAULT false,
  recorded_by          TEXT,
  recorded_by_name     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT post_op_observations_observation_chk CHECK (jsonb_typeof(observation) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_post_op_observations_surgery ON public.post_op_observations (surgery_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_op_observations_updated ON public.post_op_observations (updated_at);

CREATE TABLE IF NOT EXISTS public.surgical_outcomes (
  id                TEXT PRIMARY KEY,
  surgery_id        TEXT NOT NULL,
  patient_id        TEXT NOT NULL,
  hospital_id       TEXT,
  procedure_name    TEXT,
  operation_date    TIMESTAMPTZ NOT NULL,
  window_days       INTEGER NOT NULL DEFAULT 30,
  ssi               TEXT NOT NULL DEFAULT 'none',
  ssi_detected_on   TIMESTAMPTZ,
  complications     JSONB NOT NULL DEFAULT '[]'::jsonb,
  return_to_theatre BOOLEAN NOT NULL DEFAULT false,
  readmission       BOOLEAN NOT NULL DEFAULT false,
  vte               BOOLEAN NOT NULL DEFAULT false,
  death             BOOLEAN NOT NULL DEFAULT false,
  scar_case_id      TEXT,
  notes             TEXT,
  recorded_by       TEXT NOT NULL,
  recorded_by_name  TEXT,
  recorded_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT surgical_outcomes_ssi_chk CHECK (ssi IN ('none', 'superficial_incisional', 'deep_incisional', 'organ_space')),
  CONSTRAINT surgical_outcomes_window_chk CHECK (window_days IN (30, 90)),
  CONSTRAINT surgical_outcomes_complications_chk CHECK (jsonb_typeof(complications) = 'array')
);
-- One outcome per operation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_surgical_outcomes_surgery ON public.surgical_outcomes (surgery_id);
CREATE INDEX IF NOT EXISTS idx_surgical_outcomes_patient ON public.surgical_outcomes (patient_id);
CREATE INDEX IF NOT EXISTS idx_surgical_outcomes_updated ON public.surgical_outcomes (updated_at);

-- ── Existing tables, extended ───────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.surgeries') IS NOT NULL THEN
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS preop_info_notes TEXT;            -- preopInfoNotes
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS booking_approval JSONB;           -- bookingApproval: {at, by, byName}
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS needs_conference BOOLEAN;         -- needsConference
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS conference_completed_at TIMESTAMPTZ;
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS red_flag_review JSONB;            -- redFlagReview
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS readiness_override JSONB;         -- readinessOverride: emergency start
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS who_checklist JSONB;              -- whoChecklist: WHO SSC 2009
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS wound_class TEXT;                 -- woundClass: CDC class I-IV
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS implant_placed BOOLEAN;           -- implantPlaced
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS intra_op_record JSONB;            -- intraOpRecord
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS complication_entries JSONB;       -- complicationEntries (Clavien-Dindo)
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS follow_up_plan JSONB;             -- followUpPlan
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS patient_pack JSONB;               -- patientPack: fasting text + log
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMPTZ;        -- dischargedAt
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS discharge_type TEXT;              -- dischargeType
    ALTER TABLE public.surgeries ADD COLUMN IF NOT EXISTS discharge_summary_id TEXT;        -- dischargeSummaryId
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surgeries_wound_class_chk') THEN
      ALTER TABLE public.surgeries ADD CONSTRAINT surgeries_wound_class_chk
        CHECK (wound_class IS NULL OR wound_class IN ('clean', 'clean_contaminated', 'contaminated', 'dirty'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surgeries_discharge_type_chk') THEN
      ALTER TABLE public.surgeries ADD CONSTRAINT surgeries_discharge_type_chk
        CHECK (discharge_type IS NULL OR discharge_type IN ('day_case', 'admission'));
    END IF;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'surgeries';
  END IF;
  IF to_regclass('public.preoperative_assessments') IS NOT NULL THEN
    ALTER TABLE public.preoperative_assessments ADD COLUMN IF NOT EXISTS hospital_id TEXT;
    ALTER TABLE public.preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_id TEXT;             -- surgeryId
    ALTER TABLE public.preoperative_assessments ADD COLUMN IF NOT EXISTS fitness_grade TEXT;          -- fitnessGrade
    ALTER TABLE public.preoperative_assessments ADD COLUMN IF NOT EXISTS pre_anaesthetic_notes TEXT;  -- preAnaestheticNotes
    ALTER TABLE public.preoperative_assessments ADD COLUMN IF NOT EXISTS airway_notes TEXT;           -- airwayNotes
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'preoperative_assessments_fitness_chk') THEN
      ALTER TABLE public.preoperative_assessments ADD CONSTRAINT preoperative_assessments_fitness_chk
        CHECK (fitness_grade IS NULL OR fitness_grade IN ('fit', 'optimize', 'defer'));
    END IF;
    CREATE INDEX IF NOT EXISTS idx_preoperative_assessments_surgery ON public.preoperative_assessments (surgery_id);
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'preoperative_assessments';
  END IF;
  IF to_regclass('public.appointments') IS NOT NULL THEN
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS related_surgery_id TEXT;    -- relatedSurgeryId
    CREATE INDEX IF NOT EXISTS idx_appointments_related_surgery ON public.appointments (related_surgery_id);
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'appointments';
  END IF;
END $$;

-- ── Row level security: patient tables ──────────────────────────────────────
-- Scoped by patient when hospital scoping is on (the same expression
-- app_private.apply_hospital_scoping() writes for class 'patient'),
-- members-only otherwise. Never open.
DO $$
DECLARE
  t TEXT;
  scoped BOOLEAN := false;
  expr TEXT := 'public.app_can_access_patient(patient_id::text, hospital_id::text)';
BEGIN
  -- The scoping state table only exists once hospital scoping is installed.
  -- Postgres resolves every table a statement names before running it, so it
  -- is read through EXECUTE, and only when it is there.
  IF to_regclass('app_private.access_policy_state') IS NOT NULL
     AND to_regprocedure('public.app_can_access_patient(text,text)') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM app_private.access_policy_state WHERE hospital_scoped IS TRUE)'
      INTO scoped;
  END IF;
  FOREACH t IN ARRAY ARRAY['post_op_care_plans', 'post_op_observations', 'surgical_outcomes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_members_all ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', t);
    IF scoped THEN
      EXECUTE format('CREATE POLICY app_scoped_all ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', t, expr, expr);
    ELSE
      EXECUTE format('CREATE POLICY app_members_all ON public.%I FOR ALL TO authenticated '
                     'USING (public.is_app_member()) WITH CHECK (public.is_app_member())', t);
    END IF;
  END LOOP;
END $$;

-- A recorded outcome is part of the surgeon's audit: no client deletes it
-- (it may be corrected; the sync re-sends rows as upserts).
DROP POLICY IF EXISTS app_surgical_outcomes_no_delete ON public.surgical_outcomes;
CREATE POLICY app_surgical_outcomes_no_delete ON public.surgical_outcomes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- An outcome is recorded by the signed-in person, as themselves.
CREATE OR REPLACE FUNCTION public.app_is_current_user(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.auth_user_id = auth.uid()
       AND u.is_active IS TRUE
       AND u.id::text = p_user_id
  )
$$;
REVOKE ALL ON FUNCTION public.app_is_current_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_is_current_user(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS app_surgical_outcomes_own_insert ON public.surgical_outcomes;
CREATE POLICY app_surgical_outcomes_own_insert ON public.surgical_outcomes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.app_is_current_user(recorded_by));

NOTIFY pgrst, 'reload schema';
