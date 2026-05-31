-- BOARDING SCHOOL MODULE - applied 2026-05-30
-- NOTE: users.id and children.id are UUID in this database
CREATE TABLE IF NOT EXISTS routines (
  id SERIAL PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_routines_parent ON routines(parent_id);
CREATE INDEX IF NOT EXISTS idx_routines_child ON routines(child_id);

CREATE TABLE IF NOT EXISTS checklists (
  id SERIAL PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  label VARCHAR(200) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  payout_per_item NUMERIC(10,2) DEFAULT 0,
  requires_photo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);

CREATE TABLE IF NOT EXISTS routine_events (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(20) DEFAULT 'clock',
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  category VARCHAR(50) DEFAULT 'alarm',
  checklist_id INTEGER REFERENCES checklists(id) ON DELETE SET NULL,
  payout NUMERIC(10,2) DEFAULT 0,
  on_time_bonus_pct INTEGER DEFAULT 50,
  late_penalty_pct INTEGER DEFAULT 50,
  alarm_sound VARCHAR(50) DEFAULT 'bell',
  requires_proof BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_routine_events_routine ON routine_events(routine_id);

CREATE TABLE IF NOT EXISTS routine_logs (
  id SERIAL PRIMARY KEY,
  routine_event_id INTEGER NOT NULL REFERENCES routine_events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  on_time BOOLEAN,
  payout_earned NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  verified_by_parent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(routine_event_id, child_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_routine_logs_child_date ON routine_logs(child_id, log_date);
CREATE INDEX IF NOT EXISTS idx_routine_logs_status ON routine_logs(status);

CREATE TABLE IF NOT EXISTS checklist_logs (
  id SERIAL PRIMARY KEY,
  routine_log_id INTEGER REFERENCES routine_logs(id) ON DELETE CASCADE,
  checklist_item_id INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMP,
  verified_by_parent BOOLEAN DEFAULT FALSE,
  payout_earned NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  UNIQUE(checklist_item_id, child_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_checklist_logs_child_date ON checklist_logs(child_id, log_date);

CREATE TABLE IF NOT EXISTS buckets (
  id SERIAL PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_buckets_child ON buckets(child_id);

CREATE TABLE IF NOT EXISTS bucket_transactions (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  reference VARCHAR(200),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bucket_tx_bucket ON bucket_transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bucket_tx_child ON bucket_transactions(child_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_ref_id INTEGER,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  points INTEGER DEFAULT 0,
  payout NUMERIC(10,2) DEFAULT 0,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_child ON activity_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);

CREATE TABLE IF NOT EXISTS performance_records (
  id SERIAL PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_perf_records_child ON performance_records(child_id);
