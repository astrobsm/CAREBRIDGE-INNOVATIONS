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

CREATE TABLE IF NOT EXISTS chore_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_item_id UUID NOT NULL REFERENCES chore_items(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_chore_schedules_parent ON chore_schedules(parent_id);
CREATE INDEX IF NOT EXISTS idx_chore_schedules_dates ON chore_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_chore_items_schedule ON chore_items(schedule_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore ON chore_assignments(chore_item_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_child ON chore_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_chore_daily_logs_assignment ON chore_daily_logs(chore_assignment_id);
CREATE INDEX IF NOT EXISTS idx_chore_daily_logs_date ON chore_daily_logs(log_date);
