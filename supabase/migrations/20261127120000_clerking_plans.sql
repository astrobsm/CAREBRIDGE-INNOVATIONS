-- ============================================================================
-- Clerking treatment plan (stage 5)
--
-- New patient table (hospital-scoped, class 'patient' in
-- supabase/manual/20261020100000_hospital_scoping.sql):
--   clerking_plans   one treatment plan built while a patient is clerked
--                    (Dexie clerkingPlans): the clerking snapshot it was
--                    built from, the rules plan, Claude's draft, the
--                    clinician's line decisions, results, interpretation,
--                    approvals (versions), shares and booked follow-up.
--                    Linked to clinical_encounters by encounter_id; kept off
--                    the encounter row because a signed encounter is
--                    read-only while the plan keeps changing.
--
-- ACCESS
--   Members-only now; when hospital scoping is already on, the scoped policy
--   is created directly, so a new table is never wider than its neighbours.
--   An approved plan is part of the clinical record: no client deletes it
--   (RESTRICTIVE, named app_* so the RLS lockdown and the scoping keep it).
--
-- Additive and idempotent — safe to run and to re-run. Run by hand in the
-- Supabase SQL editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clerking_plans (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT NOT NULL,
  hospital_id      TEXT,
  encounter_id     TEXT,
  source           TEXT NOT NULL DEFAULT 'initial',
  status           TEXT NOT NULL DEFAULT 'draft',
  plan_version     INTEGER NOT NULL DEFAULT 0,
  conditions       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- conditions [{id, label, aiDrafted}]
  clerking         JSONB NOT NULL DEFAULT '{}'::jsonb,   -- ClerkingData snapshot
  ctx              JSONB NOT NULL DEFAULT '{}'::jsonb,   -- age (years / months), sex
  condition_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- conditionIds chosen in the plan panel
  wound_protocol   BOOLEAN,                              -- woundProtocol override (null = automatic)
  rules_plan       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- rulesPlan snapshot
  ai_draft         JSONB,                                -- aiDraft: Claude's plan and its lines
  decisions        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- per-line accept / reject / edit
  manual_lines     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- manualLines
  results          JSONB NOT NULL DEFAULT '[]'::jsonb,   -- entered / scanned results
  interpretation   JSONB,                                -- deterministic + Claude interpretation
  approvals        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- approved versions
  shares           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- PDFs shared / downloaded
  appointments     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- follow-up booked from the plan
  created_by       TEXT NOT NULL,
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clerking_plans_status_chk CHECK (status IN ('draft', 'approved')),
  CONSTRAINT clerking_plans_source_chk CHECK (source IN ('initial', 'follow_up', 'wound_review')),
  CONSTRAINT clerking_plans_version_chk CHECK (plan_version >= 0),
  CONSTRAINT clerking_plans_approved_chk CHECK (status <> 'approved' OR plan_version >= 1),
  CONSTRAINT clerking_plans_arrays_chk CHECK (
    jsonb_typeof(conditions) = 'array' AND jsonb_typeof(condition_ids) = 'array' AND jsonb_typeof(decisions) = 'array'
    AND jsonb_typeof(manual_lines) = 'array' AND jsonb_typeof(results) = 'array' AND jsonb_typeof(approvals) = 'array'
    AND jsonb_typeof(shares) = 'array' AND jsonb_typeof(appointments) = 'array'),
  CONSTRAINT clerking_plans_objects_chk CHECK (jsonb_typeof(clerking) = 'object' AND jsonb_typeof(ctx) = 'object' AND jsonb_typeof(rules_plan) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_clerking_plans_patient ON public.clerking_plans (patient_id);
CREATE INDEX IF NOT EXISTS idx_clerking_plans_encounter ON public.clerking_plans (encounter_id);
CREATE INDEX IF NOT EXISTS idx_clerking_plans_updated ON public.clerking_plans (updated_at);

-- ── Row level security ──────────────────────────────────────────────────────
-- Scoped by patient when hospital scoping is on (the same expression
-- app_private.apply_hospital_scoping() writes for class 'patient'),
-- members-only otherwise. Never open.
DO $$
DECLARE
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
  EXECUTE 'ALTER TABLE public.clerking_plans ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS app_members_all ON public.clerking_plans';
  EXECUTE 'DROP POLICY IF EXISTS app_scoped_all ON public.clerking_plans';
  IF scoped THEN
    EXECUTE format('CREATE POLICY app_scoped_all ON public.clerking_plans FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', expr, expr);
  ELSE
    EXECUTE 'CREATE POLICY app_members_all ON public.clerking_plans FOR ALL TO authenticated '
            'USING (public.is_app_member()) WITH CHECK (public.is_app_member())';
  END IF;
END $$;

-- An approved plan is part of the clinical record: no client deletes it
-- (a draft may be discarded).
DROP POLICY IF EXISTS app_clerking_plans_no_delete_approved ON public.clerking_plans;
CREATE POLICY app_clerking_plans_no_delete_approved ON public.clerking_plans AS RESTRICTIVE FOR DELETE TO authenticated
  USING (status IS DISTINCT FROM 'approved');

-- An approved plan is never turned back into a draft (re-approval adds a version).
DROP POLICY IF EXISTS app_clerking_plans_stay_approved ON public.clerking_plans;
CREATE POLICY app_clerking_plans_stay_approved ON public.clerking_plans AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_app_member()) WITH CHECK (status = 'approved' OR plan_version = 0);

NOTIFY pgrst, 'reload schema';
