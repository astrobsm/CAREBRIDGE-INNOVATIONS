-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all access" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.users;

-- Create permissive policy for all operations
CREATE POLICY "Allow all access" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

-- Also fix other critical tables that might have similar issues
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.vital_signs;
CREATE POLICY "Allow all access" ON public.vital_signs
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.patients;
CREATE POLICY "Allow all access" ON public.patients
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.clinical_encounters;
CREATE POLICY "Allow all access" ON public.clinical_encounters
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.surgeries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.surgeries;
CREATE POLICY "Allow all access" ON public.surgeries
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.hospitals;
CREATE POLICY "Allow all access" ON public.hospitals
  FOR ALL USING (true) WITH CHECK (true);
