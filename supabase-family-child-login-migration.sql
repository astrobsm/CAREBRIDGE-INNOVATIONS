-- ============================================================================
-- Family App — child self-service login (username + PIN)
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql. Idempotent.
--
-- Each child can be given a username + 4–8 digit PIN. The PIN is stored as
-- a SHA-256 hex hash (computed client-side). Children sign in at
-- /family/me/login on any device and see ONLY their own tasks, wallet,
-- school reports, and awards. They can mark their tasks complete.

ALTER TABLE family.children
  ADD COLUMN IF NOT EXISTS username        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pin_hash        TEXT,
  ADD COLUMN IF NOT EXISTS can_login       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMPTZ;

-- Lowercase + unique username across all children
CREATE UNIQUE INDEX IF NOT EXISTS uq_fam_children_username
  ON family.children (lower(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fam_children_can_login
  ON family.children(can_login) WHERE can_login = TRUE;

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='family' AND table_name='children'
  AND column_name IN ('username','pin_hash','can_login','last_login_at')
ORDER BY column_name;
