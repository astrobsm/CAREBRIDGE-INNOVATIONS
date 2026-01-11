-- =====================================================
-- CareBridge Users Table Complete Fix
-- =====================================================
-- This migration ensures the users table has ALL columns
-- matching the local User type for proper sync
-- =====================================================

-- First, create users table if not exists (with TEXT id for compatibility)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL,
  hospital_id TEXT,
  phone TEXT,
  avatar TEXT,
  specialization TEXT,
  specialty TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  has_accepted_agreement BOOLEAN DEFAULT false,
  agreement_accepted_at TIMESTAMPTZ,
  agreement_version TEXT,
  agreement_device_info TEXT,
  must_change_password BOOLEAN DEFAULT true,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_code TEXT,
  synced_status INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table exists but columns don't
DO $$
BEGIN
  -- Add password column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password') THEN
    ALTER TABLE users ADD COLUMN password TEXT;
  END IF;
  
  -- Add avatar column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar') THEN
    ALTER TABLE users ADD COLUMN avatar TEXT;
  END IF;
  
  -- Add specialty column (alias for specialization)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'specialty') THEN
    ALTER TABLE users ADD COLUMN specialty TEXT;
  END IF;
  
  -- Add agreement_version column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'agreement_version') THEN
    ALTER TABLE users ADD COLUMN agreement_version TEXT;
  END IF;
  
  -- Add agreement_device_info column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'agreement_device_info') THEN
    ALTER TABLE users ADD COLUMN agreement_device_info TEXT;
  END IF;
  
  -- Add bank_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'bank_name') THEN
    ALTER TABLE users ADD COLUMN bank_name TEXT;
  END IF;
  
  -- Add bank_account_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'bank_account_number') THEN
    ALTER TABLE users ADD COLUMN bank_account_number TEXT;
  END IF;
  
  -- Add bank_account_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'bank_account_name') THEN
    ALTER TABLE users ADD COLUMN bank_account_name TEXT;
  END IF;
  
  -- Add bank_code column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'bank_code') THEN
    ALTER TABLE users ADD COLUMN bank_code TEXT;
  END IF;
  
  -- Add synced_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'synced_status') THEN
    ALTER TABLE users ADD COLUMN synced_status INTEGER DEFAULT 0;
  END IF;
  
  -- Add first_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE users ADD COLUMN first_name TEXT;
  END IF;
  
  -- Add last_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE users ADD COLUMN last_name TEXT;
  END IF;
  
  -- Add hospital_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'hospital_id') THEN
    ALTER TABLE users ADD COLUMN hospital_id TEXT;
  END IF;
  
  -- Add phone column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
  END IF;
  
  -- Add specialization column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'specialization') THEN
    ALTER TABLE users ADD COLUMN specialization TEXT;
  END IF;
  
  -- Add license_number column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'license_number') THEN
    ALTER TABLE users ADD COLUMN license_number TEXT;
  END IF;
  
  -- Add is_active column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add has_accepted_agreement column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'has_accepted_agreement') THEN
    ALTER TABLE users ADD COLUMN has_accepted_agreement BOOLEAN DEFAULT false;
  END IF;
  
  -- Add must_change_password column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'must_change_password') THEN
    ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT true;
  END IF;
  
  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add agreement_accepted_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'agreement_accepted_at') THEN
    ALTER TABLE users ADD COLUMN agreement_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_updated ON users(updated_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

-- Allow all operations (for development - restrict for production)
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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after the migration to verify:

-- 1. Check table exists with all columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;

-- 2. Check RLS policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- 3. Check realtime enabled:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users';

-- 4. Check current users in table:
-- SELECT id, email, first_name, last_name, role, created_at FROM users;
