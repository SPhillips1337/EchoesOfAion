import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateService } from '../../src/services/game-state.service';
import { Pool } from 'pg';
import type { FullGameState, TurnAction } from '../../src/types/game-state';

// Mock the entire pg module
vi.mock('pg', () => {
    const mClient = {
        query: vi.fn(),
        release: vi.fn(),
    };
    const mPool = {
        connect: vi.fn(() => mClient),
    };
    return { Pool: vi.fn(() => mPool) };
});

// Mock the query functions from game-state.queries
vi.mock('../../src/db/queries/game-state.queries', async () => {
    const actual = await vi.importActual<typeof import('../../src/db/queries/game-state.queries')>('../../src/db/queries/game-state.queries');
    return {
        ...actual,
        fetchFullGameState: vi.fn(),
        fetchStateByGameId: vi.fn(),
        fetchTurnHistoryForReconstruction: vi.fn(),
        fetchEmpireExploredSystems: vi.fn().mockResolvedValue([]),
    };
});

import { fetchStateByGameId } from '../../src/db/queries/game-state.queries';

describe('GameStateService (new methods)', () => {
    let service: GameStateService;
    let mockClient: any;
    let mockPool: any;

    beforeEach(() => {
        vi.clearAllMocks();
        const PoolMock = vi.mocked(Pool);
        mockPool = new PoolMock();
        mockClient = mockPool.connect();
        service = new GameStateService(mockPool);
    });

    describe('fetchStateByGameId', () => {
        it('should call fetchStateByGameId from queries', async () => {
            const gameId = 'test-game-id';
            const mockState: FullGameState = {
                stars: [],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId,
            };
            (fetchStateByGameId as any).mockResolvedValueOnce(mockState);

            const result = await service.fetchStateByGameId(gameId);

            expect(fetchStateByGameId).toHaveBeenCalledWith(gameId);
            expect(result).toEqual(mockState);
        });
    });

    describe('getFullGameState', () => {
        it('should validate game exists then call fetchStateByGameId', async () => {
            const gameId = 'test-game-id';
            // Mock game exists query
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: gameId }], rowCount: 1 });
            const mockState: FullGameState = {
                stars: [],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId,
            };
            (fetchStateByGameId as any).mockResolvedValueOnce(mockState);

            const result = await service.getFullGameState(gameId);

            expect(mockClient.query).toHaveBeenCalledWith('SELECT id FROM games WHERE id = $1', [gameId]);
            expect(result).toEqual(mockState);
        });

        it('should throw error if game does not exist', async () => {
            const gameId = 'invalid-game-id';
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await expect(service.getFullGameState(gameId)).rejects.toThrow(`Game ${gameId} not found`);
        });
    });

    describe('getVisibleGameState', () => {
        it('should use fetchStateByGameId instead of getFullGameState', async () => {
            const gameId = 'test-game-id';
            const empireId = 'test-empire-id';
            const mockState: FullGameState = {
                stars: [],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                turnHistory: [],
                currentTurn: 1,
                gameId,
            };
            (fetchStateByGameId as any).mockResolvedValueOnce(mockState);

            const result = await service.getVisibleGameState(empireId, gameId);

            expect(fetchStateByGameId).toHaveBeenCalledWith(gameId);
            expect(result).toBeDefined();
        });
    });
});

describe('GameStateService.applyAction - COLONIZE_PLANET', () => {
    let service: GameStateService;
    let initialState: FullGameState;

    beforeEach(() => {
        service = new GameStateService();
        initialState = {
            stars: [],
            planets: [
                {
                    id: 'planet-1',
                    game_id: 'game-1',
                    star_id: 'star-1',
                    name: 'Test Planet',
                    planet_type: 'terrestrial',
                    size: 'medium',
                    resources: { minerals: 100 },
                    habitable: true,
                    colonized_by_empire_id: undefined,
                    created_at: new Date(),
                },
            ],
            starLanes: [],
            empires: [
                {
                    id: 'empire-1',
                    game_id: 'game-1',
                    name: 'Test Empire',
                    player_type: 'human',
                    color: '#ff0000',
                    explored_systems: [],
                    created_at: new Date(),
                },
            ],
            fleets: [
                {
                    id: 'fleet-1',
                    game_id: 'game-1',
                    empire_id: 'empire-1',
                    star_id: 'star-1',
                    name: 'Test Fleet',
                    composition: { scout: 1 },
                    created_at: new Date(),
                },
            ],
            buildQueues: [],
            turnHistory: [],
            currentTurn: 1,
            gameId: 'game-1',
        };
    });

    it('should successfully colonize a planet', () => {
        const action: TurnAction = {
            type: 'COLONIZE_PLANET',
            payload: {
                fleetId: 'fleet-1',
                planetId: 'planet-1',
            },
            turnNumber: 1,
        };

        // Access private method via any cast for testing
        const result = (service as any).applyAction(initialState, action);

        expect(result.planets[0].colonized_by_empire_id).toBe('empire-1');
    });

    it('should throw error when fleet not found', () => {
        const action: TurnAction = {
            type: 'COLONIZE_PLANET',
            payload: {
                fleetId: 'nonexistent-fleet',
                planetId: 'planet-1',
            },
            turnNumber: 1,
        };

        expect(() => (service as any).applyAction(initialState, action)).toThrow(
            'Fleet nonexistent-fleet not found in game state'
        );
    });

    it('should throw error when planet not found', () => {
        const action: TurnAction = {
            type: 'COLONIZE_PLANET',
            payload: {
                fleetId: 'fleet-1',
                planetId: 'nonexistent-planet',
            },
            turnNumber: 1,
        };

        expect(() => (service as any).applyAction(initialState, action)).toThrow(
            'Planet nonexistent-planet not found in game state'
        );
    });
});
