-- DigitalOcean PostgreSQL Schema for AstroHEALTH
-- Run this SQL in your DigitalOcean database to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'doctor',
  hospital_id UUID,
  phone VARCHAR(50),
  license_number VARCHAR(100),
  specialty VARCHAR(100),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  profile_image TEXT,
  agreement_accepted BOOLEAN DEFAULT false,
  agreement_accepted_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  settings JSONB DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_number VARCHAR(100),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  blood_group VARCHAR(10),
  genotype VARCHAR(10),
  phone VARCHAR(50),
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
  allergies TEXT[],
  chronic_conditions TEXT[],
  current_medications TEXT[],
  past_surgical_history TEXT[],
  family_history TEXT,
  social_history TEXT,
  insurance_provider VARCHAR(200),
  insurance_id VARCHAR(100),
  insurance_expiry DATE,
  registered_hospital_id UUID REFERENCES hospitals(id),
  hospital_id UUID REFERENCES hospitals(id),
  is_active BOOLEAN DEFAULT true,
  photo TEXT,
  notes TEXT,
  caprini_score INTEGER,
  waterlow_score INTEGER,
  must_score INTEGER,
  dvt_risk VARCHAR(50),
  pressure_sore_risk VARCHAR(50),
  malnutrition_risk VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CLINICAL TABLES
-- ============================================

-- Vital Signs
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  recorded_by UUID REFERENCES users(id),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  pulse_rate INTEGER,
  temperature DECIMAL(4,1),
  respiratory_rate INTEGER,
  oxygen_saturation INTEGER,
  weight DECIMAL(5,1),
  height DECIMAL(5,1),
  bmi DECIMAL(4,1),
  blood_sugar DECIMAL(5,1),
  blood_sugar_type VARCHAR(20),
  pain_score INTEGER,
  consciousness_level VARCHAR(50),
  urine_output INTEGER,
  intake INTEGER,
  output INTEGER,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical Encounters
CREATE TABLE IF NOT EXISTS clinical_encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  doctor_id UUID REFERENCES users(id),
  encounter_type VARCHAR(50),
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  past_surgical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  drug_history TEXT,
  allergy_history TEXT,
  review_of_systems JSONB,
  physical_examination JSONB,
  general_examination TEXT,
  systemic_examination TEXT,
  local_examination TEXT,
  assessment TEXT,
  plan TEXT,
  diagnosis TEXT[],
  icd_codes TEXT[],
  differential_diagnosis TEXT[],
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  follow_up_date DATE,
  encounter_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Surgeries
CREATE TABLE IF NOT EXISTS surgeries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  surgeon_id UUID REFERENCES users(id),
  surgery_type VARCHAR(200),
  procedure_name VARCHAR(500),
  procedure_code VARCHAR(50),
  cpt_code VARCHAR(50),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  anesthesia_type VARCHAR(100),
  anesthesiologist_id UUID REFERENCES users(id),
  assistant_surgeons UUID[],
  scrub_nurses UUID[],
  circulating_nurses UUID[],
  operating_room VARCHAR(50),
  preop_diagnosis TEXT,
  postop_diagnosis TEXT,
  indications TEXT,
  findings TEXT,
  procedure_details TEXT,
  complications TEXT,
  estimated_blood_loss INTEGER,
  blood_transfused INTEGER,
  specimens TEXT[],
  implants TEXT[],
  drains TEXT[],
  wound_classification VARCHAR(50),
  asa_class VARCHAR(10),
  urgency VARCHAR(50),
  status VARCHAR(50) DEFAULT 'scheduled',
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admissions
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  admitting_doctor_id UUID REFERENCES users(id),
  attending_doctor_id UUID REFERENCES users(id),
  ward VARCHAR(100),
  bed_number VARCHAR(50),
  room_number VARCHAR(50),
  admission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_discharge DATE,
  discharge_date TIMESTAMP WITH TIME ZONE,
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
  isolation_precautions TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ward Rounds
CREATE TABLE IF NOT EXISTS ward_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id),
  hospital_id UUID REFERENCES hospitals(id),
  doctor_id UUID REFERENCES users(id),
  round_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WOUND & BURN MANAGEMENT
-- ============================================

