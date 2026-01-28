-- ============================================================
-- COMPREHENSIVE MIGRATION: Add all missing columns to MySQL
-- Generated: 2026-01-28
-- Purpose: Fix sync errors by adding missing columns
-- ============================================================

-- ============================================
-- 1. AUDIT_LOGS - Add updated_at column
-- ============================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ============================================
-- 2. USERS - Add agreement tracking columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_accepted_agreement BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_device_info TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20) NULL;

-- ============================================
-- 3. HOSPITALS - Add facility capacity columns
-- ============================================
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS icu_beds INT NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS operating_theatres INT NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_24_hours BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS has_emergency BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS has_laboratory BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS has_radiology BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS specialties JSON NULL;

-- ============================================
-- 4. PATIENTS - Add next_of_kin and other columns
-- ============================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS next_of_kin JSON NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dvt_risk_assessment JSON NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pressure_sore_risk_assessment JSON NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities JSON NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_type VARCHAR(50) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ward VARCHAR(100) NULL;

-- ============================================
-- 5. VITAL_SIGNS - Add spo2 and other vitals
-- ============================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS spo2 DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_score INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_glucose DECIMAL(5,2) NULL;

-- ============================================
-- 6. CLINICAL_ENCOUNTERS - Add started_at and other columns
-- ============================================
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS history_of_present_illness TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS past_medical_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS past_surgical_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS family_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS social_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS physical_examination JSON NULL;

