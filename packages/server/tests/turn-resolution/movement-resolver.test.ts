import { describe, it, expect } from 'vitest';
import { resolveMovement } from '../../src/turn-resolution/movement-resolver';
import { FullGameState, TurnAction } from '../../src/types/game-state';

describe('Movement Resolver', () => {
    const initialState: FullGameState = {
        stars: [
            { id: 's1', name: 'Star 1', x_coord: 0, y_coord: 0, system_size: 'medium', created_at: new Date() },
            { id: 's2', name: 'Star 2', x_coord: 10, y_coord: 10, system_size: 'medium', created_at: new Date() }
        ],
        planets: [],
        starLanes: [
            { id: 'l1', game_id: 'g1', source_star_id: 's1', destination_star_id: 's2', distance: 14, created_at: new Date() }
        ],
        empires: [
            { id: 'e1', game_id: 'g1', name: 'Empire 1', player_type: 'human', color: 'red', explored_systems: ['s1'], created_at: new Date() }
        ],
        fleets: [
            { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Fleet 1', composition: { scout: 1 }, created_at: new Date() }
        ],
        buildQueues: [],
        turnHistory: [],
        currentTurn: 1,
        gameId: 'g1'
    };

    it('should move fleet along star lane', () => {
        const actions: TurnAction[] = [
            { type: 'MOVE_FLEET', payload: { fleetId: 'f1', destinationStarId: 's2' }, turnNumber: 1 }
        ];
        
        const nextState = resolveMovement(initialState, actions);
        expect(nextState.fleets[0].star_id).toBe('s2');
        expect(nextState.empires[0].explored_systems).toContain('s2');
    });

    it('should not move fleet if no star lane exists', () => {
        const actions: TurnAction[] = [
            { type: 'MOVE_FLEET', payload: { fleetId: 'f1', destinationStarId: 's3' }, turnNumber: 1 }
        ];
        
        const nextState = resolveMovement(initialState, actions);
        expect(nextState.fleets[0].star_id).toBe('s1'); // Did not move
    });
});
