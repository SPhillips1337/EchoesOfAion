import { describe, it, expect } from 'vitest';
import { TABLES, COLUMNS } from '../src/db/schema';
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
} from '../src/types/game-entities';

describe('Static Schema-Entity Validation (No DB Required)', () => {
    // Predefined entity property mappings based on interface definitions
    const entityPropertyMap: Record<string, string[]> = {
        [TABLES.STARS]: ['id', 'name', 'x_coord', 'y_coord', 'system_size', 'created_at'],
        [TABLES.PLANETS]: ['id', 'star_id', 'name', 'planet_type', 'size', 'resources', 'habitable', 'created_at'],
        [TABLES.STAR_LANES]: ['id', 'source_star_id', 'destination_star_id', 'distance', 'created_at'],
        [TABLES.EMPIRES]: ['id', 'name', 'player_type', 'color', 'created_at'],
        [TABLES.FLEETS]: ['id', 'empire_id', 'star_id', 'name', 'composition', 'created_at'],
        [TABLES.SHIPS]: ['id', 'fleet_id', 'ship_type', 'health', 'status', 'created_at'],
        [TABLES.STRUCTURES]: ['id', 'planet_id', 'structure_type', 'build_progress', 'created_at'],
        [TABLES.BUILD_QUEUES]: ['id', 'entity_type', 'entity_id', 'item_type', 'progress', 'created_at'],
        [TABLES.TURN_HISTORY]: ['id', 'empire_id', 'turn_number', 'actions', 'resolved_at', 'created_at']
    };

    it('should have schema columns matching entity properties for each table', () => {
        for (const [tableKey, expectedColumns] of Object.entries(COLUMNS)) {
            // tableKey matches the table name (e.g., 'stars' from COLUMNS.stars)
            // entityPropertyMap is keyed by table names (e.g., 'stars')
            const entityProperties = entityPropertyMap[tableKey];
            expect(entityProperties).toBeDefined();
            
            // Check that all schema columns are present in entity properties
            for (const column of expectedColumns) {
                expect(entityProperties).toContain(column);
            }
            
            // Check that all entity properties are present in schema columns
            for (const prop of entityProperties) {
                expect(expectedColumns).toContain(prop);
            }
        }
    });

    it('should have correct entity property types for schema columns', () => {
        // Star entity validation
        const star: Star = {
            id: 'uuid',
            name: 'Sol',
            x_coord: 100.5,
            y_coord: 200.75,
            system_size: 'medium',
            created_at: new Date()
        };
        expect(typeof star.x_coord).toBe('number');
        expect(typeof star.y_coord).toBe('number');
        expect(['small', 'medium', 'large']).toContain(star.system_size);
        
        // Planet entity validation
        const planet: Planet = {
            id: 'uuid',
            star_id: 'uuid',
            name: 'Earth',
            planet_type: 'terrestrial',
            size: 'medium',
            resources: { minerals: 100 },
            habitable: true,
            created_at: new Date()
        };
        expect(typeof planet.resources).toBe('object');
        expect(typeof planet.habitable).toBe('boolean');
        
        // Fleet entity validation
        const fleet: Fleet = {
            id: 'uuid',
            empire_id: 'uuid',
            star_id: 'uuid',
            name: 'Fleet 1',
            composition: { scout: 5 },
            created_at: new Date()
        };
        expect(typeof fleet.composition).toBe('object');
        
        // Ship entity validation
        const ship: Ship = {
            id: 'uuid',
            fleet_id: 'uuid',
            ship_type: 'scout',
            health: 100,
            status: 'active',
            created_at: new Date()
        };
        expect(typeof ship.health).toBe('number');
        expect(['scout', 'frigate', 'destroyer', 'cruiser', 'battleship']).toContain(ship.ship_type);
    });
});
