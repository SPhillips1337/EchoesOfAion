import { FullGameState, TurnAction } from '../types/game-state';

export const TECH_TREE: Record<string, { name: string; cost: number; prerequisites: string[] }> = {
    'adv_mining': { name: 'Advanced Mining', cost: 100, prerequisites: [] },
    'adv_manufacturing': { name: 'Advanced Manufacturing', cost: 150, prerequisites: ['adv_mining'] },
    'warp_drive': { name: 'Warp Drive', cost: 200, prerequisites: ['adv_manufacturing'] },
    'planetary_shields': { name: 'Planetary Shields', cost: 250, prerequisites: ['adv_manufacturing'] },
    'adv_weapons': { name: 'Advanced Weapons', cost: 300, prerequisites: ['warp_drive'] },
    'terraforming': { name: 'Terraforming', cost: 350, prerequisites: ['adv_mining'] },
};

export interface TradeRoute {
    id: string;
    gameId: string;
    empireId: string;
    sourcePlanetId: string;
    destinationPlanetId: string;
    tradeValue: number;
    active: boolean;
}

interface EmpireResearch {
    techId: string;
    progress: number;
    startedAt: Date;
}

/**
 * Resolves resource production, research, trade routes, and build queue progress
 * @param state - Current FullGameState
 * @param actions - Array of TurnAction containing various orders
 * @returns Updated FullGameState with production results applied
 */
