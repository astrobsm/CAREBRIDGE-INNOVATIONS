-- Create Super Admin User for CareBridge
-- Email: douglas@carebridge.edu.ng
-- Password: BLACK@2velvet
-- Role: super_admin

-- First, check if user exists and delete if needed (for clean insert)
DELETE FROM users WHERE email = 'douglas@carebridge.edu.ng';

-- Insert the super admin user
INSERT INTO users (
  id,
  email,
  password,
  first_name,
  last_name,
  role,
  is_active,
  has_accepted_agreement,
  agreement_accepted_at,
  agreement_version,
  must_change_password,
  created_at,
  updated_at
) VALUES (
  UUID(),
  'douglas@carebridge.edu.ng',
  'BLACK@2velvet',
  'Douglas',
  'Admin',
  'super_admin',
  TRUE,
  TRUE,
  NOW(),
  '1.0',
  FALSE,
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT id, email, first_name, last_name, role, is_active, has_accepted_agreement 
FROM users 
WHERE email = 'douglas@carebridge.edu.ng';
