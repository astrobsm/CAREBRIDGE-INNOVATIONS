-- Comprehensive column additions for DigitalOcean MySQL sync compatibility
-- Generated based on sync error analysis

-- ==================== users table ====================
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_at DATETIME NULL;

-- ==================== hospitals table ====================
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS bed_capacity INT NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo TEXT NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS accreditation VARCHAR(255) NULL;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS settings JSON NULL;

-- ==================== patients table ====================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_type VARCHAR(50) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tribe VARCHAR(100) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS religion VARCHAR(100) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(255) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state_of_origin VARCHAR(100) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lga VARCHAR(100) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS next_of_kin_name VARCHAR(255) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS next_of_kin_relationship VARCHAR(100) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS next_of_kin_phone VARCHAR(50) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS next_of_kin_address TEXT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies JSON NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions JSON NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS genotype VARCHAR(10) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS rhesus_factor VARCHAR(10) NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo TEXT NULL;

-- ==================== vital_signs table ====================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pulse INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS heart_rate INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS respiratory_rate INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_saturation DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS systolic_bp INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS diastolic_bp INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(20) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS temperature DECIMAL(4,1) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS height DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_score INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS consciousness_level VARCHAR(50) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS urine_output INT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_glucose DECIMAL(5,2) NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(255) NULL;

-- ==================== clinical_encounters table ====================
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS treatment_plan TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS chief_complaint TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS history_of_present_illness TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS past_medical_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS family_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS social_history TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS review_of_systems JSON NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS physical_examination JSON NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS diagnosis TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS differential_diagnosis JSON NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS assessment TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS plan TEXT NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS follow_up_date DATE NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS clinician_name VARCHAR(255) NULL;
ALTER TABLE clinical_encounters ADD COLUMN IF NOT EXISTS clinician_signature TEXT NULL;

-- ==================== surgeries table ====================
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS procedure_name VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(50) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS indication TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS preoperative_diagnosis TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS postoperative_diagnosis TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_name VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_surgeon VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anesthetist VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anesthesia_type VARCHAR(100) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse VARCHAR(255) NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS start_time DATETIME NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS end_time DATETIME NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS duration_minutes INT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS blood_loss_ml INT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS complications TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS specimens JSON NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS implants JSON NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS operative_notes TEXT NULL;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS postoperative_instructions TEXT NULL;

-- ==================== admissions table ====================
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS allergies JSON NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admission_type VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitting_diagnosis TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS admitting_doctor VARCHAR(255) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS ward VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS expected_los_days INT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS diet_instructions TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS activity_level VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS isolation_precautions VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_date DATETIME NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_diagnosis TEXT NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_disposition VARCHAR(100) NULL;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_instructions TEXT NULL;

-- ==================== wounds table ====================
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS length DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS depth DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS area DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS volume DECIMAL(10,2) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_type VARCHAR(100) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_location VARCHAR(255) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_stage VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_bed_description TEXT NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_type VARCHAR(100) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS exudate_amount VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS periwound_condition TEXT NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS odor VARCHAR(50) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS pain_level INT NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS infection_signs JSON NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS photos JSON NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS treatment_notes TEXT NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS dressing_type VARCHAR(255) NULL;
ALTER TABLE wounds ADD COLUMN IF NOT EXISTS next_assessment_date DATE NULL;

-- ==================== lab_requests table ====================
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS tests JSON NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS test_type VARCHAR(100) NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS clinical_notes TEXT NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS fasting_required BOOLEAN DEFAULT FALSE;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(100) NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS specimen_collected_at DATETIME NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS specimen_collected_by VARCHAR(255) NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS results JSON NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS result_date DATETIME NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS result_notes TEXT NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS abnormal_flags JSON NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255) NULL;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL;

-- ==================== investigations table ====================
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS investigation_type VARCHAR(100) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS investigation_name VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS indication TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS scheduled_date DATETIME NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS performed_date DATETIME NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255) NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS findings TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS conclusion TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS recommendations TEXT NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS images JSON NULL;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS report_url TEXT NULL;

-- ==================== prescriptions table ====================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medications JSON NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_type VARCHAR(50) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescriber_name VARCHAR(255) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescriber_designation VARCHAR(100) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescriber_license VARCHAR(100) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pharmacy_notes TEXT NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_at DATETIME NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_by VARCHAR(255) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;

