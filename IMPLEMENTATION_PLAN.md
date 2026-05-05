# Judge of Survival Web Implementation Plan

## Goal

Rebuild the existing Godot MVP of **The Judge of Survival** as a local React + Vite SPA in this folder.

## Source References

- `/Users/switch/Development/game/godot_games/JudgeOfSurvival/the_judge_of_survival_mvp_codex_guide.md`
- `/Users/switch/Development/game/godot_games/JudgeOfSurvival/add_god_power.md`
- Godot scripts under `/Users/switch/Development/game/godot_games/JudgeOfSurvival/scripts`

## Web Scope

- React + Vite single page app.
- Fast in-app screen switching without page reloads.
- Preserve the Godot game rules:
  - 6 starting characters.
  - Lifeboat state: turn, water, food, stability, rescue chance, storm level.
  - Minor and major power split.
  - 5 minor powers and 4 major powers.
  - Turn progression, event priority, death checks, end conditions, and final judgement.
  - Korean default language with English toggle.
- No network/API/LLM usage in gameplay.
- No external image assets.

## SPA Screens

- `Trial`: main play surface with status, lifeboat visualization, recent log, and power controls.
- `Roster`: expanded character list with stat bars, flags, and judgement when available.
- `Log`: full event log.
- `Judgement`: final outcomes and chapter status.

## Implementation Structure

- `src/game/data.js`: characters, translations, constants.
- `src/game/logic.js`: state creation, powers, turn events, judgement, localization helpers.
- `src/App.jsx`: SPA state, screens, UI actions.
- `src/styles.css`: responsive application styling.
- `src/main.jsx`: React entrypoint.

## Verification

- Add deterministic browser hooks:
  - `window.render_game_to_text()`
  - `window.advanceTime(ms)`
- Run build/lint-style checks available in the project.
- Start Vite dev server and validate with the develop-web-game Playwright client.
- Inspect generated screenshots and console output.
