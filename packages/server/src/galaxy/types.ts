/**
 * Galaxy-Specific CamelCase Types
 *
 * This module defines camelCase TypeScript interfaces that map 1:1 to FN-001's
 * snake_case database entities. These types are used by the galaxy generation
 * modules for internal consistency and ease of use, while maintaining a clear
 * mapping to the database schema.
 *
 * @module galaxy/types
 */

import { Star, Planet, StarLane } from '../types/game-entities';

/**
 * GalaxyStar represents a star system in the galaxy.
 * Maps to the `Star` interface from game-entities.ts with camelCase field names.
 *
 * Database mapping:
 * - id → id (UUID)
 * - name → name
 * - xCoord ← x_coord
 * - yCoord ← y_coord
 * - systemSize ← system_size
 * - createdAt ← created_at
 */
export interface GalaxyStar {
  id: string;
  name: string;
  xCoord: number;
  yCoord: number;
  systemSize: 'small' | 'medium' | 'large';
  createdAt: Date;
}

/**
 * GalaxyPlanet represents a planet orbiting a star.
 * Maps to the `Planet` interface from game-entities.ts with camelCase field names.
 *
 * Database mapping:
 * - id → id (UUID)
 * - starId ← star_id (UUID)
 * - name → name
 * - planetType ← planet_type
 * - size → size
 * - resources → resources (Record<string, number>)
 * - habitable → habitable
 * - createdAt ← created_at
 */
export interface GalaxyPlanet {
  id: string;
  starId: string;
  name: string;
  planetType: 'terrestrial' | 'gas_giant' | 'ice' | 'desert' | 'ocean';
  size: 'small' | 'medium' | 'large';
  resources: Record<string, number>;
  habitable: boolean;
  createdAt: Date;
}

/**
 * GalaxyStarLane represents a connection between two star systems.
 * Maps to the `StarLane` interface from game-entities.ts with camelCase field names.
 *
 * Database mapping:
 * - id → id (UUID)
 * - sourceStarId ← source_star_id (UUID)
 * - destinationStarId ← destination_star_id (UUID)
 * - distance → distance
 * - createdAt ← created_at
 */
export interface GalaxyStarLane {
  id: string;
  sourceStarId: string;
  destinationStarId: string;
  distance: number;
  createdAt: Date;
}

/**
 * Type guard to check if an object is a valid GalaxyStar.
 *
 * @param obj - The object to check
 * @returns True if the object matches the GalaxyStar interface
 */
export function isGalaxyStar(obj: unknown): obj is GalaxyStar {
  if (typeof obj !== 'object' || obj === null) return false;

  const star = obj as Record<string, unknown>;

  return (
    typeof star.id === 'string' &&
    typeof star.name === 'string' &&
    typeof star.xCoord === 'number' &&
    typeof star.yCoord === 'number' &&
    (star.systemSize === 'small' || star.systemSize === 'medium' || star.systemSize === 'large') &&
    (star.createdAt instanceof Date || typeof star.createdAt === 'string' || typeof star.createdAt === 'number')
  );
}

/**
 * Type guard to check if an object is a valid GalaxyPlanet.
 *
 * @param obj - The object to check
 * @returns True if the object matches the GalaxyPlanet interface
 */
export function isGalaxyPlanet(obj: unknown): obj is GalaxyPlanet {
  if (typeof obj !== 'object' || obj === null) return false;

  const planet = obj as Record<string, unknown>;

  return (
    typeof planet.id === 'string' &&
    typeof planet.starId === 'string' &&
    typeof planet.name === 'string' &&
    (planet.planetType === 'terrestrial' ||
     planet.planetType === 'gas_giant' ||
     planet.planetType === 'ice' ||
     planet.planetType === 'desert' ||
     planet.planetType === 'ocean') &&
    (planet.size === 'small' || planet.size === 'medium' || planet.size === 'large') &&
    typeof planet.resources === 'object' &&
    planet.resources !== null &&
    typeof planet.habitable === 'boolean' &&
    (planet.createdAt instanceof Date || typeof planet.createdAt === 'string' || typeof planet.createdAt === 'number')
  );
}

