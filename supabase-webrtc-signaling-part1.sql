-- ============================================
-- PART 1: Create RTC Signaling Table
-- Run this first, then run Part 2
-- ============================================

-- Create table
CREATE TABLE IF NOT EXISTS rtc_signaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate', 'participant-update')),
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rtc_signaling_conference_id ON rtc_signaling(conference_id);
CREATE INDEX IF NOT EXISTS idx_rtc_signaling_to_user_id ON rtc_signaling(to_user_id);
CREATE INDEX IF NOT EXISTS idx_rtc_signaling_created_at ON rtc_signaling(created_at);
