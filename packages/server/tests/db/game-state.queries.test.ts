import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import type { FullGameState, TurnHistory } from '../../src/types/game-state';

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

// Import after mocking
import { fetchFullGameState, fetchStateByGameId, fetchTurnHistoryForReconstruction } from '../../src/db/queries/game-state.queries';

describe('game-state.queries.ts', () => {
    let client: any;
    let pool: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        const PoolMock = vi.mocked(Pool);
        pool = new PoolMock();
        client = pool.connect();
    });

    describe('fetchFullGameState', () => {
        it('should use explicit games table JOINs for stars query', async () => {
            const gameId = 'test-game-id';
            // Mock stars query to return empty array
            client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await fetchFullGameState(gameId);

            const starsQuery = client.query.mock.calls[0][0];
            expect(starsQuery).toContain('FROM stars s INNER JOIN games g ON s.game_id = g.id');
            expect(client.query).toHaveBeenCalledWith(expect.stringContaining('WHERE g.id = $1'), [gameId]);
        });

        it('should return empty state when no stars found', async () => {
            const gameId = 'test-game-id';
            client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const result = await fetchFullGameState(gameId);

            expect(result).toEqual({
                stars: [],
                planets: [],
                starLanes: [],
                empires: [],
                fleets: [],
                buildQueues: [],
                structures: [],
                turnHistory: [],
                currentTurn: 0,
                gameId,
            });
        });
    });

    describe('fetchStateByGameId', () => {
        it('should return the same result as fetchFullGameState', async () => {
            const gameId = 'test-game-id';
            // Mock stars query to return empty array
            client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const result = await fetchStateByGameId(gameId);

            expect(result.gameId).toBe(gameId);
            expect(result.stars).toEqual([]);
        });
    });

    describe('fetchTurnHistoryForReconstruction', () => {
        it('should join turn_history → empires → games explicitly', async () => {
            const gameId = 'test-game-id';
            const upToTurn = 5;
            client.query.mockResolvedValueOnce({ rows: [] });

            await fetchTurnHistoryForReconstruction(gameId, upToTurn);

            const query = client.query.mock.calls[0][0];
            expect(query).toContain('INNER JOIN empires e ON th.empire_id = e.id');
            expect(query).toContain('INNER JOIN games g ON e.game_id = g.id');
            expect(query).toContain('WHERE g.id = $1 AND th.turn_number <= $2');
        });
    });
});
