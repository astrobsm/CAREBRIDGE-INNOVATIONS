-- ============================================
-- AstroHEALTH Missing Columns Fix
-- ============================================
-- This migration adds missing columns that are causing sync failures:
-- 1. admissions.risk_assessments
-- 2. transfusion_orders verification columns
-- 3. external_reviews additional columns
-- 
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX ADMISSIONS TABLE - Add risk_assessments
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admissions' 
    AND column_name = 'risk_assessments'
  ) THEN
    ALTER TABLE admissions ADD COLUMN risk_assessments JSONB DEFAULT '{}'::JSONB;
    RAISE NOTICE 'Added risk_assessments column to admissions';
  END IF;
END $$;

-- ============================================
-- 2. FIX TRANSFUSION_ORDERS TABLE
-- ============================================

DO $$
BEGIN
  -- Add verifying_nurse1
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfusion_orders' 
    AND column_name = 'verifying_nurse1'
  ) THEN
    ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse1 TEXT;
    RAISE NOTICE 'Added verifying_nurse1 column to transfusion_orders';
  END IF;
  
  -- Add verifying_nurse2
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfusion_orders' 
    AND column_name = 'verifying_nurse2'
  ) THEN
    ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse2 TEXT;
    RAISE NOTICE 'Added verifying_nurse2 column to transfusion_orders';
  END IF;
END $$;

-- ============================================
-- 3. FIX EXTERNAL_REVIEWS TABLE
-- ============================================

-- First, check if the table exists and has the right structure
-- The external_reviews table may have different columns than expected

DO $$
BEGIN
  -- Add patient_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN patient_name TEXT;
    RAISE NOTICE 'Added patient_name column to external_reviews';
  END IF;

  -- Add hospital_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'hospital_name'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN hospital_name TEXT;
    RAISE NOTICE 'Added hospital_name column to external_reviews';
  END IF;

  -- Add services_rendered if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'services_rendered'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN services_rendered JSONB DEFAULT '[]'::JSONB;
    RAISE NOTICE 'Added services_rendered column to external_reviews';
  END IF;

  -- Add fee if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'fee'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN fee DECIMAL(10,2);
    RAISE NOTICE 'Added fee column to external_reviews';
  END IF;

  -- Add notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column to external_reviews';
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN created_by TEXT;
    RAISE NOTICE 'Added created_by column to external_reviews';
  END IF;

  -- Add created_by_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN created_by_name TEXT;
    RAISE NOTICE 'Added created_by_name column to external_reviews';
  END IF;

  -- Add sync_status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_reviews' 
    AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE external_reviews ADD COLUMN sync_status TEXT DEFAULT 'synced';
    RAISE NOTICE 'Added sync_status column to external_reviews';
  END IF;
END $$;

-- ============================================
-- 4. VERIFY COLUMNS WERE ADDED
-- ============================================

-- Check admissions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admissions' 
AND column_name IN ('risk_assessments', 'primary_managing_consultant', 'primary_managing_consultant_name')
ORDER BY column_name;

-- Check transfusion_orders columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transfusion_orders' 
AND column_name IN ('verifying_nurse1', 'verifying_nurse2')
ORDER BY column_name;

-- Check external_reviews columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'external_reviews' 
AND column_name IN ('created_by_name', 'sync_status', 'patient_name', 'hospital_name')
ORDER BY column_name;

-- ============================================
-- Done! Missing columns have been added.
-- After running this, trigger a sync on your devices.
-- ============================================
