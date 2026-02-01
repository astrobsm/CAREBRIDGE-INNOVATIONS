-- ============================================
-- Quick verification - run each SELECT separately
-- ============================================

-- 1. Check treatment_plans table structure
DESCRIBE treatment_plans;

-- 2. Check if 'procedures' column exists
SELECT COUNT(*) as procedures_column_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'treatment_plans'
  AND COLUMN_NAME = 'procedures';

-- 3. Check if 'assessed_by_name' column exists  
SELECT COUNT(*) as assessed_by_name_column_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'limb_salvage_assessments'
  AND COLUMN_NAME = 'assessed_by_name';

-- 4. List ALL columns in treatment_plans
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'treatment_plans'
ORDER BY ORDINAL_POSITION;

-- 5. List ALL columns in limb_salvage_assessments
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'limb_salvage_assessments'
ORDER BY ORDINAL_POSITION;
