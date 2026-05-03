# Task: FN-005 - Persist galaxy & performance check

**Created:** 2026-05-03
**Size:** M

## Review Level: 2 (Plan and Code)

**Assessment:** Blast radius is moderate (new persistence module and benchmark tests), pattern novelty is low (standard PostgreSQL insert operations and performance benchmarking), security is low (no sensitive data handling), reversibility is high (new code can be removed without affecting existing schema). Total score 4/8.
**Score:** 4/8 — Blast radius: 1, Pattern novelty: 1, Security: 0, Reversibility: 2

## Mission

Implement PostgreSQL persistence for generated galaxies using FN-001's `stars`, `planets`, and `star_lanes` tables, including type mapping between galaxy generation types (camelCase) and DB schema (snake_case). Benchmark 40-system galaxy generation + persistence to ensure completion in under 500ms. Verify seed-based reproducibility across multiple generation runs to guarantee consistent galaxy state when persisted.

## Dependencies

- **Task:** FN-007 (Galaxy core logic & type alignment must be complete, delivering seeded galaxy generation functions, TypeScript types, and traversability-validated star lane graphs)

## Context to Read First

- `packages/server/src/types/game-entities.ts` — DB entity interfaces (snake_case fields)
- `packages/server/src/db/schema.ts` — Table definitions, column mappings, and entity type map
- `packages/server/migrations/001_initial_game_schema.sql` — Official schema for stars, planets, star_lanes tables
- FN-007's PROMPT.md — Galaxy generation types, seeded PRNG implementation, and generation function signatures

## File Scope

- `packages/server/src/db/client.ts` (new — PostgreSQL connection pool)
- `packages/server/src/galaxy/type-mapper.ts` (new — generation-to-DB type conversion)
- `packages/server/src/galaxy/persistence.ts` (new — galaxy insert logic)
- `packages/server/tests/galaxy-persistence.test.ts` (new — persistence, benchmark, and reproducibility tests)
- `docs/galaxy-persistence.md` (new — documentation)
- `packages/server/.env.test` (new — test database configuration)

## Steps

### Step 0: Preflight

- [ ] FN-007 is marked as "done" in the task board
- [ ] PostgreSQL 14+ test instance is running and accessible
- [ ] Migration `001_initial_game_schema.sql` has been applied to the test database
- [ ] `packages/server` has all dependencies installed (`pg`, `@types/pg`)

### Step 1: Database Client & Type Mapping

- [ ] Create `packages/server/src/db/client.ts` with a `pg.Pool` instance configured via `DATABASE_URL` environment variable, including error handling and connection validation
- [ ] Create `packages/server/src/galaxy/type-mapper.ts` with pure functions:
  - `mapStarToDB(generationStar: GalaxyStar): Star` — converts camelCase generation fields to snake_case DB fields
  - `mapPlanetToDB(generationPlanet: GalaxyPlanet): Planet` — same for planets
  - `mapStarLaneToDB(generationStarLane: GalaxyStarLane): StarLane` — same for star lanes
- [ ] Write unit tests for type-mapper functions in `galaxy-persistence.test.ts` verifying correct field mapping (e.g., `xCoord` → `x_coord`, `starId` → `star_id`)
- [ ] Run targeted tests for type-mapper changes

**Artifacts:**
- `packages/server/src/db/client.ts` (new)
- `packages/server/src/galaxy/type-mapper.ts` (new)

### Step 2: Galaxy Persistence Implementation

- [ ] Create `packages/server/src/galaxy/persistence.ts` with:
  - `persistGalaxy(galaxy: GeneratedGalaxy): Promise<void>` — wraps all inserts in a single transaction
  - Insert logic for stars first (to satisfy planet/star lane foreign keys), then planets, then star lanes
  - UUID generation for new entities using `crypto.randomUUID()` (or DB-generated UUIDs if preferred)
  - Error handling for duplicate inserts or constraint violations
- [ ] Write integration tests in `galaxy-persistence.test.ts`:
  - Generate a test galaxy via FN-007's functions, persist it, and query the DB to verify all entities exist with correct field values
  - Test transaction rollback on partial failure (e.g., invalid star lane reference)

**Artifacts:**
- `packages/server/src/galaxy/persistence.ts` (new)

### Step 3: Performance Benchmarking

- [ ] Add a benchmark test in `galaxy-persistence.test.ts`:
  - Use FN-007's seeded generator to create a 40-system galaxy
  - Measure total time from generation start to persistence completion (including DB inserts)
  - Assert total time is under 500ms
- [ ] Run benchmark test; if failing, optimize (e.g., batch inserts, disable unused indexes during bulk load, or optimize generation logic in coordination with FN-007 if needed)

### Step 4: Seed-based Reproducibility Verification

- [ ] Add a reproducibility test in `galaxy-persistence.test.ts`:
  - Generate two 40-system galaxies with the same seed using FN-007's generator
  - Persist both galaxies
  - Query both datasets and compare content fields (excluding `id` and `created_at` which are generated at persistence time)
  - Assert all stars, planets, and star lanes have identical content (coordinates, types, resource distributions, lane connections)
- [ ] Run test and verify it passes

### Step 5: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`cd packages/server && pnpm lint`)
- [ ] Run full test suite (`cd packages/server && pnpm test`)
- [ ] Run project typecheck (`cd packages/server && pnpm typecheck`)
- [ ] Fix all failures
- [ ] Verify build passes (if `build` script exists in `packages/server/package.json`)

### Step 6: Documentation & Delivery

- [ ] Create `docs/galaxy-persistence.md` with:
  - Persistence workflow and transaction semantics
  - Type mapping rules between generation and DB schemas
  - Benchmark methodology and results
  - Reproducibility guarantees and seed behavior
- [ ] Save documentation deliverables via `fn_task_document_write` (key="docs", content=documentation markdown)
- [ ] Create follow-up tasks for out-of-scope findings (e.g., missing indexes, connection pool tuning) via `fn_task_create`

## Documentation Requirements

**Must Update:**
- `docs/galaxy-persistence.md` — add persistence implementation details, benchmark results, and reproducibility notes

**Check If Affected:**
- `docs/database-schema.md` — update if persistence adds new query patterns or index recommendations

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing in `packages/server`
- [ ] All tests passing (unit, integration, benchmark, reproducibility)
- [ ] Typecheck passing in `packages/server`
- [ ] Documentation updated
- [ ] 40-system galaxy generation + persistence completes in <500ms
- [ ] Seed-based reproducibility verified across 3+ test runs

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-005): complete Step N — description`
- **Bug fixes:** `fix(FN-005): description`
- **Tests:** `test(FN-005): description`
- **Docs:** `docs(FN-005): description`

## Do NOT

- Expand task scope to include other entities (empires, fleets) beyond stars, planets, star_lanes
- Skip performance benchmarking or reproducibility verification
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task adds new functionality (no net removals), so no changeset file is required.
