-- ============================================
-- CLINICAL COMMENTS TABLE
-- AstroHEALTH - Supabase PostgreSQL Migration
-- Post-submission notes for encounters, investigations, prescriptions, etc.
-- ============================================

-- Drop existing table if exists (for clean re-run)
DROP TABLE IF EXISTS clinical_comments CASCADE;

-- ============================================
-- Clinical Comments Table
-- ============================================
CREATE TABLE IF NOT EXISTS clinical_comments (
    id TEXT PRIMARY KEY,
    
    -- Entity Reference
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'clinical_encounter',
        'investigation',
        'prescription',
        'surgery',
        'admission',
        'wound',
        'burn_assessment',
        'lab_request',
        'treatment_plan'
    )),
    entity_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    
    -- Comment Content
    comment TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent', 'critical')),
    category TEXT CHECK (category IN ('clarification', 'update', 'correction', 'follow_up', 'warning', 'instruction', 'other')),
    
    -- Resolution Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_by_name TEXT,
    
    -- Threading (for replies)
    parent_comment_id TEXT REFERENCES clinical_comments(id) ON DELETE CASCADE,
    
    -- Author Information
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    
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

-- Primary lookup: by entity
CREATE INDEX IF NOT EXISTS idx_clinical_comments_entity ON clinical_comments(entity_type, entity_id);

-- By patient (for patient-wide comment view)
CREATE INDEX IF NOT EXISTS idx_clinical_comments_patient ON clinical_comments(patient_id);

-- By hospital (for hospital-wide views)
CREATE INDEX IF NOT EXISTS idx_clinical_comments_hospital ON clinical_comments(hospital_id);

-- By author
CREATE INDEX IF NOT EXISTS idx_clinical_comments_author ON clinical_comments(author_id);

-- By priority (for urgent/critical comments dashboard)
CREATE INDEX IF NOT EXISTS idx_clinical_comments_priority ON clinical_comments(priority);

-- By resolution status (for unresolved comments tracking)
CREATE INDEX IF NOT EXISTS idx_clinical_comments_resolved ON clinical_comments(is_resolved);

-- Parent comment (for threaded replies)
CREATE INDEX IF NOT EXISTS idx_clinical_comments_parent ON clinical_comments(parent_comment_id);

-- By created date
CREATE INDEX IF NOT EXISTS idx_clinical_comments_created ON clinical_comments(created_at);

-- Composite: unresolved + priority (for alerts dashboard)
CREATE INDEX IF NOT EXISTS idx_clinical_comments_unresolved_priority 
    ON clinical_comments(is_resolved, priority) 
    WHERE is_resolved = FALSE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE clinical_comments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (simplified policy)
CREATE POLICY "Allow all access to clinical_comments" 
    ON clinical_comments 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- ============================================
-- TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_clinical_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clinical_comments_updated_at ON clinical_comments;
CREATE TRIGGER trigger_clinical_comments_updated_at
    BEFORE UPDATE ON clinical_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_clinical_comments_updated_at();

-- ============================================
-- ENABLE REAL-TIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE clinical_comments;

-- ============================================
-- TABLE COMMENT
-- ============================================
COMMENT ON TABLE clinical_comments IS 'Post-submission clinical notes and comments for encounters, investigations, prescriptions and other clinical entities';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Clinical comments table created successfully!' AS status;
