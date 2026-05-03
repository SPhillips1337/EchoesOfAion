import { TurnAction } from '../types/game-state';
import { validateTurnAction } from '../validators/turn-action.validator';

export class TurnResolutionService {
    /**
     * Validates and resolves a list of turn actions
     * @param actions - Array of TurnAction to resolve
     * @param currentTurn - Current turn number for validation context
     * @throws Error if any action is invalid
     */
    resolveTurnActions(actions: TurnAction[], currentTurn: number): void {
        if (!Array.isArray(actions)) {
            throw new Error('Actions must be an array');
        }

        for (const action of actions) {
            // Validate the action structure
            validateTurnAction(action);

            // Validate that the action's turn number matches the current turn
            if (action.turnNumber !== currentTurn) {
                throw new Error(`TurnAction turnNumber ${action.turnNumber} does not match current turn ${currentTurn}`);
            }

            // Additional resolution logic would go here (e.g., apply action to game state)
            // This is a placeholder for the actual resolution implementation
        }
    }
}
