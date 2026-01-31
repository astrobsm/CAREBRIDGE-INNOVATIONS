-- Add missing column to treatment_plans table
-- Run this on your DigitalOcean MySQL database

ALTER TABLE treatment_plans 
ADD COLUMN IF NOT EXISTS linked_prescription_ids JSON NULL 
COMMENT 'JSON array of linked prescription IDs';

-- Verify the column was added
DESCRIBE treatment_plans;
