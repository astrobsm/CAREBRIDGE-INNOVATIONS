-- ============================================================
-- AstroHEALTH × Family App (Part C) — SUPABASE MIGRATION
-- Full Family App schema isolated in the `family` Postgres schema
-- so it cannot conflict with AstroHEALTH's `users`, `tasks`, etc.
--
-- Run in Supabase SQL Editor.  Safe to re-run (idempotent).
--
-- Once applied, point the Family Express backend at Supabase by
-- setting in backend/.env:
--   DB_HOST=aws-0-<region>.pooler.supabase.com
--   DB_PORT=6543
--   DB_NAME=postgres
--   DB_USER=postgres.<project-ref>
--   DB_PASSWORD=<your-supabase-db-password>
-- The backend's config/db.js now SETs search_path to family.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS family;

-- ============================================================
-- 1. USERS (Parents)
-- ============================================================
CREATE TABLE IF NOT EXISTS family.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    astrohealth_user_id TEXT
);
ALTER TABLE family.users ADD COLUMN IF NOT EXISTS astrohealth_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_fam_users_email ON family.users(email);
CREATE INDEX IF NOT EXISTS idx_fam_users_astro ON family.users(astrohealth_user_id);

-- ============================================================
-- 2. CHILDREN
-- ============================================================
CREATE TABLE IF NOT EXISTS family.children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_children_parent ON family.children(parent_id);

-- ============================================================
-- 3. WALLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID UNIQUE NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    base_stipend DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_wallets_child ON family.wallets(child_id);

-- ============================================================
-- 4. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('chore','responsibility','academic','spiritual','health','other')) DEFAULT 'chore',
    priority VARCHAR(20) CHECK (priority IN ('low','medium','high','critical')) DEFAULT 'medium',
    reward_amount DECIMAL(10, 2) DEFAULT 0.00,
    penalty_amount DECIMAL(10, 2) DEFAULT 0.00,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_tasks_parent ON family.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_tasks_category ON family.tasks(category);

-- ============================================================
-- 5. TASK ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES family.tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES family.users(id),
    status VARCHAR(20) CHECK (status IN ('pending','in_progress','completed','failed','reassigned')) DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
    parent_notes TEXT,
    reassigned_to UUID REFERENCES family.children(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_ta_task ON family.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_fam_ta_child ON family.task_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_ta_status ON family.task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_fam_ta_due ON family.task_assignments(due_date);

-- ============================================================
-- 6. TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES family.wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('stipend','bonus','penalty','transfer_in','transfer_out','adjustment')) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    related_child_id UUID REFERENCES family.children(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES family.users(id)
);
CREATE INDEX IF NOT EXISTS idx_fam_tx_child ON family.transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_tx_wallet ON family.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_fam_tx_type ON family.transactions(type);
CREATE INDEX IF NOT EXISTS idx_fam_tx_created ON family.transactions(created_at);

