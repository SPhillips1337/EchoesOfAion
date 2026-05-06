import { Pool } from 'pg';
import { Star, Planet, StarLane, Empire, Fleet, BuildQueue, TurnHistory } from '../../types/game-entities';
import { FullGameState } from '../../types/game-state';

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'echoes_of_aion',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
});

export async function fetchFullGameState(gameId: string): Promise<FullGameState> {
    const client = await pool.connect();
    try {
        // Fetch all entities for the game using explicit games table JOINs per FN-005 FK relationships
        const starsRes = await client.query<Star>(
            'SELECT s.* FROM stars s INNER JOIN games g ON s.game_id = g.id WHERE g.id = $1',
            [gameId]
        );
        const starIds = starsRes.rows.map(s => s.id);
        if (starIds.length === 0) {
            return {
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
        }
        const planetsRes = await client.query<Planet>(
            'SELECT p.* FROM planets p INNER JOIN stars s ON p.star_id = s.id INNER JOIN games g ON s.game_id = g.id WHERE g.id = $1',
            [gameId]
        );
        const starLanesRes = await client.query<StarLane>(
            'SELECT sl.* FROM star_lanes sl INNER JOIN stars s1 ON sl.source_star_id = s1.id INNER JOIN stars s2 ON sl.destination_star_id = s2.id INNER JOIN games g ON s1.game_id = g.id WHERE g.id = $1',
            [gameId]
        );
        const empiresRes = await client.query<Empire>(
            'SELECT e.* FROM empires e INNER JOIN games g ON e.game_id = g.id WHERE g.id = $1',
            [gameId]
        );
        const fleetsRes = await client.query<Fleet>(
            'SELECT f.* FROM fleets f INNER JOIN empires e ON f.empire_id = e.id INNER JOIN games g ON e.game_id = g.id WHERE g.id = $1',
            [gameId]
        );
        const buildQueuesRes = await client.query<BuildQueue>(
            `SELECT bq.* FROM build_queues bq
             LEFT JOIN planets p ON bq.entity_type = 'planet' AND bq.entity_id = p.id
             LEFT JOIN fleets f ON bq.entity_type = 'fleet' AND bq.entity_id = f.id
             LEFT JOIN empires e ON p.game_id = e.game_id OR f.empire_id = e.id
             INNER JOIN games g ON e.game_id = g.id
             WHERE g.id = $1`,
            [gameId]
        );
        const turnHistoryRes = await client.query<TurnHistory>(
            `SELECT th.* FROM turn_history th
             INNER JOIN empires e ON th.empire_id = e.id
             INNER JOIN games g ON e.game_id = g.id
             WHERE g.id = $1
             ORDER BY th.turn_number ASC`,
            [gameId]
        );
        
        // Placeholder for current turn (would come from games table in future per FN-002)
        const currentTurn = 1;

        return {
            stars: starsRes.rows,
            planets: planetsRes.rows,
            starLanes: starLanesRes.rows,
            empires: empiresRes.rows,
            fleets: fleetsRes.rows,
            buildQueues: buildQueuesRes.rows,
            turnHistory: turnHistoryRes.rows,
            currentTurn,
            gameId,
        };
    } finally {
        client.release();
    }
}

export async function fetchStateByGameId(gameId: string): Promise<FullGameState> {
    // Leverages explicit games table JOINs already implemented in fetchFullGameState
    return fetchFullGameState(gameId);
}

export async function fetchEmpireExploredSystems(empireId: string): Promise<string[]> {
    const client = await pool.connect();
    try {
        const result = await client.query<{ explored_systems: string[] }>(
            `SELECT COALESCE(explored_systems, '[]'::jsonb) AS explored_systems FROM empires WHERE id = $1`,
            [empireId]
        );
        return result.rows[0]?.explored_systems || [];
    } finally {
        client.release();
    }
}

export async function fetchTurnHistoryForReconstruction(gameId: string, upToTurn: number): Promise<TurnHistory[]> {
    const client = await pool.connect();
    try {
        const result = await client.query<TurnHistory>(
            `SELECT th.* FROM turn_history th
             INNER JOIN empires e ON th.empire_id = e.id
             INNER JOIN games g ON e.game_id = g.id
             WHERE g.id = $1 AND th.turn_number <= $2
             ORDER BY th.turn_number ASC`,
            [gameId, upToTurn]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

// Update functions for turn resolution persistence
export async function updateEmpireExploredSystems(empireId: string, exploredSystems: string[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `UPDATE empires SET explored_systems = $1 WHERE id = $2`,
            [JSON.stringify(exploredSystems), empireId]
        );
    } finally {
        client.release();
    }
}

export async function updateFleetStarId(fleetId: string, starId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `UPDATE fleets SET star_id = $1 WHERE id = $2`,
            [starId, fleetId]
        );
    } finally {
        client.release();
    }
}

export async function updatePlanetResources(planetId: string, resources: Record<string, number>): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `UPDATE planets SET resources = $1 WHERE id = $2`,
            [JSON.stringify(resources), planetId]
        );
    } finally {
        client.release();
    }
}

export async function updateBuildQueueProgress(bqId: string, progress: number): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `UPDATE build_queues SET progress = $1 WHERE id = $2`,
            [progress, bqId]
        );
    } finally {
        client.release();
    }
}

export async function insertTurnHistory(params: {
    game_id: string;
    empire_id: string;
    turn_number: number;
    actions: unknown[];
}): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO turn_history (id, game_id, empire_id, turn_number, actions)
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [params.game_id, params.empire_id, params.turn_number, JSON.stringify(params.actions)]
        );
    } finally {
        client.release();
    }
}
