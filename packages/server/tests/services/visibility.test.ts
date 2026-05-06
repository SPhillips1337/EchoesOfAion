import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisibilityService } from '../../src/services/visibility.service';
import { fetchEmpireExploredSystems } from '../../src/db/queries/game-state.queries';
import { FullGameState } from '../../src/types/game-state';

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

        it('should include all planets but redact resources for unexplored systems', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 100 }, habitable: true, created_at: new Date() },
                    { id: 'planet2', star_id: 'star2', name: 'Mars', planet_type: 'barren', size: 'small', resources: { minerals: 50 }, habitable: false, created_at: new Date() },
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
            expect(result.planets).toHaveLength(2);
            const planet1 = result.planets.find(p => p.id === 'planet1');
            const planet2 = result.planets.find(p => p.id === 'planet2');
            expect(planet1?.resources).toEqual({ minerals: 100 });
            expect(planet2?.resources).toEqual({});
        });

        it('should redact resources for planets in unexplored systems', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                    { id: 'star2', name: 'Alpha Centauri', x_coord: 10, y_coord: 10, system_size: 'small', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 100 }, habitable: true, created_at: new Date() },
                    { id: 'planet2', star_id: 'star2', name: 'Mars', planet_type: 'barren', size: 'small', resources: { minerals: 50 }, habitable: false, created_at: new Date() },
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
            const planet1 = result.planets.find(p => p.id === 'planet1');
            const planet2 = result.planets.find(p => p.id === 'planet2');
            expect(planet1?.resources).toEqual({ minerals: 100 });
            expect(planet2?.resources).toEqual({});
        });

        it('should filter build queues to visible entities', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: {}, habitable: true, created_at: new Date() },
                ],
                starLanes: [],
                empires: [],
                fleets: [
                    { id: 'fleet1', empire_id: 'empire1', star_id: 'star1', name: 'Fleet 1', composition: {}, created_at: new Date() },
                ],
                buildQueues: [
                    { id: 'bq1', entity_type: 'planet', entity_id: 'planet1', item_type: 'mine', progress: 0, created_at: new Date(), game_id: 'game1' },
                    { id: 'bq2', entity_type: 'fleet', entity_id: 'fleet1', item_type: 'scout', progress: 0, created_at: new Date(), game_id: 'game1' },
                ],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1']);

            const result = await service.filterVisibleState('empire1', mockState);
            expect(result.buildQueues).toHaveLength(2);
            expect(result.buildQueues[0].entity_type).toBe('planet');
            expect(result.buildQueues[1].entity_type).toBe('fleet');
        });

        it('should exclude build queues for entities in unexplored systems', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                    { id: 'star2', name: 'Alpha Centauri', x_coord: 10, y_coord: 10, system_size: 'small', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: {}, habitable: true, created_at: new Date() },
                    { id: 'planet2', star_id: 'star2', name: 'Mars', planet_type: 'barren', size: 'small', resources: {}, habitable: false, created_at: new Date() },
                ],
                starLanes: [],
                empires: [],
                fleets: [
                    { id: 'fleet1', empire_id: 'empire1', star_id: 'star1', name: 'Fleet 1', composition: {}, created_at: new Date() },
                    { id: 'fleet2', empire_id: 'empire1', star_id: 'star2', name: 'Fleet 2', composition: {}, created_at: new Date() },
                ],
                buildQueues: [
                    { id: 'bq1', entity_type: 'planet', entity_id: 'planet1', item_type: 'mine', progress: 0, created_at: new Date(), game_id: 'game1' },
                    { id: 'bq2', entity_type: 'planet', entity_id: 'planet2', item_type: 'mine', progress: 0, created_at: new Date(), game_id: 'game1' },
                    { id: 'bq3', entity_type: 'fleet', entity_id: 'fleet1', item_type: 'scout', progress: 0, created_at: new Date(), game_id: 'game1' },
                    { id: 'bq4', entity_type: 'fleet', entity_id: 'fleet2', item_type: 'scout', progress: 0, created_at: new Date(), game_id: 'game1' },
                ],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1']);

            const result = await service.filterVisibleState('empire1', mockState);
            expect(result.buildQueues).toHaveLength(2);
            expect(result.buildQueues.map(bq => bq.id)).toContain('bq1');
            expect(result.buildQueues.map(bq => bq.id)).toContain('bq3');
            expect(result.buildQueues.map(bq => bq.id)).not.toContain('bq2');
            expect(result.buildQueues.map(bq => bq.id)).not.toContain('bq4');
        });

        it('should handle partially explored systems (star-level exploration)', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 100 }, habitable: true, created_at: new Date() },
                    { id: 'planet2', star_id: 'star1', name: 'Mars', planet_type: 'barren', size: 'small', resources: { minerals: 50 }, habitable: false, created_at: new Date() },
                ],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [
                    { id: 'bq1', entity_type: 'planet', entity_id: 'planet1', item_type: 'mine', progress: 0, created_at: new Date(), game_id: 'game1' },
                    { id: 'bq2', entity_type: 'planet', entity_id: 'planet2', item_type: 'mine', progress: 0, created_at: new Date(), game_id: 'game1' },
                ],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1']);

            const result = await service.filterVisibleState('empire1', mockState);
            expect(result.planets).toHaveLength(2);
            expect(result.buildQueues).toHaveLength(2);
        });

        it('should verify redacted fields are properly hidden', async () => {
            const mockState: FullGameState = {
                stars: [
                    { id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                    { id: 'star2', name: 'Alpha Centauri', x_coord: 10, y_coord: 10, system_size: 'small', created_at: new Date() },
                ],
                planets: [
                    { id: 'planet1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 100 }, habitable: true, created_at: new Date() },
                    { id: 'planet2', star_id: 'star2', name: 'Mars', planet_type: 'barren', size: 'small', resources: { minerals: 50 }, habitable: false, created_at: new Date() },
                ],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [
                    { id: 'bq1', entity_type: 'planet', entity_id: 'planet2', item_type: 'mine', progress: 0, created_at: new Date(), game_id: 'game1' },
                ],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1']);

            const result = await service.filterVisibleState('empire1', mockState);
            // planet2 is present but with redacted resources
            const planet2 = result.planets.find(p => p.id === 'planet2');
            expect(planet2).toBeDefined();
            expect(planet2?.resources).toEqual({});
            // build queue for planet2 should be filtered out
            expect(result.buildQueues.find(bq => bq.id === 'bq1')).toBeUndefined();
        });
    });
});
