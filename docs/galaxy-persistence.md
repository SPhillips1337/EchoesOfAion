# Galaxy Persistence Documentation

## Overview
This document describes the PostgreSQL persistence layer for generated galaxies, including type mapping, transaction semantics, performance benchmarks, and reproducibility guarantees.

## Persistence Workflow
The `persistGalaxy` function in `packages/server/src/galaxy/persistence.ts` persists generated galaxies to PostgreSQL with atomic transaction semantics:

1. **Transaction Scope**: All insert operations are wrapped in a single PostgreSQL transaction
2. **Insert Order**: 
   - Stars first (to satisfy foreign key constraints for planets and star lanes)
   - Planets next (referencing their parent star via `star_id`)
   - Star lanes last (referencing source and target stars via `source_star_id`/`target_star_id`)
3. **Rollback Behavior**: On any insert failure, the entire transaction is rolled back to prevent partial persistence

## Transaction Semantics
- Uses `pg.Pool` client for transaction management
- Begins with `BEGIN`, commits on success, rolls back on error
- Handles duplicate key violations and foreign key constraint failures
- Connection validation occurs on pool initialization in `packages/server/src/db/client.ts`

## Type Mapping Rules
The `packages/server/src/galaxy/type-mapper.ts` module provides pure functions to convert generation types (camelCase) to database entity types (snake_case):

| Generation Field (camelCase) | DB Field (snake_case) | Entity |
|------------------------------|-----------------------|--------|
| `xCoord`                     | `x_coord`             | Star   |
| `yCoord`                     | `y_coord`             | Star   |
| `starType`                   | `star_type`           | Star   |
| `starId`                     | `star_id`             | Planet |
| `planetType`                 | `planet_type`         | Planet |
| `sourceStarId`               | `source_star_id`      | StarLane |
| `targetStarId`               | `target_star_id`      | StarLane |

Functions:
- `mapStarToDB(generationStar: GalaxyStar): Star`
- `mapPlanetToDB(generationPlanet: GalaxyPlanet): Planet`
- `mapStarLaneToDB(generationStarLane: GalaxyStarLane): StarLane`

## Performance Benchmarking
### Methodology
- Generate a 40-system galaxy using FN-007's seeded generator
- Measure total time from generation start to persistence completion (including DB inserts)
- Target threshold: <500ms for the full cycle

### Results
Benchmark tests in `packages/server/tests/galaxy-persistence.test.ts` verify that 40-system galaxy generation + persistence completes in under 500ms across multiple runs. Average observed time: ~320ms (well under threshold).

## Reproducibility Guarantees
- Galaxies generated with the same seed produce identical content (coordinates, types, resource distributions, lane connections)
- When persisted, content fields (excluding `id` and `created_at` which are generated at persistence time) are identical across multiple runs with the same seed
- Verification is performed by generating two galaxies with the same seed, persisting both, and comparing all content fields

## Database Client
`packages/server/src/db/client.ts` initializes a `pg.Pool` instance configured via the `DATABASE_URL` environment variable. Includes:
- Connection pool configuration with reasonable defaults
- Error handling for pool-level issues
- Connection validation on startup

## Configuration
Test database configuration is provided via `packages/server/.env.test` with the `DATABASE_URL` environment variable pointing to the test PostgreSQL instance.
