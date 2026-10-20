-- =============================================================================
-- HOSPITAL SCOPING — apply BY HAND, after the RLS lockdown is in force.
-- =============================================================================
-- NOT in supabase/migrations on purpose (that folder is applied to production
-- on every push to main). Apply from the Supabase SQL editor when
-- docs/AUTH_ROLLOUT.md says so — `node scripts/rollout.mjs`, step "Limit staff
-- to their own hospitals", copies it for you.
-- Undo: 20261020100000_hospital_scoping_rollback.sql (back to the members-only
-- lockdown, exactly).
--
-- Before: every active signed-in member reads and writes every hospital's data
-- (supabase/manual/20261019100000_rls_lockdown.sql).
-- After:  a member reads and writes only what involves one of THEIR hospitals.
--
-- WHO BELONGS WHERE
--   users.hospital_id always counts, plus any extra hospital granted in
--   public.user_hospitals (User Management -> Hospitals; written only by
--   /api/admin-users with the service role — no member can write that table).
--   A super_admin sees everything.
--
-- THE ACCESS RULE — public.app_can_access_patient(patient_id, row_hospital_id)
--   A member may access a patient when ANY of these holds:
--     1. the patient's registered_hospital_id is one of their hospitals;
--     2. the patient has no registered hospital (NULL, '' or 'global': legacy
--        rows, visible to every member as before — count them with the query at
--        the end of this file);
--     3. the patient has a visit recorded at one of their hospitals
--        (VISIT links below: encounters, admissions, surgeries, the assessments
--        that record where the visit happened);
--     4. an active cross-hospital workflow involves one of their hospitals or
--        them personally (CROSS links below: pending/accepted referrals from
--        or to the hospital or to them; MDT meetings discussed there or
--        organised by them; open tumour board cases held there; external
--        reviews for the hospital; appointments booked there or with them;
--        admissions where they are the primary doctor or nurse; active staff
--        assignments to them; video conferences they host or join).
--   A row that names no patient (or a patient not in the table) falls back to
--   its own hospital_id, and with no hospital either, to members-only.
--
-- EVERY PUBLIC TABLE IS CLASSIFIED, EXPLICITLY (list below). The script stops
-- with the names of any table that is not — a new table must be classified
-- here before scoping can be (re)applied. Classes:
--   patients       the patients table itself
--   patient        has patient_id: follows the patient (fallback: hospital_col)
--   hospital       has only hospital_id: follows the hospital
--   parent         neither, but belongs to a parent row (admission notes ->
--                  admissions): follows the parent
--   members        reference / shared data: stays members-only (unchanged)
--   users          own policies: members read the users of their hospitals,
--                  administrators, unassigned accounts and themselves
--   user_hospitals own policies: read by the member and administrators,
--                  written only by the service role
--   service_only   no client access at all (app_secrets; the push log, queue
--                  and notification log, which only the edge function uses).
--                  Every permissive policy goes; RESTRICTIVE ones stay, so
--                  20261020110000_security_hardening.sql's app_server_only
--                  policies survive every re-apply.
--   lockdown_own   keeps the lockdown's own policies (public booking table)
-- family_* tables are not touched (the family app has its own rules).
--
-- RE-APPLYING THE LOCKDOWN NEVER WIDENS THIS: the lockdown re-creates
-- members-wide policies, then — while app_private.access_policy_state says
-- hospital_scoped — calls app_private.apply_hospital_scoping() in the same
-- transaction, which drops them again. `node scripts/db-sql.mjs
-- --with-lockdown --with-scoping` re-applies both after the migrations.
--
-- Idempotent and one transaction: run it again whenever a table is added.
-- =============================================================================

BEGIN;

-- ── Preconditions ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('public.is_app_member()') IS NULL
     OR to_regprocedure('public.is_app_super_admin()') IS NULL
     OR to_regprocedure('public.app_user_id()') IS NULL THEN
    RAISE EXCEPTION 'Apply supabase/migrations/20261019090000_auth_accounts.sql first.';
  END IF;
  IF to_regclass('app_private.rls_lockdown_state') IS NULL
     OR NOT EXISTS (SELECT 1 FROM app_private.rls_lockdown_state WHERE in_force IS TRUE) THEN
    RAISE EXCEPTION 'The RLS lockdown is not in force here. Apply supabase/manual/20261019100000_rls_lockdown.sql first: hospital scoping replaces its members-only policies.';
  END IF;
  IF to_regclass('public.patients') IS NULL OR to_regclass('public.users') IS NULL
     OR to_regclass('public.hospitals') IS NULL THEN
    RAISE EXCEPTION 'patients, users and hospitals must exist.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
     WHERE role = 'super_admin' AND is_active IS TRUE AND auth_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'No active super_admin is linked to a Supabase Auth account. Without one nobody could see every hospital or grant hospitals afterwards.';
  END IF;
END $$;

