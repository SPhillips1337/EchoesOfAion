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
        
        // Start the Express server
        const { default: app } = await import('./app');
        const PORT = process.env.PORT || 3000;
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`UI available at http://localhost:${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api`);
        });
        
        console.log('Server is fully operational.');
        
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
