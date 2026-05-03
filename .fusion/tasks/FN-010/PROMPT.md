# Task: FN-010 - Create games table and add game_id to core entity tables

**Created:** 2026-05-03
**Size:** M

## Review Level: 2 (Plan and Code)

**Assessment:** Moderate blast radius as all core entity queries require game_id filtering; standard relational schema pattern with low security risk but limited reversibility due to schema migrations.
**Score:** 5/8 — Blast radius: 2, Pattern novelty: 1, Security: 1, Reversibility: 1

## Mission

Create a `games` table to represent individual game instances, then add a `game_id` foreign key column to all specified core entity tables (stars, planets, star_lanes, empires, fleets, turn_history, build_queues). This scoping enables per-game state queries required for FN-004 by ensuring all entity data is associated with a specific active game.

## Dependencies

- **Task:** FN-001 (Initial database schema and entity models must be fully implemented — confirmed done)

## Context to Read First

- `packages/server/migrations/001_initial_game_schema.sql` — existing table definitions and migration patterns
- `packages/server/src/types/game-entities.ts` — existing entity TypeScript interfaces to update with game_id
- `packages/server/src/db/schema.ts` — existing table/column constants and type mappings used by migration tests
- `packages/server/tests/migration.test.ts` — existing migration test patterns including schema-constant validation

## File Scope

- `packages/server/migrations/002_create_games_table.sql` (new)
- `packages/server/migrations/003_add_game_id_to_entities.sql` (new)
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/src/types/game.ts` (new — Game interface)
- `packages/server/src/db/schema.ts` (modified)
- `packages/server/tests/migration.test.ts` (modified)
- `docs/database-schema.md` (modified)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-001 is marked as done
- [ ] Verify PostgreSQL test instance is available
- [ ] Review existing migration naming convention (001_, 002_, etc.) and SQL patterns
- [ ] Read `packages/server/src/db/schema.ts` to understand TABLES/COLUMNS constant structure

### Step 1: Create games table migration

- [ ] Define `games` table with columns matching project conventions:
  - `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  - `name` VARCHAR(255) NOT NULL
  - `status` VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'completed'))
  - `galaxy_seed` INTEGER NOT NULL (for reproducible galaxy generation)
  - `current_turn` INTEGER NOT NULL DEFAULT 1 CHECK (current_turn > 0)
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- [ ] Add the `update_updated_at_column()` function in the migration file before creating the trigger:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
- [ ] Add a trigger to automatically update `updated_at` on row modification for the games table:
  ```sql
  CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  ```
- [ ] Add migration file `packages/server/migrations/002_create_games_table.sql` following existing ERD header comment pattern
- [ ] Add indexes for `status` and `created_at` columns
- [ ] Update `packages/server/src/db/schema.ts`:
  - Add `GAMES: 'games'` to the TABLES constant
  - Add `games: ['id', 'name', 'status', 'galaxy_seed', 'current_turn', 'created_at', 'updated_at']` to the COLUMNS constant
- [ ] Write tests for games table creation, CRUD operations, status validation, and updated_at trigger

**Artifacts:**
- `packages/server/migrations/002_create_games_table.sql` (new)
- `packages/server/src/db/schema.ts` (modified)

### Step 2: Add game_id to target entity tables

- [ ] Add `game_id` UUID NOT NULL column to each target table: stars, planets, star_lanes, empires, fleets, turn_history, build_queues
- [ ] Add foreign key constraint `game_id REFERENCES games(id) ON DELETE CASCADE` for each table
- [ ] Add index for `game_id` on each modified table
- [ ] Create migration file `packages/server/migrations/003_add_game_id_to_entities.sql` with all ALTER TABLE statements
- [ ] Update `packages/server/src/types/game-entities.ts` to add `game_id: string` (UUID) to each modified entity interface (Star, Planet, StarLane, Empire, Fleet, BuildQueue, TurnHistory)
- [ ] Create `packages/server/src/types/game.ts` with the Game interface matching the games table schema
- [ ] Update `packages/server/src/db/schema.ts`:
  - Add `Game` type import from `../types/game`
  - Update COLUMNS constant for each modified table to include `game_id` in the column list
  - Add `[TABLES.GAMES]: Game` entry to the EntityTypeMap
- [ ] Write tests for game_id column existence, foreign key integrity, and cascade delete behavior

**Artifacts:**
- `packages/server/migrations/003_add_game_id_to_entities.sql` (new)
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/src/types/game.ts` (new)
- `packages/server/src/db/schema.ts` (modified)

### Step 3: Update migration tests

- [ ] Add tests to `packages/server/tests/migration.test.ts` verifying:
  - Games table creates successfully with valid status values
  - game_id columns exist on all target tables
  - Foreign key constraints enforce referential integrity (deleting a game cascades to all associated entities)
  - Query filtering by game_id returns correct results for each entity type
  - `schema.ts` COLUMNS constants match actual database columns for all tables (including new games table and modified entities)
- [ ] Run migration against test PostgreSQL instance to verify all changes apply cleanly

**Artifacts:**
- `packages/server/tests/migration.test.ts` (modified)

### Step 4: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.

- [ ] Run lint check (`pnpm lint` in packages/server)
- [ ] Run full test suite (`pnpm test` in packages/server) — includes migration tests that validate schema.ts constants match DB schema
- [ ] Run project typecheck (`pnpm typecheck` in packages/server)
- [ ] Fix all failures
- [ ] Build passes (`pnpm build` in packages/server)

### Step 5: Documentation & Delivery

- [ ] Update `docs/database-schema.md` to:
  - Add games table definition and ERD relationship to entity tables
  - Document game_id column addition to all target entities
  - Update migration instructions to include new migration files
  - Remove or update references to non-existent `schema-validation.test.ts` if present
- [ ] Save documentation deliverables as task documents via `fn_task_document_write` (key="docs", content=updated schema documentation)
- [ ] Create follow-up task for FN-004 per-game query implementation if out of scope

## Documentation Requirements

**Must Update:**
- `docs/database-schema.md` — add games table, game_id relations, and updated ERD

**Check If Affected:**
- `packages/server/README.md` — update if database setup instructions mention entity tables

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All migration and entity tests passing
- [ ] Typecheck passing
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-010): complete Step N — description`
- **Bug fixes:** `fix(FN-010): description`
- **Tests:** `test(FN-010): description`

## Do NOT

- Expand task scope to implement FN-004 per-game queries (create follow-up task instead)
- Skip adding foreign key constraints for game_id
- Modify non-target entity tables (ships, structures)
- Commit without the task ID prefix
- Remove existing entity table columns or functionality

## Changeset Requirements

This task adds new functionality (no net removals), so no changeset file is required.
