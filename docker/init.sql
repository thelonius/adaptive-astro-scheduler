-- Database initialization script for Adaptive Astro Scheduler
-- Creates tables for users and natal charts

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Natal charts table
CREATE TABLE IF NOT EXISTS natal_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Chart',
    birth_date TIMESTAMP WITH TIME ZONE NOT NULL,
    birth_time TIME NOT NULL,
    birth_location JSONB NOT NULL, -- {latitude, longitude, timezone, placeName}
    planets JSONB NOT NULL,
    houses JSONB NOT NULL,
    aspects JSONB NOT NULL,
    lunar_day JSONB,
    moon_phase VARCHAR(50),
    house_system VARCHAR(20) DEFAULT 'placidus',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_natal_charts_user_id ON natal_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_natal_charts_birth_date ON natal_charts(birth_date);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE OR REPLACE TRIGGER update_natal_charts_updated_at BEFORE UPDATE ON natal_charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database initialized successfully!' as status;