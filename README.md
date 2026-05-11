# 🌌 Echoes of Aion

Echoes of Aion is a deep 4X (Explore, Expand, Exploit, Exterminate) galactic strategy game built with TypeScript, Node.js, and PostgreSQL. Command your empire, explore star systems, colonize planets, manage resources, and engage in tactical fleet maneuvers to achieve galactic dominance.

## 🚀 Quick Start: Launching the Game

Follow these steps to get the game up and running for testing.

### 1. Prerequisites
- **Node.js**: v18 or higher
- **pnpm**: `npm install -g pnpm`
- **PostgreSQL**: Ensure a Postgres server is running locally

### 2. Launch with Docker (Recommended)
The easiest way to start the game is using Docker Compose, which handles both the database and the server:

```bash
# Start the database and server
docker-compose up -d
```
The game will be available at **[http://localhost:3000](http://localhost:3000)**.

### 3. Manual Installation (Alternative)
If you prefer to run services locally:

#### Database Setup
Ensure PostgreSQL is running and create the database:
```bash
# If postgres-client is installed:
createdb echoes_of_aion

# Or via psql:
psql -c "CREATE DATABASE echoes_of_aion;"
```

#### Application Setup
```bash
pnpm install
cd packages/server
pnpm run build
pnpm run start
```

### 5. Play the Game
Once the server is running, open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🎮 How to Test
1. **Create a Game**: Use the setup form to name your galaxy, set the number of star systems (4-20), and empires (2-8).
2. **Explore & Colonize**: Use the **Galaxy Map** to view your starting system. Add actions like `MOVE_FLEET` to unexplored stars or `COLONIZE_PLANET` to habitable worlds.
3. **Queue Actions**: Add multiple actions to your queue before submitting.
4. **Submit Turn**: Click **Submit Turn** to resolve your actions. The AI empires will move simultaneously, and results (including potential combat) will be displayed in the results panel.
5. **Monitor Victory**: Track your progress towards Domination, Conquest, Technology, Economic, or Exploration victories in the sidebar.

---

## 🛠 Project Structure
- `packages/server`: Core game engine, turn resolution, and API.
- `packages/client`: Premium-styled UI with interactive Galaxy Map.
- `docs/`: Detailed documentation on database schema and game mechanics.
- `.antigravity/`: Long-term memory and project status tracking.

## 🧪 Testing & Validation
The project includes a comprehensive suite of 176+ tests. To run them:

```bash
# Run all tests in the workspace
pnpm test

# Run server-specific tests with watch mode
cd packages/server
pnpm run test:watch
```

## 📜 License
MIT
