-- MySQL Migration: Add activity_billing_records table with activity_id column
-- Run this on DigitalOcean MySQL to fix: "Unknown column 'activity_id' in 'field list'"

-- Drop and recreate the table to ensure correct schema
DROP TABLE IF EXISTS activity_billing_records;

CREATE TABLE activity_billing_records (
  id VARCHAR(36) PRIMARY KEY,
  
  -- Activity Details
  activity_id VARCHAR(100) NOT NULL,
  activity_code VARCHAR(100) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  
  -- Patient Info
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  hospital_number VARCHAR(100) NOT NULL,
  
  -- Related Records
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  ward_round_id VARCHAR(36),
  lab_request_id VARCHAR(36),
  prescription_id VARCHAR(36),
  wound_care_id VARCHAR(36),
  npwt_session_id VARCHAR(36),
  transfusion_id VARCHAR(36),
  
  -- Staff who performed the activity
  performed_by VARCHAR(36) NOT NULL,
  performed_by_name VARCHAR(255) NOT NULL,
  performed_by_role VARCHAR(50) NOT NULL,
  
  -- Billing Details
  fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_fee DECIMAL(12,2),
  discount_amount DECIMAL(12,2),
  discount_rate DECIMAL(5,2),
  staff_share DECIMAL(12,2) NOT NULL DEFAULT 0,
  hospital_share DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Payment Status
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_evidence_url TEXT,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  staff_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  hospital_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Linked to Invoice
  invoice_id VARCHAR(36),
  invoice_item_id VARCHAR(36),
  
  -- Timestamps
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  billed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  
  -- Hospital context
  hospital_id VARCHAR(36),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_activity_billing_patient (patient_id),
  INDEX idx_activity_billing_performed_by (performed_by),
  INDEX idx_activity_billing_hospital (hospital_id),
  INDEX idx_activity_billing_invoice (invoice_id),
  INDEX idx_activity_billing_status (payment_status),
  INDEX idx_activity_billing_performed_at (performed_at),
  INDEX idx_activity_billing_category (category)
);

-- Also ensure substance_use_assessments table exists
CREATE TABLE IF NOT EXISTS substance_use_assessments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  hospital_number VARCHAR(100),
  date DATE NOT NULL,
  
  -- Assessed By
  assessed_by VARCHAR(36) NOT NULL,
  assessed_by_name VARCHAR(255) NOT NULL,
  
  -- Substance Use Data
  substances JSON,
  pattern JSON,
  consequences JSON,
  
  -- Clinical Scores
  addiction_score INT,
  addiction_severity VARCHAR(50),
  withdrawal_risk VARCHAR(50),
  care_setting VARCHAR(50),
  
  -- Pain & Treatment
  has_pain BOOLEAN DEFAULT false,
  pain_treatment_plan TEXT,
  pain_management_support JSON,
  
  -- Notes
  notes TEXT,
  
  -- Context
  hospital_id VARCHAR(36),
  encounter_id VARCHAR(36),
  admission_id VARCHAR(36),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_sua_patient (patient_id),
  INDEX idx_sua_hospital (hospital_id),
  INDEX idx_sua_date (date),
  INDEX idx_sua_assessed_by (assessed_by)
);
