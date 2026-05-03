--
-- Entity Relationship Diagram (ERD) Summary:
-- stars (1) ----- (n) planets (1) ----- (n) structures
-- stars (n) ----- (n) star_lanes (via source_star_id, destination_star_id)
-- empires (1) ----- (n) fleets
-- stars (1) ----- (n) fleets
-- fleets (1) ----- (n) ships
-- build_queues: polymorphic (entity_type + entity_id) references planets or fleets
-- empires (1) ----- (n) turn_history
--
-- Migration: 001_initial_game_schema
-- Created: 2026-05-03
-- Task: FN-001
--

-- Enable UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--
-- Table: stars
--
CREATE TABLE stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    x_coord NUMERIC(10, 2) NOT NULL,
    y_coord NUMERIC(10, 2) NOT NULL,
    system_size VARCHAR(50) NOT NULL CHECK (system_size IN ('small', 'medium', 'large')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stars_coords ON stars (x_coord, y_coord);

--
-- Table: planets
--
CREATE TABLE planets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    planet_type VARCHAR(50) NOT NULL CHECK (planet_type IN ('terrestrial', 'gas_giant', 'ice', 'desert', 'ocean')),
    size VARCHAR(50) NOT NULL CHECK (size IN ('small', 'medium', 'large')),
    resources JSONB NOT NULL DEFAULT '{}'::JSONB,
    habitable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_planets_star_id ON planets (star_id);
CREATE INDEX idx_planets_resources ON planets USING GIN (resources);

--
-- Table: star_lanes
--
CREATE TABLE star_lanes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
    destination_star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
    distance NUMERIC(10, 2) NOT NULL CHECK (distance > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure no duplicate lanes between the same two stars
    UNIQUE (source_star_id, destination_star_id)
);

CREATE INDEX idx_star_lanes_source ON star_lanes (source_star_id);
CREATE INDEX idx_star_lanes_destination ON star_lanes (destination_star_id);

--
-- Table: empires
--
CREATE TABLE empires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    player_type VARCHAR(20) NOT NULL CHECK (player_type IN ('human', 'ai')),
    color VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--
-- Table: fleets
--
CREATE TABLE fleets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    star_id UUID NOT NULL REFERENCES stars(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    composition JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fleets_empire_id ON fleets (empire_id);
CREATE INDEX idx_fleets_star_id ON fleets (star_id);
CREATE INDEX idx_fleets_composition ON fleets USING GIN (composition);

--
-- Table: ships
--
CREATE TABLE ships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    ship_type VARCHAR(50) NOT NULL CHECK (ship_type IN ('scout', 'frigate', 'destroyer', 'cruiser', 'battleship')),
    health NUMERIC(5, 2) NOT NULL DEFAULT 100.0 CHECK (health >= 0 AND health <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'damaged', 'destroyed', 'repairing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ships_fleet_id ON ships (fleet_id);

--
-- Table: structures
--
CREATE TABLE structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    structure_type VARCHAR(50) NOT NULL CHECK (structure_type IN ('mine', 'farm', 'factory', 'research_lab', 'defense_platform')),
    build_progress NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (build_progress >= 0 AND build_progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_structures_planet_id ON structures (planet_id);

--
-- Table: build_queues (polymorphic)
--
CREATE TABLE build_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('planet', 'fleet')),
    entity_id UUID NOT NULL, -- Polymorphic reference: planet_id if entity_type='planet', fleet_id if entity_type='fleet'
    item_type VARCHAR(50) NOT NULL, -- e.g., 'structure', 'ship', 'technology'
    progress NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_build_queues_entity ON build_queues (entity_type, entity_id);

--
-- Table: turn_history
--
CREATE TABLE turn_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL CHECK (turn_number > 0),
    actions JSONB NOT NULL DEFAULT '[]'::JSONB,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_turn_history_empire_id ON turn_history (empire_id);
CREATE INDEX idx_turn_history_turn ON turn_history (empire_id, turn_number);
CREATE INDEX idx_turn_history_actions ON turn_history USING GIN (actions);
