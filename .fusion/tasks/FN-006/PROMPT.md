# Task: FN-006 - Galaxy generation testing & documentation

**Created:** 2026-05-03
**Size:** M

## Review Level: 1 (Plan and Code)

**Assessment:** Standard testing of existing galaxy generation logic with no novel patterns, low blast radius (adding tests, docs, and a small composite utility), and fully reversible changes.
**Score:** 3/8 — Blast radius: 1, Pattern novelty: 0, Security: 0, Reversibility: 2

## Mission

Write comprehensive automated tests for the galaxy generation system delivered by FN-007 (and persisted via FN-005). Compose a `generateGalaxy(seed: string, count?: number): GeneratedGalaxy` utility using FN-007's actual deliverables. Validate system count ranges (25-40 default, 40 for performance), planet distributions (1-4 per system), star lane traversability (via independent BFS), seed reproducibility, and generation-only performance (<50ms for 40-system galaxies). Ensure the full project test suite, lint, and typecheck pass. Create clear documentation for galaxy generation parameters, behavior, and update project references.

## Dependencies

- **Task:** FN-007 (Galaxy core logic & type alignment must be complete, delivering:
  - `packages/server/src/galaxy/star-generator.ts` exporting `generateStarSystems(seed: string, count?: number): GalaxyStar[]`
  - `packages/server/src/galaxy/planet-generator.ts` exporting `generatePlanetsForSystem(star: GalaxyStar, seed: string): GalaxyPlanet[]`
  - `packages/server/src/galaxy/lane-generator.ts` exporting `generateStarLanes(stars: GalaxyStar[], seed: string): GalaxyStarLane[]`
  - Types: `GalaxyStar` (with `id` field), `GalaxyPlanet` (with `id` field), `GalaxyStarLane` (with `id` field) in `packages/server/src/galaxy/types.ts`
  - `packages/server/src/galaxy/` directory must exist)
- **Task:** FN-005 (Galaxy persistence must be complete, delivering `persistGalaxy` which uses a preliminary `GeneratedGalaxy` type that FN-006 will formalize and replace via `packages/server/src/galaxy/index.ts`)

## Context to Read First

- FN-007 PROMPT.md (actual function signatures: `generateStarSystems` from `star-generator.ts`, `generatePlanetsForSystem`, `generateStarLanes`)
- FN-007's `packages/server/src/galaxy/types.ts` (verified: `GalaxyStar`, `GalaxyPlanet`, `GalaxyStarLane` all include `id` fields)
- FN-005 PROMPT.md (persistence layer and existing vitest test patterns in `packages/server/tests/`)
- `packages/server/tests/galaxy.test.ts` (FN-007's test file for PRNG/types — FN-006's tests are separate)
- `packages/server/package.json` (test: `vitest run`, lint: `eslint src --ext .ts`, typecheck: `tsc --noEmit`)
- `docs/database-schema.md` (existing project documentation structure)

## File Scope

