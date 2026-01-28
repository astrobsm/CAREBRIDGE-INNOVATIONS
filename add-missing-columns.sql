-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- AstroHEALTH MySQL Schema Column Fixes
-- Run this to add columns that may be missing
-- ============================================

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS TABLE - Add missing columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) AFTER password_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) AFTER first_name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) AFTER hospital_id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) AFTER phone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(100) AFTER license_number;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) AFTER specialty;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT AFTER is_active;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN DEFAULT false AFTER profile_image;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMP NULL AFTER agreement_accepted;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL AFTER agreement_accepted_at;

-- ============================================
-- HOSPITALS TABLE - Add missing columns
-- ============================================
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general' AFTER email;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS website VARCHAR(255) AFTER type;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) AFTER website;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo TEXT AFTER license_number;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS settings JSON AFTER logo;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic' AFTER settings;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP NULL AFTER subscription_tier;

-- ============================================
-- PATIENTS TABLE - Add missing columns
-- ============================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ward VARCHAR(100) AFTER registered_hospital_id;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50) AFTER ward;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admission_status VARCHAR(50) DEFAULT 'outpatient' AFTER bed_number;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS risk_factors JSON AFTER allergies;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dvt_risk_score INT AFTER risk_factors;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS waterlow_score INT AFTER dvt_risk_score;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS must_score INT AFTER waterlow_score;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_image TEXT AFTER must_score;

-- ============================================
-- VITAL_SIGNS TABLE - Add missing columns
-- ============================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) AFTER patient_id;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) AFTER encounter_id;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(36) AFTER hospital_id;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_flow_rate DECIMAL(5,1) AFTER oxygen_saturation;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_delivery VARCHAR(50) AFTER oxygen_flow_rate;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS fio2 DECIMAL(3,2) AFTER oxygen_delivery;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS urine_output INT AFTER fio2;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS gcs_score INT AFTER urine_output;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS gcs_components JSON AFTER gcs_score;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS avpu VARCHAR(10) AFTER gcs_components;

-- ============================================
-- CLINICAL_ENCOUNTERS TABLE - Add missing columns  
-- ============================================
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS type VARCHAR(100) AFTER hospital_id;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS encounter_type VARCHAR(100) AFTER type;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) AFTER encounter_type;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'in_progress' AFTER admission_id;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS attending_clinician VARCHAR(36) AFTER status;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS chief_complaint TEXT AFTER attending_clinician;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS history_of_present_illness TEXT AFTER chief_complaint;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS past_medical_history JSON AFTER history_of_present_illness;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS medications JSON AFTER past_medical_history;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS allergies JSON AFTER medications;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS review_of_systems JSON AFTER allergies;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS physical_examination JSON AFTER review_of_systems;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS diagnosis JSON AFTER physical_examination;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS differential_diagnosis JSON AFTER diagnosis;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS plan TEXT AFTER differential_diagnosis;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS disposition VARCHAR(50) AFTER plan;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS follow_up_date DATE AFTER disposition;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS notes TEXT AFTER follow_up_date;

-- ============================================
-- SURGERIES TABLE - Add missing columns
-- ============================================
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS type VARCHAR(100) AFTER hospital_id;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgery_type VARCHAR(100) AFTER type;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) AFTER surgery_type;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) AFTER encounter_id;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled' AFTER admission_id;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'routine' AFTER status;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP NULL AFTER priority;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP NULL AFTER scheduled_date;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP NULL AFTER actual_start;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon VARCHAR(36) AFTER actual_end;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_surgeon VARCHAR(36) AFTER surgeon;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anesthesiologist VARCHAR(36) AFTER assistant_surgeon;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse VARCHAR(36) AFTER anesthesiologist;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse VARCHAR(36) AFTER scrub_nurse;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anesthesia_type VARCHAR(100) AFTER circulating_nurse;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS procedure_name TEXT AFTER anesthesia_type;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(50) AFTER procedure_name;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS preop_diagnosis TEXT AFTER procedure_code;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS postop_diagnosis TEXT AFTER preop_diagnosis;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS findings TEXT AFTER postop_diagnosis;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS complications TEXT AFTER findings;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS estimated_blood_loss INT AFTER complications;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specimens JSON AFTER estimated_blood_loss;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS implants JSON AFTER specimens;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS notes TEXT AFTER implants;

-- ============================================
-- ADMISSIONS TABLE - Add missing columns
-- ============================================
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS severity VARCHAR(50) AFTER status;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_type VARCHAR(100) AFTER severity;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_source VARCHAR(100) AFTER admission_type;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS attending_doctor VARCHAR(36) AFTER admission_source;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_doctor VARCHAR(36) AFTER attending_doctor;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_nurse VARCHAR(36) AFTER primary_doctor;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_diagnosis TEXT AFTER primary_nurse;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS reason_for_admission TEXT AFTER admission_diagnosis;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS expected_los INT AFTER reason_for_admission;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS actual_los INT AFTER expected_los;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_disposition VARCHAR(100) AFTER actual_los;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMP NULL AFTER discharge_disposition;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharged_by VARCHAR(36) AFTER discharge_date;

