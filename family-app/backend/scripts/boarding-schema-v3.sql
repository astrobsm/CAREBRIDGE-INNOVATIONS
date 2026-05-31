-- Boarding v3: timing/quality + needs log + family events
-- Run with: psql -U postgres -d family_app -f boarding-schema-v3.sql

-- Add timing/quality fields to routine_logs
ALTER TABLE routine_logs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS duration_seconds INT,
  ADD COLUMN IF NOT EXISTS quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS speed_rating SMALLINT CHECK (speed_rating BETWEEN 1 AND 5);

-- Add an expected_duration_minutes column on events so we can rate speed
ALTER TABLE routine_events
  ADD COLUMN IF NOT EXISTS expected_duration_minutes INT;

-- Needs / wishlist log: child or parent records something needed
CREATE TABLE IF NOT EXISTS needs_log (
  id SERIAL PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(40) DEFAULT 'general',
    -- toiletry/clothing/shoes/school/stationery/snack/grooming/general
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal',
    -- low/normal/high/urgent
  status VARCHAR(20) DEFAULT 'requested',
    -- requested/approved/purchased/rejected
  bucket_id INT REFERENCES buckets(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMP,
  actual_cost NUMERIC(10,2),
  notes TEXT,
  requested_by VARCHAR(20) DEFAULT 'parent',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_needs_child ON needs_log(child_id);
CREATE INDEX IF NOT EXISTS idx_needs_status ON needs_log(status);

-- Family events: outings, parties, relations visits
CREATE TABLE IF NOT EXISTS family_events (
  id SERIAL PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(40) NOT NULL DEFAULT 'outing',
    -- outing/house_party/relation_visit/birthday/holiday/other
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP,
  location VARCHAR(300),
  budget NUMERIC(10,2) DEFAULT 0,
  recurrence VARCHAR(20) DEFAULT 'none',
    -- none/weekly/monthly/yearly
  icon VARCHAR(20),
  color VARCHAR(20) DEFAULT '#9b59b6',
  status VARCHAR(20) DEFAULT 'planned',
    -- planned/confirmed/done/cancelled
  attendees UUID[] DEFAULT '{}', -- child ids participating
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_events_parent ON family_events(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_events_start ON family_events(start_at);
