import {
    Star,
    Planet,
    StarLane,
    Empire,
    Fleet,
    Ship,
    Structure,
    BuildQueue,
    TurnHistory
} from '../types/game-entities';

// Table name constants
export const TABLES = {
    STARS: 'stars',
    PLANETS: 'planets',
    STAR_LANES: 'star_lanes',
    EMPIRES: 'empires',
    FLEETS: 'fleets',
    SHIPS: 'ships',
    STRUCTURES: 'structures',
    BUILD_QUEUES: 'build_queues',
    TURN_HISTORY: 'turn_history'
} as const;

// Type to table mapping
export type EntityTypeMap = {
    [TABLES.STARS]: Star;
    [TABLES.PLANETS]: Planet;
    [TABLES.STAR_LANES]: StarLane;
    [TABLES.EMPIRES]: Empire;
    [TABLES.FLEETS]: Fleet;
    [TABLES.SHIPS]: Ship;
    [TABLES.STRUCTURES]: Structure;
    [TABLES.BUILD_QUEUES]: BuildQueue;
    [TABLES.TURN_HISTORY]: TurnHistory;
};

// Column definitions for reference (matches migration)
export const COLUMNS = {
    stars: ['id', 'name', 'x_coord', 'y_coord', 'system_size', 'created_at'],
    planets: ['id', 'star_id', 'name', 'planet_type', 'size', 'resources', 'habitable', 'created_at'],
    star_lanes: ['id', 'source_star_id', 'destination_star_id', 'distance', 'created_at'],
    empires: ['id', 'name', 'player_type', 'color', 'created_at'],
    fleets: ['id', 'empire_id', 'star_id', 'name', 'composition', 'created_at'],
    ships: ['id', 'fleet_id', 'ship_type', 'health', 'status', 'created_at'],
    structures: ['id', 'planet_id', 'structure_type', 'build_progress', 'created_at'],
    build_queues: ['id', 'entity_type', 'entity_id', 'item_type', 'progress', 'created_at'],
    turn_history: ['id', 'empire_id', 'turn_number', 'actions', 'resolved_at', 'created_at']
} as const;
