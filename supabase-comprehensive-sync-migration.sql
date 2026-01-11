-- ============================================
-- CareBridge Comprehensive Sync Migration
-- ============================================
-- This migration adds all missing tables required for
-- complete 2-way cross-device synchronization
-- 
-- Run this in Supabase SQL Editor to add the following tables:
-- 1. staff_patient_assignments
-- 2. activity_billing_records
-- 3. payroll_periods
-- 4. staff_payroll_records
-- 5. payslips
-- 6. post_operative_notes
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. STAFF PATIENT ASSIGNMENTS TABLE
-- ============================================
-- Tracks which staff (doctors, nurses) are assigned to patients
CREATE TABLE IF NOT EXISTS staff_patient_assignments (
    id TEXT PRIMARY KEY,
    admission_id TEXT REFERENCES admissions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    hospital_number TEXT NOT NULL,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Assigned Staff
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_role TEXT NOT NULL,
    
    -- Assignment Details
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('primary', 'secondary', 'consultant', 'nurse', 'on_call')),
    assigned_by TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    relieved_at TIMESTAMPTZ,
    relieved_by TEXT,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for staff_patient_assignments
CREATE INDEX IF NOT EXISTS idx_staff_patient_assignments_patient ON staff_patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_staff_patient_assignments_staff ON staff_patient_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_patient_assignments_hospital ON staff_patient_assignments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_patient_assignments_admission ON staff_patient_assignments(admission_id);
CREATE INDEX IF NOT EXISTS idx_staff_patient_assignments_active ON staff_patient_assignments(is_active);

-- ============================================
-- 2. ACTIVITY BILLING RECORDS TABLE
-- ============================================
-- Tracks individual billable activities with 50/50 revenue sharing
CREATE TABLE IF NOT EXISTS activity_billing_records (
    id TEXT PRIMARY KEY,
    
    -- Activity Details
    activity_id TEXT NOT NULL,
    activity_code TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    category TEXT NOT NULL,
    
    -- Patient Info
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    hospital_number TEXT NOT NULL,
    
    -- Related Records
    encounter_id TEXT,
    admission_id TEXT,
    ward_round_id TEXT,
    lab_request_id TEXT,
    prescription_id TEXT,
    wound_care_id TEXT,
    
    -- Staff who performed the activity
    performed_by TEXT NOT NULL,
    performed_by_name TEXT NOT NULL,
    performed_by_role TEXT NOT NULL,
    
    -- Billing Details (50/50 split)
    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    staff_share DECIMAL(10,2) NOT NULL DEFAULT 0,
    hospital_share DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Payment Status
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'waived')),
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    staff_amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    hospital_amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Linked to Invoice
    invoice_id TEXT,
    invoice_item_id TEXT,
    
    -- Timestamps
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    
    notes TEXT,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for activity_billing_records
