-- Migration: Add missing columns to patients table for sync compatibility
-- Run this in Supabase SQL Editor

-- Add DVT Risk Assessment column
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dvt_risk_assessment JSONB;

-- Add Pressure Sore Risk Assessment column
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pressure_sore_risk_assessment JSONB;

-- Add Comorbidities column (if not already present)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities JSONB;

-- Add nationality column if missing
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Nigerian';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;
