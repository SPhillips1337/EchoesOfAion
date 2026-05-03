# Database Schema Documentation - Echoes of Aion

## Overview
This document describes the initial PostgreSQL database schema for the Echoes of Aion 4X space strategy game. The schema supports core entities including stars, planets, star lanes, empires, fleets, ships, structures, build queues, and turn history.

## Entity Relationship Diagram (ERD)
```
stars (1) ----- (n) planets (1) ----- (n) structures
stars (n) ----- (n) star_lanes (via source_star_id, destination_star_id)
empires (1) ----- (n) fleets
stars (1) ----- (n) fleets
fleets (1) ----- (n) ships
build_queues: polymorphic (entity_type + entity_id) references planets or fleets
empires (1) ----- (n) turn_history
```

## Table Definitions

### stars
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| name         | VARCHAR(255)          | NOT NULL                             |
| x_coord      | NUMERIC(10,2)        | NOT NULL                             |
| y_coord      | NUMERIC(10,2)        | NOT NULL                             |
| system_size  | VARCHAR(50)           | NOT NULL, CHECK (small, medium, large)|
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: (x_coord, y_coord)

### planets
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| star_id      | UUID (FK)             | NOT NULL, REFERENCES stars(id) ON DELETE CASCADE |
| name         | VARCHAR(255)          | NOT NULL                             |
| planet_type  | VARCHAR(50)           | NOT NULL, CHECK (terrestrial, gas_giant, ice, desert, ocean) |
| size         | VARCHAR(50)           | NOT NULL, CHECK (small, medium, large) |
| resources    | JSONB                 | NOT NULL, Default: '{}'              |
| habitable    | BOOLEAN               | NOT NULL, Default: FALSE             |
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: star_id; GIN index on resources

### star_lanes
| Column               | Type                  | Constraints                          |
|----------------------|-----------------------|--------------------------------------|
| id                   | UUID (PK)             | Default: uuid_generate_v4()          |
| source_star_id       | UUID (FK)             | NOT NULL, REFERENCES stars(id) ON DELETE CASCADE |
| destination_star_id  | UUID (FK)             | NOT NULL, REFERENCES stars(id) ON DELETE CASCADE |
| distance             | NUMERIC(10,2)        | NOT NULL, CHECK (distance > 0)       |
| created_at           | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: source_star_id, destination_star_id; Unique constraint on (source_star_id, destination_star_id)

### empires
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| name         | VARCHAR(255)          | NOT NULL, UNIQUE                     |
| player_type  | VARCHAR(20)           | NOT NULL, CHECK (human, ai)          |
| color        | VARCHAR(20)           | NOT NULL                             |
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

### fleets
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| empire_id    | UUID (FK)             | NOT NULL, REFERENCES empires(id) ON DELETE CASCADE |
| star_id      | UUID (FK)             | NOT NULL, REFERENCES stars(id) ON DELETE CASCADE |
| name         | VARCHAR(255)          | NOT NULL                             |
| composition  | JSONB                 | NOT NULL, Default: '{}'              |
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: empire_id, star_id; GIN index on composition

### ships
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| fleet_id     | UUID (FK)             | NOT NULL, REFERENCES fleets(id) ON DELETE CASCADE |
| ship_type    | VARCHAR(50)           | NOT NULL, CHECK (scout, frigate, destroyer, cruiser, battleship) |
| health       | NUMERIC(5,2)          | NOT NULL, Default: 100.0, CHECK (0 <= health <= 100) |
| status       | VARCHAR(20)           | NOT NULL, Default: 'active', CHECK (active, damaged, destroyed, repairing) |
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: fleet_id

### structures
| Column           | Type                  | Constraints                          |
|------------------|-----------------------|--------------------------------------|
| id               | UUID (PK)             | Default: uuid_generate_v4()          |
| planet_id        | UUID (FK)             | NOT NULL, REFERENCES planets(id) ON DELETE CASCADE |
| structure_type   | VARCHAR(50)           | NOT NULL, CHECK (mine, farm, factory, research_lab, defense_platform) |
| build_progress   | NUMERIC(5,2)          | NOT NULL, Default: 0.0, CHECK (0 <= build_progress <= 100) |
| created_at       | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: planet_id

### build_queues (Polymorphic)
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| entity_type  | VARCHAR(20)           | NOT NULL, CHECK (planet, fleet)      |
| entity_id    | UUID                  | NOT NULL (polymorphic reference)      |
| item_type    | VARCHAR(50)           | NOT NULL                             |
| progress     | NUMERIC(5,2)          | NOT NULL, Default: 0.0, CHECK (0 <= progress <= 100) |
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: (entity_type, entity_id)
*Note: Referential integrity for polymorphic references is validated in application code.*

### turn_history
| Column       | Type                  | Constraints                          |
|--------------|-----------------------|--------------------------------------|
| id           | UUID (PK)             | Default: uuid_generate_v4()          |
| empire_id    | UUID (FK)             | NOT NULL, REFERENCES empires(id) ON DELETE CASCADE |
| turn_number  | INTEGER               | NOT NULL, CHECK (turn_number > 0)    |
| actions      | JSONB                 | NOT NULL, Default: '[]'              |
| resolved_at  | TIMESTAMP WITH TZ     | Nullable                             |
| created_at   | TIMESTAMP WITH TZ     | Default: NOW()                       |

**Indexes**: empire_id; (empire_id, turn_number); GIN index on actions

## Migration Instructions
1. Ensure PostgreSQL 14+ is installed and running
2. Create a database for the game: `createdb echoes_of_aion`
3. Run the migration script: `psql echoes_of_aion -f packages/server/migrations/001_initial_game_schema.sql`
4. Verify tables are created: `psql echoes_of_aion -c "\dt"`

## JSONB Usage Guidelines
- **planets.resources**: Stores key-value pairs of resource types and quantities (e.g., `{"minerals": 100, "energy": 50}`)
- **fleets.composition**: Stores ship counts by type (e.g., `{"scout": 5, "frigate": 2}`)
- **turn_history.actions**: Stores array of action objects describing turn events (e.g., `[{"type": "move_fleet", "fleet_id": "..."}]`)
- Use GIN indexes for efficient querying of JSONB columns
- Use the `->>`, `->`, `#>`, `#>>` operators for JSONB queries in PostgreSQL

## Testing
Migration tests are located in `packages/server/tests/migration.test.ts`. To run tests:
1. Set up a test database: `createdb test_echoes_of_aion`
2. Set DATABASE_URL environment variable: `export DATABASE_URL="postgresql://localhost:5432/test_echoes_of_aion"`
3. Run tests: `cd packages/server && pnpm test`
