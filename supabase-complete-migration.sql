-- =====================================================
-- AstroHEALTH Complete Supabase Migration
-- =====================================================
-- This migration creates ALL tables needed for the
-- AstroHEALTH application with proper schemas matching
-- the TypeScript types and IndexedDB structure.
-- 
-- Run this in Supabase SQL Editor to set up the database.
-- =====================================================

-- =====================================================
-- HELPER: Enable required extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE (Core - Authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  password_hash TEXT,
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
  agreement_accepted_at TIMESTAMPTZ,
  agreement_version TEXT,
  agreement_device_info TEXT,
  must_change_password BOOLEAN DEFAULT true,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_code TEXT,
  synced_status INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. HOSPITALS TABLE (Core)
-- =====================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  type TEXT, -- 'primary', 'secondary', 'tertiary'
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
  specialties JSONB, -- string array
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PATIENTS TABLE (Core)
-- =====================================================
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  hospital_number TEXT,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  date_of_birth TIMESTAMPTZ,
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
  next_of_kin JSONB, -- {name, relationship, phone, address}
  allergies JSONB, -- string array
  chronic_conditions JSONB, -- string array
  dvt_risk_assessment JSONB,
  pressure_sore_risk_assessment JSONB,
  comorbidities JSONB,
  photo TEXT,
  registered_hospital_id TEXT,
  care_type TEXT,
  hospital_id TEXT,
  hospital_name TEXT,
  ward TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. VITAL SIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vital_signs (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  temperature DECIMAL,
  pulse INTEGER,
  respiratory_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  oxygen_saturation DECIMAL,
  weight DECIMAL,
  height DECIMAL,
  bmi DECIMAL,
  pain_score INTEGER,
  blood_glucose DECIMAL,
  notes TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CLINICAL ENCOUNTERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clinical_encounters (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  type TEXT,
  status TEXT,
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  past_surgical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  physical_examination JSONB,
  diagnosis JSONB, -- array of diagnosis objects
  treatment_plan TEXT,
  notes TEXT,
  attending_clinician TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SURGERIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS surgeries (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  procedure_name TEXT,
  procedure_code TEXT,
  type TEXT, -- 'elective', 'emergency'
  category TEXT, -- 'minor', 'major'
  pre_operative_assessment JSONB,
  scheduled_date TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  status TEXT,
  surgeon TEXT,
  surgeon_id TEXT,
  surgeon_fee DECIMAL,
  assistant TEXT,
  assistant_id TEXT,
  assistant_fee_percentage DECIMAL,
  assistant_fee DECIMAL,
  anaesthetist TEXT,
  anaesthetist_id TEXT,
  scrub_nurse TEXT,
  scrub_nurse_id TEXT,
  circulating_nurse TEXT,
  circulating_nurse_id TEXT,
  anaesthesia_type TEXT,
  anaesthesia_fee DECIMAL,
  operative_notes TEXT,
  complications TEXT,
  blood_loss INTEGER,
  specimen_sent BOOLEAN,
  specimen_type TEXT,
  post_operative_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. WOUNDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS wounds (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  location TEXT,
  type TEXT,
  etiology TEXT,
  length DECIMAL,
  width DECIMAL,
  depth DECIMAL,
  area DECIMAL,
  tissue_type JSONB, -- array
  exudate_amount TEXT,
  exudate_type TEXT,
  odor BOOLEAN,
  peri_wound_condition TEXT,
  pain_level INTEGER,
  photos JSONB, -- array of WoundPhoto
  healing_progress TEXT,
  dressing_type TEXT,
  dressing_frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. BURN ASSESSMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS burn_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  burn_type TEXT,
  mechanism TEXT,
  time_of_injury TIMESTAMPTZ,
  tbsa_percentage DECIMAL,
  burn_depth JSONB, -- array
  affected_areas JSONB, -- array of BurnArea
  parkland_formula JSONB,
  absi_score JSONB,
  inhalation_injury BOOLEAN,
  associated_injuries TEXT,
  tetanus_status BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. LAB REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  hospital_id TEXT,
  tests JSONB, -- array of LabTest
  priority TEXT,
  clinical_info TEXT,
  status TEXT,
  requested_by TEXT,
  requested_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. PRESCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  hospital_id TEXT,
  medications JSONB, -- array of Medication
  status TEXT,
  prescribed_by TEXT,
  prescribed_at TIMESTAMPTZ,
  dispensed_by TEXT,
  dispensed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. NUTRITION ASSESSMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS nutrition_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  hospital_id TEXT,
  weight DECIMAL,
  height DECIMAL,
  must_score JSONB,
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
  notes TEXT,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. NUTRITION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  weight DECIMAL,
  height DECIMAL,
  bmi DECIMAL,
  activity_level TEXT,
  clinical_condition TEXT,
  stress_factor DECIMAL,
  bmr DECIMAL,
  tdee DECIMAL,
  calorie_target DECIMAL,
  protein_target DECIMAL,
  carbs_target DECIMAL,
  fat_target DECIMAL,
  fiber_target DECIMAL,
  fluid_target DECIMAL,
  meal_frequency INTEGER,
  snacks_per_day INTEGER,
  dietary_restrictions JSONB,
  food_allergies JSONB,
  food_preferences JSONB,
  meal_plans JSONB,
  weekly_menu JSONB,
  enteral_feeding BOOLEAN,
  enteral_formula TEXT,
  enteral_rate DECIMAL,
  parenteral_nutrition BOOLEAN,
  parenteral_details JSONB,
  supplements JSONB,
  monitoring_parameters JSONB,
  weight_goals JSONB,
  plan_type TEXT,
  status TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  patient_id TEXT,
  hospital_id TEXT,
  encounter_id TEXT,
  items JSONB, -- array of InvoiceItem
  subtotal DECIMAL,
  discount DECIMAL,
  tax DECIMAL,
  total DECIMAL,
  total_amount DECIMAL,
  amount_paid DECIMAL,
  paid_amount DECIMAL,
  balance DECIMAL,
  status TEXT,
  payment_method TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. ADMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admissions (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  encounter_id TEXT,
  admission_number TEXT,
  admission_date TIMESTAMPTZ,
  admission_time TEXT,
  admitted_from TEXT,
  admitted_by TEXT,
  ward_type TEXT,
  ward_name TEXT,
  bed_number TEXT,
  admission_diagnosis TEXT,
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
  risk_assessments JSONB,
  status TEXT,
  estimated_stay_days INTEGER,
  discharge_date TIMESTAMPTZ,
  discharge_time TEXT,
  discharged_by TEXT,
  discharge_type TEXT,
  discharge_summary_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 15. ADMISSION NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admission_notes (
  id TEXT PRIMARY KEY,
  admission_id TEXT,
  note_type TEXT,
  content TEXT,
  author_id TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 16. BED ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bed_assignments (
  id TEXT PRIMARY KEY,
  admission_id TEXT,
  ward_name TEXT,
  bed_number TEXT,
  assigned_from TIMESTAMPTZ,
  assigned_to TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. TREATMENT PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS treatment_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  related_entity_id TEXT,
  related_entity_type TEXT,
  title TEXT,
  description TEXT,
  clinical_goals JSONB, -- array of TreatmentGoal
  orders JSONB, -- array of TreatmentOrder
  frequency TEXT,
  start_date TIMESTAMPTZ,
  expected_end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  status TEXT,
  phase TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 18. TREATMENT PROGRESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS treatment_progress (
  id TEXT PRIMARY KEY,
  treatment_plan_id TEXT,
  date TIMESTAMPTZ,
  observations TEXT,
  measurements JSONB,
  orders_executed JSONB,
  outcome_assessment TEXT,
  clinician_notes TEXT,
  photos JSONB,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 19. WARD ROUNDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ward_rounds (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  ward_name TEXT,
  round_date TIMESTAMPTZ,
  round_time TEXT,
  round_type TEXT,
  status TEXT,
  lead_doctor_id TEXT,
  lead_doctor_name TEXT,
  lead_doctor_designation TEXT,
  team_members JSONB,
  patients JSONB, -- array of WardRoundPatient
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. DOCTOR ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS doctor_assignments (
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
  status TEXT,
  notes TEXT,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 21. NURSE ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS nurse_assignments (
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
  status TEXT,
  care_level TEXT,
  tasks JSONB,
  notes TEXT,
  assigned_by TEXT,
  handover_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 22. INVESTIGATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  hospital_number TEXT,
  hospital_id TEXT,
  hospital_name TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  type TEXT,
  type_name TEXT,
  category TEXT,
  name TEXT,
  description TEXT,
  priority TEXT,
  status TEXT,
  fasting BOOLEAN,
  clinical_details TEXT,
  clinical_info TEXT,
  requested_by TEXT,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ,
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

-- =====================================================
-- 23. CHAT ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  description TEXT,
  hospital_id TEXT,
  participants JSONB,
  admins JSONB,
  patient_id TEXT,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 24. CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  sender_id TEXT,
  sender_name TEXT,
  sender_role TEXT,
  sender_avatar TEXT,
  content TEXT,
  type TEXT,
  attachments JSONB,
  reply_to TEXT,
  reactions JSONB,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  read_by JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 25. VIDEO CONFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS video_conferences (
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
  status TEXT,
  room_code TEXT,
  settings JSONB,
  presentation JSONB,
  recordings JSONB,
  chat_enabled BOOLEAN DEFAULT true,
  chat_messages JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 26. ENHANCED VIDEO CONFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS enhanced_video_conferences (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  title TEXT,
  type TEXT,
  host_id TEXT,
  host_name TEXT,
  hospital_id TEXT,
  status TEXT,
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

-- =====================================================
-- 27. DISCHARGE SUMMARIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS discharge_summaries (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  admission_date TIMESTAMPTZ,
  discharge_date TIMESTAMPTZ,
  discharge_time TEXT,
  discharge_type TEXT,
  discharged_by TEXT,
  admitting_diagnosis TEXT,
  primary_diagnosis TEXT,
  final_diagnosis JSONB,
  secondary_diagnoses JSONB,
  comorbidities JSONB,
  hospital_course TEXT,
  procedures_performed JSONB,
  consultations JSONB,
  condition_at_discharge TEXT,
  vital_signs_at_discharge JSONB,
  functional_status TEXT,
  discharge_disposition TEXT,
  discharge_medications JSONB,
  take_home_medications JSONB,
  medications_discontinued JSONB,
  dietary_instructions TEXT,
  dietary_recommendations JSONB,
  activity_restrictions JSONB,
  wound_care_instructions TEXT,
  warning_signs_to_watch JSONB,
  take_home_instructions JSONB,
  lifestyle_modifications JSONB,
  follow_up_appointments JSONB,
  referrals JSONB,
  pending_tests JSONB,
  pending_referrals JSONB,
  emergency_contact TEXT,
  clinic_contact TEXT,
  prepared_by TEXT,
  prepared_by_name TEXT,
  attending_physician TEXT,
  attending_physician_name TEXT,
  doctor_signature TEXT,
  patient_acknowledgement BOOLEAN,
  patient_signature TEXT,
  patient_signature_date TIMESTAMPTZ,
  meal_plan JSONB,
  recovery_plan JSONB,
  follow_up_tracking JSONB,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 28. CONSUMABLE BOMs TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS consumable_boms (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  service_type TEXT,
  service_name TEXT,
  procedure_code TEXT,
  wound_details JSONB,
  consumables JSONB,
  professional_fees JSONB,
  consumables_total DECIMAL,
  professional_fees_total DECIMAL,
  grand_total DECIMAL,
  performed_by TEXT,
  performed_at TIMESTAMPTZ,
  notes TEXT,
  invoice_generated BOOLEAN DEFAULT false,
  invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 29. HISTOPATHOLOGY REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS histopathology_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  surgery_id TEXT,
  request_date TIMESTAMPTZ,
  requested_by TEXT,
  requesting_department TEXT,
  priority TEXT,
  clinical_history TEXT,
  clinical_diagnosis TEXT,
  relevant_investigations TEXT,
  previous_biopsies TEXT,
  family_history TEXT,
  risk_factors JSONB,
  specimen_type TEXT,
  specimen_site TEXT,
  specimen_laterality TEXT,
  specimen_size TEXT,
  specimen_weight TEXT,
  number_of_specimens INTEGER,
  specimen_orientation TEXT,
  collection_method TEXT,
  collection_date TIMESTAMPTZ,
  collection_time TEXT,
  collector TEXT,
  fixative TEXT,
  fixation_time TEXT,
  special_stains JSONB,
  immunohistochemistry JSONB,
  molecular_studies JSONB,
  electron_microscopy BOOLEAN,
  frozen_section BOOLEAN,
  operative_findings TEXT,
  surgical_margins TEXT,
  lymph_nodes_submitted INTEGER,
  tumor_markers JSONB,
  staging_info TEXT,
  treatment_history TEXT,
  radiation_history TEXT,
  chemotherapy_history TEXT,
  status TEXT,
  received_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  gross_description TEXT,
  microscopic_description TEXT,
  diagnosis TEXT,
  synoptic_report JSONB,
  stage_classification TEXT,
  grade_classification TEXT,
  margins TEXT,
  pathologist TEXT,
  pathologist_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 30. BLOOD TRANSFUSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS blood_transfusions (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  surgery_id TEXT,
  hospital_id TEXT,
  request_date TIMESTAMPTZ,
  requested_by TEXT,
  indication TEXT,
  urgency TEXT,
  patient_blood_group TEXT,
  patient_rh_factor TEXT,
  patient_antibodies JSONB,
  product_type TEXT,
  unit_number TEXT,
  donor_blood_group TEXT,
  donor_rh_factor TEXT,
  volume_ml INTEGER,
  expiry_date TIMESTAMPTZ,
  crossmatch_result TEXT,
  crossmatch_date TIMESTAMPTZ,
  crossmatch_by TEXT,
  transfusion_start TIMESTAMPTZ,
  transfusion_end TIMESTAMPTZ,
  transfusion_rate INTEGER,
  administered_by TEXT,
  witnessed_by TEXT,
  pre_vitals JSONB,
  monitoring_vitals JSONB,
  post_vitals JSONB,
  reaction_occurred BOOLEAN DEFAULT false,
  reaction_type TEXT,
  reaction_time TIMESTAMPTZ,
  reaction_severity TEXT,
  reaction_management TEXT,
  outcome TEXT,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 31. MDT MEETINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mdt_meetings (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  meeting_date TIMESTAMPTZ,
  meeting_time TEXT,
  meeting_type TEXT,
  location TEXT,
  case_presenter TEXT,
  case_summary TEXT,
  attendees JSONB,
  specialties_represented JSONB,
  diagnosis TEXT,
  staging JSONB,
  relevant_investigations JSONB,
  imaging_reviewed JSONB,
  pathology_reviewed JSONB,
  discussion_points JSONB,
  treatment_options JSONB,
  mdt_recommendation TEXT,
  treatment_plan TEXT,
  clinical_trial_eligibility BOOLEAN,
  clinical_trial_details TEXT,
  follow_up_required BOOLEAN,
  follow_up_date TIMESTAMPTZ,
  follow_up_actions JSONB,
  minutes TEXT,
  recorded_by TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 32. LIMB SALVAGE ASSESSMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS limb_salvage_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  hospital_id TEXT,
  assessment_date TIMESTAMPTZ,
  assessed_by TEXT,
  assessor_name TEXT,
  limb TEXT,
  wagner_grade INTEGER,
  texas_classification JSONB,
  wifi_classification JSONB,
  abi_value DECIMAL,
  toe_pressure DECIMAL,
  tcpo2 DECIMAL,
  ulcer_details JSONB,
  infection_severity TEXT,
  osteomyelitis_suspected BOOLEAN,
  vascular_status JSONB,
  neuropathy_status JSONB,
  comorbidities JSONB,
  risk_factors JSONB,
  treatment_plan JSONB,
  prognosis TEXT,
  amputation_risk TEXT,
  follow_up_date TIMESTAMPTZ,
  photos JSONB,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 33. BURN MONITORING RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS burn_monitoring_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  burn_assessment_id TEXT,
  admission_id TEXT,
  recorded_at TIMESTAMPTZ,
  recorded_by TEXT,
  vital_signs JSONB,
  fluid_input JSONB,
  fluid_output JSONB,
  fluid_balance DECIMAL,
  pain_score INTEGER,
  wound_status JSONB,
  dressing_changes JSONB,
  complications JSONB,
  interventions JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 34. ESCHAROTOMY RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS escharotomy_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  burn_assessment_id TEXT,
  performed_at TIMESTAMPTZ,
  performed_by TEXT,
  indication TEXT,
  site TEXT,
  incision_details JSONB,
  findings TEXT,
  complications TEXT,
  post_procedure_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 35. SKIN GRAFT RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skin_graft_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  burn_assessment_id TEXT,
  surgery_id TEXT,
  performed_at TIMESTAMPTZ,
  performed_by TEXT,
  graft_type TEXT,
  donor_site TEXT,
  recipient_site TEXT,
  graft_size DECIMAL,
  meshing_ratio TEXT,
  technique TEXT,
  dressing_type TEXT,
  post_op_care JSONB,
  complications TEXT,
  graft_take_percentage DECIMAL,
  follow_up JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 36. BURN CARE PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS burn_care_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  burn_assessment_id TEXT,
  admission_id TEXT,
  plan_date TIMESTAMPTZ,
  created_by TEXT,
  fluid_resuscitation JSONB,
  wound_care_protocol JSONB,
  pain_management JSONB,
  nutrition_plan JSONB,
  physiotherapy JSONB,
  psychological_support JSONB,
  infection_control JSONB,
  surgical_plan JSONB,
  discharge_criteria JSONB,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 37. APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  appointment_number TEXT,
  patient_id TEXT,
  patient_name TEXT,
  hospital_id TEXT,
  hospital_name TEXT,
  appointment_date TIMESTAMPTZ,
  appointment_time TEXT,
  end_time TEXT,
  type TEXT,
  status TEXT,
  priority TEXT,
  clinician_id TEXT,
  clinician_name TEXT,
  department TEXT,
  location TEXT,
  reason TEXT,
  notes TEXT,
  pre_appointment_instructions TEXT,
  booked_by TEXT,
  booked_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  rescheduled_from TEXT,
  follow_up_for TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 38. APPOINTMENT REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  hospital_id TEXT,
  channel TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT,
  sent_at TIMESTAMPTZ,
  message TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 39. APPOINTMENT SLOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS appointment_slots (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  clinician_id TEXT,
  clinician_name TEXT,
  day_of_week INTEGER,
  start_time TEXT,
  end_time TEXT,
  slot_duration INTEGER,
  max_patients INTEGER,
  department TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 40. CLINIC SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clinic_sessions (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  clinician_id TEXT,
  clinician_name TEXT,
  session_date TIMESTAMPTZ,
  start_time TEXT,
  end_time TEXT,
  department TEXT,
  location TEXT,
  max_patients INTEGER,
  booked_count INTEGER DEFAULT 0,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 41. NPWT SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS npwt_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  wound_type TEXT,
  wound_location TEXT,
  wound_size JSONB,
  cycle_type TEXT,
  cycle_number INTEGER,
  session_date TIMESTAMPTZ,
  next_change_date TIMESTAMPTZ,
  pressure_settings JSONB,
  dressing_type TEXT,
  performed_by TEXT,
  notes TEXT,
  status TEXT,
  complications TEXT,
  photos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 42. NPWT NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS npwt_notifications (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  patient_id TEXT,
  notification_type TEXT,
  scheduled_time TIMESTAMPTZ,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 43. MEDICATION CHARTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS medication_charts (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  admission_id TEXT,
  chart_date TIMESTAMPTZ,
  shift_type TEXT,
  assigned_nurse_id TEXT,
  assigned_nurse_name TEXT,
  medications JSONB,
  administrations JSONB,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 44. NURSE PATIENT ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS nurse_patient_assignments (
  id TEXT PRIMARY KEY,
  nurse_id TEXT,
  nurse_name TEXT,
  hospital_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  shift_date TIMESTAMPTZ,
  shift_type TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 45. TRANSFUSION ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transfusion_orders (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  hospital_id TEXT,
  order_id TEXT,
  request_id TEXT,
  product_type TEXT,
  units_ordered INTEGER,
  indication TEXT,
  urgency TEXT,
  special_requirements JSONB,
  status TEXT,
  order_date TIMESTAMPTZ,
  ordered_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 46. TRANSFUSION MONITORING CHARTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transfusion_monitoring_charts (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  transfusion_order_id TEXT,
  chart_date TIMESTAMPTZ,
  status TEXT,
  uploaded_chart_url TEXT,
  ocr_text TEXT,
  parsed_data JSONB,
  vitals JSONB,
  reactions JSONB,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 47. STAFF PATIENT ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_patient_assignments (
  id TEXT PRIMARY KEY,
  admission_id TEXT,
  patient_id TEXT,
  staff_id TEXT,
  staff_name TEXT,
  staff_role TEXT,
  assignment_type TEXT,
  is_active BOOLEAN DEFAULT true,
  hospital_id TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 48. ACTIVITY BILLING RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_billing_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  admission_id TEXT,
  performed_by TEXT,
  performed_by_name TEXT,
  performed_by_role TEXT,
  category TEXT,
  activity_type TEXT,
  description TEXT,
  quantity INTEGER,
  unit_price DECIMAL,
  total_amount DECIMAL,
  payment_status TEXT,
  invoice_id TEXT,
  hospital_id TEXT,
  performed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 49. PAYROLL PERIODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_periods (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  period_name TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT,
  total_earnings DECIMAL,
  total_deductions DECIMAL,
  net_payable DECIMAL,
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 50. STAFF PAYROLL RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_payroll_records (
  id TEXT PRIMARY KEY,
  payroll_period_id TEXT,
  staff_id TEXT,
  staff_name TEXT,
  staff_role TEXT,
  hospital_id TEXT,
  base_salary DECIMAL,
  activity_earnings DECIMAL,
  bonuses DECIMAL,
  deductions DECIMAL,
  tax DECIMAL,
  net_pay DECIMAL,
  payment_status TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 51. PAYSLIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  staff_name TEXT,
  staff_role TEXT,
  hospital_id TEXT,
  period_id TEXT,
  period_name TEXT,
  gross_earnings DECIMAL,
  deductions DECIMAL,
  net_pay DECIMAL,
  breakdown JSONB,
  payment_status TEXT,
  generated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 52. POST-OPERATIVE NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_operative_notes (
  id TEXT PRIMARY KEY,
  surgery_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  hospital_id TEXT,
  admission_id TEXT,
  procedure_name TEXT,
  procedure_date TIMESTAMPTZ,
  surgeon_id TEXT,
  surgeon_name TEXT,
  assistant_surgeon TEXT,
  anaesthetist TEXT,
  scrub_nurse TEXT,
  circulating_nurse TEXT,
  pre_op_diagnosis TEXT,
  post_op_diagnosis TEXT,
  procedure_details TEXT,
  operative_findings TEXT,
  specimens JSONB,
  estimated_blood_loss INTEGER,
  complications TEXT,
  implants_used JSONB,
  drains JSONB,
  closure_details TEXT,
  post_op_instructions TEXT,
  post_op_medications JSONB,
  follow_up_plan TEXT,
  status TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 53. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 54. SYNC STATUS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_status (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT,
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Hospitals indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_hospital_number ON patients(hospital_number);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(registered_hospital_id);

-- Clinical indexes
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);
CREATE INDEX IF NOT EXISTS idx_wounds_patient ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_burns_patient ON burn_assessments(patient_id);

-- Lab & Pharmacy indexes
CREATE INDEX IF NOT EXISTS idx_lab_patient ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

-- Admission indexes
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_hospital ON admissions(hospital_id);

-- Investigation indexes
CREATE INDEX IF NOT EXISTS idx_investigations_patient ON investigations(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician ON appointments(clinician_id);

-- Updated_at indexes for sync
CREATE INDEX IF NOT EXISTS idx_users_updated ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_hospitals_updated ON hospitals(updated_at);
CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients(updated_at);
CREATE INDEX IF NOT EXISTS idx_admissions_updated ON admissions(updated_at);
CREATE INDEX IF NOT EXISTS idx_surgeries_updated ON surgeries(updated_at);


-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE burn_monitoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE escharotomy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_graft_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE burn_care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npwt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npwt_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfusion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfusion_monitoring_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_operative_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- CREATE PERMISSIVE POLICIES (Development Mode)
-- For production, restrict these based on user roles
-- =====================================================

-- Create a function to generate policies for a table
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users', 'hospitals', 'patients', 'vital_signs', 'clinical_encounters',
    'surgeries', 'wounds', 'burn_assessments', 'lab_requests', 'prescriptions',
    'nutrition_assessments', 'nutrition_plans', 'invoices', 'admissions',
    'admission_notes', 'bed_assignments', 'treatment_plans', 'treatment_progress',
    'ward_rounds', 'doctor_assignments', 'nurse_assignments', 'investigations',
    'chat_rooms', 'chat_messages', 'video_conferences', 'enhanced_video_conferences',
    'discharge_summaries', 'consumable_boms', 'histopathology_requests',
    'blood_transfusions', 'mdt_meetings', 'limb_salvage_assessments',
    'burn_monitoring_records', 'escharotomy_records', 'skin_graft_records',
    'burn_care_plans', 'appointments', 'appointment_reminders', 'appointment_slots',
    'clinic_sessions', 'npwt_sessions', 'npwt_notifications', 'medication_charts',
    'nurse_patient_assignments', 'transfusion_orders', 'transfusion_monitoring_charts',
    'staff_patient_assignments', 'activity_billing_records', 'payroll_periods',
    'staff_payroll_records', 'payslips', 'post_operative_notes', 'audit_logs', 'sync_status'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', tbl, tbl);
    
    -- Create permissive policies (for development)
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE USING (true)', tbl, tbl);
  END LOOP;
END $$;


-- =====================================================
-- ENABLE REALTIME FOR KEY TABLES
-- =====================================================

DO $$
DECLARE
  tbl TEXT;
  realtime_tables TEXT[] := ARRAY[
    'users', 'hospitals', 'patients', 'vital_signs', 'surgeries',
    'admissions', 'appointments', 'chat_messages', 'investigations'
  ];
BEGIN
  FOREACH tbl IN ARRAY realtime_tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, ignore
      NULL;
    END;
  END LOOP;
END $$;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify setup:

-- 1. Count all tables:
-- SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

-- 2. List all tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 3. Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- 4. Check policies exist:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- 5. Check realtime publication:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';


-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Total tables created: 54
-- 
-- Core tables: users, hospitals, patients
-- Clinical: vital_signs, clinical_encounters, surgeries, wounds, burn_assessments
-- Lab/Pharmacy: lab_requests, prescriptions
-- Nutrition: nutrition_assessments, nutrition_plans
-- Billing: invoices, activity_billing_records, payroll_periods, staff_payroll_records, payslips
-- Admissions: admissions, admission_notes, bed_assignments
-- Treatment: treatment_plans, treatment_progress
-- Ward: ward_rounds, doctor_assignments, nurse_assignments
-- Investigations: investigations
-- Communication: chat_rooms, chat_messages, video_conferences, enhanced_video_conferences
-- Discharge: discharge_summaries, consumable_boms, histopathology_requests
-- Specialty: blood_transfusions, mdt_meetings, limb_salvage_assessments
-- Burns: burn_monitoring_records, escharotomy_records, skin_graft_records, burn_care_plans
-- Appointments: appointments, appointment_reminders, appointment_slots, clinic_sessions
-- NPWT: npwt_sessions, npwt_notifications
-- Medication: medication_charts, nurse_patient_assignments
-- Transfusion: transfusion_orders, transfusion_monitoring_charts
-- Staff: staff_patient_assignments
-- Post-op: post_operative_notes
-- System: audit_logs, sync_status