-- ============================================
-- 7. SURGERIES - Add pre_operative_assessment and billing columns
-- ============================================
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS pre_operative_assessment JSON NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_id VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_fee DECIMAL(15,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_id VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee_percentage DECIMAL(5,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee DECIMAL(15,2) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist_id VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse_id VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse_id VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthesia_fee DECIMAL(15,2) NULL;

-- ============================================
-- 8. ADMISSIONS - Add ward_name and other columns
-- ============================================
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_name VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward_type VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_time VARCHAR(20) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitted_from VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_number VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS chief_complaint TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS indication_for_admission TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS severity VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS provisional_diagnosis JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS comorbidities JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS allergies JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_doctor VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_nurse VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_managing_consultant VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_managing_consultant_name VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS consultants JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS treatment_plan_id VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS risk_assessments JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS estimated_stay_days INT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_time VARCHAR(20) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharged_by VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_type VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_summary_id VARCHAR(255) NULL;

-- ============================================
-- 9. WOUNDS - Add tissue_type and other columns
-- ============================================
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS tissue_type JSON NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_amount VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_type VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS odor BOOLEAN DEFAULT FALSE;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS peri_wound_condition TEXT NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS pain_level INT NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photos JSON NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS healing_progress VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS dressing_type VARCHAR(255) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS dressing_frequency VARCHAR(100) NULL;

-- ============================================
-- 10. LAB_REQUESTS - Add collected_at and other columns
-- ============================================
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS tests JSON NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS clinical_info TEXT NULL;

-- ============================================
-- 11. INVESTIGATIONS - Add hospital_name and other columns
-- ============================================
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS type_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS fasting BOOLEAN DEFAULT FALSE;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS processed_by VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS completed_by VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS completed_by_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS reported_by VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS results JSON NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS attachments JSON NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS interpretation TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS clinical_details TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS collected_by VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- ============================================
-- 12. PRESCRIPTIONS - Add prescribed_at and other columns
-- ============================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescribed_at TIMESTAMP NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_by VARCHAR(255) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medications JSON NULL;

-- ============================================
-- 13. MEDICATION_CHARTS - Add sync_status and other columns
-- ============================================
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS assigned_nurse_name VARCHAR(255) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS scheduled_medications JSON NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS administrations JSON NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS total_scheduled INT DEFAULT 0;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS total_administered INT DEFAULT 0;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS compliance_rate DECIMAL(5,2) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS supervisor_review JSON NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS general_notes TEXT NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS handover_notes TEXT NULL;

-- ============================================
-- 14. TREATMENT_PLANS - Add clinical_goals and other columns
-- ============================================
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS clinical_goals JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS orders JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS frequency VARCHAR(100) NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS expected_end_date TIMESTAMP NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMP NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS phase VARCHAR(100) NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS related_entity_id VARCHAR(255) NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50) NULL;

-- ============================================
-- 15. TREATMENT_PROGRESS - Add measurements and other columns
-- ============================================
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS measurements JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS orders_executed JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS outcome_assessment VARCHAR(50) NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS clinician_notes TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS photos JSON NULL;

-- ============================================
-- 16. APPOINTMENTS - Add duration and other columns
-- ============================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INT DEFAULT 30;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_number VARCHAR(100) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(20) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'routine';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location JSON NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason_for_visit TEXT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS related_encounter_id VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS related_surgery_id VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS related_wound_id VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_id VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_name VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_whats_app VARCHAR(50) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(50) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_email VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_schedule JSON NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_at TIMESTAMP NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_notes TEXT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS next_appointment_id VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- ============================================
-- 17. APPOINTMENT_REMINDERS - Add message_template and other columns
-- ============================================
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS message_template TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS message_content TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS whats_app_number VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS whats_app_message_id VARCHAR(255) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS patient_response VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMP NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3;

-- ============================================
-- 18. INVOICES - Add tax and other columns
-- ============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax DECIMAL(15,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount DECIMAL(15,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items JSON NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;

-- ============================================
-- 19. VIDEO_CONFERENCES - Add invited_users and other columns
-- ============================================
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS invited_users JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS participants JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS settings JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS presentation JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS recordings JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS chat_messages JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP NULL;

-- ============================================
-- 20. PREOPERATIVE_ASSESSMENTS - Add cardiac_risk and other columns
-- ============================================
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS cardiac_risk JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS airway_assessment JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS vte_risk JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS bleeding_risk JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS asa_class INT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS asa_emergency BOOLEAN DEFAULT FALSE;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_name VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgery_type VARCHAR(50) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS clearance_status VARCHAR(50) DEFAULT 'pending_review';
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS clearance_notes TEXT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessed_by VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMP NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL;

-- ============================================
-- 21. EXTERNAL_REVIEWS - Add surgeries and other columns
-- ============================================
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS surgeries JSON NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS folder_number VARCHAR(100) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS services_rendered TEXT NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS fee DECIMAL(15,2) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS service_date VARCHAR(50) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- ============================================
-- 22. TRANSFUSION_ORDERS - Add patient_blood_group and other columns
-- ============================================
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS patient_blood_group VARCHAR(10) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS patient_rh_factor VARCHAR(10) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS patient_genotype VARCHAR(10) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS antibody_screen_result VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS crossmatch_result VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS crossmatch_date TIMESTAMP NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS product_code VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS number_of_units INT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS volume_per_unit INT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS blood_group_of_product VARCHAR(10) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS donor_id VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS collection_date TIMESTAMP NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS blood_bank_name VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS blood_bank_address TEXT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS blood_bank_phone VARCHAR(50) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS screening_tests JSON NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS rate_of_transfusion DECIMAL(10,2) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS pre_transfusion_vitals JSON NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS consent_obtained BOOLEAN DEFAULT FALSE;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS consent_witness VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verifying_nurse_1 VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS verifying_nurse_2 VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS ward_bed VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS diagnosis TEXT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS orderer_designation VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS indication TEXT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS hemoglobin_level DECIMAL(5,2) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS platelet_count DECIMAL(10,2) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS inr DECIMAL(5,2) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS fibrinogen DECIMAL(10,2) NULL;

-- ============================================
-- 23. TRANSFUSION_MONITORING_CHARTS - Add patient_name and other columns
-- ============================================
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS ward_bed VARCHAR(100) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS chart_date TIMESTAMP NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS product_type VARCHAR(100) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS start_time VARCHAR(20) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS end_time VARCHAR(20) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS entries JSON NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS total_volume_transfused INT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS complications TEXT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS outcome VARCHAR(100) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS nurse_signature VARCHAR(255) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS doctor_review TEXT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS uploaded_chart_url TEXT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS uploaded_chart_base64 LONGTEXT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS ocr_text TEXT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMP NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS chart_id VARCHAR(255) NULL;

-- ============================================
-- 24. MEETING_MINUTES - Add start_time and other columns
-- ============================================
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS start_time TIMESTAMP NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS end_time TIMESTAMP NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS duration INT NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS room_code VARCHAR(100) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(50) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMP NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS host_id VARCHAR(255) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS host_name VARCHAR(255) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS attendees JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS absentees JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS agenda JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS transcript JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS raw_transcript_text LONGTEXT NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS key_points JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS action_items JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS decisions_reached JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS discussion_highlights JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS next_steps JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS clinical_notes TEXT NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS has_recording BOOLEAN DEFAULT FALSE;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS recording_url TEXT NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS recording_duration INT NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS shared_with JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS exported_formats JSON NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP NULL;
ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS finalized_by VARCHAR(255) NULL;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
SELECT 'Migration completed successfully. Verify columns were added:' AS status;
