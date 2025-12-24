-- CareBridge Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  phone TEXT,
  specialization TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  has_accepted_agreement BOOLEAN DEFAULT false,
  must_change_password BOOLEAN DEFAULT true,
  agreement_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  genotype TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  occupation TEXT,
  marital_status TEXT,
  religion TEXT,
  nationality TEXT DEFAULT 'Nigerian',
  registered_hospital_id UUID REFERENCES hospitals(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vital Signs table
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  encounter_id UUID,
  temperature DECIMAL,
  pulse INTEGER,
  respiratory_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  spo2 INTEGER,
  weight DECIMAL,
  height DECIMAL,
  bmi DECIMAL,
  pain_score INTEGER,
  blood_sugar DECIMAL,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Encounters table
CREATE TABLE IF NOT EXISTS clinical_encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
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
  attending_clinician UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Surgeries table
CREATE TABLE IF NOT EXISTS surgeries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  procedure_name TEXT NOT NULL,
  procedure_code TEXT,
  category TEXT,
  scheduled_date TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'planned',
  priority TEXT DEFAULT 'elective',
  surgeon UUID REFERENCES users(id),
  assistant_surgeon UUID,
  anaesthetist UUID,
  scrub_nurse UUID,
  anaesthesia_type TEXT,
  pre_operative_diagnosis TEXT,
  post_operative_diagnosis TEXT,
  operative_findings TEXT,
  operative_procedure TEXT,
  estimated_blood_loss TEXT,
  specimens TEXT,
  drains TEXT,
  post_operative_orders TEXT,
  complications TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wounds table
CREATE TABLE IF NOT EXISTS wounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  encounter_id UUID,
  type TEXT NOT NULL,
  location TEXT,
  length DECIMAL,
  width DECIMAL,
  depth DECIMAL,
  wound_bed TEXT,
  exudate_type TEXT,
  exudate_amount TEXT,
  periwound_skin TEXT,
  pain_level INTEGER,
  infection_signs JSONB,
  photo_urls JSONB,
  treatment TEXT,
  dressing_type TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Burn Assessments table
CREATE TABLE IF NOT EXISTS burn_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  encounter_id UUID,
  tbsa DECIMAL,
  burn_depth JSONB,
  affected_areas JSONB,
  mechanism TEXT,
  inhalation_injury BOOLEAN DEFAULT false,
  fluid_requirement DECIMAL,
  urine_output_target DECIMAL,
  escharotomy_needed BOOLEAN DEFAULT false,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Requests table
CREATE TABLE IF NOT EXISTS lab_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  encounter_id UUID,
  hospital_id UUID REFERENCES hospitals(id),
  tests JSONB,
  priority TEXT DEFAULT 'routine',
  clinical_info TEXT,
  status TEXT DEFAULT 'pending',
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  encounter_id UUID,
  hospital_id UUID REFERENCES hospitals(id),
  medications JSONB,
  diagnosis TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  prescribed_by UUID REFERENCES users(id),
  prescribed_at TIMESTAMPTZ DEFAULT NOW(),
  dispensed_at TIMESTAMPTZ,
  dispensed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition Assessments table
CREATE TABLE IF NOT EXISTS nutrition_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  must_score INTEGER,
  must_risk TEXT,
  bmi DECIMAL,
  weight_loss_percentage DECIMAL,
  appetite TEXT,
  dietary_restrictions JSONB,
  supplements JSONB,
  meal_plan JSONB,
  notes TEXT,
  assessed_by UUID REFERENCES users(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  items JSONB,
  subtotal DECIMAL,
  discount DECIMAL DEFAULT 0,
  tax DECIMAL DEFAULT 0,
  total DECIMAL,
  amount_paid DECIMAL DEFAULT 0,
  balance DECIMAL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admissions table
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_number TEXT UNIQUE,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  ward_type TEXT,
  ward_name TEXT,
  bed_number TEXT,
  admission_date TIMESTAMPTZ DEFAULT NOW(),
  expected_discharge_date TIMESTAMPTZ,
  actual_discharge_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  admitting_diagnosis TEXT,
  discharge_diagnosis TEXT,
  discharge_summary TEXT,
  primary_doctor UUID REFERENCES users(id),
  primary_nurse UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treatment Plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  related_entity_id UUID,
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treatment Progress table
CREATE TABLE IF NOT EXISTS treatment_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID REFERENCES treatment_plans(id) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  observations TEXT,
  measurements JSONB,
  orders_executed JSONB DEFAULT '[]',
  outcome_assessment TEXT,
  clinician_notes TEXT,
  photos JSONB,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ward Rounds table
CREATE TABLE IF NOT EXISTS ward_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  ward_name TEXT,
  round_date DATE,
  round_type TEXT,
  status TEXT DEFAULT 'scheduled',
  lead_doctor_id UUID REFERENCES users(id),
  participants JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investigations table
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  type TEXT NOT NULL,
  category TEXT,
  name TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'routine',
  clinical_info TEXT,
  results JSONB,
  interpretation TEXT,
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  name TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  patient_id UUID,
  participants JSONB DEFAULT '[]',
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) NOT NULL,
  sender_id UUID REFERENCES users(id) NOT NULL,
  type TEXT DEFAULT 'text',
  content TEXT,
  attachments JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
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
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ward_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
-- In production, you should create more restrictive policies based on user roles
-- Using 'anon' role for unauthenticated access via anon key

CREATE POLICY "Allow public read access" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON hospitals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON hospitals FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON users FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON patients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON patients FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON vital_signs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON vital_signs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON vital_signs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON vital_signs FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON clinical_encounters FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON clinical_encounters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON clinical_encounters FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON clinical_encounters FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON surgeries FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON surgeries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON surgeries FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON surgeries FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON wounds FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON wounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON wounds FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON wounds FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON burn_assessments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON burn_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON burn_assessments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON burn_assessments FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON lab_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON lab_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON lab_requests FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON lab_requests FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON prescriptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON prescriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON prescriptions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON prescriptions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON nutrition_assessments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON nutrition_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON nutrition_assessments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON nutrition_assessments FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON invoices FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON invoices FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON admissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON admissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON admissions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON admissions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON treatment_plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON treatment_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON treatment_plans FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON treatment_plans FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON treatment_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON treatment_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON treatment_progress FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON treatment_progress FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON ward_rounds FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON ward_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON ward_rounds FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON ward_rounds FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON investigations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON investigations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON investigations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON investigations FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON chat_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON chat_rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON chat_rooms FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON chat_messages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON chat_messages FOR DELETE USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(registered_hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);
CREATE INDEX IF NOT EXISTS idx_wounds_patient ON wounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
