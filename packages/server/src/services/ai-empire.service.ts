import { FullGameState, TurnAction } from '../types/game-state';

export interface AIAction {
    type: string;
    priority: number;
    generate: (state: FullGameState, empireId: string) => TurnAction | null;
}

export const AI_BEHAVIORS: AIAction[] = [
    {
        type: 'COLONIZE',
        priority: 1,
        generate: (state: FullGameState, empireId: string): TurnAction | null => {
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return null;

            const colonizedPlanets = state.planets.filter(p => p.colonized_by_empire_id === empireId);
            if (colonizedPlanets.length >= 3) return null;

            const uncolonizedHabitable = state.planets.find(p => 
                p.habitable && !p.colonized_by_empire_id && 
                state.starLanes.some(sl => 
                    (sl.source_star_id === colonizedPlanets[0]?.star_id && sl.destination_star_id === p.star_id) ||
                    (sl.destination_star_id === colonizedPlanets[0]?.star_id && sl.source_star_id === p.star_id)
                )
            );
            
            if (!uncolonizedHabitable) return null;

            const fleetAtNearbySystem = state.fleets.find(f => 
                f.empire_id === empireId && 
                state.starLanes.some(sl => 
                    (sl.source_star_id === f.star_id && sl.destination_star_id === uncolonizedHabitable.star_id) ||
                    (sl.destination_star_id === f.star_id && sl.source_star_id === uncolonizedHabitable.star_id)
                )
            );

            if (!fleetAtNearbySystem) return null;

            return {
                type: 'COLONIZE_PLANET',
                payload: { fleetId: fleetAtNearbySystem.id, planetId: uncolonizedHabitable.id },
                turnNumber: state.currentTurn + 1
            };
        }
    },
    {
        type: 'EXPAND',
        priority: 2,
        generate: (state: FullGameState, empireId: string): TurnAction | null => {
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return null;

            const exploredSystems = new Set(empire.explored_systems);
            const connectedUnexplored = state.starLanes.find(sl => {
                const sourceExplored = exploredSystems.has(sl.source_star_id);
                const destExplored = exploredSystems.has(sl.destination_star_id);
                return (sourceExplored && !destExplored) || (!sourceExplored && destExplored);
            });

            if (!connectedUnexplored) return null;

            const fleet = state.fleets.find(f => 
                f.empire_id === empireId && 
                (exploredSystems.has(f.star_id))
            );

            if (!fleet) return null;

            const targetStar = exploredSystems.has(connectedUnexplored.source_star_id) 
                ? connectedUnexplored.destination_star_id 
                : connectedUnexplored.source_star_id;

            return {
                type: 'MOVE_FLEET',
                payload: { fleetId: fleet.id, destinationStarId: targetStar },
                turnNumber: state.currentTurn + 1
            };
        }
    },
    {
        type: 'BUILD_FLEET',
        priority: 3,
        generate: (state: FullGameState, empireId: string): TurnAction | null => {
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return null;

            const myFleets = state.fleets.filter(f => f.empire_id === empireId);
            if (myFleets.length >= 3) return null;

            const colonizedPlanets = state.planets.filter(p => p.colonized_by_empire_id === empireId);
            if (colonizedPlanets.length === 0) return null;

            const planet = colonizedPlanets[0];
            const hasCredits = (planet.resources.credits || 0) >= 50;

            if (!hasCredits) return null;

            return {
                type: 'CONSTRUCT_SHIP',
                payload: { planetId: planet.id, shipType: 'scout' },
                turnNumber: state.currentTurn + 1
            };
        }
    },
    {
        type: 'RESEARCH',
        priority: 4,
        generate: (state: FullGameState, empireId: string): TurnAction | null => {
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return null;

            const research = (empire as unknown as { research?: { techId: string; progress: number } }).research;
            if (research && research.progress < 1.0) return null;

            const techs = ['adv_mining', 'adv_manufacturing', 'warp_drive', 'planetary_shields', 'adv_weapons', 'terraforming'];
            const chosenTech = techs[Math.floor(Math.random() * techs.length)];

            return {
                type: 'START_RESEARCH',
                payload: { empireId, techId: chosenTech },
                turnNumber: state.currentTurn + 1
            };
        }
    },
    {
        type: 'TRADE',
        priority: 5,
        generate: (state: FullGameState, empireId: string): TurnAction | null => {
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return null;

            const colonizedPlanets = state.planets.filter(p => p.colonized_by_empire_id === empireId);
            if (colonizedPlanets.length < 2) return null;

            return {
                type: 'ESTABLISH_TRADE_ROUTE',
                payload: { 
                    empireId, 
                    sourcePlanetId: colonizedPlanets[0].id, 
                    destinationPlanetId: colonizedPlanets[1].id 
                },
                turnNumber: state.currentTurn + 1
            };
        }
    }
];

export class AIEmpireService {
    /**
     * Generate AI actions for all AI empires in the game
     */
    generateAIActions(state: FullGameState): TurnAction[] {
        const actions: TurnAction[] = [];
        const aiEmpires = state.empires.filter(e => e.player_type === 'ai');

        for (const empire of aiEmpires) {
            const empireActions = this.generateActionsForEmpire(state, empire.id);
            actions.push(...empireActions);
        }

        return actions;
    }

    /**
     * Generate actions for a single empire based on priority
     */
    generateActionsForEmpire(state: FullGameState, empireId: string): TurnAction[] {
        const actions: TurnAction[] = [];

        const sortedBehaviors = [...AI_BEHAVIORS].sort((a, b) => a.priority - b.priority);

        for (const behavior of sortedBehaviors) {
            const action = behavior.generate(state, empireId);
            if (action) {
                actions.push(action);
                break;
            }
        }

        return actions;
    }

    /**
     * Get AI decision-making info
     */
    getAIDecisionInfo(state: FullGameState, empireId: string): string[] {
        const decisions: string[] = [];
        const empire = state.empires.find(e => e.id === empireId);
        
        if (!empire) return decisions;

        const colonizedCount = state.planets.filter(p => p.colonized_by_empire_id === empireId).length;
        const fleetCount = state.fleets.filter(f => f.empire_id === empireId).length;
        const exploredCount = empire.explored_systems.length;

        decisions.push(`Planets: ${colonizedCount}, Fleets: ${fleetCount}, Explored: ${exploredCount}`);

        const research = (empire as unknown as { research?: { techId: string; progress: number } }).research;
        if (research) {
            decisions.push(`Research: ${research.techId} (${Math.round(research.progress * 100)}%)`);
        }

        return decisions;
    }
}