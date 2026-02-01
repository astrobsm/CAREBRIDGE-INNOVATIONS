-- ============================================
-- MySQL Verification: Check if columns exist
-- Run this to verify the migration worked
-- ============================================

-- Check if 'procedures' column exists in treatment_plans
SELECT 
  'treatment_plans' as table_name,
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'treatment_plans'
  AND COLUMN_NAME IN ('procedures', 'title', 'description', 'clinical_goals', 'orders', 'frequency', 'phase');

-- Check if 'assessed_by_name' column exists in limb_salvage_assessments
SELECT 
  'limb_salvage_assessments' as table_name,
  COLUMN_NAME,
  DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'limb_salvage_assessments'
  AND COLUMN_NAME IN ('assessed_by_name', 'encounter_id', 'admission_id', 'patient_age', 'patient_gender');

-- Check indexes on video_conferences
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'video_conferences';

-- If procedures column is missing, run this:
-- ALTER TABLE treatment_plans ADD COLUMN procedures JSON NULL;
-- ALTER TABLE treatment_plans ADD COLUMN title VARCHAR(255) NULL;
-- ALTER TABLE treatment_plans ADD COLUMN description TEXT NULL;
-- ALTER TABLE treatment_plans ADD COLUMN clinical_goals JSON NULL;
-- ALTER TABLE treatment_plans ADD COLUMN orders JSON NULL;
-- ALTER TABLE treatment_plans ADD COLUMN frequency VARCHAR(100) NULL;
-- ALTER TABLE treatment_plans ADD COLUMN phase VARCHAR(100) NULL;
-- ALTER TABLE treatment_plans ADD COLUMN related_entity_id VARCHAR(36) NULL;
-- ALTER TABLE treatment_plans ADD COLUMN related_entity_type VARCHAR(50) NULL;
-- ALTER TABLE treatment_plans ADD COLUMN expected_end_date DATE NULL;
-- ALTER TABLE treatment_plans ADD COLUMN actual_end_date DATE NULL;
