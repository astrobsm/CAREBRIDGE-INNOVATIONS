-- MySQL Migration Fix: Add Missing Columns
-- Run this SQL to fix the migration errors from IndexedDB to DigitalOcean MySQL
-- Generated: January 29, 2026

-- ==================== SURGERIES TABLE ====================
-- Error: Unknown column 'assistant' in 'field list'

-- Add assistant-related columns (from Surgery TypeScript interface)
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant VARCHAR(255) NULL COMMENT 'Assistant surgeon name';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_id VARCHAR(36) NULL COMMENT 'User ID of surgeon assistant for billing';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee_percentage DECIMAL(5,2) NULL COMMENT 'Typically 20% of surgeon fee';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee DECIMAL(12,2) NULL COMMENT 'Calculated assistant fee';

-- Add other potentially missing Surgery columns
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon VARCHAR(255) NULL COMMENT 'Surgeon name';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_id VARCHAR(36) NULL COMMENT 'User ID for billing';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_fee DECIMAL(12,2) NULL COMMENT 'Fee charged for surgeon';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist VARCHAR(255) NULL COMMENT 'Anaesthetist name';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist_id VARCHAR(36) NULL COMMENT 'User ID for billing';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthesia_type VARCHAR(50) NULL COMMENT 'Type of anaesthesia';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthesia_fee DECIMAL(12,2) NULL COMMENT 'Anaesthesia fee';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse_id VARCHAR(36) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse_id VARCHAR(36) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS category VARCHAR(50) NULL COMMENT 'minor, intermediate, major, super_major';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS type VARCHAR(50) NULL COMMENT 'elective or emergency';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS operative_notes TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS blood_loss INT NULL COMMENT 'Estimated blood loss in ml';
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specimen_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS post_operative_instructions TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS pre_operative_assessment JSON NULL;


-- ==================== WOUNDS TABLE ====================
-- Error: Unknown column 'photo_urls' in 'field list'

-- Add photo_urls column (may be used as alias for photos)
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photo_urls JSON NULL COMMENT 'Array of photo URLs';

-- Add other Wound columns from TypeScript interface
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS length DECIMAL(10,2) NULL COMMENT 'Wound length in cm';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) NULL COMMENT 'Wound width in cm';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS depth DECIMAL(10,2) NULL COMMENT 'Wound depth in cm';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS area DECIMAL(10,2) NULL COMMENT 'Wound area in cm²';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS tissue_type JSON NULL COMMENT 'Array of tissue types';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_amount VARCHAR(50) NULL COMMENT 'none, light, moderate, heavy';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_type VARCHAR(50) NULL COMMENT 'serous, sanguineous, etc';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS odor BOOLEAN DEFAULT FALSE;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS peri_wound_condition VARCHAR(255) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS pain_level INT NULL COMMENT '0-10 pain scale';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photos JSON NULL COMMENT 'Array of WoundPhoto objects';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS healing_progress VARCHAR(50) NULL COMMENT 'improving, stable, deteriorating';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS dressing_type VARCHAR(255) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS dressing_frequency VARCHAR(100) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS type VARCHAR(100) NULL COMMENT 'Wound type';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS etiology VARCHAR(255) NULL COMMENT 'Wound cause';
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) NULL;


-- ==================== ADMISSIONS TABLE ====================
-- Error: Unknown column 'created_by' in 'field list'

-- Add created_by and other missing Admission columns
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) NULL COMMENT 'User ID who created the admission';
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitted_by VARCHAR(36) NULL COMMENT 'User ID of admitting clinician';
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_number VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_time VARCHAR(20) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitted_from VARCHAR(50) NULL COMMENT 'emergency, outpatient, transfer, direct, referral';
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_type VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_name VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_diagnosis TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS chief_complaint TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS indication_for_admission TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS severity VARCHAR(50) NULL COMMENT 'mild, moderate, severe, critical';
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS provisional_diagnosis JSON NULL;
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
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_time VARCHAR(20) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharged_by VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_type VARCHAR(50) NULL COMMENT 'routine, against_advice, transfer, death, absconded';
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_summary_id VARCHAR(36) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) NULL;


