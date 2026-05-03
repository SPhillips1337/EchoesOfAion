# Task: FN-020 - Fix: Turn resolution pipeline

**Created:** 2026-05-03
**Size:** M

## Review Level: 3 (Full)

**Assessment:** The turn resolution pipeline is core to the 4X game loop; changes affect all game entities, persistence, and player experience. Pattern is game-specific but uses standard pipeline validation patterns. Input validation is required for security. Changes are reversible via PostgreSQL rollbacks.
**Score:** 6/8 — Blast radius: 2, Pattern novelty: 1, Security: 1, Reversibility: 2

## Mission

Build and fix the server-side turn resolution pipeline for the Echoes of Aion 4X space strategy game. The pipeline will accept batched player/AI orders, validate them against game state and rules, resolve all turn actions (movement, combat, resource growth, construction), advance the game to the next turn, and return the updated deterministic game state. This is the core engine enabling the sequential turn-based 4X loop for the Milestone 1 MVP.

## Dependencies

- **Task:** FN-019 (Validate: Turn resolution pipeline) — must complete validation and surface any required fixes before this task begins

## Context to Read First

- `packages/server/src/services/game-state.service.ts` — existing game state management and mutation logic
- `packages/server/src/types/game-state.ts` — FullGameState, VisibleGameState, and related type definitions
- `packages/server/src/db/queries/game-state.queries.ts` — database query functions for game state persistence
- `packages/server/package.json` — test/lint/typecheck commands and dependencies
- `packages/server/src/types/` — all type definitions for game entities (stars, planets, fleets, empires)

## File Scope

- `packages/server/src/services/turn-resolution.service.ts` (new)
- `packages/server/src/validation/order-validator.ts` (new)
- `packages/server/src/types/order.ts` (new)
- `packages/server/src/api/turn-routes.ts` (new)
- `packages/server/tests/turn-resolution.test.ts` (new)
- `packages/server/tests/order-validator.test.ts` (new)
- `packages/server/tests/turn-routes.test.ts` (new)
- `packages/server/tests/determinism.test.ts` (new)
- `packages/server/src/services/game-state.service.ts` (modify to integrate pipeline)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-019 is marked as "done" and all validation findings are available
- [ ] Verify PostgreSQL connection and existing game state schema is functional
- [ ] Confirm vitest test framework is configured (packages/server/package.json already includes vitest)

### Step 1: Implement Order Types & Validation

- [ ] Apply all validation findings from completed FN-019 task to OrderValidator and TurnResolutionService implementations
- [ ] Define order types in `packages/server/src/types/order.ts`: `Order` base interface, `MovementOrder`, `ColonizeOrder`, `BuildOrder`, `CombatOrder` with required fields (empireId, entityId, targetId, type, params)
- [ ] Implement `OrderValidator` in `packages/server/src/validation/order-validator.ts`:
  - [ ] Validate order structure matches type definitions
  - [ ] Check order sender is valid empire in the target game
  - [ ] Verify target entities (stars, planets, fleets) exist and are owned by the sender
  - [ ] Reject orders with invalid parameters (negative values, out-of-bounds targets)
- [ ] Write unit tests for `OrderValidator` covering valid/invalid orders

**Artifacts:**
- `packages/server/src/types/order.ts` (new)
- `packages/server/src/validation/order-validator.ts` (new)
- `packages/server/tests/order-validator.test.ts` (new)

### Step 2: Build Turn Resolution Pipeline

- [ ] Implement `TurnResolutionService` in `packages/server/src/services/turn-resolution.service.ts` with methods:
  - [ ] `resolveMovement(orders: MovementOrder[], gameState: FullGameState): FullGameState` — update fleet positions along star lanes
  - [ ] `resolveCombat(orders: CombatOrder[], gameState: FullGameState): FullGameState` — auto-resolve combat with basic AI, update fleet/planet ownership
  - [ ] `resolveGrowth(gameState: FullGameState): FullGameState` — update resource counts, process build queues, colonize new planets
  - [ ] `advanceTurn(gameId: string, resolvedState: FullGameState): Promise<void>` — wrap state persistence in a PostgreSQL transaction to support rollback, increment turn number, log turn history to `turn_history` table
- [ ] Integrate with existing `GameStateService` to fetch initial state and persist resolved state
- [ ] Write unit tests for each resolution method with mock game states

**Artifacts:**
- `packages/server/src/services/turn-resolution.service.ts` (new)
- `packages/server/tests/turn-resolution.test.ts` (new)

### Step 3: Create Batch Order API Endpoint

- [ ] Implement `POST /api/games/:gameId/turns/resolve` endpoint in `packages/server/src/api/turn-routes.ts`:
  - [ ] Accept batched order array in request body
  - [ ] Validate all orders using `OrderValidator`
  - [ ] Return 400 with error messages for invalid orders
  - [ ] Run full resolution pipeline on valid orders
  - [ ] Return updated `FullGameState` and new turn number on success
- [ ] Add API integration tests for success/error cases

**Artifacts:**
- `packages/server/src/api/turn-routes.ts` (new)
- `packages/server/tests/turn-routes.test.ts` (new)

### Step 4: Ensure Deterministic Resolution

- [ ] Add tests that run the same batch of orders twice against identical initial game states and assert identical output states
- [ ] Sort order processing by empire ID and order type to eliminate race condition effects
- [ ] Log resolved turn state to `turn_history` table for reconstruction (reuse existing `fetchTurnHistoryForReconstruction` query)

**Artifacts:**
- `packages/server/tests/determinism.test.ts` (new)

### Step 5: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`pnpm lint` in packages/server)
- [ ] Run full test suite (`pnpm test` in packages/server)
- [ ] Run project typecheck (`pnpm typecheck` in packages/server)
- [ ] Fix all failures
- [ ] Build passes

### Step 6: Documentation & Delivery

- [ ] Update `packages/server/README.md` with turn resolution pipeline usage and API endpoint documentation
- [ ] Save documentation deliverables as task documents via `fn_task_document_write` (key="docs", content=...)
- [ ] Out-of-scope findings created as new tasks via `fn_task_create` tool

## Documentation Requirements

**Must Update:**
- `packages/server/README.md` — add section for Turn Resolution Pipeline: order types, validation rules, API endpoint, determinism guarantees

**Check If Affected:**
- `packages/server/src/types/game-state.ts` — update if new state fields are added during resolution

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All tests passing (unit, integration, determinism)
- [ ] Typecheck passing
- [ ] Documentation updated
- [ ] Batch order API rejects invalid orders with clear errors
- [ ] Resolution is deterministic for identical inputs

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-020): complete Step N — description`
- **Bug fixes:** `fix(FN-020): description`
- **Tests:** `test(FN-020): description`

## Do NOT

- Expand task scope beyond turn resolution pipeline fixes and implementation
- Skip tests or determinism checks
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

If this task REMOVES existing functionality (deleting modules, settings, API endpoints, or exports), a changeset file is REQUIRED:
- Create `.changeset/FN-020-removal.md` explaining what was removed and why
- This is mandatory for any net-negative change (more deletions than additions to existing files)
