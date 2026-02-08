-- ============================================
-- INVESTIGATION APPROVAL WORKFLOW MIGRATION
-- AstroHEALTH - Supabase PostgreSQL Migration
-- Adds approval workflow columns to investigations table
-- ============================================

-- Add approval workflow columns to investigations table
ALTER TABLE investigations 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by TEXT,
ADD COLUMN IF NOT EXISTS rejected_by_name TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_approval_id TEXT;

-- ============================================
-- INDEXES for approval workflow
-- ============================================

-- Index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_investigations_approval_status ON investigations(approval_status);

-- Index for finding investigations approved by a specific user
CREATE INDEX IF NOT EXISTS idx_investigations_approved_by ON investigations(approved_by);

-- Composite index for pending approvals by hospital
CREATE INDEX IF NOT EXISTS idx_investigations_pending_approval_hospital 
    ON investigations(hospital_id, approval_status) 
    WHERE approval_status = 'pending';

-- Composite index for pending approvals by patient
CREATE INDEX IF NOT EXISTS idx_investigations_pending_approval_patient 
    ON investigations(patient_id, approval_status) 
    WHERE approval_status = 'pending';

-- Index for tracking auto-requested investigations
CREATE INDEX IF NOT EXISTS idx_investigations_auto_requested ON investigations(auto_requested) WHERE auto_requested = TRUE;

-- ============================================
-- CREATE INVESTIGATION APPROVALS LOG TABLE
-- For audit trail of all approval/rejection actions
-- ============================================

CREATE TABLE IF NOT EXISTS investigation_approval_logs (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    
    -- Action details
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'auto_requested', 'cancelled')),
    performed_by TEXT NOT NULL,
    performed_by_name TEXT NOT NULL,
    performed_by_role TEXT NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- For rejections
    reason TEXT,
    
    -- For auto-request tracking
    source_investigation_id TEXT,
    auto_request_triggered BOOLEAN DEFAULT FALSE,
    lab_request_id TEXT, -- The lab request created from this approval
    
    -- Sync
    synced_at TIMESTAMPTZ,
    local_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES for approval logs
-- ============================================

CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_investigation ON investigation_approval_logs(investigation_id);
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_patient ON investigation_approval_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_hospital ON investigation_approval_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_performed_by ON investigation_approval_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_action ON investigation_approval_logs(action);
CREATE INDEX IF NOT EXISTS idx_investigation_approval_logs_created ON investigation_approval_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE investigation_approval_logs ENABLE ROW LEVEL SECURITY;

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
-- TABLE COMMENTS
-- ============================================
COMMENT ON TABLE investigation_approval_logs IS 'Audit trail for investigation approval workflow actions';
COMMENT ON COLUMN investigations.approval_status IS 'Investigation approval status: pending, approved, or rejected';
COMMENT ON COLUMN investigations.auto_requested IS 'True if this investigation was auto-created after an approval action';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Investigation approval workflow migration completed successfully!' AS status;
