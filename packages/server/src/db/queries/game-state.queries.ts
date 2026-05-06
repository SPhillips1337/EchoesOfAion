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
        // Fetch all entities for the game (assumes game_id column exists on all tables per FN-002)
        const starsRes = await client.query<Star>('SELECT * FROM stars WHERE game_id = $1', [gameId]);
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
        const planetsRes = await client.query<Planet>('SELECT * FROM planets WHERE star_id = ANY($1)', [starIds]);
        const starLanesRes = await client.query<StarLane>('SELECT * FROM star_lanes WHERE source_star_id = ANY($1) OR destination_star_id = ANY($1)', [starIds]);
        const empiresRes = await client.query<Empire>('SELECT * FROM empires WHERE game_id = $1', [gameId]);
        const empireIds = empiresRes.rows.map(e => e.id);
        const fleetsRes = await client.query<Fleet>('SELECT * FROM fleets WHERE empire_id = ANY($1)', [empireIds]);
        const fleetIds = fleetsRes.rows.map(f => f.id);
        const buildQueuesRes = await client.query<BuildQueue>('SELECT * FROM build_queues WHERE (entity_type = $1 AND entity_id = ANY($2)) OR (entity_type = $3 AND entity_id = ANY($4))', ['planet', planetsRes.rows.map(p => p.id), 'fleet', fleetIds]);
        const turnHistoryRes = await client.query<TurnHistory>('SELECT th.* FROM turn_history th INNER JOIN empires e ON th.empire_id = e.id WHERE e.game_id = $1 ORDER BY th.turn_number ASC', [gameId]);
        
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
             WHERE e.game_id = $1 AND th.turn_number <= $2
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