/**
 * Type guard to check if an object is a valid GalaxyStarLane.
 *
 * @param obj - The object to check
 * @returns True if the object matches the GalaxyStarLane interface
 */
export function isGalaxyStarLane(obj: unknown): obj is GalaxyStarLane {
  if (typeof obj !== 'object' || obj === null) return false;

  const lane = obj as Record<string, unknown>;

  return (
    typeof lane.id === 'string' &&
    typeof lane.sourceStarId === 'string' &&
    typeof lane.destinationStarId === 'string' &&
    typeof lane.distance === 'number' &&
    (lane.createdAt instanceof Date || typeof lane.createdAt === 'string' || typeof lane.createdAt === 'number')
  );
}

/**
 * Converts a GalaxyStar to a Star entity (snake_case) for database storage.
 *
 * @param galaxyStar - The GalaxyStar object
 * @returns A Star object with snake_case field names
 */
export function toStarEntity(galaxyStar: GalaxyStar): Star {
  return {
    id: galaxyStar.id,
    name: galaxyStar.name,
    x_coord: galaxyStar.xCoord,
    y_coord: galaxyStar.yCoord,
    system_size: galaxyStar.systemSize,
    created_at: galaxyStar.createdAt,
  };
}

/**
 * Converts a GalaxyPlanet to a Planet entity (snake_case) for database storage.
 *
 * @param galaxyPlanet - The GalaxyPlanet object
 * @returns A Planet object with snake_case field names
 */
export function toPlanetEntity(galaxyPlanet: GalaxyPlanet): Planet {
  return {
    id: galaxyPlanet.id,
    star_id: galaxyPlanet.starId,
    name: galaxyPlanet.name,
    planet_type: galaxyPlanet.planetType,
    size: galaxyPlanet.size,
    resources: galaxyPlanet.resources,
    habitable: galaxyPlanet.habitable,
    created_at: galaxyPlanet.createdAt,
  };
}

/**
 * Converts a GalaxyStarLane to a StarLane entity (snake_case) for database storage.
 *
 * @param galaxyStarLane - The GalaxyStarLane object
 * @returns A StarLane object with snake_case field names
 */
export function toStarLaneEntity(galaxyStarLane: GalaxyStarLane): StarLane {
  return {
    id: galaxyStarLane.id,
    source_star_id: galaxyStarLane.sourceStarId,
    destination_star_id: galaxyStarLane.destinationStarId,
    distance: galaxyStarLane.distance,
    created_at: galaxyStarLane.createdAt,
  };
}

/**
 * Converts a Star entity (snake_case) to a GalaxyStar (camelCase).
 *
 * @param star - The Star object
 * @returns A GalaxyStar object with camelCase field names
 */
export function fromStarEntity(star: Star): GalaxyStar {
  return {
    id: star.id,
    name: star.name,
    xCoord: star.x_coord,
    yCoord: star.y_coord,
    systemSize: star.system_size,
    createdAt: star.created_at,
  };
}

/**
 * Converts a Planet entity (snake_case) to a GalaxyPlanet (camelCase).
 *
 * @param planet - The Planet object
 * @returns A GalaxyPlanet object with camelCase field names
 */
export function fromPlanetEntity(planet: Planet): GalaxyPlanet {
  return {
    id: planet.id,
    starId: planet.star_id,
    name: planet.name,
    planetType: planet.planet_type,
    size: planet.size,
    resources: planet.resources,
    habitable: planet.habitable,
    createdAt: planet.created_at,
  };
}

/**
 * Converts a StarLane entity (snake_case) to a GalaxyStarLane (camelCase).
 *
 * @param starLane - The StarLane object
 * @returns A GalaxyStarLane object with camelCase field names
 */
export function fromStarLaneEntity(starLane: StarLane): GalaxyStarLane {
  return {
    id: starLane.id,
    sourceStarId: starLane.source_star_id,
    destinationStarId: starLane.destination_star_id,
    distance: starLane.distance,
    createdAt: starLane.created_at,
  };
}