- `packages/server/src/galaxy/index.ts` (new — composite `generateGalaxy` function, `GeneratedGalaxy` type, extended `GalaxyStarWithPlanets` type (exported), and re-exports of FN-007's generators)
- `packages/server/tests/galaxy-generation.test.ts` (new test file using vitest — separate from FN-007's `galaxy.test.ts`)
- `docs/galaxy-generation.md` (new documentation)
- `docs/database-schema.md` (update only if galaxy generation parameters are referenced in schema docs)

## Steps

### Step 0: Preflight

- [ ] FN-007 and FN-005 are marked as "done" in the task board
- [ ] **Fallback:** If FN-007 or FN-005 are not marked done, create a blocker task via `fn_task_create` describing missing deliverables and halt work
- [ ] `packages/server/src/galaxy/` directory exists with all FN-007 deliverable files:
  - `star-generator.ts` (not `star-systems-generator.ts`)
  - `planet-generator.ts`
  - `lane-generator.ts`
  - `types.ts` (contains `GalaxyStar`, `GalaxyPlanet`, `GalaxyStarLane` with `id` fields)
- [ ] Verify function exports match expected signatures:
  - `generateStarSystems` accepts `(seed: string, count?: number)` from `star-generator.ts`
  - `generatePlanetsForSystem` accepts `(star: GalaxyStar, seed: string)` from `planet-generator.ts`
  - `generateStarLanes` accepts `(stars: GalaxyStar[], seed: string)` from `lane-generator.ts`
- [ ] Verify `GalaxyStar` in `types.ts` does NOT have `planets` field (extended type will be created in Step1)
- [ ] `packages/server/tests/` directory is writable
- [ ] `vitest` is installed in `packages/server` (verify via `pnpm list vitest`)

### Step1: Compose Galaxy Generation Utility

- [ ] Create `packages/server/src/galaxy/index.ts` with:
  - Re-exports of FN-007's generators and types for convenience
  - Extended type (exported): `GalaxyStarWithPlanets extends GalaxyStar { planets: GalaxyPlanet[] }`
  - `GeneratedGalaxy` type: `{ stars: GalaxyStarWithPlanets[]; starLanes: GalaxyStarLane[] }`
  - `generateGalaxy(seed: string, count?: number): GeneratedGalaxy` function that:
    1. Calls FN-007's `generateStarSystems(seed, count)` to get `GalaxyStar[]` (25-40 systems by default, or `count` if provided)
    2. For each star, calls `generatePlanetsForSystem(star, seed)` to get `GalaxyPlanet[]`, assigns to `star.planets` (cast to `GalaxyStarWithPlanets`)
    3. Calls `generateStarLanes(stars as GalaxyStarWithPlanets[], seed)` to get `GalaxyStarLane[]`
    4. Returns `{ stars: stars as GalaxyStarWithPlanets[], starLanes }`
- [ ] Add unit test for `generateGalaxy` in `galaxy-generation.test.ts` to verify it returns valid `stars` (25-40 length by default) and `starLanes` (non-empty)
- [ ] Run targeted tests: `cd packages/server && pnpm test -- galaxy-generation.test.ts`
- [ ] Fix any failing tests

**Artifacts:**
- `packages/server/src/galaxy/index.ts` (new)

### Step2: Write Galaxy Generation Tests

Expand `packages/server/tests/galaxy-generation.test.ts` using vitest with the following test cases:

- [ ] **System count validation:** Call `generateGalaxy("test-seed")` with a random seed string, assert `galaxy.stars.length` is between 25-40 inclusive
- [ ] **Planet count per system:** For each `star` in `galaxy.stars`, assert `star.planets.length` is between 1-4 inclusive
- [ ] **Full traversability (independent BFS):**
  - Build adjacency list: `Map<string, string[]>` where key is star ID, value is array of connected star IDs via `galaxy.starLanes` (check both `fromStarId` and `toStarId`)
  - Run BFS from `galaxy.stars[0].id`, collect visited star IDs
  - Assert all `galaxy.stars.map(s => s.id)` are in visited set (no isolated systems)
- [ ] **Seed reproducibility:** Generate two galaxies with seed `"12345"`:
  - Strip `id` fields from all `stars`, nested `planets`, and `starLanes` (using `JSON.parse(JSON.stringify(galaxy))` and deleting `id` properties recursively — `id` fields exist per FN-007's types)
  - Deep equal the stripped galaxy objects
- [ ] **Performance benchmark:** Call `generateGalaxy("perf-seed", 40)` to force 40 systems, measure time via `performance.now()`, assert total generation time <50ms (generation-only; note: benchmark may vary in CI environments, target is <50ms on standard dev machines)
- [ ] Run targeted tests: `cd packages/server && pnpm test -- galaxy-generation.test.ts`
- [ ] Fix all failing targeted tests

**Artifacts:**
- `packages/server/tests/galaxy-generation.test.ts` (new)

### Step 3: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Run lint check: `cd packages/server && pnpm lint`
- [ ] Run full test suite: `cd packages/server && pnpm test` (includes both `galaxy.test.ts` and `galaxy-generation.test.ts`)
- [ ] Run project typecheck: `cd packages/server && pnpm typecheck`
- [ ] Fix all lint, test, and typecheck failures
- [ ] Verify no build errors (if `build` script exists in `packages/server/package.json`)

### Step 4: Documentation & Delivery

- [ ] Create `docs/galaxy-generation.md` with:
  - **Parameters:** `seed` (string, used for PRNG via FN-007's `createSeededPrng`), optional `count` (number, system count override), system count range (25-40 default), planet count range (1-4 per system)
  - **Behavior guarantees:** Traversability (all systems connected via star lanes), seed reproducibility, <50ms generation time for 40-system galaxies (generation-only)
  - **Function reference:** `generateGalaxy(seed: string, count?: number): GeneratedGalaxy` signature (composed from FN-007's generators), `GeneratedGalaxy` type fields (`stars` with nested `planets`, `starLanes`)
  - **Test coverage:** List of validated behaviors (system count, planet count, traversability, reproducibility, performance)
  - **Link to persistence:** Reference FN-005 for PostgreSQL persistence of generated galaxies, note `GeneratedGalaxy` type is defined in FN-006's `index.ts` and replaces FN-005's preliminary type
- [ ] Update `docs/database-schema.md` only if galaxy generation parameters are referenced in existing schema documentation
- [ ] Save final documentation content via `fn_task_document_write` (key="docs", content=documentation markdown)
- [ ] Create follow-up tasks for out-of-scope findings (e.g., missing edge case tests) via `fn_task_create`

## Documentation Requirements

**Must Update:**
- `docs/galaxy-generation.md` — add comprehensive galaxy generation documentation as specified in Step 4

**Check If Affected:**
- `docs/database-schema.md` — update only if galaxy generation is explicitly referenced in schema docs

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing in `packages/server` (0 errors)
- [ ] All tests passing (unit, integration, performance, reproducibility in `galaxy-generation.test.ts`)
- [ ] Typecheck passing in `packages/server` (0 type errors)
- [ ] Documentation updated with all required sections
- [ ] All required test cases pass (system count, planet count, traversability, reproducibility, <50ms performance for 40 systems)

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-006): complete Step N — description`
- **Bug fixes:** `fix(FN-006): description`
- **Tests:** `test(FN-006): description`
- **Docs:** `docs(FN-006): description`

## Do NOT

- Expand task scope beyond galaxy generation testing, documentation, and composing the missing composite utility
- Skip any required test case (system count, planet count, traversability, reproducibility, performance)
- Refuse necessary fixes to lint/test/typecheck failures even if outside initial File Scope
- Commit without the `FN-006` task ID prefix
- Remove existing functionality, test files, or documentation without creating follow-up tasks
- Remove features as "cleanup" — create follow-up tasks via `fn_task_create` for unused code

## Changeset Requirements

This task adds new functionality (composite `generateGalaxy` utility, tests, docs) with no net removals, so no changeset file is required.
