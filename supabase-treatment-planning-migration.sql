-- =====================================================
-- Treatment Planning Migration
-- Adds: treatment_sessions, treatment_reminders, treatment_voice_notes
-- Includes: indexes, RLS policies, realtime publication
-- =====================================================

-- ---------- treatment_sessions ----------
CREATE TABLE IF NOT EXISTS public.treatment_sessions (
  id uuid PRIMARY KEY,
  treatment_plan_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  hospital_id uuid,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer,
  sequence_number integer,
  title text NOT NULL,
  description text,
  category text,
  order_ids jsonb,
  status text NOT NULL DEFAULT 'scheduled',
  attended_at timestamptz,
  attended_by uuid,
  outcome text,
  notes text,
  photos jsonb,
  voice_note_ids jsonb,
  reminders_scheduled boolean DEFAULT false,
  reminder_minutes_before jsonb,
  last_reminder_at timestamptz,
  missed_notification_sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_sessions_plan ON public.treatment_sessions(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient ON public.treatment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_status ON public.treatment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_scheduled_at ON public.treatment_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_hospital ON public.treatment_sessions(hospital_id);

-- ---------- treatment_reminders ----------
CREATE TABLE IF NOT EXISTS public.treatment_reminders (
  id uuid PRIMARY KEY,
  treatment_session_id uuid NOT NULL,
  treatment_plan_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  scheduled_for timestamptz NOT NULL,
  minutes_before integer,
  kind text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  voice_note_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_reminders_session ON public.treatment_reminders(treatment_session_id);
CREATE INDEX IF NOT EXISTS idx_treatment_reminders_status ON public.treatment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_treatment_reminders_scheduled_for ON public.treatment_reminders(scheduled_for);

-- ---------- treatment_voice_notes ----------
CREATE TABLE IF NOT EXISTS public.treatment_voice_notes (
  id uuid PRIMARY KEY,
  treatment_plan_id uuid,
  treatment_session_id uuid,
  patient_id uuid NOT NULL,
  audio_data_url text,
  mime_type text,
  duration_seconds integer,
  transcript text,
  purpose text NOT NULL,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_voice_notes_plan ON public.treatment_voice_notes(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_voice_notes_session ON public.treatment_voice_notes(treatment_session_id);
CREATE INDEX IF NOT EXISTS idx_treatment_voice_notes_patient ON public.treatment_voice_notes(patient_id);

-- ---------- RLS ----------
ALTER TABLE public.treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_voice_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_treatment_sessions" ON public.treatment_sessions;
CREATE POLICY "auth_all_treatment_sessions" ON public.treatment_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_treatment_reminders" ON public.treatment_reminders;
CREATE POLICY "auth_all_treatment_reminders" ON public.treatment_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_treatment_voice_notes" ON public.treatment_voice_notes;
CREATE POLICY "auth_all_treatment_voice_notes" ON public.treatment_voice_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- Realtime (idempotent) ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'treatment_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'treatment_reminders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_reminders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'treatment_voice_notes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_voice_notes;
  END IF;
END $$;

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_treatment_sessions_updated ON public.treatment_sessions;
CREATE TRIGGER trg_treatment_sessions_updated
  BEFORE UPDATE ON public.treatment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_treatment_reminders_updated ON public.treatment_reminders;
CREATE TRIGGER trg_treatment_reminders_updated
  BEFORE UPDATE ON public.treatment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_treatment_voice_notes_updated ON public.treatment_voice_notes;
CREATE TRIGGER trg_treatment_voice_notes_updated
  BEFORE UPDATE ON public.treatment_voice_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- Safety: ensure parent treatment_plans table exists
-- (created by supabase-schema.sql; this is a no-op if so)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL,
  related_entity_id uuid,
  related_entity_type text,
  title text NOT NULL,
  description text,
  clinical_goals jsonb DEFAULT '[]',
  orders jsonb DEFAULT '[]',
  frequency text,
  start_date timestamptz,
  expected_end_date timestamptz,
  actual_end_date timestamptz,
  status text DEFAULT 'active',
  phase text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- treatment_plans: new columns for scheduling/notifications ----------
ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS schedule_rule jsonb,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before jsonb,
  ADD COLUMN IF NOT EXISTS default_voice_note_id uuid,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb;

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON public.treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_related ON public.treatment_plans(related_entity_id, related_entity_type);

-- updated_at trigger for treatment_plans (idempotent)
DROP TRIGGER IF EXISTS trg_treatment_plans_updated ON public.treatment_plans;
CREATE TRIGGER trg_treatment_plans_updated
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- Foreign keys (added after all tables exist; idempotent)
-- Skipped automatically if parent/child column types differ
-- (e.g. legacy treatment_plans.id stored as text).
-- =====================================================
DO $$
DECLARE
  plans_id_type text;
  sessions_plan_type text;
  reminders_session_type text;
  reminders_plan_type text;
  vn_session_type text;
  vn_plan_type text;
BEGIN
  SELECT data_type INTO plans_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treatment_plans' AND column_name = 'id';
  SELECT data_type INTO sessions_plan_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treatment_sessions' AND column_name = 'treatment_plan_id';
  SELECT data_type INTO reminders_session_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treatment_reminders' AND column_name = 'treatment_session_id';
  SELECT data_type INTO reminders_plan_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treatment_reminders' AND column_name = 'treatment_plan_id';
  SELECT data_type INTO vn_session_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treatment_voice_notes' AND column_name = 'treatment_session_id';
  SELECT data_type INTO vn_plan_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treatment_voice_notes' AND column_name = 'treatment_plan_id';

  -- sessions -> plans
  IF plans_id_type = sessions_plan_type
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_treatment_sessions_plan') THEN
    ALTER TABLE public.treatment_sessions
      ADD CONSTRAINT fk_treatment_sessions_plan
      FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;
  ELSIF plans_id_type <> sessions_plan_type THEN
    RAISE NOTICE 'Skipping fk_treatment_sessions_plan: type mismatch (plans.id=%, sessions.treatment_plan_id=%)',
      plans_id_type, sessions_plan_type;
  END IF;

  -- reminders -> sessions  (both created here as uuid; safe)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_treatment_reminders_session') THEN
    ALTER TABLE public.treatment_reminders
      ADD CONSTRAINT fk_treatment_reminders_session
      FOREIGN KEY (treatment_session_id) REFERENCES public.treatment_sessions(id) ON DELETE CASCADE;
  END IF;

  -- reminders -> plans
  IF plans_id_type = reminders_plan_type
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_treatment_reminders_plan') THEN
    ALTER TABLE public.treatment_reminders
      ADD CONSTRAINT fk_treatment_reminders_plan
      FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;
  ELSIF plans_id_type <> reminders_plan_type THEN
    RAISE NOTICE 'Skipping fk_treatment_reminders_plan: type mismatch (plans.id=%, reminders.treatment_plan_id=%)',
      plans_id_type, reminders_plan_type;
  END IF;

  -- voice_notes -> sessions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_treatment_voice_notes_session') THEN
    ALTER TABLE public.treatment_voice_notes
      ADD CONSTRAINT fk_treatment_voice_notes_session
      FOREIGN KEY (treatment_session_id) REFERENCES public.treatment_sessions(id) ON DELETE SET NULL;
  END IF;

  -- voice_notes -> plans
  IF plans_id_type = vn_plan_type
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_treatment_voice_notes_plan') THEN
    ALTER TABLE public.treatment_voice_notes
      ADD CONSTRAINT fk_treatment_voice_notes_plan
      FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE SET NULL;
  ELSIF plans_id_type <> vn_plan_type THEN
    RAISE NOTICE 'Skipping fk_treatment_voice_notes_plan: type mismatch (plans.id=%, voice_notes.treatment_plan_id=%)',
      plans_id_type, vn_plan_type;
  END IF;
END $$;

-- =====================================================
-- Done. Re-runnable: all statements are idempotent.
-- =====================================================