-- ==================== medication_charts table ====================
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS medication_name VARCHAR(255) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS dose VARCHAR(100) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS route VARCHAR(50) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS frequency VARCHAR(100) NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS start_date DATE NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS end_date DATE NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS administrations JSON NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS special_instructions TEXT NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS prn_reason TEXT NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT FALSE;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS discontinued_reason TEXT NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS discontinued_at DATETIME NULL;
ALTER TABLE medication_charts ADD COLUMN IF NOT EXISTS discontinued_by VARCHAR(255) NULL;

-- ==================== treatment_plans table ====================
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS goals JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS interventions JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS medications JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS therapies JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS diet_plan TEXT NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS activity_restrictions TEXT NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS monitoring_parameters JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS follow_up_schedule JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100) NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS physician_name VARCHAR(255) NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS physician_signature TEXT NULL;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS patient_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS consent_date DATETIME NULL;

-- ==================== treatment_progress table ====================
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS observations TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS progress_notes TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS vital_signs JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS pain_assessment JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS medications_given JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS treatments_performed JSON NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS patient_response TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS complications TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS next_steps TEXT NULL;
ALTER TABLE treatment_progress ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(255) NULL;

-- ==================== appointments table ====================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS seen_at DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(100) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS purpose VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS provider_type VARCHAR(100) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room VARCHAR(50) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS check_in_time DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS check_out_time DATETIME NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from VARCHAR(36) NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_notes TEXT NULL;

-- ==================== invoices table ====================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_reason TEXT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_approved_by VARCHAR(255) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date DATETIME NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items JSON NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_address TEXT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS insurance_claim_number VARCHAR(100) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS insurance_approved_amount DECIMAL(12,2) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255) NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100) NULL;

-- ==================== video_conferences table ====================
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS participants JSON NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS scheduled_start DATETIME NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS scheduled_end DATETIME NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS actual_start DATETIME NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS actual_end DATETIME NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS host_id VARCHAR(36) NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS host_name VARCHAR(255) NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS room_id VARCHAR(100) NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS meeting_link TEXT NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS recording_url TEXT NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(50) NULL;

-- ==================== preoperative_assessments table ====================
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS age INT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS sex VARCHAR(20) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS height DECIMAL(5,2) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS asa_class VARCHAR(10) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS planned_procedure VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS medical_history JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS surgical_history JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS allergies JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS current_medications JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS airway_assessment JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS cardiovascular_assessment JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS respiratory_assessment JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS laboratory_results JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS ecg_findings TEXT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS chest_xray_findings TEXT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS anesthetic_plan TEXT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS risk_assessment JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS consent_obtained BOOLEAN DEFAULT FALSE;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS fasting_instructions TEXT NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS preoperative_orders JSON NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessor_name VARCHAR(255) NULL;
ALTER TABLE preoperative_assessments ADD COLUMN IF NOT EXISTS assessor_designation VARCHAR(100) NULL;

-- ==================== external_reviews table ====================
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS diagnoses JSON NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS referring_hospital VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS referring_doctor VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS reason_for_referral TEXT NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS clinical_summary TEXT NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS investigations JSON NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS current_treatment TEXT NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS recommendations TEXT NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(255) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS reviewer_designation VARCHAR(100) NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS review_date DATETIME NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS follow_up_plan TEXT NULL;
ALTER TABLE external_reviews ADD COLUMN IF NOT EXISTS attachments JSON NULL;

-- ==================== appointment_reminders table ====================
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS reminder_type VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS message TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS scheduled_for DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS sent_at DATETIME NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- ==================== transfusion_orders table ====================
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS orderer_designation VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS orderer_name VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS rhesus VARCHAR(10) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS units_ordered INT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS indication TEXT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS special_requirements TEXT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS crossmatch_status VARCHAR(50) NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS blood_bank_notes TEXT NULL;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS consent_obtained BOOLEAN DEFAULT FALSE;
ALTER TABLE transfusion_orders ADD COLUMN IF NOT EXISTS consent_date DATETIME NULL;

-- ==================== transfusion_monitoring_charts table ====================
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS chart_id VARCHAR(36) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS transfusion_order_id VARCHAR(36) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS start_time DATETIME NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS end_time DATETIME NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS pre_vitals JSON NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS intra_vitals JSON NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS post_vitals JSON NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS reactions JSON NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS reaction_management TEXT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS transfusion_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS volume_transfused INT NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS nurse_name VARCHAR(255) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS verifying_nurse VARCHAR(255) NULL;
ALTER TABLE transfusion_monitoring_charts ADD COLUMN IF NOT EXISTS notes TEXT NULL;
