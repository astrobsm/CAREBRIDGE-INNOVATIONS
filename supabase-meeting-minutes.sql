-- ============================================
-- MEETING MINUTES TABLE
-- AstroHEALTH - Supabase PostgreSQL Migration
-- ============================================

-- Drop existing table if exists (for clean re-run)
DROP TABLE IF EXISTS meeting_minutes CASCADE;

-- ============================================
-- Meeting Minutes Table
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id TEXT PRIMARY KEY,
    conference_id TEXT NOT NULL,
    hospital_id TEXT,
    
    -- Meeting Details
    title TEXT NOT NULL,
    meeting_type TEXT NOT NULL DEFAULT 'other' CHECK (meeting_type IN ('consultation', 'case_discussion', 'ward_round', 'team_meeting', 'teaching', 'presentation', 'mdt', 'other')),
    meeting_date TIMESTAMPTZ NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INT, -- minutes
    location TEXT,
    room_code TEXT,
    
    -- Participants
    host_id TEXT NOT NULL,
    host_name TEXT,
    attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
    absentees JSONB DEFAULT '[]'::jsonb,
    
    -- Agenda
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Full Transcript
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_transcript_text TEXT,
    
    -- AI-Generated Content
    ai_summary TEXT,
    key_points JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    decisions_reached JSONB DEFAULT '[]'::jsonb,
    discussion_highlights JSONB DEFAULT '[]'::jsonb,
    next_steps JSONB DEFAULT '[]'::jsonb,
    
    -- Patient-related (for clinical meetings)
    patient_id TEXT,
    patient_name TEXT,
    clinical_notes TEXT,
    
    -- Recording Info
    has_recording BOOLEAN DEFAULT FALSE,
    recording_url TEXT,
    recording_duration INT,
    
    -- Status & Sharing
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'shared')),
    shared_with JSONB DEFAULT '[]'::jsonb,
    shared_at TIMESTAMPTZ,
    exported_formats JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_by TEXT NOT NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    finalized_by TEXT,
    synced_at TIMESTAMPTZ,
    local_id TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_conference ON meeting_minutes(conference_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_hospital ON meeting_minutes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_host ON meeting_minutes(host_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_patient ON meeting_minutes(patient_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_status ON meeting_minutes(status);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting_date ON meeting_minutes(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting_type ON meeting_minutes(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_created_at ON meeting_minutes(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (simplified policy)
CREATE POLICY "Allow all access to meeting_minutes" ON meeting_minutes FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_meeting_minutes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meeting_minutes_updated_at ON meeting_minutes;
CREATE TRIGGER trigger_meeting_minutes_updated_at
    BEFORE UPDATE ON meeting_minutes
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_minutes_updated_at();

-- ============================================
-- TABLE COMMENT
-- ============================================
COMMENT ON TABLE meeting_minutes IS 'Meeting minutes with AI-generated summaries, transcripts, and action items';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Meeting minutes table created successfully!' AS status;
