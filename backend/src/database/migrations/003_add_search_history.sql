-- Migration: Add Astro Search History
-- Description: Stores user's intents and found opportunities for future reference and archival

CREATE TABLE IF NOT EXISTS astro_search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- The user's query/intent
  intent TEXT NOT NULL,
  
  -- Search Parameters
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- The found opportunities (JSONB for flexibility)
  -- Structure: Array of { date, score, advice, transits }
  results_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indices for faster lookup
CREATE INDEX idx_astro_search_history_user_id ON astro_search_history(user_id);
CREATE INDEX idx_astro_search_history_created_at ON astro_search_history(created_at);
CREATE INDEX idx_astro_search_history_intent ON astro_search_history USING gin(to_tsvector('english', intent));

-- Trigger for updated_at
CREATE TRIGGER update_astro_search_history_updated_at 
BEFORE UPDATE ON astro_search_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
