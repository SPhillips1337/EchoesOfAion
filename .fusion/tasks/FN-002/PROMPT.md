# Task: FN-002 - Turn resolution pipeline

**Created:** 2026-05-03
**Size:** M

## Review Level: 2 (Plan and Code)

**Assessment:** Modifies core game simulation logic, introduces new API endpoint for turn processing, moderate blast radius on server-side state management and database interactions.
**Score:** 5/8 — Blast radius: 2, Pattern novelty: 1, Security: 1, Reversibility: 1

## Mission

Build a server-side turn resolution pipeline for the browser-based 4X space strategy game that accepts validated player/AI orders, resolves movement, combat, and growth mechanics deterministically, and advances the game to the next turn with updated state persisted to PostgreSQL.

## Dependencies

- **Task:** FN-001 (Database schema & entity models) — COMPLETED (schema and migrations applied)
- **Task:** FN-007 (Galaxy core logic & type alignment) — IN TRIAGE (one-line PROMPT.md, needs full spec with type exports before FN-002 starts)
- **Task:** FN-004 (Server-side game state management) — IN TRIAGE (has documented blocker: missing `empires.explored_systems` JSONB column in FN-001 schema)

*Note: This task must not start until FN-007 has a complete PROMPT.md with type definitions, and FN-004's `explored_systems` blocker is resolved (either via FN-001 refinement or follow-up task).*

## Context to Read First

- PROMPT.md of FN-001 (Database schema & entity models) — understand table structures for fleets, empires, build queues
- PROMPT.md of FN-007 (Galaxy core logic & type alignment) — understand star lane graph structure, system/planet entity shapes, and type exports (replaces former FN-003)
- PROMPT.md of FN-004 (Server-side game state management) — understand state querying patterns and fog-of-war logic

