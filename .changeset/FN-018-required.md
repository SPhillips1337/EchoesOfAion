---
"@echoes-of-aion/server": patch
---

# Make game_id required in entity interfaces

## Summary

As part of the games table implementation (FN-010), this changeset makes the `game_id` field required in all entity interfaces (Star, Planet, StarLane, Empire, Fleet, BuildQueue, TurnHistory) in `packages/server/src/types/game-entities.ts`.

## Changes Made

1. **Made `game_id` required** in all entity interfaces (changed from `game_id?: string` to `game_id: string`)
2. **Updated galaxy generators** (`star-generator.ts`, `planet-generator.ts`, `lane-generator.ts`) to require `gameId` parameter
3. **Updated galaxy types** in `galaxy/types.ts` to make `gameId` required in `GalaxyStar`, `GalaxyPlanet`, and `GalaxyStarLane`
4. **Updated test files** to pass `game_id`/`gameId` to all entity creation calls

## Reasoning

The `game_id` field was previously optional (added in FN-012) to allow gradual migration. Now that all consumers (galaxy generators, test fixtures, and API handlers) have been updated to provide `game_id`, the field can be made required to ensure type safety and alignment with the database schema being implemented in FN-010.

## Migration Notes

- All code that creates entities must now provide a `game_id` value
- The galaxy generators now require a `gameId` parameter
- TypeScript compilation will fail if any consumer is missing `game_id`
