-- DigitalOcean MySQL Schema for AstroHEALTH
-- Run this SQL in your DigitalOcean database to create all required tables

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'doctor',
  hospital_id VARCHAR(36),
  phone VARCHAR(50),
  license_number VARCHAR(100),
  specialty VARCHAR(100),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  profile_image TEXT,
  agreement_accepted BOOLEAN DEFAULT false,
  agreement_accepted_at TIMESTAMP NULL,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_hospital (hospital_id),
  INDEX idx_users_email (email)
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Nigeria',
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  license_number VARCHAR(100),
  logo TEXT,
  settings JSON,
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  subscription_expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(36) PRIMARY KEY,
  hospital_number VARCHAR(100),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  blood_group VARCHAR(10),
  genotype VARCHAR(10),
  phone VARCHAR(50),
  alternate_phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Nigeria',
  next_of_kin_name VARCHAR(200),
  next_of_kin_phone VARCHAR(50),
  next_of_kin_relationship VARCHAR(50),
  next_of_kin_address TEXT,
  emergency_contact VARCHAR(50),
  occupation VARCHAR(100),
  marital_status VARCHAR(50),
  religion VARCHAR(50),
  tribe VARCHAR(50),
  nationality VARCHAR(100) DEFAULT 'Nigerian',
  allergies JSON,
  chronic_conditions JSON,
  current_medications JSON,
  past_surgical_history JSON,
  family_history TEXT,
  social_history TEXT,
  insurance_provider VARCHAR(200),
  insurance_id VARCHAR(100),
  insurance_expiry DATE,
  registered_hospital_id VARCHAR(36),
  hospital_id VARCHAR(36),
  is_active BOOLEAN DEFAULT true,
  photo LONGTEXT,
  notes TEXT,
  caprini_score INT,
  waterlow_score INT,
  must_score INT,
  dvt_risk VARCHAR(50),
  pressure_sore_risk VARCHAR(50),
  malnutrition_risk VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patients_hospital (hospital_id),
  INDEX idx_patients_registered_hospital (registered_hospital_id),
  INDEX idx_patients_hospital_number (hospital_number)
);

-- ============================================
-- CLINICAL TABLES
-- ============================================

