import { TurnAction, FullGameState } from '../types/game-state';
import { runTurnPipeline } from '../turn-resolution/turn-pipeline';
import { validateOrder } from '../turn-resolution/order-validator';

export class TurnResolutionService {
    /**
     * Orchestrates the resolution of a full game turn
     * @param initialState - Current state of the game
     * @param actions - Player/AI actions for the current turn
     * @returns New game state after resolution
     */
    async resolveTurn(initialState: FullGameState, actions: TurnAction[]): Promise<FullGameState> {
        try {
            return await runTurnPipeline(initialState, actions);
        } catch (error) {
            throw new Error(`Turn resolution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Legacy method for validating turn actions (maintained for compatibility)
     * @param actions - Array of TurnAction to resolve
     * @param currentTurn - Current turn number for validation context
     */
    resolveTurnActions(actions: TurnAction[], currentTurn: number): void {
        if (!Array.isArray(actions)) {
            throw new Error('Actions must be an array');
        }

        for (const action of actions) {
            if (action.turnNumber !== currentTurn) {
                throw new Error(`TurnAction turnNumber ${action.turnNumber} does not match current turn ${currentTurn}`);
            }
            // Use the new validator
            validateOrder(action);
        }
    }
}