CREATE INDEX IF NOT EXISTS idx_activity_billing_patient ON activity_billing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_activity_billing_staff ON activity_billing_records(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_billing_hospital ON activity_billing_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_activity_billing_invoice ON activity_billing_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_activity_billing_status ON activity_billing_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_activity_billing_performed_at ON activity_billing_records(performed_at);

-- ============================================
-- 3. PAYROLL PERIODS TABLE
-- ============================================
-- Manages payroll periods (monthly/weekly) for staff payments
CREATE TABLE IF NOT EXISTS payroll_periods (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Period Details
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed', 'paid')),
    
    -- Summary
    total_billed DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_staff_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_hospital_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Timestamps
    closed_at TIMESTAMPTZ,
    closed_by TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payroll_periods
CREATE INDEX IF NOT EXISTS idx_payroll_periods_hospital ON payroll_periods(hospital_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON payroll_periods(start_date, end_date);

-- ============================================
-- 4. STAFF PAYROLL RECORDS TABLE
-- ============================================
-- Individual staff earnings per payroll period
CREATE TABLE IF NOT EXISTS staff_payroll_records (
    id TEXT PRIMARY KEY,
    payroll_period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_role TEXT NOT NULL,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Activity Summary
    total_activities INTEGER NOT NULL DEFAULT 0,
    activities_by_category JSONB DEFAULT '{}'::JSONB,
    
    -- Earnings
    total_billed DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Deductions
    deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
    deduction_notes TEXT,
    
    -- Net Pay
    net_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Payment Status
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid')),
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_at TIMESTAMPTZ,
    payment_reference TEXT,
    
    -- Activity Details
    activity_records JSONB DEFAULT '[]'::JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for staff_payroll_records
CREATE INDEX IF NOT EXISTS idx_staff_payroll_period ON staff_payroll_records(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_staff ON staff_payroll_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_hospital ON staff_payroll_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_status ON staff_payroll_records(payment_status);

-- ============================================
-- 5. PAYSLIPS TABLE
-- ============================================
-- Generated payslips for staff (PDF-ready)
CREATE TABLE IF NOT EXISTS payslips (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    staff_role TEXT NOT NULL,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Period
    period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Bank Details
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,
    
    -- Earnings Breakdown (stored as JSONB)
    activities JSONB DEFAULT '[]'::JSONB,
    surgery_assistant_earnings JSONB DEFAULT '[]'::JSONB,
    
    -- Totals
    gross_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
    deduction_details JSONB DEFAULT '[]'::JSONB,
    net_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Payment Status
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid')),
    paid_at TIMESTAMPTZ,
    payment_reference TEXT,
    payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'cash', 'check')),
    
    -- PDF
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payslips
CREATE INDEX IF NOT EXISTS idx_payslips_staff ON payslips(staff_id);
CREATE INDEX IF NOT EXISTS idx_payslips_hospital ON payslips(hospital_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(payment_status);

-- ============================================
-- 6. POST OPERATIVE NOTES TABLE
-- ============================================
-- Comprehensive post-operative documentation with WHO compliance
CREATE TABLE IF NOT EXISTS post_operative_notes (
    id TEXT PRIMARY KEY,
    surgery_id TEXT NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admission_id TEXT,
    
    -- Basic Details
    procedure_name TEXT NOT NULL,
    procedure_code TEXT,
    procedure_date TIMESTAMPTZ NOT NULL,
    
    -- WHO Surgical Safety Checklist Compliance
    who_checklist_completed BOOLEAN DEFAULT FALSE,
    sign_in_completed BOOLEAN DEFAULT FALSE,
    time_out_completed BOOLEAN DEFAULT FALSE,
    sign_out_completed BOOLEAN DEFAULT FALSE,
    
    -- Surgical Team
    surgeon TEXT NOT NULL,
    surgeon_id TEXT NOT NULL,
    surgeon_fee DECIMAL(10,2) DEFAULT 0,
    assistant TEXT,
    assistant_id TEXT,
    assistant_fee DECIMAL(10,2),
    anaesthetist TEXT,
    anaesthetist_id TEXT,
    anaesthesia_type TEXT NOT NULL,
    anaesthesia_fee DECIMAL(10,2),
    scrub_nurse TEXT,
    scrub_nurse_id TEXT,
    circulating_nurse TEXT,
    circulating_nurse_id TEXT,
    
    -- Operative Details
    pre_operative_diagnosis TEXT NOT NULL,
    post_operative_diagnosis TEXT NOT NULL,
    indication TEXT NOT NULL,
    procedure_performed TEXT NOT NULL,
    findings TEXT NOT NULL,
    complications JSONB DEFAULT '[]'::JSONB,
    blood_loss INTEGER DEFAULT 0,
    blood_transfused INTEGER,
    duration INTEGER NOT NULL,
    
    -- Specimens & Lab Requests
    specimens_collected BOOLEAN DEFAULT FALSE,
    specimens JSONB DEFAULT '[]'::JSONB,
    lab_requests JSONB DEFAULT '[]'::JSONB,
    
    -- Immediate Post-Op Orders
    vital_signs_frequency TEXT,
    monitoring_instructions JSONB DEFAULT '[]'::JSONB,
    position TEXT,
    diet_instructions TEXT,
    iv_fluids TEXT,
    medications JSONB DEFAULT '[]'::JSONB,
    drain_care TEXT,
    catheter_care TEXT,
    
    -- Recovery Plan (WHO Standards)
    expected_recovery_days INTEGER,
    ambulation JSONB DEFAULT '{}'::JSONB,
    oral_intake JSONB DEFAULT '{}'::JSONB,
    
    -- Patient Education
    patient_education JSONB DEFAULT '{}'::JSONB,
    education_delivered BOOLEAN DEFAULT FALSE,
    education_delivered_by TEXT,
    education_delivered_at TIMESTAMPTZ,
    
    -- Follow-up
    follow_up_date DATE,
    follow_up_instructions TEXT,
    suture_removal_date DATE,
    
    -- Warning Signs
    warning_signs JSONB DEFAULT '[]'::JSONB,
    when_to_seek_help JSONB DEFAULT '[]'::JSONB,
    
    -- Billing
    total_procedure_fee DECIMAL(12,2) DEFAULT 0,
    billing_recorded BOOLEAN DEFAULT FALSE,
    activity_billing_record_ids JSONB DEFAULT '[]'::JSONB,
    
    -- Status & Approvals
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved')),
    completed_by TEXT,
    completed_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    
    -- PDF & Sharing
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    shared_via_whatsapp BOOLEAN DEFAULT FALSE,
    shared_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for post_operative_notes
CREATE INDEX IF NOT EXISTS idx_post_op_notes_surgery ON post_operative_notes(surgery_id);
CREATE INDEX IF NOT EXISTS idx_post_op_notes_patient ON post_operative_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_post_op_notes_hospital ON post_operative_notes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_post_op_notes_admission ON post_operative_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_post_op_notes_surgeon ON post_operative_notes(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_post_op_notes_status ON post_operative_notes(status);
CREATE INDEX IF NOT EXISTS idx_post_op_notes_date ON post_operative_notes(procedure_date);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE staff_patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_operative_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES (Allow all for anon - adjust as needed)
-- ============================================

-- Staff Patient Assignments Policies
DROP POLICY IF EXISTS "staff_patient_assignments_select" ON staff_patient_assignments;
DROP POLICY IF EXISTS "staff_patient_assignments_insert" ON staff_patient_assignments;
DROP POLICY IF EXISTS "staff_patient_assignments_update" ON staff_patient_assignments;
DROP POLICY IF EXISTS "staff_patient_assignments_delete" ON staff_patient_assignments;
CREATE POLICY "staff_patient_assignments_select" ON staff_patient_assignments FOR SELECT USING (true);
CREATE POLICY "staff_patient_assignments_insert" ON staff_patient_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "staff_patient_assignments_update" ON staff_patient_assignments FOR UPDATE USING (true);
CREATE POLICY "staff_patient_assignments_delete" ON staff_patient_assignments FOR DELETE USING (true);

-- Activity Billing Records Policies
DROP POLICY IF EXISTS "activity_billing_records_select" ON activity_billing_records;
DROP POLICY IF EXISTS "activity_billing_records_insert" ON activity_billing_records;
DROP POLICY IF EXISTS "activity_billing_records_update" ON activity_billing_records;
DROP POLICY IF EXISTS "activity_billing_records_delete" ON activity_billing_records;
CREATE POLICY "activity_billing_records_select" ON activity_billing_records FOR SELECT USING (true);
CREATE POLICY "activity_billing_records_insert" ON activity_billing_records FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_billing_records_update" ON activity_billing_records FOR UPDATE USING (true);
CREATE POLICY "activity_billing_records_delete" ON activity_billing_records FOR DELETE USING (true);

-- Payroll Periods Policies
DROP POLICY IF EXISTS "payroll_periods_select" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_insert" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_update" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_delete" ON payroll_periods;
CREATE POLICY "payroll_periods_select" ON payroll_periods FOR SELECT USING (true);
CREATE POLICY "payroll_periods_insert" ON payroll_periods FOR INSERT WITH CHECK (true);
CREATE POLICY "payroll_periods_update" ON payroll_periods FOR UPDATE USING (true);
CREATE POLICY "payroll_periods_delete" ON payroll_periods FOR DELETE USING (true);

-- Staff Payroll Records Policies
DROP POLICY IF EXISTS "staff_payroll_records_select" ON staff_payroll_records;
DROP POLICY IF EXISTS "staff_payroll_records_insert" ON staff_payroll_records;
DROP POLICY IF EXISTS "staff_payroll_records_update" ON staff_payroll_records;
DROP POLICY IF EXISTS "staff_payroll_records_delete" ON staff_payroll_records;
CREATE POLICY "staff_payroll_records_select" ON staff_payroll_records FOR SELECT USING (true);
CREATE POLICY "staff_payroll_records_insert" ON staff_payroll_records FOR INSERT WITH CHECK (true);
CREATE POLICY "staff_payroll_records_update" ON staff_payroll_records FOR UPDATE USING (true);
CREATE POLICY "staff_payroll_records_delete" ON staff_payroll_records FOR DELETE USING (true);

-- Payslips Policies
DROP POLICY IF EXISTS "payslips_select" ON payslips;
DROP POLICY IF EXISTS "payslips_insert" ON payslips;
DROP POLICY IF EXISTS "payslips_update" ON payslips;
DROP POLICY IF EXISTS "payslips_delete" ON payslips;
CREATE POLICY "payslips_select" ON payslips FOR SELECT USING (true);
CREATE POLICY "payslips_insert" ON payslips FOR INSERT WITH CHECK (true);
CREATE POLICY "payslips_update" ON payslips FOR UPDATE USING (true);
CREATE POLICY "payslips_delete" ON payslips FOR DELETE USING (true);

-- Post Operative Notes Policies
DROP POLICY IF EXISTS "post_operative_notes_select" ON post_operative_notes;
DROP POLICY IF EXISTS "post_operative_notes_insert" ON post_operative_notes;
DROP POLICY IF EXISTS "post_operative_notes_update" ON post_operative_notes;
DROP POLICY IF EXISTS "post_operative_notes_delete" ON post_operative_notes;
CREATE POLICY "post_operative_notes_select" ON post_operative_notes FOR SELECT USING (true);
CREATE POLICY "post_operative_notes_insert" ON post_operative_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "post_operative_notes_update" ON post_operative_notes FOR UPDATE USING (true);
CREATE POLICY "post_operative_notes_delete" ON post_operative_notes FOR DELETE USING (true);

-- ============================================
-- ENABLE REALTIME FOR ALL NEW TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE staff_patient_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_billing_records;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_payroll_records;
ALTER PUBLICATION supabase_realtime ADD TABLE payslips;
ALTER PUBLICATION supabase_realtime ADD TABLE post_operative_notes;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Summary:
-- - 6 new tables created
-- - All tables have proper indexes
-- - Row Level Security enabled with permissive policies
-- - Real-time enabled for cross-device sync
-- ============================================
