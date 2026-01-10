-- CareBridge Supabase Migration: Add comorbidities column to patients table
-- Run this SQL in Supabase SQL Editor to add the missing column

-- Check if column exists and add if not
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'comorbidities'
  ) THEN
    ALTER TABLE patients ADD COLUMN comorbidities JSONB;
    RAISE NOTICE 'Added comorbidities column to patients table';
  ELSE
    RAISE NOTICE 'comorbidities column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;
