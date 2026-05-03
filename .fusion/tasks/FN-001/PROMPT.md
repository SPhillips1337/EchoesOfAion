# Task: FN-001 - Database schema & entity models

**Created:** 2026-05-03
**Size:** M

## Review Level: 1 (Plan Only)

**Assessment:** Blast radius is low (new tables only, no existing code to modify), pattern novelty is low (standard relational schema design), security is low (no sensitive data or auth yet), reversibility is high (new tables can be dropped easily). Total score 3/8.
**Score:** 3/8 — Blast radius: 1, Pattern novelty: 0, Security: 0, Reversibility: 2

## Mission

Design and implement the initial PostgreSQL database schema and entity models for the core 4X space strategy game entities. This schema will persist stars, planets, star lanes, empires, fleets, ships, structures, build queues, and turn history with full referential integrity and flexible JSONB component data to support the Milestone 1 simulation core and data layer requirements.

## Dependencies

- **None**

## Context to Read First

- No existing source files yet (greenfield project) — proceed with schema design based on the feature requirements provided in the task description.

## File Scope

- `packages/server/migrations/001_initial_game_schema.sql` (new)
- `packages/server/src/types/game-entities.ts` (new)
- `packages/server/src/db/schema.ts` (new, TypeScript schema definitions)
- `packages/server/tests/migration.test.ts` (new)
- `packages/server/package.json` (new/modified)
- `packages/server/vitest.config.ts` (new)
- `docs/database-schema.md` (new)

## Steps

### Step 0: Preflight

- [ ] Confirm PostgreSQL 14+ is available (local instance or containerized)
- [ ] Create base directory structure: `packages/server/{migrations,src/types,src/db,tests}`
- [ ] Initialize `packages/server/package.json` if not present, add required dependencies (e.g., `pg` for PostgreSQL driver, `@types/pg` for TypeScript)

### Step 1: Design Entity Relationships & Schema

- [ ] Define table structures for all core entities with primary keys, foreign keys, and required columns (add CHECK constraints for enumerated values like `entity_type`):
  - `stars`: id, name, x_coord, y_coord, system_size, created_at
  - `planets`: id, star_id (FK), name, planet_type, size, resources (JSONB), habitable, created_at
  - `star_lanes`: id, source_star_id (FK), destination_star_id (FK), distance, created_at
  - `empires`: id, name, player_type (human/ai), color, created_at
  - `fleets`: id, empire_id (FK), star_id (FK), name, composition (JSONB), created_at
  - `ships`: id, fleet_id (FK), ship_type, health, status, created_at
  - `structures`: id, planet_id (FK), structure_type, build_progress, created_at
  - `build_queues`: id, entity_type (CHECK constraint: `entity_type IN ('planet', 'fleet')`), entity_id (polymorphic reference via entity_type + entity_id), item_type, progress, created_at
  - Note: Polymorphic `build_queues` references cannot use standard foreign key constraints; referential integrity for these will be validated in application code and tests
  - `turn_history`: id, empire_id (FK), turn_number, actions (JSONB), resolved_at
- [ ] Add JSONB columns to entities requiring flexible component data (planets.resources, fleets.composition, turn_history.actions)
- [ ] Enforce referential integrity with foreign key constraints between related entities
- [ ] Document the entity relationship diagram (ERD) as a header comment in the migration file

**Artifacts:**
- `packages/server/migrations/001_initial_game_schema.sql` (new)

### Step 2: Write Migration & TypeScript Types

- [ ] Write the SQL migration file with CREATE TABLE statements for all entities, indexes for foreign keys, and JSONB GIN indexes where needed
- [ ] Create TypeScript interfaces for each entity in `packages/server/src/types/game-entities.ts`
- [ ] Create a schema definition file `packages/server/src/db/schema.ts` that exports table definitions and type mappings

**Artifacts:**
- `packages/server/migrations/001_initial_game_schema.sql` (modified)
- `packages/server/src/types/game-entities.ts` (new)
- `packages/server/src/db/schema.ts` (new)

### Step 3: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If the project has no test framework, set up Vitest for `packages/server` as part of this step.

- [ ] Set up Vitest test framework for `packages/server` if not already configured
- [ ] Write migration tests in `packages/server/tests/migration.test.ts`:
  - Verify all tables are created successfully
  - Test CRUD operations for each entity with referential integrity checks
  - Test JSONB column insertion, querying, and updates
- [ ] Run the database migration against a test PostgreSQL instance
- [ ] Run lint check (`pnpm lint` or `npm run lint` in `packages/server`)
- [ ] Run project typecheck (`pnpm typecheck` or `npm run typecheck` if available)
- [ ] Fix all failures
- [ ] Build passes (if build scripts exist)

**Artifacts:**
- `packages/server/tests/migration.test.ts` (new)

### Step 4: Documentation & Delivery

- [ ] Create `docs/database-schema.md` with:
  - Table definitions and column descriptions
  - Entity relationship diagram (ERD) description
  - Migration instructions
  - JSONB usage guidelines
- [ ] Save documentation content via `fn_task_document_write` (key="docs", content=documentation markdown)
- [ ] Create follow-up tasks for any out-of-scope findings via `fn_task_create`

## Documentation Requirements

**Must Update:**
- `docs/database-schema.md` — add initial schema documentation, table definitions, and ERD

**Check If Affected:**
- `README.md` — update if adding database setup instructions

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All migration and entity tests passing
- [ ] Typecheck passing (if available)
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-001): complete Step N — description`
- **Bug fixes:** `fix(FN-001): description`
- **Tests:** `test(FN-001): description`

## Do NOT

- Expand task scope beyond the specified entities
- Skip migration or entity tests
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task adds new functionality (no removals), so no changeset file is required.
