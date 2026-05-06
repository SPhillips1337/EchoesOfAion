import { TurnAction } from '../types/game-state';

/**
 * Validates a TurnAction payload against the turn resolution pipeline contract (FN-002)
 * @param action - The TurnAction to validate
 * @throws Error if the action is invalid
 */
export function validateOrder(action: TurnAction): void {
    if (!action.type || typeof action.type !== 'string' || action.type.trim() === '') {
        throw new Error('TurnAction type must be a non-empty string');
    }

    if (!action.payload || typeof action.payload !== 'object' || Array.isArray(action.payload)) {
        throw new Error('TurnAction payload must be a non-null object');
    }

    if (typeof action.turnNumber !== 'number' || action.turnNumber < 1) {
        throw new Error('TurnAction turnNumber must be a positive integer');
    }

    // Validate payload based on action type
    switch (action.type) {
        case 'MOVE_FLEET':
            if (!action.payload.fleetId || typeof action.payload.fleetId !== 'string') {
                throw new Error('MOVE_FLEET action requires a valid fleetId string');
            }
            if (!action.payload.destinationStarId || typeof action.payload.destinationStarId !== 'string') {
                throw new Error('MOVE_FLEET action requires a valid destinationStarId string');
            }
            break;
        case 'COLONIZE_PLANET':
            if (!action.payload.fleetId || typeof action.payload.fleetId !== 'string') {
                throw new Error('COLONIZE_PLANET action requires a valid fleetId string');
            }
            if (!action.payload.planetId || typeof action.payload.planetId !== 'string') {
                throw new Error('COLONIZE_PLANET action requires a valid planetId string');
            }
            break;
        case 'BUILD_STRUCTURE':
            if (!action.payload.planetId || typeof action.payload.planetId !== 'string') {
                throw new Error('BUILD_STRUCTURE action requires a valid planetId string');
            }
            if (!action.payload.structureType || typeof action.payload.structureType !== 'string') {
                throw new Error('BUILD_STRUCTURE action requires a valid structureType string');
            }
            break;
        case 'CONSTRUCT_SHIP':
            if (!action.payload.planetId || typeof action.payload.planetId !== 'string') {
                throw new Error('CONSTRUCT_SHIP action requires a valid planetId string');
            }
            if (!action.payload.shipType || typeof action.payload.shipType !== 'string') {
                throw new Error('CONSTRUCT_SHIP action requires a valid shipType string');
            }
            break;
        default:
            throw new Error(`Unknown TurnAction type: ${action.type}`);
    }
}
