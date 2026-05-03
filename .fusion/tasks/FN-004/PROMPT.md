# Task: FN-004 - Server-side game state management

**Created:** 2026-05-03
**Size:** M

## Review Level: 2 (Plan and Code)

**Assessment:** Modifies core server-side state handling logic, introduces new visibility filtering and state reconstruction capabilities, moderate blast radius on database interactions and API responses.
**Score:** 5/8 — Blast radius: 1, Pattern novelty: 1, Security: 1, Reversibility: 2

## Mission

Implement Node.js services for querying and mutating server-side game state, including empire-specific visibility (fog-of-war) filtering and full state reconstruction from PostgreSQL turn history. This enables secure, deterministic state delivery to clients and turn replay for verification, supporting the Milestone 1 single-player MVP's core simulation requirements.

## Dependencies

- **Task:** FN-001 (Database schema & entity models) — must complete PostgreSQL schema and entity models first. **Critical Blocker**: FN-001's current schema does NOT include the `explored_systems` JSONB column on the `empires` table required for visibility filtering. If FN-001 completes without this column, create a follow-up task via `fn_task_create` with title "Add explored_systems column to empires table" and description "Add explored_systems JSONB column to empires table and update Empire interface in game-entities.ts to include explored_systems: string[]" before starting Step 1.

## Context to Read First

- PROMPT.md of FN-001 (Database schema & entity models) — understand table structures, entity interfaces (including `TurnHistory` export, not `TurnHistoryEntry`), and JSONB usage for flexible component data
- `packages/server/src/types/game-entities.ts` (once FN-001 completes) — entity type definitions for stars, planets, fleets, empires, `TurnHistory`, etc.

## File Scope

- `packages/server/src/services/game-state.service.ts` (new)
- `packages/server/src/services/visibility.service.ts` (new)
- `packages/server/src/types/game-state.ts` (new)
- `packages/server/src/db/queries/game-state.queries.ts` (new)
- `packages/server/tests/services/game-state.test.ts` (new)
- `packages/server/tests/services/visibility.test.ts` (new)
- `packages/server/docs/server-state.md` (new)
- `packages/server/src/api/state.ts` (new) — optional test-only state endpoint, not required for core deliverable

## Contract Interface for FN-002 (Turn Resolution Pipeline)
*Aligned with FN-002's expected interface to avoid circular dependency:*
- `getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState>` — returns filtered state for the specified empire
- `VisibleGameState` type matches definition in `packages/server/src/types/game-state.ts`
- Turn history action format for state reconstruction: `{ type: string, payload: Record<string, any>, turnNumber: number }` stored as JSONB in `turn_history.actions` (per-empire `TurnHistory` entries)

## Steps

### Step 0: Preflight

- [ ] Confirm FN-001 is marked as done and PostgreSQL schema migrations are applied
- [ ] **Check for `empires.explored_systems` column**: Query the `empires` table to verify the `explored_systems` JSONB column exists. If missing, create a follow-up task via `fn_task_create` as described in Dependencies section
- [ ] Verify `packages/server/` directory structure exists (create `src/services`, `src/types`, `src/db/queries`, `tests/services` if missing)
- [ ] Confirm PostgreSQL connection works and all FN-001 tables (stars, planets, empires, fleets, turn_history, etc.) are accessible
- [ ] Review entity types from FN-001's `game-entities.ts` to align state shapes, particularly `TurnHistory` (not `TurnHistoryEntry`) type

### Step 1: Type Definitions & Core Query Setup

- [ ] Create `packages/server/src/types/game-state.ts` with explicitly defined types:
  ```typescript
  import { Star, Planet, StarLane, Empire, Fleet, BuildQueue, TurnHistory } from './game-entities';

  export interface FullGameState {
    stars: Star[];
    planets: Planet[];
    starLanes: StarLane[];
    empires: Empire[];
    fleets: Fleet[];
    buildQueues: BuildQueue[];
    turnHistory: TurnHistory[]; // Aggregated per-empire TurnHistory entries for the game
    currentTurn: number;
    gameId: string;
  }

  export interface VisibleGameState extends Omit<FullGameState, 'stars' | 'planets' | 'starLanes' | 'fleets'> {
    stars: Star[]; // Filtered to explored systems only
    planets: Planet[]; // Filtered to explored systems only
    starLanes: StarLane[]; // Filtered to lanes connecting explored systems
    fleets: Fleet[]; // Filtered to friendly fleets or fleets in explored systems
  }

  export interface TurnReconstructionOptions {
    gameId: string;
    turnNumber: number;
    includeHistory?: boolean;
  }

  // Action shape for turn history (aligned with FN-002 contract)
  export interface TurnAction {
    type: string;
    payload: Record<string, any>;
    turnNumber: number;
  }
  ```
