# Landscape Mobile Scene UI Plan

## Goal

Match the first playable screen more closely to `docs/scene_prototype_v1.png` while preserving all existing gameplay controls and debug/navigation functions.

## Layout Basis

- Primary logical canvas: `960 x 540`, landscape-first.
- Main game screen must fit inside `100dvw x 100dvh` without page scrolling.
- Mobile landscape is the priority. Desktop may add breathing room, but the layout should still read like a compact game HUD.

## Visible Main Screen

- Top: title/chapter information and compact resource/status chips.
- Left: compact survivor roster using portrait assets from `public/character/portrait`.
- Center: sea/boat scene using assets from `public/background`, with character portraits placed on the boat.
- Bottom center: current focus and recent trial log.
- Right: minor/major power controls.
- Bottom: restart, finish chapter, next turn, and utility buttons.

## Overflow Strategy

Features that cannot fit comfortably in the main viewport should remain reachable through modal buttons:

- Full roster details
- Full log
- Final judgement
- Crisis/support details
- Language and narrative debug tools

These overlays may scroll internally; the main screen itself should not scroll.

## Verification

- Run `npm run architecture`, `npm run narrative`, `npm run smoke`, and `npm run build`.
- Run the web-game Playwright client against the Vite dev server.
- Inspect screenshots for desktop and mobile-landscape proportions, checking that the main screen has no page scroll and that power/log/roster/judgement features remain accessible.
