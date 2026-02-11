-- ============================================
-- INVESTIGATION APPROVAL WORKFLOW TABLES
-- AstroHEALTH - Supabase PostgreSQL Migration
-- Tracks investigation approvals, rejections, and lab requests
-- ============================================

-- Drop existing table if exists (for clean re-run)
DROP TABLE IF EXISTS investigation_approval_logs CASCADE;

-- ============================================
-- Investigation Approval Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS investigation_approval_logs (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    
    -- Approval Action
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'auto_requested', 'cancelled')),
    reason TEXT,
    
    -- Performer Information
    performed_by TEXT NOT NULL,
    performed_by_name TEXT NOT NULL,
    performed_by_role TEXT NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Auto-Request Tracking
    source_investigation_id TEXT,
    auto_request_triggered BOOLEAN DEFAULT FALSE,
    lab_request_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Sync Tracking
    synced_at TIMESTAMPTZ,
    local_id TEXT
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary lookup: by investigation
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_investigation 
    ON investigation_approval_logs(investigation_id);

-- By patient (for patient-wide approval history)
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_patient 
    ON investigation_approval_logs(patient_id);

-- By hospital (for hospital-wide views)
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_hospital 
    ON investigation_approval_logs(hospital_id);

-- By performer
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_performer 
    ON investigation_approval_logs(performed_by);

-- By action (for filtering by approval/rejection)
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_action 
    ON investigation_approval_logs(action);

-- By lab request (to trace lab requests back to approvals)
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_lab_request 
    ON investigation_approval_logs(lab_request_id);

-- By performed date
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_performed_at 
    ON investigation_approval_logs(performed_at);

-- ============================================
-- ADD APPROVAL COLUMNS TO INVESTIGATIONS TABLE
-- ============================================
DO $$ 
BEGIN
    -- Add approval_status column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'investigations' AND column_name = 'approval_status') THEN
        ALTER TABLE investigations ADD COLUMN approval_status TEXT DEFAULT 'pending' 
            CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    -- Add approved_by column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'investigations' AND column_name = 'approved_by') THEN
        ALTER TABLE investigations ADD COLUMN approved_by TEXT;
    END IF;
    
    -- Add approved_by_name column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'investigations' AND column_name = 'approved_by_name') THEN
        ALTER TABLE investigations ADD COLUMN approved_by_name TEXT;
    END IF;
    
    -- Add approved_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'investigations' AND column_name = 'approved_at') THEN
        ALTER TABLE investigations ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    
    -- Add rejection_reason column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'investigations' AND column_name = 'rejection_reason') THEN
        ALTER TABLE investigations ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- Add lab_request_id column if not exists (for tracking auto-created lab requests)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'investigations' AND column_name = 'lab_request_id') THEN
        ALTER TABLE investigations ADD COLUMN lab_request_id TEXT;
    END IF;
END $$;

-- Create index on approval_status
CREATE INDEX IF NOT EXISTS idx_investigations_approval_status 
    ON investigations(approval_status);

-- Create index on approved_by
CREATE INDEX IF NOT EXISTS idx_investigations_approved_by 
    ON investigations(approved_by);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE investigation_approval_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (simplified policy)
CREATE POLICY "Allow all access to investigation_approval_logs" 
    ON investigation_approval_logs 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- ============================================
-- ENABLE REAL-TIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE investigation_approval_logs;

-- ============================================
-- TABLE COMMENT
-- ============================================
COMMENT ON TABLE investigation_approval_logs IS 'Audit trail for investigation approval workflow - tracks all approvals, rejections, and auto-requested lab orders';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Investigation approval workflow tables created successfully!' AS status;