-- Wounds
CREATE TABLE IF NOT EXISTS wounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  created_by UUID REFERENCES users(id),
  wound_type VARCHAR(100),
  location VARCHAR(200),
  laterality VARCHAR(20),
  etiology VARCHAR(100),
  onset_date DATE,
  duration_weeks INTEGER,
  length_cm DECIMAL(5,2),
  width_cm DECIMAL(5,2),
  depth_cm DECIMAL(5,2),
  area_cm2 DECIMAL(8,2),
  volume_cm3 DECIMAL(8,2),
  wound_bed_tissue JSONB,
  exudate_amount VARCHAR(50),
  exudate_type VARCHAR(50),
  wound_edges VARCHAR(100),
  periwound_condition VARCHAR(100),
  odor BOOLEAN DEFAULT false,
  pain_level INTEGER,
  signs_of_infection TEXT[],
  current_treatment TEXT,
  dressing_type VARCHAR(200),
  dressing_frequency VARCHAR(100),
  previous_treatments TEXT[],
  healing_trajectory VARCHAR(50),
  photos TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wound Measurements
CREATE TABLE IF NOT EXISTS wound_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wound_id UUID REFERENCES wounds(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  measured_by UUID REFERENCES users(id),
  measurement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  measurement_method VARCHAR(50),
  length_cm DECIMAL(5,2),
  width_cm DECIMAL(5,2),
  depth_cm DECIMAL(5,2),
  area_cm2 DECIMAL(8,2),
  volume_cm3 DECIMAL(8,2),
  perimeter_cm DECIMAL(6,2),
  undermining TEXT,
  tunneling TEXT,
  wound_bed_tissue JSONB,
  granulation_percent INTEGER,
  slough_percent INTEGER,
  necrotic_percent INTEGER,
  epithelialization_percent INTEGER,
  exudate_amount VARCHAR(50),
  exudate_type VARCHAR(50),
  wound_edges VARCHAR(100),
  periwound_condition VARCHAR(100),
  pain_level INTEGER,
  odor BOOLEAN DEFAULT false,
  signs_of_infection TEXT[],
  photo TEXT,
  calibration_data JSONB,
  ai_assisted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Burn Assessments
CREATE TABLE IF NOT EXISTS burn_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  assessed_by UUID REFERENCES users(id),
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  burn_cause VARCHAR(100),
  burn_agent VARCHAR(100),
  time_of_injury TIMESTAMP WITH TIME ZONE,
  place_of_injury VARCHAR(200),
  first_aid_given BOOLEAN DEFAULT false,
  first_aid_details TEXT,
  tbsa_percent DECIMAL(5,2),
  tbsa_calculation_method VARCHAR(50),
  body_regions JSONB,
  depth_superficial_percent DECIMAL(5,2),
  depth_partial_percent DECIMAL(5,2),
  depth_full_percent DECIMAL(5,2),
  inhalation_injury BOOLEAN DEFAULT false,
  inhalation_details TEXT,
  circumferential_burns BOOLEAN DEFAULT false,
  circumferential_locations TEXT[],
  escharotomy_needed BOOLEAN DEFAULT false,
  escharotomy_done BOOLEAN DEFAULT false,
  fluid_resuscitation_started BOOLEAN DEFAULT false,
  parkland_volume_ml INTEGER,
  fluid_given_first_8h INTEGER,
  urine_output_target INTEGER,
  severity_score VARCHAR(50),
  prognosis VARCHAR(100),
  transfer_needed BOOLEAN DEFAULT false,
  transfer_destination VARCHAR(200),
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Burn Monitoring
CREATE TABLE IF NOT EXISTS burn_monitoring (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  burn_assessment_id UUID REFERENCES burn_assessments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hour_since_injury INTEGER,
  fluid_given_ml INTEGER,
  urine_output_ml INTEGER,
  urine_output_per_kg_hr DECIMAL(4,2),
  vital_signs JSONB,
  pain_score INTEGER,
  wound_status TEXT,
  dressing_changes TEXT,
  complications TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LABORATORY & INVESTIGATIONS
-- ============================================

-- Lab Requests
CREATE TABLE IF NOT EXISTS lab_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  requested_by UUID REFERENCES users(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority VARCHAR(50) DEFAULT 'routine',
  clinical_info TEXT,
  tests_requested JSONB,
  specimen_type VARCHAR(100),
  specimen_collected BOOLEAN DEFAULT false,
  specimen_collected_at TIMESTAMP WITH TIME ZONE,
  specimen_collected_by UUID,
  lab_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  results JSONB,
  result_date TIMESTAMP WITH TIME ZONE,
  resulted_by UUID,
  interpretation TEXT,
  critical_values BOOLEAN DEFAULT false,
  critical_values_notified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investigations (Radiology, etc.)
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  requested_by UUID REFERENCES users(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  scheduled_date TIMESTAMP WITH TIME ZONE,
  performed_date TIMESTAMP WITH TIME ZONE,
  performed_by UUID,
  findings TEXT,
  impression TEXT,
  recommendations TEXT,
  images TEXT[],
  report_url TEXT,
  critical_findings BOOLEAN DEFAULT false,
  critical_findings_notified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MEDICATIONS & PRESCRIPTIONS
-- ============================================

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  prescribed_by UUID REFERENCES users(id),
  encounter_id UUID REFERENCES clinical_encounters(id),
  admission_id UUID REFERENCES admissions(id),
  prescription_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  medication_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  brand_name VARCHAR(200),
  dosage VARCHAR(100),
  dosage_form VARCHAR(50),
  route VARCHAR(50),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  duration_days INTEGER,
  quantity INTEGER,
  refills INTEGER DEFAULT 0,
  instructions TEXT,
  indication TEXT,
  start_date DATE,
  end_date DATE,
  prn BOOLEAN DEFAULT false,
  prn_reason TEXT,
  status VARCHAR(50) DEFAULT 'active',
  discontinued_date TIMESTAMP WITH TIME ZONE,
  discontinued_by UUID,
  discontinuation_reason TEXT,
  dispensed BOOLEAN DEFAULT false,
  dispensed_date TIMESTAMP WITH TIME ZONE,
  dispensed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medication Charts
CREATE TABLE IF NOT EXISTS medication_charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id),
  hospital_id UUID REFERENCES hospitals(id),
  chart_date DATE NOT NULL,
  medications JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medication Administrations
CREATE TABLE IF NOT EXISTS medication_administrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_chart_id UUID REFERENCES medication_charts(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id),
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  administered_by UUID REFERENCES users(id),
  administered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shift VARCHAR(20),
  scheduled_time TIME,
  actual_time TIME,
  medication_name VARCHAR(200),
  dosage VARCHAR(100),
  route VARCHAR(50),
  status VARCHAR(50) DEFAULT 'given',
  not_given_reason TEXT,
  site VARCHAR(100),
  patient_response TEXT,
  vital_signs_before JSONB,
  vital_signs_after JSONB,
  witness_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TREATMENT & DISCHARGE
-- ============================================

-- Treatment Plans
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  created_by UUID REFERENCES users(id),
  diagnosis TEXT,
  goals TEXT[],
  interventions JSONB,
  expected_outcomes TEXT[],
  timeline VARCHAR(100),
  start_date DATE,
  target_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  review_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatment Progress
CREATE TABLE IF NOT EXISTS treatment_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  recorded_by UUID REFERENCES users(id),
  progress_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_notes TEXT,
  goals_achieved TEXT[],
  goals_in_progress TEXT[],
  barriers TEXT[],
  interventions_completed TEXT[],
  outcome_measures JSONB,
  next_steps TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discharge Summaries
CREATE TABLE IF NOT EXISTS discharge_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id),
  hospital_id UUID REFERENCES hospitals(id),
  prepared_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  discharge_date TIMESTAMP WITH TIME ZONE,
  admission_diagnosis TEXT,
  discharge_diagnosis TEXT,
  principal_diagnosis TEXT,
  secondary_diagnoses TEXT[],
  procedures_performed TEXT[],
  hospital_course TEXT,
  condition_at_discharge VARCHAR(50),
  discharge_disposition VARCHAR(100),
  discharge_medications JSONB,
  follow_up_instructions TEXT,
  follow_up_appointments JSONB,
  diet_instructions TEXT,
  activity_restrictions TEXT,
  wound_care_instructions TEXT,
  warning_signs TEXT,
  emergency_contact TEXT,
  referrals JSONB,
  dme_needed TEXT[],
  home_health_needed BOOLEAN DEFAULT false,
  patient_education JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NUTRITION
-- ============================================

-- Nutrition Assessments
CREATE TABLE IF NOT EXISTS nutrition_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  assessed_by UUID REFERENCES users(id),
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assessment_type VARCHAR(50),
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  bmi DECIMAL(4,1),
  ideal_body_weight DECIMAL(5,1),
  weight_change DECIMAL(4,1),
  weight_change_period VARCHAR(50),
  must_score INTEGER,
  must_risk VARCHAR(50),
  dietary_intake TEXT,
  appetite VARCHAR(50),
  nausea BOOLEAN DEFAULT false,
  vomiting BOOLEAN DEFAULT false,
  diarrhea BOOLEAN DEFAULT false,
  constipation BOOLEAN DEFAULT false,
  dysphagia BOOLEAN DEFAULT false,
  food_allergies TEXT[],
  food_intolerances TEXT[],
  diet_restrictions TEXT[],
  nutritional_requirements JSONB,
  calorie_needs INTEGER,
  protein_needs INTEGER,
  fluid_needs INTEGER,
  current_diet VARCHAR(100),
  recommended_diet VARCHAR(100),
  supplements TEXT[],
  enteral_nutrition BOOLEAN DEFAULT false,
  parenteral_nutrition BOOLEAN DEFAULT false,
  nutrition_goals TEXT[],
  nutrition_plan TEXT,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- APPOINTMENTS & BILLING
-- ============================================

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  doctor_id UUID REFERENCES users(id),
  appointment_type VARCHAR(100),
  specialty VARCHAR(100),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 30,
  status VARCHAR(50) DEFAULT 'scheduled',
  priority VARCHAR(50) DEFAULT 'routine',
  reason TEXT,
  notes TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  rescheduled_from UUID,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  admission_id UUID REFERENCES admissions(id),
  encounter_id UUID REFERENCES clinical_encounters(id),
  invoice_number VARCHAR(100) UNIQUE,
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  paid_at TIMESTAMP WITH TIME ZONE,
  insurance_claim_id VARCHAR(100),
  insurance_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  item_type VARCHAR(50),
  item_code VARCHAR(100),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  service_date DATE,
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMUNICATION
-- ============================================

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  name VARCHAR(200),
  room_type VARCHAR(50) DEFAULT 'direct',
  patient_id UUID REFERENCES patients(id),
  case_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  message_type VARCHAR(50) DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size INTEGER,
  reply_to_id UUID REFERENCES chat_messages(id),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  reactions JSONB DEFAULT '{}',
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Conferences
CREATE TABLE IF NOT EXISTS video_conferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  room_id UUID REFERENCES chat_rooms(id),
  title VARCHAR(200),
  description TEXT,
  host_id UUID REFERENCES users(id),
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'scheduled',
  meeting_url TEXT,
  meeting_code VARCHAR(100),
  password VARCHAR(100),
  settings JSONB DEFAULT '{}',
  recording_url TEXT,
  transcript TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Participants
CREATE TABLE IF NOT EXISTS video_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conference_id UUID REFERENCES video_conferences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'participant',
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  is_muted BOOLEAN DEFAULT false,
  is_video_on BOOLEAN DEFAULT true,
  is_screen_sharing BOOLEAN DEFAULT false,
  connection_quality VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WebRTC Signaling
CREATE TABLE IF NOT EXISTS webrtc_signaling (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conference_id UUID REFERENCES video_conferences(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  signal_type VARCHAR(50),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SURGICAL SPECIALTIES
-- ============================================

-- Preoperative Assessments
CREATE TABLE IF NOT EXISTS preoperative_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surgery_id UUID REFERENCES surgeries(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  assessed_by UUID REFERENCES users(id),
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  asa_class VARCHAR(10),
  asa_emergency BOOLEAN DEFAULT false,
  informed_consent_obtained BOOLEAN DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE,
  fasting_status VARCHAR(50),
  last_meal_time TIMESTAMP WITH TIME ZONE,
  allergies TEXT[],
  current_medications TEXT[],
  medications_held TEXT[],
  medical_history JSONB,
  surgical_history JSONB,
  anesthesia_history JSONB,
  family_history JSONB,
  airway_assessment JSONB,
  mallampati_class VARCHAR(10),
  cardiovascular_assessment JSONB,
  respiratory_assessment JSONB,
  renal_assessment JSONB,
  hepatic_assessment JSONB,
  neurological_assessment JSONB,
  bleeding_risk VARCHAR(50),
  vte_prophylaxis_plan TEXT,
  antibiotic_prophylaxis TEXT,
  blood_products_needed TEXT[],
  special_equipment TEXT[],
  risk_scores JSONB,
  anesthesia_plan TEXT,
  monitoring_plan TEXT,
  post_op_plan TEXT,
  icu_needed BOOLEAN DEFAULT false,
  cleared_for_surgery BOOLEAN DEFAULT false,
  clearance_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Postoperative Notes
CREATE TABLE IF NOT EXISTS postoperative_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surgery_id UUID REFERENCES surgeries(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  written_by UUID REFERENCES users(id),
  note_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pod_number INTEGER,
  general_condition VARCHAR(100),
  vital_signs JSONB,
  pain_score INTEGER,
  pain_management TEXT,
  wound_condition TEXT,
  drain_output JSONB,
  diet_status VARCHAR(50),
  bowel_function VARCHAR(50),
  urinary_function VARCHAR(50),
  mobility VARCHAR(50),
  respiratory_status TEXT,
  cardiovascular_status TEXT,
  complications TEXT[],
  lab_results_summary TEXT,
  imaging_results_summary TEXT,
  medications_changes TEXT,
  physiotherapy_notes TEXT,
  plan_for_today TEXT,
  estimated_discharge DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Surgical Notes
CREATE TABLE IF NOT EXISTS surgical_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surgery_id UUID REFERENCES surgeries(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  surgeon_id UUID REFERENCES users(id),
  note_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preop_diagnosis TEXT,
  postop_diagnosis TEXT,
  procedure_name TEXT,
  procedure_details TEXT,
  anesthesia_type VARCHAR(100),
  position VARCHAR(100),
  skin_prep VARCHAR(100),
  incision TEXT,
  findings TEXT,
  technique TEXT,
  closure TEXT,
  specimens TEXT[],
  drains TEXT[],
  estimated_blood_loss INTEGER,
  fluids_given JSONB,
  blood_transfused INTEGER,
  complications TEXT,
  implants TEXT[],
  counts_correct BOOLEAN DEFAULT true,
  postop_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SPECIALIZED ASSESSMENTS
-- ============================================

-- External Reviews
CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  requested_by UUID REFERENCES users(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  specialty VARCHAR(100),
  urgency VARCHAR(50),
  clinical_summary TEXT,
  specific_questions TEXT,
  documents TEXT[],
  images TEXT[],
  external_reviewer_name VARCHAR(200),
  external_reviewer_institution VARCHAR(200),
  external_reviewer_email VARCHAR(255),
  review_received BOOLEAN DEFAULT false,
  review_date TIMESTAMP WITH TIME ZONE,
  review_content TEXT,
  recommendations TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MDT Meetings
CREATE TABLE IF NOT EXISTS mdt_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  meeting_date TIMESTAMP WITH TIME ZONE,
  meeting_type VARCHAR(100),
  title VARCHAR(200),
  chairperson_id UUID REFERENCES users(id),
  attendees UUID[],
  cases_discussed JSONB,
  minutes TEXT,
  action_items JSONB,
  next_meeting_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'scheduled',
  recording_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blood Transfusions
CREATE TABLE IF NOT EXISTS blood_transfusions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  ordered_by UUID REFERENCES users(id),
  administered_by UUID REFERENCES users(id),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blood_product VARCHAR(100),
  blood_group VARCHAR(10),
  rh_factor VARCHAR(10),
  unit_number VARCHAR(100),
  volume_ml INTEGER,
  indication TEXT,
  pre_transfusion_vitals JSONB,
  transfusion_start TIMESTAMP WITH TIME ZONE,
  transfusion_end TIMESTAMP WITH TIME ZONE,
  post_transfusion_vitals JSONB,
  reactions TEXT[],
  reaction_details TEXT,
  outcome VARCHAR(50),
  status VARCHAR(50) DEFAULT 'ordered',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histopathology Requests
CREATE TABLE IF NOT EXISTS histopathology_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  surgery_id UUID REFERENCES surgeries(id),
  hospital_id UUID REFERENCES hospitals(id),
  requested_by UUID REFERENCES users(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  specimen_type VARCHAR(100),
  specimen_source VARCHAR(200),
  clinical_history TEXT,
  clinical_diagnosis TEXT,
  specimens JSONB,
  gross_description TEXT,
  microscopic_description TEXT,
  special_stains JSONB,
  immunohistochemistry JSONB,
  molecular_tests JSONB,
  diagnosis TEXT,
  staging JSONB,
  margins JSONB,
  lymph_nodes JSONB,
  pathologist_id UUID,
  pathologist_name VARCHAR(200),
  report_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending',
  report_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NPWT Sessions
CREATE TABLE IF NOT EXISTS npwt_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wound_id UUID REFERENCES wounds(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  started_by UUID REFERENCES users(id),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  pressure_mmhg INTEGER,
  mode VARCHAR(50),
  dressing_type VARCHAR(100),
  dressing_changes JSONB,
  exudate_collected_ml INTEGER,
  complications TEXT[],
  wound_progress TEXT,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Limb Salvage Assessments
CREATE TABLE IF NOT EXISTS limb_salvage_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  assessed_by UUID REFERENCES users(id),
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  limb VARCHAR(50),
  indication TEXT,
  mangled_extremity_score INTEGER,
  mess_score INTEGER,
  ganga_score INTEGER,
  limb_salvage_index DECIMAL(4,2),
  vascular_status JSONB,
  neurological_status JSONB,
  skeletal_status JSONB,
  soft_tissue_status JSONB,
  contamination_status JSONB,
  patient_factors JSONB,
  recommendation VARCHAR(100),
  surgical_plan TEXT,
  prognosis TEXT,
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NURSING & STAFFING
-- ============================================

-- Shift Assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  user_id UUID REFERENCES users(id),
  ward VARCHAR(100),
  shift_date DATE NOT NULL,
  shift_type VARCHAR(20),
  start_time TIME,
  end_time TIME,
  role VARCHAR(50),
  patients_assigned UUID[],
  status VARCHAR(50) DEFAULT 'scheduled',
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nurse Notes
CREATE TABLE IF NOT EXISTS nurse_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id),
  hospital_id UUID REFERENCES hospitals(id),
  nurse_id UUID REFERENCES users(id),
  shift VARCHAR(20),
  note_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assessment TEXT,
  interventions TEXT,
  evaluation TEXT,
  vital_signs JSONB,
  intake_output JSONB,
  pain_assessment JSONB,
  medication_notes TEXT,
  wound_care_notes TEXT,
  patient_education TEXT,
  family_interaction TEXT,
  safety_measures TEXT,
  fall_risk_score INTEGER,
  pressure_ulcer_risk INTEGER,
  restraint_assessment TEXT,
  handoff_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comorbidities
CREATE TABLE IF NOT EXISTS comorbidities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  condition_name VARCHAR(200) NOT NULL,
  icd_code VARCHAR(20),
  diagnosis_date DATE,
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  treatment TEXT,
  controlling_physician VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consumable BOMs
CREATE TABLE IF NOT EXISTS consumable_boms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surgery_id UUID REFERENCES surgeries(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  created_by UUID REFERENCES users(id),
  procedure_name VARCHAR(200),
  total_cost DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consumable BOM Items
CREATE TABLE IF NOT EXISTS consumable_bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_id UUID REFERENCES consumable_boms(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  item_code VARCHAR(100),
  category VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(50),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_registered_hospital ON patients(registered_hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_number ON patients(hospital_number);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON vital_signs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_date ON clinical_encounters(encounter_date);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_scheduled ON surgeries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_surgeries_surgeon ON surgeries(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_patient ON ward_rounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_date ON ward_rounds(round_date);
CREATE INDEX IF NOT EXISTS idx_wounds_patient ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_wound_measurements_wound ON wound_measurements(wound_id);
CREATE INDEX IF NOT EXISTS idx_burn_assessments_patient ON burn_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigations_patient ON investigations(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_charts_patient ON medication_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TRIGGER FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at 
                        BEFORE UPDATE ON %I 
                        FOR EACH ROW 
                        EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- Success message
SELECT 'AstroHEALTH DigitalOcean Schema Created Successfully!' as status;
