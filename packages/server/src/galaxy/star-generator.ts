/**
 * Star System Generator
 *
 * This module generates star systems for the galaxy with randomized properties
 * including coordinates, system size, and names. The generation is deterministic
 * based on a seed value, ensuring reproducible galaxy layouts.
 *
 * @module galaxy/star-generator
 */

import { createSeededPrng, randomInt, weightedChoice } from './prng';
import { GalaxyStar } from './types';

/**
 * Predefined list of star names for generation.
 * These are fictional star names suitable for a 4X space strategy game.
 */
const STAR_NAMES = [
  'Sol', 'Alpha Centauri', 'Vega', 'Sirius', 'Polaris',
  'Betelgeuse', 'Rigel', 'Antares', 'Aldebaran', 'Procyon',
  'Capella', 'Achernar', 'Gacrux', 'Castor', 'Pollux',
  'Regulus', 'Deneb', 'Fomalhaut', 'Mintaka', 'Alnilam',
  'Alnitak', 'Saiph', 'Bellatrix', 'Meissa', 'Alcor',
  'Mizar', 'Alioth', 'Dubhe', 'Merak', 'Phecda',
  'Talitha', 'Alkaphrah', 'Tania Borealis', 'Tania Australis',
  'Alula Borealis', 'Alula Australis', 'Muscida', 'Alkaprah',
  'Nova', 'Supernova', 'Pulsar', 'Quasar', 'Nebula',
  'Andromeda', 'Cassiopeia', 'Draco', 'Orion', 'Pegasus',
  'Phoenix', 'Hydra', 'Lyra', 'Cygnus', 'Aquila',
  'Epsilon Eridani', 'Tau Ceti', 'Proxima', 'Wolf', 'Lalande',
  'Kapteyn', 'Gliese', 'Luyten', 'Ross', 'Barnard',
];

/**
 * Galaxy bounds for star system coordinates.
 */
const GALAXY_BOUNDS = {
  minX: 0,
  maxX: 1000,
  minY: 0,
  maxY: 1000,
} as const;

/**
 * System size weights for random selection.
 * small: 30%, medium: 50%, large: 20%
 */
const SYSTEM_SIZE_WEIGHTS: [string, number][] = [
  ['small', 3],
  ['medium', 5],
  ['large', 2],
];

/**
 * Generates star systems for a galaxy.
 *
 * @param seed - The seed string for deterministic generation
 * @param count - Optional specific count of stars to generate (defaults to random 25-40)
 * @param gameId - Optional game ID to associate with the generated stars
 * @returns An array of GalaxyStar objects
 *
 * @example
 * ```typescript
 * const stars = generateStarSystems('my-galaxy-seed');
 * console.log(stars.length); // 25-40
 * ```
 */
export function generateStarSystems(seed: string, gameId: string, count?: number): GalaxyStar[] {
  const rng = createSeededPrng(seed);

  // Determine the number of stars to generate
  const starCount = count !== undefined ? count : randomInt(rng, 25, 40);

  // Shuffle the star names to get a random selection
  const shuffledNames = [...STAR_NAMES].sort(() => rng() - 0.5);
  const selectedNames = shuffledNames.slice(0, Math.min(starCount, shuffledNames.length));

  // If we need more names than available, we'll append numbers to existing names
  const stars: GalaxyStar[] = [];

  for (let i = 0; i < starCount; i++) {
    const name = i < selectedNames.length
      ? selectedNames[i]
      : `${selectedNames[i % selectedNames.length]} ${Math.floor(i / selectedNames.length) + 2}`;

    const star: GalaxyStar = {
      id: generateUUID(rng),
      gameId,
      name,
      xCoord: randomInt(rng, GALAXY_BOUNDS.minX, GALAXY_BOUNDS.maxX),
      yCoord: randomInt(rng, GALAXY_BOUNDS.minY, GALAXY_BOUNDS.maxY),
      systemSize: weightedChoice(rng, SYSTEM_SIZE_WEIGHTS) as 'small' | 'medium' | 'large',
      createdAt: new Date(),
    };

    stars.push(star);
  }

  return stars;
}

/**
 * Generates a UUID v4-like string for entities using a PRNG.
 * This is a simple implementation suitable for game generation purposes.
 *
 * @param rng - The PRNG function to use
 * @returns A UUID-like string
 */
function generateUUID(rng: () => number): string {
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
 * Returns the galaxy bounds used for star generation.
 * Useful for testing and validation.
 *
 * @returns The galaxy bounds object
 */
export function getGalaxyBounds(): typeof GALAXY_BOUNDS {
  return { ...GALAXY_BOUNDS };
}

/**
 * Returns the list of available star names.
 * Useful for testing and validation.
 *
 * @returns The array of star names
 */
export function getStarNames(): string[] {
  return [...STAR_NAMES];
}
