import { FullGameState } from '../types/game-state';

export interface ShipStats {
    hull: number;
    shields: number;
    damage: number;
    speed: number;
    armor: number;
}

export const SHIP_STATS: Record<string, ShipStats> = {
    scout: { hull: 20, shields: 10, damage: 5, speed: 4, armor: 1 },
    frigate: { hull: 40, shields: 20, damage: 10, speed: 3, armor: 2 },
    destroyer: { hull: 60, shields: 30, damage: 15, speed: 2, armor: 3 },
    cruiser: { hull: 100, shields: 50, damage: 25, speed: 2, armor: 4 },
    battleship: { hull: 200, shields: 100, damage: 50, speed: 1, armor: 6 },
};

export interface CombatShip {
    type: string;
    count: number;
    currentHull: number;
    currentShields: number;
}

export interface FleetCombatState {
    fleetId: string;
    empireId: string;
    ships: CombatShip[];
    totalDamage: number;
}

export interface BattleResult {
    starId: string;
    winner: string | null;
    rounds: number;
    shipsDestroyed: number;
    damageDealt: number;
}

/**
 * Resolves combat encounters when multiple hostile fleets are in the same system
 * Uses detailed ship stats and round-based combat
 * @param state - Current FullGameState
 * @returns Updated FullGameState with combat results applied
 */
export function resolveCombat(state: FullGameState): FullGameState {
    const newState = { 
        ...state, 
        fleets: state.fleets.map(f => ({ ...f, composition: { ...f.composition } })) 
    };

    const battleResults: BattleResult[] = [];

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
            
            const battleResult = resolveSystemCombat(starId, fleets);
            battleResults.push(battleResult);

            // Update fleet compositions based on remaining ships
            for (const fleet of fleets) {
                const survivingShips: Record<string, number> = {};
                let hasShips = false;
                
                for (const [shipType, count] of Object.entries(fleet.composition)) {
                    if (count > 0 && SHIP_STATS[shipType]) {
                        survivingShips[shipType] = count;
                        hasShips = true;
                    }
                }
                
                fleet.composition = survivingShips;
                
                // Remove fleet if no ships left
                if (!hasShips) {
                    const index = newState.fleets.findIndex(f => f.id === fleet.id);
                    if (index !== -1) {
                        newState.fleets.splice(index, 1);
                    }
                }
            }
        }
    }

    if (battleResults.length > 0) {
        console.log('Battle results:', JSON.stringify(battleResults, null, 2));
    }

    return newState;
}

/**
 * Resolves combat in a single star system
 */
