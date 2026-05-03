# Task: FN-012 - Add game_id field to entity interfaces in game-entities.ts

**Created:** 2026-05-03
**Size:** S

## Review Level: 1 (Plan Only)

**Assessment:** Low blast radius (single file change), no pattern novelty (simple field addition following existing conventions), no security impact, high reversibility (field can be removed easily).
**Score:** 2/8 — Blast radius: 1, Pattern novelty: 0, Security: 0, Reversibility: 1

## Mission

Add the `game_id: string` (UUID) field to all core entity interfaces in `packages/server/src/types/game-entities.ts` — specifically Star, Planet, StarLane, Empire, Fleet, BuildQueue, and TurnHistory. This aligns the TypeScript interfaces with the future games table schema being implemented in FN-010, ensuring type safety when associating entities with specific game instances.

## Dependencies

- **Task:** FN-001 (Initial database schema and entity models — provides the base interfaces to modify)

## Context to Read First

- `packages/server/src/types/game-entities.ts` — the file containing all entity interfaces to be modified
- `packages/server/src/types/game.ts` (if exists) — may contain the Game interface from FN-010
- FN-010 PROMPT.md — confirms the game_id field type and naming convention (`game_id: string` for UUIDs)

## File Scope

- `packages/server/src/types/game-entities.ts` (modified)

## Steps

### Step 0: Preflight

- [ ] Confirm `packages/server/src/types/game-entities.ts` exists and is readable
- [ ] Verify FN-001 is complete (base interfaces exist)
- [ ] Read the current interfaces to understand the exact structure

### Step 1: Add game_id to Star interface

- [ ] Add `game_id: string; // UUID` field to the Star interface (place after `id` field following existing convention)
- [ ] Verify the field uses `string` type (UUID represented as string, consistent with other ID fields like `star_id`, `empire_id`)

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 2: Add game_id to Planet interface

- [ ] Add `game_id: string; // UUID` field to the Planet interface (place after `id` field)
- [ ] Verify consistency with Star interface pattern

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 3: Add game_id to StarLane interface

- [ ] Add `game_id: string; // UUID` field to the StarLane interface (place after `id` field)
- [ ] Verify consistency with other interfaces

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 4: Add game_id to Empire interface

- [ ] Add `game_id: string; // UUID` field to the Empire interface (place after `id` field)
- [ ] Verify consistency with other interfaces

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 5: Add game_id to Fleet interface

- [ ] Add `game_id: string; // UUID` field to the Fleet interface (place after `id` field)
- [ ] Verify consistency with other interfaces

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 6: Add game_id to BuildQueue interface

- [ ] Add `game_id: string; // UUID` field to the BuildQueue interface (place after `id` field)
- [ ] Verify consistency with other interfaces

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 7: Add game_id to TurnHistory interface

- [ ] Add `game_id: string; // UUID` field to the TurnHistory interface (place after `id` field)
- [ ] Verify consistency with other interfaces

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 8: Verify and Test

- [ ] Run typecheck (`pnpm typecheck` in packages/server) to ensure all interfaces are valid
- [ ] Run lint check (`pnpm lint` in packages/server) to ensure no style violations
- [ ] Verify no other files in the project break due to the new required field (search for usages of these interfaces)
- [ ] If interface consumers need updates to provide game_id, note them via `fn_task_create` for follow-up (do NOT expand scope of this task to fix them)

**Artifacts:**
- `packages/server/src/types/game-entities.ts` (modified)

### Step 9: Documentation & Delivery

- [ ] Update any inline comments if needed to document the game_id field purpose
- [ ] Save documentation deliverables as task documents via `fn_task_document_write` (key="docs", content="Added game_id field to Star, Planet, StarLane, Empire, Fleet, BuildQueue, TurnHistory interfaces in game-entities.ts")
- [ ] Create follow-up task if interface consumers (e.g., factories, test fixtures, API handlers) need updating to provide game_id

## Documentation Requirements

**Must Update:**
- Inline comments in `packages/server/src/types/game-entities.ts` — add brief comment on game_id field if not already present

**Check If Affected:**
- `docs/database-schema.md` — check if interface documentation needs updating (FN-010 will handle the main schema docs update)
- `packages/server/src/db/schema.ts` — note that COLUMNS constants will be updated by FN-010, not this task

## Completion Criteria

- [ ] All 7 entity interfaces have `game_id: string; // UUID` field added
- [ ] Typecheck passing
- [ ] Lint passing
- [ ] No test failures (if tests exist for the types module)
- [ ] Documentation updated

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-012): complete Step N — description`
- **Bug fixes:** `fix(FN-012): description`
- **Tests:** `test(FN-012): description`

## Do NOT

- Expand task scope to update database migrations (that's FN-010's job)
- Update `packages/server/src/db/schema.ts` COLUMNS constants (that's FN-010's job)
- Update test fixtures or factories to provide game_id (create follow-up task instead)
- Modify interfaces not listed in the task (Ship, Structure)
- Commit without the task ID prefix
- Remove existing fields or functionality

## Changeset Requirements

This task adds new functionality (no removals), so no changeset file is required.
