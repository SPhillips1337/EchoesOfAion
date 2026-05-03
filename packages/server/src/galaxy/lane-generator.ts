/**
 * Star Lane Generator
 *
 * This module generates star lanes (connections between star systems) for the galaxy.
 * It ensures the star lane network is fully connected using Kruskal's algorithm
 * with Union-Find to avoid cycles, then adds additional lanes up to the target.
 *
 * @module galaxy/lane-generator
 */

import { createSeededPrng } from './prng';
import { GalaxyStar, GalaxyStarLane } from './types';

/**
 * Target average number of lanes per star (1.5-2 lanes per star).
 * This is connections per star, so total lanes = (stars * target) / 2
 */
const TARGET_LANES_PER_STAR = 1.8;

/**
 * Generates star lanes connecting the given star systems.
 * Uses Kruskal's algorithm to ensure connectivity, then adds more lanes to reach target.
 *
 * @param stars - Array of GalaxyStar objects representing the star systems
 * @param seed - The seed string for deterministic generation
 * @param gameId - Optional game ID to associate with the generated star lanes
 * @returns An array of GalaxyStarLane objects representing the connections
 *
 * @example
 * ```typescript
 * const stars = generateStarSystems('seed', 30);
 * const lanes = generateStarLanes(stars, 'seed');
 * console.log(lanes.length); // Variable, but ensures connectivity
 * ```
 */
export function generateStarLanes(stars: GalaxyStar[], seed: string, gameId: string): GalaxyStarLane[] {
  if (stars.length < 2) {
    return []; // Need at least 2 stars to create a lane
  }

  const rng = createSeededPrng(seed);
  const lanes: GalaxyStarLane[] = [];
  const laneSet = new Set<string>(); // Track existing lanes to avoid duplicates

  // Calculate all possible connections with distances
  const connections: Array<{ source: GalaxyStar; dest: GalaxyStar; distance: number }> = [];

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const distance = calculateDistance(stars[i], stars[j]);
      connections.push({ source: stars[i], dest: stars[j], distance });
    }
  }

  // Sort connections by distance (prioritize closer stars)
  connections.sort((a, b) => a.distance - b.distance);

  // Calculate target number of lanes (each lane connects 2 stars)
  const targetLaneCount = Math.max(
    Math.floor((stars.length * TARGET_LANES_PER_STAR) / 2),
    stars.length - 1 // Minimum for connectivity
  );

  // Union-Find data structure for Kruskal's algorithm
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  function find(x: string): string {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string): boolean {
    const rootX = find(x);
    const rootY = find(y);

    if (rootX === rootY) return false; // Already in same set

    // Union by rank
    if ((rank.get(rootX) || 0) < (rank.get(rootY) || 0)) {
      parent.set(rootX, rootY);
    } else if ((rank.get(rootX) || 0) > (rank.get(rootY) || 0)) {
      parent.set(rootY, rootX);
    } else {
      parent.set(rootY, rootX);
      rank.set(rootX, (rank.get(rootX) || 0) + 1);
    }
    return true;
  }

  // Initialize Union-Find
  for (const star of stars) {
    parent.set(star.id, star.id);
    rank.set(star.id, 0);
  }

  // Add lanes using Kruskal's algorithm (no cycles, ensures connectivity)
  let laneCount = 0;
  for (const connection of connections) {
    if (laneCount >= targetLaneCount) break;

    const laneId = getLaneId(connection.source.id, connection.dest.id);
    if (!laneSet.has(laneId)) {
      // Use Union-Find to check if adding this lane would create a cycle
      if (union(connection.source.id, connection.dest.id)) {
        // No cycle, add the lane
        lanes.push(createLane(connection.source, connection.dest, connection.distance, rng, gameId));
        laneSet.add(laneId);
        laneCount++;
      }
    }
  }

  // Final BFS validation
  if (!isFullyConnected(stars, lanes)) {
    // This shouldn't happen with Kruskal's algorithm, but just in case
    const additionalLanes = connectDisconnectedComponents(stars, lanes, laneSet, rng, gameId);
    lanes.push(...additionalLanes);
  }

  // Final BFS validation
  if (!isFullyConnected(stars, lanes)) {
    throw new Error('Failed to create a fully connected star lane network');
  }

  return lanes;
}

/**
 * Calculates the Euclidean distance between two stars.
 *
 * @param star1 - First star
 * @param star2 - Second star
 * @returns The Euclidean distance
 */
