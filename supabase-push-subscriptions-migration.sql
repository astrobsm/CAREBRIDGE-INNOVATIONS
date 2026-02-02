-- ============================================
-- Push Subscriptions Table for Web Push Notifications
-- Run this in Supabase SQL Editor
-- ============================================

-- Create push_subscriptions table
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
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_hospital_id ON push_subscriptions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all (for sending notifications)
CREATE POLICY "Service role can access all push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Enable realtime for push_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- ============================================
-- Notification Log Table (for tracking sent notifications)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, delivered, clicked
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_subscription_id ON notification_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Enable RLS for notification logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification logs
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can access all
CREATE POLICY "Service role can access all notification logs"
  ON notification_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Helper function to get active subscriptions for a user
-- ============================================

CREATE OR REPLACE FUNCTION get_user_push_subscriptions(target_user_id UUID)
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
  WHERE ps.user_id = target_user_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper function to get subscriptions by hospital
-- ============================================

CREATE OR REPLACE FUNCTION get_hospital_push_subscriptions(target_hospital_id UUID)
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
  WHERE ps.hospital_id = target_hospital_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper function to get subscriptions by user role
-- ============================================

CREATE OR REPLACE FUNCTION get_role_push_subscriptions(
  target_role TEXT,
  target_hospital_id UUID DEFAULT NULL
)
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
  WHERE u.role = target_role
    AND ps.is_active = true
    AND (target_hospital_id IS NULL OR ps.hospital_id = target_hospital_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT ON notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_push_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION get_hospital_push_subscriptions TO service_role;
GRANT EXECUTE ON FUNCTION get_role_push_subscriptions TO service_role;

-- ============================================
-- Done!
-- ============================================

COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscriptions for each user device';
COMMENT ON TABLE notification_logs IS 'Tracks all sent push notifications for analytics and debugging';