-- Vital Signs
CREATE TABLE IF NOT EXISTS vital_signs (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  recorded_by VARCHAR(36),
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  pulse_rate INT,
  temperature DECIMAL(4,1),
  respiratory_rate INT,
  oxygen_saturation INT,
  weight DECIMAL(5,1),
  height DECIMAL(5,1),
  bmi DECIMAL(4,1),
  blood_sugar DECIMAL(5,1),
  blood_sugar_type VARCHAR(20),
  pain_score INT,
  consciousness_level VARCHAR(50),
  urine_output INT,
  intake_amount INT,
  output_amount INT,
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vital_signs_patient (patient_id),
  INDEX idx_vital_signs_recorded_at (recorded_at),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Clinical Encounters
CREATE TABLE IF NOT EXISTS clinical_encounters (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  doctor_id VARCHAR(36),
  encounter_type VARCHAR(50),
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  past_surgical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  drug_history TEXT,
  allergy_history TEXT,
  review_of_systems JSON,
  physical_examination JSON,
  general_examination TEXT,
  systemic_examination TEXT,
  local_examination TEXT,
  assessment TEXT,
  plan TEXT,
  diagnosis JSON,
  icd_codes JSON,
  differential_diagnosis JSON,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  follow_up_date DATE,
  encounter_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_encounters_patient (patient_id),
  INDEX idx_encounters_date (encounter_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Surgeries
CREATE TABLE IF NOT EXISTS surgeries (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  surgeon_id VARCHAR(36),
  surgeon VARCHAR(255) COMMENT 'Surgeon name',
  surgeon_fee DECIMAL(12,2) COMMENT 'Fee charged for surgeon',
  surgery_type VARCHAR(200),
  type VARCHAR(50) COMMENT 'elective or emergency',
  category VARCHAR(50) COMMENT 'minor, intermediate, major, super_major',
  procedure_name VARCHAR(500),
  procedure_code VARCHAR(50),
  cpt_code VARCHAR(50),
  scheduled_date TIMESTAMP NULL,
  actual_start TIMESTAMP NULL,
  actual_start_time TIMESTAMP NULL,
  actual_end TIMESTAMP NULL,
  actual_end_time TIMESTAMP NULL,
  duration_minutes INT,
  anesthesia_type VARCHAR(100),
  anaesthesia_type VARCHAR(50),
  anaesthesia_fee DECIMAL(12,2),
  anesthesiologist_id VARCHAR(36),
  anaesthetist VARCHAR(255),
  anaesthetist_id VARCHAR(36),
  -- Assistant surgeon fields (from TypeScript Surgery interface)
  assistant VARCHAR(255) COMMENT 'Assistant surgeon name',
  assistant_id VARCHAR(36) COMMENT 'User ID of surgeon assistant for billing',
  assistant_fee_percentage DECIMAL(5,2) COMMENT 'Typically 20% of surgeon fee',
  assistant_fee DECIMAL(12,2) COMMENT 'Calculated assistant fee',
  assistant_surgeons JSON,
  scrub_nurse VARCHAR(255),
  scrub_nurse_id VARCHAR(36),
  scrub_nurses JSON,
  circulating_nurse VARCHAR(255),
  circulating_nurse_id VARCHAR(36),
  circulating_nurses JSON,
  operating_room VARCHAR(50),
  preop_diagnosis TEXT,
  postop_diagnosis TEXT,
  pre_operative_assessment JSON,
  indications TEXT,
  findings TEXT,
  procedure_details TEXT,
  operative_notes TEXT,
  complications TEXT,
  estimated_blood_loss INT,
  blood_loss INT,
  blood_transfused INT,
  specimens JSON,
  specimen_sent BOOLEAN DEFAULT FALSE,
  specimen_type VARCHAR(255),
  implants JSON,
  drains JSON,
  wound_classification VARCHAR(50),
  asa_class VARCHAR(10),
  urgency VARCHAR(50),
  status VARCHAR(50) DEFAULT 'scheduled',
  cancellation_reason TEXT,
  post_operative_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_surgeries_patient (patient_id),
  INDEX idx_surgeries_scheduled (scheduled_date),
  INDEX idx_surgeries_surgeon (surgeon_id),
  INDEX idx_surgeries_assistant (assistant_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Admissions
CREATE TABLE IF NOT EXISTS admissions (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  admitting_doctor_id VARCHAR(36),
  attending_doctor_id VARCHAR(36),
  ward VARCHAR(100),
  bed_number VARCHAR(50),
  room_number VARCHAR(50),
  admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expected_discharge DATE,
  discharge_date TIMESTAMP NULL,
  admission_diagnosis TEXT,
  discharge_diagnosis TEXT,
  admission_type VARCHAR(50),
  admission_source VARCHAR(100),
  discharge_disposition VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  diet_orders TEXT,
  activity_orders TEXT,
  nursing_orders TEXT,
  special_instructions TEXT,
  code_status VARCHAR(50),
  isolation_precautions JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admissions_patient (patient_id),
  INDEX idx_admissions_status (status),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Ward Rounds
CREATE TABLE IF NOT EXISTS ward_rounds (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  doctor_id VARCHAR(36),
  round_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  round_type VARCHAR(50),
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  vitals_summary TEXT,
  investigations_summary TEXT,
  current_medications TEXT,
  medication_changes TEXT,
  diet_orders TEXT,
  activity_orders TEXT,
  nursing_orders TEXT,
  consultant_notes TEXT,
  resident_notes TEXT,
  nursing_notes TEXT,
  disposition VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ward_rounds_patient (patient_id),
  INDEX idx_ward_rounds_date (round_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- WOUND & BURN MANAGEMENT
-- ============================================

-- Wounds
CREATE TABLE IF NOT EXISTS wounds (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  created_by VARCHAR(36),
  wound_type VARCHAR(100),
  location VARCHAR(200),
  laterality VARCHAR(20),
  etiology VARCHAR(100),
  onset_date DATE,
  duration_weeks INT,
  length_cm DECIMAL(5,2),
  width_cm DECIMAL(5,2),
  depth_cm DECIMAL(5,2),
  area_cm2 DECIMAL(8,2),
  volume_cm3 DECIMAL(8,2),
  wound_bed_tissue JSON,
  exudate_amount VARCHAR(50),
  exudate_type VARCHAR(50),
  wound_edges VARCHAR(100),
  periwound_condition VARCHAR(100),
  odor BOOLEAN DEFAULT false,
  pain_level INT,
  signs_of_infection JSON,
  current_treatment TEXT,
  dressing_type VARCHAR(200),
  dressing_frequency VARCHAR(100),
  previous_treatments JSON,
  healing_trajectory VARCHAR(50),
  photos JSON,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wounds_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Wound Measurements
CREATE TABLE IF NOT EXISTS wound_measurements (
  id VARCHAR(36) PRIMARY KEY,
  wound_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  measured_by VARCHAR(36),
  measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  measurement_method VARCHAR(50),
  length_cm DECIMAL(5,2),
  width_cm DECIMAL(5,2),
  depth_cm DECIMAL(5,2),
  area_cm2 DECIMAL(8,2),
  volume_cm3 DECIMAL(8,2),
  perimeter_cm DECIMAL(6,2),
  undermining TEXT,
  tunneling TEXT,
  wound_bed_tissue JSON,
  granulation_percent INT,
  slough_percent INT,
  necrotic_percent INT,
  epithelialization_percent INT,
  exudate_amount VARCHAR(50),
  exudate_type VARCHAR(50),
  wound_edges VARCHAR(100),
  periwound_condition VARCHAR(100),
  pain_level INT,
  odor BOOLEAN DEFAULT false,
  signs_of_infection JSON,
  photo LONGTEXT,
  calibration_data JSON,
  ai_assisted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wound_measurements_wound (wound_id),
  FOREIGN KEY (wound_id) REFERENCES wounds(id) ON DELETE CASCADE
);

-- Burn Assessments
CREATE TABLE IF NOT EXISTS burn_assessments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  assessed_by VARCHAR(36),
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  burn_cause VARCHAR(100),
  burn_agent VARCHAR(100),
  time_of_injury TIMESTAMP NULL,
  place_of_injury VARCHAR(200),
  first_aid_given BOOLEAN DEFAULT false,
  first_aid_details TEXT,
  tbsa_percent DECIMAL(5,2),
  tbsa_calculation_method VARCHAR(50),
  body_regions JSON,
  depth_superficial_percent DECIMAL(5,2),
  depth_partial_percent DECIMAL(5,2),
  depth_full_percent DECIMAL(5,2),
  inhalation_injury BOOLEAN DEFAULT false,
  inhalation_details TEXT,
  circumferential_burns BOOLEAN DEFAULT false,
  circumferential_locations JSON,
  escharotomy_needed BOOLEAN DEFAULT false,
  escharotomy_done BOOLEAN DEFAULT false,
  fluid_resuscitation_started BOOLEAN DEFAULT false,
  parkland_volume_ml INT,
  fluid_given_first_8h INT,
  urine_output_target INT,
  severity_score VARCHAR(50),
  prognosis VARCHAR(100),
  transfer_needed BOOLEAN DEFAULT false,
  transfer_destination VARCHAR(200),
  photos JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_burn_assessments_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Burn Monitoring
CREATE TABLE IF NOT EXISTS burn_monitoring (
  id VARCHAR(36) PRIMARY KEY,
  burn_assessment_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  recorded_by VARCHAR(36),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hour_since_injury INT,
  fluid_given_ml INT,
  urine_output_ml INT,
  urine_output_per_kg_hr DECIMAL(4,2),
  vital_signs JSON,
  pain_score INT,
  wound_status TEXT,
  dressing_changes TEXT,
  complications TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (burn_assessment_id) REFERENCES burn_assessments(id) ON DELETE CASCADE
);

-- ============================================
-- LABORATORY & INVESTIGATIONS
-- ============================================

-- Lab Requests
CREATE TABLE IF NOT EXISTS lab_requests (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  requested_by VARCHAR(36),
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  priority VARCHAR(50) DEFAULT 'routine',
  clinical_info TEXT,
  tests_requested JSON,
  specimen_type VARCHAR(100),
  specimen_collected BOOLEAN DEFAULT false,
  specimen_collected_at TIMESTAMP NULL,
  specimen_collected_by VARCHAR(36),
  lab_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  results JSON,
  result_date TIMESTAMP NULL,
  resulted_by VARCHAR(36),
  interpretation TEXT,
  critical_values BOOLEAN DEFAULT false,
  critical_values_notified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lab_requests_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Investigations (Radiology, etc.)
CREATE TABLE IF NOT EXISTS investigations (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  requested_by VARCHAR(36),
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  investigation_type VARCHAR(100),
  investigation_name VARCHAR(200),
  modality VARCHAR(50),
  body_part VARCHAR(100),
  laterality VARCHAR(20),
  priority VARCHAR(50) DEFAULT 'routine',
  clinical_info TEXT,
  contrast_required BOOLEAN DEFAULT false,
  contrast_type VARCHAR(100),
  preparation_instructions TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_date TIMESTAMP NULL,
  performed_date TIMESTAMP NULL,
  performed_by VARCHAR(36),
  findings TEXT,
  impression TEXT,
  recommendations TEXT,
  images JSON,
  report_url TEXT,
  critical_findings BOOLEAN DEFAULT false,
  critical_findings_notified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_investigations_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- MEDICATIONS & PRESCRIPTIONS
-- ============================================

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  prescribed_by VARCHAR(36),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  medication_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  brand_name VARCHAR(200),
  dosage VARCHAR(100),
  dosage_form VARCHAR(50),
  route VARCHAR(50),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  duration_days INT,
  quantity INT,
  refills INT DEFAULT 0,
  instructions TEXT,
  indication TEXT,
  start_date DATE,
  end_date DATE,
  prn BOOLEAN DEFAULT false,
  prn_reason TEXT,
  status VARCHAR(50) DEFAULT 'active',
  discontinued_date TIMESTAMP NULL,
  discontinued_by VARCHAR(36),
  discontinuation_reason TEXT,
  dispensed BOOLEAN DEFAULT false,
  dispensed_date TIMESTAMP NULL,
  dispensed_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prescriptions_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Medication Charts
CREATE TABLE IF NOT EXISTS medication_charts (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  chart_date DATE NOT NULL,
  medications JSON,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_medication_charts_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Medication Administrations
CREATE TABLE IF NOT EXISTS medication_administrations (
  id VARCHAR(36) PRIMARY KEY,
  medication_chart_id VARCHAR(36),
  prescription_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  administered_by VARCHAR(36),
  administered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shift_type VARCHAR(20),
  scheduled_time TIME,
  actual_time TIME,
  medication_name VARCHAR(200),
  dosage VARCHAR(100),
  route VARCHAR(50),
  status VARCHAR(50) DEFAULT 'given',
  not_given_reason TEXT,
  site VARCHAR(100),
  patient_response TEXT,
  vital_signs_before JSON,
  vital_signs_after JSON,
  witness_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (medication_chart_id) REFERENCES medication_charts(id) ON DELETE CASCADE
);

-- ============================================
-- TREATMENT & DISCHARGE
-- ============================================

-- Treatment Plans
CREATE TABLE IF NOT EXISTS treatment_plans (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  created_by VARCHAR(36),
  diagnosis TEXT,
  goals JSON,
  interventions JSON,
  expected_outcomes JSON,
  timeline VARCHAR(100),
  start_date DATE,
  target_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  review_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Treatment Progress
CREATE TABLE IF NOT EXISTS treatment_progress (
  id VARCHAR(36) PRIMARY KEY,
  treatment_plan_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  recorded_by VARCHAR(36),
  progress_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress_notes TEXT,
  goals_achieved JSON,
  goals_in_progress JSON,
  barriers JSON,
  interventions_completed JSON,
  outcome_measures JSON,
  next_steps TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE
);

-- Discharge Summaries
CREATE TABLE IF NOT EXISTS discharge_summaries (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  prepared_by VARCHAR(36),
  approved_by VARCHAR(36),
  discharge_date TIMESTAMP NULL,
  admission_diagnosis TEXT,
  discharge_diagnosis TEXT,
  principal_diagnosis TEXT,
  secondary_diagnoses JSON,
  procedures_performed JSON,
  hospital_course TEXT,
  condition_at_discharge VARCHAR(50),
  discharge_disposition VARCHAR(100),
  discharge_medications JSON,
  follow_up_instructions TEXT,
  follow_up_appointments JSON,
  diet_instructions TEXT,
  activity_restrictions TEXT,
  wound_care_instructions TEXT,
  warning_signs TEXT,
  emergency_contact VARCHAR(100),
  referrals JSON,
  dme_needed JSON,
  home_health_needed BOOLEAN DEFAULT false,
  patient_education JSON,
  status VARCHAR(50) DEFAULT 'draft',
  approved_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- NUTRITION
-- ============================================

-- Nutrition Assessments
CREATE TABLE IF NOT EXISTS nutrition_assessments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  assessed_by VARCHAR(36),
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessment_type VARCHAR(50),
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  bmi DECIMAL(4,1),
  ideal_body_weight DECIMAL(5,1),
  weight_change DECIMAL(4,1),
  weight_change_period VARCHAR(50),
  must_score INT,
  must_risk VARCHAR(50),
  dietary_intake TEXT,
  appetite VARCHAR(50),
  nausea BOOLEAN DEFAULT false,
  vomiting BOOLEAN DEFAULT false,
  diarrhea BOOLEAN DEFAULT false,
  constipation BOOLEAN DEFAULT false,
  dysphagia BOOLEAN DEFAULT false,
  food_allergies JSON,
  food_intolerances JSON,
  diet_restrictions JSON,
  nutritional_requirements JSON,
  calorie_needs INT,
  protein_needs INT,
  fluid_needs INT,
  current_diet VARCHAR(100),
  recommended_diet VARCHAR(100),
  supplements JSON,
  enteral_nutrition BOOLEAN DEFAULT false,
  parenteral_nutrition BOOLEAN DEFAULT false,
  nutrition_goals JSON,
  nutrition_plan TEXT,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- APPOINTMENTS & BILLING
-- ============================================

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  doctor_id VARCHAR(36),
  appointment_type VARCHAR(100),
  specialty VARCHAR(100),
  scheduled_date TIMESTAMP NULL,
  scheduled_end TIMESTAMP NULL,
  duration_minutes INT DEFAULT 30,
  status VARCHAR(50) DEFAULT 'scheduled',
  priority VARCHAR(50) DEFAULT 'routine',
  reason TEXT,
  notes TEXT,
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  cancellation_reason TEXT,
  rescheduled_from VARCHAR(36),
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appointments_patient (patient_id),
  INDEX idx_appointments_date (scheduled_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  admission_id VARCHAR(36),
  encounter_id VARCHAR(36),
  invoice_number VARCHAR(100) UNIQUE,
  invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(50) DEFAULT 'draft',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(200),
  paid_at TIMESTAMP NULL,
  insurance_claim_id VARCHAR(100),
  insurance_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoices_patient (patient_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36),
  item_type VARCHAR(50),
  item_code VARCHAR(100),
  description TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  service_date DATE,
  performed_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- ============================================
-- COMMUNICATION
-- ============================================

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  name VARCHAR(200),
  room_type VARCHAR(50) DEFAULT 'direct',
  patient_id VARCHAR(36),
  case_id VARCHAR(36),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(36),
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36),
  user_id VARCHAR(36),
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  last_read_at TIMESTAMP NULL,
  is_muted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_room_user (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36),
  sender_id VARCHAR(36),
  message_type VARCHAR(50) DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size INT,
  reply_to_id VARCHAR(36),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP NULL,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP NULL,
  reactions JSON,
  read_by JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chat_messages_room (room_id),
  INDEX idx_chat_messages_created (created_at),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

-- Video Conferences
CREATE TABLE IF NOT EXISTS video_conferences (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  room_id VARCHAR(36),
  title VARCHAR(200),
  description TEXT,
  host_id VARCHAR(36),
  scheduled_start TIMESTAMP NULL,
  scheduled_end TIMESTAMP NULL,
  actual_start TIMESTAMP NULL,
  actual_end TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  meeting_url TEXT,
  meeting_code VARCHAR(100),
  password VARCHAR(100),
  settings JSON,
  recording_url TEXT,
  transcript TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Video Participants
CREATE TABLE IF NOT EXISTS video_participants (
  id VARCHAR(36) PRIMARY KEY,
  conference_id VARCHAR(36),
  user_id VARCHAR(36),
  role VARCHAR(50) DEFAULT 'participant',
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  duration_seconds INT,
  is_muted BOOLEAN DEFAULT false,
  is_video_on BOOLEAN DEFAULT true,
  is_screen_sharing BOOLEAN DEFAULT false,
  connection_quality VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conference_id) REFERENCES video_conferences(id) ON DELETE CASCADE
);

-- WebRTC Signaling
CREATE TABLE IF NOT EXISTS webrtc_signaling (
  id VARCHAR(36) PRIMARY KEY,
  conference_id VARCHAR(36),
  from_user_id VARCHAR(36),
  to_user_id VARCHAR(36),
  signal_type VARCHAR(50),
  payload JSON,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conference_id) REFERENCES video_conferences(id) ON DELETE CASCADE
);

-- ============================================
-- SURGICAL SPECIALTIES
-- ============================================

-- Preoperative Assessments
CREATE TABLE IF NOT EXISTS preoperative_assessments (
  id VARCHAR(36) PRIMARY KEY,
  surgery_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  assessed_by VARCHAR(36),
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  asa_class VARCHAR(10),
  asa_emergency BOOLEAN DEFAULT false,
  informed_consent_obtained BOOLEAN DEFAULT false,
  consent_date TIMESTAMP NULL,
  fasting_status VARCHAR(50),
  last_meal_time TIMESTAMP NULL,
  allergies JSON,
  current_medications JSON,
  medications_held JSON,
  medical_history JSON,
  surgical_history JSON,
  anesthesia_history JSON,
  family_history JSON,
  airway_assessment JSON,
  mallampati_class VARCHAR(10),
  cardiovascular_assessment JSON,
  respiratory_assessment JSON,
  renal_assessment JSON,
  hepatic_assessment JSON,
  neurological_assessment JSON,
  bleeding_risk VARCHAR(50),
  vte_prophylaxis_plan TEXT,
  antibiotic_prophylaxis TEXT,
  blood_products_needed JSON,
  special_equipment JSON,
  risk_scores JSON,
  anesthesia_plan TEXT,
  monitoring_plan TEXT,
  post_op_plan TEXT,
  icu_needed BOOLEAN DEFAULT false,
  cleared_for_surgery BOOLEAN DEFAULT false,
  clearance_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (surgery_id) REFERENCES surgeries(id) ON DELETE CASCADE
);

-- Postoperative Notes
CREATE TABLE IF NOT EXISTS postoperative_notes (
  id VARCHAR(36) PRIMARY KEY,
  surgery_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  written_by VARCHAR(36),
  note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pod_number INT,
  general_condition VARCHAR(100),
  vital_signs JSON,
  pain_score INT,
  pain_management TEXT,
  wound_condition TEXT,
  drain_output JSON,
  diet_status VARCHAR(50),
  bowel_function VARCHAR(50),
  urinary_function VARCHAR(50),
  mobility VARCHAR(50),
  respiratory_status TEXT,
  cardiovascular_status TEXT,
  complications JSON,
  lab_results_summary TEXT,
  imaging_results_summary TEXT,
  medications_changes TEXT,
  physiotherapy_notes TEXT,
  plan_for_today TEXT,
  estimated_discharge DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (surgery_id) REFERENCES surgeries(id) ON DELETE CASCADE
);

-- Surgical Notes
CREATE TABLE IF NOT EXISTS surgical_notes (
  id VARCHAR(36) PRIMARY KEY,
  surgery_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  surgeon_id VARCHAR(36),
  note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  preop_diagnosis TEXT,
  postop_diagnosis TEXT,
  procedure_name TEXT,
  procedure_details TEXT,
  anesthesia_type VARCHAR(100),
  position_type VARCHAR(100),
  skin_prep VARCHAR(100),
  incision TEXT,
  findings TEXT,
  technique TEXT,
  closure TEXT,
  specimens JSON,
  drains JSON,
  estimated_blood_loss INT,
  fluids_given JSON,
  blood_transfused INT,
  complications TEXT,
  implants JSON,
  counts_correct BOOLEAN DEFAULT true,
  postop_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (surgery_id) REFERENCES surgeries(id) ON DELETE CASCADE
);

-- ============================================
-- SPECIALIZED ASSESSMENTS
-- ============================================

-- External Reviews
CREATE TABLE IF NOT EXISTS external_reviews (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  requested_by VARCHAR(36),
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  specialty VARCHAR(100),
  urgency VARCHAR(50),
  clinical_summary TEXT,
  specific_questions TEXT,
  documents JSON,
  images JSON,
  external_reviewer_name VARCHAR(200),
  external_reviewer_institution VARCHAR(200),
  external_reviewer_email VARCHAR(255),
  review_received BOOLEAN DEFAULT false,
  review_date TIMESTAMP NULL,
  review_content TEXT,
  recommendations TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- MDT Meetings
CREATE TABLE IF NOT EXISTS mdt_meetings (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  meeting_date TIMESTAMP NULL,
  meeting_type VARCHAR(100),
  title VARCHAR(200),
  chairperson_id VARCHAR(36),
  attendees JSON,
  cases_discussed JSON,
  minutes TEXT,
  action_items JSON,
  next_meeting_date TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  recording_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Blood Transfusions
CREATE TABLE IF NOT EXISTS blood_transfusions (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  ordered_by VARCHAR(36),
  administered_by VARCHAR(36),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blood_product VARCHAR(100),
  blood_group VARCHAR(10),
  rh_factor VARCHAR(10),
  unit_number VARCHAR(100),
  volume_ml INT,
  indication TEXT,
  pre_transfusion_vitals JSON,
  transfusion_start TIMESTAMP NULL,
  transfusion_end TIMESTAMP NULL,
  post_transfusion_vitals JSON,
  reactions JSON,
  reaction_details TEXT,
  outcome VARCHAR(50),
  status VARCHAR(50) DEFAULT 'ordered',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Histopathology Requests
CREATE TABLE IF NOT EXISTS histopathology_requests (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  surgery_id VARCHAR(36),
  hospital_id VARCHAR(36),
  requested_by VARCHAR(36),
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  specimen_type VARCHAR(100),
  specimen_source VARCHAR(200),
  clinical_history TEXT,
  clinical_diagnosis TEXT,
  specimens JSON,
  gross_description TEXT,
  microscopic_description TEXT,
  special_stains JSON,
  immunohistochemistry JSON,
  molecular_tests JSON,
  diagnosis TEXT,
  staging JSON,
  margins JSON,
  lymph_nodes JSON,
  pathologist_id VARCHAR(36),
  pathologist_name VARCHAR(200),
  report_date TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'pending',
  report_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- NPWT Sessions
CREATE TABLE IF NOT EXISTS npwt_sessions (
  id VARCHAR(36) PRIMARY KEY,
  wound_id VARCHAR(36),
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  started_by VARCHAR(36),
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  pressure_mmhg INT,
  mode VARCHAR(50),
  dressing_type VARCHAR(100),
  dressing_changes JSON,
  exudate_collected_ml INT,
  complications JSON,
  wound_progress TEXT,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wound_id) REFERENCES wounds(id) ON DELETE CASCADE
);

-- Limb Salvage Assessments
CREATE TABLE IF NOT EXISTS limb_salvage_assessments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  assessed_by VARCHAR(36),
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  limb VARCHAR(50),
  indication TEXT,
  mangled_extremity_score INT,
  mess_score INT,
  ganga_score INT,
  limb_salvage_index DECIMAL(4,2),
  vascular_status JSON,
  neurological_status JSON,
  skeletal_status JSON,
  soft_tissue_status JSON,
  contamination_status JSON,
  patient_factors JSON,
  recommendation VARCHAR(100),
  surgical_plan TEXT,
  prognosis TEXT,
  photos JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================================
-- NURSING & STAFFING
-- ============================================

-- Shift Assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  user_id VARCHAR(36),
  ward VARCHAR(100),
  shift_date DATE NOT NULL,
  shift_type VARCHAR(20),
  start_time TIME,
  end_time TIME,
  role VARCHAR(50),
  patients_assigned JSON,
  status VARCHAR(50) DEFAULT 'scheduled',
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Nurse Notes
CREATE TABLE IF NOT EXISTS nurse_notes (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  admission_id VARCHAR(36),
  hospital_id VARCHAR(36),
  nurse_id VARCHAR(36),
  shift_type VARCHAR(20),
  note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessment TEXT,
  interventions TEXT,
  evaluation TEXT,
  vital_signs JSON,
  intake_output JSON,
  pain_assessment JSON,
  medication_notes TEXT,
  wound_care_notes TEXT,
  patient_education TEXT,
  family_interaction TEXT,
  safety_measures TEXT,
  fall_risk_score INT,
  pressure_ulcer_risk INT,
  restraint_assessment TEXT,
  handoff_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Comorbidities
CREATE TABLE IF NOT EXISTS comorbidities (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36),
  hospital_id VARCHAR(36),
  condition_name VARCHAR(200) NOT NULL,
  icd_code VARCHAR(20),
  diagnosis_date DATE,
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  treatment TEXT,
  controlling_physician VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Consumable BOMs
CREATE TABLE IF NOT EXISTS consumable_boms (
  id VARCHAR(36) PRIMARY KEY,
  surgery_id VARCHAR(36),
  hospital_id VARCHAR(36),
  created_by VARCHAR(36),
  procedure_name VARCHAR(200),
  total_cost DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  approved_by VARCHAR(36),
  approved_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (surgery_id) REFERENCES surgeries(id) ON DELETE CASCADE
);

-- Consumable BOM Items
CREATE TABLE IF NOT EXISTS consumable_bom_items (
  id VARCHAR(36) PRIMARY KEY,
  bom_id VARCHAR(36),
  item_name VARCHAR(200) NOT NULL,
  item_code VARCHAR(100),
  category VARCHAR(100),
  quantity INT DEFAULT 1,
  unit VARCHAR(50),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bom_id) REFERENCES consumable_boms(id) ON DELETE CASCADE
);

-- Success message
SELECT 'AstroHEALTH MySQL Schema Created Successfully!' as status;
