-- MySQL Migration: Add missing columns for sync compatibility
-- Generated: 2026-01-29
-- Run this migration on your MySQL database to fix sync errors

-- =====================================================
-- 1. SURGERIES TABLE - Add assistant column
-- =====================================================
ALTER TABLE surgeries 
ADD COLUMN IF NOT EXISTS assistant VARCHAR(255) NULL AFTER surgeon;

-- =====================================================
-- 2. WOUNDS TABLE - Add photo_urls column
-- =====================================================
ALTER TABLE wounds 
ADD COLUMN IF NOT EXISTS photo_urls JSON NULL AFTER photos;

-- =====================================================
-- 3. ADMISSIONS TABLE - Add created_by column
-- =====================================================
ALTER TABLE admissions 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NULL AFTER created_at;

-- =====================================================
-- 4. TREATMENT_PROGRESS TABLE - Add recorded_at column
-- =====================================================
ALTER TABLE treatment_progress 
ADD COLUMN IF NOT EXISTS recorded_at DATETIME NULL AFTER recorded_by;

-- =====================================================
-- 5. INVESTIGATIONS TABLE - Add name column
-- =====================================================
ALTER TABLE investigations 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL AFTER category;

-- =====================================================
-- 6. VIDEO_CONFERENCES TABLE - Add room_code column
-- =====================================================
ALTER TABLE video_conferences 
ADD COLUMN IF NOT EXISTS room_code VARCHAR(100) NULL AFTER status;

-- =====================================================
-- 7. APPOINTMENTS TABLE - Add appointment_date column
-- =====================================================
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_date DATE NULL AFTER clinician_name;

-- =====================================================
-- 8. APPOINTMENT_REMINDERS TABLE - Add whatsapp_message_id column
-- =====================================================
ALTER TABLE appointment_reminders 
ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(255) NULL AFTER whats_app_number;

-- =====================================================
-- 9. MEDICATION_CHARTS TABLE - Add prn_medications column
-- =====================================================
ALTER TABLE medication_charts 
ADD COLUMN IF NOT EXISTS prn_medications JSON NULL AFTER medications;

-- =====================================================
-- 10. TRANSFUSION_ORDERS TABLE - Add verifying nurse columns
-- =====================================================
ALTER TABLE transfusion_orders 
ADD COLUMN IF NOT EXISTS verifying_nurse1 VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS verifying_nurse1_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS verifying_nurse2 VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS verifying_nurse2_id VARCHAR(100) NULL;

-- =====================================================
-- 11. TRANSFUSION_MONITORING_CHARTS TABLE - Fix start_time/end_time types
-- These should be VARCHAR to store time strings like '22:29'
-- =====================================================
ALTER TABLE transfusion_monitoring_charts 
MODIFY COLUMN start_time VARCHAR(20) NULL,
MODIFY COLUMN end_time VARCHAR(20) NULL;

-- =====================================================
-- 12. PREOPERATIVE_ASSESSMENTS TABLE - Increase bleeding_risk column size
-- =====================================================
ALTER TABLE preoperative_assessments 
MODIFY COLUMN bleeding_risk TEXT NULL;

-- =====================================================
-- 13. EXTERNAL_REVIEWS TABLE - Add pathology_results and other columns
-- =====================================================
ALTER TABLE external_reviews 
ADD COLUMN IF NOT EXISTS pathology_results JSON NULL AFTER surgeries,
ADD COLUMN IF NOT EXISTS radiology_results JSON NULL AFTER pathology_results,
ADD COLUMN IF NOT EXISTS lab_results JSON NULL AFTER radiology_results;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify surgeries columns
SELECT 'surgeries' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'surgeries' AND COLUMN_NAME = 'assistant';

-- Verify wounds columns
SELECT 'wounds' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'wounds' AND COLUMN_NAME = 'photo_urls';

-- Verify admissions columns
SELECT 'admissions' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'admissions' AND COLUMN_NAME = 'created_by';

-- Verify treatment_progress columns
SELECT 'treatment_progress' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'treatment_progress' AND COLUMN_NAME = 'recorded_at';

-- Verify investigations columns
SELECT 'investigations' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'investigations' AND COLUMN_NAME = 'name';

-- Verify video_conferences columns
SELECT 'video_conferences' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'video_conferences' AND COLUMN_NAME = 'room_code';

-- Verify appointments columns
SELECT 'appointments' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'appointment_date';

-- Verify appointment_reminders columns
SELECT 'appointment_reminders' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'appointment_reminders' AND COLUMN_NAME = 'whatsapp_message_id';

-- Verify medication_charts columns
SELECT 'medication_charts' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'medication_charts' AND COLUMN_NAME = 'prn_medications';

-- Verify transfusion_orders columns
SELECT 'transfusion_orders' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'transfusion_orders' AND COLUMN_NAME = 'verifying_nurse1';

-- Verify transfusion_monitoring_charts columns
SELECT 'transfusion_monitoring_charts' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'transfusion_monitoring_charts' AND COLUMN_NAME IN ('start_time', 'end_time');

-- Verify external_reviews columns
SELECT 'external_reviews' AS table_name, COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'external_reviews' AND COLUMN_NAME = 'pathology_results';

SELECT 'Migration completed successfully!' AS status;
