-- ============================================
-- CareBridge Users Table Sync Fix
-- ============================================
-- This migration ensures the users table exists with
-- proper schema, RLS policies, and real-time enabled
-- for cross-device synchronization
-- ============================================

-- Create users table if not exists (with TEXT id for compatibility)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL,
  hospital_id TEXT REFERENCES hospitals(id),
  phone TEXT,
  specialization TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  has_accepted_agreement BOOLEAN DEFAULT false,
  must_change_password BOOLEAN DEFAULT true,
  agreement_accepted_at TIMESTAMPTZ,
  synced_status INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

-- Allow all operations for now (adjust for production)
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete" ON users FOR DELETE USING (true);

-- Enable realtime for users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify:
-- SELECT * FROM users LIMIT 5;
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users';
