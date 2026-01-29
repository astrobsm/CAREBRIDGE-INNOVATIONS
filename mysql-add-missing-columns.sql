-- MySQL Migration: Add Missing Columns
-- Run this in your MySQL client or via phpMyAdmin/Adminer
-- Generated on 2026-01-29

-- ============================================
-- SURGERIES TABLE
-- ============================================
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant VARCHAR(255);
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_id VARCHAR(36);

-- ============================================
-- WOUNDS TABLE
-- ============================================
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photo_urls JSON;

-- ============================================
-- ADMISSIONS TABLE
-- ============================================
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);

-- ============================================
-- TREATMENT_PROGRESS TABLE
-- ============================================
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS recorded_at DATETIME;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS recorded_by_name VARCHAR(200);

-- ============================================
-- INVESTIGATIONS TABLE
-- ============================================
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS clinical_info TEXT;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS attachments JSON;

-- ============================================
-- VIDEO_CONFERENCES TABLE
-- ============================================
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS room_code VARCHAR(50);
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS room_id VARCHAR(100);
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS join_url TEXT;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS meeting_notes TEXT;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS presentation JSON;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS recordings JSON;

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_time TIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS scheduled_start DATETIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS scheduled_end DATETIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at DATETIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at DATETIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN;

-- ============================================
-- APPOINTMENT_REMINDERS TABLE
-- ============================================
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(100);

-- ============================================
-- MEDICATION_CHARTS TABLE
-- ============================================
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS prn_medications JSON;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS scheduled_medications JSON;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS administrations JSON;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS total_medications INT;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS administered_count INT;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS pending_count INT;

-- ============================================
-- TRANSFUSION_ORDERS TABLE
-- ============================================
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verifying_nurse1 VARCHAR(200);
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verifying_nurse1_id VARCHAR(36);
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verifying_nurse2 VARCHAR(200);
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verifying_nurse2_id VARCHAR(36);
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verification_time DATETIME;

-- ============================================
-- TRANSFUSION_MONITORING_CHARTS TABLE
-- ============================================
-- Fix data type for time columns
ALTER TABLE transfusion_monitoring_charts MODIFY COLUMN start_time TIME;
ALTER TABLE transfusion_monitoring_charts MODIFY COLUMN end_time TIME;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS nurse_id VARCHAR(36);
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(36);

-- ============================================
-- PREOPERATIVE_ASSESSMENTS TABLE
-- ============================================
-- Fix data type for bleeding_risk (change from VARCHAR to JSON)
ALTER TABLE preoperative_assessments MODIFY COLUMN bleeding_risk JSON;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS functional_capacity VARCHAR(50);
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS exercise_tolerance TEXT;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS vital_signs JSON;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS lab_results JSON;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS ecg_findings TEXT;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS chest_xray_findings TEXT;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS anesthesia_plan JSON;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS medication_review JSON;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS fasting_instructions JSON;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS consent_status VARCHAR(50);
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessed_by_name VARCHAR(200);

-- ============================================
-- EXTERNAL_REVIEWS TABLE
-- ============================================
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS pathology_results JSON;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS radiology_results JSON;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS lab_results JSON;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the columns were added:
-- SHOW COLUMNS FROM surgeries;
-- SHOW COLUMNS FROM wounds;
-- SHOW COLUMNS FROM admissions;
-- SHOW COLUMNS FROM treatment_progress;
-- SHOW COLUMNS FROM investigations;
-- SHOW COLUMNS FROM video_conferences;
-- SHOW COLUMNS FROM appointments;
-- SHOW COLUMNS FROM appointment_reminders;
-- SHOW COLUMNS FROM medication_charts;
-- SHOW COLUMNS FROM transfusion_orders;
-- SHOW COLUMNS FROM transfusion_monitoring_charts;
-- SHOW COLUMNS FROM preoperative_assessments;
-- SHOW COLUMNS FROM external_reviews;
