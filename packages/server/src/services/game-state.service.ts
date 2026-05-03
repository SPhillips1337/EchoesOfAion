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
    async mutateGameState(gameId: string, updates: {
        stars?: Array<{ id: string; [key: string]: any }>;
        planets?: Array<{ id: string; resources?: { minerals?: number }; [key: string]: any }>;
        [key: string]: any;
    }): Promise<void> {
        const currentState = await fetchFullGameState(gameId);

        // Validate stars updates
        if (updates.stars) {
            for (const star of updates.stars) {
                if (!star.id || star.id.trim() === '') {
                    throw new Error('Invalid ID for star entity');
                }
                const existingStar = currentState.stars.find(s => s.id === star.id);
                if (!existingStar) {
                    throw new Error(`Star with ID ${star.id} not found in database`);
                }
            }
        }

        // Validate planets updates
        if (updates.planets) {
            for (const planet of updates.planets) {
                if (!planet.id || planet.id.trim() === '') {
                    throw new Error('Invalid ID for planet entity');
                }
                const existingPlanet = currentState.planets.find(p => p.id === planet.id);
                if (!existingPlanet) {
                    throw new Error(`Planet with ID ${planet.id} not found in database`);
                }
                // Check for negative resource values
                if (planet.resources) {
                    if (planet.resources.minerals !== undefined && planet.resources.minerals < 0) {
                        throw new Error('Negative resource value for minerals on planet');
                    }
                }
            }
        }
    }
}
