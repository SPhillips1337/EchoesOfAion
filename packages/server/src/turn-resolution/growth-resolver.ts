import { FullGameState, TurnAction } from '../types/game-state';

/**
 * Resolves resource production and build queue progress
 * @param state - Current FullGameState
 * @param actions - Array of TurnAction containing BUILD_STRUCTURE and CONSTRUCT_SHIP orders
 * @returns Updated FullGameState with production results applied
 */
export function resolveGrowth(state: FullGameState, actions: TurnAction[]): FullGameState {
    const newState = { 
        ...state, 
        planets: state.planets.map(p => ({ ...p, resources: { ...p.resources } })),
        buildQueues: state.buildQueues.map(bq => ({ ...bq }))
    };

    // Process build orders
    const buildActions = actions.filter(a => a.type === 'BUILD_STRUCTURE' || a.type === 'CONSTRUCT_SHIP');
    
    for (const action of buildActions) {
        if (action.type === 'BUILD_STRUCTURE') {
            const { planetId, structureType } = action.payload as { planetId: string, structureType: string };
            // Add to build queue (in a real implementation, would check resources first)
            newState.buildQueues.push({
                id: `bq-${Date.now()}-${Math.random()}`,
                game_id: state.gameId,
                entity_type: 'planet',
                entity_id: planetId,
                item_type: structureType,
                progress: 0,
                created_at: new Date()
            });
        }
        // Handle CONSTRUCT_SHIP similarly...
    }

    // Advance all build queues by 10%
    for (const bq of newState.buildQueues) {
        bq.progress += 0.1;
        if (bq.progress >= 1.0) {
            bq.progress = 1.0;
            // Complete build (e.g., add structure to planet)
            // This would require a structures table update in a real implementation
        }
    }

    // Basic resource production (stub)
    for (const planet of newState.planets) {
        if (planet.resources.minerals !== undefined) {
            planet.resources.minerals += 10;
        }
    }

    return newState;
}
