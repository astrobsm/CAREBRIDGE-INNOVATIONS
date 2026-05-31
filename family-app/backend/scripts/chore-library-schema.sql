-- Chore Library: curated Nigerian-home chores tagged by age & gender
CREATE TABLE IF NOT EXISTS chore_library (
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

CREATE INDEX IF NOT EXISTS idx_chore_library_age ON chore_library(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_chore_library_gender ON chore_library(gender);
CREATE INDEX IF NOT EXISTS idx_chore_library_category ON chore_library(category);
