# Task: FN-018 - Update interface consumers to provide game_id and make field required

**Created:** 2026-05-03
**Size:** M

## Review Level: 1 (Plan Only)

**Assessment:** Moderate blast radius (affects entity interfaces, galaxy generators, test fixtures, and API handlers), no pattern novelty (standard field population following existing conventions), no security impact, moderate reversibility (field can be reverted to optional if needed).
**Score:** 3/8 — Blast radius: 2, Pattern novelty: 0, Security: 0, Reversibility: 1

## Mission

Update all consumers of core entity interfaces (galaxy generators, test fixtures/factories, and API handlers) to provide the `game_id` field when creating or persisting entities, as required by the future games table schema. Once all consumers are confirmed to provide `game_id`, make the field required in the entity interfaces (currently added as optional in FN-012) to ensure type safety and alignment with the database schema being implemented in FN-010.

## Dependencies

- **Task:** FN-012 (Add game_id field to entity interfaces — must be complete to ensure the field exists in interfaces)

## Context to Read First

- `packages/server/src/types/game-entities.ts` — current state of entity interfaces with optional `game_id` field
- FN-012 PROMPT.md — confirms `game_id` field type and naming convention
- `packages/server/src/galaxy/generators.ts` — galaxy generator logic that creates entities
- `packages/server/src/tests/fixtures/entity-fixtures.ts` — test fixtures for entities
- `packages/server/src/tests/factories/entity-factories.ts` — entity factory functions
- `packages/server/src/handlers/entity-handlers.ts` — API handlers for entity creation endpoints

## File Scope

- `packages/server/src/types/game-entities.ts` (modified: make `game_id` required)
- `packages/server/src/galaxy/generators.ts` (modified: accept `gameId` parameter)
- `packages/server/src/tests/fixtures/entity-fixtures.ts` (modified: add `game_id` to fixtures)
- `packages/server/src/tests/factories/entity-factories.ts` (modified: add `game_id` generation)
- `packages/server/src/handlers/entity-handlers.ts` (modified: populate `game_id` on creation)
- `packages/server/src/tests/**/*.test.ts` (modified: update tests to include `game_id`)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-012 is complete (game_id field exists as optional in `game-entities.ts`)
- [ ] Verify all context files exist and are readable
- [ ] Identify all usages of entity creation/persistence across the codebase to ensure no consumers are missed

### Step 1: Update galaxy generators to accept gameId parameter

- [ ] Modify galaxy generator functions (e.g., `generateGalaxy`, `createStarSystem`) to accept `gameId: string` parameter
- [ ] Pass `gameId` to all entity creation calls within the generator (stars, planets, star lanes, etc.)
- [ ] Run galaxy generation tests (`pnpm test:galaxy` in packages/server) to ensure no regressions

**Artifacts:**
- `packages/server/src/galaxy/generators.ts` (modified)

### Step 2: Update test fixtures and factories to provide game_id

- [ ] Add `game_id: string` field to all entity fixtures in `entity-fixtures.ts`
- [ ] Update entity factory functions to generate `game_id` (either via parameter or auto-generation for tests)
- [ ] Run all existing tests (`pnpm test` in packages/server) to ensure fixtures are valid

**Artifacts:**
- `packages/server/src/tests/fixtures/entity-fixtures.ts` (modified)
- `packages/server/src/tests/factories/entity-factories.ts` (modified)

### Step 3: Update API handlers to populate game_id when creating entities

- [ ] Modify API endpoint handlers for entity creation (stars, planets, empires, etc.) to extract `game_id` from request context (e.g., authenticated game session) or request parameters
- [ ] Populate `game_id` field on all new entity objects before persisting to the database
- [ ] Run API integration tests to verify `game_id` is correctly set

**Artifacts:**
- `packages/server/src/handlers/entity-handlers.ts` (modified)

### Step 4: Make game_id required in entity interfaces

- [ ] Update all entity interfaces in `game-entities.ts` to change `game_id` from optional (`game_id?: string`) to required (`game_id: string`)
- [ ] Run typecheck (`pnpm typecheck` in packages/server) to catch any remaining consumers missing `game_id`
- [ ] Fix any type errors identified by the typecheck

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 5: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`pnpm lint` in packages/server)
- [ ] Run full test suite (`pnpm test` in packages/server)
- [ ] Run project typecheck (`pnpm typecheck` in packages/server)
- [ ] Fix all failures
- [ ] Build passes (`pnpm build` in packages/server)

### Step 6: Documentation & Delivery

- [ ] Update inline comments in `game-entities.ts` to reflect `game_id` is now required
- [ ] Save documentation deliverables as task documents via `fn_task_document_write` (key="docs", content="Updated all entity interface consumers to provide game_id; made game_id required in entity interfaces")
- [ ] Create follow-up tasks for any out-of-scope findings via `fn_task_create`

## Documentation Requirements

**Must Update:**
- `packages/server/src/types/game-entities.ts` — update comments for `game_id` field to note it is now required
- `docs/entity-interfaces.md` (if exists) — update to reflect required `game_id` field

**Check If Affected:**
- `docs/database-schema.md` — check if `game_id` is documented as required (FN-010 will handle main schema docs)
- `packages/server/src/db/schema.ts` — confirm COLUMNS constants include `game_id` (handled by FN-010)

## Completion Criteria

- [ ] All galaxy generators accept and pass `gameId` parameter
- [ ] All test fixtures/factories include `game_id`
- [ ] All API handlers populate `game_id` on entity creation
- [ ] `game_id` is required in all entity interfaces
- [ ] Lint passing
- [ ] All tests passing
- [ ] Typecheck passing
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-018): complete Step N — description`
- **Bug fixes:** `fix(FN-018): description`
- **Tests:** `test(FN-018): description`

## Do NOT

- Expand scope to modify database migrations (that is FN-010's responsibility)
- Skip updating any consumer of entity interfaces
- Commit without the task ID prefix
- Remove existing functionality
- Make `game_id` required before all consumers are confirmed to provide it
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope

## Changeset Requirements

This task modifies existing functionality (changes `game_id` from optional to required), so a changeset file is REQUIRED:
- Create `.changeset/FN-018-required.md` explaining the change from optional to required `game_id` and why consumers were updated to provide it