### Contract Interfaces Expected from Dependencies (Provisional)
*Note: These interfaces are provisional until FN-007, FN-004 PROMPT.mds are finalized. Contract reconciliation step added to Step 0.*
- **From FN-007 (Galaxy core logic & type alignment):** `Galaxy` type with `systems: StarSystem[]`, `starLanes: StarLane[]`; `StarSystem` includes `id`, `xCoord`, `yCoord` (mapped from DB `x_coord`/`y_coord`), `planets: Planet[]`; `StarLane` includes `sourceSystemId`, `destinationSystemId` (mapped from DB `source_system_id`/`destination_system_id`)
- **From FN-004 (Server-side game state management):** `getVisibleGameState(empireId: string, gameId: string) => VisibleGameState` function; `VisibleGameState` type filtered by empire visibility (matches FN-004's actual export, not `GameState`)
- **From FN-001 (Database schema):** `Fleet`, `Empire`, `BuildQueue` entity types with corresponding PostgreSQL table names and column mappings; verify `empires.explored_systems` JSONB column exists

## File Scope

- `packages/server/src/turn-resolution/` (new directory)
  - `order-validator.ts` — order validation logic
  - `movement-resolver.ts` — fleet movement resolution
  - `combat-resolver.ts` — auto-resolve combat logic
  - `growth-resolver.ts` — resource/population/build queue processing
  - `turn-pipeline.ts` — main pipeline orchestration
- `packages/server/src/api/turn.ts` — API endpoint for turn resolution (new)
- `packages/server/src/api/index.ts` — API router to register new turn endpoint (new, FN-001 is responsible for creating base `packages/server/src/api/` structure; modified by FN-002 to add turn route)
- `packages/server/tests/turn-resolution/` (new directory)
  - `order-validator.test.ts`
  - `movement-resolver.test.ts`
  - `combat-resolver.test.ts`
  - `growth-resolver.test.ts`
  - `turn-pipeline.test.ts`
- `packages/server/migrations/002_add_current_turn_seed.sql` — New migration to add `current_turn_seed` column to games table (new)
- `packages/server/migrations/` — Turn history table already covered by FN-001

## Steps

### Step 0: Preflight

- [ ] Confirm FN-001 schema migrations applied (task is completed)
- [ ] Verify `empires.explored_systems` JSONB column exists in FN-001 schema (create follow-up task FN-004-1 if missing)
- [ ] Confirm FN-007 has complete PROMPT.md with type exports matching Contract Interfaces section
- [ ] Confirm FN-004 has resolved `explored_systems` blocker and defined `getVisibleGameState`/`VisibleGameState` exports
- [ ] **Contract Reconciliation:** Verify `StarSystem` uses `xCoord/yCoord`, `StarLane` uses `sourceSystemId`/`destinationSystemId` per FN-007 spec, and FN-004 exports `VisibleGameState` (not `GameState`); update FN-002 interfaces if mismatch found
- [ ] Confirm `packages/server/` directory structure exists (create if missing per project monorepo conventions)
- [ ] Verify PostgreSQL connection and schema migrations from FN-001 are applied
- [ ] If dependency PROMPT.mds are incomplete, create follow-up refinement tasks for FN-007/FN-004 via `fn_task_create` before proceeding
- [ ] Note: If dependency contracts change post-preflight, update this task via `fn_task_update` to reflect new interfaces

### Step 1: Order Validation

- [ ] Implement `order-validator.ts` with schema validation for order types (move, colonize, build, combat)
- [ ] Add permission checks (order issuer owns the fleet/colony, target is valid)
- [ ] Add game state validation (order references existing entities, turn is in resolution phase)
- [ ] Write unit tests for all validation failure cases

**Artifacts:**
- `packages/server/src/turn-resolution/order-validator.ts` (new)
- `packages/server/tests/turn-resolution/order-validator.test.ts` (new)

### Step 2: Movement Resolution

- [ ] Implement `movement-resolver.ts` to process fleet movement orders along star lanes
- [ ] Update fleet positions in PostgreSQL after successful movement
- [ ] Handle arrival events (discover systems, trigger exploration updates)
- [ ] Write unit tests for movement logic and edge cases (invalid lanes, blocked paths)

**Artifacts:**
- `packages/server/src/turn-resolution/movement-resolver.ts` (new)
- `packages/server/tests/turn-resolution/movement-resolver.test.ts` (new)

### Step 3: Combat Resolution

- [ ] Implement `combat-resolver.ts` with auto-resolve logic for fleet encounters
- [ ] Calculate damage based on fleet composition (ships, weapons) and environment
- [ ] Update fleet health, destroy defeated fleets, transfer captured systems if applicable
- [ ] Write unit tests for combat outcomes and deterministic behavior

**Artifacts:**
- `packages/server/src/turn-resolution/combat-resolver.ts` (new)
- `packages/server/tests/turn-resolution/combat-resolver.test.ts` (new)

### Step 4: Growth & Production Resolution

- [ ] Implement `growth-resolver.ts` to process resource collection, population growth, and build queue progress
- [ ] Update empire resources, planet populations, and complete finished builds
- [ ] Persist turn-end state snapshots to turn history table
- [ ] Write unit tests for growth calculations and build queue processing

**Artifacts:**
- `packages/server/src/turn-resolution/growth-resolver.ts` (new)
- `packages/server/tests/turn-resolution/growth-resolver.test.ts` (new)

### Step 5: Pipeline Orchestration & API Endpoint

- [ ] Implement `turn-pipeline.ts` to orchestrate validation → movement → combat → growth in deterministic order
- [ ] Create `POST /api/games/:gameId/turn/resolve` endpoint that accepts batch orders, runs pipeline, returns new game state
- [ ] Add error handling to reject invalid batches with descriptive messages
- [ ] Ensure identical inputs (orders + seed) produce identical outputs; seed is stored in game state as `currentTurnSeed` field
- [ ] Write integration tests for full pipeline flow

**Artifacts:**
- `packages/server/src/turn-resolution/turn-pipeline.ts` (new)
- `packages/server/src/api/turn.ts` (new)
- `packages/server/tests/turn-resolution/turn-pipeline.test.ts` (new)

### Step 6: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`pnpm lint` in packages/server if available, else project root)
- [ ] Run full test suite for server package
- [ ] Run project typecheck if available
- [ ] Fix all failures
- [ ] Verify API endpoint works via manual curl test or integration test

### Step 7: Documentation & Delivery

- [ ] Update server API documentation (create `packages/server/docs/api.md` if missing) with turn resolution endpoint details
- [ ] Save final documentation content via `fn_task_document_write` (key="docs", content=API docs and pipeline overview)
- [ ] Create follow-up tasks via `fn_task_create` for any out-of-scope findings (e.g., AI order generation, multiplayer support)

## Documentation Requirements

**Must Update:**
- `packages/server/docs/api.md` — add turn resolution endpoint specification, request/response schemas, error codes

**Check If Affected:**
- `README.md` — update if adding new server-side features

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All tests passing (unit + integration)
- [ ] Typecheck passing (if available)
- [ ] Documentation updated
- [ ] API endpoint accepts orders, resolves turn deterministically, rejects invalid orders

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-002): complete Step N — description`
- **Bug fixes:** `fix(FN-002): description`
- **Tests:** `test(FN-002): description`

## Do NOT

- Expand task scope to include AI order generation or multiplayer logic
- Skip tests for any resolver module
- Refuse necessary fixes to dependency code (FN-001/FN-003/FN-004) that affect this pipeline
- Commit without the `FN-002` prefix
- Remove existing database tables or API endpoints from dependencies
- Modify frontend code (this is a server-side only task)

## Changeset Requirements

If this task REMOVES existing functionality (deleting modules, settings, API endpoints, or exports), a changeset file is REQUIRED:
- Create `.changeset/FN-002-removal.md` explaining what was removed and why
- This is mandatory for any net-negative change (more deletions than additions to existing files)
