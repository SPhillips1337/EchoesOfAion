# Server-Side Game State Management

## Overview
This module provides services for querying, mutating, and reconstructing server-side game state with empire-specific visibility (fog-of-war) filtering. It supports the Milestone 1 single-player MVP's core simulation requirements.

## Service Methods

### GameStateService
Located at `src/services/game-state.service.ts`

#### `getFullGameState(gameId: string): Promise<FullGameState>`
Fetches complete unfiltered game state for a specific game, aggregating all entity types from the database.

#### `getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState>`
Returns game state filtered by empire visibility (fog-of-war). Uses `VisibilityService` to apply filtering rules.

#### `mutateGameState(gameId: string, updates: Partial<FullGameState>): Promise<void>`
Applies validated partial state updates to the database:
- Validates all entity IDs reference existing rows
- Prevents negative resource values
- Merges partial updates with existing state before persisting
- Uses database transactions for atomic updates

#### `reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState>`
Rebuilds game state by deterministically replaying `TurnAction` objects from turn history up to the target turn. Throws `Error('Turn number X not found in history')` if target turn doesn't exist.

### VisibilityService
Located at `src/services/visibility.service.ts`

#### `filterVisibleState(empireId: string, fullState: FullGameState): Promise<VisibleGameState>`
Applies fog-of-war filtering:
- Reads empire's `explored_systems` from `empires` table (defaults to empty array if null)
- Filters stars, planets, and star lanes to explored systems only
- Filters fleets to friendly fleets or fleets in explored systems
- Redacts sensitive data (enemy fleet compositions, unexplored resource values)

## Visibility Filtering Rules
- **Explored Systems**: Determined by `empires.explored_systems` JSONB column (array of star IDs)
- **Stars/Planets**: Only systems explored by the empire
- **Star Lanes**: Only lanes connecting two explored systems
- **Fleets**: Friendly fleets + enemy fleets in explored systems
- **Redaction**: Enemy fleet compositions set to `{}`, unexplored planet resources set to `null`

## Turn Reconstruction
- **Action Shape**: `TurnAction` interface (`{ type: string, payload: Record<string, unknown>, turnNumber: number }`)
- **Storage**: Actions stored as JSONB in `turn_history.actions` (per-empire entries)
- **Replay**: Actions replayed in order, with each action deterministically modifying state
- **Supported Actions**: `CREATE_FLEET`, `MOVE_FLEET`, `UPDATE_PLANET_RESOURCES`

## Data Types
Defined in `src/types/game-state.ts`:

### FullGameState
Aggregates all entity types for a game:
```typescript
interface FullGameState {
    stars: Star[];
    planets: Planet[];
    starLanes: StarLane[];
    empires: Empire[];
    fleets: Fleet[];
    buildQueues: BuildQueue[];
    turnHistory: TurnHistory[];
    currentTurn: number;
    gameId: string;
}
```

### VisibleGameState
Filtered version of FullGameState with only visible entities.

### TurnReconstructionOptions
```typescript
interface TurnReconstructionOptions {
    gameId: string;
    turnNumber: number;
    includeHistory?: boolean; // Include turn history in result
}
```

## Query Functions
Located at `src/db/queries/game-state.queries.ts`:
- `fetchFullGameState(gameId: string)`: Joins all entity tables for a game
- `fetchEmpireExploredSystems(empireId: string)`: Reads `explored_systems` JSONB from empires table
- `fetchTurnHistoryForReconstruction(gameId: string, upToTurn: number)`: Fetches TurnHistory entries up to target turn

## Contract Interface (FN-002 Alignment)
- `getVisibleGameState(empireId, gameId)` matches FN-002's expected interface
- `TurnAction` shape aligns with FN-002's turn resolution pipeline
- Uses `TurnHistory` type (not `TurnHistoryEntry`) per FN-001 exports

## Schema & Entity Model Validation
- Database schema defined in `migrations/001_initial_game_schema.sql` aligns with entity interfaces in `src/types/game-entities.ts`
- Column definitions in `src/db/schema.ts` match migration SQL constraints
- All entity types validated: Star, Planet, StarLane, Empire, Fleet, Ship, Structure, BuildQueue, TurnHistory
- TypeScript typecheck passes after fixing missing type imports in services

## Database Schema Requirements
- `empires` table must have `explored_systems` JSONB column (follow-up task FN-016 created)
- All entity tables must have `game_id` column for proper filtering
- `turn_history.actions` stores JSONB array of `TurnAction` objects

## Future Dependencies (Follow-up Tasks)
- **FN-009**: Add `explored_systems JSONB` column to `empires` table
- **FN-010**: Create `games` table and add `game_id` columns to all entities
- **FN-012**: Add `game_id` field to all entity interfaces in `game-entities.ts`

## Example Response Shapes

### FullGameState Example
```json
{
    "stars": [{ "id": "star1", "name": "Sol", "x_coord": 0, "y_coord": 0, "system_size": "medium" }],
    "planets": [{ "id": "planet1", "star_id": "star1", "resources": { "minerals": 100 } }],
    "starLanes": [{ "id": "lane1", "source_star_id": "star1", "destination_star_id": "star2" }],
    "empires": [{ "id": "empire1", "name": "Player", "explored_systems": ["star1"] }],
    "fleets": [{ "id": "fleet1", "empire_id": "empire1", "star_id": "star1" }],
    "buildQueues": [],
    "turnHistory": [],
    "currentTurn": 1,
    "gameId": "game1"
}
```

### VisibleGameState Example
```json
{
    "stars": [{ "id": "star1", "name": "Sol", ... }],
    "planets": [{ "id": "planet1", "star_id": "star1", "resources": { "minerals": 100 } }],
    "starLanes": [],
    "fleets": [{ "id": "fleet1", "empire_id": "empire1", "composition": { ... } }],
    "empires": [{ "id": "empire1", ... }],
    "buildQueues": [],
    "turnHistory": [],
    "currentTurn": 1,
    "gameId": "game1"
}
```
