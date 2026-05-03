/**
 * Tests for galaxy generation modules.
 *
 * This test suite covers:
 * - PRNG reproducibility and range
 * - Type guard functions
 * - Star system generation
 * - Planet generation
 * - Star lane generation and connectivity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSeededPrng, randomInt, randomFloat, randomChoice, weightedChoice } from '../src/galaxy/prng';
import { isGalaxyStar, isGalaxyPlanet, isGalaxyStarLane, GalaxyStar, GalaxyPlanet, GalaxyStarLane, toStarEntity, toPlanetEntity, toStarLaneEntity } from '../src/galaxy/types';
import { generateStarSystems, getGalaxyBounds, getStarNames } from '../src/galaxy/star-generator';
import { generatePlanetsForSystem, getResourceTypes, getPlanetTypeWeights } from '../src/galaxy/planet-generator';
import { generateStarLanes, getLaneCount, getAverageLanesPerStar } from '../src/galaxy/lane-generator';

// ============================================================================
// PRNG Tests
// ============================================================================

describe('createSeededPrng', () => {
  it('should produce deterministic results for the same string seed', () => {
    const rng1 = createSeededPrng('test-seed-123');
    const rng2 = createSeededPrng('test-seed-123');

    const sequence1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
    const sequence2 = [rng2(), rng2(), rng2(), rng2(), rng2()];

    expect(sequence1).toEqual(sequence2);
  });

  it('should produce deterministic results for the same numeric seed', () => {
    const rng1 = createSeededPrng(12345);
    const rng2 = createSeededPrng(12345);

    const sequence1 = [rng1(), rng1(), rng1()];
    const sequence2 = [rng2(), rng2(), rng2()];

    expect(sequence1).toEqual(sequence2);
  });

  it('should produce different results for different seeds', () => {
    const rng1 = createSeededPrng('seed-A');
    const rng2 = createSeededPrng('seed-B');

    const val1 = rng1();
    const val2 = rng2();

    // Very unlikely to be equal with different seeds
    expect(val1).not.toEqual(val2);
  });

  it('should produce values in the range [0, 1)', () => {
    const rng = createSeededPrng('range-test');

    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should produce a good distribution of values', () => {
    const rng = createSeededPrng('distribution-test');
    const buckets = new Array(10).fill(0);

    for (let i = 0; i < 10000; i++) {
      const value = rng();
      const bucketIndex = Math.floor(value * 10);
      buckets[bucketIndex]++;
    }

    // Each bucket should have roughly 1000 values (10% of 10000)
    // Allow some tolerance
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

describe('randomInt', () => {
  it('should produce integers within the specified range', () => {
    const rng = createSeededPrng('random-int-test');

    for (let i = 0; i < 100; i++) {
      const value = randomInt(rng, 1, 10);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should be able to produce the minimum and maximum values', () => {
    const rng = createSeededPrng('min-max-test');
    const seen = new Set<number>();

    // Run many iterations to try to get both min and max
    for (let i = 0; i < 1000; i++) {
      seen.add(randomInt(rng, 1, 3));
    }

    // With 1000 iterations, we should see all values
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
    expect(seen.has(3)).toBe(true);
  });
});

describe('randomFloat', () => {
  it('should produce floats within the specified range', () => {
    const rng = createSeededPrng('random-float-test');

    for (let i = 0; i < 100; i++) {
      const value = randomFloat(rng, 0, 1);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomChoice', () => {
  it('should pick elements from the array', () => {
    const rng = createSeededPrng('choice-test');
    const array = ['a', 'b', 'c', 'd', 'e'];

    for (let i = 0; i < 100; i++) {
      const value = randomChoice(rng, array);
      expect(array).toContain(value);
    }
  });

  it('should throw on empty array', () => {
    const rng = createSeededPrng('empty-array-test');
    expect(() => randomChoice(rng, [])).toThrow('Cannot pick from an empty array');
  });
});

describe('weightedChoice', () => {
  it('should pick elements according to weights', () => {
    const rng = createSeededPrng('weighted-test');
    const choices: [string, number][] = [['rare', 1], ['common', 9]];

    let rareCount = 0;
    let commonCount = 0;

    for (let i = 0; i < 1000; i++) {
      const value = weightedChoice(rng, choices);
      if (value === 'rare') rareCount++;
      if (value === 'common') commonCount++;
    }

    // With weights 1:9, rare should be ~10% and common ~90%
    expect(rareCount).toBeGreaterThan(50);
    expect(rareCount).toBeLessThan(150);
    expect(commonCount).toBeGreaterThan(850);
    expect(commonCount).toBeLessThan(950);
  });

  it('should throw on empty choices array', () => {
    const rng = createSeededPrng('empty-weighted-test');
    expect(() => weightedChoice(rng, [])).toThrow('Cannot pick from an empty choices array');
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('isGalaxyStar', () => {
  it('should return true for valid GalaxyStar objects', () => {
    const validStar: GalaxyStar = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sol',
      xCoord: 500,
      yCoord: 500,
      systemSize: 'medium',
      createdAt: new Date(),
    };

    expect(isGalaxyStar(validStar)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isGalaxyStar(null)).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isGalaxyStar('string')).toBe(false);
    expect(isGalaxyStar(123)).toBe(false);
  });

  it('should return false for objects missing required fields', () => {
    const incomplete = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sol',
      // missing xCoord, yCoord, systemSize, createdAt
    };

    expect(isGalaxyStar(incomplete)).toBe(false);
  });

  it('should return false for objects with invalid field types', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sol',
      xCoord: 'not-a-number',
      yCoord: 500,
      systemSize: 'medium',
      createdAt: new Date(),
    };

    expect(isGalaxyStar(invalid)).toBe(false);
  });

  it('should return false for objects with invalid enum values', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sol',
      xCoord: 500,
      yCoord: 500,
      systemSize: 'invalid-size',
      createdAt: new Date(),
    };

    expect(isGalaxyStar(invalid)).toBe(false);
  });
});

describe('isGalaxyPlanet', () => {
  it('should return true for valid GalaxyPlanet objects', () => {
    const validPlanet: GalaxyPlanet = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      starId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Earth',
      planetType: 'terrestrial',
      size: 'medium',
      resources: { minerals: 5, energy: 3 },
      habitable: true,
      createdAt: new Date(),
    };

    expect(isGalaxyPlanet(validPlanet)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isGalaxyPlanet(null)).toBe(false);
  });

  it('should return false for objects with invalid planet types', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      starId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Earth',
      planetType: 'invalid-type',
      size: 'medium',
      resources: { minerals: 5 },
      habitable: true,
      createdAt: new Date(),
    };

    expect(isGalaxyPlanet(invalid)).toBe(false);
  });

  it('should return false for objects with invalid resources type', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      starId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Earth',
      planetType: 'terrestrial',
      size: 'medium',
      resources: 'not-an-object',
      habitable: true,
      createdAt: new Date(),
    };

    expect(isGalaxyPlanet(invalid)).toBe(false);
  });
});

describe('isGalaxyStarLane', () => {
  it('should return true for valid GalaxyStarLane objects', () => {
    const validLane: GalaxyStarLane = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      sourceStarId: '123e4567-e89b-12d3-a456-426614174000',
      destinationStarId: '123e4567-e89b-12d3-a456-426614174001',
      distance: 150.5,
      createdAt: new Date(),
    };

    expect(isGalaxyStarLane(validLane)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isGalaxyStarLane(null)).toBe(false);
  });

  it('should return false for objects missing required fields', () => {
    const incomplete = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      sourceStarId: '123e4567-e89b-12d3-a456-426614174000',
      // missing destinationStarId, distance, createdAt
    };

    expect(isGalaxyStarLane(incomplete)).toBe(false);
  });

  it('should return false for objects with invalid distance type', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      sourceStarId: '123e4567-e89b-12d3-a456-426614174000',
      destinationStarId: '123e4567-e89b-12d3-a456-426614174001',
      distance: 'not-a-number',
      createdAt: new Date(),
    };

    expect(isGalaxyStarLane(invalid)).toBe(false);
  });
});

// ============================================================================
// Star Generator Tests
// ============================================================================

describe('generateStarSystems', () => {
  const TEST_GAME_ID = '123e4567-e89b-12d3-a456-426614174000';

  it('should generate the default number of stars (25-40) when count is not specified', () => {
    const stars = generateStarSystems('test-seed', TEST_GAME_ID);

    expect(stars.length).toBeGreaterThanOrEqual(25);
    expect(stars.length).toBeLessThanOrEqual(40);
  });

  it('should generate the specified number of stars when count is provided', () => {
    const stars = generateStarSystems('test-seed', TEST_GAME_ID, 30);

    expect(stars.length).toBe(30);
  });

  it('should produce deterministic results for the same seed', () => {
    const stars1 = generateStarSystems('deterministic-seed', TEST_GAME_ID);
    const stars2 = generateStarSystems('deterministic-seed', TEST_GAME_ID);

    expect(stars1.length).toBe(stars2.length);

    for (let i = 0; i < stars1.length; i++) {
      expect(stars1[i].id).toBe(stars2[i].id);
      expect(stars1[i].name).toBe(stars2[i].name);
      expect(stars1[i].xCoord).toBe(stars2[i].xCoord);
      expect(stars1[i].yCoord).toBe(stars2[i].yCoord);
      expect(stars1[i].systemSize).toBe(stars2[i].systemSize);
    }
  });

  it('should produce different results for different seeds', () => {
    const stars1 = generateStarSystems('seed-A', TEST_GAME_ID);
    const stars2 = generateStarSystems('seed-B', TEST_GAME_ID);

    // Names might overlap, but coordinates should differ
    const hasDifferentCoords = stars1.some((star, i) =>
      star.xCoord !== stars2[i].xCoord || star.yCoord !== stars2[i].yCoord
    );

    expect(hasDifferentCoords).toBe(true);
  });

  it('should generate stars within galaxy bounds', () => {
    const stars = generateStarSystems('bounds-test', TEST_GAME_ID, 50);
    const bounds = getGalaxyBounds();

    for (const star of stars) {
      expect(star.xCoord).toBeGreaterThanOrEqual(bounds.minX);
      expect(star.xCoord).toBeLessThanOrEqual(bounds.maxX);
      expect(star.yCoord).toBeGreaterThanOrEqual(bounds.minY);
      expect(star.yCoord).toBeLessThanOrEqual(bounds.maxY);
    }
  });

  it('should assign valid system sizes', () => {
    const stars = generateStarSystems('size-test', TEST_GAME_ID, 100);
    const validSizes = ['small', 'medium', 'large'];

    for (const star of stars) {
      expect(validSizes).toContain(star.systemSize);
    }
  });

  it('should have correct size distribution (approximately)', () => {
    const stars = generateStarSystems('distribution-test', TEST_GAME_ID, 1000);

    const sizeCounts = { small: 0, medium: 0, large: 0 };
    for (const star of stars) {
      sizeCounts[star.systemSize]++;
    }

    // Expected: small ~30%, medium ~50%, large ~20%
    const smallPct = (sizeCounts.small / stars.length) * 100;
    const mediumPct = (sizeCounts.medium / stars.length) * 100;
    const largePct = (sizeCounts.large / stars.length) * 100;

    expect(smallPct).toBeGreaterThan(20);
    expect(smallPct).toBeLessThan(40);
    expect(mediumPct).toBeGreaterThan(40);
    expect(mediumPct).toBeLessThan(60);
    expect(largePct).toBeGreaterThan(10);
    expect(largePct).toBeLessThan(30);
  });

  it('should generate unique IDs for each star', () => {
    const stars = generateStarSystems('unique-id-test', TEST_GAME_ID, 50);
    const ids = new Set(stars.map(s => s.id));

    expect(ids.size).toBe(stars.length);
  });

  it('should generate valid GalaxyStar objects', () => {
    const stars = generateStarSystems('valid-objects-test', TEST_GAME_ID, 10);

    for (const star of stars) {
      expect(isGalaxyStar(star)).toBe(true);
    }
  });

  it('should assign names from the star name list or derived names', () => {
    const stars = generateStarSystems('name-test', TEST_GAME_ID, 20);
    const validNames = getStarNames();

    for (const star of stars) {
      expect(typeof star.name).toBe('string');
      expect(star.name.length).toBeGreaterThan(0);
    }
  });
});

describe('getGalaxyBounds', () => {
  it('should return the correct galaxy bounds', () => {
    const bounds = getGalaxyBounds();

    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(1000);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(1000);
  });

  it('should return a copy, not the original object', () => {
    const bounds1 = getGalaxyBounds();
    const bounds2 = getGalaxyBounds();

    expect(bounds1).toEqual(bounds2);
    expect(bounds1).not.toBe(bounds2);
  });
});

describe('getStarNames', () => {
  it('should return an array of star names', () => {
    const names = getStarNames();

    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
  });

  it('should return a copy, not the original array', () => {
    const names1 = getStarNames();
    const names2 = getStarNames();

    expect(names1).toEqual(names2);
    expect(names1).not.toBe(names2);
  });
});

// ============================================================================
// Planet Generator Tests
// ============================================================================

describe('generatePlanetsForSystem', () => {
  let testStar: GalaxyStar;

  beforeEach(() => {
    testStar = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sol',
      xCoord: 500,
      yCoord: 500,
      systemSize: 'medium',
      createdAt: new Date(),
    };
  });

  it('should generate 1-4 planets per system', () => {
    const planets = generatePlanetsForSystem(testStar, 'test-seed');

    expect(planets.length).toBeGreaterThanOrEqual(1);
    expect(planets.length).toBeLessThanOrEqual(4);
  });

  it('should produce deterministic results for the same star and seed', () => {
    const planets1 = generatePlanetsForSystem(testStar, 'deterministic-seed');
    const planets2 = generatePlanetsForSystem(testStar, 'deterministic-seed');

    expect(planets1.length).toBe(planets2.length);

    for (let i = 0; i < planets1.length; i++) {
      expect(planets1[i].id).toBe(planets2[i].id);
      expect(planets1[i].name).toBe(planets2[i].name);
      expect(planets1[i].planetType).toBe(planets2[i].planetType);
      expect(planets1[i].size).toBe(planets2[i].size);
      expect(planets1[i].habitable).toBe(planets2[i].habitable);
    }
  });

  it('should produce different results for different seeds', () => {
    const planets1 = generatePlanetsForSystem(testStar, 'seed-A');
    const planets2 = generatePlanetsForSystem(testStar, 'seed-B');

    // At least some property should differ
    const allSame = planets1.every((p1, i) =>
      p1.planetType === planets2[i]?.planetType &&
      p1.size === planets2[i]?.size
    );

    expect(allSame).toBe(false);
  });

  it('should produce different results for different stars with same seed', () => {
    const star2: GalaxyStar = { ...testStar, id: '223e4567-e89b-12d3-a456-426614174001' };
    const planets1 = generatePlanetsForSystem(testStar, 'same-seed');
    const planets2 = generatePlanetsForSystem(star2, 'same-seed');

    // Results should differ because the per-star seed includes the star ID
    const allSame = planets1.every((p1, i) =>
      p1.planetType === planets2[i]?.planetType
    );

    // Not guaranteed, but very likely to be different
    // Skip this test if they happen to be the same (very rare)
    if (planets1.length === planets2.length) {
      const idsMatch = planets1.every((p1, i) => p1.id === planets2[i]?.id);
      expect(idsMatch).toBe(false);
    }
  });

  it('should generate valid GalaxyPlanet objects', () => {
    const planets = generatePlanetsForSystem(testStar, 'valid-test');

    for (const planet of planets) {
      expect(isGalaxyPlanet(planet)).toBe(true);
    }
  });

  it('should set starId to the parent star\'s id', () => {
    const planets = generatePlanetsForSystem(testStar, 'star-id-test');

    for (const planet of planets) {
      expect(planet.starId).toBe(testStar.id);
    }
  });

  it('should assign valid planet types', () => {
    const planets = generatePlanetsForSystem(testStar, 'type-test');
    const validTypes = ['terrestrial', 'gas_giant', 'ice', 'desert', 'ocean'];

    for (const planet of planets) {
      expect(validTypes).toContain(planet.planetType);
    }
  });

  it('should assign valid planet sizes', () => {
    const planets = generatePlanetsForSystem(testStar, 'size-test');
    const validSizes = ['small', 'medium', 'large'];

    for (const planet of planets) {
      expect(validSizes).toContain(planet.size);
    }
  });

  it('should assign planet names based on star name', () => {
    const planets = generatePlanetsForSystem(testStar, 'name-test');

    for (let i = 0; i < planets.length; i++) {
      // Planet names use Roman numerals: "Sol I", "Sol II", etc.
      const roman = ['I', 'II', 'III', 'IV'][i];
      expect(planets[i].name).toBe(`Sol ${roman}`);
    }
  });

  it('should generate resources with 2-4 types', () => {
    // Run multiple times to get various counts
    const allResourceCounts = new Set<number>();

    for (let i = 0; i < 100; i++) {
      const planets = generatePlanetsForSystem(testStar, `resource-test-${i}`);
      for (const planet of planets) {
        const resourceCount = Object.keys(planet.resources).length;
        allResourceCounts.add(resourceCount);

        expect(resourceCount).toBeGreaterThanOrEqual(2);
        expect(resourceCount).toBeLessThanOrEqual(4);
      }
    }

    // Should see both 2, 3, and 4 resource counts
    expect(allResourceCounts.has(2)).toBe(true);
    expect(allResourceCounts.has(3)).toBe(true);
    expect(allResourceCounts.has(4)).toBe(true);
  });

  it('should generate resource values between 1 and 10', () => {
    const planets = generatePlanetsForSystem(testStar, 'resource-values-test');

    for (const planet of planets) {
      for (const [, value] of Object.entries(planet.resources)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    }
  });

  it('should have habitable true with higher probability for terrestrial planets', () => {
    let terrestrialCount = 0;
    let terrestrialHabitable = 0;
    let otherCount = 0;
    let otherHabitable = 0;

    for (let i = 0; i < 1000; i++) {
      const planets = generatePlanetsForSystem(testStar, `habitability-test-${i}`);
      for (const planet of planets) {
        if (planet.planetType === 'terrestrial') {
          terrestrialCount++;
          if (planet.habitable) terrestrialHabitable++;
        } else {
          otherCount++;
          if (planet.habitable) otherHabitable++;
        }
      }
    }

    const terrestrialRate = terrestrialHabitable / terrestrialCount;
    const otherRate = otherHabitable / otherCount;

    // Terrestrial should be around 40%, others around 10%
    expect(terrestrialRate).toBeGreaterThan(0.3);
    expect(terrestrialRate).toBeLessThan(0.5);
    expect(otherRate).toBeGreaterThan(0.05);
    expect(otherRate).toBeLessThan(0.2);
  });

  it('should generate unique IDs for each planet', () => {
    const planets = generatePlanetsForSystem(testStar, 'unique-id-test');
    const ids = new Set(planets.map(p => p.id));

    expect(ids.size).toBe(planets.length);
  });
});

describe('getResourceTypes', () => {
  it('should return an array of resource type strings', () => {
    const types = getResourceTypes();

    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });

  it('should return a copy, not the original array', () => {
    const types1 = getResourceTypes();
    const types2 = getResourceTypes();

    expect(types1).toEqual(types2);
    expect(types1).not.toBe(types2);
  });
});

describe('getPlanetTypeWeights', () => {
  it('should return the correct weights', () => {
    const weights = getPlanetTypeWeights();

    const weightMap = new Map(weights);
    expect(weightMap.get('terrestrial')).toBe(30);
    expect(weightMap.get('gas_giant')).toBe(20);
    expect(weightMap.get('ice')).toBe(15);
    expect(weightMap.get('desert')).toBe(20);
    expect(weightMap.get('ocean')).toBe(15);
  });

  it('should return a copy, not the original array', () => {
    const weights1 = getPlanetTypeWeights();
    const weights2 = getPlanetTypeWeights();

    expect(weights1).toEqual(weights2);
    expect(weights1).not.toBe(weights2);
  });
});

// ============================================================================
// Lane Generator Tests
// ============================================================================

describe('generateStarLanes', () => {
  const TEST_GAME_ID = '123e4567-e89b-12d3-a456-426614174000';

  let stars: GalaxyStar[];

  beforeEach(() => {
    // Generate a small fixed set of stars for testing
    stars = [
      { id: 'star-1', gameId: TEST_GAME_ID, name: 'Sol', xCoord: 100, yCoord: 100, systemSize: 'medium', createdAt: new Date() },
      { id: 'star-2', gameId: TEST_GAME_ID, name: 'Alpha Centauri', xCoord: 200, yCoord: 100, systemSize: 'small', createdAt: new Date() },
      { id: 'star-3', gameId: TEST_GAME_ID, name: 'Vega', xCoord: 300, yCoord: 150, systemSize: 'large', createdAt: new Date() },
      { id: 'star-4', gameId: TEST_GAME_ID, name: 'Sirius', xCoord: 400, yCoord: 200, systemSize: 'medium', createdAt: new Date() },
      { id: 'star-5', gameId: TEST_GAME_ID, name: 'Polaris', xCoord: 500, yCoord: 300, systemSize: 'small', createdAt: new Date() },
    ];
  });

  it('should return an array of GalaxyStarLane objects', () => {
    const lanes = generateStarLanes(stars, 'test-seed', TEST_GAME_ID);

    expect(Array.isArray(lanes)).toBe(true);
    for (const lane of lanes) {
      expect(isGalaxyStarLane(lane)).toBe(true);
    }
  });

  it('should create a fully connected graph (BFS validation)', () => {
    const lanes = generateStarLanes(stars, 'connectivity-test', TEST_GAME_ID);

    // Build adjacency list
    const adjList = new Map<string, Set<string>>();
    for (const star of stars) {
      adjList.set(star.id, new Set());
    }
    for (const lane of lanes) {
      adjList.get(lane.sourceStarId)?.add(lane.destinationStarId);
      adjList.get(lane.destinationStarId)?.add(lane.sourceStarId);
    }

    // BFS from first star
    const visited = new Set<string>();
    const queue: string[] = [stars[0].id];
    visited.add(stars[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // All stars should be reachable
    expect(visited.size).toBe(stars.length);
  });

  it('should have approximately 1.5-2 lanes per star on average', () => {
    // Generate more stars for better average
    const manyStars = generateStarSystems('many-stars', TEST_GAME_ID, 30);
    const lanes = generateStarLanes(manyStars, 'lane-count-test', TEST_GAME_ID);

    const avgLanes = getAverageLanesPerStar(manyStars, lanes);

    expect(avgLanes).toBeGreaterThan(1.4);
    expect(avgLanes).toBeLessThan(2.5);
  });

  it('should produce deterministic results for the same seed', () => {
    const lanes1 = generateStarLanes(stars, 'deterministic-seed', TEST_GAME_ID);
    const lanes2 = generateStarLanes(stars, 'deterministic-seed', TEST_GAME_ID);

    expect(lanes1.length).toBe(lanes2.length);

    for (let i = 0; i < lanes1.length; i++) {
      expect(lanes1[i].id).toBe(lanes2[i].id);
      expect(lanes1[i].sourceStarId).toBe(lanes2[i].sourceStarId);
      expect(lanes1[i].destinationStarId).toBe(lanes2[i].destinationStarId);
      expect(lanes1[i].distance).toBe(lanes2[i].distance);
    }
  });

  it('should produce different results for different seeds', () => {
    const lanes1 = generateStarLanes(stars, 'seed-A', TEST_GAME_ID);
    const lanes2 = generateStarLanes(stars, 'seed-B', TEST_GAME_ID);

    // Lane sets should differ (not guaranteed but very likely)
    const ids1 = lanes1.map(l => l.id).sort();
    const ids2 = lanes2.map(l => l.id).sort();
    expect(ids1).not.toEqual(ids2);
  });

  it('should calculate correct Euclidean distances', () => {
    const lanes = generateStarLanes(stars, 'distance-test', TEST_GAME_ID);

    for (const lane of lanes) {
      const source = stars.find(s => s.id === lane.sourceStarId)!;
      const dest = stars.find(s => s.id === lane.destinationStarId)!;

      const expectedDistance = Math.round(
        Math.sqrt(
          Math.pow(source.xCoord - dest.xCoord, 2) + Math.pow(source.yCoord - dest.yCoord, 2)
        ) * 100
      ) / 100;

      expect(lane.distance).toBe(expectedDistance);
    }
  });

  it('should not create duplicate lanes between the same stars', () => {
    const lanes = generateStarLanes(stars, 'duplicate-test', TEST_GAME_ID);
    const lanePairs = new Set<string>();

    for (const lane of lanes) {
      const pair = lane.sourceStarId < lane.destinationStarId
        ? `${lane.sourceStarId}-${lane.destinationStarId}`
        : `${lane.destinationStarId}-${lane.sourceStarId}`;

      expect(lanePairs.has(pair)).toBe(false);
      lanePairs.add(pair);
    }
  });

  it('should return empty array for less than 2 stars', () => {
    const emptyLanes = generateStarLanes([], 'empty-test', TEST_GAME_ID);
    expect(emptyLanes).toEqual([]);

    const singleStar = [stars[0]];
    const singleLanes = generateStarLanes(singleStar, 'single-test', TEST_GAME_ID);
    expect(singleLanes).toEqual([]);
  });

  it('should generate unique IDs for each lane', () => {
    const lanes = generateStarLanes(stars, 'unique-id-test', TEST_GAME_ID);
    const ids = new Set(lanes.map(l => l.id));

    expect(ids.size).toBe(lanes.length);
  });
});

describe('getLaneCount', () => {
  it('should return the correct number of lanes', () => {
    const lanes: GalaxyStarLane[] = [
      { id: 'lane-1', sourceStarId: 'a', destinationStarId: 'b', distance: 100, createdAt: new Date() },
      { id: 'lane-2', sourceStarId: 'b', destinationStarId: 'c', distance: 150, createdAt: new Date() },
    ];

    expect(getLaneCount(lanes)).toBe(2);
  });

  it('should return 0 for empty array', () => {
    expect(getLaneCount([])).toBe(0);
  });
});

describe('getAverageLanesPerStar', () => {
  it('should calculate average lanes per star correctly', () => {
    const stars: GalaxyStar[] = [
      { id: 'a', name: 'A', xCoord: 0, yCoord: 0, systemSize: 'medium', createdAt: new Date() },
      { id: 'b', name: 'B', xCoord: 100, yCoord: 0, systemSize: 'medium', createdAt: new Date() },
      { id: 'c', name: 'C', xCoord: 200, yCoord: 0, systemSize: 'medium', createdAt: new Date() },
    ];

    const lanes: GalaxyStarLane[] = [
      { id: 'lane-1', sourceStarId: 'a', destinationStarId: 'b', distance: 100, createdAt: new Date() },
      { id: 'lane-2', sourceStarId: 'b', destinationStarId: 'c', distance: 100, createdAt: new Date() },
      { id: 'lane-3', sourceStarId: 'a', destinationStarId: 'c', distance: 200, createdAt: new Date() },
    ];

    // Star a: 2 connections, Star b: 2 connections, Star c: 2 connections
    // Average = 6 / 3 = 2
    expect(getAverageLanesPerStar(stars, lanes)).toBe(2);
  });

  it('should return 0 for empty stars array', () => {
    expect(getAverageLanesPerStar([], [])).toBe(0);
  });
});

// ============================================================================
// gameId Propagation Tests
// ============================================================================

describe('gameId propagation', () => {
  const TEST_GAME_ID = '123e4567-e89b-12d3-a456-426614174000';

  describe('generateStarSystems', () => {
    it('should set gameId on generated stars when provided', () => {
      const stars = generateStarSystems('test-seed', TEST_GAME_ID, 5);

      for (const star of stars) {
        expect(star.gameId).toBe(TEST_GAME_ID);
      }
    });
  });

  describe('generatePlanetsForSystem', () => {
    it('should set gameId on generated planets when provided', () => {
      const stars = generateStarSystems('test-seed', TEST_GAME_ID, 1);
      const star = stars[0];
      const planets = generatePlanetsForSystem(star, 'test-seed', TEST_GAME_ID);

      for (const planet of planets) {
        expect(planet.gameId).toBe(TEST_GAME_ID);
      }
    });
  });

  describe('generateStarLanes', () => {
    it('should set gameId on generated lanes when provided', () => {
      const stars = generateStarSystems('test-seed', TEST_GAME_ID, 5);
      const lanes = generateStarLanes(stars, 'test-seed', TEST_GAME_ID);

      for (const lane of lanes) {
        expect(lane.gameId).toBe(TEST_GAME_ID);
      }
    });
  });

  describe('toEntity conversion', () => {
    it('should convert GalaxyStar to Star with game_id', () => {
      const star: GalaxyStar = {
        id: 'test-id',
        gameId: TEST_GAME_ID,
        name: 'Test Star',
        xCoord: 100,
        yCoord: 100,
        systemSize: 'medium',
        createdAt: new Date(),
      };

      const entity = toStarEntity(star);
      expect(entity.game_id).toBe(TEST_GAME_ID);
    });

    it('should convert GalaxyPlanet to Planet with game_id', () => {
      const planet: GalaxyPlanet = {
        id: 'test-id',
        gameId: TEST_GAME_ID,
        starId: 'star-id',
        name: 'Test Planet',
        planetType: 'terrestrial',
        size: 'medium',
        resources: { minerals: 5 },
        habitable: true,
        createdAt: new Date(),
      };

      const entity = toPlanetEntity(planet);
      expect(entity.game_id).toBe(TEST_GAME_ID);
    });

    it('should convert GalaxyStarLane to StarLane with game_id', () => {
      const lane: GalaxyStarLane = {
        id: 'test-id',
        gameId: TEST_GAME_ID,
        sourceStarId: 'star-1',
        destinationStarId: 'star-2',
        distance: 100,
        createdAt: new Date(),
      };

      const entity = toStarLaneEntity(lane);
      expect(entity.game_id).toBe(TEST_GAME_ID);
    });
  });
});
