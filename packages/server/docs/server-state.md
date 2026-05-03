# Server-Side Game State Management Documentation

## Overview
This module provides core services for querying, mutating, and reconstructing server-side game state for Echoes of Aion. It supports fog-of-war visibility filtering and deterministic turn replay for verification.

## Service Method Signatures

### GameStateService
- `getFullGameState(gameId: string): Promise<FullGameState>`  
  Fetches complete unfiltered game state from database.

- `getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState>`  
  Fetches game state filtered by empire-specific visibility (fog-of-war).

- `mutateGameState(gameId: string, updates: Partial<FullGameState>): Promise<void>`  
  Applies validated partial state updates to database with ID validation and resource checks.

- `reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState>`  
  Rebuilds game state by replaying `TurnAction` objects up to target turn.

### VisibilityService
- `filterVisibleState(empireId: string, fullState: FullGameState): Promise<VisibleGameState>`  
  Filters full state to only include entities visible to the specified empire.

## Visibility Filtering Rules
- **Stars/Planets/StarLanes**: Only entities in systems marked as explored by the empire (via `empires.explored_systems` JSONB column) are included.
- **Fleets**: Friendly fleets (owned by the empire) and enemy fleets located in explored systems are included.
- **Sensitive Data Redaction**: Enemy fleet compositions are redacted (set to `{}`), unexplored planet resources are set to `null`.

## Turn Reconstruction Logic
- **Action Shape**: `TurnAction` interface: `{ type: string, payload: Record<string, any>, turnNumber: number }`
- **Deterministic Replay**: State is reconstructed by starting from base state and replaying all `TurnAction` objects from `turn_history.actions` in turn order up to the target turn.
- **Error Handling**: Throws `Error('Turn number X not found in history')` if target turn doesn't exist in history.

## Example State Shapes

### FullGameState
```typescript
{
    stars: [{ id: 'star1', name: 'Sol', ... }],
    planets: [{ id: 'planet1', star_id: 'star1', ... }],
    starLanes: [{ id: 'lane1', source_star_id: 'star1', ... }],
    empires: [{ id: 'empire1', name: 'Terran', ... }],
    fleets: [{ id: 'fleet1', empire_id: 'empire1', ... }],
    buildQueues: [{ id: 'bq1', entity_type: 'planet', ... }],
    turnHistory: [{ id: 'th1', empire_id: 'empire1', turn_number: 1, actions: [...] }],
    currentTurn: 1,
    gameId: 'game1'
}
```

### VisibleGameState
```typescript
{
    stars: [{ id: 'star1', name: 'Sol', ... }], // Only explored
    planets: [{ id: 'planet1', star_id: 'star1', ... }], // Only explored
    starLanes: [{ id: 'lane1', source_star_id: 'star1', ... }], // Only connected explored
    fleets: [{ id: 'fleet1', empire_id: 'empire1', ... }], // Friendly + explored enemy
    empires: [{ id: 'empire1', ... }], // Only own empire
    buildQueues: [],
    turnHistory: [],
    currentTurn: 1,
    gameId: 'game1'
}
```

## Query Functions
- `fetchFullGameState(gameId: string)` — Joins all entity tables filtered by `game_id`
- `fetchEmpireExploredSystems(empireId: string)` — Reads `explored_systems` JSONB from `empires` table
- `fetchTurnHistoryForReconstruction(gameId: string, upToTurn: number)` — Fetches per-empire `TurnHistory` entries up to target turn

## Contract Interface for FN-002
- `getVisibleGameState(empireId, gameId)` matches expected interface
- `VisibleGameState` type aligns with FN-002's expected shape
- `TurnAction` shape matches FN-002's turn resolution pipeline format

## Future Dependencies (Follow-up Tasks)
- **FN-009**: Add `explored_systems JSONB` column to `empires` table
- **FN-010**: Create `games` table and add `game_id` columns to all entities
- **FN-012**: Add `game_id` field to all entity interfaces in `game-entities.ts`
