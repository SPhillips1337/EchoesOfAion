import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateService } from '../../src/services/game-state.service';
import * as Queries from '../../src/db/queries/game-state.queries';
import { FullGameState } from '../../src/types/game-state';

describe('GameStateService', () => {
    let service: GameStateService;
    let mockPool: any;
    let mockClient: any;
    let currentMockState: FullGameState;

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

        currentMockState = {
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

        vi.spyOn(Queries, 'fetchFullGameState').mockImplementation(async () => currentMockState);
        vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValue([]);
        vi.spyOn(Queries, 'fetchEmpireExploredSystems').mockResolvedValue([]);
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
            vi.spyOn(Queries, 'fetchFullGameState').mockResolvedValueOnce(mockState);

            const result = await service.getFullGameState('game1');
            expect(result).toEqual(mockState);
        });
    });

    describe('mutateGameState', () => {
        it('should throw error for negative resource values', async () => {
            const updates = {
                planets: [{ id: 'planet1', resources: { minerals: -10 } } as any],
            };
            mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

            await expect(service.mutateGameState('game1', updates)).rejects.toThrow('Negative resource value for minerals on planet');
        });

        it('should throw error for invalid entity IDs (empty ID)', async () => {
            const updates = {
                stars: [{ id: '' } as any],
            };
            await expect(service.mutateGameState('game1', updates)).rejects.toThrow('Invalid ID for star entity');
        });

        it('should throw error for non-existent entity IDs', async () => {
            const updates = {
                stars: [{ id: 'non-existent-star' } as any],
            };
            mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

            await expect(service.mutateGameState('game1', updates)).rejects.toThrow('not found in database');
        });

        it('should pass validation for valid updates', async () => {
            const updates = {
                stars: [{ id: 'star1', name: 'Sol' } as any],
                planets: [{ id: 'planet1', resources: { minerals: 10 } } as any],
            };
            mockClient.query.mockResolvedValue({ rowCount: 1 });

            await expect(service.mutateGameState('game1', updates)).resolves.not.toThrow();
        });
    });

    describe('reconstructStateForTurn', () => {
        it('should throw error if turn number not found in history', async () => {
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce([]);

            await expect(service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 5 }))
                .rejects.toThrow('Turn number 5 not found in history');
        });

        it('should return reconstructed state for valid turn', async () => {
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
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1, includeHistory: true });
            expect(result.currentTurn).toBe(1);
            expect(result.turnHistory).toEqual(mockHistory);
        });
    });

    describe('getVisibleGameState', () => {
        it('should return visible state filtered by empire', async () => {
            currentMockState.stars = [{ id: 'star1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() }];
            vi.spyOn(Queries, 'fetchEmpireExploredSystems').mockResolvedValue(['star1']);

            const result = await service.getVisibleGameState('empire1', 'game1');
            expect(result.stars).toHaveLength(1);
            expect(result.stars[0].id).toBe('star1');
        });
    });
});
