-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add game_id column to existing entity tables (without inline FK to avoid redundancy)
ALTER TABLE stars ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE planets ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE star_lanes ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE empires ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE fleets ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE turn_history ADD COLUMN IF NOT EXISTS game_id UUID;

-- Add foreign key constraints with idempotent DO blocks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stars_game_id') THEN
        ALTER TABLE stars ADD CONSTRAINT fk_stars_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_planets_game_id') THEN
        ALTER TABLE planets ADD CONSTRAINT fk_planets_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_star_lanes_game_id') THEN
        ALTER TABLE star_lanes ADD CONSTRAINT fk_star_lanes_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_empires_game_id') THEN
        ALTER TABLE empires ADD CONSTRAINT fk_empires_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleets_game_id') THEN
        ALTER TABLE fleets ADD CONSTRAINT fk_fleets_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_turn_history_game_id') THEN
        ALTER TABLE turn_history ADD CONSTRAINT fk_turn_history_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
END $$;
