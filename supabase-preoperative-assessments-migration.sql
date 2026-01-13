-- Supabase Migration: Preoperative Assessments Table
-- Run this in Supabase SQL Editor to add the preoperative_assessments table

-- Create preoperative_assessments table
CREATE TABLE IF NOT EXISTS preoperative_assessments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    hospital_number TEXT,
    
    -- Surgery Details
    surgery_name TEXT NOT NULL,
    surgery_type TEXT CHECK (surgery_type IN ('minor', 'intermediate', 'major')),
    scheduled_date TIMESTAMPTZ,
    
    -- ASA Classification
    asa_class INTEGER CHECK (asa_class BETWEEN 1 AND 6),
    asa_emergency BOOLEAN DEFAULT false,
    
    -- Airway Assessment (stored as JSONB for flexibility)
    airway_assessment JSONB,
    
    -- Cardiac Risk (stored as JSONB)
    cardiac_risk JSONB,
    
    -- VTE Risk (stored as JSONB)
    vte_risk JSONB,
    
    -- Bleeding Risk (stored as JSONB)
    bleeding_risk JSONB,
    
    -- Status
    status TEXT CHECK (status IN ('draft', 'pending', 'completed')) DEFAULT 'draft',
    clearance_status TEXT CHECK (clearance_status IN ('pending_review', 'cleared', 'deferred')) DEFAULT 'pending_review',
    clearance_notes TEXT,
    
    -- Assessor
    assessed_by TEXT,
    assessed_at TIMESTAMPTZ,
    
    -- Review
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_preoperative_assessments_patient_id ON preoperative_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_preoperative_assessments_scheduled_date ON preoperative_assessments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_preoperative_assessments_status ON preoperative_assessments(status);
CREATE INDEX IF NOT EXISTS idx_preoperative_assessments_clearance_status ON preoperative_assessments(clearance_status);
CREATE INDEX IF NOT EXISTS idx_preoperative_assessments_assessed_by ON preoperative_assessments(assessed_by);

-- Enable Row Level Security (RLS)
ALTER TABLE preoperative_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON preoperative_assessments;
DROP POLICY IF EXISTS "Enable all access for anon" ON preoperative_assessments;

-- Create policy for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON preoperative_assessments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy for anon access (for offline-first PWA)
CREATE POLICY "Enable all access for anon" ON preoperative_assessments
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Enable real-time for this table (skip if already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'preoperative_assessments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE preoperative_assessments;
    END IF;
END $$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_preoperative_assessments_updated_at ON preoperative_assessments;
CREATE TRIGGER update_preoperative_assessments_updated_at
    BEFORE UPDATE ON preoperative_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON preoperative_assessments TO anon;
GRANT ALL ON preoperative_assessments TO authenticated;
GRANT ALL ON preoperative_assessments TO service_role;
