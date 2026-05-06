import { FullGameState, VisibleGameState } from '../types/game-state';
import { fetchEmpireExploredSystems } from '../db/queries/game-state.queries';

export class VisibilityService {
    /**
     * Filters full game state to only include entities visible to the specified empire
     * @param empireId - UUID of the empire to filter for
     * @param fullState - Full game state to filter
     * @returns VisibleGameState with fog-of-war applied
     */
    async filterVisibleState(empireId: string, fullState: FullGameState): Promise<VisibleGameState> {
        // Fetch explored systems for the empire
        const exploredSystemIds = await fetchEmpireExploredSystems(empireId);
        const exploredSet = new Set(exploredSystemIds);

        // Filter stars to explored systems only
        const visibleStars = fullState.stars.filter(star => exploredSet.has(star.id));

        // Process planets: redact resources for unexplored systems, keep all planets
        const processedPlanets = fullState.planets.map(planet => {
            if (!exploredSet.has(planet.star_id)) {
                return { ...planet, resources: {} as Record<string, number> };
            }
            return planet;
        });

        // Filter star lanes to those connecting explored systems
        const visibleStarLanes = fullState.starLanes.filter(lane => 
            exploredSet.has(lane.source_star_id) && exploredSet.has(lane.destination_star_id)
        );

        // Filter fleets: friendly fleets OR fleets in explored systems
        const visibleFleets = fullState.fleets.filter(fleet => 
            fleet.empire_id === empireId || exploredSet.has(fleet.star_id)
        );

        // Redact sensitive data for non-friendly entities
        const redactedFleets = visibleFleets.map(fleet => {
            if (fleet.empire_id !== empireId) {
                return {
                    ...fleet,
                    composition: {}, // Redact enemy fleet composition
                };
            }
            return fleet;
        });

        // Filter build queues to visible entities only
        const visibleBuildQueues = fullState.buildQueues.filter(bq => {
            if (bq.entity_type === 'planet') {
                const planet = fullState.planets.find(p => p.id === bq.entity_id);
                return planet && exploredSet.has(planet.star_id);
            } else if (bq.entity_type === 'fleet') {
                const fleet = fullState.fleets.find(f => f.id === bq.entity_id);
                return fleet && exploredSet.has(fleet.star_id);
            }
            return false;
        });

        return {
            stars: visibleStars,
            planets: processedPlanets,
            starLanes: visibleStarLanes,
            fleets: redactedFleets,
            empires: fullState.empires.filter(e => e.id === empireId), // Only show own empire
            buildQueues: visibleBuildQueues,
            turnHistory: [], // Turn history not visible in visible state
            currentTurn: fullState.currentTurn,
            gameId: fullState.gameId,
        };
    }
}
