-- ============================================================
-- AstroHEALTH Complete Supabase Database Schema v2.0
-- This schema includes ALL tables for the complete application
-- Run this SQL in Supabase SQL Editor to create/recreate all tables
-- ============================================================
-- Includes:
-- - Core tables (hospitals, users, patients)
-- - Clinical tables (encounters, vital signs, wounds, burns)
-- - Surgery & Theater tables
-- - Lab & Pharmacy tables
-- - Admission & Ward tables
-- - Communication tables (chat, video)
-- - NEW: Discharge summaries
-- - NEW: Consumable BOM (Bill of Materials)
-- - NEW: Histopathology requests
-- - NEW: Nutrition planner data
-- - NEW: Blood transfusion records
-- - NEW: MDT meetings
-- ============================================================

-- ================================================
-- STEP 1: Drop all existing tables (if any)
-- ================================================

DROP TABLE IF EXISTS mdt_meetings CASCADE;
DROP TABLE IF EXISTS blood_transfusions CASCADE;
DROP TABLE IF EXISTS nutrition_plans CASCADE;
DROP TABLE IF EXISTS histopathology_requests CASCADE;
DROP TABLE IF EXISTS consumable_boms CASCADE;
DROP TABLE IF EXISTS discharge_summaries CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS enhanced_video_conferences CASCADE;
DROP TABLE IF EXISTS video_conferences CASCADE;
DROP TABLE IF EXISTS investigations CASCADE;
DROP TABLE IF EXISTS ward_rounds CASCADE;
DROP TABLE IF EXISTS nurse_assignments CASCADE;
DROP TABLE IF EXISTS doctor_assignments CASCADE;
DROP TABLE IF EXISTS treatment_progress CASCADE;
DROP TABLE IF EXISTS treatment_plans CASCADE;
DROP TABLE IF EXISTS bed_assignments CASCADE;
DROP TABLE IF EXISTS admission_notes CASCADE;
DROP TABLE IF EXISTS admissions CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS nutrition_assessments CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS lab_requests CASCADE;
DROP TABLE IF EXISTS burn_assessments CASCADE;
DROP TABLE IF EXISTS wounds CASCADE;
DROP TABLE IF EXISTS surgeries CASCADE;
DROP TABLE IF EXISTS clinical_encounters CASCADE;
DROP TABLE IF EXISTS vital_signs CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ================================================
-- STEP 2: Create all tables with TEXT IDs
-- ================================================

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Hospitals table
CREATE TABLE hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  type TEXT,
  logo TEXT,
  website TEXT,
  bed_capacity INTEGER,
  icu_beds INTEGER,
  operating_theatres INTEGER,
  is_24_hours BOOLEAN DEFAULT false,
  has_emergency BOOLEAN DEFAULT false,
  has_laboratory BOOLEAN DEFAULT false,
  has_pharmacy BOOLEAN DEFAULT false,
  has_radiology BOOLEAN DEFAULT false,
  specialties JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL,
  hospital_id TEXT,
  phone TEXT,
  avatar TEXT,
  specialization TEXT,
  specialty TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  has_accepted_agreement BOOLEAN DEFAULT false,
  agreement_accepted_at TEXT,
  agreement_version TEXT,
  agreement_device_info TEXT,
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  hospital_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  genotype TEXT,
  marital_status TEXT,
  phone TEXT,
  alternate_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  occupation TEXT,
  religion TEXT,
  tribe TEXT,
  nationality TEXT DEFAULT 'Nigerian',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  next_of_kin JSONB,
  allergies JSONB,
  chronic_conditions JSONB,
  photo TEXT,
  care_type TEXT,
  hospital_id TEXT,
  hospital_name TEXT,
  ward TEXT,
  registered_hospital_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- CLINICAL TABLES
-- ==========================================

