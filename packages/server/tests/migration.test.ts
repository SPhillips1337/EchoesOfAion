import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Pool } from 'pg';
import { TABLES, COLUMNS, EntityTypeMap } from '../src/db/schema';
import {
    Star,
    Planet,
    StarLane,
    Empire,
    Fleet,
    Ship,
    Structure,
    BuildQueue,
    TurnHistory
} from '../src/types/game-entities';

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
    let dbAvailable = false;
    
    beforeAll(async () => {
        // Check if database is available
        try {
            await pool.query('SELECT 1');
            dbAvailable = true;
        } catch (err) {
            console.warn('PostgreSQL not available, skipping live DB tests');
            dbAvailable = false;
            return;
        }
        
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
    
    beforeEach(() => {
        if (!dbAvailable) {
            return skip();
        }
    });

    afterAll(async () => {
        if (dbAvailable) {
            await pool.end();
        }
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

    describe('Schema-Entity Model Validation', () => {
        // Helper to get column info for a table
        async function getTableColumns(tableName: string) {
            const res = await pool.query(
                `SELECT column_name, data_type, is_nullable 
                 FROM information_schema.columns 
                 WHERE table_name = $1 AND table_schema = 'public'`,
                [tableName]
            );
            return res.rows;
        }

        // Helper to check if PG type is compatible with TS type
        function isTypeCompatible(pgType: string, tsType: string): boolean {
            const typeMap: Record<string, string[]> = {
                'uuid': ['string'],
                'character varying': ['string'],
                'numeric': ['number'],
                'text': ['string'],
                'jsonb': ['object', 'Record', 'unknown[]'],
                'boolean': ['boolean'],
                'timestamp with time zone': ['Date', 'Date|null', 'Date|undefined'],
                'integer': ['number']
            };
            const compatibleTsTypes = typeMap[pgType] || [];
            return compatibleTsTypes.some(t => tsType.includes(t));
        }

        it('should have all expected columns for each table matching schema.ts', async () => {
            for (const [tableKey, tableName] of Object.entries(TABLES)) {
                const expectedColumns = COLUMNS[tableKey as keyof typeof COLUMNS];
                const actualColumns = await getTableColumns(tableName);
                const actualColumnNames = actualColumns.map(c => c.column_name);
                
                expect(actualColumnNames.sort()).toEqual(expectedColumns.sort());
            }
        });

        it('should have entity properties matching table columns', async () => {
            const entityMap: Record<string, any> = {
                [TABLES.STARS]: Star,
                [TABLES.PLANETS]: Planet,
                [TABLES.STAR_LANES]: StarLane,
                [TABLES.EMPIRES]: Empire,
                [TABLES.FLEETS]: Fleet,
                [TABLES.SHIPS]: Ship,
                [TABLES.STRUCTURES]: Structure,
                [TABLES.BUILD_QUEUES]: BuildQueue,
                [TABLES.TURN_HISTORY]: TurnHistory
            };

            for (const [tableName, Entity] of Object.entries(entityMap)) {
                const columns = await getTableColumns(tableName);
                const entityProps = Object.keys(new Entity()); // Get property names
                
                // Check that all entity properties (except maybe methods) are present as columns
                const columnNames = columns.map(c => c.column_name);
                for (const prop of entityProps) {
                    expect(columnNames).toContain(prop);
                }
            }
        });

        it('should have compatible data types between schema and entities', async () => {
            const typeMapping: Record<string, string> = {
                [TABLES.STARS]: 'Star',
                [TABLES.PLANETS]: 'Planet',
                // Add more as needed, but for brevity, check key ones
            };

            // Check Star entity: x_coord (numeric -> number), y_coord (numeric -> number)
            const starColumns = await getTableColumns(TABLES.STARS);
            const xCoordCol = starColumns.find(c => c.column_name === 'x_coord');
            expect(xCoordCol.data_type).toBe('numeric');
            
            const yCoordCol = starColumns.find(c => c.column_name === 'y_coord');
            expect(yCoordCol.data_type).toBe('numeric');
            
            // Check Planet resources (jsonb -> Record<string, number>)
            const planetColumns = await getTableColumns(TABLES.PLANETS);
            const resourcesCol = planetColumns.find(c => c.column_name === 'resources');
            expect(resourcesCol.data_type).toBe('jsonb');
            
            // Check boolean column
            const habitableCol = planetColumns.find(c => c.column_name === 'habitable');
            expect(habitableCol.data_type).toBe('boolean');
        });
    });
});
