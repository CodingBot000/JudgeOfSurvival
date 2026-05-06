# Core Separation Plan

## Goal

Separate the portable game simulation from the React UI so the survivor stats, boat pressure, turn rules, powers, event selection, and judgement logic can later be moved to Godot, Unity, or another presentation layer without carrying React-specific code.

## Target Boundaries

### `src/game-core`

Portable simulation code only.

- Owns initial boat and character state.
- Owns turn advancement, god powers, event selection, social pressure, death, exile, sacrifice, and judgement rules.
- Stores logs as stable keys plus params, not rendered strings.
- Does not import React, browser APIs, translations, CSS, SVG, or UI components.

### `src/content`

Presentation content that can be swapped per language or platform.

- Owns translations and supported language codes.
- Keeps display text out of the simulation engine.

### `src/game-adapters`

Adapters that turn core state into UI-facing data.

- Owns localization helpers.
- Owns text snapshots for browser/debug tests.
- Can be replaced by a Godot/Unity adapter later.

### `src/App.jsx`

React presentation only.

- Calls core commands such as `nextTurn`, `useMinorPower`, and `useMajorPower`.
- Uses adapters to display names, logs, judgement labels, and debug text.
- Does not implement rules or mutate simulation state directly.

## Implementation Steps

1. Split core data from localization content.
2. Move rule execution into `src/game-core/rules.js`.
3. Move localization and text rendering helpers into `src/game-adapters/display.js`.
4. Keep compatibility facade files under `src/game` for older imports.
5. Update React and smoke tests to import from the explicit core/adapter boundaries.
6. Verify core rules still run headlessly with Node, then verify the browser flow.

## Acceptance Checks

- `src/game-core` must not reference React, DOM, browser globals, CSS, JSX, or translation tables.
- `npm run smoke` must pass using core logic without React.
- `npm run build` must pass.
- Browser validation must still expose `window.render_game_to_text` through the adapter.
