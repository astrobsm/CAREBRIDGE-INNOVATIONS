-- Add missing alternate_phone column to patients table
-- Run this in DigitalOcean MySQL database

ALTER TABLE patients ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20) NULL;

-- Verify the column was added
DESCRIBE patients;
