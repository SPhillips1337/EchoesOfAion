# Task: FN-009 - Add explored_systems column to empires table and update Empire interface

**Created:** 2026-05-03
**Size:** S

## Review Level: 1 (Plan Only)

**Assessment:** Blast radius is low (only affects empires table and Empire interface), pattern novelty is low (standard column addition and type update), security is low (no sensitive data or auth changes), reversibility is high (column can be dropped without breaking existing data if handled properly). Total score 3/8.
**Score:** 3/8 — Blast radius: 1, Pattern novelty: 0, Security: 0, Reversibility: 2

## Mission

Add an `explored_systems` JSONB column to the `empires` table to track the UUIDs of star systems an empire has explored, and update the `Empire` interface in `game-entities.ts` to include `explored_systems: string[]` so the application type system aligns with the updated database schema. This change supports core explore mechanics for the 4X game loop.

## Dependencies

- **Task:** FN-001 (Database schema & entity models — must be complete, as it defines the initial empires table and Empire interface)

## Context to Read First

- `packages/server/src/types/game-entities.ts` — current `Empire` interface definition
- `packages/server/migrations/001_initial_game_schema.sql` — initial `empires` table structure
- FN-001 PROMPT.md — for context on initial schema design patterns and testing conventions

## File Scope

- `packages/server/migrations/002_add_explored_systems_to_empires.sql` (new)
- `packages/server/src/types/game-entities.ts` (modified)
- `packages/server/tests/migration.test.ts` (modified)
- `docs/database-schema.md` (modified)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-001 is marked as `done` in the task board
- [ ] Verify `packages/server/src/types/game-entities.ts` exists and contains the current `Empire` interface
- [ ] Verify `packages/server/migrations/001_initial_game_schema.sql` exists and includes the `empires` table definition

### Step 1: Add explored_systems column to empires table

- [ ] Create new migration file `packages/server/migrations/002_add_explored_systems_to_empires.sql`
- [ ] Add SQL to alter the `empires` table: `ALTER TABLE empires ADD COLUMN explored_systems JSONB NOT NULL DEFAULT '[]'::JSONB;`
- [ ] Add a column comment explaining `explored_systems` stores an array of explored star system UUIDs
- [ ] Include ERD summary update in the migration header comment
- [ ] Run the migration against the test PostgreSQL instance to verify it applies cleanly

**Artifacts:**
- `packages/server/migrations/002_add_explored_systems_to_empires.sql` (new)

### Step 2: Update Empire interface in game-entities.ts

- [ ] Add `explored_systems: string[];` to the `Empire` interface in `packages/server/src/types/game-entities.ts`
- [ ] Ensure the type aligns with the JSONB column (string array of UUIDs matching the `stars.id` format)

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 3: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Add a test to `packages/server/tests/migration.test.ts` verifying:
  - The `empires.explored_systems` column exists and has the correct JSONB type
  - Inserting an empire with a valid `explored_systems` array (string UUIDs) succeeds
  - Querying and updating the `explored_systems` column works as expected
- [ ] Run lint check (`pnpm lint` in `packages/server`)
- [ ] Run full test suite (`pnpm test` in `packages/server`)
- [ ] Run project typecheck (`pnpm typecheck` in `packages/server` if available)
- [ ] Fix all failures
- [ ] Build passes (if `packages/server` has build scripts)

### Step 4: Documentation & Delivery

- [ ] Update `docs/database-schema.md` to add the `explored_systems` column to the `empires` table section, including type, default value, and purpose
- [ ] Save updated documentation content via `fn_task_document_write` (key="docs", content=updated schema markdown)
- [ ] Create follow-up tasks for any out-of-scope findings via `fn_task_create`

## Documentation Requirements

**Must Update:**
- `docs/database-schema.md` — add `explored_systems` column details to the `empires` table documentation

**Check If Affected:**
- `packages/server/src/types/game-entities.ts` — no additional updates needed beyond the interface change

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All migration and entity tests passing
- [ ] Typecheck passing (if available)
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-009): complete Step N — description`
- **Bug fixes:** `fix(FN-009): description`
- **Tests:** `test(FN-009): description`

## Do NOT

- Expand task scope beyond adding the `explored_systems` column and updating the `Empire` interface
- Skip migration or interface tests
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task adds new functionality (no net removals of existing features), so no changeset file is required.