function resolveSystemCombat(starId: string, fleets: typeof arguments[0]): BattleResult {
    // Initialize combat states for each fleet
    const fleetCombatStates: FleetCombatState[] = fleets.map((fleet: { id: string; empire_id: string; composition: Record<string, number> }) => {
        const ships: CombatShip[] = [];
        for (const [shipType, count] of Object.entries(fleet.composition)) {
            const shipCount = count as number;
            if (shipCount > 0 && SHIP_STATS[shipType]) {
                const stats = SHIP_STATS[shipType];
                ships.push({
                    type: shipType,
                    count: shipCount,
                    currentHull: stats.hull * shipCount,
                    currentShields: stats.shields * shipCount,
                });
            }
        }
        return {
            fleetId: fleet.id,
            empireId: fleet.empire_id,
            ships,
            totalDamage: 0,
        };
    });

    let rounds = 0;
    const maxRounds = 10;
    let shipsDestroyed = 0;
    let totalDamageDealt = 0;

    // Combat rounds
    while (rounds < maxRounds && getActiveEmpires(fleetCombatStates).size > 1) {
        rounds++;
        
        // Calculate damage for each fleet
        for (const fleetState of fleetCombatStates) {
            if (fleetState.ships.length === 0) continue;
            
            let fleetDamage = 0;
            for (const ship of fleetState.ships) {
                const stats = SHIP_STATS[ship.type];
                fleetDamage += stats.damage * ship.count;
            }
            fleetState.totalDamage = fleetDamage;
        }

        // Apply damage to targets (prioritize enemies)
        for (const attacker of fleetCombatStates) {
            if (attacker.ships.length === 0) continue;
            
            // Find targets from different empires
            const targets = fleetCombatStates.filter(f => 
                f.ships.length > 0 && f.empireId !== attacker.empireId
            );
            
            if (targets.length === 0) continue;
            
            // Distribute damage among targets
            let remainingDamage = attacker.totalDamage;
            for (const target of targets) {
                if (remainingDamage <= 0) break;
                
                const damageToApply = Math.min(remainingDamage, target.ships.reduce((sum, s) => sum + s.currentHull + s.currentShields, 0));
                const actualDamage = applyDamageToFleet(target, damageToApply);
                remainingDamage -= actualDamage;
                totalDamageDealt += actualDamage;
            }
        }

        // Remove destroyed ships
        for (const fleetState of fleetCombatStates) {
            const aliveShips = fleetState.ships.filter(s => s.currentHull > 0);
            const destroyedCount = fleetState.ships.length - aliveShips.length;
            shipsDestroyed += destroyedCount;
            fleetState.ships = aliveShips;
        }
    }

    // Determine winner
    const activeEmpires = getActiveEmpires(fleetCombatStates);
    let winner: string | null = null;
    if (activeEmpires.size === 1) {
        winner = activeEmpires.values().next().value || null;
    }

    return {
        starId,
        winner,
        rounds,
        shipsDestroyed,
        damageDealt: totalDamageDealt,
    };
}

/**
 * Gets empires that still have ships
 */
function getActiveEmpires(fleetCombatStates: FleetCombatState[]): Set<string> {
    const empires = new Set<string>();
    for (const fleet of fleetCombatStates) {
        if (fleet.ships.length > 0) {
            empires.add(fleet.empireId);
        }
    }
    return empires;
}

/**
 * Applies damage to a fleet, respecting shields first
 */
function applyDamageToFleet(fleetState: FleetCombatState, damage: number): number {
    let remainingDamage = damage;
    
    // Damage shields first
    for (const ship of fleetState.ships) {
        if (remainingDamage <= 0) break;
        
        const shieldDamage = Math.min(ship.currentShields, remainingDamage);
        ship.currentShields -= shieldDamage;
        remainingDamage -= shieldDamage;
        
        if (remainingDamage <= 0) break;
        
        // Then damage hull
        const hullDamage = Math.min(ship.currentHull, remainingDamage);
        ship.currentHull -= hullDamage;
        remainingDamage -= hullDamage;
    }
    
    return damage - remainingDamage;
}

/**
 * Calculates fleet strength based on ship stats
 */
export function calculateFleetStrength(fleetComposition: Record<string, number>): number {
    let strength = 0;
    for (const [shipType, count] of Object.entries(fleetComposition)) {
        const stats = SHIP_STATS[shipType];
        if (stats) {
            // Strength = (hull + shields) * count + damage * count
            strength += (stats.hull + stats.shields + stats.damage) * count;
        }
    }
    return strength;
}

/**
 * Gets the best ship type for a given fleet composition
 */
export function getPrimaryShipRole(fleetComposition: Record<string, number>): string {
    if (Object.keys(fleetComposition).length === 0) {
        return 'unknown';
    }

    let maxCount = 0;
    let primaryType = 'scout';
    
    for (const [shipType, count] of Object.entries(fleetComposition)) {
        if ((count as number) > maxCount) {
            maxCount = count as number;
            primaryType = shipType;
        }
    }
    
    const roles: Record<string, string> = {
        scout: 'recon',
        frigate: 'interceptor',
        destroyer: 'screen',
        cruiser: 'line',
        battleship: 'capital',
    };
    
    return roles[primaryType] || 'unknown';
}
