-- Web Push Notifications - Supabase Migration
-- Creates push_subscriptions table and Edge Function for sending push notifications
-- Run this in Supabase SQL Editor

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================

-- Create push_subscriptions table to store user push subscription data
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  preferences JSONB DEFAULT '{
    "patientAssignments": true,
    "surgeryReminders": true,
    "appointmentReminders": true,
    "labResults": true,
    "investigationResults": true,
    "prescriptionReady": true,
    "treatmentPlanUpdates": true,
    "vitalAlerts": true,
    "staffMessages": true,
    "systemAlerts": true,
    "quietHoursEnabled": false,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_hospital_id ON push_subscriptions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================
-- NOTIFICATION QUEUE TABLE
-- ============================================

-- Queue table for pending push notifications (for retry logic)
CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'expired')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_push_queue_user_id ON push_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_push_queue_scheduled_at ON push_notification_queue(scheduled_at);

-- ============================================
-- NOTIFICATION LOG TABLE
-- ============================================

-- Log table for sent notifications (for analytics)
CREATE TABLE IF NOT EXISTS push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_push_log_user_id ON push_notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_push_log_notification_type ON push_notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_log_sent_at ON push_notification_log(sent_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on tables
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_log ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Hospital admins can view all subscriptions in their hospital
CREATE POLICY "Hospital admins can view hospital subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'hospital_admin')
      AND (users.hospital_id = push_subscriptions.hospital_id OR users.role = 'super_admin')
    )
  );

-- Notification queue policies
CREATE POLICY "Users can view their own notification queue"
  ON push_notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Notification log policies
CREATE POLICY "Users can view their own notification log"
  ON push_notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_subscriptions(p_user_id UUID)
RETURNS TABLE (
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.preferences
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active subscriptions for a hospital
CREATE OR REPLACE FUNCTION get_hospital_subscriptions(p_hospital_id UUID)
RETURNS TABLE (
  user_id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.user_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.preferences
  FROM push_subscriptions ps
  WHERE ps.hospital_id = p_hospital_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active subscriptions by role
CREATE OR REPLACE FUNCTION get_subscriptions_by_role(p_role TEXT, p_hospital_id UUID)
RETURNS TABLE (
  user_id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.user_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.preferences
  FROM push_subscriptions ps
  JOIN users u ON u.id = ps.user_id
  WHERE u.role = p_role
    AND ps.hospital_id = p_hospital_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if notification should be sent (quiet hours)
CREATE OR REPLACE FUNCTION should_send_notification(p_preferences JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  quiet_enabled BOOLEAN;
  quiet_start TEXT;
  quiet_end TEXT;
  current_time TIME;
  start_time TIME;
  end_time TIME;
BEGIN
  quiet_enabled := COALESCE((p_preferences->>'quietHoursEnabled')::BOOLEAN, false);
  
  IF NOT quiet_enabled THEN
    RETURN true;
  END IF;
  
  quiet_start := COALESCE(p_preferences->>'quietHoursStart', '22:00');
  quiet_end := COALESCE(p_preferences->>'quietHoursEnd', '07:00');
  
  current_time := (NOW() AT TIME ZONE 'Africa/Lagos')::TIME;
  start_time := quiet_start::TIME;
  end_time := quiet_end::TIME;
  
  -- Handle overnight quiet hours (e.g., 22:00 to 07:00)
  IF start_time > end_time THEN
    IF current_time >= start_time OR current_time <= end_time THEN
      RETURN false;
    END IF;
  ELSE
    IF current_time >= start_time AND current_time <= end_time THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VAPID KEYS STORAGE
-- ============================================

-- Store VAPID keys securely (only accessible by service account)
CREATE TABLE IF NOT EXISTS app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Insert VAPID keys manually via Supabase dashboard
-- INSERT INTO app_secrets (key, value) VALUES ('vapid_public_key', 'your-public-key');
-- INSERT INTO app_secrets (key, value) VALUES ('vapid_private_key', 'your-private-key');

-- Restrict access to secrets table
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access secrets
CREATE POLICY "Only service role can access secrets"
  ON app_secrets FOR ALL
  USING (false);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for push_subscriptions (for sync)
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_notification_queue TO authenticated;
GRANT SELECT ON push_notification_log TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE push_subscriptions IS 'Stores Web Push subscription data for push notifications';
COMMENT ON TABLE push_notification_queue IS 'Queue for pending push notifications with retry logic';
COMMENT ON TABLE push_notification_log IS 'Log of sent push notifications for analytics';
