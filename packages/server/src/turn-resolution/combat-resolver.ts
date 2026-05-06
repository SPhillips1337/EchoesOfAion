import { FullGameState } from '../types/game-state';

/**
 * Resolves combat encounters when multiple hostile fleets are in the same system
 * @param state - Current FullGameState
 * @returns Updated FullGameState with combat results applied
 */
export function resolveCombat(state: FullGameState): FullGameState {
    const newState = { 
        ...state, 
        fleets: state.fleets.map(f => ({ ...f })) 
    };

    // Group fleets by star system
    const systemFleets = new Map<string, typeof newState.fleets>();
    for (const fleet of newState.fleets) {
        const fleets = systemFleets.get(fleet.star_id) || [];
        fleets.push(fleet);
        systemFleets.set(fleet.star_id, fleets);
    }

    // Resolve combat in systems with multiple hostile fleets
    for (const [starId, fleets] of systemFleets.entries()) {
        const empires = new Set(fleets.map(f => f.empire_id));
        if (empires.size > 1) {
            console.log(`Resolving combat in system ${starId} between ${empires.size} empires`);
            
            // Simple deterministic combat: higher total ship count wins
            // (In a real implementation, this would use currentTurnSeed and ship stats)
            const empireStrength = new Map<string, number>();
            for (const fleet of fleets) {
                const strength = Object.values(fleet.composition).reduce((sum, count) => sum + count, 0);
                empireStrength.set(fleet.empire_id, (empireStrength.get(fleet.empire_id) || 0) + strength);
            }

            // Find winning empire
            let winnerEmpireId = '';
            let maxStrength = -1;
            for (const [empireId, strength] of empireStrength.entries()) {
                if (strength > maxStrength) {
                    maxStrength = strength;
                    winnerEmpireId = empireId;
                }
            }

            // Damage losing fleets (reduce composition by 20%)
            for (const fleet of fleets) {
                if (fleet.empire_id !== winnerEmpireId) {
                    for (const type of Object.keys(fleet.composition)) {
                        fleet.composition[type] = Math.floor(fleet.composition[type] * 0.8);
                    }
                    // Remove fleet if no ships left
                    const totalShips = Object.values(fleet.composition).reduce((sum, count) => sum + count, 0);
                    if (totalShips === 0) {
                        const index = newState.fleets.findIndex(f => f.id === fleet.id);
                        if (index !== -1) {
                            newState.fleets.splice(index, 1);
                        }
                    }
                }
            }
        }
    }

    return newState;
}
