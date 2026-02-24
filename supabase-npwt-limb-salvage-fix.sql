-- ============================================================
-- Migration: Fix missing columns for npwt_sessions and limb_salvage_assessments
-- Date: 2026-02-24
-- Purpose: Add columns that exist in IndexedDB but not in Supabase,
--          fixing CloudSync 400 errors (PGRST204)
-- ============================================================

-- =============================
-- NPWT_SESSIONS - Missing columns
-- =============================

-- Machine/Timer
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS machine_code TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS timer_code TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS pressure_setting INTEGER;

-- Wound classification
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS wound_class TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS dimensions JSONB;

-- Materials & consumables (CRITICAL - these cause sync failures)
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS agents_used JSONB;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS cleaning_agents JSONB;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS materials JSONB;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS consumables JSONB;

-- Session tracking
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

-- Progress tracking
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS image_base64 TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS wound_condition TEXT;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS granulation_percent INTEGER;

-- Clinical notes (separate from 'notes')
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;

-- Sync tracking
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;
ALTER TABLE npwt_sessions ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- =============================
-- LIMB_SALVAGE_ASSESSMENTS - Missing columns
-- =============================

-- Wound shape and multi-wound support
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wound_shape TEXT;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS wounds JSONB DEFAULT '[]';

-- Special instructions
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Follow-up date
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;

-- Sync tracking
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;
ALTER TABLE limb_salvage_assessments ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- =============================
-- Notify PostgREST to refresh schema cache
-- =============================
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- Done! Missing columns added to both tables
-- ==========================================
