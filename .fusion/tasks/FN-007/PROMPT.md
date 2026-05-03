# Task: FN-007 - Galaxy core logic & type alignment

**Created:** 2026-05-03
**Size:** M

## Review Level: 2 (Plan and Code)

**Assessment:** Blast radius is low (new module only, no modifications to existing code), pattern novelty is low (standard PRNG and generator patterns), security is low (no user input handling), reversibility is high (all new files can be removed cleanly). Total score 4/8.
**Score:** 4/8 — Blast radius: 1, Pattern novelty: 1, Security: 0, Reversibility: 2

## Mission

Build the core galaxy generation logic for the 4X space strategy game, aligned with the FN-001 PostgreSQL schema. This includes defining camelCase TypeScript interfaces that map to FN-001's snake_case database entities, implementing a deterministic seeded pseudo-random number generator for reproducible galaxy layouts, generating 25-40 star systems with randomized properties, populating each system with 1-4 planets with habitability and resource distributions, and creating a fully connected star lane network validated via BFS traversability checks. This module will serve as the foundation for all galaxy-related gameplay systems.

## Dependencies

- **Task:** FN-001 (Database schema & entity models) — must be complete (verified as done)

## Context to Read First

- `packages/server/src/types/game-entities.ts` — FN-001's snake_case TypeScript interfaces matching PostgreSQL schema
- `packages/server/migrations/001_initial_game_schema.sql` — FN-001's database schema for stars, planets, and star lanes
- FN-001's PROMPT.md (already retrieved, confirms dependency completion)

## File Scope

- `packages/server/src/galaxy/types.ts` (new)
- `packages/server/src/galaxy/prng.ts` (new)
- `packages/server/src/galaxy/star-generator.ts` (new)
- `packages/server/src/galaxy/planet-generator.ts` (new)
- `packages/server/src/galaxy/lane-generator.ts` (new)
- `packages/server/tests/galaxy.test.ts` (new)
- `docs/galaxy-core.md` (new)

## Steps

### Step 0: Preflight

- [ ] Verify FN-001 is marked as done in the task board
- [ ] Confirm `packages/server/src/types/game-entities.ts` exists with the expected snake_case entity interfaces
- [ ] Confirm Vitest test framework is configured for `packages/server` (set up in FN-001)
- [ ] Create `packages/server/src/galaxy/` directory if it does not exist

### Step 1: Define Galaxy-Specific CamelCase Types

- [ ] Create `packages/server/src/galaxy/types.ts` with camelCase TypeScript interfaces that map 1:1 to FN-001's snake_case database entities:
  - `GalaxyStar`: maps to `Star` (id, name, xCoord, yCoord, systemSize, createdAt)
  - `GalaxyPlanet`: maps to `Planet` (id, starId, name, planetType, size, resources, habitable, createdAt)
  - `GalaxyStarLane`: maps to `StarLane` (id, sourceStarId, destinationStarId, distance, createdAt)
- [ ] Add type guard functions (`isGalaxyStar`, `isGalaxyPlanet`, `isGalaxyStarLane`) to validate entity shapes at runtime
- [ ] Write unit tests for type guards in `packages/server/tests/galaxy.test.ts`
- [ ] Run targeted tests for type definitions

**Artifacts:**
- `packages/server/src/galaxy/types.ts` (new)

### Step 2: Implement Seeded PRNG (mulberry32)

- [ ] Create `packages/server/src/galaxy/prng.ts` with a mulberry32 PRNG implementation
- [ ] Export a `createSeededPrng(seed: string | number)` function that returns a deterministic random number generator producing values in [0, 1)
- [ ] Ensure the same seed always produces the same sequence of random numbers
- [ ] Write tests verifying PRNG reproducibility and value range in `packages/server/tests/galaxy.test.ts`
- [ ] Run targeted tests for PRNG

**Artifacts:**
- `packages/server/src/galaxy/prng.ts` (new)

### Step 3: Generate Star Systems

