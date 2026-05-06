BEGIN;

-- Create games table if not exists (idempotent)
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add game_id to build_queues if not exists (missing from 0003 migration)
ALTER TABLE build_queues ADD COLUMN IF NOT EXISTS game_id UUID;

-- Add foreign key constraints for all 7 entity tables using idempotent DO blocks
DO $$
BEGIN
    -- Stars
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stars_game_id') THEN
        ALTER TABLE stars ADD CONSTRAINT fk_stars_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    -- Planets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_planets_game_id') THEN
        ALTER TABLE planets ADD CONSTRAINT fk_planets_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    -- Star Lanes
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_star_lanes_game_id') THEN
        ALTER TABLE star_lanes ADD CONSTRAINT fk_star_lanes_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    -- Empires
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_empires_game_id') THEN
        ALTER TABLE empires ADD CONSTRAINT fk_empires_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    -- Fleets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleets_game_id') THEN
        ALTER TABLE fleets ADD CONSTRAINT fk_fleets_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    -- Build Queues (new in this migration)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_build_queues_game_id') THEN
        ALTER TABLE build_queues ADD CONSTRAINT fk_build_queues_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    -- Turn History
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_turn_history_game_id') THEN
        ALTER TABLE turn_history ADD CONSTRAINT fk_turn_history_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;

-- Rollback: DROP CONSTRAINT statements (run in reverse order)
-- BEGIN;
-- ALTER TABLE turn_history DROP CONSTRAINT IF EXISTS fk_turn_history_game_id;
-- ALTER TABLE build_queues DROP CONSTRAINT IF EXISTS fk_build_queues_game_id;
-- ALTER TABLE fleets DROP CONSTRAINT IF EXISTS fk_fleets_game_id;
-- ALTER TABLE empires DROP CONSTRAINT IF EXISTS fk_empires_game_id;
-- ALTER TABLE star_lanes DROP CONSTRAINT IF EXISTS fk_star_lanes_game_id;
-- ALTER TABLE planets DROP CONSTRAINT IF EXISTS fk_planets_game_id;
-- ALTER TABLE stars DROP CONSTRAINT IF EXISTS fk_stars_game_id;
-- ALTER TABLE build_queues DROP COLUMN IF EXISTS game_id;
-- DROP TABLE IF EXISTS games; (only if created by this migration, but 0003 already created it)
-- COMMIT;
