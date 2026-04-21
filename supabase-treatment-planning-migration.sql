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

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_voice_notes;

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
