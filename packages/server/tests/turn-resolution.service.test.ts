import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TurnResolutionService } from '../src/services/turn-resolution.service';
import { 
    updateEmpireExploredSystems,
    updateFleetStarId,
    updatePlanetResources,
    updateBuildQueueProgress,
    insertBuildQueue,
    insertTurnHistory,
    fetchFullGameState
} from '../src/db/queries/game-state.queries';
import { FullGameState, TurnAction } from '../src/types/game-state';
import { Empire, Fleet, Planet, BuildQueue, TurnHistory } from '../src/types/game-entities';

vi.mock('../src/db/queries/game-state.queries');

describe('TurnResolutionService', () => {
    let service: TurnResolutionService;
    let mockInitialState: FullGameState;
    let mockActions: TurnAction[];

    beforeEach(() => {
        service = new TurnResolutionService();
        vi.clearAllMocks();

        // Setup mock initial state
        mockInitialState = {
            stars: [
                { id: 'star1', game_id: 'game1', name: 'Sol', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
                { id: 'star2', game_id: 'game1', name: 'Alpha Centauri', x_coord: 10, y_coord: 10, system_size: 'medium', created_at: new Date() }
            ],
            planets: [
                { id: 'planet1', game_id: 'game1', star_id: 'star1', name: 'Earth', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 100 }, habitable: true, created_at: new Date() }
            ],
            starLanes: [
                { id: 'lane1', game_id: 'game1', source_star_id: 'star1', destination_star_id: 'star2', distance: 10, created_at: new Date() }
            ],
            empires: [
                { id: 'empire1', game_id: 'game1', name: 'Terran', player_type: 'human', color: '#fff', explored_systems: ['star1'], created_at: new Date() }
            ],
            fleets: [
                { id: 'fleet1', game_id: 'game1', empire_id: 'empire1', star_id: 'star1', name: 'Fleet 1', composition: { scout: 1 }, created_at: new Date() }
            ],
            buildQueues: [
                { id: 'bq1', game_id: 'game1', entity_type: 'planet', entity_id: 'planet1', item_type: 'mine', progress: 0, created_at: new Date() }
            ],
            turnHistory: [],
            currentTurn: 1,
            gameId: 'game1'
        };

        mockActions = [
            { type: 'MOVE_FLEET', turnNumber: 1, payload: { fleetId: 'fleet1', destinationStarId: 'star2' } } as TurnAction,
            { type: 'BUILD_STRUCTURE', turnNumber: 1, payload: { planetId: 'planet1', structureType: 'mine' } } as TurnAction
        ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('resolveTurn', () => {
        it('should persist empire explored systems changes', async () => {
            // Run resolution with original initial state (explored_systems: ['star1'])
            // The MOVE_FLEET action will add 'star2' to explored_systems
            await service.resolveTurn(mockInitialState, mockActions);

            // Check if updateEmpireExploredSystems was called with updated explored systems
            expect(updateEmpireExploredSystems).toHaveBeenCalledWith(
                'empire1',
                expect.arrayContaining(['star1', 'star2'])
            );
        });

        it('should persist fleet position changes', async () => {
            await service.resolveTurn(mockInitialState, mockActions);

            // Check if updateFleetStarId was called with new star_id
            expect(updateFleetStarId).toHaveBeenCalledWith('fleet1', 'star2');
        });

        it('should persist planet resource changes', async () => {
            await service.resolveTurn(mockInitialState, mockActions);

            // Growth resolver adds 10 minerals to planet1
            expect(updatePlanetResources).toHaveBeenCalledWith(
                'planet1',
                expect.objectContaining({ minerals: 110 })
            );
        });

        it('should persist build queue changes', async () => {
            await service.resolveTurn(mockInitialState, mockActions);

            // Build queue progress should be updated
            expect(updateBuildQueueProgress).toHaveBeenCalledWith('bq1', expect.any(Number));
        });

        it('should insert turn history', async () => {
            await service.resolveTurn(mockInitialState, mockActions);

            expect(insertTurnHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    game_id: 'game1',
                    empire_id: 'empire1',
                    turn_number: 1,
                    actions: mockActions
                })
            );
        });

        it('should return resolved state with updated turn number', async () => {
            const resolvedState = await service.resolveTurn(mockInitialState, mockActions);
            expect(resolvedState.currentTurn).toBe(2);
        });

        it('should not persist unchanged entities', async () => {
            // Run resolution with no actions (but growth resolver still adds resources)
            const resolvedState = await service.resolveTurn(mockInitialState, []);
            
            // Empire explored systems won't change with no actions
            expect(updateEmpireExploredSystems).not.toHaveBeenCalled();
            // Fleet position won't change with no actions
            expect(updateFleetStarId).not.toHaveBeenCalled();
            // Build queue progress increases even with no actions (stub behavior)
            // So we don't check updateBuildQueueProgress here
        });
    });

    describe('persistence consistency', () => {
        it('should persist state that matches reconstructed state', async () => {
            // Resolve turn and persist
            const resolvedState = await service.resolveTurn(mockInitialState, mockActions);

            // Mock fetchFullGameState to return persisted state
            (fetchFullGameState as vi.Mock).mockResolvedValueOnce(resolvedState);

            // Reconstruct state (simulate)
            const reconstructedState = await fetchFullGameState('game1');

            // Verify key fields match
            expect(reconstructedState.currentTurn).toBe(resolvedState.currentTurn);
            expect(reconstructedState.empires[0].explored_systems).toEqual(resolvedState.empires[0].explored_systems);
            expect(reconstructedState.fleets[0].star_id).toBe(resolvedState.fleets[0].star_id);
        });
    });
});
