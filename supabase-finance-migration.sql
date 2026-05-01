-- ============================================================
-- AstroHEALTH · Finance (Part B – ZIGMA BOND port)
-- Supabase migration. Mirrors Dexie v78 finance tables.
-- All tables are multi-tenant by hospital_id and write-restricted
-- to super_admin / hospital_admin via RLS.
-- ============================================================

-- Helper: assumes a public.users table with (id text PK, role text, hospital_id text)
-- mapped to auth.uid()::text. CareBridge stores string IDs so we cast accordingly.
-- Adjust the helper functions below if your auth-to-user mapping differs.

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS public.finance_buckets (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  percentage      NUMERIC(6,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monthly_cap     NUMERIC(14,2),
  hard_stop       BOOLEAN NOT NULL DEFAULT FALSE,
  bank_account    TEXT,
  bank_name       TEXT,
  account_number  TEXT,
  account_name    TEXT,
  bank_branch     TEXT,
  bank_notes      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, name)
);

CREATE TABLE IF NOT EXISTS public.finance_income (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT NOT NULL,
  source       TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  note         TEXT,
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT NOT NULL,
  distributed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id                 TEXT PRIMARY KEY,
  hospital_id        TEXT NOT NULL,
  bucket_id          TEXT NOT NULL REFERENCES public.finance_buckets(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount             NUMERIC(14,2) NOT NULL,
  description        TEXT,
  date               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_income_id   TEXT,
  linked_expense_id  TEXT,
  linked_project_id  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT NOT NULL,
  category     TEXT NOT NULL,
  bucket_id    TEXT NOT NULL REFERENCES public.finance_buckets(id) ON DELETE RESTRICT,
  amount       NUMERIC(14,2) NOT NULL,
  description  TEXT,
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_projects (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  total_budget  NUMERIC(14,2) NOT NULL,
  funded_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','active','completed','on_hold')),
  milestones    TEXT,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_investments (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT NOT NULL,
  type         TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  roi          NUMERIC(6,2) NOT NULL DEFAULT 0,
  note         TEXT,
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_audit_logs (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT NOT NULL,
  actor        TEXT NOT NULL,
  action       TEXT NOT NULL,
  detail       TEXT,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Indexes ----------

CREATE INDEX IF NOT EXISTS idx_finance_buckets_hospital      ON public.finance_buckets(hospital_id);
CREATE INDEX IF NOT EXISTS idx_finance_income_hospital_date  ON public.finance_income(hospital_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_hospital_date      ON public.finance_transactions(hospital_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_bucket             ON public.finance_transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_hospital     ON public.finance_expenses(hospital_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_bucket       ON public.finance_expenses(bucket_id);
CREATE INDEX IF NOT EXISTS idx_finance_projects_hospital     ON public.finance_projects(hospital_id);
CREATE INDEX IF NOT EXISTS idx_finance_investments_hospital  ON public.finance_investments(hospital_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_audit_hospital_ts     ON public.finance_audit_logs(hospital_id, timestamp DESC);

-- ---------- Row-Level Security ----------

ALTER TABLE public.finance_buckets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_income        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_investments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs    ENABLE ROW LEVEL SECURITY;

-- Helper: caller's role / hospital from public.users.
-- We cast both sides to text so the migration works whether public.users.id
-- is text (CareBridge default) or uuid.
CREATE OR REPLACE FUNCTION public._finance_is_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = auth.uid()::text
      AND u.role IN ('super_admin','hospital_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public._finance_caller_hospital() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT u.hospital_id::text FROM public.users u WHERE u.id::text = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public._finance_is_super_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = auth.uid()::text AND u.role = 'super_admin'
  );
$$;

-- Generic policy generator – applied per table.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'finance_buckets',
    'finance_income',
    'finance_transactions',
    'finance_expenses',
    'finance_projects',
    'finance_investments',
    'finance_audit_logs'
  ] LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS %I_select ON public.%I;
      CREATE POLICY %I_select ON public.%I
        FOR SELECT TO authenticated
        USING (
          public._finance_is_super_admin()
          OR (public._finance_is_admin() AND hospital_id::text = public._finance_caller_hospital())
        );
    $f$, tbl, tbl, tbl, tbl);

    EXECUTE format($f$
      DROP POLICY IF EXISTS %I_modify ON public.%I;
      CREATE POLICY %I_modify ON public.%I
        FOR ALL TO authenticated
        USING (
          public._finance_is_super_admin()
          OR (public._finance_is_admin() AND hospital_id::text = public._finance_caller_hospital())
        )
        WITH CHECK (
          public._finance_is_super_admin()
          OR (public._finance_is_admin() AND hospital_id::text = public._finance_caller_hospital())
        );
    $f$, tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