-- Vital Signs table
CREATE TABLE vital_signs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  temperature DECIMAL,
  pulse INTEGER,
  respiratory_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  oxygen_saturation INTEGER,
  spo2 INTEGER,
  weight DECIMAL,
  height DECIMAL,
  bmi DECIMAL,
  pain_score INTEGER,
  blood_glucose DECIMAL,
  blood_sugar DECIMAL,
  consciousness_level TEXT,
  urine_output DECIMAL,
  notes TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Encounters table
CREATE TABLE clinical_encounters (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress',
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  past_surgical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  physical_examination JSONB,
  diagnosis JSONB,
  treatment_plan TEXT,
  notes TEXT,
  attending_clinician TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Surgeries table
CREATE TABLE surgeries (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  procedure_name TEXT NOT NULL,
  procedure_code TEXT,
  type TEXT,
  category TEXT,
  pre_operative_assessment JSONB,
  scheduled_date TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  priority TEXT DEFAULT 'elective',
  surgeon TEXT,
  assistant TEXT,
  anaesthetist TEXT,
  scrub_nurse TEXT,
  circulating_nurse TEXT,
  anaesthesia_type TEXT,
  operative_notes TEXT,
  complications TEXT,
  blood_loss INTEGER,
  specimen_sent BOOLEAN,
  specimen_type TEXT,
  post_operative_instructions TEXT,
  duration_minutes INTEGER,
  team JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wounds table
CREATE TABLE wounds (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  location TEXT,
  type TEXT NOT NULL,
  etiology TEXT,
  length DECIMAL,
  width DECIMAL,
  depth DECIMAL,
  area DECIMAL,
  tissue_type JSONB,
  exudate_amount TEXT,
  exudate_type TEXT,
  odor BOOLEAN,
  peri_wound_condition TEXT,
  periwound_skin TEXT,
  pain_level INTEGER,
  photos JSONB,
  photo_urls JSONB,
  infection_signs JSONB,
  healing_progress TEXT,
  dressing_type TEXT,
  dressing_frequency TEXT,
  treatment TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Burn Assessments table
CREATE TABLE burn_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  burn_type TEXT,
  mechanism TEXT,
  time_of_injury TIMESTAMPTZ,
  tbsa_percentage DECIMAL,
  tbsa DECIMAL,
  burn_depth JSONB,
  affected_areas JSONB,
  parkland_formula JSONB,
  absi_score JSONB,
  inhalation_injury BOOLEAN DEFAULT false,
  associated_injuries TEXT,
  tetanus_status BOOLEAN,
  fluid_requirement DECIMAL,
  urine_output_target DECIMAL,
  escharotomy_needed BOOLEAN DEFAULT false,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- LAB & PHARMACY TABLES
-- ==========================================

-- Lab Requests table
CREATE TABLE lab_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  hospital_id TEXT,
  tests JSONB,
  priority TEXT DEFAULT 'routine',
  clinical_info TEXT,
  status TEXT DEFAULT 'pending',
  requested_by TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  hospital_id TEXT,
  medications JSONB,
  diagnosis TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  prescribed_by TEXT,
  prescribed_at TIMESTAMPTZ DEFAULT NOW(),
  dispensed_at TIMESTAMPTZ,
  dispensed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- NUTRITION TABLES
-- ==========================================

-- Nutrition Assessments table
CREATE TABLE nutrition_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  hospital_id TEXT,
  weight DECIMAL,
  height DECIMAL,
  must_score INTEGER,
  bmi DECIMAL,
  sga_grade TEXT,
  anthropometrics JSONB,
  dietary_history TEXT,
  dietary_restrictions JSONB,
  food_allergies JSONB,
  allergies JSONB,
  nutritional_diagnosis TEXT,
  meal_plan JSONB,
  supplementation JSONB,
  supplements JSONB,
  notes TEXT,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition Plans table (NEW)
CREATE TABLE nutrition_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  
  -- Patient Metrics
  weight DECIMAL,
  height DECIMAL,
  bmi DECIMAL,
  activity_level TEXT,
  clinical_condition TEXT,
  stress_factor DECIMAL,
  
  -- Calculated Requirements
  bmr DECIMAL,
  tdee DECIMAL,
  calorie_target DECIMAL,
  protein_target DECIMAL,
  carbs_target DECIMAL,
  fat_target DECIMAL,
  fiber_target DECIMAL,
  fluid_target DECIMAL,
  
  -- Plan Details
  meal_frequency INTEGER DEFAULT 3,
  snacks_per_day INTEGER DEFAULT 2,
  dietary_restrictions JSONB,
  food_allergies JSONB,
  food_preferences JSONB,
  
  -- Meal Plans
  meal_plans JSONB,
  weekly_menu JSONB,
  
  -- Special Considerations
  enteral_feeding BOOLEAN DEFAULT false,
  enteral_formula TEXT,
  enteral_rate DECIMAL,
  parenteral_nutrition BOOLEAN DEFAULT false,
  parenteral_details JSONB,
  
  -- Supplements
  supplements JSONB,
  
  -- Monitoring
  monitoring_parameters JSONB,
  weight_goals JSONB,
  
  -- Metadata
  plan_type TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'active',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- BILLING TABLES
-- ==========================================

-- Invoices table
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  encounter_id TEXT,
  items JSONB,
  subtotal DECIMAL,
  discount DECIMAL DEFAULT 0,
  tax DECIMAL DEFAULT 0,
  total DECIMAL,
  total_amount DECIMAL,
  amount_paid DECIMAL DEFAULT 0,
  paid_amount DECIMAL,
  balance DECIMAL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ADMISSION & WARD TABLES
-- ==========================================

-- Admissions table
CREATE TABLE admissions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  encounter_id TEXT,
  admission_number TEXT,
  admission_date TIMESTAMPTZ DEFAULT NOW(),
  admission_time TEXT,
  admitted_from TEXT,
  admitted_by TEXT,
  ward_type TEXT,
  ward_name TEXT,
  bed_number TEXT,
  admission_diagnosis TEXT,
  admitting_diagnosis TEXT,
  chief_complaint TEXT,
  indication_for_admission TEXT,
  severity TEXT,
  provisional_diagnosis JSONB,
  comorbidities JSONB,
  allergies JSONB,
  primary_doctor TEXT,
  primary_nurse TEXT,
  consultants JSONB,
  treatment_plan_id TEXT,
  status TEXT DEFAULT 'active',
  estimated_stay_days INTEGER,
  expected_discharge_date TIMESTAMPTZ,
  actual_discharge_date TIMESTAMPTZ,
  discharge_date TIMESTAMPTZ,
  discharge_time TEXT,
  discharge_diagnosis TEXT,
  discharge_summary TEXT,
  discharged_by TEXT,
  discharge_type TEXT,
  discharge_summary_id TEXT,
  admission_type TEXT,
  referral_source TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admission Notes table
CREATE TABLE admission_notes (
  id TEXT PRIMARY KEY,
  admission_id TEXT NOT NULL,
  note_type TEXT,
  content TEXT,
  author_id TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bed Assignments table
CREATE TABLE bed_assignments (
  id TEXT PRIMARY KEY,
  admission_id TEXT NOT NULL,
  ward_name TEXT,
  bed_number TEXT,
  assigned_from TIMESTAMPTZ,
  assigned_to TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TREATMENT TABLES
-- ==========================================

-- Treatment Plans table
CREATE TABLE treatment_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  related_entity_id TEXT,
  related_entity_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  clinical_goals JSONB DEFAULT '[]',
  orders JSONB DEFAULT '[]',
  frequency TEXT,
  start_date TIMESTAMPTZ,
  expected_end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  phase TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treatment Progress table
CREATE TABLE treatment_progress (
  id TEXT PRIMARY KEY,
  treatment_plan_id TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  observations TEXT,
  measurements JSONB,
  orders_executed JSONB DEFAULT '[]',
  outcome_assessment TEXT,
  clinician_notes TEXT,
  photos JSONB,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- WARD ROUND & ASSIGNMENT TABLES
-- ==========================================

-- Ward Rounds table
CREATE TABLE ward_rounds (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  ward_name TEXT,
  round_date DATE,
  round_time TEXT,
  round_type TEXT,
  status TEXT DEFAULT 'scheduled',
  lead_doctor_id TEXT,
  lead_doctor_name TEXT,
  team_members JSONB,
  patients JSONB,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor Assignments table
CREATE TABLE doctor_assignments (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  doctor_specialty TEXT,
  patient_id TEXT,
  patient_name TEXT,
  hospital_number TEXT,
  ward_name TEXT,
  bed_number TEXT,
  assignment_type TEXT,
  priority TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nurse Assignments table
CREATE TABLE nurse_assignments (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  nurse_id TEXT,
  nurse_name TEXT,
  nurse_specialty TEXT,
  patient_id TEXT,
  patient_name TEXT,
  hospital_number TEXT,
  ward_name TEXT,
  bed_number TEXT,
  shift_type TEXT,
  assignment_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  care_level TEXT,
  tasks JSONB,
  notes TEXT,
  assigned_by TEXT,
  handover_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INVESTIGATIONS TABLE
-- ==========================================

-- Investigations table (unified lab/radiology/procedures)
CREATE TABLE investigations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  hospital_number TEXT,
  hospital_id TEXT,
  hospital_name TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  type TEXT NOT NULL,
  type_name TEXT,
  category TEXT,
  name TEXT,
  description TEXT,
  priority TEXT DEFAULT 'routine',
  status TEXT DEFAULT 'requested',
  fasting BOOLEAN,
  clinical_details TEXT,
  clinical_info TEXT,
  requested_by TEXT,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ,
  sample_collected_at TIMESTAMPTZ,
  collected_by TEXT,
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  completed_by_name TEXT,
  reported_by TEXT,
  results JSONB,
  attachments JSONB,
  interpretation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- COMMUNICATION TABLES
-- ==========================================

-- Chat Rooms table
CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL,
  description TEXT,
  hospital_id TEXT,
  patient_id TEXT,
  participants JSONB DEFAULT '[]',
  admins JSONB,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_role TEXT,
  sender_avatar TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  attachments JSONB,
  reply_to TEXT,
  reactions JSONB,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  read_by JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Conferences table
CREATE TABLE video_conferences (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  hospital_id TEXT,
  host_id TEXT,
  host_name TEXT,
  participants JSONB,
  invited_users JSONB,
  patient_id TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  room_code TEXT,
  settings JSONB,
  presentation JSONB,
  recordings JSONB,
  chat_enabled BOOLEAN DEFAULT true,
  chat_messages JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Video Conferences table
CREATE TABLE enhanced_video_conferences (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  title TEXT,
  type TEXT,
  host_id TEXT,
  host_name TEXT,
  hospital_id TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  participants JSONB,
  settings JSONB,
  presentation JSONB,
  recordings JSONB,
  chat JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- DISCHARGE SUMMARIES TABLE (NEW)
-- ==========================================

CREATE TABLE discharge_summaries (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  admission_id TEXT,
  hospital_id TEXT,
  encounter_id TEXT,
  
  -- Dates
  admission_date TIMESTAMPTZ,
  discharge_date TIMESTAMPTZ,
  
  -- Diagnosis
  admitting_diagnosis TEXT,
  final_diagnosis JSONB,
  secondary_diagnoses JSONB,
  comorbidities JSONB,
  
  -- Hospital Course
  hospital_course TEXT,
  procedures_performed JSONB,
  consultations JSONB,
  
  -- Discharge Details
  condition_at_discharge TEXT,
  discharge_disposition TEXT,
  discharge_type TEXT,
  
  -- Medications
  discharge_medications JSONB,
  medications_discontinued JSONB,
  
  -- Instructions
  dietary_instructions TEXT,
  activity_restrictions TEXT,
  wound_care_instructions TEXT,
  warning_signs_to_watch JSONB,
  
  -- Follow-up
  follow_up_appointments JSONB,
  pending_tests JSONB,
  pending_referrals JSONB,
  
  -- Contact Info
  emergency_contact TEXT,
  clinic_contact TEXT,
  
  -- Prepared By
  prepared_by TEXT,
  prepared_by_name TEXT,
  attending_physician TEXT,
  attending_physician_name TEXT,
  
  -- Tracking
  follow_up_tracking JSONB,
  
  -- Status
  status TEXT DEFAULT 'draft',
  exported_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- CONSUMABLE BOM TABLE (NEW)
-- ==========================================

CREATE TABLE consumable_boms (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  
  -- Service Details
  service_type TEXT,
  service_name TEXT,
  procedure_code TEXT,
  
  -- Wound Details (if applicable)
  wound_details JSONB,
  
  -- Items
  consumables JSONB,
  professional_fees JSONB,
  
  -- Totals
  consumables_total DECIMAL,
  professional_fees_total DECIMAL,
  grand_total DECIMAL,
  
  -- Metadata
  performed_by TEXT,
  performed_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Invoice
  invoice_generated BOOLEAN DEFAULT false,
  invoice_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- HISTOPATHOLOGY REQUESTS TABLE (NEW)
-- ==========================================

CREATE TABLE histopathology_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  surgery_id TEXT,
  hospital_id TEXT,
  
  -- Request Info
  request_date TIMESTAMPTZ,
  requested_by TEXT,
  requesting_department TEXT,
  priority TEXT DEFAULT 'routine',
  
  -- Clinical Information (WHO Required)
  clinical_history TEXT,
  clinical_diagnosis TEXT,
  relevant_investigations TEXT,
  previous_biopsies TEXT,
  family_history TEXT,
  risk_factors JSONB,
  
  -- Specimen Details (WHO Required)
  specimen_type TEXT,
  specimen_site TEXT,
  specimen_laterality TEXT,
  specimen_size TEXT,
  specimen_weight TEXT,
  number_of_specimens INTEGER,
  specimen_orientation TEXT,
  
  -- Collection Details
  collection_method TEXT,
  collection_date TIMESTAMPTZ,
  collection_time TEXT,
  collector TEXT,
  
  -- Fixation (WHO Required)
  fixative TEXT,
  fixation_time TEXT,
  
  -- Special Requirements
  special_stains JSONB,
  immunohistochemistry JSONB,
  molecular_studies JSONB,
  electron_microscopy BOOLEAN DEFAULT false,
  frozen_section BOOLEAN DEFAULT false,
  
  -- Operative Findings (if surgical)
  operative_findings TEXT,
  surgical_margins TEXT,
  lymph_nodes_submitted INTEGER,
  
  -- Additional WHO Fields
  tumor_markers JSONB,
  staging_info TEXT,
  treatment_history TEXT,
  radiation_history TEXT,
  chemotherapy_history TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  received_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  
  -- Results
  gross_description TEXT,
  microscopic_description TEXT,
  diagnosis TEXT,
  synoptic_report JSONB,
  stage_classification TEXT,
  grade_classification TEXT,
  margins TEXT,
  
  -- Pathologist
  pathologist TEXT,
  pathologist_signature TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- BLOOD TRANSFUSION TABLE (NEW)
-- ==========================================

CREATE TABLE blood_transfusions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  admission_id TEXT,
  surgery_id TEXT,
  hospital_id TEXT,
  
  -- Request Details
  request_date TIMESTAMPTZ,
  requested_by TEXT,
  indication TEXT,
  urgency TEXT DEFAULT 'routine',
  
  -- Patient Blood Info
  patient_blood_group TEXT,
  patient_rh_factor TEXT,
  patient_antibodies JSONB,
  
  -- Blood Product Details
  product_type TEXT,
  unit_number TEXT,
  donor_blood_group TEXT,
  donor_rh_factor TEXT,
  volume_ml DECIMAL,
  expiry_date TIMESTAMPTZ,
  
  -- Crossmatch
  crossmatch_result TEXT,
  crossmatch_date TIMESTAMPTZ,
  crossmatch_by TEXT,
  
  -- Transfusion Details
  transfusion_start TIMESTAMPTZ,
  transfusion_end TIMESTAMPTZ,
  transfusion_rate DECIMAL,
  administered_by TEXT,
  witnessed_by TEXT,
  
  -- Pre-Transfusion Vitals
  pre_vitals JSONB,
  
  -- During/Post Vitals
  monitoring_vitals JSONB,
  post_vitals JSONB,
  
  -- Reactions
  reaction_occurred BOOLEAN DEFAULT false,
  reaction_type TEXT,
  reaction_time TIMESTAMPTZ,
  reaction_severity TEXT,
  reaction_management TEXT,
  
  -- Outcome
  outcome TEXT,
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'requested',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MDT MEETINGS TABLE (NEW)
-- ==========================================

CREATE TABLE mdt_meetings (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT,
  
  -- Meeting Details
  meeting_date TIMESTAMPTZ,
  meeting_time TEXT,
  meeting_type TEXT,
  location TEXT,
  
  -- Case Presentation
  case_presenter TEXT,
  case_summary TEXT,
  
  -- Attendees
  attendees JSONB,
  specialties_represented JSONB,
  
  -- Clinical Details
  diagnosis TEXT,
  staging JSONB,
  relevant_investigations JSONB,
  imaging_reviewed JSONB,
  pathology_reviewed JSONB,
  
  -- Discussion
  discussion_points JSONB,
  treatment_options JSONB,
  
  -- Recommendations
  mdt_recommendation TEXT,
  treatment_plan TEXT,
  clinical_trial_eligibility BOOLEAN DEFAULT false,
  clinical_trial_details TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  follow_up_actions JSONB,
  
  -- Documentation
  minutes TEXT,
  recorded_by TEXT,
  
  -- Status
  status TEXT DEFAULT 'scheduled',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- LIMB SALVAGE ASSESSMENTS TABLE (NEW)
-- Diabetic Foot Scoring & Decision Support
-- ==========================================

CREATE TABLE limb_salvage_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  
  -- Assessment Date/Time
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  assessed_by TEXT,
  assessed_by_name TEXT,
  
  -- Patient Demographics for Scoring
  patient_age INTEGER,
  patient_gender TEXT,
  
  -- Affected Limb
  affected_side TEXT, -- 'left', 'right', 'bilateral'
  
  -- Wound Classifications (JSONB for complex structures)
  wagner_grade INTEGER, -- 0-5
  texas_classification JSONB, -- {grade: 0-3, stage: A-D}
  wifi_classification JSONB, -- {wound: 0-3, ischemia: 0-3, footInfection: 0-3}
  sinbad_score JSONB, -- {site, ischemia, neuropathy, bacterialInfection, area, depth, total}
  
  -- Wound Details
  wound_location TEXT,
  wound_size JSONB, -- {length, width, depth, area}
  wound_duration INTEGER, -- days
  previous_debridement BOOLEAN DEFAULT false,
  debridement_count INTEGER,
  wound_photos JSONB,
  
  -- Vascular Assessment
  doppler_findings JSONB, -- arterial and venous findings
  angiogram_performed BOOLEAN DEFAULT false,
  angiogram_findings TEXT,
  previous_revascularization BOOLEAN DEFAULT false,
  revascularization_details TEXT,
  
  -- Neuropathy Assessment
  monofilament_test BOOLEAN, -- true = protective sensation absent
  vibration_sense BOOLEAN, -- true = absent
  ankle_reflexes TEXT, -- 'present', 'diminished', 'absent'
  neuropathy_symptoms JSONB,
  
  -- Osteomyelitis Assessment
  osteomyelitis JSONB, -- {suspected, probeToBone, radiographicChanges, mriFindings, boneBiopsy, affectedBones, duration, notes}
  
  -- Sepsis Assessment
  sepsis JSONB, -- {clinicalFeatures, laboratoryFeatures, sirsScore, sepsisSeverity}
  
  -- Renal Status
  renal_status JSONB, -- {creatinine, bun, egfr, ckdStage, onDialysis, dialysisType, dialysisFrequency}
  
  -- Comorbidities
  comorbidities JSONB, -- full comorbidity assessment
  
  -- Nutritional Status
  albumin DECIMAL,
  prealbumin DECIMAL,
  bmi DECIMAL,
  must_score INTEGER,
  
  -- Calculated Scores
  limb_salvage_score JSONB, -- {woundScore, ischemiaScore, infectionScore, renalScore, comorbidityScore, ageScore, nutritionalScore, totalScore, maxScore, percentage, riskCategory, salvageProbability}
  
  -- Decision
  recommended_management TEXT, -- 'conservative', 'revascularization', 'minor_amputation', 'major_amputation'
  recommended_amputation_level TEXT, -- 'none', 'toe_disarticulation', 'ray_amputation', 'transmetatarsal', 'lisfranc', 'chopart', 'syme', 'bka', 'through_knee', 'aka'
  
  -- Generated Recommendations
  recommendations JSONB, -- array of {category, priority, recommendation, rationale, timeframe}
  
  -- Treatment Plan
  treatment_plan TEXT,
  
  -- Progress Monitoring
  follow_up_date TIMESTAMPTZ,
  progress_notes TEXT,
  
  -- Outcome Tracking
  actual_outcome TEXT, -- 'healed', 'improved', 'stable', 'worsened', 'amputated'
  actual_amputation_level TEXT,
  outcome_date TIMESTAMPTZ,
  
  -- Metadata
  status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'reviewed'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- AUDIT & SYNC TABLES
-- ==========================================

-- Audit Logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Status table
CREATE TABLE sync_status (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  error_message TEXT
);

-- ================================================
-- STEP 3: Enable Row Level Security
-- ================================================

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE burn_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ward_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_video_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE histopathology_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_transfusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdt_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE limb_salvage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 4: Create public access policies
-- ================================================

CREATE POLICY "public_access" ON hospitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON vital_signs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON clinical_encounters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON surgeries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON wounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON burn_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON lab_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON nutrition_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON nutrition_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON admissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON admission_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON bed_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON treatment_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON treatment_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON ward_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON doctor_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON nurse_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON investigations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON chat_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON video_conferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON enhanced_video_conferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON discharge_summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON consumable_boms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON histopathology_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON blood_transfusions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON mdt_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON limb_salvage_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON sync_status FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- STEP 5: Create indexes for better performance
-- ================================================

-- Patient indexes
CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(registered_hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_number ON patients(hospital_number);

-- Clinical indexes
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded ON vital_signs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON clinical_encounters(status);

-- Surgery indexes
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);
CREATE INDEX IF NOT EXISTS idx_surgeries_date ON surgeries(scheduled_date);

-- Wound & Burns indexes
CREATE INDEX IF NOT EXISTS idx_wounds_patient ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_burns_patient ON burn_assessments(patient_id);

-- Admission indexes
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_date ON admissions(admission_date);
CREATE INDEX IF NOT EXISTS idx_admission_notes_admission ON admission_notes(admission_id);

-- Treatment indexes
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_progress_plan ON treatment_progress(treatment_plan_id);

-- Lab & Pharmacy indexes
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

-- Investigation indexes
CREATE INDEX IF NOT EXISTS idx_investigations_patient ON investigations(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
CREATE INDEX IF NOT EXISTS idx_investigations_type ON investigations(type);

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_hospital ON chat_rooms(hospital_id);

-- NEW table indexes
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_patient ON discharge_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_admission ON discharge_summaries(admission_id);
CREATE INDEX IF NOT EXISTS idx_consumable_boms_patient ON consumable_boms(patient_id);
CREATE INDEX IF NOT EXISTS idx_histopathology_patient ON histopathology_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_histopathology_status ON histopathology_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_transfusions_patient ON blood_transfusions(patient_id);
CREATE INDEX IF NOT EXISTS idx_mdt_meetings_patient ON mdt_meetings(patient_id);
CREATE INDEX IF NOT EXISTS idx_mdt_meetings_date ON mdt_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_patient ON nutrition_plans(patient_id);

-- Limb Salvage indexes
CREATE INDEX IF NOT EXISTS idx_limb_salvage_patient ON limb_salvage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_status ON limb_salvage_assessments(status);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_date ON limb_salvage_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_limb_salvage_hospital ON limb_salvage_assessments(hospital_id);

-- Ward round indexes
CREATE INDEX IF NOT EXISTS idx_ward_rounds_hospital ON ward_rounds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_date ON ward_rounds(round_date);
CREATE INDEX IF NOT EXISTS idx_doctor_assignments_patient ON doctor_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_patient ON nurse_assignments(patient_id);

-- ================================================
-- STEP 6: Create helpful views
-- ================================================

-- Active Patients View
CREATE OR REPLACE VIEW active_patients AS
SELECT 
  p.*,
  a.admission_number,
  a.ward_name,
  a.bed_number,
  a.admission_date,
  a.primary_doctor,
  a.status as admission_status
FROM patients p
LEFT JOIN admissions a ON p.id = a.patient_id AND a.status = 'active'
WHERE p.is_active = true;

-- Today's Surgeries View
CREATE OR REPLACE VIEW todays_surgeries AS
SELECT 
  s.*,
  p.first_name,
  p.last_name,
  p.hospital_number,
  p.blood_group
FROM surgeries s
JOIN patients p ON s.patient_id = p.id
WHERE DATE(s.scheduled_date) = CURRENT_DATE
ORDER BY s.scheduled_date;

-- Pending Investigations View
CREATE OR REPLACE VIEW pending_investigations AS
SELECT 
  i.*,
  p.first_name AS patient_first_name,
  p.last_name AS patient_last_name
FROM investigations i
JOIN patients p ON i.patient_id = p.id
WHERE i.status IN ('requested', 'collected', 'processing')
ORDER BY 
  CASE i.priority 
    WHEN 'stat' THEN 1 
    WHEN 'urgent' THEN 2 
    ELSE 3 
  END,
  i.requested_at;

-- ================================================
-- Done! All 31 tables created successfully
-- ================================================
-- Tables included:
-- 1.  hospitals
-- 2.  users
-- 3.  patients
-- 4.  vital_signs
-- 5.  clinical_encounters
-- 6.  surgeries
-- 7.  wounds
-- 8.  burn_assessments
-- 9.  lab_requests
-- 10. prescriptions
-- 11. nutrition_assessments
-- 12. nutrition_plans (NEW)
-- 13. invoices
-- 14. admissions
-- 15. admission_notes
-- 16. bed_assignments
-- 17. treatment_plans
-- 18. treatment_progress
-- 19. ward_rounds
-- 20. doctor_assignments
-- 21. nurse_assignments
-- 22. investigations
-- 23. chat_rooms
-- 24. chat_messages
-- 25. video_conferences
-- 26. enhanced_video_conferences
-- 27. discharge_summaries (NEW)
-- 28. consumable_boms (NEW)
-- 29. histopathology_requests (NEW)
-- 30. blood_transfusions (NEW)
-- 31. mdt_meetings (NEW)
-- 32. audit_logs
-- 33. sync_status
-- ================================================
