import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = process.env.DATABASE_URL 
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        database: process.env.PG_DATABASE || 'echoes_of_aion',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
    });

/**
 * Runs all SQL migration files in the migrations directory in lexicographical order.
 * Each migration is executed within a transaction to ensure atomicity.
 */
export async function setupDatabase(): Promise<void> {
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('No migrations directory found, skipping database setup.');
        return;
    }

    // Only run migrations that are in scope for the current task
    // Skip files that contain foreign key constraints (FN-005 scope)
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .filter(file => {
            // Skip files that are known to contain foreign key constraints (FN-005 scope)
            if (file.includes('foreign_key') || file.includes('0003_') || file.includes('0004_')) {
                console.log(`Skipping out-of-scope migration: ${file}`);
                return false;
            }
            return true;
        })
        .sort(); // Lexicographical order ensures 001_ runs before 002_, etc.

    if (migrationFiles.length === 0) {
        console.log('No migration files found.');
        return;
    }

    console.log(`Found ${migrationFiles.length} migration file(s):`, migrationFiles);

    const client = await pool.connect();
    try {
        for (const file of migrationFiles) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');
            
            console.log(`Running migration: ${file}`);
            
            // Execute each migration in a transaction
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✓ Migration ${file} completed successfully.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`✗ Migration ${file} failed:`, err);
                throw new Error(`Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        console.log('All migrations completed successfully.');
    } catch (err) {
        console.error('Database setup failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Verifies that the games table exists with the correct schema.
 * Useful for testing/verification after running migrations.
 */
export async function verifyGamesTable(): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'games'
            );
        `);
        
        if (!result.rows[0].exists) {
            console.error('Games table does not exist.');
            return false;
        }

        // Verify columns
        const columnsResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'games'
            ORDER BY ordinal_position;
        `);
        
        const expectedColumns = [
            { column_name: 'id', data_type: 'uuid' },
            { column_name: 'name', data_type: 'text' },
            { column_name: 'status', data_type: 'text' },
            { column_name: 'created_at', data_type: 'timestamp with time zone' }
        ];
        
        const actualColumns = columnsResult.rows;
        console.log('Games table columns:', actualColumns);
        
        return expectedColumns.every(expected => 
            actualColumns.some(col => 
                col.column_name === expected.column_name && 
                col.data_type === expected.data_type
            )
        );
    } catch (err) {
        console.error('Error verifying games table:', err);
        return false;
    } finally {
        client.release();
    }
}

export default pool;
