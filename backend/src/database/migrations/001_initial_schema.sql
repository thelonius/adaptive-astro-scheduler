-- Initial Database Schema for Adaptive Astro-Scheduler
-- Supports: Users, Natal Charts, Custom Rules, Activity Outcomes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  telegram_id BIGINT UNIQUE,
  username VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_telegram_id ON users(telegram_id) WHERE telegram_id IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- NATAL CHARTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS natal_charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'My Chart',

  -- Birth Data
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  birth_location JSONB NOT NULL, -- { latitude, longitude, timezone, placeName }

  -- Calculated Data
  planets JSONB NOT NULL, -- Array of planet positions
  houses JSONB NOT NULL, -- Array of house cusps
  aspects JSONB NOT NULL, -- Array of aspects
  lunar_day JSONB, -- Lunar day information
  moon_phase VARCHAR(50),

  -- Metadata
  house_system VARCHAR(20) DEFAULT 'placidus',
  calculation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- For users without accounts, allow NULL user_id but require unique constraint
  CONSTRAINT natal_charts_user_name_unique UNIQUE NULLS NOT DISTINCT (user_id, name)
);

CREATE INDEX idx_natal_charts_user_id ON natal_charts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_natal_charts_birth_date ON natal_charts(birth_date);
CREATE INDEX idx_natal_charts_created_at ON natal_charts(created_at);

-- ============================================================================
-- CUSTOM RULES TABLE (for future LLM-generated rules)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  rule_name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- e.g., 'health', 'business', 'relationships'
  description TEXT,

  -- Rule Logic
  condition_code TEXT NOT NULL, -- JavaScript/TypeScript code for evaluation
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_custom_rules_user_id ON custom_rules(user_id);
CREATE INDEX idx_custom_rules_category ON custom_rules(category);
CREATE INDEX idx_custom_rules_is_active ON custom_rules(is_active);

-- ============================================================================
-- ACTIVITY OUTCOMES TABLE (for feedback loop)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  activity_type VARCHAR(100) NOT NULL, -- e.g., 'surgery', 'meeting', 'travel'
  activity_date DATE NOT NULL,
  activity_time TIME,

  -- Outcome
  outcome_rating INTEGER CHECK (outcome_rating BETWEEN 1 AND 5), -- 1=bad, 5=excellent
  outcome_notes TEXT,

  -- Context (captured at time of activity)
  day_strength FLOAT, -- Calculated score from layers
  active_layers JSONB, -- Which layers were active
  planetary_positions JSONB, -- Snapshot of planets at that time

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_outcomes_user_id ON activity_outcomes(user_id);
CREATE INDEX idx_activity_outcomes_activity_date ON activity_outcomes(activity_date);
CREATE INDEX idx_activity_outcomes_activity_type ON activity_outcomes(activity_type);
CREATE INDEX idx_activity_outcomes_outcome_rating ON activity_outcomes(outcome_rating);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_natal_charts_updated_at BEFORE UPDATE ON natal_charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_rules_updated_at BEFORE UPDATE ON custom_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_outcomes_updated_at BEFORE UPDATE ON activity_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================
-- Create a default guest user for anonymous natal charts
INSERT INTO users (id, username, email, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'guest',
  NULL,
  '{"is_guest": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
