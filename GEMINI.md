# Project Instructions: Echoes of Aion

## 🛠 Tech Stack
- **Language**: TypeScript
- **Environment**: Node.js
- **Database**: PostgreSQL (Drizzle ORM mentioned in docs/database-schema.md)
- **Monorepo**: pnpm workspaces
- **Testing**: Vitest

## 📜 Conventions
- **Memory**: This project uses the Anti-Gravity LTM protocol. See `.antigravity/memories/` for historical context and status.
- **Task Tracking**: Tasks are prefixed with `FN-`.
- **Validation**: Changes must be validated by tests in `packages/server/tests/`.

## 📂 Key Files
- `packages/server/src/db/schema.ts`: Database schema.
- `packages/server/src/types/game-entities.ts`: Core entity interfaces.
- `packages/server/src/services/`: Core business logic.

## 🧠 Memory Index
- [Project Status](.antigravity/memories/codebase_insights/project_status.md)
- [Patterns & Lessons](.antigravity/memories/patterns_and_lessons.md)
