-- ============================================================
-- Migration: Add missing columns to surgeries and treatment_plans
-- Date: 2026-02-19
-- Purpose: Fix CloudSync 400 errors (PGRST204) for columns that
--          exist in the local IndexedDB schema but not in Supabase
-- ============================================================

-- =============================
-- SURGERIES TABLE - Add missing columns
-- =============================

-- outstanding_items: tracks preparation items needed before surgery
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS outstanding_items JSONB DEFAULT '[]';

-- surgeon_id: User ID for billing/assignment
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_id TEXT;

-- surgeon_fee: Fee charged for surgeon
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS surgeon_fee DECIMAL;

-- assistant_id: User ID of surgeon assistant for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_id TEXT;

-- assistant_fee_percentage: Typically 20% of surgeon fee
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee_percentage DECIMAL;

-- assistant_fee: Calculated assistant fee
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS assistant_fee DECIMAL;

-- anaesthetist_id: User ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anaesthetist_id TEXT;

-- scrub_nurse_id: User ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS scrub_nurse_id TEXT;

-- circulating_nurse_id: User ID for billing
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS circulating_nurse_id TEXT;

-- synced: sync tracking flag
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT FALSE;

-- deleted: soft delete flag
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- =============================
-- TREATMENT_PLANS TABLE - Add missing columns
-- =============================

-- linked_prescription_ids: IDs of linked prescriptions
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS linked_prescription_ids JSONB DEFAULT '[]';

-- linked_investigation_ids: IDs of linked investigations
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS linked_investigation_ids JSONB DEFAULT '[]';

-- procedures: treatment plan procedures
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS procedures JSONB DEFAULT '[]';

-- implementation_logs: logs of treatment implementation
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS implementation_logs JSONB DEFAULT '[]';

-- plan_name: name of the treatment plan
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- diagnosis: associated diagnosis
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS diagnosis TEXT;

-- plan_type: type of treatment plan (e.g., surgical, wound_care, etc.)
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS plan_type TEXT;

-- priority: plan priority level
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'routine';

-- treatment_goals: goals for the treatment
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS treatment_goals JSONB DEFAULT '[]';

-- expected_outcomes: expected treatment outcomes
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS expected_outcomes JSONB DEFAULT '[]';

-- target_completion_date: target date for plan completion
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS target_completion_date TIMESTAMPTZ;

-- actual_completion_date: actual completion date
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMPTZ;

-- primary_surgeon_id: assigned primary surgeon
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS primary_surgeon_id TEXT;

-- assisting_surgeon_id: assigned assisting surgeon
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS assisting_surgeon_id TEXT;

-- responsible_resident_id: assigned resident
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS responsible_resident_id TEXT;

-- ai_recommendations: AI-generated recommendations
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS ai_recommendations JSONB;

-- risk_assessment: risk assessment data
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS risk_assessment JSONB;

-- deleted: soft delete flag
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- synced: sync tracking flag
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT FALSE;

-- admission_id: linked admission
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS admission_id TEXT;

-- =============================
-- Notify PostgREST to refresh schema cache
-- =============================
NOTIFY pgrst, 'reload schema';
