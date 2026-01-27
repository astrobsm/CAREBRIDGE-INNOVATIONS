-- ============================================
-- PART 3: Add missing columns to video_conferences
-- Run this after Part 2 completes
-- ============================================

ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS room_code TEXT;
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS co_host_ids JSONB DEFAULT '[]'::jsonb;
