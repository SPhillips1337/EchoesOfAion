import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { TABLES, COLUMNS } from '../src/db/schema';

// Skip tests if no DATABASE_URL is provided or PostgreSQL is unavailable
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/test_echoes_of_aion'
});

async function runMigration() {
    const migrationSQL = await import('fs').then(fs => fs.promises.readFile(
        require.resolve('../migrations/001_initial_game_schema.sql'),
        'utf-8'
    ));
    await pool.query(migrationSQL);
}

describe('Database Migration (001_initial_game_schema.sql)', () => {
    beforeAll(async () => {
        // Drop tables if they exist to start fresh
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
        `;
        await pool.query(dropTables);
        await runMigration();
    }, 30000);

    afterAll(async () => {
        await pool.end();
    });

    it('should create all required tables', async () => {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        const tableNames = res.rows.map(r => r.table_name);
        expect(tableNames).toEqual(expect.arrayContaining(Object.values(TABLES)));
    });

    it('should insert and retrieve a star', async () => {
        const res = await pool.query(`
            INSERT INTO ${TABLES.STARS} (name, x_coord, y_coord, system_size)
            VALUES ('Sol', 100.5, 200.75, 'medium')
            RETURNING *;
        `);
        expect(res.rows[0].name).toBe('Sol');
        expect(parseFloat(res.rows[0].x_coord)).toBe(100.5);
    });

    it('should enforce foreign key constraint on planets.star_id', async () => {
        const starRes = await pool.query(`
            INSERT INTO ${TABLES.STARS} (name, x_coord, y_coord, system_size)
            VALUES ('Alpha Centauri', 300, 400, 'large')
            RETURNING id;
        `);
        const starId = starRes.rows[0].id;

        const planetRes = await pool.query(`
            INSERT INTO ${TABLES.PLANETS} (star_id, name, planet_type, size, resources, habitable)
            VALUES ($1, 'Centauri Prime', 'terrestrial', 'medium', '{"minerals": 100}', TRUE)
            RETURNING *;
        `, [starId]);
        expect(planetRes.rows[0].star_id).toBe(starId);

        // Test cascade delete
        await pool.query(`DELETE FROM ${TABLES.STARS} WHERE id = $1`, [starId]);
        const deletedPlanet = await pool.query(`SELECT * FROM ${TABLES.PLANETS} WHERE star_id = $1`, [starId]);
        expect(deletedPlanet.rows.length).toBe(0);
    });

    it('should handle JSONB columns for planets.resources', async () => {
        const starRes = await pool.query(`
            INSERT INTO ${TABLES.STARS} (name, x_coord, y_coord, system_size)
            VALUES ('Sirius', 500, 600, 'small')
            RETURNING id;
        `);
        const starId = starRes.rows[0].id;

        await pool.query(`
            INSERT INTO ${TABLES.PLANETS} (star_id, name, planet_type, size, resources, habitable)
            VALUES ($1, 'Sirius IV', 'desert', 'small', '{"minerals": 200, "energy": 50}', FALSE)
        `, [starId]);

        const res = await pool.query(`
            SELECT resources FROM ${TABLES.PLANETS} WHERE star_id = $1;
        `, [starId]);
        expect(res.rows[0].resources).toEqual({ minerals: 200, energy: 50 });
    });

    it('should enforce CHECK constraint on empires.player_type', async () => {
        await expect(pool.query(`
            INSERT INTO ${TABLES.EMPIRES} (name, player_type, color)
            VALUES ('Test Empire', 'invalid', 'red')
        `)).rejects.toThrow(/violates check constraint/);
    });
});
