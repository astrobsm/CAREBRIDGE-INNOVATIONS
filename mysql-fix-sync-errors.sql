-- ============================================
-- MySQL Migration: Fix Sync Errors
-- Date: 2026-02-01
-- Purpose: Add missing columns that are causing sync failures
-- ============================================

-- Error 1: Unknown column 'procedures' in 'field list' for treatment_plans
-- Error 2: Unknown column 'assessed_by_name' in 'field list' for limb_salvage_assessments
-- Error 3: Out of sort memory for video_conferences (add index to reduce memory usage)

-- ============================================
-- TREATMENT_PLANS TABLE - Add missing columns
-- ============================================

-- Add new columns to match the TypeScript TreatmentPlan interface
-- Using stored procedure to safely add columns if they don't exist

DELIMITER //

DROP PROCEDURE IF EXISTS AddColumnIfNotExists//

CREATE PROCEDURE AddColumnIfNotExists(
  IN tableName VARCHAR(100),
  IN columnName VARCHAR(100),
  IN columnDef VARCHAR(500)
)
BEGIN
  DECLARE columnExists INT DEFAULT 0;
  
  SELECT COUNT(*) INTO columnExists
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = tableName
    AND COLUMN_NAME = columnName;
  
  IF columnExists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- ============================================
-- TREATMENT_PLANS TABLE
-- ============================================

CALL AddColumnIfNotExists('treatment_plans', 'related_entity_id', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('treatment_plans', 'related_entity_type', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('treatment_plans', 'title', 'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('treatment_plans', 'description', 'TEXT NULL');
CALL AddColumnIfNotExists('treatment_plans', 'clinical_goals', 'JSON NULL');
CALL AddColumnIfNotExists('treatment_plans', 'orders', 'JSON NULL');
CALL AddColumnIfNotExists('treatment_plans', 'frequency', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('treatment_plans', 'expected_end_date', 'DATE NULL');
CALL AddColumnIfNotExists('treatment_plans', 'actual_end_date', 'DATE NULL');
CALL AddColumnIfNotExists('treatment_plans', 'phase', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('treatment_plans', 'procedures', 'JSON NULL');

-- ============================================
-- LIMB_SALVAGE_ASSESSMENTS TABLE
-- ============================================

CALL AddColumnIfNotExists('limb_salvage_assessments', 'assessed_by_name', 'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'encounter_id', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'admission_id', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'patient_age', 'INT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'patient_gender', 'VARCHAR(20) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'affected_side', 'VARCHAR(20) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wagner_grade', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'texas_classification', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wifi_classification', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'sinbad_score', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wound_location', 'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wound_size', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wound_shape', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wound_duration', 'INT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wounds', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'previous_debridement', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'debridement_count', 'INT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'wound_photos', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'doppler_findings', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'angiogram_performed', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'angiogram_findings', 'TEXT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'previous_revascularization', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'revascularization_details', 'TEXT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'monofilament_test', 'BOOLEAN NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'vibration_sense', 'BOOLEAN NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'ankle_reflexes', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'neuropathy_symptoms', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'osteomyelitis', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'sepsis', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'renal_status', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'comorbidities', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'albumin', 'DECIMAL(5,2) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'prealbumin', 'DECIMAL(5,2) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'bmi', 'DECIMAL(5,2) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'must_score', 'INT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'limb_salvage_score', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'recommended_management', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'recommended_amputation_level', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'recommendations', 'JSON NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'treatment_plan', 'TEXT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'follow_up_date', 'DATE NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'progress_notes', 'TEXT NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'actual_outcome', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'actual_amputation_level', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'outcome_date', 'DATE NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'status', 'VARCHAR(50) DEFAULT "draft"');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'reviewed_by', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('limb_salvage_assessments', 'reviewed_at', 'TIMESTAMP NULL');

-- ============================================
-- VIDEO_CONFERENCES TABLE - Add indexes to reduce memory usage
-- ============================================

-- Create indexes if they don't exist (for MySQL 8.0+, use CREATE INDEX IF NOT EXISTS)
-- For older versions, we'll use stored procedure approach

DELIMITER //

DROP PROCEDURE IF EXISTS AddIndexIfNotExists//

CREATE PROCEDURE AddIndexIfNotExists(
  IN tableName VARCHAR(100),
  IN indexName VARCHAR(100),
  IN columnName VARCHAR(100)
)
BEGIN
  DECLARE indexExists INT DEFAULT 0;
  
  SELECT COUNT(*) INTO indexExists
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = tableName
    AND INDEX_NAME = indexName;
  
  IF indexExists = 0 THEN
    SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, '(', columnName, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- Add indexes to video_conferences to reduce sort memory usage
CALL AddIndexIfNotExists('video_conferences', 'idx_video_conferences_created_at', 'created_at');
CALL AddIndexIfNotExists('video_conferences', 'idx_video_conferences_updated_at', 'updated_at');
CALL AddIndexIfNotExists('video_conferences', 'idx_video_conferences_scheduled_at', 'scheduled_at');
CALL AddIndexIfNotExists('video_conferences', 'idx_video_conferences_status', 'status');

-- Clean up procedures
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify treatment_plans columns
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'treatment_plans';

-- Verify limb_salvage_assessments columns
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'limb_salvage_assessments';

-- ============================================
-- END OF MIGRATION
-- ============================================
