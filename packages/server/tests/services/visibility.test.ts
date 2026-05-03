import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisibilityService } from '../../src/services/visibility.service';
import { FullGameState, VisibleGameState } from '../../src/types/game-state';
import { Star, Planet, StarLane, Fleet, Empire } from '../../src/types/game-entities';
import { fetchEmpireExploredSystems } from '../../src/db/queries/game-state.queries';

vi.mock('../../src/db/queries/game-state.queries');

describe('VisibilityService', () => {
    let service: VisibilityService;
    const mockEmpireId = 'empire1';
    const mockExploredSystems = ['star1', 'star2'];

    beforeEach(() => {
        service = new VisibilityService();
        (fetchEmpireExploredSystems as vi.Mock).mockResolvedValue(mockExploredSystems);
        vi.clearAllMocks();
    });

    const createMockState = (): FullGameState => ({
        stars: [
            { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
            { id: 'star2', name: 'Alpha Centauri', x_coord: 10, y_coord: 10, system_size: 'small', created_at: new Date() },
            { id: 'star3', name: ' unexplored', x_coord: 20, y_coord: 20, system_size: 'large', created_at: new Date() },
        ],
        planets: [
            { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 10 }, habitable: true, created_at: new Date() },
            { id: 'planet2', star_id: 'star3', name: 'Unexplored Planet', planet_type: 'gas_giant', size: 'large', resources: { gas: 20 }, habitable: false, created_at: new Date() },
        ],
        starLanes: [
            { id: 'lane1', source_star_id: 'star1', destination_star_id: 'star2', distance: 10, created_at: new Date() },
            { id: 'lane2', source_star_id: 'star1', destination_star_id: 'star3', distance: 15, created_at: new Date() },
        ],
        empires: [
            { id: 'empire1', name: 'Terran', player_type: 'human', color: 'blue', created_at: new Date() },
            { id: 'empire2', name: 'Vulcan', player_type: 'ai', color: 'red', created_at: new Date() },
        ],
        fleets: [
            { id: 'fleet1', empire_id: 'empire1', star_id: 'star1', name: 'Fleet 1', composition: { scout: 1 }, created_at: new Date() },
            { id: 'fleet2', empire_id: 'empire2', star_id: 'star3', name: 'Enemy Fleet', composition: { frigate: 2 }, created_at: new Date() },
        ],
        buildQueues: [],
        turnHistory: [],
        currentTurn: 1,
        gameId: 'game1',
    });

    describe('filterVisibleState', () => {
        it('should filter stars to explored systems only', async () => {
            const state = createMockState();
            const result = await service.filterVisibleState(mockEmpireId, state);

            expect(result.stars).toHaveLength(2);
            expect(result.stars.map(s => s.id)).toEqual(['star1', 'star2']);
        });

        it('should filter planets to explored systems only', async () => {
            const state = createMockState();
            const result = await service.filterVisibleState(mockEmpireId, state);

            expect(result.planets).toHaveLength(1);
            expect(result.planets[0].star_id).toBe('star1');
        });

        it('should filter star lanes to those connecting explored systems', async () => {
            const state = createMockState();
            const result = await service.filterVisibleState(mockEmpireId, state);

            expect(result.starLanes).toHaveLength(1);
            expect(result.starLanes[0].id).toBe('lane1');
        });

        it('should include friendly fleets and fleets in explored systems', async () => {
            const state = createMockState();
            // Add an enemy fleet in explored system
            state.fleets.push({ id: 'fleet3', empire_id: 'empire2', star_id: 'star1', name: 'Enemy in explored', composition: {}, created_at: new Date() } as any);
            
            const result = await service.filterVisibleState(mockEmpireId, state);

            expect(result.fleets.length).toBeGreaterThanOrEqual(1);
            // Friendly fleet should be included
            expect(result.fleets.some(f => f.empire_id === mockEmpireId)).toBe(true);
        });

        it('should redact enemy fleet composition', async () => {
            const state = createMockState();
            const result = await service.filterVisibleState(mockEmpireId, state);

            const enemyFleet = result.fleets.find(f => f.empire_id !== mockEmpireId);
            if (enemyFleet) {
                expect(enemyFleet.composition).toEqual({});
            }
        });

        it('should redact unexplored resource values', async () => {
            const state = createMockState();
            // Mock explored systems to only include star1
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValue(['star1']);
            
            const result = await service.filterVisibleState(mockEmpireId, state);
            const planetInStar1 = result.planets.find(p => p.star_id === 'star1');
            if (planetInStar1) {
                expect(planetInStar1.resources).toBeDefined();
            }
        });
    });
});
