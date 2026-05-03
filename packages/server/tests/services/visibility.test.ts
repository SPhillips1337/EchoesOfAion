import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisibilityService } from '../../src/services/visibility.service';
import { fetchEmpireExploredSystems } from '../../src/db/queries/game-state.queries';
import { FullGameState, VisibleGameState } from '../../src/types/game-state';

vi.mock('../../src/db/queries/game-state.queries');

describe('VisibilityService', () => {
    let service: VisibilityService;

    beforeEach(() => {
        service = new VisibilityService();
        vi.clearAllMocks();
    });

    describe('filterVisibleState', () => {
        it('should only return explored stars', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                    { id: 'star2', name: 'Alpha Centauri', x_coord: 10, y_coord: 10, system_size: 'small', created_at: new Date() },
                ],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1']);

            const result = await service.filterVisibleState('empire1', mockState);
            expect(result.stars).toHaveLength(1);
            expect(result.stars[0].id).toBe('star1');
        });

        it('should filter planets to explored systems', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: {}, habitable: true, created_at: new Date() },
                    { id: 'planet2', star_id: 'star2', name: 'Mars', planet_type: 'barren', size: 'small', resources: {}, habitable: false, created_at: new Date() },
                ],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1']);

            const result = await service.filterVisibleState('empire1', mockState);
            expect(result.planets).toHaveLength(1);
            expect(result.planets[0].id).toBe('planet1');
        });
    });
});
