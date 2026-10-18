-- ============================================================================
-- One registration per hospital number, per hospital
-- ----------------------------------------------------------------------------
-- The same patient could be registered twice: hospital numbers were stored as
-- typed and nothing compared them, so "cb2612345", "CB 2612345" and
-- "CB-26-12345" were three patients. The app now refuses a duplicate on every
-- path that registers a patient (src/domains/patients/services/
-- patientDedupeService.ts); this migration is the server's half, so a device
-- that registered offline cannot upload a second copy either.
--
-- THE MATCHING KEY
--   patient_hospital_number_key(n) = upper case, letters and digits only.
--   Case, spaces, dashes, slashes and dots never make two numbers differ.
--   Keep in step with hospitalNumberKey() in src/utils/hospitalNumber.ts.
--   Stored numbers are NOT rewritten: they are printed on folders and forms in
--   several historical shapes, and matching on the key covers all of them.
--
-- THE SCOPE
--   Folder numbers are issued per hospital, so uniqueness is per
--   registered_hospital_id ('' and 'global' - older records filed under no
--   hospital - form one scope). Inactive (deleted) and merged registrations do
--   not count.
--
-- WHY THIS IS SAFE ON LIVE DATA THAT ALREADY HOLDS DUPLICATES
--   A plain UNIQUE index would fail - and abort the whole migration - on the
--   first pair of existing double registrations. Instead:
--
--   1. A BEFORE INSERT/UPDATE trigger refuses NEW duplicates straight away,
--      whatever is already in the table. It deliberately lets existing rows
--      keep syncing: an upsert of a row that already exists, or an update that
--      leaves its number and hospital unchanged, is never refused - otherwise
--      every edit to an old duplicate would start failing.
--   2. The UNIQUE index is built only if no duplicates exist. Otherwise the
--      migration completes, raises a NOTICE with the count, and leaves a plain
--      lookup index. Existing duplicates are listed by
--      patient_hospital_number_duplicates() and merged by an administrator in
--      the app (Patients -> Duplicate Patients), which retires the duplicate's
--      number as MERGED-<id>-<number> and then calls
--      ensure_patient_hospital_number_unique() to build the index once the
--      last group is gone.
--
--   The trigger alone has a race (two simultaneous inserts of the same number
--   on different connections can both pass); the unique index closes it once
--   it exists. Until then the Duplicate Patients screen catches what slips by.
--
-- Additive and idempotent - safe to run and to re-run.
-- ============================================================================

-- Columns the merge writes on a retired registration.
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS merged_into TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS merged_at   TIMESTAMPTZ;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS registered_hospital_id TEXT;