-- ── Private bookkeeping (not exposed through the API) ───────────────────────
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- Whether hospital scoping is in force. The lockdown reads it.
CREATE TABLE IF NOT EXISTS app_private.access_policy_state (
  id              BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  hospital_scoped BOOLEAN NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policies this script dropped (other than the lockdown's own), for the rollback.
CREATE TABLE IF NOT EXISTS app_private.hospital_scoping_policies (
  tablename   TEXT NOT NULL,
  policyname  TEXT NOT NULL,
  permissive  TEXT NOT NULL,
  roles       TEXT[] NOT NULL,
  cmd         TEXT NOT NULL,
  qual        TEXT,
  with_check  TEXT,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tablename, policyname)
);

-- Views changed so they stop bypassing row security, for the rollback.
CREATE TABLE IF NOT EXISTS app_private.hospital_scoping_views (
  viewname    TEXT PRIMARY KEY,
  change      TEXT NOT NULL CHECK (change IN ('security_invoker', 'revoked')),
  reloptions  TEXT[],
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── The classification: every public table, explicitly ──────────────────────
CREATE TABLE IF NOT EXISTS app_private.hospital_scoping_classes (
  tablename     TEXT PRIMARY KEY,
  class         TEXT NOT NULL CHECK (class IN (
                  'patients', 'patient', 'hospital', 'parent', 'members',
                  'users', 'user_hospitals', 'service_only', 'lockdown_own')),
  patient_col   TEXT,
  hospital_col  TEXT,
  parent_col    TEXT,
  parent_table  TEXT
);
TRUNCATE app_private.hospital_scoping_classes;
INSERT INTO app_private.hospital_scoping_classes (tablename, class, patient_col, hospital_col, parent_col, parent_table) VALUES
  -- tablename                          class            patient_col   hospital_col   parent_col           parent_table
  -- core
  ('patients',                          'patients',      NULL,         'registered_hospital_id', NULL,     NULL),
  ('users',                             'users',         NULL,         'hospital_id', NULL,                NULL),
  ('user_hospitals',                    'user_hospitals', NULL,        'hospital_id', NULL,                NULL),
  ('hospitals',                         'members',       NULL,         NULL,          NULL,                NULL),
  -- clinical
  ('vital_signs',                       'patient',       'patient_id', NULL,          NULL,                NULL),
  ('clinical_encounters',               'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('surgeries',                         'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('wounds',                            'patient',       'patient_id', NULL,          NULL,                NULL),
  ('burn_assessments',                  'patient',       'patient_id', NULL,          NULL,                NULL),
  ('lab_requests',                      'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('prescriptions',                     'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('nutrition_assessments',             'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('nutrition_plans',                   'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('invoices',                          'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('admissions',                        'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('admission_notes',                   'parent',        NULL,         NULL,          'admission_id',      'admissions'),
  ('bed_assignments',                   'parent',        NULL,         NULL,          'admission_id',      'admissions'),
  ('treatment_plans',                   'patient',       'patient_id', NULL,          NULL,                NULL),
  ('treatment_progress',                'parent',        NULL,         NULL,          'treatment_plan_id', 'treatment_plans'),
  ('treatment_sessions',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('treatment_reminders',               'patient',       'patient_id', NULL,          NULL,                NULL),
  ('treatment_voice_notes',             'patient',       'patient_id', NULL,          NULL,                NULL),
  ('ward_rounds',                       'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('doctor_assignments',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('nurse_assignments',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('investigations',                    'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('discharge_summaries',               'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('consumable_boms',                   'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('histopathology_requests',           'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('blood_transfusions',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('mdt_meetings',                      'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('limb_salvage_assessments',          'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('burn_monitoring_records',           'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('escharotomy_records',               'patient',       'patient_id', NULL,          NULL,                NULL),
  ('skin_graft_records',                'patient',       'patient_id', NULL,          NULL,                NULL),
  ('burn_care_plans',                   'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('appointments',                      'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('appointment_reminders',             'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('appointment_slots',                 'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('clinic_sessions',                   'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('npwt_sessions',                     'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('npwt_notifications',                'patient',       'patient_id', NULL,          NULL,                NULL),
  ('medication_charts',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('nurse_patient_assignments',         'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('transfusion_orders',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('transfusion_monitoring_charts',     'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('staff_patient_assignments',         'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('activity_billing_records',          'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('post_operative_notes',              'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('preoperative_assessments',          'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('external_reviews',                  'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('referrals',                         'patient',       'patient_id', 'from_hospital_id', NULL,           NULL),
  ('patient_education_records',         'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('calculator_results',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('meeting_minutes',                   'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('substance_use_assessments',         'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('detox_monitoring_records',          'patient',       'patient_id', NULL,          NULL,                NULL),
  ('detox_follow_ups',                  'patient',       'patient_id', NULL,          NULL,                NULL),
  ('substance_use_consents',            'parent',        NULL,         NULL,          'assessment_id',     'substance_use_assessments'),
  ('substance_use_clinical_summaries',  'patient',       'patient_id', NULL,          NULL,                NULL),
  ('clinical_comments',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('investigation_approval_logs',       'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('keloid_care_plans',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('scanned_documents',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('monitored_wounds',                  'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('wound_assessments',                 'patient',       'patient_id', NULL,          NULL,                NULL),
  ('tumour_board_cases',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('tumour_board_assessments',          'patient',       'patient_id', NULL,          NULL,                NULL),
  ('tumour_board_plans',                'patient',       'patient_id', NULL,          NULL,                NULL),
  ('tumour_board_referrals',            'patient',       'patient_id', NULL,          NULL,                NULL),
  ('tumour_board_surveillance',         'patient',       'patient_id', NULL,          NULL,                NULL),
  ('clinician_analyses',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('sti_assessments',                   'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('sti_debridement_records',           'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('lymphedema_assessments',            'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('lymphedema_monitoring_records',     'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('post_op_lymphedema_monitoring',     'patient',       'patient_id', NULL,          NULL,                NULL),
  ('wound_measurements',                'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('investigation_request_bundles',     'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('skin_graft_episodes',               'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('graft_sites',                       'patient',       'patient_id', NULL,          NULL,                NULL),
  ('graft_photo_assessments',           'patient',       'patient_id', NULL,          NULL,                NULL),
  ('scar_cases',                        'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('scar_assessments',                  'patient',       'patient_id', NULL,          NULL,                NULL),
  ('scar_treatments',                   'patient',       'patient_id', NULL,          NULL,                NULL),
  ('scar_alerts',                       'patient',       'patient_id', NULL,          NULL,                NULL),
  ('pad_assessments',                   'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('vascular_interventions',            'patient',       'patient_id', NULL,          NULL,                NULL),
  ('clinical_problems',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('clinical_plan_items',               'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('scribe_treatment_plans',            'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  ('scribe_plan_actions',               'patient',       'patient_id', NULL,          NULL,                NULL),
  ('scribe_plan_attachments',           'patient',       'patient_id', NULL,          NULL,                NULL),
  ('video_conferences',                 'patient',       'patient_id', 'hospital_id', NULL,                NULL),
  -- hospital-run records with no patient
  ('enhanced_video_conferences',        'members',       NULL,         NULL,          NULL,                NULL),
  ('payroll_periods',                   'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('staff_payroll_records',             'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('payslips',                          'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('hospital_settings',                 'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_buckets',                   'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_income',                    'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_transactions',              'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_expenses',                  'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_projects',                  'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_investments',               'hospital',      NULL,         'hospital_id', NULL,                NULL),
  ('finance_audit_logs',                'hospital',      NULL,         'hospital_id', NULL,                NULL),
  -- reference and shared data: members-only, as under the lockdown
  ('chat_rooms',                        'members',       NULL,         NULL,          NULL,                NULL),
  ('chat_messages',                     'members',       NULL,         NULL,          NULL,                NULL),
  ('audit_logs',                        'members',       NULL,         NULL,          NULL,                NULL),
  ('sync_status',                       'members',       NULL,         NULL,          NULL,                NULL),
  ('user_settings',                     'members',       NULL,         NULL,          NULL,                NULL),
  ('notification_logs',                 'service_only',  NULL,         NULL,          NULL,                NULL),
  ('push_notification_log',             'service_only',  NULL,         NULL,          NULL,                NULL),
  ('push_notification_queue',           'service_only',  NULL,         NULL,          NULL,                NULL),
  ('push_subscriptions',                'members',       NULL,         NULL,          NULL,                NULL),
  ('rtc_signaling',                     'members',       NULL,         NULL,          NULL,                NULL),
  -- special
  ('public_clinic_bookings',            'lockdown_own',  NULL,         NULL,          NULL,                NULL),
  ('app_secrets',                       'service_only',  NULL,         NULL,          NULL,                NULL);

-- ── Links that make a patient visible beyond their registered hospital ──────
-- kind 'visit': a record of care AT a hospital (the hospital column says where).
-- kind 'cross': a cross-hospital workflow; hospital_cols name the hospitals
-- involved, user_cols the people involved, active_sql says when it still counts
-- (alias x; applied only when every column it names exists).
CREATE TABLE IF NOT EXISTS app_private.hospital_scoping_links (
  tablename    TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('visit', 'cross')),
  patient_col  TEXT NOT NULL,
  hospital_cols TEXT[] NOT NULL DEFAULT '{}',
  user_cols    TEXT[] NOT NULL DEFAULT '{}',
  active_sql   TEXT,
  active_cols  TEXT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (tablename, kind)
);
TRUNCATE app_private.hospital_scoping_links;
INSERT INTO app_private.hospital_scoping_links (tablename, kind, patient_col, hospital_cols, user_cols, active_sql, active_cols) VALUES
  -- Where the visit happened (commit c1ae8ac: each encounter carries its own hospital).
  ('clinical_encounters', 'visit', 'patient_id', ARRAY['hospital_id'], '{}', NULL, '{}'),
  ('admissions',          'visit', 'patient_id', ARRAY['hospital_id'], '{}', NULL, '{}'),
  ('surgeries',           'visit', 'patient_id', ARRAY['hospital_id'], '{}', NULL, '{}'),
  ('scar_cases',          'visit', 'patient_id', ARRAY['hospital_id'], '{}', NULL, '{}'),
  ('skin_graft_episodes', 'visit', 'patient_id', ARRAY['hospital_id'], '{}', NULL, '{}'),
  ('pad_assessments',     'visit', 'patient_id', ARRAY['hospital_id'], '{}', NULL, '{}'),
  -- Referrals (ReferralStatus: pending | accepted | declined | completed |
  -- cancelled): the referring and receiving hospitals, the specialist referred
  -- to, the referrer and whoever accepted it, while pending or accepted. Once
  -- the receiving hospital has seen the patient its own encounters keep access.
  ('referrals',           'cross', 'patient_id', ARRAY['from_hospital_id', 'to_hospital_id'],
                                   ARRAY['to_specialist_id', 'referred_by', 'accepted_by'],
                                   $q$coalesce(x.status::text, 'pending') IN ('pending', 'accepted')$q$, ARRAY['status']),
  -- Admissions: the admitting hospital is a visit (above); the primary doctor
  -- and nurse may be picked from another hospital.
  ('admissions',          'cross', 'patient_id', '{}', ARRAY['primary_doctor', 'primary_nurse'],
                                   NULL, '{}'),
  -- MDT meetings: the hospital it is discussed at ("Discussed at") and its
  -- organiser, unless cancelled. (attendees: JSON link below.)
  ('mdt_meetings',        'cross', 'patient_id', ARRAY['hospital_id'], ARRAY['created_by', 'recorded_by'],
                                   $q$coalesce(x.status::text, '') <> 'cancelled'$q$, ARRAY['status']),
  -- Tumour board: the hospital the case is held at and its creator, until closed.
  ('tumour_board_cases',  'cross', 'patient_id', ARRAY['hospital_id'], ARRAY['created_by'],
                                   $q$coalesce(x.status::text, '') <> 'closed'$q$, ARRAY['status']),
  -- External reviews (consults by an administrator): the hospital the review
  -- is for and its author.
  ('external_reviews',    'cross', 'patient_id', ARRAY['hospital_id'], ARRAY['created_by'],
                                   NULL, '{}'),
  -- Appointments, which may be booked at another hospital or with a clinician
  -- from one, unless cancelled.
  ('appointments',        'cross', 'patient_id', ARRAY['hospital_id'], ARRAY['clinician_id'],
                                   $q$coalesce(x.status::text, '') NOT IN ('cancelled', 'no_show')$q$, ARRAY['status']),
  -- Staff assigned to a patient (possibly from another hospital, to cover).
  ('staff_patient_assignments', 'cross', 'patient_id', '{}', ARRAY['staff_id'],
                                   $q$coalesce(x.is_active, true)$q$, ARRAY['is_active']),
  ('doctor_assignments',  'cross', 'patient_id', '{}', ARRAY['doctor_id'],
                                   $q$coalesce(x.status::text, 'active') = 'active'$q$, ARRAY['status']),
  ('nurse_assignments',   'cross', 'patient_id', '{}', ARRAY['nurse_id'],
                                   $q$coalesce(x.status::text, 'active') = 'active'$q$, ARRAY['status']),
  ('nurse_patient_assignments', 'cross', 'patient_id', '{}', ARRAY['nurse_id'],
                                   NULL, '{}'),
  -- Video conferences about a patient: the host (participants: JSON below).
  ('video_conferences',   'cross', 'patient_id', ARRAY['hospital_id'], ARRAY['host_id'],
                                   $q$coalesce(x.status::text, '') <> 'cancelled'$q$, ARRAY['status']);

-- JSON participant lists that name people involved (checked with @>).
CREATE TABLE IF NOT EXISTS app_private.hospital_scoping_json_links (
  tablename   TEXT NOT NULL,
  patient_col TEXT NOT NULL,
  json_col    TEXT NOT NULL,
  user_key    TEXT NOT NULL,
  PRIMARY KEY (tablename, json_col)
);
TRUNCATE app_private.hospital_scoping_json_links;
INSERT INTO app_private.hospital_scoping_json_links (tablename, patient_col, json_col, user_key) VALUES
  ('mdt_meetings',      'patient_id', 'attendees',    'userId'),
  ('video_conferences', 'patient_id', 'participants', 'userId');

-- ── Extra hospitals per user ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_hospitals (
  user_id     TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  granted_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hospital_id)
);
CREATE INDEX IF NOT EXISTS idx_user_hospitals_hospital ON public.user_hospitals (hospital_id);
COMMENT ON TABLE public.user_hospitals IS
  'Hospitals a user belongs to IN ADDITION to users.hospital_id. Written only by /api/admin-users (service role); see supabase/manual/20261020100000_hospital_scoping.sql.';
ALTER TABLE public.user_hospitals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_hospitals FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_hospitals FROM authenticated;
GRANT SELECT ON public.user_hospitals TO authenticated;
GRANT ALL ON public.user_hospitals TO service_role;

-- ── Helpers (SECURITY DEFINER: policies call them without recursing) ────────

-- Every hospital the caller belongs to: users.hospital_id plus user_hospitals.
CREATE OR REPLACE FUNCTION public.app_user_hospital_ids()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT h), '{}'::TEXT[])
    FROM (
      SELECT btrim(u.hospital_id::text) AS h
        FROM public.users u
       WHERE u.auth_user_id = auth.uid() AND u.is_active IS TRUE
      UNION
      SELECT btrim(uh.hospital_id)
        FROM public.user_hospitals uh
        JOIN public.users u ON u.id::text = uh.user_id
       WHERE u.auth_user_id = auth.uid() AND u.is_active IS TRUE
    ) s
   WHERE h IS NOT NULL AND h <> ''
$$;

-- A hospital value that names no hospital: legacy rows, visible to all members.
-- Same rule as patient_hospital_number_scope() in 20261018120400.
CREATE OR REPLACE FUNCTION public.app_is_unscoped_hospital(p_hospital TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_hospital IS NULL OR btrim(p_hospital) IN ('', 'global')
$$;

-- Rows that carry only a hospital.
CREATE OR REPLACE FUNCTION public.app_can_access_hospital(p_hospital TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_app_member()
     AND (public.app_is_unscoped_hospital(p_hospital)
          OR public.is_app_super_admin()
          OR btrim(p_hospital) = ANY (public.app_user_hospital_ids()))
$$;

-- Which users a member may read: themselves, administrators (whom to ask),
-- accounts with no hospital yet (approvals, legacy), and anyone who shares a
-- hospital with them. Super admins read everyone.
CREATE OR REPLACE FUNCTION public.app_can_see_user(p_user_id TEXT, p_hospital TEXT, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ids TEXT[];
BEGIN
  IF NOT public.is_app_member() THEN RETURN FALSE; END IF;
  IF public.is_app_super_admin() THEN RETURN TRUE; END IF;
  IF p_user_id IS NOT DISTINCT FROM public.app_user_id() THEN RETURN TRUE; END IF;
  IF p_role IN ('super_admin', 'hospital_admin') THEN RETURN TRUE; END IF;
  IF public.app_is_unscoped_hospital(p_hospital) THEN RETURN TRUE; END IF;
  v_ids := public.app_user_hospital_ids();
  IF btrim(p_hospital) = ANY (v_ids) THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_hospitals uh
     WHERE uh.user_id = p_user_id AND uh.hospital_id = ANY (v_ids)
  );
END;
$$;

-- What the client asks once per sync: is scoping on, and since when.
CREATE OR REPLACE FUNCTION public.app_access_policy()
RETURNS TABLE (hospital_scoped BOOLEAN, changed_at TIMESTAMPTZ, hospital_ids TEXT[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(s.hospital_scoped, FALSE), s.changed_at, public.app_user_hospital_ids()
    FROM (SELECT 1) one
    LEFT JOIN app_private.access_policy_state s ON s.id
   WHERE public.is_app_member()
$$;

REVOKE ALL ON FUNCTION public.app_user_hospital_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_hospital(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_see_user(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_access_policy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_user_hospital_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_is_unscoped_hospital(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_can_access_hospital(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_can_see_user(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_access_policy() TO authenticated, service_role;

-- Creating a hospital (Hospital selector -> quick add) makes you a member of it,
-- so you can register the first patient there. Inserting only: an upsert of an
-- existing hospital is an UPDATE and grants nothing.
CREATE OR REPLACE FUNCTION public.hospitals_grant_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me TEXT := public.app_user_id();
BEGIN
  IF v_me IS NOT NULL AND NEW.id IS NOT NULL THEN
    INSERT INTO public.user_hospitals (user_id, hospital_id, granted_by)
    VALUES (v_me, NEW.id::text, v_me)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hospitals_grant_creator ON public.hospitals;
CREATE TRIGGER hospitals_grant_creator
  AFTER INSERT ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.hospitals_grant_creator();

-- ── The apply function (also called by the lockdown while scoping is on) ────
-- Generates the per-patient and per-parent functions from the tables and
-- column types actually present, creates the indexes the checks use, and
-- replaces each table's policies according to its class.

-- `x.col = <the id>` written so an index on col is usable whatever its type.
CREATE OR REPLACE FUNCTION app_private.hs_match(p_table TEXT, p_col TEXT, p_alias TEXT, p_text TEXT, p_uuid TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = to_regclass(format('public.%I', p_table))
     AND a.attname = p_col AND a.attnum > 0 AND NOT a.attisdropped;
  IF v_type IS NULL THEN
    RETURN NULL;
  ELSIF v_type IN ('text', 'character varying') OR v_type LIKE 'character varying(%' THEN
    RETURN format('%s.%I = %s', p_alias, p_col, p_text);
  ELSIF v_type = 'uuid' THEN
    RETURN format('%s.%I = %s', p_alias, p_col, p_uuid);
  ELSE
    RETURN format('%s.%I::text = %s', p_alias, p_col, p_text);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.hs_has_col(p_table TEXT, p_col TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT p_col IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = to_regclass(format('public.%I', p_table))
       AND a.attname = p_col AND a.attnum > 0 AND NOT a.attisdropped)
$$;

CREATE OR REPLACE FUNCTION app_private.apply_hospital_scoping()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $apply$
DECLARE
  k RECORD;
  l RECORD;
  j RECORD;
  p RECORD;
  v RECORD;
  missing TEXT;
  broken TEXT[] := '{}';
  v_body TEXT;
  clause TEXT;
  cond TEXT[];
  col TEXT;
  expr TEXT;
  v_match TEXT;
  parent RECORD;
  uuid_ids BOOLEAN;
  keep TEXT[];
BEGIN
  IF to_regclass('app_private.rls_lockdown_state') IS NULL
     OR NOT EXISTS (SELECT 1 FROM app_private.rls_lockdown_state WHERE in_force IS TRUE) THEN
    RAISE EXCEPTION 'Hospital scoping needs the RLS lockdown in force.';
  END IF;

  -- 1. Every public table must be classified. Loud, and lists them all.
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO missing
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r', 'p')
     AND c.relname NOT LIKE 'family\_%'
     AND NOT EXISTS (SELECT 1 FROM app_private.hospital_scoping_classes k2 WHERE k2.tablename = c.relname);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Hospital scoping: these public tables are not classified: %. Add each to the list in supabase/manual/20261020100000_hospital_scoping.sql (patient / hospital / parent / members ...) and run that file again. Nothing was changed.', missing;
  END IF;

  -- 2. The columns each class depends on must exist.
  FOR k IN SELECT * FROM app_private.hospital_scoping_classes ORDER BY tablename LOOP
    CONTINUE WHEN to_regclass(format('public.%I', k.tablename)) IS NULL;
    IF k.class = 'patient' AND NOT app_private.hs_has_col(k.tablename, k.patient_col) THEN
      broken := broken || format('%s.%s', k.tablename, k.patient_col);
    ELSIF k.class IN ('hospital', 'patients') AND NOT app_private.hs_has_col(k.tablename, k.hospital_col) THEN
      broken := broken || format('%s.%s', k.tablename, k.hospital_col);
    ELSIF k.class = 'parent' THEN
      IF NOT app_private.hs_has_col(k.tablename, k.parent_col) THEN
        broken := broken || format('%s.%s', k.tablename, k.parent_col);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM app_private.hospital_scoping_classes k3
                      WHERE k3.tablename = k.parent_table AND k3.class = 'patient') THEN
        broken := broken || format('%s (parent %s must be class patient)', k.tablename, k.parent_table);
      END IF;
    END IF;
  END LOOP;
  IF array_length(broken, 1) > 0 THEN
    RAISE EXCEPTION 'Hospital scoping: columns the classification relies on are missing: %. Fix the classification (or the table) and run again. Nothing was changed.', array_to_string(broken, ', ');
  END IF;

  -- 3. Indexes the checks use.
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_hs_patients_registered_hospital ON public.patients (registered_hospital_id)';
  FOR k IN SELECT * FROM app_private.hospital_scoping_classes ORDER BY tablename LOOP
    CONTINUE WHEN to_regclass(format('public.%I', k.tablename)) IS NULL;
    IF k.class = 'patient' THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', left('idx_hs_' || k.tablename || '_patient', 63), k.tablename, k.patient_col);
    END IF;
    IF k.class IN ('patient', 'hospital') AND app_private.hs_has_col(k.tablename, k.hospital_col) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', left('idx_hs_' || k.tablename || '_hospital', 63), k.tablename, k.hospital_col);
    END IF;
    IF k.class = 'parent' THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', left('idx_hs_' || k.tablename || '_parent', 63), k.tablename, k.parent_col);
    END IF;
  END LOOP;
  FOR l IN SELECT * FROM app_private.hospital_scoping_links WHERE kind = 'visit' LOOP
    CONTINUE WHEN to_regclass(format('public.%I', l.tablename)) IS NULL
              OR NOT app_private.hs_has_col(l.tablename, l.patient_col)
              OR NOT app_private.hs_has_col(l.tablename, l.hospital_cols[1]);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I, %I)', left('idx_hs_' || l.tablename || '_visit', 63), l.tablename, l.patient_col, l.hospital_cols[1]);
  END LOOP;

  -- 4. app_private.hs_patient_linked(): rules 3 and 4, from the links present.
  v_body := '';
  FOR l IN SELECT * FROM app_private.hospital_scoping_links ORDER BY kind DESC, tablename LOOP
    CONTINUE WHEN to_regclass(format('public.%I', l.tablename)) IS NULL;
    v_match := app_private.hs_match(l.tablename, l.patient_col, 'x', 'p_patient_id', 'v_uuid');
    CONTINUE WHEN v_match IS NULL;
    cond := '{}';
    FOREACH col IN ARRAY l.hospital_cols LOOP
      IF app_private.hs_has_col(l.tablename, col) THEN
        cond := cond || format('btrim(x.%I::text) = ANY (p_ids)', col);
      END IF;
    END LOOP;
    FOREACH col IN ARRAY l.user_cols LOOP
      IF app_private.hs_has_col(l.tablename, col) THEN
        cond := cond || format('x.%I::text = p_me', col);
      END IF;
    END LOOP;
    CONTINUE WHEN array_length(cond, 1) IS NULL;
    clause := format('EXISTS (SELECT 1 FROM public.%I x WHERE %s AND (%s)', l.tablename, v_match, array_to_string(cond, ' OR '));
    IF l.active_sql IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM unnest(l.active_cols) ac WHERE NOT app_private.hs_has_col(l.tablename, ac)) THEN
      clause := clause || format(' AND (%s)', l.active_sql);
    END IF;
    v_body := v_body || format(E'  IF %s) THEN RETURN TRUE; END IF;\n', clause);
  END LOOP;
  FOR j IN SELECT * FROM app_private.hospital_scoping_json_links ORDER BY tablename LOOP
    CONTINUE WHEN to_regclass(format('public.%I', j.tablename)) IS NULL;
    v_match := app_private.hs_match(j.tablename, j.patient_col, 'x', 'p_patient_id', 'v_uuid');
    CONTINUE WHEN v_match IS NULL OR NOT app_private.hs_has_col(j.tablename, j.json_col);
    CONTINUE WHEN (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_catalog.pg_attribute a
                    WHERE a.attrelid = to_regclass(format('public.%I', j.tablename)) AND a.attname = j.json_col) NOT IN ('jsonb', 'json');
    v_body := v_body || format(
      E'  IF EXISTS (SELECT 1 FROM public.%I x WHERE %s AND x.%I::jsonb @> jsonb_build_array(jsonb_build_object(%L, p_me))) THEN RETURN TRUE; END IF;\n',
      j.tablename, v_match, j.json_col, j.user_key);
  END LOOP;

  EXECUTE format($f$
CREATE OR REPLACE FUNCTION app_private.hs_patient_linked(p_patient_id TEXT, p_ids TEXT[], p_me TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $body$
DECLARE
  v_uuid UUID;
BEGIN
  IF p_patient_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_patient_id::uuid;
  END IF;
%s  RETURN FALSE;
END;
$body$;
$f$, v_body);
  REVOKE ALL ON FUNCTION app_private.hs_patient_linked(TEXT, TEXT[], TEXT) FROM PUBLIC;

  -- 5. public.app_can_access_patient(): the rule.
  v_match := app_private.hs_match('patients', 'id', 'p', 'p_patient_id', 'v_uuid');
  EXECUTE format($f$
CREATE OR REPLACE FUNCTION public.app_can_access_patient(p_patient_id TEXT, p_row_hospital_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $body$
DECLARE
  v_me TEXT;
  v_role TEXT;
  v_ids TEXT[];
  v_reg TEXT;
  v_uuid UUID;
BEGIN
  SELECT u.id::text, u.role INTO v_me, v_role
    FROM public.users u
   WHERE u.auth_user_id = auth.uid() AND u.is_active IS TRUE
   LIMIT 1;
  IF v_me IS NULL THEN RETURN FALSE; END IF;
  IF v_role = 'super_admin' THEN RETURN TRUE; END IF;
  v_ids := public.app_user_hospital_ids();

  -- No patient named: the row's own hospital decides; none either: members.
  IF p_patient_id IS NULL OR btrim(p_patient_id) = '' THEN
    RETURN public.app_is_unscoped_hospital(p_row_hospital_id) OR btrim(p_row_hospital_id) = ANY (v_ids);
  END IF;
  IF p_patient_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_patient_id::uuid;
  END IF;

  SELECT p.registered_hospital_id::text INTO v_reg FROM public.patients p WHERE %s LIMIT 1;
  IF NOT FOUND THEN
    -- A patient not (yet) in the table — a child row pushed before its
    -- patient, or one left behind: the row's own hospital decides.
    RETURN public.app_is_unscoped_hospital(p_row_hospital_id) OR btrim(p_row_hospital_id) = ANY (v_ids);
  END IF;
  IF public.app_is_unscoped_hospital(v_reg) OR btrim(v_reg) = ANY (v_ids) THEN
    RETURN TRUE;
  END IF;
  RETURN app_private.hs_patient_linked(p_patient_id, v_ids, v_me);
END;
$body$;
$f$, v_match);

  -- Writing a patient: the registration being written must be one of yours
  -- (or none), unless the patient is already yours by a visit or workflow.
  EXECUTE $f$
CREATE OR REPLACE FUNCTION public.app_can_write_patient(p_patient_id TEXT, p_registered_hospital_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $body$
DECLARE
  v_me TEXT;
  v_role TEXT;
  v_ids TEXT[];
BEGIN
  SELECT u.id::text, u.role INTO v_me, v_role
    FROM public.users u
   WHERE u.auth_user_id = auth.uid() AND u.is_active IS TRUE
   LIMIT 1;
  IF v_me IS NULL THEN RETURN FALSE; END IF;
  IF v_role = 'super_admin' THEN RETURN TRUE; END IF;
  v_ids := public.app_user_hospital_ids();
  IF public.app_is_unscoped_hospital(p_registered_hospital_id) OR btrim(p_registered_hospital_id) = ANY (v_ids) THEN
    RETURN TRUE;
  END IF;
  RETURN p_patient_id IS NOT NULL AND app_private.hs_patient_linked(p_patient_id, v_ids, v_me);
END;
$body$;
$f$;

  -- 6. public.app_can_access_via_parent(): child rows follow their parent row.
  v_body := '';
  FOR parent IN
    SELECT DISTINCT k.parent_table, pk.patient_col, pk.hospital_col
      FROM app_private.hospital_scoping_classes k
      JOIN app_private.hospital_scoping_classes pk ON pk.tablename = k.parent_table
     WHERE k.class = 'parent'
     ORDER BY k.parent_table
  LOOP
    CONTINUE WHEN to_regclass(format('public.%I', parent.parent_table)) IS NULL;
    v_match := app_private.hs_match(parent.parent_table, 'id', 'x', 'p_parent_id', 'v_uuid');
    CONTINUE WHEN v_match IS NULL;
    v_body := v_body || format(
      E'  IF p_parent_table = %L THEN\n    SELECT x.%I::text, %s INTO v_patient, v_hospital FROM public.%I x WHERE %s LIMIT 1;\n    IF NOT FOUND THEN RETURN TRUE; END IF;\n    RETURN public.app_can_access_patient(v_patient, v_hospital);\n  END IF;\n',
      parent.parent_table, parent.patient_col,
      CASE WHEN app_private.hs_has_col(parent.parent_table, parent.hospital_col)
           THEN format('x.%I::text', parent.hospital_col) ELSE 'NULL::text' END,
      parent.parent_table, v_match);
  END LOOP;
  EXECUTE format($f$
CREATE OR REPLACE FUNCTION public.app_can_access_via_parent(p_parent_table TEXT, p_parent_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $body$
DECLARE
  v_uuid UUID;
  v_patient TEXT;
  v_hospital TEXT;
BEGIN
  IF NOT public.is_app_member() THEN RETURN FALSE; END IF;
  -- No parent named, or a parent not in the table: members-only, as before.
  IF p_parent_id IS NULL OR btrim(p_parent_id) = '' THEN RETURN TRUE; END IF;
  IF p_parent_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_parent_id::uuid;
  END IF;
%s  RETURN FALSE;
END;
$body$;
$f$, v_body);

  REVOKE ALL ON FUNCTION public.app_can_access_patient(TEXT, TEXT) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.app_can_write_patient(TEXT, TEXT) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.app_can_access_via_parent(TEXT, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.app_can_access_patient(TEXT, TEXT) TO authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.app_can_write_patient(TEXT, TEXT) TO authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.app_can_access_via_parent(TEXT, TEXT) TO authenticated, service_role;

  -- 7. Policies, table by table.
  FOR k IN SELECT * FROM app_private.hospital_scoping_classes ORDER BY tablename LOOP
    CONTINUE WHEN to_regclass(format('public.%I', k.tablename)) IS NULL;
    CONTINUE WHEN k.class = 'lockdown_own';
    IF k.class = 'members' THEN
      -- Exactly the lockdown's policy (also for a table that was scoped
      -- before and has been reclassified).
      EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', k.tablename);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', k.tablename);
      EXECUTE format('DROP POLICY IF EXISTS app_members_all ON public.%I', k.tablename);
      EXECUTE format(
        'CREATE POLICY app_members_all ON public.%I FOR ALL TO authenticated '
        'USING (public.is_app_member()) WITH CHECK (public.is_app_member())',
        k.tablename);
      CONTINUE;
    END IF;

    -- The lockdown's own policies this class replaces.
    keep := CASE k.class
              WHEN 'users' THEN ARRAY['app_users_select', 'app_users_insert', 'app_users_update', 'app_users_delete']
              WHEN 'user_hospitals' THEN ARRAY['app_user_hospitals_select']
              WHEN 'service_only' THEN '{}'::TEXT[]
              ELSE ARRAY['app_scoped_all']
            END;

    -- Any other PERMISSIVE policy would be OR-ed with the scoped one and widen
    -- it: drop it (kept for the rollback). Restrictive policies only narrow.
    FOR p IN
      SELECT * FROM pg_catalog.pg_policies
       WHERE schemaname = 'public' AND tablename = k.tablename
         AND permissive = 'PERMISSIVE'
         AND NOT (policyname = ANY (keep))
    LOOP
      IF p.policyname <> 'app_members_all' THEN
        INSERT INTO app_private.hospital_scoping_policies (tablename, policyname, permissive, roles, cmd, qual, with_check)
        VALUES (p.tablename, p.policyname, p.permissive, p.roles::text[], p.cmd, p.qual, p.with_check)
        ON CONFLICT (tablename, policyname) DO UPDATE
          SET permissive = EXCLUDED.permissive, roles = EXCLUDED.roles, cmd = EXCLUDED.cmd,
              qual = EXCLUDED.qual, with_check = EXCLUDED.with_check, saved_at = now();
      END IF;
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, k.tablename);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', k.tablename);

    IF k.class = 'patients' THEN
      EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', k.tablename);
      EXECUTE format(
        'CREATE POLICY app_scoped_all ON public.%I FOR ALL TO authenticated '
        'USING (public.app_can_access_patient(id::text)) '
        'WITH CHECK (public.app_can_write_patient(id::text, %I::text))',
        k.tablename, k.hospital_col);
    ELSIF k.class = 'patient' THEN
      expr := format('public.app_can_access_patient(%I::text, %s)', k.patient_col,
                     CASE WHEN app_private.hs_has_col(k.tablename, k.hospital_col)
                          THEN format('%I::text', k.hospital_col) ELSE 'NULL::text' END);
      EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', k.tablename);
      EXECUTE format('CREATE POLICY app_scoped_all ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
                     k.tablename, expr, expr);
    ELSIF k.class = 'hospital' THEN
      expr := format('public.app_can_access_hospital(%I::text)', k.hospital_col);
      EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', k.tablename);
      EXECUTE format('CREATE POLICY app_scoped_all ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
                     k.tablename, expr, expr);
    ELSIF k.class = 'parent' THEN
      expr := format('public.app_can_access_via_parent(%L, %I::text)', k.parent_table, k.parent_col);
      EXECUTE format('DROP POLICY IF EXISTS app_scoped_all ON public.%I', k.tablename);
      EXECUTE format('CREATE POLICY app_scoped_all ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
                     k.tablename, expr, expr);
    ELSIF k.class = 'users' THEN
      -- Writes stay exactly as the lockdown made them; reading is scoped.
      DROP POLICY IF EXISTS app_users_select ON public.users;
      CREATE POLICY app_users_select ON public.users
        FOR SELECT TO authenticated
        USING (auth_user_id = auth.uid() OR public.app_can_see_user(id::text, hospital_id::text, role::text));
    ELSIF k.class = 'user_hospitals' THEN
      DROP POLICY IF EXISTS app_user_hospitals_select ON public.user_hospitals;
      CREATE POLICY app_user_hospitals_select ON public.user_hospitals
        FOR SELECT TO authenticated
        USING (user_id = public.app_user_id()
               OR public.is_app_super_admin()
               OR (public.is_app_admin() AND hospital_id = public.app_user_hospital_id()));
    END IF;
    -- service_only: no policy at all; only the service role (which bypasses
    -- row security) reads it.
  END LOOP;

  -- 8. Views run with their owner's rights and would bypass all of the above.
  FOR v IN
    SELECT c.relname AS name, c.relkind, c.reloptions
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('v', 'm')
       AND c.relname NOT LIKE 'family\_%'
  LOOP
    IF v.relkind = 'v' AND current_setting('server_version_num')::int >= 150000 THEN
      CONTINUE WHEN coalesce('security_invoker=true' = ANY (v.reloptions), FALSE)
                AND EXISTS (SELECT 1 FROM app_private.hospital_scoping_views s WHERE s.viewname = v.name);
      INSERT INTO app_private.hospital_scoping_views (viewname, change, reloptions)
      VALUES (v.name, 'security_invoker', v.reloptions) ON CONFLICT DO NOTHING;
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.name);
    ELSIF has_table_privilege('authenticated', format('public.%I', v.name), 'SELECT') THEN
      INSERT INTO app_private.hospital_scoping_views (viewname, change, reloptions)
      VALUES (v.name, 'revoked', v.reloptions) ON CONFLICT DO NOTHING;
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', v.name);
    END IF;
  END LOOP;

  -- 9. On.
  INSERT INTO app_private.access_policy_state (id, hospital_scoped, changed_at)
  VALUES (TRUE, TRUE, now())
  ON CONFLICT (id) DO UPDATE SET hospital_scoped = TRUE,
    changed_at = CASE WHEN app_private.access_policy_state.hospital_scoped THEN app_private.access_policy_state.changed_at ELSE now() END;
END;
$apply$;

REVOKE ALL ON FUNCTION app_private.apply_hospital_scoping() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.hs_match(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.hs_has_col(TEXT, TEXT) FROM PUBLIC;

SELECT app_private.apply_hospital_scoping();

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── What the rule depends on (read-only; shown by the SQL editor) ───────────
-- Patients by how their registration is scoped. "no registered hospital" rows
-- are visible to every member; "unknown hospital id" rows name a hospital that
-- is not in the hospitals table, so only super admins see them.
SELECT CASE
         WHEN public.app_is_unscoped_hospital(p.registered_hospital_id) THEN 'no registered hospital (NULL, blank or global): visible to every member'
         WHEN NOT EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id::text = btrim(p.registered_hospital_id)) THEN 'unknown hospital id: super admins only (unless a visit or referral links it)'
         ELSE 'registered at a hospital'
       END AS registration,
       count(*) AS patients
  FROM public.patients p
 GROUP BY 1
 ORDER BY 1;
