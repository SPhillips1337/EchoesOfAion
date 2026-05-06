export interface Star {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates star with a game
    name: string;
    x_coord: number;
    y_coord: number;
    system_size: 'small' | 'medium' | 'large';
    created_at: Date;
}

export interface Planet {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates planet with a game
    star_id: string; // UUID
    name: string;
    planet_type: 'terrestrial' | 'gas_giant' | 'ice' | 'desert' | 'ocean';
    size: 'small' | 'medium' | 'large';
    resources: Record<string, number>; // JSONB
    habitable: boolean;
    created_at: Date;
}

export interface StarLane {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates star lane with a game
    source_star_id: string; // UUID
    destination_star_id: string; // UUID
    distance: number;
    created_at: Date;
}

export interface Empire {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates empire with a game
    name: string;
    player_type: 'human' | 'ai';
    color: string;
    /** JSONB array of explored star system IDs stored as strings */
    explored_systems: string[];
    created_at: Date;
}

export interface Fleet {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates fleet with a game
    empire_id: string; // UUID
    star_id: string; // UUID
    name: string;
    composition: Record<string, number>; // JSONB
    created_at: Date;
}

export interface Ship {
    id: string; // UUID
    fleet_id: string; // UUID
    ship_type: 'scout' | 'frigate' | 'destroyer' | 'cruiser' | 'battleship';
    health: number;
    status: 'active' | 'damaged' | 'destroyed' | 'repairing';
    created_at: Date;
}

export interface Structure {
    id: string; // UUID
    planet_id: string; // UUID
    structure_type: 'mine' | 'farm' | 'factory' | 'research_lab' | 'defense_platform';
    build_progress: number;
    created_at: Date;
}

export type BuildQueueEntityType = 'planet' | 'fleet';

export interface BuildQueue {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates build queue with a game
    entity_type: BuildQueueEntityType;
    entity_id: string; // UUID (polymorphic)
    item_type: string;
    progress: number;
    created_at: Date;
}

export interface TurnHistory {
    id: string; // UUID
    game_id: string; // UUID - REQUIRED: associates turn history with a game
    empire_id: string; // UUID
    turn_number: number;
    actions: unknown[]; // JSONB array
    resolved_at?: Date | null;
    created_at: Date;
}

export interface Game {
    id: string; // UUID
    name: string;
    status: 'active' | 'paused' | 'completed';
    created_at: Date;
}
