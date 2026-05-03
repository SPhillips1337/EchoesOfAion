import { Star, Planet, StarLane, Empire, Fleet, BuildQueue, TurnHistory } from './game-entities';

/** Full game state for a specific game, aggregating all entity types */
export interface FullGameState {
    stars: Star[];
    planets: Planet[];
    starLanes: StarLane[];
    empires: Empire[];
    fleets: Fleet[];
    buildQueues: BuildQueue[];
    /** Aggregated per-empire TurnHistory entries for the game, ordered by turn number */
    turnHistory: TurnHistory[];
    currentTurn: number;
    gameId: string;
}

/** Game state visible to a specific empire, with fog-of-war filtering applied */
export interface VisibleGameState extends Omit<FullGameState, 'stars' | 'planets' | 'starLanes' | 'fleets'> {
    /** Only stars in systems explored by the empire */
    stars: Star[];
    /** Only planets in systems explored by the empire */
    planets: Planet[];
    /** Only star lanes connecting explored systems */
    starLanes: StarLane[];
    /** Friendly fleets or enemy fleets in explored systems */
    fleets: Fleet[];
}

export interface TurnReconstructionOptions {
    gameId: string;
    turnNumber: number;
    includeHistory?: boolean;
}

/** Action shape for turn history, aligned with FN-002 contract for deterministic replay */
export interface TurnAction {
    type: string;
    /** Payload shape validated by turn resolution pipeline (FN-002) */
    payload: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    turnNumber: number;
}
