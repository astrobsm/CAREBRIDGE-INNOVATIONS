-- CONNECTIVITY TEST - Run this first to verify connection works
-- Should return in < 1 second

SELECT 1 as test;

-- Check if clinical_encounters table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'clinical_encounters'
) as table_exists;

-- Count rows (if table exists)
SELECT COUNT(*) as row_count FROM clinical_encounters;
