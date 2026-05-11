import { TurnAction, FullGameState } from '../types/game-state';
import { runTurnPipeline } from '../turn-resolution/turn-pipeline';
import { validateOrder } from '../turn-resolution/order-validator';
import { 
    updateEmpireExploredSystems,
    updateFleetStarId,
    updatePlanetResources,
    updateBuildQueueProgress,
    insertTurnHistory
} from '../db/queries/game-state.queries';

export class TurnResolutionService {
    /**
     * Orchestrates the resolution of a full game turn
     * @param initialState - Current state of the game
     * @param actions - Player/AI actions for the current turn
     * @param persistToDb - Whether to persist changes to the database (default: false for in-memory games)
     * @returns New game state after resolution
     */
    async resolveTurn(initialState: FullGameState, actions: TurnAction[], persistToDb: boolean = false): Promise<FullGameState> {
        try {
            const newState = await runTurnPipeline(initialState, actions);
            
            // Only persist to database if explicitly requested (i.e., game was loaded from DB)
            if (persistToDb) {
                await this.persistStateChanges(initialState, newState, actions);
            }
            
            return newState;
        } catch (error) {
            throw new Error(`Turn resolution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Persists state changes by comparing initial and new state
     */
    private async persistStateChanges(initialState: FullGameState, newState: FullGameState, actions: TurnAction[]): Promise<void> {
        // Persist empire explored systems changes
        for (const empire of newState.empires) {
            const initialEmpire = initialState.empires.find(e => e.id === empire.id);
            if (initialEmpire && JSON.stringify(empire.explored_systems) !== JSON.stringify(initialEmpire.explored_systems)) {
                await updateEmpireExploredSystems(empire.id, empire.explored_systems);
            }
        }

        // Persist fleet position changes
        for (const fleet of newState.fleets) {
            const initialFleet = initialState.fleets.find(f => f.id === fleet.id);
            if (initialFleet && fleet.star_id !== initialFleet.star_id) {
                await updateFleetStarId(fleet.id, fleet.star_id);
            }
        }

        // Persist planet resource changes
        for (const planet of newState.planets) {
            const initialPlanet = initialState.planets.find(p => p.id === planet.id);
            if (initialPlanet && JSON.stringify(planet.resources) !== JSON.stringify(initialPlanet.resources)) {
                await updatePlanetResources(planet.id, planet.resources);
            }
        }

        // Persist build queue progress changes
        for (const bq of newState.buildQueues) {
            const initialBq = initialState.buildQueues.find(b => b.id === bq.id);
            if (initialBq && bq.progress !== initialBq.progress) {
                await updateBuildQueueProgress(bq.id, bq.progress);
            }
        }

        // Insert turn history
        await insertTurnHistory({
            game_id: newState.gameId,
            empire_id: newState.empires[0]?.id || '',
            turn_number: newState.currentTurn - 1,
            actions: actions
        });
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
