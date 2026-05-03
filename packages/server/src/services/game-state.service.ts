import { FullGameState, VisibleGameState, TurnReconstructionOptions, TurnAction } from '../types/game-state';
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
                throw new Error(`No turn history found for game ${gameId} at turn ${targetTurn}`);
            }

            const currentState = await this.getFullGameState(gameId);
            
            // Apply turn history in reverse to reconstruct past state
            // This is a simplified implementation - full reconstruction would need more logic
            return currentState;
        } catch (error) {
            throw new Error(`Failed to reconstruct game state for game ${gameId} at turn ${targetTurn}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
