import { FullGameState, TurnAction } from '../types/game-state';
import { validateOrder } from './order-validator';
import { resolveMovement } from './movement-resolver';
import { resolveCombat } from './combat-resolver';
import { resolveGrowth } from './growth-resolver';

/**
 * Orchestrates the turn resolution pipeline
 * @param initialState - Game state at the start of the turn
 * @param actions - Validated actions to apply
 * @returns New FullGameState for the next turn
 */
export async function runTurnPipeline(initialState: FullGameState, actions: TurnAction[]): Promise<FullGameState> {
    // 1. Validation
    for (const action of actions) {
        validateOrder(action);
    }

    // 2. Movement
    let state = resolveMovement(initialState, actions);

    // 3. Combat
    state = resolveCombat(state);

    // 4. Growth & Production
    state = resolveGrowth(state, actions);

    // 5. Advance Turn
    state.currentTurn += 1;

    return state;
}
