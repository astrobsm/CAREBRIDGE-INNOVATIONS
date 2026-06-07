-- ============================================================================
-- Family App — wallet auto-split into Savings / Personal / Charity buckets
-- ============================================================================
-- Run AFTER supabase-family-app-migration.sql. Idempotent.
--
-- Every credit (stipend, routine reward, task bonus, manual parent credit)
-- is split per the wallet's configured percentages (default 60/30/10):
--   * savings_balance  — locked, parent-only withdrawal
--   * personal_balance — child can spend; penalties debit from here
--   * charity_balance  — child chooses when & how to donate
--
-- Total balance = savings + personal + charity (we keep `balance` in sync
-- for backwards compat).

-- ---- 1. Add bucket + split-config columns to wallets ----------------------
ALTER TABLE family.wallets
  ADD COLUMN IF NOT EXISTS savings_balance     NUMERIC(12,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS personal_balance    NUMERIC(12,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS charity_balance     NUMERIC(12,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS split_savings_pct   INT DEFAULT 60 NOT NULL,
  ADD COLUMN IF NOT EXISTS split_personal_pct  INT DEFAULT 30 NOT NULL,
  ADD COLUMN IF NOT EXISTS split_charity_pct   INT DEFAULT 10 NOT NULL;

-- Enforce splits sum to 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_split_sum_chk'
  ) THEN
    ALTER TABLE family.wallets
      ADD CONSTRAINT wallets_split_sum_chk
      CHECK (split_savings_pct + split_personal_pct + split_charity_pct = 100);
  END IF;
END $$;

-- Backfill existing wallets: if buckets are all zero but balance > 0,
-- place the full balance into personal (most permissive for legacy data).
UPDATE family.wallets
SET personal_balance = balance
WHERE (savings_balance + personal_balance + charity_balance) = 0
  AND balance > 0;

-- ---- 2. Tag transactions with bucket --------------------------------------
ALTER TABLE family.transactions
  ADD COLUMN IF NOT EXISTS bucket TEXT;
-- bucket values: 'savings' | 'personal' | 'charity' | 'total' (pre-split summary)

CREATE INDEX IF NOT EXISTS idx_fam_tx_bucket ON family.transactions(bucket);

-- ---- 3. Add charity_donation as a valid type ------------------------------
-- Existing constraint (if present) limits type. Replace with new list.
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
    WHERE conrelid = 'family.transactions'::regclass
      AND contype  = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE family.transactions DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE family.transactions
    ADD CONSTRAINT transactions_type_chk
    CHECK (type IN (
      'stipend','bonus','penalty','transfer_in','transfer_out',
      'adjustment','charity_donation','savings_withdrawal'
    ));
END $$;

-- ---- 4. Verification -------------------------------------------------------
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='family' AND table_name='wallets'
  AND column_name IN (
    'savings_balance','personal_balance','charity_balance',
    'split_savings_pct','split_personal_pct','split_charity_pct'
  )
ORDER BY column_name;

SELECT column_name FROM information_schema.columns
WHERE table_schema='family' AND table_name='transactions' AND column_name='bucket';
