import { describe, it, expect, vi } from 'vitest';
import { validateTurnAction } from '../../src/validators/turn-action.validator';
import { TurnAction } from '../../src/types/game-state';

describe('validateTurnAction', () => {
    it('should throw error for missing type', () => {
        const action = { payload: {}, turnNumber: 1 } as TurnAction;
        expect(() => validateTurnAction(action)).toThrow('TurnAction type must be a non-empty string');
    });

    it('should throw error for empty type', () => {
        const action = { type: '', payload: {}, turnNumber: 1 } as TurnAction;
        expect(() => validateTurnAction(action)).toThrow('TurnAction type must be a non-empty string');
    });

    it('should throw error for invalid payload', () => {
        const action = { type: 'MOVE_FLEET', payload: 'invalid', turnNumber: 1 } as unknown as TurnAction;
        expect(() => validateTurnAction(action)).toThrow('TurnAction payload must be a non-null object');
    });

    it('should throw error for invalid turnNumber', () => {
        const action = { type: 'MOVE_FLEET', payload: {}, turnNumber: 0 } as TurnAction;
        expect(() => validateTurnAction(action)).toThrow('TurnAction turnNumber must be a positive integer');
    });

    it('should validate MOVE_FLEET action', () => {
        const action: TurnAction = {
            type: 'MOVE_FLEET',
            payload: { fleetId: 'fleet1', destinationStarId: 'star2' },
            turnNumber: 1,
        };
        expect(() => validateTurnAction(action)).not.toThrow();
    });

    it('should throw error for MOVE_FLEET with missing fleetId', () => {
        const action: TurnAction = {
            type: 'MOVE_FLEET',
            payload: { destinationStarId: 'star2' },
            turnNumber: 1,
        };
        expect(() => validateTurnAction(action)).toThrow('MOVE_FLEET action requires a valid fleetId string');
    });

    it('should warn for unknown action type', () => {
        const action: TurnAction = {
            type: 'UNKNOWN_ACTION',
            payload: {},
            turnNumber: 1,
        };
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => validateTurnAction(action)).not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith('Unknown TurnAction type: UNKNOWN_ACTION');
        warnSpy.mockRestore();
    });
});
