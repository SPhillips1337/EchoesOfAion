import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest';
import { GameStateService } from '../../src/services/game-state.service';
import { fetchFullGameState, fetchTurnHistoryForReconstruction } from '../../src/db/queries/game-state.queries';
import { Pool } from 'pg';
import { FullGameState, TurnAction } from '../../src/types/game-state';

vi.mock('../../src/db/queries/game-state.queries');

describe('GameStateService', () => {
    let service: GameStateService;
    let mockPool: any;
    let mockClient: any;

    beforeEach(() => {
        mockClient = {
            query: vi.fn().mockResolvedValue({ rowCount: 1 }),
            release: vi.fn(),
        };
        mockPool = {
            connect: vi.fn().mockResolvedValue(mockClient),
            query: vi.fn().mockResolvedValue({ rowCount: 1 }),
        };
        service = new GameStateService(mockPool);
        vi.clearAllMocks();
        
        (fetchFullGameState as vi.Mock).mockResolvedValue({
            stars: [],
            planets: [],
            starLanes: [],
            empires: [],
            fleets: [],
            buildQueues: [],
            turnHistory: [],
            currentTurn: 1,
            gameId: 'game1',
        });
        (fetchTurnHistoryForReconstruction as vi.Mock).mockResolvedValue([]);
    });

    describe('getFullGameState', () => {
        it('should return full game state from query', async () => {
            const mockState: FullGameState = {
                stars: [],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchFullGameState as vi.Mock).mockResolvedValueOnce(mockState);

            const result = await service.getFullGameState('game1');
            expect(result).toEqual(mockState);
            expect(fetchFullGameState).toHaveBeenCalledWith('game1');
        });
    });

    describe('mutateGameState', () => {
        it('should throw error for negative resource values', async () => {
            const updates = {
                planets: [{ id: 'planet1', resources: { minerals: -10 } } as any],
            };
            // validateEntityIds is called first, so mock client queries to pass
            mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

            await expect(service.mutateGameState('game1', updates)).rejects.toThrow('Negative resource value for minerals on planet');
        });

        it('should throw error for invalid entity IDs (empty ID)', async () => {
            const updates = {
                stars: [{ id: '' } as any],
            };
            // validateEntityIds will throw before DB call for empty ID
            await expect(service.mutateGameState('game1', updates)).rejects.toThrow('Invalid ID for star entity');
        });

        it('should throw error for non-existent entity IDs', async () => {
            const updates = {
                stars: [{ id: 'non-existent-star' } as any],
            };
            // Mock DB query to return 0 rows (entity not found)
            mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

            await expect(service.mutateGameState('game1', updates)).rejects.toThrow('not found in database');
        });

        it('should pass validation for valid updates', async () => {
            const updates = {
                stars: [{ id: 'star1', name: 'Sol' } as any],
                planets: [{ id: 'planet1', resources: { minerals: 10 } } as any],
            };
            // Mock all DB queries to return success
            mockClient.query.mockResolvedValue({ rowCount: 1 });

            await expect(service.mutateGameState('game1', updates)).resolves.not.toThrow();
        });
    });

    describe('reconstructStateForTurn', () => {
        it('should throw error if turn number not found in history', async () => {
            (fetchTurnHistoryForReconstruction as vi.Mock).mockResolvedValueOnce([]);

            await expect(service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 5 }))
                .rejects.toThrow('Turn number 5 not found in history');
        });

        it.skip('should return reconstructed state for valid turn', async () => {
            const mockHistory = [
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [{ type: 'MOVE_FLEET', payload: { fleetId: 'fleet1', starId: 'star2' }, turnNumber: 1 }],
                    resolved_at: null,
                    created_at: new Date(),
                },
            ];
            (fetchTurnHistoryForReconstruction as vi.Mock).mockResolvedValueOnce(mockHistory);
            (fetchFullGameState as vi.Mock).mockResolvedValueOnce({
                stars: [],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: mockHistory,
                currentTurn: 1,
                gameId: 'game1',
            });

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 });
            expect(result.currentTurn).toBe(1);
            expect(result.turnHistory).toEqual(mockHistory);
        });
    });

    describe('getVisibleGameState', () => {
        it.skip('should return visible state filtered by empire', async () => {
            const mockState: FullGameState = {
                stars: [{ id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() }],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId: 'game1',
            };
            (fetchFullGameState as vi.Mock).mockResolvedValueOnce(mockState);

            const result = await service.getVisibleGameState('empire1', 'game1');
            expect(result.stars).toHaveLength(1);
        });
    });
});
