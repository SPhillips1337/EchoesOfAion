import { describe, it, expect, beforeEach } from 'vitest';
import { TurnResolutionService } from '../../src/services/turn-resolution.service';
import { TurnAction } from '../../src/types/game-state';

describe('TurnResolutionService', () => {
    let service: TurnResolutionService;

    beforeEach(() => {
        service = new TurnResolutionService();
    });

    it('should throw error for non-array actions', () => {
        expect(() => service.resolveTurnActions(null as unknown as TurnAction[], 1)).toThrow('Actions must be an array');
    });

    it('should throw error for action with mismatched turn number', () => {
        const actions: TurnAction[] = [
            { type: 'MOVE_FLEET', payload: { fleetId: 'f1', destinationStarId: 's2' }, turnNumber: 2 },
        ];
        expect(() => service.resolveTurnActions(actions, 1)).toThrow('turnNumber 2 does not match current turn 1');
    });

    it('should resolve valid actions', () => {
        const actions: TurnAction[] = [
            { type: 'MOVE_FLEET', payload: { fleetId: 'f1', destinationStarId: 's2' }, turnNumber: 1 },
            { type: 'BUILD_STRUCTURE', payload: { planetId: 'p1', structureType: 'MINE' }, turnNumber: 1 },
        ];
        expect(() => service.resolveTurnActions(actions, 1)).not.toThrow();
    });

    it('should throw error for invalid action in array', () => {
        const actions: TurnAction[] = [
            { type: 'MOVE_FLEET', payload: { fleetId: 'f1' }, turnNumber: 1 }, // Missing destinationStarId
        ];
        expect(() => service.resolveTurnActions(actions, 1)).toThrow('MOVE_FLEET action requires a valid destinationStarId string');
    });
});
