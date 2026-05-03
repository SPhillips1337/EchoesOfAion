/**
 * Planet Generator
 *
 * This module generates planets for star systems in the galaxy with randomized
 * properties including planet type, size, habitability, and resources.
 * The generation is deterministic based on a seed value.
 *
 * @module galaxy/planet-generator
 */

import { createSeededPrng, randomInt, weightedChoice } from './prng';
import { GalaxyStar, GalaxyPlanet } from './types';

/**
 * Planet type weights for random selection.
 * terrestrial: 30%, gas_giant: 20%, ice: 15%, desert: 20%, ocean: 15%
 */
const PLANET_TYPE_WEIGHTS: [string, number][] = [
  ['terrestrial', 30],
  ['gas_giant', 20],
  ['ice', 15],
  ['desert', 20],
  ['ocean', 15],
];

/**
 * Available resource types for planets.
 */
const RESOURCE_TYPES = [
  'minerals',
  'energy',
  'research',
  'food',
  'rare_metals',
  'crystals',
  'dilithium',
  'deuterium',
];

/**
 * Planet size weights for random selection.
 * small: 30%, medium: 50%, large: 20%
 */
const PLANET_SIZE_WEIGHTS: [string, number][] = [
  ['small', 3],
  ['medium', 5],
  ['large', 2],
];

/**
 * Generates planets for a given star system.
 *
 * @param star - The GalaxyStar object representing the star system
 * @param seed - The seed string for deterministic generation
 * @returns An array of GalaxyPlanet objects (1-4 planets per system)
 *
 * @example
 * ```typescript
 * const star = generateStarSystems('seed', 1)[0];
 * const planets = generatePlanetsForSystem(star, 'seed');
 * console.log(planets.length); // 1-4
 * ```
 */
export function generatePlanetsForSystem(star: GalaxyStar, seed: string): GalaxyPlanet[] {
  // Create a per-star seed by combining the galaxy seed with the star's ID
  const perStarSeed = `${seed}-${star.id}`;
  const rng = createSeededPrng(perStarSeed);

  // Determine number of planets (1-4)
  const planetCount = randomInt(rng, 1, 4);

  const planets: GalaxyPlanet[] = [];

  for (let i = 0; i < planetCount; i++) {
    const planetType = weightedChoice(rng, PLANET_TYPE_WEIGHTS) as GalaxyPlanet['planetType'];

    // Determine habitability based on planet type
    let habitable: boolean;
    if (planetType === 'terrestrial') {
      // 40% chance of being habitable for terrestrial planets
      habitable = rng() < 0.4;
    } else {
      // 10% chance for other types
      habitable = rng() < 0.1;
    }

    // Generate resources (2-4 random resource types with values 1-10)
    const resourceCount = randomInt(rng, 2, 4);
    const selectedResources = [...RESOURCE_TYPES].sort(() => rng() - 0.5).slice(0, resourceCount);
    const resources: Record<string, number> = {};
    for (const resource of selectedResources) {
      resources[resource] = randomInt(rng, 1, 10);
    }

    const planet: GalaxyPlanet = {
      id: generatePlanetUUID(rng),
      starId: star.id,
      name: generatePlanetName(star.name, i + 1),
      planetType,
      size: weightedChoice(rng, PLANET_SIZE_WEIGHTS) as 'small' | 'medium' | 'large',
      resources,
      habitable,
      createdAt: new Date(),
    };

    planets.push(planet);
  }

  return planets;
}

/**
 * Generates a UUID for a planet using a PRNG.
 *
 * @param rng - The PRNG function
 * @returns A UUID-like string
 */
function generatePlanetUUID(rng: () => number): string {
  const hex = '0123456789abcdef';
  const sections = [8, 4, 4, 4, 12];

  return sections
    .map(length => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += hex[Math.floor(rng() * 16)];
      }
      return result;
    })
    .join('-');
}

/**
 * Generates a planet name based on the star name and planet number.
 *
 * @param starName - The name of the star
 * @param planetNumber - The sequential number of the planet (1-indexed)
 * @returns A planet name string
 */
function generatePlanetName(starName: string, planetNumber: number): string {
  return `${starName} ${romanNumeral(planetNumber)}`;
}

/**
 * Converts a number to a Roman numeral.
 *
 * @param num - The number to convert (1-10 supported)
 * @returns The Roman numeral string
 */
function romanNumeral(num: number): string {
  const numerals: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, symbol] of numerals) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }

  return result;
}

/**
 * Returns the list of available resource types.
 * Useful for testing and validation.
 *
 * @returns The array of resource type strings
 */
export function getResourceTypes(): string[] {
  return [...RESOURCE_TYPES];
}

/**
 * Returns the planet type weights used for generation.
 * Useful for testing and validation.
 *
 * @returns The array of [planetType, weight] tuples
 */
export function getPlanetTypeWeights(): [string, number][] {
  return [...PLANET_TYPE_WEIGHTS];
}
