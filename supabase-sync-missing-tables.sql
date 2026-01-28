-- ============================================
-- MISSING TABLES FOR COMPLETE SYNC COVERAGE
-- AstroHEALTH MySQL Schema Extension
-- Run this after the main schema
-- ============================================

-- ============================================
-- ADMISSION MANAGEMENT
-- ============================================

-- Admission Notes
CREATE TABLE IF NOT EXISTS admission_notes (
  id VARCHAR(36) PRIMARY KEY,
  admission_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  note_type VARCHAR(100),
  author_id VARCHAR(36),
  content TEXT,
  vital_signs JSON,
  observations JSON,
  assessments JSON,
  plan TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admission_notes_admission (admission_id),
  FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE
);

-- Bed Assignments
CREATE TABLE IF NOT EXISTS bed_assignments (
  id VARCHAR(36) PRIMARY KEY,
  admission_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  ward_name VARCHAR(100),
  ward_type VARCHAR(50),
  bed_number VARCHAR(50),
  assigned_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_to TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bed_assignments_admission (admission_id)
);

-- ============================================
-- STAFF ASSIGNMENTS
-- ============================================

-- Doctor Assignments
CREATE TABLE IF NOT EXISTS doctor_assignments (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  doctor_id VARCHAR(36),
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  assignment_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_doctor_assignments_doctor (doctor_id),
  INDEX idx_doctor_assignments_patient (patient_id)
);

-- Nurse Assignments
CREATE TABLE IF NOT EXISTS nurse_assignments (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  nurse_id VARCHAR(36),
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  shift_type VARCHAR(20),
  assignment_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nurse_assignments_nurse (nurse_id),
  INDEX idx_nurse_assignments_patient (patient_id)
);

-- Nurse Patient Assignments
CREATE TABLE IF NOT EXISTS nurse_patient_assignments (
  id VARCHAR(36) PRIMARY KEY,
  nurse_id VARCHAR(36),
  hospital_id VARCHAR(36),
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  shift_date DATE,
  shift_type VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nurse_patient_assignments_nurse (nurse_id)
);

-- Staff Patient Assignments
CREATE TABLE IF NOT EXISTS staff_patient_assignments (
  id VARCHAR(36) PRIMARY KEY,
  admission_id VARCHAR(36),
  patient_id VARCHAR(36),
  staff_id VARCHAR(36),
  staff_role VARCHAR(50),
  assignment_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  hospital_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_patient_assignments_staff (staff_id)
);

-- ============================================
-- BURN CARE MONITORING
-- ============================================

-- Burn Monitoring Records
CREATE TABLE IF NOT EXISTS burn_monitoring_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  burn_assessment_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  recorded_by VARCHAR(36),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vital_signs JSON,
  urine_output INT,
  fluid_intake INT,
  pain_score INT,
  wound_assessment TEXT,
  dressing_changes JSON,
  complications JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_burn_monitoring_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Escharotomy Records
CREATE TABLE IF NOT EXISTS escharotomy_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  burn_assessment_id VARCHAR(36),
  surgery_id VARCHAR(36),
  hospital_id VARCHAR(36),
  performed_by VARCHAR(36),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(200),
  indication TEXT,
  technique TEXT,
  complications JSON,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Skin Graft Records
CREATE TABLE IF NOT EXISTS skin_graft_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  burn_assessment_id VARCHAR(36),
  surgery_id VARCHAR(36),
  hospital_id VARCHAR(36),
  performed_by VARCHAR(36),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graft_type VARCHAR(100),
  donor_site VARCHAR(200),
  recipient_site VARCHAR(200),
  graft_size_cm2 DECIMAL(10,2),
  meshing_ratio VARCHAR(20),
  complications JSON,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Burn Care Plans