-- ============================================================
-- 7. PLANS / 8. PLAN GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(20) CHECK (plan_type IN ('weekly','monthly','quarterly')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft','active','completed','archived')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_plans_parent ON family.plans(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_plans_type ON family.plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_fam_plans_dates ON family.plans(start_date, end_date);

CREATE TABLE IF NOT EXISTS family.plan_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES family.plans(id) ON DELETE CASCADE,
    child_id UUID REFERENCES family.children(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    linked_task_id UUID REFERENCES family.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_pg_plan ON family.plan_goals(plan_id);
CREATE INDEX IF NOT EXISTS idx_fam_pg_child ON family.plan_goals(child_id);

-- ============================================================
-- 9. SCHOOL ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES family.users(id),
    subject VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) CHECK (status IN ('pending','in_progress','completed','overdue')) DEFAULT 'pending',
    grade VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_assign_child ON family.assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_assign_due ON family.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_fam_assign_status ON family.assignments(status);

-- ============================================================
-- 10. PRAYER SCHEDULES / 11. PRAYER LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.prayer_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    scheduled_time TIME NOT NULL,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
    reminder_minutes_before INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_ps_parent ON family.prayer_schedules(parent_id);

CREATE TABLE IF NOT EXISTS family.prayer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_schedule_id UUID NOT NULL REFERENCES family.prayer_schedules(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    prayer_date DATE NOT NULL,
    participated BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    UNIQUE(prayer_schedule_id, child_id, prayer_date)
);
CREATE INDEX IF NOT EXISTS idx_fam_pl_schedule ON family.prayer_logs(prayer_schedule_id);
CREATE INDEX IF NOT EXISTS idx_fam_pl_child ON family.prayer_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_pl_date ON family.prayer_logs(prayer_date);

-- ============================================================
-- 12. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES family.children(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) CHECK (event_type IN ('birthday','baptism','anniversary','holiday','medical','school','other')) DEFAULT 'other',
    event_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_events_parent ON family.events(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_events_child ON family.events(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_events_date ON family.events(event_date);
CREATE INDEX IF NOT EXISTS idx_fam_events_type ON family.events(event_type);

-- ============================================================
-- 13. GROWTH RECORDS / 14. HEALTH RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.growth_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES family.users(id),
    record_date DATE NOT NULL,
    weight_kg DECIMAL(5, 2),
    height_cm DECIMAL(5, 2),
    bmi DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_gr_child ON family.growth_records(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_gr_date ON family.growth_records(record_date);

CREATE TABLE IF NOT EXISTS family.health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES family.users(id),
    record_date DATE NOT NULL,
    illness VARCHAR(255) NOT NULL,
    symptoms TEXT,
    treatment TEXT,
    doctor_name VARCHAR(255),
    hospital VARCHAR(255),
    follow_up_date DATE,
    is_resolved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_hr_child ON family.health_records(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_hr_date ON family.health_records(record_date);

-- ============================================================
-- 15. SYNC LOG / 16. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS family.sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) CHECK (action IN ('create','update','delete')) NOT NULL,
    payload JSONB,
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(255),
    is_processed BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_fam_sl_user ON family.sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fam_sl_table ON family.sync_log(table_name);
CREATE INDEX IF NOT EXISTS idx_fam_sl_processed ON family.sync_log(is_processed);
CREATE INDEX IF NOT EXISTS idx_fam_sl_timestamp ON family.sync_log(server_timestamp);

CREATE TABLE IF NOT EXISTS family.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50) CHECK (type IN ('task','prayer','event','assignment','payroll','health','system')) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_notif_user ON family.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_fam_notif_read ON family.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_fam_notif_scheduled ON family.notifications(scheduled_for);

-- ============================================================
-- 17-20. CHORES (UUID variant — matches create_chores.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS family.chore_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active','completed','cancelled')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_cs_parent ON family.chore_schedules(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_cs_dates ON family.chore_schedules(start_date, end_date);

CREATE TABLE IF NOT EXISTS family.chore_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES family.chore_schedules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🧹',
    points INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_ci_schedule ON family.chore_items(schedule_id);

CREATE TABLE IF NOT EXISTS family.chore_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_item_id UUID NOT NULL REFERENCES family.chore_items(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES family.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_ca_chore ON family.chore_assignments(chore_item_id);
CREATE INDEX IF NOT EXISTS idx_fam_ca_child ON family.chore_assignments(child_id);

CREATE TABLE IF NOT EXISTS family.chore_daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_assignment_id UUID NOT NULL REFERENCES family.chore_assignments(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending','completed','partial','skipped')) DEFAULT 'pending',
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    parent_comment TEXT,
    assessed_by UUID REFERENCES family.users(id),
    assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chore_assignment_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_fam_cdl_assignment ON family.chore_daily_logs(chore_assignment_id);
CREATE INDEX IF NOT EXISTS idx_fam_cdl_date ON family.chore_daily_logs(log_date);

-- ============================================================
-- 21-27. BOARDING SCHOOL MODULE (SERIAL ints from boarding-schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS family.routines (
    id SERIAL PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES family.children(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fam_routines_parent ON family.routines(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_routines_child ON family.routines(child_id);

CREATE TABLE IF NOT EXISTS family.checklists (
    id SERIAL PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS family.checklist_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES family.checklists(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    payout_per_item NUMERIC(10,2) DEFAULT 0,
    requires_photo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fam_cli_checklist ON family.checklist_items(checklist_id);

CREATE TABLE IF NOT EXISTS family.routine_events (
    id SERIAL PRIMARY KEY,
    routine_id INTEGER NOT NULL REFERENCES family.routines(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    icon VARCHAR(20) DEFAULT 'clock',
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    category VARCHAR(50) DEFAULT 'alarm',
    checklist_id INTEGER REFERENCES family.checklists(id) ON DELETE SET NULL,
    payout NUMERIC(10,2) DEFAULT 0,
    on_time_bonus_pct INTEGER DEFAULT 50,
    late_penalty_pct INTEGER DEFAULT 50,
    alarm_sound VARCHAR(50) DEFAULT 'bell',
    requires_proof BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    expected_duration_minutes INT
);
ALTER TABLE family.routine_events ADD COLUMN IF NOT EXISTS expected_duration_minutes INT;
CREATE INDEX IF NOT EXISTS idx_fam_re_routine ON family.routine_events(routine_id);

CREATE TABLE IF NOT EXISTS family.routine_logs (
    id SERIAL PRIMARY KEY,
    routine_event_id INTEGER NOT NULL REFERENCES family.routine_events(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    on_time BOOLEAN,
    payout_earned NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    verified_by_parent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    duration_seconds INT,
    quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
    speed_rating SMALLINT CHECK (speed_rating BETWEEN 1 AND 5),
    UNIQUE(routine_event_id, child_id, log_date)
);
ALTER TABLE family.routine_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE family.routine_logs ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE family.routine_logs ADD COLUMN IF NOT EXISTS quality_rating SMALLINT;
ALTER TABLE family.routine_logs ADD COLUMN IF NOT EXISTS speed_rating SMALLINT;
CREATE INDEX IF NOT EXISTS idx_fam_rl_child_date ON family.routine_logs(child_id, log_date);
CREATE INDEX IF NOT EXISTS idx_fam_rl_status ON family.routine_logs(status);

CREATE TABLE IF NOT EXISTS family.checklist_logs (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER REFERENCES family.routine_logs(id) ON DELETE CASCADE,
    checklist_item_id INTEGER NOT NULL REFERENCES family.checklist_items(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    checked BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP,
    verified_by_parent BOOLEAN DEFAULT FALSE,
    payout_earned NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    UNIQUE(checklist_item_id, child_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_fam_cll_child_date ON family.checklist_logs(child_id, log_date);

CREATE TABLE IF NOT EXISTS family.buckets (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    allocation_pct INTEGER DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    color VARCHAR(20) DEFAULT '#3498db',
    icon VARCHAR(20) DEFAULT 'bucket',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    UNIQUE(child_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fam_buckets_child ON family.buckets(child_id);

CREATE TABLE IF NOT EXISTS family.bucket_transactions (
    id SERIAL PRIMARY KEY,
    bucket_id INTEGER NOT NULL REFERENCES family.buckets(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference VARCHAR(200),
    created_by UUID REFERENCES family.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fam_bt_bucket ON family.bucket_transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_fam_bt_child ON family.bucket_transactions(child_id);

CREATE TABLE IF NOT EXISTS family.activity_logs (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES family.users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_ref_id INTEGER,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL,
    points INTEGER DEFAULT 0,
    payout NUMERIC(10,2) DEFAULT 0,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fam_al_child ON family.activity_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_al_date ON family.activity_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_fam_al_type ON family.activity_logs(activity_type);

CREATE TABLE IF NOT EXISTS family.performance_records (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(20),
    points INTEGER DEFAULT 0,
    bonus_payout NUMERIC(10,2) DEFAULT 0,
    period_start DATE,
    period_end DATE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fam_pr_child ON family.performance_records(child_id);

-- ============================================================
-- 28. NEEDS LOG / 29. FAMILY EVENTS (v3)
-- ============================================================
CREATE TABLE IF NOT EXISTS family.needs_log (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES family.children(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    category VARCHAR(40) DEFAULT 'general',
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_cost NUMERIC(10,2) DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'requested',
    bucket_id INT REFERENCES family.buckets(id) ON DELETE SET NULL,
    fulfilled_at TIMESTAMP,
    actual_cost NUMERIC(10,2),
    notes TEXT,
    requested_by VARCHAR(20) DEFAULT 'parent',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_needs_child ON family.needs_log(child_id);
CREATE INDEX IF NOT EXISTS idx_fam_needs_status ON family.needs_log(status);

CREATE TABLE IF NOT EXISTS family.family_events (
    id SERIAL PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES family.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(40) NOT NULL DEFAULT 'outing',
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP,
    location VARCHAR(300),
    budget NUMERIC(10,2) DEFAULT 0,
    recurrence VARCHAR(20) DEFAULT 'none',
    icon VARCHAR(20),
    color VARCHAR(20) DEFAULT '#9b59b6',
    status VARCHAR(20) DEFAULT 'planned',
    attendees UUID[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_fe_parent ON family.family_events(parent_id);
CREATE INDEX IF NOT EXISTS idx_fam_fe_start ON family.family_events(start_at);

-- ============================================================
-- 30. CHORE LIBRARY
-- ============================================================
CREATE TABLE IF NOT EXISTS family.chore_library (
    id SERIAL PRIMARY KEY,
    code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(40) NOT NULL,
    icon VARCHAR(10) DEFAULT '🧹',
    min_age SMALLINT NOT NULL DEFAULT 3,
    max_age SMALLINT NOT NULL DEFAULT 18,
    gender VARCHAR(10) NOT NULL DEFAULT 'any' CHECK (gender IN ('any','male','female')),
    default_points INT NOT NULL DEFAULT 5,
    default_duration_minutes INT NOT NULL DEFAULT 15,
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','weekend','biweekly','monthly','adhoc')),
    suggested_day VARCHAR(20),
    suggested_time TIME,
    steps TEXT[],
    supplies_needed TEXT,
    safety_notes TEXT,
    nigerian_context TEXT,
    difficulty SMALLINT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fam_lib_age ON family.chore_library(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_fam_lib_gender ON family.chore_library(gender);
CREATE INDEX IF NOT EXISTS idx_fam_lib_category ON family.chore_library(category);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION family.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at' AND table_schema = 'family'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON family.%I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON family.%I FOR EACH ROW EXECUTE FUNCTION family.update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION family.calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
        NEW.bmi = ROUND((NEW.weight_kg / ((NEW.height_cm / 100.0) * (NEW.height_cm / 100.0)))::numeric, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_bmi_trigger ON family.growth_records;
CREATE TRIGGER calculate_bmi_trigger
BEFORE INSERT OR UPDATE ON family.growth_records
FOR EACH ROW EXECUTE FUNCTION family.calculate_bmi();

-- ============================================================
-- RLS — public_access matches AstroHEALTH pattern (Supabase
-- anon key fronted by the Family Express backend; tighten later
-- if you ever expose family.* directly to the browser).
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'family' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE family.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "public_access" ON family.%I', t);
        EXECUTE format('CREATE POLICY "public_access" ON family.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END;
$$;

-- Grant schema access to the anon and authenticated roles
GRANT USAGE ON SCHEMA family TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA family TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA family TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA family GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA family GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

SELECT 'family.* schema OK — tables: ' || COUNT(*)::text AS result
FROM information_schema.tables WHERE table_schema = 'family';