export function resolveGrowth(state: FullGameState, actions: TurnAction[]): FullGameState {
    const newState = { 
        ...state, 
        planets: state.planets.map(p => ({ ...p, resources: { ...p.resources } })),
        buildQueues: state.buildQueues.map(bq => ({ ...bq })),
        structures: (state.structures || []).map(s => ({ ...s })),
        // Preserve empire research progress from existing state
        empires: state.empires.map(e => ({
            ...e,
            research: (e as unknown as { research?: EmpireResearch }).research
        }))
    };

    // Process research actions
    const researchActions = actions.filter(a => a.type === 'START_RESEARCH');
    for (const action of researchActions) {
        const { empireId, techId } = action.payload as { empireId: string; techId: string };
        const tech = TECH_TREE[techId];
        if (!tech) {
            throw new Error(`Unknown technology: ${techId}`);
        }
        
        const empire = newState.empires.find(e => e.id === empireId);
        if (!empire) {
            throw new Error(`Empire not found: ${empireId}`);
        }
        
        // Check prerequisites
        const empireResearch = (empire as unknown as { research?: EmpireResearch }).research;
        if (empireResearch && empireResearch.techId === techId) {
            // Continue existing research
            continue;
        }
        
        // Start new research
        (empire as unknown as Record<string, unknown>).research = {
            techId,
            progress: 0,
            startedAt: new Date()
        };
    }

    // Advance research progress for all empires
    for (const empire of newState.empires) {
        const empireResearch = (empire as unknown as { research?: EmpireResearch }).research;
        if (empireResearch) {
            const tech = TECH_TREE[empireResearch.techId];
            if (tech) {
                // Research advances by 10% per turn per empire
                empireResearch.progress += 0.1;
                if (empireResearch.progress >= 1.0) {
                    empireResearch.progress = 1.0;
                    console.log(`Empire ${empire.id} completed research: ${tech.name}`);
                }
            }
        }
    }

    // Process trade route actions
    const tradeActions = actions.filter(a => a.type === 'ESTABLISH_TRADE_ROUTE');
    for (const action of tradeActions) {
        const { empireId, sourcePlanetId, destinationPlanetId } = action.payload as {
            empireId: string;
            sourcePlanetId: string;
            destinationPlanetId: string;
        };
        
        // Verify empire exists
        const empire = newState.empires.find(e => e.id === empireId);
        if (!empire) {
            throw new Error(`Empire not found: ${empireId}`);
        }
        
        // Verify source and destination planets exist
        const sourcePlanet = newState.planets.find(p => p.id === sourcePlanetId);
        const destPlanet = newState.planets.find(p => p.id === destinationPlanetId);
        
        if (!sourcePlanet || !destPlanet) {
            throw new Error('Invalid trade route: planets not found');
        }
        
        // Trade routes add trade value to both planets
        const tradeValue = 20;
        if (sourcePlanet.resources.trade !== undefined) {
            sourcePlanet.resources.trade = (sourcePlanet.resources.trade || 0) + tradeValue;
        } else {
            sourcePlanet.resources.trade = tradeValue;
        }
        
        if (destPlanet.resources.trade !== undefined) {
            destPlanet.resources.trade = (destPlanet.resources.trade || 0) + tradeValue;
        } else {
            destPlanet.resources.trade = tradeValue;
        }
    }

    // Process build orders
    const buildActions = actions.filter(a => a.type === 'BUILD_STRUCTURE' || a.type === 'CONSTRUCT_SHIP');
    
    for (const action of buildActions) {
        if (action.type === 'BUILD_STRUCTURE') {
            const { planetId, structureType } = action.payload as { planetId: string, structureType: string };
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
    }

    // Advance all build queues by 10%
    for (const bq of newState.buildQueues) {
        bq.progress += 0.1;
        if (bq.progress >= 1.0) {
            bq.progress = 1.0;
        }
    }

    // Resource production with structure bonuses
    for (const planet of newState.planets) {
        let productionMultiplier = 1;
        let mineralBonus = 0;
        let foodBonus = 0;
        let energyBonus = 0;
        
        // Check colonized status for base production
        if (planet.colonized_by_empire_id) {
            productionMultiplier = 2;
        }
        
        // Apply structure bonuses
        const planetStructures = newState.structures.filter(s => s.planet_id === planet.id && s.build_progress >= 1.0);
        for (const structure of planetStructures) {
            switch (structure.structure_type) {
                case 'mine':
                    mineralBonus += 15;
                    break;
                case 'farm':
                    foodBonus += 10;
                    break;
                case 'factory':
                    mineralBonus += 5;
                    energyBonus += 5;
                    break;
                case 'research_lab':
                    // Research handled separately
                    break;
                case 'defense_platform':
                    // Defense doesn't affect production
                    break;
            }
        }
        
        // Base mineral production + structure bonuses
        if (planet.resources.minerals !== undefined) {
            planet.resources.minerals += (10 * productionMultiplier) + mineralBonus;
        }
        
        // Food production for terrestrial planets + farm bonuses
        if (planet.planet_type === 'terrestrial' && planet.resources.food !== undefined) {
            planet.resources.food = ((planet.resources.food || 0) + (5 * productionMultiplier) + foodBonus);
        }
        
        // Energy production for gas giants + factory bonuses
        if (planet.planet_type === 'gas_giant' && planet.resources.energy !== undefined) {
            planet.resources.energy = ((planet.resources.energy || 0) + (8 * productionMultiplier) + energyBonus);
        }
        
        // Trade income from trade routes (accumulated from ESTABLISH_TRADE_ROUTE)
        if (planet.resources.trade !== undefined && planet.resources.trade > 0) {
            const tradeIncome = Math.floor(planet.resources.trade * 0.1);
            if (planet.resources.credits === undefined) {
                planet.resources.credits = tradeIncome;
            } else {
                planet.resources.credits += tradeIncome;
            }
        }
    }

    // Complete finished build queues (convert to structures)
    const completedQueues = newState.buildQueues.filter(bq => bq.progress >= 1.0);
    for (const bq of completedQueues) {
        if (bq.entity_type === 'planet' && bq.item_type) {
            newState.structures.push({
                id: bq.id,
                planet_id: bq.entity_id,
                structure_type: bq.item_type as 'mine' | 'farm' | 'factory' | 'research_lab' | 'defense_platform',
                build_progress: 1.0,
                created_at: new Date()
            });
        }
    }

    return newState;
}
