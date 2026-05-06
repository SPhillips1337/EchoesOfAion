import { setupDatabase, verifyGamesTable } from './db/setup';
import * as schema from './db/schema';

async function main() {
    console.log('Starting Echoes of Aion server...');
    
    try {
        // Run database migrations
        console.log('Setting up database...');
        await setupDatabase();
        
        // Verify games table exists (key table for FN-007)
        const gamesTableExists = await verifyGamesTable();
        if (!gamesTableExists) {
            console.warn('Warning: games table verification failed. Some features may not work correctly.');
        }
        
        console.log('Database setup complete.');
        console.log('Available tables:', Object.values(schema.TABLES));
        
        // TODO: Start the actual server (e.g., Express, WebSocket) here
        console.log('Server ready. (Full server implementation pending.)');
        
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    process.exit(0);
});

main();