CREATE TABLE IF NOT EXISTS burn_care_plans (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  burn_assessment_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  created_by VARCHAR(36),
  status VARCHAR(50) DEFAULT 'active',
  fluid_resuscitation JSON,
  wound_care_plan JSON,
  nutrition_plan JSON,
  pain_management JSON,
  physical_therapy JSON,
  psychological_support JSON,
  surgery_plan JSON,
  discharge_criteria JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- TRANSFUSION MANAGEMENT
-- ============================================

-- Transfusion Orders
CREATE TABLE IF NOT EXISTS transfusion_orders (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  order_id VARCHAR(100),
  request_id VARCHAR(36),
  status VARCHAR(50) DEFAULT 'pending',
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ordered_by VARCHAR(36),
  blood_product VARCHAR(100),
  units_ordered INT,
  indication TEXT,
  urgency VARCHAR(50),
  special_requirements JSON,
  compatibility_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transfusion_orders_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Transfusion Monitoring Charts
CREATE TABLE IF NOT EXISTS transfusion_monitoring_charts (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  transfusion_order_id VARCHAR(36),
  hospital_id VARCHAR(36),
  chart_date DATE,
  status VARCHAR(50) DEFAULT 'in_progress',
  pre_transfusion_vitals JSON,
  during_transfusion_monitoring JSON,
  post_transfusion_vitals JSON,
  reactions JSON,
  uploaded_chart_url TEXT,
  ocr_text TEXT,
  monitored_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (transfusion_order_id) REFERENCES transfusion_orders(id) ON DELETE CASCADE
);

-- ============================================
-- APPOINTMENTS EXTENSION
-- ============================================

-- Appointment Reminders
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id VARCHAR(36) PRIMARY KEY,
  appointment_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  channel VARCHAR(50),
  scheduled_for TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  message TEXT,
  response TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Appointment Slots
CREATE TABLE IF NOT EXISTS appointment_slots (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  clinician_id VARCHAR(36),
  day_of_week INT,
  start_time TIME,
  end_time TIME,
  slot_duration_minutes INT DEFAULT 30,
  max_appointments INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clinic Sessions
CREATE TABLE IF NOT EXISTS clinic_sessions (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  clinician_id VARCHAR(36),
  session_date DATE,
  start_time TIME,
  end_time TIME,
  status VARCHAR(50) DEFAULT 'scheduled',
  location VARCHAR(200),
  max_patients INT,
  booked_patients INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- BILLING & PAYROLL
-- ============================================

-- Activity Billing Records
CREATE TABLE IF NOT EXISTS activity_billing_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  admission_id VARCHAR(36),
  encounter_id VARCHAR(36),
  performed_by VARCHAR(36),
  performed_by_role VARCHAR(50),
  category VARCHAR(100),
  activity_code VARCHAR(100),
  activity_name VARCHAR(200),
  quantity INT DEFAULT 1,
  unit_price DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  invoice_id VARCHAR(36),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_activity_billing_patient (patient_id)
);

-- Payroll Periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  period_name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'open',
  total_amount DECIMAL(12,2) DEFAULT 0,
  processed_at TIMESTAMP NULL,
  processed_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Staff Payroll Records
CREATE TABLE IF NOT EXISTS staff_payroll_records (
  id VARCHAR(36) PRIMARY KEY,
  payroll_period_id VARCHAR(36),
  staff_id VARCHAR(36),
  staff_role VARCHAR(50),
  hospital_id VARCHAR(36),
  base_amount DECIMAL(12,2) DEFAULT 0,
  activity_amount DECIMAL(12,2) DEFAULT 0,
  bonus_amount DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  payment_reference VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id VARCHAR(36) PRIMARY KEY,
  staff_id VARCHAR(36),
  staff_role VARCHAR(50),
  hospital_id VARCHAR(36),
  period_id VARCHAR(36),
  period_start DATE,
  period_end DATE,
  gross_amount DECIMAL(12,2),
  deductions JSON,
  net_amount DECIMAL(12,2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(200),
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- NPWT EXTENSION
-- ============================================

-- NPWT Notifications
CREATE TABLE IF NOT EXISTS npwt_notifications (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  notification_type VARCHAR(50),
  scheduled_time TIMESTAMP NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP NULL,
  message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(36),
  acknowledged_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES npwt_sessions(id) ON DELETE CASCADE
);

-- ============================================
-- VIDEO CONFERENCES EXTENSION
-- ============================================

-- Enhanced Video Conferences
CREATE TABLE IF NOT EXISTS enhanced_video_conferences (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36),
  host_id VARCHAR(36),
  hospital_id VARCHAR(36),
  patient_id VARCHAR(36),
  type VARCHAR(100),
  title VARCHAR(200),
  description TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  participants JSON,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- NUTRITION EXTENSION
-- ============================================

-- Nutrition Plans
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  created_by VARCHAR(36),
  plan_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  calorie_target INT,
  protein_target INT,
  fluid_target INT,
  diet_type VARCHAR(100),
  restrictions JSON,
  supplements JSON,
  feeding_route VARCHAR(50),
  meal_plan JSON,
  monitoring_parameters JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- REFERRALS
-- ============================================

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(36) PRIMARY KEY,
  referral_number VARCHAR(100) UNIQUE,
  patient_id VARCHAR(36),
  from_hospital_id VARCHAR(36),
  to_hospital_id VARCHAR(36),
  from_doctor_id VARCHAR(36),
  to_doctor_id VARCHAR(36),
  referral_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'routine',
  referral_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  referred_by VARCHAR(36),
  reason TEXT,
  clinical_summary TEXT,
  investigations JSON,
  documents JSON,
  accepted_at TIMESTAMP NULL,
  accepted_by VARCHAR(36),
  completed_at TIMESTAMP NULL,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_referrals_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- PATIENT EDUCATION
-- ============================================

-- Patient Education Records
CREATE TABLE IF NOT EXISTS patient_education_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  topic_id VARCHAR(100),
  topic_name VARCHAR(200),
  category VARCHAR(100),
  educator_id VARCHAR(36),
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_method VARCHAR(50),
  materials_provided JSON,
  patient_understanding VARCHAR(50),
  questions_asked TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- CALCULATORS
-- ============================================

-- Calculator Results
CREATE TABLE IF NOT EXISTS calculator_results (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  calculator_type VARCHAR(100),
  calculator_name VARCHAR(200),
  inputs JSON,
  outputs JSON,
  score DECIMAL(10,2),
  interpretation TEXT,
  recommendations TEXT,
  calculated_by VARCHAR(36),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- SETTINGS
-- ============================================

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE,
  theme VARCHAR(50) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  default_hospital_id VARCHAR(36),
  preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Hospital Settings
CREATE TABLE IF NOT EXISTS hospital_settings (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36) UNIQUE,
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  currency VARCHAR(10) DEFAULT 'NGN',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '24h',
  appointment_duration_default INT DEFAULT 30,
  billing_settings JSON,
  notification_settings JSON,
  integration_settings JSON,
  features_enabled JSON,
  branding JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ============================================
-- LOGS & SYSTEM
-- ============================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  hospital_id VARCHAR(36),
  entity_type VARCHAR(100),
  entity_id VARCHAR(36),
  action VARCHAR(50),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_user (user_id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_timestamp (timestamp)
);

-- Sync Status
CREATE TABLE IF NOT EXISTS sync_status (
  id VARCHAR(36) PRIMARY KEY,
  entity_type VARCHAR(100),
  entity_id VARCHAR(36),
  status VARCHAR(50) DEFAULT 'pending',
  last_synced_at TIMESTAMP NULL,
  sync_error TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sync_status_entity (entity_type, entity_id)
);

-- ============================================
-- MEETINGS
-- ============================================

-- Meeting Minutes
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id VARCHAR(36) PRIMARY KEY,
  conference_id VARCHAR(36),
  hospital_id VARCHAR(36),
  patient_id VARCHAR(36),
  host_id VARCHAR(36),
  meeting_type VARCHAR(100),
  meeting_date TIMESTAMP NULL,
  title VARCHAR(200),
  attendees JSON,
  agenda TEXT,
  minutes TEXT,
  action_items JSON,
  decisions JSON,
  follow_up_date DATE,
  status VARCHAR(50) DEFAULT 'draft',
  approved_by VARCHAR(36),
  approved_at TIMESTAMP NULL,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Success message
SELECT 'Missing tables for sync created successfully!' as status;
