/**
 * Run comprehensive column migration against DigitalOcean MySQL
 * This adds all missing columns identified from sync errors
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration - requires DO_DB_PASSWORD environment variable
const dbConfig = {
  host: 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: 25060,
  user: 'doadmin',
  password: process.env.DO_DB_PASSWORD,
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 30000
};

if (!dbConfig.password) {
  console.error('ERROR: DO_DB_PASSWORD environment variable is required');
  console.error('Set it with: $env:DO_DB_PASSWORD="your-password"');
  process.exit(1);
}

// ALTER TABLE statements - MySQL doesn't support IF NOT EXISTS for columns,
// so we'll handle errors gracefully
const alterStatements = [
  // AUDIT_LOGS
  { table: 'audit_logs', column: 'updated_at', sql: 'ALTER TABLE audit_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },

  // USERS
  { table: 'users', column: 'has_accepted_agreement', sql: 'ALTER TABLE users ADD COLUMN has_accepted_agreement BOOLEAN DEFAULT FALSE' },
  { table: 'users', column: 'agreement_accepted_at', sql: 'ALTER TABLE users ADD COLUMN agreement_accepted_at TIMESTAMP NULL' },
  { table: 'users', column: 'agreement_version', sql: 'ALTER TABLE users ADD COLUMN agreement_version VARCHAR(50) NULL' },
  { table: 'users', column: 'agreement_device_info', sql: 'ALTER TABLE users ADD COLUMN agreement_device_info TEXT NULL' },
  { table: 'users', column: 'must_change_password', sql: 'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE' },
  { table: 'users', column: 'bank_name', sql: 'ALTER TABLE users ADD COLUMN bank_name VARCHAR(255) NULL' },
  { table: 'users', column: 'bank_account_number', sql: 'ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(50) NULL' },
  { table: 'users', column: 'bank_account_name', sql: 'ALTER TABLE users ADD COLUMN bank_account_name VARCHAR(255) NULL' },
  { table: 'users', column: 'bank_code', sql: 'ALTER TABLE users ADD COLUMN bank_code VARCHAR(20) NULL' },

  // HOSPITALS
  { table: 'hospitals', column: 'icu_beds', sql: 'ALTER TABLE hospitals ADD COLUMN icu_beds INT NULL' },
  { table: 'hospitals', column: 'operating_theatres', sql: 'ALTER TABLE hospitals ADD COLUMN operating_theatres INT NULL' },
  { table: 'hospitals', column: 'is_24_hours', sql: 'ALTER TABLE hospitals ADD COLUMN is_24_hours BOOLEAN DEFAULT FALSE' },
  { table: 'hospitals', column: 'has_emergency', sql: 'ALTER TABLE hospitals ADD COLUMN has_emergency BOOLEAN DEFAULT FALSE' },
  { table: 'hospitals', column: 'has_laboratory', sql: 'ALTER TABLE hospitals ADD COLUMN has_laboratory BOOLEAN DEFAULT FALSE' },
  { table: 'hospitals', column: 'has_pharmacy', sql: 'ALTER TABLE hospitals ADD COLUMN has_pharmacy BOOLEAN DEFAULT FALSE' },
  { table: 'hospitals', column: 'has_radiology', sql: 'ALTER TABLE hospitals ADD COLUMN has_radiology BOOLEAN DEFAULT FALSE' },
  { table: 'hospitals', column: 'specialties', sql: 'ALTER TABLE hospitals ADD COLUMN specialties JSON NULL' },

  // PATIENTS
  { table: 'patients', column: 'next_of_kin', sql: 'ALTER TABLE patients ADD COLUMN next_of_kin JSON NULL' },
  { table: 'patients', column: 'dvt_risk_assessment', sql: 'ALTER TABLE patients ADD COLUMN dvt_risk_assessment JSON NULL' },
  { table: 'patients', column: 'pressure_sore_risk_assessment', sql: 'ALTER TABLE patients ADD COLUMN pressure_sore_risk_assessment JSON NULL' },
  { table: 'patients', column: 'comorbidities', sql: 'ALTER TABLE patients ADD COLUMN comorbidities JSON NULL' },
  { table: 'patients', column: 'care_type', sql: 'ALTER TABLE patients ADD COLUMN care_type VARCHAR(50) NULL' },
  { table: 'patients', column: 'hospital_name', sql: 'ALTER TABLE patients ADD COLUMN hospital_name VARCHAR(255) NULL' },
  { table: 'patients', column: 'ward', sql: 'ALTER TABLE patients ADD COLUMN ward VARCHAR(100) NULL' },

  // VITAL_SIGNS
  { table: 'vital_signs', column: 'spo2', sql: 'ALTER TABLE vital_signs ADD COLUMN spo2 DECIMAL(5,2) NULL' },
  { table: 'vital_signs', column: 'bmi', sql: 'ALTER TABLE vital_signs ADD COLUMN bmi DECIMAL(5,2) NULL' },
  { table: 'vital_signs', column: 'pain_score', sql: 'ALTER TABLE vital_signs ADD COLUMN pain_score INT NULL' },
  { table: 'vital_signs', column: 'blood_glucose', sql: 'ALTER TABLE vital_signs ADD COLUMN blood_glucose DECIMAL(5,2) NULL' },

  // CLINICAL_ENCOUNTERS
  { table: 'clinical_encounters', column: 'started_at', sql: 'ALTER TABLE clinical_encounters ADD COLUMN started_at TIMESTAMP NULL' },
  { table: 'clinical_encounters', column: 'completed_at', sql: 'ALTER TABLE clinical_encounters ADD COLUMN completed_at TIMESTAMP NULL' },
  { table: 'clinical_encounters', column: 'history_of_present_illness', sql: 'ALTER TABLE clinical_encounters ADD COLUMN history_of_present_illness TEXT NULL' },
  { table: 'clinical_encounters', column: 'past_medical_history', sql: 'ALTER TABLE clinical_encounters ADD COLUMN past_medical_history TEXT NULL' },
  { table: 'clinical_encounters', column: 'past_surgical_history', sql: 'ALTER TABLE clinical_encounters ADD COLUMN past_surgical_history TEXT NULL' },
  { table: 'clinical_encounters', column: 'family_history', sql: 'ALTER TABLE clinical_encounters ADD COLUMN family_history TEXT NULL' },
  { table: 'clinical_encounters', column: 'social_history', sql: 'ALTER TABLE clinical_encounters ADD COLUMN social_history TEXT NULL' },
  { table: 'clinical_encounters', column: 'physical_examination', sql: 'ALTER TABLE clinical_encounters ADD COLUMN physical_examination JSON NULL' },

  // SURGERIES
  { table: 'surgeries', column: 'pre_operative_assessment', sql: 'ALTER TABLE surgeries ADD COLUMN pre_operative_assessment JSON NULL' },
  { table: 'surgeries', column: 'surgeon_id', sql: 'ALTER TABLE surgeries ADD COLUMN surgeon_id VARCHAR(255) NULL' },
  { table: 'surgeries', column: 'surgeon_fee', sql: 'ALTER TABLE surgeries ADD COLUMN surgeon_fee DECIMAL(15,2) NULL' },
  { table: 'surgeries', column: 'assistant_id', sql: 'ALTER TABLE surgeries ADD COLUMN assistant_id VARCHAR(255) NULL' },
  { table: 'surgeries', column: 'assistant_fee_percentage', sql: 'ALTER TABLE surgeries ADD COLUMN assistant_fee_percentage DECIMAL(5,2) NULL' },
  { table: 'surgeries', column: 'assistant_fee', sql: 'ALTER TABLE surgeries ADD COLUMN assistant_fee DECIMAL(15,2) NULL' },
  { table: 'surgeries', column: 'anaesthetist_id', sql: 'ALTER TABLE surgeries ADD COLUMN anaesthetist_id VARCHAR(255) NULL' },
  { table: 'surgeries', column: 'scrub_nurse_id', sql: 'ALTER TABLE surgeries ADD COLUMN scrub_nurse_id VARCHAR(255) NULL' },
  { table: 'surgeries', column: 'circulating_nurse_id', sql: 'ALTER TABLE surgeries ADD COLUMN circulating_nurse_id VARCHAR(255) NULL' },
  { table: 'surgeries', column: 'anaesthesia_fee', sql: 'ALTER TABLE surgeries ADD COLUMN anaesthesia_fee DECIMAL(15,2) NULL' },

  // ADMISSIONS
  { table: 'admissions', column: 'ward_name', sql: 'ALTER TABLE admissions ADD COLUMN ward_name VARCHAR(255) NULL' },
  { table: 'admissions', column: 'bed_number', sql: 'ALTER TABLE admissions ADD COLUMN bed_number VARCHAR(50) NULL' },
  { table: 'admissions', column: 'ward_type', sql: 'ALTER TABLE admissions ADD COLUMN ward_type VARCHAR(50) NULL' },
  { table: 'admissions', column: 'admission_time', sql: 'ALTER TABLE admissions ADD COLUMN admission_time VARCHAR(20) NULL' },
  { table: 'admissions', column: 'admitted_from', sql: 'ALTER TABLE admissions ADD COLUMN admitted_from VARCHAR(50) NULL' },
  { table: 'admissions', column: 'admission_number', sql: 'ALTER TABLE admissions ADD COLUMN admission_number VARCHAR(100) NULL' },
  { table: 'admissions', column: 'chief_complaint', sql: 'ALTER TABLE admissions ADD COLUMN chief_complaint TEXT NULL' },
  { table: 'admissions', column: 'indication_for_admission', sql: 'ALTER TABLE admissions ADD COLUMN indication_for_admission TEXT NULL' },
  { table: 'admissions', column: 'severity', sql: 'ALTER TABLE admissions ADD COLUMN severity VARCHAR(50) NULL' },
  { table: 'admissions', column: 'provisional_diagnosis', sql: 'ALTER TABLE admissions ADD COLUMN provisional_diagnosis JSON NULL' },
  { table: 'admissions', column: 'comorbidities', sql: 'ALTER TABLE admissions ADD COLUMN comorbidities JSON NULL' },
  { table: 'admissions', column: 'allergies', sql: 'ALTER TABLE admissions ADD COLUMN allergies JSON NULL' },
  { table: 'admissions', column: 'primary_doctor', sql: 'ALTER TABLE admissions ADD COLUMN primary_doctor VARCHAR(255) NULL' },
  { table: 'admissions', column: 'primary_nurse', sql: 'ALTER TABLE admissions ADD COLUMN primary_nurse VARCHAR(255) NULL' },
  { table: 'admissions', column: 'primary_managing_consultant', sql: 'ALTER TABLE admissions ADD COLUMN primary_managing_consultant VARCHAR(255) NULL' },
  { table: 'admissions', column: 'primary_managing_consultant_name', sql: 'ALTER TABLE admissions ADD COLUMN primary_managing_consultant_name VARCHAR(255) NULL' },
  { table: 'admissions', column: 'consultants', sql: 'ALTER TABLE admissions ADD COLUMN consultants JSON NULL' },
  { table: 'admissions', column: 'treatment_plan_id', sql: 'ALTER TABLE admissions ADD COLUMN treatment_plan_id VARCHAR(255) NULL' },
  { table: 'admissions', column: 'risk_assessments', sql: 'ALTER TABLE admissions ADD COLUMN risk_assessments JSON NULL' },
  { table: 'admissions', column: 'estimated_stay_days', sql: 'ALTER TABLE admissions ADD COLUMN estimated_stay_days INT NULL' },
  { table: 'admissions', column: 'discharge_time', sql: 'ALTER TABLE admissions ADD COLUMN discharge_time VARCHAR(20) NULL' },
  { table: 'admissions', column: 'discharged_by', sql: 'ALTER TABLE admissions ADD COLUMN discharged_by VARCHAR(255) NULL' },
  { table: 'admissions', column: 'discharge_type', sql: 'ALTER TABLE admissions ADD COLUMN discharge_type VARCHAR(50) NULL' },
  { table: 'admissions', column: 'discharge_summary_id', sql: 'ALTER TABLE admissions ADD COLUMN discharge_summary_id VARCHAR(255) NULL' },

  // WOUNDS
  { table: 'wounds', column: 'tissue_type', sql: 'ALTER TABLE wounds ADD COLUMN tissue_type JSON NULL' },
  { table: 'wounds', column: 'exudate_amount', sql: 'ALTER TABLE wounds ADD COLUMN exudate_amount VARCHAR(50) NULL' },
  { table: 'wounds', column: 'exudate_type', sql: 'ALTER TABLE wounds ADD COLUMN exudate_type VARCHAR(50) NULL' },
  { table: 'wounds', column: 'odor', sql: 'ALTER TABLE wounds ADD COLUMN odor BOOLEAN DEFAULT FALSE' },
  { table: 'wounds', column: 'peri_wound_condition', sql: 'ALTER TABLE wounds ADD COLUMN peri_wound_condition TEXT NULL' },
  { table: 'wounds', column: 'pain_level', sql: 'ALTER TABLE wounds ADD COLUMN pain_level INT NULL' },
  { table: 'wounds', column: 'photos', sql: 'ALTER TABLE wounds ADD COLUMN photos JSON NULL' },
  { table: 'wounds', column: 'healing_progress', sql: 'ALTER TABLE wounds ADD COLUMN healing_progress VARCHAR(50) NULL' },
  { table: 'wounds', column: 'dressing_type', sql: 'ALTER TABLE wounds ADD COLUMN dressing_type VARCHAR(255) NULL' },
  { table: 'wounds', column: 'dressing_frequency', sql: 'ALTER TABLE wounds ADD COLUMN dressing_frequency VARCHAR(100) NULL' },

  // LAB_REQUESTS
  { table: 'lab_requests', column: 'collected_at', sql: 'ALTER TABLE lab_requests ADD COLUMN collected_at TIMESTAMP NULL' },
  { table: 'lab_requests', column: 'completed_at', sql: 'ALTER TABLE lab_requests ADD COLUMN completed_at TIMESTAMP NULL' },
  { table: 'lab_requests', column: 'tests', sql: 'ALTER TABLE lab_requests ADD COLUMN tests JSON NULL' },
  { table: 'lab_requests', column: 'clinical_info', sql: 'ALTER TABLE lab_requests ADD COLUMN clinical_info TEXT NULL' },

  // INVESTIGATIONS
  { table: 'investigations', column: 'hospital_name', sql: 'ALTER TABLE investigations ADD COLUMN hospital_name VARCHAR(255) NULL' },
  { table: 'investigations', column: 'type_name', sql: 'ALTER TABLE investigations ADD COLUMN type_name VARCHAR(255) NULL' },
  { table: 'investigations', column: 'fasting', sql: 'ALTER TABLE investigations ADD COLUMN fasting BOOLEAN DEFAULT FALSE' },
  { table: 'investigations', column: 'sample_collected_at', sql: 'ALTER TABLE investigations ADD COLUMN sample_collected_at TIMESTAMP NULL' },
  { table: 'investigations', column: 'processing_started_at', sql: 'ALTER TABLE investigations ADD COLUMN processing_started_at TIMESTAMP NULL' },
  { table: 'investigations', column: 'processed_at', sql: 'ALTER TABLE investigations ADD COLUMN processed_at TIMESTAMP NULL' },
  { table: 'investigations', column: 'processed_by', sql: 'ALTER TABLE investigations ADD COLUMN processed_by VARCHAR(255) NULL' },
  { table: 'investigations', column: 'completed_by', sql: 'ALTER TABLE investigations ADD COLUMN completed_by VARCHAR(255) NULL' },
  { table: 'investigations', column: 'completed_by_name', sql: 'ALTER TABLE investigations ADD COLUMN completed_by_name VARCHAR(255) NULL' },
  { table: 'investigations', column: 'reported_by', sql: 'ALTER TABLE investigations ADD COLUMN reported_by VARCHAR(255) NULL' },
  { table: 'investigations', column: 'results', sql: 'ALTER TABLE investigations ADD COLUMN results JSON NULL' },
  { table: 'investigations', column: 'attachments', sql: 'ALTER TABLE investigations ADD COLUMN attachments JSON NULL' },
  { table: 'investigations', column: 'interpretation', sql: 'ALTER TABLE investigations ADD COLUMN interpretation TEXT NULL' },
  { table: 'investigations', column: 'clinical_details', sql: 'ALTER TABLE investigations ADD COLUMN clinical_details TEXT NULL' },
  { table: 'investigations', column: 'requested_by_name', sql: 'ALTER TABLE investigations ADD COLUMN requested_by_name VARCHAR(255) NULL' },
  { table: 'investigations', column: 'collected_at', sql: 'ALTER TABLE investigations ADD COLUMN collected_at TIMESTAMP NULL' },
  { table: 'investigations', column: 'collected_by', sql: 'ALTER TABLE investigations ADD COLUMN collected_by VARCHAR(255) NULL' },
  { table: 'investigations', column: 'completed_at', sql: 'ALTER TABLE investigations ADD COLUMN completed_at TIMESTAMP NULL' },

  // PRESCRIPTIONS
  { table: 'prescriptions', column: 'prescribed_at', sql: 'ALTER TABLE prescriptions ADD COLUMN prescribed_at TIMESTAMP NULL' },
  { table: 'prescriptions', column: 'dispensed_by', sql: 'ALTER TABLE prescriptions ADD COLUMN dispensed_by VARCHAR(255) NULL' },
  { table: 'prescriptions', column: 'dispensed_at', sql: 'ALTER TABLE prescriptions ADD COLUMN dispensed_at TIMESTAMP NULL' },
  { table: 'prescriptions', column: 'medications', sql: 'ALTER TABLE prescriptions ADD COLUMN medications JSON NULL' },

  // MEDICATION_CHARTS
  { table: 'medication_charts', column: 'sync_status', sql: "ALTER TABLE medication_charts ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending'" },
  { table: 'medication_charts', column: 'assigned_nurse_name', sql: 'ALTER TABLE medication_charts ADD COLUMN assigned_nurse_name VARCHAR(255) NULL' },
  { table: 'medication_charts', column: 'scheduled_medications', sql: 'ALTER TABLE medication_charts ADD COLUMN scheduled_medications JSON NULL' },
  { table: 'medication_charts', column: 'administrations', sql: 'ALTER TABLE medication_charts ADD COLUMN administrations JSON NULL' },
  { table: 'medication_charts', column: 'total_scheduled', sql: 'ALTER TABLE medication_charts ADD COLUMN total_scheduled INT DEFAULT 0' },
  { table: 'medication_charts', column: 'total_administered', sql: 'ALTER TABLE medication_charts ADD COLUMN total_administered INT DEFAULT 0' },
  { table: 'medication_charts', column: 'compliance_rate', sql: 'ALTER TABLE medication_charts ADD COLUMN compliance_rate DECIMAL(5,2) NULL' },
  { table: 'medication_charts', column: 'completed_at', sql: 'ALTER TABLE medication_charts ADD COLUMN completed_at TIMESTAMP NULL' },
  { table: 'medication_charts', column: 'supervisor_review', sql: 'ALTER TABLE medication_charts ADD COLUMN supervisor_review JSON NULL' },
  { table: 'medication_charts', column: 'general_notes', sql: 'ALTER TABLE medication_charts ADD COLUMN general_notes TEXT NULL' },
  { table: 'medication_charts', column: 'handover_notes', sql: 'ALTER TABLE medication_charts ADD COLUMN handover_notes TEXT NULL' },

  // TREATMENT_PLANS
  { table: 'treatment_plans', column: 'clinical_goals', sql: 'ALTER TABLE treatment_plans ADD COLUMN clinical_goals JSON NULL' },
  { table: 'treatment_plans', column: 'orders', sql: 'ALTER TABLE treatment_plans ADD COLUMN orders JSON NULL' },
  { table: 'treatment_plans', column: 'frequency', sql: 'ALTER TABLE treatment_plans ADD COLUMN frequency VARCHAR(100) NULL' },
  { table: 'treatment_plans', column: 'expected_end_date', sql: 'ALTER TABLE treatment_plans ADD COLUMN expected_end_date TIMESTAMP NULL' },
  { table: 'treatment_plans', column: 'actual_end_date', sql: 'ALTER TABLE treatment_plans ADD COLUMN actual_end_date TIMESTAMP NULL' },
  { table: 'treatment_plans', column: 'phase', sql: 'ALTER TABLE treatment_plans ADD COLUMN phase VARCHAR(100) NULL' },
  { table: 'treatment_plans', column: 'related_entity_id', sql: 'ALTER TABLE treatment_plans ADD COLUMN related_entity_id VARCHAR(255) NULL' },
  { table: 'treatment_plans', column: 'related_entity_type', sql: 'ALTER TABLE treatment_plans ADD COLUMN related_entity_type VARCHAR(50) NULL' },

  // TREATMENT_PROGRESS
  { table: 'treatment_progress', column: 'measurements', sql: 'ALTER TABLE treatment_progress ADD COLUMN measurements JSON NULL' },
  { table: 'treatment_progress', column: 'orders_executed', sql: 'ALTER TABLE treatment_progress ADD COLUMN orders_executed JSON NULL' },
  { table: 'treatment_progress', column: 'outcome_assessment', sql: 'ALTER TABLE treatment_progress ADD COLUMN outcome_assessment VARCHAR(50) NULL' },
  { table: 'treatment_progress', column: 'clinician_notes', sql: 'ALTER TABLE treatment_progress ADD COLUMN clinician_notes TEXT NULL' },
  { table: 'treatment_progress', column: 'photos', sql: 'ALTER TABLE treatment_progress ADD COLUMN photos JSON NULL' },

  // APPOINTMENTS
  { table: 'appointments', column: 'duration', sql: 'ALTER TABLE appointments ADD COLUMN duration INT DEFAULT 30' },
  { table: 'appointments', column: 'appointment_number', sql: 'ALTER TABLE appointments ADD COLUMN appointment_number VARCHAR(100) NULL' },
  { table: 'appointments', column: 'appointment_time', sql: 'ALTER TABLE appointments ADD COLUMN appointment_time VARCHAR(20) NULL' },
  { table: 'appointments', column: 'priority', sql: "ALTER TABLE appointments ADD COLUMN priority VARCHAR(50) DEFAULT 'routine'" },
  { table: 'appointments', column: 'location', sql: 'ALTER TABLE appointments ADD COLUMN location JSON NULL' },
  { table: 'appointments', column: 'reason_for_visit', sql: 'ALTER TABLE appointments ADD COLUMN reason_for_visit TEXT NULL' },
  { table: 'appointments', column: 'related_encounter_id', sql: 'ALTER TABLE appointments ADD COLUMN related_encounter_id VARCHAR(255) NULL' },
  { table: 'appointments', column: 'related_surgery_id', sql: 'ALTER TABLE appointments ADD COLUMN related_surgery_id VARCHAR(255) NULL' },
  { table: 'appointments', column: 'related_wound_id', sql: 'ALTER TABLE appointments ADD COLUMN related_wound_id VARCHAR(255) NULL' },
  { table: 'appointments', column: 'clinician_id', sql: 'ALTER TABLE appointments ADD COLUMN clinician_id VARCHAR(255) NULL' },
  { table: 'appointments', column: 'clinician_name', sql: 'ALTER TABLE appointments ADD COLUMN clinician_name VARCHAR(255) NULL' },
  { table: 'appointments', column: 'patient_whats_app', sql: 'ALTER TABLE appointments ADD COLUMN patient_whats_app VARCHAR(50) NULL' },
  { table: 'appointments', column: 'patient_phone', sql: 'ALTER TABLE appointments ADD COLUMN patient_phone VARCHAR(50) NULL' },
  { table: 'appointments', column: 'patient_email', sql: 'ALTER TABLE appointments ADD COLUMN patient_email VARCHAR(255) NULL' },
  { table: 'appointments', column: 'reminder_enabled', sql: 'ALTER TABLE appointments ADD COLUMN reminder_enabled BOOLEAN DEFAULT TRUE' },
  { table: 'appointments', column: 'reminder_schedule', sql: 'ALTER TABLE appointments ADD COLUMN reminder_schedule JSON NULL' },
  { table: 'appointments', column: 'booked_by', sql: 'ALTER TABLE appointments ADD COLUMN booked_by VARCHAR(255) NULL' },
  { table: 'appointments', column: 'booked_at', sql: 'ALTER TABLE appointments ADD COLUMN booked_at TIMESTAMP NULL' },
  { table: 'appointments', column: 'last_modified_by', sql: 'ALTER TABLE appointments ADD COLUMN last_modified_by VARCHAR(255) NULL' },
  { table: 'appointments', column: 'checked_in_at', sql: 'ALTER TABLE appointments ADD COLUMN checked_in_at TIMESTAMP NULL' },
  { table: 'appointments', column: 'seen_at', sql: 'ALTER TABLE appointments ADD COLUMN seen_at TIMESTAMP NULL' },
  { table: 'appointments', column: 'completed_at', sql: 'ALTER TABLE appointments ADD COLUMN completed_at TIMESTAMP NULL' },
  { table: 'appointments', column: 'outcome_notes', sql: 'ALTER TABLE appointments ADD COLUMN outcome_notes TEXT NULL' },
  { table: 'appointments', column: 'next_appointment_id', sql: 'ALTER TABLE appointments ADD COLUMN next_appointment_id VARCHAR(255) NULL' },
  { table: 'appointments', column: 'sync_status', sql: "ALTER TABLE appointments ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending'" },

  // APPOINTMENT_REMINDERS
  { table: 'appointment_reminders', column: 'message_template', sql: 'ALTER TABLE appointment_reminders ADD COLUMN message_template TEXT NULL' },
  { table: 'appointment_reminders', column: 'message_content', sql: 'ALTER TABLE appointment_reminders ADD COLUMN message_content TEXT NULL' },
  { table: 'appointment_reminders', column: 'channel', sql: 'ALTER TABLE appointment_reminders ADD COLUMN channel VARCHAR(50) NULL' },
  { table: 'appointment_reminders', column: 'scheduled_for', sql: 'ALTER TABLE appointment_reminders ADD COLUMN scheduled_for TIMESTAMP NULL' },
  { table: 'appointment_reminders', column: 'sent_at', sql: 'ALTER TABLE appointment_reminders ADD COLUMN sent_at TIMESTAMP NULL' },
  { table: 'appointment_reminders', column: 'delivered_at', sql: 'ALTER TABLE appointment_reminders ADD COLUMN delivered_at TIMESTAMP NULL' },
  { table: 'appointment_reminders', column: 'whats_app_number', sql: 'ALTER TABLE appointment_reminders ADD COLUMN whats_app_number VARCHAR(50) NULL' },
  { table: 'appointment_reminders', column: 'whats_app_message_id', sql: 'ALTER TABLE appointment_reminders ADD COLUMN whats_app_message_id VARCHAR(255) NULL' },
  { table: 'appointment_reminders', column: 'patient_response', sql: 'ALTER TABLE appointment_reminders ADD COLUMN patient_response VARCHAR(50) NULL' },
  { table: 'appointment_reminders', column: 'response_received_at', sql: 'ALTER TABLE appointment_reminders ADD COLUMN response_received_at TIMESTAMP NULL' },
  { table: 'appointment_reminders', column: 'failure_reason', sql: 'ALTER TABLE appointment_reminders ADD COLUMN failure_reason TEXT NULL' },
  { table: 'appointment_reminders', column: 'retry_count', sql: 'ALTER TABLE appointment_reminders ADD COLUMN retry_count INT DEFAULT 0' },
  { table: 'appointment_reminders', column: 'max_retries', sql: 'ALTER TABLE appointment_reminders ADD COLUMN max_retries INT DEFAULT 3' },

  // INVOICES
  { table: 'invoices', column: 'tax', sql: 'ALTER TABLE invoices ADD COLUMN tax DECIMAL(15,2) NULL' },
  { table: 'invoices', column: 'subtotal', sql: 'ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(15,2) NULL' },
  { table: 'invoices', column: 'discount', sql: 'ALTER TABLE invoices ADD COLUMN discount DECIMAL(15,2) NULL' },
  { table: 'invoices', column: 'balance', sql: 'ALTER TABLE invoices ADD COLUMN balance DECIMAL(15,2) NULL' },
  { table: 'invoices', column: 'total_amount', sql: 'ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(15,2) NULL' },
  { table: 'invoices', column: 'paid_amount', sql: 'ALTER TABLE invoices ADD COLUMN paid_amount DECIMAL(15,2) NULL' },
  { table: 'invoices', column: 'items', sql: 'ALTER TABLE invoices ADD COLUMN items JSON NULL' },
  { table: 'invoices', column: 'due_date', sql: 'ALTER TABLE invoices ADD COLUMN due_date TIMESTAMP NULL' },
  { table: 'invoices', column: 'paid_at', sql: 'ALTER TABLE invoices ADD COLUMN paid_at TIMESTAMP NULL' },
  { table: 'invoices', column: 'payment_method', sql: 'ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(50) NULL' },

  // VIDEO_CONFERENCES
  { table: 'video_conferences', column: 'invited_users', sql: 'ALTER TABLE video_conferences ADD COLUMN invited_users JSON NULL' },
  { table: 'video_conferences', column: 'participants', sql: 'ALTER TABLE video_conferences ADD COLUMN participants JSON NULL' },
  { table: 'video_conferences', column: 'settings', sql: 'ALTER TABLE video_conferences ADD COLUMN settings JSON NULL' },
  { table: 'video_conferences', column: 'presentation', sql: 'ALTER TABLE video_conferences ADD COLUMN presentation JSON NULL' },
  { table: 'video_conferences', column: 'recordings', sql: 'ALTER TABLE video_conferences ADD COLUMN recordings JSON NULL' },
  { table: 'video_conferences', column: 'chat_enabled', sql: 'ALTER TABLE video_conferences ADD COLUMN chat_enabled BOOLEAN DEFAULT TRUE' },
  { table: 'video_conferences', column: 'chat_messages', sql: 'ALTER TABLE video_conferences ADD COLUMN chat_messages JSON NULL' },
  { table: 'video_conferences', column: 'scheduled_end', sql: 'ALTER TABLE video_conferences ADD COLUMN scheduled_end TIMESTAMP NULL' },
  { table: 'video_conferences', column: 'actual_start', sql: 'ALTER TABLE video_conferences ADD COLUMN actual_start TIMESTAMP NULL' },
  { table: 'video_conferences', column: 'actual_end', sql: 'ALTER TABLE video_conferences ADD COLUMN actual_end TIMESTAMP NULL' },

  // PREOPERATIVE_ASSESSMENTS
  { table: 'preoperative_assessments', column: 'cardiac_risk', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN cardiac_risk JSON NULL' },
  { table: 'preoperative_assessments', column: 'airway_assessment', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN airway_assessment JSON NULL' },
  { table: 'preoperative_assessments', column: 'vte_risk', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN vte_risk JSON NULL' },
  { table: 'preoperative_assessments', column: 'bleeding_risk', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN bleeding_risk JSON NULL' },
  { table: 'preoperative_assessments', column: 'asa_class', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN asa_class INT NULL' },
  { table: 'preoperative_assessments', column: 'asa_emergency', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN asa_emergency BOOLEAN DEFAULT FALSE' },
  { table: 'preoperative_assessments', column: 'surgery_name', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN surgery_name VARCHAR(255) NULL' },
  { table: 'preoperative_assessments', column: 'surgery_type', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN surgery_type VARCHAR(50) NULL' },
  { table: 'preoperative_assessments', column: 'scheduled_date', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN scheduled_date TIMESTAMP NULL' },
  { table: 'preoperative_assessments', column: 'patient_name', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN patient_name VARCHAR(255) NULL' },
  { table: 'preoperative_assessments', column: 'hospital_number', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN hospital_number VARCHAR(100) NULL' },
  { table: 'preoperative_assessments', column: 'clearance_status', sql: "ALTER TABLE preoperative_assessments ADD COLUMN clearance_status VARCHAR(50) DEFAULT 'pending_review'" },
  { table: 'preoperative_assessments', column: 'clearance_notes', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN clearance_notes TEXT NULL' },
  { table: 'preoperative_assessments', column: 'assessed_by', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN assessed_by VARCHAR(255) NULL' },
  { table: 'preoperative_assessments', column: 'assessed_at', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN assessed_at TIMESTAMP NULL' },
  { table: 'preoperative_assessments', column: 'reviewed_by', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN reviewed_by VARCHAR(255) NULL' },
  { table: 'preoperative_assessments', column: 'reviewed_at', sql: 'ALTER TABLE preoperative_assessments ADD COLUMN reviewed_at TIMESTAMP NULL' },

  // EXTERNAL_REVIEWS
  { table: 'external_reviews', column: 'surgeries', sql: 'ALTER TABLE external_reviews ADD COLUMN surgeries JSON NULL' },
  { table: 'external_reviews', column: 'folder_number', sql: 'ALTER TABLE external_reviews ADD COLUMN folder_number VARCHAR(100) NULL' },
  { table: 'external_reviews', column: 'services_rendered', sql: 'ALTER TABLE external_reviews ADD COLUMN services_rendered TEXT NULL' },
  { table: 'external_reviews', column: 'fee', sql: 'ALTER TABLE external_reviews ADD COLUMN fee DECIMAL(15,2) NULL' },
  { table: 'external_reviews', column: 'service_date', sql: 'ALTER TABLE external_reviews ADD COLUMN service_date VARCHAR(50) NULL' },
  { table: 'external_reviews', column: 'patient_name', sql: 'ALTER TABLE external_reviews ADD COLUMN patient_name VARCHAR(255) NULL' },
  { table: 'external_reviews', column: 'hospital_name', sql: 'ALTER TABLE external_reviews ADD COLUMN hospital_name VARCHAR(255) NULL' },
  { table: 'external_reviews', column: 'created_by_name', sql: 'ALTER TABLE external_reviews ADD COLUMN created_by_name VARCHAR(255) NULL' },
  { table: 'external_reviews', column: 'sync_status', sql: "ALTER TABLE external_reviews ADD COLUMN sync_status VARCHAR(50) DEFAULT 'pending'" },

  // TRANSFUSION_ORDERS
  { table: 'transfusion_orders', column: 'patient_blood_group', sql: 'ALTER TABLE transfusion_orders ADD COLUMN patient_blood_group VARCHAR(10) NULL' },
  { table: 'transfusion_orders', column: 'patient_rh_factor', sql: 'ALTER TABLE transfusion_orders ADD COLUMN patient_rh_factor VARCHAR(10) NULL' },
  { table: 'transfusion_orders', column: 'patient_genotype', sql: 'ALTER TABLE transfusion_orders ADD COLUMN patient_genotype VARCHAR(10) NULL' },
  { table: 'transfusion_orders', column: 'antibody_screen_result', sql: 'ALTER TABLE transfusion_orders ADD COLUMN antibody_screen_result VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'crossmatch_result', sql: 'ALTER TABLE transfusion_orders ADD COLUMN crossmatch_result VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'crossmatch_date', sql: 'ALTER TABLE transfusion_orders ADD COLUMN crossmatch_date TIMESTAMP NULL' },
  { table: 'transfusion_orders', column: 'product_type', sql: 'ALTER TABLE transfusion_orders ADD COLUMN product_type VARCHAR(100) NULL' },
  { table: 'transfusion_orders', column: 'product_code', sql: 'ALTER TABLE transfusion_orders ADD COLUMN product_code VARCHAR(100) NULL' },
  { table: 'transfusion_orders', column: 'number_of_units', sql: 'ALTER TABLE transfusion_orders ADD COLUMN number_of_units INT NULL' },
  { table: 'transfusion_orders', column: 'volume_per_unit', sql: 'ALTER TABLE transfusion_orders ADD COLUMN volume_per_unit INT NULL' },
  { table: 'transfusion_orders', column: 'blood_group_of_product', sql: 'ALTER TABLE transfusion_orders ADD COLUMN blood_group_of_product VARCHAR(10) NULL' },
  { table: 'transfusion_orders', column: 'donor_id', sql: 'ALTER TABLE transfusion_orders ADD COLUMN donor_id VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'collection_date', sql: 'ALTER TABLE transfusion_orders ADD COLUMN collection_date TIMESTAMP NULL' },
  { table: 'transfusion_orders', column: 'expiry_date', sql: 'ALTER TABLE transfusion_orders ADD COLUMN expiry_date TIMESTAMP NULL' },
  { table: 'transfusion_orders', column: 'blood_bank_name', sql: 'ALTER TABLE transfusion_orders ADD COLUMN blood_bank_name VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'blood_bank_address', sql: 'ALTER TABLE transfusion_orders ADD COLUMN blood_bank_address TEXT NULL' },
  { table: 'transfusion_orders', column: 'blood_bank_phone', sql: 'ALTER TABLE transfusion_orders ADD COLUMN blood_bank_phone VARCHAR(50) NULL' },
  { table: 'transfusion_orders', column: 'screening_tests', sql: 'ALTER TABLE transfusion_orders ADD COLUMN screening_tests JSON NULL' },
  { table: 'transfusion_orders', column: 'rate_of_transfusion', sql: 'ALTER TABLE transfusion_orders ADD COLUMN rate_of_transfusion DECIMAL(10,2) NULL' },
  { table: 'transfusion_orders', column: 'estimated_duration', sql: 'ALTER TABLE transfusion_orders ADD COLUMN estimated_duration VARCHAR(100) NULL' },
  { table: 'transfusion_orders', column: 'pre_transfusion_vitals', sql: 'ALTER TABLE transfusion_orders ADD COLUMN pre_transfusion_vitals JSON NULL' },
  { table: 'transfusion_orders', column: 'consent_obtained', sql: 'ALTER TABLE transfusion_orders ADD COLUMN consent_obtained BOOLEAN DEFAULT FALSE' },
  { table: 'transfusion_orders', column: 'consent_date', sql: 'ALTER TABLE transfusion_orders ADD COLUMN consent_date TIMESTAMP NULL' },
  { table: 'transfusion_orders', column: 'consent_witness', sql: 'ALTER TABLE transfusion_orders ADD COLUMN consent_witness VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'verifying_nurse_1', sql: 'ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse_1 VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'verifying_nurse_2', sql: 'ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse_2 VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'ward_bed', sql: 'ALTER TABLE transfusion_orders ADD COLUMN ward_bed VARCHAR(100) NULL' },
  { table: 'transfusion_orders', column: 'diagnosis', sql: 'ALTER TABLE transfusion_orders ADD COLUMN diagnosis TEXT NULL' },
  { table: 'transfusion_orders', column: 'orderer_designation', sql: 'ALTER TABLE transfusion_orders ADD COLUMN orderer_designation VARCHAR(255) NULL' },
  { table: 'transfusion_orders', column: 'indication', sql: 'ALTER TABLE transfusion_orders ADD COLUMN indication TEXT NULL' },
  { table: 'transfusion_orders', column: 'hemoglobin_level', sql: 'ALTER TABLE transfusion_orders ADD COLUMN hemoglobin_level DECIMAL(5,2) NULL' },
  { table: 'transfusion_orders', column: 'platelet_count', sql: 'ALTER TABLE transfusion_orders ADD COLUMN platelet_count DECIMAL(10,2) NULL' },
  { table: 'transfusion_orders', column: 'inr', sql: 'ALTER TABLE transfusion_orders ADD COLUMN inr DECIMAL(5,2) NULL' },
  { table: 'transfusion_orders', column: 'fibrinogen', sql: 'ALTER TABLE transfusion_orders ADD COLUMN fibrinogen DECIMAL(10,2) NULL' },

  // TRANSFUSION_MONITORING_CHARTS
  { table: 'transfusion_monitoring_charts', column: 'patient_name', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN patient_name VARCHAR(255) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'hospital_number', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN hospital_number VARCHAR(100) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'ward_bed', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN ward_bed VARCHAR(100) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'chart_date', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN chart_date TIMESTAMP NULL' },
  { table: 'transfusion_monitoring_charts', column: 'product_type', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN product_type VARCHAR(100) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'unit_number', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN unit_number VARCHAR(100) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'start_time', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN start_time VARCHAR(20) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'end_time', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN end_time VARCHAR(20) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'entries', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN entries JSON NULL' },
  { table: 'transfusion_monitoring_charts', column: 'total_volume_transfused', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN total_volume_transfused INT NULL' },
  { table: 'transfusion_monitoring_charts', column: 'complications', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN complications TEXT NULL' },
  { table: 'transfusion_monitoring_charts', column: 'outcome', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN outcome VARCHAR(100) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'nurse_signature', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN nurse_signature VARCHAR(255) NULL' },
  { table: 'transfusion_monitoring_charts', column: 'doctor_review', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN doctor_review TEXT NULL' },
  { table: 'transfusion_monitoring_charts', column: 'uploaded_chart_url', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN uploaded_chart_url TEXT NULL' },
  { table: 'transfusion_monitoring_charts', column: 'uploaded_chart_base64', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN uploaded_chart_base64 LONGTEXT NULL' },
  { table: 'transfusion_monitoring_charts', column: 'ocr_text', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN ocr_text TEXT NULL' },
  { table: 'transfusion_monitoring_charts', column: 'ocr_processed_at', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN ocr_processed_at TIMESTAMP NULL' },
  { table: 'transfusion_monitoring_charts', column: 'chart_id', sql: 'ALTER TABLE transfusion_monitoring_charts ADD COLUMN chart_id VARCHAR(255) NULL' },

  // MEETING_MINUTES
  { table: 'meeting_minutes', column: 'start_time', sql: 'ALTER TABLE meeting_minutes ADD COLUMN start_time TIMESTAMP NULL' },
  { table: 'meeting_minutes', column: 'end_time', sql: 'ALTER TABLE meeting_minutes ADD COLUMN end_time TIMESTAMP NULL' },
  { table: 'meeting_minutes', column: 'duration', sql: 'ALTER TABLE meeting_minutes ADD COLUMN duration INT NULL' },
  { table: 'meeting_minutes', column: 'location', sql: 'ALTER TABLE meeting_minutes ADD COLUMN location VARCHAR(255) NULL' },
  { table: 'meeting_minutes', column: 'room_code', sql: 'ALTER TABLE meeting_minutes ADD COLUMN room_code VARCHAR(100) NULL' },
  { table: 'meeting_minutes', column: 'meeting_type', sql: 'ALTER TABLE meeting_minutes ADD COLUMN meeting_type VARCHAR(50) NULL' },
  { table: 'meeting_minutes', column: 'meeting_date', sql: 'ALTER TABLE meeting_minutes ADD COLUMN meeting_date TIMESTAMP NULL' },
  { table: 'meeting_minutes', column: 'host_id', sql: 'ALTER TABLE meeting_minutes ADD COLUMN host_id VARCHAR(255) NULL' },
  { table: 'meeting_minutes', column: 'host_name', sql: 'ALTER TABLE meeting_minutes ADD COLUMN host_name VARCHAR(255) NULL' },
  { table: 'meeting_minutes', column: 'attendees', sql: 'ALTER TABLE meeting_minutes ADD COLUMN attendees JSON NULL' },
  { table: 'meeting_minutes', column: 'absentees', sql: 'ALTER TABLE meeting_minutes ADD COLUMN absentees JSON NULL' },
  { table: 'meeting_minutes', column: 'agenda', sql: 'ALTER TABLE meeting_minutes ADD COLUMN agenda JSON NULL' },
  { table: 'meeting_minutes', column: 'transcript', sql: 'ALTER TABLE meeting_minutes ADD COLUMN transcript JSON NULL' },
  { table: 'meeting_minutes', column: 'raw_transcript_text', sql: 'ALTER TABLE meeting_minutes ADD COLUMN raw_transcript_text LONGTEXT NULL' },
  { table: 'meeting_minutes', column: 'ai_summary', sql: 'ALTER TABLE meeting_minutes ADD COLUMN ai_summary TEXT NULL' },
  { table: 'meeting_minutes', column: 'key_points', sql: 'ALTER TABLE meeting_minutes ADD COLUMN key_points JSON NULL' },
  { table: 'meeting_minutes', column: 'action_items', sql: 'ALTER TABLE meeting_minutes ADD COLUMN action_items JSON NULL' },
  { table: 'meeting_minutes', column: 'decisions_reached', sql: 'ALTER TABLE meeting_minutes ADD COLUMN decisions_reached JSON NULL' },
  { table: 'meeting_minutes', column: 'discussion_highlights', sql: 'ALTER TABLE meeting_minutes ADD COLUMN discussion_highlights JSON NULL' },
  { table: 'meeting_minutes', column: 'next_steps', sql: 'ALTER TABLE meeting_minutes ADD COLUMN next_steps JSON NULL' },
  { table: 'meeting_minutes', column: 'patient_id', sql: 'ALTER TABLE meeting_minutes ADD COLUMN patient_id VARCHAR(255) NULL' },
  { table: 'meeting_minutes', column: 'patient_name', sql: 'ALTER TABLE meeting_minutes ADD COLUMN patient_name VARCHAR(255) NULL' },
  { table: 'meeting_minutes', column: 'clinical_notes', sql: 'ALTER TABLE meeting_minutes ADD COLUMN clinical_notes TEXT NULL' },
  { table: 'meeting_minutes', column: 'has_recording', sql: 'ALTER TABLE meeting_minutes ADD COLUMN has_recording BOOLEAN DEFAULT FALSE' },
  { table: 'meeting_minutes', column: 'recording_url', sql: 'ALTER TABLE meeting_minutes ADD COLUMN recording_url TEXT NULL' },
  { table: 'meeting_minutes', column: 'recording_duration', sql: 'ALTER TABLE meeting_minutes ADD COLUMN recording_duration INT NULL' },
  { table: 'meeting_minutes', column: 'shared_with', sql: 'ALTER TABLE meeting_minutes ADD COLUMN shared_with JSON NULL' },
  { table: 'meeting_minutes', column: 'shared_at', sql: 'ALTER TABLE meeting_minutes ADD COLUMN shared_at TIMESTAMP NULL' },
  { table: 'meeting_minutes', column: 'exported_formats', sql: 'ALTER TABLE meeting_minutes ADD COLUMN exported_formats JSON NULL' },
  { table: 'meeting_minutes', column: 'created_by_name', sql: 'ALTER TABLE meeting_minutes ADD COLUMN created_by_name VARCHAR(255) NULL' },
  { table: 'meeting_minutes', column: 'finalized_at', sql: 'ALTER TABLE meeting_minutes ADD COLUMN finalized_at TIMESTAMP NULL' },
  { table: 'meeting_minutes', column: 'finalized_by', sql: 'ALTER TABLE meeting_minutes ADD COLUMN finalized_by VARCHAR(255) NULL' },
];

async function runMigration() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE COLUMN MIGRATION');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Total statements: ${alterStatements.length}`);
  console.log('='.repeat(60));

  let connection;
  try {
    console.log('\nConnecting to DigitalOcean MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully\n');

    let added = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    for (const stmt of alterStatements) {
      try {
        await connection.query(stmt.sql);
        console.log(`✅ Added: ${stmt.table}.${stmt.column}`);
        added++;
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
          console.log(`⏭️  Skipped (exists): ${stmt.table}.${stmt.column}`);
          skipped++;
        } else if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
          console.log(`⚠️  Table missing: ${stmt.table} - skipping ${stmt.column}`);
          skipped++;
        } else {
          console.log(`❌ Failed: ${stmt.table}.${stmt.column} - ${error.message}`);
          errors.push({ ...stmt, error: error.message });
          failed++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️  Skipped (already exists): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\nFailed statements:');
      errors.forEach(e => {
        console.log(`  - ${e.table}.${e.column}: ${e.error}`);
      });
    }

    console.log(`\nCompleted: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

runMigration();
