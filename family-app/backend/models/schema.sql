-- ============================================================
-- FAMILY APP - PostgreSQL Schema
-- Production-grade schema with proper normalization, indexing,
-- constraints, and relationships
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (Parents)
-- ============================================================
CREATE TABLE users (
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
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- 2. CHILDREN
-- ============================================================
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_children_parent ON children(parent_id);

-- ============================================================
-- 3. WALLETS (One per child for the payroll system)
-- ============================================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID UNIQUE NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    base_stipend DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_wallets_child ON wallets(child_id);

-- ============================================================
-- 4. TASKS
-- ============================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN (
        'chore', 'responsibility', 'academic', 'spiritual', 'health', 'other'
    )) DEFAULT 'chore',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    reward_amount DECIMAL(10, 2) DEFAULT 0.00,
    penalty_amount DECIMAL(10, 2) DEFAULT 0.00,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- daily, weekly, monthly
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_category ON tasks(category);

-- ============================================================
-- 5. TASK ASSIGNMENTS
-- ============================================================
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN (
        'pending', 'in_progress', 'completed', 'failed', 'reassigned'
    )) DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
    parent_notes TEXT,
    reassigned_to UUID REFERENCES children(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_child ON task_assignments(child_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_assignments_due ON task_assignments(due_date);

-- ============================================================
-- 6. TRANSACTIONS (Payroll / Stipend Ledger)
-- ============================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN (
        'stipend', 'bonus', 'penalty', 'transfer_in', 'transfer_out', 'adjustment'
    )) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- task_assignment, manual, monthly_stipend
    reference_id UUID,
    related_child_id UUID REFERENCES children(id), -- for transfers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_transactions_child ON transactions(child_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- ============================================================
-- 7. PLANS
-- ============================================================
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(20) CHECK (plan_type IN ('weekly', 'monthly', 'quarterly')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_plans_parent ON plans(parent_id);
CREATE INDEX idx_plans_type ON plans(plan_type);
CREATE INDEX idx_plans_dates ON plans(start_date, end_date);

-- ============================================================
-- 8. PLAN GOALS
-- ============================================================
CREATE TABLE plan_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_plan_goals_plan ON plan_goals(plan_id);
CREATE INDEX idx_plan_goals_child ON plan_goals(child_id);

-- ============================================================
-- 9. EDUCATION / SCHOOL ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) CHECK (status IN (
        'pending', 'in_progress', 'completed', 'overdue'
    )) DEFAULT 'pending',
    grade VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_assignments_child ON assignments(child_id);
CREATE INDEX idx_assignments_due ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);

-- ============================================================
-- 10. PRAYER SCHEDULES
-- ============================================================
CREATE TABLE prayer_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    scheduled_time TIME NOT NULL,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun, 6=Sat
    reminder_minutes_before INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_prayer_schedules_parent ON prayer_schedules(parent_id);

-- ============================================================
-- 11. PRAYER LOGS (Track participation)
-- ============================================================
CREATE TABLE prayer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_schedule_id UUID NOT NULL REFERENCES prayer_schedules(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    prayer_date DATE NOT NULL,
    participated BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    UNIQUE(prayer_schedule_id, child_id, prayer_date)
);

CREATE INDEX idx_prayer_logs_schedule ON prayer_logs(prayer_schedule_id);
CREATE INDEX idx_prayer_logs_child ON prayer_logs(child_id);
CREATE INDEX idx_prayer_logs_date ON prayer_logs(prayer_date);

-- ============================================================
-- 12. EVENTS & ANNIVERSARIES
-- ============================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) CHECK (event_type IN (
        'birthday', 'baptism', 'anniversary', 'holiday', 'medical', 'school', 'other'
    )) DEFAULT 'other',
    event_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_events_parent ON events(parent_id);
CREATE INDEX idx_events_child ON events(child_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(event_type);

-- ============================================================
-- 13. GROWTH RECORDS (Monthly tracking)
-- ============================================================
CREATE TABLE growth_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES users(id),
    record_date DATE NOT NULL,
    weight_kg DECIMAL(5, 2),
    height_cm DECIMAL(5, 2),
    bmi DECIMAL(5, 2), -- Auto-calculated
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_growth_records_child ON growth_records(child_id);
CREATE INDEX idx_growth_records_date ON growth_records(record_date);

-- ============================================================
-- 14. HEALTH RECORDS
-- ============================================================
CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_health_records_child ON health_records(child_id);
CREATE INDEX idx_health_records_date ON health_records(record_date);

-- ============================================================
-- 15. SYNC LOG (For offline-first conflict resolution)
-- ============================================================
CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) CHECK (action IN ('create', 'update', 'delete')) NOT NULL,
    payload JSONB,
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(255),
    is_processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sync_log_user ON sync_log(user_id);
CREATE INDEX idx_sync_log_table ON sync_log(table_name);
CREATE INDEX idx_sync_log_processed ON sync_log(is_processed);
CREATE INDEX idx_sync_log_timestamp ON sync_log(server_timestamp);

-- ============================================================
-- 16. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50) CHECK (type IN (
        'task', 'prayer', 'event', 'assignment', 'payroll', 'health', 'system'
    )) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()',
            t, t);
    END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: Auto-calculate BMI on growth record insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
        NEW.bmi = ROUND((NEW.weight_kg / ((NEW.height_cm / 100.0) * (NEW.height_cm / 100.0)))::numeric, 2);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_bmi_trigger
BEFORE INSERT OR UPDATE ON growth_records
FOR EACH ROW
EXECUTE FUNCTION calculate_bmi();

-- ============================================================
-- 17. HOUSE CHORES (2-week rotation schedules)
-- ============================================================
CREATE TABLE IF NOT EXISTS chore_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_chore_schedules_parent ON chore_schedules(parent_id);
CREATE INDEX IF NOT EXISTS idx_chore_schedules_dates ON chore_schedules(start_date, end_date);

-- ============================================================
-- 18. CHORE ITEMS (Individual chores within a schedule)
-- ============================================================
CREATE TABLE IF NOT EXISTS chore_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES chore_schedules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🧹',
    points INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_chore_items_schedule ON chore_items(schedule_id);

-- ============================================================
-- 19. CHORE ASSIGNMENTS (Assign chore items to children)
-- ============================================================
CREATE TABLE IF NOT EXISTS chore_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_item_id UUID NOT NULL REFERENCES chore_items(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore ON chore_assignments(chore_item_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_child ON chore_assignments(child_id);

-- ============================================================
-- 20. DAILY CHORE LOGS (Daily completion assessment)
-- ============================================================
CREATE TABLE IF NOT EXISTS chore_daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_assignment_id UUID NOT NULL REFERENCES chore_assignments(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'partial', 'skipped')) DEFAULT 'pending',
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    parent_comment TEXT,
    assessed_by UUID REFERENCES users(id),
    assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chore_assignment_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_chore_daily_logs_assignment ON chore_daily_logs(chore_assignment_id);
CREATE INDEX IF NOT EXISTS idx_chore_daily_logs_date ON chore_daily_logs(log_date);
