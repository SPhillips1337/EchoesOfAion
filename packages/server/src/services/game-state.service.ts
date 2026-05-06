import { Pool } from 'pg';
import { FullGameState, VisibleGameState, TurnReconstructionOptions, TurnAction } from '../types/game-state';
import { Fleet } from '../types/game-entities';
import { fetchStateByGameId, fetchTurnHistoryForReconstruction } from '../db/queries/game-state.queries';
import { VisibilityService } from './visibility.service';

export class GameStateService {
    private visibilityService: VisibilityService;
    private pool: Pool;

    constructor(pool?: Pool) {
        this.visibilityService = new VisibilityService();
        this.pool = pool || new Pool({
            host: process.env.PG_HOST || 'localhost',
            port: parseInt(process.env.PG_PORT || '5432'),
            database: process.env.PG_DATABASE || 'echoes_of_aion',
            user: process.env.PG_USER || 'postgres',
            password: process.env.PG_PASSWORD || 'postgres',
        });
    }

    /**
     * Fetches full game state by game ID using FK-compliant queries
     * @param gameId - UUID of the game to fetch state for
     * @returns FullGameState with all entities
     */
    async fetchStateByGameId(gameId: string): Promise<FullGameState> {
        return fetchStateByGameId(gameId);
    }

    /**
     * Fetches full unfiltered game state for a game
     * @param gameId - UUID of the game to fetch state for
     * @returns FullGameState with all entities
     */
    async getFullGameState(gameId: string): Promise<FullGameState> {
        // Validate game exists
        const client = await this.pool.connect();
        try {
            const gameRes = await client.query('SELECT id FROM games WHERE id = $1', [gameId]);
            if (gameRes.rowCount === 0) {
                throw new Error(`Game ${gameId} not found`);
            }
        } finally {
            client.release();
        }
        return this.fetchStateByGameId(gameId);
    }

