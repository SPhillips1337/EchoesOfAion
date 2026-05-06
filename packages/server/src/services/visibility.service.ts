import { FullGameState, VisibleGameState } from '../types/game-state';
import { Planet } from '../types/game-entities';
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
        const visibleStarIds = new Set(visibleStars.map(s => s.id));

        // Filter planets to those in explored systems
        const visiblePlanets = fullState.planets.filter(planet => visibleStarIds.has(planet.star_id));

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

        // Redact unexplored resource values (set to null for non-friendly planets)
        const redactedPlanets = visiblePlanets.map(planet => {
            if (!exploredSet.has(planet.star_id)) {
                return { ...planet, resources: null as any } as unknown as Planet; // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            return planet;
        });

        return {
            stars: visibleStars,
            planets: redactedPlanets,
            starLanes: visibleStarLanes,
            fleets: redactedFleets,
            empires: fullState.empires.filter(e => e.id === empireId), // Only show own empire
            buildQueues: [], // TODO: filter build queues to visible entities
            turnHistory: [], // Turn history not visible in visible state
            currentTurn: fullState.currentTurn,
            gameId: fullState.gameId,
        };
    }
}
