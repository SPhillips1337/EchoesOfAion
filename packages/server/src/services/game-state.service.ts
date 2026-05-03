<<<<<<< HEAD
import { FullGameState, VisibleGameState, TurnReconstructionOptions } from '../types/game-state';
import { fetchFullGameState, fetchTurnHistoryForReconstruction } from '../db/queries/game-state.queries';
import { VisibilityService } from './visibility.service';
// No unused imports
=======
import { Pool } from 'pg';
import { FullGameState, VisibleGameState, TurnReconstructionOptions, TurnAction, Fleet } from '../types/game-state';
import { fetchFullGameState, fetchTurnHistoryForReconstruction } from '../db/queries/game-state.queries';
import { VisibilityService } from './visibility.service';

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'echoes_of_aion',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
});
>>>>>>> fusion/fn-004

export class GameStateService {
    /**
     * Fetches full unfiltered game state for a game
     * @param gameId - UUID of the game to fetch state for
     * @returns FullGameState with all entities
     */
    async getFullGameState(gameId: string): Promise<FullGameState> {
        return fetchFullGameState(gameId);
    }

    private visibilityService: VisibilityService;

    constructor() {
        this.visibilityService = new VisibilityService();
    }

    /**
     * Fetches game state filtered by empire visibility (fog-of-war)
     * @param empireId - UUID of the empire to filter for
     * @param gameId - UUID of the game
     * @returns VisibleGameState with filtered entities
     */
    async getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState> {
        try {
            const fullState = await this.getFullGameState(gameId);
            return this.visibilityService.filterVisibleState(empireId, fullState);
        } catch (error) {
            throw new Error(`Failed to get visible state for empire ${empireId} in game ${gameId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Applies validated partial state updates to the database
     * @param gameId - UUID of the game to update
     * @param updates - Partial FullGameState with entities to update
     */
    async mutateGameState(gameId: string, updates: Partial<FullGameState>): Promise<void> {
<<<<<<< HEAD
        // Validate entity IDs exist in DB
        await this.validateEntityIds(updates);
        // Validate no negative resource values
        this.validateResources(updates);
        // TODO: Implement actual DB update logic once schema supports game_id
        // For now, log the update intent
        console.log(`mutateGameState called for game ${gameId} with updates:`, JSON.stringify(updates));
=======
        // Fetch existing state from DB
        const existingState = await this.getFullGameState(gameId);
        
        // Validate entity IDs exist in DB
        await this.validateEntityIds(updates, gameId);
        // Validate no negative resource values
        this.validateResources(updates);
        
        // Merge partial updates with existing state by ID
        const mergedState = this.mergeState(existingState, updates);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Apply merged updates to each entity type
            if (updates.stars && mergedState.stars) {
                for (const star of mergedState.stars) {
                    await client.query(
                        'UPDATE stars SET name = $1, x_coord = $2, y_coord = $3, system_size = $4 WHERE id = $5 AND game_id = $6',
                        [star.name, star.x_coord, star.y_coord, star.system_size, star.id, gameId]
                    );
                }
            }
            
            if (updates.planets && mergedState.planets) {
                for (const planet of mergedState.planets) {
                    // First verify the planet belongs to the game
                    const planetCheck = await client.query('SELECT p.id FROM planets p INNER JOIN stars s ON p.star_id = s.id WHERE p.id = $1 AND s.game_id = $2', [planet.id, gameId]);
                    if (planetCheck.rowCount === 0) {
                        throw new Error(`Planet ID ${planet.id} does not belong to game ${gameId}`);
                    }
                    await client.query(
                        'UPDATE planets SET name = $1, planet_type = $2, size = $3, resources = $4, habitable = $5 WHERE id = $6',
                        [planet.name, planet.planet_type, planet.size, planet.resources, planet.habitable, planet.id]
                    );
                }
            }
            
            if (updates.fleets && mergedState.fleets) {
                for (const fleet of mergedState.fleets) {
                    // First verify the fleet belongs to the game (via empire)
                    const fleetCheck = await client.query('SELECT f.id FROM fleets f INNER JOIN empires e ON f.empire_id = e.id WHERE f.id = $1 AND e.game_id = $2', [fleet.id, gameId]);
                    if (fleetCheck.rowCount === 0) {
                        throw new Error(`Fleet ID ${fleet.id} does not belong to game ${gameId}`);
                    }
                    await client.query(
                        'UPDATE fleets SET name = $1, composition = $2 WHERE id = $3',
                        [fleet.name, fleet.composition, fleet.id]
                    );
                }
            }
            
            if (updates.empires && mergedState.empires) {
                for (const empire of mergedState.empires) {
                    await client.query(
                        'UPDATE empires SET name = $1, player_type = $2, color = $3 WHERE id = $4 AND game_id = $5',
                        [empire.name, empire.player_type, empire.color, empire.id, gameId]
                    );
                }
            }
            
            if (updates.starLanes && mergedState.starLanes) {
                for (const lane of mergedState.starLanes) {
                    // Verify the star lane belongs to the game (via source star)
                    const laneCheck = await client.query('SELECT sl.id FROM star_lanes sl INNER JOIN stars s ON sl.source_star_id = s.id WHERE sl.id = $1 AND s.game_id = $2', [lane.id, gameId]);
                    if (laneCheck.rowCount === 0) {
                        throw new Error(`StarLane ID ${lane.id} does not belong to game ${gameId}`);
                    }
                    await client.query(
                        'UPDATE star_lanes SET source_star_id = $1, destination_star_id = $2, distance = $3 WHERE id = $4',
                        [lane.source_star_id, lane.destination_star_id, lane.distance, lane.id]
                    );
                }
            }
            
            if (updates.buildQueues && mergedState.buildQueues) {
                for (const bq of mergedState.buildQueues) {
                    // TODO: Add game ownership check for build queues (polymorphic)
                    await client.query(
                        'UPDATE build_queues SET entity_type = $1, entity_id = $2, item_type = $3, progress = $4 WHERE id = $5',
                        [bq.entity_type, bq.entity_id, bq.item_type, bq.progress, bq.id]
                    );
                }
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to mutate game state: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            client.release();
        }
    }

    /**
     * Merges partial updates with existing state by entity ID
     * @param existing - Current FullGameState from DB
     * @param updates - Partial updates to apply
     * @returns Merged FullGameState
     */
    private mergeState(existing: FullGameState, updates: Partial<FullGameState>): FullGameState {
        const merged = { ...existing };
        
        if (updates.stars) {
            merged.stars = this.mergeEntityArrays(existing.stars, updates.stars);
        }
        if (updates.planets) {
            merged.planets = this.mergeEntityArrays(existing.planets, updates.planets);
        }
        if (updates.fleets) {
            merged.fleets = this.mergeEntityArrays(existing.fleets, updates.fleets);
        }
        if (updates.empires) {
            merged.empires = this.mergeEntityArrays(existing.empires, updates.empires);
        }
        if (updates.starLanes) {
            merged.starLanes = this.mergeEntityArrays(existing.starLanes, updates.starLanes);
        }
        if (updates.buildQueues) {
            merged.buildQueues = this.mergeEntityArrays(existing.buildQueues, updates.buildQueues);
        }
        
        return merged;
    }

    /**
     * Merges entity arrays by ID - updates existing entities and appends new ones
     */
    private mergeEntityArrays<T extends { id: string }>(existing: T[], updates: T[]): T[] {
        const merged = [...existing];
        const existingIds = new Set(existing.map(e => e.id));
        
        for (const update of updates) {
            const index = merged.findIndex(e => e.id === update.id);
            if (index >= 0) {
                // Update existing entity
                merged[index] = { ...merged[index], ...update };
            } else {
                // Append new entity
                merged.push(update);
            }
        }
        
        return merged;
>>>>>>> fusion/fn-004
    }

    /**
     * Rebuilds game state by replaying TurnAction objects up to target turn
     * @param options - TurnReconstructionOptions with gameId, turnNumber, includeHistory flag
     * @returns Reconstructed FullGameState
     * @throws Error if target turn not found in history
     */
    async reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState> {
        const { gameId, turnNumber, includeHistory = false } = options;
<<<<<<< HEAD
        // Fetch base state (initial empty state for replay)
        const baseState = await this.getFullGameState(gameId);
        // Fetch turn history up to target turn
        const history = await fetchTurnHistoryForReconstruction(gameId, turnNumber);
        // Filter history to only include turns up to target
        const relevantHistory = history.filter(h => h.turn_number <= turnNumber);
        // Check if target turn exists in history
        const targetTurnExists = relevantHistory.some(h => h.turn_number === turnNumber);
        if (!targetTurnExists) {
            throw new Error(`Turn number ${turnNumber} not found in history`);
        }
        // Replay actions deterministically
        let reconstructedState = { ...baseState, turnHistory: includeHistory ? relevantHistory : [] };
=======
        
        // Start from initial empty state for deterministic replay
        const initialState: FullGameState = {
            stars: [],
            planets: [],
            starLanes: [],
            empires: [],
            fleets: [],
            buildQueues: [],
            turnHistory: [],
            currentTurn: 0,
            gameId,
        };
        
        // Fetch turn history up to target turn
        const history = await fetchTurnHistoryForReconstruction(gameId, turnNumber);
        
        // Check if target turn exists in history
        const targetTurnExists = history.some(h => h.turn_number === turnNumber);
        if (!targetTurnExists) {
            throw new Error(`Turn number ${turnNumber} not found in history`);
        }
        
        // Filter history to only include turns up to target
        const relevantHistory = history.filter(h => h.turn_number <= turnNumber);
        
        // Replay actions deterministically
        let reconstructedState = { ...initialState, turnHistory: includeHistory ? relevantHistory : [] };
>>>>>>> fusion/fn-004
        for (const entry of relevantHistory) {
            const actions = entry.actions as unknown as TurnAction[];
            for (const action of actions) {
                reconstructedState = this.applyAction(reconstructedState, action);
            }
        }
        reconstructedState.currentTurn = turnNumber;
        return reconstructedState;
    }

<<<<<<< HEAD
    private async validateEntityIds(updates: Partial<FullGameState>): Promise<void> {
        // Fetch current state to validate IDs against existing entities
        // TODO: Replace with direct DB ID checks once schema supports game_id
        const currentState = await this.getFullGameState('temp'); // Placeholder gameId
        const existingIds = {
            stars: new Set(currentState.stars.map(s => s.id)),
            planets: new Set(currentState.planets.map(p => p.id)),
            empires: new Set(currentState.empires.map(e => e.id)),
            fleets: new Set(currentState.fleets.map(f => f.id)),
        };

        if (updates.stars) {
            for (const star of updates.stars) {
                if (!star.id || typeof star.id !== 'string') {
                    throw new Error(`Invalid ID for star entity`);
                }
                if (!existingIds.stars.has(star.id)) {
                    throw new Error(`Star ID ${star.id} not found in database`);
                }
            }
        }
        // Similar checks for planets, empires, fleets...
=======
    private async validateEntityIds(updates: Partial<FullGameState>, gameId: string): Promise<void> {
        const client = await pool.connect();
        try {
            if (updates.stars) {
                for (const star of updates.stars) {
                    if (!star.id || typeof star.id !== 'string') {
                        throw new Error(`Invalid ID for star entity`);
                    }
                    const result = await client.query('SELECT id FROM stars WHERE id = $1 AND game_id = $2', [star.id, gameId]);
                    if (result.rowCount === 0) {
                        throw new Error(`Star ID ${star.id} not found in database or not in game ${gameId}`);
                    }
                }
            }
            
            if (updates.planets) {
                for (const planet of updates.planets) {
                    if (!planet.id || typeof planet.id !== 'string') {
                        throw new Error(`Invalid ID for planet entity`);
                    }
                    const result = await client.query('SELECT p.id FROM planets p INNER JOIN stars s ON p.star_id = s.id WHERE p.id = $1 AND s.game_id = $2', [planet.id, gameId]);
                    if (result.rowCount === 0) {
                        throw new Error(`Planet ID ${planet.id} not found in database or not in game ${gameId}`);
                    }
                    // Validate star_id references a valid star
                    if (planet.star_id) {
                        const starResult = await client.query('SELECT id FROM stars WHERE id = $1 AND game_id = $2', [planet.star_id, gameId]);
                        if (starResult.rowCount === 0) {
                            throw new Error(`Planet star_id ${planet.star_id} does not reference a valid star in game ${gameId}`);
                        }
                    }
                }
            }
            
            if (updates.fleets) {
                for (const fleet of updates.fleets) {
                    if (!fleet.id || typeof fleet.id !== 'string') {
                        throw new Error(`Invalid ID for fleet entity`);
                    }
                    const result = await client.query('SELECT f.id FROM fleets f INNER JOIN empires e ON f.empire_id = e.id WHERE f.id = $1 AND e.game_id = $2', [fleet.id, gameId]);
                    if (result.rowCount === 0) {
                        throw new Error(`Fleet ID ${fleet.id} not found in database or not in game ${gameId}`);
                    }
                    // Validate empire_id references a valid empire
                    if (fleet.empire_id) {
                        const empireResult = await client.query('SELECT id FROM empires WHERE id = $1 AND game_id = $2', [fleet.empire_id, gameId]);
                        if (empireResult.rowCount === 0) {
                            throw new Error(`Fleet empire_id ${fleet.empire_id} does not reference a valid empire in game ${gameId}`);
                        }
                    }
                    // Validate star_id references a valid star
                    if (fleet.star_id) {
                        const starResult = await client.query('SELECT id FROM stars WHERE id = $1 AND game_id = $2', [fleet.star_id, gameId]);
                        if (starResult.rowCount === 0) {
                            throw new Error(`Fleet star_id ${fleet.star_id} does not reference a valid star in game ${gameId}`);
                        }
                    }
                }
            }
            
            if (updates.empires) {
                for (const empire of updates.empires) {
                    if (!empire.id || typeof empire.id !== 'string') {
                        throw new Error(`Invalid ID for empire entity`);
                    }
                    const result = await client.query('SELECT id FROM empires WHERE id = $1 AND game_id = $2', [empire.id, gameId]);
                    if (result.rowCount === 0) {
                        throw new Error(`Empire ID ${empire.id} not found in database or not in game ${gameId}`);
                    }
                }
            }
            
            if (updates.starLanes) {
                for (const lane of updates.starLanes) {
                    if (!lane.id || typeof lane.id !== 'string') {
                        throw new Error(`Invalid ID for star lane entity`);
                    }
                    // Verify the star lane belongs to the game (via source star)
                    const result = await client.query('SELECT sl.id FROM star_lanes sl INNER JOIN stars s ON sl.source_star_id = s.id WHERE sl.id = $1 AND s.game_id = $2', [lane.id, gameId]);
                    if (result.rowCount === 0) {
                        throw new Error(`StarLane ID ${lane.id} does not belong to game ${gameId}`);
                    }
                }
            }
            
            if (updates.buildQueues) {
                for (const bq of updates.buildQueues) {
                    if (!bq.id || typeof bq.id !== 'string') {
                        throw new Error(`Invalid ID for build queue entity`);
                    }
                    // For build queues, verify ownership via the linked entity
                    // This is complex due to polymorphic nature - skip for now with TODO
                    const result = await client.query('SELECT id FROM build_queues WHERE id = $1', [bq.id]);
                    if (result.rowCount === 0) {
                        throw new Error(`BuildQueue ID ${bq.id} not found in database`);
                    }
                }
            }
        } finally {
            client.release();
        }
>>>>>>> fusion/fn-004
    }

    private validateResources(updates: Partial<FullGameState>): void {
        if (updates.planets) {
            for (const planet of updates.planets) {
                if (planet.resources) {
                    for (const [key, value] of Object.entries(planet.resources)) {
                        if (typeof value === 'number' && value < 0) {
                            throw new Error(`Negative resource value for ${key} on planet ${planet.id}`);
                        }
                    }
                }
            }
        }
    }

    private applyAction(state: FullGameState, action: TurnAction): FullGameState {
        // Deterministic action application logic - aligned with FN-002 contract
<<<<<<< HEAD
        // This is a stub; actual logic will be implemented per FN-002's action types
        console.log(`Applying action ${action.type} for turn ${action.turnNumber}`);
        return state;
=======
        const newState = { ...state };
        
        switch (action.type) {
            case 'CREATE_FLEET': {
                const { empireId, starId, fleetName, composition, fleetId } = action.payload;
                if (!fleetId) {
                    throw new Error('fleetId is required in CREATE_FLEET action payload');
                }
                const newFleet: Fleet = {
                    id: fleetId,
                    empire_id: empireId,
                    star_id: starId,
                    name: fleetName || 'New Fleet',
                    composition: composition || {},
                    created_at: new Date(),
                };
                newState.fleets = [...newState.fleets, newFleet];
                break;
            }
            case 'MOVE_FLEET': {
                const { fleetId, starId: destinationStarId } = action.payload as any;
                newState.fleets = newState.fleets.map(f => 
                    f.id === fleetId ? { ...f, star_id: destinationStarId } : f
                );
                break;
            }
            case 'UPDATE_PLANET_RESOURCES': {
                const { planetId, resources } = action.payload;
                newState.planets = newState.planets.map(p => 
                    p.id === planetId ? { ...p, resources: { ...p.resources, ...resources } } : p
                );
                break;
            }
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
        
        return newState;
>>>>>>> fusion/fn-004
    }
}
