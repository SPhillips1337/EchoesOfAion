import { describe, it, expect } from 'vitest';
import { resolveGrowth, TECH_TREE } from '../../src/turn-resolution/growth-resolver';
import { FullGameState, TurnAction } from '../../src/types/game-state';

describe('Growth Resolver', () => {
    const initialState: FullGameState = {
        stars: [
            { id: 's1', name: 'Star 1', x_coord: 0, y_coord: 0, system_size: 'medium', game_id: 'g1', created_at: new Date() },
            { id: 's2', name: 'Star 2', x_coord: 10, y_coord: 10, system_size: 'medium', game_id: 'g1', created_at: new Date() }
        ],
        planets: [
            { id: 'p1', game_id: 'g1', star_id: 's1', name: 'Planet 1', planet_type: 'terrestrial', size: 'medium', resources: { minerals: 100, food: 50 }, habitable: true, created_at: new Date() },
            { id: 'p2', game_id: 'g1', star_id: 's2', name: 'Planet 2', planet_type: 'gas_giant', size: 'large', resources: { minerals: 50, energy: 20 }, habitable: false, created_at: new Date() }
        ],
        starLanes: [],
        empires: [
            { id: 'e1', game_id: 'g1', name: 'Empire 1', player_type: 'human', color: 'red', explored_systems: ['s1'], created_at: new Date() }
        ],
        fleets: [],
        buildQueues: [],
        turnHistory: [],
        currentTurn: 1,
        gameId: 'g1'
    };

    describe('Research', () => {
        it('should start research for an empire', () => {
            const actions: TurnAction[] = [
                { type: 'START_RESEARCH', payload: { empireId: 'e1', techId: 'adv_mining' }, turnNumber: 1 }
            ];
            
            const nextState = resolveGrowth(initialState, actions);
            const empire = nextState.empires.find(e => e.id === 'e1');
            expect(empire).toBeDefined();
            const research = (empire as unknown as { research?: { techId: string; progress: number } }).research;
            expect(research?.techId).toBe('adv_mining');
            expect(research?.progress).toBeGreaterThan(0);
        });

        it('should advance research progress each turn', () => {
            const actions: TurnAction[] = [
                { type: 'START_RESEARCH', payload: { empireId: 'e1', techId: 'adv_mining' }, turnNumber: 1 }
            ];
            
            const nextState = resolveGrowth(initialState, actions);
            const empire = nextState.empires.find(e => e.id === 'e1');
            const research = (empire as unknown as { research?: { progress: number } }).research;
            
            // After one turn, progress should be > 0 and < 1
            expect(research?.progress).toBeGreaterThan(0);
            expect(research?.progress).toBeLessThan(1);
        });

        it('should throw error for unknown technology', () => {
            const actions: TurnAction[] = [
                { type: 'START_RESEARCH', payload: { empireId: 'e1', techId: 'unknown_tech' }, turnNumber: 1 }
            ];
            
            expect(() => resolveGrowth(initialState, actions)).toThrow('Unknown technology: unknown_tech');
        });

        it('should have tech tree defined', () => {
            expect(TECH_TREE['adv_mining']).toBeDefined();
            expect(TECH_TREE['adv_mining'].name).toBe('Advanced Mining');
            expect(TECH_TREE['adv_mining'].cost).toBe(100);
        });
    });

    describe('Trade Routes', () => {
        it('should establish trade route between planets', () => {
            const actions: TurnAction[] = [
                { type: 'ESTABLISH_TRADE_ROUTE', payload: { empireId: 'e1', sourcePlanetId: 'p1', destinationPlanetId: 'p2' }, turnNumber: 1 }
            ];
            
            const nextState = resolveGrowth(initialState, actions);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            const p2 = nextState.planets.find(p => p.id === 'p2');
            
            expect(p1?.resources.trade).toBe(20);
            expect(p2?.resources.trade).toBe(20);
        });

        it('should accumulate trade value over multiple routes', () => {
            const actions: TurnAction[] = [
                { type: 'ESTABLISH_TRADE_ROUTE', payload: { empireId: 'e1', sourcePlanetId: 'p1', destinationPlanetId: 'p2' }, turnNumber: 1 },
                { type: 'ESTABLISH_TRADE_ROUTE', payload: { empireId: 'e1', sourcePlanetId: 'p1', destinationPlanetId: 'p2' }, turnNumber: 1 }
            ];
            
            const nextState = resolveGrowth(initialState, actions);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            expect(p1?.resources.trade).toBe(40);
        });
    });

    describe('Resource Production', () => {
        it('should produce minerals for all planets', () => {
            const actions: TurnAction[] = [];
            
            const nextState = resolveGrowth(initialState, actions);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            expect(p1?.resources.minerals).toBe(110);
        });

        it('should give production bonus to colonized planets', () => {
            const colonizedState: FullGameState = {
                ...initialState,
                planets: [
                    { ...initialState.planets[0], colonized_by_empire_id: 'e1' }
                ]
            };
            
            const actions: TurnAction[] = [];
            const nextState = resolveGrowth(colonizedState, actions);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            // Colonized planets get 2x production (20 instead of 10)
            expect(p1?.resources.minerals).toBe(120);
        });

        it('should produce food for terrestrial planets', () => {
            const actions: TurnAction[] = [];
            
            const nextState = resolveGrowth(initialState, actions);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            expect(p1?.resources.food).toBe(55);
        });

        it('should produce energy for gas giants', () => {
            const actions: TurnAction[] = [];
            
            const nextState = resolveGrowth(initialState, actions);
            const p2 = nextState.planets.find(p => p.id === 'p2');
            
            expect(p2?.resources.energy).toBe(28);
        });
    });

    describe('Build Queues', () => {
        it('should add structure to build queue', () => {
            const actions: TurnAction[] = [
                { type: 'BUILD_STRUCTURE', payload: { planetId: 'p1', structureType: 'mine' }, turnNumber: 1 }
            ];
            
            const nextState = resolveGrowth(initialState, actions);
            
            expect(nextState.buildQueues.length).toBe(1);
            expect(nextState.buildQueues[0].item_type).toBe('mine');
            expect(nextState.buildQueues[0].entity_id).toBe('p1');
        });

        it('should advance build queue progress', () => {
            const actions: TurnAction[] = [
                { type: 'BUILD_STRUCTURE', payload: { planetId: 'p1', structureType: 'mine' }, turnNumber: 1 }
            ];
            
            const nextState = resolveGrowth(initialState, actions);
            
            expect(nextState.buildQueues[0].progress).toBe(0.1);
        });
    });

    describe('Structures', () => {
        it('should apply mine production bonus', () => {
            const stateWithMine: FullGameState = {
                ...initialState,
                structures: [
                    { id: 's1', planet_id: 'p1', structure_type: 'mine', build_progress: 1.0, created_at: new Date() }
                ]
            };
            
            const nextState = resolveGrowth(stateWithMine, []);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            expect(p1?.resources.minerals).toBe(125);
        });

        it('should apply farm food bonus', () => {
            const stateWithFarm: FullGameState = {
                ...initialState,
                structures: [
                    { id: 's2', planet_id: 'p1', structure_type: 'farm', build_progress: 1.0, created_at: new Date() }
                ]
            };
            
            const nextState = resolveGrowth(stateWithFarm, []);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            expect(p1?.resources.food).toBe(65);
        });

        it('should apply factory energy bonus', () => {
            const stateWithFactory: FullGameState = {
                ...initialState,
                structures: [
                    { id: 's3', planet_id: 'p2', structure_type: 'factory', build_progress: 1.0, created_at: new Date() }
                ]
            };
            
            const nextState = resolveGrowth(stateWithFactory, []);
            const p2 = nextState.planets.find(p => p.id === 'p2');
            
            expect(p2?.resources.energy).toBe(33);
        });

        it('should not apply bonus for incomplete structures', () => {
            const stateWithIncompleteMine: FullGameState = {
                ...initialState,
                structures: [
                    { id: 's1', planet_id: 'p1', structure_type: 'mine', build_progress: 0.5, created_at: new Date() }
                ]
            };
            
            const nextState = resolveGrowth(stateWithIncompleteMine, []);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            expect(p1?.resources.minerals).toBe(110);
        });

        it('should convert completed build queue to structure', () => {
            const stateWithCompleteQueue: FullGameState = {
                ...initialState,
                buildQueues: [
                    { id: 'bq-1', game_id: 'g1', entity_type: 'planet', entity_id: 'p1', item_type: 'mine', progress: 1.0, created_at: new Date() }
                ]
            };
            
            const nextState = resolveGrowth(stateWithCompleteQueue, []);
            
            expect(nextState.structures.length).toBeGreaterThan(0);
        });
    });

    describe('Trade Income', () => {
        it('should generate credits from trade routes', () => {
            const stateWithTrade: FullGameState = {
                ...initialState,
                planets: [
                    { ...initialState.planets[0], resources: { minerals: 100, trade: 50 } }
                ]
            };
            
            const nextState = resolveGrowth(stateWithTrade, []);
            const p1 = nextState.planets.find(p => p.id === 'p1');
            
            // Trade 50 * 10% = 5 credits
            expect(p1?.resources.credits).toBe(5);
        });
    });
});