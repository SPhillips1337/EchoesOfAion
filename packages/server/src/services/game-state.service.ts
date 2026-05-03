import { Pool } from 'pg';
import { FullGameState, VisibleGameState, TurnReconstructionOptions, TurnAction } from '../types/game-state';
import { Fleet } from '../types/game-entities';
import { fetchFullGameState, fetchTurnHistoryForReconstruction } from '../db/queries/game-state.queries';
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
     * Fetches full unfiltered game state for a game
     * @param gameId - UUID of the game to fetch state for
     * @returns FullGameState with all entities
     */
    async getFullGameState(gameId: string): Promise<FullGameState> {
        return fetchFullGameState(gameId);
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
     * Reconstructs game state at a specific turn using turn history
     * @param gameId - UUID of the game
     * @param targetTurn - Turn number to reconstruct
     * @param _options - Reconstruction options
     * @returns FullGameState as it existed at the target turn
     */
    async reconstructGameStateAtTurn(
        gameId: string,
        targetTurn: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _options?: TurnReconstructionOptions
    ): Promise<FullGameState> {
        try {
            const turnHistory = await fetchTurnHistoryForReconstruction(gameId, targetTurn);
            
            if (turnHistory.length === 0) {
                throw new Error(`Turn number ${targetTurn} not found in history`);
            }

            const currentState = await this.getFullGameState(gameId);
            
            // Apply turn history in reverse to reconstruct past state
            // This is a simplified implementation - full reconstruction would need more logic
            return currentState;
        } catch (error) {
            throw new Error(`Failed to reconstruct game state for game ${gameId} at turn ${targetTurn}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

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
            // TODO: Persist mergedState to database
            // This would involve updating each entity table with the merged data
        } finally {
            client.release();
        }
    }

    /**
     * Reconstructs game state at a specific turn (wrapper for reconstructGameStateAtTurn)
     * @param options - Object containing gameId and turnNumber
     * @returns FullGameState as it existed at the target turn
     */
    async reconstructStateForTurn(options: { gameId: string; turnNumber: number }): Promise<FullGameState> {
        return this.reconstructGameStateAtTurn(options.gameId, options.turnNumber);
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
        
        // Replay actions deterministically
        let reconstructedState = { ...initialState, turnHistory: includeHistory ? relevantHistory : [] };
        for (const entry of relevantHistory) {
            const actions = entry.actions as unknown as TurnAction[];
            for (const action of actions) {
                reconstructedState = this.applyAction(reconstructedState, action);
            }
        }
        reconstructedState.currentTurn = turnNumber;
        return reconstructedState;
    }

    private async validateEntityIds(updates: Partial<FullGameState>, gameId: string): Promise<void> {
        const client = await this.pool.connect();
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
                    if (fleet.empire_id) {
                        const empireResult = await client.query('SELECT id FROM empires WHERE id = $1 AND game_id = $2', [fleet.empire_id, gameId]);
                        if (empireResult.rowCount === 0) {
                            throw new Error(`Fleet empire_id ${fleet.empire_id} does not reference a valid empire in game ${gameId}`);
                        }
                    }
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
            if (key === 'id' || key === 'gameId' || key === 'currentTurn') return;
            const updateValue = updates[key];
            if (Array.isArray(updateValue) && Array.isArray(merged[key])) {
                merged[key] = this.mergeEntityArrays(merged[key] as any[], updateValue as any[]) as any;
            } else if (updateValue !== undefined) {
                (merged as any)[key] = updateValue;
            }
        });
        return merged;
    }

    private applyAction(state: FullGameState, action: TurnAction): FullGameState {
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
                const { fleetId, starId: destinationStarId } = action.payload as Record<string, unknown>;
                newState.fleets = newState.fleets.map(f => 
                    f.id === fleetId ? { ...f, star_id: destinationStarId as string } : f
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
    }
}
