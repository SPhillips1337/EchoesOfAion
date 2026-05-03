# Galaxy Core Module Documentation

## Overview

The Galaxy Core module (`packages/server/src/galaxy/`) provides deterministic galaxy generation for the 4X space strategy game. It generates star systems, planets, and star lanes (connections) using a seeded pseudo-random number generator for reproducibility.

## Module Structure

```
packages/server/src/galaxy/
├── types.ts           # CamelCase TypeScript interfaces
├── prng.ts            # Seeded PRNG (mulberry32)
├── star-generator.ts  # Star system generation
├── planet-generator.ts # Planet generation per star system
└── lane-generator.ts  # Star lane generation with BFS validation
```

## Type Mapping Reference

The galaxy module uses camelCase TypeScript interfaces that map 1:1 to FN-001's snake_case database entities:

### GalaxyStar ↔ Star

| camelCase (TypeScript) | snake_case (Database) | Type |
|------------------------|----------------------|------|
| `id` | `id` | `string` (UUID) |
| `name` | `name` | `string` |
| `xCoord` | `x_coord` | `number` |
| `yCoord` | `y_coord` | `number` |
| `systemSize` | `system_size` | `'small' \| 'medium' \| 'large'` |
| `createdAt` | `created_at` | `Date` |

### GalaxyPlanet ↔ Planet

| camelCase (TypeScript) | snake_case (Database) | Type |
|------------------------|----------------------|------|
| `id` | `id` | `string` (UUID) |
| `starId` | `star_id` | `string` (UUID) |
| `name` | `name` | `string` |
| `planetType` | `planet_type` | `'terrestrial' \| 'gas_giant' \| 'ice' \| 'desert' \| 'ocean'` |
| `size` | `size` | `'small' \| 'medium' \| 'large'` |
| `resources` | `resources` | `Record<string, number>` |
| `habitable` | `habitable` | `boolean` |
| `createdAt` | `created_at` | `Date` |

### GalaxyStarLane ↔ StarLane

| camelCase (TypeScript) | snake_case (Database) | Type |
|------------------------|----------------------|------|
| `id` | `id` | `string` (UUID) |
| `sourceStarId` | `source_star_id` | `string` (UUID) |
| `destinationStarId` | `destination_star_id` | `string` (UUID) |
| `distance` | `distance` | `number` |
| `createdAt` | `created_at` | `Date` |

### Conversion Functions

The module provides conversion functions between camelCase and snake_case:

```typescript
// camelCase → snake_case
toStarEntity(galaxyStar: GalaxyStar): Star
toPlanetEntity(galaxyPlanet: GalaxyPlanet): Planet
toStarLaneEntity(galaxyStarLane: GalaxyStarLane): StarLane

// snake_case → camelCase
fromStarEntity(star: Star): GalaxyStar
fromPlanetEntity(planet: Planet): GalaxyPlanet
fromStarLaneEntity(starLane: StarLane): GalaxyStarLane
```

## PRNG Usage Guidelines

### Overview

The module uses a **seeded pseudo-random number generator** based on the **mulberry32 algorithm**. This ensures that the same seed always produces the same galaxy layout, enabling:
- Reproducible galaxy generation for saved games
- Shared galaxy maps for multiplayer sessions
- Deterministic testing

### Creating a PRNG

```typescript
import { createSeededPrng } from './prng';

const rng = createSeededPrng('my-galaxy-seed');
const randomValue = rng(); // Returns value in [0, 1)
```

### Seed Types

The `createSeededPrng` function accepts both string and numeric seeds:
- **String seeds**: Hashed to a 32-bit integer using FNV-1a algorithm
- **Numeric seeds**: Used directly (must be a 32-bit integer)

### Helper Functions

The PRNG module provides helper functions for common random operations:

```typescript
import { randomInt, randomFloat, randomChoice, weightedChoice } from './prng';

// Random integer in range [min, max] (inclusive)
const diceRoll = randomInt(rng, 1, 6);

// Random float in range [min, max) (exclusive max)
const probability = randomFloat(rng, 0, 1);

// Random element from array
const randomStar = randomChoice(rng, stars);

// Weighted random choice (weights determine probability)
const planetType = weightedChoice(rng, [
  ['terrestrial', 30],
  ['gas_giant', 20],
  ['ice', 15],
  ['desert', 20],
  ['ocean', 15],
]);
```

## Generator Functions

### generateStarSystems(seed, count?)

Generates 25-40 star systems (default) with randomized properties.

**Signature:**
```typescript
function generateStarSystems(seed: string, count?: number): GalaxyStar[]
```

**Parameters:**
- `seed` - The seed string for deterministic generation
- `count` - Optional specific count (defaults to random 25-40)