    /**
     * Fetches game state filtered by empire visibility (fog-of-war)
     * @param empireId - UUID of the empire to filter for
     * @param gameId - UUID of the game
     * @returns VisibleGameState with filtered entities
     */
    async getVisibleGameState(empireId: string, gameId: string): Promise<VisibleGameState> {
        try {
            const fullState = await this.fetchStateByGameId(gameId);
            return this.visibilityService.filterVisibleState(empireId, fullState);
        } catch (error) {
            throw new Error(`Failed to get visible state for empire ${empireId} in game ${gameId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validates a turn history entry for required fields
     * @param entry - TurnHistory entry to validate
     * @throws Error if entry is invalid
     */
    private validateTurnHistoryEntry(entry: { turn_number?: number; actions?: unknown; empire_id?: string }): void {
        if (typeof entry.turn_number !== 'number' || entry.turn_number < 0) {
            throw new Error(`Invalid turn_number in history entry: ${entry.turn_number}`);
        }
        if (!Array.isArray(entry.actions)) {
            throw new Error(`Invalid actions in history entry for turn ${entry.turn_number}: expected array`);
        }
        // Check for non-empty actions array where applicable (skip turn 0 initialization if needed)
        if (entry.turn_number > 0 && Array.isArray(entry.actions) && entry.actions.length === 0) {
            throw new Error(`Empty actions array in history entry for turn ${entry.turn_number}`);
        }
        if (!entry.empire_id || typeof entry.empire_id !== 'string') {
            throw new Error(`Invalid empire_id in history entry for turn ${entry.turn_number}`);
        }
    }

    /**
     * Rebuilds game state by replaying TurnAction objects up to target turn
     * @param options - TurnReconstructionOptions with gameId, turnNumber, includeHistory flag
     * @returns Reconstructed FullGameState
     * @throws Error if target turn not found in history
     */
    async reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState> {
        const { gameId, turnNumber, includeHistory = false } = options;
        
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
        
        // Validate all history entries
        for (const entry of relevantHistory) {
            this.validateTurnHistoryEntry(entry);
        }
        
        // Sort deterministically: by turn_number ASC, then by created_at ASC
        const sortedHistory = [...relevantHistory].sort((a, b) => {
            if (a.turn_number !== b.turn_number) {
                return a.turn_number - b.turn_number;
            }
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
        });
        
        // Replay actions deterministically
        let reconstructedState = { ...initialState, turnHistory: includeHistory ? sortedHistory : [] };
        for (const entry of sortedHistory) {
            const actions = entry.actions as unknown as TurnAction[];
            if (Array.isArray(actions)) {
                for (const action of actions) {
                    reconstructedState = this.applyAction(reconstructedState, action, entry.turn_number);
                }
            }
        }
        reconstructedState.currentTurn = turnNumber;
        return reconstructedState;
    }

    /**
     * Applies validated partial state updates to the database
     * @param gameId - UUID of the game
     * @param updates - Partial game state containing entities to update
     */
    async mutateGameState(gameId: string, updates: Partial<FullGameState>): Promise<void> {
        // Fetch existing state from DB
        const existingState = await this.getFullGameState(gameId);
        
        // Validate entity IDs exist in DB
        await this.validateEntityIds(updates, gameId);
        // Validate no negative resource values
        this.validateResources(updates);
        
        // Merge partial updates with existing state by ID
        const mergedState = this.mergeState(existingState, updates);
        
        const client = await this.pool.connect();
        try {
            // Persist mergedState to database
            // This involves updating each entity table with the merged data
            // For now, we log the merge (actual persistence would update each table)
            void mergedState; // TODO: Implement actual persistence
        } finally {
            client.release();
        }
    }

    /**
     * Validates and applies mutations to game state
     * @param gameId - UUID of the game to mutate
     * @param updates - Object containing entity updates (stars, planets, etc.)
     */
    private mergeEntityArrays<T extends { id: string }>(existing: T[], updates: T[]): T[] {
        const merged = [...existing];
        
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
    }

    private async validateEntityIds(updates: Partial<FullGameState>, gameId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            if (updates.stars) {
                for (const star of updates.stars) {
                    if (!star.id || typeof star.id !== 'string') {
                        throw new Error(`Invalid ID for star entity`);
                    }
                    const result = await client.query(
                        'SELECT s.id FROM stars s INNER JOIN games g ON s.game_id = g.id WHERE s.id = $1 AND g.id = $2',
                        [star.id, gameId]
                    );
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
                    const result = await client.query(
                        'SELECT p.id FROM planets p INNER JOIN stars s ON p.star_id = s.id INNER JOIN games g ON s.game_id = g.id WHERE p.id = $1 AND g.id = $2',
                        [planet.id, gameId]
                    );
                    if (result.rowCount === 0) {
                        throw new Error(`Planet ID ${planet.id} not found in database or not in game ${gameId}`);
                    }
                    if (planet.star_id) {
                        const starResult = await client.query(
                            'SELECT s.id FROM stars s INNER JOIN games g ON s.game_id = g.id WHERE s.id = $1 AND g.id = $2',
                            [planet.star_id, gameId]
                        );
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
                    const result = await client.query(
                        'SELECT f.id FROM fleets f INNER JOIN empires e ON f.empire_id = e.id INNER JOIN games g ON e.game_id = g.id WHERE f.id = $1 AND g.id = $2',
                        [fleet.id, gameId]
                    );
                    if (result.rowCount === 0) {
                        throw new Error(`Fleet ID ${fleet.id} not found in database or not in game ${gameId}`);
                    }
                    if (fleet.empire_id) {
                        const empireResult = await client.query(
                            'SELECT e.id FROM empires e INNER JOIN games g ON e.game_id = g.id WHERE e.id = $1 AND g.id = $2',
                            [fleet.empire_id, gameId]
                        );
                        if (empireResult.rowCount === 0) {
                            throw new Error(`Fleet empire_id ${fleet.empire_id} does not reference a valid empire in game ${gameId}`);
                        }
                    }
                    if (fleet.star_id) {
                        const starResult = await client.query(
                            'SELECT s.id FROM stars s INNER JOIN games g ON s.game_id = g.id WHERE s.id = $1 AND g.id = $2',
                            [fleet.star_id, gameId]
                        );
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
                    const result = await client.query(
                        'SELECT e.id FROM empires e INNER JOIN games g ON e.game_id = g.id WHERE e.id = $1 AND g.id = $2',
                        [empire.id, gameId]
                    );
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
                    const result = await client.query(
                        'SELECT sl.id FROM star_lanes sl INNER JOIN stars s ON sl.source_star_id = s.id INNER JOIN games g ON s.game_id = g.id WHERE sl.id = $1 AND g.id = $2',
                        [lane.id, gameId]
                    );
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
                    const result = await client.query('SELECT id FROM build_queues WHERE id = $1', [bq.id]);
                    if (result.rowCount === 0) {
                        throw new Error(`BuildQueue ID ${bq.id} not found in database`);
                    }
                }
            }
        } finally {
            client.release();
        }
    }

    private validateResources(updates: Partial<FullGameState>): void {
        if (updates.planets) {
            for (const planet of updates.planets) {
                if (planet.resources) {
                    if (planet.resources.minerals !== undefined && planet.resources.minerals < 0) {
                        throw new Error('Negative resource value for minerals on planet');
                    }
                }
            }
        }
    }

    private mergeState(existing: FullGameState, updates: Partial<FullGameState>): FullGameState {
        const merged = { ...existing };
        (Object.keys(updates) as Array<keyof FullGameState>).forEach(key => {
            if (key === 'gameId' || key === 'currentTurn') return;
            const updateValue = updates[key];
            if (updateValue !== undefined) {
                if (Array.isArray(updateValue) && Array.isArray(merged[key])) {
                    (merged[key] as unknown) = this.mergeEntityArrays(merged[key] as { id: string }[], updateValue as { id: string }[]);
                } else {
                    (merged as Record<string, unknown>)[key] = updateValue;
                }
            }
        });
        return merged;
    }

    private applyAction(state: FullGameState, action: TurnAction, turnNumber?: number): FullGameState {
        const newState = { ...state };
        
        switch (action.type) {
            case 'CREATE_FLEET': {
                const { empireId, starId, fleetName, composition, fleetId } = action.payload as Record<string, unknown>;
                if (!fleetId || typeof fleetId !== 'string') {
                    throw new Error('fleetId is required in CREATE_FLEET action payload');
                }
                const newFleet: Fleet = {
                    id: fleetId as string,
                    game_id: state.gameId,
                    empire_id: empireId as string,
                    star_id: starId as string,
                    name: (fleetName as string) || 'New Fleet',
                    composition: (composition as Record<string, number>) || {},
                    created_at: new Date(),
                };
                newState.fleets = [...newState.fleets, newFleet];
                break;
            }
            case 'MOVE_FLEET': {
                const { fleetId, starId: destinationStarId } = action.payload as Record<string, unknown>;
                if (!fleetId || typeof fleetId !== 'string') {
                    throw new Error('fleetId is required in MOVE_FLEET action payload');
                }
                if (!destinationStarId || typeof destinationStarId !== 'string') {
                    throw new Error('starId is required in MOVE_FLEET action payload');
                }
                newState.fleets = newState.fleets.map(f => 
                    f.id === fleetId ? { ...f, star_id: destinationStarId as string } : f
                );
                break;
            }
            case 'UPDATE_PLANET_RESOURCES': {
                const { planetId, resources } = action.payload as Record<string, unknown>;
                if (!planetId || typeof planetId !== 'string') {
                    throw new Error('planetId is required in UPDATE_PLANET_RESOURCES action payload');
                }
                newState.planets = newState.planets.map(p => 
                    p.id === planetId ? { ...p, resources: { ...p.resources, ...(resources as Record<string, number>) } } : p
                );
                break;
            }
            case 'BUILD_STRUCTURE': {
                const { planetId, structureType } = action.payload as Record<string, unknown>;
                if (!planetId || typeof planetId !== 'string') {
                    throw new Error('planetId is required in BUILD_STRUCTURE action payload');
                }
                if (!structureType || typeof structureType !== 'string') {
                    throw new Error('structureType is required in BUILD_STRUCTURE action payload');
                }
                // Add to build queue (planet validation skipped for replay from scratch)
                const newBuildQueue = {
                    id: `bq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    game_id: state.gameId,
                    entity_type: 'planet' as const,
                    entity_id: planetId as string,
                    item_type: structureType as string,
                    progress: 0,
                    created_at: new Date(),
                };
                newState.buildQueues = [...newState.buildQueues, newBuildQueue];
                break;
            }
            case 'COLONIZE_PLANET': {
                const { fleetId, planetId } = action.payload as Record<string, unknown>;
                if (!fleetId || typeof fleetId !== 'string') {
                    throw new Error('fleetId is required in COLONIZE_PLANET action payload');
                }
                if (!planetId || typeof planetId !== 'string') {
                    throw new Error('planetId is required in COLONIZE_PLANET action payload');
                }
                // Find the fleet to get its empire_id
                const fleet = newState.fleets.find(f => f.id === fleetId);
                if (!fleet) {
                    throw new Error(`Fleet ${fleetId} not found in game state`);
                }
                // Find the planet and update its colonized_by_empire_id
                const planetExists = newState.planets.some(p => p.id === planetId);
                if (!planetExists) {
                    throw new Error(`Planet ${planetId} not found in game state`);
                }
                newState.planets = newState.planets.map(p => 
                    p.id === planetId ? { ...p, colonized_by_empire_id: fleet.empire_id } : p
                );
                break;
            }
            case 'CONSTRUCT_SHIP': {
                const { fleetId, shipType, quantity } = action.payload as Record<string, unknown>;
                if (!fleetId || typeof fleetId !== 'string') {
                    throw new Error('fleetId is required in CONSTRUCT_SHIP action payload');
                }
                if (!shipType || typeof shipType !== 'string') {
                    throw new Error('shipType is required in CONSTRUCT_SHIP action payload');
                }
                const shipsToAdd = (quantity as number) || 1;
                newState.fleets = newState.fleets.map(f => {
                    if (f.id === fleetId) {
                        const newComposition = { ...f.composition };
                        newComposition[shipType as string] = (newComposition[shipType as string] || 0) + shipsToAdd;
                        return { ...f, composition: newComposition };
                    }
                    return f;
                });
                break;
            }
            default: {
                const errorMsg = `Unknown action type: ${action.type} at turn ${turnNumber || action.turnNumber}`;
                console.error(errorMsg, action);
                throw new Error(errorMsg);
            }
        }
        
        return newState;
    }
}
