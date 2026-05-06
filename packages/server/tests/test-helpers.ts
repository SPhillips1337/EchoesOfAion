import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Runs all SQL migration files in the migrations directory in lexicographical order.
 * Unlike setupDatabase(), this function includes ALL migrations including foreign key constraints.
 */
export async function runAllMigrations(pool: Pool): Promise<void> {
    const migrationsDir = path.join(__dirname, '../migrations');

    if (!fs.existsSync(migrationsDir)) {
        throw new Error('Migrations directory not found.');
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Lexicographical order ensures 001_ runs before 002_, etc.

    if (migrationFiles.length === 0) {
        throw new Error('No migration files found.');
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
    } finally {
        client.release();
    }
}