function calculateDistance(star1: GalaxyStar, star2: GalaxyStar): number {
  const dx = star1.xCoord - star2.xCoord;
  const dy = star1.yCoord - star2.yCoord;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Creates a GalaxyStarLane object between two stars.
 *
 * @param source - Source star
 * @param dest - Destination star
 * @param distance - Pre-calculated distance
 * @param rng - PRNG function
 * @returns A GalaxyStarLane object
 */
function createLane(
  source: GalaxyStar,
  dest: GalaxyStar,
  distance: number,
  rng: () => number,
  gameId: string
): GalaxyStarLane {
  return {
    id: generateLaneUUID(rng),
    gameId,
    sourceStarId: source.id,
    destinationStarId: dest.id,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    createdAt: new Date(),
  };
}

/**
 * Generates a UUID for a star lane using a PRNG.
 *
 * @param rng - The PRNG function
 * @returns A UUID-like string
 */
function generateLaneUUID(rng: () => number): string {
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
 * Gets a canonical lane ID (smaller UUID first) to avoid duplicate lanes.
 *
 * @param id1 - First star ID
 * @param id2 - Second star ID
 * @returns A canonical lane identifier
 */
function getLaneId(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

/**
 * Performs BFS to check if all stars are reachable from any starting star.
 *
 * @param stars - Array of all stars
 * @param lanes - Array of star lanes
 * @returns True if the graph is fully connected
 */
function isFullyConnected(stars: GalaxyStar[], lanes: GalaxyStarLane[]): boolean {
  if (stars.length === 0) return true;
  if (stars.length === 1) return true;

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

  // Check if all stars were visited
  return visited.size === stars.length;
}

/**
 * Finds and connects disconnected components in the star lane graph.
 * Used as a fallback if Kruskal's algorithm doesn't fully connect the graph.
 *
 * @param stars - Array of all stars
 * @param lanes - Current array of lanes (will be modified)
 * @param laneSet - Set of existing lane IDs (will be modified)
 * @param rng - PRNG function
 * @returns Array of new lanes to add
 */
function connectDisconnectedComponents(
  stars: GalaxyStar[],
  lanes: GalaxyStarLane[],
  laneSet: Set<string>,
  rng: () => number,
  gameId: string
): GalaxyStarLane[] {
  const newLanes: GalaxyStarLane[] = [];

  // Build adjacency list
  const adjList = new Map<string, Set<string>>();
  for (const star of stars) {
    adjList.set(star.id, new Set());
  }
  for (const lane of lanes) {
    adjList.get(lane.sourceStarId)?.add(lane.destinationStarId);
    adjList.get(lane.destinationStarId)?.add(lane.sourceStarId);
  }

  // Find connected components using BFS
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const star of stars) {
    if (!visited.has(star.id)) {
      const component: string[] = [];
      const queue: string[] = [star.id];
      visited.add(star.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);
        const neighbors = adjList.get(current) || new Set();

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      components.push(component);
    }
  }

  // Connect components iteratively
  while (components.length > 1) {
    // Find the shortest distance between components
    let minDistance = Infinity;
    let bestPair: [string, string] = ['', ''];

    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        for (const starId1 of components[i]) {
          for (const starId2 of components[j]) {
            const star1 = stars.find(s => s.id === starId1)!;
            const star2 = stars.find(s => s.id === starId2)!;
            const distance = calculateDistance(star1, star2);

            if (distance < minDistance) {
              minDistance = distance;
              bestPair = [starId1, starId2];
            }
          }
        }
      }
    }

    // Add lane between the closest stars in different components
    const [id1, id2] = bestPair;
    const laneId = getLaneId(id1, id2);

    if (!laneSet.has(laneId)) {
      const star1 = stars.find(s => s.id === id1)!;
      const star2 = stars.find(s => s.id === id2)!;
      const distance = calculateDistance(star1, star2);

      const newLane = createLane(star1, star2, distance, rng, gameId);
      newLanes.push(newLane);
      laneSet.add(laneId);

      // Update adjacency list
      adjList.get(id1)?.add(id2);
      adjList.get(id2)?.add(id1);

      // Merge components
      const comp1Index = components.findIndex(c => c.includes(id1));
      const comp2Index = components.findIndex(c => c.includes(id2));

      if (comp1Index !== -1 && comp2Index !== -1 && comp1Index !== comp2Index) {
        components[comp1Index] = [...components[comp1Index], ...components[comp2Index]];
        components.splice(comp2Index, 1);
      }
    }
  }

  return newLanes;
}

/**
 * Calculates the total number of lanes in the network.
 * Useful for testing and validation.
 *
 * @param lanes - Array of GalaxyStarLane objects
 * @returns The total number of lanes
 */
export function getLaneCount(lanes: GalaxyStarLane[]): number {
  return lanes.length;
}

/**
 * Calculates the average number of lanes per star.
 * Useful for testing and validation.
 *
 * @param stars - Array of GalaxyStar objects
 * @param lanes - Array of GalaxyStarLane objects
 * @returns The average lanes per star (actually average connections per star)
 */
export function getAverageLanesPerStar(stars: GalaxyStar[], lanes: GalaxyStarLane[]): number {
  if (stars.length === 0) return 0;

  // Count connections per star
  const connectionCount = new Map<string, number>();
  for (const star of stars) {
    connectionCount.set(star.id, 0);
  }
  for (const lane of lanes) {
    connectionCount.set(lane.sourceStarId, (connectionCount.get(lane.sourceStarId) || 0) + 1);
    connectionCount.set(lane.destinationStarId, (connectionCount.get(lane.destinationStarId) || 0) + 1);
  }

  const total = Array.from(connectionCount.values()).reduce((sum, count) => sum + count, 0);
  return total / stars.length;
}
