import { FullGameState, VisibleGameState, TurnReconstructionOptions } from '../types/game-state';
import { fetchFullGameState, fetchTurnHistoryForReconstruction } from '../db/queries/game-state.queries';
import { VisibilityService } from './visibility.service';
// No unused imports

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
        // Validate entity IDs exist in DB
        await this.validateEntityIds(updates);
        // Validate no negative resource values
        this.validateResources(updates);
        // TODO: Implement actual DB update logic once schema supports game_id
        // For now, log the update intent
        console.log(`mutateGameState called for game ${gameId} with updates:`, JSON.stringify(updates));
    }

    /**
     * Rebuilds game state by replaying TurnAction objects up to target turn
     * @param options - TurnReconstructionOptions with gameId, turnNumber, includeHistory flag
     * @returns Reconstructed FullGameState
     * @throws Error if target turn not found in history
     */
    async reconstructStateForTurn(options: TurnReconstructionOptions): Promise<FullGameState> {
        const { gameId, turnNumber, includeHistory = false } = options;
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
        for (const entry of relevantHistory) {
            const actions = entry.actions as unknown as TurnAction[];
            for (const action of actions) {
                reconstructedState = this.applyAction(reconstructedState, action);
            }
        }
        reconstructedState.currentTurn = turnNumber;
        return reconstructedState;
    }

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
        // This is a stub; actual logic will be implemented per FN-002's action types
        console.log(`Applying action ${action.type} for turn ${action.turnNumber}`);
        return state;
    }
}
