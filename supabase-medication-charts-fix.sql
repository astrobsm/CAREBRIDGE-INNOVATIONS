-- =====================================================
-- MEDICATION CHARTS SCHEMA FIX
-- Add missing columns to medication_charts table
-- =====================================================

-- Add missing columns to medication_charts table
ALTER TABLE medication_charts 
  ADD COLUMN IF NOT EXISTS scheduled_medications JSONB,
  ADD COLUMN IF NOT EXISTS administrations JSONB,
  ADD COLUMN IF NOT EXISTS total_scheduled INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_administered INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compliance_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Remove old medications column if it exists (replaced by scheduled_medications)
-- ALTER TABLE medication_charts DROP COLUMN IF EXISTS medications;

-- Update the updated_at column to use trigger
CREATE OR REPLACE FUNCTION update_medication_charts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medication_charts_updated_at ON medication_charts;
CREATE TRIGGER medication_charts_updated_at
  BEFORE UPDATE ON medication_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_charts_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_medication_charts_patient ON medication_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_hospital ON medication_charts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_admission ON medication_charts(admission_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_date ON medication_charts(chart_date);
CREATE INDEX IF NOT EXISTS idx_medication_charts_nurse ON medication_charts(assigned_nurse_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_completed ON medication_charts(is_completed);

-- Enable RLS if not already enabled
ALTER TABLE medication_charts ENABLE ROW LEVEL SECURITY;

-- Create or replace policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON medication_charts;
CREATE POLICY "Enable all access for authenticated users" 
  ON medication_charts 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Enable realtime if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'medication_charts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE medication_charts;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN medication_charts.scheduled_medications IS 'Array of scheduled medication entries with times and doses';
COMMENT ON COLUMN medication_charts.administrations IS 'Array of actual medication administration records with timestamps';
COMMENT ON COLUMN medication_charts.total_scheduled IS 'Total number of medications scheduled for this shift';
COMMENT ON COLUMN medication_charts.total_administered IS 'Total number of medications actually administered';
COMMENT ON COLUMN medication_charts.compliance_rate IS 'Percentage of medications administered (total_administered / total_scheduled * 100)';
COMMENT ON COLUMN medication_charts.sync_status IS 'Cloud sync status: synced, pending, error';
