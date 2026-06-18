-- ============================================================================
-- Deduplicate the users table (removes the ~60 duplicate accounts, e.g.
-- douglas@carebridge.edu.ng, that were created with random UUIDs on every
-- fresh device / cleared-storage session before the deterministic-ID fix).
--
-- HOW IT WORKS
--   For each email, ONE canonical row is kept (the earliest created_at).
--   All other rows for that email are removed.
--
-- SAFETY
--   1. Run STEP 1 first to PREVIEW exactly which rows will be kept/deleted.
--   2. Only run STEP 2 (the delete) once you are happy with the preview.
--   3. STEP 2 is wrapped in a transaction — if anything looks wrong, ROLLBACK.
--   4. If other tables store user IDs as enforced foreign keys, repoint them
--      first (see the optional STEP 1b mapping) — otherwise those columns just
--      keep a stale id string, which is harmless for display-only references.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1 — PREVIEW: how many duplicates exist per email
-- ----------------------------------------------------------------------------
SELECT email,
       COUNT(*)                       AS total_rows,
       COUNT(*) - 1                   AS rows_to_delete,
       MIN(created_at)                AS kept_created_at
FROM   public.users
GROUP  BY email
HAVING COUNT(*) > 1
ORDER  BY total_rows DESC;

-- ----------------------------------------------------------------------------
-- STEP 1b (OPTIONAL) — mapping of every duplicate id -> the canonical id it
-- will be merged into. Use this if you need to repoint foreign keys in other
-- tables BEFORE deleting (e.g. created_by, doctor_id, recorded_by, user_id).
-- ----------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         email,
         FIRST_VALUE(id) OVER (
           PARTITION BY email ORDER BY created_at ASC, id ASC
         ) AS canonical_id
  FROM   public.users
)
SELECT email, id AS duplicate_id, canonical_id
FROM   ranked
WHERE  id <> canonical_id
ORDER  BY email;

-- ----------------------------------------------------------------------------
-- STEP 2 — DELETE the duplicates (keeps the earliest row per email).
-- Review the preview above, then run this block. ROLLBACK instead of COMMIT
-- if the affected row count is not what you expect.
-- ----------------------------------------------------------------------------
BEGIN;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY email ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM   public.users
)
DELETE FROM public.users u
USING  ranked r
WHERE  u.id = r.id
  AND  r.rn > 1;

-- Verify: there should now be exactly one row per email.
SELECT email, COUNT(*) AS rows
FROM   public.users
GROUP  BY email
HAVING COUNT(*) > 1;
-- ^ This SELECT should return ZERO rows. If it does, COMMIT. Otherwise ROLLBACK.

COMMIT;
-- ROLLBACK;  -- <-- use this instead of COMMIT if anything looks wrong