-- ==================== ADDITIONAL TABLES WITH COMMON ISSUES ====================

-- Vital Signs - commonly missing columns
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure_systolic INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure_diastolic INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_glucose DECIMAL(5,2) NULL;

-- Clinical Encounters - commonly missing columns
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS attending_clinician VARCHAR(255) NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS started_at DATETIME NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS diagnosis JSON NULL;

-- Lab Requests - commonly missing columns
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS requested_by VARCHAR(36) NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS requested_at DATETIME NULL;

-- Prescriptions - commonly missing columns
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescribed_by VARCHAR(36) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescribed_at DATETIME NULL;

-- Investigations - commonly missing columns
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS requested_by VARCHAR(36) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS requested_at DATETIME NULL;

-- Ward Rounds - commonly missing columns
ALTER TABLE ward_rounds ADD COLUMN IF NOT EXISTS ward_name VARCHAR(100) NULL;
ALTER TABLE ward_rounds ADD COLUMN IF NOT EXISTS round_date DATETIME NULL;
ALTER TABLE ward_rounds ADD COLUMN IF NOT EXISTS round_type VARCHAR(50) NULL;
ALTER TABLE ward_rounds ADD COLUMN IF NOT EXISTS lead_doctor_id VARCHAR(36) NULL;

-- Invoices - commonly missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) NULL;

-- Appointments - commonly missing columns  
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS scheduled_time DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by VARCHAR(36) NULL;

-- Medication Charts - commonly missing columns
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS chart_date DATE NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS medications JSON NULL;

-- Transfusion Orders - commonly missing columns
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS ordered_by VARCHAR(36) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS ordered_at DATETIME NULL;

-- Transfusion Monitoring Charts - commonly missing columns
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS order_id VARCHAR(36) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS readings JSON NULL;

-- Preoperative Assessments - commonly missing columns
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_id VARCHAR(36) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessed_by VARCHAR(36) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessed_at DATETIME NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS anaesthetist_id VARCHAR(36) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS anaesthetist_name VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_date DATE NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_type VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgeon_name VARCHAR(255) NULL;

-- External Reviews - commonly missing columns
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(36) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL;

-- User Settings - commonly missing columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS settings JSON NULL;

-- Hospital Settings - commonly missing columns
ALTER TABLE hospital_settings ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(36) NULL;
ALTER TABLE hospital_settings ADD COLUMN IF NOT EXISTS settings JSON NULL;


-- ==================== INDEXES ====================
-- Add indexes for foreign key columns if not exists (improves query performance)

-- Surgeries
CREATE INDEX IF NOT EXISTS idx_surgeries_surgeon_id ON surgeries(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_assistant_id ON surgeries(assistant_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_anaesthetist_id ON surgeries(anaesthetist_id);

-- Wounds
CREATE INDEX IF NOT EXISTS idx_wounds_encounter_id ON wounds(encounter_id);

-- Admissions
CREATE INDEX IF NOT EXISTS idx_admissions_created_by ON admissions(created_by);
CREATE INDEX IF NOT EXISTS idx_admissions_admitted_by ON admissions(admitted_by);
CREATE INDEX IF NOT EXISTS idx_admissions_primary_doctor ON admissions(primary_doctor);

-- Ward Rounds
CREATE INDEX IF NOT EXISTS idx_ward_rounds_lead_doctor_id ON ward_rounds(lead_doctor_id);


-- Verification query - show column counts per table
SELECT 
  TABLE_NAME,
  COUNT(COLUMN_NAME) as column_count
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('surgeries', 'wounds', 'admissions')
GROUP BY TABLE_NAME;

SELECT 'Migration fix applied successfully!' as status;
