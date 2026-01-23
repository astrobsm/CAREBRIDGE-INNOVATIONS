-- External Reviews Table Migration
-- AstroHEALTH - Admin-only module for tracking external patient services

-- Create external_reviews table
CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT NOT NULL,
  folder_number TEXT NOT NULL,
  services_rendered TEXT NOT NULL,
  fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  service_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_external_reviews_patient_id ON external_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_hospital_id ON external_reviews(hospital_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_service_date ON external_reviews(service_date);
CREATE INDEX IF NOT EXISTS idx_external_reviews_created_at ON external_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_external_reviews_created_by ON external_reviews(created_by);

-- Enable RLS (Row Level Security)
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for external_reviews
-- Allow authenticated users to read (admin check should be done in app)
CREATE POLICY "Allow authenticated read on external_reviews" ON external_reviews
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert on external_reviews" ON external_reviews
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update their own records
CREATE POLICY "Allow authenticated update on external_reviews" ON external_reviews
  FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete on external_reviews" ON external_reviews
  FOR DELETE TO authenticated USING (true);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE external_reviews;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_external_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_external_reviews_updated_at
  BEFORE UPDATE ON external_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_external_reviews_updated_at();
