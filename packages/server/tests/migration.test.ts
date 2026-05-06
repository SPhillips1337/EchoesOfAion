import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { TABLES, COLUMNS } from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;

// Use describe.skip if no DATABASE_URL is available
(DATABASE_URL ? describe : describe.skip)('Database Migration (001_initial_game_schema.sql)', () => {
    let dbAvailable = false;
    let pool: Pool;
    
    async function runMigration() {
        const migrationSQL = await import('fs').then(fs => fs.promises.readFile(
            require.resolve('../migrations/001_initial_game_schema.sql'),
            'utf-8'
        ));
        await pool.query(migrationSQL);
    }
    
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
        if (dbAvailable && pool) {
            await pool.end();
        }
    });

    it('should create all required tables', async () => {
        if (!dbAvailable) return;
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        const tableNames = res.rows.map((r: any) => r.table_name);
        expect(tableNames).toEqual(expect.arrayContaining(Object.values(TABLES)));
    });

    describe('Schema Validation', () => {
        async function getTableColumns(tableName: string) {
            const res = await pool.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = $1 AND table_schema = 'public'`,
                [tableName]
            );
            return res.rows.map((r: any) => r.column_name);
        }

        it('should have all expected columns for each table matching schema.ts', async () => {
            if (!dbAvailable) return;
            for (const [tableKey, tableName] of Object.entries(TABLES)) {
                const expectedColumns = COLUMNS[tableKey as keyof typeof COLUMNS];
                const actualColumnNames = await getTableColumns(tableName as string);
                expect(actualColumnNames.sort()).toEqual(expectedColumns.sort());
            }
        });
    });
});