-- ============================================
-- WOUNDS TABLE - Add missing columns
-- ============================================
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) AFTER patient_id;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) AFTER encounter_id;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS type VARCHAR(100) AFTER hospital_id;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_type VARCHAR(100) AFTER type;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS location VARCHAR(200) AFTER wound_type;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS side VARCHAR(20) AFTER location;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS etiology VARCHAR(100) AFTER side;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS onset_date DATE AFTER etiology;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS length_cm DECIMAL(6,2) AFTER onset_date;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS width_cm DECIMAL(6,2) AFTER length_cm;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS depth_cm DECIMAL(6,2) AFTER width_cm;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS area_cm2 DECIMAL(10,2) AFTER depth_cm;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_bed JSON AFTER area_cm2;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate JSON AFTER wound_bed;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS edges JSON AFTER exudate;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS periwound JSON AFTER edges;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS pain_score INT AFTER periwound;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS odor VARCHAR(50) AFTER pain_score;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS infection_signs JSON AFTER odor;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS healing_stage VARCHAR(50) AFTER infection_signs;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS treatment_plan TEXT AFTER healing_stage;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photos JSON AFTER treatment_plan;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' AFTER photos;

-- ============================================
-- LAB_REQUESTS TABLE - Add missing columns
-- ============================================
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) AFTER patient_id;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) AFTER encounter_id;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS requested_by VARCHAR(36) AFTER hospital_id;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS tests_requested JSON AFTER requested_by;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS clinical_info TEXT AFTER tests_requested;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) DEFAULT 'routine' AFTER clinical_info;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS fasting_required BOOLEAN DEFAULT false AFTER urgency;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(100) AFTER fasting_required;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS specimen_collected_at TIMESTAMP NULL AFTER specimen_type;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS collected_by VARCHAR(36) AFTER specimen_collected_at;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' AFTER collected_by;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS results JSON AFTER status;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS result_date TIMESTAMP NULL AFTER results;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS reported_by VARCHAR(36) AFTER result_date;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS notes TEXT AFTER reported_by;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER notes;

-- ============================================
-- INVESTIGATIONS TABLE - Add missing columns
-- ============================================
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS patient_name VARCHAR(200) AFTER patient_id;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) AFTER patient_name;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS admission_id VARCHAR(36) AFTER encounter_id;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS type VARCHAR(100) AFTER hospital_id;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS investigation_type VARCHAR(100) AFTER type;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER investigation_type;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS requested_by VARCHAR(36) AFTER category;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS clinical_indication TEXT AFTER requested_by;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' AFTER clinical_indication;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP NULL AFTER status;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS performed_date TIMESTAMP NULL AFTER scheduled_date;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS performed_by VARCHAR(36) AFTER performed_date;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS findings TEXT AFTER performed_by;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS impression TEXT AFTER findings;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS images JSON AFTER impression;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS report_url TEXT AFTER images;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS notes TEXT AFTER report_url;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER notes;

-- ============================================
-- PRESCRIPTIONS TABLE - Add missing columns
-- ============================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT AFTER admission_id;

-- ============================================
-- MEDICATION_CHARTS TABLE - Add missing columns
-- ============================================
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS allergies JSON AFTER hospital_id;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) AFTER chart_date;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS assigned_nurse_id VARCHAR(36) AFTER shift_type;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false AFTER assigned_nurse_id;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL AFTER is_completed;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS completed_by VARCHAR(36) AFTER completed_at;

-- ============================================
-- TREATMENT_PLANS TABLE - Add missing columns
-- ============================================
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS related_entity_id VARCHAR(36) AFTER created_by;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50) AFTER related_entity_id;

-- ============================================
-- TREATMENT_PROGRESS TABLE - Add missing columns
-- ============================================
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS date DATE AFTER patient_id;

-- ============================================
-- APPOINTMENTS TABLE - Add missing columns
-- ============================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type VARCHAR(100) AFTER doctor_id;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_number VARCHAR(100) AFTER id;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_id VARCHAR(36) AFTER type;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by VARCHAR(36) AFTER clinician_id;

-- ============================================
-- INVOICES TABLE - Add missing columns
-- ============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items JSON AFTER notes;

-- ============================================
-- VIDEO_CONFERENCES TABLE - Add missing columns
-- ============================================
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS host_name VARCHAR(200) AFTER host_id;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS patient_id VARCHAR(36) AFTER hospital_id;

-- ============================================
-- PREOPERATIVE_ASSESSMENTS TABLE - Add missing columns
-- ============================================
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(200) AFTER patient_id;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_name VARCHAR(200) AFTER patient_name;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_type VARCHAR(100) AFTER surgery_name;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP NULL AFTER surgery_type;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' AFTER asa_emergency;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS clearance_status VARCHAR(50) AFTER cleared_for_surgery;

-- ============================================
-- EXTERNAL_REVIEWS TABLE - Add missing columns
-- ============================================
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS folder_number VARCHAR(100) AFTER hospital_id;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS service_date TIMESTAMP NULL AFTER folder_number;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) AFTER service_date;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Success message
SELECT 'Missing columns added successfully!' as status;
