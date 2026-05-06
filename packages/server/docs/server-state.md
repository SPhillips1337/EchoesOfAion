# Server-Side Game State Management

## Overview

The server-side game state management system provides secure, deterministic state delivery to clients with fog-of-war visibility filtering and turn replay capabilities. This implementation supports the Milestone 1 single-player MVP's core simulation requirements.

## Service Method Signatures

### GameStateService

Located at `packages/server/src/services/game-state.service.ts`

```typescript
class GameStateService {
    constructor(pool?: Pool);

    // Fetch full game state by game ID using FK-compliant queries
    async fetchStateByGameId(gameId: string): Promise<FullGameState>;

    // Fetch full unfiltered game state
    async getFullGameState(gameId: string): Promise<FullGameState>;

    // Fetch game state filtered by empire visibility (fog-of-war)
    async getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState>;

    // Apply validated state mutations to the database
    async mutateGameState(gameId: string, updates: Partial<FullGameState>): Promise<void>;

    // Reconstruct game state at a specific turn using turn history
    async reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState>;
}
```

### VisibilityService

Located at `packages/server/src/services/visibility.service.ts`

```typescript
class VisibilityService {
    // Filter full game state to only include entities visible to the specified empire
    async filterVisibleState(empireId: string, fullState: FullGameState): Promise<VisibleGameState>;
}
```

## Query Functions

Located at `packages/server/src/db/queries/game-state.queries.ts`

```typescript
// Fetch full game state using explicit games table FK JOINs
export async function fetchFullGameState(gameId: string): Promise<FullGameState>;

// Fetch full game state by game ID (wraps fetchFullGameState with FK-compliant queries)
export async function fetchStateByGameId(gameId: string): Promise<FullGameState>;

// Fetch turn history for state reconstruction
export async function fetchTurnHistoryForReconstruction(gameId: string, upToTurn: number): Promise<TurnHistory[]>;
```

## Visibility Filtering Rules

The fog-of-war system uses the `explored_systems` JSONB column on the `empires` table to determine which systems an empire has explored.

### Filtering Logic

1. **Stars**: Only stars in explored systems are visible
2. **Planets**: Only planets orbiting explored stars are visible
3. **Star Lanes**: Only lanes connecting two explored systems are visible
4. **Fleets**: Friendly fleets (owned by the empire) are always visible; enemy fleets are only visible if in an explored system
5. **Empires**: Only the requesting empire's data is visible (or all if admin)
6. **Build Queues**: Filtered to only show queues for visible entities

### Data Redaction

For non-friendly entities, sensitive data is redacted:
- Enemy fleet composition is set to empty object `{}`
- Unexplored planet resource values are set to `null`

### explored_systems Data Format

The `explored_systems` column is a JSONB array of star IDs (as strings):

```json
["star-uuid-1", "star-uuid-2", "star-uuid-3"]
```

Defaults to empty array `[]` if null.

## Turn Reconstruction Logic

The `reconstructStateForTurn` method rebuilds game state by deterministically replaying `TurnAction` objects from the `turn_history.actions` JSONB column.

### TurnAction Shape

```typescript
interface TurnAction {
    type: string;                    // Action type (e.g., 'CREATE_FLEET', 'MOVE_FLEET')
    payload: Record<string, any>;    // Action-specific data
    turnNumber: number;              // Turn when action occurred
}
```

### Deterministic Replay Guarantees

1. Actions are replayed in turn order (ascending turn_number)
2. Within a turn, actions are replayed in order of `created_at` (ascending)
3. The initial state starts empty (all arrays empty, currentTurn = 0)
4. State mutations are applied sequentially via `applyAction()`
5. The reconstruction throws `Error('Turn number X not found in history')` if the target turn doesn't exist

### Supported Action Types

- `CREATE_FLEET`: Creates a new fleet at a star (payload: `fleetId`, `starId`, `empireId`, `fleetName`, `composition`)
- `MOVE_FLEET`: Moves a fleet to a new star (payload: `fleetId`, `starId`)
- `UPDATE_PLANET_RESOURCES`: Updates planet resource values (payload: `planetId`, `resources`)
- `BUILD_STRUCTURE`: Adds a structure to a planet's build queue (payload: `planetId`, `structureType`)
- `COLONIZE_PLANET`: Colonizes a planet for an empire (payload: `planetId`, `empireId`)
- `CONSTRUCT_SHIP`: Adds ships to a fleet's composition (payload: `fleetId`, `shipType`, `quantity`)

### Validation Rules

- Each turn history entry must have a valid `turn_number` (non-negative integer)
- Each turn history entry must have an `actions` array (non-empty for turn_number > 0)
- Each turn history entry must have a valid `empire_id` (string)
- Action payloads are validated for required fields per action type
- Unknown action types throw an error with context (turn number, action type)

## Example Response Shapes

### FullGameState