**Behavior:**
- Coordinates: Random within galaxy bounds (0-1000 for both axes)
- System size: Weighted random (small: 30%, medium: 50%, large: 20%)
- Names: Selected from predefined list of 50 star names
- IDs: UUID v4-like strings generated using the seeded PRNG

**Example:**
```typescript
const stars = generateStarSystems('my-galaxy-seed');
console.log(stars.length); // 25-40
```

### generatePlanetsForSystem(star, seed)

Generates 1-4 planets for a given star system.

**Signature:**
```typescript
function generatePlanetsForSystem(star: GalaxyStar, seed: string): GalaxyPlanet[]
```

**Parameters:**
- `star` - The parent GalaxyStar object
- `seed` - The seed string (combined with star ID for per-system determinism)

**Behavior:**
- Planet count: Random 1-4 per system
- Planet type: Weighted random (terrestrial: 30%, gas_giant: 20%, ice: 15%, desert: 20%, ocean: 15%)
- Habitability: 40% for terrestrial, 10% for other types
- Resources: 2-4 random types with values 1-10
- Names: `{StarName} {RomanNumeral}` (e.g., "Sol I", "Sol II")

**Example:**
```typescript
const star = stars[0];
const planets = generatePlanetsForSystem(star, 'my-galaxy-seed');
console.log(planets.length); // 1-4
```

### generateStarLanes(stars, seed)

Generates star lanes ensuring full connectivity via BFS validation.

**Signature:**
```typescript
function generateStarLanes(stars: GalaxyStar[], seed: string): GalaxyStarLane[]
```

**Parameters:**
- `stars` - Array of GalaxyStar objects
- `seed` - The seed string for deterministic generation

**Behavior:**
- Uses **Kruskal's algorithm with Union-Find** to build Minimum Spanning Tree (ensures connectivity)
- Targets ~1.8 connections per star on average (adjustable via `TARGET_LANES_PER_STAR`)
- Prioritizes connections between closer stars (Euclidean distance)
- Calculates distance as Euclidean distance between star coordinates
- Validates connectivity using BFS (should always pass with Kruskal's algorithm)

**Connectivity Guarantee:**
The generated star lane network is **guaranteed to be fully connected**. Any star can reach any other star by traversing star lanes.

**Example:**
```typescript
const lanes = generateStarLanes(stars, 'my-galaxy-seed');
console.log(lanes.length); // Variable, but ensures connectivity
```

## BFS Traversability Validation

### Algorithm

The module uses **Breadth-First Search (BFS)** to validate that all stars are reachable from any starting star.

**Logic:**
1. Build adjacency list from star lanes
2. Start BFS from first star
3. Track visited stars
4. Verify all stars were visited

**Implementation:**
```typescript
function isFullyConnected(stars: GalaxyStar[], lanes: GalaxyStarLane[]): boolean {
  // Build adjacency list
  const adjList = new Map<string, Set<string>>();
  // ... (build adjacency)

  // BFS from first star
  const visited = new Set<string>();
  const queue: string[] = [stars[0].id];
  // ... (BFS traversal)

  return visited.size === stars.length;
}
```

### Connectivity Guarantee

The `generateStarLanes` function uses **Kruskal's algorithm** (Union-Find) to build a Minimum Spanning Tree first, ensuring:
- No cycles in the initial graph
- All stars are connected with the minimum number of lanes (N-1 for N stars)
- Additional lanes are added to reach the target average

This guarantees the BFS validation will always pass.

## Testing

The module includes comprehensive tests in `packages/server/tests/galaxy.test.ts`:

- **PRNG tests**: Deterministic output, value range, distribution
- **Type guard tests**: Valid/invalid objects, edge cases
- **Star generator tests**: Count range, coordinates, sizes, determinism
- **Planet generator tests**: Count, types, habitability, resources, determinism
- **Lane generator tests**: Connectivity (BFS), distance calculations, determinism

Run tests:
```bash
cd packages/server
npx vitest run tests/galaxy.test.ts
```

## Design Decisions

1. **CamelCase internally, snake_case for DB**: The galaxy module uses camelCase for internal consistency and ease of use, with conversion functions for database storage.

2. **Seeded PRNG for determinism**: All random operations use a seeded PRNG, ensuring reproducible galaxies.

3. **Kruskal's algorithm for connectivity**: Ensures full connectivity without cycles, then adds extra lanes to reach the target.

4. **Per-system seeds**: Planet generation uses a combined seed (`{galaxySeed}-{starId}`) for per-system determinism.

5. **Roman numeral planet names**: Thematic for 4X games (e.g., "Sol I", "Sol II").

## Future Enhancements

Potential improvements for future tasks:
- Configurable galaxy size and star density
- Additional planet types and resource types
- More sophisticated lane generation (e.g., trade routes, empire preferences)
- Visualization helpers for debugging
- Performance optimization for large galaxies