- [ ] Create `packages/server/src/galaxy/star-generator.ts` with a `generateStarSystems(seed: string, count?: number)` function
- [ ] Default count to a random value between 25 and 40 (inclusive) using the seeded PRNG
- [ ] Randomize x/y coordinates within a fixed galaxy bounds (0-1000 for both axes)
- [ ] Randomize `systemSize` (small: 30%, medium: 50%, large: 20% probability) using PRNG
- [ ] Generate unique UUIDs for each star, and random names from a predefined list or pattern
- [ ] Write tests verifying star count range, coordinate bounds, and size distribution in `packages/server/tests/galaxy.test.ts`
- [ ] Run targeted tests for star generator

**Artifacts:**
- `packages/server/src/galaxy/star-generator.ts` (new)

### Step 4: Generate Planets Per System

- [ ] Create `packages/server/src/galaxy/planet-generator.ts` with a `generatePlanetsForSystem(star: GalaxyStar, seed: string)` function
- [ ] Return 1-4 `GalaxyPlanet` objects per system (randomized count using PRNG)
- [ ] Randomize `planetType` with weighted probabilities: terrestrial (30%), gas_giant (20%), ice (15%), desert (20%), ocean (15%)
- [ ] Set `habitable` to true with 40% probability for terrestrial planets, 10% for other types
- [ ] Generate `resources` as a Record with 2-4 random resource types (e.g., minerals, energy, research) with values 1-10
- [ ] Write tests verifying planet count per system, habitability rules, and resource structure in `packages/server/tests/galaxy.test.ts`
- [ ] Run targeted tests for planet generator

**Artifacts:**
- `packages/server/src/galaxy/planet-generator.ts` (new)

### Step 5: Generate Connected Star Lanes with BFS Validation

- [ ] Create `packages/server/src/galaxy/lane-generator.ts` with `generateStarLanes(stars: GalaxyStar[], seed: string)` function
- [ ] Generate ~1.5-2 lanes per star on average, prioritizing connections between closer stars (using Euclidean distance)
- [ ] Implement a BFS-based traversability check: verify all stars are reachable from any starting star
- [ ] If the initial lane set produces a disconnected graph, iteratively add the shortest missing connections between disconnected components until the graph is fully connected
- [ ] Calculate `distance` for each lane as the Euclidean distance between source and destination stars
- [ ] Write tests verifying lane count, full connectivity via BFS, and distance calculations in `packages/server/tests/galaxy.test.ts`
- [ ] Run targeted tests for lane generator

**Artifacts:**
- `packages/server/src/galaxy/lane-generator.ts` (new)

### Step 6: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check (`pnpm lint` in `packages/server`)
- [ ] Run full test suite (`vitest run` in `packages/server`)
- [ ] Run project typecheck (`pnpm typecheck` in `packages/server` if available)
- [ ] Fix all failures
- [ ] Build passes (if build scripts exist for `packages/server`)

### Step 7: Documentation & Delivery

- [ ] Create `docs/galaxy-core.md` with:
  - Type mapping reference (snake_case DB fields to camelCase TypeScript interfaces)
  - PRNG usage guidelines and seed requirements for reproducible galaxies
  - Generator function signatures, parameters, and behavior
  - BFS traversability validation logic and connectivity guarantees
- [ ] Save documentation deliverables as task documents via `fn_task_document_write` (key="docs", content=documentation markdown)
- [ ] Create out-of-scope findings as new tasks via `fn_task_create` tool

## Documentation Requirements

**Must Update:**
- `docs/galaxy-core.md` — add full galaxy core module documentation as described in Step 7

**Check If Affected:**
- `README.md` — update if adding galaxy generation setup instructions

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All tests passing (star, planet, lane generators and PRNG)
- [ ] Typecheck passing (if available)
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-007): complete Step N — description`
- **Bug fixes:** `fix(FN-007): description`
- **Tests:** `test(FN-007): description`

## Do NOT

- Expand task scope beyond galaxy core generation logic
- Skip tests for any generator or PRNG component
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task adds new functionality (no removals of existing features), so no changeset file is required.
