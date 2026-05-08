import { FullGameState } from '../types/game-state';

export type VictoryType = 'domination' | 'conquest' | 'technological' | 'economic' | 'exploration';

export interface VictoryCondition {
    type: VictoryType;
    description: string;
    threshold: number;
    check: (state: FullGameState, empireId: string) => boolean;
}

export const VICTORY_CONDITIONS: Record<VictoryType, VictoryCondition> = {
    domination: {
        type: 'domination',
        description: 'Control 50% of all star systems',
        threshold: 0.5,
        check: (state: FullGameState, empireId: string): boolean => {
            const totalStars = state.stars.length;
            if (totalStars === 0) return false;
            
            const controlledStars = state.stars.filter(star => {
                const planet = state.planets.find(p => p.star_id === star.id);
                return planet?.colonized_by_empire_id === empireId;
            }).length;
            
            return controlledStars / totalStars >= 0.5;
        }
    },
    conquest: {
        type: 'conquest',
        description: 'Eliminate all rival empires',
        threshold: 1,
        check: (state: FullGameState, empireId: string): boolean => {
            const rivalEmpires = state.empires.filter(e => e.id !== empireId);
            return rivalEmpires.length === 0;
        }
    },
    technological: {
        type: 'technological',
        description: 'Complete all technologies in the tech tree',
        threshold: 6,
        check: (state: FullGameState, empireId: string): boolean => {
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return false;
            
            const research = (empire as unknown as { research?: { progress: number } }).research;
            return (research?.progress || 0) >= 1.0;
        }
    },
    economic: {
        type: 'economic',
        description: 'Accumulate 10,000 credits',
        threshold: 10000,
        check: (state: FullGameState, empireId: string): boolean => {
            let totalCredits = 0;
            for (const planet of state.planets) {
                if (planet.colonized_by_empire_id === empireId && planet.resources.credits) {
                    totalCredits += planet.resources.credits;
                }
            }
            return totalCredits >= 10000;
        }
    },
    exploration: {
        type: 'exploration',
        description: 'Explore 90% of star systems',
        threshold: 0.9,
        check: (state: FullGameState, empireId: string): boolean => {
            const totalStars = state.stars.length;
            if (totalStars === 0) return false;
            
            const empire = state.empires.find(e => e.id === empireId);
            if (!empire) return false;
            
            const exploredCount = empire.explored_systems.length;
            return exploredCount / totalStars >= 0.9;
        }
    }
};

export interface GameEndResult {
    winner: string | null;
    victoryType: VictoryType | null;
    turnsElapsed: number;
    finalState: FullGameState;
}

export class VictoryService {
    checkVictory(state: FullGameState): GameEndResult | null {
        for (const empire of state.empires) {
            if (empire.player_type === 'human' || empire.player_type === 'ai') {
                for (const condition of Object.values(VICTORY_CONDITIONS)) {
                    if (condition.check(state, empire.id)) {
                        return {
                            winner: empire.id,
                            victoryType: condition.type,
                            turnsElapsed: state.currentTurn,
                            finalState: state
                        };
                    }
                }
            }
        }
        
        const activeEmpires = state.empires.filter(e => e.player_type === 'human' || e.player_type === 'ai');
        
        if (activeEmpires.length === 1) {
            return {
                winner: activeEmpires[0].id,
                victoryType: 'conquest',
                turnsElapsed: state.currentTurn,
                finalState: state
            };
        }
        
        if (activeEmpires.length === 0) {
            return {
                winner: null,
                victoryType: 'conquest',
                turnsElapsed: state.currentTurn,
                finalState: state
            };
        }
        
        return null;
    }

    checkElimination(state: FullGameState, empireId: string): boolean {
        const hasPlanets = state.planets.some(p => p.colonized_by_empire_id === empireId);
        const hasFleets = state.fleets.some(f => f.empire_id === empireId);
        return !hasPlanets && !hasFleets;
    }

    getVictoryProgress(state: FullGameState, empireId: string): Record<VictoryType, number> {
        const progress: Record<VictoryType, number> = {
            domination: 0,
            conquest: 0,
            technological: 0,
            economic: 0,
            exploration: 0
        };

        const totalStars = state.stars.length;
        if (totalStars > 0) {
            const controlledStars = state.stars.filter(star => {
                const planet = state.planets.find(p => p.star_id === star.id);
                return planet?.colonized_by_empire_id === empireId;
            }).length;
            progress.domination = controlledStars / totalStars;
        }

        const rivalEmpires = state.empires.filter(e => e.id !== empireId);
        progress.conquest = rivalEmpires.length === 0 ? 1 : 0;

        const empire = state.empires.find(e => e.id === empireId);
        if (empire) {
            const research = (empire as unknown as { research?: { progress: number } }).research;
            progress.technological = research?.progress || 0;
        }

        let totalCredits = 0;
        for (const planet of state.planets) {
            if (planet.colonized_by_empire_id === empireId && planet.resources.credits) {
                totalCredits += planet.resources.credits;
            }
        }
        progress.economic = Math.min(totalCredits / 10000, 1);

        if (totalStars > 0 && empire) {
            progress.exploration = empire.explored_systems.length / totalStars;
        }

        return progress;
    }
}