-- ---------------------------------------------------------------------------
-- Key and scope
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.patient_hospital_number_key(p_number TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT regexp_replace(upper(coalesce(p_number, '')), '[^A-Z0-9]', '', 'g')
$$;

CREATE OR REPLACE FUNCTION public.patient_hospital_number_scope(p_hospital TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE WHEN btrim(coalesce(p_hospital, '')) IN ('', 'global') THEN '' ELSE btrim(p_hospital) END
$$;

-- Plain lookup index: always buildable, used by the trigger and the lookup.
CREATE INDEX IF NOT EXISTS idx_patients_hospital_number_key
  ON public.patients (public.patient_hospital_number_scope(registered_hospital_id),
                      public.patient_hospital_number_key(hospital_number));

-- ---------------------------------------------------------------------------
-- 1. Trigger: no new duplicates, from now on
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.patients_reject_duplicate_hospital_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  k     TEXT := public.patient_hospital_number_key(NEW.hospital_number);
  scope TEXT := public.patient_hospital_number_scope(NEW.registered_hospital_id);
  other RECORD;
BEGIN
  IF k = '' OR coalesce(NEW.is_active, TRUE) = FALSE OR NEW.merged_into IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- PostgREST upserts fire BEFORE INSERT even when the row exists; the
    -- UPDATE that follows decides for existing rows.
    IF EXISTS (SELECT 1 FROM public.patients WHERE id = NEW.id) THEN
      RETURN NEW;
    END IF;
  ELSIF public.patient_hospital_number_key(OLD.hospital_number) = k
    AND public.patient_hospital_number_scope(OLD.registered_hospital_id) = scope
    AND coalesce(OLD.is_active, TRUE) = TRUE
    AND OLD.merged_into IS NULL THEN
    -- Number and hospital unchanged: an existing (possibly legacy duplicate)
    -- row keeps syncing until it is merged.
    RETURN NEW;
  END IF;

  SELECT id, first_name, last_name INTO other
    FROM public.patients p
   WHERE p.id <> NEW.id
     AND public.patient_hospital_number_scope(p.registered_hospital_id) = scope
     AND public.patient_hospital_number_key(p.hospital_number) = k
     AND coalesce(p.is_active, TRUE) = TRUE
     AND p.merged_into IS NULL
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'DUPLICATE_HOSPITAL_NUMBER: hospital number % is already registered to % (%)',
      NEW.hospital_number, btrim(coalesce(other.first_name, '') || ' ' || coalesce(other.last_name, '')), other.id
      USING ERRCODE = '23505',
            HINT = 'Open the existing record, or merge the two in Patients -> Duplicate Patients.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_reject_duplicate_hospital_number ON public.patients;
CREATE TRIGGER trg_patients_reject_duplicate_hospital_number
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.patients_reject_duplicate_hospital_number();

-- ---------------------------------------------------------------------------
-- Duplicates already in the table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.patient_hospital_number_duplicates()
RETURNS TABLE (scope TEXT, number_key TEXT, registrations BIGINT, patient_ids TEXT[], hospital_numbers TEXT[])
LANGUAGE sql STABLE
AS $$
  SELECT public.patient_hospital_number_scope(registered_hospital_id),
         public.patient_hospital_number_key(hospital_number),
         COUNT(*),
         array_agg(id ORDER BY created_at),
         array_agg(hospital_number ORDER BY created_at)
    FROM public.patients
   WHERE public.patient_hospital_number_key(hospital_number) <> ''
     AND coalesce(is_active, TRUE) = TRUE
     AND merged_into IS NULL
   GROUP BY 1, 2
  HAVING COUNT(*) > 1
   ORDER BY 1, 2
$$;

-- ---------------------------------------------------------------------------
-- 2. The unique index, when it can be built
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because the app's role cannot create indexes; it only ever
-- runs this fixed statement. Returns 'exists', 'created', or
-- 'blocked: N duplicate group(s)'. Never raises.
CREATE OR REPLACE FUNCTION public.ensure_patient_hospital_number_unique()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  groups BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_patients_hospital_number_key') THEN
    RETURN 'exists';
  END IF;
  SELECT COUNT(*) INTO groups FROM public.patient_hospital_number_duplicates();
  IF groups > 0 THEN
    RETURN 'blocked: ' || groups || ' duplicate group(s)';
  END IF;
  BEGIN
    CREATE UNIQUE INDEX ux_patients_hospital_number_key
      ON public.patients (public.patient_hospital_number_scope(registered_hospital_id),
                          public.patient_hospital_number_key(hospital_number))
      WHERE public.patient_hospital_number_key(hospital_number) <> ''
        AND coalesce(is_active, TRUE) = TRUE
        AND merged_into IS NULL;
  EXCEPTION WHEN unique_violation THEN
    -- A duplicate arrived between the count and the build.
    RETURN 'blocked: duplicates appeared while building';
  END;
  RETURN 'created';
END;
$$;

-- ---------------------------------------------------------------------------
-- Lookup used by the registration forms as the number is typed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_patients_by_hospital_number(p_number TEXT, p_hospital TEXT DEFAULT '')
RETURNS TABLE (id TEXT, hospital_number TEXT, first_name TEXT, last_name TEXT, date_of_birth DATE,
               registered_hospital_id TEXT, is_active BOOLEAN, merged_into TEXT)
LANGUAGE sql STABLE
AS $$
  SELECT p.id::TEXT, p.hospital_number, p.first_name, p.last_name, p.date_of_birth::DATE,
         p.registered_hospital_id, p.is_active, p.merged_into
    FROM public.patients p
   WHERE public.patient_hospital_number_key(p_number) <> ''
     AND public.patient_hospital_number_scope(p.registered_hospital_id) = public.patient_hospital_number_scope(p_hospital)
     AND public.patient_hospital_number_key(p.hospital_number) = public.patient_hospital_number_key(p_number)
     AND coalesce(p.is_active, TRUE) = TRUE
     AND p.merged_into IS NULL
   ORDER BY p.created_at
   LIMIT 10
$$;

GRANT EXECUTE ON FUNCTION public.patient_hospital_number_key(TEXT)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patient_hospital_number_scope(TEXT)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patient_hospital_number_duplicates()           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_patient_hospital_number_unique()        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_patients_by_hospital_number(TEXT, TEXT)   TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Build the unique index now if the data allows; otherwise say why not.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  result TEXT;
BEGIN
  result := public.ensure_patient_hospital_number_unique();
  IF result LIKE 'blocked%' THEN
    RAISE NOTICE 'ux_patients_hospital_number_key not created (%). New duplicates are already refused by trg_patients_reject_duplicate_hospital_number. List the existing ones with SELECT * FROM patient_hospital_number_duplicates(); and merge them in Patients -> Duplicate Patients - the index is built after the last merge.', result;
  ELSE
    RAISE NOTICE 'ux_patients_hospital_number_key: %', result;
  END IF;
END;
$$;
