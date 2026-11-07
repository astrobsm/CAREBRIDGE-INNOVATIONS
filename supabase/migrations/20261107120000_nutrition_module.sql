-- ============================================================================
-- Adult clinical nutrition, stage 2: data model
--
-- Patient data (hospital-scoped, like nutrition_assessments):
--   nutrition_measurements   anthropometry series (weight, height, MUAC, ...)
--   nutrition_intake         one patient-day of intake, items + computed kcal/protein
--   nutrition_approvals      sign-off of a nutrition plan version (append-only)
-- Reference data (shared by every hospital):
--   nutrition_foods               food composition (WAFCT 2019 + dietitian additions),
--                                 nutrients per 100 g edible portion embedded as JSONB
--   nutrition_recipes             standard recipes: ingredient codes + raw grams
--   nutrition_household_measures  grams per household measure
-- Existing tables extended (additive): nutrition_assessments (engine output,
-- MUST breakdown), nutrition_plans (version, approval status).
--
-- ACCESS
--   Reference tables: every active member reads; only dietitians and
--   administrators write. The write rule is RESTRICTIVE (AND-ed with any
--   permissive policy), named app_* so the RLS lockdown and the hospital
--   scoping leave it in place when they (re-)create the members policy.
--   Patient tables: members-only now; hospital scoping (class 'patient' in
--   supabase/manual/20261020100000_hospital_scoping.sql) narrows them to the
--   patient's hospitals. When scoping is already on, the scoped policy is
--   created here directly, so a new table is never wider than its neighbours.
--
-- Additive and idempotent — safe to run and to re-run.
-- ============================================================================

-- ── Who may edit nutrition reference data ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.app_is_nutrition_editor()
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
       AND u.role IN ('super_admin', 'hospital_admin', 'dietician', 'dietitian')
  )
$$;
REVOKE ALL ON FUNCTION public.app_is_nutrition_editor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_is_nutrition_editor() TO authenticated, service_role;

