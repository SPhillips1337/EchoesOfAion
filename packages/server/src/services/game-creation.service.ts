import { FullGameState } from '../types/game-state';
import { Star, Planet, StarLane, Empire, Fleet } from '../types/game-entities';

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export interface GameCreationOptions {
    name: string;
    starCount: number;
    empireCount: number;
    playerEmpireName: string;
    playerColor: string;
}

export class GameCreationService {
    createGame(options: GameCreationOptions): FullGameState {
        const gameId = generateId();
        
        const stars = this.generateStars(gameId, options.starCount);
        const starLanes = this.generateStarLanes(gameId, stars);
        const planets = this.generatePlanets(gameId, stars);
        
        const empires = this.createEmpires(gameId, options);
        
        const playerEmpire = empires[0];
        const exploredSystems = [stars[0].id];
        
        const fleets = this.createStartingFleet(gameId, playerEmpire.id, stars[0].id);
        
        planets[0].colonized_by_empire_id = playerEmpire.id;

        return {
            stars,
            planets,
            starLanes,
            empires: empires.map((e, i) => ({
                ...e,
                explored_systems: i === 0 ? exploredSystems : []
            })),
            fleets,
            buildQueues: [],
            structures: [],
            turnHistory: [],
            currentTurn: 1,
            gameId
        };
    }

    private generateStars(gameId: string, count: number): Star[] {
        const stars: Star[] = [];
        const positions = this.generateGalaxyPositions(count);
        
        for (let i = 0; i < count; i++) {
            stars.push({
                id: generateId(),
                game_id: gameId,
                name: `Star ${i + 1}`,
                x_coord: positions[i].x,
                y_coord: positions[i].y,
                system_size: this.randomSystemSize(),
                created_at: new Date()
            });
        }
        
        return stars;
    }

    private generateGalaxyPositions(count: number): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
            const radius = 50 + Math.random() * 100;
            positions.push({
                x: Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
                y: Math.sin(angle) * radius + (Math.random() - 0.5) * 30
            });
        }
        
        return positions;
    }

    private randomSystemSize(): 'small' | 'medium' | 'large' {
        const r = Math.random();
        if (r < 0.2) return 'small';
        if (r < 0.7) return 'medium';
        return 'large';
    }

    private generateStarLanes(gameId: string, stars: Star[]): StarLane[] {
        const starLanes: StarLane[] = [];
        
        for (let i = 0; i < stars.length; i++) {
            const nearest = this.findNearestStars(stars, i, 3);
            for (const j of nearest) {
                const existingLane = starLanes.find(sl => 
                    (sl.source_star_id === stars[i].id && sl.destination_star_id === stars[j].id) ||
                    (sl.source_star_id === stars[j].id && sl.destination_star_id === stars[i].id)
                );
                
                if (!existingLane) {
                    const distance = this.calculateDistance(stars[i], stars[j]);
                    starLanes.push({
                        id: generateId(),
                        game_id: gameId,
                        source_star_id: stars[i].id,
                        destination_star_id: stars[j].id,
                        distance,
                        created_at: new Date()
                    });
                }
            }
        }
        
        return starLanes;
    }

    private findNearestStars(stars: Star[], index: number, count: number): number[] {
        const distances: { index: number; distance: number }[] = [];
        
        for (let i = 0; i < stars.length; i++) {
            if (i !== index) {
                distances.push({
                    index: i,
                    distance: this.calculateDistance(stars[index], stars[i])
                });
            }
        }
        
        distances.sort((a, b) => a.distance - b.distance);
        return distances.slice(0, count).map(d => d.index);
    }

    private calculateDistance(s1: Star, s2: Star): number {
        const dx = s1.x_coord - s2.x_coord;
        const dy = s1.y_coord - s2.y_coord;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private generatePlanets(gameId: string, stars: Star[]): Planet[] {
        const planets: Planet[] = [];
        
        for (const star of stars) {
            const planetCount = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < planetCount; i++) {
                planets.push({
                    id: generateId(),
                    game_id: gameId,
                    star_id: star.id,
                    name: `${star.name} ${this.getRomanNumeral(i + 1)}`,
                    planet_type: this.randomPlanetType(),
                    size: this.randomSize(),
                    resources: {
                        minerals: Math.floor(Math.random() * 100) + 50,
                        credits: Math.floor(Math.random() * 100) + 10
                    },
                    habitable: Math.random() > 0.3,
                    created_at: new Date()
                });
            }
        }
        
        return planets;
    }

    private randomPlanetType(): 'terrestrial' | 'gas_giant' | 'ice' | 'desert' | 'ocean' {
        const types: ('terrestrial' | 'gas_giant' | 'ice' | 'desert' | 'ocean')[] = 
            ['terrestrial', 'gas_giant', 'ice', 'desert', 'ocean'];
        return types[Math.floor(Math.random() * types.length)];
    }

    private randomSize(): 'small' | 'medium' | 'large' {
        const r = Math.random();
        if (r < 0.3) return 'small';
        if (r < 0.7) return 'medium';
        return 'large';
    }

    private getRomanNumeral(n: number): string {
        const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        return numerals[n - 1] || n.toString();
    }

    private createEmpires(gameId: string, options: GameCreationOptions): Empire[] {
        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];
        const aiNames = ['Terran Federation', 'Crimson Dominion', 'Solar Union', 'Galactic Empire', 'Free Worlds', 'Compact', 'Commonwealth', 'Dominion'];
        
        const empires: Empire[] = [];
        
        empires.push({
            id: generateId(),
            game_id: gameId,
            name: options.playerEmpireName || 'Player Empire',
            player_type: 'human',
            color: options.playerColor || 'red',
            explored_systems: [],
            created_at: new Date()
        });
        
        for (let i = 1; i < options.empireCount; i++) {
            empires.push({
                id: generateId(),
                game_id: gameId,
                name: aiNames[i - 1] || `Empire ${i}`,
                player_type: 'ai',
                color: colors[i % colors.length],
                explored_systems: [],
                created_at: new Date()
            });
        }
        
        return empires;
    }

    private createStartingFleet(gameId: string, empireId: string, starId: string): Fleet[] {
        return [{
            id: generateId(),
            game_id: gameId,
            empire_id: empireId,
            star_id: starId,
            name: 'Alpha Fleet',
            composition: { scout: 3 },
            created_at: new Date()
        }];
    }
}