```json
{
    "stars": [
        {
            "id": "star-uuid-1",
            "game_id": "game-uuid",
            "name": "Sol",
            "x_coord": 100.5,
            "y_coord": 200.0,
            "system_size": "medium",
            "created_at": "2026-05-03T12:00:00Z"
        }
    ],
    "planets": [
        {
            "id": "planet-uuid-1",
            "game_id": "game-uuid",
            "star_id": "star-uuid-1",
            "name": "Earth",
            "planet_type": "terrestrial",
            "size": "medium",
            "resources": { "minerals": 100, "energy": 50 },
            "habitable": true,
            "created_at": "2026-05-03T12:00:00Z"
        }
    ],
    "starLanes": [
        {
            "id": "lane-uuid-1",
            "game_id": "game-uuid",
            "source_star_id": "star-uuid-1",
            "destination_star_id": "star-uuid-2",
            "distance": 50.5,
            "created_at": "2026-05-03T12:00:00Z"
        }
    ],
    "empires": [
        {
            "id": "empire-uuid-1",
            "game_id": "game-uuid",
            "name": "Terran Alliance",
            "player_type": "human",
            "color": "blue",
            "explored_systems": ["star-uuid-1"],
            "created_at": "2026-05-03T12:00:00Z"
        }
    ],
    "fleets": [
        {
            "id": "fleet-uuid-1",
            "game_id": "game-uuid",
            "empire_id": "empire-uuid-1",
            "star_id": "star-uuid-1",
            "name": "First Fleet",
            "composition": { "scout": 5, "frigate": 2 },
            "created_at": "2026-05-03T12:00:00Z"
        }
    ],
    "buildQueues": [],
    "turnHistory": [
        {
            "id": "history-uuid-1",
            "game_id": "game-uuid",
            "empire_id": "empire-uuid-1",
            "turn_number": 1,
            "actions": [
                { "type": "CREATE_FLEET", "payload": { "fleetId": "fleet-uuid-1", ... }, "turnNumber": 1 }
            ],
            "resolved_at": "2026-05-03T12:05:00Z",
            "created_at": "2026-05-03T12:00:00Z"
        }
    ],
    "currentTurn": 1,
    "gameId": "game-uuid"
}
```

### VisibleGameState

Same shape as `FullGameState`, but with filtered arrays:
- `stars`: Only explored systems
- `planets`: Only planets in explored systems
- `starLanes`: Only lanes connecting explored systems
- `fleets`: Friendly fleets + enemy fleets in explored systems (enemy composition redacted)
- `empires`: Only the requesting empire
- `buildQueues`: Only queues for visible entities
- `turnHistory`: Empty array (not visible to clients)

## Query Functions

All query functions use explicit `games` table foreign key JOINs per FN-005 relationships to ensure data integrity. This replaces direct `game_id` filtering with explicit INNER JOINs to the `games` table.

Located at `packages/server/src/db/queries/game-state.queries.ts`

```typescript
// Fetch full game state using explicit games table FK JOINs
export async function fetchFullGameState(gameId: string): Promise<FullGameState>;

// Fetch full game state by game ID (wraps fetchFullGameState with FK-compliant queries)
export async function fetchStateByGameId(gameId: string): Promise<FullGameState>;

// Fetch turn history for state reconstruction
export async function fetchTurnHistoryForReconstruction(gameId: string, upToTurn: number): Promise<TurnHistory[]>;
```

// Fetch turn history entries up to a specific turn for state reconstruction
async function fetchTurnHistoryForReconstruction(
    gameId: string,
    upToTurn: number
): Promise<TurnHistory[]>;
```

## Contract Interface for FN-002 (Turn Resolution Pipeline)

The `getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState>` method provides the contract interface expected by FN-002 for delivering filtered state to clients after turn resolution.

### Turn History Action Format

Actions stored in `turn_history.actions` JSONB must conform to:

```typescript
{
    type: string;                       // Matches turn resolution action types
    payload: Record<string, any>;       // Action-specific data validated by FN-002
    turnNumber: number;                 // Turn when action was recorded
}
```

This format ensures deterministic replay and alignment with the turn resolution pipeline.

## Type Definitions

Located at `packages/server/src/types/game-state.ts`

- `FullGameState`: Complete game state with all entities
- `VisibleGameState`: Filtered state for a specific empire (extends Omit<FullGameState, ...>)
- `TurnReconstructionOptions`: Options for state reconstruction
- `TurnAction`: Shape of actions stored in turn history

## Turn Resolution API (FN-004)

Located at `packages/server/src/routes/turn.routes.ts`

### POST /api/turns/submit

Submits turn actions for resolution and returns the resolved game state.

**Request Body:**
```json
{
    "gameId": "string (UUID)",
    "empireId": "string (UUID)",
    "actions": [
        {
            "type": "MOVE_FLEET",
            "payload": {
                "fleetId": "fleet-uuid",
                "destinationStarId": "star-uuid"
            },
            "turnNumber": 1
        }
    ]
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Turn submitted and resolved successfully.",
    "resolvedState": { ... },  // FullGameState object
    "turnNumber": 2
}
```

**Error Responses:**
- `400 Bad Request`: Invalid UUID, missing fields, empty actions array, or invalid TurnAction
- `404 Not Found`: Game not found
- `500 Internal Server Error`: Turn resolution failure

**Validation Rules:**
- `gameId` and `empireId` must be valid UUIDs (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- `actions` must be a non-empty array of `TurnAction` objects
- Each `TurnAction` must have:
  - `type`: Valid action type (see Supported Action Types in Turn Reconstruction section)
  - `payload`: Object with action-specific required fields
  - `turnNumber`: Positive integer

**Setup:**
- Express server configured in `packages/server/src/app.ts`
- Serves static UI files from `packages/client/` at `http://localhost:3000`
- API routes mounted at `/api` prefix
- Start server: `cd packages/server && pnpm start`

## Database Schema Dependencies

Requires the following tables from FN-001:
- `stars` (with `game_id` column)
- `planets` (linked to stars)
- `star_lanes` (linked to stars)
- `empires` (with `explored_systems` JSONB column)
- `fleets` (linked to empires and stars)
- `build_queues` (polymorphic)
- `turn_history` (with `actions` JSONB column)

**Note**: The `empires` table requires the `explored_systems` JSONB column. If missing, apply the migration from task FN-015.
