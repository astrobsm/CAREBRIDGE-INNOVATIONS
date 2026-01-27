-- ============================================
-- PART 2: Enable Realtime & RLS
-- Run this after Part 1 completes
-- ============================================

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rtc_signaling;

-- Enable RLS
ALTER TABLE rtc_signaling ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "read_signaling" ON rtc_signaling FOR SELECT USING (true);
CREATE POLICY "insert_signaling" ON rtc_signaling FOR INSERT WITH CHECK (true);
