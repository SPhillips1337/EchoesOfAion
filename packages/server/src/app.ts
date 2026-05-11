import express from 'express';
import path from 'path';
import turnRoutes from './routes/turn.routes';

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Static file serving for client UI
// __dirname = dist (after build)
app.use(express.static(path.join(__dirname, 'client')));

// API routes
app.use('/api', turnRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for use in index.ts
export default app;
