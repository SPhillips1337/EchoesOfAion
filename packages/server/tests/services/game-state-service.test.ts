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

        it('should throw error if game not found', async () => {
            // Mock client to return rowCount 0 for games table check
            const mockClient = {
                query: vi.fn().mockImplementation((text) => {
                    if (text.includes('SELECT id FROM games')) {
                        return { rowCount: 0 };
                    }
                    return { rowCount: 1 };
                }),
                release: vi.fn(),
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            await expect(service.getFullGameState('invalid-game'))
                .rejects.toThrow('Game invalid-game not found');
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
            // First call: games table check (return rowCount 1)
            // Second call: stars table check (return rowCount 0)
            mockClient.query
                .mockResolvedValueOnce({ rowCount: 1 }) // games check
                .mockResolvedValueOnce({ rowCount: 0 }); // stars check

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

        it('should not include history when includeHistory is false', async () => {
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

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1, includeHistory: false });
            expect(result.currentTurn).toBe(1);
            expect(result.turnHistory).toEqual([]);
        });

        it('should apply BUILD_STRUCTURE action', async () => {
            const mockHistory = [
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [
                        { type: 'CREATE_FLEET', payload: { fleetId: 'fleet1', starId: 'star1', empireId: 'empire1' }, turnNumber: 1 },
                        { type: 'BUILD_STRUCTURE', payload: { planetId: 'planet1', structureType: 'mine' }, turnNumber: 1 }
                    ],
                    resolved_at: null,
                    created_at: new Date(),
                },
            ];
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 });
            // BUILD_STRUCTURE adds to buildQueues even if planet doesn't exist in replay state
            expect(result.buildQueues).toHaveLength(1);
            expect(result.buildQueues[0].entity_id).toBe('planet1');
            expect(result.buildQueues[0].item_type).toBe('mine');
        });

        it('should apply COLONIZE_PLANET action', async () => {
            const mockHistory = [
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [
                        { type: 'COLONIZE_PLANET', payload: { planetId: 'planet1', empireId: 'empire1' }, turnNumber: 1 }
                    ],
                    resolved_at: null,
                    created_at: new Date(),
                },
            ];
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 });
            // COLONIZE_PLANET doesn't modify state yet (placeholder implementation)
            expect(result.planets).toHaveLength(0);
        });

        it('should apply CONSTRUCT_SHIP action', async () => {
            const mockHistory = [
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [
                        { type: 'CREATE_FLEET', payload: { fleetId: 'fleet1', starId: 'star1', empireId: 'empire1' }, turnNumber: 1 },
                        { type: 'CONSTRUCT_SHIP', payload: { fleetId: 'fleet1', shipType: 'scout', quantity: 3 }, turnNumber: 1 }
                    ],
                    resolved_at: null,
                    created_at: new Date(),
                },
            ];
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 });
            expect(result.fleets[0].composition['scout']).toBe(3); // New fleet with 3 scouts
        });

        it('should throw error for invalid turn_history entry (empty actions array)', async () => {
            const mockHistory = [
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [], // empty actions array - invalid for turn > 0
                    resolved_at: null,
                    created_at: new Date(),
                },
            ];
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            await expect(service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 }))
                .rejects.toThrow('Empty actions array in history entry for turn 1');
        });

        it('should throw error for invalid action type', async () => {
            const mockHistory = [
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [{ type: 'INVALID_ACTION', payload: {}, turnNumber: 1 }],
                    resolved_at: null,
                    created_at: new Date(),
                },
            ];
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            await expect(service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 }))
                .rejects.toThrow('Unknown action type: INVALID_ACTION');
        });

        it('should replay actions in deterministic order (sorted by turn_number, then created_at)', async () => {
            const olderDate = new Date('2024-01-01');
            const newerDate = new Date('2024-01-02');
            
            const mockHistory = [
                {
                    id: 'th2',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [{ type: 'MOVE_FLEET', payload: { fleetId: 'fleet1', starId: 'star2' }, turnNumber: 1 }],
                    resolved_at: null,
                    created_at: newerDate,
                },
                {
                    id: 'th1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: [{ type: 'CREATE_FLEET', payload: { fleetId: 'fleet1', starId: 'star1', empireId: 'empire1' }, turnNumber: 1 }],
                    resolved_at: null,
                    created_at: olderDate,
                },
            ];
            vi.spyOn(Queries, 'fetchTurnHistoryForReconstruction').mockResolvedValueOnce(mockHistory);

            const result = await service.reconstructStateForTurn({ gameId: 'game1', turnNumber: 1 });
            // Fleet should be created before being moved (due to sorting by created_at)
            expect(result.fleets).toHaveLength(1);
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

        it('should propagate game not found error from getFullGameState', async () => {
            const mockClient = {
                query: vi.fn().mockImplementation((text) => {
                    if (text.includes('SELECT id FROM games')) {
                        return { rowCount: 0 };
                    }
                    return { rowCount: 1 };
                }),
                release: vi.fn(),
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            await expect(service.getVisibleGameState('empire1', 'invalid-game'))
                .rejects.toThrow('Game invalid-game not found');
        });
    });
});
