# Task: FN-014 - Resolve auto-merge conflict on FN-007 (Galaxy core logic & type alignment)

**Created:** 2026-05-03
**Size:** S

## Review Level: 1 (Plan Only)

**Assessment:** Resolving a blocked auto-merge for FN-007 by addressing uncommitted worktree changes and completing the merge process. Low blast radius (single branch merge to main), no pattern novelty, no security impact, high reversibility.
**Score:** 3/8 — Blast radius: 1, Pattern novelty: 0, Security: 0, Reversibility: 2

## Mission

Resolve the auto-merge conflict blocking FN-007 (Galaxy core logic & type alignment) by clearing uncommitted changes in the `.worktrees/pale-quail` worktree that prevent merge, retrying the merge of `fusion/fn-007` into the `main` target branch, resolving any arising conflicts, and ensuring the merged code passes all quality checks to unblock FN-007's delivery.

## Dependencies

- **None** (FN-007's branch `fusion/fn-007` is assumed to contain complete, valid code per its PROMPT.md)

## Context to Read First

- `fn_task_get FN-007` (retrieved, confirms galaxy core logic scope does not include migration tests)
- Worktree directory: `/home/stephen/Documents/www/EchoesOfAion/.worktrees/pale-quail`
- Target branch: `main` (default project branch, merge destination for `fusion/fn-007`)
- Source branch: `fusion/fn-007` (FN-007's feature branch)
- Blocking file: `packages/server/tests/migration.test.ts` (uncommitted changes preventing merge, unrelated to FN-007's scope)

## File Scope

- `.worktrees/pale-quail/` (worktree directory)
- `packages/server/tests/migration.test.ts` (handle uncommitted changes)
- Any conflicted files arising during merge
- Merge commit metadata

## Steps

### Step 0: Preflight

- [ ] Navigate to worktree: `cd /home/stephen/Documents/www/EchoesOfAion/.worktrees/pale-quail`
- [ ] Verify current branch is `main` (target merge branch)
- [ ] Check `git status` to confirm `packages/server/tests/migration.test.ts` has uncommitted changes
- [ ] Confirm `fusion/fn-007` branch exists and contains complete FN-007 deliverables per its PROMPT.md (galaxy types, PRNG, generators, tests)
- [ ] Pull latest `main` branch changes: `git pull origin main`

### Step 1: Handle Uncommitted Changes

- [ ] Confirm changes to `packages/server/tests/migration.test.ts` are unrelated to FN-007's scope (FN-007 delivers galaxy core logic only, no migration test modifications)
- [ ] Stash unrelated changes: `git stash save "FN-014: temp stash of unrelated migration.test.ts changes"`
- [ ] Verify `git status` shows no uncommitted changes (clean working tree)
- [ ] Run `git diff` to confirm no pending modifications

### Step 2: Retry Merge

- [ ] Execute the previously failed merge command from the `main` branch: `git merge --squash fusion/fn-007`
- [ ] If merge succeeds without conflicts: Proceed to Step 3
- [ ] If conflicts arise: Note all conflicted files and proceed to Step 3

### Step 3: Resolve Merge Conflicts (if applicable)

- [ ] Open each conflicted file, resolve conflicts following FN-007's established patterns (referenced from its PROMPT.md: camelCase types, PRNG usage, generator logic)
- [ ] Stage resolved files with `git add <conflicted-file>`
- [ ] Complete the squash merge with: `git commit -m "feat(FN-014): merge FN-007 galaxy core logic & type alignment"`

### Step 4: Testing & Verification

> ZERO test failures allowed. Full test suite as quality gate.
> If keeping lint/tests/build/typecheck green requires edits outside the initial File Scope, make those fixes as part of this task.

- [ ] Install dependencies: `pnpm install` (from project root or worktree root)
- [ ] Run lint check: `pnpm lint` (in `packages/server`)
- [ ] Run full test suite: `vitest run` (in `packages/server`)
- [ ] Run project typecheck: `pnpm typecheck` (in `packages/server` if available)
- [ ] Fix all failures (including merge-introduced issues)
- [ ] Verify build passes (if `pnpm build` exists for `packages/server`)

### Step 5: Documentation & Delivery

- [ ] If merge changes affect FN-007's documentation (`docs/galaxy-core.md`), update it to reflect merged state
- [ ] Save merge resolution notes via `fn_task_document_write` (key="merge-notes", content=resolution steps and outcomes)
- [ ] Create out-of-scope findings as new tasks via `fn_task_create` tool
- [ ] (Optional) Restore stashed changes if needed: `git stash pop`

## Documentation Requirements

**Must Update:**
- `docs/galaxy-core.md` — update only if merge alters FN-007's documented behavior or interfaces

**Check If Affected:**
- `packages/server/tests/migration.test.ts` — verify stashed changes align with merged code after restoration

## Completion Criteria

- [ ] All steps complete
- [ ] Lint passing
- [ ] All tests passing (including FN-007's galaxy tests and migration tests)
- [ ] Typecheck passing (if available)
- [ ] Merge successfully completed with no uncommitted changes remaining (stashed changes can be restored post-merge)

## Git Commit Convention

Commits at step boundaries. All commits include the task ID:

- **Step completion:** `feat(FN-014): complete Step N — description`
- **Bug fixes:** `fix(FN-014): description`
- **Tests:** `test(FN-014): description`

## Do NOT

- Expand task scope beyond merge conflict resolution
- Skip tests or quality checks
- Refuse necessary fixes just because they touch files outside the initial File Scope
- Commit without the task ID prefix
- Remove, delete, or gut modules, settings, interfaces, exports, or test files outside the File Scope
- Remove features as "cleanup" — if something seems unused, create a task via `fn_task_create`

## Changeset Requirements

This task resolves a merge conflict (no net removal of existing functionality), so no changeset file is required.
