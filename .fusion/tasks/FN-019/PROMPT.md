# FN-019: Fix: Server-side game state management

## Mission: Browser-Based Turn-Based 4X Space Strategy Game

Build a desktop browser-based 4X space strategy game using TypeScript, React, HTML5 Canvas 2D, Node.js, and PostgreSQL. The project delivers a phased release starting with a 25-40 system single-player MVP with functional eXplore, eXpand, eXploit, and auto-resolve eXterminate mechanics against basic AI. Milestone 2 scales to the full vision of 150+ system galaxies over 8-12 hour campaigns with ship design, tech trees, diplomacy, and advanced AI. Milestone 3 introduces asynchronous multiplayer with WEGO simultaneous turn resolution, lobbies, and long-term game persistence. Target input is mouse/keyboard on desktop browsers.

## Milestone: Milestone 1: Core Galactic Engine & Single-Player MVP
**Description:** Ship a fully playable single-player 4X loop on a generated 25-40 system star-lane galaxy. Players take sequential turns exploring systems, colonizing planets, extracting resources, building structures, and winning through auto-resolve combat against basic AI opponents.
**Verification:** A new game generates a connected 25-40 system galaxy; a human player can complete 30+ sequential turns against 2-3 AI empires; exploration, colonization, production queues, and auto-resolve combat all function end-to-end with no critical errors.

## Slice: Slice 1.1: Simulation Core & Data Layer
**Description:** Establish the server-side game architecture: PostgreSQL schema, galaxy generation, turn-resolution pipeline, and entity management APIs.
**Verification:** All game entities (stars, fleets, empires, build queues) persist in PostgreSQL; a full turn can be resolved deterministically via API; galaxy generation produces a connected star-lane graph with 25-40 systems.

## Feature: Fix: Server-side game state management
Implement Node.js services that query and mutate game state, handling empire visibility (fog-of-war filtering) before sending state to clients.
**Acceptance Criteria:**
Clients receive only data their empire can currently see; server can reconstruct full game state from DB for any turn number.
