import { Router, Request, Response } from 'express';
import { TurnResolutionService } from '../services/turn-resolution.service';
import { GameStateService } from '../services/game-state.service';
import { validateOrder } from '../turn-resolution/order-validator';
import { TurnAction, FullGameState } from '../types/game-state';
import { Pool } from 'pg';

/**
 * Factory function to create turn routes with injectable dependencies
 */
export function createTurnRouter(
    gameStateService?: GameStateService,
    turnResolutionService?: TurnResolutionService
): Router {
    const router = Router();

    // Use provided services or create defaults
    const pool = new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        database: process.env.PG_DATABASE || 'echoes_of_aion',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
    });

    const gss = gameStateService || new GameStateService(pool);
    const trs = turnResolutionService || new TurnResolutionService();

    /**
     * POST /api/turns/submit
     * Submit turn actions for resolution
     * Body: { gameId: string, empireId: string, actions: TurnAction[] }
     */
    router.post('/turns/submit', async (req: Request, res: Response) => {
        try {
            const { gameId, empireId, actions } = req.body;

            // Validate required fields
            if (!gameId || typeof gameId !== 'string') {
                return res.status(400).json({ 
                    error: 'Invalid or missing gameId. Must be a non-empty string.' 
                });
            }

            if (!empireId || typeof empireId !== 'string') {
                return res.status(400).json({ 
                    error: 'Invalid or missing empireId. Must be a non-empty string.' 
                });
            }

            if (!Array.isArray(actions) || actions.length === 0) {
                return res.status(400).json({ 
                    error: 'actions must be a non-empty array of TurnAction objects.' 
                });
            }

            // Basic UUID format validation (simplified check)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(gameId)) {
                return res.status(400).json({ 
                    error: 'gameId must be a valid UUID.' 
                });
            }
            if (!uuidRegex.test(empireId)) {
                return res.status(400).json({ 
                    error: 'empireId must be a valid UUID.' 
                });
            }

            // Validate each TurnAction using order-validator
            for (let i = 0; i < actions.length; i++) {
                try {
                    validateOrder(actions[i] as TurnAction);
                } catch (validationError) {
                    return res.status(400).json({ 
                        error: `Invalid TurnAction at index ${i}: ${validationError instanceof Error ? validationError.message : String(validationError)}` 
                    });
                }
            }

            // Fetch initial game state
            let initialState: FullGameState;
            try {
                initialState = await gss.getFullGameState(gameId);
            } catch (stateError) {
                return res.status(404).json({ 
                    error: `Failed to fetch game state: ${stateError instanceof Error ? stateError.message : String(stateError)}` 
                });
            }

            // Resolve turn with submitted actions
            let resolvedState: FullGameState;
            try {
                resolvedState = await trs.resolveTurn(initialState, actions as TurnAction[]);
            } catch (resolutionError) {
                return res.status(500).json({ 
                    error: `Turn resolution failed: ${resolutionError instanceof Error ? resolutionError.message : String(resolutionError)}` 
                });
            }

            // Return resolved state
            return res.status(200).json({
                success: true,
                message: 'Turn submitted and resolved successfully.',
                resolvedState,
                turnNumber: resolvedState.currentTurn
            });

        } catch (error) {
            console.error('Unexpected error in turn submission:', error);
            return res.status(500).json({ 
                error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` 
            });
        }
    });

    return router;
}

// Default export for use in app.ts
const router = createTurnRouter();
export default router;
