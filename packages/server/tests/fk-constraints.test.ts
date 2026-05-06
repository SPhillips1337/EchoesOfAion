import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { TABLES } from '../src/db/schema';
import { runAllMigrations } from './test-helpers';

const DATABASE_URL = process.env.DATABASE_URL;

// Use describe.skip if no DATABASE_URL is available
(DATABASE_URL ? describe : describe.skip)('Foreign Key Constraints - ON DELETE CASCADE', () => {
    let dbAvailable = false;
    let pool: Pool;

    beforeAll(async () => {
        if (!DATABASE_URL) return;

        pool = new Pool({ connectionString: DATABASE_URL });

        try {
            await pool.query('SELECT 1');
            dbAvailable = true;
        } catch (err) {
            console.warn('PostgreSQL not available, skipping live DB tests');
            dbAvailable = false;
            return;
        }

        // Clean up database and run all migrations including FK constraints
        await cleanupDatabase();
        await runAllMigrations(pool);
    }, 30000);

    afterAll(async () => {
        if (dbAvailable && pool) {
            await pool.end();
        }
    });

    async function cleanupDatabase() {
        const dropTables = `
            DROP TABLE IF EXISTS ${TABLES.TURN_HISTORY} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.BUILD_QUEUES} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.STRUCTURES} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.SHIPS} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.FLEETS} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.EMPIRES} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.STAR_LANES} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.PLANETS} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.STARS} CASCADE;
            DROP TABLE IF EXISTS ${TABLES.GAMES} CASCADE;
        `;
        await pool.query(dropTables);
    }

    async function insertTestGame() {
        const result = await pool.query(
            `INSERT INTO ${TABLES.GAMES} (id, name, status) 
             VALUES (gen_random_uuid(), 'Test Game', 'active') 
             RETURNING id`
        );
        return result.rows[0].id;
    }

    // Helper to check if FK constraint exists
    async function checkFKConstraint(tableName: string, constraintName: string): Promise<boolean> {
        const result = await pool.query(
            `SELECT 1 FROM pg_constraint WHERE conname = $1`,
            [constraintName]
        );
        return result.rows.length > 0;
    }

    describe('FK Constraint Existence', () => {
        const tablesToCheck = [
            { table: TABLES.STARS, constraint: 'fk_stars_game_id' },
            { table: TABLES.PLANETS, constraint: 'fk_planets_game_id' },
            { table: TABLES.STAR_LANES, constraint: 'fk_star_lanes_game_id' },
            { table: TABLES.EMPIRES, constraint: 'fk_empires_game_id' },
            { table: TABLES.FLEETS, constraint: 'fk_fleets_game_id' },
            { table: TABLES.BUILD_QUEUES, constraint: 'fk_build_queues_game_id' },
            { table: TABLES.TURN_HISTORY, constraint: 'fk_turn_history_game_id' },
        ];

        for (const { table, constraint } of tablesToCheck) {
            it(`should have FK constraint ${constraint} on ${table}`, async () => {
                if (!dbAvailable) return;
                const exists = await checkFKConstraint(table, constraint);
                expect(exists).toBe(true);
            });
        }
    });

    describe('ON DELETE CASCADE Behavior', () => {
        it('should cascade delete stars when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert a star linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.STARS} (id, game_id, name, x_coord, y_coord, system_size) 
                 VALUES (gen_random_uuid(), $1, 'Test Star', 0, 0, 'small')`,
                [gameId]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify star was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.STARS} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });

        it('should cascade delete planets when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert a star first (planets need star_id)
            const starResult = await pool.query(
                `INSERT INTO ${TABLES.STARS} (id, game_id, name, x_coord, y_coord, system_size) 
                 VALUES (gen_random_uuid(), $1, 'Test Star', 0, 0, 'small') 
                 RETURNING id`,
                [gameId]
            );
            const starId = starResult.rows[0].id;

            // Insert a planet linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.PLANETS} (id, game_id, star_id, name, planet_type, size, resources, habitable) 
                 VALUES (gen_random_uuid(), $1, $2, 'Test Planet', 'terrestrial', 'small', '{}', true)`,
                [gameId, starId]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify planet was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.PLANETS} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });

        it('should cascade delete star_lanes when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert two stars
            const star1Result = await pool.query(
                `INSERT INTO ${TABLES.STARS} (id, game_id, name, x_coord, y_coord, system_size) 
                 VALUES (gen_random_uuid(), $1, 'Star 1', 0, 0, 'small') 
                 RETURNING id`,
                [gameId]
            );
            const star2Result = await pool.query(
                `INSERT INTO ${TABLES.STARS} (id, game_id, name, x_coord, y_coord, system_size) 
                 VALUES (gen_random_uuid(), $1, 'Star 2', 10, 10, 'small') 
                 RETURNING id`,
                [gameId]
            );
            const star1Id = star1Result.rows[0].id;
            const star2Id = star2Result.rows[0].id;

            // Insert a star_lane linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.STAR_LANES} (id, game_id, source_star_id, destination_star_id, distance) 
                 VALUES (gen_random_uuid(), $1, $2, $3, 14.14)`,
                [gameId, star1Id, star2Id]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify star_lane was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.STAR_LANES} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });

        it('should cascade delete empires when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert an empire linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.EMPIRES} (id, game_id, name, player_type, color, explored_systems) 
                 VALUES (gen_random_uuid(), $1, 'Test Empire', 'human', 'red', '[]')`,
                [gameId]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify empire was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.EMPIRES} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });

        it('should cascade delete fleets when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert a star and empire first
            const starResult = await pool.query(
                `INSERT INTO ${TABLES.STARS} (id, game_id, name, x_coord, y_coord, system_size) 
                 VALUES (gen_random_uuid(), $1, 'Test Star', 0, 0, 'small') 
                 RETURNING id`,
                [gameId]
            );
            const empireResult = await pool.query(
                `INSERT INTO ${TABLES.EMPIRES} (id, game_id, name, player_type, color, explored_systems) 
                 VALUES (gen_random_uuid(), $1, 'Test Empire', 'human', 'red', '[]') 
                 RETURNING id`,
                [gameId]
            );
            const starId = starResult.rows[0].id;
            const empireId = empireResult.rows[0].id;

            // Insert a fleet linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.FLEETS} (id, game_id, empire_id, star_id, name, composition) 
                 VALUES (gen_random_uuid(), $1, $2, $3, 'Test Fleet', '{}')`,
                [gameId, empireId, starId]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify fleet was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.FLEETS} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });

        it('should cascade delete build_queues when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert a build_queue linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.BUILD_QUEUES} (id, game_id, entity_type, entity_id, item_type, progress) 
                 VALUES (gen_random_uuid(), $1, 'planet', gen_random_uuid(), 'structure', 0)`,
                [gameId]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify build_queue was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.BUILD_QUEUES} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });

        it('should cascade delete turn_history when game is deleted', async () => {
            if (!dbAvailable) return;
            const gameId = await insertTestGame();
            
            // Insert an empire first (turn_history needs empire_id)
            const empireResult = await pool.query(
                `INSERT INTO ${TABLES.EMPIRES} (id, game_id, name, player_type, color, explored_systems) 
                 VALUES (gen_random_uuid(), $1, 'Test Empire', 'human', 'red', '[]') 
                 RETURNING id`,
                [gameId]
            );
            const empireId = empireResult.rows[0].id;

            // Insert turn_history linked to the game
            await pool.query(
                `INSERT INTO ${TABLES.TURN_HISTORY} (id, game_id, empire_id, turn_number, actions) 
                 VALUES (gen_random_uuid(), $1, $2, 1, '[]')`,
                [gameId, empireId]
            );

            // Delete the game
            await pool.query(`DELETE FROM ${TABLES.GAMES} WHERE id = $1`, [gameId]);

            // Verify turn_history was cascade deleted
            const result = await pool.query(
                `SELECT * FROM ${TABLES.TURN_HISTORY} WHERE game_id = $1`,
                [gameId]
            );
            expect(result.rows.length).toBe(0);
        });
    });
});
