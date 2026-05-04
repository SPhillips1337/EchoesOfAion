# Task: FN-015 - Add explored_systems column to empires table and update Empire interface

**Created:** 2026-05-04
**Size:** S

## Review Level: 1 (Plan Only)

**Assessment:** Blast radius is low (only empires table and game-entities.ts), pattern novelty is low (standard ALTER TABLE and interface update), security is low (no sensitive data handling), reversibility is high (column can be dropped without data loss). Total score 2/8.
**Score:** 2/8 — Blast radius: 1, Pattern novelty: 0, Security: 0, Reversibility: 1

## Mission

Add the `explored_systems` column to the `empires` table in PostgreSQL to track which star systems an empire has explored, and ensure the `Empire` interface in `game-entities.ts` correctly includes `explored_systems: string[]` to align the database schema with TypeScript types. This change supports core 4X exploration mechanics by persisting discovered system state for each empire.

## Dependencies

- **Task:** FN-001 (Database schema & entity models — completed, provides base empires table and interface definitions)

## Context to Read First

- `packages/server/migrations/001_initial_game_schema.sql` — current empires table definition (no `explored_systems` column)
- `packages/server/src/types/game-entities.ts` — current `Empire` interface (already includes `explored_systems` but must be verified)
- `packages/server/tests/migration.test.ts` — existing migration tests to extend
- `packages/server/src/db/schema.ts` (if exists) — TypeScript schema mappings for table definitions

## File Scope

- `packages/server/migrations/002_add_explored_systems_to_empires.sql` (new)
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/tests/migration.test.ts` (modified)
- `packages/server/src/db/schema.ts` (modified, if present)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-001 is marked as done in the task board
- [ ] Verify `001_initial_game_schema.sql` exists and the `empires` table has no `explored_systems` column
- [ ] Verify `game-entities.ts` has the current `Empire` interface structure

### Step 1: Create Migration for explored_systems Column

- [ ] Create `packages/server/migrations/002_add_explored_systems_to_empires.sql` following the format of the initial migration (header comments, extension checks)
- [ ] Add SQL to alter the `empires` table: `ALTER TABLE empires ADD COLUMN explored_systems JSONB NOT NULL DEFAULT '[]'::JSONB;`
- [ ] Add a column comment: `COMMENT ON COLUMN empires.explored_systems IS 'JSONB array of explored star system IDs (UUIDs) stored as strings';`
- [ ] Run targeted validation that the migration file applies cleanly to a test PostgreSQL instance

**Artifacts:**
- `packages/server/migrations/002_add_explored_systems_to_empires.sql` (new)

### Step 2: Align Empire Interface and Schema Definitions

- [ ] Verify `Empire` interface in `packages/server/src/types/game-entities.ts` includes `explored_systems: string[]` (add if missing, confirm if present)
- [ ] Update `packages/server/src/db/schema.ts` (if exists) to include `explored_systems` in the `empires` table schema definition
- [ ] Run TypeScript type checking for `game-entities.ts` to confirm no type errors

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/src/db/schema.ts` (modified, if present)

### Step 3: Update Migration Tests

- [ ] Add test cases to `packages/server/tests/migration.test.ts` for the `empires` table:
  - Verify `explored_systems` column exists after applying the migration
  - Test inserting an empire with `explored_systems` populated
  - Test default value of `explored_systems` is an empty array
  - Test querying and updating `explored_systems` with valid system ID arrays
- [ ] Run the new migration against the test database and verify all tests pass

**Artifacts:**
- `packages/server/tests/migration.test.ts` (modified)

### Step 4: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`pnpm lint` in packages/server)
- [ ] Run full test suite (`pnpm test` in packages/server)
- [ ] Run project typecheck (`pnpm typecheck` if available)
- [ ] Fix all failures
- [ ] Build passes (if build scripts exist)

### Step 5: Documentation & Delivery

- [ ] Update `docs/database-schema.md` to document the new `explored_systems` column in the `empires` table, including type, default value, and purpose
- [ ] Save documentation content via `fn_task_document_write` (key="docs", content=documentation markdown)
- [ ] Create follow-up tasks for any out-of-scope findings via `fn_task_create`

## Documentation Requirements

**Must Update:**
- `docs/database-schema.md` — add `explored_systems` column definition to the empires table section

**Check If Affected:**
- `README.md` — update only if adding new database setup steps related to the migration

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All migration and entity tests passing
- [ ] Typecheck passing (if available)
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-015): complete Step N — description`
- **Bug fixes:** `fix(FN-015): description`
- **Tests:** `test(FN-015): description`

## Do NOT

- Expand task scope beyond adding the `explored_systems` column and updating the `Empire` interface
- Skip migration or entity tests
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task adds new functionality (no net removals), so no changeset file is required.