- [ ] Implement `packages/server/src/db/queries/game-state.queries.ts` with parameterized SQL queries for:
  - `fetchFullGameState(gameId: string): Promise<FullGameState>` — joins all entity tables for a game
  - `fetchEmpireExploredSystems(empireId: string): Promise<string[]>` — reads `explored_systems` JSONB array from `empires` table, defaults to empty array if null
  - `fetchTurnHistoryForReconstruction(gameId: string, upToTurn: number): Promise<TurnHistory[]>` — fetches all per-empire `TurnHistory` entries for the game up to the target turn by joining with `empires` table to filter by game
- [ ] Write unit tests for query functions with mocked DB responses

**Artifacts:**
- `packages/server/src/types/game-state.ts` (new)
- `packages/server/src/db/queries/game-state.queries.ts` (new)
- `packages/server/tests/services/game-state.test.ts` (new, query tests)

### Step 2: Implement State Query & Mutation Core

- [ ] Implement `packages/server/src/services/game-state.service.ts` with methods:
  - `getFullGameState(gameId: string): Promise<FullGameState>` — fetches all entities from DB for a game using queries from Step 1
  - `getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState>` — fetches full state then applies visibility filtering via `visibility.service.ts`
  - `mutateGameState(gameId: string, updates: Partial<FullGameState>): Promise<void>` — applies validated state updates to DB with validation:
    - Validates all entity IDs in updates reference existing rows in the database
    - Prevents negative resource values, invalid entity type assignments
    - Merges partial updates with existing state before persisting
  - `reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState>` — rebuilds state by replaying `TurnAction` objects from `turn_history.actions` deterministically up to the target turn; throws `Error('Turn number X not found in history')` if target turn doesn't exist
- [ ] Write unit tests for core service methods including validation failure cases

**Artifacts:**
- `packages/server/src/services/game-state.service.ts` (new)
- `packages/server/tests/services/game-state.test.ts` (modified, service tests)

### Step 3: Implement Visibility (Fog-of-War) Filtering

- [ ] Implement `packages/server/src/services/visibility.service.ts` with `filterVisibleState(empireId: string, fullState: FullGameState): Promise<VisibleGameState>` that:
  - Reads the empire's `explored_systems` JSONB array via `fetchEmpireExploredSystems`, defaulting to empty array if null
  - Filters stars, planets, and star lanes to only include explored systems and their connected lanes
  - Filters fleets to only include friendly fleets or fleets located in explored systems
  - Redacts sensitive data for non-friendly entities (e.g., enemy build queue details, unexplored resource values set to `null`)
- [ ] Write unit tests for visibility filtering with mocked empire exploration data and full state inputs

**Artifacts:**
- `packages/server/src/services/visibility.service.ts` (new)
- `packages/server/tests/services/visibility.test.ts` (new)

### Step 4: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`pnpm lint` in `packages/server` if available, else project root)
- [ ] Run full test suite for the server package
- [ ] Run project typecheck if available (e.g., `pnpm typecheck`)
- [ ] Fix all failures
- [ ] Verify core functionality via integration test: insert test state → filter by visibility → reconstruct turn N state

### Step 5: Documentation & Delivery

- [ ] Create `packages/server/docs/server-state.md` with:
  - Service method signatures and responsibilities
  - Visibility filtering rules and `explored_systems` data format
  - Turn reconstruction logic, `TurnAction` shape, and deterministic replay guarantees
  - Example `FullGameState` and `VisibleGameState` response shapes
  - Query function reference
  - Contract interface section for FN-002 alignment
- [ ] Save documentation content via `fn_task_document_write` (key="docs", content=documentation markdown)
- [ ] Create follow-up tasks via `fn_task_create` for any out-of-scope findings (e.g., client API endpoints, advanced visibility rules for multiplayer)

## Documentation Requirements

**Must Update:**
- `packages/server/docs/server-state.md` — add full service documentation, visibility rules, and state reconstruction details

**Check If Affected:**
- `README.md` — update if adding new server-side state management features

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All tests passing (unit tests for services, visibility, and queries)
- [ ] Typecheck passing (if available)
- [ ] Documentation updated
- [ ] `getVisibleGameState` returns only empire-visible data as verified by tests
- [ ] `reconstructStateForTurn` correctly rebuilds state for any valid turn number using `TurnAction` history
- [ ] `mutateGameState` validates updates and persists changes correctly
- [ ] Contract interface aligns with FN-002's expected `getVisibleGameState` method
- [ ] All references use `TurnHistory` type (not `TurnHistoryEntry`) to match FN-001's exports

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-004): complete Step N — description`
- **Bug fixes:** `fix(FN-004): description`
- **Tests:** `test(FN-004): description`

## Do NOT

- Expand task scope to include client-side state management or permanent API endpoint implementation (test-only endpoints allowed)
- Skip visibility filtering or state reconstruction tests
- Refuse necessary fixes to FN-001 schema code that affect state queries (e.g., adding `explored_systems` column via follow-up task)
- Commit without the `FN-004` prefix
- Remove existing database tables or entity types from FN-001
- Modify frontend code (this is a server-side only task)

## Changeset Requirements

This task adds new functionality (no net removals of existing features), so no changeset file is required.
