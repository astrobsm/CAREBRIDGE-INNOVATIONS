-- ============================================
-- COMPLETE MISSING TABLES MIGRATION
-- AstroHEALTH - DigitalOcean MySQL Database
-- Generated: 2026-01-28
-- This script adds all 24+ tables that exist in Dexie but are missing from MySQL
-- ============================================

-- ============================================
-- 1. AUDIT & SYNC TABLES
-- ============================================

-- Audit Logs - System audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(36),
  old_value JSON,
  new_value JSON,
  ip_address VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_user (user_id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_timestamp (timestamp)
);

-- Sync Status - Track sync state per entity
CREATE TABLE IF NOT EXISTS sync_status (
  id VARCHAR(36) PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  last_synced_at TIMESTAMP NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sync_status_entity (entity_type, entity_id),
  INDEX idx_sync_status_status (status)
);

-- ============================================
-- 2. ADMISSION EXTENDED TABLES
-- ============================================

-- Admission Notes
CREATE TABLE IF NOT EXISTS admission_notes (
  id VARCHAR(36) PRIMARY KEY,
  admission_id VARCHAR(36) NOT NULL,
  note_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  author_id VARCHAR(36),
  author_role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admission_notes_admission (admission_id),
  INDEX idx_admission_notes_type (note_type),
  FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE
);

-- Bed Assignments - Track bed transfers
CREATE TABLE IF NOT EXISTS bed_assignments (
  id VARCHAR(36) PRIMARY KEY,
  admission_id VARCHAR(36) NOT NULL,
  ward_name VARCHAR(100) NOT NULL,
  bed_number VARCHAR(50) NOT NULL,
  assigned_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_to TIMESTAMP NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bed_assignments_admission (admission_id),
  FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE
);

-- ============================================
-- 3. STAFF ASSIGNMENT TABLES
-- ============================================

-- Doctor Patient Assignments
CREATE TABLE IF NOT EXISTS doctor_assignments (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  doctor_id VARCHAR(36) NOT NULL,
  doctor_name VARCHAR(255),
  doctor_specialty VARCHAR(100),
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255),
  hospital_number VARCHAR(100),
  ward_name VARCHAR(100),
  bed_number VARCHAR(50),
  assignment_type VARCHAR(50) DEFAULT 'primary',
  priority VARCHAR(50) DEFAULT 'routine',
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  assigned_by VARCHAR(36),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_doctor_assignments_doctor (doctor_id),
  INDEX idx_doctor_assignments_patient (patient_id),
  INDEX idx_doctor_assignments_status (status),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Nurse Patient Assignments (different from nurse_patient_assignments for medication charts)
