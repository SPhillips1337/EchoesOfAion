/**
 * Seeded Pseudo-Random Number Generator (PRNG) using the mulberry32 algorithm.
 *
 * This module provides deterministic random number generation based on a seed value.
 * The same seed will always produce the same sequence of random numbers, which is
 * essential for reproducible galaxy generation.
 *
 * @module galaxy/prng
 */

/**
 * Creates a seeded PRNG using the mulberry32 algorithm.
 *
 * The mulberry32 algorithm is a simple, fast, and decent-quality PRNG that is
 * suitable for game generation purposes. It produces a deterministic sequence
 * of pseudo-random numbers based on an initial seed value.
 *
 * @param seed - The seed value, either a string or number. Strings are hashed to a number.
 * @returns A function that returns a pseudo-random number in the range [0, 1) each time it's called.
 *
 * @example
 * ```typescript
 * const rng = createSeededPrng("my-galaxy-seed");
 * console.log(rng()); // 0.123456789
 * console.log(rng()); // 0.987654321
 * ```
 */
export function createSeededPrng(seed: string | number): () => number {
  // Convert string seed to numeric seed using a simple hash function
  let numericSeed: number;

  if (typeof seed === 'string') {
    numericSeed = hashString(seed);
  } else {
    numericSeed = seed;
  }

  // Ensure the seed is a 32-bit integer
  numericSeed = numericSeed | 0;

  // mulberry32 algorithm
  return function mulberry32(): number {
    numericSeed = (numericSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(numericSeed ^ (numericSeed >>> 15), 1 | numericSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hashes a string into a 32-bit integer using the FNV-1a algorithm.
 *
 * @param str - The string to hash
 * @returns A 32-bit integer hash value
 */
function hashString(str: string): number {
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hash = Math.imul(hash ^ charCode, 16777619); // FNV prime
  }

  return hash | 0; // Convert to 32-bit signed integer
}

/**
 * Convenience function to generate a random integer in a range using a PRNG.
 *
 * @param rng - The PRNG function
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns A random integer in [min, max]
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Convenience function to generate a random float in a range using a PRNG.
 *
 * @param rng - The PRNG function
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns A random float in [min, max)
 */
export function randomFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/**
 * Convenience function to pick a random element from an array using a PRNG.
 *
 * @param rng - The PRNG function
 * @param array - The array to pick from
 * @returns A random element from the array
 */
export function randomChoice<T>(rng: () => number, array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from an empty array');
  }
  return array[randomInt(rng, 0, array.length - 1)];
}

/**
 * Convenience function to generate a weighted random choice from an array.
 *
 * @param rng - The PRNG function
 * @param choices - Array of [value, weight] tuples
 * @returns A randomly chosen value based on weights
 */
export function weightedChoice<T>(
  rng: () => number,
  choices: [T, number][]
): T {
  if (choices.length === 0) {
    throw new Error('Cannot pick from an empty choices array');
  }

  const totalWeight = choices.reduce((sum, [, weight]) => sum + weight, 0);
  let random = rng() * totalWeight;

  for (const [value, weight] of choices) {
    random -= weight;
    if (random <= 0) {
      return value;
    }
  }

  // Fallback to last item (should only happen due to floating point errors)
  return choices[choices.length - 1][0];
}
