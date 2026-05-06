import express from 'express';
import path from 'path';
import turnRoutes from './routes/turn.routes';

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Static file serving for client UI
// __dirname = dist/src (after build), so ../client = dist/client
app.use(express.static(path.join(__dirname, '../client')));

// API routes
app.use('/api', turnRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`UI available at http://localhost:${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
    });
}

export default app;
