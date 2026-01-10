-- CareBridge Supabase Migration: Add missing patient columns
-- Run this SQL in Supabase SQL Editor to add the missing columns

-- Add all missing patient columns
DO $$ 
BEGIN 
  -- Add comorbidities column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'comorbidities'
  ) THEN
    ALTER TABLE patients ADD COLUMN comorbidities JSONB;
    RAISE NOTICE 'Added comorbidities column';
  END IF;

  -- Add dvt_risk_assessment column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'dvt_risk_assessment'
  ) THEN
    ALTER TABLE patients ADD COLUMN dvt_risk_assessment JSONB;
    RAISE NOTICE 'Added dvt_risk_assessment column';
  END IF;

  -- Add pressure_sore_risk_assessment column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'pressure_sore_risk_assessment'
  ) THEN
    ALTER TABLE patients ADD COLUMN pressure_sore_risk_assessment JSONB;
    RAISE NOTICE 'Added pressure_sore_risk_assessment column';
  END IF;
END $$;

-- Verify all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;