-- ── Patient tables ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nutrition_measurements (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL,
  hospital_id     TEXT,
  admission_id    TEXT,
  encounter_id    TEXT,
  measured_at     TIMESTAMPTZ NOT NULL,
  kind            TEXT NOT NULL,
  value           NUMERIC NOT NULL,
  unit            TEXT NOT NULL,
  method          TEXT NOT NULL,
  notes           TEXT,
  recorded_by     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_measurements_kind_chk CHECK (kind IN ('weight', 'height', 'muac', 'calf_circumference', 'knee_height',
    'ulna_length', 'triceps_skinfold', 'subscapular_skinfold', 'grip_strength', 'waist_circumference')),
  CONSTRAINT nutrition_measurements_method_chk CHECK (method IN ('measured', 'bed_scale', 'hoist', 'chair_scale', 'reported', 'estimated')),
  CONSTRAINT nutrition_measurements_value_chk CHECK (value > 0)
);
CREATE INDEX IF NOT EXISTS idx_nutrition_measurements_patient_kind ON public.nutrition_measurements (patient_id, kind, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_measurements_updated ON public.nutrition_measurements (updated_at);

CREATE TABLE IF NOT EXISTS public.nutrition_intake (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL,
  hospital_id     TEXT,
  admission_id    TEXT,
  date            DATE NOT NULL,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals          JSONB,
  kcal            NUMERIC,
  protein_g       NUMERIC,
  recorded_by     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_intake_items_chk CHECK (jsonb_typeof(items) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_nutrition_intake_patient_date ON public.nutrition_intake (patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_intake_updated ON public.nutrition_intake (updated_at);

CREATE TABLE IF NOT EXISTS public.nutrition_approvals (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL,
  hospital_id     TEXT,
  plan_id         TEXT NOT NULL,
  plan_version    INTEGER NOT NULL,
  decision        TEXT NOT NULL,
  reason          TEXT,
  decided_by      TEXT NOT NULL,
  decided_by_name TEXT,
  role            TEXT NOT NULL,
  decided_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_approvals_decision_chk CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  CONSTRAINT nutrition_approvals_reason_chk CHECK (decision = 'approved' OR length(btrim(coalesce(reason, ''))) > 0),
  CONSTRAINT nutrition_approvals_version_chk CHECK (plan_version >= 1)
);
CREATE INDEX IF NOT EXISTS idx_nutrition_approvals_plan ON public.nutrition_approvals (plan_id, plan_version);
CREATE INDEX IF NOT EXISTS idx_nutrition_approvals_updated ON public.nutrition_approvals (updated_at);

-- ── Reference tables ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nutrition_foods (
  id                       TEXT PRIMARY KEY,
  code                     TEXT NOT NULL,
  name                     TEXT NOT NULL,
  local_names              JSONB,
  food_group               TEXT,
  group_code               TEXT,
  scientific_name          TEXT,
  biblio_id                TEXT,
  edible_portion_factor    NUMERIC,
  edible_portion_as_eaten  NUMERIC,
  per100g                  JSONB NOT NULL,
  flags                    JSONB,
  yield_factor             NUMERIC,
  yield_factor_source      TEXT,
  source                   JSONB NOT NULL,
  cost_tier                TEXT,
  seasonality              TEXT,
  availability             JSONB,
  min_portion_g            NUMERIC,
  max_portion_g            NUMERIC,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_foods_cost_tier_chk CHECK (cost_tier IS NULL OR cost_tier IN ('low', 'medium', 'high'))
);
CREATE INDEX IF NOT EXISTS idx_nutrition_foods_code ON public.nutrition_foods (code);
CREATE INDEX IF NOT EXISTS idx_nutrition_foods_updated ON public.nutrition_foods (updated_at);

CREATE TABLE IF NOT EXISTS public.nutrition_recipes (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  local_names           JSONB,
  category              TEXT,
  region                TEXT,
  portion_label         TEXT,
  ingredients           JSONB NOT NULL,
  yield_factor          NUMERIC,
  yield_factor_note     TEXT,
  verification_status   TEXT NOT NULL DEFAULT 'pending_dietitian_verification',
  estimate_note         TEXT,
  verified_by           TEXT,
  verified_at           TIMESTAMPTZ,
  cost_tier             TEXT,
  seasonality           TEXT,
  availability          JSONB,
  min_portion_g         NUMERIC,
  max_portion_g         NUMERIC,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_recipes_status_chk CHECK (verification_status IN ('pending_dietitian_verification', 'verified', 'rejected')),
  CONSTRAINT nutrition_recipes_ingredients_chk CHECK (jsonb_typeof(ingredients) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_updated ON public.nutrition_recipes (updated_at);

CREATE TABLE IF NOT EXISTS public.nutrition_household_measures (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  local_name            TEXT,
  applies_to            TEXT NOT NULL,
  grams                 NUMERIC NOT NULL,
  grams_range           JSONB,
  verification_status   TEXT NOT NULL DEFAULT 'to_be_verified_by_local_weighing',
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_household_measures_grams_chk CHECK (grams > 0),
  CONSTRAINT nutrition_household_measures_status_chk CHECK (verification_status IN ('to_be_verified_by_local_weighing', 'verified'))
);
CREATE INDEX IF NOT EXISTS idx_nutrition_household_measures_updated ON public.nutrition_household_measures (updated_at);

-- ── Existing tables, extended ───────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.nutrition_assessments') IS NOT NULL THEN
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS admission_id TEXT;
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS must_breakdown JSONB;       -- mustBreakdown: MUSTScore
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS must_score_legacy JSONB;    -- mustScoreLegacy: unparsed old value
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS sga_source TEXT;           -- sgaSource
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS engine JSONB;              -- engine: full traceable engine output
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS engine_method TEXT;
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS config_version TEXT;
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS validation_status TEXT;
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'nutrition_assessments';
  END IF;
  IF to_regclass('public.nutrition_plans') IS NOT NULL THEN
    ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS version INTEGER;                 -- planVersion approvals refer to
    ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS approval_status TEXT;
  ELSE
    RAISE NOTICE 'skipped %: table not present', 'nutrition_plans';
  END IF;
END $$;

-- ── Row level security: reference tables ────────────────────────────────────
ALTER TABLE public.nutrition_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_household_measures ENABLE ROW LEVEL SECURITY;

-- Members read (and, subject to the restrictive rules below, write).
DROP POLICY IF EXISTS app_members_all ON public.nutrition_foods;
CREATE POLICY app_members_all ON public.nutrition_foods FOR ALL TO authenticated
  USING (public.is_app_member()) WITH CHECK (public.is_app_member());
DROP POLICY IF EXISTS app_members_all ON public.nutrition_recipes;
CREATE POLICY app_members_all ON public.nutrition_recipes FOR ALL TO authenticated
  USING (public.is_app_member()) WITH CHECK (public.is_app_member());
DROP POLICY IF EXISTS app_members_all ON public.nutrition_household_measures;
CREATE POLICY app_members_all ON public.nutrition_household_measures FOR ALL TO authenticated
  USING (public.is_app_member()) WITH CHECK (public.is_app_member());

-- Only dietitians and administrators write reference data.
DROP POLICY IF EXISTS app_nutrition_ref_insert ON public.nutrition_foods;
CREATE POLICY app_nutrition_ref_insert ON public.nutrition_foods AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.app_is_nutrition_editor());
DROP POLICY IF EXISTS app_nutrition_ref_update ON public.nutrition_foods;
CREATE POLICY app_nutrition_ref_update ON public.nutrition_foods AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.app_is_nutrition_editor()) WITH CHECK (public.app_is_nutrition_editor());
DROP POLICY IF EXISTS app_nutrition_ref_delete ON public.nutrition_foods;
CREATE POLICY app_nutrition_ref_delete ON public.nutrition_foods AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.app_is_nutrition_editor());

DROP POLICY IF EXISTS app_nutrition_ref_insert ON public.nutrition_recipes;
CREATE POLICY app_nutrition_ref_insert ON public.nutrition_recipes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.app_is_nutrition_editor());
DROP POLICY IF EXISTS app_nutrition_ref_update ON public.nutrition_recipes;
CREATE POLICY app_nutrition_ref_update ON public.nutrition_recipes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.app_is_nutrition_editor()) WITH CHECK (public.app_is_nutrition_editor());
DROP POLICY IF EXISTS app_nutrition_ref_delete ON public.nutrition_recipes;
CREATE POLICY app_nutrition_ref_delete ON public.nutrition_recipes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.app_is_nutrition_editor());

