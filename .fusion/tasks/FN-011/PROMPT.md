# Task: FN-011 - Fix: Database schema & entity models

**Created:** 2026-05-03
**Size:** M

## Review Level: 2 (Plan and Code)

**Assessment:** Moderate blast radius as it modifies core schema tables and entity interfaces across multiple files; pattern novelty is low (standard schema migration patterns); security is low (no sensitive data changes); reversibility is medium (migrations can be rolled back with care). Total score 5/8.
**Score:** 5/8 — Blast radius: 2, Pattern novelty: 1, Security: 1, Reversibility: 1

## Mission

Fix and align the PostgreSQL database schema and entity models to incorporate pending schema changes required for the Milestone 1 single-player MVP. This includes creating a `games` table to scope game instances, adding `explored_systems` JSONB column to the `empires` table, adding `game_id` foreign keys to all core entities, and updating all related TypeScript interfaces, migration files, tests, and documentation to ensure referential integrity and alignment with the game's data requirements. This task incorporates the pending scope of FN-009, FN-010, and FN-012 to avoid redundant work.

## Dependencies

- **Task:** FN-001 (Database schema & entity models — initial schema complete, prerequisite for all schema changes)

## Context to Read First

- `packages/server/migrations/001_initial_game_schema.sql` — initial schema definition
- `packages/server/src/types/game-entities.ts` — current entity TypeScript interfaces
- `packages/server/src/db/schema.ts` — table/column constants and type mappings
- `packages/server/tests/migration.test.ts` — existing migration test patterns
- FN-001, FN-009, FN-010, FN-012 PROMPT.md files — for context on pending changes

## File Scope

- `packages/server/migrations/002_create_games_table.sql` (new)
- `packages/server/migrations/003_add_explored_systems_to_empires.sql` (new)
- `packages/server/migrations/004_add_game_id_to_entities.sql` (new)
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/src/types/game.ts` (new)
- `packages/server/src/db/schema.ts` (modified)
- `packages/server/tests/migration.test.ts` (modified)
- `docs/database-schema.md` (modified)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-001 is marked as `done`
- [ ] Verify PostgreSQL test instance is available and migration 001 applies cleanly
- [ ] Review existing migration naming conventions and SQL patterns
- [ ] Note that FN-009, FN-010, FN-012 scope is incorporated into this task to avoid redundancy

### Step 1: Apply pending schema migrations (in strict order)

> Migrations must be applied in this exact order to avoid foreign key constraint failures:
> 1. `002_create_games_table.sql` (games table must exist before adding game_id FKs)
> 2. `003_add_explored_systems_to_empires.sql` (no dependencies on other new tables)
> 3. `004_add_game_id_to_entities.sql` (requires games table to exist)

- [ ] Create `packages/server/migrations/002_create_games_table.sql` to define `games` table with columns: `id`, `name`, `status`, `galaxy_seed`, `current_turn`, `created_at`, `updated_at`, including `updated_at` trigger function
- [ ] Create `packages/server/migrations/003_add_explored_systems_to_empires.sql` to add `explored_systems` JSONB column to `empires` table with default `'[]'::JSONB`
- [ ] Create `packages/server/migrations/004_add_game_id_to_entities.sql` to add `game_id` UUID NOT NULL column with foreign key constraint to `games(id) ON DELETE CASCADE` for tables: stars, planets, star_lanes, empires, fleets, turn_history, build_queues
- [ ] Apply all new migrations to the test PostgreSQL instance in the specified order and verify clean execution

**Artifacts:**
- `packages/server/migrations/002_create_games_table.sql` (new)
- `packages/server/migrations/003_add_explored_systems_to_empires.sql` (new)
- `packages/server/migrations/004_add_game_id_to_entities.sql` (new)

### Step 2: Update TypeScript entity interfaces

- [ ] Add `explored_systems: string[]` to the `Empire` interface in `packages/server/src/types/game-entities.ts`
- [ ] Add `game_id: string` to `Star`, `Planet`, `StarLane`, `Empire`, `Fleet`, `BuildQueue`, `TurnHistory` interfaces in `packages/server/src/types/game-entities.ts`
- [ ] Create `packages/server/src/types/game.ts` with the `Game` interface matching the `games` table schema
- [ ] Update all interface imports and usages to reflect new fields

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/src/types/game.ts` (new)

### Step 3: Update schema definitions and type mappings

- [ ] Add `GAMES: 'games'` to the TABLES constant in `packages/server/src/db/schema.ts`
- [ ] Add `games` column list to the COLUMNS constant
- [ ] Add `game_id` to the COLUMNS constant for all modified entity tables
- [ ] Add `[TABLES.GAMES]: Game` entry to the `EntityTypeMap` type
- [ ] Update imports to include `Game` type from `../types/game`

**Artifacts:**
- `packages/server/src/db/schema.ts` (modified)

### Step 4: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Update `packages/server/tests/migration.test.ts` to validate:
  - `games` table creates successfully with valid status values and `updated_at` trigger
  - `empires.explored_systems` column exists with correct type and default
  - `game_id` columns exist on all target tables with proper foreign key constraints
  - Cascade delete behavior when a game is deleted
  - Schema.ts COLUMNS constants match actual database columns for all tables
- [ ] Run lint check (`pnpm lint` in `packages/server`)
- [ ] Run full test suite (`pnpm test` in `packages/server`)
- [ ] Run project typecheck (`pnpm typecheck` in `packages/server`)
- [ ] Fix all failures
- [ ] Build passes (`pnpm build` in `packages/server` if available)

**Artifacts:**
- `packages/server/tests/migration.test.ts` (modified)

### Step 5: Documentation & Delivery

- [ ] Update `docs/database-schema.md` to:
  - Add `games` table definition and ERD relationship to entity tables
  - Add `explored_systems` column to `empires` table documentation
  - Document `game_id` column addition to all target entities
  - Update migration instructions to include all new migration files in correct order
  - Update ERD summary in all migration files to reflect new relationships
- [ ] Save documentation deliverables as task documents via `fn_task_document_write` (key="docs", content=updated schema markdown)
- [ ] Create follow-up tasks for any out-of-scope findings via `fn_task_create`
- [ ] Mark FN-009, FN-010, FN-012 as superseded if their scope is fully incorporated into this task

## Documentation Requirements

**Must Update:**
- `docs/database-schema.md` — add all new schema changes, table definitions, and updated ERD

**Check If Affected:**
- `packages/server/README.md` — update if database setup instructions mention new migration files or entity fields

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All migration and entity tests passing
- [ ] Typecheck passing
- [ ] Documentation updated
- [ ] All pending schema changes from FN-009, FN-010, FN-012 are incorporated
- [ ] Migration files use correct sequential numbering (002, 003, 004)

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-011): complete Step N — description`
- **Bug fixes:** `fix(FN-011): description`
- **Tests:** `test(FN-011): description`

## Do NOT

- Expand task scope beyond the specified schema fixes and interface updates
- Skip migration or entity tests
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove existing entity table columns or functionality
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task adds new functionality (no net removals of existing features), so no changeset file is required.