CREATE TABLE IF NOT EXISTS nurse_assignments (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  nurse_id VARCHAR(36) NOT NULL,
  nurse_name VARCHAR(255),
  nurse_specialty VARCHAR(100),
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255),
  hospital_number VARCHAR(100),
  ward_name VARCHAR(100),
  bed_number VARCHAR(50),
  shift_type VARCHAR(50) DEFAULT 'morning',
  assignment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  care_level VARCHAR(50) DEFAULT 'routine',
  tasks JSON,
  notes TEXT,
  assigned_by VARCHAR(36),
  handover_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nurse_assignments_nurse (nurse_id),
  INDEX idx_nurse_assignments_patient (patient_id),
  INDEX idx_nurse_assignments_date (assignment_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Staff Patient Assignments (for billing purposes)
CREATE TABLE IF NOT EXISTS staff_patient_assignments (
  id VARCHAR(36) PRIMARY KEY,
  admission_id VARCHAR(36),
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255),
  hospital_number VARCHAR(100),
  hospital_id VARCHAR(36),
  staff_id VARCHAR(36) NOT NULL,
  staff_name VARCHAR(255),
  staff_role VARCHAR(50),
  assignment_type VARCHAR(50) DEFAULT 'primary',
  assigned_by VARCHAR(36),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  relieved_at TIMESTAMP NULL,
  relieved_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_assignments_patient (patient_id),
  INDEX idx_staff_assignments_staff (staff_id),
  INDEX idx_staff_assignments_active (is_active),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- 4. BURN CARE EXTENDED TABLES
-- ============================================

-- Burn Monitoring Records (hourly monitoring)
CREATE TABLE IF NOT EXISTS burn_monitoring_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  burn_assessment_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_by VARCHAR(36),
  recorded_by_name VARCHAR(255),
  vitals JSON,
  urine_output JSON,
  fluid_administered JSON,
  gcs_score JSON,
  pain_score INT,
  pain_location VARCHAR(255),
  wound_status JSON,
  labs JSON,
  alerts JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_burn_monitoring_patient (patient_id),
  INDEX idx_burn_monitoring_assessment (burn_assessment_id),
  INDEX idx_burn_monitoring_recorded (recorded_at),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Escharotomy Records
CREATE TABLE IF NOT EXISTS escharotomy_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  burn_assessment_id VARCHAR(36),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  performed_by VARCHAR(36),
  performed_by_name VARCHAR(255),
  location VARCHAR(255),
  side VARCHAR(50),
  indications JSON,
  compartment_pressure DECIMAL(5,2),
  incision_length DECIMAL(5,2),
  deep_fasciotomy BOOLEAN DEFAULT FALSE,
  immediate_result VARCHAR(50),
  complications JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_escharotomy_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Skin Graft Records
CREATE TABLE IF NOT EXISTS skin_graft_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  burn_assessment_id VARCHAR(36),
  surgery_id VARCHAR(36),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  performed_by VARCHAR(36),
  performed_by_name VARCHAR(255),
  graft_type VARCHAR(50),
  mesh_ratio VARCHAR(50),
  donor_site VARCHAR(255),
  donor_area DECIMAL(10,2),
  recipient_site VARCHAR(255),
  recipient_area DECIMAL(10,2),
  fixation_method VARCHAR(100),
  dressing_type VARCHAR(100),
  assessments JSON,
  final_take_percentage DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_skin_graft_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Burn Care Plans
CREATE TABLE IF NOT EXISTS burn_care_plans (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  burn_assessment_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  current_phase VARCHAR(50),
  resuscitation_goals JSON,
  wound_care_goals JSON,
  nutrition_goals JSON,
  rehabilitation_goals JSON,
  fluid_orders JSON,
  medication_orders JSON,
  wound_care_orders JSON,
  primary_surgeon VARCHAR(36),
  primary_nurse VARCHAR(36),
  dietitian VARCHAR(36),
  physiotherapist VARCHAR(36),
  occupational_therapist VARCHAR(36),
  psychologist VARCHAR(36),
  status VARCHAR(50) DEFAULT 'active',
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_burn_care_plans_patient (patient_id),
  INDEX idx_burn_care_plans_status (status),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- 5. APPOINTMENT EXTENDED TABLES
-- ============================================

-- Appointment Reminders
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id VARCHAR(36) PRIMARY KEY,
  appointment_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  channel VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'pending',
  message_template TEXT,
  message_content TEXT,
  whats_app_number VARCHAR(50),
  whats_app_message_id VARCHAR(100),
  patient_response VARCHAR(50),
  response_received_at TIMESTAMP NULL,
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appointment_reminders_appointment (appointment_id),
  INDEX idx_appointment_reminders_scheduled (scheduled_for),
  INDEX idx_appointment_reminders_status (status),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Appointment Slots (template for available slots)
CREATE TABLE IF NOT EXISTS appointment_slots (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  clinician_id VARCHAR(36) NOT NULL,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INT DEFAULT 30,
  max_appointments INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  location_type VARCHAR(50) DEFAULT 'hospital',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appointment_slots_clinician (clinician_id),
  INDEX idx_appointment_slots_day (day_of_week)
);

-- Clinic Sessions
CREATE TABLE IF NOT EXISTS clinic_sessions (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  clinician_id VARCHAR(36) NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  clinic_type VARCHAR(100),
  location VARCHAR(255),
  max_patients INT DEFAULT 20,
  booked_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clinic_sessions_clinician (clinician_id),
  INDEX idx_clinic_sessions_date (session_date)
);

-- ============================================
-- 6. BILLING & PAYROLL TABLES
-- ============================================

-- Activity Billing Records
CREATE TABLE IF NOT EXISTS activity_billing_records (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36),
  activity_code VARCHAR(100),
  activity_name VARCHAR(255),
  category VARCHAR(50),
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255),
  hospital_number VARCHAR(100),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  ward_round_id VARCHAR(36),
  lab_request_id VARCHAR(36),
  prescription_id VARCHAR(36),
  wound_care_id VARCHAR(36),
  npwt_session_id VARCHAR(36),
  transfusion_id VARCHAR(36),
  performed_by VARCHAR(36) NOT NULL,
  performed_by_name VARCHAR(255),
  performed_by_role VARCHAR(50),
  fee DECIMAL(12,2) DEFAULT 0,
  original_fee DECIMAL(12,2),
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_rate DECIMAL(5,2),
  staff_share DECIMAL(12,2) DEFAULT 0,
  hospital_share DECIMAL(12,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_evidence_url TEXT,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  staff_amount_paid DECIMAL(12,2) DEFAULT 0,
  hospital_amount_paid DECIMAL(12,2) DEFAULT 0,
  invoice_id VARCHAR(36),
  invoice_item_id VARCHAR(36),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  billed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  notes TEXT,
  hospital_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_activity_billing_patient (patient_id),
  INDEX idx_activity_billing_performed_by (performed_by),
  INDEX idx_activity_billing_status (payment_status),
  INDEX idx_activity_billing_date (performed_at),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Payroll Periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  period_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  total_billed DECIMAL(14,2) DEFAULT 0,
  total_paid DECIMAL(14,2) DEFAULT 0,
  total_staff_earnings DECIMAL(14,2) DEFAULT 0,
  total_hospital_earnings DECIMAL(14,2) DEFAULT 0,
  closed_at TIMESTAMP NULL,
  closed_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payroll_periods_hospital (hospital_id),
  INDEX idx_payroll_periods_status (status),
  INDEX idx_payroll_periods_dates (start_date, end_date)
);

-- Staff Payroll Records
CREATE TABLE IF NOT EXISTS staff_payroll_records (
  id VARCHAR(36) PRIMARY KEY,
  payroll_period_id VARCHAR(36) NOT NULL,
  staff_id VARCHAR(36) NOT NULL,
  staff_name VARCHAR(255),
  staff_role VARCHAR(50),
  hospital_id VARCHAR(36),
  total_activities INT DEFAULT 0,
  activities_by_category JSON,
  total_billed DECIMAL(14,2) DEFAULT 0,
  total_paid DECIMAL(14,2) DEFAULT 0,
  gross_earnings DECIMAL(14,2) DEFAULT 0,
  deductions DECIMAL(14,2) DEFAULT 0,
  deduction_notes TEXT,
  net_earnings DECIMAL(14,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_amount DECIMAL(14,2) DEFAULT 0,
  paid_at TIMESTAMP NULL,
  payment_reference VARCHAR(100),
  activity_records JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_payroll_period (payroll_period_id),
  INDEX idx_staff_payroll_staff (staff_id),
  INDEX idx_staff_payroll_status (payment_status),
  FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id VARCHAR(36) PRIMARY KEY,
  staff_id VARCHAR(36) NOT NULL,
  staff_name VARCHAR(255),
  staff_role VARCHAR(50),
  hospital_id VARCHAR(36),
  period_id VARCHAR(36),
  period_name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(255),
  activities JSON,
  surgery_assistant_earnings JSON,
  gross_earnings DECIMAL(14,2) DEFAULT 0,
  deductions DECIMAL(14,2) DEFAULT 0,
  deduction_details JSON,
  net_earnings DECIMAL(14,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  payment_reference VARCHAR(100),
  payment_method VARCHAR(50),
  pdf_generated BOOLEAN DEFAULT FALSE,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payslips_staff (staff_id),
  INDEX idx_payslips_period (period_id),
  INDEX idx_payslips_status (payment_status)
);

-- ============================================
-- 7. TRANSFUSION EXTENDED TABLES
-- ============================================

-- Transfusion Orders
CREATE TABLE IF NOT EXISTS transfusion_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(100) UNIQUE,
  patient_id VARCHAR(36) NOT NULL,
  hospital_id VARCHAR(36),
  request_id VARCHAR(36),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ordered_by VARCHAR(36),
  orderer_designation VARCHAR(100),
  urgency VARCHAR(50) DEFAULT 'routine',
  patient_blood_group VARCHAR(10),
  patient_rh_factor VARCHAR(20),
  patient_genotype VARCHAR(10),
  antibody_screen_result VARCHAR(100),
  crossmatch_result VARCHAR(50),
  crossmatch_date TIMESTAMP NULL,
  indication TEXT,
  hemoglobin_level DECIMAL(5,2),
  platelet_count INT,
  inr DECIMAL(4,2),
  fibrinogen DECIMAL(6,2),
  product_type VARCHAR(100),
  product_code VARCHAR(100),
  number_of_units INT DEFAULT 1,
  volume_per_unit INT,
  blood_group_of_product VARCHAR(10),
  donor_id VARCHAR(100),
  collection_date DATE,
  expiry_date DATE,
  blood_bank_name VARCHAR(255),
  blood_bank_address TEXT,
  blood_bank_phone VARCHAR(50),
  screening_tests JSON,
  rate_of_transfusion INT,
  estimated_duration VARCHAR(50),
  pre_transfusion_vitals JSON,
  consent_obtained BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP NULL,
  consent_witness VARCHAR(255),
  verifying_nurse_1 VARCHAR(255),
  verifying_nurse_2 VARCHAR(255),
  ward_bed VARCHAR(100),
  diagnosis TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transfusion_orders_patient (patient_id),
  INDEX idx_transfusion_orders_status (status),
  INDEX idx_transfusion_orders_date (order_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Transfusion Monitoring Charts
CREATE TABLE IF NOT EXISTS transfusion_monitoring_charts (
  id VARCHAR(36) PRIMARY KEY,
  chart_id VARCHAR(100),
  patient_id VARCHAR(36) NOT NULL,
  hospital_id VARCHAR(36),
  transfusion_order_id VARCHAR(36),
  patient_name VARCHAR(255),
  hospital_number VARCHAR(100),
  ward_bed VARCHAR(100),
  chart_date DATE NOT NULL,
  product_type VARCHAR(100),
  unit_number VARCHAR(100),
  start_time TIME,
  end_time TIME,
  entries JSON,
  total_volume_transfused INT,
  complications TEXT,
  outcome VARCHAR(100),
  nurse_signature VARCHAR(255),
  doctor_review VARCHAR(255),
  uploaded_chart_url TEXT,
  uploaded_chart_base64 LONGTEXT,
  ocr_text TEXT,
  ocr_processed_at TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'template',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transfusion_charts_patient (patient_id),
  INDEX idx_transfusion_charts_order (transfusion_order_id),
  INDEX idx_transfusion_charts_date (chart_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- 8. NPWT EXTENDED TABLES
-- ============================================

-- NPWT Notifications
CREATE TABLE IF NOT EXISTS npwt_notifications (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36),
  scheduled_time TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP NULL,
  notification_type VARCHAR(50) DEFAULT 'dressing_change',
  message TEXT,
  channel VARCHAR(50) DEFAULT 'push',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_npwt_notifications_session (session_id),
  INDEX idx_npwt_notifications_scheduled (scheduled_time),
  INDEX idx_npwt_notifications_sent (sent)
);

-- ============================================
-- 9. NUTRITION EXTENDED TABLES
-- ============================================

-- Nutrition Plans
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  weight DECIMAL(5,1),
  height DECIMAL(5,1),
  bmi DECIMAL(4,1),
  activity_level VARCHAR(50),
  clinical_condition TEXT,
  stress_factor DECIMAL(3,2),
  bmr DECIMAL(8,2),
  tdee DECIMAL(8,2),
  calorie_target INT,
  protein_target INT,
  carbs_target INT,
  fat_target INT,
  fiber_target INT,
  fluid_target INT,
  meal_frequency INT DEFAULT 3,
  snacks_per_day INT DEFAULT 2,
  dietary_restrictions JSON,
  food_allergies JSON,
  food_preferences JSON,
  meal_plans JSON,
  weekly_menu JSON,
  enteral_feeding BOOLEAN DEFAULT FALSE,
  enteral_formula VARCHAR(255),
  enteral_rate DECIMAL(6,2),
  parenteral_nutrition BOOLEAN DEFAULT FALSE,
  parenteral_details JSON,
  supplements JSON,
  monitoring_parameters JSON,
  weight_goals JSON,
  plan_type VARCHAR(50) DEFAULT 'standard',
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_by VARCHAR(36),
  reviewed_by VARCHAR(36),
  reviewed_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nutrition_plans_patient (patient_id),
  INDEX idx_nutrition_plans_status (status),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- 10. VIDEO CONFERENCE EXTENDED TABLES
-- ============================================

-- Enhanced Video Conferences
CREATE TABLE IF NOT EXISTS enhanced_video_conferences (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(100),
  title VARCHAR(255),
  type VARCHAR(100),
  host_id VARCHAR(36),
  host_name VARCHAR(255),
  hospital_id VARCHAR(36),
  status VARCHAR(50) DEFAULT 'scheduled',
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  duration INT,
  participants JSON,
  settings JSON,
  presentation JSON,
  recordings JSON,
  chat JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enhanced_video_host (host_id),
  INDEX idx_enhanced_video_status (status),
  INDEX idx_enhanced_video_scheduled (scheduled_at)
);

-- ============================================
-- 11. REFERRALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(36) PRIMARY KEY,
  referral_number VARCHAR(100) UNIQUE,
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255),
  from_hospital_id VARCHAR(36),
  from_hospital_name VARCHAR(255),
  to_hospital_id VARCHAR(36),
  to_hospital_name VARCHAR(255),
  to_specialty VARCHAR(100),
  to_specialist_id VARCHAR(36),
  to_specialist_name VARCHAR(255),
  referral_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'routine',
  referral_date DATE NOT NULL,
  reason TEXT,
  clinical_summary TEXT,
  current_diagnosis TEXT,
  relevant_investigations TEXT,
  current_treatment TEXT,
  referral_questions TEXT,
  urgency_justification TEXT,
  attachments JSON,
  referred_by VARCHAR(36),
  referred_by_name VARCHAR(255),
  accepted_by VARCHAR(36),
  accepted_by_name VARCHAR(255),
  accepted_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  response_notes TEXT,
  decline_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_referrals_patient (patient_id),
  INDEX idx_referrals_status (status),
  INDEX idx_referrals_date (referral_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- 12. PATIENT EDUCATION RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS patient_education_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255),
  hospital_id VARCHAR(36),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  topic_id VARCHAR(100),
  topic_title VARCHAR(255),
  category VARCHAR(100),
  delivery_method VARCHAR(50),
  comprehension_level VARCHAR(50),
  comprehension_notes TEXT,
  barriers JSON,
  barriers_mitigated TEXT,
  teach_back_performed BOOLEAN DEFAULT FALSE,
  teach_back_successful BOOLEAN,
  materials_provided JSON,
  family_member_present BOOLEAN DEFAULT FALSE,
  family_member_name VARCHAR(255),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  educator_id VARCHAR(36),
  educator_name VARCHAR(255),
  educator_role VARCHAR(50),
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_education_patient (patient_id),
  INDEX idx_patient_education_topic (topic_id),
  INDEX idx_patient_education_delivered (delivered_at),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- 13. CALCULATOR RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS calculator_results (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  patient_name VARCHAR(255),
  hospital_id VARCHAR(36),
  encounter_id VARCHAR(36),
  calculator_type VARCHAR(50) NOT NULL,
  calculator_name VARCHAR(100),
  input_values JSON,
  result_value VARCHAR(255),
  result_interpretation TEXT,
  risk_level VARCHAR(50),
  recommendations JSON,
  calculated_by VARCHAR(36),
  calculated_by_name VARCHAR(255),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_calculator_results_patient (patient_id),
  INDEX idx_calculator_results_type (calculator_type),
  INDEX idx_calculator_results_date (calculated_at)
);

-- ============================================
-- 14. USER & HOSPITAL SETTINGS
-- ============================================

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  whatsapp_notifications BOOLEAN DEFAULT TRUE,
  critical_alerts_only BOOLEAN DEFAULT FALSE,
  appointment_reminders BOOLEAN DEFAULT TRUE,
  ward_round_reminders BOOLEAN DEFAULT TRUE,
  medication_reminders BOOLEAN DEFAULT TRUE,
  lab_result_alerts BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'system',
  language VARCHAR(10) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '24h',
  default_landing_page VARCHAR(100),
  default_hospital_id VARCHAR(36),
  default_ward VARCHAR(100),
  auto_save_interval INT DEFAULT 30,
  voice_dictation_language VARCHAR(20),
  font_size VARCHAR(20) DEFAULT 'medium',
  high_contrast BOOLEAN DEFAULT FALSE,
  reduce_motion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_settings_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Hospital Settings
CREATE TABLE IF NOT EXISTS hospital_settings (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36) NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  default_consultation_fee DECIMAL(10,2),
  default_currency VARCHAR(10) DEFAULT 'NGN',
  tax_rate DECIMAL(5,2),
  wards JSON,
  appointment_slot_duration INT DEFAULT 30,
  appointment_lead_time INT DEFAULT 24,
  max_advance_booking_days INT DEFAULT 90,
  default_dvt_prophylaxis TEXT,
  default_antibiotic_protocol TEXT,
  require_two_factor_auth BOOLEAN DEFAULT FALSE,
  session_timeout_minutes INT DEFAULT 30,
  sync_interval_minutes INT DEFAULT 5,
  offline_storage_limit_mb INT DEFAULT 500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_settings_hospital (hospital_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ============================================
-- 15. MEETING MINUTES & TRANSCRIPTION
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_minutes (
  id VARCHAR(36) PRIMARY KEY,
  conference_id VARCHAR(36),
  hospital_id VARCHAR(36),
  title VARCHAR(255),
  meeting_type VARCHAR(100),
  meeting_date TIMESTAMP NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration INT,
  location VARCHAR(255),
  room_code VARCHAR(100),
  host_id VARCHAR(36),
  host_name VARCHAR(255),
  attendees JSON,
  absentees JSON,
  agenda JSON,
  transcript JSON,
  raw_transcript_text LONGTEXT,
  ai_summary TEXT,
  key_points JSON,
  action_items JSON,
  decisions_reached JSON,
  discussion_highlights JSON,
  next_steps JSON,
  patient_id VARCHAR(36),
  patient_name VARCHAR(255),
  clinical_notes TEXT,
  has_recording BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  recording_duration INT,
  status VARCHAR(50) DEFAULT 'draft',
  shared_with JSON,
  shared_at TIMESTAMP NULL,
  exported_formats JSON,
  created_by VARCHAR(36),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  finalized_at TIMESTAMP NULL,
  finalized_by VARCHAR(36),
  INDEX idx_meeting_minutes_conference (conference_id),
  INDEX idx_meeting_minutes_host (host_id),
  INDEX idx_meeting_minutes_date (meeting_date),
  INDEX idx_meeting_minutes_status (status)
);

-- ============================================
-- 16. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add icu_beds, operating_theatres to hospitals table
ALTER TABLE hospitals 
  ADD COLUMN IF NOT EXISTS icu_beds INT NULL,
  ADD COLUMN IF NOT EXISTS operating_theatres INT NULL,
  ADD COLUMN IF NOT EXISTS is_24_hours BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_emergency BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_laboratory BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_radiology BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS specialties JSON NULL;

-- Add bank account columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20) NULL;

-- Add clinical_goals column to treatment_plans table
ALTER TABLE treatment_plans
  ADD COLUMN IF NOT EXISTS clinical_goals JSON NULL,
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS phase VARCHAR(50) NULL;

-- Add missing columns to surgeries table
ALTER TABLE surgeries
  ADD COLUMN IF NOT EXISTS surgeon_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS surgeon_fee DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS assistant_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS assistant_fee_percentage DECIMAL(5,2) NULL,
  ADD COLUMN IF NOT EXISTS assistant_fee DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS anaesthetist_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS anaesthesia_fee DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS scrub_nurse_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS circulating_nurse_id VARCHAR(36) NULL;

-- Add agreement tracking columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_accepted_agreement BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS agreement_device_info TEXT NULL,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'All 24+ missing tables have been created successfully!' AS status;
SELECT 'Missing columns have been added to existing tables!' AS column_status;
