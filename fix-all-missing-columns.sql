-- ============================================
-- FIX ALL MISSING COLUMNS FOR MIGRATION
-- Run this on your DigitalOcean MySQL database
-- Generated: 2026-01-29
-- ============================================

-- ============================================
-- SURGERIES TABLE - Missing columns
-- ============================================
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_id VARCHAR(36) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee_percentage DECIMAL(5,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee DECIMAL(15,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist_id VARCHAR(36) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthesia_fee DECIMAL(15,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse_id VARCHAR(36) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse_id VARCHAR(36) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_fee DECIMAL(15,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS blood_loss INT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specimen_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS operative_notes TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS post_operative_instructions TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS pre_operative_assessment JSON NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS category VARCHAR(50) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS type VARCHAR(100) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS actual_start_time DATETIME NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS actual_end_time DATETIME NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS duration_minutes INT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS blood_loss_ml INT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS closure_details TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS post_op_instructions TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS asa_class VARCHAR(20) NULL;

-- ============================================
-- WOUNDS TABLE - Missing columns
-- ============================================
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photo_urls JSON NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photos JSON NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS length DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS depth DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS area DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS tissue_type VARCHAR(100) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_amount VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_type VARCHAR(100) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS periwound_condition VARCHAR(255) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS healing_progress VARCHAR(100) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS type VARCHAR(100) NULL;

-- ============================================
-- ADMISSIONS TABLE - Missing columns
-- ============================================
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitted_by VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_time TIME NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitted_from VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_type VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_name VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS chief_complaint TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS indication_for_admission TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS provisional_diagnosis TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS comorbidities JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS allergies JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_doctor VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_nurse VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_managing_consultant VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_managing_consultant_name VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS consultants JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS treatment_plan_id VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS risk_assessments JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS estimated_stay_days INT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_time DATETIME NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharged_by VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_type VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_summary_id VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS severity VARCHAR(50) NULL;

-- ============================================
-- TREATMENT_PROGRESS TABLE - Missing columns
-- ============================================
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS recorded_at DATETIME NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(36) NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS observations TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS measurements JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS orders_executed JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS outcome_assessment TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS clinician_notes TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS photos JSON NULL;

-- ============================================
-- INVESTIGATIONS TABLE - Missing columns
-- ============================================
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS type_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS fasting BOOLEAN DEFAULT FALSE;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS clinical_details TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS clinical_info TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS collected_at DATETIME NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS collected_by VARCHAR(36) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS collected_by_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS sample_type VARCHAR(100) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS sample_id VARCHAR(100) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS reporting_lab VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS reported_at DATETIME NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS reported_by VARCHAR(36) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS reported_by_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS verified_by VARCHAR(36) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS verified_by_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS result_summary TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS result_details JSON NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS abnormal_flags JSON NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS critical_values JSON NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS interpretation TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS recommendations TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS attachments JSON NULL;

-- ============================================
-- VIDEO_CONFERENCES TABLE - Missing columns
-- ============================================
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS room_code VARCHAR(100) NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS settings JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS presentation JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS recordings JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS chat_messages JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS invited_users JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS actual_start DATETIME NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS actual_end DATETIME NULL;

-- ============================================
-- APPOINTMENTS TABLE - Missing columns
-- ============================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_time TIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time TIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_time TIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(50) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_email VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_name VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_notes TEXT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS seen_at DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_at DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by VARCHAR(36) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- ============================================
-- APPOINTMENT_REMINDERS TABLE - Missing columns
-- ============================================
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(255) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS whats_app_number VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS message_template VARCHAR(100) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS message_content TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS patient_response TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS response_received_at DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS scheduled_for DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS sent_at DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify columns were added:
-- DESCRIBE surgeries;
-- DESCRIBE wounds;
-- DESCRIBE admissions;
-- DESCRIBE treatment_progress;
-- DESCRIBE investigations;
-- DESCRIBE video_conferences;
-- DESCRIBE appointments;
-- DESCRIBE appointment_reminders;

SELECT 'All missing columns have been added!' AS status;
