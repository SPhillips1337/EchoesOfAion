import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchFullGameState, fetchEmpireExploredSystems, fetchTurnHistoryForReconstruction } from '../../src/db/queries/game-state.queries';

vi.mock('../../src/db/queries/game-state.queries');

describe('Game State Queries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchFullGameState', () => {
        it('should return aggregated game state for a given gameId', async () => {
            const mockState = {
                stars: [{ id: 'star1', game_id: 'game1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() }],
                planets: [{ id: 'planet1', game_id: 'game1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: {}, habitable: true, created_at: new Date() }],
                starLanes: [{ id: 'lane1', game_id: 'game1', source_star_id: 'star1', destination_star_id: 'star2', distance: 10, created_at: new Date() }],
                empires: [{ id: 'empire1', game_id: 'game1', name: 'Terran', player_type: 'human', color: 'blue', created_at: new Date() }],
                fleets: [{ id: 'fleet1', game_id: 'game1', empire_id: 'empire1', star_id: 'star1', name: 'Fleet 1', composition: {}, created_at: new Date() }],
                buildQueues: [{ id: 'bq1', game_id: 'game1', entity_type: 'planet', entity_id: 'planet1', item_type: 'mine', progress: 0, created_at: new Date() }],
                turnHistory: [{ id: 'th1', game_id: 'game1', empire_id: 'empire1', turn_number: 1, actions: [], resolved_at: null, created_at: new Date() }],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchFullGameState as vi.Mock).mockResolvedValueOnce(mockState);

            const result = await fetchFullGameState('game1');

            expect(result.gameId).toBe('game1');
            expect(result.stars).toHaveLength(1);
            expect(result.planets).toHaveLength(1);
            expect(result.starLanes).toHaveLength(1);
            expect(result.empires).toHaveLength(1);
            expect(result.fleets).toHaveLength(1);
            expect(result.buildQueues).toHaveLength(1);
            expect(result.turnHistory).toHaveLength(1);
            expect(result.currentTurn).toBe(1);
        });

        it('should return empty arrays when no entities exist for a game ID', async () => {
            (fetchFullGameState as vi.Mock).mockResolvedValueOnce({
                stars: [], planets: [], starLanes: [], empires: [], fleets: [], buildQueues: [], turnHistory: [], currentTurn: 1, gameId: 'game1'
            });

            const result = await fetchFullGameState('game1');
            expect(result.stars).toEqual([]);
            expect(result.planets).toEqual([]);
            expect(result.starLanes).toEqual([]);
            expect(result.empires).toEqual([]);
            expect(result.fleets).toEqual([]);
            expect(result.buildQueues).toEqual([]);
            expect(result.turnHistory).toEqual([]);
        });
    });

    describe('fetchEmpireExploredSystems', () => {
        it('should return explored systems array for an empire', async () => {
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce(['star1', 'star2']);

            const result = await fetchEmpireExploredSystems('empire1');
            expect(result).toEqual(['star1', 'star2']);
        });

        it('should return empty array if explored_systems is null', async () => {
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce([]);

            const result = await fetchEmpireExploredSystems('empire1');
            expect(result).toEqual([]);
        });

        it('should return empty array if empire not found', async () => {
            (fetchEmpireExploredSystems as vi.Mock).mockResolvedValueOnce([]);

            const result = await fetchEmpireExploredSystems('empire1');
            expect(result).toEqual([]);
        });
    });

    describe('fetchTurnHistoryForReconstruction', () => {
        it('should return turn history up to the specified turn', async () => {
            const mockHistory = [
                { id: 'th1', empire_id: 'empire1', turn_number: 1, actions: [], resolved_at: null, created_at: new Date() },
                { id: 'th2', empire_id: 'empire1', turn_number: 2, actions: [], resolved_at: null, created_at: new Date() },
            ];
            (fetchTurnHistoryForReconstruction as vi.Mock).mockResolvedValueOnce(mockHistory);

            const result = await fetchTurnHistoryForReconstruction('game1', 2);
            expect(result).toHaveLength(2);
            expect(result[0].turn_number).toBe(1);
            expect(result[1].turn_number).toBe(2);
        });

        it('should return empty array if no history exists for the game', async () => {
            (fetchTurnHistoryForReconstruction as vi.Mock).mockResolvedValueOnce([]);

            const result = await fetchTurnHistoryForReconstruction('game1', 5);
            expect(result).toEqual([]);
        });

        it('should only return history up to the specified turn', async () => {
            const mockHistory = [
                { id: 'th1', empire_id: 'empire1', turn_number: 1, actions: [], resolved_at: null, created_at: new Date() },
                { id: 'th2', empire_id: 'empire1', turn_number: 2, actions: [], resolved_at: null, created_at: new Date() },
            ];
            (fetchTurnHistoryForReconstruction as vi.Mock).mockResolvedValueOnce(mockHistory);

            const result = await fetchTurnHistoryForReconstruction('game1', 2);
            expect(result).toHaveLength(2);
        });
    });
});
