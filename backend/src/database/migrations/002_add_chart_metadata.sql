-- Migration to add chart_type, description, and tags to natal_charts table

-- Add chart_type column
ALTER TABLE natal_charts ADD COLUMN IF NOT EXISTS chart_type VARCHAR(50) DEFAULT 'natal';

-- Add description column
ALTER TABLE natal_charts ADD COLUMN IF NOT EXISTS description TEXT;

-- Add tags column
ALTER TABLE natal_charts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Update existing records to have a default chart_type
UPDATE natal_charts SET chart_type = 'natal' WHERE chart_type IS NULL;
