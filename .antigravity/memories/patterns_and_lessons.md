# Patterns & Lessons

## ⚠️ Failures & Lessons Learned

### Turn Resolution Pipeline (FN-002)
- **Issue**: Failed review.
- **Lesson**: Ensure all edge cases in the turn resolution (e.g., empty queues, simultaneous events) are covered by tests before submitting for review.

### Game State Management (FN-017 / FN-024)
- **Issue**: Auto-merge conflict after 2 retry attempts.
- **Lesson**: When working on fundamental changes (like game state management), pull from main frequently and resolve conflicts locally rather than relying on auto-mergers for complex diffs.
- **Merge Conflict Root Cause (FN-024)**: The `.fusion/` directory and test outputs (e.g., `vitest/results.json`) were being tracked by git despite being in `.gitignore`. **Solution**: Run `git rm --cached` on ignored files to prevent dirty worktrees from breaking automated agents.
- **Vitest Mocking Pitfalls**: When using `vi.mock` for module dependencies, attempting to re-mock them dynamically within test blocks (`vi.mocked(fn).mockResolvedValue()`) can lead to race conditions or silent failures if the mock factory isn't configured robustly. **Solution**: Use `vi.spyOn` in `beforeEach` to mock module exports directly; it guarantees reliable resetting and overrides across multiple test blocks.

## ✅ Success Patterns

### Galaxy Generation (FN-004, 005, 006)
- **Pattern**: Using a consistent PRNG (FN-007) across all generators ensures deterministic galaxy generation, which is critical for multiplayer and persistence.
