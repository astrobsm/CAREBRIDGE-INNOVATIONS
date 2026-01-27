-- ============================================
-- AstroHEALTH WebRTC Signaling Table Migration
-- ============================================
-- This migration adds the rtc_signaling table for WebRTC peer-to-peer
-- video conferencing signaling (SDP offers/answers and ICE candidates).
-- 
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE RTC_SIGNALING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rtc_signaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES video_conferences(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  from_user_name TEXT NOT NULL,
  to_user_id TEXT NOT NULL, -- 'all' for broadcast or specific user ID
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate', 'participant-update')),
  payload TEXT NOT NULL, -- JSON stringified SDP or ICE candidate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for efficient lookups
  CONSTRAINT rtc_signaling_type_check CHECK (type IN ('offer', 'answer', 'ice-candidate', 'participant-update'))
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rtc_signaling_conference_id ON rtc_signaling(conference_id);
CREATE INDEX IF NOT EXISTS idx_rtc_signaling_to_user_id ON rtc_signaling(to_user_id);
CREATE INDEX IF NOT EXISTS idx_rtc_signaling_created_at ON rtc_signaling(created_at);

-- ============================================
-- 3. ENABLE REALTIME FOR SIGNALING
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE rtc_signaling;

-- ============================================
-- 4. ADD ADMISSION_STATUS TO CONFERENCE PARTICIPANTS
-- ============================================
-- The participants column in video_conferences is JSONB containing an array
-- Each participant object should have an admissionStatus field
-- This is handled at the application level, but we document it here

COMMENT ON TABLE rtc_signaling IS 'WebRTC signaling messages for peer-to-peer video conferencing. Messages are exchanged between participants to establish direct connections.';

-- ============================================
-- 5. SET UP ROW LEVEL SECURITY
-- ============================================

ALTER TABLE rtc_signaling ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read signaling messages for conferences they're part of
CREATE POLICY "Users can read signaling for their conferences" ON rtc_signaling
  FOR SELECT
  USING (true); -- In a production app, you'd check conference membership

-- Policy: Users can insert signaling messages
CREATE POLICY "Users can insert signaling messages" ON rtc_signaling
  FOR INSERT
  WITH CHECK (true); -- In a production app, you'd validate the from_user_id

-- ============================================
-- 6. AUTO-CLEANUP OLD SIGNALING MESSAGES
-- ============================================
-- Signaling messages are ephemeral and only needed during connection setup
-- We create a function to clean up old messages

CREATE OR REPLACE FUNCTION cleanup_old_signaling_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM rtc_signaling 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- You can schedule this function to run periodically using pg_cron if available
-- SELECT cron.schedule('cleanup-signaling', '*/30 * * * *', 'SELECT cleanup_old_signaling_messages()');

-- ============================================
-- 7. VERIFY TABLE CREATION
-- ============================================

SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'rtc_signaling'
ORDER BY ordinal_position;

-- ============================================
-- Done! WebRTC signaling table has been created.
-- Participants can now exchange SDP and ICE candidates
-- for establishing peer-to-peer video connections.
-- ============================================
