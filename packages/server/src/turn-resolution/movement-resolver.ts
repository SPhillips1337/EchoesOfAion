import { FullGameState, TurnAction } from '../types/game-state';

/**
 * Resolves fleet movement orders along star lanes
 * @param state - Current FullGameState
 * @param actions - Array of TurnAction containing MOVE_FLEET orders
 * @returns Updated FullGameState with new fleet positions
 */
export function resolveMovement(state: FullGameState, actions: TurnAction[]): FullGameState {
    const newState = { 
        ...state, 
        fleets: state.fleets.map(f => ({ ...f })) 
    };
    
    const moveActions = actions.filter(a => a.type === 'MOVE_FLEET');
    
    for (const action of moveActions) {
        const { fleetId, destinationStarId } = action.payload as { fleetId: string, destinationStarId: string };
        
        const fleet = newState.fleets.find(f => f.id === fleetId);
        if (fleet) {
            // Validate movement is along a star lane
            const hasLane = state.starLanes.some(lane => 
                (lane.source_star_id === fleet.star_id && lane.destination_star_id === destinationStarId) ||
                (lane.source_star_id === destinationStarId && lane.destination_star_id === fleet.star_id)
            );
            
            if (hasLane) {
                fleet.star_id = destinationStarId;
                
                // Trigger discovery/exploration if destination is new to empire
                const empire = newState.empires.find(e => e.id === fleet.empire_id);
                if (empire && !empire.explored_systems.includes(destinationStarId)) {
                    empire.explored_systems = [...empire.explored_systems, destinationStarId];
                }
            } else {
                console.warn(`Invalid move: no star lane between ${fleet.star_id} and ${destinationStarId}`);
            }
        }
    }
    
    return newState;
}