DROP POLICY IF EXISTS app_nutrition_ref_insert ON public.nutrition_household_measures;
CREATE POLICY app_nutrition_ref_insert ON public.nutrition_household_measures AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.app_is_nutrition_editor());
DROP POLICY IF EXISTS app_nutrition_ref_update ON public.nutrition_household_measures;
CREATE POLICY app_nutrition_ref_update ON public.nutrition_household_measures AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.app_is_nutrition_editor()) WITH CHECK (public.app_is_nutrition_editor());
DROP POLICY IF EXISTS app_nutrition_ref_delete ON public.nutrition_household_measures;
CREATE POLICY app_nutrition_ref_delete ON public.nutrition_household_measures AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.app_is_nutrition_editor());

-- ── Row level security: patient tables ──────────────────────────────────────
-- Scoped by patient when hospital scoping is on (the same expression
-- app_private.apply_hospital_scoping() writes for class 'patient'),
-- members-only otherwise. Never open.
DO $$
DECLARE
  t TEXT;
  scoped BOOLEAN := to_regclass('app_private.access_policy_state') IS NOT NULL
    AND to_regprocedure('public.app_can_access_patient(text,text)') IS NOT NULL
    AND EXISTS (SELECT 1 FROM app_private.access_policy_state WHERE hospital_scoped IS TRUE);
  expr TEXT := 'public.app_can_access_patient(patient_id::text, hospital_id::text)';
BEGIN
  FOREACH t IN ARRAY ARRAY['nutrition_measurements', 'nutrition_intake', 'nutrition_approvals'] LOOP
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

-- Approvals are append-only: a decision is never rewritten or removed by a
-- client. The sync re-sends rows as upserts, so an UPDATE that changes
-- nothing that matters is allowed; changing the decision itself is refused.
CREATE OR REPLACE FUNCTION public.app_nutrition_approval_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.plan_version IS DISTINCT FROM OLD.plan_version
     OR NEW.decision IS DISTINCT FROM OLD.decision
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
    RAISE EXCEPTION 'nutrition_approvals is append-only: record a new decision instead of changing %', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS nutrition_approvals_immutable ON public.nutrition_approvals;
CREATE TRIGGER nutrition_approvals_immutable BEFORE UPDATE ON public.nutrition_approvals
  FOR EACH ROW EXECUTE FUNCTION public.app_nutrition_approval_immutable();

DROP POLICY IF EXISTS app_nutrition_approvals_no_delete ON public.nutrition_approvals;
CREATE POLICY app_nutrition_approvals_no_delete ON public.nutrition_approvals AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- An approval is recorded by the signed-in person, under their own role, and
-- only a dietician or a doctor may record one: no one can approve "as"
-- somebody else or as a role they do not hold.
CREATE OR REPLACE FUNCTION public.app_is_own_nutrition_decision(p_decided_by TEXT, p_role TEXT)
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
       AND u.id::text = p_decided_by
       AND u.role = p_role
       AND u.role IN ('dietician', 'dietitian', 'consultant', 'senior_registrar', 'registrar',
                      'medical_officer', 'doctor', 'surgeon', 'plastic_surgeon',
                      'hospital_admin', 'super_admin')
  )
$$;
REVOKE ALL ON FUNCTION public.app_is_own_nutrition_decision(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_is_own_nutrition_decision(TEXT, TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS app_nutrition_approvals_own_insert ON public.nutrition_approvals;
CREATE POLICY app_nutrition_approvals_own_insert ON public.nutrition_approvals AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.app_is_own_nutrition_decision(decided_by, role));

NOTIFY pgrst, 'reload schema';
