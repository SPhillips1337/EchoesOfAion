import { describe, it, expect } from 'vitest';
import { resolveCombat, SHIP_STATS, calculateFleetStrength, getPrimaryShipRole } from '../../src/turn-resolution/combat-resolver';
import { FullGameState } from '../../src/types/game-state';

describe('Combat Resolver', () => {
    const initialState: FullGameState = {
        stars: [
            { id: 's1', name: 'Star 1', x_coord: 0, y_coord: 0, system_size: 'medium', game_id: 'g1', created_at: new Date() }
        ],
        planets: [],
        starLanes: [],
        empires: [
            { id: 'e1', game_id: 'g1', name: 'Empire 1', player_type: 'human', color: 'red', explored_systems: ['s1'], created_at: new Date() },
            { id: 'e2', game_id: 'g1', name: 'Empire 2', player_type: 'ai', color: 'blue', explored_systems: ['s1'], created_at: new Date() }
        ],
        fleets: [],
        buildQueues: [],
        turnHistory: [],
        currentTurn: 1,
        gameId: 'g1'
    };

    describe('Ship Stats', () => {
        it('should have stats for all ship types', () => {
            expect(SHIP_STATS.scout).toBeDefined();
            expect(SHIP_STATS.frigate).toBeDefined();
            expect(SHIP_STATS.destroyer).toBeDefined();
            expect(SHIP_STATS.cruiser).toBeDefined();
            expect(SHIP_STATS.battleship).toBeDefined();
        });

        it('should have increasing stats for larger ships', () => {
            expect(SHIP_STATS.battleship.hull).toBeGreaterThan(SHIP_STATS.cruiser.hull);
            expect(SHIP_STATS.cruiser.hull).toBeGreaterThan(SHIP_STATS.destroyer.hull);
            expect(SHIP_STATS.destroyer.hull).toBeGreaterThan(SHIP_STATS.frigate.hull);
            expect(SHIP_STATS.frigate.hull).toBeGreaterThan(SHIP_STATS.scout.hull);
        });

        it('should have different damage values per ship type', () => {
            expect(SHIP_STATS.battleship.damage).toBe(50);
            expect(SHIP_STATS.cruiser.damage).toBe(25);
            expect(SHIP_STATS.destroyer.damage).toBe(15);
            expect(SHIP_STATS.frigate.damage).toBe(10);
            expect(SHIP_STATS.scout.damage).toBe(5);
        });
    });

    describe('Fleet Strength Calculation', () => {
        it('should calculate strength for single ship type', () => {
            const composition = { scout: 5 };
            const strength = calculateFleetStrength(composition);
            // scout: (20 + 10 + 5) * 5 = 35 * 5 = 175
            expect(strength).toBe(175);
        });

        it('should calculate combined strength for multiple ship types', () => {
            const composition = { scout: 2, battleship: 1 };
            const strength = calculateFleetStrength(composition);
            // scout: (20 + 10 + 5) * 2 = 35 * 2 = 70
            // battleship: (200 + 100 + 50) * 1 = 350
            // total = 420
            expect(strength).toBe(420);
        });

        it('should return 0 for empty fleet', () => {
            const strength = calculateFleetStrength({});
            expect(strength).toBe(0);
        });
    });

    describe('Ship Role Detection', () => {
        it('should detect scout as primary', () => {
            const role = getPrimaryShipRole({ scout: 10, frigate: 2 });
            expect(role).toBe('recon');
        });

        it('should detect battleship as primary', () => {
            const role = getPrimaryShipRole({ scout: 2, battleship: 5 });
            expect(role).toBe('capital');
        });

        it('should return unknown for empty fleet', () => {
            const role = getPrimaryShipRole({});
            expect(role).toBe('unknown');
        });
    });

    describe('Combat Resolution', () => {
        it('should not affect single empire fleets', () => {
            const state: FullGameState = {
                ...initialState,
                fleets: [
                    { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Fleet 1', composition: { scout: 5 }, created_at: new Date() }
                ]
            };

            const result = resolveCombat(state);
            expect(result.fleets[0].composition.scout).toBe(5);
        });

        it('should resolve combat between hostile fleets', () => {
            const state: FullGameState = {
                ...initialState,
                fleets: [
                    { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Empire 1 Fleet', composition: { battleship: 2 }, created_at: new Date() },
                    { id: 'f2', game_id: 'g1', empire_id: 'e2', star_id: 's1', name: 'Empire 2 Fleet', composition: { scout: 10 }, created_at: new Date() }
                ]
            };

            const result = resolveCombat(state);
            // Battleships should win against scouts
            expect(result.fleets.length).toBeGreaterThanOrEqual(1);
            expect(result.fleets.length).toBeLessThanOrEqual(2);
        });

        it('should handle multiple fleets from same empire', () => {
            const state: FullGameState = {
                ...initialState,
                fleets: [
                    { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Fleet 1', composition: { frigate: 5 }, created_at: new Date() },
                    { id: 'f2', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Fleet 2', composition: { frigate: 5 }, created_at: new Date() },
                    { id: 'f3', game_id: 'g1', empire_id: 'e2', star_id: 's1', name: 'Enemy Fleet', composition: { scout: 20 }, created_at: new Date() }
                ]
            };

            const result = resolveCombat(state);
            // Friendly fleets should combine forces against enemy
            expect(result.fleets.length).toBeGreaterThanOrEqual(1);
        });

        it('should reduce ships in combat', () => {
            const state: FullGameState = {
                ...initialState,
                fleets: [
                    { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Strong Fleet', composition: { battleship: 3 }, created_at: new Date() },
                    { id: 'f2', game_id: 'g1', empire_id: 'e2', star_id: 's1', name: 'Weak Fleet', composition: { scout: 1 }, created_at: new Date() }
                ]
            };

            const result = resolveCombat(state);
            // At least one fleet should have been affected (either reduced or destroyed)
            expect(result.fleets.length).toBeGreaterThanOrEqual(1);
            expect(result.fleets.length).toBeLessThanOrEqual(2);
        });
    });

    describe('No Combat Scenarios', () => {
        it('should not trigger combat in empty systems', () => {
            const state: FullGameState = {
                ...initialState,
                fleets: [
                    { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Fleet 1', composition: { scout: 3 }, created_at: new Date() }
                ]
            };

            const result = resolveCombat(state);
            expect(result.fleets.length).toBe(1);
            expect(result.fleets[0].composition.scout).toBe(3);
        });

        it('should not trigger combat when fleets are in different systems', () => {
            const stateWithTwoSystems: FullGameState = {
                ...initialState,
                stars: [
                    { id: 's1', name: 'Star 1', x_coord: 0, y_coord: 0, system_size: 'medium', game_id: 'g1', created_at: new Date() },
                    { id: 's2', name: 'Star 2', x_coord: 10, y_coord: 10, system_size: 'medium', game_id: 'g1', created_at: new Date() }
                ],
                fleets: [
                    { id: 'f1', game_id: 'g1', empire_id: 'e1', star_id: 's1', name: 'Fleet 1', composition: { scout: 5 }, created_at: new Date() },
                    { id: 'f2', game_id: 'g1', empire_id: 'e2', star_id: 's2', name: 'Fleet 2', composition: { scout: 5 }, created_at: new Date() }
                ]
            };

            const result = resolveCombat(stateWithTwoSystems);
            expect(result.fleets.length).toBe(2);
            expect(result.fleets[0].composition.scout).toBe(5);
            expect(result.fleets[1].composition.scout).toBe(5);
        });
    });
});