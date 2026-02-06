-- STEP 3: Update is_first_encounter flag (run after step 2)
-- This is optional - only needed if you have existing data

-- First, check how many records exist
SELECT COUNT(*) as total_encounters FROM clinical_encounters;

-- Mark encounters with type='initial' as first encounters
UPDATE clinical_encounters 
SET is_first_encounter = true 
WHERE type = 'initial';

-- Check result
SELECT COUNT(*) as marked_as_first FROM clinical_encounters WHERE is_first_encounter = true;
