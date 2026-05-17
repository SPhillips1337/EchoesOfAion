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

### Stitch Design System Integration (FN-025)
- **Success Pattern**: Google Stitch requires strictly formatted hex color strings (e.g. `#00d2ff`) in visual tokens. Registering a global design system asset (`assets/5421627871935160731`) successfully binds visual styling to the "Echoes of Aion" project (`projects/3604850732401499349`).

### Three.js 3D WebGL Command Deck Controls (FN-026)
- **Success Pattern**: Custom camera mapping configurations in OrbitControls enable highly intuitive pan/rotation mapping matching the ThreeDeeCity specifications (Left-click drag to pan, right-click drag to rotate) via:
  ```javascript
  controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
  };
  ```

### Web Speech API Advisor Events
- **Success Pattern**: Integrating built-in `window.speechSynthesis` with typewriter-style real-time subtitle logs provides deep, context-aware digital assistant immersion (Stellaris-style) without requiring local audio binary installations.

