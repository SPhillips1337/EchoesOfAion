import { Router, Request, Response } from 'express';
import { TurnResolutionService } from '../services/turn-resolution.service';
import { GameStateService } from '../services/game-state.service';
import { validateOrder } from '../turn-resolution/order-validator';
import { TurnAction, FullGameState } from '../types/game-state';
import { Pool } from 'pg';
import { GameCreationService } from '../services/game-creation.service';
import { VictoryService } from '../services/victory.service';
import { AIEmpireService } from '../services/ai-empire.service';

interface GameCreationOptions {
    name: string;
    starCount: number;
    empireCount: number;
    playerEmpireName: string;
    playerColor: string;
}

export function createTurnRouter(
    gameStateService?: GameStateService,
    turnResolutionService?: TurnResolutionService
): Router {
    const router = Router();

    const pool = new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        database: process.env.PG_DATABASE || 'echoes_of_aion',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
    });

    const gss = gameStateService || new GameStateService(pool);
    const trs = turnResolutionService || new TurnResolutionService();
    const gcs = new GameCreationService();
    const vs = new VictoryService();
    const ais = new AIEmpireService();

    const gameStates = new Map<string, FullGameState>();

    router.post('/games/create', (req: Request, res: Response) => {
        try {
            const options: GameCreationOptions = req.body;
            
            if (!options.name || !options.starCount || !options.empireCount) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const newGame = gcs.createGame(options);
            gameStates.set(newGame.gameId, newGame);

            return res.status(201).json(newGame);
        } catch (error) {
            console.error('Error creating game:', error);
            return res.status(500).json({ error: 'Failed to create game' });
        }
    });

    router.get('/games/:gameId', (req: Request, res: Response) => {
        const { gameId } = req.params;
        const game = gameStates.get(gameId);
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        return res.json(game);
    });

    router.post('/turns/submit', async (req: Request, res: Response) => {
        try {
            const { gameId, empireId, actions } = req.body;

            if (!gameId || typeof gameId !== 'string') {
                return res.status(400).json({ error: 'Invalid or missing gameId' });
            }

            if (!empireId || typeof empireId !== 'string') {
                return res.status(400).json({ error: 'Invalid or missing empireId' });
            }

            if (!Array.isArray(actions) || actions.length === 0) {
                return res.status(400).json({ error: 'actions must be a non-empty array' });
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(gameId)) {
                return res.status(400).json({ error: 'gameId must be a valid UUID' });
            }

            for (let i = 0; i < actions.length; i++) {
                try {
                    validateOrder(actions[i] as TurnAction);
                } catch (validationError) {
                    return res.status(400).json({ 
                        error: `Invalid TurnAction at index ${i}: ${validationError instanceof Error ? validationError.message : String(validationError)}` 
                    });
                }
            }

            let initialState = gameStates.get(gameId);
            
            if (!initialState) {
                try {
                    initialState = await gss.getFullGameState(gameId);
                } catch {
                    return res.status(404).json({ error: 'Game not found' });
                }
            }

            let resolvedState: FullGameState;
            try {
                resolvedState = await trs.resolveTurn(initialState, actions as TurnAction[]);
            } catch (resolutionError) {
                return res.status(500).json({ 
                    error: `Turn resolution failed: ${resolutionError instanceof Error ? resolutionError.message : String(resolutionError)}` 
                });
            }

            const aiActions = ais.generateAIActions(resolvedState);
            if (aiActions.length > 0) {
                resolvedState = await trs.resolveTurn(resolvedState, aiActions);
            }

            const victory = vs.checkVictory(resolvedState);

            gameStates.set(gameId, resolvedState);

            return res.status(200).json({
                success: true,
                newState: resolvedState,
                turnNumber: resolvedState.currentTurn,
                victory: victory ? { winner: victory.winner, victoryType: victory.victoryType } : null,
                battleResult: null
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

const router = createTurnRouter();
export default router;