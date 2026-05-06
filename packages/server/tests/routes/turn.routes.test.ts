import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTurnRouter } from '../../src/routes/turn.routes';
import { GameStateService } from '../../src/services/game-state.service';
import { TurnResolutionService } from '../../src/services/turn-resolution.service';
import { FullGameState, TurnAction } from '../../src/types/game-state';
import express from 'express';
import request from 'supertest';

// Mock services
const mockGameState: FullGameState = {
    stars: [],
    planets: [],
    starLanes: [],
    empires: [],
    fleets: [],
    buildQueues: [],
    turnHistory: [],
    currentTurn: 1,
    gameId: '550e8400-e29b-41d4-a716-446655440000'
};

const mockResolvedState: FullGameState = {
    ...mockGameState,
    currentTurn: 2
};

describe('Turn Routes', () => {
    let app: express.Express;
    let mockGameStateService: Partial<GameStateService>;
    let mockTurnResolutionService: Partial<TurnResolutionService>;

    beforeEach(() => {
        // Create fresh mocks for each test
        mockGameStateService = {
            getFullGameState: vi.fn().mockResolvedValue(mockGameState)
        };

        mockTurnResolutionService = {
            resolveTurn: vi.fn().mockResolvedValue(mockResolvedState)
        };

        // Create router with mocked dependencies
        const router = createTurnRouter(
            mockGameStateService as GameStateService,
            mockTurnResolutionService as TurnResolutionService
        );

        app = express();
        app.use(express.json());
        app.use('/api', router);
    });

    describe('POST /api/turns/submit', () => {
        it('should return 200 with resolved state on valid submission', async () => {
            const validAction: TurnAction = {
                type: 'MOVE_FLEET',
                payload: {
                    fleetId: 'fleet-123',
                    destinationStarId: 'star-456'
                },
                turnNumber: 1
            };

            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: [validAction]
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.resolvedState).toBeDefined();
            expect(response.body.turnNumber).toBe(2);
        });

        it('should return 400 for invalid gameId UUID', async () => {
            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: 'invalid-uuid',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: [{ type: 'MOVE_FLEET', payload: {}, turnNumber: 1 }]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('UUID');
        });

        it('should return 400 for invalid empireId UUID', async () => {
            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: 'invalid-uuid',
                    actions: [{ type: 'MOVE_FLEET', payload: {}, turnNumber: 1 }]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('UUID');
        });

        it('should return 400 for empty actions array', async () => {
            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: []
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('non-empty array');
        });

        it('should return 400 for missing actions field', async () => {
            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('non-empty array');
        });

        it('should return 400 for invalid TurnAction type', async () => {
            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: [{
                        type: 'INVALID_ACTION_TYPE',
                        payload: {},
                        turnNumber: 1
                    }]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid TurnAction');
        });

        it('should return 400 for missing required fields in TurnAction payload', async () => {
            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: [{
                        type: 'MOVE_FLEET',
                        payload: {
                            // Missing fleetId and destinationStarId
                        },
                        turnNumber: 1
                    }]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid TurnAction');
        });

        it('should return 404 when game state fetch fails', async () => {
            // Override the mock to simulate game not found
            (mockGameStateService.getFullGameState as any).mockRejectedValueOnce(
                new Error('Game 550e8400-e29b-41d4-a716-446655440000 not found')
            );

            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: [{
                        type: 'MOVE_FLEET',
                        payload: { fleetId: 'fleet-123', destinationStarId: 'star-456' },
                        turnNumber: 1
                    }]
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('Failed to fetch game state');
        });

        it('should return 500 when turn resolution fails', async () => {
            // Override the mock to simulate resolution failure
            (mockTurnResolutionService.resolveTurn as any).mockRejectedValueOnce(
                new Error('Turn resolution failed: database error')
            );

            const response = await request(app)
                .post('/api/turns/submit')
                .send({
                    gameId: '550e8400-e29b-41d4-a716-446655440000',
                    empireId: '550e8400-e29b-41d4-a716-446655440001',
                    actions: [{
                        type: 'MOVE_FLEET',
                        payload: { fleetId: 'fleet-123', destinationStarId: 'star-456' },
                        turnNumber: 1
                    }]
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Turn resolution failed');
        });
    });
});
